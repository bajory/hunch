import type { ShopHeroContent } from "@/lib/site-content";
import { SplitTextReveal } from "@/components/motion/SplitTextReveal";

/** Static banner atop /shop — same visual language as the homepage Hero
    (full-bleed photo, dark scrim, overlaid kicker/title) but without the
    carousel: a listing page needs one settled image, not a slideshow. */
export function ShopHero({ content }: { content: ShopHeroContent }) {
  return (
    <section className="shop-hero" aria-label="The Collection">
      <div className="shop-hero__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={content.image} alt={content.alt} className="shop-hero__img shop-hero__img--desktop" fetchPriority="high" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={content.imageMobile || content.image} alt={content.alt} className="shop-hero__img shop-hero__img--mobile" fetchPriority="high" />
      </div>
      <div className="shop-hero__scrim" />
      <div className="shop-hero__content">
        <span className="microlabel microlabel--brass">The Collection</span>
        <SplitTextReveal as="h1" className="shop-hero__title" immediate>
          Every shirt, one standard.
        </SplitTextReveal>
      </div>
    </section>
  );
}
