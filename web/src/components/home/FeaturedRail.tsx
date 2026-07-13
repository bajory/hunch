"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";
import { formatPrice, sizeOrderFor, productTypeDef, KIT_TYPE_LABELS, type Product } from "@/lib/products";
import { livePhotosFor, type PrintEntry, type KitTypeId } from "@/lib/catalog";
import { useCart } from "@/components/CartProvider";

/** Pinned horizontal scroll rail of featured drops (desktop); native swipe strip on touch.
    Each card carries a quick-add: tap + , pick a size, straight into the bag. */
export function FeaturedRail({ products, printMap }: {
  products: Product[];
  /** When provided, an admin-uploaded photo overrides the bundled catalog image. */
  printMap?: Partial<Record<string, PrintEntry>>;
}) {
  const ref = useRef<HTMLElement>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addItem, openDrawer } = useCart();

  useGSAP(() => {
    const root = ref.current;
    if (!root) return;
    const track = root.querySelector<HTMLElement>(".rail__track");
    if (!track) return;

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const distance = () => track.scrollWidth - window.innerWidth;
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: () => `+=${distance()}`,
          scrub: 0.6,
          pin: true,
          invalidateOnRefresh: true,
        },
      });
      const imgs = track.querySelectorAll(".rail__media img");
      const drift = gsap.fromTo(imgs, { xPercent: -4 }, {
        xPercent: 4, ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: () => `+=${distance()}`, scrub: 0.8 },
      });
      return () => { tween.kill(); drift.kill(); };
    });
  }, { scope: ref });

  // Admin-uploaded kit photos override catalog images for jerseys only —
  // the calibration pipeline has no photo slots for other product types.
  function liveFront(p: Product): string {
    const live = p.productType === "jersey" && p.kitType && p.teamSlug
      ? livePhotosFor(p.teamSlug, p.kitType as KitTypeId, printMap)
      : null;
    return live?.front || p.images.front;
  }

  function flashToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  async function quickAdd(product: Product, size: string) {
    const variant = product.sizeVariants?.[size];
    if (!variant) {
      flashToast("This size isn't available right now");
      return;
    }
    try {
      await addItem([
        { key: "Product", value: product.name },
        { key: "Type", value: productTypeDef(product.productType).label },
        ...(product.teamName ? [{ key: "Team", value: product.teamName }] : []),
        ...(product.kitType ? [{ key: "Kit Type", value: KIT_TYPE_LABELS[product.kitType] }] : []),
        ...(product.season ? [{ key: "Season", value: product.season }] : []),
        { key: "Size", value: size },
        { key: "_Image", value: liveFront(product) },
      ], variant.variantId);
      setPickerFor(null);
      flashToast(`${product.teamName} · ${size} added`);
      setTimeout(() => openDrawer(), 420);
    } catch {
      flashToast("Couldn't add to bag — please try again");
    }
  }

  return (
    <section ref={ref} className="rail section" aria-label="Featured drops">
      <div className="rail__pin">
        <div className="wrap" style={{ marginBottom: "clamp(28px, 5vh, 56px)" }}>
          <span className="microlabel microlabel--brass">Featured drops</span>
          <h2 className="section__title section__title--bold" style={{ marginTop: 12 }}>New season, first pressing.</h2>
        </div>
        <div className="rail__track">
          {products.map((p, i) => {
            const front = liveFront(p);
            return (
            <Link key={p.slug} href={`/product/${p.slug}`} className="rail__card" data-cursor="View">
              <span className="rail__index">{String(i + 1).padStart(2, "0")}</span>
              <div className="rail__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={front} alt={`${p.teamName} ${p.name}`} loading="lazy" />
              </div>

              {pickerFor === p.slug && (
                <div className="rail__sizepick" onClick={(e) => e.preventDefault()}>
                  <span className="rail__sizepick-label">Select size</span>
                  <div className="rail__sizepick-chips">
                    {sizeOrderFor(p).filter((s) => (p.sizes[s] ?? 0) > 0).map((s) => (
                      <button key={s} className="sizechip"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); quickAdd(p, s); }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rail__meta">
                <div>
                  <div className="rail__name">{p.teamName || p.name}</div>
                  <div className="rail__tag">{[p.kitType ? KIT_TYPE_LABELS[p.kitType] : productTypeDef(p.productType).label, p.season].filter(Boolean).join(" · ")}</div>
                </div>
                <div className="rail__buy">
                  <span className="rail__price">{formatPrice(p.price)}</span>
                  <button className="rail__add" data-cursor="Add"
                    aria-label={`Add ${p.teamName} to bag`}
                    aria-expanded={pickerFor === p.slug}
                    onClick={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      setPickerFor(pickerFor === p.slug ? null : p.slug);
                    }}>
                    {pickerFor === p.slug ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      </div>

      <div className={`toastx${toast ? " is-show" : ""}`} role="status" aria-live="polite">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 4 4 10-10" /></svg>
        <span>{toast ?? ""}</span>
      </div>
    </section>
  );
}
