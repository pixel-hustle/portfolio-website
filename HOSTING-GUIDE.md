# How to host jaredhanline.com on GitHub Pages

This guide takes the site from your computer to live at www.jaredhanline.com,
hosted free on GitHub Pages. You'll do this once; after that, publishing an
update is a two-click affair.

Time: about 20 minutes of clicking, then up to a day of waiting for DNS.

---

## Part 1 — Put the site on GitHub

The easiest way is **GitHub Desktop** (free app: https://desktop.github.com).
If you don't have a GitHub account yet, create one first at https://github.com
— your username will be part of the setup below, so note it.

1. Open GitHub Desktop and sign in to your GitHub account.
2. Menu: **File → Add Local Repository…** and choose the folder
   `Documents/GitHub/portfolio-website`.
   - If it says "this directory does not appear to be a Git repository,"
     click the **create a repository** link it offers, keep all defaults,
     and click **Create Repository**.
3. Click **Publish repository** (top bar).
   - Name: `portfolio-website` (or anything you like)
   - **Uncheck "Keep this code private"** — GitHub Pages on a free account
     requires the repository to be public. (That just means the code/images
     are visible; it's your public portfolio anyway.)
   - Click **Publish Repository**.

Your files are now on GitHub.

## Part 2 — Turn on GitHub Pages

1. Go to https://github.com and open your `portfolio-website` repository.
2. Click **Settings** (top of the repo) → **Pages** (left sidebar).
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**, folder **/ (root)** → click **Save**.
4. Wait a minute or two, refresh the page — you'll see
   "Your site is live at https://YOURUSERNAME.github.io/portfolio-website/".
   Visit it to confirm the site works.

## Part 3 — Point your domain at it

### On GitHub:

1. Still in **Settings → Pages**, find **Custom domain**.
2. Type `www.jaredhanline.com` and click **Save**.
   (GitHub adds a small file called `CNAME` to your repository — that's
   normal, leave it there.)
3. It will show a DNS warning until Part 4 is done. That's expected.

### Part 4 — On Namecheap:

1. Log in at https://namecheap.com → **Domain List** → click **Manage**
   next to jaredhanline.com → **Advanced DNS** tab.
2. **Delete the old records** that point to Webflow (any A, CNAME, or
   ALIAS records for hosts `@` and `www` that mention webflow or
   proxy-ssl). Don't touch MX or TXT records if you have any — those are
   email-related.
3. Add these five new records:

   | Type  | Host | Value                     |
   |-------|------|---------------------------|
   | CNAME | www  | YOURUSERNAME.github.io    |
   | A     | @    | 185.199.108.153           |
   | A     | @    | 185.199.109.153           |
   | A     | @    | 185.199.110.153           |
   | A     | @    | 185.199.111.153           |

   Replace YOURUSERNAME with your actual GitHub username. The four A
   records make plain `jaredhanline.com` (no www) work too — GitHub
   redirects it to www automatically.

4. Save. DNS changes usually take 30–60 minutes, occasionally up to
   24–48 hours.

### Back on GitHub (once the site loads at your domain):

1. **Settings → Pages** → check **Enforce HTTPS**. If the checkbox is
   grayed out, wait a few hours and try again — GitHub is still issuing
   your security certificate.

2. Once everything works, you can cancel your Webflow site/hosting plan.
   (Keep the Namecheap domain — that renewal is separate and you need it.)

---

## Publishing updates later (the routine)

After you change anything with the CMS (see ADMIN-GUIDE.md):

1. Open **GitHub Desktop** — it will show your changed files.
2. Type a short summary in the box bottom-left (e.g. "added new project"),
   click **Commit to main**.
3. Click **Push origin** (top bar).

The live site updates itself within a minute or two. That's it.

---

## If something goes wrong

- **Site shows README or 404**: In Settings → Pages, confirm branch is
  `main` and folder is `/ (root)`.
- **Domain shows Namecheap parking page**: DNS hasn't propagated yet, or
  an old record wasn't deleted. Recheck the table above.
- **"Enforce HTTPS" won't enable**: wait — certificate can take up to a
  day after DNS is correct.
- **Custom domain box empties itself after a push**: the `CNAME` file was
  deleted locally. In Settings → Pages, re-enter the domain, then in
  GitHub Desktop pull the change (Fetch/Pull origin).
