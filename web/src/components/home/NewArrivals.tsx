import Link from "next/link";
import type { NewArrivalsContent } from "@/lib/site-content";

export function NewArrivals({ content }: { content: NewArrivalsContent }) {
  if (!content.items.length) return null;

  return (
    <section className="newin section" aria-label="What's new">
      <div className="wrap">
        <span className="microlabel microlabel--brass">Just landed</span>
        <h2 className="section__title section__title--bold" style={{ marginTop: 12 }}>What&rsquo;s new at HUNCH.</h2>
      </div>
      <div className="newin__grid">
        {content.items.map((item) => (
          <Link key={item.caption} href={item.href} className="newin__item" data-cursor="View">
            <span className="newin__frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.image} alt={item.caption} loading="lazy" />
            </span>
            <span className="newin__cap">{item.caption}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
