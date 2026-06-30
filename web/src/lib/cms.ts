/**
 * CMS data access layer.
 * Queries Supabase when NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 * are set; falls back to local catalog.ts so dev always works without credentials.
 */
import { supabase } from "./supabase";
import {
  TEAMS, COMPETITIONS, PRINT, PRINT_DEFAULT, SIZES, CUSTOMIZATION_FEE, PATCHES,
  competitionsForTeam, printFor, letteringFont, patchImageFor, sleeveFor,
  type Team, type TeamId, type Competition, type CompetitionId,
  type PrintEntry, type SleeveGeo, type View, type ResolvedPrint, type Kit,
} from "./catalog";

export type {
  Team, TeamId, Competition, CompetitionId,
  PrintEntry, SleeveGeo, View, ResolvedPrint,
};
export {
  SIZES, CUSTOMIZATION_FEE, PATCHES, PRINT_DEFAULT,
  competitionsForTeam, printFor, letteringFont, patchImageFor, sleeveFor,
} from "./catalog";

export interface CatalogData {
  teams: Record<string, Team>;
  competitions: Record<string, Competition>;
  print: Partial<Record<string, PrintEntry>>;
}

// ─── Supabase row types ──────────────────────────────────────

interface CompRow {
  id: string; label: string; kind: string;
  font_family: string | null;
  name_weight: number | null; number_weight: number | null;
  tracking: string | null; uppercase: boolean | null;
}

interface TeamRow {
  id: string; name: string; edition: string | null;
  league_id: string | null; price: number | null;
  kit_body: string | null; kit_body_shade: string | null;
  kit_collar: string | null; kit_accent: string | null;
  kit_league_fill: string | null; kit_league_stroke: string | null;
  kit_ucl_fill: string | null;
  kit_crest_text: string | null; kit_crest_bg: string | null; kit_crest_fg: string | null;
  kit_sponsor: string | null;
  kit_stripes: { colors: [string, string]; width: number } | null;
}

interface RosterRow {
  team_id: string; name: string; number: number; sort_order: number;
}

interface KitRow {
  team_id: string; competition_id: string;
  back_photo_url: string | null; front_photo_url: string | null;
  panel_patch_url: string | null;
  sleeve_patch_url: string | null;
  sleeve_x: number | null; sleeve_y: number | null;
  sleeve_w: number | null; sleeve_patch_w: number | null; sleeve_patch_h: number | null;
  name_cy: number | null; name_span: number | null;
  name_arc: number | null; name_size: number | null;
  number_cy: number | null; number_size: number | null;
}

// ─── Row → domain mappers ────────────────────────────────────

function rowToCompetition(r: CompRow): Competition {
  return {
    id:           r.id as CompetitionId,
    label:        r.label,
    kind:         r.kind as "league" | "continental",
    patch:        r.id as CompetitionId,
    fontFamily:   r.font_family ?? "sans-serif",
    nameWeight:   r.name_weight ?? 600,
    numberWeight: r.number_weight ?? 700,
    tracking:     r.tracking ?? "0.05em",
    uppercase:    r.uppercase ?? true,
  };
}

function rowToKit(r: TeamRow): Kit {
  return {
    body:         r.kit_body        ?? "#FFFFFF",
    bodyShade:    r.kit_body_shade  ?? "#EEEEEE",
    collar:       r.kit_collar      ?? "#000000",
    accent:       r.kit_accent      ?? "#000000",
    leagueFill:   r.kit_league_fill  ?? "#FFFFFF",
    leagueStroke: r.kit_league_stroke ?? "none",
    uclFill:      r.kit_ucl_fill    ?? "#FFFFFF",
    crestText:    r.kit_crest_text  ?? "",
    crestBg:      r.kit_crest_bg    ?? "#FFFFFF",
    crestFg:      r.kit_crest_fg    ?? "#000000",
    sponsor:      r.kit_sponsor     ?? "",
    stripes:      r.kit_stripes,
  };
}

function buildPrintMap(kits: KitRow[]): Partial<Record<string, PrintEntry>> {
  const out: Partial<Record<string, PrintEntry>> = {};

  for (const k of kits) {
    if (!out[k.team_id]) out[k.team_id] = {};
    const entry = out[k.team_id]!;

    // images
    if (k.back_photo_url || k.front_photo_url) {
      entry.images ??= {};
      entry.images[k.competition_id as CompetitionId] = {
        back:  k.back_photo_url  ?? "",
        front: k.front_photo_url ?? "",
      };
    }

    // panel patch
    if (k.panel_patch_url) {
      entry.patchImages ??= {};
      entry.patchImages[k.competition_id as CompetitionId] = k.panel_patch_url;
    }

    // sleeve patch
    if (k.sleeve_patch_url && k.sleeve_x != null && k.sleeve_y != null &&
        k.sleeve_w != null && k.sleeve_patch_w != null && k.sleeve_patch_h != null) {
      entry.sleeveImages ??= {};
      entry.sleeveImages[k.competition_id as CompetitionId] = {
        src:    k.sleeve_patch_url,
        x:      k.sleeve_x,
        y:      k.sleeve_y,
        w:      k.sleeve_w,
        patchW: k.sleeve_patch_w,
        patchH: k.sleeve_patch_h,
      };
    }

    // geometry (use first kit row per team as the shared name/number geo)
    if (k.name_cy != null && !entry.name) {
      entry.name = {
        cy:   k.name_cy,
        span: k.name_span   ?? PRINT_DEFAULT.name.span,
        arc:  k.name_arc    ?? PRINT_DEFAULT.name.arc,
        size: k.name_size   ?? PRINT_DEFAULT.name.size,
      };
    }
    if (k.number_cy != null && !entry.number) {
      entry.number = {
        cy:   k.number_cy,
        size: k.number_size ?? PRINT_DEFAULT.number.size,
      };
    }
  }

  return out;
}

// ─── Main fetch ──────────────────────────────────────────────

async function fetchFromSupabase(): Promise<CatalogData> {
  const [
    { data: compRows,   error: e1 },
    { data: teamRows,   error: e2 },
    { data: rosterRows, error: e3 },
    { data: kitRows,    error: e4 },
  ] = await Promise.all([
    supabase!.from("competitions").select("*").order("sort_order"),
    supabase!.from("teams").select("*").eq("is_published", true),
    supabase!.from("roster_players").select("*").order("sort_order"),
    supabase!.from("team_competition_kits").select("*").eq("is_published", true),
  ]);

  if (e1 || e2 || e3 || e4) {
    console.error("[cms] Supabase fetch errors:", e1, e2, e3, e4);
    throw new Error("Supabase fetch failed");
  }

  const competitions: Record<string, Competition> = {};
  for (const r of (compRows as CompRow[])) {
    competitions[r.id] = rowToCompetition(r);
  }

  const roster: Record<string, RosterRow[]> = {};
  for (const r of (rosterRows as RosterRow[])) {
    (roster[r.team_id] ??= []).push(r);
  }

  const teams: Record<string, Team> = {};
  for (const r of (teamRows as TeamRow[])) {
    teams[r.id] = {
      id:      r.id as TeamId,
      name:    r.name,
      edition: r.edition ?? "",
      league:  (r.league_id ?? "laliga") as CompetitionId,
      price:   r.price ?? 160,
      kit:     rowToKit(r),
      roster:  (roster[r.id] ?? []).sort((a, b) => a.sort_order - b.sort_order).map(p => ({
        name:   p.name,
        number: p.number,
      })),
    };
  }

  const print = buildPrintMap(kitRows as KitRow[]);

  return { teams, competitions, print };
}

// ─── Public API ──────────────────────────────────────────────

let cache: { data: CatalogData; ts: number } | null = null;
const CACHE_TTL = 60_000; // 60s — short enough to pick up admin edits

export async function getCatalog(): Promise<CatalogData> {
  // Use local catalog when Supabase is not configured
  if (!supabase) {
    return {
      teams:        TEAMS as unknown as Record<string, Team>,
      competitions: COMPETITIONS as unknown as Record<string, Competition>,
      print:        PRINT,
    };
  }

  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) return cache.data;

  try {
    const data = await fetchFromSupabase();
    cache = { data, ts: now };
    return data;
  } catch {
    // On error, serve stale cache or fall back to local catalog
    if (cache) return cache.data;
    console.warn("[cms] Supabase unavailable — using local catalog fallback");
    return {
      teams:        TEAMS as unknown as Record<string, Team>,
      competitions: COMPETITIONS as unknown as Record<string, Competition>,
      print:        PRINT,
    };
  }
}

/** Server-side variant — no in-memory cache (each RSC render gets fresh data). */
export async function getCatalogFresh(): Promise<CatalogData> {
  if (!supabase) {
    return {
      teams:        TEAMS as unknown as Record<string, Team>,
      competitions: COMPETITIONS as unknown as Record<string, Competition>,
      print:        PRINT,
    };
  }
  return fetchFromSupabase().catch(() => ({
    teams:        TEAMS as unknown as Record<string, Team>,
    competitions: COMPETITIONS as unknown as Record<string, Competition>,
    print:        PRINT,
  }));
}
