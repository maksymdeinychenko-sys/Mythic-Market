/**
 * AI art generation pipeline for Mythic Market.
 *
 * Calls OpenAI's image API (gpt-image-1) once per item and once per hero,
 * saves PNGs into public/sprites/. Idempotent — skips files that already
 * exist. Style prompt is fixed to "heraldic woodcut" so the generated
 * catalog reads as a coherent set.
 *
 * Run:
 *   1. Put your key in .env:    OPENAI_API_KEY=sk-...
 *   2. npm install               (installs the openai package)
 *   3. npm run art               (or `npm run art:heroes` for a subset)
 *
 * Cost estimate (low quality, transparent background, 1024×1024):
 *   ~$0.011 per image × 31 items + 3 heroes = roughly $0.40 for the catalog.
 *   High quality is ~$0.04 each, so ~$1.40 for the full run.
 */
import OpenAI from "openai";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ITEMS } from "../src/data/items";
import { HEROES } from "../src/data/heroes";

// ─── Config ─────────────────────────────────────────────────────────────────
const QUALITY: "low" | "medium" | "high" | "auto" = "low";
const SIZE: "1024x1024" | "1024x1536" | "1536x1024" | "auto" = "1024x1024";
const CONCURRENCY = 3;
const BACKGROUND: "transparent" | "opaque" | "auto" = "transparent";

const STYLE_ANCHOR = `heraldic woodcut illustration in a stylized fantasy game-icon aesthetic.
Single subject centered on a transparent background.
Dark forest-green color palette accented with warm gold and bone-white.
Clean thick outlines, slight grain texture, no text, no watermarks.
Composition fills the frame with a tight 1:1 aspect ratio.`;

// Per-item subject prompt fragments. Each is appended to STYLE_ANCHOR.
const ITEM_PROMPTS: Record<string, string> = {
  // Plant
  banana: "a single curved yellow banana with a small green stem leaf",
  berry_bush: "a small bush with a cluster of dark purple berries",
  thorny_vine: "a coiling vine bristling with sharp thorns and red barbs",
  ancient_root: "the gnarled exposed root system of an ancient oak, glowing faintly at center",
  world_seed: "a luminous green seed with curling sprouts, halo of light",
  bramble_trap: "a circular trap of thorny brambles with a red eye at the center",
  mossy_branch: "a thick wooden branch covered in soft green moss tufts",
  sunflower: "a stylized sunflower with golden petals and a dark seedy core",

  // Beast
  monkey_paw: "a clenched simian paw with curled fingers and small claw points",
  tiger_claw: "four parallel sharp tiger claws cutting diagonally across the icon",
  wolf_spirit: "a fierce silhouette of a wolf head with glowing yellow eyes",
  bear_pelt: "a draped grizzly bear pelt with the head facing forward, mouth open",
  dragon_heart: "an anatomical dragon heart wreathed in stylized flame curls",
  lion_mane: "a regal lion's face surrounded by a thick golden mane",
  spider_fang: "two pointed venom-dripping spider fangs crossed at the base",
  ram_horn: "two curling spiraled ram horns flanking a central blaze",

  // Fish
  coral_shield: "a heater shield made of branching pink coral with a pearl inset",
  electric_eel: "a sinuous yellow lightning-bolt-shaped eel with crackling tail",
  vampire_squid: "a deep purple squid with red eyes and trailing tentacles",
  abyssal_pearl: "an open clam shell revealing a glowing iridescent pearl",
  leviathan_fin: "a single massive scaled fish fin rising from dark water",
  jellyfish_tendril: "a translucent jellyfish bell with long trailing tendrils",
  lava_crab: "a red crab with glowing molten cracks across its shell",
  pufferfish: "a round inflated pufferfish covered in spikes, bug-eyed",

  // Universal
  golden_coin: "an embossed gold coin stamped with a stylized M for Mythic",
  whetstone: "a chunky rectangular sharpening stone with a smooth top edge",
  hourglass: "a sand timer with golden sand falling through the narrow neck",
  cursed_idol: "a weathered stone idol head with red gem eyes",
  burning_brand: "a wooden torch handle topped with bright orange flame",
  venom_vial: "a glass apothecary vial filled with bubbling green poison",
  ironwood_talisman: "a circular bronze talisman engraved with leaf and root motifs",
};

const HERO_PROMPTS: Record<string, string> = {
  monkey: "a charismatic anthropomorphic monkey character bust portrait, brown fur, gold ear ring, mischievous expression, beast-tribe shaman aesthetic",
  mermaid: "a graceful mermaid character bust portrait, flowing teal hair, shell tiara, pearl earrings, oceanic priestess aesthetic",
  mushroom: "a friendly anthropomorphic mushroom character bust portrait, red cap with white spots, expressive eyes, forest druid aesthetic",
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_ITEMS = path.join(ROOT, "public", "sprites", "items");
const OUT_HEROES = path.join(ROOT, "public", "sprites", "heroes");

function buildItemPrompt(defId: string, fragment: string): string {
  return `${STYLE_ANCHOR}\n\nSubject: ${fragment}.`;
}
function buildHeroPrompt(heroId: string, fragment: string): string {
  return `Heraldic medallion-style character portrait, viewed front-on inside a circular composition.
Same dark forest-green palette with warm gold accents and bone-white highlights.
Hand-painted woodcut texture, expressive face, no text, transparent background, square 1:1.

Subject: ${fragment}.`;
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

const MANIFEST_PATH = path.join(ROOT, "src", "data", "spritesManifest.ts");

/** Re-emits src/data/spritesManifest.ts with a fresh listing of present sprites. */
async function rewriteManifest() {
  const items = (await fs.readdir(OUT_ITEMS).catch(() => []))
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.slice(0, -4))
    .sort();
  const heroes = (await fs.readdir(OUT_HEROES).catch(() => []))
    .filter((f) => f.endsWith(".png"))
    .map((f) => f.slice(0, -4))
    .sort();
  const body = `/**
 * Auto-generated by \`npm run art\`. Lists which IDs have PNG sprites in
 * /public/sprites/. Components check these sets to decide whether to
 * render an <img> or fall back to the inline SVG glyph.
 *
 * Hand-editing is OK — but if you run the generator it will rewrite
 * this file's \`items\` and \`heroes\` arrays.
 */
export const SPRITE_MANIFEST = {
  items: ${JSON.stringify(items, null, 2)} as string[],
  heroes: ${JSON.stringify(heroes, null, 2)} as string[],
};

const _items = new Set(SPRITE_MANIFEST.items);
const _heroes = new Set(SPRITE_MANIFEST.heroes);

export function hasItemSprite(id: string): boolean {
  return _items.has(id);
}
export function hasHeroSprite(id: string): boolean {
  return _heroes.has(id);
}
`;
  await fs.writeFile(MANIFEST_PATH, body);
}

async function fileExists(p: string): Promise<boolean> {
  try { await fs.stat(p); return true; } catch { return false; }
}

async function generateOne(
  client: OpenAI,
  prompt: string,
  outPath: string,
  label: string
): Promise<"generated" | "skipped" | "failed"> {
  if (await fileExists(outPath)) {
    console.log(`  · skip   ${label}  (exists)`);
    return "skipped";
  }
  try {
    const res = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      size: SIZE,
      quality: QUALITY,
      background: BACKGROUND,
      n: 1,
    });
    const data = res.data?.[0];
    if (!data?.b64_json) {
      console.warn(`  ✗ failed ${label}  (no image data)`);
      return "failed";
    }
    const buf = Buffer.from(data.b64_json, "base64");
    await fs.writeFile(outPath, buf);
    console.log(`  ✓ wrote  ${label}`);
    return "generated";
  } catch (err: any) {
    console.warn(`  ✗ failed ${label}  (${err.message ?? err})`);
    return "failed";
  }
}

/** Crude semaphore: limit how many requests are in-flight at once. */
async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<unknown>): Promise<void> {
  const queue = [...items];
  const inflight: Promise<unknown>[] = [];
  while (queue.length || inflight.length) {
    while (inflight.length < limit && queue.length) {
      const item = queue.shift()!;
      const p = worker(item).finally(() => {
        inflight.splice(inflight.indexOf(p), 1);
      });
      inflight.push(p);
    }
    await Promise.race(inflight);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "✗ OPENAI_API_KEY not set.\n" +
      "  Create .env in the project root with:\n" +
      "    OPENAI_API_KEY=sk-...\n" +
      "  Then re-run `npm run art`."
    );
    process.exit(1);
  }

  await ensureDir(OUT_ITEMS);
  await ensureDir(OUT_HEROES);

  const target = process.argv[2]; // "items" | "heroes" | undefined (= all)
  const doItems = !target || target === "items";
  const doHeroes = !target || target === "heroes";

  const itemTargets = doItems
    ? ITEMS
        .filter((it) => ITEM_PROMPTS[it.id])
        .map((it) => ({ id: it.id, prompt: buildItemPrompt(it.id, ITEM_PROMPTS[it.id]), out: path.join(OUT_ITEMS, `${it.id}.png`) }))
    : [];

  const heroTargets = doHeroes
    ? HEROES
        .filter((h) => HERO_PROMPTS[h.id])
        .map((h) => ({ id: h.id, prompt: buildHeroPrompt(h.id, HERO_PROMPTS[h.id]), out: path.join(OUT_HEROES, `${h.id}.png`) }))
    : [];

  const total = itemTargets.length + heroTargets.length;
  const costPer = QUALITY === "low" ? 0.011 : QUALITY === "medium" ? 0.022 : 0.042;
  console.log(`Mythic Market — art generation`);
  console.log(`  quality:    ${QUALITY}`);
  console.log(`  size:       ${SIZE}`);
  console.log(`  bg:         ${BACKGROUND}`);
  console.log(`  to generate: ${total}  (~$${(total * costPer).toFixed(2)})`);
  console.log("");

  const client = new OpenAI({ apiKey });

  let generated = 0, skipped = 0, failed = 0;

  console.log("Items:");
  await runWithConcurrency(itemTargets, CONCURRENCY, async (t) => {
    const r = await generateOne(client, t.prompt, t.out, `items/${t.id}.png`);
    if (r === "generated") generated++;
    else if (r === "skipped") skipped++;
    else failed++;
  });

  console.log("\nHeroes:");
  await runWithConcurrency(heroTargets, CONCURRENCY, async (t) => {
    const r = await generateOne(client, t.prompt, t.out, `heroes/${t.id}.png`);
    if (r === "generated") generated++;
    else if (r === "skipped") skipped++;
    else failed++;
  });

  console.log(`\nDone — generated ${generated}, skipped ${skipped}, failed ${failed}.`);

  // Rebuild the manifest so the React components know which sprites exist.
  await rewriteManifest();
  console.log(`Manifest written to src/data/spritesManifest.ts`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
