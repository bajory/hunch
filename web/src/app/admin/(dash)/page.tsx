import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";
import { supabase } from "@/lib/supabase";
import { PRODUCT_TYPE_DEFS } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Overview — HUNCH Admin" };

interface ProductStatRow { product_type: string; status: string; is_published: boolean }
interface KitStatRow { is_published: boolean }

export default async function OverviewPage() {
  const db = createAdminClient() ?? supabase;

  let products: ProductStatRow[] = [];
  let kits: KitStatRow[] = [];
  let teamCount = 0;

  if (db) {
    const [{ data: p }, { data: k }, { count: t }] = await Promise.all([
      db.from("products").select("product_type,status,is_published"),
      db.from("team_competition_kits").select("is_published"),
      db.from("teams").select("id", { count: "exact", head: true }),
    ]);
    products  = (p as ProductStatRow[]) ?? [];
    kits      = (k as KitStatRow[]) ?? [];
    teamCount = t ?? 0;
  }

  const live = products.filter((p) => p.is_published && p.status !== "archived");
  const drafts = products.filter((p) => !p.is_published && p.status !== "archived");
  const archived = products.filter((p) => p.status === "archived");
  const byType = PRODUCT_TYPE_DEFS
    .map((d) => ({ def: d, count: live.filter((p) => p.product_type === d.id).length }))
    .filter((x) => x.count > 0);
  const publishedKits = kits.filter((k) => k.is_published).length;

  const SECTIONS = [
    {
      href: "/admin/products", title: "Products",
      sub: "Catalog, pricing, stock & imagery for every sellable item.",
      stat: products.length ? `${live.length} live · ${drafts.length} draft${archived.length ? ` · ${archived.length} archived` : ""}` : "Run 014_products.sql to enable",
    },
    {
      href: "/admin/studio", title: "Kit Studio",
      sub: "Calibrate jersey photography, lettering, patches & glyphs.",
      stat: `${publishedKits} published kit${publishedKits === 1 ? "" : "s"} · ${kits.length - publishedKits} in progress`,
    },
    {
      href: "/admin/teams", title: "Clubs & Squads",
      sub: "Team visibility and squad rosters for the personalisation studio.",
      stat: `${teamCount} team${teamCount === 1 ? "" : "s"}`,
    },
    {
      href: "/admin/content", title: "Homepage",
      sub: "Hero slides, category tiles, highlights and campaign copy.",
      stat: "Images, video & copy",
    },
  ];

  return (
    <div className="adm-overview">
      <div className="adm-overview__head">
        <h1>Overview</h1>
        <p>Everything the storefront sells and shows, in one place.</p>
      </div>

      {byType.length > 0 && (
        <div className="adm-stats">
          {byType.map(({ def, count }) => (
            <Link key={def.id} href={`/admin/products?type=${def.id}`} className="adm-stat">
              <b>{count}</b>
              <span>{def.plural} live</span>
            </Link>
          ))}
        </div>
      )}

      <div className="adm-sections">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="adm-sectioncard">
            <div className="adm-sectioncard__top">
              <h2>{s.title}</h2>
              <span aria-hidden="true">→</span>
            </div>
            <p>{s.sub}</p>
            <span className="adm-sectioncard__stat">{s.stat}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
