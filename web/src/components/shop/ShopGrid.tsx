"use client";

import { useMemo, useRef, useState } from "react";
import { gsap, Flip, useGSAP, prefersReducedMotion, MOTION_OK } from "@/lib/gsap";
import { LEAGUE_LABELS, PRODUCT_TYPE_DEFS, type LeagueId, type Product, type ProductType } from "@/lib/products";
import type { PrintEntry } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

type Kind = "all" | "club" | "national";
type TypeFilter = "all" | ProductType;

const LEAGUES = Object.keys(LEAGUE_LABELS) as LeagueId[];

function matches(p: Product, kind: Kind, league: LeagueId | null, type: TypeFilter): boolean {
  if (kind !== "all" && p.teamKind !== kind) return false;
  if (league && p.league !== league) return false;
  if (type !== "all" && p.productType !== type) return false;
  return true;
}

export function ShopGrid({ products, initialKind = "all", initialLeague = null, initialType = "all", printMap }: {
  products: Product[];
  initialKind?: Kind;
  initialLeague?: LeagueId | null;
  initialType?: TypeFilter;
  printMap?: Partial<Record<string, PrintEntry>>;
}) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [league, setLeague] = useState<LeagueId | null>(initialLeague);
  const [type, setType] = useState<TypeFilter>(initialType);
  const gridRef = useRef<HTMLDivElement>(null);

  // Only offer type chips for types the catalog actually carries — the bar
  // stays clean until training wear / shorts / socks actually exist.
  const presentTypes = useMemo(() => {
    const present = new Set(products.map((p) => p.productType));
    return PRODUCT_TYPE_DEFS.filter((d) => present.has(d.id));
  }, [products]);

  const visible = useMemo(
    () => products.filter((p) => matches(p, kind, league, type)),
    [products, kind, league, type],
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

  function applyFilter(nextKind: Kind, nextLeague: LeagueId | null, nextType: TypeFilter) {
    const grid = gridRef.current;
    if (!grid || prefersReducedMotion()) {
      setKind(nextKind); setLeague(nextLeague); setType(nextType);
      return;
    }
    const state = Flip.getState(grid.querySelectorAll(".pcard"));
    setKind(nextKind); setLeague(nextLeague); setType(nextType);
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

  const setKindFilter = (k: Kind) => applyFilter(k, k === "national" ? null : league, type);

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
                  onClick={() => applyFilter(kind, league, type === d.id ? "all" : d.id)}>
                  {d.plural}
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
                  onClick={() => applyFilter(kind, league === l ? null : l, type)}>
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
