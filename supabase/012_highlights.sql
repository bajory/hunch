-- ============================================================
-- "Catch the highlights" homepage section — a horizontally
-- scrollable set of story cards, each optionally a looping video.
-- Additive to 011_site_content.sql's site_content table.
-- ============================================================

insert into site_content (section, data) values
  ('highlights', '{
    "items": [
      { "image": "/img/products/real-madrid/home/front.png", "title": "Matchday, Bernabéu", "href": "/jersey/real-madrid-home" },
      { "image": "/img/products/barcelona/away/front.png", "title": "The away kit, unveiled", "href": "/jersey/barcelona-away" },
      { "image": "/img/products/psg/home/back.png", "title": "Bonded, not printed", "href": "/house" },
      { "image": "/img/products/argentina/home/front.png", "title": "Road to the World Cup", "href": "/shop?kind=national" }
    ]
  }')
on conflict (section) do nothing;
