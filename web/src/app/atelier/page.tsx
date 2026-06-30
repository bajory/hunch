import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Atelier — HUNCH",
  description:
    "How HUNCH works: from choosing your club to wearing your name on a pitch-authentic jersey.",
};

const STEPS = [
  {
    num: "01",
    title: "Choose Your Club",
    desc: "Select from six of the world's most iconic clubs — each available in their primary competition. Real Madrid in La Liga, Liverpool in the Premier League, Inter in Serie A. We only offer shirts we can do to the highest standard.",
  },
  {
    num: "02",
    title: "Personalise",
    desc: "Enter your name — or a player's — and your preferred squad number. Up to 14 characters and 2 digits, rendered live in the official competition typeface. Choose Squad Player to pre-fill from the current first-team roster.",
  },
  {
    num: "03",
    title: "We Press",
    desc: "Your order enters our London atelier within 24 hours. We heat-transfer using competition-licensed lettering film onto the authentic fabric, then add the official sleeve patch. A final hand inspection before packaging.",
  },
  {
    num: "04",
    title: "You Wear It",
    desc: "Dispatched within 48 hours in HUNCH archival packaging. Worldwide tracked shipping. Complimentary returns within 14 days — though in 5 years, no one has ever sent one back.",
  },
] as const;

const SPECS = [
  { key: "Jersey grade", val: "Player-issue authentic (not replica)" },
  { key: "Lettering method", val: "Competition heat-transfer film" },
  { key: "Typefaces", val: "Official licensed per competition" },
  { key: "Sleeve patch", val: "Official licensed, stitched-grade" },
  { key: "Processing time", val: "24 h in-studio" },
  { key: "Dispatch", val: "Within 48 h of order" },
  { key: "Shipping", val: "Worldwide tracked" },
  { key: "Returns", val: "Complimentary within 14 days" },
] as const;

const CREDENTIALS = [
  { icon: "shield", label: "Player-issue authentic", desc: "The same shirt worn on the pitch, not the retail replica." },
  { icon: "grid", label: "Official typefaces", desc: "Every competition has a licensed lettering standard. We use the real one." },
  { icon: "check", label: "Hand inspected", desc: "Every order is checked before it leaves the studio." },
  { icon: "dispatch", label: "48 h dispatch", desc: "Worldwide tracked. Complimentary returns within 14 days." },
] as const;

function Icon({ name }: { name: string }) {
  if (name === "shield") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3Z" />
    </svg>
  );
  if (name === "grid") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
  if (name === "check") return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22V12M12 12 8 8M12 12l4-4M3 17l3-3m12 3-3-3" />
    </svg>
  );
}

export default function Atelier() {
  return (
    <main>
      {/* ── Hero ── */}
      <div className="atelier-hero">
        <span className="eyebrow">The Atelier</span>
        <h1 className="atelier-hero__headline">
          Made by hand.<br />
          Worn for life.
        </h1>
        <p className="atelier-hero__sub">
          Four steps from choosing your club to wearing a pitch-authentic jersey
          with your name on the back. No compromises at any stage.
        </p>

        {/* Credential pills */}
        <div className="atelier-hero__pills">
          {CREDENTIALS.map((c) => (
            <div key={c.label} className="atelier-hero__pill">
              <Icon name={c.icon} />
              {c.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Steps ── */}
      <div className="atelier-steps">
        <div className="atelier-steps__inner">
          <div className="atelier-steps__heading">The process</div>
          {STEPS.map((step) => (
            <div key={step.num} className="atelier-step">
              <div className="atelier-step__num">{step.num}</div>
              <div className="atelier-step__body">
                <div className="atelier-step__title">{step.title}</div>
                <p className="atelier-step__desc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Specifications ── */}
      <div className="atelier-specs" id="materials">
        <div className="atelier-specs__inner">
          <div>
            <span className="eyebrow">Materials &amp; methods</span>
            <h2 className="atelier-specs__headline">
              Every detail is<br />the right detail.
            </h2>
            <p className="atelier-specs__body">
              We don&apos;t offer every club because we won&apos;t cut corners on any
              of them. Our supplier relationships mean we have access to the
              genuine article — the fabric, the badge, the lettering — not a
              close approximation.
            </p>
            <p className="atelier-specs__body">
              The lettering film we use is the same grade used by the clubs&apos;
              official kit manufacturers. The patches are licensed, not replicas.
              The only variable is your name.
            </p>
          </div>
          <div className="atelier-spec-list" id="sizing">
            {SPECS.map((s) => (
              <div key={s.key} className="atelier-spec">
                <span className="atelier-spec__key">{s.key}</span>
                <span className="atelier-spec__val">{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="house-cta">
        <div className="house-cta__inner">
          <span className="eyebrow">Start here</span>
          <h2 className="house-cta__headline">Build your jersey.</h2>
          <Link href="/collections" className="house-cta__btn">
            View the Collection
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
