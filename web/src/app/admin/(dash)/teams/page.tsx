import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import { SquadPanel } from "../../SquadPanel";
import { toggleTeamPublished } from "../../products-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clubs & Squads — HUNCH Admin" };

interface TeamListRow {
  id: string;
  name: string;
  team_kind: "club" | "national";
  is_published: boolean;
}

interface RosterListRow {
  id: string;
  team_id: string;
  name: string;
  number: number;
}

export default async function TeamsPage() {
  const db = createAdminClient() ?? supabase;

  let teams: TeamListRow[] = [];
  let roster: RosterListRow[] = [];
  if (db) {
    const [{ data: t }, { data: r }] = await Promise.all([
      db.from("teams").select("id,name,team_kind,is_published").order("name"),
      db.from("roster_players").select("id,team_id,name,number").order("sort_order"),
    ]);
    teams = (t as TeamListRow[]) ?? [];
    roster = (r as RosterListRow[]) ?? [];
  }

  const clubs = teams.filter((t) => t.team_kind === "club");
  const nations = teams.filter((t) => t.team_kind === "national");

  const renderTeam = (team: TeamListRow) => (
    <details key={team.id} className="adm-teamcard">
      <summary>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/img/badges/${team.id}.png`} alt="" className="adm-teamcard__badge" />
        <span className="adm-teamcard__name">{team.name}</span>
        <span className="adm-teamcard__kind">{team.team_kind === "club" ? "Club" : "National team"}</span>
        <form action={toggleTeamPublished} style={{ marginLeft: "auto" }}>
          <input type="hidden" name="teamId" value={team.id} />
          <input type="hidden" name="publish" value={String(!team.is_published)} />
          <button type="submit" className={`adm-pub${team.is_published ? " is-pub" : ""}`}
            title={team.is_published ? "Team data visible to the storefront — click to hide" : "Hidden from the storefront — click to publish"}>
            <span className="adm-dot" />
            {team.is_published ? "Published" : "Hidden"}
          </button>
        </form>
      </summary>
      <div className="adm-teamcard__body">
        <SquadPanel
          teamId={team.id}
          initial={roster.filter((r) => r.team_id === team.id).map((r) => ({ id: r.id, name: r.name, number: r.number }))}
        />
      </div>
    </details>
  );

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <h1>Clubs &amp; Squads</h1>
        <span className="adm-bar__title">{teams.length} teams · squads power the &ldquo;Squad Player&rdquo; picker</span>
      </div>
      {teams.length === 0 ? (
        <div className="adm-table__empty">No teams found — run the seed migrations in Supabase.</div>
      ) : (
        <div className="adm-teamlist">
          {clubs.length > 0 && <p className="adm-hint">Clubs</p>}
          {clubs.map(renderTeam)}
          {nations.length > 0 && <p className="adm-hint" style={{ marginTop: 12 }}>National teams</p>}
          {nations.map(renderTeam)}
        </div>
      )}
    </div>
  );
}
