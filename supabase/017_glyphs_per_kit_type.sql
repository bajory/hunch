-- ============================================================
-- Per-kit-type number glyphs: different kit variants (home,
-- retro, special …) within the same team+competition can now
-- carry independent digit artwork. Previously glyphs were keyed
-- by (team_id, competition_id, digit) only, so editing one
-- variant's glyphs silently overwrote every other variant's.
--
-- Existing rows default to 'home' — fully backward compatible.
-- ============================================================

-- 1. Add the kit_type column (defaults to 'home' for existing rows)
alter table number_glyphs
  add column if not exists kit_type text not null default 'home';

-- 2. Drop the old unique constraint (team_id, competition_id, digit)
alter table number_glyphs
  drop constraint if exists number_glyphs_team_id_competition_id_digit_key;

-- 3. Add the new unique constraint that includes kit_type
alter table number_glyphs
  add constraint number_glyphs_team_comp_kit_digit_key
    unique (team_id, competition_id, kit_type, digit);
