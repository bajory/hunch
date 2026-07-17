import Link from "next/link";
import type { HighlightsContent } from "@/lib/site-content";

export function Highlights({ content }: { content: HighlightsContent }) {
  if (!content.items.length) return null;

  return (
    <section className="hl section" aria-label="Highlights">
      <div className="wrap">
        <span className="microlabel microlabel--brass">Catch the highlights</span>
        <h2 className="section__title section__title--bold" style={{ marginTop: 12 }}>Stories from the terrace.</h2>
      </div>
      <div className="hl__scroller">
        <div className="hl__strip">
          {content.items.map((h) => (
            <Link key={h.title} href={h.href} className="hl__card" data-cursor="Watch">
              {h.video ? (
                <video src={h.video} poster={h.image} muted loop autoPlay playsInline aria-label={h.title} className="hl__media" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.image} alt={h.title} loading="lazy" className="hl__media" />
              )}
              <div className="hl__scrim" />
              <span className="hl__play" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
              <span className="hl__title">{h.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
