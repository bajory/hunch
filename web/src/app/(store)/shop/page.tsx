import type { Metadata } from "next";
import { ShopGrid } from "@/components/shop/ShopGrid";
import { SplitTextReveal } from "@/components/motion/SplitTextReveal";
import { getCatalogFresh } from "@/lib/cms";
import { getShopProductsFresh } from "@/lib/products-db";
import { PRODUCT_TYPE_DEFS, type LeagueId, type ProductType } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shop — HUNCH",
  description: "Authentic club and national team matchwear — jerseys, training range and more. 26/27 season and the 2026 World Cup.",
};

interface Props {
  searchParams: Promise<{ kind?: string; league?: string; type?: string }>;
}

export default async function ShopPage({ searchParams }: Props) {
  const { kind, league, type } = await searchParams;
  const initialKind = kind === "club" || kind === "national" ? kind : "all";
  const leagues: LeagueId[] = ["premier", "laliga", "seriea", "bundesliga", "ligue1"];
  const initialLeague = leagues.includes(league as LeagueId) ? (league as LeagueId) : null;
  const initialType = PRODUCT_TYPE_DEFS.some((d) => d.id === type) ? (type as ProductType) : "all";

  // Live: products come from the admin-managed catalog, and an admin-uploaded
  // kit photo overrides the bundled image immediately.
  const [products, { print }] = await Promise.all([
    getShopProductsFresh(),
    getCatalogFresh(),
  ]);

  return (
    <main className="shop wrap">
      <span className="microlabel microlabel--brass">The Collection</span>
      <SplitTextReveal as="h1" className="shop__title" immediate>
        Every shirt, one standard.
      </SplitTextReveal>
      <ShopGrid products={products} initialKind={initialKind} initialLeague={initialLeague}
        initialType={initialType} printMap={print} />
    </main>
  );
}
