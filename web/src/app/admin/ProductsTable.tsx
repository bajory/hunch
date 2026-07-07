"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRODUCT_TYPE_DEFS, formatPrice, KIT_TYPE_LABELS } from "@/lib/products";
import type { AdminProductRow } from "./types";

type StatusFilter = "all" | "available" | "coming_soon" | "archived";
type PubFilter = "all" | "live" | "draft";

export function ProductsTable({ products, teamNames, initialType = "all" }: {
  products: AdminProductRow[];
  teamNames: Record<string, string>;
  initialType?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>(initialType);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [pub, setPub] = useState<PubFilter>("all");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (type !== "all" && p.product_type !== type) return false;
      if (status !== "all" && p.status !== status) return false;
      if (pub === "live" && !p.is_published) return false;
      if (pub === "draft" && p.is_published) return false;
      if (needle) {
        const hay = `${p.slug} ${p.name} ${teamNames[p.team_id ?? ""] ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [products, q, type, status, pub, teamNames]);

  return (
    <>
      <div className="adm-filterrow">
        <div className="adm-rail__search" style={{ border: "1px solid var(--adm-border)", borderRadius: "var(--adm-r-sm)", padding: "7px 12px", background: "var(--adm-surface)" }}>
          <input placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="adm-select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
          <option value="all">All types</option>
          {PRODUCT_TYPE_DEFS.map((d) => <option key={d.id} value={d.id}>{d.plural}</option>)}
        </select>
        <select className="adm-select" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="coming_soon">Coming soon</option>
          <option value="archived">Archived</option>
        </select>
        <select className="adm-select" value={pub} onChange={(e) => setPub(e.target.value as PubFilter)} aria-label="Filter by visibility">
          <option value="all">Live & draft</option>
          <option value="live">Live only</option>
          <option value="draft">Draft only</option>
        </select>
        <span className="adm-bar__title" style={{ marginLeft: "auto", alignSelf: "center" }}>
          {visible.length} of {products.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="adm-table__empty">No products match these filters.</div>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th></th>
              <th>Product</th>
              <th>Type</th>
              <th>Team</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const units = Object.values(p.sizes ?? {}).reduce((s, n) => s + (n > 0 ? n : 0), 0);
              const typeDef = PRODUCT_TYPE_DEFS.find((d) => d.id === p.product_type);
              return (
                <tr key={p.slug} onClick={() => router.push(`/admin/products/${p.slug}`)}>
                  <td style={{ width: 54 }}>
                    {p.images?.front
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.images.front} alt="" className="adm-table__thumb" />
                      : <span className="adm-table__thumb" />}
                  </td>
                  <td>
                    <div className="adm-table__name">{p.name}</div>
                    <div className="adm-table__sub">{p.slug}{p.kit_type ? ` · ${KIT_TYPE_LABELS[p.kit_type]}` : ""}</div>
                  </td>
                  <td>{typeDef?.label ?? p.product_type}</td>
                  <td>{p.team_id ? (teamNames[p.team_id] ?? p.team_id) : "—"}</td>
                  <td>{formatPrice(Number(p.price))}</td>
                  <td>{units > 0 ? `${units} unit${units === 1 ? "" : "s"}` : <span style={{ color: "var(--adm-bad)" }}>Out</span>}</td>
                  <td>
                    {p.status === "archived"
                      ? <span className="adm-pill is-muted">Archived</span>
                      : p.status === "coming_soon"
                        ? <span className="adm-pill is-warn">Coming soon</span>
                        : p.is_published
                          ? <span className="adm-pill is-good">Live</span>
                          : <span className="adm-pill is-warn">Draft</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
