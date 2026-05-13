# Mythic Market — Free Deployment Guide

A step-by-step walkthrough that takes you from "the code is on my computer" to
"the game is live on a public URL anyone can play" in about 10–15 minutes.

**Total cost: $0.** No credit card required for the basic deployment.

---

## TL;DR

1. Push the project to a GitHub repo.
2. Connect that repo to Vercel.
3. Vercel builds and hosts it at a public URL.
4. From now on, every `git push` redeploys the site automatically.

---

## What you'll get

- A public HTTPS URL like `mythic-market-yourname.vercel.app`
- A free SSL certificate (the green padlock in the address bar)
- Free hosting forever (within Vercel's hobby tier limits — you won't hit them)
- Auto-deploy on every push to `main`
- Optional: a custom domain like `mythicmarket.io` (the domain itself costs ~$10–15/year, but the hosting stays free)

## What's NOT included

- **No real cross-player multiplayer.** The Ghost system stores opponents in
  each browser's `localStorage`. So your friends won't fight your ghosts and
  vice-versa. To enable real shared ghosts you'd need a backend (Supabase /
  Postgres / similar) — that's a separate, partially-paid project.
- **No accounts / login system.** Same reason as above.
- **No payment processing.** This is a free-to-play, single-player experience
  by default. The "Paid Mode" pass system is balance-test scaffolding only.

---

## Step 0 — Verify your tools

Open your **Terminal** (macOS / Linux) or **PowerShell** (Windows) and run:

```bash
node --version       # need v18 or higher
git --version        # any modern version
```

**If `node` is not found:** install Node.js LTS from https://nodejs.org/.
Restart the terminal after installing.

**If `git` is not found:** install Git from https://git-scm.com/.

You also need a **free GitHub account**. Sign up at https://github.com/ if you
don't have one yet. Remember your username — we'll use it in Step 1.

---

## Step 1 — Push your code to GitHub

If your project is already pushed to GitHub, skip ahead to **Step 2**.

### 1a. Create the repository on github.com

1. Go to https://github.com/new
2. **Repository name:** `mythic-market` (or anything you want)
3. **Public** is recommended (private also works on Vercel's free tier)
4. **Do NOT** check any of "Add a README", "Add .gitignore", or
   "Choose a license" — the project already has these
5. Click **Create repository**

GitHub will show you a page with setup commands. The ones you need are under
"**…or push an existing repository from the command line**" — keep this page
open, you'll paste those commands in a moment.

### 1b. Push from your machine

Open a terminal and `cd` into the project folder:

```bash
cd "Internal project/Mythic Market/mythic-market-game"
```

Initialize Git, stage files, make the first commit:

```bash
git init
git add .
git commit -m "Initial commit"
```

Now connect to your GitHub repo. **Replace `YOUR_USERNAME`** with your actual
GitHub username (it's visible on github.com after you log in):

```bash
git remote add origin https://github.com/YOUR_USERNAME/mythic-market.git
git branch -M main
git push -u origin main
```

#### What if Git asks for a password?

GitHub no longer accepts password authentication on the command line. If
you're prompted for a password, you need a **Personal Access Token** instead:

1. Go to https://github.com/settings/tokens
2. **Generate new token** → **Generate new token (classic)**
3. Note: "Mythic Market deploy"
4. Expiration: 90 days (or longer)
5. Check the **`repo`** scope (top of the list)
6. Click **Generate token** at the bottom
7. **Copy the token now** — you can't see it again
8. Use the token as the password when Git prompts

Once `git push` succeeds, refresh your GitHub repo page — you should see all
the project files there.

---

## Step 2 — Deploy with Vercel (~3 minutes)

Vercel is the simplest free host for Vite projects.

### 2a. Sign up

1. Go to https://vercel.com/signup
2. Click **Continue with GitHub**
3. Authorize Vercel to access your repos
4. Choose the **Hobby** plan (free)

### 2b. Import the project

1. On the Vercel dashboard click **Add New… → Project**
2. Find your `mythic-market` repo in the list and click **Import**
3. The **Configure Project** screen appears. Vercel auto-detects Vite and
   pre-fills:
   - Framework Preset: **Vite** ✓
   - Build Command: `npm run build` ✓
   - Output Directory: `dist` ✓
   - Install Command: `npm install` ✓
4. **Don't add any environment variables** — we don't need them
5. Click **Deploy**

### 2c. Wait for the build

Vercel will scroll a build log for ~60 seconds. When it finishes you'll see a
confetti animation and a preview thumbnail.

Click **Continue to Dashboard** → click the **Visit** button at the top.

That's your live game. The URL is something like
`https://mythic-market-abc123.vercel.app`. Share it — anyone with the link
can play immediately, no signup needed.

---

## Step 3 — Push updates

You don't need any deployment commands going forward. Just:

```bash
# After making changes locally:
git add .
git commit -m "Tweak balance / add items / whatever"
git push
```

Vercel detects the push, builds, and deploys automatically. New version is
live in ~60 seconds. You'll get an email if a build fails, with the log.

To **roll back** a bad deploy: Vercel Dashboard → your project → **Deployments**
tab → click any earlier deploy → **⋯** → **Promote to Production**.

---

## Step 4 (optional) — Custom domain

Skip this if `mythic-market-abc123.vercel.app` is fine for you.

1. Buy a domain (cheapest in 2026: **Cloudflare Registrar** at
   https://dash.cloudflare.com → no markup over wholesale ~$10/year).
   Other options: Namecheap, Google Domains, Porkbun.
2. In Vercel: project → **Settings** → **Domains** → enter your domain →
   **Add**
3. Vercel will show you DNS records to configure. There are two common cases:
   - **A records** like `76.76.21.21`
   - A **CNAME** record pointing to `cname.vercel-dns.com`
4. Go to your domain registrar's DNS dashboard and add **exactly the records
   Vercel showed you**
5. Wait 5–15 minutes for DNS to propagate
6. Vercel automatically issues a free HTTPS certificate. The padlock will
   appear when ready

---

## Step 5 (optional) — Generate AI art

The game ships with hand-drawn inline SVG icons that work fine. If you want
real AI-generated PNG art, run the generator **locally** (not on Vercel),
then commit the PNGs.

See `SECRETS_TEMPLATE.md` for the OpenAI API key setup.

The flow:

```bash
cp .env.example .env
# Edit .env, paste your OpenAI key
npm install
npm run art        # ~$0.40 at low quality, generates everything
git add public/sprites src/data/spritesManifest.ts
git commit -m "Add generated art"
git push
```

Vercel will rebuild with the new images and serve them. The components fall
back to inline SVG for any items you didn't generate.

---

## Alternative — Cloudflare Pages

If you prefer Cloudflare to Vercel (more generous bandwidth, slightly less
slick UI):

1. Sign up at https://dash.cloudflare.com/sign-up
2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. Authorize Cloudflare to access GitHub
4. Select your `mythic-market` repo
5. Set:
   - **Production branch:** `main`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
6. Click **Save and Deploy**

Free-tier limits are very generous — unlimited requests, 500 builds per month.

---

## Troubleshooting

**`git push` fails with "remote contains work that you do not have locally"**
You initialized your remote repo with a README on GitHub. Run
`git pull origin main --allow-unrelated-histories`, resolve any conflicts,
then `git push` again.

**Vercel build fails with "command not found: vite"**
Vercel runs `npm install` before building, but if `vite` somehow isn't in
`devDependencies` it can't find the build tool. Open `package.json`, confirm
`vite` is listed under `devDependencies`. If missing, add it:
`npm install --save-dev vite@^5.4.11` then commit and push.

**Vercel build fails with TypeScript errors**
The build runs `tsc -b && vite build`. If TypeScript complains, you'll see the
exact file/line in the build log. Fix locally, commit, push.

**The site loads but shows a blank page**
Open the browser console (Cmd+Opt+I / F12). If the error mentions
`localStorage` or stale state, click **Reset everything** on the main menu —
or in DevTools, **Application → Local Storage → http://your-url** → delete the
`mythic-market-state-v1` key.

**Sharing the URL with friends — their progress doesn't sync with mine**
Expected. Each browser has its own savegame and ghost database. To share data
across players you'd need to wire up a backend (out of scope for this guide).

**My friend reports `404` on `/sprites/items/banana.png`**
The PNG hasn't been generated and pushed yet. Either run `npm run art` and
commit the result, or your friend's browser will fall back to the inline SVG
glyph automatically (which is the default behavior).

---

## Ongoing costs and limits

Recap of what's free vs. paid:

| Component | Cost | Limits |
|---|---|---|
| **Vercel hosting** | Free | 100 GB bandwidth/month, 100 deploys/day. You won't hit either. |
| **GitHub repo** | Free | Unlimited public repos. |
| **HTTPS cert** | Free | Auto-renewed. |
| **Custom domain** | $10–15/year | One-time per year, optional. |
| **OpenAI art generation** | ~$0.40 one-time | Optional. Only billed when you actively run `npm run art`. |
| **Vercel Pro** | $20/month | Not needed for this project. Don't upgrade. |

The TL;DR: **free in perpetuity** unless you decide you want a custom domain
or AI-generated art.

---

## What's next

Things you could build on top of this deployment:

- **Real shared ghosts:** wire up Supabase (free tier) to replace the
  `localStorage`-based ghost store. The simulator already produces JSON-shaped
  snapshots — it's a backend swap, not a rewrite.
- **Analytics:** add Vercel Analytics (free 2,500 events/month) to see which
  builds and items players actually use.
- **Mobile-friendly layout:** the workshop and combat UI are desktop-first;
  responsive breakpoints are doable in a focused pass.
- **Daily seed challenges:** server-generated daily seeds where every player
  faces the same starting deck. Needs a backend.

Each of those is a separate project — none are required to ship the game as
a free playable website. You're done as soon as Step 2 finishes.

Good luck shipping it.
