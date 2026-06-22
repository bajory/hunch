import Link from "next/link";
import { TEAMS, COMPETITIONS } from "@/lib/catalog";
import { JerseySilhouette } from "@/components/jersey/art";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The House — HUNCH",
  description: "The story of HUNCH — a luxury atelier built on the belief that the shirt you wear matters.",
};

export default function TheHouse() {
  const featured = TEAMS["real-madrid"];
  const comp = COMPETITIONS["laliga"];

  return (
    <main>
      {/* ── Hero ── */}
      <div className="house-hero">
        <div className="house-hero__copy">
          <span className="eyebrow">The House of HUNCH</span>
          <h1 className="house-hero__headline">
            The shirt<br />
            has always<br />
            mattered.
          </h1>
          <p className="house-hero__body">
            HUNCH was born from a single conviction: that the most iconic garment in sport
            deserves to be worn as art. We work with the original manufacturers, in the
            original fabrics, with the competition&apos;s official typefaces pressed by hand
            in our atelier.
          </p>
          <p className="house-hero__body">
            Every jersey that leaves our studio carries a name — yours, or the player
            who made you fall in love with the game.
          </p>
        </div>
        <div className="house-hero__visual" aria-hidden="true">
          <JerseySilhouette
            team={featured}
            competition={comp}
            name="HUNCH"
            number="01"
            view="back"
            fontFamily={comp.fontFamily}
          />
        </div>
      </div>

      {/* ── Values ── */}
      <div className="house-values">
        <div className="house-values__inner">
          <div className="house-value">
            <div className="house-value__num">01</div>
            <div className="house-value__title">Authentic</div>
            <p className="house-value__body">
              We source only player-issue authentic jerseys — the same specification
              worn on the pitch, not the replica sold in the stands. The weight,
              the weave, the badge placement: all original.
            </p>
          </div>
          <div className="house-value">
            <div className="house-value__num">02</div>
            <div className="house-value__title">Atelier-Made</div>
            <p className="house-value__body">
              Your name and number are heat-transferred using competition-licensed
              lettering in our London studio. No outsourcing. Every order is
              inspected by hand before it ships.
            </p>
          </div>
          <div className="house-value">
            <div className="house-value__num">03</div>
            <div className="house-value__title">Considered</div>
            <p className="house-value__body">
              We offer six clubs, each in the competition they&apos;re renowned for.
              Not every shirt. Just the ones worth owning — and the ones we can
              do perfectly.
            </p>
          </div>
        </div>
      </div>

      {/* ── Manifesto ── */}
      <div className="house-manifesto">
        <div className="house-manifesto__inner">
          <p className="house-manifesto__quote">
            &ldquo;A shirt with your name on the back isn&apos;t merchandise.
            It&apos;s a declaration of where you were, who you watched,
            and why you cared.&rdquo;
          </p>
          <p className="house-manifesto__attr">— HUNCH, London Studio</p>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="house-cta">
        <div className="house-cta__inner">
          <span className="eyebrow">Ready to order</span>
          <h2 className="house-cta__headline">Choose your club.</h2>
          <Link href="/collections" className="house-cta__btn">
            View the Collection
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
