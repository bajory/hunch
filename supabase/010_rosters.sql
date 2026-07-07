-- ============================================================
-- Full 5-player rosters (name + number) for every club and
-- national team — powers the "Squad Player" quick-select in the
-- storefront personalisation studio and the admin roster panel.
-- Names match what's actually printed on the shirt (nickname,
-- mononym, first name, or "Initial. Surname" where the plain
-- surname would be ambiguous) — not the player's full legal name.
-- Replaces whatever's there for these teams so it can be re-run safely.
-- ============================================================

delete from roster_players where team_id in (
  'real-madrid', 'barcelona', 'psg', 'arsenal', 'liverpool', 'man-united',
  'man-city', 'chelsea', 'bayern', 'inter', 'milan',
  'argentina', 'portugal', 'brazil', 'spain', 'morocco', 'saudi-arabia',
  'france', 'england', 'germany', 'qatar', 'egypt', 'algeria', 'tunisia',
  'iraq', 'jordan', 'uruguay', 'mexico'
);

insert into roster_players (team_id, name, number, sort_order) values
  -- ── Clubs ──
  ('real-madrid', 'MBAPPÉ',      10,  0),
  ('real-madrid', 'BELLINGHAM',  5,  1),
  ('real-madrid', 'VINI JR',     7,  2),
  ('real-madrid', 'RODRYGO',     11, 3),
  ('real-madrid', 'VALVERDE',    15, 4),

  ('barcelona',   'LEWANDOWSKI', 9,  0),
  ('barcelona',   'YAMAL',       19, 1),
  ('barcelona',   'PEDRI',       8,  2),
  ('barcelona',   'RAPHINHA',    11, 3),
  ('barcelona',   'GAVI',        6,  4),

  ('psg',         'DEMBÉLÉ',     10, 0),
  ('psg',         'HAKIMI',      2,  1),
  ('psg',         'VITINHA',     17, 2),
  ('psg',         'DOUÉ',        14, 3),
  ('psg',         'MARQUINHOS',  5,  4),

  ('arsenal',     'SAKA',        7,  0),
  ('arsenal',     'ODEGAARD',    8,  1),
  ('arsenal',     'RICE',        41, 2),
  ('arsenal',     'MARTINELLI',  11, 3),
  ('arsenal',     'GYÖKERES',    14, 4),

  ('liverpool',   'SALAH',       11, 0),
  ('liverpool',   'VAN DIJK',    4,  1),
  ('liverpool',   'SZOBOSZLAI',  8,  2),
  ('liverpool',   'GAKPO',       18, 3),
  ('liverpool',   'MAC ALLISTER',10, 4),

  ('man-united',  'B. FERNANDES',8,  0),
  ('man-united',  'RASHFORD',    10, 1),
  ('man-united',  'HOJLUND',     9,  2),
  ('man-united',  'MAINOO',      37, 3),
  ('man-united',  'DALOT',       20, 4),

  ('man-city',    'HAALAND',     9,  0),
  ('man-city',    'FODEN',       47, 1),
  ('man-city',    'RODRI',       16, 2),
  ('man-city',    'B. SILVA',    20, 3),
  ('man-city',    'DOKU',        11, 4),

  ('chelsea',     'PALMER',      10, 0),
  ('chelsea',     'ENZO',        8,  1),
  ('chelsea',     'CAICEDO',     25, 2),
  ('chelsea',     'CUCURELLA',   3,  3),
  ('chelsea',     'JACKSON',     15, 4),

  ('bayern',      'KANE',        9,  0),
  ('bayern',      'MUSIALA',     42, 1),
  ('bayern',      'OLISE',       17, 2),
  ('bayern',      'KIMMICH',     6,  3),
  ('bayern',      'UPAMECANO',   2,  4),

  ('inter',       'LAUTARO',     10, 0),
  ('inter',       'THURAM',      9,  1),
  ('inter',       'BARELLA',     23, 2),
  ('inter',       'CALHANOGLU',  20, 3),
  ('inter',       'DIMARCO',     32, 4),

  ('milan',       'LEÃO',        10, 0),
  ('milan',       'PULISIC',     11, 1),
  ('milan',       'MODRIĆ',      14, 2),
  ('milan',       'THEO',        19, 3),
  ('milan',       'FOFANA',      5,  4),

  -- ── National teams — 2026 World Cup ──
  ('argentina',    'MESSI',        10, 0),
  ('argentina',    'J. ALVAREZ',   9,  1),
  ('argentina',    'DE PAUL',      7,  2),
  ('argentina',    'MAC ALLISTER', 20, 3),
  ('argentina',    'L. MARTINEZ',  25, 4),

  ('portugal',     'RONALDO',      7,  0),
  ('portugal',     'B. FERNANDES', 8,  1),
  ('portugal',     'LEÃO',         11, 2),
  ('portugal',     'CANCELO',      2,  3),
  ('portugal',     'PALHINHA',     6,  4),

  ('brazil',       'VINI JR',      7,  0),
  ('brazil',       'RODRYGO',      11, 1),
  ('brazil',       'RAPHINHA',     9,  2),
  ('brazil',       'CASEMIRO',     5,  3),
  ('brazil',       'MARQUINHOS',   4,  4),

  ('spain',        'YAMAL',        19, 0),
  ('spain',        'PEDRI',        8,  1),
  ('spain',        'RODRI',        16, 2),
  ('spain',        'MORATA',       7,  3),
  ('spain',        'CUCURELLA',    3,  4),

  ('morocco',      'HAKIMI',       2,  0),
  ('morocco',      'EN-NESYRI',    19, 1),
  ('morocco',      'AMRABAT',      4,  2),
  ('morocco',      'BOUNOU',       1,  3),
  ('morocco',      'MAZRAOUI',     3,  4),

  ('saudi-arabia', 'SALEM',        10, 0),
  ('saudi-arabia', 'FIRAS',        19, 1),
  ('saudi-arabia', 'YASSER',       13, 2),
  ('saudi-arabia', 'SALMAN',       5,  3),
  ('saudi-arabia', 'KANNO',        8,  4),

  ('france',       'MBAPPÉ',       10, 0),
  ('france',       'TCHOUAMÉNI',   8,  1),
  ('france',       'DEMBÉLÉ',      11, 2),
  ('france',       'KONATÉ',       5,  3),
  ('france',       'T. HERNANDEZ', 3,  4),

  ('england',      'BELLINGHAM',   10, 0),
  ('england',      'SAKA',         7,  1),
  ('england',      'KANE',         9,  2),
  ('england',      'FODEN',        11, 3),
  ('england',      'RICE',         4,  4),

  ('germany',      'MUSIALA',      10, 0),
  ('germany',      'WIRTZ',        17, 1),
  ('germany',      'KIMMICH',      6,  2),
  ('germany',      'HAVERTZ',      7,  3),
  ('germany',      'TER STEGEN',   1,  4),

  ('qatar',        'AFIF',         7,  0),
  ('qatar',        'ALMOEZ',       19, 1),
  ('qatar',        'HASSAN',       10, 2),
  ('qatar',        'BASSAM',       4,  3),
  ('qatar',        'BARSHAM',      1,  4),

  ('egypt',        'SALAH',        10, 0),
  ('egypt',        'MARMOUSH',     7,  1),
  ('egypt',        'MOSTAFA',      19, 2),
  ('egypt',        'ELNENY',       17, 3),
  ('egypt',        'HAMDI',        6,  4),

  ('algeria',      'MAHREZ',       7,  0),
  ('algeria',      'SLIMANI',      9,  1),
  ('algeria',      'ATAL',         2,  2),
  ('algeria',      'BENSEBAINI',   13, 3),
  ('algeria',      'BENNACER',     8,  4),

  ('tunisia',      'KHAZRI',       10, 0),
  ('tunisia',      'HANNIBAL',     8,  1),
  ('tunisia',      'MSAKNI',       7,  2),
  ('tunisia',      'ABDI',         13, 3),
  ('tunisia',      'TALBI',        5,  4),

  ('iraq',         'AYMEN',        9,  0),
  ('iraq',         'MOHANAD',      7,  1),
  ('iraq',         'ZAID',         8,  2),
  ('iraq',         'REBIN',        15, 3),
  ('iraq',         'AHMED',        17, 4),

  ('jordan',       'MUSA',         17, 0),
  ('jordan',       'YAZAN',        9,  1),
  ('jordan',       'HADDAD',       19, 2),
  ('jordan',       'SALEM',        4,  3),
  ('jordan',       'ANAS',         13, 4),

  ('uruguay',      'NÚÑEZ',        9,  0),
  ('uruguay',      'VALVERDE',     15, 1),
  ('uruguay',      'BENTANCUR',    5,  2),
  ('uruguay',      'ARAÚJO',       4,  3),
  ('uruguay',      'UGARTE',       6,  4),

  ('mexico',       'GIMÉNEZ',      9,  0),
  ('mexico',       'ÁLVAREZ',      4,  1),
  ('mexico',       'LOZANO',       22, 2),
  ('mexico',       'PINEDA',       21, 3),
  ('mexico',       'OCHOA',        1,  4);
