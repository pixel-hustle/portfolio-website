/* Mosaic page transitions.
   A grid of ink tiles cascades in from the upper-left to the lower-right
   to cover the page on internal navigation, then builds back out in the
   SAME direction on the next page — one continuous diagonal sweep.
   Skipped entirely for reduced-motion users.
   Loaded at the top of <body> so the covering state is in place before
   first paint. */
(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var D = document;
  var portrait = window.matchMedia("(orientation: portrait)").matches;
  var COLS = portrait ? 4 : 8;
  var ROWS = portrait ? 8 : 5;
  var STAGGER = 0.045; // s per diagonal step
  var SPEED = 0.22; // s per tile
  var TOTAL = ((COLS - 1 + ROWS - 1) * STAGGER + SPEED) * 1000;

  var css =
    "#pt{position:fixed;inset:0;z-index:999;pointer-events:none;display:grid;" +
    "grid-template-columns:repeat(" + COLS + ",1fr);grid-template-rows:repeat(" + ROWS + ",1fr)}" +
    "#pt .t{background:var(--ink,#17140f);opacity:0;transform:scale(.4);" +
    "transition:opacity " + SPEED + "s ease,transform " + SPEED + "s ease}" +
    "#pt.covered .t{opacity:1;transform:scale(1.02);transition:none}" +
    "#pt.cover .t{opacity:1;transform:scale(1.02)}" +
    "#pt.reveal .t{opacity:0;transform:scale(.4)}" +
    "#pt .wm{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);" +
    "font-family:'Anton','Arial Narrow',sans-serif;font-weight:400;" +
    "text-transform:uppercase;letter-spacing:.04em;font-size:clamp(2rem,6vw,3.5rem);" +
    "line-height:.8;" + // tight lockup leading when the name stacks
    "color:var(--bg,#f4f1ea);opacity:0;transition:opacity .18s ease}" +
    "#pt .wm em{font-style:normal;color:var(--accent,#d8480b)}" +
    "#pt.covered .wm,#pt.cover .wm{opacity:1;transition:opacity .2s ease .25s}";

  // per-tile diagonal delays — same order for cover and reveal
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      var n = r * COLS + c + 1;
      var d = ((r + c) * STAGGER).toFixed(3);
      css +=
        "#pt.cover .t:nth-child(" + n + "),#pt.reveal .t:nth-child(" + n + ")" +
        "{transition-delay:" + d + "s}";
    }
  }

  var style = D.createElement("style");
  style.textContent = css;
  D.head.appendChild(style);

  var pt = D.createElement("div");
  pt.id = "pt";
  pt.setAttribute("aria-hidden", "true");
  var html = "";
  for (var i = 0; i < COLS * ROWS; i++) html += "<div class='t'></div>";
  pt.innerHTML = html + "<span class='wm'>Jared Hanline<em>.</em></span>";
  D.body.appendChild(pt);

  // On load: paint fully covered, then sweep the tiles away UL -> LR.
  pt.classList.add("covered");
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      pt.classList.remove("covered");
      pt.classList.add("reveal");
      setTimeout(function () {
        pt.classList.remove("reveal");
      }, TOTAL + 100);
    });
  });

  // Intercept internal navigation: sweep tiles in UL -> LR, then go.
  D.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (
      a.target === "_blank" ||
      href.indexOf("#") === 0 ||
      href.indexOf("mailto:") === 0 ||
      href.indexOf("http") === 0 ||
      e.metaKey || e.ctrlKey || e.shiftKey || e.altKey
    )
      return;
    e.preventDefault();
    pt.classList.remove("reveal", "covered");
    pt.classList.add("cover");
    setTimeout(function () {
      location.href = href;
    }, TOTAL - 40);
  });

  // Back/forward cache restore: never leave the page covered.
  window.addEventListener("pageshow", function (ev) {
    if (ev.persisted) pt.classList.remove("cover", "covered", "reveal");
  });
})();
