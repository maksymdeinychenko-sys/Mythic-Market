/**
 * Inventory: grid placement, merging, link resolution, and helpers.
 * The 8-slot battle grid is a flat array of size 8; each cell holds
 * either an ItemInstance or null. Multi-slot items occupy multiple cells
 * but reference the same uid (handled at render-time, not here).
 */
import type {
  ItemDef, ItemInstance, Rarity, RunState, LinkDirection,
} from "@/core/types";
import { RARITY_INDEX, RARITY_ORDER } from "@/core/types";
import {
  ITEMS, SHOP_POOL_ITEMS, itemById,
} from "@/data/items";
import {
  SHOP_RARITY_WEIGHTS,
} from "@/data/scaling";
import { pickWeighted, pick, uid, randInt, type Rng } from "@/utils/rng";

export const BATTLE_SLOTS = 8;
export const STASH_CAP = 20;

export function isStashFull(rs: { stash: ItemInstance[] }): boolean {
  return rs.stash.length >= STASH_CAP;
}

// ─── Construction ───────────────────────────────────────────────────────────
export function makeInstance(defId: string, rarity: Rarity, slotIndex = -1): ItemInstance {
  const def = itemById(defId);
  // Clamp rarity within def's allowed range
  const minIdx = RARITY_INDEX[def.minRarity];
  const maxIdx = RARITY_INDEX[def.maxRarity];
  const rIdx = Math.max(minIdx, Math.min(maxIdx, RARITY_INDEX[rarity]));
  return {
    uid: uid(def.id),
    defId,
    rarity: RARITY_ORDER[rIdx],
    slotIndex,
  };
}

// ─── Rarity rolling for shop / events ───────────────────────────────────────
export function rollRarityForDay(rng: Rng, day: number): Rarity {
  const band = SHOP_RARITY_WEIGHTS.find((b) => day >= b.dayMin && day <= b.dayMax)!;
  const rarities = RARITY_ORDER as Rarity[];
  const weights = rarities.map((r) => band.weights[r]);
  return pickWeighted(rng, rarities, weights);
}

/** Returns a random shop-eligible item def, with +20% type weighting toward heroNature if given. */
export function randomShopItem(rng: Rng, _day: number, heroNature?: string): ItemDef {
  const pool = SHOP_POOL_ITEMS;
  const weights = pool.map((d) => (heroNature && d.natureType === heroNature ? 1.2 : 1.0));
  return pickWeighted(rng, pool, weights);
}

// ─── Slot/placement validation ──────────────────────────────────────────────
export function canPlaceInGrid(
  grid: (ItemInstance | null)[],
  size: 1 | 2 | 3,
  startIdx: number
): boolean {
  if (startIdx < 0 || startIdx + size > grid.length) return false;
  for (let i = 0; i < size; i++) {
    if (grid[startIdx + i]) return false;
  }
  return true;
}

/** Render a battle inventory (sparse list) into a flat 8-cell array. */
export function buildGrid(inv: ItemInstance[], size = BATTLE_SLOTS): (ItemInstance | null)[] {
  const grid: (ItemInstance | null)[] = Array(size).fill(null);
  for (const inst of inv) {
    const def = itemById(inst.defId);
    if (inst.slotIndex < 0 || inst.slotIndex + def.size > size) continue;
    for (let i = 0; i < def.size; i++) {
      grid[inst.slotIndex + i] = inst;
    }
  }
  return grid;
}

// ─── Merging ────────────────────────────────────────────────────────────────
/**
 * Two identical-defId, identical-rarity items merge into the next rarity.
 * Diamond doesn't merge further.
 */
export function tryMerge(
  a: ItemInstance,
  b: ItemInstance
): ItemInstance | null {
  // Can't merge an item with itself — that was an exploit where dragging
  // an item onto its own slot would upgrade it for free.
  if (a.uid === b.uid) return null;
  if (a.defId !== b.defId) return null;
  if (a.rarity !== b.rarity) return null;
  if (a.rarity === "Diamond") return null;
  const def = itemById(a.defId);
  const nextIdx = RARITY_INDEX[a.rarity] + 1;
  const nextRarity = RARITY_ORDER[nextIdx];
  if (RARITY_INDEX[nextRarity] > RARITY_INDEX[def.maxRarity]) return null;
  return {
    uid: uid(a.defId),
    defId: a.defId,
    rarity: nextRarity,
    slotIndex: a.slotIndex >= 0 ? a.slotIndex : b.slotIndex,
    linkOverride: a.linkOverride ?? b.linkOverride,
  };
}

// ─── Mutations on RunState (immutably) ──────────────────────────────────────
export function moveStashToBattle(
  rs: RunState,
  uid: string,
  slotIdx: number
): RunState {
  const inst = rs.stash.find((x) => x.uid === uid);
  if (!inst) return rs;
  const def = itemById(inst.defId);
  const grid = buildGrid(rs.battleInventory);
  if (!canPlaceInGrid(grid, def.size, slotIdx)) return rs;
  const placed = { ...inst, slotIndex: slotIdx };
  return {
    ...rs,
    stash: rs.stash.filter((x) => x.uid !== uid),
    battleInventory: [...rs.battleInventory, placed],
  };
}

export function moveBattleToStash(rs: RunState, uid: string): RunState {
  const inst = rs.battleInventory.find((x) => x.uid === uid);
  if (!inst) return rs;
  return {
    ...rs,
    battleInventory: rs.battleInventory.filter((x) => x.uid !== uid),
    stash: [...rs.stash, { ...inst, slotIndex: -1 }],
  };
}

export function attemptMergeInBattle(
  rs: RunState,
  draggedUid: string,
  targetUid: string
): RunState {
  const drag = rs.battleInventory.find((x) => x.uid === draggedUid);
  const target = rs.battleInventory.find((x) => x.uid === targetUid);
  if (!drag || !target) return rs;
  const merged = tryMerge(drag, target);
  if (!merged) return rs;
  return {
    ...rs,
    battleInventory: [
      ...rs.battleInventory.filter((x) => x.uid !== drag.uid && x.uid !== target.uid),
      { ...merged, slotIndex: target.slotIndex },
    ],
  };
}

export function attemptMergeStashToBattle(
  rs: RunState,
  stashUid: string,
  battleUid: string
): RunState {
  const drag = rs.stash.find((x) => x.uid === stashUid);
  const target = rs.battleInventory.find((x) => x.uid === battleUid);
  if (!drag || !target) return rs;
  const merged = tryMerge(drag, target);
  if (!merged) return rs;
  return {
    ...rs,
    stash: rs.stash.filter((x) => x.uid !== drag.uid),
    battleInventory: [
      ...rs.battleInventory.filter((x) => x.uid !== target.uid),
      { ...merged, slotIndex: target.slotIndex },
    ],
  };
}

// ─── Link resolution: figure out adjacency given grid layout ────────────────
export function effectiveLinkDir(inst: ItemInstance): LinkDirection {
  const def = itemById(inst.defId);
  return inst.linkOverride ?? def.link?.direction ?? "None";
}

/**
 * Returns the list of [from, to] adjacency pairs that are currently active.
 * Used by combat resolution and the UI's glowing line.
 */
export function activeLinks(
  inv: ItemInstance[]
): Array<{ from: ItemInstance; to: ItemInstance; direction: LinkDirection }> {
  const grid = buildGrid(inv);
  const pairs: Array<{ from: ItemInstance; to: ItemInstance; direction: LinkDirection }> = [];

  // Find each item's leftmost cell so we don't double-count multi-slot items.
  const leftEdges = new Map<string, number>();
  for (let i = 0; i < grid.length; i++) {
    const it = grid[i];
    if (!it) continue;
    if (!leftEdges.has(it.uid)) leftEdges.set(it.uid, i);
  }

  for (const inst of inv) {
    const def = itemById(inst.defId);
    const dir = effectiveLinkDir(inst);
    if (dir === "None" || !def.link) continue;
    const left = leftEdges.get(inst.uid)!;
    const right = left + def.size - 1;

    if (dir === "Left" || dir === "Both") {
      const target = grid[left - 1];
      if (target && target.uid !== inst.uid)
        pairs.push({ from: inst, to: target, direction: "Left" });
    }
    if (dir === "Right" || dir === "Both") {
      const target = grid[right + 1];
      if (target && target.uid !== inst.uid)
        pairs.push({ from: inst, to: target, direction: "Right" });
    }
    if (dir === "Global") {
      // Resolved at combat time per-item-of-target-type.
    }
  }
  return pairs;
}

// ─── Free slot finder for shop autoplace ────────────────────────────────────
export function findFreeSlot(inv: ItemInstance[], size: 1 | 2 | 3): number {
  const grid = buildGrid(inv);
  for (let i = 0; i + size <= grid.length; i++) {
    if (canPlaceInGrid(grid, size, i)) return i;
  }
  return -1;
}

/** Auto-place into battle if there's room, otherwise stash. Returns null if both are full. */
export function acquireItem(
  rs: RunState,
  defId: string,
  rarity: Rarity
): RunState {
  const inst = makeInstance(defId, rarity);
  const def = itemById(defId);
  const slot = findFreeSlot(rs.battleInventory, def.size);
  if (slot >= 0) {
    return {
      ...rs,
      battleInventory: [...rs.battleInventory, { ...inst, slotIndex: slot }],
    };
  }
  if (isStashFull(rs)) {
    // Stash is full — can't acquire. Caller should have checked isStashFull first.
    // For prototype safety we silently drop the item; UI surfaces this elsewhere.
    return rs;
  }
  return { ...rs, stash: [...rs.stash, inst] };
}

// ─── Random known-defId pickers (for events/NPC builder) ────────────────────
export function randomItemForArchetype(rng: Rng, archetypeCommon: string[]): ItemDef {
  const id = pick(rng, archetypeCommon);
  return itemById(id);
}

export { ITEMS };
