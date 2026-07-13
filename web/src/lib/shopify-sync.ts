import { createAdminClient } from "./supabase-admin";
import { createShopifyProduct } from "./shopify-admin";
import { sizeOrderFor } from "./products";

/** Shared by the one-time catalog migration script and the admin's
    "Create in Shopify" resync action — kept as one function so the two
    never drift out of sync with each other. */
export async function syncProductToShopify(
  slug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createAdminClient();
  if (!db) return { ok: false, error: "Supabase admin client not configured" };

  const { data: row, error: fetchErr } = await db
    .from("products")
    .select("slug, team_id, name, product_type, price, sizes, shopify_product_id, teams(name)")
    .eq("slug", slug)
    .maybeSingle();
  if (fetchErr || !row) return { ok: false, error: fetchErr?.message ?? "Product not found" };
  if (row.shopify_product_id) return { ok: true }; // already synced — idempotent

  const team = row.teams as unknown as { name: string } | null;
  const title = team ? `${team.name} — ${row.name}` : row.name;
  const sizes = sizeOrderFor({ productType: row.product_type as never });
  const stock = (row.sizes ?? {}) as Record<string, number>;

  try {
    const created = await createShopifyProduct({
      title,
      vendor: "HUNCH",
      productType: row.product_type,
      variants: sizes.map((size) => ({ size, price: Number(row.price), quantity: stock[size] ?? 0 })),
    });

    const { error: updateErr } = await db
      .from("products")
      .update({ shopify_product_id: created.productId, shopify_synced_at: new Date().toISOString(), shopify_sync_error: null })
      .eq("slug", slug);
    if (updateErr) return { ok: false, error: updateErr.message };

    const variantRows = created.variants.map((v) => ({
      product_slug: slug,
      size: v.size,
      shopify_variant_id: v.variantId,
      shopify_inventory_item_id: v.inventoryItemId,
      price: v.price,
      available: v.quantity,
    }));
    const { error: variantsErr } = await db
      .from("product_shopify_variants")
      .upsert(variantRows, { onConflict: "product_slug,size" });
    if (variantsErr) return { ok: false, error: variantsErr.message };

    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.from("products").update({ shopify_sync_error: message }).eq("slug", slug);
    return { ok: false, error: message };
  }
}

export interface BulkSyncSummary {
  total: number;
  created: number;
  skipped: number;
  failed: { slug: string; error: string }[];
}

/** One-time catalog migration, and safe to re-run any time — every already-
    synced product is a no-op via syncProductToShopify's own idempotency
    check. Continues past individual failures rather than aborting the run. */
export async function syncAllUnsyncedProducts(): Promise<BulkSyncSummary> {
  const db = createAdminClient();
  if (!db) throw new Error("Supabase admin client not configured");

  const { data: rows, error } = await db.from("products").select("slug, shopify_product_id");
  if (error) throw new Error(error.message);

  const summary: BulkSyncSummary = { total: rows.length, created: 0, skipped: 0, failed: [] };
  for (const row of rows) {
    if (row.shopify_product_id) {
      summary.skipped++;
      continue;
    }
    const result = await syncProductToShopify(row.slug);
    if (result.ok) summary.created++;
    else summary.failed.push({ slug: row.slug, error: result.error });
  }
  return summary;
}
