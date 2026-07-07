/**
 * CMS data access layer.
 * Queries Supabase when NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 * are set; falls back to local catalog.ts so dev always works without credentials.
 */
import { supabase } from "./supabase";
import { createAdminClient } from "./supabase-admin";
import {
  TEAMS, COMPETITIONS, PRINT, PRINT_DEFAULT, SIZES, CUSTOMIZATION_FEE, PATCHES,
  competitionsForTeam, printFor, letteringFont, patchImageFor, sleeveFor, printSlot,
  type Team, type TeamId, type Competition, type CompetitionId,
  type PrintEntry, type SleeveGeo, type View, type ResolvedPrint, type Kit, type KitColors, type KitTypeId,
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
  kit_type: KitTypeId;
  back_photo_url: string | null; front_photo_url: string | null;
  gallery_urls: string[] | null;
  panel_patch_url: string | null;
  sleeve_patch_url: string | null;
  sleeve_x: number | null; sleeve_y: number | null;
  sleeve_w: number | null; sleeve_patch_w: number | null; sleeve_patch_h: number | null;
  sleeve_rotation: number | null;
  name_cy: number | null; name_span: number | null;
  name_arc: number | null; name_size: number | null; name_tracking: number | null;
  number_cy: number | null; number_size: number | null; number_glyph_gap: number | null;
  name_fill: string | null; name_stroke: string | null;
  number_fill: string | null; number_stroke: string | null;
  font_name_url: string | null;
  font_number_url: string | null;
  number_mode: string | null;
}

interface GlyphRow {
  team_id: string;
  competition_id: string;
  kit_type: string | null;
  digit: number;
  svg_url: string;
  glyph_w: number | null;
  glyph_h: number | null;
}

// ─── Row → domain mappers ────────────────────────────────────

function rowToCompetition(r: CompRow): Competition {
  return {
    id:           r.id as CompetitionId,
    label:        r.label,
    kind:         r.kind as "league" | "continental" | "international",
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

function buildPrintMap(kits: KitRow[], glyphs: GlyphRow[]): Partial<Record<string, PrintEntry>> {
  const out: Partial<Record<string, PrintEntry>> = {};

  for (const k of kits) {
    if (!out[k.team_id]) out[k.team_id] = {};
    const entry = out[k.team_id]!;
    // Each kit type (home/away/third/fourth) is a distinct physical shirt, so
    // it gets its own slot — home keeps the bare competition id for backward
    // compatibility with the local PRINT fallback below.
    const slot = printSlot(k.competition_id as CompetitionId, k.kit_type ?? "home");

    // images
    if (k.back_photo_url || k.front_photo_url) {
      entry.images ??= {};
      entry.images[slot] = {
        back:  k.back_photo_url  ?? "",
        front: k.front_photo_url ?? "",
      };
    }

    // extra gallery photos — shared per team+kitType (same physical shirt), not per competition
    if (k.gallery_urls && k.gallery_urls.length) {
      entry.gallery ??= {};
      entry.gallery[k.kit_type ?? "home"] = k.gallery_urls;
    }

    // panel patch
    if (k.panel_patch_url) {
      entry.patchImages ??= {};
      entry.patchImages[slot] = k.panel_patch_url;
    }

    // sleeve patch
    if (k.sleeve_patch_url && k.sleeve_x != null && k.sleeve_y != null &&
        k.sleeve_w != null && k.sleeve_patch_w != null && k.sleeve_patch_h != null) {
      entry.sleeveImages ??= {};
      entry.sleeveImages[slot] = {
        src:    k.sleeve_patch_url,
        x:      k.sleeve_x,
        y:      k.sleeve_y,
        w:      k.sleeve_w,
        patchW: k.sleeve_patch_w,
        patchH: k.sleeve_patch_h,
        rotation: k.sleeve_rotation ?? 0,
      };
    }

    // per-slot geometry
    if (k.name_cy != null) {
      entry.nameGeo ??= {};
      entry.nameGeo[slot] = {
        cy:   k.name_cy,
        span: k.name_span   ?? PRINT_DEFAULT.name.span,
        arc:  k.name_arc    ?? PRINT_DEFAULT.name.arc,
        size: k.name_size   ?? PRINT_DEFAULT.name.size,
        tracking: k.name_tracking ?? undefined,
      };
    }
    if (k.number_cy != null) {
      entry.numberGeo ??= {};
      entry.numberGeo[slot] = {
        cy:   k.number_cy,
        size: k.number_size ?? PRINT_DEFAULT.number.size,
        gap:  k.number_glyph_gap ?? PRINT_DEFAULT.number.gap,
      };
    }

    // per-slot font URLs
    if (k.font_name_url || k.font_number_url) {
      entry.fontUrls ??= {};
      entry.fontUrls[slot] = {
        name:   k.font_name_url   ?? undefined,
        number: k.font_number_url ?? undefined,
      };
    }

    // per-slot color overrides
    if (k.name_fill || k.number_fill) {
      entry.colors ??= {};
      entry.colors[slot] = {
        nameFill:     k.name_fill     ?? "",
        nameStroke:   k.name_stroke   ?? "none",
        numberFill:   k.number_fill   ?? "",
        numberStroke: k.number_stroke ?? "none",
      };
    }

    // per-slot number mode
    if (k.number_mode) {
      entry.numberMode ??= {};
      entry.numberMode[slot] = k.number_mode as "font" | "svg_glyphs";
    }
  }

  // glyph URLs — second pass so all team entries already exist. Each kit type
  // now has its own independent set of digit artwork, keyed by printSlot.
  for (const g of glyphs) {
    const entry = out[g.team_id];
    if (!entry) continue;
    entry.glyphs ??= {};
    const slot = printSlot(g.competition_id as CompetitionId, (g.kit_type ?? "home") as KitTypeId);
    // Fallback 65:100 matches the old assumed-uniform 0.65 aspect ratio, for glyphs
    // uploaded before dimensions were captured (see supabase/005_glyph_dimensions.sql).
    (entry.glyphs[slot] ??= {})[String(g.digit)] = {
      url: g.svg_url,
      w: g.glyph_w ?? 65,
      h: g.glyph_h ?? 100,
    };
  }

  return out;
}

// ─── Main fetch ──────────────────────────────────────────────

async function fetchFromSupabase(): Promise<CatalogData> {
  // Read with the service-role client when available (server-only). The `teams`
  // table has RLS that hides unpublished teams from the anon key — but the store
  // catalogue is the static product list, so `teams` is just calibration/roster
  // data here, and per-kit is_published (below) is the real gate. Using the admin
  // client stops RLS from silently dropping any club the admin has calibrated.
  const db = createAdminClient() ?? supabase!;
  const [
    { data: compRows,   error: e1 },
    { data: teamRows,   error: e2 },
    { data: rosterRows, error: e3 },
    { data: kitRows,    error: e4 },
    { data: glyphRows,  error: e5 },
  ] = await Promise.all([
    db.from("competitions").select("*").order("sort_order"),
    db.from("teams").select("*"),
    db.from("roster_players").select("*").order("sort_order"),
    // NOTE: not filtering on kit_type here — that column only exists once
    // supabase/004_kit_hierarchy.sql has been run. Filtering on it before the
    // migration lands makes this whole query fail (column doesn't exist) and
    // silently falls back to the local demo catalog, hiding every live edit.
    // Re-add `.eq("kit_type", "home")` once the migration is confirmed applied
    // AND the storefront/admin need to disambiguate multiple kit types per kit.
    db.from("team_competition_kits").select("*").eq("is_published", true),
    db.from("number_glyphs").select("team_id,competition_id,kit_type,digit,svg_url,glyph_w,glyph_h"),
  ]);

  if (e1 || e2 || e3 || e4 || e5) {
    console.error("[cms] Supabase fetch errors:", e1, e2, e3, e4, e5);
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

  const print = buildPrintMap(kitRows as KitRow[], glyphRows as GlyphRow[]);

  return { teams, competitions, print };
}

// ─── Public API ──────────────────────────────────────────────

let cache: { data: CatalogData; ts: number } | null = null;
const CACHE_TTL = 60_000;

export function invalidateCatalogCache() { cache = null; }

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
