import type { Metadata } from "next";
import Link from "next/link";
import { SplitTextReveal } from "@/components/motion/SplitTextReveal";
import { Reveal } from "@/components/motion/Reveal";
import { Marquee } from "@/components/motion/Marquee";

export const metadata: Metadata = {
  title: "The House — HUNCH",
  description: "Why HUNCH exists: authentic matchwear, sourced with obsession and personalised with the kit man's precision.",
};

const STEPS = [
  {
    no: "01",
    title: "Sourced authentic",
    body: "Every shirt is the player version, bought the way collectors buy — verified, tagged, untouched. No fan replicas, no compromises.",
  },
  {
    no: "02",
    title: "Calibrated printing",
    body: "Names and numbers are set in each competition's official typeface and positioned against real shirt photography, calibrated to the millimetre in our studio tooling.",
  },
  {
    no: "03",
    title: "Pressed to order",
    body: "Heat-pressed one shirt at a time. Sleeve patch, name, number — or nothing at all. Blank is a valid choice; most of our World Cup stock ships exactly as it arrived.",
  },
  {
    no: "04",
    title: "Dispatched with care",
    body: "Folded, wrapped and shipped in 2–4 working days with complimentary returns. If it isn't right, it comes back.",
  },
];

export default function HousePage() {
  return (
    <main>
      <section className="house__hero">
        <div className="house__hero-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/products/liverpool/home/back.png" alt="" aria-hidden="true" />
        </div>
        <span className="microlabel microlabel--brass">The House</span>
        <SplitTextReveal as="h1" className="house__title" immediate>
          Built by people who keep their shirts.
        </SplitTextReveal>
      </section>

      <section className="section">
        <Reveal className="wrap">
          <div className="house__manifesto" data-reveal>
            <p>
              A jersey is not merchandise. It is <em>a record of a season</em> —
              who played, what was won, what it felt like. We started HUNCH
              because that record deserves better than lookalike fonts and
              iron-on numbers that crack in a year.
            </p>
            <p>
              So we do it the slow way: <em>authentic shirts</em>, official
              lettering, real patches, pressed one at a time.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="section" id="craft" style={{ paddingTop: 0 }}>
        <Reveal className="wrap">
          <span className="microlabel microlabel--brass" data-reveal>How it works</span>
          <div className="section__head" style={{ marginTop: 12 }}>
            <h2 className="section__title" data-reveal>Four steps, no shortcuts.</h2>
          </div>
          <div className="steps">
            {STEPS.map((s) => (
              <div key={s.no} className="step" data-reveal>
                <span className="step__no">{s.no}</span>
                <h3 className="step__title">{s.title}</h3>
                <p className="step__body">{s.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="section" id="sizing" style={{ paddingTop: 0 }}>
        <Reveal className="wrap">
          <div className="section__head">
            <h2 className="section__title" data-reveal>Player fit, honestly sized.</h2>
          </div>
          <p data-reveal style={{ maxWidth: "52ch", color: "var(--bone-dim)", lineHeight: 1.7 }}>
            Player-version shirts run slimmer and shorter than replicas.
            If you're between sizes — or you like room — take one size up.
            Stock is listed per size on every product page; what you see is
            what exists.
          </p>
          <div style={{ marginTop: 32 }} data-reveal>
            <Link href="/shop" className="btn">Browse the collection</Link>
          </div>
        </Reveal>
      </section>

      <Marquee items={["Sourced Authentic", "Official Lettering", "Pressed to Order", "Complimentary Returns"]} />
    </main>
  );
}
