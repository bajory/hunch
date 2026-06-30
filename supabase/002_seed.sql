-- ============================================================
-- HUNCH — seed data (Barcelona + Real Madrid)
-- Run after 001_schema.sql
-- ============================================================

-- ─── competitions ───────────────────────────────────────────

insert into competitions (id, label, kind, governing_body, font_family, name_weight, number_weight, tracking, uppercase, sort_order) values
  ('laliga',     'La Liga',               'league',      'RFEF', 'var(--font-saira), sans-serif',    600, 700, '0.06em', true, 1),
  ('premier',    'Premier League',        'league',      'PL',   'var(--font-archivo), sans-serif',  700, 800, '0.01em', true, 2),
  ('seriea',     'Serie A',               'league',      'FIGC', 'var(--font-oswald), sans-serif',   600, 700, '0.03em', true, 3),
  ('bundesliga', 'Bundesliga',            'league',      'DFL',  'var(--font-teko), sans-serif',     600, 700, '0.04em', true, 4),
  ('ucl',        'UEFA Champions League', 'continental', 'UEFA', 'var(--font-rajdhani), sans-serif', 600, 700, '0.10em', true, 10),
  ('europa',     'UEFA Europa League',    'continental', 'UEFA', 'var(--font-rajdhani), sans-serif', 600, 700, '0.10em', true, 11),
  ('caf',        'CAF Champions League',  'continental', 'CAF',  'sans-serif',                       600, 700, '0.05em', true, 12)
on conflict (id) do update set
  label = excluded.label,
  kind  = excluded.kind;

-- ─── teams ──────────────────────────────────────────────────

insert into teams (id, name, edition, league_id, price, kit_body, kit_body_shade, kit_collar, kit_accent, kit_league_fill, kit_league_stroke, kit_ucl_fill, kit_crest_text, kit_crest_bg, kit_crest_fg, kit_sponsor, kit_stripes, is_published) values
  (
    'barcelona', 'FC Barcelona', 'Home Authentic · 25/26', 'laliga', 165,
    '#A50044', '#7E0033', '#FFED02', '#FFED02',
    '#FFED02', '#1A1A2E', '#FFED02',
    'FCB', '#FFED02', '#A50044', 'SPOTIFY',
    '{"colors":["#A50044","#004D98"],"width":46}',
    true
  ),
  (
    'real-madrid', 'Real Madrid', 'Home Authentic · 25/26', 'laliga', 165,
    '#F7F7F4', '#E7E7E2', '#1E2A55', '#C9A24B',
    '#1E2A55', 'none', '#1E2A55',
    'RM', '#1E2A55', '#C9A24B', 'FLY EMIRATES',
    null,
    true
  ),
  (
    'man-city', 'Manchester City', 'Home Authentic · 25/26', 'premier', 160,
    '#6CABDD', '#4E93C8', '#1C2C5B', '#F0C75E',
    '#FFFFFF', '#1C2C5B', '#1C2C5B',
    'MC', '#FFFFFF', '#1C2C5B', 'ETIHAD',
    null,
    false
  ),
  (
    'liverpool', 'Liverpool', 'Home Authentic · 25/26', 'premier', 160,
    '#C8102E', '#9E0C24', '#F6EB61', '#F6EB61',
    '#FFFFFF', '#7E0C20', '#FFFFFF',
    'LFC', '#FFFFFF', '#C8102E', 'STANDARD CHARTERED',
    null,
    false
  ),
  (
    'inter', 'Inter Milan', 'Home Authentic · 25/26', 'seriea', 158,
    '#1A1A1A', '#0E0E0E', '#0B1F5B', '#C9A24B',
    '#FFFFFF', 'none', '#FFFFFF',
    'IM', '#FFFFFF', '#0B1F5B', 'BETSSON',
    '{"colors":["#1A1A1A","#0B3FA8"],"width":40}',
    false
  ),
  (
    'bayern', 'Bayern München', 'Home Authentic · 25/26', 'bundesliga', 158,
    '#DC052D', '#AE0423', '#0066B2', '#FFFFFF',
    '#FFFFFF', '#8E0420', '#FFFFFF',
    'FCB', '#FFFFFF', '#DC052D', 'T',
    null,
    false
  )
on conflict (id) do update set
  name        = excluded.name,
  is_published = excluded.is_published;

-- ─── roster_players ─────────────────────────────────────────

delete from roster_players where team_id in ('barcelona', 'real-madrid');

insert into roster_players (team_id, name, number, sort_order) values
  ('barcelona',   'LEWANDOWSKI', 9,  0),
  ('barcelona',   'YAMAL',       19, 1),
  ('barcelona',   'PEDRI',       8,  2),
  ('barcelona',   'RAPHINHA',    11, 3),
  ('real-madrid', 'MBAPPÉ',      9,  0),
  ('real-madrid', 'BELLINGHAM',  5,  1),
  ('real-madrid', 'VINI JR',     7,  2),
  ('real-madrid', 'RODRYGO',     11, 3);

-- ─── team_competition_kits ──────────────────────────────────
-- Photos + geometry use the existing public/img files for now.
-- Replace URLs with Supabase Storage CDN URLs after uploading assets.

insert into team_competition_kits (
  team_id, competition_id, is_published,
  back_photo_url, front_photo_url,
  panel_patch_url,
  sleeve_patch_url, sleeve_x, sleeve_y, sleeve_w, sleeve_patch_w, sleeve_patch_h,
  name_cy, name_span, name_arc, name_size,
  number_cy, number_size, number_mode,
  font_name_url
) values
  -- Barcelona × La Liga
  (
    'barcelona', 'laliga', true,
    '/img/barcelona/ucl/back.png',  '/img/barcelona/ucl/front.png',
    '/img/barcelona/laliga/patch.png',
    '/img/barcelona/laliga/sleeve-patch.png', 0.828, 0.241, 0.0542, 65, 136,
    0.278, 0.46, 0.166, 0.07,
    0.404, 0.35, 'font',
    null    -- font_name_url: will be Supabase Storage URL once uploaded
  ),
  -- Barcelona × UCL
  (
    'barcelona', 'ucl', true,
    '/img/barcelona/ucl/back.png',  '/img/barcelona/ucl/front.png',
    '/img/barcelona/ucl/patch.png',
    '/img/barcelona/ucl/sleeve-patch.png', 0.828, 0.241, 0.0517, 62, 144,
    0.278, 0.46, 0.166, 0.07,
    0.404, 0.35, 'font',
    null
  ),
  -- Real Madrid × La Liga
  (
    'real-madrid', 'laliga', true,
    '/img/real-madrid/ucl/back.jpg', '/img/real-madrid/ucl/front.jpg',
    null, null, null, null, null, null, null,
    0.25, 0.36, 0.038, 0.05,
    0.43, 0.22, 'font',
    null
  ),
  -- Real Madrid × UCL
  (
    'real-madrid', 'ucl', true,
    '/img/real-madrid/ucl/back.jpg', '/img/real-madrid/ucl/front.jpg',
    null, null, null, null, null, null, null,
    0.25, 0.36, 0.038, 0.05,
    0.43, 0.22, 'font',
    null
  )
on conflict (team_id, competition_id) do update set
  is_published   = excluded.is_published,
  back_photo_url = excluded.back_photo_url;
