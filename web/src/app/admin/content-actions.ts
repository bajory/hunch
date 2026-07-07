"use server";
import { createAdminClient } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import type { SiteContent } from "@/lib/site-content";

function noAdmin() { return { ok: false as const, error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable saves" }; }

export async function saveSiteContent(
  section: keyof SiteContent, data: SiteContent[keyof SiteContent],
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { error } = await admin.from("site_content").upsert({ section, data, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/** Uploads an image for a homepage content section and returns its public URL —
    the caller is responsible for folding the URL into that section's saved data. */
export async function uploadSiteImage(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const section = formData.get("section") as string;
  const field   = formData.get("field") as string;
  const file    = formData.get("file") as File;
  const ext     = file.name.split(".").pop() ?? "jpg";
  const path    = `site/${section}/${field}.${ext}`;
  const buf     = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from("jersey-photos").upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data } = admin.storage.from("jersey-photos").getPublicUrl(path);
  return { ok: true, url: `${data.publicUrl}?v=${Date.now()}` };
}

/** Same as uploadSiteImage but for looping background video (e.g. the hero). */
export async function uploadSiteVideo(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const section = formData.get("section") as string;
  const field   = formData.get("field") as string;
  const file    = formData.get("file") as File;
  const ext     = file.name.split(".").pop() ?? "mp4";
  const path    = `site/${section}/${field}.${ext}`;
  const buf     = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from("jersey-photos").upload(path, buf, {
    contentType: file.type || "video/mp4",
    upsert: true,
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data } = admin.storage.from("jersey-photos").getPublicUrl(path);
  return { ok: true, url: `${data.publicUrl}?v=${Date.now()}` };
}
