"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, MOTION_OK } from "@/lib/gsap";

/** Infinite loop marquee; skews with scroll velocity. Static for reduced motion. */
export function Marquee({ items }: { items: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const root = ref.current;
    if (!root) return;
    const inner = root.querySelector<HTMLElement>(".marquee__inner");
    if (!inner) return;

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      // Two identical halves — translate by exactly one half for a seamless loop
      const half = inner.scrollWidth / 2;
      const loop = gsap.to(inner, {
        x: -half,
        duration: Math.max(20, half / 60),
        ease: "none",
        repeat: -1,
      });

      const st = ScrollTrigger.create({
        onUpdate: (self) => {
          const skew = gsap.utils.clamp(-8, 8, self.getVelocity() / -280);
          gsap.to(inner, { skewX: skew, duration: 0.4, overwrite: "auto" });
          loop.timeScale(gsap.utils.clamp(0.4, 3, 1 + Math.abs(self.getVelocity()) / 1600));
        },
      });
      return () => { loop.kill(); st.kill(); };
    });
  }, { scope: ref });

  const row = (key: string) => (
    <div key={key} className="marquee__item" aria-hidden={key === "b"}>
      {items.map((t, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "inherit" }}>
          {t}<span className="dot" />
        </span>
      ))}
    </div>
  );

  return (
    <div ref={ref} className="marquee">
      <div className="marquee__inner">{row("a")}{row("b")}</div>
    </div>
  );
}
