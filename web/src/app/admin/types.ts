export type KitTypeId = "home" | "away" | "third" | "fourth" | "retro" | "special";
export const KIT_TYPES: KitTypeId[] = ["home", "away", "third", "fourth", "retro", "special"];
export const KIT_TYPE_LABEL: Record<KitTypeId, string> = {
  home: "Home", away: "Away", third: "Third", fourth: "Fourth",
  retro: "Retro", special: "Special",
};

export interface KitRow {
  team_id: string;
  competition_id: string;
  kit_type: KitTypeId;
  is_published: boolean;
  back_photo_url: string | null;
  front_photo_url: string | null;
  gallery_urls: string[];
  panel_patch_url: string | null;
  sleeve_patch_url: string | null;
  sleeve_x: number | null;
  sleeve_y: number | null;
  sleeve_w: number | null;
  sleeve_patch_w: number | null;
  sleeve_patch_h: number | null;
  sleeve_rotation: number | null;
  name_cy: number | null;
  name_span: number | null;
  name_arc: number | null;
  name_size: number | null;
  name_tracking: number | null;
  number_cy: number | null;
  number_size: number | null;
  number_glyph_gap: number | null;
  number_mode: string | null;
  font_name_url: string | null;
  font_number_url: string | null;
  name_fill: string | null;
  name_stroke: string | null;
  number_fill: string | null;
  number_stroke: string | null;
}

export interface GlyphRow {
  team_id: string;
  competition_id: string;
  kit_type: KitTypeId;
  digit: number;
  svg_url: string;
  glyph_w: number | null;
  glyph_h: number | null;
}

export interface TeamRow {
  id: string;
  name: string;
  league_id: string | null;
  team_kind: "club" | "national";
  kit_league_fill: string | null;
  kit_league_stroke: string | null;
  kit_ucl_fill: string | null;
}

/** Full admin-side products row (the storefront reads a published subset via lib/products-db.ts). */
export interface AdminProductRow {
  slug: string;
  team_id: string | null;
  name: string;
  product_type: string;
  kit_type: KitTypeId | null;
  season: string;
  edition: string;
  price: number;
  status: "available" | "coming_soon" | "archived";
  customizable: boolean;
  sizes: Record<string, number>;
  images: { front?: string; back?: string; gallery?: string[]; source?: string };
  sort_order: number;
  is_published: boolean;
}

export interface RosterRow {
  id: string;
  team_id: string;
  name: string;
  number: number;
  sort_order: number;
}

export interface CompRow {
  id: string;
  label: string;
  kind: string;
  font_family: string | null;
  name_weight: number | null;
  number_weight: number | null;
  tracking: string | null;
}
