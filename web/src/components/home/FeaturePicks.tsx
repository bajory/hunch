import Link from "next/link";
import type { PicksContent } from "@/lib/site-content";

/** Three curated destinations replacing the old league scroll-strip: one large
    hero + two smaller tiles, mirroring each other (image-left / image-right).
    Fully admin-set via /admin/content (image, copy, link per tile) — no
    longer tied to whichever single product happens to match a hardcoded
    slug, so a tile can point at a filtered collection (e.g. all retro kits)
    rather than one specific product's page. */
export function FeaturePicks({ content }: { content: PicksContent }) {
  const { hero, season, retro } = content;

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
            <span className="picks__btn">{hero.cta || "Shop now"}</span>
          </div>
        </Link>

        <Link href={season.href} className="picks__tile" data-cursor="Shop">
          <div className="picks__tile-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={season.image} alt={season.title} loading="lazy" />
          </div>
          <div className="picks__tile-body">
            <h3>{season.title}</h3>
            <p>{season.sub}</p>
          </div>
        </Link>

        <Link href={retro.href} className="picks__tile picks__tile--reverse" data-cursor="Shop">
          <div className="picks__tile-body">
            <h3>{retro.title}</h3>
            <p>{retro.sub}</p>
          </div>
          <div className="picks__tile-media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={retro.image} alt={retro.title} loading="lazy" />
          </div>
        </Link>
      </div>
    </section>
  );
}
