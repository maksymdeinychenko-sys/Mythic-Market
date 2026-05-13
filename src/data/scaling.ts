/**
 * Scaling tables — translates the "Scaling Logic Overview" doc into runtime data.
 * Source of truth for all numeric scaling.
 */
import type { Rarity, Keyword } from "@/core/types";

/** V_n = V_b * 1.5^(n-1) — but we hard-code the doc's exact values for clarity. */
export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  Wooden: 1.0,
  Bronze: 1.5,
  Silver: 2.2,
  Gold: 3.5,
  Diamond: 5.5,
};

/** Primary numerical effects per rarity, straight from the doc. */
export const EFFECT_TABLE: Record<
  Extract<Keyword, "Damage" | "Shield" | "Healing" | "Overhealing">,
  Record<Rarity, number>
> = {
  Damage:      { Wooden: 10, Bronze: 15, Silver: 22, Gold: 35, Diamond: 60 },
  Shield:      { Wooden: 12, Bronze: 18, Silver: 26, Gold: 42, Diamond: 70 },
  Healing:     { Wooden:  8, Bronze: 12, Silver: 18, Gold: 30, Diamond: 50 },
  Overhealing: { Wooden: 12, Bronze: 18, Silver: 28, Gold: 45, Diamond: 80 },
};

/** Status & utility effects (durations / percentages). */
export const VAMPIRISM_PCT: Record<Rarity, number> = {
  Wooden: 15, Bronze: 25, Silver: 35, Gold: 50, Diamond: 75,
};
export const SLOWING_SEC: Record<Rarity, number> = {
  Wooden: 0.2, Bronze: 0.4, Silver: 0.7, Gold: 1.1, Diamond: 1.8,
};
export const FASTING_SEC: Record<Rarity, number> = {
  Wooden: 1.5, Bronze: 2.5, Silver: 3.5, Gold: 5.0, Diamond: 8.0,
};
export const RECHARGE_SEC: Record<Rarity, number> = {
  Wooden: 0.25, Bronze: 0.5, Silver: 0.8, Gold: 1.2, Diamond: 2.0,
};

// New status effects scaled by rarity.
/** Damage per burn-tick (every 1s) per stack of Burn. */
export const BURN_TICK_DPS: Record<Rarity, number> = {
  Wooden: 2, Bronze: 3, Silver: 5, Gold: 8, Diamond: 13,
};
/** Damage per poison-tick (every 2s) per stack of Poison. */
export const POISON_TICK_DPS: Record<Rarity, number> = {
  Wooden: 3, Bronze: 5, Silver: 8, Gold: 12, Diamond: 20,
};
/** HP regen per second per stack of Regen. */
export const REGEN_PER_SEC: Record<Rarity, number> = {
  Wooden: 1, Bronze: 2, Silver: 3, Gold: 5, Diamond: 8,
};

/** Burn stacks decay rate (per second) — 1 stack drops every BURN_DECAY seconds. */
export const BURN_DECAY_SEC = 4;
/** Poison stacks are stickier than burn. */
export const POISON_DECAY_SEC = 6;

// --- Diamond Ascension modifiers ---
export const ASCENSION = {
  /** Damage items pierce 20% of enemy shield. */
  Slayer: { shieldPiercePct: 20 },
  /** Shield items reduce all incoming damage by 10%. */
  Bastion: { damageReductionPct: 10 },
  /** Healing triggers cleanse one slowing debuff. */
  Vitality: { cleansesSlowing: true },
  /** Vampirism kills give +2 permanent max HP. */
  SoulEater: { permaMaxHpOnKill: 2 },
  /** Recharge items have 15% chance to immediately re-trigger. */
  Flow: { echoChancePct: 15 },
};

// --- Hero progression: XP table ---
/** Index = level - 1; value = XP needed to reach next level from this one. */
export const XP_TO_NEXT: number[] = [
  20,   // L1 -> L2
  30,
  45,
  65,
  90,
  120,
  160,
  210,
  270,
  100,  // L10 -> L11 (the doc says +100 per level after L9)
  100, 100, 100, 100, 100, 100,
];

/**
 * Combat HP for the player's combatant by level. This is the per-fight pool
 * that drains during a single battle and resets between fights. NOT the
 * run-level "lives" pool.
 */
export const COMBAT_HP_BY_LEVEL: number[] = [
  100, 120, 140, 160, 180,           // +20 per level up to 5
  215, 250, 285, 320, 355, 390, 425, // +35 per level
];
/** Legacy alias kept so any straggling import still resolves. */
export const HP_BY_LEVEL = COMBAT_HP_BY_LEVEL;

/** Run-level Lives — fixed across all heroes. Lose 1 per fight loss; 0 = run over. */
export const STARTING_LIVES = 10;

export const SLOTS_BY_LEVEL: number[] = [
  3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8,
];

// --- Shop pool weighting per day ---
export const SHOP_RARITY_WEIGHTS: Array<{
  dayMin: number; dayMax: number; weights: Record<Rarity, number>;
}> = [
  { dayMin: 1,  dayMax: 4,  weights: { Wooden: 85, Bronze: 15, Silver: 0,  Gold: 0,  Diamond: 0 } },
  { dayMin: 5,  dayMax: 8,  weights: { Wooden: 50, Bronze: 40, Silver: 10, Gold: 0,  Diamond: 0 } },
  { dayMin: 9,  dayMax: 12, weights: { Wooden: 20, Bronze: 45, Silver: 30, Gold: 5,  Diamond: 0 } },
  { dayMin: 13, dayMax: 16, weights: { Wooden: 5,  Bronze: 30, Silver: 50, Gold: 15, Diamond: 0 } },
];

// --- Pricing by rarity ---
export const ITEM_BUY_PRICE: Record<Rarity, [number, number]> = {
  Wooden:  [3, 5],
  Bronze:  [8, 12],
  Silver:  [18, 25],
  Gold:    [40, 55],
  Diamond: [9999, 9999], // not for sale
};

export const ITEM_SELL_PRICE: Record<Rarity, number> = {
  Wooden: 2, Bronze: 5, Silver: 10, Gold: 20, Diamond: 40,
};

// --- Daily passive gold ---
export function dailyGoldAllowance(day: number): number {
  // Starts at 5, +1 per 2 days
  return 5 + Math.floor((day - 1) / 2);
}

// --- PvE rewards (rebalanced — halved from doc's original numbers so the
//     player reaches ~Lv 9-10 by Day 16 instead of Lv 11+ by Day 6) ---
export const PVE_REWARD = {
  Easy:      { xp: 5,  gold: 5,  rarityRange: ["Wooden", "Bronze"] as [Rarity, Rarity] },
  Hard:      { xp: 10, gold: 10, rarityRange: ["Bronze", "Silver"] as [Rarity, Rarity] },
  SuperHard: { xp: 18, gold: 18, rarityRange: ["Silver", "Gold"]   as [Rarity, Rarity] },
};

// --- NPC HP scaling ---
export const NPC_BASE_HP = 80;
export const NPC_HP_SCALING_FACTOR = 25;
export const NPC_DIFFICULTY_MULT = {
  Easy: 0.8,
  Hard: 1.1,
  SuperHard: 1.5,
};
export function npcHpFor(day: number, diff: keyof typeof NPC_DIFFICULTY_MULT): number {
  return Math.round(
    (NPC_BASE_HP + day * NPC_HP_SCALING_FACTOR) * NPC_DIFFICULTY_MULT[diff]
  );
}

// --- Hero passive: +5% recharge per level ---
export const HERO_RECHARGE_PCT_PER_LEVEL = 5;
