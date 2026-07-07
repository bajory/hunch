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

  // Mobile Safari resizes the viewport as its address bar collapses mid-scroll,
  // which can desync a pinned ScrollTrigger's start/end from what's actually on
  // screen — the classic symptom is a pinned rail (like the featured drops rail)
  // opening already scrolled a card or two in in the second card instead of the first.
  // normalizeScroll simulates scroll with a transform so pins stay in sync
  // regardless of toolbar show/hide.
  ScrollTrigger.normalizeScroll(true);
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
