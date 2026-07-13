import { NextRequest, NextResponse } from "next/server";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/paypal";
import { adjustInventoryQuantity } from "@/lib/shopify-admin";
import { sendOrderConfirmationEmail, isEmailConfigured } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase-admin";

interface OrderLineItem {
  merchandiseId: string;
  title: string;
  size: string;
  quantity: number;
  attributes: { key: string; value: string }[];
}

export async function POST(req: NextRequest) {
  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "Supabase admin client not configured" }, { status: 500 });

  const { orderId } = await req.json();
  if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });

  const { data: order, error: fetchErr } = await db
    .from("orders").select("*").eq("paypal_order_id", orderId).maybeSingle();
  if (fetchErr || !order) {
    return NextResponse.json({ error: fetchErr?.message ?? "Order not found" }, { status: 404 });
  }
  if (order.status === "captured") return NextResponse.json({ ok: true }); // already done — idempotent retry

  let captured;
  try {
    captured = await capturePayPalOrder(orderId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Some client-side session flows (e.g. card fields' submit()) may
    // finalize payment on PayPal's own side already — re-capturing then
    // fails with ORDER_ALREADY_CAPTURED. Treat that as success, not a
    // hard failure, by reading the order's actual current state instead.
    if (message.includes("ORDER_ALREADY_CAPTURED")) {
      try {
        captured = await getPayPalOrder(orderId);
      } catch (e2) {
        await db.from("orders").update({ status: "failed" }).eq("paypal_order_id", orderId);
        return NextResponse.json({ error: e2 instanceof Error ? e2.message : String(e2) }, { status: 500 });
      }
    } else {
      await db.from("orders").update({ status: "failed" }).eq("paypal_order_id", orderId);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const unit = captured.purchase_units?.[0];
  const captureId = unit?.payments?.captures?.[0]?.id ?? null;
  const payerEmail = captured.payer?.email_address ?? null;
  const payerName = [captured.payer?.name?.given_name, captured.payer?.name?.surname].filter(Boolean).join(" ") || null;

  await db.from("orders").update({
    status: "captured",
    paypal_capture_id: captureId,
    customer_email: payerEmail,
    customer_name: payerName,
    shipping_address: unit?.shipping ?? null,
    captured_at: new Date().toISOString(),
  }).eq("paypal_order_id", orderId);

  // Best-effort per line below: the payment is already taken by this point,
  // so a Shopify hiccup here shouldn't fail the response to the buyer — an
  // un-refunded charge is far worse than a stock count that needs a manual
  // fix. Errors are logged, not thrown.
  const lineItems = order.line_items as OrderLineItem[];
  for (const line of lineItems) {
    const { data: variant } = await db
      .from("product_shopify_variants")
      .select("shopify_inventory_item_id")
      .eq("shopify_variant_id", line.merchandiseId)
      .maybeSingle();
    if (variant?.shopify_inventory_item_id) {
      try {
        await adjustInventoryQuantity(variant.shopify_inventory_item_id, -line.quantity);
      } catch (e) {
        console.error("PayPal capture: inventory adjust failed for", line.merchandiseId, e);
      }
    }
  }

  if (payerEmail && isEmailConfigured()) {
    try {
      await sendOrderConfirmationEmail({
        toEmail: payerEmail,
        customerName: payerName ?? undefined,
        orderId,
        amountUsd: Number(order.amount_usd),
        lines: lineItems,
      });
    } catch (e) {
      console.error("PayPal capture: confirmation email failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}
