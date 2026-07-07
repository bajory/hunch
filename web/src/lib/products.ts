/* =========================================================================
   HUNCH — Commerce types, product-type registry, and static fallback catalog
   -------------------------------------------------------------------------
   The live catalog is DB-backed (see lib/products-db.ts → Supabase `products`
   table, managed from /admin/products). This module owns:
     · the Product type and the product-type registry (PRODUCT_TYPE_DEFS)
     · currency/price formatting
     · the static fallback list — served only when Supabase is unconfigured,
       unreachable, or the products migration hasn't run yet. It is also the
       source the 014_products.sql seed was generated from.
   Adding a future product type (hats, medallions, keychains…) is one entry
   in PRODUCT_TYPE_DEFS + the ProductType union — no DB migration needed.
   ========================================================================= */

export type ProductType =
  | "jersey" | "training" | "shorts" | "socks" | "tracksuit" | "accessory";

export type ProductKitType =
  | "home" | "away" | "third" | "fourth" | "retro" | "special";

/** @deprecated old alias — prefer ProductKitType */
export type KitType = ProductKitType;

export type Size = "S" | "M" | "L" | "XL" | "XXL";
export type LeagueId = "premier" | "laliga" | "seriea" | "bundesliga" | "ligue1";
export type ProductStatus = "available" | "coming_soon" | "archived";
export type ImageSource = "studio" | "sportsdb" | "placeholder";

export interface ProductTypeDef {
  id: ProductType;
  label: string;        // singular — "Jersey"
  plural: string;       // filter chip / table label — "Jerseys"
  sizeSet: string[];    // the sizes this type is sold in, in display order
}

/** Single source of truth for what HUNCH sells. Order = admin/select + shop chip order. */
export const PRODUCT_TYPE_DEFS: ProductTypeDef[] = [
  { id: "jersey",    label: "Jersey",    plural: "Jerseys",     sizeSet: ["S", "M", "L", "XL", "XXL"] },
  { id: "training",  label: "Training",  plural: "Training",    sizeSet: ["S", "M", "L", "XL", "XXL"] },
  { id: "shorts",    label: "Shorts",    plural: "Shorts",      sizeSet: ["S", "M", "L", "XL", "XXL"] },
  { id: "socks",     label: "Socks",     plural: "Socks",       sizeSet: ["S", "M", "L"] },
  { id: "tracksuit", label: "Tracksuit", plural: "Tracksuits",  sizeSet: ["S", "M", "L", "XL", "XXL"] },
  { id: "accessory", label: "Accessory", plural: "Accessories", sizeSet: ["One Size"] },
];

export function productTypeDef(id: string): ProductTypeDef {
  return PRODUCT_TYPE_DEFS.find((d) => d.id === id) ?? PRODUCT_TYPE_DEFS[0];
}

export const KIT_TYPE_LABELS: Record<ProductKitType, string> = {
  home: "Home", away: "Away", third: "Third", fourth: "Fourth",
  retro: "Retro", special: "Special Edition",
};

export interface ProductImages {
  front: string;
  back?: string;
  source: ImageSource;
}

export interface Product {
  slug: string;          // "real-madrid-home", "barcelona-training-top"
  teamSlug: string;      // matches Supabase teams.id; "" = unaffiliated (brand accessories)
  teamName: string;
  teamKind: "club" | "national";
  league?: LeagueId;
  name: string;          // display name — "Home Jersey · 26/27", "Training Top"
  productType: ProductType;
  kitType: ProductKitType | null;  // jerseys only — calibration join + photo override
  season: string;        // "26/27" | "2026 World Cup" | "" for evergreen items
  edition: string;
  price: number;
  status: ProductStatus;
  customizable: boolean; // master switch for the Personalise studio (jersey-family only)
  sizes: Record<string, number>;   // size → units in stock (0 = unavailable)
  images: ProductImages;
  gallery?: string[];
  badge?: string;
  colors?: { primary: string; secondary: string; onPrimary: string };
}

/** Jersey-family size order, kept for back-compat; prefer sizeOrderFor(). */
export const SIZE_ORDER: Size[] = ["S", "M", "L", "XL", "XXL"];

export function sizeOrderFor(product: Pick<Product, "productType">): string[] {
  return productTypeDef(product.productType).sizeSet;
}

export function sizeAvailable(product: Product, size: string): boolean {
  return (product.sizes[size] ?? 0) > 0;
}

export function unitCount(p: Product): number {
  return Object.values(p.sizes).reduce((sum, q) => sum + (q > 0 ? q : 0), 0);
}

// Store currency — single source of truth for every price the shopper sees.
// Change these two lines to switch the whole storefront's currency.
export const CURRENCY = "QAR";
const priceFormatter = new Intl.NumberFormat("en", {
  style: "currency", currency: CURRENCY, maximumFractionDigits: 0,
});
export function formatPrice(amount: number): string {
  return priceFormatter.format(amount);
}

export const LEAGUE_LABELS: Record<LeagueId, string> = {
  premier: "Premier League",
  laliga: "La Liga",
  seriea: "Serie A",
  bundesliga: "Bundesliga",
  ligue1: "Ligue 1",
};

/* ── Static fallback catalog ─────────────────────────────────────────────── */

function sizes(...inStock: Size[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of SIZE_ORDER) out[s] = inStock.includes(s) ? 1 : 0;
  return out;
}

interface TeamDef {
  slug: string; name: string; kind: "club" | "national"; league?: LeagueId;
  colors: { primary: string; secondary: string; onPrimary: string };
}

const T: Record<string, TeamDef> = {
  "real-madrid":  { slug: "real-madrid",  name: "Real Madrid",         kind: "club", league: "laliga",     colors: { primary: "#F7F7F4", secondary: "#1E2A55", onPrimary: "#1E2A55" } },
  "barcelona":    { slug: "barcelona",    name: "FC Barcelona",        kind: "club", league: "laliga",     colors: { primary: "#A50044", secondary: "#004D98", onPrimary: "#FFFFFF" } },
  "psg":          { slug: "psg",          name: "Paris Saint-Germain", kind: "club", league: "ligue1",     colors: { primary: "#004170", secondary: "#DA291C", onPrimary: "#FFFFFF" } },
  "arsenal":      { slug: "arsenal",      name: "Arsenal",             kind: "club", league: "premier",    colors: { primary: "#EF0107", secondary: "#023474", onPrimary: "#FFFFFF" } },
  "liverpool":    { slug: "liverpool",    name: "Liverpool",           kind: "club", league: "premier",    colors: { primary: "#C8102E", secondary: "#00B2A9", onPrimary: "#FFFFFF" } },
  "man-united":   { slug: "man-united",   name: "Manchester United",   kind: "club", league: "premier",    colors: { primary: "#DA291C", secondary: "#FBE122", onPrimary: "#FFFFFF" } },
  "man-city":     { slug: "man-city",     name: "Manchester City",     kind: "club", league: "premier",    colors: { primary: "#6CABDD", secondary: "#1C2C5B", onPrimary: "#1C2C5B" } },
  "chelsea":      { slug: "chelsea",      name: "Chelsea",             kind: "club", league: "premier",    colors: { primary: "#034694", secondary: "#D1D3D4", onPrimary: "#FFFFFF" } },
  "bayern":       { slug: "bayern",       name: "Bayern München",      kind: "club", league: "bundesliga", colors: { primary: "#DC052D", secondary: "#0066B2", onPrimary: "#FFFFFF" } },
  "inter":        { slug: "inter",        name: "Inter Milan",         kind: "club", league: "seriea",     colors: { primary: "#0B1F5B", secondary: "#1A1A1A", onPrimary: "#FFFFFF" } },
  "milan":        { slug: "milan",        name: "AC Milan",            kind: "club", league: "seriea",     colors: { primary: "#FB090B", secondary: "#1A1A1A", onPrimary: "#FFFFFF" } },
  "argentina":    { slug: "argentina",    name: "Argentina",           kind: "national", colors: { primary: "#75AADB", secondary: "#FFFFFF", onPrimary: "#1A1A1A" } },
  "portugal":     { slug: "portugal",     name: "Portugal",            kind: "national", colors: { primary: "#DA291C", secondary: "#046A38", onPrimary: "#FFFFFF" } },
  "brazil":       { slug: "brazil",       name: "Brazil",              kind: "national", colors: { primary: "#FEDD00", secondary: "#009739", onPrimary: "#1A1A1A" } },
  "spain":        { slug: "spain",        name: "Spain",               kind: "national", colors: { primary: "#AA151B", secondary: "#F1BF00", onPrimary: "#FFFFFF" } },
  "morocco":      { slug: "morocco",      name: "Morocco",             kind: "national", colors: { primary: "#C1272D", secondary: "#006233", onPrimary: "#FFFFFF" } },
  "saudi-arabia": { slug: "saudi-arabia", name: "Saudi Arabia",        kind: "national", colors: { primary: "#006C35", secondary: "#FFFFFF", onPrimary: "#FFFFFF" } },
  "france":       { slug: "france",       name: "France",              kind: "national", colors: { primary: "#002395", secondary: "#ED2939", onPrimary: "#FFFFFF" } },
  "england":      { slug: "england",      name: "England",             kind: "national", colors: { primary: "#FFFFFF", secondary: "#CE1124", onPrimary: "#1A1A1A" } },
  "germany":      { slug: "germany",      name: "Germany",             kind: "national", colors: { primary: "#FFFFFF", secondary: "#000000", onPrimary: "#1A1A1A" } },
  "qatar":        { slug: "qatar",        name: "Qatar",               kind: "national", colors: { primary: "#8A1538", secondary: "#FFFFFF", onPrimary: "#FFFFFF" } },
  "egypt":        { slug: "egypt",        name: "Egypt",               kind: "national", colors: { primary: "#CE1126", secondary: "#000000", onPrimary: "#FFFFFF" } },
  "algeria":      { slug: "algeria",      name: "Algeria",             kind: "national", colors: { primary: "#FFFFFF", secondary: "#006233", onPrimary: "#1A1A1A" } },
  "tunisia":      { slug: "tunisia",      name: "Tunisia",             kind: "national", colors: { primary: "#E70013", secondary: "#FFFFFF", onPrimary: "#FFFFFF" } },
  "iraq":         { slug: "iraq",         name: "Iraq",                kind: "national", colors: { primary: "#007A3D", secondary: "#CE1126", onPrimary: "#FFFFFF" } },
  "jordan":       { slug: "jordan",       name: "Jordan",              kind: "national", colors: { primary: "#CE1126", secondary: "#007A3D", onPrimary: "#FFFFFF" } },
  "uruguay":      { slug: "uruguay",      name: "Uruguay",             kind: "national", colors: { primary: "#7BAFD4", secondary: "#1A1A1A", onPrimary: "#1A1A1A" } },
  "mexico":       { slug: "mexico",       name: "Mexico",              kind: "national", colors: { primary: "#006847", secondary: "#CE1126", onPrimary: "#FFFFFF" } },
};

const CLUB_PRICE = 165;
const NATIONAL_PRICE = 175;

interface SkuDef {
  team: string; kit: ProductKitType; sizes: Size[];
  status?: ProductStatus;
  images: { source: ImageSource; front: string; back?: string };
}

function img(team: string, kit: string, source: ImageSource, hasBack = false) {
  const base = `/img/products/${team}/${kit}`;
  const ext = source === "placeholder" ? "svg" : "png";
  return { source, front: `${base}/front.${ext}`, ...(hasBack ? { back: `${base}/back.png` } : {}) };
}

/* Teams where we only have a single reference photo — the away kit reuses the
   home image so the grid can collapse them into one card. Both remain real,
   purchasable stock (via the kit toggle on the PDP); we just don't show
   the same photograph twice. Drop a team from here the moment distinct away
   photography lands under /away/front.png. */
function awayShare(team: string) {
  return { source: "sportsdb" as ImageSource, front: `/img/products/${team}/home/front.png` };
}

/* Image source per SKU reflects what the asset pipeline actually produced:
   studio = local 26/27 renders (front+back) · sportsdb = downloaded front-only
   placeholder = generated SVG. Update as real photography lands. */
const SKUS: SkuDef[] = [
  // ── Clubs 26/27 ──
  { team: "real-madrid", kit: "home", sizes: ["M", "L", "XL"], images: img("real-madrid", "home", "studio", true) },
  { team: "real-madrid", kit: "away", sizes: ["L", "XL"],      images: img("real-madrid", "away", "sportsdb") },
  { team: "barcelona",   kit: "home", sizes: ["M", "L", "XL"], images: img("barcelona", "home", "studio", true) },
  { team: "barcelona",   kit: "away", sizes: ["L", "XL"],      images: img("barcelona", "away", "sportsdb") },
  { team: "psg",         kit: "home", sizes: ["L", "XL"],      images: img("psg", "home", "studio", true) },
  { team: "psg",         kit: "away", sizes: ["L", "XL"],      images: img("psg", "away", "studio", true) },
  { team: "arsenal",     kit: "home", sizes: ["M", "L", "XL"], images: img("arsenal", "home", "sportsdb") },
  { team: "arsenal",     kit: "away", sizes: ["L", "XL"],      images: awayShare("arsenal") },
  { team: "liverpool",   kit: "home", sizes: ["L"],            images: img("liverpool", "home", "studio", true) },
  { team: "man-united",  kit: "home", sizes: ["L"],            images: img("man-united", "home", "studio", true) },
  { team: "man-city",    kit: "home", sizes: ["L"],            images: img("man-city", "home", "studio", true) },
  { team: "chelsea",     kit: "home", sizes: ["L"],            images: img("chelsea", "home", "sportsdb") },
  { team: "bayern",      kit: "home", sizes: ["L"],            images: img("bayern", "home", "studio", true) },
  { team: "inter",       kit: "home", sizes: [], status: "coming_soon", images: img("inter", "home", "studio", true) },
  { team: "milan",       kit: "home", sizes: [], status: "coming_soon", images: img("milan", "home", "studio", true) },
  // ── National teams — 2026 World Cup, player version, blank ──
  { team: "argentina",    kit: "home", sizes: ["M", "L", "XL"], images: img("argentina", "home", "sportsdb") },
  { team: "argentina",    kit: "away", sizes: ["L", "XL"],      images: awayShare("argentina") },
  { team: "portugal",     kit: "home", sizes: ["M", "L", "XL"], images: img("portugal", "home", "sportsdb") },
  { team: "portugal",     kit: "away", sizes: ["L", "XL"],      images: awayShare("portugal") },
  { team: "brazil",       kit: "home", sizes: ["M", "L", "XL"], images: img("brazil", "home", "sportsdb") },
  { team: "brazil",       kit: "away", sizes: ["L", "XL"],      images: awayShare("brazil") },
  { team: "spain",        kit: "home", sizes: ["L"],            images: img("spain", "home", "sportsdb") },
  { team: "spain",        kit: "away", sizes: ["L"],            images: awayShare("spain") },
  { team: "morocco",      kit: "home", sizes: ["M", "L"],       images: img("morocco", "home", "sportsdb") },
  { team: "morocco",      kit: "away", sizes: ["L"],            images: awayShare("morocco") },
  { team: "saudi-arabia", kit: "home", sizes: ["M", "L"],       images: img("saudi-arabia", "home", "sportsdb") },
  { team: "saudi-arabia", kit: "away", sizes: ["L"],            images: awayShare("saudi-arabia") },
  { team: "france",       kit: "home", sizes: ["L"],            images: img("france", "home", "sportsdb") },
  { team: "england",      kit: "home", sizes: ["L"],            images: img("england", "home", "sportsdb") },
  { team: "germany",      kit: "home", sizes: ["L"],            images: img("germany", "home", "sportsdb") },
  { team: "qatar",        kit: "home", sizes: ["L"],            images: img("qatar", "home", "sportsdb") },
  { team: "egypt",        kit: "home", sizes: ["M", "L"],       images: img("egypt", "home", "sportsdb") },
  { team: "algeria",      kit: "home", sizes: ["L"],            images: img("algeria", "home", "sportsdb") },
  { team: "tunisia",      kit: "home", sizes: ["L"],            images: img("tunisia", "home", "sportsdb") },
  { team: "iraq",         kit: "home", sizes: ["L"],            images: img("iraq", "home", "sportsdb") },
  { team: "jordan",       kit: "home", sizes: ["L"],            images: img("jordan", "home", "sportsdb") },
  { team: "jordan",       kit: "away", sizes: ["L"],            images: awayShare("jordan") },
  { team: "uruguay",      kit: "away", sizes: ["L"],            images: img("uruguay", "away", "sportsdb") },
  { team: "mexico",       kit: "home", sizes: ["L"],            images: img("mexico", "home", "sportsdb") },
];

export const PRODUCTS: Product[] = SKUS.map((s) => {
  const t = T[s.team];
  const isClub = t.kind === "club";
  const season = isClub ? "26/27" : "2026 World Cup";
  return {
    slug: `${t.slug}-${s.kit}`,
    teamSlug: t.slug,
    teamName: t.name,
    teamKind: t.kind,
    league: t.league,
    name: `${KIT_TYPE_LABELS[s.kit]} Jersey · ${season}`,
    productType: "jersey" as ProductType,
    kitType: s.kit,
    season,
    edition: isClub ? "Authentic" : "Player Version",
    price: isClub ? CLUB_PRICE : NATIONAL_PRICE,
    status: s.status ?? "available",
    customizable: true,
    sizes: sizes(...s.sizes),
    images: s.images,
    badge: `/img/badges/${t.slug}.png`,
    colors: t.colors,
  };
});

/* ── Catalog helpers (pure — operate on whatever list they're given) ─────── */

export function productBySlug(slug: string, list: Product[] = PRODUCTS): Product | undefined {
  return list.find((p) => p.slug === slug);
}

export function productsForTeam(teamSlug: string, list: Product[] = PRODUCTS): Product[] {
  return list.filter((p) => p.teamSlug === teamSlug);
}

/** Collapse jersey variants that share the exact same photograph into one card
    (home wins as the representative). Non-jersey products always pass through.
    Cache-bust query params (?v=...) are stripped before keying so an admin
    re-upload doesn't split previously-collapsed cards. */
export function dedupeByJersey(list: Product[]): Product[] {
  const ordered = [...list].sort(
    (a, b) => (a.kitType === "home" ? 0 : 1) - (b.kitType === "home" ? 0 : 1),
  );
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of ordered) {
    if (p.productType !== "jersey") { out.push(p); continue; }
    const front = p.images.front.split("?")[0];
    const key = `${p.teamSlug}::${front}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  // Restore the input list's order for a stable grid
  return out.sort((a, b) => list.indexOf(a) - list.indexOf(b));
}

/** One card per distinct jersey — what the shop grid renders (static fallback). */
export const SHOP_PRODUCTS: Product[] = dedupeByJersey(PRODUCTS);

/** Cross-sell order: same team first ("complete the kit"), then same product
    type from other teams, then anything of the same kind. */
export function relatedProducts(p: Product, list: Product[] = SHOP_PRODUCTS, n = 4): Product[] {
  const available = list.filter((x) => x.slug !== p.slug && x.status === "available");
  const sameTeam = available.filter((x) => x.teamSlug && x.teamSlug === p.teamSlug);
  const sameType = available.filter((x) => x.teamSlug !== p.teamSlug && x.productType === p.productType && x.teamKind === p.teamKind);
  const sameKind = available.filter((x) => x.teamSlug !== p.teamSlug && x.productType !== p.productType && x.teamKind === p.teamKind);
  const merged: Product[] = [];
  for (const x of [...sameTeam, ...sameType, ...sameKind]) {
    if (!merged.some((m) => m.slug === x.slug)) merged.push(x);
    if (merged.length >= n) break;
  }
  return merged;
}
