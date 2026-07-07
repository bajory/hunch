"use client";

import { useState, useEffect, useRef } from "react";
import { printFor, letteringFont, sleeveFor, printSlot, type CompetitionId, type Competition, type Team, type PrintEntry, type KitTypeId } from "@/lib/catalog";
import { PhotoOverlay, SleeveOverlay, GlyphOverlay } from "@/components/jersey/art";

function injectFontFace(id: string, url: string) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(`hf-${id}`);
  if (!el) { el = document.createElement("style"); el.id = `hf-${id}`; document.head.appendChild(el); }
  el.textContent = `@font-face{font-family:'${id}';src:url('${url}');font-display:swap;}`;
}

/**
 * Live personalisation preview on the real calibrated back photo.
 * Photo-only by design: if there's no calibrated photo for the selected
 * competition, the parent should not render this at all.
 */
export function PrintPreview({
  teamSlug, competition, kitType, name, number, teams, competitions, printMap,
}: {
  teamSlug: string;
  competition: CompetitionId;
  kitType: KitTypeId;
  name: string;
  number: string;
  teams: Record<string, Team>;
  competitions: Record<string, Competition>;
  printMap: Partial<Record<string, PrintEntry>>;
}) {
  const team = teams[teamSlug];
  const comp = competitions[competition];
  const print = printFor(teamSlug as never, competition, "back", printMap, kitType);
  const displayName = comp?.uppercase ? name.toUpperCase() : name;
  const baseFont = letteringFont(teamSlug as never, competition, competitions);
  const slot = printSlot(competition, kitType);

  const [customNameFont, setCustomNameFont] = useState<string | null>(null);
  const [customNumFont, setCustomNumFont] = useState<string | null>(null);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const nameUrl = print?.fontNameUrl;
    const numUrl = print?.fontNumberUrl;
    if (nameUrl) {
      const id = `hunch-store-${teamSlug}-${slot}-name`;
      injectFontFace(id, nameUrl);
      setCustomNameFont(`'${id}', sans-serif`);
    } else setCustomNameFont(null);
    if (numUrl) {
      const id = `hunch-store-${teamSlug}-${slot}-num`;
      injectFontFace(id, numUrl);
      setCustomNumFont(`'${id}', sans-serif`);
    } else setCustomNumFont(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamSlug, slot, print?.fontNameUrl, print?.fontNumberUrl]);

  useEffect(() => {
    setDim(null);
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth) {
      setDim({ w: img.naturalWidth, h: img.naturalHeight });
    }
  }, [print?.src]);

  if (!print || !team || !comp) return null;

  const fontFamily = customNameFont ?? baseFont;
  const numFontFamily = customNumFont ?? fontFamily;
  const kitColors = printMap?.[teamSlug]?.colors?.[slot];
  const isUCL = comp.kind === "continental";
  const defaultFill = isUCL ? team.kit.uclFill : team.kit.leagueFill;
  const defaultStroke = !isUCL && team.kit.leagueStroke && team.kit.leagueStroke !== "none" ? team.kit.leagueStroke : "none";
  const fill = kitColors?.nameFill || defaultFill;
  const stroke = kitColors?.nameStroke !== undefined && kitColors.nameStroke !== "" ? kitColors.nameStroke : defaultStroke;
  const rawNumFill = kitColors?.numberFill;
  const numFill = rawNumFill && rawNumFill !== "default" ? rawNumFill : fill;
  const numStroke = kitColors?.numberStroke !== undefined && kitColors.numberStroke !== "" ? kitColors.numberStroke : stroke;
  const glyphFill = rawNumFill === "default" ? undefined : numFill;
  const sleeve = sleeveFor(teamSlug as never, competition, printMap, kitType);
  const useGlyphs = print.numberMode === "svg_glyphs" && !!print.glyphs && Object.keys(print.glyphs).length > 0;
  const nameTracking = print.name.tracking != null ? `${print.name.tracking}em` : comp.tracking;

  return (
    <div className="preview__photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={print.src}
        alt={`${team.name} jersey, back view`}
        onLoad={(e) => setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      />
      {dim && (
        <svg className="overlay" viewBox={`0 0 ${dim.w} ${dim.h}`} preserveAspectRatio="xMidYMid meet">
          <PhotoOverlay
            W={dim.w} H={dim.h} name={displayName}
            number={useGlyphs ? "" : number}
            fontFamily={fontFamily} numFontFamily={numFontFamily}
            nameWeight={comp.nameWeight} numberWeight={comp.numberWeight}
            tracking={nameTracking} fill={fill} stroke={stroke}
            numFill={numFill} numStroke={numStroke}
            nameGeo={print.name} numberGeo={print.number}
          />
          {useGlyphs && (
            <GlyphOverlay W={dim.w} H={dim.h} number={number}
              glyphs={print.glyphs!} numberGeo={print.number}
              fill={glyphFill} stroke={numStroke} />
          )}
          {sleeve && <SleeveOverlay W={dim.w} H={dim.h} view="back" sleeve={sleeve} />}
        </svg>
      )}
    </div>
  );
}
