import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";
import { ProductsTable } from "../../ProductsTable";
import type { AdminProductRow } from "../../types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products — HUNCH Admin" };

interface Props {
  searchParams: Promise<{ type?: string }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const { type } = await searchParams;
  const admin = createAdminClient();

  if (!admin) {
    return (
      <div className="adm-page">
        <div className="adm-table__empty">Add SUPABASE_SERVICE_ROLE_KEY to .env.local to manage products.</div>
      </div>
    );
  }

  const [{ data: products }, { data: teams }] = await Promise.all([
    admin.from("products").select("*").order("sort_order"),
    admin.from("teams").select("id,name"),
  ]);
  const rows = (products as AdminProductRow[]) ?? [];
  const teamNames = Object.fromEntries(((teams as { id: string; name: string }[]) ?? []).map((t) => [t.id, t.name]));

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <h1>Products</h1>
        <Link href="/admin/products/new" className="adm-newbtn">+ New product</Link>
      </div>
      {rows.length === 0 ? (
        <div className="adm-table__empty">
          No products yet. Run <code>014_products.sql</code> in the Supabase SQL Editor to create the table
          and seed the current jersey catalog — or add your first product.
        </div>
      ) : (
        <ProductsTable products={rows} teamNames={teamNames} initialType={type ?? "all"} />
      )}
    </div>
  );
}
