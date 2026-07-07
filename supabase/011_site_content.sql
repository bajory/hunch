-- ============================================================
-- Editable homepage content (hero, split panels, provenance/craft
-- band, marquee) — lets the admin change these images and copy
-- without touching code. One row per section; `data` holds whatever
-- shape that section's component expects. Missing rows/fields fall
-- back to the current hardcoded copy (see lib/site-content.ts).
-- ============================================================

create table if not exists site_content (
  section    text primary key,
  data       jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table site_content enable row level security;

create policy "public read site content"
  on site_content for select
  using (true);

-- Seed with today's hardcoded copy so the admin form opens pre-filled
-- with exactly what's already live.
insert into site_content (section, data) values
  ('hero', '{
    "image": "/img/products/real-madrid/home/back.png",
    "alt": "Real Madrid 26/27 home jersey, back view",
    "kicker": "Authentic matchwear · 26/27 & World Cup 2026",
    "title": "The shirt is the statement.",
    "sub": "Player-version jerseys from the clubs and nations that matter, sourced authentic and pressed to your name in our studio."
  }'),
  ('split', '{
    "panels": [
      { "kicker": "Season 26/27", "title": "The Clubs",
        "sub": "Madrid to Manchester — home and away shirts from Europe''s front row.",
        "image": "/img/products/barcelona/home/back.png", "alt": "FC Barcelona 26/27 home jersey" },
      { "kicker": "World Cup 2026", "title": "The Nations",
        "sub": "Player-version tournament shirts, sold blank the way they arrive.",
        "image": "/img/products/psg/away/front.png", "alt": "2026 World Cup jerseys" }
    ]
  }'),
  ('craft', '{
    "image": "/img/products/barcelona/home/front.png",
    "alt": "Detail of an authentic FC Barcelona home shirt",
    "caption": "FC Barcelona · Home · 26/27 — player issue",
    "lead": "A replica is a souvenir. What we carry is the shirt the squad actually wears — the engineered version, sourced through the club, never off a retail rail.",
    "points": [
      { "title": "Match-issue fabric", "body": "Player-version knit built for the pitch, not the polymer weight of the replica." },
      { "title": "Bonded, not stitched-on", "body": "Crest and sponsor heat-applied to the club''s own specification — the finish the kit man signs off." },
      { "title": "Personalised, or not at all", "body": "Name and number pressed in the official typeface — or left blank, exactly as it arrived. Your call." }
    ],
    "stats": [
      { "value": "60", "label": "Jerseys in stock" },
      { "value": "26", "label": "Clubs & nations" },
      { "value": "100%", "label": "Authentic, always" }
    ]
  }'),
  ('marquee', '{
    "items": ["Authentic", "Player Version", "Season 26/27", "World Cup 2026", "Made to Name"]
  }')
on conflict (section) do nothing;
