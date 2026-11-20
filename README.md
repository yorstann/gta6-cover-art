# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/yorstann/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/yorstann/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Vice Frame is a cover art maker that turns your own photos into GTA-style poster art: your pictures are cut into keylined panels, graded with a Vice-sunset or neon wash, and set under a big condensed headline with a sticker badge for the fictional Palmera City. It opens with a sample photo and a headline already in place, so a finished cover is about two clicks away, and everything runs offline in the browser — your photos never leave your machine.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## How it works

- **Templates** — four panel layouts (Vice Grid, Slash, Triptych, Mosaic) clip your photos into polygons with white keyline dividers, reshaping themselves for square, portrait and landscape covers.
- **Photos** — upload one or several pictures by file picker or drag and drop, assign each to a panel, drag inside the preview to reframe, and zoom per panel; one photo can fill every panel.
- **Colour grades** — Sunset, Neon Nights, Golden Hour, Noir and Raw, each a canvas filter plus a blended colour overlay, finished with a vignette, fine grain and a light leak.
- **Caption** — two editable lines set in Anton: a gradient-filled headline with a thick stroke, hard shadow and optional -4° tilt, a letterspaced sub-line, and a rotated sticker badge.
- **Export** — one click downloads a real PNG at 1080×1080, 1080×1350 or 1920×1080, rendered by the same pipeline as the live preview; "Shuffle the look" re-rolls the layout, grade and arrangement when you want a new direction.

---
<sub>Entered on [make.fun](https://make.fun/?ref=2qd39n6s&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
