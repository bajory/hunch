-- ============================================================
-- Extra gallery photos per kit (beyond the primary front/back).
-- Shared across every competition of the same team+kit_type, same
-- reasoning as back_photo_url/front_photo_url: it's the same physical
-- shirt regardless of which competition it's calibrated for.
-- ============================================================

alter table team_competition_kits
  add column if not exists gallery_urls text[] not null default '{}';
