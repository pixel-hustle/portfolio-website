/* Jared Hanline portfolio — progressive enhancement only.
   Everything on the site works without this file except
   video playback and the archive lightbox. */

// ---- YouTube click-to-play facades ----
function bindFacades(root) {
  root.querySelectorAll(".video-facade").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.video;
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      iframe.title = btn.getAttribute("aria-label") || "Video player";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      btn.replaceWith(iframe);
    });
  });
}
bindFacades(document);

// ---- Work / archive filters ----
// Items carry data-tags; the chosen filter lives in ?filter= so it can be
// linked to (landing rows, old motion.html / design.html redirects).
const FILTER_KEY = "workFilter";
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pad2 = (n) => String(n).padStart(2, "0");

document.querySelectorAll("[data-filter-scope]").forEach((scope) => {
  const buttons = [...scope.querySelectorAll("[data-filter]")];
  if (!buttons.length) return;
  const items = [...scope.querySelectorAll("[data-tags]")];
  const empty = scope.querySelector(".filter-empty");
  const count = scope.querySelector("[data-filter-count]");
  const viewsEl = scope.querySelector("[data-filter-views]");
  const views = viewsEl ? JSON.parse(viewsEl.textContent) : null;
  const head = scope.querySelector(".page-head");
  const reel = scope.querySelector("[data-reel]");
  const reelHtml = reel && reel.innerHTML;
  const teaser = scope.querySelector("[data-archive-teaser]");
  const keys = buttons.map((b) => b.dataset.filter);

  function apply(key) {
    if (!keys.includes(key)) key = "all";
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === key)));

    let n = 0;
    items.forEach((el) => {
      const show = key === "all" || el.dataset.tags.split(" ").includes(key);
      el.hidden = !show;
      if (show) {
        n++;
        const num = el.querySelector(".num");
        if (num) num.textContent = pad2(n);
      }
    });
    if (count) count.textContent = pad2(n);
    if (empty) empty.hidden = n > 0;

    const view = views && (views[key] || views.all);
    if (view && head) {
      head.querySelector("h1").innerHTML = view.heading;
      head.querySelector(".blurb").innerHTML = view.blurb;
    }
    if (reel) {
      const show = !!(view && view.reel);
      // hiding a playing reel resets it to the poster so the audio stops
      if (!show && reel.querySelector("iframe")) {
        reel.innerHTML = reelHtml;
        bindFacades(reel);
      }
      reel.hidden = !show;
    }
    if (teaser) {
      const counts = JSON.parse(teaser.dataset.archiveTeaser);
      teaser.querySelector("[data-archive-count]").textContent = counts[key] ?? counts.all;
      // setAttribute keeps the href relative, which transition.js needs to animate it
      teaser.querySelector("a").setAttribute("href", key === "all" || !counts[key] ? "archive.html" : `archive.html?filter=${key}`);
    }

    const url = new URL(location.href);
    if (key === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", key);
    history.replaceState(null, "", url);
    try { sessionStorage.setItem(FILTER_KEY, key); } catch (e) {}
  }

  // clicking a filter lets the cards glide to their new places where the
  // browser supports view transitions; everywhere else it just swaps
  const animated = document.startViewTransition && !REDUCED_MOTION;
  buttons.forEach((b) =>
    b.addEventListener("click", () => {
      if (animated) document.startViewTransition(() => apply(b.dataset.filter));
      else apply(b.dataset.filter);
    })
  );
  apply(new URLSearchParams(location.search).get("filter") || "all");
});

// back-links to the Work page return to the filter you were browsing
document.querySelectorAll("[data-back-work]").forEach((a) => {
  let key = null;
  try { key = sessionStorage.getItem(FILTER_KEY); } catch (e) {}
  if (key && key !== "all") a.setAttribute("href", `index.html?filter=${encodeURIComponent(key)}#work`);
});

// ---- Archive lightbox ----
const lightbox = document.getElementById("lightbox");
if (lightbox) {
  const titleEl = lightbox.querySelector(".lightbox-bar h3");
  const mediaEl = lightbox.querySelector(".lightbox-media");

  document.querySelectorAll(".archive-card").forEach((card) => {
    card.addEventListener("click", () => {
      const data = JSON.parse(card.dataset.item);
      titleEl.textContent = data.title;
      mediaEl.innerHTML = "";

      if (data.video) {
        const holder = document.createElement("div");
        holder.className = "video-embed";
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube-nocookie.com/embed/${data.video}?autoplay=1&rel=0`;
        iframe.title = data.title;
        iframe.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        holder.appendChild(iframe);
        mediaEl.appendChild(holder);
      }

      (data.images || []).forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = data.title;
        img.loading = "lazy";
        mediaEl.appendChild(img);
      });

      lightbox.showModal();
    });
  });

  lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());

  // click on backdrop closes
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) lightbox.close();
  });

  // stop video playback when closed
  lightbox.addEventListener("close", () => {
    lightbox.querySelector(".lightbox-media").innerHTML = "";
  });
}

// ---- Test bench lightbox: one screenshot at a time, arrows to step ----
const benchbox = document.getElementById("benchbox");
if (benchbox) {
  const titleEl = benchbox.querySelector(".lightbox-bar h3");
  const counterEl = benchbox.querySelector(".benchbox-counter");
  const imgEl = benchbox.querySelector(".benchbox-stage img");
  const prevBtn = benchbox.querySelector(".benchbox-nav.prev");
  const nextBtn = benchbox.querySelector(".benchbox-nav.next");

  let shots = [];
  let title = "";
  let at = 0;

  const pad = (n) => String(n).padStart(2, "0");

  function show(i) {
    at = (i + shots.length) % shots.length;
    imgEl.src = shots[at];
    imgEl.alt = `${title} screenshot ${at + 1}`;
    counterEl.textContent = `${pad(at + 1)} / ${pad(shots.length)}`;
    // a single screenshot has nowhere to step
    prevBtn.hidden = nextBtn.hidden = shots.length < 2;
  }

  document.querySelectorAll("[data-bench]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const data = JSON.parse(btn.dataset.bench);
      shots = data.images || [];
      title = data.title;
      if (!shots.length) return;
      titleEl.textContent = title;
      show(Number(btn.dataset.index) || 0);
      benchbox.showModal();
    });
  });

  prevBtn.addEventListener("click", () => show(at - 1));
  nextBtn.addEventListener("click", () => show(at + 1));

  benchbox.querySelector(".lightbox-close").addEventListener("click", () => benchbox.close());

  benchbox.addEventListener("click", (e) => {
    if (e.target === benchbox) benchbox.close();
  });

  benchbox.addEventListener("keydown", (e) => {
    if (shots.length < 2) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1); }
  });
}

// ---- Featured carousel (top of the Work page) ----
// The active tick's progress bar is a CSS animation; when it finishes we
// advance. Pausing is just pausing that animation, so the bar and the
// timer can never disagree — and reduced-motion (which disables the
// animation) switches auto-rotation off for free.
document.querySelectorAll("[data-showcase]").forEach((root) => {
  const slides = [...root.querySelectorAll("[data-slide]")];
  const ticks = [...root.querySelectorAll("[data-go]")];
  if (slides.length < 2 || !ticks.length) return;

  const stage = root.querySelector(".showcase-stage");
  const pauseBtn = root.querySelector("[data-pause]");
  const n = slides.length;
  const hold = { user: false, hover: false, focus: false, away: false };
  let at = 0;
  let leaveTimer;

  root.classList.add("is-live");

  const sync = () =>
    root.classList.toggle("is-paused", hold.user || hold.hover || hold.focus || hold.away);

  function go(i, dir) {
    i = (i + n) % n;
    if (i === at) return;
    const prev = slides[at];
    slides.forEach((s) => s.classList.remove("is-leaving"));
    // the outgoing image stays put underneath while the new one wipes over it
    prev.classList.remove("is-active");
    prev.classList.add("is-leaving");
    root.dataset.dir = dir;
    slides[i].classList.add("is-active");
    ticks.forEach((t, k) => {
      t.classList.toggle("is-active", k === i);
      if (k === i) t.setAttribute("aria-current", "true");
      else t.removeAttribute("aria-current");
    });
    at = i;
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => prev.classList.remove("is-leaving"), 1000);
  }

  root.addEventListener("animationend", (e) => {
    if (e.animationName === "showcase-fill") go(at + 1, "next");
  });

  ticks.forEach((t) =>
    t.addEventListener("click", () => {
      const i = Number(t.dataset.go);
      go(i, i > at ? "next" : "prev");
    })
  );
  root.querySelector("[data-prev]").addEventListener("click", () => go(at - 1, "prev"));
  root.querySelector("[data-next]").addEventListener("click", () => go(at + 1, "next"));

  pauseBtn.addEventListener("click", () => {
    hold.user = !hold.user;
    pauseBtn.textContent = hold.user ? "Play" : "Pause";
    pauseBtn.setAttribute("aria-label", hold.user ? "Resume rotation" : "Pause rotation");
    sync();
  });
  if (REDUCED_MOTION) pauseBtn.hidden = true; // nothing rotates on its own

  // hold still while someone is reading, tabbing through, or scrolled away
  stage.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { hold.hover = true; sync(); } });
  stage.addEventListener("pointerleave", () => { hold.hover = false; sync(); });
  root.addEventListener("focusin", (e) => { hold.focus = e.target.matches(":focus-visible"); sync(); });
  root.addEventListener("focusout", () => { hold.focus = false; sync(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => { hold.away = !entry.isIntersecting; sync(); }, { threshold: 0.25 }).observe(root);
  }

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1, "prev"); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1, "next"); }
  });

  // swipe on touch screens; a swipe must not also count as a tap on the slide
  let startX = null;
  let startY = 0;
  let swiped = false;
  stage.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    swiped = false;
  }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped = true;
      if (dx < 0) go(at + 1, "next");
      else go(at - 1, "prev");
    }
  }, { passive: true });
  stage.addEventListener("click", (e) => {
    if (swiped) { e.preventDefault(); e.stopPropagation(); swiped = false; }
  }, true);
});

// ---- Scroll reveals ----
// Only things that start below the fold are held back, so nothing on
// screen at load ever flashes. Without JS (or with reduced motion)
// everything is simply visible.
if (!REDUCED_MOTION && "IntersectionObserver" in window) {
  const targets = document.querySelectorAll(
    ".work-card, .archive-card, .section-head, .project-section, .project-media figure, " +
      ".project-credits, .project-nav, .archive-teaser, .bench-entry, .about-intro, .footer-cta"
  );
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal-in");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  const fold = window.innerHeight;
  targets.forEach((el) => {
    if (el.getBoundingClientRect().top < fold) return;
    el.classList.add("reveal");
    io.observe(el);
  });
}
