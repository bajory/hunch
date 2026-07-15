"use client";

import { useMemo, useRef, useState } from "react";
import { gsap, Flip, useGSAP, prefersReducedMotion, MOTION_OK } from "@/lib/gsap";
import {
  LEAGUE_LABELS, PRODUCT_TYPE_DEFS, KIT_TYPE_LABELS,
  type LeagueId, type Product, type ProductType, type ProductKitType,
} from "@/lib/products";
import type { PrintEntry } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

type Kind = "all" | "club" | "national";
type TypeFilter = "all" | ProductType;
type KitTypeFilter = "all" | ProductKitType;

const LEAGUES = Object.keys(LEAGUE_LABELS) as LeagueId[];
// Display order for the kit-type chips — matches KIT_TYPE_LABELS' own keys.
const KIT_TYPES = Object.keys(KIT_TYPE_LABELS) as ProductKitType[];

function matches(p: Product, kind: Kind, league: LeagueId | null, type: TypeFilter, kitType: KitTypeFilter): boolean {
  if (kind !== "all" && p.teamKind !== kind) return false;
  if (league && p.league !== league) return false;
  if (type !== "all" && p.productType !== type) return false;
  if (kitType !== "all" && p.kitType !== kitType) return false;
  return true;
}

export function ShopGrid({
  products, initialKind = "all", initialLeague = null, initialType = "all", initialKitType = "all", printMap,
}: {
  products: Product[];
  initialKind?: Kind;
  initialLeague?: LeagueId | null;
  initialType?: TypeFilter;
  initialKitType?: KitTypeFilter;
  printMap?: Partial<Record<string, PrintEntry>>;
}) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [league, setLeague] = useState<LeagueId | null>(initialLeague);
  const [type, setType] = useState<TypeFilter>(initialType);
  const [kitType, setKitType] = useState<KitTypeFilter>(initialKitType);
  const gridRef = useRef<HTMLDivElement>(null);

  // Only offer type chips for types the catalog actually carries — the bar
  // stays clean until training wear / shorts / socks actually exist.
  const presentTypes = useMemo(() => {
    const present = new Set(products.map((p) => p.productType));
    return PRODUCT_TYPE_DEFS.filter((d) => present.has(d.id));
  }, [products]);

  // Same idea for kit types (home/away/retro/…) — kitType is jersey-only,
  // so this stays empty entirely on a catalog with no jerseys at all.
  const presentKitTypes = useMemo(() => {
    const present = new Set(products.map((p) => p.kitType).filter(Boolean));
    return KIT_TYPES.filter((k) => present.has(k));
  }, [products]);

  const visible = useMemo(
    () => products.filter((p) => matches(p, kind, league, type, kitType)),
    [products, kind, league, type, kitType],
  );

  // Entrance stagger
  useGSAP(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const cards = grid.querySelectorAll(".pcard");
      gsap.set(cards, { opacity: 0, y: 44 });
      gsap.to(cards, {
        opacity: 1, y: 0, duration: 1, stagger: 0.05, ease: "expo.out",
        scrollTrigger: { trigger: grid, start: "top 88%", once: true },
      });
    });
  }, { scope: gridRef });

  function applyFilter(nextKind: Kind, nextLeague: LeagueId | null, nextType: TypeFilter, nextKitType: KitTypeFilter) {
    const grid = gridRef.current;
    if (!grid || prefersReducedMotion()) {
      setKind(nextKind); setLeague(nextLeague); setType(nextType); setKitType(nextKitType);
      return;
    }
    const state = Flip.getState(grid.querySelectorAll(".pcard"));
    setKind(nextKind); setLeague(nextLeague); setType(nextType); setKitType(nextKitType);
    requestAnimationFrame(() => {
      Flip.from(state, {
        duration: 0.7,
        ease: "expo.out",
        stagger: 0.015,
        absolute: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.6 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.3 }),
      });
    });
  }

  const setKindFilter = (k: Kind) => applyFilter(k, k === "national" ? null : league, type, kitType);

  return (
    <>
      <div className="filterbar" role="group" aria-label="Filter products">
        <div className="filterbar__group">
          {(["all", "club", "national"] as Kind[]).map((k) => (
            <button key={k} className={`chip${kind === k ? " is-on" : ""}`} onClick={() => setKindFilter(k)}>
              {k === "all" ? "All" : k === "club" ? "Clubs 26/27" : "World Cup 2026"}
            </button>
          ))}
        </div>
        {presentTypes.length > 1 && (
          <>
            <span className="filterbar__sep" aria-hidden="true" />
            <div className="filterbar__group">
              {presentTypes.map((d) => (
                <button key={d.id} className={`chip${type === d.id ? " is-on" : ""}`}
                  onClick={() => applyFilter(kind, league, type === d.id ? "all" : d.id, kitType)}>
                  {d.plural}
                </button>
              ))}
            </div>
          </>
        )}
        {presentKitTypes.length > 1 && (
          <>
            <span className="filterbar__sep" aria-hidden="true" />
            <div className="filterbar__group">
              {presentKitTypes.map((k) => (
                <button key={k} className={`chip${kitType === k ? " is-on" : ""}`}
                  onClick={() => applyFilter(kind, league, type, kitType === k ? "all" : k)}>
                  {KIT_TYPE_LABELS[k]}
                </button>
              ))}
            </div>
          </>
        )}
        {kind !== "national" && (
          <>
            <span className="filterbar__sep" aria-hidden="true" />
            <div className="filterbar__group">
              {LEAGUES.map((l) => (
                <button key={l} className={`chip${league === l ? " is-on" : ""}`}
                  onClick={() => applyFilter(kind, league === l ? null : l, type, kitType)}>
                  {LEAGUE_LABELS[l]}
                </button>
              ))}
            </div>
          </>
        )}
        <span className="shop__count" style={{ marginLeft: "auto" }}>
          {visible.filter((p) => p.status === "available").length} items
        </span>
      </div>

      <div ref={gridRef} className="pgrid">
        {visible.map((p) => <ProductCard key={p.slug} product={p} printMap={printMap} />)}
      </div>
    </>
  );
}
