/**
 * 16-day phase machine: orchestrates phase transitions, applies daily passive
 * income, advances day, and handles end-of-run pass rewards.
 */
import type { Phase, RunState } from "@/core/types";
import { dailyGoldAllowance, STARTING_LIVES } from "@/data/scaling";
import { acquireItem } from "@/core/inventory";

export const PHASE_DESCRIPTIONS: Record<Phase, { title: string; subtitle: string }> = {
  1: { title: "Phase 1 — Find", subtitle: "A random discovery starts your day." },
  2: { title: "Phase 2 — Find or Trader", subtitle: "Choose: explore further, or visit a trader." },
  3: { title: "Phase 3 — PvE Battle", subtitle: "Pick a difficulty and fight." },
  4: { title: "Phase 4 — Prep", subtitle: "Trade or scavenge before the next fight." },
  5: { title: "Phase 5 — Final Prep", subtitle: "Last chance to optimize." },
  6: { title: "Phase 6 — Ghost PvP", subtitle: "Fight the recorded build of another player." },
};

export function newRun(heroId: string): RunState {
  return {
    heroId,
    level: 1,
    xp: 0,
    gold: 5,
    lives: STARTING_LIVES,
    maxLives: STARTING_LIVES,
    day: 1,
    phase: 1,
    battleInventory: [],
    stash: [],
    pvpWinStreak: 0,
    pvpLossStreak: 0,
    shopLockedUids: [],
    resolvedPhases: [],
    phaseChoices: {},
    perks: [],
    pendingPerkChoices: 0,
  };
}

/** Phase 1 always grants a starter Bronze item (per the doc: "begin Day 1 at Level 1 with one Bronze item"). */
export function applyStartingLoadout(rs: RunState): RunState {
  // Start every hero with one Bronze coral_shield-ish utility — Coral Shield
  // is universally useful and matches the doc's tone of "one Bronze item."
  return acquireItem(rs, "coral_shield", "Bronze");
}

export function advancePhase(rs: RunState): RunState {
  if (rs.phase === 6) {
    // End of day → next day; reset phase choices for the new day
    const merchantBonus = rs.perks.filter((p) => p === "gold_per_day").length * 2;
    return {
      ...rs,
      day: rs.day + 1,
      phase: 1,
      gold: rs.gold + dailyGoldAllowance(rs.day + 1) + merchantBonus,
      resolvedPhases: [],
      phaseChoices: {},
    };
  }
  return { ...rs, phase: (rs.phase + 1) as Phase, resolvedPhases: [...rs.resolvedPhases, rs.phase] };
}

export function setPhaseChoice(rs: RunState, phase: 2 | 4 | 5, branch: "Find" | "Trader" | "PvE"): RunState {
  return { ...rs, phaseChoices: { ...rs.phaseChoices, [phase]: branch } };
}

export function isDayComplete(rs: RunState): boolean {
  return rs.resolvedPhases.length === 6;
}

export function isRunOver(rs: RunState): boolean {
  return rs.lives <= 0 || rs.day > 16;
}

/** Apply a flat life cost (e.g. -1 for a normal loss, -2 for SuperHard). */
export function loseLives(rs: RunState, n: number): RunState {
  return { ...rs, lives: Math.max(0, rs.lives - n) };
}

/** Free-mode pass rewards per the design doc's milestone table. */
export function passRewardForDays(daysSurvived: number): number {
  if (daysSurvived >= 16) return 4;
  if (daysSurvived >= 13) return 3;
  if (daysSurvived >= 10) return 2;
  if (daysSurvived >= 8) return 1;
  return 0;
}
