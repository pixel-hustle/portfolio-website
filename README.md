# jaredhanline.com — portfolio

Static portfolio site for Jared Hanline (art direction, branding, motion design).
No frameworks, no build dependencies — plain HTML/CSS/JS generated from a single
data file.

## How it works

```
data/data.json     ← ALL content lives here (projects, archives, test bench, about, site info)
build.js           ← turns data.json into the HTML pages
admin.js           ← local CMS: edit content in the browser, saves + rebuilds
assets/img/        ← every image on the site
assets/css/style.css
assets/js/site.js
index.html         ← landing: big section nav + about   (generated, don't edit by hand)
motion.html, design.html          ← the two work sections (generated)
testbench.html                    ← tools & experiments, toggleable (generated)
archive-motion.html, archive-design.html   ← per-section archives, toggleable (generated)
project-*.html                    ← case study pages (generated)
```

## Editing content (the CMS)

```bash
node admin.js
```

Then open **http://localhost:5252/admin** — add, edit, remove, and reorder
case studies and archive pieces, upload images, edit the about page.
Click **Save & Rebuild** when done. Preview the result at
**http://localhost:5252**.

The CMS runs only on your machine. What you publish is still just static files.

## Rebuilding without the CMS

If you edit `data/data.json` by hand:

```bash
node build.js
```

## Publishing

Upload the whole folder (minus `admin.js` / `build.js` / `data/` if you like,
but they're harmless) to any static host — GitHub Pages, Netlify, Vercel,
Cloudflare Pages. No build step needed on the host; the HTML is already built.

## Design notes

- Light/dark mode follows the visitor's OS setting automatically
  (`prefers-color-scheme`) — no toggle, no JS.
- Fonts: Big Shoulders (display) + Archivo (text) from Google Fonts.
- Page transitions: a mosaic tile wipe (`assets/js/transition.js`) sweeps
  upper-left to lower-right to cover the page on internal navigation, then
  sweeps the same direction to reveal the next page; disabled automatically
  for visitors with reduced-motion enabled.
- Videos are click-to-play YouTube embeds (`youtube-nocookie.com`) — nothing
  loads until the visitor hits play.
- Case-study thumbnails swap to their animated version on hover.
