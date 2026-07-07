import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import { createKitAndGo, signOut } from "../../../../actions";
import { KitEditor } from "../../../../KitEditor";
import { KIT_TYPES, KIT_TYPE_LABEL, type KitTypeId } from "../../../../types";
import type { KitRow, GlyphRow, TeamRow, CompRow } from "../../../../types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ teamId: string; competitionId: string; kitType: string }>;
}

function isKitType(v: string): v is KitTypeId {
  return (KIT_TYPES as string[]).includes(v);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { teamId, competitionId, kitType } = await params;
  const kitLabel = isKitType(kitType) ? KIT_TYPE_LABEL[kitType] : kitType;
  return { title: `${teamId} · ${competitionId} · ${kitLabel} — HUNCH Admin` };
}

export default async function KitPage({ params }: Props) {
  const { teamId, competitionId, kitType } = await params;
  if (!isKitType(kitType)) notFound();

  const db = createAdminClient() ?? supabase;

  let teams: TeamRow[] = [];
  let kits: KitRow[] = [];
  let glyphs: GlyphRow[] = [];
  let competitions: CompRow[] = [];

  if (db) {
    const [{ data: t }, { data: k }, { data: g }, { data: c }] = await Promise.all([
      db.from("teams").select("id,name,league_id,team_kind,kit_league_fill,kit_league_stroke,kit_ucl_fill"),
      db.from("team_competition_kits").select("*").eq("team_id", teamId),
      db.from("number_glyphs").select("team_id,competition_id,kit_type,digit,svg_url,glyph_w,glyph_h").eq("team_id", teamId).eq("competition_id", competitionId).eq("kit_type", kitType),
      db.from("competitions").select("id,label,kind,font_family,name_weight,number_weight,tracking").order("sort_order"),
    ]);
    teams        = (t as TeamRow[])  ?? [];
    kits         = (k as KitRow[])  ?? [];
    glyphs       = (g as GlyphRow[]) ?? [];
    competitions = (c as CompRow[]) ?? [];
  }

  const team = teams.find((t) => t.id === teamId);
  if (!team) notFound();

  const comp = competitions.find((c) => c.id === competitionId);
  if (!comp) notFound();

  const kit = kits.find((k) => k.competition_id === competitionId && k.kit_type === kitType) ?? null;
  const compTabIds = team.team_kind === "national"
    ? ["worldcup"]
    : Array.from(new Set([team.league_id ?? "laliga", "ucl"]));

  // Every other kit row of this club that already carries styling — offered as
  // sources this kit can inherit lettering styling from (any competition, any kit type).
  const styledSiblings = kits
    .filter((k) => k.name_fill && !(k.competition_id === competitionId && k.kit_type === kitType))
    .map((k) => ({
      comp: k.competition_id, kitType: k.kit_type,
      label: `${competitions.find((c) => c.id === k.competition_id)?.label ?? k.competition_id} · ${KIT_TYPE_LABEL[k.kit_type]}`,
    }));

  return (
    <div className="adm-shell">
      <header className="adm-bar">
        <span className="adm-logo">HUNCH<span className="adm-logo__sub"> / Admin</span></span>
        <a href="/admin/studio" className="adm-bar__crumb">← Kit Studio</a>
        <nav className="adm-bar__comps">
          {compTabIds.map((id) => {
            const c = competitions.find((x) => x.id === id);
            const label = c?.label ?? id;
            if (id === competitionId) {
              return <span key={id} className="adm-bar__comp is-on">{label}</span>;
            }
            const target = kits.find((k) => k.competition_id === id && k.kit_type === kitType);
            if (target) {
              return <a key={id} href={`/admin/kits/${teamId}/${id}/${kitType}`} className="adm-bar__comp">{label}</a>;
            }
            return (
              <form key={id} action={createKitAndGo} className="adm-bar__switch-form">
                <input type="hidden" name="teamId" value={teamId} />
                <input type="hidden" name="competitionId" value={id} />
                <input type="hidden" name="kitType" value={kitType} />
                <button type="submit" className="adm-bar__comp adm-bar__comp--create">+ {label}</button>
              </form>
            );
          })}
        </nav>
        <a href="/" className="adm-bar__back" target="_blank" rel="noreferrer">Storefront ↗</a>
        <form action={signOut}><button type="submit" className="adm-bar__signout">Sign out</button></form>
      </header>

      <div className="adm-kittypes">
        <span className="adm-kittypes__label">Kit</span>
        {KIT_TYPES.map((kt) => {
          if (kt === kitType) {
            return <span key={kt} className="adm-kittypes__chip is-on">{KIT_TYPE_LABEL[kt]}</span>;
          }
          const exists = kits.some((k) => k.competition_id === competitionId && k.kit_type === kt);
          if (exists) {
            return <a key={kt} href={`/admin/kits/${teamId}/${competitionId}/${kt}`} className="adm-kittypes__chip">{KIT_TYPE_LABEL[kt]}</a>;
          }
          return (
            <form key={kt} action={createKitAndGo}>
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="competitionId" value={competitionId} />
              <input type="hidden" name="kitType" value={kt} />
              <button type="submit" className="adm-kittypes__chip adm-kittypes__chip--create">+ {KIT_TYPE_LABEL[kt]}</button>
            </form>
          );
        })}
      </div>

      {kit ? (
        <KitEditor
          teamId={teamId} team={team} comp={comp} kit={kit} glyphs={glyphs}
          siblings={styledSiblings}
        />
      ) : (
        <div className="adm-empty">
          <p>{team.name} has no {KIT_TYPE_LABEL[kitType]} kit for {comp.label} yet.</p>
          <form action={createKitAndGo}>
            <input type="hidden" name="teamId" value={teamId} />
            <input type="hidden" name="competitionId" value={competitionId} />
            <input type="hidden" name="kitType" value={kitType} />
            <button type="submit" className="adm-kitcard__create">+ Create kit</button>
          </form>
        </div>
      )}
    </div>
  );
}
