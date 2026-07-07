/**
 * Copies the 26/27 studio renders from prototype/assets/img/kits-assets
 * into the normalized commerce tree: public/img/products/<teamSlug>/<kitType>/{front,back}.png
 * Source filenames are inconsistent (e.g. psg_home_home_back, barcelona_back) — the map below is explicit.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(ROOT, "../prototype/assets/img/kits-assets");
const DEST = path.join(ROOT, "public/img/products");

const MAP = [
  ["Bundesliga/Bayern/bayern_home_front_26-27.png",             "bayern/home/front.png"],
  ["Bundesliga/Bayern/bayern_home_back_26-27.png",              "bayern/home/back.png"],
  ["LA LIGA/Barcelona/barcelona_home_front_26-27.png",          "barcelona/home/front.png"],
  ["LA LIGA/Barcelona/barcelona_back_26-27.png",                "barcelona/home/back.png"],
  ["LA LIGA/Real Madrid/real_madrid_home_front_26-27.png",      "real-madrid/home/front.png"],
  ["LA LIGA/Real Madrid/real_madrid_back_26-27.png",            "real-madrid/home/back.png"],
  ["Ligue 1/PSG/psg_home_home_front_26-27.png",                 "psg/home/front.png"],
  ["Ligue 1/PSG/psg_home_home_back_26-27.png",                  "psg/home/back.png"],
  ["Ligue 1/PSG/psg_away_front_26-27.png",                      "psg/away/front.png"],
  ["Ligue 1/PSG/psg_away_back_26-27.png",                       "psg/away/back.png"],
  ["Premiere League/Liverpool/liverpool_home_front_26-27.png",  "liverpool/home/front.png"],
  ["Premiere League/Liverpool/liverpool_home_back_26-27.png",   "liverpool/home/back.png"],
  ["Premiere League/Man City/man_city_home_front_26-27.png",    "man-city/home/front.png"],
  ["Premiere League/Man City/man_city_home_back_26-27.png",     "man-city/home/back.png"],
  ["Premiere League/Man United/man_united_home_front_26-27.png","man-united/home/front.png"],
  ["Premiere League/Man United/man_united_back_26-27.png",      "man-united/home/back.png"],
  ["Serie A/AC Milan/milan_home_front_26-27.png",               "milan/home/front.png"],
  ["Serie A/AC Milan/milan_home_back_26-27.png",                "milan/home/back.png"],
  ["Serie A/Inter Milan/inter_home_front_26-27.png",            "inter/home/front.png"],
  ["Serie A/Inter Milan/inter_home_back_26-27.png",             "inter/home/back.png"],
];

let copied = 0, missing = 0;
for (const [from, to] of MAP) {
  const src = path.join(SRC, from);
  const dest = path.join(DEST, to);
  if (!existsSync(src)) { console.error(`MISSING SOURCE: ${from}`); missing++; continue; }
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
  copied++;
}
console.log(`Copied ${copied} files${missing ? `, ${missing} missing sources` : ""}.`);
