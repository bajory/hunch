"use server";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabase } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { invalidateCatalogCache } from "@/lib/cms";
import type { KitTypeId } from "./types";

export async function signOut() {
  const supabase = await createServerSupabase();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

function noAdmin() { return { ok: false as const, error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable saves" }; }

function revalidateTeam(teamId: string) {
  invalidateCatalogCache();
  revalidatePath(`/product/${teamId}-home`);
  revalidatePath(`/product/${teamId}-away`);
  revalidatePath("/shop");
}

// Supabase Storage serves objects with a long Cache-Control max-age. Uploads reuse a
// fixed path (so re-uploading replaces the same file), which means the URL never
// changes on update — browsers/CDNs keep serving the old cached image indefinitely.
// Appending a version query param forces every fresh upload to a new cache key.
function cacheBust(url: string): string {
  return `${url}?v=${Date.now()}`;
}

// target: "name" → font_name_url, "number" → font_number_url
export async function uploadFont(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const teamId  = formData.get("teamId") as string;
  const compId  = formData.get("competitionId") as string;
  const kitType = (formData.get("kitType") as KitTypeId) ?? "home";
  const target  = (formData.get("target") as string) ?? "name"; // "name" | "number"
  const file    = formData.get("file") as File;
  const ext     = file.name.split(".").pop() ?? "otf";
  const path    = `fonts/${teamId}/${compId}/${kitType}/${target}.${ext}`;
  const buf     = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from("patches").upload(path, buf, {
    contentType: file.type || "font/otf",
    upsert: true,
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data } = admin.storage.from("patches").getPublicUrl(path);
  const publicUrl = cacheBust(data.publicUrl);
  const col = target === "number" ? "font_number_url" : "font_name_url";
  const { error } = await admin
    .from("team_competition_kits")
    .update({ [col]: publicUrl })
    .eq("team_id", teamId).eq("competition_id", compId).eq("kit_type", kitType);
  if (error) return { ok: false, error: error.message };
  revalidateTeam(teamId);
  return { ok: true, url: publicUrl };
}

// view: "back" | "front" → back_photo_url / front_photo_url
export async function uploadPhoto(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const teamId  = formData.get("teamId") as string;
  const compId  = formData.get("competitionId") as string;
  const kitType = (formData.get("kitType") as KitTypeId) ?? "home";
  const view    = (formData.get("view") as string) ?? "back";
  const file    = formData.get("file") as File;
  const ext     = file.name.split(".").pop() ?? "jpg";
  const path    = `${teamId}/${kitType}/${compId}/${view}.${ext}`;
  const buf     = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from("jersey-photos").upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: true,
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data } = admin.storage.from("jersey-photos").getPublicUrl(path);
  const publicUrl = cacheBust(data.publicUrl);
  const col = view === "front" ? "front_photo_url" : "back_photo_url";
  // Back/front are the physical shirt for THIS kit type — identical across every
  // competition the kit type is entered in (a club's away shirt doesn't change
  // between league and cup), so write to every competition of this team+kitType.
  const { error } = await admin
    .from("team_competition_kits")
    .update({ [col]: publicUrl })
    .eq("team_id", teamId).eq("kit_type", kitType);
  if (error) return { ok: false, error: error.message };
  revalidateTeam(teamId);
  return { ok: true, url: publicUrl };
}

// Extra gallery shots beyond the primary front/back — same "shared shirt"
// reasoning as uploadPhoto: one physical kit, so the photo set is shared
// across every competition of this team+kitType.
export async function uploadGalleryImage(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const teamId  = formData.get("teamId") as string;
  const kitType = (formData.get("kitType") as KitTypeId) ?? "home";
  const file    = formData.get("file") as File;
  const ext     = file.name.split(".").pop() ?? "jpg";
  const path    = `${teamId}/${kitType}/gallery/${Date.now()}.${ext}`;
  const buf     = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from("jersey-photos").upload(path, buf, {
    contentType: file.type || "image/jpeg",
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data } = admin.storage.from("jersey-photos").getPublicUrl(path);
  const publicUrl = data.publicUrl;
  const { data: rows, error: fetchErr } = await admin
    .from("team_competition_kits")
    .select("id, gallery_urls")
    .eq("team_id", teamId).eq("kit_type", kitType);
  if (fetchErr) return { ok: false, error: fetchErr.message };
  for (const row of rows ?? []) {
    const next = [...((row.gallery_urls as string[] | null) ?? []), publicUrl];
    const { error } = await admin.from("team_competition_kits").update({ gallery_urls: next }).eq("id", row.id as string);
    if (error) return { ok: false, error: error.message };
  }
  revalidateTeam(teamId);
  return { ok: true, url: publicUrl };
}

export async function removeGalleryImage(teamId: string, kitType: KitTypeId, url: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { data: rows, error: fetchErr } = await admin
    .from("team_competition_kits")
    .select("id, gallery_urls")
    .eq("team_id", teamId).eq("kit_type", kitType);
  if (fetchErr) return { ok: false, error: fetchErr.message };
  for (const row of rows ?? []) {
    const next = ((row.gallery_urls as string[] | null) ?? []).filter((u) => u !== url);
    const { error } = await admin.from("team_competition_kits").update({ gallery_urls: next }).eq("id", row.id as string);
    if (error) return { ok: false, error: error.message };
  }
  revalidateTeam(teamId);
  return { ok: true };
}

export async function uploadPanelPatch(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const teamId  = formData.get("teamId") as string;
  const compId  = formData.get("competitionId") as string;
  const kitType = (formData.get("kitType") as KitTypeId) ?? "home";
  const file    = formData.get("file") as File;
  const ext     = file.name.split(".").pop() ?? "png";
  const path    = `${teamId}/${compId}/${kitType}/panel.${ext}`;
  const buf     = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from("patches").upload(path, buf, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data } = admin.storage.from("patches").getPublicUrl(path);
  const publicUrl = cacheBust(data.publicUrl);
  const { error } = await admin
    .from("team_competition_kits")
    .update({ panel_patch_url: publicUrl })
    .eq("team_id", teamId).eq("competition_id", compId).eq("kit_type", kitType);
  if (error) return { ok: false, error: error.message };
  revalidateTeam(teamId);
  return { ok: true, url: publicUrl };
}

// Sleeve patch geometry (sleeve_x/y/w) is calibrated separately via saveKitGeo —
// this only stores the image itself and its natural pixel size (for aspect ratio).
export async function uploadSleevePatch(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const teamId  = formData.get("teamId") as string;
  const compId  = formData.get("competitionId") as string;
  const kitType = (formData.get("kitType") as KitTypeId) ?? "home";
  const file    = formData.get("file") as File;
  const width   = parseInt(formData.get("width") as string, 10);
  const height  = parseInt(formData.get("height") as string, 10);
  const ext     = file.name.split(".").pop() ?? "png";
  const path    = `${teamId}/${compId}/${kitType}/sleeve.${ext}`;
  const buf     = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from("patches").upload(path, buf, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data } = admin.storage.from("patches").getPublicUrl(path);
  const publicUrl = cacheBust(data.publicUrl);
  const { error } = await admin
    .from("team_competition_kits")
    .update({ sleeve_patch_url: publicUrl, sleeve_patch_w: width, sleeve_patch_h: height })
    .eq("team_id", teamId).eq("competition_id", compId).eq("kit_type", kitType);
  if (error) return { ok: false, error: error.message };
  revalidateTeam(teamId);
  return { ok: true, url: publicUrl };
}

// Digit artwork is the competition's lettering typeface, not the kit variant —
// shared by every kit type of that competition, so it has no kit_type dimension.
export async function uploadGlyph(formData: FormData): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const teamId  = formData.get("teamId") as string;
  const compId  = formData.get("competitionId") as string;
  const kitType = (formData.get("kitType") as string) || "home";
  const digit   = formData.get("digit") as string;
  const file    = formData.get("file") as File;
  const width   = parseInt(formData.get("width") as string, 10);
  const height  = parseInt(formData.get("height") as string, 10);
  const path    = `${teamId}/${compId}/${kitType}/${digit}.svg`;
  const buf     = await file.arrayBuffer();
  const { error: upErr } = await admin.storage.from("number-glyphs").upload(path, buf, {
    contentType: "image/svg+xml",
    upsert: true,
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data } = admin.storage.from("number-glyphs").getPublicUrl(path);
  const publicUrl = cacheBust(data.publicUrl);
  const { error } = await admin.from("number_glyphs").upsert({
    team_id: teamId,
    competition_id: compId,
    kit_type: kitType,
    digit: parseInt(digit),
    svg_url: publicUrl,
    glyph_w: Number.isFinite(width) ? width : null,
    glyph_h: Number.isFinite(height) ? height : null,
  }, { onConflict: "team_id,competition_id,kit_type,digit" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, url: publicUrl };
}

// Which DB columns to clear per removable asset slot. Nulling the URL removes
// the asset from the storefront + admin preview; the storage object is left in
// place (harmless — re-upload overwrites it, and reads are cache-busted).
const REMOVE_COLUMNS: Record<string, Record<string, null>> = {
  back:          { back_photo_url: null },
  front:         { front_photo_url: null },
  panel:         { panel_patch_url: null },
  sleeve:        { sleeve_patch_url: null, sleeve_patch_w: null, sleeve_patch_h: null },
  "name-font":   { font_name_url: null },
  "number-font": { font_number_url: null },
};

export async function removeAsset(
  teamId: string, compId: string, target: keyof typeof REMOVE_COLUMNS, kitType: KitTypeId = "home",
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const patch = REMOVE_COLUMNS[target];
  if (!patch) return { ok: false, error: `Unknown asset "${target}"` };
  // Back/front are shared across the club's competitions for this kit type, so
  // removal clears every competition of it. Patches/fonts are per-kit-row only.
  const shared = target === "back" || target === "front";
  let q = admin.from("team_competition_kits").update(patch).eq("team_id", teamId).eq("kit_type", kitType);
  if (!shared) q = q.eq("competition_id", compId);
  const { error } = await q;
  if (error) return { ok: false, error: error.message };
  revalidateTeam(teamId);
  return { ok: true };
}

// Lettering "styling" that can cascade from one kit row to another. Photos,
// patches, sleeve geometry and publish state are excluded — only the look
// (geometry, colours, fonts, number mode) travels, and stays overridable.
const STYLING_COLUMNS = [
  "name_cy", "name_span", "name_arc", "name_size", "name_tracking",
  "number_cy", "number_size", "number_glyph_gap", "number_mode",
  "name_fill", "name_stroke", "number_fill", "number_stroke",
  "font_name_url", "font_number_url",
] as const;

// The physical shirt stills for a kit type, shared by every competition it's entered in.
const SHARED_PHOTO_COLUMNS = ["back_photo_url", "front_photo_url"] as const;

type KitLike = Record<string, unknown>;
function pickStyling(src: KitLike): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of STYLING_COLUMNS) out[c] = src[c] ?? null;
  return out;
}
function pickSharedPhotos(src: KitLike): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of SHARED_PHOTO_COLUMNS) out[c] = src[c] ?? null;
  return out;
}

// Digit glyphs go hand-in-hand with number_mode="svg_glyphs"; copy them by
// reference (same storage URLs) so an inherited glyph kit renders immediately.
// Each kit type now gets its own independent set of glyph rows.
async function copyGlyphs(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  teamId: string,
  fromComp: string, fromKitType: KitTypeId,
  toComp: string, toKitType: KitTypeId,
) {
  if (fromComp === toComp && fromKitType === toKitType) return;
  const { data: rows } = await admin.from("number_glyphs")
    .select("digit,svg_url,glyph_w,glyph_h")
    .eq("team_id", teamId).eq("competition_id", fromComp).eq("kit_type", fromKitType);
  await admin.from("number_glyphs").delete()
    .eq("team_id", teamId).eq("competition_id", toComp).eq("kit_type", toKitType);
  if (rows?.length) {
    await admin.from("number_glyphs").insert(
      rows.map((r) => ({ ...r, team_id: teamId, competition_id: toComp, kit_type: toKitType })),
    );
  }
}

/** Inserts a kit row for (team, competition, kitType), inheriting styling from
    the club's best-matching existing kit, then opens its editor. */
export async function createKitAndGo(formData: FormData) {
  const teamId = formData.get("teamId") as string;
  const competitionId = formData.get("competitionId") as string;
  const kitType = (formData.get("kitType") as KitTypeId) ?? "home";
  const admin = createAdminClient();
  if (admin) {
    const { data: rows } = await admin.from("team_competition_kits")
      .select("*").eq("team_id", teamId);
    const all = (rows ?? []).filter((k) => !(k.competition_id === competitionId && k.kit_type === kitType));
    // Prefer a sibling of the SAME kit type (an away kit should look like the
    // club's other away kits, not borrow home's colours) before falling back
    // to any calibrated sibling at all.
    const sameKitType = all.filter((k) => k.kit_type === kitType);
    const source = sameKitType.find((k) => k.name_fill) ?? all.find((k) => k.name_fill) ?? all[0] ?? null;
    const photoSource = sameKitType.find((k) => k.back_photo_url || k.front_photo_url)
      ?? all.find((k) => k.back_photo_url || k.front_photo_url) ?? null;
    await admin.from("team_competition_kits").insert({
      team_id: teamId, competition_id: competitionId, kit_type: kitType, is_published: false,
      ...(photoSource ? pickSharedPhotos(photoSource) : {}),
      ...(source ? pickStyling(source) : {}),
    });
    if (source) await copyGlyphs(admin, teamId, source.competition_id, source.kit_type ?? "home", competitionId, kitType);
    invalidateCatalogCache();
  }
  redirect(`/admin/kits/${teamId}/${competitionId}/${kitType}`);
}

/** Copies lettering styling (and glyphs) from a sibling kit row onto this one. */
export async function inheritStyling(
  teamId: string,
  target: { comp: string; kitType: KitTypeId },
  source: { comp: string; kitType: KitTypeId },
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { data: src, error: e } = await admin
    .from("team_competition_kits").select("*")
    .eq("team_id", teamId).eq("competition_id", source.comp).eq("kit_type", source.kitType).single();
  if (e || !src) return { ok: false, error: e?.message ?? "Source kit not found" };
  const { error } = await admin
    .from("team_competition_kits").update(pickStyling(src))
    .eq("team_id", teamId).eq("competition_id", target.comp).eq("kit_type", target.kitType);
  if (error) return { ok: false, error: error.message };
  await copyGlyphs(admin, teamId, source.comp, source.kitType, target.comp, target.kitType);
  revalidateTeam(teamId);
  return { ok: true };
}

// ─── Roster (squad players) ──────────────────────────────────
// Team-level: the personalisation studio's "Squad Player" presets.

export async function addRosterPlayer(
  teamId: string, name: string, number: number, sortOrder: number,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { data, error } = await admin.from("roster_players")
    .insert({ team_id: teamId, name: name.trim(), number, sort_order: sortOrder })
    .select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidateTeam(teamId);
  return { ok: true, id: data.id as string };
}

export async function updateRosterPlayer(
  id: string, teamId: string, name: string, number: number,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { error } = await admin.from("roster_players")
    .update({ name: name.trim(), number }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTeam(teamId);
  return { ok: true };
}

export async function removeRosterPlayer(
  id: string, teamId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { error } = await admin.from("roster_players").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTeam(teamId);
  return { ok: true };
}

export async function setNumberMode(
  teamId: string, compId: string, mode: "font" | "svg_glyphs", kitType: KitTypeId = "home",
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return noAdmin();
  const { error } = await admin
    .from("team_competition_kits")
    .update({ number_mode: mode })
    .eq("team_id", teamId).eq("competition_id", compId).eq("kit_type", kitType);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function saveKitGeo(
  teamId: string,
  competitionId: string,
  patch: Record<string, number | string | null>,
  kitType: KitTypeId = "home",
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable saves" };
  const { error } = await admin
    .from("team_competition_kits")
    .update(patch)
    .eq("team_id", teamId).eq("competition_id", competitionId).eq("kit_type", kitType);
  if (error) return { ok: false, error: error.message };
  revalidateTeam(teamId);
  return { ok: true };
}

export async function setKitPublished(
  teamId: string,
  competitionId: string,
  published: boolean,
  kitType: KitTypeId = "home",
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Add SUPABASE_SERVICE_ROLE_KEY to .env.local to enable saves" };
  const { error } = await admin
    .from("team_competition_kits")
    .update({ is_published: published })
    .eq("team_id", teamId).eq("competition_id", competitionId).eq("kit_type", kitType);
  if (error) return { ok: false, error: error.message };
  revalidateTeam(teamId);
  return { ok: true };
}
