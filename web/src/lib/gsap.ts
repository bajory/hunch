"use client";
/* Single GSAP entry point — every animated component imports from here so
   plugin registration happens exactly once and eases stay consistent. */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { CustomEase } from "gsap/CustomEase";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip, CustomEase, useGSAP);
  gsap.defaults({ ease: "expo.out", duration: 1 });

  // Tried ScrollTrigger.normalizeScroll() here to fix a cosmetic mobile-Safari
  // issue (a pinned rail could open slightly scrolled-in if the address bar
  // collapsed mid-scroll, desyncing its start/end). Left OFF on purpose: on
  // real touch devices it intercepts all touch input and drives scrolling via
  // a transform, and its tap-vs-drag detection isn't reliable — it froze
  // scrolling inside overlays (even with allowNestedScroll) and, worse, could
  // misread a scroll-drag over a product card as a tap and navigate. Neither
  // of those showed up in desktop DevTools' mobile emulation, only on real
  // devices — don't re-enable without testing scroll AND tap on a real phone.
}

/** House eases */
export const EASE = {
  out: "expo.out",
  inOut: "power3.inOut",
  soft: "power2.out",
} as const;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** matchMedia key used across scenes so reduced-motion users get static content */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger, SplitText, Flip, CustomEase, useGSAP };
