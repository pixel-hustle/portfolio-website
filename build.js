#!/usr/bin/env node
/**
 * build.js — generates the static site from data/data.json.
 *
 *   node build.js
 *
 * Outputs (repo root):
 *   index.html                      landing (big section nav + about)
 *   motion.html / design.html       the two work sections
 *   testbench.html                  tools & software experiments (toggleable)
 *   archive-motion.html / -design.html   per-section archives (toggleable)
 *   project-<slug>.html             one per case study
 *
 * No dependencies — plain Node.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "data.json"), "utf8"));
const { site, caseStudies, archive, about } = data;
const sections = data.sections;
const testbench = data.testbench || { enabled: false, items: [] };
// older data files predate the editable Test Bench page text
if (!sections.testbench)
  sections.testbench = {
    label: "Test Bench",
    desc: "After Effects Extensions / Software Experiments",
    heading: "Test Bench",
    blurb: "",
  };

// ---------- helpers ----------

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const pad = (n) => String(n).padStart(2, "0");

// "&" and *word* render in the accent color; "|" forces a line break
const accent = (s) =>
  esc(s)
    .replace(/&amp;/g, "<em>&amp;</em>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\s*\|\s*/g, "<br>");

const mailto = `mailto:${site.email}?subject=${encodeURIComponent(site.emailSubject || "")}`;

const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const playIcon = `<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>`;

const inSection = (item, key) => {
  const s = item.section || "design";
  return !item.hidden && (s === key || s === "both");
};
const bySection = (key) => caseStudies.filter((p) => inSection(p, key));
const archiveBySection = (key) => archive.filter((a) => inSection(a, key));
// a "both" project needs one home for its back-link and prev/next chain
const primarySection = (p) =>
  p.section === "motion" || p.section === "both" ? "motion" : "design";

function videoFacade(id, label, poster) {
  return `<div class="video-embed">
  <button class="video-facade" data-video="${esc(id)}" aria-label="Play: ${esc(label)}">
    <img src="${esc(poster || ytThumb(id))}" alt="" loading="lazy">
    ${playIcon}
  </button>
</div>`;
}

// ---------- shared shell ----------

function head(title, description, image) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${image ? `<meta property="og:image" content="${esc(image)}">` : ""}
<link rel="icon" href="assets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Big+Shoulders:opsz,wght@10..72,700&family=Archivo:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<script src="assets/js/transition.js"></script>`;
}

function nav(active) {
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`;
  // the landing page is the navigation — its header is just the wordmark
  const links =
    active === "home"
      ? ""
      : `
    <nav class="site-nav" aria-label="Main">
      ${link("motion.html", "Motion", "motion")}
      ${link("design.html", "Design", "design")}
      ${testbench.enabled ? link("testbench.html", esc(sections.testbench.label), "testbench") : ""}
    </nav>`;
  return `<header class="site-header">
  <div class="wrap">
    <a class="wordmark" href="index.html">Jared Hanline<span>.</span></a>${links}
  </div>
</header>`;
}

function footer() {
  const socials = site.social
    .map((s) => `<a class="plain" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`)
    .join("\n      ");
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-cta">
      <h2>Let's connect and create <em>something.</em></h2>
      <div class="footer-actions">
        <a class="btn-accent" href="${mailto}">Email me</a>
        ${socials}
      </div>
    </div>
    <div class="footer-base">
      <span class="mono">&copy; ${new Date().getFullYear()} ${esc(site.name)}</span>
      <span class="mono">${esc(site.email)}</span>
      <span class="mono">Charlotte, NC</span>
    </div>
  </div>
</footer>
<script src="assets/js/site.js"></script>
</body>
</html>`;
}

// ---------- shared fragments ----------

function workGrid(list) {
  return list
    .map(
      (p, i) => `<article class="work-card">
  <a href="project-${esc(p.slug)}.html">
    <figure>
      <img src="${esc(p.thumb)}" alt="${esc(p.title)}" loading="${i < 2 ? "eager" : "lazy"}">
      ${p.thumbHover ? `<img class="thumb-hover" src="${esc(p.thumbHover)}" alt="" loading="lazy">` : ""}
    </figure>
    <div class="title-row">
      <span class="num">${pad(i + 1)}</span>
      <h3>${esc(p.title)}</h3>
      <span class="arrow" aria-hidden="true">&rarr;</span>
    </div>
    <p class="meta">${esc(p.client)} &middot; ${esc(p.discipline)}</p>
  </a>
</article>`
    )
    .join("\n");
}

function archiveTeaser(key) {
  const items = archiveBySection(key);
  return `<div class="archive-teaser">
      <a href="archive-${key}.html">
        <span class="display">The Archive</span>
        <span class="mono">${items.length} more pieces beyond the case studies</span>
        <span class="arrow" aria-hidden="true">&rarr;</span>
      </a>
    </div>`;
}

// ---------- landing ----------

function buildLanding() {
  const rows = [
    { href: "motion.html", label: sections.motion.label, desc: sections.motion.desc },
    { href: "design.html", label: sections.design.label, desc: sections.design.desc },
  ];
  if (testbench.enabled) {
    rows.push({
      href: "testbench.html",
      label: sections.testbench.label,
      desc: sections.testbench.desc,
    });
  }

  const rowsHtml = rows
    .map(
      (r, i) => `<a class="land-row" href="${r.href}">
      <span class="num mono">${pad(i + 1)}</span>
      <h2 class="display">${accent(r.label)}</h2>
      <span class="desc mono">${esc(r.desc)}</span>
      <span class="arrow" aria-hidden="true">&rarr;</span>
    </a>`
    )
    .join("\n");

  return `${head(site.title, site.tagline, site.reelPoster)}
${nav("home")}
<main>
  <div class="land-hero">
    <section class="land-masthead wrap">
      <h1 class="display">${accent(site.headline || site.role)}</h1>
      <p>${esc(site.tagline)}</p>
    </section>

    <nav class="land-rows wrap" aria-label="Sections">
${rowsHtml}
    </nav>
  </div>

  <section class="section wrap" id="about">
    <div class="section-head">
      <h2>About Me</h2>
      <span class="mono">Charlotte, NC</span>
    </div>
    <div class="about-intro">
      <p class="lede">${esc(about.intro)}</p>
      <figure class="about-portrait">
        <img src="${esc(about.portrait)}" alt="Portrait of ${esc(site.name)}" loading="lazy">
      </figure>
      <div class="about-actions">
        <a class="btn-accent" href="${mailto}">Email me</a>
      </div>
    </div>
  </section>
</main>
${footer()}`;
}

// ---------- section pages ----------

function buildMotion() {
  const list = bySection("motion");
  return `${head(`${sections.motion.label} — ${site.name}`, `Motion design work by ${site.name}: ${sections.motion.desc}`, site.reelPoster)}
${nav("motion")}
<main>
  <header class="page-head wrap">
    <p class="kicker mono">${esc(sections.motion.label)}</p>
    <h1 class="display">${accent(sections.motion.heading || sections.motion.label)}</h1>
    <p class="blurb">${esc(sections.motion.blurb || "")}</p>
  </header>

  <section class="section wrap" id="reel">
    <div class="section-head">
      <h2>Motion Reel</h2>
      <span class="mono">The star of the show</span>
    </div>
    ${videoFacade(site.reelVideo, "Motion reel", site.reelPoster)}
  </section>

  <section class="section wrap" id="work">
    <div class="section-head">
      <h2>Case Studies</h2>
      <span class="mono">${pad(list.length)}</span>
    </div>
    <div class="work-grid">
${workGrid(list)}
    </div>
    ${sections.motion.archiveEnabled ? archiveTeaser("motion") : ""}
  </section>
</main>
${footer()}`;
}

function buildDesign() {
  const list = bySection("design");
  return `${head(`${sections.design.label} — ${site.name}`, `Design and branding work by ${site.name}: ${sections.design.desc}`)}
${nav("design")}
<main>
  <header class="page-head wrap">
    <p class="kicker mono">${esc(sections.design.label)}</p>
    <h1 class="display">${accent(sections.design.heading || sections.design.label)}</h1>
    <p class="blurb">${esc(sections.design.blurb || "")}</p>
  </header>

  <section class="section wrap" id="work">
    <div class="section-head">
      <h2>Case Studies</h2>
      <span class="mono">${pad(list.length)}</span>
    </div>
    <div class="work-grid">
${workGrid(list)}
    </div>
    ${sections.design.archiveEnabled ? archiveTeaser("design") : ""}
  </section>
</main>
${footer()}`;
}

// ---------- test bench ----------

function buildTestbench() {
  const items = testbench.items || [];

  // one gallery per tool: image 1 leads, the rest support. Both are lightboxed.
  const entries = items
    .map((t, i) => {
      const shots = (t.images && t.images.length ? t.images : [t.image]).filter(Boolean);
      const payload = esc(JSON.stringify({ title: t.name, images: shots }));

      const shot = (src, n, cls) => `<button class="${cls}" type="button"
    data-bench="${payload}" data-index="${n}"
    aria-label="View ${esc(t.name)} screenshot ${n + 1} of ${shots.length}">
    <img src="${esc(src)}" alt="${esc(t.name)} screenshot ${n + 1}" loading="${i === 0 && n === 0 ? "eager" : "lazy"}">
  </button>`;

      const support = shots.slice(1);
      const media = shots.length
        ? `<div class="bench-media">
  ${shot(shots[0], 0, "bench-shot")}
  ${support.length ? `<div class="bench-thumbs">\n  ${support.map((src, n) => shot(src, n + 1, "bench-thumb")).join("\n  ")}\n</div>` : ""}
</div>`
        : "";

      // no link yet → no button at all
      const action =
        t.link && t.link.url
          ? t.link.type === "download"
            ? `<a class="bench-link" href="${esc(t.link.url)}" download>Get This &darr;</a>`
            : `<a class="bench-link" href="${esc(t.link.url)}" target="_blank" rel="noopener">Try it &nearr;</a>`
          : "";

      return `<article class="bench-entry">
  <div class="bench-info">
    <span class="num mono">${pad(i + 1)}</span>
    <h2 class="display">${esc(t.name)}</h2>
    <p class="bench-blurb">${esc(t.blurb || "")}</p>
    ${action}
    ${shots.length > 1 ? `<p class="bench-count mono">${pad(shots.length)} screens &mdash; click to enlarge</p>` : ""}
  </div>
${media}
</article>`;
    })
    .join("\n");

  const empty = `<p class="bench-empty">Tools are being loaded onto the bench &mdash; check back soon.</p>`;

  const tb = sections.testbench;
  return `${head(`${tb.label} — ${site.name}`, tb.blurb || `${tb.desc} by ${site.name}.`)}
${nav("testbench")}
<main>
  <header class="page-head wrap">
    <p class="kicker mono">${esc(tb.label)}</p>
    <h1 class="display">${accent(tb.heading || tb.label)}</h1>
    <p class="blurb">${esc(tb.blurb || "")}</p>
  </header>
  <section class="section wrap" style="padding-top:0">
    ${items.length ? `<div class="bench-list">\n${entries}\n</div>` : empty}
  </section>
</main>

<dialog class="lightbox benchbox" id="benchbox">
  <div class="benchbox-inner">
    <div class="lightbox-bar">
      <h3></h3>
      <span class="benchbox-counter mono"></span>
      <button class="lightbox-close" type="button">Close</button>
    </div>
    <figure class="benchbox-stage">
      <button class="benchbox-nav prev" type="button" aria-label="Previous screenshot">&larr;</button>
      <img alt="">
      <button class="benchbox-nav next" type="button" aria-label="Next screenshot">&rarr;</button>
    </figure>
  </div>
</dialog>
${footer()}`;
}

// ---------- project pages ----------

function buildProject(p) {
  const home = primarySection(p);
  const siblings = bySection(home);
  const i = siblings.findIndex((x) => x.slug === p.slug);
  const prev = siblings[(i - 1 + siblings.length) % siblings.length] || p;
  const next = siblings[(i + 1) % siblings.length] || p;
  const backHref = `${home}.html#work`;

  const sectionsHtml = (p.sections || [])
    .map(
      (s) => `<section class="project-section">
  <h2>${esc(s.heading)}</h2>
  <div class="body">
    ${s.body.map((par) => `<p>${esc(par)}</p>`).join("\n    ")}
  </div>
</section>`
    )
    .join("\n");

  const videos = (p.videos || [])
    .map(
      (v) => `<figure>
  ${videoFacade(v.id, v.caption || p.title)}
  ${v.caption ? `<figcaption class="media-caption">${esc(v.caption)}</figcaption>` : ""}
</figure>`
    )
    .join("\n");

  const gallery = (p.gallery || [])
    .map((src) => `<figure><img src="${esc(src)}" alt="${esc(p.title)}" loading="lazy"></figure>`)
    .join("\n");

  const credits = (p.credits || []).map((c) => `<li>${esc(c)}</li>`).join("\n      ");

  return `${head(`${p.title} — ${site.name}`, `${p.title} · ${p.client} · ${p.discipline}`, p.hero)}
${nav(home)}
<main class="wrap">
  <a class="back-link mono" href="${backHref}">&larr; ${esc(sections[home].label)}</a>
  <header class="project-head">
    <h1 class="display">${esc(p.title)}</h1>
    <dl class="project-meta">
      <div><dt>Client</dt><dd>${esc(p.client)}</dd></div>
      <div><dt>Discipline</dt><dd>${esc(p.discipline)}</dd></div>
      <div><dt>Role</dt><dd>${esc((p.credits && p.credits[0] ? p.credits[0].split(":")[0] : "Art Direction").trim())}</dd></div>
    </dl>
  </header>

  ${p.hero ? `<figure class="project-hero"><img src="${esc(p.hero)}" alt="${esc(p.title)}"></figure>` : ""}

${sectionsHtml}

  ${videos || gallery ? `<div class="project-media">\n${videos}\n${gallery}\n  </div>` : ""}

  <section class="project-credits">
    <h2>Credits</h2>
    <ul>
      ${credits}
    </ul>
  </section>

  <nav class="project-nav" aria-label="Project navigation">
    <a href="project-${esc(prev.slug)}.html">
      <span class="mono">&larr; Previous</span>
      <span class="display">${esc(prev.title)}</span>
    </a>
    <a href="project-${esc(next.slug)}.html">
      <span class="mono">Next &rarr;</span>
      <span class="display">${esc(next.title)}</span>
    </a>
  </nav>
</main>
${footer()}`;
}

// ---------- archives ----------

function buildArchive(key) {
  const items = archiveBySection(key);
  const cards = items
    .map((item) => {
      const payload = esc(JSON.stringify({ title: item.title, video: item.video, images: item.images }));
      const kind = item.video ? "Video" : "Stills";
      return `<button class="archive-card" type="button" data-item="${payload}">
  <figure><img src="${esc(item.thumb)}" alt="${esc(item.title)}" loading="lazy"></figure>
  <h3>${esc(item.title)}</h3>
  <p class="meta">${kind}</p>
</button>`;
    })
    .join("\n");

  const label = sections[key].label;

  return `${head(`${label} Archive — ${site.name}`, `More ${label.toLowerCase()} work by ${site.name}.`)}
${nav(key)}
<main class="wrap">
  <a class="back-link mono" href="${key}.html#work">&larr; ${esc(label)}</a>
  <header class="page-head">
    <h1 class="display">The Archive</h1>
    <p class="lede">Smaller ${key === "motion" ? "motion pieces, IDs, and intros" : "logos, identities, and illustration work"} that didn't need a full case study. Click any piece to view it.</p>
  </header>
  <div class="archive-grid">
${cards}
  </div>
</main>

<dialog class="lightbox" id="lightbox">
  <div class="lightbox-inner">
    <div class="lightbox-bar">
      <h3></h3>
      <button class="lightbox-close" type="button">Close</button>
    </div>
    <div class="lightbox-media"></div>
  </div>
</dialog>
${footer()}`;
}

// ---------- write everything ----------

function write(name, html) {
  fs.writeFileSync(path.join(ROOT, name), html);
  console.log("  built", name);
}

console.log("Building site from data/data.json ...");

const expected = new Set(["index.html", "motion.html", "design.html"]);
if (testbench.enabled) expected.add("testbench.html");
if (sections.motion.archiveEnabled) expected.add("archive-motion.html");
if (sections.design.archiveEnabled) expected.add("archive-design.html");
caseStudies.filter((p) => !p.hidden).forEach((p) => expected.add(`project-${p.slug}.html`));

// remove generated pages that shouldn't exist anymore
const generated = /^(project-.*|about|archive|archive-motion|archive-design|motion|design|testbench)\.html$/;
for (const f of fs.readdirSync(ROOT)) {
  if (generated.test(f) && !expected.has(f)) {
    fs.unlinkSync(path.join(ROOT, f));
    console.log("  removed stale", f);
  }
}

write("index.html", buildLanding());
write("motion.html", buildMotion());
write("design.html", buildDesign());
if (testbench.enabled) write("testbench.html", buildTestbench());
caseStudies.filter((p) => !p.hidden).forEach((p) => write(`project-${p.slug}.html`, buildProject(p)));
if (sections.motion.archiveEnabled) write("archive-motion.html", buildArchive("motion"));
if (sections.design.archiveEnabled) write("archive-design.html", buildArchive("design"));

console.log("Done.");
