# How to use the CMS (admin panel)

The CMS is a small app that runs **only on your Mac** — it is never part of
the public website, needs no login, and no one on the internet can reach it.
You use it to add, edit, remove, and reorder projects; upload images; and
edit the About page. When you hit save, it rebuilds the website files.

---

## Starting it

1. Open the **Terminal** app (press Cmd+Space, type "terminal", press Return).
2. Type these two lines, pressing Return after each:

   ```
   cd ~/Documents/GitHub/portfolio-website
   node admin.js
   ```

   (The first line matters — it moves Terminal into the website folder.
   If you skip it you'll get a "Cannot find module" error.)

3. You'll see:

   ```
   Portfolio CMS running:
     Site preview:  http://localhost:5252
     Admin panel:   http://localhost:5252/admin
   ```

4. Open your web browser and go to **http://localhost:5252/admin**

## Using it

There are four tabs:

- **Case Studies** — one unified list of all projects.
  - ↑ / ↓ reorder them (order here = order on the site)
  - **Hide** takes a project off the site without deleting it — it stays
    in this list, grayed out, until you click **Show**
  - **Edit** opens everything: title, **Section** (Motion, Design, or
    **Both pages**), client, discipline, thumbnails, hero image, the
    text sections, YouTube videos, gallery images, credits
  - **+ Add project** creates a new one; **Delete** removes one for good
  - Inside **Edit**, "Send to Archives →" demotes a project to an archive
    piece. Its full write-up is kept invisibly, so promoting it back
    later restores everything.
- **Archives** — one unified list of the smaller pieces. Same idea:
  a **Which archive** picker (Motion, Design, or Both), a **Hide/Show**
  toggle, a thumbnail, and either a YouTube video ID or a set of images
  for the pop-up viewer. Inside **Edit**, "Promote to Case Study →"
  turns a piece into a full case study — instantly restoring the old
  write-up if it used to be one, or giving you a blank story to fill in
  if it didn't.
- **Test Bench** — your tools and software experiments, with an ON/OFF
  switch for the whole section. Each tool has a name, blurb, a list of
  screenshots, and an optional link (a Download link shows a "Get This"
  button; a Web link shows "Try it" and opens a new tab). The first
  screenshot in the list runs large; the rest become supporting thumbnails
  under it. Reorder with ↑ ↓ — whatever sits at the top is the main image.
  Every screenshot opens in a lightbox, with arrow keys to step through
  them. Tools with no link show no button at all. The page's big header,
  blurb, page name, and landing descriptor are edited in **About & Site**,
  alongside the Motion and Design pages.
- **About & Site** — the landing page headline and tagline, your email,
  motion reel video, the About intro and portrait (shown on the landing
  page), ON/OFF switches for both archives, and each section page's
  text: big header, blurb, page name, and landing descriptor. In headers,
  "&" and anything wrapped in *asterisks* renders in the accent color,
  and a "|" forces a line break.

Tips:

- Anywhere you see **Choose…** you can pick from every image already on
  the site, or click **Upload new…** to add a photo/graphic from your Mac.
- YouTube video ID = the part after `watch?v=` in a YouTube link.
  For `youtube.com/watch?v=RRXaC1RTvcg` the ID is `RRXaC1RTvcg`.
- In text sections, separate paragraphs with a blank line.

## Saving

Click **Save & Rebuild** (top right) when you're done. This writes your
changes and regenerates the website's pages. Check your work at
**http://localhost:5252** (the site preview).

Nothing is on the internet yet — saving only updates the files on your
Mac. To publish, do the GitHub Desktop commit-and-push routine at the
end of HOSTING-GUIDE.md.

## Stopping it

Go back to Terminal and press **Ctrl+C** (the Control key, not Cmd).
Or just close the Terminal window.

---

## Troubleshooting

- **"Cannot find module '/Users/you/admin.js'"** — you skipped the `cd`
  line. Run `cd ~/Documents/GitHub/portfolio-website` first.
- **"address already in use"** — the CMS is already running in another
  Terminal window. Find it and Ctrl+C it, or just use the browser — it's
  already up at localhost:5252.
- **Browser says "can't connect to localhost:5252"** — the CMS isn't
  running. Do the "Starting it" steps.
- **Changes don't show on the live site** — did you Save & Rebuild, then
  commit and push in GitHub Desktop?
