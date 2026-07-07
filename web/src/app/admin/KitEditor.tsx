"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhotoOverlay, SleeveOverlay, GlyphOverlay } from "@/components/jersey/art";
import { PRINT_DEFAULT, type GlyphImage } from "@/lib/catalog";
import {
  saveKitGeo, setKitPublished, uploadFont, uploadGlyph, setNumberMode,
  uploadPhoto, uploadPanelPatch, uploadSleevePatch, removeAsset, inheritStyling,
  uploadGalleryImage, removeGalleryImage,
} from "./actions";
import { computeKitStatus } from "./status";
import type { KitRow, TeamRow, CompRow, GlyphRow, KitTypeId } from "./types";
import { KIT_TYPE_LABEL } from "./types";

interface Props {
  teamId: string;
  team: TeamRow;
  comp: CompRow;
  kit: KitRow;
  glyphs: GlyphRow[];
  /** Other calibrated kit rows of this club (any competition/kit type), offered as styling sources */
  siblings: { comp: string; kitType: KitTypeId; label: string }[];
}

interface Geo {
  name_cy: number; name_span: number; name_arc: number; name_size: number; name_tracking: number;
  number_cy: number; number_size: number; number_glyph_gap: number;
  sleeve_x: number; sleeve_y: number; sleeve_w: number; sleeve_rotation: number;
}

interface Colors {
  name_fill: string;
  name_stroke: string;
  number_fill: string;
  number_stroke: string;
}

type Tab = "content" | "lettering" | "glyphs" | "sleeve";

function parseTrackingEm(s: string | null | undefined, fallback = 0.05): number {
  if (!s) return fallback;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

function kitToGeo(kit: KitRow, comp: CompRow): Geo {
  return {
    name_cy:     kit.name_cy    ?? PRINT_DEFAULT.name.cy,
    name_span:   kit.name_span  ?? PRINT_DEFAULT.name.span,
    name_arc:    kit.name_arc   ?? PRINT_DEFAULT.name.arc,
    name_size:   kit.name_size  ?? PRINT_DEFAULT.name.size,
    name_tracking: kit.name_tracking ?? parseTrackingEm(comp.tracking),
    number_cy:   kit.number_cy  ?? PRINT_DEFAULT.number.cy,
    number_size: kit.number_size ?? PRINT_DEFAULT.number.size,
    number_glyph_gap: kit.number_glyph_gap ?? PRINT_DEFAULT.number.gap ?? 0.008,
    sleeve_x: kit.sleeve_x ?? 0.828,
    sleeve_y: kit.sleeve_y ?? 0.241,
    sleeve_w: kit.sleeve_w ?? 0.052,
    sleeve_rotation: kit.sleeve_rotation ?? 0,
  };
}

function computeDefaultFill(team: TeamRow, isUCL: boolean): string {
  return (isUCL ? team.kit_ucl_fill : team.kit_league_fill) ?? "#FFFFFF";
}

function kitToColors(kit: KitRow, team: TeamRow, isUCL: boolean): Colors {
  const defaultFill   = computeDefaultFill(team, isUCL);
  const defaultStroke = (!isUCL && team.kit_league_stroke && team.kit_league_stroke !== "none")
    ? team.kit_league_stroke : "#000000";
  return {
    name_fill:     kit.name_fill     ?? defaultFill,
    name_stroke:   kit.name_stroke   ?? defaultStroke,
    number_fill:   kit.number_fill   ?? defaultFill,
    number_stroke: kit.number_stroke ?? "none",
  };
}

function injectFontFace(id: string, url: string) {
  let el = document.getElementById(`hf-${id}`);
  if (!el) { el = document.createElement("style"); el.id = `hf-${id}`; document.head.appendChild(el); }
  el.textContent = `@font-face{font-family:'${id}';src:url('${url}');font-display:swap;}`;
}

function readImageSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = () => { reject(new Error("Could not read image")); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

type UploadState = "idle" | "uploading" | "ok" | "err";

function Slider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  const safe = value ?? min;
  return (
    <div className="adm-slider">
      <div className="adm-slider__head">
        <span className="adm-slider__label">{label}</span>
        <span className="adm-slider__val">{safe.toFixed(3)}</span>
      </div>
      <div className="adm-slider__row">
        <input type="range" className="adm-slider__range"
          value={safe} min={min} max={max} step={step}
          onChange={e => onChange(parseFloat(e.target.value))} />
        <input type="number" className="adm-slider__num"
          value={safe.toFixed(3)} min={min} max={max} step={step}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }} />
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange, includeNone, includeDefault, revertValue }: {
  label: string; value: string; onChange: (v: string) => void;
  includeNone?: boolean;
  /** Shows a "Default" toggle for the "default" sentinel — leaves the source artwork's own colour untouched (glyph mode only) */
  includeDefault?: boolean;
  revertValue?: string;
}) {
  const isNone = value === "none";
  const isDefault = value === "default";
  const revert = revertValue ?? "#000000";
  return (
    <div className="adm-color-row">
      <span className="adm-color-label">{label}</span>
      <div className="adm-color-controls">
        {includeDefault && (
          <button
            className={`adm-none-btn${isDefault ? " is-on" : ""}`}
            title="Leave the uploaded artwork's own colour untouched"
            onClick={() => onChange(isDefault ? revert : "default")}>
            Default
          </button>
        )}
        {includeNone && (
          <button
            className={`adm-none-btn${isNone ? " is-on" : ""}`}
            onClick={() => onChange(isNone ? revert : "none")}>
            None
          </button>
        )}
        <label className="adm-color-swatch" style={{ background: isNone || isDefault ? "transparent" : value }}>
          <input type="color" className="adm-color-input"
            value={isNone || isDefault ? "#000000" : value}
            disabled={isNone || isDefault}
            onChange={e => onChange(e.target.value)} />
        </label>
        <input type="text" className="adm-color-hex"
          value={isNone ? "none" : isDefault ? "default" : value}
          onChange={e => {
            const v = e.target.value;
            if (v === "none") { onChange("none"); return; }
            if (v === "default") { onChange("default"); return; }
            if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
          }} />
      </div>
    </div>
  );
}

function JerseyPreview({ photoUrl, geo, colors, sleeveKit, testName, testNumber,
  fontFamily, numFontFamily, nameWeight, numberWeight, tracking, numberMode, glyphs }: {
  photoUrl: string | null; geo: Geo; colors: Colors;
  sleeveKit: { url: string; patchW: number; patchH: number } | null;
  testName: string; testNumber: string;
  fontFamily: string; numFontFamily: string;
  nameWeight: number; numberWeight: number; tracking: string;
  numberMode: "font" | "svg_glyphs";
  glyphs: Record<string, GlyphImage>;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [imgKey, setImgKey] = useState(0);

  useEffect(() => { setDim(null); setImgKey(k => k + 1); }, [photoUrl]);
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth) setDim({ w: img.naturalWidth, h: img.naturalHeight });
  }, [imgKey]);

  if (!photoUrl) return <div className="adm-no-photo">No back photo for this kit yet — upload one under Photos &amp; Patches</div>;

  const sleeve = sleeveKit
    ? { src: sleeveKit.url, x: geo.sleeve_x, y: geo.sleeve_y, w: geo.sleeve_w, patchW: sleeveKit.patchW, patchH: sleeveKit.patchH, rotation: geo.sleeve_rotation }
    : null;
  const useGlyphs = numberMode === "svg_glyphs" && Object.keys(glyphs).length > 0;

  return (
    <div className="adm-photo-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={imgKey} ref={imgRef} className="adm-photo-img" src={photoUrl} alt="Jersey back"
        onLoad={e => setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
      {dim && (
        <svg className="adm-photo-svg" viewBox={`0 0 ${dim.w} ${dim.h}`} preserveAspectRatio="xMidYMid meet">
          {/* Name overlay */}
          <PhotoOverlay
            W={dim.w} H={dim.h}
            name={testName.toUpperCase() || "PLAYER"}
            number=""
            fontFamily={fontFamily} nameWeight={nameWeight} numberWeight={numberWeight}
            tracking={tracking}
            fill={colors.name_fill}
            stroke={colors.name_stroke === "none" ? "none" : colors.name_stroke}
            nameGeo={{ cy: geo.name_cy, span: geo.name_span, arc: geo.name_arc, size: geo.name_size }}
            numberGeo={{ cy: geo.number_cy, size: geo.number_size }}
          />
          {/* Number */}
          {useGlyphs ? (
            <GlyphOverlay W={dim.w} H={dim.h} number={testNumber || "10"}
              glyphs={glyphs} numberGeo={{ cy: geo.number_cy, size: geo.number_size, gap: geo.number_glyph_gap }}
              fill={colors.number_fill === "default" ? undefined : colors.number_fill} stroke={colors.number_stroke} />
          ) : (() => {
            const cx = dim.w / 2;
            const numSize = geo.number_size * dim.w;
            const numY = geo.number_cy * dim.h;
            const numFill   = colors.number_fill;
            const numStroke = colors.number_stroke;
            const xs = numStroke === "none" ? 0 : Math.max(1, numSize * 0.012);
            return (
              <text x={cx} y={numY} textAnchor="middle" dominantBaseline="central"
                fontFamily={numFontFamily} fontWeight={numberWeight} letterSpacing="0"
                fill="currentColor"
                stroke={numStroke === "none" ? "none" : numStroke}
                strokeWidth={xs} paintOrder="stroke"
                style={{ fontSize: `${numSize}px`, color: numFill }}>
                {testNumber || "10"}
              </text>
            );
          })()}
          {sleeve && <SleeveOverlay W={dim.w} H={dim.h} view="back" sleeve={sleeve} />}
        </svg>
      )}
    </div>
  );
}

export function KitEditor({ teamId, team, comp, kit, glyphs: dbGlyphs, siblings }: Props) {
  const compId = comp.id;
  const isUCL = comp.kind === "continental";

  const [geo, setGeo]         = useState<Geo>(kitToGeo(kit, comp));
  const [colors, setColors]   = useState<Colors>(kitToColors(kit, team, isUCL));
  const [published, setPublished]         = useState(kit.is_published);
  const [numberMode, setNumberModeState]  = useState<"font" | "svg_glyphs">((kit.number_mode as "font" | "svg_glyphs") ?? "font");
  const [glyphs, setGlyphs] = useState<Record<string, GlyphImage>>(() =>
    dbGlyphs.reduce((acc, r) => ({ ...acc, [String(r.digit)]: { url: r.svg_url, w: r.glyph_w ?? 65, h: r.glyph_h ?? 100 } }), {} as Record<string, GlyphImage>)
  );
  const [customFont, setCustomFont]       = useState<string | null>(kit.font_name_url ? `'hunch-${teamId}-${compId}-name', sans-serif` : null);
  const [customNumFont, setCustomNumFont] = useState<string | null>(kit.font_number_url ? `'hunch-${teamId}-${compId}-num', sans-serif` : null);
  const [testName, setTestName]     = useState("PLAYER NAME");
  const [testNumber, setTestNumber] = useState("10");
  const [tab, setTab] = useState<Tab>("content");
  const [saveState, setSaveState]   = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [saveMsg, setSaveMsg]       = useState("");
  const [fontState, setFontState]       = useState<UploadState>("idle");
  const [numFontState, setNumFontState] = useState<UploadState>("idle");
  const [glyphUploading, setGlyphUploading] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [backPhotoUrl, setBackPhotoUrl]   = useState<string | null>(kit.back_photo_url);
  const [frontPhotoUrl, setFrontPhotoUrl] = useState<string | null>(kit.front_photo_url);
  const [panelPatchUrl, setPanelPatchUrl] = useState<string | null>(kit.panel_patch_url);
  const [sleevePatch, setSleevePatch]     = useState<{ url: string; w: number; h: number } | null>(
    kit.sleeve_patch_url && kit.sleeve_patch_w && kit.sleeve_patch_h
      ? { url: kit.sleeve_patch_url, w: kit.sleeve_patch_w, h: kit.sleeve_patch_h }
      : null
  );
  const [backPhotoState, setBackPhotoState]     = useState<UploadState>("idle");
  const [frontPhotoState, setFrontPhotoState]   = useState<UploadState>("idle");
  const [panelPatchState, setPanelPatchState]   = useState<UploadState>("idle");
  const [sleevePatchState, setSleevePatchState] = useState<UploadState>("idle");

  const [galleryUrls, setGalleryUrls] = useState<string[]>(kit.gallery_urls ?? []);
  const [galleryState, setGalleryState] = useState<UploadState>("idle");
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // `customFont`/`customNumFont` above only name a font-family — the browser has nothing
  // to render it with until the matching @font-face rule is actually injected. Uploads do
  // that immediately, but a font saved in an earlier session needs it done on mount too,
  // otherwise the preview silently falls back to the default typeface on every reload.
  useEffect(() => {
    if (kit.font_name_url) injectFontFace(`hunch-${teamId}-${compId}-name`, kit.font_name_url);
    if (kit.font_number_url) injectFontFace(`hunch-${teamId}-${compId}-num`, kit.font_number_url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, compId]);

  const fontInputRef    = useRef<HTMLInputElement>(null);
  const numFontInputRef = useRef<HTMLInputElement>(null);
  const glyphInputRef   = useRef<HTMLInputElement>(null);
  const bulkGlyphInputRef = useRef<HTMLInputElement>(null);
  const [bulkGlyphBusy, setBulkGlyphBusy] = useState(false);
  const backPhotoInputRef   = useRef<HTMLInputElement>(null);
  const frontPhotoInputRef  = useRef<HTMLInputElement>(null);
  const panelPatchInputRef  = useRef<HTMLInputElement>(null);
  const sleevePatchInputRef = useRef<HTMLInputElement>(null);
  const pendingDigit    = useRef<string | null>(null);

  const fontFamily    = customFont    ?? comp.font_family ?? "sans-serif";
  const numFontFamily = customNumFont ?? fontFamily;
  const sleeveKit = sleevePatch
    ? { url: sleevePatch.url, patchW: sleevePatch.w, patchH: sleevePatch.h }
    : null;

  const liveStatusKit: KitRow = {
    ...kit,
    back_photo_url: backPhotoUrl,
    sleeve_patch_url: sleevePatch?.url ?? null,
    is_published: published,
    name_fill: colors.name_fill || null,
    number_fill: colors.number_fill || null,
    number_mode: numberMode,
  };
  const status = computeKitStatus(liveStatusKit, Object.keys(glyphs).length);

  function setGeoField(field: keyof Geo, v: number) {
    setGeo(g => ({ ...g, [field]: v }));
    if (saveState === "ok") setSaveState("idle");
  }

  function setColor(field: keyof Colors, v: string) {
    setColors(c => ({ ...c, [field]: v }));
    if (saveState === "ok") setSaveState("idle");
  }

  function handleSave() {
    setSaveState("saving");
    startTransition(async () => {
      const payload: Record<string, number | string | null> = {
        name_cy: geo.name_cy, name_span: geo.name_span,
        name_arc: geo.name_arc, name_size: geo.name_size, name_tracking: geo.name_tracking,
        number_cy: geo.number_cy, number_size: geo.number_size, number_glyph_gap: geo.number_glyph_gap,
        name_fill: colors.name_fill, name_stroke: colors.name_stroke,
        number_fill: colors.number_fill, number_stroke: colors.number_stroke,
      };
      if (sleeveKit) {
        payload.sleeve_x = geo.sleeve_x; payload.sleeve_y = geo.sleeve_y; payload.sleeve_w = geo.sleeve_w;
        payload.sleeve_rotation = geo.sleeve_rotation;
      }
      const res = await saveKitGeo(teamId, compId, payload, kit.kit_type);
      setSaveState(res.ok ? "ok" : "err");
      setSaveMsg(res.ok ? "Saved" : (res.error ?? "Save failed"));
    });
  }

  function handlePublish(pub: boolean) {
    startTransition(async () => {
      const res = await setKitPublished(teamId, compId, pub, kit.kit_type);
      if (res.ok) setPublished(pub);
      setSaveState(res.ok ? "ok" : "err");
      setSaveMsg(res.ok ? (pub ? "Published" : "Unpublished") : (res.error ?? "Error"));
    });
  }

  async function handleFontFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setFontState("uploading");
    const fd = new FormData();
    fd.append("teamId", teamId); fd.append("competitionId", compId); fd.append("kitType", kit.kit_type);
    fd.append("target", "name"); fd.append("file", file);
    const res = await uploadFont(fd);
    if (res.ok && res.url) {
      const id = `hunch-${teamId}-${compId}-name`;
      injectFontFace(id, res.url);
      setCustomFont(`'${id}', sans-serif`);
      setFontState("ok");
    } else { setFontState("err"); setSaveMsg(res.error ?? "Upload failed"); }
    e.target.value = "";
  }

  async function handleNumFontFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setNumFontState("uploading");
    const fd = new FormData();
    fd.append("teamId", teamId); fd.append("competitionId", compId); fd.append("kitType", kit.kit_type);
    fd.append("target", "number"); fd.append("file", file);
    const res = await uploadFont(fd);
    if (res.ok && res.url) {
      const id = `hunch-${teamId}-${compId}-num`;
      injectFontFace(id, res.url);
      setCustomNumFont(`'${id}', sans-serif`);
      setNumFontState("ok");
    } else { setNumFontState("err"); setSaveMsg(res.error ?? "Upload failed"); }
    e.target.value = "";
  }

  async function handlePhotoFile(view: "back" | "front", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const setState = view === "back" ? setBackPhotoState : setFrontPhotoState;
    const setUrl   = view === "back" ? setBackPhotoUrl   : setFrontPhotoUrl;
    setState("uploading");
    const fd = new FormData();
    fd.append("teamId", teamId); fd.append("competitionId", compId); fd.append("kitType", kit.kit_type);
    fd.append("view", view); fd.append("file", file);
    const res = await uploadPhoto(fd);
    if (res.ok && res.url) { setUrl(res.url); setState("ok"); }
    else { setState("err"); setSaveMsg(res.error ?? "Upload failed"); }
    e.target.value = "";
  }

  async function handleGalleryFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setGalleryState("uploading");
    const fd = new FormData();
    fd.append("teamId", teamId); fd.append("kitType", kit.kit_type); fd.append("file", file);
    const res = await uploadGalleryImage(fd);
    if (res.ok && res.url) { setGalleryUrls(u => [...u, res.url!]); setGalleryState("ok"); }
    else { setGalleryState("err"); setSaveMsg(res.error ?? "Upload failed"); }
    e.target.value = "";
  }

  function handleRemoveGalleryImage(url: string) {
    startTransition(async () => {
      const res = await removeGalleryImage(teamId, kit.kit_type, url);
      if (res.ok) { setGalleryUrls(u => u.filter(x => x !== url)); setSaveMsg("Removed"); setSaveState("ok"); }
      else { setSaveMsg(res.error ?? "Remove failed"); setSaveState("err"); }
    });
  }

  async function handlePanelPatchFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setPanelPatchState("uploading");
    const fd = new FormData();
    fd.append("teamId", teamId); fd.append("competitionId", compId); fd.append("kitType", kit.kit_type);
    fd.append("file", file);
    const res = await uploadPanelPatch(fd);
    if (res.ok && res.url) { setPanelPatchUrl(res.url); setPanelPatchState("ok"); }
    else { setPanelPatchState("err"); setSaveMsg(res.error ?? "Upload failed"); }
    e.target.value = "";
  }

  async function handleSleevePatchFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setSleevePatchState("uploading");
    try {
      const { w, h } = await readImageSize(file);
      const fd = new FormData();
      fd.append("teamId", teamId); fd.append("competitionId", compId); fd.append("kitType", kit.kit_type);
      fd.append("file", file); fd.append("width", String(w)); fd.append("height", String(h));
      const res = await uploadSleevePatch(fd);
      if (res.ok && res.url) { setSleevePatch({ url: res.url, w, h }); setSleevePatchState("ok"); }
      else { setSleevePatchState("err"); setSaveMsg(res.error ?? "Upload failed"); }
    } catch {
      setSleevePatchState("err"); setSaveMsg("Could not read image");
    }
    e.target.value = "";
  }

  function handleRemove(
    target: "back" | "front" | "panel" | "sleeve" | "name-font" | "number-font",
    clear: () => void,
  ) {
    startTransition(async () => {
      const res = await removeAsset(teamId, compId, target, kit.kit_type);
      if (res.ok) { clear(); setSaveMsg("Removed"); setSaveState("ok"); }
      else { setSaveMsg(res.error ?? "Remove failed"); setSaveState("err"); }
    });
  }

  function handleInherit(source: { comp: string; kitType: KitTypeId }) {
    startTransition(async () => {
      const res = await inheritStyling(teamId, { comp: compId, kitType: kit.kit_type }, source);
      if (res.ok) {
        setSaveMsg("Styling inherited");
        setSaveState("ok");
        // Reload so the editor picks up the copied geometry/colours/fonts/glyphs.
        router.refresh();
      } else { setSaveMsg(res.error ?? "Inherit failed"); setSaveState("err"); }
    });
  }

  function triggerGlyphUpload(digit: string) {
    pendingDigit.current = digit;
    glyphInputRef.current?.click();
  }

  async function handleGlyphFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const digit = pendingDigit.current;
    if (!file || digit === null) return;
    setGlyphUploading(digit);
    try {
      const { w, h } = await readImageSize(file);
      const fd = new FormData();
      fd.append("teamId", teamId); fd.append("competitionId", compId);
      fd.append("kitType", kit.kit_type);
      fd.append("digit", digit); fd.append("file", file);
      fd.append("width", String(w)); fd.append("height", String(h));
      const res = await uploadGlyph(fd);
      if (res.ok && res.url) setGlyphs(g => ({ ...g, [digit]: { url: res.url!, w, h } }));
      else { setSaveMsg(res.error ?? "Glyph upload failed"); setSaveState("err"); }
    } catch {
      setSaveMsg("Could not read image"); setSaveState("err");
    }
    setGlyphUploading(null);
    e.target.value = "";
  }

  function triggerBulkGlyphUpload() {
    bulkGlyphInputRef.current?.click();
  }

  /** A file's digit is read from its name — "0.svg", "digit-7.svg", "7 (final).svg"
      all resolve to "7". Only a name with no recognisable single digit is skipped;
      everything else is sorted into place without asking which file is which. */
  function digitFromFilename(name: string): string | null {
    const base = name.replace(/\.[^.]+$/, "").trim();
    if (/^\d$/.test(base)) return base;
    const standalone = base.match(/(?:^|[^a-zA-Z0-9])(\d)(?:[^a-zA-Z0-9]|$)/);
    if (standalone) return standalone[1];
    const anyDigit = base.match(/(\d)/);
    return anyDigit ? anyDigit[1] : null;
  }

  async function handleBulkGlyphFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBulkGlyphBusy(true);
    const skipped: string[] = [];
    for (const file of files) {
      const digit = digitFromFilename(file.name);
      if (!digit) { skipped.push(file.name); continue; }
      setGlyphUploading(digit);
      try {
        const { w, h } = await readImageSize(file);
        const fd = new FormData();
        fd.append("teamId", teamId); fd.append("competitionId", compId);
        fd.append("kitType", kit.kit_type);
        fd.append("digit", digit); fd.append("file", file);
        fd.append("width", String(w)); fd.append("height", String(h));
        const res = await uploadGlyph(fd);
        if (res.ok && res.url) setGlyphs(g => ({ ...g, [digit]: { url: res.url!, w, h } }));
        else skipped.push(`${file.name} (${res.error ?? "upload failed"})`);
      } catch {
        skipped.push(`${file.name} (couldn't read)`);
      }
    }
    setGlyphUploading(null);
    setBulkGlyphBusy(false);
    if (skipped.length) {
      setSaveMsg(`Uploaded, but couldn't tell which digit for: ${skipped.join(", ")}`);
      setSaveState("err");
    } else {
      setSaveMsg(`${files.length} digit${files.length === 1 ? "" : "s"} uploaded`);
      setSaveState("ok");
    }
    e.target.value = "";
  }

  async function handleNumberModeChange(mode: "font" | "svg_glyphs") {
    setNumberModeState(mode);
    // "default" (leave artwork untinted) only makes sense in glyph mode — a plain
    // <text> fill can't be "default", so fall back to a real colour when leaving it.
    if (mode === "font" && colors.number_fill === "default") {
      setColor("number_fill", computeDefaultFill(team, isUCL));
    }
    startTransition(async () => { await setNumberMode(teamId, compId, mode, kit.kit_type); });
  }

  return (
    <div className="adm-kit">
      <div className="adm-kit__head">
        <div className="adm-kit__title">
          <h1>{team.name}</h1>
          <span className="adm-kit__comp">{comp.label} · {KIT_TYPE_LABEL[kit.kit_type]}</span>
        </div>
        <div className="adm-kit__status">
          {status.missing.length === 0
            ? <span className="adm-pill is-good">Complete</span>
            : status.missing.map(m => <span key={m} className="adm-pill is-warn">{m}</span>)}
        </div>
        <div className="adm-kit__actions">
          <button className={`adm-pub${published ? " is-pub" : ""}`}
            disabled={isPending} onClick={() => handlePublish(!published)}
            title={published ? "Live on the storefront — click to unpublish" : "Not visible on the storefront — click to publish"}>
            {published
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12 4 4 10-10" /></svg>
              : <span className="adm-dot" />}
            {published ? "Live — Unpublish" : "Draft — Publish"}
          </button>
          <button className={`adm-save${saveState === "ok" ? " is-ok" : saveState === "err" ? " is-err" : ""}`}
            disabled={isPending} onClick={handleSave}>
            {isPending ? "Saving…" : saveState === "ok" ? "✓ Saved" : "Save"}
          </button>
        </div>
      </div>

      {saveMsg && (
        <div className={`adm-toast${saveState === "err" ? " is-err" : ""}`}>{saveMsg}</div>
      )}

      {siblings.length > 0 && (
        <div className="adm-inherit">
          <span className="adm-inherit__label">Inherit lettering styling from</span>
          {siblings.map((s) => (
            <button key={`${s.comp}:${s.kitType}`} className="adm-inherit__btn" disabled={isPending}
              onClick={() => handleInherit({ comp: s.comp, kitType: s.kitType })}>
              {s.label}
            </button>
          ))}
          <span className="adm-inherit__hint">colours, geometry, fonts &amp; glyphs — override anything after</span>
        </div>
      )}

      <nav className="adm-kit__tabs">
        <button className={`adm-kit__tab${tab === "content" ? " is-on" : ""}`} onClick={() => setTab("content")}>Photos &amp; Patches</button>
        <button className={`adm-kit__tab${tab === "lettering" ? " is-on" : ""}`} onClick={() => setTab("lettering")}>Lettering</button>
        <button className={`adm-kit__tab${tab === "glyphs" ? " is-on" : ""}${numberMode === "font" ? " is-dim" : ""}`} onClick={() => setTab("glyphs")}>Glyphs</button>
        {sleeveKit && (
          <button className={`adm-kit__tab${tab === "sleeve" ? " is-on" : ""}`} onClick={() => setTab("sleeve")}>Sleeve</button>
        )}
      </nav>

      <div className="adm-body">
        <div className="adm-left">
          <div className="adm-row adm-preview-text">
            <input className="adm-input adm-input--name" value={testName} placeholder="Name"
              maxLength={14} onChange={e => setTestName(e.target.value.slice(0, 14))} />
            <input className="adm-input adm-input--num" value={testNumber} placeholder="10"
              maxLength={2} inputMode="numeric"
              onChange={e => setTestNumber(e.target.value.replace(/\D/g, "").slice(0, 2))} />
          </div>
          <div className="adm-preview">
            <JerseyPreview
              photoUrl={backPhotoUrl} geo={geo} colors={colors}
              sleeveKit={sleeveKit} testName={testName} testNumber={testNumber}
              fontFamily={fontFamily} numFontFamily={numFontFamily}
              nameWeight={comp.name_weight ?? 600} numberWeight={comp.number_weight ?? 700}
              tracking={`${geo.name_tracking}em`}
              numberMode={numberMode} glyphs={glyphs}
            />
          </div>
        </div>

        <aside className="adm-panel">
          {tab === "content" && (
            <div className="adm-section">
              <div className="adm-section__hd">Photos &amp; patches</div>
              <div className="adm-font-slot">
                <span className="adm-font-slot__label">Back photo</span>
                <span className="adm-font-current">{backPhotoUrl ? "uploaded" : "none"}</span>
                <button className={`adm-upload-btn${backPhotoState === "uploading" ? " is-busy" : backPhotoState === "ok" ? " is-ok" : ""}`}
                  disabled={backPhotoState === "uploading"} onClick={() => backPhotoInputRef.current?.click()}>
                  {backPhotoState === "uploading" ? "…" : backPhotoState === "ok" ? "✓" : backPhotoUrl ? "Replace" : "Upload"}
                </button>
                {backPhotoUrl && (
                  <button className="adm-remove-btn" title="Remove back photo" disabled={isPending}
                    onClick={() => handleRemove("back", () => { setBackPhotoUrl(null); setBackPhotoState("idle"); })}>✕</button>
                )}
              </div>
              <div className="adm-font-slot">
                <span className="adm-font-slot__label">Front photo</span>
                <span className="adm-font-current">{frontPhotoUrl ? "uploaded" : "none"}</span>
                <button className={`adm-upload-btn${frontPhotoState === "uploading" ? " is-busy" : frontPhotoState === "ok" ? " is-ok" : ""}`}
                  disabled={frontPhotoState === "uploading"} onClick={() => frontPhotoInputRef.current?.click()}>
                  {frontPhotoState === "uploading" ? "…" : frontPhotoState === "ok" ? "✓" : frontPhotoUrl ? "Replace" : "Upload"}
                </button>
                {frontPhotoUrl && (
                  <button className="adm-remove-btn" title="Remove front photo" disabled={isPending}
                    onClick={() => handleRemove("front", () => { setFrontPhotoUrl(null); setFrontPhotoState("idle"); })}>✕</button>
                )}
              </div>
              <div className="adm-font-slot">
                <span className="adm-font-slot__label">Panel patch</span>
                <span className="adm-font-current">{panelPatchUrl ? "uploaded" : "none"}</span>
                <button className={`adm-upload-btn${panelPatchState === "uploading" ? " is-busy" : panelPatchState === "ok" ? " is-ok" : ""}`}
                  disabled={panelPatchState === "uploading"} onClick={() => panelPatchInputRef.current?.click()}>
                  {panelPatchState === "uploading" ? "…" : panelPatchState === "ok" ? "✓" : panelPatchUrl ? "Replace" : "Upload"}
                </button>
                {panelPatchUrl && (
                  <button className="adm-remove-btn" title="Remove panel patch" disabled={isPending}
                    onClick={() => handleRemove("panel", () => { setPanelPatchUrl(null); setPanelPatchState("idle"); })}>✕</button>
                )}
              </div>
              <div className="adm-font-slot">
                <span className="adm-font-slot__label">Sleeve patch</span>
                <span className="adm-font-current">{sleevePatch ? "uploaded" : "none"}</span>
                <button className={`adm-upload-btn${sleevePatchState === "uploading" ? " is-busy" : sleevePatchState === "ok" ? " is-ok" : ""}`}
                  disabled={sleevePatchState === "uploading"} onClick={() => sleevePatchInputRef.current?.click()}>
                  {sleevePatchState === "uploading" ? "…" : sleevePatchState === "ok" ? "✓" : sleevePatch ? "Replace" : "Upload"}
                </button>
                {sleevePatch && (
                  <button className="adm-remove-btn" title="Remove sleeve patch" disabled={isPending}
                    onClick={() => handleRemove("sleeve", () => { setSleevePatch(null); setSleevePatchState("idle"); })}>✕</button>
                )}
              </div>
              <p className="adm-hint">Back/front are the shirt stills. Panel patch shows in the competition selector. Sleeve patch geometry is calibrated in the Sleeve tab once uploaded.</p>
              <input ref={backPhotoInputRef}   type="file" accept="image/*" className="adm-file-input" onChange={e => handlePhotoFile("back", e)} />
              <input ref={frontPhotoInputRef}  type="file" accept="image/*" className="adm-file-input" onChange={e => handlePhotoFile("front", e)} />
              <input ref={panelPatchInputRef}  type="file" accept="image/*" className="adm-file-input" onChange={handlePanelPatchFile} />
              <input ref={sleevePatchInputRef} type="file" accept="image/*" className="adm-file-input" onChange={handleSleevePatchFile} />
            </div>
          )}

          {tab === "content" && (
            <div className="adm-section">
              <div className="adm-section__hd">Gallery — additional photos</div>
              <p className="adm-hint">Extra angles beyond the front/back stills (detail shots, side, lifestyle). Shown on the storefront gallery in the order uploaded — shared across every competition of this kit, same as the front/back photos.</p>
              {galleryUrls.length > 0 && (
                <div className="adm-gallery-grid">
                  {galleryUrls.map((url) => (
                    <div key={url} className="adm-gallery-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" />
                      <button className="adm-remove-btn" title="Remove photo" disabled={isPending}
                        onClick={() => handleRemoveGalleryImage(url)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button className={`adm-upload-btn${galleryState === "uploading" ? " is-busy" : galleryState === "ok" ? " is-ok" : ""}`}
                disabled={galleryState === "uploading"} onClick={() => galleryInputRef.current?.click()}>
                {galleryState === "uploading" ? "Uploading…" : "+ Add photo"}
              </button>
              <input ref={galleryInputRef} type="file" accept="image/*" className="adm-file-input" onChange={handleGalleryFile} />
            </div>
          )}

          {tab === "lettering" && (
            <>
              <div className="adm-section">
                <div className="adm-section__hd">Lettering font</div>
                <div className="adm-font-slot">
                  <span className="adm-font-slot__label">Name</span>
                  <span className="adm-font-current">
                    {customFont ? (kit.font_name_url?.split("/").pop() ?? "custom") : "default"}
                  </span>
                  <button className={`adm-upload-btn${fontState === "uploading" ? " is-busy" : fontState === "ok" ? " is-ok" : ""}`}
                    disabled={fontState === "uploading"} onClick={() => fontInputRef.current?.click()}>
                    {fontState === "uploading" ? "…" : fontState === "ok" ? "✓" : customFont ? "Replace" : "Upload"}
                  </button>
                  {customFont && (
                    <button className="adm-remove-btn" title="Remove name font" disabled={isPending}
                      onClick={() => handleRemove("name-font", () => { setCustomFont(null); setFontState("idle"); })}>✕</button>
                  )}
                </div>
                <div className="adm-font-slot">
                  <span className="adm-font-slot__label">Number</span>
                  <span className="adm-font-current">
                    {customNumFont ? (kit.font_number_url?.split("/").pop() ?? "custom") : customFont ? "← name" : "default"}
                  </span>
                  <button className={`adm-upload-btn${numFontState === "uploading" ? " is-busy" : numFontState === "ok" ? " is-ok" : ""}`}
                    disabled={numFontState === "uploading"} onClick={() => numFontInputRef.current?.click()}>
                    {numFontState === "uploading" ? "…" : numFontState === "ok" ? "✓" : customNumFont ? "Replace" : "Upload"}
                  </button>
                  {customNumFont && (
                    <button className="adm-remove-btn" title="Remove number font" disabled={isPending}
                      onClick={() => handleRemove("number-font", () => { setCustomNumFont(null); setNumFontState("idle"); })}>✕</button>
                  )}
                </div>
                <input ref={fontInputRef}    type="file" accept=".otf,.ttf,.woff,.woff2" className="adm-file-input" onChange={handleFontFile} />
                <input ref={numFontInputRef} type="file" accept=".otf,.ttf,.woff,.woff2" className="adm-file-input" onChange={handleNumFontFile} />
              </div>

              <div className="adm-section">
                <div className="adm-section__hd">Colors</div>
                <div className="adm-color-group">
                  <div className="adm-color-group__label">Name</div>
                  <ColorRow label="Fill"   value={colors.name_fill}   onChange={v => setColor("name_fill", v)} />
                  <ColorRow label="Stroke" value={colors.name_stroke} onChange={v => setColor("name_stroke", v)} includeNone />
                </div>
                <div className="adm-color-group">
                  <div className="adm-color-group__label">Number</div>
                  <ColorRow label="Fill" value={colors.number_fill} onChange={v => setColor("number_fill", v)}
                    includeDefault={numberMode === "svg_glyphs"} revertValue={computeDefaultFill(team, isUCL)} />
                  <ColorRow label="Stroke" value={colors.number_stroke} onChange={v => setColor("number_stroke", v)} includeNone />
                </div>
              </div>

              <div className="adm-section">
                <div className="adm-section__hd">Name lettering</div>
                <Slider label="Vertical position" value={geo.name_cy}   min={0.10} max={0.60} step={0.001} onChange={v => setGeoField("name_cy", v)} />
                <Slider label="Arc width"         value={geo.name_span} min={0.10} max={0.90} step={0.001} onChange={v => setGeoField("name_span", v)} />
                <Slider label="Arc bend"          value={geo.name_arc}  min={-0.50} max={0.50} step={0.001} onChange={v => setGeoField("name_arc", v)} />
                <Slider label="Font size"         value={geo.name_size} min={0.02} max={0.15} step={0.001} onChange={v => setGeoField("name_size", v)} />
                <Slider label="Letter spacing"     value={geo.name_tracking} min={-0.02} max={0.15} step={0.001} onChange={v => setGeoField("name_tracking", v)} />
              </div>

              <div className="adm-section">
                <div className="adm-section__hd">Number</div>
                <div className="adm-mode-toggle">
                  <button className={`adm-mode-btn${numberMode === "font" ? " is-on" : ""}`} onClick={() => handleNumberModeChange("font")}>Font</button>
                  <button className={`adm-mode-btn${numberMode === "svg_glyphs" ? " is-on" : ""}`} onClick={() => handleNumberModeChange("svg_glyphs")}>SVG Glyphs</button>
                </div>
                <Slider label="Vertical position" value={geo.number_cy}   min={0.15} max={0.85} step={0.001} onChange={v => setGeoField("number_cy", v)} />
                <Slider label="Size"              value={geo.number_size} min={0.08} max={0.65} step={0.001} onChange={v => setGeoField("number_size", v)} />
                {numberMode === "svg_glyphs" && (
                  <Slider label="Digit spacing" value={geo.number_glyph_gap} min={-0.03} max={0.08} step={0.001} onChange={v => setGeoField("number_glyph_gap", v)} />
                )}
                {numberMode === "svg_glyphs" && (
                  <p className="adm-hint">Digit artwork lives in the Glyphs tab.</p>
                )}
              </div>
            </>
          )}

          {tab === "glyphs" && (
            <div className="adm-section">
              <div className="adm-section__hd">Digit glyphs (0–9)</div>
              {numberMode === "font" && (
                <p className="adm-hint">Inactive — switch Number to SVG Glyphs mode in the Lettering tab to use these.</p>
              )}
              <button className={`adm-upload-btn adm-upload-btn--wide${bulkGlyphBusy ? " is-busy" : ""}`}
                disabled={bulkGlyphBusy} onClick={triggerBulkGlyphUpload}>
                {bulkGlyphBusy ? "Uploading…" : "Upload all 10 at once"}
              </button>
              <p className="adm-hint">Select all ten files together — name them 0.svg…9.svg (or anything with the digit in the name) and each lands in the right slot automatically.</p>
              <div className="adm-glyph-grid">
                {Array.from({ length: 10 }, (_, i) => {
                  const d = String(i);
                  const glyph = glyphs[d];
                  const busy = glyphUploading === d;
                  return (
                    <button key={d} className={`adm-glyph-cell${glyph ? " has-glyph" : ""}${busy ? " is-busy" : ""}`}
                      title={glyph ? `Digit ${d} — click to replace` : `Upload digit ${d}`}
                      onClick={() => triggerGlyphUpload(d)}>
                      {busy ? <span className="adm-glyph-spinner" />
                        : glyph
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={glyph.url} alt={d} />
                          : <span className="adm-glyph-placeholder">{d}</span>}
                    </button>
                  );
                })}
              </div>
              <input ref={glyphInputRef} type="file" accept=".svg,image/svg+xml" className="adm-file-input" onChange={handleGlyphFile} />
              <input ref={bulkGlyphInputRef} type="file" accept=".svg,image/svg+xml" multiple className="adm-file-input" onChange={handleBulkGlyphFiles} />
            </div>
          )}

          {tab === "sleeve" && sleeveKit && (
            <div className="adm-section">
              <div className="adm-section__hd">Sleeve patch</div>
              <Slider label="X position" value={geo.sleeve_x} min={0.00} max={1.00} step={0.001} onChange={v => setGeoField("sleeve_x", v)} />
              <Slider label="Y position" value={geo.sleeve_y} min={0.00} max={1.00} step={0.001} onChange={v => setGeoField("sleeve_y", v)} />
              <Slider label="Width"      value={geo.sleeve_w} min={0.01} max={0.20} step={0.001} onChange={v => setGeoField("sleeve_w", v)} />
              <Slider label="Rotation"   value={geo.sleeve_rotation} min={-45} max={45} step={0.5} onChange={v => setGeoField("sleeve_rotation", v)} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
