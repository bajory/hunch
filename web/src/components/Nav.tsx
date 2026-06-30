"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "./CartProvider";

export function Nav() {
  const { count, openDrawer } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav${scrolled ? " is-scrolled" : ""}`}>
      <nav className="nav__links" aria-label="Primary">
        <Link href="/atelier">Atelier</Link>
        <Link href="/collections">Collections</Link>
        <Link href="/the-house">The House</Link>
      </nav>

      <Link className="nav__brand" href="/" aria-label="HUNCH home">
        HUNCH
      </Link>

      <div className="nav__right">
        <button className="nav__icon" aria-label="Search">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
        </button>
        <button
          className="nav__icon nav__bag"
          aria-label={`Bag${count > 0 ? `, ${count} item${count !== 1 ? "s" : ""}` : ""}`}
          onClick={openDrawer}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
            <path d="M6 8h12l-1 12H7L6 8Z" />
            <path d="M9 8a3 3 0 0 1 6 0" />
          </svg>
          {count > 0 && <span className="nav__bag-count">{count}</span>}
        </button>
      </div>
    </header>
  );
}
