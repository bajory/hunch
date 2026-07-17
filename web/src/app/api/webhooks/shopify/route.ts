import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase-admin";
import { shopifyProductCacheTag } from "@/lib/shopify";

/* Shopify → cache invalidation + Supabase fallback sync-in. Shopify is now
   read LIVE via the Storefront API (lib/shopify.ts getLiveProductData,
   cache-tagged per product) — this route's main job is revalidateTag on
   that tag so the next storefront request refetches fresh. It still also
   writes price/stock into Supabase, but only as a fallback the read path
   falls back to if a live Shopify fetch ever fails (see products-db.ts) —
   not the primary source it was before. See supabase/019_shopify_sync.sql
   and lib/shopify-sync.ts. The Dev Dashboard app model issues no separate
   webhook secret — the same client secret used for the OAuth token
   exchange verifies the HMAC. */
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

/** Shopify redelivers on retry/timeout, and doesn't guarantee delivery
    order — X-Shopify-Webhook-Id is stable across retries of the same
    event, so inserting it first and treating a conflict as "already
    handled" is the dedup step. Returns false (caller should skip
    processing but still 200) when this exact delivery was already seen. */
async function claimDelivery(db: ReturnType<typeof createAdminClient>, webhookId: string | null, topic: string): Promise<boolean> {
  if (!db || !webhookId) return true; // no id to dedup on — process it, same as before this existed
  const { error } = await db.from("shopify_webhook_log").insert({ webhook_id: webhookId, topic });
  // 23505 = unique_violation — this exact delivery was already claimed.
  if (error && error.code === "23505") return false;
  return true;
}

async function handleProductsUpdate(body: Record<string, unknown>) {
  const db = createAdminClient();
  if (!db) return;
  const variants = (body.variants as { id: string | number; price: string | number; updated_at?: string }[] | undefined) ?? [];
  if (variants.length === 0) return;
  const productUpdatedAt = body.updated_at as string | undefined;

  const prices = new Set<string>();
  let productSlug: string | null = null;

  for (const v of variants) {
    const variantGid = toGid("ProductVariant", v.id);
    const price = Number(v.price);
    // Prefer the variant's own timestamp; fall back to the product's.
    const sourceUpdatedAt = v.updated_at ?? productUpdatedAt;

    let query = db
      .from("product_shopify_variants")
      .update({ price, updated_at: sourceUpdatedAt ?? new Date().toISOString() })
      .eq("shopify_variant_id", variantGid);
    // Out-of-order guard: only apply if Shopify says this is newer than
    // what we already have. Without a timestamp there's nothing to compare
    // against, so this falls back to the old always-write behaviour.
    if (sourceUpdatedAt) query = query.lt("updated_at", sourceUpdatedAt);

    const { data: row } = await query.select("product_slug").maybeSingle();
    if (row) {
      productSlug = row.product_slug;
      prices.add(price.toFixed(2));
    }
  }

  // Only collapse to products.price when every size still shares one price —
  // the single-price-per-product model this storefront already assumes.
  if (productSlug && prices.size === 1) {
    await db.from("products").update({ price: Number([...prices][0]) }).eq("slug", productSlug);
  }

  // admin_graphql_api_id is the product's own GID, already in the shape
  // products.shopify_product_id stores it in — no lookup needed.
  const productGid = body.admin_graphql_api_id as string | undefined;
  // { expire: 0 } — a webhook needs the next request to be truly fresh, not
  // the 'max' stale-while-revalidate window the docs otherwise recommend.
  if (productGid) revalidateTag(shopifyProductCacheTag(productGid), { expire: 0 });
  if (productSlug) {
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
  const sourceUpdatedAt = body.updated_at as string | undefined;

  const itemGid = toGid("InventoryItem", inventoryItemId);
  let query = db
    .from("product_shopify_variants")
    .update({ available, updated_at: sourceUpdatedAt ?? new Date().toISOString() })
    .eq("shopify_inventory_item_id", itemGid);
  if (sourceUpdatedAt) query = query.lt("updated_at", sourceUpdatedAt);

  const { data: row } = await query.select("product_slug, size").maybeSingle();
  if (!row) return;

  const { data: product } = await db.from("products").select("sizes, shopify_product_id").eq("slug", row.product_slug).maybeSingle();
  if (!product) return;
  const sizes = { ...(product.sizes as Record<string, number>), [row.size]: available };
  await db.from("products").update({ sizes }).eq("slug", row.product_slug);

  if (product.shopify_product_id) revalidateTag(shopifyProductCacheTag(product.shopify_product_id), { expire: 0 });
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
  const webhookId = req.headers.get("X-Shopify-Webhook-Id");
  const db = createAdminClient();

  const isNewDelivery = await claimDelivery(db, webhookId, topic ?? "unknown");
  if (!isNewDelivery) return NextResponse.json({ ok: true, deduped: true });

  const body = JSON.parse(rawBody) as Record<string, unknown>;

  if (topic === "products/update") await handleProductsUpdate(body);
  else if (topic === "inventory_levels/update") await handleInventoryLevelsUpdate(body);

  return NextResponse.json({ ok: true });
}
