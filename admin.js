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
  .checks { display:flex; flex-wrap:wrap; gap:.4rem 1.2rem; }
  label.check { display:inline-flex; align-items:center; gap:.45rem; margin:0; font-size:.9rem;
    text-transform:none; letter-spacing:0; color:var(--ink); cursor:pointer; }
  .block { border:1px solid var(--line); background:var(--panel); margin-bottom:.5rem; padding:.55rem .7rem .7rem;
    position:relative; }
  .block.text { border-left:3px solid var(--accent); }
  .block-bar { display:flex; align-items:center; gap:.5rem; margin-bottom:.45rem; }
  .block-bar .spacer { flex:1; }
  .block-type { font-size:.68rem; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); }
  .handle { cursor:grab; color:var(--muted); padding:0 .3rem; user-select:none; font-size:1rem; letter-spacing:-.15em; }
  .handle:hover { color:var(--accent); }
  .block textarea { min-height:90px; margin-top:.4rem; }
  .block .media-fields { display:flex; gap:.6rem; align-items:flex-start; }
  .block .media-fields > img { width:120px; height:72px; object-fit:cover; border:1px solid var(--line); flex:none; }
  .block .media-fields .grow { flex:1; display:grid; gap:.4rem; }
  .block .media-fields .imgfield input { min-width:0; }
  .block.dragging { opacity:.35; }
  .block.drop-before::before, .block.drop-after::after { content:""; position:absolute; left:-1px; right:-1px;
    height:3px; background:var(--accent); }
  .block.drop-before::before { top:-5px; }
  .block.drop-after::after { bottom:-6px; }
  .block-fixed { border:1px dashed var(--line); padding:.55rem .7rem; margin-bottom:.5rem; color:var(--muted);
    font-size:.8rem; }
  .add-row { display:flex; gap:.5rem; flex-wrap:wrap; margin-top:.3rem; }
  .picker-grid button { position:relative; }
  .picker-grid button.selected { border-color:var(--accent); outline:2px solid var(--accent); }
  .picker-grid button .n { position:absolute; top:4px; left:4px; background:var(--accent); color:var(--accent-ink);
    font-size:.7rem; padding:0 .4rem; display:none; }
  .picker-grid button.selected .n { display:block; }
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
    <button data-tab="work" onclick="showTab('work')">Work Page &amp; Filters</button>
    <button data-tab="bench" onclick="showTab('bench')">Test Bench</button>
    <button data-tab="about" onclick="showTab('about')">About &amp; Site</button>
  </div>
  <div id="view"></div>
</div>

<div id="toast"></div>

<dialog id="picker">
  <div style="display:flex;align-items:center;gap:1rem;">
    <strong style="flex:1;" id="picker-title">Choose an image</strong>
    <label class="ghost" style="margin:0;cursor:pointer;padding:.35rem .7rem;border:1px solid var(--line);font-size:.8rem;text-transform:none;letter-spacing:0;color:var(--ink);">
      Upload new… <input type="file" id="picker-file" accept="image/*" style="display:none" onchange="uploadFromPicker(this)">
    </label>
    <button class="ghost" onclick="document.getElementById('picker').close()">Cancel</button>
    <button class="primary" id="picker-add" onclick="pickerDone()" hidden>Add selected</button>
  </div>
  <div class="picker-grid" id="picker-grid"></div>
</dialog>

<script>
let data = null;
let tab = 'cases';
let editing = null;        // index of case study being edited, or null
let editingArchive = null; // index of archive item being edited, or null
let editingBench = null;   // index of test bench item being edited, or null
let editingFilter = null;  // index of filter being edited, or null
let pickerCallback = null;
let pickerMulti = false;   // multi mode: callback gets an array of paths
let pickerSel = [];

const $ = (s) => document.querySelector(s);

fetch('/api/data').then(r => r.json()).then(d => { data = d; render(); });

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

async function saveAll() {
  (data.filters || []).forEach(f => {
    if (!f.label) f.label = f.key || 'Untitled';
    if (!f.key) f.key = uniqueKey(slugify(f.label), f);
  });
  const r = await fetch('/api/data', { method: 'POST', body: JSON.stringify(data) });
  const j = await r.json();
  toast(j.ok ? 'Saved — site rebuilt ✓' : 'Error: ' + j.error);
}

function showTab(t) {
  tab = t; editing = null; editingArchive = null; editingBench = null; editingFilter = null;
  document.querySelectorAll('.tabs button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === t));
  render();
}

// textarea parsing lives out here, not in inline handlers: a "\\n" written
// inside the page templates would reach the handler as a raw line break
function paragraphs(v) { return v.split(/\\n\\s*\\n/).map(x => x.trim()).filter(Boolean); }
function lines(v) { return v.split('\\n').map(x => x.trim()).filter(Boolean); }

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

// multi = true lets you click several images (or upload several files) and
// hands the callback an array of paths, in the order you picked them
async function openPicker(cb, multi = false) {
  pickerCallback = cb;
  pickerMulti = multi;
  pickerSel = [];
  const files = await (await fetch('/api/images')).json();
  $('#picker-grid').innerHTML = files.map(f =>
    \`<button type="button" data-path="assets/img/\${f}" onclick="pickImage('assets/img/\${f}', this)">
       <span class="n"></span><img src="/assets/img/\${f}" loading="lazy"><span>\${f}</span></button>\`).join('');
  $('#picker-title').textContent = multi ? 'Choose images — click to select several' : 'Choose an image';
  $('#picker-file').multiple = multi;
  $('#picker-add').hidden = !multi;
  updatePickerAdd();
  $('#picker').showModal();
}

function updatePickerAdd() {
  $('#picker-add').textContent = pickerSel.length ? 'Add ' + pickerSel.length + ' selected' : 'Add selected';
  $('#picker-add').disabled = !pickerSel.length;
  document.querySelectorAll('#picker-grid button').forEach(b => {
    const n = pickerSel.indexOf(b.dataset.path);
    b.classList.toggle('selected', n >= 0);
    b.querySelector('.n').textContent = n + 1;
  });
}

function pickImage(p) {
  if (pickerMulti) {
    const i = pickerSel.indexOf(p);
    if (i >= 0) pickerSel.splice(i, 1); else pickerSel.push(p);
    return updatePickerAdd();
  }
  $('#picker').close();
  if (pickerCallback) pickerCallback(p);
}

function pickerDone() {
  $('#picker').close();
  if (pickerCallback && pickerSel.length) pickerCallback(pickerSel.slice());
}

function readAsDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

async function uploadFromPicker(input) {
  const files = [...input.files];
  input.value = '';
  if (!files.length) return;
  const paths = [];
  for (const file of files) {
    const r = await fetch('/api/upload', { method: 'POST',
      body: JSON.stringify({ name: file.name, dataUrl: await readAsDataURL(file) }) });
    const j = await r.json();
    if (!j.ok) { toast('Upload failed: ' + j.error); return; }
    paths.push(j.path);
  }
  $('#picker').close();
  toast(paths.length > 1 ? 'Uploaded ' + paths.length + ' images ✓' : 'Uploaded ✓');
  if (!pickerCallback) return;
  if (pickerMulti) pickerCallback(pickerSel.concat(paths));
  else pickerCallback(paths[0]);
}

// ---------- render ----------

function render() {
  if (!data) return;
  if (!data.testbench) data.testbench = { enabled: false, items: [] };
  if (!data.sections.testbench) data.sections.testbench = {
    label: 'Test Bench', desc: 'After Effects Extensions / Software Experiments',
    heading: 'Test Bench', blurb: '' };
  if (!data.filters) data.filters = [];
  if (tab === 'cases') renderCases();
  else if (tab === 'archive') renderArchive();
  else if (tab === 'work') renderWork();
  else if (tab === 'bench') renderBench();
  else renderAbout();
}

// ---------- filters / tags ----------

function liveTags(item) {
  return (item.tags || []).filter(k => data.filters.some(f => f.key === k));
}

function tagSummary(item) {
  const t = liveTags(item);
  return t.length ? t.map(k => esc(data.filters.find(f => f.key === k).label)).join(' + ') : 'No filters (All only)';
}

// one checkbox per filter; the item always shows under "All"
function tagChecks(item) {
  if (!data.filters.length)
    return '<p class="hint">No filters yet — add them in the Work Page &amp; Filters tab.</p>';
  const id = 'f' + Math.random().toString(36).slice(2, 8);
  window[id] = (key, on) => {
    const set = new Set(item.tags || []);
    on ? set.add(key) : set.delete(key);
    // keep tags in filter order so the data file stays tidy
    item.tags = data.filters.map(f => f.key).filter(k => set.has(k));
  };
  return \`<div class="checks">\${data.filters.map(f => \`
      <label class="check"><input type="checkbox" \${(item.tags || []).includes(f.key) ? 'checked' : ''}
        onchange="window['\${id}']('\${f.key}', this.checked)"> \${esc(f.label)}</label>\`).join('')}
    </div>
    <p class="hint">Always shows under "All". Check every filter it should also appear under.</p>\`;
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
        <small>\${tagSummary(p)} · \${esc(p.client)} · \${esc(p.discipline)}</small></div>
      <button class="ghost" onclick="move(data.caseStudies, \${i}, -1)">↑</button>
      <button class="ghost" onclick="move(data.caseStudies, \${i}, 1)">↓</button>
      \${hideBtn('data.caseStudies[' + i + '].hidden = !data.caseStudies[' + i + '].hidden', p.hidden)}
      <button class="ghost" onclick="editing=\${i}; render()">Edit</button>
      <button class="ghost danger" onclick="removeCase(\${i})">Delete</button>
    </div>\`).join('');
  $('#view').innerHTML = rows +
    '<p style="margin-top:1rem;"><button class="primary" onclick="addCase()">+ Add project</button></p>' +
    '<p class="hint">Order here = order on the Work page. Remember to Save &amp; Rebuild.</p>';
}

function removeCase(i) {
  if (confirm('Delete "' + data.caseStudies[i].title + '"? (Takes effect on Save & Rebuild)'))
    { data.caseStudies.splice(i, 1); render(); }
}

function addCase() {
  data.caseStudies.push({ slug:'', title:'New Project', tags:[], client:'', discipline:'',
    thumb:'', thumbHover:'', hero:'',
    blocks:[{type:'text',heading:'The Ask',body:[]},{type:'text',heading:'The Result',body:[]}],
    credits:[] });
  editing = data.caseStudies.length - 1;
  render();
}

// ---------- case study <-> archive conversion ----------

function caseToArchive() {
  const p = data.caseStudies[editing];
  if (!confirm('Send "' + p.title + '" to the Archives?\\n\\nIts full write-up is kept, so promoting it back later restores everything.')) return;
  const blocks = p.blocks || [];
  const item = {
    title: p.title,
    tags: (p.tags || []).slice(),
    thumb: p.thumb,
    images: [p.hero].concat(blocks.filter(b => b.type === 'image').map(b => b.src)).filter(Boolean),
    _caseStudy: p,
  };
  const vid = (blocks.find(b => b.type === 'video' && b.id) || {}).id;
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
    p.tags = (a.tags || []).slice();
    if (a.thumb) p.thumb = a.thumb;
    if (a.hidden) p.hidden = true; else delete p.hidden;
  } else {
    p = {
      slug: slugify(a.title), title: a.title, tags: (a.tags || []).slice(),
      client: '', discipline: '',
      thumb: a.thumb || '', thumbHover: '',
      hero: (a.images || [])[0] || a.thumb || '',
      blocks: [{ type: 'text', heading: 'The Ask', body: [] }, { type: 'text', heading: 'The Result', body: [] }]
        .concat(a.video ? [{ type: 'video', id: a.video, caption: '' }] : [])
        .concat((a.images || []).map(src => ({ type: 'image', src }))),
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

// ---------- page layout blocks ----------
// A case study's body is an ordered list of blocks — text sections, images,
// and videos — rendered top to bottom under the hero. Drag ⋮⋮ (or ↑ ↓) to
// reorder; runs of images/videos sit together as one media stack.

const BLOCK_LABEL = { text: 'Text section', image: 'Image', video: 'Video (YouTube)' };

function blockHtml(b, bi) {
  const B = 'data.caseStudies[' + editing + '].blocks[' + bi + ']';
  let body = '';
  if (b.type === 'text') {
    body = \`<input type="text" value="\${esc(b.heading)}" placeholder="Section heading (e.g. The Ask)"
        onchange="\${B}.heading=this.value">
      <textarea placeholder="Paragraphs — separate with a blank line"
        onchange="\${B}.body=paragraphs(this.value)">\${esc((b.body || []).join('\\n\\n'))}</textarea>\`;
  } else if (b.type === 'image') {
    body = \`<div class="media-fields">
        \${b.src ? \`<img src="/\${esc(b.src)}" onerror="this.style.visibility='hidden'">\` : ''}
        <div class="grow">
          <div class="imgfield">
            <input type="text" value="\${esc(b.src)}" placeholder="assets/img/…" onchange="\${B}.src=this.value.trim();render()">
            <button class="ghost" onclick="openPicker(p => { \${B}.src = p; render(); })">Choose…</button>
          </div>
          <input type="text" value="\${esc(b.caption || '')}" placeholder="Caption (optional)" onchange="\${B}.caption=this.value">
        </div>
      </div>\`;
  } else if (b.type === 'video') {
    body = \`<div class="media-fields">
        \${b.id ? \`<img src="https://i.ytimg.com/vi/\${esc(b.id)}/mqdefault.jpg">\` : ''}
        <div class="grow">
          <input type="text" value="\${esc(b.id)}" placeholder="YouTube ID (the part after watch?v=)" onchange="\${B}.id=this.value.trim();render()">
          <input type="text" value="\${esc(b.caption || '')}" placeholder="Caption (optional)" onchange="\${B}.caption=this.value">
        </div>
      </div>\`;
  }
  const arr = 'data.caseStudies[' + editing + '].blocks';
  return \`<div class="block \${b.type}" data-bi="\${bi}">
    <div class="block-bar">
      <span class="handle" title="Drag to move">⋮⋮</span>
      <span class="block-type">\${BLOCK_LABEL[b.type] || b.type}</span>
      <span class="spacer"></span>
      <button class="ghost" title="Move up" onclick="move(\${arr}, \${bi}, -1)">↑</button>
      <button class="ghost" title="Move down" onclick="move(\${arr}, \${bi}, 1)">↓</button>
      <button class="ghost danger" title="Remove" onclick="\${arr}.splice(\${bi},1);render()">✕</button>
    </div>
    \${body}
  </div>\`;
}

function addBlocks(blocks) {
  data.caseStudies[editing].blocks.push(...blocks);
  render();
  const list = $('#blocks');
  if (list && list.lastElementChild) list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// drag-and-drop: a block only becomes draggable while its ⋮⋮ handle is
// held, so text in the inputs can still be selected normally
let dragFrom = null;
function wireBlockDrag() {
  const list = $('#blocks');
  if (!list) return;
  const clear = () => list.querySelectorAll('.drop-before,.drop-after')
    .forEach(el => el.classList.remove('drop-before', 'drop-after'));
  list.querySelectorAll('.block').forEach(el => {
    const handle = el.querySelector('.handle');
    handle.addEventListener('mousedown', () => { el.draggable = true; });
    handle.addEventListener('mouseup', () => { el.draggable = false; });
    el.addEventListener('dragstart', e => {
      dragFrom = +el.dataset.bi;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
    });
    el.addEventListener('dragend', () => {
      el.draggable = false;
      el.classList.remove('dragging');
      dragFrom = null;
      clear();
    });
    el.addEventListener('dragover', e => {
      if (dragFrom === null) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      clear();
      el.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
    });
    el.addEventListener('drop', e => {
      e.preventDefault();
      if (dragFrom === null) return;
      const r = el.getBoundingClientRect();
      let to = +el.dataset.bi + (e.clientY > r.top + r.height / 2 ? 1 : 0);
      const arr = data.caseStudies[editing].blocks;
      const [b] = arr.splice(dragFrom, 1);
      if (to > dragFrom) to--;
      arr.splice(to, 0, b);
      dragFrom = null;
      render();
    });
  });
}

function renderCaseForm() {
  const p = data.caseStudies[editing];
  if (!p.blocks) p.blocks = [];
  if (!p.credits) p.credits = [];

  $('#view').innerHTML = \`
    <button class="ghost" onclick="editing=null;render()">← Back to list</button>
    <div class="card">
      <label>Title</label>
      <input type="text" value="\${esc(p.title)}"
        onchange="const p=data.caseStudies[\${editing}]; p.title=this.value; if(!p.slug) p.slug=slugify(this.value);">
      <label>URL slug <span style="text-transform:none;letter-spacing:0">(page becomes project-&lt;slug&gt;.html)</span></label>
      <input type="text" value="\${esc(p.slug)}" onchange="data.caseStudies[\${editing}].slug=slugify(this.value)">
      <label>Filters</label>
      \${tagChecks(p)}
      <label>Client</label>
      <input type="text" value="\${esc(p.client)}" onchange="data.caseStudies[\${editing}].client=this.value">
      <label>Discipline</label>
      <input type="text" value="\${esc(p.discipline)}" onchange="data.caseStudies[\${editing}].discipline=this.value">
      \${imgField('Thumbnail', p.thumb, v => data.caseStudies[editing].thumb = v)}
      \${imgField('Thumbnail on hover (animated)', p.thumbHover, v => data.caseStudies[editing].thumbHover = v, 'Optional — shown when the cursor is over the card.')}
      \${imgField('Hero image', p.hero, v => data.caseStudies[editing].hero = v, 'The big image at the top of the page, above the layout below. Leave empty for none.')}

      <h2 class="section">Page layout</h2>
      <p class="hint" style="margin:-.3rem 0 .8rem">Everything under the hero, top to bottom. Drag ⋮⋮ or use ↑ ↓
      to put text sections, images, and videos in any order. Credits always close the page.</p>
      <div class="block-fixed">Hero image</div>
      <div id="blocks">\${p.blocks.map(blockHtml).join('')}</div>
      <div class="add-row">
        <button class="ghost" onclick="addBlocks([{type:'text',heading:'',body:[]}])">+ Text section</button>
        <button class="ghost" onclick="openPicker(ps => addBlocks(ps.map(src => ({type:'image', src}))), true)">+ Images…</button>
        <button class="ghost" onclick="addBlocks([{type:'video',id:'',caption:''}])">+ Video</button>
      </div>
      <p class="hint">New blocks are added at the bottom — drag them where you want them.</p>
      <div class="block-fixed" style="margin-top:.8rem">Credits</div>

      <h2 class="section">Credits</h2>
      <textarea placeholder="One credit per line"
        onchange="data.caseStudies[\${editing}].credits=lines(this.value)">\${esc(p.credits.join('\\n'))}</textarea>

      <h2 class="section">Move</h2>
      <button class="ghost" onclick="caseToArchive()">Send to Archives &rarr;</button>
      <p class="hint">Turns this into an archive piece (thumbnail + lightbox). The full
      write-up is kept invisibly, so promoting it back restores everything.</p>
    </div>\`;
  wireBlockDrag();
}

// ---------- archive ----------

function renderArchive() {
  if (editingArchive !== null) return renderArchiveForm();
  const rows = data.archive.map((a, i) => \`
    <div class="row" style="\${a.hidden ? 'opacity:.45' : ''}">
      <img src="/\${esc(a.thumb)}" onerror="this.style.visibility='hidden'">
      <div class="grow"><strong>\${esc(a.title)}</strong>\${a.hidden ? ' <span style="color:var(--danger);font-size:.75rem">· hidden</span>' : ''}
        <small>\${tagSummary(a)} · \${a.video ? 'Video' : (a.images || []).length + ' image(s)'}</small></div>
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
  data.archive.push({ title: 'New piece', tags: [], thumb: '', images: [] });
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
      <label>Filters</label>
      \${tagChecks(a)}
      \${imgField('Thumbnail', a.thumb, v => data.archive[editingArchive].thumb = v)}
      <label>YouTube video ID <span style="text-transform:none;letter-spacing:0">(leave empty for image-only pieces)</span></label>
      <input type="text" value="\${esc(a.video || '')}"
        onchange="const a=data.archive[\${editingArchive}]; this.value.trim() ? a.video=this.value.trim() : delete a.video;">
      <h2 class="section">Lightbox images</h2>
      \${imgs}
      <button class="ghost" onclick="const a=data.archive[editingArchive]; a.images=a.images||[]; openPicker(ps => { a.images.push(...ps); render(); }, true)">+ Add images…</button>

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
      <button class="ghost" onclick="openPicker(ps => { data.testbench.items[editingBench].images.push(...ps); render(); }, true)">+ Add images…</button>
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

// ---------- work page & filters ----------

function uniqueKey(base, except) {
  base = base || 'filter';
  let k = base, n = 1;
  while (data.filters.some(f => f !== except && f.key === k)) k = base + '-' + (++n);
  return k;
}

// every tagged thing, including write-ups stashed inside archive pieces
function allTagged() {
  return data.caseStudies.concat(data.archive, data.archive.map(a => a._caseStudy).filter(Boolean));
}

function renameFilterKey(i, value) {
  const f = data.filters[i];
  const old = f.key;
  const key = uniqueKey(slugify(value) || slugify(f.label), f);
  f.key = key;
  if (old && old !== key)
    allTagged().forEach(x => { if (x.tags) x.tags = x.tags.map(t => t === old ? key : t); });
  render();
}

function addFilter() {
  data.filters.push({ key: '', label: '', heading: '', blurb: '', showReel: false });
  editingFilter = data.filters.length - 1;
  render();
}

function removeFilter(i) {
  const f = data.filters[i];
  if (!confirm('Delete the "' + f.label + '" filter?\\n\\nProjects and archive pieces keep everything else — they just lose this tag.')) return;
  allTagged().forEach(x => { if (x.tags) x.tags = x.tags.filter(t => t !== f.key); });
  data.filters.splice(i, 1);
  editingFilter = null;
  render();
}

function renderWork() {
  const s = data.site, w = data.sections.work;
  const used = (key) => data.caseStudies.filter(p => (p.tags || []).includes(key)).length + ' case studies · ' +
    data.archive.filter(a => (a.tags || []).includes(key)).length + ' archive';

  const rows = data.filters.map((f, i) => editingFilter === i ? filterForm(f, i) : \`
    <div class="row">
      <div class="grow"><strong>\${esc(f.label || '(unnamed)')}</strong>
        <small>?filter=\${esc(f.key)} · \${used(f.key)}\${f.showReel ? ' · shows reel' : ''}</small></div>
      <button class="ghost" onclick="move(data.filters, \${i}, -1)">↑</button>
      <button class="ghost" onclick="move(data.filters, \${i}, 1)">↓</button>
      <button class="ghost" onclick="editingFilter=\${i}; render()">Edit</button>
      <button class="ghost danger" onclick="removeFilter(\${i})">Delete</button>
    </div>\`).join('');

  $('#view').innerHTML = \`
    <div class="card">
      <h2 class="section" style="margin-top:0">Filters</h2>
      <p class="hint" style="margin:-.3rem 0 .8rem">The buttons across the top of the Work and Archive pages,
      after "All" (which is always there). Order here = button order.
      Tag projects from each project's Edit screen.</p>
      \${rows}
      <button class="ghost" onclick="addFilter()">+ Add filter</button>
    </div>
    <div class="card">
      <h2 class="section" style="margin-top:0">Work page (the "All" view)</h2>
      <label>Page name (nav link, landing page row, back-links)</label>
      <input type="text" value="\${esc(w.label || '')}" onchange="data.sections.work.label=this.value">
      <label>Landing page descriptor (the small list under the name on the home page)</label>
      <input type="text" value="\${esc(w.desc || '')}" onchange="data.sections.work.desc=this.value">
      <label>Big header</label>
      <input type="text" value="\${esc(w.heading || '')}" onchange="data.sections.work.heading=this.value">
      <p class="hint">"&amp;" and anything wrapped in *asterisks* shows in the accent color. A "|" forces a line break.</p>
      <label>Blurb (the line under the header)</label>
      <input type="text" value="\${esc(w.blurb || '')}" onchange="data.sections.work.blurb=this.value">
      <label class="check" style="margin-top:1.2rem">
        <input type="checkbox" \${w.showReel ? 'checked' : ''} onchange="data.sections.work.showReel=this.checked; render()">
        Show the motion reel at the top of the "All" view</label>
      <label style="display:flex;align-items:center;gap:.6rem;font-size:.85rem;text-transform:none;letter-spacing:0;color:var(--ink);cursor:pointer;margin-top:1.2rem">
        <input type="checkbox" \${w.archiveEnabled ? 'checked' : ''} onchange="data.sections.work.archiveEnabled=this.checked; render()">
        Archive — <strong>\${w.archiveEnabled ? 'ON' : 'OFF'}</strong>
      </label>
      <p class="hint">Off removes the Archive page and its link from the Work page. The pieces stay saved.</p>
    </div>
    <div class="card">
      <h2 class="section" style="margin-top:0">Motion reel</h2>
      <label>YouTube ID</label>
      <input type="text" value="\${esc(s.reelVideo || '')}" onchange="data.site.reelVideo=this.value.trim()">
      \${imgField('Poster image', s.reelPoster, v => data.site.reelPoster = v)}
      <p class="hint">Shows at the top of the Work page in the "All" view (if ticked above) and on any filter with "Show the motion reel" ticked.</p>
    </div>\`;
}

function filterForm(f, i) {
  const F = 'data.filters[' + i + ']';
  const check = (prop, text) => \`<label class="check" style="margin-top:.9rem">
      <input type="checkbox" \${f[prop] ? 'checked' : ''} onchange="\${F}.\${prop}=this.checked; render()"> \${text}</label>\`;
  return \`<div class="card" style="border-color:var(--accent)">
      <label style="margin-top:0">Button label</label>
      <input type="text" value="\${esc(f.label)}" placeholder="e.g. Illustration"
        onchange="\${F}.label=this.value; if(!\${F}.key) renameFilterKey(\${i}, this.value)">
      <label>URL name</label>
      <input type="text" value="\${esc(f.key)}" onchange="renameFilterKey(\${i}, this.value)">
      <p class="hint">Used in links like work.html?filter=\${esc(f.key || 'name')}. Changing it re-tags everything automatically,
      but old links using the previous name will just show "All".</p>
      <label>Big header while selected (optional)</label>
      <input type="text" value="\${esc(f.heading || '')}" onchange="\${F}.heading=this.value">
      <label>Blurb while selected</label>
      <input type="text" value="\${esc(f.blurb || '')}" onchange="\${F}.blurb=this.value">
      <p class="hint">Leave the header empty to keep the Work page's own header and blurb.</p>
      \${check('showReel', 'Show the motion reel at the top while this filter is selected')}
      <p style="margin-top:1rem"><button class="ghost" onclick="editingFilter=null; render()">Done</button></p>
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
      <p class="hint">The Work page, its filters, and the motion reel live in the Work Page &amp; Filters tab.</p>
    </div>
    \${['testbench'].map(k => { const c = sec[k]; return \`
    <div class="card">
      <h2 class="section" style="margin-top:0">Test Bench page</h2>
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
      <h2 class="section" style="margin-top:0">About (shown on the landing page)</h2>
      <label>Intro paragraph</label>
      <textarea style="min-height:160px" onchange="data.about.intro=this.value">\${esc(ab.intro)}</textarea>
      \${imgField('Portrait', ab.portrait, v => data.about.portrait = v)}
    </div>\`;
}
</script>
</body>
</html>`;
