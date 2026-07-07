/**
 * Generates an elegant SVG placeholder for any product still missing a front image
 * after import-kit-photos + fetch-sportsdb. Deliberately NOT a jersey drawing:
 * a team-colour duotone field with a soft studio light, film grain, and oversized
 * season numerals — reads as an editorial "photography coming" card.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_DIR = path.join(ROOT, "public/img/products");

// slug → [kits], primary, secondary, season numerals
const NEED = {
  "real-madrid":  { kits: ["home", "away"], c1: "#F7F7F4", c2: "#1E2A55", season: "26" },
  "barcelona":    { kits: ["home", "away"], c1: "#A50044", c2: "#004D98", season: "26" },
  "psg":          { kits: ["home", "away"], c1: "#004170", c2: "#DA291C", season: "26" },
  "arsenal":      { kits: ["home", "away"], c1: "#EF0107", c2: "#023474", season: "26" },
  "liverpool":    { kits: ["home"], c1: "#C8102E", c2: "#00B2A9", season: "26" },
  "man-united":   { kits: ["home"], c1: "#DA291C", c2: "#FBE122", season: "26" },
  "man-city":     { kits: ["home"], c1: "#6CABDD", c2: "#1C2C5B", season: "26" },
  "chelsea":      { kits: ["home"], c1: "#034694", c2: "#D1D3D4", season: "26" },
  "bayern":       { kits: ["home"], c1: "#DC052D", c2: "#0066B2", season: "26" },
  "inter":        { kits: ["home"], c1: "#0B1F5B", c2: "#1A1A1A", season: "26" },
  "milan":        { kits: ["home"], c1: "#FB090B", c2: "#1A1A1A", season: "26" },
  "argentina":    { kits: ["home", "away"], c1: "#75AADB", c2: "#FFFFFF", season: "26" },
  "portugal":     { kits: ["home", "away"], c1: "#DA291C", c2: "#046A38", season: "26" },
  "brazil":       { kits: ["home", "away"], c1: "#FEDD00", c2: "#009739", season: "26" },
  "spain":        { kits: ["home", "away"], c1: "#AA151B", c2: "#F1BF00", season: "26" },
  "morocco":      { kits: ["home", "away"], c1: "#C1272D", c2: "#006233", season: "26" },
  "saudi-arabia": { kits: ["home", "away"], c1: "#006C35", c2: "#FFFFFF", season: "26" },
  "france":       { kits: ["home"], c1: "#002395", c2: "#ED2939", season: "26" },
  "england":      { kits: ["home"], c1: "#FFFFFF", c2: "#CE1124", season: "26" },
  "germany":      { kits: ["home"], c1: "#FFFFFF", c2: "#000000", season: "26" },
  "qatar":        { kits: ["home"], c1: "#8A1538", c2: "#FFFFFF", season: "26" },
  "egypt":        { kits: ["home"], c1: "#CE1126", c2: "#000000", season: "26" },
  "algeria":      { kits: ["home"], c1: "#FFFFFF", c2: "#006233", season: "26" },
  "tunisia":      { kits: ["home"], c1: "#E70013", c2: "#FFFFFF", season: "26" },
  "iraq":         { kits: ["home"], c1: "#007A3D", c2: "#CE1126", season: "26" },
  "jordan":       { kits: ["home", "away"], c1: "#CE1126", c2: "#007A3D", season: "26" },
  "uruguay":      { kits: ["away"], c1: "#7BAFD4", c2: "#1A1A1A", season: "26" },
  "mexico":       { kits: ["home"], c1: "#006847", c2: "#CE1126", season: "26" },
};

function svg({ c1, c2, season }, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
  <defs>
    <linearGradient id="duo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="light" cx="0.5" cy="0.32" r="0.75">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.34"/>
      <stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.06"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.28"/>
    </radialGradient>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.055"/></feComponentTransfer>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
  </defs>
  <g filter="url(#grain)">
    <rect width="1200" height="1500" fill="url(#duo)"/>
    <rect width="1200" height="1500" fill="url(#light)"/>
  </g>
  <text x="600" y="880" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="620" fill="#FFFFFF" fill-opacity="0.16" letter-spacing="-20">${season}</text>
  <text x="600" y="1340" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="600" font-size="34" fill="#FFFFFF" fill-opacity="0.72" letter-spacing="14">${label}</text>
</svg>`;
}

let made = 0;
for (const [slug, spec] of Object.entries(NEED)) {
  for (const kt of spec.kits) {
    const dir = path.join(PRODUCTS_DIR, slug, kt);
    if (existsSync(path.join(dir, "front.png")) || existsSync(path.join(dir, "front.svg"))) continue;
    await mkdir(dir, { recursive: true });
    const label = `${slug.replace(/-/g, " ").toUpperCase()} · ${kt.toUpperCase()}`;
    await writeFile(path.join(dir, "front.svg"), svg(spec, label));
    console.log(`● placeholder ${slug}/${kt}`);
    made++;
  }
}
console.log(`Generated ${made} placeholders.`);
