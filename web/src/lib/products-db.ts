/**
 * DB-backed product catalog.
 * Reads the `products` table (managed from /admin/products) joined with
 * `teams` for display fields. Falls back to the static PRODUCTS list when
 * Supabase is unconfigured, the fetch fails, or the table is empty (the
 * 014_products.sql migration hasn't run yet) — so the store never goes blank.
 */
import { supabase } from "./supabase";
import { createAdminClient } from "./supabase-admin";
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
}

interface TeamJoinRow {
  id: string;
  name: string;
  team_kind: "club" | "national";
  league_id: string | null;
}

function rowToProduct(r: ProductRow, teamsById: Map<string, TeamJoinRow>): Product {
  const team = r.team_id ? teamsById.get(r.team_id) : undefined;
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
    price: Number(r.price),
    status: r.status,
    customizable: r.customizable,
    sizes: r.sizes ?? {},
    images: {
      front: r.images?.front ?? "",
      back: r.images?.back,
      source: r.images?.source ?? "studio",
    },
    gallery: r.images?.gallery,
    badge: r.team_id ? `/img/badges/${r.team_id}.png` : undefined,
  };
}

async function fetchProducts(): Promise<Product[]> {
  // Service-role read where available so admin-created drafts of OTHER tables'
  // RLS never interfere; the is_published filter below is the deliberate gate
  // (the admin client bypasses RLS, so it must be explicit).
  const db = createAdminClient() ?? supabase!;
  const [{ data: productRows, error: e1 }, { data: teamRows, error: e2 }] = await Promise.all([
    db.from("products").select("*")
      .eq("is_published", true)
      .neq("status", "archived")
      .order("sort_order"),
    db.from("teams").select("id,name,team_kind,league_id"),
  ]);
  if (e1 || e2) {
    console.error("[products-db] Supabase fetch errors:", e1, e2);
    throw new Error("Supabase products fetch failed");
  }
  const rows = (productRows as ProductRow[]) ?? [];
  // Empty table = migration not applied yet → let the caller fall back.
  if (!rows.length) throw new Error("products table empty");
  const teamsById = new Map(((teamRows as TeamJoinRow[]) ?? []).map((t) => [t.id, t]));
  return rows.map((r) => rowToProduct(r, teamsById));
}

/** Server-side, uncached — pages are force-dynamic, so every load sees admin edits. */
export async function getProductsFresh(): Promise<Product[]> {
  if (!supabase) return PRODUCTS;
  return fetchProducts().catch(() => PRODUCTS);
}

/** One card per distinct jersey photo — what the shop grid renders. */
export async function getShopProductsFresh(): Promise<Product[]> {
  return dedupeByJersey(await getProductsFresh());
}

export async function getProductBySlugFresh(slug: string): Promise<{ product?: Product; all: Product[] }> {
  const all = await getProductsFresh();
  return { product: all.find((p) => p.slug === slug), all };
}
