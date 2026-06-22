import Link from "next/link";
import { TEAMS, COMPETITIONS } from "@/lib/catalog";
import { JerseySilhouette } from "@/components/jersey/art";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collections — HUNCH",
  description: "Browse all six HUNCH luxury jersey collections. Authentic matchwear for the season's elite clubs.",
};

export default function Collections() {
  return (
    <main>
      {/* Header */}
      <div className="collections-header">
        <div>
          <span className="eyebrow">Season 25 / 26</span>
          <h1 className="collections-headline">The Collection</h1>
        </div>
        <p className="collections-meta">6 clubs · 5 competitions · made to your name</p>
      </div>

      {/* Grid */}
      <div className="collections-grid">
        {Object.values(TEAMS).map((team) => {
          const comp = COMPETITIONS[team.league];
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
                <div className="club-card__name">{team.name}</div>
                <div className="club-card__edition">{team.edition}</div>
                <div className="club-card__footer">
                  <span className="club-card__price">From ${team.price}</span>
                  <span className="club-card__cta">
                    Customise
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
