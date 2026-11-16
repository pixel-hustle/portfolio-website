# jaredhanline.com — portfolio

Static portfolio site for Jared Hanline (art direction, branding, motion design).
No frameworks, no build dependencies — plain HTML/CSS/JS generated from a single
data file.

## How it works

```
data/data.json     ← ALL content lives here (projects, archive pieces, logos, test bench, about, site info)
build.js           ← turns data.json into the HTML pages
admin.js           ← local CMS: edit content in the browser, saves + rebuilds
assets/img/        ← every image on the site
assets/css/style.css
assets/js/site.js
index.html         ← the Work page and site entry: statement, reel, one grid of every
                     project with filters, and the About card   (generated, don't edit by hand)
project-*.html     ← case study pages (generated)
logos.html         ← the logo wall (generated)
testbench.html     ← tools & experiments, toggleable (generated)
home.html, work.html, archive.html, motion.html, design.html, archive-*.html
                   ← redirects so old links still land
```

The previous design (editorial, with a separate landing page and Archive page)
is kept at the git tag `v2-live`. The data file kept its shape, so
`git checkout v2-live -- build.js assets/css assets/js && node build.js`
brings that version back from today's content.

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

- "Studio" look: soft grey page, white rounded cards, one orange accent;
  Inter Tight with JetBrains Mono labels.
- Light/dark mode follows the visitor's OS setting automatically — no toggle.
- The Work grid is four columns of equal cells. Every project is a box of some
  size (Small, Wide, Tall, Large, Full); order and size are set in the CMS's
  Work Grid tab. Case studies open their own page; smaller pieces open in a
  pop-up viewer; the Logo Design box opens the logo wall.
- Logos on the wall are drawn from a single-colour file (SVG ideally) that the
  site tints for light and dark; an optional full-colour file shows on hover.
- Filters animate boxes out, across and in. Videos are click-to-play YouTube
  embeds (`youtube-nocookie.com`). Motion is skipped for reduced-motion visitors.
