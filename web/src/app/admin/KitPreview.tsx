"use client";

import { useEffect, useRef, useState } from "react";
import { PhotoOverlay, GlyphOverlay } from "@/components/jersey/art";

export interface KitPreviewData {
  src: string;
  competitionLabel: string;
  nameGeo: { cy: number; span: number; arc: number; size: number };
  numberGeo: { cy: number; size: number; gap?: number };
  tracking: string;
  nameWeight: number;
  numberWeight: number;
  fill: string;
  stroke: string;
  numberFill: string;
  numberStroke: string;
  numberMode: "font" | "svg_glyphs";
  fontNameUrl: string | null;
  fontNumberUrl: string | null;
  baseFont: string;
  glyphs: Record<string, { url: string; w: number; h: number }>;
}

function injectFontFace(id: string, url: string) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(`hf-${id}`);
  if (!el) { el = document.createElement("style"); el.id = `hf-${id}`; document.head.appendChild(el); }
  el.textContent = `@font-face{font-family:'${id}';src:url('${url}');font-display:swap;}`;
}

/** Read-only jersey preview for the dashboard: the club's back photo with a
    sample name + number rendered through the same overlay pipeline the store uses. */
export function KitPreview({ data, name, number }: { data: KitPreviewData; name: string; number: string }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [nameFont, setNameFont] = useState<string | null>(null);
  const [numFont, setNumFont] = useState<string | null>(null);

  useEffect(() => {
    if (data.fontNameUrl) {
      const id = `adm-prev-${data.competitionLabel}-name`.replace(/\W/g, "");
      injectFontFace(id, data.fontNameUrl);
      setNameFont(`'${id}', sans-serif`);
    } else setNameFont(null);
    if (data.fontNumberUrl) {
      const id = `adm-prev-${data.competitionLabel}-num`.replace(/\W/g, "");
      injectFontFace(id, data.fontNumberUrl);
      setNumFont(`'${id}', sans-serif`);
    } else setNumFont(null);
  }, [data.fontNameUrl, data.fontNumberUrl, data.competitionLabel]);

  useEffect(() => {
    setDim(null);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setDim({ w: img.naturalWidth, h: img.naturalHeight });
  }, [data.src]);

  const fontFamily = nameFont ?? data.baseFont;
  const numFontFamily = numFont ?? fontFamily;
  const useGlyphs = data.numberMode === "svg_glyphs" && Object.keys(data.glyphs).length > 0;
  const displayName = (name || "PLAYER").toUpperCase();
  const displayNumber = number || "10";

  return (
    <div className="adm-kitpreview">
      <div className="adm-kitpreview__photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={data.src} alt="Kit preview"
          onLoad={(e) => setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
        {dim && (
          <svg className="adm-kitpreview__svg" viewBox={`0 0 ${dim.w} ${dim.h}`} preserveAspectRatio="xMidYMid meet">
            <PhotoOverlay
              W={dim.w} H={dim.h} name={displayName}
              number={useGlyphs ? "" : displayNumber}
              fontFamily={fontFamily} numFontFamily={numFontFamily}
              nameWeight={data.nameWeight} numberWeight={data.numberWeight}
              tracking={data.tracking} fill={data.fill} stroke={data.stroke}
              numFill={data.numberFill} numStroke={data.numberStroke}
              nameGeo={data.nameGeo} numberGeo={data.numberGeo}
            />
            {useGlyphs && (
              <GlyphOverlay W={dim.w} H={dim.h} number={displayNumber}
                glyphs={data.glyphs} numberGeo={data.numberGeo}
                fill={data.numberFill === "default" ? undefined : data.numberFill}
                stroke={data.numberStroke} />
            )}
          </svg>
        )}
      </div>
      <span className="adm-kitpreview__cap">{data.competitionLabel} · {displayName} {displayNumber}</span>
    </div>
  );
}
