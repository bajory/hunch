"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useCart } from "./CartProvider";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?kind=club", label: "Clubs" },
  { href: "/shop?kind=national", label: "National" },
  { href: "/house", label: "The House" },
];

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [dark, setDark] = useState(false);
  const pathname = usePathname();
  const { count, openDrawer } = useCart();

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("hunch-theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <header className={`nav${solid ? " is-solid" : ""}`}>
      <nav className="nav__links" aria-label="Primary">
        {LINKS.map((l) => (
          <Link
            key={l.label}
            href={l.href}
            className={`nav__link${pathname === l.href && !l.href.includes("?") ? " is-active" : ""}`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <Link href="/" className="nav__brand" aria-label="HUNCH home">HUNCH</Link>

      <div className="nav__side">
        <button className="nav__theme" onClick={toggleTheme}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          title={dark ? "Light mode" : "Dark mode"}>
          {dark ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="4.2" />
              <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
            </svg>
          )}
        </button>
        <button className="nav__bag" onClick={openDrawer} aria-label={`Open bag, ${count} items`}>
          Bag
          <span className="nav__bag-count">{count}</span>
        </button>
      </div>
    </header>
  );
}
