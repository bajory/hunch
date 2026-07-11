import {
  Merriweather,
  Libre_Caslon_Display,
  Playfair_Display,
  Cormorant_Garamond,
  Lora,
  DM_Serif_Display,
  Merriweather_Sans,
  Manrope,
  Inter,
  Work_Sans,
  Sora,
  Space_Grotesk,
  Saira,
  Archivo,
  Oswald,
  Teko,
  Rajdhani,
} from "next/font/google";
import localFont from "next/font/local";

/* ── Brand typeface pairing — admin-controlled ────────────────────────────
   The site's only two "voice" fonts (display/editorial serif + UI/body sans),
   picked from these curated, pre-loaded presets via /admin/content →
   Typography. Every preset is self-hosted through next/font (no external
   requests, no layout shift) — the admin's choice just switches which
   preset's CSS variable the generic --font-serif / --font-sans aliases point
   to (see resolveTypographyStyle below + the <style> tag in app/layout.tsx).
   Adding a new option later is one entry in a preset list, no other file
   needs to change. */

export interface FontPreset {
  id: string;
  label: string;
  /** The literal CSS custom-property name (e.g. "--font-serif-merriweather") —
      what you put inside var(...). NOT the same as next/font's `.variable`,
      which is a *class name* that activates that property when applied to an
      element. Mixing the two up means var() gets a class name instead of a
      "--"-prefixed property name — invalid CSS, silently dropped, and the
      browser falls all the way back to its default font. */
  cssVar: string;
  /** next/font's class name — apply to <body> so `cssVar` above is defined. */
  variable: string;
  /** next/font's other class name — sets font-family directly; only for one-off previews. */
  className: string;
}

const merriweather = Merriweather({ subsets: ["latin"], weight: ["300", "400", "700"], variable: "--font-serif-merriweather" });
const caslon       = Libre_Caslon_Display({ subsets: ["latin"], weight: ["400"], variable: "--font-serif-caslon" });
const playfair      = Playfair_Display({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-serif-playfair" });
const cormorant     = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-serif-cormorant" });
const lora          = Lora({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-serif-lora" });
const dmSerif       = DM_Serif_Display({ subsets: ["latin"], weight: ["400"], variable: "--font-serif-dm-serif" });

const merriweatherSans = Merriweather_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans-merriweather-sans" });
const manrope           = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans-manrope" });
const inter             = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans-inter" });
const workSans          = Work_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans-work-sans" });
const sora              = Sora({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans-sora" });
const spaceGrotesk      = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans-space-grotesk" });

export const SERIF_FONTS: FontPreset[] = [
  { id: "merriweather", label: "Merriweather", cssVar: "--font-serif-merriweather", variable: merriweather.variable, className: merriweather.className },
  { id: "caslon",       label: "Libre Caslon Display", cssVar: "--font-serif-caslon", variable: caslon.variable, className: caslon.className },
  { id: "playfair",     label: "Playfair Display", cssVar: "--font-serif-playfair", variable: playfair.variable, className: playfair.className },
  { id: "cormorant",    label: "Cormorant Garamond", cssVar: "--font-serif-cormorant", variable: cormorant.variable, className: cormorant.className },
  { id: "lora",         label: "Lora", cssVar: "--font-serif-lora", variable: lora.variable, className: lora.className },
  { id: "dm-serif",     label: "DM Serif Display", cssVar: "--font-serif-dm-serif", variable: dmSerif.variable, className: dmSerif.className },
];

export const SANS_FONTS: FontPreset[] = [
  { id: "merriweather-sans", label: "Merriweather Sans", cssVar: "--font-sans-merriweather-sans", variable: merriweatherSans.variable, className: merriweatherSans.className },
  { id: "manrope",           label: "Manrope", cssVar: "--font-sans-manrope", variable: manrope.variable, className: manrope.className },
  { id: "inter",             label: "Inter", cssVar: "--font-sans-inter", variable: inter.variable, className: inter.className },
  { id: "work-sans",         label: "Work Sans", cssVar: "--font-sans-work-sans", variable: workSans.variable, className: workSans.className },
  { id: "sora",              label: "Sora", cssVar: "--font-sans-sora", variable: sora.variable, className: sora.className },
  { id: "space-grotesk",     label: "Space Grotesk", cssVar: "--font-sans-space-grotesk", variable: spaceGrotesk.variable, className: spaceGrotesk.className },
];

export const DEFAULT_SERIF_ID = "merriweather";
export const DEFAULT_SANS_ID = "merriweather-sans";

/** Resolves an admin-picked id to a loaded preset, falling back to the default
    if the id is unknown (e.g. a stale value from before a preset was removed). */
export function serifPreset(id: string | undefined): FontPreset {
  return SERIF_FONTS.find((f) => f.id === id) ?? SERIF_FONTS.find((f) => f.id === DEFAULT_SERIF_ID)!;
}
export function sansPreset(id: string | undefined): FontPreset {
  return SANS_FONTS.find((f) => f.id === id) ?? SANS_FONTS.find((f) => f.id === DEFAULT_SANS_ID)!;
}

const FONT_FORMATS: Record<string, string> = {
  woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype",
};

/** Guards against the URL breaking out of the inline <style> tag it's
    embedded in — cheap defense in depth even though these URLs only ever
    come from our own upload action, never raw user text. */
function safeFontUrl(url: string | undefined): string | null {
  if (!url || /['"<>\s]/.test(url)) return null;
  return url;
}

function fontFaceRule(family: string, url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const format = FONT_FORMATS[ext] ?? "woff2";
  return `@font-face{font-family:'${family}';src:url('${url}') format('${format}');font-display:swap;}`;
}

/** The tiny inline <style> that makes the pick live: aliases the generic
    --font-serif / --font-sans (read by every stylesheet) to whichever
    preset's own variable the admin selected — or to an admin-uploaded custom
    font file, layered in front of that preset as its fallback. */
export function resolveTypographyStyle(t: {
  serifId?: string; sansId?: string; customSerifUrl?: string; customSansUrl?: string;
}): string {
  const s = serifPreset(t.serifId);
  const a = sansPreset(t.sansId);
  const customSerif = safeFontUrl(t.customSerifUrl);
  const customSans = safeFontUrl(t.customSansUrl);

  const faces = [
    customSerif ? fontFaceRule("HunchCustomSerif", customSerif) : "",
    customSans ? fontFaceRule("HunchCustomSans", customSans) : "",
  ].join("");
  const serifFamily = customSerif ? `'HunchCustomSerif', var(${s.cssVar})` : `var(${s.cssVar})`;
  const sansFamily = customSans ? `'HunchCustomSans', var(${a.cssVar})` : `var(${a.cssVar})`;

  return `${faces}:root{--font-serif:${serifFamily};--font-sans:${sansFamily}}`;
}

/* competition lettering stand-ins */
export const saira = Saira({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-saira" });
export const archivo = Archivo({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-archivo" });
export const oswald = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-oswald" });
export const teko = Teko({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-teko" });
export const rajdhani = Rajdhani({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-rajdhani" });

/* official club lettering (self-hosted) */
export const fcbUcl = localFont({
  src: "../fonts/Barcelona-UCL.otf",
  variable: "--font-fcb-ucl",
  display: "swap",
});
export const fcbLiga = localFont({
  src: "../fonts/Barcelona-LaLiga.otf",
  variable: "--font-fcb-liga",
  display: "swap",
});

/* Every font CSS-variable classNames, applied once on <body> — includes every
   typography PRESET (not just the active one) so all their CSS variables
   exist regardless of which one is currently selected. Deliberately `.variable`
   (defines the custom property) rather than `.className` (would also force
   font-family directly and fight the cascade across multiple presets). */
export const fontVariables = [
  ...SERIF_FONTS.map((f) => f.variable),
  ...SANS_FONTS.map((f) => f.variable),
  saira.variable, archivo.variable, oswald.variable, teko.variable, rajdhani.variable,
  fcbUcl.variable, fcbLiga.variable,
].join(" ");
