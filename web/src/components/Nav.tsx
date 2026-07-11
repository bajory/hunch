"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun, ShoppingBag, Menu as MenuIcon, X } from "lucide-react";
import { useCart } from "./CartProvider";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?kind=club", label: "Clubs" },
  { href: "/shop?kind=national", label: "National Teams" },
  { href: "/house", label: "The House" },
];

export function Nav() {
  const [solid, setSolid] = useState(false);
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Close the menu on route change, lock page scroll while it's open, and
  // let Escape close it — the same conventions the cart drawer would want.
  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("hunch-theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <>
      <header className={`nav${solid ? " is-solid" : ""}`}>
        <a href="/house" className="nav__utility">
          <span className="nav__utility-plus">+</span> Contact Us
        </a>

        <Link href="/" className="nav__brand" aria-label="HUNCH home">
          <Logo className="nav__logo" />
        </Link>

        <div className="nav__side">
          <button className="nav__icon" onClick={toggleTheme}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}>
            {dark ? <Moon size={19} strokeWidth={1.6} /> : <Sun size={19} strokeWidth={1.6} />}
          </button>

          <button className="nav__icon nav__icon--bag" onClick={openDrawer} aria-label={`Open bag, ${count} items`}>
            <ShoppingBag size={19} strokeWidth={1.6} />
            {count > 0 && <span className="nav__bag-count">{count}</span>}
          </button>

          <button className="nav__menubtn" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen}>
            <MenuIcon size={19} strokeWidth={1.7} />
            <span>Menu</span>
          </button>
        </div>
      </header>

      <div className={`menuveil${menuOpen ? " is-open" : ""}`} onClick={() => setMenuOpen(false)} aria-hidden="true" />
      <aside className={`menu${menuOpen ? " is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Menu">
        <button className="menu__close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
          <X size={16} strokeWidth={1.8} />
        </button>

        <nav className="menu__links" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className={`menu__link${pathname === l.href && !l.href.includes("?") ? " is-active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="menu__foot">
          <a href="/house" className="menu__foot-link">Contact Us</a>
        </div>
      </aside>
    </>
  );
}
