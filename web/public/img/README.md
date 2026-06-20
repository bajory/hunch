# Jersey photo assets — drop your real shirt images here

The PDP renders a **real product photo** of the shirt and overlays the name +
number on top (exactly like the Barça official store reference). When a photo
exists for the selected team + competition, it is used automatically; otherwise
the app falls back to the SVG silhouette.

## Where to put files

```
assets/img/<team-id>/<competition-id>/back.png     ← required (name/number print on this)
assets/img/<team-id>/<competition-id>/front.png    ← optional (shown on "Front" toggle)
```

### Team IDs
`real-madrid` · `barcelona` · `man-city` · `liverpool` · `inter` · `bayern`

### Competition IDs
`laliga` · `premier` · `seriea` · `bundesliga` · `ucl`
(each club folder only contains its domestic league + `ucl`)

**Example — the Barça UCL back you showed:**
`assets/img/barcelona/ucl/back.png`

## Image requirements (important)

| Requirement | Why |
|---|---|
| **Back view, blank name/number area** | We print the name + number on top — the shirt must NOT already have a name/number printed. Sponsor + patches baked into the photo are fine (and preferred). |
| **Straight-on, shirt centred & upright** | Keeps the overlaid text aligned. The reference shot is ideal. |
| **PNG or JPG, ~1000–1600px tall** | Sharp on retina without being huge. |
| **Consistent framing across a team** | So front/back and league/UCL line up. |
| Transparent or clean studio background | Matches the luxury stage. Transparent PNG looks best on the dark frame. |

## After you add an image — 30-second calibration

Each photo sits slightly differently, so the name/number position is tuned per
photo. Open the page with `#tune` at the end of the URL
(e.g. `http://localhost:4173/#tune`) and:

- `N` / `M` — select **N**ame or nu**M**ber
- Arrow keys — move it
- `+` / `-` — resize · `[` / `]` — bend the name arch
- The panel prints the exact config — paste it into that team's `print` block in
  `assets/js/data.js`.

Tell me when an image is in and I'll calibrate it for you.
