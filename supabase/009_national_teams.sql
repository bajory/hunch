-- ============================================================
-- Bring the admin Studio's team list up to date with the real
-- product catalog: 5 missing clubs + all 17 national teams, and a
-- World Cup competition so national teams can be calibrated exactly
-- like clubs (patches, lettering, fonts, personalisation).
-- Everything lands unpublished — no storefront change until an
-- admin calibrates + publishes a kit.
-- ============================================================

alter table teams
  add column if not exists team_kind text not null default 'club'
    check (team_kind in ('club', 'national'));

insert into competitions (id, label, kind, governing_body, font_family, name_weight, number_weight, tracking, uppercase, sort_order) values
  ('ligue1',   'Ligue 1',                'league',        'LFP',   'var(--font-archivo), sans-serif', 700, 800, '0.02em', true, 5),
  ('worldcup', 'FIFA World Cup 2026',    'international', 'FIFA',  'var(--font-rajdhani), sans-serif', 700, 800, '0.08em', true, 20)
on conflict (id) do nothing;

-- Missing clubs (26/27 stock already sold on the storefront, not yet calibrated)
insert into teams (id, name, edition, league_id, team_kind, price, kit_body, kit_body_shade, kit_collar, kit_accent, kit_league_fill, kit_ucl_fill, is_published) values
  ('psg',         'Paris Saint-Germain', 'Home Authentic · 26/27', 'ligue1',  'club', 165, '#004170', '#00304F', '#DA291C', '#DA291C', '#FFFFFF', '#FFFFFF', false),
  ('arsenal',     'Arsenal',             'Home Authentic · 26/27', 'premier', 'club', 165, '#EF0107', '#C10106', '#023474', '#023474', '#FFFFFF', '#FFFFFF', false),
  ('man-united',  'Manchester United',   'Home Authentic · 26/27', 'premier', 'club', 165, '#DA291C', '#B01F15', '#FBE122', '#FBE122', '#FFFFFF', '#FFFFFF', false),
  ('chelsea',     'Chelsea',             'Home Authentic · 26/27', 'premier', 'club', 165, '#034694', '#022F63', '#D1D3D4', '#D1D3D4', '#FFFFFF', '#FFFFFF', false),
  ('milan',       'AC Milan',            'Home Authentic · 26/27', 'seriea',  'club', 165, '#FB090B', '#C10709', '#1A1A1A', '#1A1A1A', '#FFFFFF', '#FFFFFF', false)
on conflict (id) do nothing;

-- National teams — 2026 World Cup, player version, blank until calibrated
insert into teams (id, name, edition, league_id, team_kind, price, kit_body, kit_body_shade, kit_collar, kit_accent, kit_league_fill, kit_ucl_fill, is_published) values
  ('argentina',    'Argentina',    'Player Version · 2026 World Cup', null, 'national', 175, '#75AADB', '#5D8CB8', '#FFFFFF', '#FFFFFF', '#1A1A1A', '#1A1A1A', false),
  ('portugal',     'Portugal',     'Player Version · 2026 World Cup', null, 'national', 175, '#DA291C', '#B01F15', '#046A38', '#046A38', '#FFFFFF', '#FFFFFF', false),
  ('brazil',       'Brazil',       'Player Version · 2026 World Cup', null, 'national', 175, '#FEDD00', '#D9BC00', '#009739', '#009739', '#1A1A1A', '#1A1A1A', false),
  ('spain',        'Spain',        'Player Version · 2026 World Cup', null, 'national', 175, '#AA151B', '#861014', '#F1BF00', '#F1BF00', '#FFFFFF', '#FFFFFF', false),
  ('morocco',      'Morocco',      'Player Version · 2026 World Cup', null, 'national', 175, '#C1272D', '#9C1F24', '#006233', '#006233', '#FFFFFF', '#FFFFFF', false),
  ('saudi-arabia', 'Saudi Arabia', 'Player Version · 2026 World Cup', null, 'national', 175, '#006C35', '#00512A', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', false),
  ('france',       'France',       'Player Version · 2026 World Cup', null, 'national', 175, '#002395', '#001A70', '#ED2939', '#ED2939', '#FFFFFF', '#FFFFFF', false),
  ('england',      'England',      'Player Version · 2026 World Cup', null, 'national', 175, '#FFFFFF', '#E5E5E5', '#CE1124', '#CE1124', '#1A1A1A', '#1A1A1A', false),
  ('germany',      'Germany',      'Player Version · 2026 World Cup', null, 'national', 175, '#FFFFFF', '#E5E5E5', '#000000', '#000000', '#1A1A1A', '#1A1A1A', false),
  ('qatar',        'Qatar',        'Player Version · 2026 World Cup', null, 'national', 175, '#8A1538', '#6D1029', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', false),
  ('egypt',        'Egypt',        'Player Version · 2026 World Cup', null, 'national', 175, '#CE1126', '#A50D1E', '#000000', '#000000', '#FFFFFF', '#FFFFFF', false),
  ('algeria',      'Algeria',      'Player Version · 2026 World Cup', null, 'national', 175, '#FFFFFF', '#E5E5E5', '#006233', '#006233', '#1A1A1A', '#1A1A1A', false),
  ('tunisia',      'Tunisia',      'Player Version · 2026 World Cup', null, 'national', 175, '#E70013', '#B9000F', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', false),
  ('iraq',         'Iraq',         'Player Version · 2026 World Cup', null, 'national', 175, '#007A3D', '#005C2E', '#CE1126', '#CE1126', '#FFFFFF', '#FFFFFF', false),
  ('jordan',       'Jordan',       'Player Version · 2026 World Cup', null, 'national', 175, '#CE1126', '#A50D1E', '#007A3D', '#007A3D', '#FFFFFF', '#FFFFFF', false),
  ('uruguay',      'Uruguay',      'Player Version · 2026 World Cup', null, 'national', 175, '#7BAFD4', '#5F94BA', '#1A1A1A', '#1A1A1A', '#1A1A1A', '#1A1A1A', false),
  ('mexico',       'Mexico',       'Player Version · 2026 World Cup', null, 'national', 175, '#006847', '#004E35', '#CE1126', '#CE1126', '#FFFFFF', '#FFFFFF', false)
on conflict (id) do nothing;
