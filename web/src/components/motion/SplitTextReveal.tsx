"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, MOTION_OK } from "@/lib/gsap";

/**
 * Masked line-by-line reveal for display type. Splits after fonts load so
 * line boxes measure correctly; reduced-motion users just see the text.
 */
export function SplitTextReveal({
  as: Tag = "h2",
  children,
  className,
  delay = 0,
  /** play immediately instead of waiting for scroll */
  immediate = false,
}: {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  children: React.ReactNode;
  className?: string;
  delay?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      let split: SplitText | null = null;
      document.fonts.ready.then(() => {
        if (!el.isConnected) return;
        split = new SplitText(el, { type: "lines", linesClass: "line" });
        gsap.set(split.lines, { yPercent: 110 });
        gsap.to(split.lines, {
          yPercent: 0,
          duration: 1.3,
          stagger: 0.09,
          delay,
          ease: "expo.out",
          ...(immediate ? {} : {
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          }),
        });
      });
      return () => split?.revert();
    });
  }, { scope: ref });

  return <Tag ref={ref as never} className={className}>{children}</Tag>;
}
