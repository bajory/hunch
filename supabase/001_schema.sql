-- ============================================================
-- HUNCH — Supabase schema
-- Run this in Supabase → SQL Editor → New query
-- ============================================================

-- ─── competitions ───────────────────────────────────────────
-- Global competitions (UCL, La Liga, Premier League, etc.)
-- One row per competition, shared across all clubs.

create table competitions (
  id             text primary key,          -- 'ucl' | 'laliga' | 'premier' | ...
  label          text not null,             -- 'UEFA Champions League'
  kind           text not null,             -- 'league' | 'continental' | 'regional'
  governing_body text,                      -- 'UEFA' | 'CAF' | 'CONMEBOL'
  logo_url       text,                      -- competition logo for UI display

  -- Default lettering style (overridden per team in team_competition_kits)
  font_family    text,                      -- CSS font-family fallback
  name_weight    int  default 600,
  number_weight  int  default 700,
  tracking       text default '0.05em',
  uppercase      bool default true,

  sort_order     int  default 0,
  created_at     timestamptz default now()
);

-- ─── teams ──────────────────────────────────────────────────

create table teams (
  id              text primary key,         -- 'barcelona' | 'real-madrid' | ...
  name            text not null,            -- 'FC Barcelona'
  edition         text,                     -- 'Home Authentic · 25/26'
  league_id       text references competitions(id),
  price           numeric(10,2) default 160,
  shopify_product_id text,

  -- Kit colours (used for SVG silhouette fallback + UI swatches)
  kit_body        text,
  kit_body_shade  text,
  kit_collar      text,
  kit_accent      text,
  kit_league_fill text,
  kit_league_stroke text,
  kit_ucl_fill    text,
  kit_crest_text  text,
  kit_crest_bg    text,
  kit_crest_fg    text,
  kit_sponsor     text,
  kit_stripes     jsonb,                    -- {"colors":["#A50044","#004D98"],"width":46} | null

  is_published    bool default false,
  created_at      timestamptz default now()
);

-- ─── roster_players ─────────────────────────────────────────

create table roster_players (
  id          uuid primary key default gen_random_uuid(),
  team_id     text not null references teams(id) on delete cascade,
  name        text not null,
  number      int  not null,
  sort_order  int  default 0
);

-- ─── team_competition_kits ──────────────────────────────────
-- One row per team × competition.
-- Controls whether that competition tab is visible on the PDP.

create table team_competition_kits (
  id              uuid primary key default gen_random_uuid(),
  team_id         text not null references teams(id) on delete cascade,
  competition_id  text not null references competitions(id) on delete cascade,
  unique (team_id, competition_id),

  is_published    bool default false,       -- false = hidden from storefront

  -- Jersey photos (Supabase Storage URLs)
  back_photo_url  text,
  front_photo_url text,

  -- Sleeve patch (right sleeve, back view only)
  sleeve_patch_url  text,
  sleeve_x          numeric,               -- fraction of image W (front-view left edge)
  sleeve_y          numeric,               -- fraction of image H (top edge)
  sleeve_w          numeric,               -- fraction of image W for patch width
  sleeve_patch_w    int,                   -- natural pixel width of patch image
  sleeve_patch_h    int,                   -- natural pixel height of patch image

  -- Front competition badge (on-jersey logo, e.g. UCL wordmark on front)
  front_badge_url text,
  front_badge_x   numeric,
  front_badge_y   numeric,
  front_badge_w   numeric,

  -- Panel patch (shown in competition selector UI)
  panel_patch_url text,

  -- Name geometry (calibrated to the back photo)
  name_cy     numeric,
  name_span   numeric,
  name_arc    numeric,
  name_size   numeric,

  -- Number geometry
  number_cy       numeric,
  number_size     numeric,
  number_mode     text default 'font',     -- 'font' | 'svg_glyphs'
  number_glyph_gap numeric default 0.01,

  -- Font overrides (Storage URLs for uploaded OTF/TTF)
  -- null = use competition default font
  font_name_url   text,
  font_number_url text,                    -- null = same as name font

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── number_glyphs ──────────────────────────────────────────
-- Per-digit SVG files when number_mode = 'svg_glyphs'.
-- Upload 0.svg → 9.svg; renderer composes the number from these.

create table number_glyphs (
  id              uuid primary key default gen_random_uuid(),
  team_id         text not null references teams(id) on delete cascade,
  competition_id  text not null references competitions(id) on delete cascade,
  digit           int  not null check (digit >= 0 and digit <= 9),
  svg_url         text not null,
  unique (team_id, competition_id, digit)
);

-- ─── updated_at trigger ─────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger team_competition_kits_updated_at
  before update on team_competition_kits
  for each row execute function set_updated_at();

-- ─── Storage buckets ────────────────────────────────────────
-- Run these after enabling Storage in your Supabase project.
-- Or create them manually in Storage → New bucket.

insert into storage.buckets (id, name, public) values
  ('jersey-photos',  'jersey-photos',  true),
  ('patches',        'patches',        true),
  ('fonts',          'fonts',          false),   -- served via signed URL
  ('number-glyphs',  'number-glyphs',  true)
on conflict (id) do nothing;

-- ─── RLS policies ───────────────────────────────────────────
-- Public read on everything; writes restricted to service role.

alter table competitions          enable row level security;
alter table teams                 enable row level security;
alter table roster_players        enable row level security;
alter table team_competition_kits enable row level security;
alter table number_glyphs         enable row level security;

-- Storefront: read published teams + their kits
create policy "public read competitions"
  on competitions for select using (true);

create policy "public read published teams"
  on teams for select using (is_published = true);

create policy "public read roster"
  on roster_players for select
  using (exists (
    select 1 from teams t
    where t.id = team_id and t.is_published = true
  ));

create policy "public read published kits"
  on team_competition_kits for select using (is_published = true);

create policy "public read number glyphs"
  on number_glyphs for select
  using (exists (
    select 1 from team_competition_kits k
    where k.team_id = team_id
      and k.competition_id = competition_id
      and k.is_published = true
  ));

-- Storage: public read on public buckets (set in bucket config above)
-- Writes go through service role key from API routes only.
