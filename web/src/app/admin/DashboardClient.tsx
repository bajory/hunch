"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createKitAndGo } from "./actions";
import type { KitStatus } from "./status";
import type { KitTypeId } from "./types";
import { SquadPanel, type RosterPlayer } from "./SquadPanel";
import { KitPreview, type KitPreviewData } from "./KitPreview";

export interface KitVariant {
  kitType: KitTypeId;
  label: string;
  status: KitStatus;
}

export interface KitCardData {
  teamId: string;
  competitionId: string;
  competitionLabel: string;
  competitionLogo: string | null;
  status: KitStatus;
  variants: KitVariant[];
}

export interface TeamGroup {
  teamId: string;
  teamName: string;
  badge: string;
  roll: "published" | "draft" | "empty";
  cards: KitCardData[];
  roster: RosterPlayer[];
  preview: KitPreviewData | null;
}

const ROLL_LABEL: Record<TeamGroup["roll"], string> = {
  published: "Live", draft: "In progress", empty: "Not started",
};

/** A club badge that falls back to a monogram tile if the image is missing. */
function Badge({ src, name, className }: { src: string; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
  if (broken) return <span className={`adm-mono ${className ?? ""}`}>{initials}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden="true" className={className} onError={() => setBroken(true)} />;
}

function CompLogo({ src, label }: { src: string | null; label: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return <span className="adm-mono adm-mono--comp">{label.slice(0, 2).toUpperCase()}</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" aria-hidden="true" className="adm-kitrow__logo" onError={() => setBroken(true)} />;
}

function StatusPill({ status }: { status: KitStatus }) {
  const cls = !status.exists ? "is-muted" : status.isPublished && status.missing.length === 0 ? "is-good" : "is-warn";
  const label = !status.exists ? "Not created" : status.isPublished && status.missing.length === 0 ? "Published"
    : status.isPublished ? "Published · incomplete" : "Draft";
  return <span className={`adm-pill ${cls}`}>{label}</span>;
}

function VariantChip({ teamId, competitionId, variant }: {
  teamId: string; competitionId: string; variant: KitVariant;
}) {
  const dotClass = !variant.status.exists ? "is-empty" : variant.status.isPublished ? "is-published" : "is-draft";
  if (variant.status.exists) {
    return (
      <Link href={`/admin/kits/${teamId}/${competitionId}/${variant.kitType}`} className="adm-variant">
        <span className={`adm-dotstat ${dotClass}`} />
        {variant.label}
      </Link>
    );
  }
  return (
    <form action={createKitAndGo}>
      <input type="hidden" name="teamId" value={teamId} />
      <input type="hidden" name="competitionId" value={competitionId} />
      <input type="hidden" name="kitType" value={variant.kitType} />
      <button type="submit" className="adm-variant adm-variant--create">+ {variant.label}</button>
    </form>
  );
}

export function DashboardClient({ groups }: { groups: TeamGroup[] }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(groups[0]?.teamId ?? "");

  const filtered = useMemo(
    () => groups.filter((g) => g.teamName.toLowerCase().includes(q.trim().toLowerCase())),
    [groups, q],
  );
  const team = groups.find((g) => g.teamId === selected) ?? filtered[0] ?? groups[0];

  return (
    <div className="adm-cms">
      {/* ── Club rail ── */}
      <aside className="adm-rail" aria-label="Clubs">
        <div className="adm-rail__search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search clubs" aria-label="Search clubs" />
        </div>
        <nav className="adm-rail__list">
          {filtered.map((g) => (
            <button key={g.teamId}
              className={`adm-teamitem${g.teamId === team?.teamId ? " is-on" : ""}`}
              onClick={() => setSelected(g.teamId)}>
              <Badge src={g.badge} name={g.teamName} className="adm-teamitem__badge" />
              <span className="adm-teamitem__name">{g.teamName}</span>
              <span className={`adm-dotstat is-${g.roll}`} title={ROLL_LABEL[g.roll]} />
            </button>
          ))}
          {filtered.length === 0 && <p className="adm-rail__empty">No clubs match.</p>}
        </nav>
      </aside>

      {/* ── Detail ── */}
      <main className="adm-detail">
        {team && (
          <>
            <header className="adm-detail__head">
              <div className="adm-detail__id">
                <Badge src={team.badge} name={team.teamName} className="adm-detail__badge" />
                <div>
                  <h1 className="adm-detail__name">{team.teamName}</h1>
                  <span className="adm-detail__sub">{team.cards.length} competitions · {ROLL_LABEL[team.roll]}</span>
                </div>
              </div>
              {team.preview && (
                <KitPreview data={team.preview} name={team.roster[0]?.name ?? ""} number={String(team.roster[0]?.number ?? "10")} />
              )}
            </header>

            <div className="adm-kitlist">
              {team.cards.map((c) => (
                <div key={c.competitionId} className="adm-kitrow">
                  <CompLogo src={c.competitionLogo} label={c.competitionLabel} />
                  <div className="adm-kitrow__body">
                    <div className="adm-kitrow__top">
                      <span className="adm-kitrow__comp">{c.competitionLabel}</span>
                      <StatusPill status={c.status} />
                    </div>
                    <div className="adm-variants">
                      {c.variants.map((v) => (
                        <VariantChip key={v.kitType} teamId={c.teamId} competitionId={c.competitionId} variant={v} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <SquadPanel key={team.teamId} teamId={team.teamId} initial={team.roster} />
          </>
        )}
      </main>
    </div>
  );
}
