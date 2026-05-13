# Secrets Template — Mythic Market

This file lists every API key the project knows how to use, what each one is
for, and exactly how to obtain and configure it.

> **You do NOT need any of these keys to deploy the game as a free website.**
> The deployed site is fully self-contained. Keys are only required for
> optional one-time tasks you run on your own machine.

---

## Quick reference table

| Key | Required for deployment? | Used for | Cost |
|---|---|---|---|
| `OPENAI_API_KEY` | ❌ No | Generating AI art locally (`npm run art`) | ~$0.40 one-time |

That's the only key the project currently uses. If you skip this entirely,
the game uses hand-drawn SVG icons and works fine.

---

## How to fill in keys

1. Copy the existing `.env.example` to a new file called `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` in a text editor.
3. Replace each placeholder with your real key (see instructions per-key
   below).
4. **Save the file. Do NOT commit it to Git.**
   `.env` is listed in `.gitignore` — that's intentional. Never paste your
   real keys into a public file.

After filling in `.env` you can run any script that needs those keys
(currently only `npm run art`).

---

## OPENAI_API_KEY — for AI art generation (optional)

### What it does

The script `scripts/generate-art.ts` (run via `npm run art`) calls OpenAI's
image API to generate one PNG per item and one per hero. The PNGs save to
`public/sprites/`. Once committed and pushed, your live site uses them
instead of the inline SVG fallbacks.

You only need to run this **once** (or whenever you add new items). The
deployed website never calls OpenAI — it just serves the PNGs you generated
and committed.

### How to get the key

1. Go to https://platform.openai.com/
2. **Sign up** (or log in if you have an account)
3. You'll need to add a payment method. **Add ~$5 of credit minimum** —
   image generation costs about $0.40 for the entire catalog at low quality,
   $1.40 at high quality
4. Open https://platform.openai.com/api-keys
5. Click **Create new secret key**
6. Name it something like "Mythic Market local"
7. Permissions: leave on **Default project**, **Read/Write** on Models
8. Click **Create secret key**
9. **Copy the key immediately** — once you close the dialog, OpenAI will
   never show it to you again. If you lose it, just delete and create a new
   one.

The key looks like `sk-proj-AbCdEf123...` (around 100 characters).

### Where to put it

In your project root, the file `.env` should look like this:

```env
# Copy of .env.example with the real key pasted in.
# Do NOT commit this file — it's gitignored on purpose.

OPENAI_API_KEY=
```

Paste your key after the `=` sign, with no spaces and no quotes:

```env
OPENAI_API_KEY=sk-proj-AbCdEf123...the-rest-of-your-key
```

Save the file.

### How to run the generator

From the project root:

```bash
npm install        # one-time, picks up the openai SDK
npm run art        # generates everything (~30 images)
```

The script will print progress as it works:

```
Mythic Market — art generation
  quality:    low
  size:       1024x1024
  bg:         transparent
  to generate: 34  (~$0.37)

Items:
  ✓ wrote  items/banana.png
  ✓ wrote  items/berry_bush.png
  · skip   items/thorny_vine.png  (exists)
  ...

Heroes:
  ✓ wrote  heroes/monkey.png
  ...

Done — generated 34, skipped 0, failed 0.
Manifest written to src/data/spritesManifest.ts
```

If you only want to regenerate items or heroes:

```bash
npm run art:items
npm run art:heroes
```

To regenerate a specific image, delete its PNG file first:

```bash
rm public/sprites/items/banana.png
npm run art:items     # banana gets regenerated; everything else is skipped
```

### How to push the result

```bash
git add public/sprites src/data/spritesManifest.ts
git commit -m "Generate AI art"
git push
```

Vercel (or whichever host) auto-rebuilds. Your live site now serves the new
images. The whole roundtrip takes ~3 minutes including the build.

### Cost control tips

- **Quality setting** in `scripts/generate-art.ts`:
  - `low` — ~$0.011 per image (default, good enough for game icons)
  - `medium` — ~$0.022
  - `high` — ~$0.042 per image
- **Concurrency** — currently 3 simultaneous requests. Bump it to 5–8 if you
  want it faster (and your account has enough rate-limit headroom).
- The script is **idempotent** — re-running it never re-bills you for images
  that already exist on disk. Delete a PNG to trigger regeneration of just
  that item.

### If you don't want to use OpenAI

You don't have to. The game ships with hand-crafted inline SVG icons for
every item and hero. They're crisp at any size and look like a coherent set.
Just skip this whole section.

---

## (No other keys yet)

The project doesn't currently use any other API keys. Future additions that
*might* require keys:

- **Supabase** (or similar) — if we add a real shared backend for ghost
  matchmaking across players. Would need `SUPABASE_URL` and
  `SUPABASE_ANON_KEY`. **Not implemented yet.**
- **Replicate / fal.ai** — alternative image-gen providers. The
  `generate-art.ts` script could be adapted. **Not implemented yet.**
- **PostHog / Vercel Analytics** — if you want to track which items players
  use. Optional, free tiers exist. **Not implemented yet.**

If/when any of these get added, this file will be updated with full
instructions for each.

---

## Security notes

- `.env` is listed in `.gitignore`. **Never** commit it. Doing so leaks your
  key publicly and OpenAI will quickly auto-revoke it (and bill you for any
  abuse before they noticed).
- If you suspect a key has been leaked, delete it immediately at
  https://platform.openai.com/api-keys and create a new one.
- These keys never need to be set on Vercel/Cloudflare/your hosting
  provider. They're only used during local-machine `npm run art` execution.
- Don't share your `.env` file or paste it in chat / Slack / GitHub issues.
