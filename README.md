# KaziRift — setup guide

A jobs + business news board for kazirift.netlify.app, with a private admin
page you use as your "server" to upload jobs and news. No paid backend —
your admin page writes straight to a GitHub repo, and Netlify auto-rebuilds
the site whenever that repo changes. Totally free.

## 1. Put this on GitHub

1. Create a new **public or private** repo, e.g. `kazirift`.
2. Push everything in this folder to it (root of the repo, not a subfolder).

## 2. Connect Netlify

1. In Netlify: **Add new site → Import an existing project → GitHub** → pick the repo.
2. Build command: leave blank. Publish directory: `.` (root) — already set in `netlify.toml`.
3. Deploy. Then in **Site settings → Domain management**, set the site name to `kazirift` so your URL is `kazirift.netlify.app`.
4. Every time `data/jobs.json` or `data/news.json` changes in GitHub (which the admin page does for you), Netlify redeploys automatically — usually live in under a minute.

## 3. Create a GitHub token for the admin page

The admin page needs permission to edit two files in your repo. Use a
**fine-grained token scoped only to this repo** — never a classic all-repo token.

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token.
2. Resource owner: your account. Repository access: **Only select repositories** → pick `kazirift`.
3. Permissions → Repository permissions → **Contents: Read and write**. Leave everything else as "No access."
4. Generate, copy the token (starts `github_pat_...`) — you won't see it again.

## 4. Use your admin page

Go to `https://kazirift.netlify.app/admin.html` (not linked from the public
site, and blocked from search indexing via `robots.txt`). On first visit,
enter:
- GitHub username
- Repo name (`kazirift`)
- Branch (`main`)
- The token from step 3

It's saved only in your browser's local storage — nothing is sent anywhere
except directly to GitHub's API. From there you can paste in jobs you find
around the internet (title, company, location, category, salary, source
link, description) or a business news item, and hit publish. Each publish
is a real commit to your repo, so you also get free version history of
every job you've ever posted.

**To upload jobs from your phone while browsing:** open `admin.html` in a
second browser tab, copy details from the job posting you found, paste
them into the form. Takes under a minute per job.

## 5. Ads

**Monetag** — paste your site's Monetag tag script in `index.html`, in the
spot marked `<!-- MONETAG -->` near the top of `<head>`. Turn on
**auto-refresh in the Monetag dashboard itself** rather than writing your
own JS timer — their script is built to keep refresh timing inside their
own compliance rules.

**Adsterra** — paste your sticky footer banner code into the
`<div class="footer-ad-strip" id="footer-ad">` block near the bottom of
`index.html`. This div is already `position: sticky; bottom: 0`, which is
exactly Adsterra's supported sticky-footer format — visible at all times,
nothing hidden.

**Sponsored job cards** — already wired up. `assets/app.js` inserts a
job-shaped "Sponsored" card after every 3rd real listing automatically
(see the `sponsoredCard()` function). Right now it's a placeholder
"Your job could be here" card — swap the `href="#"` for your Monetag/Adsterra
ad-unit link or a real paid-placement link once you have one.

There's also a static `.ad-slot` div in the sidebar (`#rail-ad`) for a
banner unit if you want one there too.

### On hidden ads

Worth restating since you already flagged it: don't set any ad element to
`display:none`, `0px`, `opacity:0`, or push it off-screen while still
"playing." Every ad slot in this build is a normal, visible, laid-out
element — the sponsored card takes real space in the job list, and the
footer strip is a real sticky bar. That's the only way to stay compliant
with both networks' detection.

## File map

```
index.html          the public site
admin.html           your private job/news uploader
assets/style.css      styling
assets/app.js         renders jobs/news, search, filters, sponsored insertion
assets/admin.js       talks to GitHub's API to publish jobs/news
data/jobs.json        job listings (edited via admin.html, or by hand)
data/news.json        business news (same)
netlify.toml          Netlify build/publish config + security headers
robots.txt            keeps /admin.html out of search engines
```

## Adding jobs by hand (no admin page needed)

`data/jobs.json` and `data/news.json` are plain JSON — you can also edit
them directly in GitHub's web UI or on your laptop and push. Each job
needs at minimum `id`, `title`, `company`, `location`, `category`, `posted`
(YYYY-MM-DD). The admin page just automates that same edit.
