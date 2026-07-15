/**
 * Editable homepage content (hero, split panels, provenance/craft band,
 * marquee) — backed by Supabase's `site_content` table so an admin can swap
 * these images and copy without a code change. Missing rows/fields fall back
 * to the defaults below, which mirror what was previously hardcoded — the
 * homepage renders identically if the table doesn't exist yet or is empty.
 */
import { supabase } from "./supabase";
import { createAdminClient } from "./supabase-admin";
import { DEFAULT_SERIF_ID, DEFAULT_SANS_ID } from "./fonts";

export interface HeroSlide {
  image: string;
  /** Optional looping background video — takes over from `image` when set (image still serves as its poster frame). */
  video?: string;
  alt: string;
  kicker: string;
  title: string;
  sub: string;
}

export interface HeroContent {
  slides: HeroSlide[];
}

export interface SplitPanel {
  kicker: string;
  title: string;
  sub: string;
  image: string;
  alt: string;
}

export interface SplitContent {
  panels: [SplitPanel, SplitPanel];
}

export interface CraftPoint {
  title: string;
  body: string;
}

export interface CraftStat {
  value: string;
  label: string;
}

export interface CraftContent {
  image: string;
  alt: string;
  caption: string;
  lead: string;
  points: CraftPoint[];
  stats: CraftStat[];
}

export interface MarqueeContent {
  items: string[];
}

export interface HighlightItem {
  image: string;
  /** Optional clip — takes over from `image` when set (image still serves as its poster frame). */
  video?: string;
  title: string;
  href: string;
}

export interface HighlightsContent {
  items: HighlightItem[];
}

export interface NewArrivalItem {
  image: string;
  caption: string;
  href: string;
}

export interface NewArrivalsContent {
  items: NewArrivalItem[];
}

export interface PickTile {
  image: string;
  title: string;
  sub: string;
  href: string;
  /** Only the hero tile shows a button — season/retro are the whole card. */
  cta?: string;
}

/** The three "World Cup Picks / New Season Drops / Retro Picks" destination
    tiles — each fully admin-set (image, copy, link), no longer tied to
    whichever single product happens to match a hardcoded slug. */
export interface PicksContent {
  hero: PickTile;
  season: PickTile;
  retro: PickTile;
}

/** Which of the curated font presets (lib/fonts.ts) is currently live, plus an
    optional admin-uploaded custom font file per slot — when set, the custom
    font takes over from the preset (which still serves as its fallback). */
export interface TypographyContent {
  serifId: string;
  sansId: string;
  customSerifUrl?: string;
  customSansUrl?: string;
}

export interface SiteContent {
  hero: HeroContent;
  picks: PicksContent;
  split: SplitContent;
  craft: CraftContent;
  marquee: MarqueeContent;
  highlights: HighlightsContent;
  newArrivals: NewArrivalsContent;
  typography: TypographyContent;
}

export const SITE_CONTENT_DEFAULTS: SiteContent = {
  hero: {
    slides: [
      {
        image: "/img/products/real-madrid/home/back.png",
        alt: "Real Madrid 26/27 home jersey, back view",
        kicker: "Authentic matchwear · 26/27 & World Cup 2026",
        title: "The shirt is the statement.",
        sub: "Player-version jerseys from the clubs and nations that matter, sourced authentic and pressed to your name in our studio.",
      },
      {
        image: "/img/products/barcelona/home/back.png",
        alt: "FC Barcelona 26/27 home jersey, back view",
        kicker: "Season 26/27",
        title: "Nine clubs. One standard.",
        sub: "Home and away shirts from Europe's front row — sourced authentic, never off a retail rail.",
      },
      {
        image: "/img/products/argentina/home/front.png",
        alt: "Argentina 2026 World Cup jersey",
        kicker: "World Cup 2026",
        title: "Repping the nations.",
        sub: "Player-version tournament shirts from 17 nations, sold blank the way they arrive.",
      },
    ],
  },
  picks: {
    hero: {
      image: "/img/products/argentina/home/front.png",
      title: "World Cup Picks",
      sub: "Player-version shirts from the nations chasing it all in 2026.",
      href: "/shop?kind=national",
      cta: "Shop now",
    },
    season: {
      image: "/img/products/real-madrid/home/front.png",
      title: "New Season Drops",
      sub: "This year's club kits, fresh off the rail.",
      href: "/shop?kind=club",
    },
    retro: {
      image: "/img/retro-picks/retro-picks.png",
      title: "Retro Picks",
      sub: "Vintage-inspired kits from your favourite clubs, reissued.",
      href: "/shop?kitType=retro",
    },
  },
  split: {
    panels: [
      {
        kicker: "Season 26/27", title: "The Clubs",
        sub: "Madrid to Manchester — home and away shirts from Europe's front row.",
        image: "/img/products/barcelona/home/back.png", alt: "FC Barcelona 26/27 home jersey",
      },
      {
        kicker: "World Cup 2026", title: "The Nations",
        sub: "Player-version tournament shirts, sold blank the way they arrive.",
        image: "/img/products/psg/away/front.png", alt: "2026 World Cup jerseys",
      },
    ],
  },
  craft: {
    image: "/img/products/barcelona/home/front.png",
    alt: "Detail of an authentic FC Barcelona home shirt",
    caption: "FC Barcelona · Home · 26/27 — player issue",
    lead: "A replica is a souvenir. What we carry is the shirt the squad actually wears — the engineered version, sourced through the club, never off a retail rail.",
    points: [
      { title: "Match-issue fabric", body: "Player-version knit built for the pitch, not the polymer weight of the replica." },
      { title: "Bonded, not stitched-on", body: "Crest and sponsor heat-applied to the club’s own specification — the finish the kit man signs off." },
      { title: "Personalised, or not at all", body: "Name and number pressed in the official typeface — or left blank, exactly as it arrived. Your call." },
    ],
    stats: [
      { value: "60", label: "Jerseys in stock" },
      { value: "26", label: "Clubs & nations" },
      { value: "100%", label: "Authentic, always" },
    ],
  },
  marquee: {
    items: ["Authentic", "Player Version", "Season 26/27", "World Cup 2026", "Made to Name"],
  },
  highlights: {
    items: [
      { image: "/img/products/real-madrid/home/front.png", title: "Matchday, Bernabéu", href: "/product/real-madrid-home" },
      { image: "/img/products/barcelona/away/front.png", title: "The away kit, unveiled", href: "/product/barcelona-away" },
      { image: "/img/products/psg/home/back.png", title: "Bonded, not printed", href: "/house" },
      { image: "/img/products/argentina/home/front.png", title: "Road to the World Cup", href: "/shop?kind=national" },
    ],
  },
  newArrivals: {
    items: [
      { image: "/img/products/arsenal/home/front.png", caption: "Arsenal", href: "/product/arsenal-home" },
      { image: "/img/products/chelsea/home/front.png", caption: "Chelsea", href: "/product/chelsea-home" },
      { image: "/img/products/argentina/home/front.png", caption: "Argentina", href: "/product/argentina-home" },
      { image: "/img/products/brazil/home/front.png", caption: "Brazil", href: "/product/brazil-home" },
    ],
  },
  typography: {
    serifId: DEFAULT_SERIF_ID,
    sansId: DEFAULT_SANS_ID,
  },
};

interface SiteContentRow {
  section: keyof SiteContent;
  data: unknown;
}

function mergeSection<T>(fallback: T, data: unknown): T {
  if (!data || typeof data !== "object") return fallback;
  return { ...fallback, ...(data as Partial<T>) };
}

function mergeAll(rows: SiteContentRow[]): SiteContent {
  const bySection = new Map(rows.map((r) => [r.section, r.data]));
  return {
    hero:    mergeSection(SITE_CONTENT_DEFAULTS.hero,    bySection.get("hero")),
    picks:   mergeSection(SITE_CONTENT_DEFAULTS.picks,   bySection.get("picks")),
    split:   mergeSection(SITE_CONTENT_DEFAULTS.split,   bySection.get("split")),
    craft:   mergeSection(SITE_CONTENT_DEFAULTS.craft,   bySection.get("craft")),
    marquee: mergeSection(SITE_CONTENT_DEFAULTS.marquee, bySection.get("marquee")),
    highlights: mergeSection(SITE_CONTENT_DEFAULTS.highlights, bySection.get("highlights")),
    newArrivals: mergeSection(SITE_CONTENT_DEFAULTS.newArrivals, bySection.get("newArrivals")),
    typography: mergeSection(SITE_CONTENT_DEFAULTS.typography, bySection.get("typography")),
  };
}

async function fetchSiteContent(): Promise<SiteContent> {
  const db = createAdminClient() ?? supabase!;
  const { data, error } = await db.from("site_content").select("section, data");
  if (error) throw error;
  return mergeAll((data as SiteContentRow[]) ?? []);
}

/** Server-side, uncached — used on the homepage so an admin edit shows on next load. */
export async function getSiteContentFresh(): Promise<SiteContent> {
  if (!supabase) return SITE_CONTENT_DEFAULTS;
  return fetchSiteContent().catch(() => SITE_CONTENT_DEFAULTS);
}

/** Single-row fetch — the root layout reads only this on every page (not the
    full homepage content) so the font pick applies site-wide without paying
    for hero slides/highlights/etc. on pages that don't render them. */
export async function getTypographyFresh(): Promise<TypographyContent> {
  if (!supabase) return SITE_CONTENT_DEFAULTS.typography;
  try {
    const db = createAdminClient() ?? supabase!;
    const { data, error } = await db.from("site_content").select("data").eq("section", "typography").maybeSingle();
    if (error || !data) return SITE_CONTENT_DEFAULTS.typography;
    return mergeSection(SITE_CONTENT_DEFAULTS.typography, data.data);
  } catch {
    return SITE_CONTENT_DEFAULTS.typography;
  }
}
