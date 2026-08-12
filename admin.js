#!/usr/bin/env node
/**
 * admin.js — local CMS for the portfolio.
 *
 *   node admin.js
 *
 * Then open:
 *   http://localhost:5252         → live preview of the built site
 *   http://localhost:5252/admin   → the CMS (add / edit / remove / reorder
 *                                   projects, upload images, save & rebuild)
 *
 * Runs only on your machine (localhost). The published site stays static —
 * saving here rewrites data/data.json and re-runs build.js.
 * No dependencies — plain Node.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data", "data.json");
const IMG_DIR = path.join(ROOT, "assets", "img");
const PORT = 5252;

const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

function send(res, code, body, type = "application/json") {
  res.writeHead(code, { "Content-Type": type });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function rebuild() {
  execFileSync(process.execPath, [path.join(ROOT, "build.js")], { stdio: "pipe" });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ---------- API ----------
  if (url.pathname === "/api/data" && req.method === "GET") {
    return send(res, 200, fs.readFileSync(DATA_FILE, "utf8"));
  }

  if (url.pathname === "/api/data" && req.method === "POST") {
    try {
      const body = JSON.parse(await readBody(req));
      fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2));
      rebuild();
      return send(res, 200, JSON.stringify({ ok: true }));
    } catch (e) {
      return send(res, 400, JSON.stringify({ ok: false, error: String(e.message || e) }));
    }
  }

  if (url.pathname === "/api/images" && req.method === "GET") {
    const files = fs.readdirSync(IMG_DIR)
      .filter((f) => /\.(png|jpe?g|webp|gif|svg)$/i.test(f))
      .sort();
    return send(res, 200, JSON.stringify(files));
  }

  if (url.pathname === "/api/upload" && req.method === "POST") {
    try {
      const { name, dataUrl } = JSON.parse(await readBody(req));
      const clean = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
      if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(clean)) throw new Error("Unsupported file type");
      const base64 = dataUrl.split(",")[1];
      fs.writeFileSync(path.join(IMG_DIR, clean), Buffer.from(base64, "base64"));
      return send(res, 200, JSON.stringify({ ok: true, path: `assets/img/${clean}` }));
    } catch (e) {
      return send(res, 400, JSON.stringify({ ok: false, error: String(e.message || e) }));
    }
  }

  // ---------- Admin UI ----------
  if (url.pathname === "/admin") {
    return send(res, 200, ADMIN_HTML, "text/html");
  }

  // ---------- Static site preview ----------
  let file = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const resolved = path.join(ROOT, file);
  if (!resolved.startsWith(ROOT)) return send(res, 403, "Forbidden", "text/plain");
  if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
    const ext = path.extname(resolved).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    return fs.createReadStream(resolved).pipe(res);
  }
  return send(res, 404, "Not found", "text/plain");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("");
  console.log("  Portfolio CMS running:");
  console.log(`    Site preview:  http://localhost:${PORT}`);
  console.log(`    Admin panel:   http://localhost:${PORT}/admin`);
  console.log("");
  console.log("  Ctrl+C to stop.");
});

// ============================================================
// Admin UI (single page, no dependencies)
// ============================================================

const ADMIN_HTML = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Portfolio CMS — Jared Hanline</title>
<style>
  :root {
    --bg:#f4f1ea; --panel:#faf8f3; --ink:#17140f; --muted:#6f6a5e;
    --line:#d8d3c6; --accent:#d8480b; --accent-ink:#fff8f2; --danger:#b3261e;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#141210; --panel:#1c1915; --ink:#ece7dc; --muted:#9a948a;
            --line:#2f2b24; --accent:#ff5c22; --accent-ink:#1a0d05; --danger:#ff6b61; }
  }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--bg); color:var(--ink);
    font:15px/1.5 "Helvetica Neue", Arial, sans-serif; padding-bottom:6rem; }
  .bar { position:sticky; top:0; z-index:10; display:flex; align-items:center; gap:1rem;
    padding:.8rem 1.2rem; background:var(--bg); border-bottom:1px solid var(--line); }
  .bar h1 { font-size:1rem; text-transform:uppercase; letter-spacing:.08em; }
  .bar .spacer { flex:1; }
  .wrap { max-width:900px; margin:0 auto; padding:1.5rem 1.2rem; }
  .tabs { display:flex; gap:.5rem; margin-bottom:1.5rem; flex-wrap:wrap; }
  .tabs button { padding:.5rem 1rem; border:1px solid var(--line); background:var(--panel);
    color:var(--muted); cursor:pointer; font:inherit; text-transform:uppercase;
    font-size:.72rem; letter-spacing:.1em; }
  .tabs button.active { border-color:var(--accent); color:var(--accent); }
  button.primary { background:var(--accent); color:var(--accent-ink); border:0;
    padding:.6rem 1.4rem; cursor:pointer; font:inherit; text-transform:uppercase;
    font-size:.75rem; letter-spacing:.1em; }
  button.ghost { background:none; border:1px solid var(--line); color:var(--ink);
    padding:.35rem .7rem; cursor:pointer; font:inherit; font-size:.8rem; }
  button.ghost:hover { border-color:var(--accent); color:var(--accent); }
  button.ghost.danger:hover { border-color:var(--danger); color:var(--danger); }
  .row { display:flex; align-items:center; gap:.6rem; padding:.6rem .8rem;
    border:1px solid var(--line); background:var(--panel); margin-bottom:.5rem; }
  .row img { width:64px; height:44px; object-fit:cover; border:1px solid var(--line); }
  .row .grow { flex:1; min-width:0; }
  .row .grow small { color:var(--muted); display:block; }
  .card { border:1px solid var(--line); background:var(--panel); padding:1.2rem; margin-bottom:1rem; }
  label { display:block; font-size:.7rem; text-transform:uppercase; letter-spacing:.1em;
    color:var(--muted); margin:.9rem 0 .25rem; }
  input[type=text], textarea, select { width:100%; padding:.55rem .7rem; font:inherit;
    background:var(--bg); color:var(--ink); border:1px solid var(--line); }
  textarea { min-height:110px; resize:vertical; }
  .imgfield { display:flex; gap:.5rem; align-items:center; }
  .imgfield input { flex:1; }
  .imgfield img { width:72px; height:48px; object-fit:cover; border:1px solid var(--line); }
  .hint { font-size:.78rem; color:var(--muted); margin-top:.3rem; }
  .gallery-list .row { padding:.4rem .6rem; }
  #toast { position:fixed; bottom:1.2rem; left:50%; transform:translateX(-50%);
    background:var(--ink); color:var(--bg); padding:.7rem 1.4rem; font-size:.85rem;
    opacity:0; transition:opacity .2s; pointer-events:none; }
  #toast.show { opacity:1; }
  dialog { border:1px solid var(--line); background:var(--panel); color:var(--ink);
    max-width:820px; width:94vw; max-height:84vh; padding:1rem; }
  dialog::backdrop { background:rgba(10,8,5,.7); }
  .picker-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr));
    gap:.6rem; overflow-y:auto; max-height:60vh; margin-top:.8rem; }
  .picker-grid button { border:1px solid var(--line); background:var(--bg); cursor:pointer; padding:0; }
  .picker-grid button:hover { border-color:var(--accent); }
  .picker-grid img { width:100%; height:80px; object-fit:cover; display:block; }
  .picker-grid span { display:block; font-size:.62rem; color:var(--muted); padding:.2rem;
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  h2.section { font-size:.8rem; text-transform:uppercase; letter-spacing:.12em;
    color:var(--accent); margin:1.6rem 0 .6rem; }
</style>
</head>
<body>
<div class="bar">
  <h1>Portfolio CMS</h1>
  <span class="spacer"></span>
  <a href="/" target="_blank" style="color:var(--muted);font-size:.8rem;">Preview site ↗</a>
  <button class="primary" onclick="saveAll()">Save &amp; Rebuild</button>
</div>

<div class="wrap">
  <div class="tabs">
    <button data-tab="cases" class="active" onclick="showTab('cases')">Case Studies</button>
    <button data-tab="archive" onclick="showTab('archive')">Archives</button>
    <button data-tab="bench" onclick="showTab('bench')">Test Bench</button>
    <button data-tab="about" onclick="showTab('about')">About &amp; Site</button>
  </div>
  <div id="view"></div>
</div>

<div id="toast"></div>

<dialog id="picker">
  <div style="display:flex;align-items:center;gap:1rem;">
    <strong style="flex:1;">Choose an image</strong>
    <label class="ghost" style="margin:0;cursor:pointer;padding:.35rem .7rem;border:1px solid var(--line);font-size:.8rem;text-transform:none;letter-spacing:0;color:var(--ink);">
      Upload new… <input type="file" accept="image/*" style="display:none" onchange="uploadFromPicker(this)">
    </label>
    <button class="ghost" onclick="document.getElementById('picker').close()">Cancel</button>
  </div>
  <div class="picker-grid" id="picker-grid"></div>
</dialog>

<script>
let data = null;
let tab = 'cases';
let editing = null;        // index of case study being edited, or null
let editingArchive = null; // index of archive item being edited, or null
let editingBench = null;   // index of test bench item being edited, or null
let pickerCallback = null;

const $ = (s) => document.querySelector(s);

fetch('/api/data').then(r => r.json()).then(d => { data = d; render(); });

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

async function saveAll() {
  const r = await fetch('/api/data', { method: 'POST', body: JSON.stringify(data) });
  const j = await r.json();
  toast(j.ok ? 'Saved — site rebuilt ✓' : 'Error: ' + j.error);
}

function showTab(t) {
  tab = t; editing = null; editingArchive = null; editingBench = null;
  document.querySelectorAll('.tabs button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === t));
  render();
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function move(arr, i, dir) {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  render();
}

// ---------- image picker ----------

async function openPicker(cb) {
  pickerCallback = cb;
  const files = await (await fetch('/api/images')).json();
  $('#picker-grid').innerHTML = files.map(f =>
    \`<button type="button" onclick="pickImage('assets/img/\${f}')">
       <img src="/assets/img/\${f}" loading="lazy"><span>\${f}</span></button>\`).join('');
  $('#picker').showModal();
}

function pickImage(p) {
  $('#picker').close();
  if (pickerCallback) pickerCallback(p);
}

function uploadFromPicker(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const r = await fetch('/api/upload', { method: 'POST',
      body: JSON.stringify({ name: file.name, dataUrl: reader.result }) });
    const j = await r.json();
    if (j.ok) { $('#picker').close(); if (pickerCallback) pickerCallback(j.path); toast('Uploaded ✓'); }
    else toast('Upload failed: ' + j.error);
  };
  reader.readAsDataURL(file);
}

// ---------- render ----------

function render() {
  if (!data) return;
  if (!data.testbench) data.testbench = { enabled: false, items: [] };
  if (!data.sections.testbench) data.sections.testbench = {
    label: 'Test Bench', desc: 'After Effects Extensions / Software Experiments',
    heading: 'Test Bench', blurb: '' };
  if (tab === 'cases') renderCases();
  else if (tab === 'archive') renderArchive();
  else if (tab === 'bench') renderBench();
  else renderAbout();
}

function sectionSelect(value, onchangeExpr) {
  return \`<select onchange="\${onchangeExpr}">
    <option value="motion" \${value === 'motion' ? 'selected' : ''}>Motion Design</option>
    <option value="design" \${value === 'design' || !value ? 'selected' : ''}>Branding &amp; Graphic Design</option>
    <option value="both" \${value === 'both' ? 'selected' : ''}>Both pages</option>
  </select>\`;
}

function sectionName(s) {
  return s === 'motion' ? 'Motion' : s === 'both' ? 'Both' : 'Design';
}

function hideBtn(expr, hidden) {
  return \`<button class="ghost" title="\${hidden ? 'Hidden from the site — click to show' : 'Shown on the site — click to hide'}"
    onclick="\${expr}; render()">\${hidden ? 'Show' : 'Hide'}</button>\`;
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---------- case studies ----------

function renderCases() {
  if (editing !== null) return renderCaseForm();
  const rows = data.caseStudies.map((p, i) => \`
    <div class="row" style="\${p.hidden ? 'opacity:.45' : ''}">
      <img src="/\${esc(p.thumb)}" onerror="this.style.visibility='hidden'">
      <div class="grow"><strong>\${esc(p.title)}</strong>\${p.hidden ? ' <span style="color:var(--danger);font-size:.75rem">· hidden</span>' : ''}
        <small>\${sectionName(p.section)} · \${esc(p.client)} · \${esc(p.discipline)}</small></div>
      <button class="ghost" onclick="move(data.caseStudies, \${i}, -1)">↑</button>
      <button class="ghost" onclick="move(data.caseStudies, \${i}, 1)">↓</button>
      \${hideBtn('data.caseStudies[' + i + '].hidden = !data.caseStudies[' + i + '].hidden', p.hidden)}
      <button class="ghost" onclick="editing=\${i}; render()">Edit</button>
      <button class="ghost danger" onclick="removeCase(\${i})">Delete</button>
    </div>\`).join('');
  $('#view').innerHTML = rows +
    '<p style="margin-top:1rem;"><button class="primary" onclick="addCase()">+ Add project</button></p>' +
    '<p class="hint">Order here = order on the Portfolio page. Remember to Save &amp; Rebuild.</p>';
}

function removeCase(i) {
  if (confirm('Delete "' + data.caseStudies[i].title + '"? (Takes effect on Save & Rebuild)'))
    { data.caseStudies.splice(i, 1); render(); }
}

function addCase() {
  data.caseStudies.push({ slug:'', title:'New Project', client:'', discipline:'', section:'design',
    thumb:'', thumbHover:'', hero:'',
    sections:[{heading:'The Ask',body:['']},{heading:'The Result',body:['']}],
    videos:[], gallery:[], credits:[] });
  editing = data.caseStudies.length - 1;
  render();
}

// ---------- case study <-> archive conversion ----------

function caseToArchive() {
  const p = data.caseStudies[editing];
  if (!confirm('Send "' + p.title + '" to the Archives?\\n\\nIts full write-up is kept, so promoting it back later restores everything.')) return;
  const item = {
    title: p.title,
    section: p.section || 'design',
    thumb: p.thumb,
    images: [p.hero].concat(p.gallery || []).filter(Boolean),
    _caseStudy: p,
  };
  const vid = p.videos && p.videos[0] && p.videos[0].id;
  if (vid) item.video = vid;
  if (p.hidden) item.hidden = true;
  data.archive.push(item);
  data.caseStudies.splice(editing, 1);
  showTab('archive');
  toast('Moved to Archives — remember to Save & Rebuild');
}

function archiveToCase() {
  const a = data.archive[editingArchive];
  if (!confirm('Promote "' + a.title + '" to a full case study?')) return;
  let p;
  if (a._caseStudy) {
    p = a._caseStudy;
    p.title = a.title;
    p.section = a.section || p.section;
    if (a.thumb) p.thumb = a.thumb;
    if (a.hidden) p.hidden = true; else delete p.hidden;
  } else {
    p = {
      slug: slugify(a.title), title: a.title, client: '', discipline: '',
      section: a.section || 'design',
      thumb: a.thumb || '', thumbHover: '',
      hero: (a.images || [])[0] || a.thumb || '',
      sections: [{ heading: 'The Ask', body: [''] }, { heading: 'The Result', body: [''] }],
      videos: a.video ? [{ id: a.video, caption: '' }] : [],
      gallery: (a.images || []).slice(),
      credits: [],
    };
    if (a.hidden) p.hidden = true;
  }
  let n = 1, base = p.slug;
  while (data.caseStudies.some(x => x.slug === p.slug)) p.slug = base + '-' + (++n);
  data.caseStudies.push(p);
  data.archive.splice(editingArchive, 1);
  showTab('cases');
  toast('Promoted to Case Studies — open it to fill in the details, then Save & Rebuild');
}

function imgField(label, value, onpick, hint) {
  const id = 'f' + Math.random().toString(36).slice(2, 8);
  window[id] = onpick;
  return \`<label>\${label}</label>
    <div class="imgfield">
      \${value ? \`<img src="/\${esc(value)}">\` : ''}
      <input type="text" value="\${esc(value)}" onchange="window['\${id}'](this.value)">
      <button class="ghost" onclick="openPicker(p => { window['\${id}'](p); render(); })">Choose…</button>
    </div>\${hint ? '<p class="hint">' + hint + '</p>' : ''}\`;
}

function renderCaseForm() {
  const p = data.caseStudies[editing];
  const sections = p.sections.map((s, si) => \`
    <div class="row" style="align-items:flex-start;flex-direction:column;">
      <div style="display:flex;gap:.5rem;width:100%;">
        <input type="text" value="\${esc(s.heading)}" placeholder="Section heading"
          onchange="data.caseStudies[\${editing}].sections[\${si}].heading=this.value">
        <button class="ghost danger" onclick="data.caseStudies[\${editing}].sections.splice(\${si},1);render()">✕</button>
      </div>
      <textarea style="width:100%" placeholder="Paragraphs — separate with a blank line"
        onchange="data.caseStudies[\${editing}].sections[\${si}].body=this.value.split(/\\n\\s*\\n/).map(x=>x.trim()).filter(Boolean)">\${esc(s.body.join('\\n\\n'))}</textarea>
    </div>\`).join('');

  const videos = p.videos.map((v, vi) => \`
    <div class="row">
      <input type="text" style="max-width:180px" value="\${esc(v.id)}" placeholder="YouTube ID"
        onchange="data.caseStudies[\${editing}].videos[\${vi}].id=this.value.trim()">
      <input type="text" value="\${esc(v.caption || '')}" placeholder="Caption (optional)"
        onchange="data.caseStudies[\${editing}].videos[\${vi}].caption=this.value">
      <button class="ghost danger" onclick="data.caseStudies[\${editing}].videos.splice(\${vi},1);render()">✕</button>
    </div>\`).join('');

  const gallery = p.gallery.map((g, gi) => \`
    <div class="row">
      <img src="/\${esc(g)}" onerror="this.style.visibility='hidden'">
      <div class="grow"><small>\${esc(g)}</small></div>
      <button class="ghost" onclick="move(data.caseStudies[\${editing}].gallery, \${gi}, -1)">↑</button>
      <button class="ghost" onclick="move(data.caseStudies[\${editing}].gallery, \${gi}, 1)">↓</button>
      <button class="ghost danger" onclick="data.caseStudies[\${editing}].gallery.splice(\${gi},1);render()">✕</button>
    </div>\`).join('');

  $('#view').innerHTML = \`
    <button class="ghost" onclick="editing=null;render()">← Back to list</button>
    <div class="card">
      <label>Title</label>
      <input type="text" value="\${esc(p.title)}"
        onchange="const p=data.caseStudies[\${editing}]; p.title=this.value; if(!p.slug) p.slug=slugify(this.value);">
      <label>URL slug <span style="text-transform:none;letter-spacing:0">(page becomes project-&lt;slug&gt;.html)</span></label>
      <input type="text" value="\${esc(p.slug)}" onchange="data.caseStudies[\${editing}].slug=slugify(this.value)">
      <label>Section (which page this project lives on)</label>
      \${sectionSelect(p.section, 'data.caseStudies[' + editing + '].section=this.value')}
      <label>Client</label>
      <input type="text" value="\${esc(p.client)}" onchange="data.caseStudies[\${editing}].client=this.value">
      <label>Discipline</label>
      <input type="text" value="\${esc(p.discipline)}" onchange="data.caseStudies[\${editing}].discipline=this.value">
      \${imgField('Thumbnail', p.thumb, v => data.caseStudies[editing].thumb = v)}
      \${imgField('Thumbnail on hover (animated)', p.thumbHover, v => data.caseStudies[editing].thumbHover = v, 'Optional — shown when the cursor is over the card.')}
      \${imgField('Hero image', p.hero, v => data.caseStudies[editing].hero = v)}

      <h2 class="section">Text sections</h2>
      \${sections}
      <button class="ghost" onclick="data.caseStudies[\${editing}].sections.push({heading:'',body:['']});render()">+ Add section</button>

      <h2 class="section">Videos (YouTube)</h2>
      \${videos}
      <button class="ghost" onclick="data.caseStudies[\${editing}].videos.push({id:'',caption:''});render()">+ Add video</button>
      <p class="hint">The ID is the part after "watch?v=" in a YouTube URL.</p>

      <h2 class="section">Gallery</h2>
      <div class="gallery-list">\${gallery}</div>
      <button class="ghost" onclick="openPicker(p => { data.caseStudies[editing].gallery.push(p); render(); })">+ Add image</button>

      <h2 class="section">Credits</h2>
      <textarea placeholder="One credit per line"
        onchange="data.caseStudies[\${editing}].credits=this.value.split('\\n').map(x=>x.trim()).filter(Boolean)">\${esc(p.credits.join('\\n'))}</textarea>

      <h2 class="section">Move</h2>
      <button class="ghost" onclick="caseToArchive()">Send to Archives &rarr;</button>
      <p class="hint">Turns this into an archive piece (thumbnail + lightbox). The full
      write-up is kept invisibly, so promoting it back restores everything.</p>
    </div>\`;
}

// ---------- archive ----------

function renderArchive() {
  if (editingArchive !== null) return renderArchiveForm();
  const rows = data.archive.map((a, i) => \`
    <div class="row" style="\${a.hidden ? 'opacity:.45' : ''}">
      <img src="/\${esc(a.thumb)}" onerror="this.style.visibility='hidden'">
      <div class="grow"><strong>\${esc(a.title)}</strong>\${a.hidden ? ' <span style="color:var(--danger);font-size:.75rem">· hidden</span>' : ''}
        <small>\${sectionName(a.section)} archive · \${a.video ? 'Video' : (a.images || []).length + ' image(s)'}</small></div>
      <button class="ghost" onclick="move(data.archive, \${i}, -1)">↑</button>
      <button class="ghost" onclick="move(data.archive, \${i}, 1)">↓</button>
      \${hideBtn('data.archive[' + i + '].hidden = !data.archive[' + i + '].hidden', a.hidden)}
      <button class="ghost" onclick="editingArchive=\${i}; render()">Edit</button>
      <button class="ghost danger" onclick="removeArchive(\${i})">Delete</button>
    </div>\`).join('');
  $('#view').innerHTML = rows +
    '<p style="margin-top:1rem;"><button class="primary" onclick="addArchive()">+ Add piece</button></p>';
}

function removeArchive(i) {
  if (confirm('Delete "' + data.archive[i].title + '"?')) { data.archive.splice(i, 1); render(); }
}

function addArchive() {
  data.archive.push({ title: 'New piece', thumb: '', images: [], section: 'design' });
  editingArchive = data.archive.length - 1;
  render();
}

function renderArchiveForm() {
  const a = data.archive[editingArchive];
  const imgs = (a.images || []).map((g, gi) => \`
    <div class="row">
      <img src="/\${esc(g)}" onerror="this.style.visibility='hidden'">
      <div class="grow"><small>\${esc(g)}</small></div>
      <button class="ghost" onclick="move(data.archive[\${editingArchive}].images, \${gi}, -1)">↑</button>
      <button class="ghost" onclick="move(data.archive[\${editingArchive}].images, \${gi}, 1)">↓</button>
      <button class="ghost danger" onclick="data.archive[\${editingArchive}].images.splice(\${gi},1);render()">✕</button>
    </div>\`).join('');

  $('#view').innerHTML = \`
    <button class="ghost" onclick="editingArchive=null;render()">← Back to list</button>
    <div class="card">
      <label>Title</label>
      <input type="text" value="\${esc(a.title)}" onchange="data.archive[\${editingArchive}].title=this.value">
      <label>Which archive</label>
      \${sectionSelect(a.section, 'data.archive[' + editingArchive + '].section=this.value')}
      \${imgField('Thumbnail', a.thumb, v => data.archive[editingArchive].thumb = v)}
      <label>YouTube video ID <span style="text-transform:none;letter-spacing:0">(leave empty for image-only pieces)</span></label>
      <input type="text" value="\${esc(a.video || '')}"
        onchange="const a=data.archive[\${editingArchive}]; this.value.trim() ? a.video=this.value.trim() : delete a.video;">
      <h2 class="section">Lightbox images</h2>
      \${imgs}
      <button class="ghost" onclick="const a=data.archive[editingArchive]; a.images=a.images||[]; openPicker(p => { a.images.push(p); render(); })">+ Add image</button>

      <h2 class="section">Move</h2>
      <button class="ghost" onclick="archiveToCase()">Promote to Case Study &rarr;</button>
      <p class="hint">\${data.archive[editingArchive]._caseStudy
        ? 'This was a case study before — promoting restores its full write-up.'
        : 'Creates a full case study page from this piece — you\\'ll fill in the story text after.'}</p>
    </div>\`;
}

// ---------- test bench ----------

function renderBench() {
  if (editingBench !== null) return renderBenchForm();
  const tb = data.testbench;
  const rows = tb.items.map((t, i) => \`
    <div class="row">
      <img src="/\${esc(benchShots(t)[0] || '')}" onerror="this.style.visibility='hidden'">
      <div class="grow"><strong>\${esc(t.name)}</strong>
        <small>\${benchShots(t).length} image\${benchShots(t).length === 1 ? '' : 's'} ·
        \${t.link && t.link.url ? (t.link.type === 'download' ? 'Download link' : 'Web link') : 'No link'}</small></div>
      <button class="ghost" onclick="move(data.testbench.items, \${i}, -1)">↑</button>
      <button class="ghost" onclick="move(data.testbench.items, \${i}, 1)">↓</button>
      <button class="ghost" onclick="editingBench=\${i}; render()">Edit</button>
      <button class="ghost danger" onclick="removeBench(\${i})">Delete</button>
    </div>\`).join('');
  $('#view').innerHTML = \`
    <div class="card">
      <label style="margin-top:0;display:flex;align-items:center;gap:.6rem;font-size:.85rem;text-transform:none;letter-spacing:0;color:var(--ink);cursor:pointer">
        <input type="checkbox" \${tb.enabled ? 'checked' : ''}
          onchange="data.testbench.enabled=this.checked; render()">
        Test Bench is <strong>\${tb.enabled ? 'ON' : 'OFF'}</strong> — \${tb.enabled ? 'shown on the landing page and in the nav' : 'hidden everywhere on the site'}
      </label>
    </div>
    \${rows}
    <p style="margin-top:1rem;"><button class="primary" onclick="addBench()">+ Add tool</button></p>
    <p class="hint">Each tool shows a name, blurb, and its screenshots — the first image runs
    large, the rest sit under it as supporting shots. All of them open in a lightbox.
    Links are optional — a Download link shows a "Get This" button, a Web link shows
    "Try it" (opens in a new tab). No link, no button.
    The page's big header and blurb are edited in the About &amp; Site tab,
    alongside the other section pages.</p>\`;
}

// tolerates the old single-"image" shape from before the gallery rework
function benchShots(t) {
  if (t.images && t.images.length) return t.images;
  return t.image ? [t.image] : [];
}

function removeBench(i) {
  if (confirm('Delete "' + data.testbench.items[i].name + '"?')) { data.testbench.items.splice(i, 1); render(); }
}

function addBench() {
  data.testbench.items.push({ name: 'New tool', blurb: '', images: [], link: { type: 'web', url: '' } });
  editingBench = data.testbench.items.length - 1;
  render();
}

function renderBenchForm() {
  const t = data.testbench.items[editingBench];
  if (!t.link) t.link = { type: 'web', url: '' };
  // migrate any legacy single image into the list the form edits
  if (!t.images) { t.images = benchShots(t); delete t.image; }

  const shots = t.images.map((src, si) => \`
    <div class="row">
      <img src="/\${esc(src)}" onerror="this.style.visibility='hidden'">
      <div class="grow"><small>\${si === 0 ? '<strong>Main image</strong> — ' : ''}\${esc(src)}</small></div>
      <button class="ghost" onclick="move(data.testbench.items[\${editingBench}].images, \${si}, -1)">↑</button>
      <button class="ghost" onclick="move(data.testbench.items[\${editingBench}].images, \${si}, 1)">↓</button>
      <button class="ghost danger" onclick="data.testbench.items[\${editingBench}].images.splice(\${si},1);render()">✕</button>
    </div>\`).join('');

  $('#view').innerHTML = \`
    <button class="ghost" onclick="editingBench=null;render()">← Back to list</button>
    <div class="card">
      <label>Name</label>
      <input type="text" value="\${esc(t.name)}" onchange="data.testbench.items[\${editingBench}].name=this.value">
      <label>Blurb (one or two sentences: what it does, who it's for)</label>
      <textarea onchange="data.testbench.items[\${editingBench}].blurb=this.value">\${esc(t.blurb || '')}</textarea>
      <label>Screenshots</label>
      <div class="gallery-list">\${shots}</div>
      <button class="ghost" onclick="openPicker(p => { data.testbench.items[editingBench].images.push(p); render(); })">+ Add image</button>
      <p class="hint">The first image runs large; the rest become supporting thumbnails.
      Use ↑ ↓ to reorder — whatever sits at the top is the main image.</p>
      <label>Link type</label>
      <select onchange="data.testbench.items[\${editingBench}].link.type=this.value">
        <option value="web" \${t.link.type !== 'download' ? 'selected' : ''}>Web — "Try it" opens in a new tab</option>
        <option value="download" \${t.link.type === 'download' ? 'selected' : ''}>Download — "Get This" serves a file</option>
      </select>
      <label>Link URL (leave empty for no button yet)</label>
      <input type="text" value="\${esc(t.link.url || '')}" placeholder="https://… or a file path like assets/downloads/mytool.zip"
        onchange="data.testbench.items[\${editingBench}].link.url=this.value.trim()">
    </div>\`;
}

// ---------- about & site ----------

function renderAbout() {
  const s = data.site, ab = data.about, sec = data.sections;
  const toggle = (checked, label, expr) => \`
      <label style="display:flex;align-items:center;gap:.6rem;font-size:.85rem;text-transform:none;letter-spacing:0;color:var(--ink);cursor:pointer">
        <input type="checkbox" \${checked ? 'checked' : ''} onchange="\${expr}; render()">
        \${label} — <strong>\${checked ? 'ON' : 'OFF'}</strong>
      </label>\`;

  $('#view').innerHTML = \`
    <div class="card">
      <h2 class="section" style="margin-top:0">Site</h2>
      <label>Headline (big text at the top of the landing page)</label>
      <input type="text" value="\${esc(s.headline || '')}" onchange="data.site.headline=this.value">
      <p class="hint">Any "&amp;" you type is automatically shown in the accent color.</p>
      <label>Tagline (the paragraph next to the headline)</label>
      <textarea onchange="data.site.tagline=this.value">\${esc(s.tagline)}</textarea>
      <label>Email</label>
      <input type="text" value="\${esc(s.email)}" onchange="data.site.email=this.value">
      <label>Motion reel — YouTube ID</label>
      <input type="text" value="\${esc(s.reelVideo)}" onchange="data.site.reelVideo=this.value.trim()">
      \${imgField('Motion reel poster', s.reelPoster, v => data.site.reelPoster = v)}
    </div>
    \${['motion','design','testbench'].map(k => { const c = sec[k]; return \`
    <div class="card">
      <h2 class="section" style="margin-top:0">\${ {motion:'Motion Design page', design:'Branding &amp; Graphic Design page', testbench:'Test Bench page'}[k] }</h2>
      <label>Big header</label>
      <input type="text" value="\${esc(c.heading || '')}" onchange="data.sections.\${k}.heading=this.value">
      <p class="hint">"&amp;" and anything wrapped in *asterisks* shows in the accent color. A "|" forces a line break.</p>
      <label>Blurb (the line under the header)</label>
      <input type="text" value="\${esc(c.blurb || '')}" onchange="data.sections.\${k}.blurb=this.value">
      <label>Page name (small confirmation label above the header, also used on back-links)</label>
      <input type="text" value="\${esc(c.label || '')}" onchange="data.sections.\${k}.label=this.value">
      <label>Landing page descriptor (the small list under this section's name on the home page)</label>
      <input type="text" value="\${esc(c.desc || '')}" onchange="data.sections.\${k}.desc=this.value">
    </div>\`; }).join('')}
    <div class="card">
      <h2 class="section" style="margin-top:0">Archives</h2>
      \${toggle(sec.motion.archiveEnabled, 'Motion Design archive (page + link)', 'data.sections.motion.archiveEnabled=this.checked')}
      \${toggle(sec.design.archiveEnabled, 'Graphic Design &amp; Branding archive (page + link)', 'data.sections.design.archiveEnabled=this.checked')}
      <p class="hint">Turning an archive off removes its page and the "The Archive" link
      from that section — the pieces stay saved here for when you turn it back on.
      (The Test Bench on/off switch lives in its own tab.)</p>
    </div>
    <div class="card">
      <h2 class="section" style="margin-top:0">About (shown on the landing page)</h2>
      <label>Intro paragraph</label>
      <textarea style="min-height:160px" onchange="data.about.intro=this.value">\${esc(ab.intro)}</textarea>
      \${imgField('Portrait', ab.portrait, v => data.about.portrait = v)}
    </div>\`;
}
</script>
</body>
</html>`;
