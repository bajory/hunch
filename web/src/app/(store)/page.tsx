import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { FeaturedRail } from "@/components/home/FeaturedRail";
import { FeaturePicks } from "@/components/home/FeaturePicks";
import { NewArrivals } from "@/components/home/NewArrivals";
import { SplitPanels } from "@/components/home/SplitPanels";
import { FinalTouch } from "@/components/home/FinalTouch";
import { Highlights } from "@/components/home/Highlights";
import { Marquee } from "@/components/motion/Marquee";
import { Reveal } from "@/components/motion/Reveal";
import { SplitTextReveal } from "@/components/motion/SplitTextReveal";
import { productBySlug, formatPrice } from "@/lib/products";
import { getProductsFresh } from "@/lib/products-db";
import { CUSTOMIZATION_FEE } from "@/lib/catalog";
import { getCatalogFresh } from "@/lib/cms";
import { getSiteContentFresh } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "HUNCH — Authentic Matchwear",
  description:
    "Player-version jerseys from Europe's biggest clubs and the 2026 World Cup — sourced authentic, personalised in our studio.",
};

const FEATURED_SLUGS = [
  "real-madrid-home", "barcelona-home", "psg-home", "liverpool-home",
  "bayern-home", "man-city-home", "man-united-home",
];

export default async function HomePage() {
  // Live: the featured rail resolves against the admin-managed catalog, and an
  // admin-uploaded kit photo overrides the bundled image immediately.
  const [allProducts, { print }, content] = await Promise.all([
    getProductsFresh(),
    getCatalogFresh(),
    getSiteContentFresh(),
  ]);

  const featured = FEATURED_SLUGS
    .map((slug) => productBySlug(slug, allProducts))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <main>
      <Hero content={content.hero} />

      <FeaturePicks content={content.picks} />

      <NewArrivals content={content.newArrivals} />

      <FeaturedRail products={featured} printMap={print} />

      <SplitPanels content={content.split} />

      <FinalTouch />

      <Highlights content={content.highlights} />

      {/* Provenance — light editorial band, photography as art */}
      <section className="craft section" id="craft">
        <Reveal className="wrap on-paper">
          <span className="microlabel microlabel--ink" data-reveal>Provenance</span>
          <div className="section__head" style={{ marginTop: 12 }}>
            <SplitTextReveal as="h2" className="section__title">
              Sold the way it leaves the club.
            </SplitTextReveal>
          </div>

          <div className="detail">
            <figure className="detail__figure" data-reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={content.craft.image} alt={content.craft.alt} loading="lazy" />
              <figcaption>{content.craft.caption}</figcaption>
            </figure>

            <div className="detail__body">
              <p className="detail__lead" data-reveal>{content.craft.lead}</p>
              <ol className="detail__marks">
                {content.craft.points.map((pt, i) => (
                  <li data-reveal key={pt.title}>
                    <span className="detail__no">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{pt.title}</h3>
                      <p>{pt.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="craft__foot">
            {content.craft.stats.map((s) => (
              <div className="stat" data-reveal key={s.label}><b>{s.value}</b><span>{s.label}</span></div>
            ))}
            <div className="stat" data-reveal><b>{formatPrice(CUSTOMIZATION_FEE)}</b><span>Personalisation</span></div>
          </div>
        </Reveal>
      </section>

      <Marquee items={content.marquee.items} />
    </main>
  );
}
