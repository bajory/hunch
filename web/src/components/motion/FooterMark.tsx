"use client";

import { useRef } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";

/** Oversized wordmark that rises out of the footer as it scrolls into view. */
export function FooterMark() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    const span = el.querySelector("span");
    if (!span) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(span, { yPercent: 62 }, {
        yPercent: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 95%", end: "bottom 100%", scrub: 0.6 },
      });
    });
  }, { scope: ref });

  return (
    <div ref={ref} className="footer__mark" aria-hidden="true">
      <span>HUNCH</span>
    </div>
  );
}
