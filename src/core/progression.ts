/**
 * Hero progression: XP, level-ups, slot unlocks, combat-HP curve.
 *
 * Note: run-level "Lives" do NOT level up. They're a fixed pool. Levels only
 * affect combat HP and unlocked battle slots.
 */
import type { RunState } from "@/core/types";
import { XP_TO_NEXT, COMBAT_HP_BY_LEVEL, SLOTS_BY_LEVEL } from "@/data/scaling";

/** The player's COMBAT HP at this level — drains during a fight, resets between fights. */
export function combatHpForLevel(level: number): number {
  return COMBAT_HP_BY_LEVEL[Math.min(level - 1, COMBAT_HP_BY_LEVEL.length - 1)];
}
/** Legacy alias. */
export const maxHpForLevel = combatHpForLevel;

/** Combat HP after applying perk bonuses (each `more_combat_hp` perk = +50). */
export function combatHpForRun(rs: RunState): number {
  const base = combatHpForLevel(rs.level);
  const perkBonus = rs.perks.filter((p) => p === "more_combat_hp").length * 50;
  return base + perkBonus;
}

export function slotsForLevel(level: number): number {
  return SLOTS_BY_LEVEL[Math.min(level - 1, SLOTS_BY_LEVEL.length - 1)];
}

/** Slot count after perks. Each `extra_slot` perk grants +1, capped at 8. */
export function slotsForRun(rs: RunState): number {
  const base = slotsForLevel(rs.level);
  const extra = rs.perks.filter((p) => p === "extra_slot").length;
  return Math.min(8, base + extra);
}

export function xpToNext(level: number): number {
  return XP_TO_NEXT[Math.min(level - 1, XP_TO_NEXT.length - 1)];
}

/**
 * Gives XP and runs as many level-ups as the buffer allows.
 * Each level-up adds 1 to `pendingPerkChoices` so the UI can prompt the
 * player to pick a perk.
 */
export function gainXp(rs: RunState, amount: number): RunState {
  let xp = rs.xp + amount;
  let level = rs.level;
  let pendingPerkChoices = rs.pendingPerkChoices;
  while (xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level += 1;
    pendingPerkChoices += 1;
  }
  return { ...rs, xp, level, pendingPerkChoices };
}
