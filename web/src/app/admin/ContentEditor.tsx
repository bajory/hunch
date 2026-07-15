"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteContent, HeroContent, PicksContent, SplitContent, CraftContent, MarqueeContent, HighlightsContent, NewArrivalsContent, TypographyContent } from "@/lib/site-content";
import { SERIF_FONTS, SANS_FONTS } from "@/lib/fonts";
import { saveSiteContent, uploadSiteImage, uploadSiteVideo, uploadSiteFont } from "./content-actions";

/** Injects (or replaces) an @font-face rule client-side, purely so the admin
    preview below can render an uploaded custom font before it's even saved. */
function injectPreviewFontFace(id: string, url: string) {
  let el = document.getElementById(`preview-face-${id}`);
  if (!el) { el = document.createElement("style"); el.id = `preview-face-${id}`; document.head.appendChild(el); }
  el.textContent = `@font-face{font-family:'${id}';src:url('${url}');font-display:swap;}`;
}

type SaveState = "idle" | "saving" | "ok" | "err";

function ImageField({ label, value, onChange, section, field }: {
  label: string; value: string; onChange: (url: string) => void;
  section: keyof SiteContent; field: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setErr(null);
    const fd = new FormData();
    fd.append("section", section); fd.append("field", field); fd.append("file", file);
    const res = await uploadSiteImage(fd);
    if (res.ok && res.url) onChange(res.url);
    else setErr(res.error ?? "Upload failed");
    setBusy(false);
    e.target.value = "";
  }

  return (
    <div className="adm-content-img">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {value ? <img src={value} alt="" className="adm-content-img__preview" /> : <div className="adm-content-img__preview is-empty" />}
      <div className="adm-content-img__body">
        <span className="adm-font-slot__label">{label}</span>
        <button type="button" className={`adm-upload-btn${busy ? " is-busy" : ""}`} disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : "Replace image"}
        </button>
        {err && <span className="adm-content-img__err">{err}</span>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="adm-file-input" onChange={handleFile} />
    </div>
  );
}

function VideoField({ label, value, onChange, onRemove, section, field }: {
  label: string; value: string | undefined; onChange: (url: string) => void; onRemove: () => void;
  section: keyof SiteContent; field: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setErr(null);
    const fd = new FormData();
    fd.append("section", section); fd.append("field", field); fd.append("file", file);
    const res = await uploadSiteVideo(fd);
    if (res.ok && res.url) onChange(res.url);
    else setErr(res.error ?? "Upload failed");
    setBusy(false);
    e.target.value = "";
  }

  return (
    <div className="adm-content-img">
      {value
        ? <video src={value} muted loop autoPlay playsInline className="adm-content-img__preview" />
        : <div className="adm-content-img__preview is-empty" />}
      <div className="adm-content-img__body">
        <span className="adm-font-slot__label">{label}</span>
        <button type="button" className={`adm-upload-btn${busy ? " is-busy" : ""}`} disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : value ? "Replace video" : "Upload video"}
        </button>
        {value && <button type="button" className="adm-remove-btn" title="Remove video — falls back to the image" onClick={onRemove}>✕</button>}
        {err && <span className="adm-content-img__err">{err}</span>}
      </div>
      <input ref={inputRef} type="file" accept="video/*" className="adm-file-input" onChange={handleFile} />
    </div>
  );
}

function SaveButton({ state, onClick }: { state: SaveState; onClick: () => void }) {
  return (
    <button type="button" className={`adm-save${state === "ok" ? " is-ok" : state === "err" ? " is-err" : ""}`}
      disabled={state === "saving"} onClick={onClick}>
      {state === "saving" ? "Saving…" : state === "ok" ? "✓ Saved" : "Save"}
    </button>
  );
}

const BLANK_SLIDE: HeroContent["slides"][number] = {
  image: "", alt: "", kicker: "", title: "New slide", sub: "",
};

function HeroEditor({ initial }: { initial: HeroContent }) {
  const [v, setV] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  async function save() {
    setState("saving");
    const res = await saveSiteContent("hero", v);
    setState(res.ok ? "ok" : "err");
  }
  function setSlide(i: number, patch: Partial<HeroContent["slides"][number]>) {
    const slides = [...v.slides];
    slides[i] = { ...slides[i], ...patch };
    setV({ slides });
  }
  function addSlide() {
    setV({ slides: [...v.slides, { ...BLANK_SLIDE }] });
  }
  function removeSlide(i: number) {
    setV({ slides: v.slides.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="adm-section">
      <div className="adm-section__hd">Hero — rotating banner</div>
      <p className="adm-hint">Slides auto-rotate every ~6.5s on the homepage. One slide means no rotation.</p>
      {v.slides.map((s, i) => (
        <div key={i} className="adm-content-block">
          <div className="adm-content-block__hd">
            <span className="adm-font-slot__label">Slide {i + 1}</span>
            {v.slides.length > 1 && (
              <button type="button" className="adm-remove-btn" title="Remove slide" onClick={() => removeSlide(i)}>✕</button>
            )}
          </div>
          <ImageField label="Background image (poster frame if a video is set)" value={s.image} field={`slide-${i}-image`} section="hero"
            onChange={(image) => setSlide(i, { image })} />
          <VideoField label="Background video (optional — overrides the image when set)" value={s.video} field={`slide-${i}-video`} section="hero"
            onChange={(video) => setSlide(i, { video })} onRemove={() => setSlide(i, { video: undefined })} />
          <label className="adm-content-label">Image alt text
            <input className="adm-input adm-input--block" value={s.alt} onChange={(e) => setSlide(i, { alt: e.target.value })} />
          </label>
          <label className="adm-content-label">Kicker
            <input className="adm-input adm-input--block" value={s.kicker} onChange={(e) => setSlide(i, { kicker: e.target.value })} />
          </label>
          <label className="adm-content-label">Title
            <input className="adm-input adm-input--block" value={s.title} onChange={(e) => setSlide(i, { title: e.target.value })} />
          </label>
          <label className="adm-content-label">Subcopy
            <textarea className="adm-input adm-input--block adm-textarea" rows={3} value={s.sub} onChange={(e) => setSlide(i, { sub: e.target.value })} />
          </label>
        </div>
      ))}
      <button type="button" className="adm-upload-btn" onClick={addSlide}>+ Add slide</button>
      <div style={{ marginTop: 12 }}>
        <SaveButton state={state} onClick={save} />
      </div>
    </div>
  );
}

function SplitEditor({ initial }: { initial: SplitContent }) {
  const [v, setV] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  async function save() {
    setState("saving");
    const res = await saveSiteContent("split", v);
    setState(res.ok ? "ok" : "err");
  }
  function setPanel(i: 0 | 1, patch: Partial<SplitContent["panels"][number]>) {
    const panels = [...v.panels] as SplitContent["panels"];
    panels[i] = { ...panels[i], ...patch };
    setV({ panels });
  }
  return (
    <div className="adm-section">
      <div className="adm-section__hd">Split panels — &ldquo;The Clubs&rdquo; / &ldquo;The Nations&rdquo;</div>
      {v.panels.map((p, i) => (
        <div key={i} className="adm-content-block">
          <ImageField label={`Panel ${i + 1} image`} value={p.image} field={`panel-${i}-image`} section="split"
            onChange={(image) => setPanel(i as 0 | 1, { image })} />
          <label className="adm-content-label">Image alt text
            <input className="adm-input adm-input--block" value={p.alt} onChange={(e) => setPanel(i as 0 | 1, { alt: e.target.value })} />
          </label>
          <label className="adm-content-label">Kicker
            <input className="adm-input adm-input--block" value={p.kicker} onChange={(e) => setPanel(i as 0 | 1, { kicker: e.target.value })} />
          </label>
          <label className="adm-content-label">Title
            <input className="adm-input adm-input--block" value={p.title} onChange={(e) => setPanel(i as 0 | 1, { title: e.target.value })} />
          </label>
          <label className="adm-content-label">Subcopy
            <textarea className="adm-input adm-input--block adm-textarea" rows={2} value={p.sub} onChange={(e) => setPanel(i as 0 | 1, { sub: e.target.value })} />
          </label>
        </div>
      ))}
      <SaveButton state={state} onClick={save} />
    </div>
  );
}

function CraftEditor({ initial }: { initial: CraftContent }) {
  const [v, setV] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  async function save() {
    setState("saving");
    const res = await saveSiteContent("craft", v);
    setState(res.ok ? "ok" : "err");
  }
  function setPoint(i: number, patch: Partial<CraftContent["points"][number]>) {
    const points = [...v.points];
    points[i] = { ...points[i], ...patch };
    setV({ ...v, points });
  }
  function setStat(i: number, patch: Partial<CraftContent["stats"][number]>) {
    const stats = [...v.stats];
    stats[i] = { ...stats[i], ...patch };
    setV({ ...v, stats });
  }
  return (
    <div className="adm-section">
      <div className="adm-section__hd">Provenance band</div>
      <ImageField label="Detail photo" value={v.image} field="image" section="craft" onChange={(image) => setV({ ...v, image })} />
      <label className="adm-content-label">Image alt text
        <input className="adm-input adm-input--block" value={v.alt} onChange={(e) => setV({ ...v, alt: e.target.value })} />
      </label>
      <label className="adm-content-label">Caption
        <input className="adm-input adm-input--block" value={v.caption} onChange={(e) => setV({ ...v, caption: e.target.value })} />
      </label>
      <label className="adm-content-label">Lead paragraph
        <textarea className="adm-input adm-input--block adm-textarea" rows={3} value={v.lead} onChange={(e) => setV({ ...v, lead: e.target.value })} />
      </label>

      <p className="adm-hint">The three numbered points</p>
      {v.points.map((p, i) => (
        <div key={i} className="adm-content-block">
          <input className="adm-input adm-input--block" placeholder="Title" value={p.title} onChange={(e) => setPoint(i, { title: e.target.value })} />
          <textarea className="adm-input adm-input--block adm-textarea" rows={2} placeholder="Body" value={p.body} onChange={(e) => setPoint(i, { body: e.target.value })} />
        </div>
      ))}

      <p className="adm-hint">Stats (a 4th, &ldquo;Personalisation&rdquo;, is always the live fee and isn&rsquo;t editable here)</p>
      <div className="adm-content-stats">
        {v.stats.map((s, i) => (
          <div key={i} className="adm-row">
            <input className="adm-input adm-input--num" style={{ width: 72 }} placeholder="Value" value={s.value} onChange={(e) => setStat(i, { value: e.target.value })} />
            <input className="adm-input adm-input--name" placeholder="Label" value={s.label} onChange={(e) => setStat(i, { label: e.target.value })} />
          </div>
        ))}
      </div>
      <SaveButton state={state} onClick={save} />
    </div>
  );
}

function MarqueeEditor({ initial }: { initial: MarqueeContent }) {
  const [v, setV] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  async function save() {
    setState("saving");
    const res = await saveSiteContent("marquee", v);
    setState(res.ok ? "ok" : "err");
  }
  function setItem(i: number, value: string) {
    const items = [...v.items]; items[i] = value; setV({ items });
  }
  function removeItem(i: number) {
    setV({ items: v.items.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="adm-section">
      <div className="adm-section__hd">Marquee strip</div>
      {v.items.map((item, i) => (
        <div key={i} className="adm-row" style={{ marginBottom: 8 }}>
          <input className="adm-input adm-input--name" value={item} onChange={(e) => setItem(i, e.target.value)} />
          <button type="button" className="adm-remove-btn" onClick={() => removeItem(i)}>✕</button>
        </div>
      ))}
      <button type="button" className="adm-upload-btn" onClick={() => setV({ items: [...v.items, ""] })}>+ Add item</button>
      <div style={{ marginTop: 12 }}>
        <SaveButton state={state} onClick={save} />
      </div>
    </div>
  );
}

const BLANK_HIGHLIGHT: HighlightsContent["items"][number] = { image: "", title: "New story", href: "/shop" };

function HighlightsEditor({ initial }: { initial: HighlightsContent }) {
  const [v, setV] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  async function save() {
    setState("saving");
    const res = await saveSiteContent("highlights", v);
    setState(res.ok ? "ok" : "err");
  }
  function setItem(i: number, patch: Partial<HighlightsContent["items"][number]>) {
    const items = [...v.items];
    items[i] = { ...items[i], ...patch };
    setV({ items });
  }
  function removeItem(i: number) {
    setV({ items: v.items.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="adm-section">
      <div className="adm-section__hd">Highlights — &ldquo;Catch the highlights&rdquo;</div>
      <p className="adm-hint">Horizontally scrollable story cards on the homepage. Each can be a photo or a looping video.</p>
      {v.items.map((h, i) => (
        <div key={i} className="adm-content-block">
          <div className="adm-content-block__hd">
            <span className="adm-font-slot__label">Card {i + 1}</span>
            <button type="button" className="adm-remove-btn" title="Remove card" onClick={() => removeItem(i)}>✕</button>
          </div>
          <ImageField label="Image (poster frame if a video is set)" value={h.image} field={`item-${i}-image`} section="highlights"
            onChange={(image) => setItem(i, { image })} />
          <VideoField label="Video (optional — overrides the image when set)" value={h.video} field={`item-${i}-video`} section="highlights"
            onChange={(video) => setItem(i, { video })} onRemove={() => setItem(i, { video: undefined })} />
          <label className="adm-content-label">Title
            <input className="adm-input adm-input--block" value={h.title} onChange={(e) => setItem(i, { title: e.target.value })} />
          </label>
          <label className="adm-content-label">Link (where the card goes when clicked)
            <input className="adm-input adm-input--block" value={h.href} onChange={(e) => setItem(i, { href: e.target.value })} />
          </label>
        </div>
      ))}
      <button type="button" className="adm-upload-btn" onClick={() => setV({ items: [...v.items, { ...BLANK_HIGHLIGHT }] })}>+ Add card</button>
      <div style={{ marginTop: 12 }}>
        <SaveButton state={state} onClick={save} />
      </div>
    </div>
  );
}

const BLANK_ARRIVAL: NewArrivalsContent["items"][number] = { image: "", caption: "New", href: "/shop" };

function NewArrivalsEditor({ initial }: { initial: NewArrivalsContent }) {
  const [v, setV] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  async function save() {
    setState("saving");
    const res = await saveSiteContent("newArrivals", v);
    setState(res.ok ? "ok" : "err");
  }
  function setItem(i: number, patch: Partial<NewArrivalsContent["items"][number]>) {
    const items = [...v.items];
    items[i] = { ...items[i], ...patch };
    setV({ items });
  }
  function removeItem(i: number) {
    setV({ items: v.items.filter((_, idx) => idx !== i) });
  }
  return (
    <div className="adm-section">
      <div className="adm-section__hd">What&rsquo;s new at HUNCH — grid</div>
      <p className="adm-hint">Its own set of images, independent of the shop/PDP product photos — swap these freely without touching a team&rsquo;s catalog photo.</p>
      {v.items.map((it, i) => (
        <div key={i} className="adm-content-block">
          <div className="adm-content-block__hd">
            <span className="adm-font-slot__label">Tile {i + 1}</span>
            <button type="button" className="adm-remove-btn" title="Remove tile" onClick={() => removeItem(i)}>✕</button>
          </div>
          <ImageField label="Image" value={it.image} field={`item-${i}-image`} section="newArrivals"
            onChange={(image) => setItem(i, { image })} />
          <label className="adm-content-label">Caption
            <input className="adm-input adm-input--block" value={it.caption} onChange={(e) => setItem(i, { caption: e.target.value })} />
          </label>
          <label className="adm-content-label">Link (where the tile goes when clicked)
            <input className="adm-input adm-input--block" value={it.href} onChange={(e) => setItem(i, { href: e.target.value })} />
          </label>
        </div>
      ))}
      <button type="button" className="adm-upload-btn" onClick={() => setV({ items: [...v.items, { ...BLANK_ARRIVAL }] })}>+ Add tile</button>
      <div style={{ marginTop: 12 }}>
        <SaveButton state={state} onClick={save} />
      </div>
    </div>
  );
}

function PickTileFields({ label, tile, fieldPrefix, showCta, onChange }: {
  label: string; tile: PicksContent["hero"]; fieldPrefix: string; showCta?: boolean;
  onChange: (patch: Partial<PicksContent["hero"]>) => void;
}) {
  return (
    <div className="adm-content-block">
      <div className="adm-content-block__hd">
        <span className="adm-font-slot__label">{label}</span>
      </div>
      <ImageField label="Image" value={tile.image} field={`${fieldPrefix}-image`} section="picks"
        onChange={(image) => onChange({ image })} />
      <label className="adm-content-label">Title
        <input className="adm-input adm-input--block" value={tile.title} onChange={(e) => onChange({ title: e.target.value })} />
      </label>
      <label className="adm-content-label">Subtext
        <textarea className="adm-input adm-input--block adm-textarea" rows={2} value={tile.sub} onChange={(e) => onChange({ sub: e.target.value })} />
      </label>
      <label className="adm-content-label">Link (where the tile goes when clicked)
        <input className="adm-input adm-input--block" value={tile.href} onChange={(e) => onChange({ href: e.target.value })} />
      </label>
      {showCta && (
        <label className="adm-content-label">Button label
          <input className="adm-input adm-input--block" value={tile.cta ?? ""} onChange={(e) => onChange({ cta: e.target.value })} />
        </label>
      )}
    </div>
  );
}

function PicksEditor({ initial }: { initial: PicksContent }) {
  const [v, setV] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  async function save() {
    setState("saving");
    const res = await saveSiteContent("picks", v);
    setState(res.ok ? "ok" : "err");
  }
  return (
    <div className="adm-section">
      <div className="adm-section__hd">Featured Picks — &ldquo;World Cup / New Season / Retro&rdquo;</div>
      <p className="adm-hint">
        The three destination tiles right under the hero. Each links wherever you set it — a
        filtered shop view (e.g. <code>/shop?kitType=retro</code>) or a single product page — so
        Retro Picks can point at every retro kit across all teams instead of just one shirt.
      </p>
      <PickTileFields label="Hero tile — World Cup Picks" tile={v.hero} fieldPrefix="hero" showCta
        onChange={(patch) => setV({ ...v, hero: { ...v.hero, ...patch } })} />
      <PickTileFields label="New Season Drops" tile={v.season} fieldPrefix="season"
        onChange={(patch) => setV({ ...v, season: { ...v.season, ...patch } })} />
      <PickTileFields label="Retro Picks" tile={v.retro} fieldPrefix="retro"
        onChange={(patch) => setV({ ...v, retro: { ...v.retro, ...patch } })} />
      <div style={{ marginTop: 12 }}>
        <SaveButton state={state} onClick={save} />
      </div>
    </div>
  );
}

function CustomFontUpload({ slot, url, onChange, onRemove }: {
  slot: "serif" | "sans"; url: string | undefined;
  onChange: (url: string) => void; onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setErr(null);
    const fd = new FormData();
    fd.append("slot", slot); fd.append("file", file);
    const res = await uploadSiteFont(fd);
    if (res.ok && res.url) onChange(res.url);
    else setErr(res.error ?? "Upload failed");
    setBusy(false);
    e.target.value = "";
  }

  return (
    <div className="adm-customfont">
      <button type="button" className={`adm-upload-btn${busy ? " is-busy" : ""}`} disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? "Uploading…" : url ? "Replace uploaded font" : "Or upload your own font file"}
      </button>
      {url && <button type="button" className="adm-remove-btn" title="Remove — falls back to the preset above" onClick={onRemove}>✕</button>}
      {err && <span className="adm-content-img__err">{err}</span>}
      <input ref={inputRef} type="file" accept=".woff2,.woff,.ttf,.otf" className="adm-file-input" onChange={handleFile} />
    </div>
  );
}

function TypographyEditor({ initial }: { initial: TypographyContent }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const activeSerif = SERIF_FONTS.find((f) => f.id === v.serifId) ?? SERIF_FONTS[0];
  const activeSans = SANS_FONTS.find((f) => f.id === v.sansId) ?? SANS_FONTS[0];

  useEffect(() => {
    if (v.customSerifUrl) injectPreviewFontFace("adm-preview-serif", v.customSerifUrl);
  }, [v.customSerifUrl]);
  useEffect(() => {
    if (v.customSansUrl) injectPreviewFontFace("adm-preview-sans", v.customSansUrl);
  }, [v.customSansUrl]);

  async function save() {
    setState("saving");
    const res = await saveSiteContent("typography", v);
    setState(res.ok ? "ok" : "err");
    if (res.ok) router.refresh(); // re-renders the root layout's <style>, so this very page reflects the pick too
  }

  return (
    <div className="adm-section">
      <div className="adm-section__hd">Typography</div>
      <p className="adm-hint">Applies everywhere — the storefront and this admin dashboard share the same two fonts.</p>
      <div className="adm-editor__grid" style={{ marginBottom: 16 }}>
        <label className="adm-field">
          <span>Display / serif font</span>
          <select className="adm-select" value={v.serifId} onChange={(e) => setV({ ...v, serifId: e.target.value })}>
            {SERIF_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <CustomFontUpload slot="serif" url={v.customSerifUrl}
            onChange={(customSerifUrl) => setV({ ...v, customSerifUrl })}
            onRemove={() => setV({ ...v, customSerifUrl: undefined })} />
        </label>
        <label className="adm-field">
          <span>UI / body sans font</span>
          <select className="adm-select" value={v.sansId} onChange={(e) => setV({ ...v, sansId: e.target.value })}>
            {SANS_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <CustomFontUpload slot="sans" url={v.customSansUrl}
            onChange={(customSansUrl) => setV({ ...v, customSansUrl })}
            onRemove={() => setV({ ...v, customSansUrl: undefined })} />
        </label>
      </div>
      <div className="adm-type-preview">
        <p style={v.customSerifUrl ? { fontFamily: "'adm-preview-serif'" } : undefined}
          className={v.customSerifUrl ? undefined : activeSerif.className}>
          The shirt is the statement.
        </p>
        <p style={v.customSansUrl ? { fontFamily: "'adm-preview-sans'" } : undefined}
          className={v.customSansUrl ? undefined : activeSans.className}>
          Player-version jerseys, pressed to your name.
        </p>
      </div>
      <p className="adm-hint">Uploading your own font overrides the preset above (which stays as its fallback if the file fails to load). .woff2 is smallest/fastest; .woff, .ttf, and .otf also work.</p>
      <SaveButton state={state} onClick={save} />
    </div>
  );
}

export function ContentEditor({ content }: { content: SiteContent }) {
  return (
    <div className="adm-content-editor">
      <TypographyEditor initial={content.typography} />
      <HeroEditor initial={content.hero} />
      <PicksEditor initial={content.picks} />
      <SplitEditor initial={content.split} />
      <NewArrivalsEditor initial={content.newArrivals} />
      <HighlightsEditor initial={content.highlights} />
      <CraftEditor initial={content.craft} />
      <MarqueeEditor initial={content.marquee} />
    </div>
  );
}
