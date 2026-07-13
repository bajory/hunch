import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";

/* Shopify → Supabase price/stock sync-in. Shopify owns price/stock/
   inventory; this is the only writer of products.price / products.sizes
   from here on — see supabase/019_shopify_sync.sql and lib/shopify-sync.ts.
   The Dev Dashboard app model issues no separate webhook secret — the same
   client secret used for the OAuth token exchange verifies the HMAC. */
const SECRET = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;

function verifyHmac(rawBody: string, header: string | null): boolean {
  if (!SECRET || !header) return false;
  const digest = createHmac("sha256", SECRET).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Webhook payloads have been observed to use both numeric REST-style IDs
    and full GIDs depending on API version — normalize to the GID shape
    product_shopify_variants stores, so the lookup works either way. */
function toGid(resource: string, value: string | number): string {
  const s = String(value);
  return s.startsWith("gid://") ? s : `gid://shopify/${resource}/${s}`;
}

async function handleProductsUpdate(body: Record<string, unknown>) {
  const db = createAdminClient();
  if (!db) return;
  const variants = (body.variants as { id: string | number; price: string | number }[] | undefined) ?? [];
  if (variants.length === 0) return;

  const prices = new Set<string>();
  let productSlug: string | null = null;

  for (const v of variants) {
    const variantGid = toGid("ProductVariant", v.id);
    const price = Number(v.price);
    const { data: row } = await db
      .from("product_shopify_variants")
      .update({ price, updated_at: new Date().toISOString() })
      .eq("shopify_variant_id", variantGid)
      .select("product_slug")
      .maybeSingle();
    if (row) {
      productSlug = row.product_slug;
      prices.add(price.toFixed(2));
    }
  }

  // Only collapse to products.price when every size still shares one price —
  // the single-price-per-product model this storefront already assumes.
  if (productSlug && prices.size === 1) {
    await db.from("products").update({ price: Number([...prices][0]) }).eq("slug", productSlug);
    revalidatePath(`/product/${productSlug}`);
    revalidatePath("/shop");
  }
}

async function handleInventoryLevelsUpdate(body: Record<string, unknown>) {
  const db = createAdminClient();
  if (!db) return;
  const inventoryItemId = body.inventory_item_id as string | number | undefined;
  const available = body.available as number | undefined;
  if (inventoryItemId == null || available == null) return;

  const itemGid = toGid("InventoryItem", inventoryItemId);
  const { data: row } = await db
    .from("product_shopify_variants")
    .update({ available, updated_at: new Date().toISOString() })
    .eq("shopify_inventory_item_id", itemGid)
    .select("product_slug, size")
    .maybeSingle();
  if (!row) return;

  const { data: product } = await db.from("products").select("sizes").eq("slug", row.product_slug).maybeSingle();
  if (!product) return;
  const sizes = { ...(product.sizes as Record<string, number>), [row.size]: available };
  await db.from("products").update({ sizes }).eq("slug", row.product_slug);

  revalidatePath(`/product/${row.product_slug}`);
  revalidatePath("/shop");
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmacHeader = req.headers.get("X-Shopify-Hmac-Sha256");
  if (!verifyHmac(rawBody, hmacHeader)) {
    return NextResponse.json({ error: "invalid hmac" }, { status: 401 });
  }

  const topic = req.headers.get("X-Shopify-Topic");
  const body = JSON.parse(rawBody) as Record<string, unknown>;

  if (topic === "products/update") await handleProductsUpdate(body);
  else if (topic === "inventory_levels/update") await handleInventoryLevelsUpdate(body);

  return NextResponse.json({ ok: true });
}
