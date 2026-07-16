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

/** Videos don't go through this server action at all — Vercel hard-caps every
    Function's request body at 4.5MB (not configurable, unaffected by
    next.config's serverActions.bodySizeLimit, which only ever applied
    locally), and any real video clip exceeds that. Instead this hands back
    a short-lived signed upload URL + the eventual public URL; the browser
    PUTs the actual video bytes straight to Supabase Storage, never touching
    a Vercel Function. See VideoField's handleFile in ContentEditor.tsx. */
export async function createSignedVideoUploadUrl(
  section: string, field: string, ext: string,
): Promise<{ ok: boolean; signedUrl?: string; token?: string; path?: string; publicUrl?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const path = `site/${section}/${field}.${ext}`;
  const { data, error } = await admin.storage.from("jersey-photos").createSignedUploadUrl(path, { upsert: true });
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create upload URL" };
  const { data: pub } = admin.storage.from("jersey-photos").getPublicUrl(path);
  return { ok: true, signedUrl: data.signedUrl, token: data.token, path, publicUrl: `${pub.publicUrl}?v=${Date.now()}` };
}

const FONT_MIME: Record<string, string> = {
  woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf",
};

/** Uploads a custom brand font file (woff2/woff/ttf/otf) for the "serif" or
    "sans" slot — the caller folds the returned URL into typography.customSerifUrl
    / customSansUrl. Re-uploading the same slot replaces the file in place. */
export async function uploadSiteFont(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const slot = formData.get("slot") as string; // "serif" | "sans"
  const file = formData.get("file") as File;
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  if (!(ext in FONT_MIME)) return { ok: false, error: "Use a .woff2, .woff, .ttf, or .otf file" };
  const path = `site/fonts/${slot}.${ext}`;
  const buf = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from("jersey-photos").upload(path, buf, {
    contentType: FONT_MIME[ext],
    upsert: true,
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data } = admin.storage.from("jersey-photos").getPublicUrl(path);
  return { ok: true, url: `${data.publicUrl}?v=${Date.now()}` };
}
