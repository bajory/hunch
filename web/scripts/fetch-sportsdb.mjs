/**
 * Downloads placeholder kit photos + team badges from TheSportsDB (free tier).
 * - Badges for ALL teams → public/img/badges/<teamSlug>.png
 * - Kit photo (team-record strEquipment — the most current image) for products
 *   with no local studio photo → public/img/products/<teamSlug>/<kitType>/front.png
 * Resumable: skips files that already exist. Throttled ~1 request / 2s.
 * Misses are reported at the end; make-placeholders.mjs covers them.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTS_DIR = path.join(ROOT, "public/img/products");
const BADGES_DIR = path.join(ROOT, "public/img/badges");
const API = "https://www.thesportsdb.com/api/v1/json/123";

// teamSlug → SportsDB search name. Kit types needing a SportsDB front photo
// are computed from what's missing on disk after import-kit-photos ran.
const TEAMS = {
  "real-madrid":  "Real Madrid",
  "barcelona":    "Barcelona",
  "psg":          "Paris Saint-Germain",
  "arsenal":      "Arsenal",
  "liverpool":    "Liverpool",
  "man-united":   "Manchester United",
  "man-city":     "Manchester City",
  "chelsea":      "Chelsea",
  "bayern":       "Bayern Munich",
  "inter":        "Inter Milan",
  "milan":        "AC Milan",
  "argentina":    "Argentina",
  "portugal":     "Portugal",
  "brazil":       "Brazil",
  "spain":        "Spain",
  "morocco":      "Morocco",
  "saudi-arabia": "Saudi Arabia",
  "france":       "France",
  "england":      "England",
  "germany":      "Germany",
  "qatar":        "Qatar",
  "egypt":        "Egypt",
  "algeria":      "Algeria",
  "tunisia":      "Tunisia",
  "iraq":         "Iraq",
  "jordan":       "Jordan",
  "uruguay":      "Uruguay",
  "mexico":       "Mexico",
};

// slug → kit types sold (from the stock list; coming-soon teams need badges only)
const KITS = {
  "real-madrid": ["home", "away"], "barcelona": ["home", "away"], "psg": ["home", "away"],
  "arsenal": ["home", "away"], "liverpool": ["home"], "man-united": ["home"], "man-city": ["home"],
  "chelsea": ["home"], "bayern": ["home"], "inter": ["home"], "milan": ["home"],
  "argentina": ["home", "away"], "portugal": ["home", "away"], "brazil": ["home", "away"],
  "spain": ["home", "away"], "morocco": ["home", "away"], "saudi-arabia": ["home", "away"],
  "france": ["home"], "england": ["home"], "germany": ["home"], "qatar": ["home"],
  "egypt": ["home"], "algeria": ["home"], "tunisia": ["home"], "iraq": ["home"],
  "jordan": ["home", "away"], "uruguay": ["away"], "mexico": ["home"],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
}

// National teams share names with clubs (e.g. "Arsenal" is unambiguous but "Brazil" could
// match club teams too) — prefer soccer + national-team flag when present.
function pickTeam(list, wantNational) {
  if (!list) return null;
  const soccer = list.filter((t) => t.strSport === "Soccer");
  if (wantNational) {
    return soccer.find((t) => t.strTeam && (t.intFormedYear || true) && (t.strLeague ?? "").includes("International")) ?? soccer[0] ?? null;
  }
  return soccer[0] ?? null;
}

const NATIONAL = new Set(["argentina","portugal","brazil","spain","morocco","saudi-arabia","france","england","germany","qatar","egypt","algeria","tunisia","iraq","jordan","uruguay","mexico"]);

const misses = [];
for (const [slug, name] of Object.entries(TEAMS)) {
  const badgeDest = path.join(BADGES_DIR, `${slug}.png`);
  const kitTargets = (KITS[slug] ?? []).map((kt) => ({
    kt, dest: path.join(PRODUCTS_DIR, slug, kt, "front.png"),
  })).filter(({ dest }) => !existsSync(dest) && !existsSync(dest.replace(/\.png$/, ".svg")));

  const needBadge = !existsSync(badgeDest);
  if (!needBadge && kitTargets.length === 0) { console.log(`✓ ${slug} (complete)`); continue; }

  try {
    const data = await getJson(`${API}/searchteams.php?t=${encodeURIComponent(name)}`);
    await sleep(2000);
    const team = pickTeam(data.teams, NATIONAL.has(slug));
    if (!team) { misses.push(...kitTargets.map((k) => `${slug}/${k.kt}`)); console.warn(`✗ ${slug}: no team found`); continue; }

    if (needBadge && team.strBadge) {
      await download(team.strBadge, badgeDest);
      console.log(`↓ badge ${slug}`);
      await sleep(2000);
    }

    // One current kit image per team — used as the placeholder for every kit type still missing.
    if (kitTargets.length > 0) {
      if (team.strEquipment) {
        for (const { kt, dest } of kitTargets) {
          await download(team.strEquipment, dest);
          console.log(`↓ kit ${slug}/${kt} (sportsdb)`);
          await sleep(2000);
        }
      } else {
        misses.push(...kitTargets.map((k) => `${slug}/${k.kt}`));
        console.warn(`✗ ${slug}: no strEquipment`);
      }
    }
  } catch (err) {
    misses.push(...kitTargets.map((k) => `${slug}/${k.kt}`));
    console.warn(`✗ ${slug}: ${err.message}`);
    await sleep(2000);
  }
}

console.log(misses.length ? `\nMISSING (need placeholders): ${misses.join(", ")}` : "\nAll covered.");
