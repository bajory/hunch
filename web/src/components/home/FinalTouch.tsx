import Link from "next/link";

const TILES = [
  {
    href: "/shop",
    title: "Customize Your Jersey",
    sub: "Add your name, favorite player or your own number using official-style customization.",
    cta: "Personalize Your Jersey",
    image: "/img/final-touch/final-touch-customize.jpg",
  },
  {
    href: "/house",
    title: "Signature Presentation",
    sub: "Every HUNCH order is carefully presented in our premium magnetic gift box for an unforgettable unboxing experience.",
    cta: "Explore Packaging",
    image: "/img/final-touch/final-touch-packaging.jpg",
  },
  {
    href: "/house",
    title: "Personal Message",
    sub: "Include a personal note inside your order to make every gift — or every purchase — more meaningful.",
    cta: "Add Your Message",
    image: "/img/final-touch/final-touch-message.jpg",
  },
];

export function FinalTouch() {
  return (
    <section className="finaltouch section" aria-label="The Final Touch">
      <div className="wrap">
        <span className="microlabel microlabel--brass">The Final Touch</span>
        <h2 className="section__title section__title--bold" style={{ marginTop: 12 }}>
          Make it special
        </h2>
      </div>
      <div className="finaltouch__grid">
        {TILES.map((t) => (
          <Link key={t.title} href={t.href} className="finaltouch__tile" data-cursor="Enter">
            <div className="finaltouch__tile-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.image} alt="" className="finaltouch__tile-img" loading="lazy" />
            </div>
            <div className="finaltouch__tile-body">
              <h3 className="finaltouch__tile-title">{t.title}</h3>
              <p className="finaltouch__tile-sub">{t.sub}</p>
              <span className="finaltouch__tile-cta">{t.cta}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
