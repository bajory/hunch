import { NextRequest, NextResponse } from "next/server";
import { getCart } from "@/lib/shopify";
import { createPayPalOrder, isPayPalConfigured, type ShippingAddress } from "@/lib/paypal";
import { createAdminClient } from "@/lib/supabase-admin";

function isValidShipping(s: unknown): s is ShippingAddress {
  if (!s || typeof s !== "object") return false;
  const r = s as Record<string, unknown>;
  return Boolean(r.fullName && r.addressLine1 && r.city && r.countryCode);
}

// QAR has been pegged to USD at this exact rate by Qatari law since 2001 —
// a fixed multiply, not a live FX lookup (verified during planning).
const QAR_PER_USD = 3.64;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Creates the PayPal order for whatever's actually in the Shopify cart —
    the amount is always computed here from the cart's own server-fetched
    cost, never from anything the client sends, per PayPal's own guidance
    that a browser-supplied total can be manipulated. */
export async function POST(req: NextRequest) {
  if (!isPayPalConfigured()) {
    return NextResponse.json({ error: "PayPal is not configured" }, { status: 500 });
  }
  const db = createAdminClient();
  if (!db) return NextResponse.json({ error: "Supabase admin client not configured" }, { status: 500 });

  const { cartId, email, shippingAddress } = await req.json();
  if (!cartId) return NextResponse.json({ error: "Missing cartId" }, { status: 400 });
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!isValidShipping(shippingAddress)) {
    return NextResponse.json({ error: "A complete shipping address is required" }, { status: 400 });
  }

  const cart = await getCart(cartId);
  if (!cart || cart.lines.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }
  if (cart.currencyCode !== "QAR") {
    return NextResponse.json({ error: `Unexpected cart currency ${cart.currencyCode}` }, { status: 500 });
  }

  const lineItems = cart.lines.map((line) => {
    const unitPriceQar = Number(line.amount) / line.quantity;
    const unitPriceUsd = round2(unitPriceQar / QAR_PER_USD);
    const size = line.attributes.find((a) => a.key === "Size")?.value ?? line.variantTitle;
    return {
      merchandiseId: line.merchandiseId,
      title: line.productTitle,
      size,
      quantity: line.quantity,
      unitPriceQar: round2(unitPriceQar),
      unitPriceUsd,
      attributes: line.attributes,
    };
  });

  // The order amount is derived from the same per-line USD figures sent to
  // PayPal as the item breakdown, so the two always match exactly — PayPal
  // rejects an order whose top-level amount doesn't equal its item total.
  const amountUsd = round2(lineItems.reduce((sum, l) => sum + l.unitPriceUsd * l.quantity, 0));
  const amountQar = Number(cart.amount);

  let paypalOrder;
  try {
    paypalOrder = await createPayPalOrder(
      amountUsd,
      lineItems.map((l) => ({ name: `${l.title} (${l.size})`, quantity: l.quantity, unitAmountUsd: l.unitPriceUsd })),
      cartId,
      { email, shipping: shippingAddress },
    );
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  const { error } = await db.from("orders").insert({
    paypal_order_id: paypalOrder.id,
    status: "created",
    amount_usd: amountUsd,
    amount_qar: amountQar,
    line_items: lineItems,
    customer_email: email,
    customer_name: shippingAddress.fullName,
    shipping_address: shippingAddress,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orderId: paypalOrder.id });
}
