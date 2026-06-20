# HUNCH — The Authentic Atelier

Luxury sportswear, launching with made-to-name premium soccer jerseys.
This repo currently contains the **PDP (product detail page)** with a live jersey
customizer.

## What it does

A split-screen PDP — a sticky jersey stage on the left, the configurator on the
right. Everything re-renders instantly:

- **Club selection** — 6 houses, each with its own kit colours, crest, sponsor,
  stripes and roster.
- **Personalisation** — pick a squad **Player**, or type **Your Name + Number**.
  The lettering renders live on the back of the kit (with long-name auto-fit,
  exactly like a real heat-press).
- **Competition & sleeve patch** — switch between the club's **domestic league**
  and the **UEFA Champions League**. This is the key interaction:
  - the **typeface changes per competition** (each league has its own face; UCL
    uses one uniform continental face), and
  - the **lettering colour adapts** so it always contrasts the shirt, and
  - the **right-sleeve patch swaps** (league badge ↔ UCL starball).
- **Size**, **live pricing** (jersey + personalisation), **add to bag**.
- Front / back views.

## Run it

No build step. Any static server, e.g.:

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Structure

```
index.html              # PDP markup
assets/css/styles.css   # luxury dark + gold theme (Cormorant / Montserrat)
assets/js/data.js       # ← the model: teams, competitions, fonts, patches
assets/js/app.js        # rendering engine: SVG jersey + lettering + state
```

The customization logic lives entirely in `data.js`. To add a club, add a
`TEAMS` entry; to add a competition with its own lettering, add a `COMPETITIONS`
entry. Nothing else needs to change.

## Important: typefaces are stand-ins

Official league / Champions League print fonts are **licensed**. The fonts used
here are Google Fonts chosen to *approximate* each competition's lettering so the
"styling changes per competition" behaviour is real and visible:

| Competition | Stand-in font | Replace with (production) |
|-------------|---------------|---------------------------|
| La Liga | Saira | Licensed LaLiga print font |
| Premier League | Archivo | Licensed PL print font |
| Serie A | Oswald | Licensed Serie A font |
| Bundesliga | Teko | Licensed Bundesliga font |
| UEFA Champions League | Rajdhani | Licensed UCL print font |

Swap `fontFamily` in each `COMPETITIONS` entry for the licensed face — no other
code changes required. Club crests, sponsor marks and patches are stylised
placeholders pending official artwork/licensing.

## Roadmap (suggested next)

- Real jersey photography / 3D kit per club instead of the SVG silhouette.
- Cart, checkout, account, collection grid pages.
- Graduate to Next.js + a CMS for catalogue/licensing data.
- Server-side render of the personalised kit for share/preview images.
```
