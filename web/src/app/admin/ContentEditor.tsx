"use client";

import { useRef, useState } from "react";
import type { SiteContent, HeroContent, SplitContent, CraftContent, MarqueeContent, HighlightsContent, NewArrivalsContent } from "@/lib/site-content";
import { saveSiteContent, uploadSiteImage, uploadSiteVideo } from "./content-actions";

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

export function ContentEditor({ content }: { content: SiteContent }) {
  return (
    <div className="adm-content-editor">
      <HeroEditor initial={content.hero} />
      <SplitEditor initial={content.split} />
      <NewArrivalsEditor initial={content.newArrivals} />
      <HighlightsEditor initial={content.highlights} />
      <CraftEditor initial={content.craft} />
      <MarqueeEditor initial={content.marquee} />
    </div>
  );
}
