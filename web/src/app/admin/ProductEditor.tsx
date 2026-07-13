"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_TYPE_DEFS, productTypeDef, formatPrice } from "@/lib/products";
import { shopifyAdminProductUrl } from "@/lib/shopify";
import { KIT_TYPES, KIT_TYPE_LABEL, type AdminProductRow, type KitTypeId } from "./types";
import {
  createProduct, updateProduct, setProductPublished, archiveProduct, deleteProduct,
  uploadProductImage, removeProductImage, createInShopify,
} from "./products-actions";

interface TeamOption {
  id: string;
  name: string;
  team_kind: "club" | "national";
  league_id: string | null;
}

const BLANK: AdminProductRow = {
  slug: "", team_id: null, name: "", product_type: "jersey", kit_type: "home",
  season: "", edition: "", price: 0, status: "available", customizable: false,
  sizes: {}, images: {}, sort_order: 100, is_published: false,
  shopify_product_id: null, shopify_synced_at: null, shopify_sync_error: null,
};

type SaveState = "idle" | "saving" | "ok" | "err";

function ImageSlot({ label, url, busy, onUpload, onRemove }: {
  label: string; url?: string; busy: boolean;
  onUpload: (file: File) => void; onRemove?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="adm-content-img">
      {url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" className="adm-content-img__preview" />
        : <div className="adm-content-img__preview is-empty" />}
      <div className="adm-content-img__body">
        <span className="adm-font-slot__label">{label}</span>
        <button type="button" className={`adm-upload-btn${busy ? " is-busy" : ""}`} disabled={busy}
          onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : url ? "Replace" : "Upload"}
        </button>
        {url && onRemove && (
          <button type="button" className="adm-remove-btn" title={`Remove ${label.toLowerCase()}`} onClick={onRemove}>✕</button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="adm-file-input"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
    </div>
  );
}

export function ProductEditor({ mode, initial, teams }: {
  mode: "create" | "edit";
  initial?: AdminProductRow;
  teams: TeamOption[];
}) {
  const router = useRouter();
  const [row, setRow] = useState<AdminProductRow>(initial ?? BLANK);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isJersey = row.product_type === "jersey";
  const sizeSet = productTypeDef(row.product_type).sizeSet;
  const isSynced = mode === "edit" && Boolean(row.shopify_product_id);
  const shopifyUrl = shopifyAdminProductUrl(row.shopify_product_id);
  const team = teams.find((t) => t.id === row.team_id);
  // Kit Studio calibrates per competition — same mapping the Studio itself uses.
  const studioComp = team ? (team.team_kind === "national" ? "worldcup" : (team.league_id ?? "laliga")) : null;

  function set<K extends keyof AdminProductRow>(key: K, value: AdminProductRow[K]) {
    setRow((r) => ({ ...r, [key]: value }));
  }

  function payload() {
    return {
      name: row.name,
      team_id: row.team_id,
      product_type: row.product_type,
      kit_type: isJersey ? row.kit_type : null,
      season: row.season,
      edition: row.edition,
      price: row.price,
      status: row.status,
      customizable: isJersey ? row.customizable : false,
      sizes: row.sizes,
      sort_order: row.sort_order,
    };
  }

  async function save() {
    if (!row.name.trim()) { setMsg("Name is required"); setSaveState("err"); return; }
    setSaveState("saving"); setMsg(null);
    if (mode === "create") {
      if (!row.slug.trim()) { setMsg("Slug is required"); setSaveState("err"); return; }
      const res = await createProduct(row.slug.trim(), payload());
      // createProduct redirects on success — reaching here means it failed.
      if (res && !res.ok) { setMsg(res.error ?? "Create failed"); setSaveState("err"); }
      return;
    }
    const res = await updateProduct(row.slug, payload());
    setSaveState(res.ok ? "ok" : "err");
    if (!res.ok) setMsg(res.error ?? "Save failed");
  }

  function handleCreateInShopify() {
    startTransition(async () => {
      const res = await createInShopify(row.slug);
      if (res.ok) { setMsg("Synced to Shopify"); setSaveState("ok"); router.refresh(); }
      else { setMsg(res.error ?? "Shopify sync failed"); setSaveState("err"); }
    });
  }

  function togglePublish() {
    startTransition(async () => {
      const next = !row.is_published;
      const res = await setProductPublished(row.slug, next);
      if (res.ok) { set("is_published", next); setMsg(next ? "Published" : "Unpublished"); setSaveState("ok"); }
      else { setMsg(res.error ?? "Error"); setSaveState("err"); }
    });
  }

  async function handleUpload(target: "front" | "back" | "gallery", file: File) {
    setUploading(target);
    const fd = new FormData();
    fd.append("slug", row.slug); fd.append("target", target); fd.append("file", file);
    const res = await uploadProductImage(fd);
    if (res.ok && res.url) {
      setRow((r) => ({
        ...r,
        images: target === "gallery"
          ? { ...r.images, gallery: [...(r.images.gallery ?? []), res.url!] }
          : { ...r.images, [target]: res.url },
      }));
      setSaveState("ok"); setMsg("Image saved");
    } else { setSaveState("err"); setMsg(res.error ?? "Upload failed"); }
    setUploading(null);
  }

  function handleRemoveImage(target: "back" | "gallery", url?: string) {
    startTransition(async () => {
      const res = await removeProductImage(row.slug, target, url);
      if (res.ok) {
        setRow((r) => ({
          ...r,
          images: target === "back"
            ? { ...r.images, back: undefined }
            : { ...r.images, gallery: (r.images.gallery ?? []).filter((u) => u !== url) },
        }));
      } else { setMsg(res.error ?? "Remove failed"); setSaveState("err"); }
    });
  }

  function handleArchive() {
    if (!confirm(`Archive "${row.name}"? It disappears from the storefront but keeps its data and imagery.`)) return;
    startTransition(async () => {
      const res = await archiveProduct(row.slug);
      if (res.ok) { set("status", "archived"); setMsg("Archived"); setSaveState("ok"); }
      else { setMsg(res.error ?? "Archive failed"); setSaveState("err"); }
    });
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete "${row.name}"? This cannot be undone — archiving is usually enough.`)) return;
    const res = await deleteProduct(row.slug);
    if (res && !res.ok) { setMsg(res.error ?? "Delete failed"); setSaveState("err"); }
  }

  return (
    <div className="adm-editor">
      <div className="adm-page__head">
        <h1>{mode === "create" ? "New product" : row.name || row.slug}</h1>
        {mode === "edit" && (
          <button className={`adm-pub${row.is_published ? " is-pub" : ""}`} disabled={isPending}
            onClick={togglePublish}
            title={row.is_published ? "Live on the storefront — click to unpublish" : "Not visible on the storefront — click to publish"}>
            {row.is_published
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="m5 12 4 4 10-10" /></svg>
              : <span className="adm-dot" />}
            {row.is_published ? "Live — Unpublish" : "Draft — Publish"}
          </button>
        )}
      </div>

      {msg && <div className={`adm-toast${saveState === "err" ? " is-err" : ""}`} style={{ margin: "0 0 16px" }}>{msg}</div>}

      <div className="adm-section">
        <div className="adm-section__hd">Details</div>
        <div className="adm-editor__grid">
          {mode === "create" && (
            <label className="adm-field">
              <span>Slug (URL id — lowercase-with-dashes, permanent)</span>
              <input className="adm-input" value={row.slug} placeholder="barcelona-training-top"
                onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} />
            </label>
          )}
          <label className="adm-field">
            <span>Display name</span>
            <input className="adm-input" value={row.name} placeholder="Training Top · 26/27"
              onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Product type</span>
            <select className="adm-select" value={row.product_type} onChange={(e) => set("product_type", e.target.value)}>
              {PRODUCT_TYPE_DEFS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          <label className="adm-field">
            <span>Team</span>
            <select className="adm-select" value={row.team_id ?? ""} onChange={(e) => set("team_id", e.target.value || null)}>
              <option value="">None (brand item)</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          {isJersey && (
            <label className="adm-field">
              <span>Kit type</span>
              <select className="adm-select" value={row.kit_type ?? "home"} onChange={(e) => set("kit_type", e.target.value as KitTypeId)}>
                {KIT_TYPES.map((k) => <option key={k} value={k}>{KIT_TYPE_LABEL[k]}</option>)}
              </select>
            </label>
          )}
          <label className="adm-field">
            <span>Season</span>
            <input className="adm-input" value={row.season} placeholder="26/27, 2005/06 retro…"
              onChange={(e) => set("season", e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Edition</span>
            <input className="adm-input" value={row.edition} placeholder="Authentic, Player Version…"
              onChange={(e) => set("edition", e.target.value)} />
          </label>
          <label className="adm-field">
            <span>Price {isSynced ? "— set in Shopify" : "(QAR)"}</span>
            {isSynced ? (
              <div className="adm-input" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {formatPrice(Number(row.price))}
                {shopifyUrl && <a href={shopifyUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "underline", fontSize: 12 }}>Edit in Shopify →</a>}
              </div>
            ) : (
              <input className="adm-input" type="number" min={0} step="1" value={row.price}
                onChange={(e) => set("price", Number(e.target.value))} />
            )}
          </label>
          <label className="adm-field">
            <span>Status</span>
            <select className="adm-select" value={row.status} onChange={(e) => set("status", e.target.value as AdminProductRow["status"])}>
              <option value="available">Available</option>
              <option value="coming_soon">Coming soon</option>
              <option value="archived">Archived</option>
            </select>
          </label>
          <label className="adm-field">
            <span>Sort order (lower shows first)</span>
            <input className="adm-input" type="number" step="1" value={row.sort_order}
              onChange={(e) => set("sort_order", Number(e.target.value))} />
          </label>
        </div>

        {isJersey && (
          <label className="adm-check" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={row.customizable}
              onChange={(e) => set("customizable", e.target.checked)} />
            Personalisable
            <small>— shows the name &amp; number studio once this kit is calibrated in Kit Studio</small>
          </label>
        )}
        {isJersey && row.customizable && row.team_id && row.kit_type && studioComp && (
          <p className="adm-hint">
            Calibration lives in the{" "}
            <a href={`/admin/kits/${row.team_id}/${studioComp}/${row.kit_type}`} style={{ textDecoration: "underline" }}>
              Kit Studio — {team?.name} · {KIT_TYPE_LABEL[row.kit_type]}
            </a>. Without a calibrated back photo the studio stays hidden on the storefront.
          </p>
        )}
      </div>

      {mode === "edit" && (
        <div className="adm-section">
          <div className="adm-section__hd">Shopify sync</div>
          {row.shopify_product_id ? (
            <p className="adm-hint">
              Synced — price and stock are owned by Shopify from here on.{" "}
              {shopifyUrl && <a href={shopifyUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Open in Shopify →</a>}
            </p>
          ) : (
            <>
              <p className="adm-hint">
                {row.shopify_sync_error
                  ? `Last sync failed: ${row.shopify_sync_error}`
                  : "Not yet on Shopify — price and stock below seed the product when you create it."}
              </p>
              <button type="button" className="adm-upload-btn" disabled={isPending} onClick={handleCreateInShopify}>
                {isPending ? "Creating…" : "Create in Shopify"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="adm-section">
        <div className="adm-section__hd">Stock — units per size</div>
        {isSynced ? (
          <>
            <p className="adm-hint">Managed in Shopify — this reflects the last webhook update.</p>
            <div className="adm-sizegrid">
              {sizeSet.map((s) => (
                <div key={s} className={`adm-sizegrid__cell${(row.sizes[s] ?? 0) <= 0 ? " is-out" : ""}`}>
                  <span>{s}</span>
                  <span>{row.sizes[s] ?? 0}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="adm-hint">Quantities seed Shopify&rsquo;s opening inventory once this product is created there. 0 = size unavailable.</p>
            <div className="adm-sizegrid">
              {sizeSet.map((s) => (
                <div key={s} className={`adm-sizegrid__cell${(row.sizes[s] ?? 0) <= 0 ? " is-out" : ""}`}>
                  <span>{s}</span>
                  <input type="number" min={0} step="1" value={row.sizes[s] ?? 0}
                    onChange={(e) => set("sizes", { ...row.sizes, [s]: Math.max(0, Number(e.target.value)) })} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {mode === "edit" ? (
        <div className="adm-section">
          <div className="adm-section__hd">Imagery</div>
          <ImageSlot label="Front photo" url={row.images.front} busy={uploading === "front"}
            onUpload={(f) => handleUpload("front", f)} />
          <ImageSlot label="Back photo" url={row.images.back} busy={uploading === "back"}
            onUpload={(f) => handleUpload("back", f)} onRemove={() => handleRemoveImage("back")} />
          {(row.images.gallery ?? []).length > 0 && (
            <div className="adm-gallery-grid">
              {(row.images.gallery ?? []).map((url) => (
                <div key={url} className="adm-gallery-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" />
                  <button className="adm-remove-btn" title="Remove photo" disabled={isPending}
                    onClick={() => handleRemoveImage("gallery", url)}>✕</button>
                </div>
              ))}
            </div>
          )}
          <ImageSlot label="Add gallery photo" url={undefined} busy={uploading === "gallery"}
            onUpload={(f) => handleUpload("gallery", f)} />
          {isJersey && (
            <p className="adm-hint">For calibrated jerseys, Kit Studio photos override these on the storefront automatically.</p>
          )}
        </div>
      ) : (
        <p className="adm-hint" style={{ marginBottom: 16 }}>Save the product first — image uploads unlock once it exists.</p>
      )}

      <div className="adm-editor__actions">
        <button className={`adm-save${saveState === "ok" ? " is-ok" : saveState === "err" ? " is-err" : ""}`}
          disabled={saveState === "saving"} onClick={save}>
          {saveState === "saving" ? "Saving…" : saveState === "ok" ? "✓ Saved" : mode === "create" ? "Create product" : "Save changes"}
        </button>
        <button className="adm-upload-btn" onClick={() => router.push("/admin/products")}>Back to products</button>
        {mode === "edit" && row.status !== "archived" && (
          <button className="adm-dangerbtn" disabled={isPending} onClick={handleArchive}>Archive</button>
        )}
        {mode === "edit" && row.status === "archived" && (
          <button className="adm-dangerbtn" onClick={handleDelete}>Delete permanently</button>
        )}
      </div>
    </div>
  );
}
