import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";
import { ProductEditor } from "../../../ProductEditor";
import type { AdminProductRow } from "../../../types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slug} — HUNCH Admin` };
}

export default async function EditProductPage({ params }: Props) {
  const { slug } = await params;
  const admin = createAdminClient();
  if (!admin) notFound();

  const [{ data: product }, { data: teams }] = await Promise.all([
    admin.from("products").select("*").eq("slug", slug).single(),
    admin.from("teams").select("id,name,team_kind,league_id").order("name"),
  ]);
  if (!product) notFound();

  return (
    <div className="adm-page">
      <ProductEditor
        mode="edit"
        initial={product as AdminProductRow}
        teams={(teams as { id: string; name: string; team_kind: "club" | "national"; league_id: string | null }[]) ?? []}
      />
    </div>
  );
}
