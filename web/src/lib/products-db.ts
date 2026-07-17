/**
 * DB-backed product catalog.
 * Reads the `products` table (managed from /admin/products) joined with
 * `teams` for display fields. Falls back to the static PRODUCTS list when
 * Supabase is unconfigured, the fetch fails, or the table is empty (the
 * 014_products.sql migration hasn't run yet) — so the store never goes blank.
 */
import { unstable_cache } from "next/cache";
import { supabase } from "./supabase";
import { createAdminClient } from "./supabase-admin";
import { getLiveProductData, type LiveProductData } from "./shopify";
import {
  PRODUCTS, dedupeByJersey,
  type Product, type ProductType, type ProductKitType, type ProductStatus,
  type ProductImages, type LeagueId,
} from "./products";

interface ProductRow {
  slug: string;
  team_id: string | null;
  name: string;
  product_type: string;
  kit_type: ProductKitType | null;
  season: string;
  edition: string;
  price: number;
  status: ProductStatus;
  customizable: boolean;
  sizes: Record<string, number> | null;
  images: Partial<ProductImages> & { gallery?: string[] } | null;
  sort_order: number;
  is_published: boolean;
  shopify_product_id: string | null;
}

interface TeamJoinRow {
  id: string;
  name: string;
  team_kind: "club" | "national";
  league_id: string | null;
}

interface VariantRow {
  product_slug: string;
  size: string;
  shopify_variant_id: string;
  available: number;
}

function rowToProduct(
  r: ProductRow,
  teamsById: Map<string, TeamJoinRow>,
  variantsBySlug: Map<string, VariantRow[]>,
  liveByShopifyId: Map<string, LiveProductData>,
): Product {
  const team = r.team_id ? teamsById.get(r.team_id) : undefined;
  const variants = variantsBySlug.get(r.slug) ?? [];
  const live = r.shopify_product_id ? liveByShopifyId.get(r.shopify_product_id) : undefined;

  // Shopify is the source of truth for price/stock once a product is synced
  // (see the architecture review — this replaces the old Supabase mirror,
  // kept in sync only by best-effort webhook writes that could drift or go
  // silently stale). Unsynced products still use the Supabase-entered
  // values below, same as before this existed. A live-fetch miss (Shopify
  // API hiccup, or this product simply wasn't in the batch) falls back to
  // the Supabase mirror too, rather than showing a blank price.
  const liveBySize = new Map(live?.variants.map((v) => [v.size, v]));

  // Exact counts still come from the Supabase mirror (kept current by the
  // webhook) — the Storefront token can't read quantityAvailable (see
  // lib/shopify.ts). Live only overrides when Shopify says NOT purchasable,
  // which the mirror could otherwise miss if a webhook delivery was ever lost.
  const sizes: Record<string, number> = { ...(r.sizes ?? {}) };
  const sizeVariants: Record<string, { variantId: string; available: number }> = {};
  for (const v of variants) {
    const liveVariant = liveBySize.get(v.size);
    const available = liveVariant && !liveVariant.availableForSale ? 0 : v.available;
    sizeVariants[v.size] = { variantId: v.shopify_variant_id, available };
    sizes[v.size] = available;
  }

  return {
    slug: r.slug,
    teamSlug: r.team_id ?? "",
    teamName: team?.name ?? "",
    teamKind: team?.team_kind ?? "club",
    league: (team?.league_id ?? undefined) as LeagueId | undefined,
    name: r.name,
    productType: r.product_type as ProductType,
    kitType: r.kit_type,
    season: r.season,
    edition: r.edition,
    price: live ? Number(live.price) : Number(r.price),
    status: r.status,
    customizable: r.customizable,
    sizes,
    images: {
      front: r.images?.front ?? "",
      back: r.images?.back,
      source: r.images?.source ?? "studio",
    },
    gallery: r.images?.gallery,
    badge: r.team_id ? `/img/badges/${r.team_id}.png` : undefined,
    sizeVariants,
  };
}

async function fetchProducts(): Promise<Product[]> {
  // Service-role read where available so admin-created drafts of OTHER tables'
  // RLS never interfere; the is_published filter below is the deliberate gate
  // (the admin client bypasses RLS, so it must be explicit).
  const db = createAdminClient() ?? supabase!;
  const [{ data: productRows, error: e1 }, { data: teamRows, error: e2 }, { data: variantRows, error: e3 }] = await Promise.all([
    db.from("products").select("*")
      .eq("is_published", true)
      .neq("status", "archived")
      .order("sort_order"),
    db.from("teams").select("id,name,team_kind,league_id"),
    db.from("product_shopify_variants").select("product_slug,size,shopify_variant_id,available"),
  ]);
  if (e1 || e2 || e3) {
    console.error("[products-db] Supabase fetch errors:", e1, e2, e3);
    throw new Error("Supabase products fetch failed");
  }
  const rows = (productRows as ProductRow[]) ?? [];
  // Empty table = migration not applied yet → let the caller fall back.
  if (!rows.length) throw new Error("products table empty");
  const teamsById = new Map(((teamRows as TeamJoinRow[]) ?? []).map((t) => [t.id, t]));
  const variantsBySlug = new Map<string, VariantRow[]>();
  for (const v of (variantRows as VariantRow[]) ?? []) {
    const list = variantsBySlug.get(v.product_slug) ?? [];
    list.push(v);
    variantsBySlug.set(v.product_slug, list);
  }

  const shopifyIds = rows.map((r) => r.shopify_product_id).filter((id): id is string => Boolean(id));
  const liveByShopifyId = await getLiveProductData(shopifyIds).catch((e) => {
    console.error("[products-db] Shopify live price/stock fetch failed, falling back to Supabase mirror:", e);
    return new Map<string, LiveProductData>();
  });

  return rows.map((r) => rowToProduct(r, teamsById, variantsBySlug, liveByShopifyId));
}

/** Tag-cached (see the architecture migration's step 3) rather than
    force-dynamic — a day-long time-based fallback backs the tag in case a
    write path ever misses a revalidateTag call, but every admin product/
    team write and the Shopify webhook call revalidateTag('products', ...)
    directly, so in practice this refreshes immediately on change instead
    of waiting out the fallback window. */
const cachedFetchProducts = unstable_cache(fetchProducts, ["products"], {
  tags: ["products"],
  revalidate: 86_400,
});

export async function getProductsFresh(): Promise<Product[]> {
  if (!supabase) return PRODUCTS;
  return cachedFetchProducts().catch(() => PRODUCTS);
}

/** One card per distinct jersey photo — what the shop grid renders. */
export async function getShopProductsFresh(): Promise<Product[]> {
  return dedupeByJersey(await getProductsFresh());
}

export async function getProductBySlugFresh(slug: string): Promise<{ product?: Product; all: Product[] }> {
  const all = await getProductsFresh();
  return { product: all.find((p) => p.slug === slug), all };
}
