-- ============================================================
-- "What's new at HUNCH" homepage grid — independent of the shared
-- product photos, so it can spotlight whatever the admin wants
-- without touching each team's actual catalog/PDP imagery.
-- Additive to 011_site_content.sql's site_content table.
-- ============================================================

insert into site_content (section, data) values
  ('newArrivals', '{
    "items": [
      { "image": "/img/products/arsenal/home/front.png", "caption": "Arsenal", "href": "/jersey/arsenal-home" },
      { "image": "/img/products/chelsea/home/front.png", "caption": "Chelsea", "href": "/jersey/chelsea-home" },
      { "image": "/img/products/argentina/home/front.png", "caption": "Argentina", "href": "/jersey/argentina-home" },
      { "image": "/img/products/brazil/home/front.png", "caption": "Brazil", "href": "/jersey/brazil-home" }
    ]
  }')
on conflict (section) do nothing;
