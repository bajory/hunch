import type { Metadata } from "next";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { ShopHero } from "@/components/shop/ShopHero";
import { getCatalogFresh } from "@/lib/cms";
import { getShopProductsFresh } from "@/lib/products-db";
import { getSiteContentFresh } from "@/lib/site-content";
import { PRODUCT_TYPE_DEFS, KIT_TYPE_LABELS, type LeagueId, type ProductType, type ProductKitType } from "@/lib/products";

// Tag-cached, not force-dynamic — see the architecture migration's step 3.
// getShopProductsFresh/getCatalogFresh/getSiteContentFresh are each backed
// by unstable_cache now; admin writes and the Shopify webhook call
// revalidateTag directly, so this still reflects edits immediately.

export const metadata: Metadata = {
  title: "Shop — HUNCH",
  description: "Authentic club and national team matchwear — jerseys, training range and more. 26/27 season and the 2026 World Cup.",
};

interface Props {
  searchParams: Promise<{ kind?: string; league?: string; type?: string; kitType?: string }>;
}

export default async function ShopPage({ searchParams }: Props) {
  const { kind, league, type, kitType } = await searchParams;
  const initialKind = kind === "club" || kind === "national" ? kind : "all";
  const leagues: LeagueId[] = ["premier", "laliga", "seriea", "bundesliga", "ligue1"];
  const initialLeague = leagues.includes(league as LeagueId) ? (league as LeagueId) : null;
  const initialType = PRODUCT_TYPE_DEFS.some((d) => d.id === type) ? (type as ProductType) : "all";
  const initialKitType = kitType && kitType in KIT_TYPE_LABELS ? (kitType as ProductKitType) : "all";

  // Live: products come from the admin-managed catalog, and an admin-uploaded
  // kit photo overrides the bundled image immediately.
  const [products, { print }, content] = await Promise.all([
    getShopProductsFresh(),
    getCatalogFresh(),
    getSiteContentFresh(),
  ]);

  return (
    <main>
      <ShopHero content={content.shopHero} />
      <div className="shop wrap">
        <ShopGrid products={products} initialKind={initialKind} initialLeague={initialLeague}
          initialType={initialType} initialKitType={initialKitType} printMap={print} />
      </div>
    </main>
  );
}
