"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";

/**
 * Custom cursor: trailing dot + ring. Elements with [data-cursor="View"] (etc.)
 * grow the ring and show the label. Hidden on touch and reduced motion.
 */
export function CursorProvider() {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const root = rootRef.current;
    if (!root) return;
    if (prefersReducedMotion() || window.matchMedia("(pointer: coarse)").matches) {
      root.style.display = "none";
      return;
    }
    const dot = root.querySelector<HTMLElement>(".cursorx__dot")!;
    const ring = root.querySelector<HTMLElement>(".cursorx__ring")!;

    const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power2.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

    const move = (e: MouseEvent) => {
      dotX(e.clientX); dotY(e.clientY);
      ringX(e.clientX); ringY(e.clientY);
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-cursor]");
      if (target) {
        root.classList.add("is-hover");
        if (labelRef.current) labelRef.current.textContent = target.dataset.cursor ?? "";
      } else {
        root.classList.remove("is-hover");
      }
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, { scope: rootRef });

  return (
    <div ref={rootRef} className="cursorx" aria-hidden="true">
      <div className="cursorx__dot" />
      <div className="cursorx__ring"><span ref={labelRef} className="cursorx__label" /></div>
    </div>
  );
}
