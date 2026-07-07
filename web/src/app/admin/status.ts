import type { KitRow } from "./types";

export interface KitStatus {
  exists: boolean;
  isPublished: boolean;
  hasPhoto: boolean;
  hasSleeve: boolean;
  hasColors: boolean;
  hasGlyphs: boolean;
  missing: string[];
}

/** Single source of truth for "what counts as a finished kit" — used by both the dashboard cards and the kit editor's own checklist. */
export function computeKitStatus(kit: KitRow | null, glyphCount: number): KitStatus {
  if (!kit) {
    return {
      exists: false, isPublished: false, hasPhoto: false, hasSleeve: false, hasColors: false, hasGlyphs: false,
      missing: ["Not created"],
    };
  }
  const isGlyphMode = kit.number_mode === "svg_glyphs";
  const hasPhoto  = !!kit.back_photo_url;
  const hasSleeve = !!kit.sleeve_patch_url;
  const hasColors = !!kit.name_fill && !!kit.number_fill;
  const hasGlyphs = !isGlyphMode || glyphCount >= 10;

  const missing: string[] = [];
  if (!hasPhoto) missing.push("No back photo");
  if (!hasColors) missing.push("Colors not set");
  if (isGlyphMode && !hasGlyphs) missing.push(`${glyphCount}/10 digit glyphs`);

  return { exists: true, isPublished: !!kit.is_published, hasPhoto, hasSleeve, hasColors, hasGlyphs, missing };
}
