"use client";

import { useState, useTransition } from "react";
import { addRosterPlayer, updateRosterPlayer, removeRosterPlayer } from "./actions";

export interface RosterPlayer {
  id: string;
  name: string;
  number: number;
}

/**
 * Team-level squad editor. Powers the storefront personalisation studio's
 * "Squad Player" presets. Inline edit (save on blur), remove, and add-a-player.
 * Optimistic local state so editing stays smooth; each change persists in the
 * background and reflects on the storefront (cache invalidated per team).
 */
export function SquadPanel({ teamId, initial }: { teamId: string; initial: RosterPlayer[] }) {
  const [players, setPlayers] = useState<RosterPlayer[]>(initial);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 1600);
  }

  function saveField(p: RosterPlayer, name: string, number: number) {
    if (name === p.name && number === p.number) return;
    setPlayers((list) => list.map((x) => (x.id === p.id ? { ...x, name, number } : x)));
    startTransition(async () => {
      const res = await updateRosterPlayer(p.id, teamId, name, number);
      flash(res.ok ? "Saved" : res.error ?? "Save failed");
    });
  }

  function remove(id: string) {
    setPlayers((list) => list.filter((x) => x.id !== id));
    startTransition(async () => {
      const res = await removeRosterPlayer(id, teamId);
      flash(res.ok ? "Removed" : res.error ?? "Remove failed");
    });
  }

  function add() {
    const name = newName.trim();
    const number = parseInt(newNumber, 10);
    if (!name || !Number.isFinite(number)) { flash("Name and number required"); return; }
    const sortOrder = players.length;
    startTransition(async () => {
      const res = await addRosterPlayer(teamId, name, number, sortOrder);
      if (res.ok && res.id) {
        setPlayers((list) => [...list, { id: res.id!, name, number }]);
        setNewName(""); setNewNumber("");
        flash("Added");
      } else flash(res.error ?? "Add failed");
    });
  }

  return (
    <section className="adm-squad">
      <div className="adm-squad__hd">
        <h2>Squad players</h2>
        <span className="adm-squad__sub">
          Presets in the storefront personalisation studio · {players.length} player{players.length === 1 ? "" : "s"}
          {msg && <em className="adm-squad__msg"> — {msg}</em>}
        </span>
      </div>

      <div className="adm-squad__list">
        {players.map((p) => (
          <PlayerRow key={p.id} player={p} disabled={isPending}
            onSave={(name, number) => saveField(p, name, number)}
            onRemove={() => remove(p.id)} />
        ))}
        {players.length === 0 && <p className="adm-squad__empty">No players yet — add your first below.</p>}
      </div>

      <div className="adm-squad__add">
        <input className="adm-input" placeholder="Player name" value={newName}
          maxLength={20} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <input className="adm-input adm-squad__num" placeholder="No." value={newNumber}
          inputMode="numeric" maxLength={2}
          onChange={(e) => setNewNumber(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="adm-squad__addbtn" disabled={isPending} onClick={add}>+ Add player</button>
      </div>
    </section>
  );
}

function PlayerRow({ player, disabled, onSave, onRemove }: {
  player: RosterPlayer;
  disabled: boolean;
  onSave: (name: string, number: number) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(player.name);
  const [number, setNumber] = useState(String(player.number));

  return (
    <div className="adm-squad__row">
      <input className="adm-input" value={name} maxLength={20}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => onSave(name.trim() || player.name, parseInt(number, 10) || player.number)} />
      <input className="adm-input adm-squad__num" value={number} inputMode="numeric" maxLength={2}
        onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={() => onSave(name.trim() || player.name, parseInt(number, 10) || player.number)} />
      <button className="adm-remove-btn" title="Remove player" disabled={disabled} onClick={onRemove}>✕</button>
    </div>
  );
}
