"use server";
import { createAdminClient } from "@/lib/supabase-admin";
import { syncProductToShopify } from "@/lib/shopify-sync";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { AdminProductRow } from "./types";

function noAdmin() { return { ok: false as const, error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable saves" }; }

// Storage serves objects with a long max-age; uploads reuse a fixed path, so
// a version param forces every fresh upload to a new cache key (house pattern).
function cacheBust(url: string): string {
  return `${url}?v=${Date.now()}`;
}

function revalidateProduct(slug: string) {
  revalidateTag("products", { expire: 0 });
  revalidatePath(`/product/${slug}`);
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/admin/products");
}

const SLUG_RE = /^[a-z0-9-]+$/;

/** Columns a client is allowed to write — everything else is server-owned.
    price and sizes stay writable here (a brand-new product needs them set
    before it can even be synced to Shopify the first time), but updateProduct
    strips them from the patch once a product has a shopify_product_id —
    from that point on Shopify owns those two and pushes changes in via the
    webhook handler, so a stale admin form can no longer clobber or race it. */
const WRITABLE = [
  "name", "team_id", "product_type", "kit_type", "season", "edition",
  "price", "status", "customizable", "sizes", "sort_order",
] as const;
type WritablePatch = Partial<Pick<AdminProductRow, (typeof WRITABLE)[number]>>;

function pickWritable(input: WritablePatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const col of WRITABLE) {
    if (col in input) out[col] = input[col as keyof WritablePatch];
  }
  // Non-jersey products can't carry a kit type — it exists purely for the
  // calibration join, which is jersey-only.
  if (out.product_type && out.product_type !== "jersey") out.kit_type = null;
  return out;
}

export async function createProduct(
  slug: string, input: WritablePatch,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  if (!SLUG_RE.test(slug)) return { ok: false, error: "Slug must be lowercase letters, numbers and dashes only" };
  const { error } = await admin.from("products").insert({ slug, ...pickWritable(input) });
  if (error) return { ok: false, error: error.message };
  revalidateProduct(slug);
  redirect(`/admin/products/${slug}`);
}

export async function updateProduct(
  slug: string, input: WritablePatch,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { data: existing } = await admin.from("products").select("shopify_product_id").eq("slug", slug).maybeSingle();
  const patch = pickWritable(input);
  if (existing?.shopify_product_id) {
    delete patch.price;
    delete patch.sizes;
  }
  const { error } = await admin.from("products").update(patch).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateProduct(slug);
  return { ok: true };
}

/** Creates the Shopify counterpart for a product that doesn't have one yet —
    seeds price/stock from whatever's currently in Supabase. A no-op if the
    product is already synced (syncProductToShopify's own idempotency check). */
export async function createInShopify(slug: string): Promise<{ ok: boolean; error?: string }> {
  const result = await syncProductToShopify(slug);
  revalidateProduct(slug);
  return result;
}

export async function setProductPublished(
  slug: string, published: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { error } = await admin.from("products").update({ is_published: published }).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateProduct(slug);
  return { ok: true };
}

/** Soft delete: keeps the row (and its imagery) but pulls it from the storefront. */
export async function archiveProduct(slug: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { error } = await admin.from("products").update({ status: "archived" }).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateProduct(slug);
  return { ok: true };
}

/** Hard delete — the editor confirms first; archive is the default path. */
export async function deleteProduct(slug: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { error } = await admin.from("products").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateProduct(slug);
  redirect("/admin/products");
}

// target: "front" | "back" | "gallery" — front/back replace in place, gallery appends.
export async function uploadProductImage(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const slug   = formData.get("slug") as string;
  const target = (formData.get("target") as string) ?? "front";
  const file   = formData.get("file") as File;
  if (!SLUG_RE.test(slug)) return { ok: false, error: "Bad slug" };
  const ext = file.name.split(".").pop() ?? "png";
  const path = target === "gallery"
    ? `products/${slug}/gallery/${Date.now()}.${ext}`
    : `products/${slug}/${target}.${ext}`;
  const buf = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from("jersey-photos").upload(path, buf, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data } = admin.storage.from("jersey-photos").getPublicUrl(path);
  const publicUrl = target === "gallery" ? data.publicUrl : cacheBust(data.publicUrl);

  const { data: row, error: fetchErr } = await admin
    .from("products").select("images").eq("slug", slug).single();
  if (fetchErr) return { ok: false, error: fetchErr.message };
  const images = (row?.images as AdminProductRow["images"]) ?? {};
  if (target === "gallery") {
    images.gallery = [...(images.gallery ?? []), publicUrl];
  } else {
    images[target as "front" | "back"] = publicUrl;
    images.source ??= "studio";
  }
  const { error } = await admin.from("products").update({ images }).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateProduct(slug);
  return { ok: true, url: publicUrl };
}

// target "back" clears the back photo; a gallery url removes that one entry.
export async function removeProductImage(
  slug: string, target: "back" | "gallery", url?: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { data: row, error: fetchErr } = await admin
    .from("products").select("images").eq("slug", slug).single();
  if (fetchErr) return { ok: false, error: fetchErr.message };
  const images = (row?.images as AdminProductRow["images"]) ?? {};
  if (target === "back") delete images.back;
  else images.gallery = (images.gallery ?? []).filter((u) => u !== url);
  const { error } = await admin.from("products").update({ images }).eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateProduct(slug);
  return { ok: true };
}

/** Form action for the Clubs & Squads page — flips a team's storefront visibility. */
export async function toggleTeamPublished(formData: FormData): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const teamId = formData.get("teamId") as string;
  const publish = formData.get("publish") === "true";
  await admin.from("teams").update({ is_published: publish }).eq("id", teamId);
  revalidateTag("products", { expire: 0 }); // products join teams for name/kind/league
  revalidatePath("/admin/teams");
  revalidatePath("/shop");
  revalidatePath("/");
}
