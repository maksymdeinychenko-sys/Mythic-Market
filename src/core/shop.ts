/**
 * Shop generation. 4 items + 1 utility, rarity-weighted by day.
 * Reroll costs 1 gold. Lock toggles per-item, persists across rerolls and into next day.
 */
import type { ItemInstance, RunState } from "@/core/types";
import { rollRarityForDay, makeInstance } from "@/core/inventory";
import { ITEMS, SHOP_POOL_ITEMS, itemById } from "@/data/items";
import { ITEM_BUY_PRICE, ITEM_SELL_PRICE } from "@/data/scaling";
import { pick, pickWeighted, randInt, type Rng } from "@/utils/rng";

export interface ShopOffer {
  inst: ItemInstance;
  price: number;
  locked: boolean;
}

export interface ShopState {
  offers: ShopOffer[];
}

export const REROLL_COST = 1;
export const SHOP_SIZE = 5; // 4 items + 1 utility

/** Item is "utility" if Universal nature. */
const UTILITY_POOL = SHOP_POOL_ITEMS.filter((d) => d.natureType === "Universal");
const NATURE_POOL = SHOP_POOL_ITEMS.filter((d) => d.natureType !== "Universal");

export function priceFor(rarity: ItemInstance["rarity"]): number {
  const [lo, hi] = ITEM_BUY_PRICE[rarity];
  return Math.round((lo + hi) / 2);
}

export function sellPrice(rarity: ItemInstance["rarity"]): number {
  return ITEM_SELL_PRICE[rarity];
}

export function generateShop(
  rng: Rng,
  day: number,
  heroNature: string,
  carryOverLocks: ShopOffer[] = []
): ShopState {
  const offers: ShopOffer[] = [];
  // First, keep all locked offers
  for (const lk of carryOverLocks) offers.push({ ...lk, locked: true });

  // Then fill the rest
  while (offers.length < SHOP_SIZE) {
    const fillUtility = offers.length === SHOP_SIZE - 1; // last slot reserved for utility
    const pool = fillUtility ? UTILITY_POOL : NATURE_POOL;
    const weights = pool.map((d) => (d.natureType === heroNature ? 1.2 : 1.0));
    const def = pickWeighted(rng, pool, weights);
    let rarity = rollRarityForDay(rng, day);
    // Clamp to def's allowed range
    const allowed: ItemInstance["rarity"][] = [];
    let push = false;
    for (const r of ["Wooden", "Bronze", "Silver", "Gold", "Diamond"] as ItemInstance["rarity"][]) {
      if (r === def.minRarity) push = true;
      if (push) allowed.push(r);
      if (r === def.maxRarity) break;
    }
    if (!allowed.includes(rarity)) rarity = def.minRarity;

    const inst = makeInstance(def.id, rarity);
    offers.push({ inst, price: priceFor(rarity), locked: false });
  }

  return { offers };
}

export function reroll(
  rng: Rng,
  rs: RunState,
  shop: ShopState,
  heroNature: string
): { rs: RunState; shop: ShopState } | null {
  if (rs.gold < REROLL_COST) return null;
  const locks = shop.offers.filter((o) => o.locked);
  return {
    rs: { ...rs, gold: rs.gold - REROLL_COST },
    shop: generateShop(rng, rs.day, heroNature, locks),
  };
}

export function toggleLock(shop: ShopState, idx: number): ShopState {
  const offers = shop.offers.map((o, i) => (i === idx ? { ...o, locked: !o.locked } : o));
  return { offers };
}

export function buy(rs: RunState, shop: ShopState, idx: number): { rs: RunState; shop: ShopState } | null {
  const offer = shop.offers[idx];
  if (!offer) return null;
  if (rs.gold < offer.price) return null;
  const newRs: RunState = {
    ...rs,
    gold: rs.gold - offer.price,
    stash: [...rs.stash, offer.inst],
  };
  const newOffers = shop.offers.filter((_, i) => i !== idx);
  return { rs: newRs, shop: { offers: newOffers } };
}

export function sellFromStash(rs: RunState, uid: string): RunState {
  const item = rs.stash.find((x) => x.uid === uid);
  if (!item) return rs;
  return {
    ...rs,
    stash: rs.stash.filter((x) => x.uid !== uid),
    gold: rs.gold + sellPrice(item.rarity),
  };
}

export function sellFromBattle(rs: RunState, uid: string): RunState {
  const item = rs.battleInventory.find((x) => x.uid === uid);
  if (!item) return rs;
  return {
    ...rs,
    battleInventory: rs.battleInventory.filter((x) => x.uid !== uid),
    gold: rs.gold + sellPrice(item.rarity),
  };
}
