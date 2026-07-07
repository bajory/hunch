-- Kit-level lettering color overrides
-- When null, the storefront falls back to teams.kit_league_fill / kit_ucl_fill

ALTER TABLE team_competition_kits
  ADD COLUMN IF NOT EXISTS name_fill   text,
  ADD COLUMN IF NOT EXISTS name_stroke text,
  ADD COLUMN IF NOT EXISTS number_fill   text,
  ADD COLUMN IF NOT EXISTS number_stroke text;
