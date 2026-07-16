import Link from "next/link";
import type { PickTile, PicksContent } from "@/lib/site-content";

/** Renders both the desktop and mobile photo for a tile — only one is ever
    visible at a time (toggled by CSS at the same breakpoint the layout
    itself switches at), so the browser fetches whichever the visitor's
    viewport actually needs at any given moment isn't optimized here, but
    correctness (right image, right layout) matters more than that for a
    homepage hero with two photos. Falls back to the desktop photo on
    mobile if no separate one was set. */
function TileImage({ tile }: { tile: PickTile }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tile.image} alt={tile.title} loading="lazy" className="picks__img picks__img--desktop" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tile.imageMobile || tile.image} alt={tile.title} loading="lazy" className="picks__img picks__img--mobile" />
    </>
  );
}

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
            <TileImage tile={hero} />
          </div>
          <div className="picks__hero-body">
            <h3>{hero.title}</h3>
            <p>{hero.sub}</p>
            <span className="picks__btn">{hero.cta || "Shop now"}</span>
          </div>
        </Link>

        <Link href={season.href} className="picks__tile" data-cursor="Shop">
          <div className="picks__tile-media">
            <TileImage tile={season} />
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
            <TileImage tile={retro} />
          </div>
        </Link>
      </div>
    </section>
  );
}
