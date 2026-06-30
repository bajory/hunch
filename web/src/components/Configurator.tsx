"use client";

import { useState, useRef } from "react";
import {
  PATCHES, SIZES, CUSTOMIZATION_FEE,
  patchImageFor,
  type Team, type TeamId, type Competition, type CompetitionId, type View, type PrintEntry,
} from "@/lib/catalog";
import { JerseyStage } from "./jersey/JerseyStage";
import { PatchIcon } from "./jersey/art";
import { useCart } from "./CartProvider";

type Mode = "player" | "custom";

interface Props {
  defaultTeam?: TeamId;
  teams: Record<TeamId, Team>;
  competitions: Record<CompetitionId, Competition>;
  printMap: Partial<Record<string, PrintEntry>>;
}

export function Configurator({ defaultTeam = "barcelona", teams, competitions, printMap }: Props) {
  const [teamId, setTeamId] = useState<TeamId>(defaultTeam);
  const [competition, setCompetition] = useState<CompetitionId>(teams[defaultTeam].league);
  const [view, setView] = useState<View>("back");
  const [mode, setMode] = useState<Mode>("player");
  const [player, setPlayer] = useState(0);
  const [name, setName] = useState(teams[defaultTeam].roster[0]?.name ?? "");
  const [number, setNumber] = useState(String(teams[defaultTeam].roster[0]?.number ?? ""));
  const [size, setSize] = useState("M");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { count: bag, addItem, openDrawer } = useCart();

  const team = teams[teamId] ?? teams[defaultTeam] ?? Object.values(teams)[0];
  const comp = competitions[competition] ?? competitions[team?.league as CompetitionId] ?? Object.values(competitions)[0];
  const comps: CompetitionId[] = [teams[teamId]?.league ?? "ucl", "ucl"].filter(
    (id, i, arr) => arr.indexOf(id) === i
  ) as CompetitionId[];

  function selectTeam(id: TeamId) {
    setTeamId(id);
    if (competition !== "ucl") setCompetition(teams[id].league);
    if (mode === "player") {
      setPlayer(0);
      setName(teams[id].roster[0]?.name ?? "");
      setNumber(String(teams[id].roster[0]?.number ?? ""));
    }
  }
  function selectMode(m: Mode) {
    setMode(m);
    if (m === "player") {
      setName(team.roster[player].name);
      setNumber(String(team.roster[player].number));
    }
  }
  function selectPlayer(i: number) {
    setPlayer(i);
    setName(team.roster[i].name);
    setNumber(String(team.roster[i].number));
  }
  function addToBag() {
    void addItem([
      { key: "Club", value: team.name },
      { key: "Competition", value: comp.label },
      { key: "Patch", value: patchMeta.label },
      { key: "Name", value: name },
      { key: "Number", value: number },
      { key: "Size", value: size },
    ]);
    const msg = `${team.name} · ${name} ${number} · ${size} added`;
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
    // open drawer after a brief moment so the toast is seen first
    setTimeout(() => openDrawer(), 400);
  }

  const personalised = name || number ? CUSTOMIZATION_FEE : 0;
  const total = (team?.price ?? 0) + personalised;
  const patch = comp?.patch ?? competition;
  const patchMeta = PATCHES[patch] ?? { label: comp?.label ?? patch, sleeve: "Right sleeve" };

  return (
    <>
      <main className="pdp">
        <JerseyStage teamId={teamId} competition={competition} view={view} name={name} number={number} onSetView={setView} teams={teams} competitions={competitions} printMap={printMap} />

        <section className="panel" aria-label="Product details and customization">
          <div className="panel__head">
            <span className="eyebrow">The Authentic Atelier</span>
            <h1 className="panel__title">Made-to-Name<br />Match Jersey</h1>
            <div className="panel__price">
              <span className="amt">From $158</span>
              <span className="meta">· Personalisation included in your bag</span>
            </div>
          </div>

          {/* TEAM */}
          <div className="section">
            <div className="section__label">Select Club <span className="hint">6 houses</span></div>
            <div className="teams">
              {Object.values(teams).map((t) => (
                <button key={t.id} className={`team${t.id === teamId ? " is-active" : ""}`} onClick={() => selectTeam(t.id)}>
                  <span className="team__swatch" style={{
                    background: t.kit.stripes
                      ? `linear-gradient(90deg, ${t.kit.stripes.colors[0]} 50%, ${t.kit.stripes.colors[1]} 50%)`
                      : t.kit.body,
                  }} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* COMPETITION + PATCH */}
          <div className="section">
            <div className="section__label">Competition &amp; Sleeve Patch <span className="hint">sets lettering style</span></div>
            <div className="segment" role="group" aria-label="Competition">
              {comps.map((id) => (
                <button key={id} className={id === competition ? "is-active" : ""} onClick={() => setCompetition(id)}>
                  {competitions[id]?.label}
                </button>
              ))}
            </div>
            <div className="patchrow" style={{ marginTop: 14 }}>
              <PatchIcon competition={patch} imageUrl={patchImageFor(teamId, competition, printMap)} />
              <span className="pinfo">
                <span className="pttl">{patchMeta.label} patch</span>
                <span className="psub">{patchMeta.sleeve} · lettering set in {comp.label} typeface</span>
              </span>
            </div>
          </div>

          {/* PERSONALISATION */}
          <div className="section">
            <div className="section__label">Personalisation</div>
            <div className="segment" role="group" aria-label="Personalisation mode" style={{ marginBottom: 16 }}>
              <button className={mode === "player" ? "is-active" : ""} onClick={() => selectMode("player")}>Squad Player</button>
              <button className={mode === "custom" ? "is-active" : ""} onClick={() => selectMode("custom")}>Your Name</button>
            </div>

            {mode === "player" ? (
              <div className="roster">
                {team.roster.map((p, i) => (
                  <button key={p.name} className={`player${i === player ? " is-active" : ""}`} onClick={() => selectPlayer(i)}>
                    <span className="pname">{p.name}</span>
                    <span className="pnum">{p.number}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <div className="fields">
                  <div className="field">
                    <label htmlFor="in-name">Name</label>
                    <input id="in-name" type="text" maxLength={14} autoComplete="off" placeholder="YOUR NAME"
                      value={name} onChange={(e) => setName(e.target.value.slice(0, 14))} />
                  </div>
                  <div className="field">
                    <label htmlFor="in-number">No.</label>
                    <input id="in-number" type="text" inputMode="numeric" maxLength={2} autoComplete="off" placeholder="00"
                      value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                  </div>
                </div>
                <p className="field note" style={{ marginTop: 12 }}>Up to 14 characters &amp; 2 digits. Rendered live in the selected competition&apos;s typeface.</p>
              </div>
            )}
          </div>

          {/* SIZE */}
          <div className="section">
            <div className="section__label">Size <span className="hint">Authentic fit</span></div>
            <div className="sizes">
              {SIZES.map((s) => (
                <button key={s} className={`size${s === size ? " is-active" : ""}`} onClick={() => setSize(s)}>{s}</button>
              ))}
            </div>
          </div>

          {/* SUMMARY */}
          <div className="summary">
            <div className="summary__row"><span className="muted">Jersey</span><span>${team.price}</span></div>
            {personalised > 0 && (
              <div className="summary__row"><span className="muted">Personalisation</span><span>${personalised}</span></div>
            )}
            <div className="summary__row total"><span className="lbl">Total</span><span className="val">${total}</span></div>
            <p className="field note" style={{ marginTop: 2 }}>
              {team.name} · {comp.label} · {size}{(name || number) ? ` · ${name || "—"} ${number}` : ""}
            </p>
          </div>

          <button className="cta" onClick={addToBag}>
            Add to Bag
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>

          <div className="assurances">
            <span className="assurance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z" /></svg>
              Officially licensed authentic
            </span>
            <span className="assurance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h18v10H3z" /><path d="M3 11h18" /></svg>
              Heat-pressed in atelier
            </span>
            <span className="assurance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" /><path d="m9 12 2 2 4-4" /></svg>
              Complimentary returns
            </span>
          </div>
        </section>
      </main>

      <div className={`toast${toast ? " is-show" : ""}`} role="status" aria-live="polite">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 12 4 4 10-10" /></svg>
        <span>{toast ?? "Added to bag"}</span>
      </div>
    </>
  );
}
