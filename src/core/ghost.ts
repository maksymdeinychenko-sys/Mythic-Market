/**
 * Ghost system — capture, store (browser localStorage in this prototype), and
 * matchmaking. The data shape matches Doc 6's JSON snapshot exactly so we can
 * swap to a real backend later without changing call sites.
 */
import type {
  Combatant, GhostSnapshot, ItemInstance, RunState, LinkDirection, Hero,
} from "@/core/types";
import { itemById } from "@/data/items";
import { effectiveLinkDir } from "@/core/inventory";
import { heroById, HEROES } from "@/data/heroes";
import { uid, pick, randInt, type Rng } from "@/utils/rng";

const STORAGE_KEY = "mm_ghosts_v1";

// ─── Persistence ────────────────────────────────────────────────────────────
function loadAll(): GhostSnapshot[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GhostSnapshot[]) : [];
  } catch {
    return [];
  }
}
function saveAll(snaps: GhostSnapshot[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snaps));
}

// ─── Capture ────────────────────────────────────────────────────────────────
export function captureGhost(rs: RunState, playerId = "local_player"): GhostSnapshot {
  const inv = rs.battleInventory.map((it: ItemInstance) => ({
    slot: it.slotIndex,
    def_id: it.defId,
    rarity: it.rarity,
    links: effectiveLinkDir(it),
  }));
  // Ghost stores the *combat* HP it would enter combat with — derived from level.
  const combatHp = 100 + Math.max(0, rs.level - 1) * 20; // mirrors COMBAT_HP_BY_LEVEL approximately
  return {
    ghost_id: uid("gh"),
    player_id: playerId,
    day: rs.day,
    hero_id: rs.heroId,
    hero_level: rs.level,
    max_hp: combatHp,
    current_hp: combatHp,
    inventory: inv,
    meta: {
      win_count: rs.pvpWinStreak,
      loss_count: rs.pvpLossStreak,
      captured_at: new Date().toISOString(),
    },
  };
}

export function persistGhost(g: GhostSnapshot): void {
  const all = loadAll();
  all.push(g);
  // Lifecycle: trim to ~1000 most recent per day to avoid bloat
  const byDay = new Map<number, GhostSnapshot[]>();
  for (const x of all) {
    const arr = byDay.get(x.day) ?? [];
    arr.push(x);
    byDay.set(x.day, arr);
  }
  const trimmed: GhostSnapshot[] = [];
  for (const arr of byDay.values()) {
    arr.sort((a, b) => (b.meta?.captured_at ?? "").localeCompare(a.meta?.captured_at ?? ""));
    trimmed.push(...arr.slice(0, 1000));
  }
  saveAll(trimmed);
}

// ─── Matchmaking ────────────────────────────────────────────────────────────
export interface MatchmakeOpts {
  day: number;
  level: number;
  /** "Win" → fight stronger ghost; "Loss" → weaker ghost. */
  streak: "Win" | "Loss" | "Neutral";
  excludeGhostIds?: string[];
}

export function matchmakeGhost(opts: MatchmakeOpts, rng: Rng): GhostSnapshot | null {
  const all = loadAll();
  const excludes = new Set(opts.excludeGhostIds ?? []);
  const isExcluded = (g: GhostSnapshot) => excludes.has(g.ghost_id);

  // Try progressively looser filters. We almost always find *something* this
  // way — only returns null if the database is literally empty.
  const filters = [
    // Strict: same day, level ±1
    (g: GhostSnapshot) => g.day === opts.day && Math.abs(g.hero_level - opts.level) <= 1,
    // Loose 1: same day, level ±3
    (g: GhostSnapshot) => g.day === opts.day && Math.abs(g.hero_level - opts.level) <= 3,
    // Loose 2: same day, any level
    (g: GhostSnapshot) => g.day === opts.day,
    // Loose 3: day ±1, any level
    (g: GhostSnapshot) => Math.abs(g.day - opts.day) <= 1,
    // Loose 4: day ±2
    (g: GhostSnapshot) => Math.abs(g.day - opts.day) <= 2,
    // Last resort: any ghost not excluded
    (_g: GhostSnapshot) => true,
  ];
  let pool: GhostSnapshot[] = [];
  for (const f of filters) {
    pool = all.filter((g) => !isExcluded(g) && f(g));
    if (pool.length > 0) break;
  }
  if (pool.length === 0) return null;

  // Heuristic strength: count items + sum rarity index
  const order = ["Wooden", "Bronze", "Silver", "Gold", "Diamond"];
  function strength(g: GhostSnapshot): number {
    return g.inventory.reduce((sum, it) => sum + order.indexOf(it.rarity), 0) + g.inventory.length;
  }
  pool = pool.sort((a, b) => strength(a) - strength(b));

  if (opts.streak === "Win") {
    return pool[Math.min(pool.length - 1, Math.floor(pool.length * 0.75) + Math.floor(rng() * 3))] ?? pool[pool.length - 1];
  } else if (opts.streak === "Loss") {
    return pool[Math.floor(rng() * Math.min(pool.length, Math.max(1, Math.floor(pool.length * 0.4))))];
  }
  return pool[Math.floor(rng() * pool.length)];
}

// ─── Reconstruct combatant from a ghost ─────────────────────────────────────
export function ghostToCombatant(g: GhostSnapshot): Combatant {
  const inv: ItemInstance[] = g.inventory.map((it) => ({
    uid: uid("gh_i"),
    defId: it.def_id,
    rarity: it.rarity,
    slotIndex: it.slot,
    linkOverride: it.links,
  }));
  const hero = heroById(g.hero_id);
  return {
    id: g.ghost_id,
    displayName: `${hero.name} Ghost (Day ${g.day})`,
    natureType: hero.natureType,
    level: g.hero_level,
    maxHp: g.max_hp,
    currentHp: g.max_hp,
    inventory: inv,
  };
}

// ─── Seeding mock ghosts so Day 1 always has opponents ──────────────────────
export function seedMockGhostsIfEmpty(rng: Rng, count = 30): void {
  const all = loadAll();
  if (all.length >= count) return;
  const seeded: GhostSnapshot[] = [];
  for (let i = 0; i < count; i++) {
    const day = randInt(rng, 1, 16);
    const hero = pick(rng, HEROES);
    const level = Math.max(1, Math.min(11, Math.ceil(day / 2) + (Math.random() < 0.5 ? 0 : 1)));
    const slots = Math.min(8, Math.max(3, Math.ceil(day / 2) + 2));
    const archInv = pickArchetypeLoadout(rng, hero.natureType, day, slots);
    seeded.push({
      ghost_id: uid("gh_seed"),
      player_id: `seed_${i}`,
      day,
      hero_id: hero.id,
      hero_level: level,
      max_hp: 100 + level * 25,
      current_hp: 100 + level * 25,
      inventory: archInv,
      meta: { win_count: 0, loss_count: 0, captured_at: new Date().toISOString() },
    });
  }
  saveAll([...all, ...seeded]);
}

function pickArchetypeLoadout(
  rng: Rng,
  natureType: Hero["natureType"],
  day: number,
  slots: number
): GhostSnapshot["inventory"] {
  // simple: pick items of the matching nature, one per slot
  const candidates = ["banana", "berry_bush", "thorny_vine", "ancient_root",
    "monkey_paw", "tiger_claw", "wolf_spirit", "bear_pelt",
    "coral_shield", "electric_eel", "vampire_squid", "abyssal_pearl",
    "whetstone", "hourglass"];
  const inv: GhostSnapshot["inventory"] = [];
  let cursor = 0;
  for (let i = 0; i < slots; i++) {
    const defId = pick(rng, candidates);
    const def = itemById(defId);
    if (cursor + def.size > 8) break;
    const rarities = ["Wooden", "Bronze", "Silver", "Gold"] as const;
    const rarity = pick(rng, rarities.slice(0, Math.min(rarities.length, Math.max(1, Math.ceil(day / 4)))));
    const links: LinkDirection = (def.link?.direction ?? "None") as LinkDirection;
    inv.push({ slot: cursor, def_id: defId, rarity, links });
    cursor += def.size;
  }
  return inv;
}

// ─── Convenience for tests ──────────────────────────────────────────────────
export function _resetGhostsForTesting() {
  saveAll([]);
}
export function _allGhosts(): GhostSnapshot[] {
  return loadAll();
}
