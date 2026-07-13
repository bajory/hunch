"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/studio", label: "Kit Studio" },
  { href: "/admin/teams", label: "Clubs & Squads" },
  { href: "/admin/content", label: "Homepage" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <aside className="adm-side">
      <Link href="/admin" className="adm-logo adm-side__logo">
        HUNCH<span className="adm-logo__sub"> / Admin</span>
      </Link>
      <nav className="adm-side__nav" aria-label="Admin sections">
        {LINKS.map((l) => {
          const on = l.exact ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={`adm-side__link${on ? " is-on" : ""}`}>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="adm-side__foot">
        <a href="/" target="_blank" rel="noreferrer" className="adm-side__link">Storefront ↗</a>
      </div>
    </aside>
  );
}
