"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { useGSAP } from "@/lib/gsap";
import {
  formatPrice, sizeOrderFor, productTypeDef, KIT_TYPE_LABELS,
  type Product, type ProductType,
} from "@/lib/products";
import { personalizationFor } from "@/lib/personalization";
import { CUSTOMIZATION_FEE, patchImageFor, livePhotosFor, liveGalleryFor, PATCHES, type CompetitionId, type Competition, type Team, type PrintEntry, type KitTypeId } from "@/lib/catalog";
import { useCart } from "@/components/CartProvider";
import { PrintPreview } from "./PrintPreview";

type Mode = "player" | "custom";

/** Per-type buy-panel copy — what was hardcoded jersey JSX before. */
const META_COPY: Record<ProductType, Array<{ label: string; value: (p: Product) => string | null }>> = {
  jersey: [
    { label: "Condition", value: () => "Brand new, with tags" },
    { label: "Version", value: (p) => p.edition || null },
    { label: "Printing", value: (p) => (p.teamKind === "national" ? "Sold blank" : null) },
    { label: "Dispatch", value: () => "2–4 working days" },
  ],
  training: [
    { label: "Condition", value: () => "Brand new, with tags" },
    { label: "Version", value: (p) => p.edition || "Club training range" },
    { label: "Dispatch", value: () => "2–4 working days" },
  ],
  shorts: [
    { label: "Condition", value: () => "Brand new, with tags" },
    { label: "Version", value: (p) => p.edition || null },
    { label: "Dispatch", value: () => "2–4 working days" },
  ],
  socks: [
    { label: "Condition", value: () => "Brand new, with tags" },
    { label: "Dispatch", value: () => "2–4 working days" },
  ],
  tracksuit: [
    { label: "Condition", value: () => "Brand new, with tags" },
    { label: "Version", value: (p) => p.edition || null },
    { label: "Dispatch", value: () => "2–4 working days" },
  ],
  accessory: [
    { label: "Condition", value: () => "Brand new" },
    { label: "Dispatch", value: () => "2–4 working days" },
  ],
};

export function PdpClient({
  product, siblings, teams, competitions, printMap,
}: {
  product: Product;
  /** Same team + same product type, available — the PDP's variant toggle. */
  siblings: Product[];
  teams: Record<string, Team>;
  competitions: Record<string, Competition>;
  printMap: Partial<Record<string, PrintEntry>>;
}) {
  const isJersey = product.productType === "jersey";

  // The URL picks the initial variant; the toggle switches between siblings
  // (same-photo variants collapse to one grid card but stay buyable here).
  const [activeSlug, setActiveSlug] = useState(product.slug);
  const active = siblings.find((p) => p.slug === activeSlug) ?? product;
  const kitType = active.kitType;

  const team = active.teamSlug ? teams[active.teamSlug] : undefined;
  const roster = team?.roster ?? [];
  const personalization = personalizationFor(active, printMap);

  // An admin-uploaded photo overrides the catalog image immediately — jersey
  // kits only (the calibration pipeline has no concept of shorts or socks).
  const livePhotos = isJersey && kitType && active.teamSlug
    ? livePhotosFor(active.teamSlug, kitType as KitTypeId, printMap)
    : null;
  const frontImg = livePhotos?.front || active.images.front;
  const backImg = livePhotos?.back || active.images.back;

  const [view, setView] = useState<string>("front");
  const [size, setSize] = useState<string | null>(null);
  const [personalise, setPersonalise] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [competition, setCompetition] = useState<CompetitionId>(personalization?.competitions[0] ?? "ucl");
  const [mode, setMode] = useState<Mode>("player");
  const [player, setPlayer] = useState(0);
  const [name, setName] = useState(roster[0]?.name ?? "");
  const [number, setNumber] = useState(String(roster[0]?.number ?? ""));
  const [toast, setToast] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addItem, openDrawer } = useCart();

  const canPersonalise = !!personalization && !!team;
  const showPreview = personalise && canPersonalise;
  const comp = competitions[competition];
  const patchId = comp?.patch ?? competition;
  const patchMeta = PATCHES[patchId] ?? { label: comp?.label ?? competition, sleeve: "Right sleeve" };
  const patchImg = isJersey && kitType && active.teamSlug
    ? patchImageFor(active.teamSlug as never, competition, printMap, kitType as KitTypeId)
    : null;

  const sizeSet = sizeOrderFor(active);
  const availableSizes = useMemo(
    () => sizeSet.filter((s) => (active.sizes[s] ?? 0) > 0),
    [active, sizeSet],
  );
  const fee = personalise && (name || number) ? CUSTOMIZATION_FEE : 0;
  const total = active.price + fee;
  const typeLabel = productTypeDef(active.productType).label;

  function switchVariant(slug: string) {
    if (slug === activeSlug) return;
    setActiveSlug(slug);
    setSize(null);
    // Close the studio only if the new variant genuinely can't personalise
    // (no calibration for its kit type, or the product opted out).
    const next = siblings.find((p) => p.slug === slug);
    if (next && !personalizationFor(next, printMap)) {
      setPersonalise(false);
      setModalOpen(false);
      setView("front");
    }
  }

  useGSAP(() => {}, { scope: rootRef });

  function openStudio() {
    setPersonalise(true);
    setModalOpen(true);
    setView("back");
  }
  function closeStudio() {
    setModalOpen(false);
  }
  function removePersonalisation() {
    setPersonalise(false);
    setModalOpen(false);
    setView("front");
  }

  // Lock page scroll while the sheet is open, and let Escape close it — same
  // conventions as the cart drawer and side menu.
  useEffect(() => {
    if (!modalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeStudio(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prevOverflow; window.removeEventListener("keydown", onKey); };
  }, [modalOpen]);

  function selectPlayer(i: number) {
    setPlayer(i);
    setName(roster[i]?.name ?? "");
    setNumber(String(roster[i]?.number ?? ""));
  }

  function addToBag() {
    if (!size) {
      setToast("Select a size first");
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 2200);
      return;
    }
    const attrs = [
      { key: "Product", value: active.name },
      { key: "Type", value: typeLabel },
      ...(active.teamName ? [{ key: "Team", value: active.teamName }] : []),
      ...(kitType ? [{ key: "Kit Type", value: KIT_TYPE_LABELS[kitType] }] : []),
      ...(active.season ? [{ key: "Season", value: active.season }] : []),
      { key: "Size", value: size },
      { key: "_Image", value: frontImg },
      ...(personalise && (name || number) ? [
        { key: "Competition", value: comp?.label ?? "" },
        { key: "Patch", value: patchMeta.label },
        { key: "Name", value: name },
        { key: "Number", value: number },
        { key: "Personalisation", value: `Yes (+${formatPrice(CUSTOMIZATION_FEE)})` },
      ] : []),
    ];
    void addItem(attrs);
    setToast(`${active.teamName || active.name} · ${size} added`);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
    setTimeout(() => openDrawer(), 420);
  }

  const galleryImg = view === "back" && backImg ? backImg : frontImg;
  const hasLivePhoto = !!(livePhotos?.front || livePhotos?.back);

  // Extra photos: admin kit-gallery uploads (jerseys) or the product's own gallery.
  const galleryPhotos = isJersey && kitType && active.teamSlug
    ? liveGalleryFor(active.teamSlug, kitType as KitTypeId, printMap)
    : (active.gallery ?? []);
  const activeGalleryPhoto = galleryPhotos.find((_, i) => view === `gallery-${i}`);

  const metaRows = (META_COPY[active.productType] ?? META_COPY.jersey)
    .map((row) => ({ label: row.label, value: row.value(active) }))
    .filter((row): row is { label: string; value: string } => !!row.value);

  const subLine = [kitType ? KIT_TYPE_LABELS[kitType] : typeLabel, active.season, active.edition]
    .filter(Boolean).join(" · ");

  return (
    <div ref={rootRef}>
      <div className="pdp2 wrap">
        {/* ── Gallery / live preview ── */}
        <section className="gallery" aria-label="Product imagery">
          <div className="gallery__main">
            {showPreview && view === "back" && kitType ? (
              <div className="preview" style={{ width: "100%", border: "none", background: "transparent" }}>
                <PrintPreview
                  teamSlug={active.teamSlug} competition={competition} kitType={kitType as KitTypeId}
                  name={name} number={number}
                  teams={teams} competitions={competitions} printMap={printMap}
                />
              </div>
            ) : activeGalleryPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeGalleryPhoto} alt={`${active.teamName} ${active.name}, additional view`} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={galleryImg} alt={`${active.teamName} ${active.name}, ${view} view`} />
            )}
          </div>
          <div className="gallery__thumbs">
            <button className={`gallery__thumb${view === "front" ? " is-on" : ""}`} onClick={() => setView("front")} aria-label="Front view">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={frontImg} alt="" />
            </button>
            {(backImg || showPreview) && (
              <button className={`gallery__thumb${view === "back" ? " is-on" : ""}`} onClick={() => setView("back")} aria-label="Back view">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={backImg ?? frontImg} alt="" />
              </button>
            )}
            {galleryPhotos.map((src, i) => {
              const key = `gallery-${i}`;
              return (
                <button key={key} className={`gallery__thumb${view === key ? " is-on" : ""}`} onClick={() => setView(key)} aria-label={`Additional view ${i + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" />
                </button>
              );
            })}
          </div>
          {isJersey && !hasLivePhoto && active.images.source !== "studio" && (
            <p className="gallery__source">Reference imagery — studio photography coming</p>
          )}
        </section>

        {/* ── Buy panel ── */}
        <section className="buy" aria-label="Purchase">
          <nav className="buy__crumbs">
            <a href="/shop">Shop</a><span>/</span>
            <a href={`/shop?kind=${active.teamKind}`}>{active.teamKind === "club" ? "Clubs" : "National"}</a>
          </nav>

          <div>
            <h1 className="buy__title">{active.teamName || active.name}</h1>
            <div className="buy__sub" style={{ marginTop: 10 }}>
              {active.badge && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={active.badge} alt="" aria-hidden="true" />
              )}
              {active.teamName ? `${active.name} · ${subLine}` : subLine}
            </div>
          </div>

          <div className="buy__price">
            {formatPrice(total)}
            {fee > 0 && <small>includes {formatPrice(CUSTOMIZATION_FEE)} personalisation</small>}
          </div>

          {isJersey && siblings.length > 1 && (
            <div className="buy__block">
              <div className="buy__label"><span>Kit</span></div>
              <div className="studio__seg" role="group" aria-label="Kit type">
                {siblings.map((p) => (
                  <button key={p.slug} className={p.slug === active.slug ? "is-on" : ""} onClick={() => switchVariant(p.slug)}>
                    {p.kitType ? KIT_TYPE_LABELS[p.kitType] : p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="buy__block">
            <div className="buy__label"><span>Size</span>{isJersey && <span>Player fit</span>}</div>
            <div className="sizechips">
              {sizeSet.map((s) => (
                <button key={s} className={`sizechip${size === s ? " is-on" : ""}`}
                  disabled={(active.sizes[s] ?? 0) <= 0}
                  onClick={() => setSize(s)}>
                  {s}
                </button>
              ))}
            </div>
            {size && (active.sizes[size] ?? 0) > 0 && (active.sizes[size] ?? 0) <= 2 && (
              <span className="microlabel">Only {active.sizes[size]} left in {size}</span>
            )}
            {!size && availableSizes.length > 0 && availableSizes.length <= 2 && (
              <span className="microlabel">Limited stock — {availableSizes.join(" · ")} remaining</span>
            )}
          </div>

          {canPersonalise && (
            <button className="studio__toggle" onClick={openStudio} aria-haspopup="dialog" aria-expanded={modalOpen}>
              <span className="studio__toggle-text">
                <span className="studio__toggle-label">
                  Personalise
                  <span className="fee">+{formatPrice(CUSTOMIZATION_FEE)}</span>
                </span>
                {fee > 0 && (
                  <span className="studio__toggle-sub">{name || "Blank"}{number ? ` · ${number}` : ""}</span>
                )}
              </span>
              <ChevronRight size={16} strokeWidth={1.6} />
            </button>
          )}

          <button className="btn" style={{ justifyContent: "center" }} onClick={addToBag}>
            Add to Bag — {formatPrice(total)}
          </button>

          <div className="buy__meta">
            {metaRows.map((row) => (
              <div className="buy__meta-row" key={row.label}><span>{row.label}</span><b>{row.value}</b></div>
            ))}
          </div>

          <ul className="buy__assure">
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z" /></svg>
              Officially licensed authentic
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" /><path d="m9 12 2 2 4-4" /></svg>
              Complimentary returns
            </li>
          </ul>
        </section>
      </div>

      {canPersonalise && (
        <>
          <div className={`pmodalveil${modalOpen ? " is-open" : ""}`} onClick={closeStudio} aria-hidden="true" />
          <aside className={`pmodal${modalOpen ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Personalise your jersey">
            <div className="pmodal__handle" aria-hidden="true" />
            <div className="pmodal__head">
              <h2>Personalise <span className="fee">+{formatPrice(CUSTOMIZATION_FEE)}</span></h2>
              <button className="pmodal__close" onClick={closeStudio} aria-label="Close personalise">
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="pmodal__body">
              {kitType && active.teamSlug && (
                <div className="preview">
                  <PrintPreview
                    teamSlug={active.teamSlug} competition={competition} kitType={kitType as KitTypeId}
                    name={name} number={number}
                    teams={teams} competitions={competitions} printMap={printMap}
                  />
                </div>
              )}

              {personalization!.competitions.length > 1 && (
                <div className="studio__seg" role="group" aria-label="Competition">
                  {personalization!.competitions.map((c) => (
                    <button key={c} className={c === competition ? "is-on" : ""} onClick={() => setCompetition(c)}>
                      {competitions[c]?.label ?? c}
                    </button>
                  ))}
                </div>
              )}

              <div className="studio__seg" role="group" aria-label="Personalisation mode">
                <button className={mode === "player" ? "is-on" : ""} onClick={() => { setMode("player"); selectPlayer(player); }}>Squad Player</button>
                <button className={mode === "custom" ? "is-on" : ""} onClick={() => { setMode("custom"); setName(""); setNumber(""); }}>Your Name</button>
              </div>

              {mode === "player" ? (
                <div className="studio__players">
                  {roster.map((p, i) => (
                    <button key={p.name} className={`studio__player${i === player ? " is-on" : ""}`} onClick={() => selectPlayer(i)}>
                      <span>{p.name}</span>
                      <span className="num">{p.number}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="studio__fields">
                  <div className="studio__field">
                    <label htmlFor="p-name">Name</label>
                    <input id="p-name" type="text" maxLength={14} autoComplete="off" placeholder="Player Name"
                      value={name} onChange={(e) => setName(e.target.value.slice(0, 14))} />
                  </div>
                  <div className="studio__field">
                    <label htmlFor="p-num">No.</label>
                    <input id="p-num" type="text" inputMode="numeric" maxLength={2} autoComplete="off" placeholder="00"
                      value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 2))} />
                  </div>
                </div>
              )}

              <div className="studio__patch">
                {patchImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={patchImg} alt={`${patchMeta.label} patch`} />
                ) : null}
                <div>
                  <div className="studio__patch-title">{patchMeta.label} patch</div>
                  <div className="studio__patch-sub">{patchMeta.sleeve} · lettering in the official {comp?.label} typeface</div>
                </div>
              </div>
            </div>

            <div className="pmodal__foot">
              <button className="pmodal__remove" onClick={removePersonalisation}>Remove personalisation</button>
              <button className="btn" style={{ justifyContent: "center" }} onClick={closeStudio}>Confirm</button>
            </div>
          </aside>
        </>
      )}

      <div className={`toastx${toast ? " is-show" : ""}`} role="status" aria-live="polite">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4 10-10" /></svg>
        <span>{toast ?? ""}</span>
      </div>
    </div>
  );
}
