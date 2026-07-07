"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/**
 * Route-change unveil: the moment the pathname changes (App Router has already
 * swapped in the new page), the curtain snaps over the viewport, scroll resets,
 * and the curtain lifts to reveal the new route. Reduced motion: no curtain.
 * Refreshes ScrollTrigger after each change so pinned scenes re-measure.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const curtainRef = useRef<HTMLDivElement>(null);
  const lastPath = useRef(pathname);

  useEffect(() => {
    if (pathname === lastPath.current) return;
    lastPath.current = pathname;

    if (prefersReducedMotion() || !curtainRef.current) {
      requestAnimationFrame(() => ScrollTrigger.refresh());
      return;
    }

    const curtain = curtainRef.current;
    const tl = gsap.timeline();
    tl.set(curtain, { yPercent: 0, opacity: 1 })
      .add(() => window.scrollTo(0, 0))
      .to(curtain, { yPercent: -101, duration: 0.75, ease: "power3.inOut", delay: 0.28 })
      .set(curtain, { yPercent: 101 })
      .add(() => ScrollTrigger.refresh());

    // Safety net: mobile Safari can pause a rAF-driven tween mid-flight (tab
    // backgrounded, app-switch, a stalled asset over a flaky connection) and
    // never resume it cleanly, leaving the curtain frozen over the whole page.
    // The animation above always finishes well under a second — if it hasn't
    // by 1.6s, force it back to hidden regardless of what happened to the tween.
    const failsafe = window.setTimeout(() => gsap.set(curtain, { yPercent: 101, opacity: 1 }), 1600);

    return () => {
      // If a route change interrupts this mid-animation (e.g. the user navigates
      // again before the curtain has finished lifting), tl.kill() alone freezes
      // it wherever it was — which can leave it stuck covering the whole page.
      // Force it back to its hidden resting position on every cleanup instead.
      window.clearTimeout(failsafe);
      tl.kill();
      gsap.set(curtain, { yPercent: 101, opacity: 1 });
    };
  }, [pathname]);

  return (
    <>
      {children}
      <div ref={curtainRef} className="curtain" aria-hidden="true">
        <span className="curtain__mark">HUNCH</span>
      </div>
    </>
  );
}
