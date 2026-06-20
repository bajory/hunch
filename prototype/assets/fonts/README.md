# Jersey lettering fonts

Drop the official font file here. The app applies it to that club's printed
name + number automatically; if the file is missing it falls back to the
competition stand-in font, so nothing breaks.

## Barcelona

Name the file exactly one of these (any **one** format is enough):

```
assets/fonts/barcelona-jersey.woff2     ← best for web
assets/fonts/barcelona-jersey.otf
assets/fonts/barcelona-jersey.ttf
```

That's it — it's already wired (`@font-face FCBLettering` in `assets/css/styles.css`,
and `font:` in the `barcelona` entry of `assets/js/data.js`).

### Per-competition fonts
If the La Liga and UCL lettering differ, send both. In `data.js` change the
Barcelona `font` from a string to:

```js
font: { ucl: "'FCBLettering-UCL', sans-serif", laliga: "'FCBLettering-Liga', sans-serif" },
```

and add a matching `@font-face` per file. Tell me and I'll set it up.

## Other clubs
Same pattern: add a `@font-face` and point that club's `font:` at it.

## Licensing
Official jersey fonts are licensed. Fine for this prototype; secure rights before
launch.
