/**
 * CMS data access layer — tries Sanity first, falls back to local catalog.ts.
 * All components should import from here rather than catalog.ts directly so
 * that switching to Sanity as source of truth requires no component changes.
 */
import {
  TEAMS, COMPETITIONS, PRINT,
  type Team, type TeamId, type Competition, type CompetitionId, type PrintEntry,
  competitionsForTeam, printFor, letteringFont,
} from "./catalog";
import { isSanityConfigured } from "@/sanity/client";
import { fetchClubs, fetchCompetitions, mapClub, mapCompetition } from "@/sanity/queries";

export type { Team, TeamId, Competition, CompetitionId, PrintEntry };
export { competitionsForTeam, printFor, letteringFont };

export interface CatalogData {
  teams: Record<TeamId, Team>;
  competitions: Record<CompetitionId, Competition>;
  print: Partial<Record<TeamId, PrintEntry>>;
}

let cached: CatalogData | null = null;

/** Load catalog from Sanity (server-side) or return local fallback. */
export async function getCatalog(): Promise<CatalogData> {
  if (cached) return cached;

  if (!isSanityConfigured()) {
    cached = { teams: TEAMS, competitions: COMPETITIONS, print: PRINT };
    return cached;
  }

  try {
    const [rawClubs, rawComps] = await Promise.all([fetchClubs(), fetchCompetitions()]);

    const competitions = rawComps.reduce<Record<string, Competition>>(
      (acc, c) => { acc[c.slug ?? c._id] = mapCompetition(c); return acc; },
      {}
    ) as Record<CompetitionId, Competition>;

    const teams: Record<string, Team> = {};
    const print: Partial<Record<string, PrintEntry>> = {};
    for (const c of rawClubs) {
      const { team, print: p } = mapClub(c);
      teams[team.id] = team;
      if (p.images || p.name || p.number || p.font) print[team.id] = p;
    }

    // Merge: Sanity data over local defaults (so local data fills gaps)
    cached = {
      teams: { ...TEAMS, ...(teams as Record<TeamId, Team>) },
      competitions: { ...COMPETITIONS, ...competitions },
      print: { ...PRINT, ...(print as Partial<Record<TeamId, PrintEntry>>) },
    };
    return cached;
  } catch (e) {
    console.error("[cms] Sanity fetch failed, using local catalog:", e);
    return { teams: TEAMS, competitions: COMPETITIONS, print: PRINT };
  }
}

/** Invalidate the cache (call in dev or after webhook revalidation). */
export function invalidateCatalogCache() {
  cached = null;
}
