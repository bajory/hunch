-- ============================================================
-- Product catalog: one row per sellable SKU, any product type.
-- product_type has NO check constraint by design — the type list
-- lives in code (PRODUCT_TYPE_DEFS in web/src/lib/products.ts) so
-- future types (hats, medallions, keychains…) need no migration.
-- sizes jsonb maps size → units in stock ({"M": 3}); 0 = unavailable.
-- Writes are service-role only (no RLS write policies), matching
-- every other table.
-- ============================================================

create table products (
  slug          text primary key,
  team_id       text references teams(id) on delete set null,
  name          text not null,
  product_type  text not null default 'jersey',
  kit_type      text
    check (kit_type in ('home','away','third','fourth','retro','special')),
  season        text not null default '',
  edition       text not null default '',
  price         numeric(10,2) not null default 0,
  status        text not null default 'available'
    check (status in ('available','coming_soon','archived')),
  customizable  bool not null default false,
  sizes         jsonb not null default '{}',
  images        jsonb not null default '{}',
  sort_order    int not null default 0,
  is_published  bool not null default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index products_team_idx on products (team_id);
create index products_type_idx on products (product_type);

create trigger products_updated_at before update on products
  for each row execute function set_updated_at();

alter table products enable row level security;

create policy "public read published products"
  on products for select using (is_published = true);

-- Seed: generated from web/src/lib/products.ts PRODUCTS (the static
-- fallback list) — the storefront renders identically before/after
-- this migration. Sizes: previous in-stock booleans became qty 1.
insert into products (slug, team_id, name, product_type, kit_type, season, edition,
                      price, status, customizable, sizes, images, sort_order, is_published)
values
  ('real-madrid-home', 'real-madrid', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":1,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/real-madrid/home/front.png","back":"/img/products/real-madrid/home/back.png","source":"studio"}', 0, true),
  ('real-madrid-away', 'real-madrid', 'Away Jersey · 26/27', 'jersey', 'away', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":0,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/real-madrid/away/front.png","source":"sportsdb"}', 1, true),
  ('barcelona-home', 'barcelona', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":1,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/barcelona/home/front.png","back":"/img/products/barcelona/home/back.png","source":"studio"}', 2, true),
  ('barcelona-away', 'barcelona', 'Away Jersey · 26/27', 'jersey', 'away', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":0,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/barcelona/away/front.png","source":"sportsdb"}', 3, true),
  ('psg-home', 'psg', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":0,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/psg/home/front.png","back":"/img/products/psg/home/back.png","source":"studio"}', 4, true),
  ('psg-away', 'psg', 'Away Jersey · 26/27', 'jersey', 'away', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":0,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/psg/away/front.png","back":"/img/products/psg/away/back.png","source":"studio"}', 5, true),
  ('arsenal-home', 'arsenal', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":1,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/arsenal/home/front.png","source":"sportsdb"}', 6, true),
  ('arsenal-away', 'arsenal', 'Away Jersey · 26/27', 'jersey', 'away', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":0,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/arsenal/home/front.png","source":"sportsdb"}', 7, true),
  ('liverpool-home', 'liverpool', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/liverpool/home/front.png","back":"/img/products/liverpool/home/back.png","source":"studio"}', 8, true),
  ('man-united-home', 'man-united', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/man-united/home/front.png","back":"/img/products/man-united/home/back.png","source":"studio"}', 9, true),
  ('man-city-home', 'man-city', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/man-city/home/front.png","back":"/img/products/man-city/home/back.png","source":"studio"}', 10, true),
  ('chelsea-home', 'chelsea', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/chelsea/home/front.png","source":"sportsdb"}', 11, true),
  ('bayern-home', 'bayern', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/bayern/home/front.png","back":"/img/products/bayern/home/back.png","source":"studio"}', 12, true),
  ('inter-home', 'inter', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'coming_soon', true, '{"S":0,"M":0,"L":0,"XL":0,"XXL":0}', '{"front":"/img/products/inter/home/front.png","back":"/img/products/inter/home/back.png","source":"studio"}', 13, true),
  ('milan-home', 'milan', 'Home Jersey · 26/27', 'jersey', 'home', '26/27', 'Authentic', 165, 'coming_soon', true, '{"S":0,"M":0,"L":0,"XL":0,"XXL":0}', '{"front":"/img/products/milan/home/front.png","back":"/img/products/milan/home/back.png","source":"studio"}', 14, true),
  ('argentina-home', 'argentina', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":1,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/argentina/home/front.png","source":"sportsdb"}', 15, true),
  ('argentina-away', 'argentina', 'Away Jersey · 2026 World Cup', 'jersey', 'away', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/argentina/home/front.png","source":"sportsdb"}', 16, true),
  ('portugal-home', 'portugal', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":1,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/portugal/home/front.png","source":"sportsdb"}', 17, true),
  ('portugal-away', 'portugal', 'Away Jersey · 2026 World Cup', 'jersey', 'away', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/portugal/home/front.png","source":"sportsdb"}', 18, true),
  ('brazil-home', 'brazil', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":1,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/brazil/home/front.png","source":"sportsdb"}', 19, true),
  ('brazil-away', 'brazil', 'Away Jersey · 2026 World Cup', 'jersey', 'away', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":1,"XXL":0}', '{"front":"/img/products/brazil/home/front.png","source":"sportsdb"}', 20, true),
  ('spain-home', 'spain', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/spain/home/front.png","source":"sportsdb"}', 21, true),
  ('spain-away', 'spain', 'Away Jersey · 2026 World Cup', 'jersey', 'away', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/spain/home/front.png","source":"sportsdb"}', 22, true),
  ('morocco-home', 'morocco', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":1,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/morocco/home/front.png","source":"sportsdb"}', 23, true),
  ('morocco-away', 'morocco', 'Away Jersey · 2026 World Cup', 'jersey', 'away', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/morocco/home/front.png","source":"sportsdb"}', 24, true),
  ('saudi-arabia-home', 'saudi-arabia', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":1,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/saudi-arabia/home/front.png","source":"sportsdb"}', 25, true),
  ('saudi-arabia-away', 'saudi-arabia', 'Away Jersey · 2026 World Cup', 'jersey', 'away', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/saudi-arabia/home/front.png","source":"sportsdb"}', 26, true),
  ('france-home', 'france', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/france/home/front.png","source":"sportsdb"}', 27, true),
  ('england-home', 'england', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/england/home/front.png","source":"sportsdb"}', 28, true),
  ('germany-home', 'germany', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/germany/home/front.png","source":"sportsdb"}', 29, true),
  ('qatar-home', 'qatar', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/qatar/home/front.png","source":"sportsdb"}', 30, true),
  ('egypt-home', 'egypt', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":1,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/egypt/home/front.png","source":"sportsdb"}', 31, true),
  ('algeria-home', 'algeria', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/algeria/home/front.png","source":"sportsdb"}', 32, true),
  ('tunisia-home', 'tunisia', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/tunisia/home/front.png","source":"sportsdb"}', 33, true),
  ('iraq-home', 'iraq', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/iraq/home/front.png","source":"sportsdb"}', 34, true),
  ('jordan-home', 'jordan', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/jordan/home/front.png","source":"sportsdb"}', 35, true),
  ('jordan-away', 'jordan', 'Away Jersey · 2026 World Cup', 'jersey', 'away', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/jordan/home/front.png","source":"sportsdb"}', 36, true),
  ('uruguay-away', 'uruguay', 'Away Jersey · 2026 World Cup', 'jersey', 'away', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/uruguay/away/front.png","source":"sportsdb"}', 37, true),
  ('mexico-home', 'mexico', 'Home Jersey · 2026 World Cup', 'jersey', 'home', '2026 World Cup', 'Player Version', 175, 'available', true, '{"S":0,"M":0,"L":1,"XL":0,"XXL":0}', '{"front":"/img/products/mexico/home/front.png","source":"sportsdb"}', 38, true)
on conflict (slug) do nothing;
