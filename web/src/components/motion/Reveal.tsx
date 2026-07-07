"use client";

import { useRef } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";

/**
 * Scroll-staggered fade+lift for everything inside marked with [data-reveal].
 * Hidden state is set in JS only — reduced-motion (and no-JS) users always
 * see the content.
 */
export function Reveal({
  children,
  className,
  stagger = 0.08,
  y = 36,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const root = ref.current;
    if (!root) return;
    const targets = root.querySelectorAll("[data-reveal]");
    if (!targets.length) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.set(targets, { opacity: 0, y });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        stagger,
        ease: "expo.out",
        scrollTrigger: { trigger: root, start: "top 82%", once: true },
      });
    });
  }, { scope: ref });

  return <div ref={ref} className={className}>{children}</div>;
}
