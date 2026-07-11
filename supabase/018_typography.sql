-- ============================================================
-- Site-wide typography, admin-controlled — which of the curated
-- font presets (lib/fonts.ts) is currently live for the display
-- serif and the UI sans. Additive to 011_site_content.sql's
-- site_content table.
-- ============================================================

insert into site_content (section, data) values
  ('typography', '{ "serifId": "merriweather", "sansId": "merriweather-sans" }')
on conflict (section) do nothing;
