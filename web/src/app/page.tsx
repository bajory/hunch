import Link from "next/link";
import { getCatalog } from "@/lib/cms";
import { JerseySilhouette } from "@/components/jersey/art";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HUNCH — The Authentic Atelier",
  description:
    "HUNCH — luxury matchwear, made to your name. Authentic jerseys personalised with official competition lettering. Atelier-pressed in 48 hours.",
};

const MARQUEE_CLUBS = [
  "FC Barcelona",
  "Real Madrid",
  "Manchester City",
  "Liverpool",
  "Inter Milan",
  "Juventus",
];

export default async function Home() {
  const { teams, competitions } = await getCatalog();
  const featured = teams["barcelona"] ?? Object.values(teams)[0];
  const featuredComp = competitions[featured?.league ?? "laliga"] ?? Object.values(competitions)[0];

  return (
    <main>
      {/* ── Hero ── */}
      <div className="hero">
        {/* Left: editorial copy */}
        <div className="hero__content">
          <span className="eyebrow">The Authentic Atelier</span>
          <h1 className="hero__headline">
            Made&#8209;to&#8209;Name<br />
            <em>Match</em><br />
            Jerseys
          </h1>
          <p className="hero__sub">
            Authentic club shirts personalised with your name — or your
            favourite player's. Atelier heat-pressed to your exact specification,
            dispatched within 48 hours.
          </p>
          <div className="hero__actions">
            <Link href="/collections" className="hero__cta">
              Shop the Collection
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link href="/atelier" className="hero__link">
              How it works
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Right: deep navy editorial panel */}
        <div className="hero__panel" aria-hidden="true">
          <div className="hero__jersey-wrap">
            <JerseySilhouette
              team={featured}
              competition={featuredComp}
              name="YOUR NAME"
              number="10"
              view="back"
              fontFamily={featuredComp.fontFamily}
            />
          </div>
          <span className="hero__panel-label">Season 25 / 26 — Player Issue</span>
        </div>
      </div>

      {/* ── Marquee strip ── */}
      <div className="hero__marquee" aria-hidden="true">
        <div className="hero__marquee-track">
          {/* Double for seamless loop */}
          {[...Array(2)].map((_, i) =>
            MARQUEE_CLUBS.map((club, j) => (
              <span key={`${i}-${j}`} className="hero__marquee-item">
                {club}
                <span className="hero__marquee-dot" />
              </span>
            ))
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="hero__stats">
        <div className="hero__stats-inner">
          <div className="hero__stat">
            <span className="hero__stat-num">6<sup>+</sup></span>
            <span className="hero__stat-label">Elite clubs</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-num">5</span>
            <span className="hero__stat-label">Competitions</span>
          </div>
          <div className="hero__stat">
            <span className="hero__stat-num">48<sup>h</sup></span>
            <span className="hero__stat-label">Dispatch time</span>
          </div>
        </div>
      </div>

      {/* ── Editorial Craft section ── */}
      <div className="hero__craft">
        <div className="hero__craft-inner">
          <div className="hero__craft-copy">
            <span className="eyebrow">The Craft</span>
            <h2 className="hero__craft-headline">
              The shirt worn<br />
              on the pitch.<br />
              <em style={{ fontStyle: "italic", color: "var(--gold-deep)" }}>With your name on it.</em>
            </h2>
            <p className="hero__craft-body">
              HUNCH sources only player-issue authentic jerseys — not the replica
              sold in the stands. We press your name in the official competition
              typeface, the same lettering film used by the clubs&apos; own kit
              manufacturers. Every order is hand-inspected before it leaves our
              London atelier.
            </p>
            <Link href="/the-house" className="hero__craft-link">
              Our story
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div className="hero__craft-visual" aria-hidden="true">
            <span className="hero__craft-text">H</span>
          </div>
        </div>
      </div>
    </main>
  );
}
