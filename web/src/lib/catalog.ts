/* =========================================================================
   HUNCH — Atelier catalog (typed)
   -------------------------------------------------------------------------
   Ported from the prototype data model. This is the canonical SHAPE of the
   catalog and also the local fallback used when Sanity isn't configured
   (see src/lib/cms.ts). Fonts reference next/font CSS variables.
   ========================================================================= */

export type CompetitionId = "laliga" | "premier" | "seriea" | "bundesliga" | "ligue1" | "ucl" | "worldcup";
export type TeamId = "real-madrid" | "barcelona" | "man-city" | "liverpool" | "inter" | "bayern";
export type View = "front" | "back";
export type KitTypeId = "home" | "away" | "third" | "fourth" | "retro" | "special";

/** Home stays keyed by the bare competition id (backward compatible with the
    local PRINT fallback below, which predates kit types); every other kit
    type gets its own suffixed slot so it can carry independent calibration. */
export function printSlot(competition: CompetitionId | string, kitType: KitTypeId = "home"): string {
  return kitType === "home" ? competition : `${competition}__${kitType}`;
}

export interface Competition {
  id: CompetitionId;
  label: string;
  kind: "league" | "continental" | "international";
  patch: CompetitionId;
  fontFamily: string;
  nameWeight: number;
  numberWeight: number;
  tracking: string;
  uppercase: boolean;
}

export interface Kit {
  body: string;
  bodyShade: string;
  collar: string;
  accent: string;
  leagueFill: string;
  leagueStroke: string;
  uclFill: string;
  crestText: string;
  crestBg: string;
  crestFg: string;
  sponsor: string;
  stripes: { colors: [string, string]; width: number } | null;
}

export interface RosterPlayer {
  name: string;
  number: number;
}

export interface Team {
  id: TeamId;
  name: string;
  edition: string;
  league: CompetitionId;
  price: number;
  kit: Kit;
  roster: RosterPlayer[];
}

export interface NameGeo {
  cy: number; span: number; arc: number; size: number;
  /** Letter-spacing override in em, as a plain number — falls back to the competition's tracking when unset */
  tracking?: number;
}
export interface NumberGeo {
  cy: number;
  size: number;
  /** Gap between digits as a fraction of image width — only used in 'svg_glyphs' number mode */
  gap?: number;
}
export interface PrintImages { back: string; front: string }
export interface SleeveGeo {
  src: string;
  /** Top-left X as fraction of image W, measured in the FRONT view (mirrored automatically for back) */
  x: number;
  /** Top-left Y as fraction of image H */
  y: number;
  /** Patch width as fraction of image W (height derived from natural aspect ratio) */
  w: number;
  /** Natural pixel dimensions of the patch image (for correct aspect ratio) */
  patchW: number;
  patchH: number;
  /** Rotation in degrees, applied around the patch's own center */
  rotation?: number;
}

export interface GlyphImage {
  url: string;
  /** Natural pixel dimensions — lets each digit keep its own true aspect ratio when laid out side by side */
  w: number;
  h: number;
}

export interface KitColors {
  nameFill: string;
  nameStroke: string;
  numberFill: string;
  numberStroke: string;
}

// Keyed by printSlot(competition, kitType) — the bare competition id for the
// home kit, `${competition}__${kitType}` for away/third/fourth, so each kit
// type carries fully independent calibration (it's a different physical shirt).
export interface PrintEntry {
  font?: string | Partial<Record<CompetitionId, string>>;
  /** Shared fallback geometry (used when no per-slot entry exists) */
  name?: NameGeo;
  number?: NumberGeo;
  /** Per-slot geometry overrides */
  nameGeo?: Partial<Record<string, NameGeo>>;
  numberGeo?: Partial<Record<string, NumberGeo>>;
  images?: Partial<Record<string, PrintImages>>;
  patchImages?: Partial<Record<string, string>>;
  sleeveImages?: Partial<Record<string, SleeveGeo>>;
  /** Per-slot lettering color overrides from the admin calibrator */
  colors?: Partial<Record<string, KitColors>>;
  /** Per-slot custom font URLs uploaded via admin */
  fontUrls?: Partial<Record<string, { name?: string; number?: string }>>;
  /** Per-slot number rendering mode */
  numberMode?: Partial<Record<string, "font" | "svg_glyphs">>;
  /** Per-slot digit glyphs (digit string "0"–"9" → image + natural size) */
  glyphs?: Partial<Record<string, Record<string, GlyphImage>>>;
  /** Extra gallery photos uploaded via admin, keyed by kit type (shared across that kit's competitions) */
  gallery?: Partial<Record<KitTypeId, string[]>>;
}

export interface ResolvedPrint {
  src: string;
  name: NameGeo;
  number: NumberGeo;
  fontNameUrl?: string;
  fontNumberUrl?: string;
  numberMode?: "font" | "svg_glyphs";
  glyphs?: Record<string, GlyphImage>;
}


/* ---- competitions ---- */
export const COMPETITIONS: Record<CompetitionId, Competition> = {
  laliga:     { id: "laliga",     label: "La Liga",                kind: "league",      patch: "laliga",     fontFamily: "var(--font-saira), sans-serif",   nameWeight: 600, numberWeight: 700, tracking: "0.06em", uppercase: true },
  premier:    { id: "premier",    label: "Premier League",         kind: "league",      patch: "premier",    fontFamily: "var(--font-archivo), sans-serif", nameWeight: 700, numberWeight: 800, tracking: "0.01em", uppercase: true },
  seriea:     { id: "seriea",     label: "Serie A",                kind: "league",      patch: "seriea",     fontFamily: "var(--font-oswald), sans-serif",  nameWeight: 600, numberWeight: 700, tracking: "0.03em", uppercase: true },
  bundesliga: { id: "bundesliga", label: "Bundesliga",             kind: "league",      patch: "bundesliga", fontFamily: "var(--font-teko), sans-serif",    nameWeight: 600, numberWeight: 700, tracking: "0.04em", uppercase: true },
  ucl:        { id: "ucl",        label: "UEFA Champions League",  kind: "continental", patch: "ucl",        fontFamily: "var(--font-rajdhani), sans-serif",nameWeight: 600, numberWeight: 700, tracking: "0.10em", uppercase: true },
  ligue1:     { id: "ligue1",     label: "Ligue 1",                kind: "league",      patch: "ligue1",     fontFamily: "var(--font-archivo), sans-serif", nameWeight: 700, numberWeight: 800, tracking: "0.02em", uppercase: true },
  worldcup:   { id: "worldcup",   label: "FIFA World Cup 2026",    kind: "international", patch: "worldcup", fontFamily: "var(--font-rajdhani), sans-serif",nameWeight: 700, numberWeight: 800, tracking: "0.08em", uppercase: true },
};

export const PATCHES: Record<CompetitionId, { label: string; sleeve: string }> = {
  laliga:     { label: "La Liga", sleeve: "Right sleeve" },
  premier:    { label: "Premier League", sleeve: "Right sleeve" },
  seriea:     { label: "Serie A", sleeve: "Right sleeve" },
  bundesliga: { label: "Bundesliga", sleeve: "Right sleeve" },
  ucl:        { label: "Champions League", sleeve: "Right sleeve" },
  ligue1:     { label: "Ligue 1", sleeve: "Right sleeve" },
  worldcup:   { label: "FIFA World Cup 2026", sleeve: "Right sleeve" },
};

/* ---- teams ---- */
export const TEAMS: Record<TeamId, Team> = {
  "real-madrid": {
    id: "real-madrid", name: "Real Madrid", edition: "Home Authentic · 25/26", league: "laliga", price: 165,
    kit: { body: "#F7F7F4", bodyShade: "#E7E7E2", collar: "#1E2A55", accent: "#C9A24B", leagueFill: "#1E2A55", leagueStroke: "none", uclFill: "#1E2A55", crestText: "RM", crestBg: "#1E2A55", crestFg: "#C9A24B", sponsor: "FLY EMIRATES", stripes: null },
    roster: [ { name: "MBAPPÉ", number: 9 }, { name: "BELLINGHAM", number: 5 }, { name: "VINI JR", number: 7 }, { name: "RODRYGO", number: 11 } ],
  },
  barcelona: {
    id: "barcelona", name: "FC Barcelona", edition: "Home Authentic · 25/26", league: "laliga", price: 165,
    kit: { body: "#A50044", bodyShade: "#7E0033", collar: "#FFED02", accent: "#FFED02", leagueFill: "#FFED02", leagueStroke: "#1A1A2E", uclFill: "#FFED02", crestText: "FCB", crestBg: "#FFED02", crestFg: "#A50044", sponsor: "SPOTIFY", stripes: { colors: ["#A50044", "#004D98"], width: 46 } },
    roster: [ { name: "LEWANDOWSKI", number: 9 }, { name: "YAMAL", number: 19 }, { name: "PEDRI", number: 8 }, { name: "RAPHINHA", number: 11 } ],
  },
  "man-city": {
    id: "man-city", name: "Manchester City", edition: "Home Authentic · 25/26", league: "premier", price: 160,
    kit: { body: "#6CABDD", bodyShade: "#4E93C8", collar: "#1C2C5B", accent: "#F0C75E", leagueFill: "#FFFFFF", leagueStroke: "#1C2C5B", uclFill: "#1C2C5B", crestText: "MC", crestBg: "#FFFFFF", crestFg: "#1C2C5B", sponsor: "ETIHAD", stripes: null },
    roster: [ { name: "HAALAND", number: 9 }, { name: "DE BRUYNE", number: 17 }, { name: "FODEN", number: 47 }, { name: "RODRI", number: 16 } ],
  },
  liverpool: {
    id: "liverpool", name: "Liverpool", edition: "Home Authentic · 25/26", league: "premier", price: 160,
    kit: { body: "#C8102E", bodyShade: "#9E0C24", collar: "#F6EB61", accent: "#F6EB61", leagueFill: "#FFFFFF", leagueStroke: "#7E0C20", uclFill: "#FFFFFF", crestText: "LFC", crestBg: "#FFFFFF", crestFg: "#C8102E", sponsor: "STANDARD CHARTERED", stripes: null },
    roster: [ { name: "SALAH", number: 11 }, { name: "VAN DIJK", number: 4 }, { name: "SZOBOSZLAI", number: 8 }, { name: "GAKPO", number: 18 } ],
  },
  inter: {
    id: "inter", name: "Inter Milan", edition: "Home Authentic · 25/26", league: "seriea", price: 158,
    kit: { body: "#1A1A1A", bodyShade: "#0E0E0E", collar: "#0B1F5B", accent: "#C9A24B", leagueFill: "#FFFFFF", leagueStroke: "none", uclFill: "#FFFFFF", crestText: "IM", crestBg: "#FFFFFF", crestFg: "#0B1F5B", sponsor: "BETSSON", stripes: { colors: ["#1A1A1A", "#0B3FA8"], width: 40 } },
    roster: [ { name: "LAUTARO", number: 10 }, { name: "THURAM", number: 9 }, { name: "BARELLA", number: 23 }, { name: "ÇALHANOĞLU", number: 20 } ],
  },
  bayern: {
    id: "bayern", name: "Bayern München", edition: "Home Authentic · 25/26", league: "bundesliga", price: 158,
    kit: { body: "#DC052D", bodyShade: "#AE0423", collar: "#0066B2", accent: "#FFFFFF", leagueFill: "#FFFFFF", leagueStroke: "#8E0420", uclFill: "#FFFFFF", crestText: "FCB", crestBg: "#FFFFFF", crestFg: "#DC052D", sponsor: "T", stripes: null },
    roster: [ { name: "KANE", number: 9 }, { name: "MUSIALA", number: 42 }, { name: "SANÉ", number: 10 }, { name: "KIMMICH", number: 6 } ],
  },
};

/* ---- print: photos + overlay geometry ---- */
export const PRINT_DEFAULT = {
  name: { cy: 0.34, span: 0.42, arc: 0.045, size: 0.052 } as NameGeo,
  number: { cy: 0.52, size: 0.26, gap: 0.008 } as NumberGeo,
};

export const PRINT: Partial<Record<TeamId, PrintEntry>> = {
  barcelona: {
    font: {
      ucl: "var(--font-fcb-ucl), var(--font-rajdhani), sans-serif",
      laliga: "var(--font-fcb-liga), var(--font-saira), sans-serif",
    },
    name: { cy: 0.278, span: 0.46, arc: 0.166, size: 0.07 },
    number: { cy: 0.404, size: 0.35 },
    images: {
      ucl:    { back: "/img/barcelona/ucl/back.png", front: "/img/barcelona/ucl/front.png" },
      laliga: { back: "/img/barcelona/ucl/back.png", front: "/img/barcelona/ucl/front.png" },
    },
    patchImages: {
      ucl:    "/img/barcelona/ucl/patch.png",
      laliga: "/img/barcelona/laliga/patch.png",
    },
    sleeveImages: {
      ucl:    { src: "/img/barcelona/ucl/sleeve-patch.png",    x: 0.828, y: 0.241, w: 0.0517, patchW: 62,  patchH: 144 },
      laliga: { src: "/img/barcelona/laliga/sleeve-patch.png", x: 0.823, y: 0.241, w: 0.0542, patchW: 65,  patchH: 136 },
    },
  },
  "real-madrid": {
    name: { cy: 0.25, span: 0.36, arc: 0.038, size: 0.05 },
    number: { cy: 0.43, size: 0.22 },
    images: {
      ucl: { back: "/img/real-madrid/ucl/back.jpg", front: "/img/real-madrid/ucl/front.jpg" },
    },
  },
};

export const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export const CUSTOMIZATION_FEE = 25;

/* ---- helpers ---- */
export function competitionsForTeam(teamId: TeamId): CompetitionId[] {
  return [TEAMS[teamId].league, "ucl"];
}

export function printFor(
  teamId: TeamId, competition: CompetitionId, view: View,
  printMap?: Partial<Record<string, PrintEntry>>, kitType: KitTypeId = "home",
): ResolvedPrint | null {
  const p = (printMap ?? PRINT)[teamId];
  const slot = printSlot(competition, kitType);
  const src = p?.images?.[slot]?.[view];
  if (!src) return null;
  const fontUrls = p?.fontUrls?.[slot];
  return {
    src,
    name:   { ...PRINT_DEFAULT.name,   ...(p?.name   ?? {}), ...(p?.nameGeo?.[slot]   ?? {}) },
    number: { ...PRINT_DEFAULT.number, ...(p?.number  ?? {}), ...(p?.numberGeo?.[slot] ?? {}) },
    fontNameUrl:   fontUrls?.name,
    fontNumberUrl: fontUrls?.number,
    numberMode: p?.numberMode?.[slot],
    // Digit artwork is now per kit type — keyed by the same printSlot as
    // geometry, images and colours.
    glyphs:     p?.glyphs?.[slot],
  };
}

/** Real patch image for a team+competition+kit, or null if none uploaded. */
export function patchImageFor(
  teamId: TeamId, competition: CompetitionId,
  printMap?: Partial<Record<string, PrintEntry>>, kitType: KitTypeId = "home",
): string | null {
  return (printMap ?? PRINT)[teamId]?.patchImages?.[printSlot(competition, kitType)] ?? null;
}

/** Sleeve patch geometry for a team+competition+kit, or null if none uploaded. */
export function sleeveFor(
  teamId: TeamId, competition: CompetitionId,
  printMap?: Partial<Record<string, PrintEntry>>, kitType: KitTypeId = "home",
): SleeveGeo | null {
  return (printMap ?? PRINT)[teamId]?.sleeveImages?.[printSlot(competition, kitType)] ?? null;
}

/**
 * Live-calibrated back/front photo for a team+kitType, if the admin has
 * uploaded one — checked across any competition, since a kit's photo is the
 * same physical shirt shared across all of that kit type's competitions.
 * The static commerce catalog (lib/products.ts) ships a photo at build time;
 * this lets an admin upload override it on the storefront without a redeploy.
 */
export function livePhotosFor(
  teamSlug: string, kitType: KitTypeId, printMap?: Partial<Record<string, PrintEntry>>,
): { front?: string; back?: string } | null {
  const map = (printMap ?? PRINT) as Partial<Record<string, PrintEntry>>;
  const images = map[teamSlug]?.images;
  if (!images) return null;
  const suffix = kitType === "home" ? null : `__${kitType}`;
  for (const [slot, img] of Object.entries(images)) {
    const matches = suffix ? slot.endsWith(suffix) : !slot.includes("__");
    if (matches && img && (img.front || img.back)) {
      return { front: img.front || undefined, back: img.back || undefined };
    }
  }
  return null;
}

/** Extra gallery photos an admin has uploaded for this team+kitType, if any. */
export function liveGalleryFor(
  teamSlug: string, kitType: KitTypeId, printMap?: Partial<Record<string, PrintEntry>>,
): string[] {
  const map = (printMap ?? PRINT) as Partial<Record<string, PrintEntry>>;
  return map[teamSlug]?.gallery?.[kitType] ?? [];
}

/** Official-font override per team (string or per-competition), else the competition stand-in. */
export function letteringFont(teamId: TeamId, competition: CompetitionId, competitionsMap?: Record<string, Competition>): string {
  const ov = PRINT[teamId]?.font;
  const o = typeof ov === "string" ? ov : ov?.[competition];
  const compMap = competitionsMap ?? COMPETITIONS;
  return o || compMap[competition]?.fontFamily || "sans-serif";
}
