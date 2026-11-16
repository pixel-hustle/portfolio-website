/* Jared Hanline portfolio — progressive enhancement.
   Without this file every project is still listed and linked; what it adds
   is filtering, the pop-up viewer, click-to-play video and scroll reveals. */

const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FILTER_KEY = "workFilter";
const EASE = "cubic-bezier(.2,.7,.2,1)";

const ytFrame = (id, title) => {
  const f = document.createElement("iframe");
  f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  f.title = title || "Video player";
  f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  f.allowFullscreen = true;
  return f;
};

// ---- click-to-play videos on case study pages ----
document.querySelectorAll(".vid button[data-video]").forEach((btn) =>
  btn.addEventListener("click", () => btn.replaceWith(ytFrame(btn.dataset.video, btn.getAttribute("aria-label"))))
);

// ---- Work grid filters: boxes shrink out, glide across and rise in ----
const grid = document.querySelector("[data-work]");
if (grid) {
  const cards = [...grid.querySelectorAll(".card")];
  const pills = [...document.querySelectorAll(".fp")];
  const keys = pills.map((p) => p.dataset.f);
  const viewsEl = document.querySelector("[data-views]");
  const views = viewsEl ? JSON.parse(viewsEl.textContent) : null;
  const h1 = document.querySelector("h1.big");
  const quip = document.querySelector(".quip");
  const match = (c, k) =>
    k === "all" || (k === "cases" ? c.dataset.kind === "case" : c.dataset.tags.split(" ").includes(k));
  let busy = 0;

  function apply(k, animate) {
    if (!keys.includes(k)) k = "all";
    pills.forEach((p) => p.setAttribute("aria-pressed", String(p.dataset.f === k)));
    const view = views && (views[k] || views.all);
    if (view && h1) { h1.innerHTML = view.heading; if (quip) quip.textContent = view.blurb; }

    const url = new URL(location.href);
    if (k === "all") url.searchParams.delete("filter"); else url.searchParams.set("filter", k);
    history.replaceState(null, "", url);
    try { sessionStorage.setItem(FILTER_KEY, k); } catch (e) {}

    const run = ++busy;
    cards.forEach((c) => c.getAnimations().forEach((a) => a.cancel()));
    const was = new Map(cards.filter((c) => !c.hidden).map((c) => [c, c.getBoundingClientRect()]));
    const leaving = cards.filter((c) => !c.hidden && !match(c, k));
    const settle = () => {
      if (run !== busy) return;
      cards.forEach((c) => { c.hidden = !match(c, k); });
      if (!animate || CALM) return;
      cards.filter((c) => !c.hidden).forEach((c, i) => {
        const a = was.get(c), b = c.getBoundingClientRect();
        if (a && !leaving.includes(c)) {
          const dx = a.left - b.left, dy = a.top - b.top, sx = a.width / b.width, sy = a.height / b.height;
          if (dx || dy || sx !== 1 || sy !== 1)
            c.animate([{ transform: `translate(${dx}px,${dy}px) scale(${sx},${sy})` }, { transform: "none" }], { duration: 520, easing: EASE });
        } else {
          c.animate([{ opacity: 0, transform: "translateY(18px) scale(.94)" }, { opacity: 1, transform: "none" }],
            { duration: 480, easing: EASE, delay: 120 + Math.min(i, 10) * 28, fill: "backwards" });
        }
      });
    };
    if (!animate || CALM || !leaving.length) return settle();
    leaving.forEach((c) => c.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.9)" }], { duration: 220, easing: "ease-in", fill: "forwards" }));
    setTimeout(() => { leaving.forEach((c) => c.getAnimations().forEach((a) => a.cancel())); settle(); }, 220);
  }

  pills.forEach((p) => p.addEventListener("click", () => apply(p.dataset.f, true)));
  const start = new URLSearchParams(location.search).get("filter");
  if (start) apply(start, false);
}

// back-links return to the filter you were browsing
document.querySelectorAll("[data-back-work]").forEach((a) => {
  let k = null;
  try { k = sessionStorage.getItem(FILTER_KEY); } catch (e) {}
  if (k && k !== "all") a.setAttribute("href", `index.html?filter=${encodeURIComponent(k)}#work`);
});

// ---- pop-up viewer: quick-look projects, the reel, logo projects, bench screenshots ----
const dlg = document.querySelector("dialog.look");
if (dlg) {
  const stack = dlg.querySelector(".stack");
  document.querySelectorAll("[data-item]").forEach((c) =>
    c.addEventListener("click", () => {
      const d = JSON.parse(c.dataset.item);
      dlg.querySelector("strong").textContent = d.title;
      stack.innerHTML = "";
      if (d.video) {
        const v = document.createElement("div");
        v.className = "vid";
        v.appendChild(ytFrame(d.video, d.title));
        stack.appendChild(v);
      }
      (d.images || []).forEach((src) => {
        const im = new Image();
        im.src = src;
        im.alt = d.title;
        stack.appendChild(im);
      });
      dlg.showModal();
      const at = Number(c.dataset.index) || 0;
      if (at && stack.children[at]) stack.children[at].scrollIntoView();
    })
  );
  dlg.querySelector("button").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  // emptying the viewer stops any video that was playing
  dlg.addEventListener("close", () => { stack.innerHTML = ""; });
}

// ---- scroll reveals ----
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
    { rootMargin: "0px 0px -6% 0px" }
  );
  document.querySelectorAll(".rise").forEach((el) => io.observe(el));
} else {
  document.querySelectorAll(".rise").forEach((el) => el.classList.add("in"));
}
