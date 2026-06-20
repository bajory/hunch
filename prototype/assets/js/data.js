/* =========================================================================
   HUNCH — Atelier data model
   -------------------------------------------------------------------------
   The customization engine is driven entirely by this file.

   THREE LAYERS decide how a name + number are rendered on a kit:
     1. TEAM       — kit colours, crest, domestic competition, roster
     2. COMPETITION— the lettering "kit": font, weight, tracking, fill, patch
        - Domestic league  -> league-specific typeface
        - UCL              -> the continental typeface (uniform across teams)

   NOTE ON TYPEFACES
   Official league / Champions League print fonts are licensed property.
   The fonts below are deliberately chosen Google Fonts that *approximate*
   the silhouette of each competition's lettering so the "styling changes by
   competition" behaviour is real and visible. Swap `fontFamily` for the
   licensed faces in production — nothing else needs to change.
   ========================================================================= */

const COMPETITIONS = {
  /* ---- Domestic leagues ---- */
  laliga: {
    id: "laliga",
    label: "La Liga",
    kind: "league",
    patch: "laliga",
    // Clean, humanist — stands in for the LaLiga print face
    fontFamily: "'Saira', sans-serif",
    nameWeight: 600,
    numberWeight: 700,
    tracking: "0.06em",
    uppercase: true,
  },
  premier: {
    id: "premier",
    label: "Premier League",
    kind: "league",
    patch: "premier",
    // Bold geometric grotesque — stands in for the PL print face
    fontFamily: "'Archivo', sans-serif",
    nameWeight: 700,
    numberWeight: 800,
    tracking: "0.01em",
    uppercase: true,
  },
  seriea: {
    id: "seriea",
    label: "Serie A",
    kind: "league",
    patch: "seriea",
    fontFamily: "'Oswald', sans-serif",
    nameWeight: 600,
    numberWeight: 700,
    tracking: "0.03em",
    uppercase: true,
  },
  bundesliga: {
    id: "bundesliga",
    label: "Bundesliga",
    kind: "league",
    patch: "bundesliga",
    fontFamily: "'Teko', sans-serif",
    nameWeight: 600,
    numberWeight: 700,
    tracking: "0.04em",
    uppercase: true,
  },

  /* ---- Continental ---- */
  ucl: {
    id: "ucl",
    label: "UEFA Champions League",
    kind: "continental",
    patch: "ucl",
    // Rounded geometric — stands in for the UCL print face (uniform for all clubs)
    fontFamily: "'Rajdhani', sans-serif",
    nameWeight: 600,
    numberWeight: 700,
    tracking: "0.10em",
    uppercase: true,
  },
};

/* Patch artwork is drawn as inline SVG in app.js; these are display labels. */
const PATCHES = {
  laliga: { label: "La Liga", sleeve: "Right sleeve" },
  premier: { label: "Premier League", sleeve: "Right sleeve" },
  seriea: { label: "Serie A", sleeve: "Right sleeve" },
  bundesliga: { label: "Bundesliga", sleeve: "Right sleeve" },
  ucl: { label: "Champions League", sleeve: "Right sleeve" },
};

const TEAMS = {
  "real-madrid": {
    id: "real-madrid",
    name: "Real Madrid",
    edition: "Home Authentic · 25/26",
    league: "laliga",
    price: 165,
    kit: {
      body: "#F7F7F4",
      bodyShade: "#E7E7E2",
      collar: "#1E2A55",
      accent: "#C9A24B",
      // domestic lettering colour
      leagueFill: "#1E2A55",
      leagueStroke: "none",
      // continental lettering colour (UCL forces white, but we keep number trims)
      uclFill: "#1E2A55",
      crestText: "RM",
      crestBg: "#1E2A55",
      crestFg: "#C9A24B",
      sponsor: "FLY EMIRATES",
      stripes: null,
    },
    roster: [
      { name: "MBAPPÉ", number: 9 },
      { name: "BELLINGHAM", number: 5 },
      { name: "VINI JR", number: 7 },
      { name: "RODRYGO", number: 11 },
    ],
  },

  barcelona: {
    id: "barcelona",
    name: "FC Barcelona",
    edition: "Home Authentic · 25/26",
    league: "laliga",
    price: 165,
    kit: {
      body: "#A50044",
      bodyShade: "#7E0033",
      collar: "#FFED02",
      accent: "#FFED02",
      leagueFill: "#FFED02",
      leagueStroke: "#1A1A2E",
      uclFill: "#FFED02",
      crestText: "FCB",
      crestBg: "#FFED02",
      crestFg: "#A50044",
      sponsor: "SPOTIFY",
      stripes: { colors: ["#A50044", "#004D98"], width: 46 }, // blaugrana
    },
    roster: [
      { name: "LEWANDOWSKI", number: 9 },
      { name: "YAMAL", number: 19 },
      { name: "PEDRI", number: 8 },
      { name: "RAPHINHA", number: 11 },
    ],
  },

  "man-city": {
    id: "man-city",
    name: "Manchester City",
    edition: "Home Authentic · 25/26",
    league: "premier",
    price: 160,
    kit: {
      body: "#6CABDD",
      bodyShade: "#4E93C8",
      collar: "#1C2C5B",
      accent: "#F0C75E",
      leagueFill: "#FFFFFF",
      leagueStroke: "#1C2C5B",
      uclFill: "#1C2C5B",
      crestText: "MC",
      crestBg: "#FFFFFF",
      crestFg: "#1C2C5B",
      sponsor: "ETIHAD",
      stripes: null,
    },
    roster: [
      { name: "HAALAND", number: 9 },
      { name: "DE BRUYNE", number: 17 },
      { name: "FODEN", number: 47 },
      { name: "RODRI", number: 16 },
    ],
  },

  liverpool: {
    id: "liverpool",
    name: "Liverpool",
    edition: "Home Authentic · 25/26",
    league: "premier",
    price: 160,
    kit: {
      body: "#C8102E",
      bodyShade: "#9E0C24",
      collar: "#F6EB61",
      accent: "#F6EB61",
      leagueFill: "#FFFFFF",
      leagueStroke: "#7E0C20",
      uclFill: "#FFFFFF",
      crestText: "LFC",
      crestBg: "#FFFFFF",
      crestFg: "#C8102E",
      sponsor: "STANDARD CHARTERED",
      stripes: null,
    },
    roster: [
      { name: "SALAH", number: 11 },
      { name: "VAN DIJK", number: 4 },
      { name: "SZOBOSZLAI", number: 8 },
      { name: "GAKPO", number: 18 },
    ],
  },

  inter: {
    id: "inter",
    name: "Inter Milan",
    edition: "Home Authentic · 25/26",
    league: "seriea",
    price: 158,
    kit: {
      body: "#1A1A1A",
      bodyShade: "#0E0E0E",
      collar: "#0B1F5B",
      accent: "#C9A24B",
      leagueFill: "#FFFFFF",
      leagueStroke: "none",
      uclFill: "#FFFFFF",
      crestText: "IM",
      crestBg: "#FFFFFF",
      crestFg: "#0B1F5B",
      sponsor: "BETSSON",
      stripes: { colors: ["#1A1A1A", "#0B3FA8"], width: 40 }, // nerazzurri
    },
    roster: [
      { name: "LAUTARO", number: 10 },
      { name: "THURAM", number: 9 },
      { name: "BARELLA", number: 23 },
      { name: "ÇALHANOĞLU", number: 20 },
    ],
  },

  bayern: {
    id: "bayern",
    name: "Bayern München",
    edition: "Home Authentic · 25/26",
    league: "bundesliga",
    price: 158,
    kit: {
      body: "#DC052D",
      bodyShade: "#AE0423",
      collar: "#0066B2",
      accent: "#FFFFFF",
      leagueFill: "#FFFFFF",
      leagueStroke: "#8E0420",
      uclFill: "#FFFFFF",
      crestText: "FCB",
      crestBg: "#FFFFFF",
      crestFg: "#DC052D",
      sponsor: "T",
      stripes: null,
    },
    roster: [
      { name: "KANE", number: 9 },
      { name: "MUSIALA", number: 42 },
      { name: "SANÉ", number: 10 },
      { name: "KIMMICH", number: 6 },
    ],
  },
};

/* The two competitions a given team can wear lettering for:
   its domestic league + the Champions League. */
function competitionsForTeam(teamId) {
  const team = TEAMS[teamId];
  return [team.league, "ucl"];
}

const SIZES = ["S", "M", "L", "XL", "XXL"];
const CUSTOMIZATION_FEE = 25;

/* =========================================================================
   PHOTO PRINT GEOMETRY
   -------------------------------------------------------------------------
   When a real shirt photo exists for a team+competition, the name + number
   are overlaid on it. Position is expressed as FRACTIONS of the photo so it
   scales to any image size:
     name.cy   — vertical centre of the name (0=top, 1=bottom)
     name.span — width the name occupies (fraction of image width)
     name.arc  — upward bend of the name arch (fraction of image height)
     name.size — name cap height (fraction of image width)
     number.cy / number.size — number centre + size (fraction of image width)
   Tune per photo with the on-page  #tune  helper, then paste the result here.
   ========================================================================= */
const PRINT_DEFAULT = {
  name: { cy: 0.34, span: 0.42, arc: 0.045, size: 0.052 },
  number: { cy: 0.52, size: 0.26 },
};

/* Per-team print assets + geometry overrides.
   `images[competition].back/front` point at files under assets/img/…
   Leave a club out of PRINT and it renders the SVG silhouette fallback. */
const PRINT = {
  barcelona: {
    // Official jersey fonts per competition (see @font-face blocks in styles.css).
    // Each falls back to the competition stand-in if the file fails to load.
    font: {
      ucl: "'FCBLettering-UCL', 'Rajdhani', sans-serif",
      laliga: "'FCBLettering-Liga', 'Saira', sans-serif",
    },
    name: { cy: 0.278, span: 0.460, arc: 0.166, size: 0.070 },
    number: { cy: 0.404, size: 0.350 },
    images: {
      ucl:    { back: "assets/img/barcelona/ucl/back.png",  front: "assets/img/barcelona/ucl/front.png" },
      laliga: { back: "assets/img/barcelona/ucl/back.png",  front: "assets/img/barcelona/ucl/front.png" },
    },
  },
  "real-madrid": {
    name: { cy: 0.250, span: 0.36, arc: 0.038, size: 0.050 },
    number: { cy: 0.430, size: 0.220 },
    images: {
      ucl: { back: "assets/img/real-madrid/ucl/back.jpg", front: "assets/img/real-madrid/ucl/front.jpg" },
    },
  },
  // Other clubs: drop photos in and add an `images` block (+ geometry) here.
};

/* Resolve the print config (geometry + image path) for a team+competition+view.
   Returns null when no photo is configured -> caller uses the SVG fallback. */
function printFor(teamId, competition, view) {
  const p = PRINT[teamId];
  const src = p && p.images && p.images[competition] && p.images[competition][view];
  if (!src) return null;
  return {
    src,
    name: { ...PRINT_DEFAULT.name, ...(p.name || {}) },
    number: { ...PRINT_DEFAULT.number, ...(p.number || {}) },
  };
}
