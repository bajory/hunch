import Link from "next/link";
import { getCatalog } from "@/lib/cms";
import { JerseySilhouette } from "@/components/jersey/art";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections — HUNCH",
  description:
    "Browse all HUNCH luxury jersey collections. Authentic player-issue matchwear for the season's elite clubs, made to your name.",
};

export default async function Collections() {
  const { teams, competitions } = await getCatalog();
  return (
    <main>
      {/* ── Header ── */}
      <div className="collections-header">
        <div className="collections-kicker">
          <span className="eyebrow">Season 25 / 26</span>
          <span className="collections-kicker-rule" aria-hidden="true" />
        </div>
        <h1 className="collections-headline">The Collection</h1>
        <p className="collections-sub">
          {Object.keys(teams).length} clubs &nbsp;·&nbsp; {Object.keys(competitions).length} competitions &nbsp;·&nbsp; made to your name
        </p>
      </div>

      {/* ── Grid ── */}
      <div className="collections-grid">
        {Object.values(teams).map((team) => {
          const comp = competitions[team.league];
          return (
            <Link
              key={team.id}
              href={`/jerseys/${team.id}`}
              className="club-card"
              aria-label={`Configure ${team.name} jersey`}
            >
              <div className="club-card__stage" aria-hidden="true">
                <JerseySilhouette
                  team={team}
                  competition={comp}
                  name=""
                  number=""
                  view="front"
                  fontFamily={comp.fontFamily}
                />
              </div>
              <div className="club-card__body">
                <div className="club-card__edition">{team.edition}</div>
                <div className="club-card__name">{team.name}</div>
                <div className="club-card__footer">
                  <span className="club-card__price">
                    <small>From</small>${team.price}
                  </span>
                  <span className="club-card__cta">
                    Personalise
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
