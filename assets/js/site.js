/* Jared Hanline portfolio — progressive enhancement only.
   Everything on the site works without this file except
   video playback and the archive lightbox. */

// ---- YouTube click-to-play facades ----
document.querySelectorAll(".video-facade").forEach((btn) => {
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
