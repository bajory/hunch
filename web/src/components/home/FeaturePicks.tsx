import Link from "next/link";
import { livePhotosFor, type PrintEntry, type KitTypeId } from "@/lib/catalog";
import type { Product } from "@/lib/products";

interface PickTile {
  href: string;
  title: string;
  sub: string;
  image: string;
}

function frontOf(p: Product, printMap: Partial<Record<string, PrintEntry>>): string {
  const live = p.productType === "jersey" && p.kitType && p.teamSlug
    ? livePhotosFor(p.teamSlug, p.kitType as KitTypeId, printMap)
    : null;
  return live?.front || p.images.front;
}

function pick(products: Product[], preferSlug: string, fallback: (p: Product) => boolean): Product | undefined {
  return products.find((p) => p.slug === preferSlug && p.status === "available")
    ?? products.find((p) => fallback(p) && p.status === "available");
}

/** Three curated destinations replacing the old league scroll-strip: one large
    hero + two smaller tiles, mirroring each other (image-left / image-right). */
export function FeaturePicks({ products, printMap }: {
  products: Product[];
  printMap: Partial<Record<string, PrintEntry>>;
}) {
  const worldCup = pick(products, "argentina-home", (p) => p.teamKind === "national");
  const newSeason = pick(products, "real-madrid-home", (p) => p.teamKind === "club" && p.productType === "jersey" && p.kitType !== "retro");
  const retro = products.find((p) => p.kitType === "retro" && p.status === "available")
    ?? pick(products, "barcelona-home", (p) => p.teamKind === "club");

  if (!worldCup || !newSeason || !retro) return null;

  const hero: PickTile = {
    href: "/shop?kind=national",
    title: "World Cup Picks",
    sub: "Player-version shirts from the nations chasing it all in 2026.",
    image: frontOf(worldCup, printMap),
  };
  const seasonTile: PickTile = {
    href: "/shop?kind=club",
    title: "New Season Drops",
    sub: "This year's club kits, fresh off the rail.",
    image: frontOf(newSeason, printMap),
  };
  const retroTile: PickTile = {
    href: `/product/${retro.slug}`,
    title: "Retro Picks",
    sub: "Last season's shirt, still in stock.",
    image: frontOf(retro, printMap),
  };

  return (
    <section className="picks" aria-label="Featured picks">
      <div className="picks__grid">
        <Link href={hero.href} className="picks__hero" data-cursor="Shop">
          <div className="picks__hero-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.image} alt={hero.title} loading="lazy" />
          </div>
          <div className="picks__hero-body">
            <h3>{hero.title}</h3>
            <p>{hero.sub}</p>
            <span className="picks__btn">Shop now</span>
          </div>
        </Link>

        <Link href={seasonTile.href} className="picks__tile" data-cursor="Shop">
          <div className="picks__tile-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={seasonTile.image} alt={seasonTile.title} loading="lazy" />
          </div>
          <div className="picks__tile-body">
            <h3>{seasonTile.title}</h3>
            <p>{seasonTile.sub}</p>
          </div>
        </Link>

        <Link href={retroTile.href} className="picks__tile picks__tile--reverse" data-cursor="Shop">
          <div className="picks__tile-body">
            <h3>{retroTile.title}</h3>
            <p>{retroTile.sub}</p>
          </div>
          <div className="picks__tile-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={retroTile.image} alt={retroTile.title} loading="lazy" />
          </div>
        </Link>
      </div>
    </section>
  );
}
