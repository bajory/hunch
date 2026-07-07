import Link from "next/link";

const TILES = [
  {
    href: "/product/barcelona-home",
    kicker: "The Studio",
    title: "Pressed to your name.",
    sub: "Official typeface, real roster numbers — or your own name and number, exactly as it'd arrive from the club.",
    image: "/img/products/barcelona/home/back.png",
    size: "lg" as const,
  },
  {
    href: "/house",
    kicker: "The House",
    title: "What makes it authentic.",
    sub: "The sourcing story, in full.",
    image: "/img/products/real-madrid/home/back.png",
    size: "sm" as const,
  },
  {
    href: "/shop",
    kicker: "Everything",
    title: "The full collection.",
    sub: "60 jerseys, 26 clubs & nations.",
    image: "/img/products/man-city/home/front.png",
    size: "sm" as const,
  },
];

export function CategoryTiles() {
  return (
    <section className="tiles section" aria-label="Shop by category">
      <div className="wrap">
        <span className="microlabel microlabel--brass">Explore</span>
        <h2 className="section__title section__title--bold" style={{ marginTop: 12 }}>More ways in.</h2>
      </div>
      <div className="tiles__grid wrap">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className={`tiles__tile tiles__tile--${t.size}`} data-cursor="Enter">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.image} alt="" className="tiles__tile-img" loading="lazy" />
            <div className="tiles__tile-scrim" />
            <div className="tiles__tile-body">
              <span className="microlabel microlabel--brass">{t.kicker}</span>
              <h3 className="tiles__tile-title">{t.title}</h3>
              <p className="tiles__tile-sub">{t.sub}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
