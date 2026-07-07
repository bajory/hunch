import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase-admin";
import { ProductEditor } from "../../../ProductEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New Product — HUNCH Admin" };

export default async function NewProductPage() {
  const admin = createAdminClient();
  const { data: teams } = admin
    ? await admin.from("teams").select("id,name,team_kind,league_id").order("name")
    : { data: [] };

  return (
    <div className="adm-page">
      <ProductEditor mode="create" teams={(teams as { id: string; name: string; team_kind: "club" | "national"; league_id: string | null }[]) ?? []} />
    </div>
  );
}
