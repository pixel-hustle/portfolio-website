#!/usr/bin/env node
/**
 * build.js — generates the static site from data/data.json.
 *
 *   node build.js
 *
 * Outputs (repo root):
 *   index.html                 the Work page: statement, reel, and one grid of
 *                              every project — case studies, quick-look pieces
 *                              and the logo wall — with filters. Also holds
 *                              the About card. This is the site's entry.
 *   project-<slug>.html        one per case study
 *   logos.html                 the logo wall (when it has logos)
 *   testbench.html             tools & software experiments (toggleable)
 *   home.html, work.html, archive.html, motion.html, design.html,
 *   archive-motion.html, archive-design.html
 *                              redirects, so every older link still lands
 *
 * No dependencies — plain Node. The previous (editorial) design and its
 * generator are kept at the git tag `v2-live`; the data file is unchanged
 * in shape, so that version still builds from it.
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "data.json"), "utf8"));
const { site, about } = d;
const sections = d.sections;
const work = sections.work;
const filters = d.filters || [];
const testbench = d.testbench || { enabled: false, items: [] };
if (!sections.testbench)
  sections.testbench = { label: "Test Bench", desc: "After Effects Extensions / Software Experiments", heading: "Test Bench", blurb: "" };

const WORK_PAGE = "index.html";
const LOGOS_PAGE = "logos.html";

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
    .replace(/&amp;/g, "<span>&amp;</span>")
    .replace(/\*([^*]+)\*/g, "<span>$1</span>")
    .replace(/\s*\|\s*/g, "<br>");

const mailto = `mailto:${site.email}?subject=${encodeURIComponent(site.emailSubject || "")}`;
const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const jsonScript = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c");
const item = (obj) => esc(JSON.stringify(obj));

const hasFilter = (key) => filters.some((f) => f.key === key);
const tagsOf = (x) => (x.tags || []).filter(hasFilter);
const label = (key) => (filters.find((f) => f.key === key) || {}).label || key;
const workHref = (key) => (key ? `${WORK_PAGE}?filter=${encodeURIComponent(key)}` : WORK_PAGE);

const cases = d.caseStudies.filter((p) => !p.hidden);
const arch = d.archive.filter((a) => !a.hidden);
const bench = testbench.enabled ? testbench.items || [] : [];

// The logo wall is one project on the Work grid that opens a page of marks.
// Pieces a logo links to are reached through the wall, so they give up their
// own box on the grid.
const logos = d.logos && d.logos.enabled !== false && (d.logos.items || []).length ? d.logos : null;
const viaWall = new Set(logos ? logos.items.map((l) => l.link).filter(Boolean) : []);
const gridArch = arch.filter((a) => !viaWall.has(a.id));

// a mark is drawn as a mask, so one file takes the page's ink colour in light
// and dark alike (SVG, or any image with transparency). The image is set inline rather than
// through a CSS variable: a url() inside a variable resolves from the
// stylesheet's folder, which would point at the wrong place.
const mark = (l, withColor) =>
  `<span class="mark" style="-webkit-mask-image:url('${esc(l.mono)}');mask-image:url('${esc(l.mono)}')" role="img" aria-label="${esc(l.name)}"></span>${
    withColor && l.color ? `<img class="full" src="${esc(l.color)}" alt="" loading="lazy">` : ""
  }`;

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
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css">
<script>document.documentElement.classList.add("js")</script>
</head>
<body>
<div class="page">`;
}

function nav(active) {
  const link = (href, text, key) => `<a class="pill${active === key ? " on" : ""}" href="${href}"${active === key ? ' aria-current="page"' : ""}>${text}</a>`;
  return `<header class="bar">
  <a href="${WORK_PAGE}"><b>${esc(site.name)}<i>.</i></b></a>
  <nav class="pills" aria-label="Main">
    ${link(WORK_PAGE, esc(work.label || "Work"), "work")}
    ${testbench.enabled ? link("testbench.html", esc(sections.testbench.label), "testbench") : ""}
    ${link(`${WORK_PAGE}#about`, "About", "about")}
    <a class="pill cta" href="${mailto}">Let's talk &nearr;</a>
  </nav>
</header>`;
}

function footer() {
  const socials = site.social
    .map((s) => `<a class="pill" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`)
    .join("");
  return `<section class="grid">
  <div class="box foot rise">
    <h2>Let's connect and create <span>something.</span></h2>
    <div class="acts"><a class="pill cta" href="${mailto}">Email me &nearr;</a>${socials}</div>
  </div>
  <div class="base mono"><span>&copy; ${new Date().getFullYear()} ${esc(site.name)}</span><span>${esc(site.email)}</span><span>Charlotte, NC</span></div>
</section>
</div>
<dialog class="look"><header><strong></strong><button class="pill on" type="button">Close &#10005;</button></header><div class="stack"></div></dialog>
<script src="assets/js/site.js"></script>
</body>
</html>`;
}

// ---------- work page ----------

const meta = (x, extra) => [extra, ...tagsOf(x).map(label)].filter(Boolean).map(esc).join(" &middot; ");

const caseCard = (p, size) => `<a class="card" href="project-${esc(p.slug)}.html" data-kind="case" data-size="${esc(size)}" data-tags="${esc(tagsOf(p).join(" "))}">
  <div class="im"><img src="${esc(p.thumb)}" alt="" loading="lazy">${p.thumbHover ? `<img class="hov" src="${esc(p.thumbHover)}" alt="" loading="lazy">` : ""}</div>
  <span class="kind mono">Case study</span>
  <div class="cap"><strong>${esc(p.title)}</strong><span class="mono">${esc(p.client)} &middot; ${esc(p.discipline)}</span></div></a>`;

const pieceCard = (a, size) => `<button type="button" class="card piece" data-kind="piece" data-size="${esc(size)}" data-tags="${esc(tagsOf(a).join(" "))}" data-item="${item({ title: a.title, video: a.video, images: a.images })}">
  <div class="im"><img src="${esc(a.thumb)}" alt="" loading="lazy"></div>
  <span class="kind mono">${a.video ? "&#9654; Video" : "Stills"}</span>
  <div class="cap"><strong>${esc(a.title)}</strong><span class="mono">${meta(a, a.video ? "Video" : "Stills")}</span></div></button>`;

// a 3 × 3 sheet of marks: the first three logos sit whole in the middle row,
// the rest fill the cut-off rows above and below (repeating if there are few)
const wallCard = (size) => `<a class="card wall" href="${LOGOS_PAGE}" data-kind="case" data-size="${esc(size)}" data-tags="${esc(tagsOf(logos).join(" "))}">
  <div class="marks">${[3, 4, 5, 0, 1, 2, 6, 7, 8]
    .map((n) => logos.items[n % logos.items.length])
    .map((l) => `<span>${mark(l)}</span>`)
    .join("")}</div>
  <span class="kind mono">${pad(logos.items.length)} logos</span>
  <div class="cap"><strong>${esc(logos.title)}</strong></div></a>`;

// Order and size come from the CMS (Work Grid tab): data.workOrder lists item
// ids, and each item may carry its own "size". Until an order is saved, the
// same starter rhythm the CMS seeds is used: a case study, then a couple of
// smaller pieces. Auto size = Large for case studies and the logo wall,
// Small for quick looks; the grid's dense flow packs whatever results.
function workSequence() {
  const tagged = [
    ...cases.map((x) => ({ kind: "case", item: x })),
    ...gridArch.map((x) => ({ kind: "piece", item: x })),
    ...(logos ? [{ kind: "logos", item: logos }] : []),
  ];
  let ordered;
  if (Array.isArray(d.workOrder) && d.workOrder.length) {
    const byId = new Map(tagged.filter((x) => x.item.id).map((x) => [x.item.id, x]));
    ordered = d.workOrder.map((id) => byId.get(id)).filter(Boolean);
    tagged.forEach((x) => { if (!ordered.includes(x)) ordered.push(x); });
  } else {
    ordered = [];
    const cs = tagged.filter((x) => x.kind === "case");
    const ps = tagged.filter((x) => x.kind === "piece");
    if (logos) ps.splice(Math.min(2, ps.length), 0, { kind: "logos", item: logos });
    const per = cs.length ? Math.max(1, Math.floor(ps.length / cs.length)) : 0;
    cs.forEach((c) => { ordered.push(c); ordered.push(...ps.splice(0, per)); });
    ordered.push(...ps);
  }
  return ordered.map((x) =>
    x.kind === "logos" ? wallCard(x.item.size || "large")
    : x.kind === "case" ? caseCard(x.item, x.item.size || "large")
    : pieceCard(x.item, x.item.size || "small")
  );
}

function buildWork() {
  const all = [...cases, ...gridArch, ...(logos ? [logos] : [])];
  const count = (k) => all.filter((x) => tagsOf(x).includes(k)).length;
  const nCases = cases.length + (logos ? 1 : 0);
  const fp = (k, name, n, on) => `<button type="button" class="fp" data-f="${esc(k)}" aria-pressed="${!!on}">${esc(name)}<sup>${pad(n)}</sup></button>`;
  const pills = [fp("all", "All", all.length, true)];
  if (nCases && nCases < all.length) pills.push(fp("cases", "Case studies", nCases));
  filters.filter((f) => count(f.key)).forEach((f) => pills.push(fp(f.key, f.label, count(f.key))));

  // each filter can bring its own header text; blank falls back to the page's own
  const views = { all: { heading: accent(work.heading || work.label), blurb: work.blurb || "" } };
  filters.forEach((f) => { if (f.heading) views[f.key] = { heading: accent(f.heading), blurb: f.blurb || "" }; });

  const reel = site.reelVideo && (work.showReel || filters.some((f) => f.showReel));
  const full = reel ? "" : " full";
  const tool = bench[0];
  const benchCard = tool
    ? `<a class="box tri dark rise" href="testbench.html" style="flex-direction:row;align-items:stretch"><div style="flex:1;display:flex;flex-direction:column;justify-content:space-between"><div><span class="mono">${esc(sections.testbench.label)}</span><h3 style="margin-top:10px">${esc(tool.name)}${bench.length > 1 ? ` + ${bench.length - 1} more tool${bench.length > 2 ? "s" : ""}` : ""}</h3><p style="margin-top:8px">${esc(sections.testbench.desc)}</p></div><span class="mono">Open the bench &rarr;</span></div>${
        (tool.images || [])[0] ? `<div class="shot" style="flex:1.2;align-self:center"><img src="${esc(tool.images[0])}" alt="" loading="lazy"></div>` : ""
      }</a>`
    : "";

  return `${head(site.title, site.tagline, site.reelPoster)}
${nav("work")}
<main>
<script type="application/json" data-views>${jsonScript(views)}</script>
<div class="grid">
  <section class="box state${full}"><div><h1 class="big">${views.all.heading}</h1><p class="quip">${esc(views.all.blurb)}</p></div>
    <p class="intro">${esc(site.tagline)}</p></section>
  <div class="label filters${full}" id="work"><h2>${esc(work.label || "Work")}</h2><div class="fpills" role="group" aria-label="Filter projects">${pills.join("")}</div></div>
  ${
    reel
      ? `<div class="side solo"><button type="button" class="box reel" data-item="${item({ title: "Motion reel", video: site.reelVideo })}" aria-label="Play the motion reel"><img src="${esc(site.reelPoster || ytThumb(site.reelVideo))}" alt=""><span class="chip"><i>&#9654;</i> Play the motion reel</span></button></div>`
      : ""
  }
</div>
<div class="workwrap"><div class="work" data-work>
  ${workSequence().join("\n  ")}
</div></div>
<section class="grid">
  <div class="label" id="about"><h2>About</h2><span class="mono">Charlotte, NC</span></div>
  ${benchCard}
  <div class="box tri about rise${benchCard ? "" : " wide"}"><div class="ph"><img src="${esc(about.portrait)}" alt="Portrait of ${esc(site.name)}" loading="lazy"></div><div class="tx"><p>${esc(about.intro)}</p><a class="pill cta" href="${mailto}" style="align-self:flex-start">Email me &nearr;</a></div></div>
</section>
</main>
${footer()}`;
}

// ---------- logo wall ----------

function buildLogos() {
  const target = (id) => arch.find((a) => a.id === id) || cases.find((c) => c.id === id || c.slug === id);
  const tile = (l) => {
    const t = l.link && target(l.link);
    const inner = `<div class="art">${mark(l, true)}</div><div class="nm mono"><span>${esc(l.name)}</span>${t ? "<b>View project &nearr;</b>" : ""}</div>`;
    const cls = `logo rise${l.color ? " has-full" : ""}`;
    if (t && t.slug) return `<a class="${cls}" href="project-${esc(t.slug)}.html">${inner}</a>`;
    if (t) return `<button type="button" class="${cls}" data-item="${item({ title: t.title, video: t.video, images: t.images })}">${inner}</button>`;
    return `<div class="${cls}">${inner}</div>`;
  };
  return `${head(`${logos.title} — ${site.name}`, logos.intro || `Logo design by ${site.name}.`)}
${nav("work")}
<main>
<div class="grid">
  <section class="box wallhead"><div><a class="mono backlink" href="${WORK_PAGE}#work" data-back-work style="display:block;margin-bottom:18px">&larr; All work</a><h1>${esc(logos.title)}</h1></div><p>${esc(logos.intro || "")}</p></section>
</div>
<div class="wall-grid">
  ${logos.items.map(tile).join("\n  ")}
</div>
</main>
${footer()}`;
}

// ---------- test bench ----------

function buildTestbench() {
  const tb = sections.testbench;
  const items = testbench.items || [];
  const entries = items
    .map((t, i) => {
      const shots = (t.images && t.images.length ? t.images : [t.image]).filter(Boolean);
      const payload = item({ title: t.name, images: shots });
      const shot = (src, n) => `<button type="button" class="shot" data-item="${payload}" data-index="${n}" aria-label="View ${esc(t.name)} screenshot ${n + 1} of ${shots.length}"><img src="${esc(src)}" alt="${esc(t.name)} screenshot ${n + 1}" loading="lazy"></button>`;
      // no link yet → no button at all
      const action =
        t.link && t.link.url
          ? t.link.type === "download"
            ? `<a class="pill cta" href="${esc(t.link.url)}" download>Get this &darr;</a>`
            : `<a class="pill cta" href="${esc(t.link.url)}" target="_blank" rel="noopener">Try it &nearr;</a>`
          : "";
      return `<article class="bench rise">
  <div class="box info"><span class="num mono">${pad(i + 1)}</span><h2>${esc(t.name)}</h2><p>${esc(t.blurb || "")}</p>${action}</div>
  <div class="shots">${shots.length ? shot(shots[0], 0) : ""}${
        shots.length > 1 ? `<div class="thumbs">${shots.slice(1).map((s, n) => shot(s, n + 1)).join("")}</div>` : ""
      }</div>
</article>`;
    })
    .join("\n");

  return `${head(`${tb.label} — ${site.name}`, tb.blurb || `${tb.desc} by ${site.name}.`)}
${nav("testbench")}
<main>
<div class="grid">
  <section class="box wallhead"><div><h1 class="big">${accent(tb.heading || tb.label)}</h1></div><p>${esc(tb.blurb || tb.desc || "")}</p></section>
  ${items.length ? entries : `<p class="box empty">Tools are being loaded onto the bench &mdash; check back soon.</p>`}
</div>
</main>
${footer()}`;
}

// ---------- case study pages ----------

// text sections become cards; a run of images shows the first full width and
// the rest in pairs (an odd one out goes full width); videos are full width
function projectBlocks(p) {
  const out = [];
  let run = [];
  const flush = () => {
    run.forEach((b, i) => {
      const fullWidth = i === 0 || ((run.length - 1) % 2 === 1 && i === run.length - 1);
      out.push(`<figure class="media ${fullWidth ? "m12" : "m6"} rise"><img src="${esc(b.src)}" alt="${esc(b.caption || p.title)}" loading="lazy">${b.caption ? `<figcaption class="mono">${esc(b.caption)}</figcaption>` : ""}</figure>`);
    });
    run = [];
  };
  for (const b of p.blocks || []) {
    if (b.type === "image" && b.src) { run.push(b); continue; }
    flush();
    if (b.type === "text") {
      out.push(`<section class="box text rise"><h2 class="mono">${esc(b.heading)}</h2><div>${(b.body || []).map((t) => `<p>${esc(t)}</p>`).join("")}</div></section>`);
    } else if (b.type === "video" && b.id) {
      out.push(`<figure class="media m12 rise"><div class="vid"><button type="button" data-video="${esc(b.id)}" aria-label="Play: ${esc(b.caption || p.title)}"><img src="https://i.ytimg.com/vi/${esc(b.id)}/maxresdefault.jpg" alt="" loading="lazy" onload="if(this.naturalWidth<=120)this.src='${esc(ytThumb(b.id))}'"><i>&#9654;</i></button></div>${b.caption ? `<figcaption class="mono">${esc(b.caption)}</figcaption>` : ""}</figure>`);
    }
  }
  flush();
  return out.join("\n  ");
}

function buildProject(p) {
  const i = cases.findIndex((x) => x.slug === p.slug);
  const prev = cases[(i - 1 + cases.length) % cases.length] || p;
  const next = cases[(i + 1) % cases.length] || p;
  const role = (p.credits && p.credits[0] ? p.credits[0].split(":")[0] : "Art Direction").trim();
  const pn = (q, text) => `<a class="box pn rise" href="project-${esc(q.slug)}.html">${q.thumb ? `<div class="ph"><img src="${esc(q.thumb)}" alt="" loading="lazy"></div>` : ""}<div class="tx"><span class="mono">${text}</span><strong>${esc(q.title)}</strong></div></a>`;

  return `${head(`${p.title} — ${site.name}`, `${p.title} · ${p.client} · ${p.discipline}`, p.hero)}
${nav("work")}
<main class="grid">
  <section class="box title"><a class="mono backlink" href="${WORK_PAGE}#work" data-back-work>&larr; All work</a><h1>${esc(p.title)}</h1></section>
  <div class="facts"><div class="box fact"><span class="mono">Client</span><strong>${esc(p.client)}</strong></div><div class="box fact"><span class="mono">Discipline</span><strong>${esc(p.discipline)}</strong></div><div class="box fact hot"><span class="mono">Role</span><strong>${esc(role)}</strong></div></div>
  ${p.hero ? `<figure class="media hero"><img src="${esc(p.hero)}" alt="${esc(p.title)}"></figure>` : ""}
  ${projectBlocks(p)}
  <section class="box credits rise"><span class="mono">Credits</span><ul>${(p.credits || []).map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>
  ${pn(prev, "&larr; Previous")}${pn(next, "Next &rarr;")}
</main>
${footer()}`;
}

// older URLs stay alive as redirects (keeping any ?filter= and #hash)
function redirectPage(to) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Redirecting…</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(to)}">
<meta http-equiv="refresh" content="0; url=${esc(to)}">
<script>location.replace(${JSON.stringify(to)} + (${JSON.stringify(to)}.indexOf("?") < 0 && ${JSON.stringify(to)}.indexOf("#") < 0 ? location.search + location.hash : ""))</script>
</head>
<body><a href="${esc(to)}">Continue</a></body>
</html>
`;
}

// ---------- write everything ----------

function write(name, html) {
  fs.writeFileSync(path.join(ROOT, name), html);
  console.log("  built", name);
}

console.log("Building site from data/data.json ...");

const redirects = {
  "home.html": `${WORK_PAGE}#about`,
  "work.html": WORK_PAGE,
  "archive.html": WORK_PAGE,
  "motion.html": workHref(hasFilter("motion") && "motion"),
  "design.html": workHref(hasFilter("design") && "design"),
  "archive-motion.html": workHref(hasFilter("motion") && "motion"),
  "archive-design.html": workHref(hasFilter("design") && "design"),
};

const expected = new Set([WORK_PAGE, ...Object.keys(redirects)]);
if (logos) expected.add(LOGOS_PAGE);
if (testbench.enabled) expected.add("testbench.html");
cases.forEach((p) => expected.add(`project-${p.slug}.html`));

// remove generated pages that shouldn't exist anymore
const generated = /^(project-.*|home|about|logos|archive|archive-motion|archive-design|motion|design|work|testbench)\.html$/;
for (const f of fs.readdirSync(ROOT)) {
  if (generated.test(f) && !expected.has(f)) {
    fs.unlinkSync(path.join(ROOT, f));
    console.log("  removed stale", f);
  }
}

write(WORK_PAGE, buildWork());
if (logos) write(LOGOS_PAGE, buildLogos());
if (testbench.enabled) write("testbench.html", buildTestbench());
cases.forEach((p) => write(`project-${p.slug}.html`, buildProject(p)));
for (const [name, to] of Object.entries(redirects)) write(name, redirectPage(to));

console.log("Done.");
