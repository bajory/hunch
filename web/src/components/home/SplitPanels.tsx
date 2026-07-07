"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";
import type { SplitContent } from "@/lib/site-content";

const HREFS = ["/shop?kind=club", "/shop?kind=national"] as const;

export function SplitPanels({ content }: { content: SplitContent }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(() => {
    const root = ref.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(`${MOTION_OK} and (min-width: 761px)`, () => {
      const panels = root.querySelectorAll(".split__panel");
      // Center seam opens as the section scrolls in
      gsap.fromTo(panels, { clipPath: "inset(0 12% 0 12%)" }, {
        clipPath: "inset(0 0% 0 0%)",
        ease: "none",
        scrollTrigger: { trigger: root, start: "top 85%", end: "top 20%", scrub: 0.6 },
      });
      const bodies = root.querySelectorAll(".split__body");
      gsap.set(bodies, { opacity: 0, y: 30 });
      gsap.to(bodies, {
        opacity: 1, y: 0, duration: 1, stagger: 0.15, ease: "expo.out",
        scrollTrigger: { trigger: root, start: "top 45%", once: true },
      });
    });
  }, { scope: ref });

  return (
    <section ref={ref} className="split" aria-label="Shop by collection">
      {content.panels.map((p, i) => (
        <Link key={p.title} href={HREFS[i]} className="split__panel" data-cursor="Enter">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt={p.alt} loading="lazy" />
          <div className="split__body">
            <span className="microlabel microlabel--brass">{p.kicker}</span>
            <h3 className="split__title">{p.title}</h3>
            <p className="split__sub">{p.sub}</p>
            <span className="split__cta">
              Explore
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
