"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap, SplitText, useGSAP, MOTION_OK, prefersReducedMotion } from "@/lib/gsap";
import { MagneticButton } from "@/components/motion/MagneticButton";
import type { HeroContent } from "@/lib/site-content";

const AUTOPLAY_MS = 6500;

export function Hero({ content }: { content: HeroContent }) {
  const slides = content.slides;
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const slide = slides[active];

  // Rotate through slides automatically — a single-slide hero just never advances.
  useEffect(() => {
    if (slides.length < 2 || prefersReducedMotion()) return;
    const t = setInterval(() => setActive((i) => (i + 1) % slides.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [slides.length]);

  useGSAP(() => {
    const root = ref.current;
    if (!root) return;
    const media = root.querySelector(".hero__media");
    const title = root.querySelector<HTMLElement>(".hero__title");
    const below = root.querySelectorAll(".hero__kicker, .hero__row, .hero__hint");

    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      let split: SplitText | null = null;

      // Crossfade into the (possibly new) slide's media
      gsap.fromTo(media, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power2.out" });
      gsap.set(below, { opacity: 0, y: 26 });

      document.fonts.ready.then(() => {
        if (!title?.isConnected) return;
        split = new SplitText(title, { type: "lines", linesClass: "line" });
        gsap.set(split.lines, { yPercent: 112 });
        gsap.timeline()
          .to(split.lines, { yPercent: 0, duration: 1.3, stagger: 0.08, ease: "expo.out", delay: 0.1 })
          .to(below, { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: "expo.out" }, "-=0.8");
      });

      // Scroll: photo sinks and content parallaxes out
      gsap.to(media, {
        yPercent: 14, scale: 1.06, ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.5 },
      });
      gsap.to(root.querySelector(".hero__content"), {
        yPercent: -12, opacity: 0.25, ease: "none",
        scrollTrigger: { trigger: root, start: "top top", end: "bottom 30%", scrub: 0.5 },
      });

      return () => split?.revert();
    });
  }, { scope: ref, dependencies: [active] });

  return (
    <section ref={ref} className="hero">
      <div className="hero__media" key={active}>
        {slide.video ? (
          <video src={slide.video} poster={slide.image} autoPlay muted loop playsInline aria-label={slide.alt} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slide.image} alt={slide.alt} fetchPriority={active === 0 ? "high" : "auto"} />
        )}
      </div>
      <div className="hero__scrim" />
      <div className="hero__content">
        <div className="hero__kicker">
          <span className="rule" />
          <span className="microlabel microlabel--brass">{slide.kicker}</span>
        </div>
        <h1 className="hero__title" key={`title-${active}`}>{slide.title}</h1>
        <div className="hero__row">
          <p className="hero__sub">{slide.sub}</p>
          <div className="hero__ctas">
            <MagneticButton><Link href="/shop" className="btn btn--pill" data-cursor="Shop">Shop the collection</Link></MagneticButton>
            <MagneticButton><Link href="/house" className="btn btn--pill btn--line">The House</Link></MagneticButton>
          </div>
        </div>
      </div>
      {slides.length > 1 && (
        <div className="hero__dots" role="tablist" aria-label="Hero slides">
          {slides.map((_, i) => (
            <button key={i} role="tab" aria-selected={i === active}
              className={`hero__dot${i === active ? " is-on" : ""}`}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setActive(i)} />
          ))}
        </div>
      )}
      <span className="hero__hint">Scroll</span>
    </section>
  );
}
