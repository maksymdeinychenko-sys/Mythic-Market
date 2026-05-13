/**
 * Phase A / Phase B event library.
 * Each event takes a runState delta callback so resolution stays pure.
 */
import type { RunState, ItemInstance, Rarity } from "@/core/types";
import { rollRarityForDay, randomShopItem, makeInstance } from "@/core/inventory";
import type { Rng } from "@/utils/rng";

export type EventChoice = {
  id: string;
  label: string;
  /** Apply choice; returns updated RunState. */
  apply: (rs: RunState, rng: Rng) => RunState;
};

export type EventDef = {
  id: string;
  type: "Find" | "Trader" | "Blessing" | "Curse";
  title: string;
  description: string;
  choices: EventChoice[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addToStash(rs: RunState, item: ItemInstance): RunState {
  return { ...rs, stash: [...rs.stash, item] };
}
function addGold(rs: RunState, amount: number): RunState {
  return { ...rs, gold: rs.gold + amount };
}
function loseGold(rs: RunState, amount: number): RunState {
  return { ...rs, gold: Math.max(0, rs.gold - amount) };
}
function gainLife(rs: RunState, amount: number): RunState {
  return {
    ...rs,
    lives: Math.min(rs.maxLives, rs.lives + amount),
  };
}
function loseLifeForEvent(rs: RunState, amount: number): RunState {
  return { ...rs, lives: Math.max(0, rs.lives - amount) };
}
function gainMaxLife(rs: RunState, amount: number): RunState {
  return {
    ...rs,
    maxLives: rs.maxLives + amount,
    lives: rs.lives + amount, // also grant the life immediately
  };
}

// ─── Event library ──────────────────────────────────────────────────────────
export const EVENTS: EventDef[] = [
  {
    id: "wandering_trader",
    type: "Trader",
    title: "Wandering Trader",
    description: "A weathered trader offers you a single item from their cart for 4 gold.",
    choices: [
      {
        id: "buy",
        label: "Buy a random Wooden item (4g)",
        apply: (rs, rng) => {
          if (rs.gold < 4) return rs;
          const def = randomShopItem(rng, rs.day);
          const inst = makeInstance(def.id, def.minRarity);
          return addToStash(loseGold(rs, 4), inst);
        },
      },
      { id: "skip", label: "Decline", apply: (rs) => rs },
    ],
  },
  {
    id: "lucky_cache",
    type: "Find",
    title: "Lucky Cache",
    description: "You stumble on a half-buried satchel.",
    choices: [
      {
        id: "open",
        label: "Open it",
        apply: (rs, rng) => {
          const gold = 3 + Math.floor(rng() * 10);
          return addGold(rs, gold);
        },
      },
    ],
  },
  {
    id: "natures_blessing",
    type: "Blessing",
    title: "Nature's Blessing",
    description: "A shimmering grove offers a gift. (Restore +1 life if you've lost any.)",
    choices: [
      {
        id: "rest",
        label: "Rest (+1 Life)",
        apply: (rs) => gainLife(rs, 1),
      },
    ],
  },
  {
    id: "mystic_grove",
    type: "Find",
    title: "Mystic Grove",
    description: "Three ripe items dangle from a vine. Pick one.",
    choices: [
      {
        id: "plant",
        label: "Take a Plant item",
        apply: (rs, rng) => {
          const r = rollRarityForDay(rng, rs.day);
          // pick first plant we find in catalog – actual selection in core/inventory
          const inst = makeInstance("berry_bush", r);
          return addToStash(rs, inst);
        },
      },
      {
        id: "beast",
        label: "Take a Beast item",
        apply: (rs, rng) => {
          const r = rollRarityForDay(rng, rs.day);
          const inst = makeInstance("monkey_paw", r);
          return addToStash(rs, inst);
        },
      },
      {
        id: "fish",
        label: "Take a Fish item",
        apply: (rs, rng) => {
          const r = rollRarityForDay(rng, rs.day);
          const inst = makeInstance("coral_shield", r);
          return addToStash(rs, inst);
        },
      },
    ],
  },
  {
    id: "shrine_of_speed",
    type: "Blessing",
    title: "Shrine of Vitality",
    description: "Offer 12 gold for a permanent +1 Max Life. (Rare permanent upgrade.)",
    choices: [
      {
        id: "offer",
        label: "Offer 12g (+1 Max Life)",
        apply: (rs) => {
          if (rs.gold < 12) return rs;
          return gainMaxLife(loseGold(rs, 12), 1);
        },
      },
      { id: "skip", label: "Skip", apply: (rs) => rs },
    ],
  },
  {
    id: "cursed_chest",
    type: "Curse",
    title: "Cursed Chest",
    description: "An iron-bound chest pulses with dark light. It offers riches — at a cost.",
    choices: [
      {
        id: "open",
        label: "Open (lose 1 Life, gain 20g)",
        apply: (rs) => addGold(loseLifeForEvent(rs, 1), 20),
      },
      { id: "skip", label: "Leave it", apply: (rs) => rs },
    ],
  },
  {
    id: "fish_market",
    type: "Trader",
    title: "Fish Market",
    description: "A briny stall offers 2 random Bronze items for 15 gold.",
    choices: [
      {
        id: "deal",
        label: "Bulk Deal (15g)",
        apply: (rs, rng) => {
          if (rs.gold < 15) return rs;
          const a = randomShopItem(rng, rs.day);
          const b = randomShopItem(rng, rs.day);
          const i1 = makeInstance(a.id, "Bronze" as Rarity);
          const i2 = makeInstance(b.id, "Bronze" as Rarity);
          return addToStash(addToStash(loseGold(rs, 15), i1), i2);
        },
      },
      { id: "skip", label: "Walk away", apply: (rs) => rs },
    ],
  },
  {
    id: "small_cache",
    type: "Find",
    title: "Small Cache",
    description: "A pouch of coins, a few trinkets.",
    choices: [
      {
        id: "take",
        label: "Take it",
        apply: (rs, rng) => addGold(rs, 5 + Math.floor(rng() * 7)),
      },
    ],
  },
];

export function eventById(id: string): EventDef {
  const e = EVENTS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown event: ${id}`);
  return e;
}

export function randomEvent(rng: Rng, type?: EventDef["type"]): EventDef {
  const pool = type ? EVENTS.filter((e) => e.type === type) : EVENTS;
  return pool[Math.floor(rng() * pool.length)];
}
