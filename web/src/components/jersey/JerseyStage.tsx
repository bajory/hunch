"use client";

import { useState, useEffect, useRef } from "react";
import { TEAMS, COMPETITIONS, printFor, letteringFont, patchImageFor, sleeveFor, type Team, type TeamId, type Competition, type CompetitionId, type View, type PrintEntry } from "@/lib/catalog";
import { JerseySilhouette, PhotoOverlay, SleeveOverlay } from "./art";

interface Props {
  teamId: TeamId;
  competition: CompetitionId;
  view: View;
  name: string;       // raw (already display-cased by caller)
  number: string;
  onSetView: (v: View) => void;
  teams?: Record<TeamId, Team>;
  competitions?: Record<CompetitionId, Competition>;
  printMap?: Partial<Record<string, PrintEntry>>;
}

/* Real photo base + overlay; self-resets per src and falls back on load error. */
function PhotoKit({
  src, alt, overlay, fallback,
}: {
  src: string;
  alt: string;
  overlay: ((w: number, h: number) => React.ReactNode) | null;
  fallback: React.ReactNode;
}) {
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [err, setErr] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // The image can finish loading before React attaches onLoad (SSR markup /
  // cached image), so read natural size on mount too.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth) {
      setDim({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, [src]);

  if (err) return <>{fallback}</>;
  return (
    <div className="photo-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        className="photo-base"
        src={src}
        alt={alt}
        onLoad={(e) => setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        onError={() => setErr(true)}
      />
      {dim && overlay && (
        <svg className="photo-overlay" viewBox={`0 0 ${dim.w} ${dim.h}`} preserveAspectRatio="xMidYMid meet">
          {overlay(dim.w, dim.h)}
        </svg>
      )}
    </div>
  );
}

export function JerseyStage({ teamId, competition, view, name, number, onSetView, teams: teamsOverride, competitions: competitionsOverride, printMap }: Props) {
  const teamMap = teamsOverride ?? TEAMS;
  const compMap = competitionsOverride ?? COMPETITIONS;
  const team = teamMap[teamId] ?? Object.values(teamMap)[0];
  const comp = compMap[competition] ?? compMap[team?.league as CompetitionId] ?? Object.values(compMap)[0];
  const print = printFor(teamId, competition, view, printMap);
  const displayName = comp?.uppercase ? name.toUpperCase() : name;
  const fontFamily = letteringFont(teamId, competition, compMap);

  const isUCL = comp?.kind === "continental";
  const fill = isUCL ? team?.kit.uclFill : team?.kit.leagueFill;
  const stroke = !isUCL && team?.kit.leagueStroke && team?.kit.leagueStroke !== "none" ? team?.kit.leagueStroke : "none";
  const patchImage = patchImageFor(teamId, competition, printMap);
  const sleeve = sleeveFor(teamId, competition, printMap);

  const silhouette = (
    <JerseySilhouette team={team} competition={comp} name={displayName} number={number} view={view} fontFamily={fontFamily} />
  );

  const content = print ? (
    <PhotoKit
      key={print.src + view}
      src={print.src}
      alt={`${team.name} jersey, ${view} view`}
      fallback={silhouette}
      overlay={(w, h) => (
        <>
          {view === "back" && (
            <PhotoOverlay
              W={w} H={h} name={displayName} number={number}
              fontFamily={fontFamily} nameWeight={comp.nameWeight} numberWeight={comp.numberWeight}
              tracking={comp.tracking} fill={fill} stroke={stroke}
              nameGeo={print.name} numberGeo={print.number}
            />
          )}
          {sleeve && view === "back" && (
            <SleeveOverlay W={w} H={h} view={view} sleeve={sleeve} />
          )}
        </>
      )}
    />
  ) : (
    silhouette
  );

  return (
    <section className="stage" aria-label="Jersey preview">
      <div className="stage__frame">
        <span className="stage__edition">{team.edition}</span>
        <span className="stage__tag"><span className="dot" />Authentic · Made to order</span>
        <div className={`stage__jersey${print ? " is-photo" : ""}`}>{content}</div>
        <div className="viewtoggle" role="group" aria-label="View">
          <button className={view === "front" ? "is-active" : ""} onClick={() => onSetView("front")}>Front</button>
          <button className={view === "back" ? "is-active" : ""} onClick={() => onSetView("back")}>Back</button>
        </div>
      </div>
    </section>
  );
}
