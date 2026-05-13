# Mythic Market — Prototype

Asynchronous roguelike auto-battler. Built from the design knowledge base in the parent folder (Documents 1–6, Item Catalog v1.0, Scaling Logic Overview).

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Deploying as a free website

See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for a complete step-by-step
walkthrough — push to GitHub, connect to Vercel, your game is live in ~10 minutes
at zero cost.

API key reference: **[SECRETS_TEMPLATE.md](./SECRETS_TEMPLATE.md)** —
documents every key the project knows how to use (currently just the
optional `OPENAI_API_KEY` for one-time art generation; deployment itself
needs no keys).

## What's in this prototype

- **Playable Day 1 loop** — Title → Hero Select → Day Hub → Phase 1 (Find) → Phase 2 (Find/Trader) → Phase 3 (PvE) → Phase 4 (Find/Trader) → Phase 5 (Trader/PvE) → Phase 6 (Ghost PvP) → End-of-day summary.
- **Item catalog v1.0** — All 15 nature items + 4 utility items from the design doc, with full rarity scaling (Wooden → Diamond) per the formula `V_n = V_b × 1.5^(n-1)`.
- **Combat simulator** — Deterministic cooldown-based auto-battler with Shield/Damage/Healing/Overhealing/Vampirism/Slowing/Fasting/Recharge keywords and Linking math.
- **Inventory & merge** — 8-slot dynamic combat row, drag-drop, identical-rarity merging, link visualization.
- **Shop** — Rarity-weighted by day, reroll for 1g, free lock, +20% type weighting toward hero's nature.
- **NPC archetypes** — All 4 (Iron Bark, Viper, Predator, Druid) with HP scaling per `Base 80 + Day × 25 × DiffMult`.
- **Ghost system** — JSON snapshot capture on Phase 6 completion, day+level±1 matchmaking, 30 seeded ghosts so Day 1 always finds an opponent. Local JSON persistence in `/data/ghosts/`.
- **Hero progression** — XP table, HP curve, slot unlocks at L1/3/5/7/9/11.

## Project layout

```
src/
  core/         framework-agnostic game logic (combat, inventory, shop, ghost, progression)
  data/         catalogs (items, heroes, NPCs, scaling tables, events)
  store/        Zustand game store
  components/   React UI (MainMenu, HeroSelect, DayHub, Workshop, Combat, EndOfRun)
  styles/       global CSS
  utils/        seeded RNG and helpers
data/
  ghosts/       persisted ghost snapshots (also seeded with mock opponents)
scripts/
  simCombat.ts  CLI tool to run a headless combat simulation
```

## Scope of this first pass

Day 1 is fully playable. Days 2–16 are configured (data + scaling work for any day) but the linear day-hub UI only auto-advances through Day 1 in this build — the loop and all systems are ready to extend.

## AI-generated art (optional)

The game ships with hand-drawn inline SVG art so it looks complete out of the
box. If you want generated PNG sprites, there's a one-shot pipeline that
calls OpenAI's image API:

```bash
# 1. Get an OpenAI API key with image-generation access.
cp .env.example .env
# 2. Edit .env and paste your key.
echo "OPENAI_API_KEY=sk-..." > .env
# 3. Make sure deps are installed (the pipeline uses the openai npm package).
npm install
# 4. Generate everything:
npm run art
# Or just heroes / just items:
npm run art:heroes
npm run art:items
```

Costs roughly $0.40 for the full catalog at low quality, ~$1.40 at high.
The script writes PNGs to `public/sprites/` and updates
`src/data/spritesManifest.ts` automatically. After it finishes, the React
components pick up the PNGs without any code change. Re-running the script
is idempotent — it skips files that already exist, so you can iterate on
just the items you want by deleting their PNG first.

The generated PNGs and the inline SVG glyphs are interchangeable per-item.
You can have generated art for some items and SVG for others; the manifest
decides per ID.

## Where to go next

- Wire Days 2–16 progression in `runState.ts`
- Expand event library (currently 8 Phase A/B events)
- Real backend for ghosts (swap `core/ghost.ts` persistence layer)
- Combat juice / animations / SFX
- Hero passives beyond the +5%/level recharge bonus
