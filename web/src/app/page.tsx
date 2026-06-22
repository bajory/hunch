import Link from "next/link";
import { TEAMS, COMPETITIONS } from "@/lib/catalog";
import { JerseySilhouette } from "@/components/jersey/art";

export default function Home() {
  const featured = TEAMS["barcelona"];
  const featuredComp = COMPETITIONS["laliga"];

  return (
    <main>
      {/* ── Hero ── */}
      <div className="hero">
        <div className="hero__content">
          <span className="eyebrow">The Authentic Atelier</span>
          <h1 className="hero__headline">
            Made-to-Name<br />
            <em>Match</em><br />
            Jerseys
          </h1>
          <p className="hero__sub">
            Authentic club shirts personalised with your name — or your favourite
            player&apos;s. Atelier heat-pressed to your exact specification.
          </p>
          <div className="hero__actions">
            <Link href="/collections" className="hero__cta">
              Shop Collection
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link href="/atelier" className="hero__link">
              How it works
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="hero__preview" aria-hidden="true">
          <div className="hero__jersey-frame">
            <JerseySilhouette
              team={featured}
              competition={featuredComp}
              name="YOUR NAME"
              number="10"
              view="back"
              fontFamily={featuredComp.fontFamily}
            />
          </div>
        </div>
      </div>

      {/* ── Club strip ── */}
      <div className="hero__clubs">
        <div className="hero__clubs-inner">
          <span className="hero__clubs-label">Featured clubs</span>
          {Object.values(TEAMS).map((t) => (
            <Link
              key={t.id}
              href={`/jerseys/${t.id}`}
              className="hero__club-chip"
            >
              <span
                className="hero__club-dot"
                style={
                  t.kit.stripes
                    ? { background: `linear-gradient(90deg, ${t.kit.stripes.colors[0]} 50%, ${t.kit.stripes.colors[1]} 50%)` }
                    : { background: t.kit.body }
                }
              />
              {t.name}
            </Link>
          ))}
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
    </main>
  );
}
