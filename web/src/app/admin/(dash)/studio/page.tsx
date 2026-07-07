import { createAdminClient } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";
import { PRINT_DEFAULT } from "@/lib/catalog";
import { computeKitStatus } from "../../status";
import { DashboardClient, type TeamGroup } from "../../DashboardClient";
import type { KitPreviewData } from "../../KitPreview";
import { KIT_TYPES, KIT_TYPE_LABEL } from "../../types";
import type { KitRow, GlyphRow, TeamRow, CompRow, RosterRow } from "../../types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kit Studio — HUNCH Admin" };

// Competition sleeve-patch art doubles as the league mark in the admin.
const COMP_LOGO: Record<string, string> = {
  laliga: "/img/patches/laliga.webp",
  premier: "/img/patches/premier.jpeg",
  bundesliga: "/img/patches/bundesliga.jpeg",
  ligue1: "/img/patches/ligue1.jpeg",
  ucl: "/img/patches/ucl.webp",
};

function buildPreview(kit: KitRow, comp: CompRow | undefined, glyphs: GlyphRow[]): KitPreviewData {
  const glyphMap: Record<string, { url: string; w: number; h: number }> = {};
  for (const g of glyphs) {
    if (g.team_id === kit.team_id && g.competition_id === kit.competition_id && (g.kit_type ?? "home") === kit.kit_type) {
      glyphMap[String(g.digit)] = { url: g.svg_url, w: g.glyph_w ?? 65, h: g.glyph_h ?? 100 };
    }
  }
  const fill = kit.name_fill ?? "#FFFFFF";
  return {
    src: kit.back_photo_url!,
    competitionLabel: comp?.label ?? kit.competition_id,
    nameGeo: {
      cy: kit.name_cy ?? PRINT_DEFAULT.name.cy,
      span: kit.name_span ?? PRINT_DEFAULT.name.span,
      arc: kit.name_arc ?? PRINT_DEFAULT.name.arc,
      size: kit.name_size ?? PRINT_DEFAULT.name.size,
    },
    numberGeo: {
      cy: kit.number_cy ?? PRINT_DEFAULT.number.cy,
      size: kit.number_size ?? PRINT_DEFAULT.number.size,
      gap: kit.number_glyph_gap ?? undefined,
    },
    tracking: kit.name_tracking != null ? `${kit.name_tracking}em` : (comp?.tracking ?? "0.05em"),
    nameWeight: comp?.name_weight ?? 600,
    numberWeight: comp?.number_weight ?? 700,
    fill,
    stroke: kit.name_stroke ?? "none",
    numberFill: kit.number_fill ?? fill,
    numberStroke: kit.number_stroke ?? "none",
    numberMode: kit.number_mode === "svg_glyphs" ? "svg_glyphs" : "font",
    fontNameUrl: kit.font_name_url,
    fontNumberUrl: kit.font_number_url,
    baseFont: comp?.font_family ?? "sans-serif",
    glyphs: glyphMap,
  };
}

export default async function StudioPage() {
  const db = createAdminClient() ?? supabase;

  let teams: TeamRow[] = [];
  let kits: KitRow[] = [];
  let glyphs: GlyphRow[] = [];
  let competitions: CompRow[] = [];

  let roster: RosterRow[] = [];

  if (db) {
    const [{ data: t }, { data: k }, { data: g }, { data: c }, { data: r }] = await Promise.all([
      db.from("teams").select("id,name,league_id,team_kind,kit_league_fill,kit_league_stroke,kit_ucl_fill"),
      db.from("team_competition_kits").select("*"),
      db.from("number_glyphs").select("team_id,competition_id,kit_type,digit,svg_url,glyph_w,glyph_h"),
      db.from("competitions").select("id,label,kind,font_family,name_weight,number_weight,tracking").order("sort_order"),
      db.from("roster_players").select("id,team_id,name,number,sort_order").order("sort_order"),
    ]);
    teams        = (t as TeamRow[])  ?? [];
    kits         = (k as KitRow[])  ?? [];
    glyphs       = (g as GlyphRow[]) ?? [];
    competitions = (c as CompRow[]) ?? [];
    roster       = (r as RosterRow[]) ?? [];
  }

  if (!teams.length) {
    return (
      <div className="adm-empty">
        <p>No teams found. Run <code>001_schema.sql</code> + <code>002_seed.sql</code> in Supabase SQL Editor.</p>
      </div>
    );
  }

  const compById = new Map(competitions.map((c) => [c.id, c]));
  const glyphCounts = new Map<string, number>();
  for (const g of glyphs) {
    const key = `${g.team_id}/${g.competition_id}/${g.kit_type ?? "home"}`;
    glyphCounts.set(key, (glyphCounts.get(key) ?? 0) + 1);
  }

  const groups: TeamGroup[] = teams.map((team) => {
    // Clubs are calibrated for their domestic league + Champions League; national
    // teams only ever play the World Cup, so they get exactly one competition.
    const compIds = team.team_kind === "national"
      ? ["worldcup"]
      : Array.from(new Set([team.league_id ?? "laliga", "ucl"]));
    const cards = compIds.map((competitionId) => {
      const homeKit = kits.find((k) => k.team_id === team.id && k.competition_id === competitionId && k.kit_type === "home") ?? null;
      const homeGlyphCount = glyphCounts.get(`${team.id}/${competitionId}/home`) ?? 0;
      // Every kit type of this competition — each with its own status and link.
      const variants = KIT_TYPES.map((kitType) => {
        const kit = kits.find((k) => k.team_id === team.id && k.competition_id === competitionId && k.kit_type === kitType) ?? null;
        const variantGlyphCount = glyphCounts.get(`${team.id}/${competitionId}/${kitType}`) ?? 0;
        return {
          kitType,
          label: KIT_TYPE_LABEL[kitType],
          status: computeKitStatus(kit, variantGlyphCount),
        };
      });
      return {
        teamId: team.id,
        competitionId,
        competitionLabel: compById.get(competitionId)?.label ?? competitionId,
        competitionLogo: COMP_LOGO[competitionId] ?? null,
        status: computeKitStatus(homeKit, homeGlyphCount),
        variants,
      };
    });
    const created = cards.filter((c) => c.status.exists);
    const roll: TeamGroup["roll"] =
      created.length === 0 ? "empty"
      : created.length === cards.length && created.every((c) => c.status.isPublished && c.status.missing.length === 0) ? "published"
      : "draft";

    // Preview from the most-calibrated kit that has a back photo (prefer one
    // whose colours are set); back photos are shared across the club anyway.
    const teamKits = kits.filter((k) => k.team_id === team.id && k.back_photo_url);
    const previewKit = teamKits.find((k) => k.name_fill) ?? teamKits[0] ?? null;
    const preview = previewKit ? buildPreview(previewKit, compById.get(previewKit.competition_id), glyphs) : null;

    const teamRoster = roster
      .filter((r) => r.team_id === team.id)
      .map((r) => ({ id: r.id, name: r.name, number: r.number }));

    return {
      teamId: team.id,
      teamName: team.name,
      badge: `/img/badges/${team.id}.png`,
      roll,
      cards,
      roster: teamRoster,
      preview,
    };
  });

  return <DashboardClient groups={groups} />;
}
