import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  RunState, ScreenId, Encounter, Phase, GhostSnapshot,
} from "@/core/types";
import { newRun, applyStartingLoadout, advancePhase, isRunOver, passRewardForDays, loseLives } from "@/core/runState";
import { combatHpForRun } from "@/core/progression";
import type { PerkId } from "@/core/types";
import { generateShop, type ShopState, buy, reroll, toggleLock, sellFromStash, sellFromBattle } from "@/core/shop";
import {
  moveStashToBattle, moveBattleToStash,
  attemptMergeInBattle, attemptMergeStashToBattle,
  attemptMergeStashToStash, attemptMergeBattleToStash,
  acquireItem,
} from "@/core/inventory";
import { gainXp } from "@/core/progression";
import { buildEncounter } from "@/core/encounter";
import { simulateCombat, type CombatResult } from "@/core/combat";
import { heroById } from "@/data/heroes";
import { captureGhost, persistGhost, matchmakeGhost, ghostToCombatant, seedMockGhostsIfEmpty } from "@/core/ghost";
import { createRng, type Rng } from "@/utils/rng";
import { SFX, setMuted as setSfxMuted } from "@/core/audio";

// ─── Store shape ────────────────────────────────────────────────────────────
interface GameState {
  screen: ScreenId;
  run: RunState | null;
  rng: Rng;

  // Volatile per-screen state
  shop: ShopState | null;
  currentEncounter: Encounter | null;
  lastCombat: CombatResult | null;
  lastGhost: GhostSnapshot | null;
  passesEarned: number;

  // Free-mode: total passes the player owns
  totalPasses: number;

  // User settings
  audioMuted: boolean;

  // Actions
  startRun: (heroId: string) => void;
  goto: (screen: ScreenId) => void;
  toggleAudioMute: () => void;

  // Workshop actions
  placeStashInSlot: (uid: string, slot: number) => void;
  unplaceFromBattle: (uid: string) => void;
  mergeBattle: (dragUid: string, targetUid: string) => void;
  mergeStashToBattle: (stashUid: string, battleUid: string) => void;
  mergeStashToStash: (dragUid: string, targetUid: string) => void;
  mergeBattleToStash: (battleUid: string, stashUid: string) => void;
  sellStash: (uid: string) => void;
  sellBattle: (uid: string) => void;

  // Shop
  openShop: () => void;
  closeShop: () => void;
  rerollShop: () => void;
  toggleShopLock: (idx: number) => void;
  buyShopOffer: (idx: number) => void;

  // Encounter / Combat
  prepareEncounter: (difficulty: "Easy" | "Hard" | "SuperHard") => void;
  resolveEncounter: () => void;

  // Ghost / PvP
  prepareGhost: () => void;
  resolveGhost: () => void;

  // Phase advance
  advance: () => void;

  // Generic state injection (used by event handlers)
  applyRunStateUpdate: (updater: (rs: RunState) => RunState) => void;

  // Save management
  abandonRun: () => void;
  hasSavedRun: () => boolean;

  // Perks
  pickPerk: (id: PerkId) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
  screen: "MainMenu",
  run: null,
  rng: createRng(),
  shop: null,
  currentEncounter: null,
  lastCombat: null,
  lastGhost: null,
  passesEarned: 0,
  totalPasses: 0,
  audioMuted: false,

  startRun: (heroId) => {
    seedMockGhostsIfEmpty(get().rng, 30);
    let rs = newRun(heroId);
    rs = applyStartingLoadout(rs);
    set({
      run: rs,
      screen: "DayHub",
      shop: null,
      currentEncounter: null,
      lastCombat: null,
      lastGhost: null,
      passesEarned: 0,
    });
  },

  goto: (screen) => set({ screen }),

  toggleAudioMute: () => {
    const next = !get().audioMuted;
    setSfxMuted(next);
    set({ audioMuted: next });
  },

  placeStashInSlot: (uid, slot) => {
    const rs = get().run; if (!rs) return;
    set({ run: moveStashToBattle(rs, uid, slot) });
  },
  unplaceFromBattle: (uid) => {
    const rs = get().run; if (!rs) return;
    set({ run: moveBattleToStash(rs, uid) });
  },
  mergeBattle: (dragUid, targetUid) => {
    const rs = get().run; if (!rs) return;
    const before = rs.battleInventory.length;
    const next = attemptMergeInBattle(rs, dragUid, targetUid);
    set({ run: next });
    if (next.battleInventory.length !== before) SFX.merge();
  },
  mergeStashToBattle: (stashUid, battleUid) => {
    const rs = get().run; if (!rs) return;
    const before = rs.battleInventory.length + rs.stash.length;
    const next = attemptMergeStashToBattle(rs, stashUid, battleUid);
    set({ run: next });
    if (next.battleInventory.length + next.stash.length !== before) SFX.merge();
  },
  mergeStashToStash: (dragUid, targetUid) => {
    const rs = get().run; if (!rs) return;
    const before = rs.stash.length;
    const next = attemptMergeStashToStash(rs, dragUid, targetUid);
    set({ run: next });
    if (next.stash.length !== before) SFX.merge();
  },
  mergeBattleToStash: (battleUid, stashUid) => {
    const rs = get().run; if (!rs) return;
    const before = rs.battleInventory.length + rs.stash.length;
    const next = attemptMergeBattleToStash(rs, battleUid, stashUid);
    set({ run: next });
    if (next.battleInventory.length + next.stash.length !== before) SFX.merge();
  },
  sellStash: (uid) => {
    const rs = get().run; if (!rs) return;
    set({ run: sellFromStash(rs, uid) });
    SFX.sell();
  },
  sellBattle: (uid) => {
    const rs = get().run; if (!rs) return;
    set({ run: sellFromBattle(rs, uid) });
    SFX.sell();
  },

  openShop: () => {
    const rs = get().run; if (!rs) return;
    const hero = heroById(rs.heroId);
    set({ shop: generateShop(get().rng, rs.day, hero.natureType) });
  },
  closeShop: () => set({ shop: null }),
  rerollShop: () => {
    const { run, shop, rng } = get();
    if (!run || !shop) return;
    const hero = heroById(run.heroId);
    const next = reroll(rng, run, shop, hero.natureType);
    if (next) set({ run: next.rs, shop: next.shop });
  },
  toggleShopLock: (idx) => {
    const shop = get().shop; if (!shop) return;
    set({ shop: toggleLock(shop, idx) });
  },
  buyShopOffer: (idx) => {
    const { run, shop } = get();
    if (!run || !shop) return;
    const next = buy(run, shop, idx);
    if (next) {
      set({ run: next.rs, shop: next.shop });
      SFX.purchase();
    }
  },

  prepareEncounter: (difficulty) => {
    const rs = get().run; if (!rs) return;
    const enc = buildEncounter(get().rng, rs.day, difficulty);
    set({ currentEncounter: enc, screen: "Combat" });
  },
  resolveEncounter: () => {
    const { run, currentEncounter } = get();
    if (!run || !currentEncounter) return;
    const hero = heroById(run.heroId);
    const combatHp = combatHpForRun(run);
    const player = {
      id: "player",
      displayName: hero.name,
      natureType: hero.natureType,
      level: run.level,
      maxHp: combatHp,
      currentHp: combatHp,
      inventory: run.battleInventory,
    };
    const result = simulateCombat(player, currentEncounter.combatant, hero, undefined, run.perks);

    let nextRs = { ...run };
    if (result.winner === "P") {
      nextRs.gold += currentEncounter.reward.gold;
      nextRs = gainXp(nextRs, currentEncounter.reward.xp);
      // Reward item: roll within rarityRange
      const [lo, _hi] = currentEncounter.reward.itemRarityRange;
      // pick one of the archetype's common items
      const archInv = currentEncounter.combatant.inventory;
      const seedDef = archInv[0]?.defId ?? "coral_shield";
      nextRs = acquireItem(nextRs, seedDef, lo);
    } else {
      // Loss penalty in the new system: -1 life (-2 if SuperHard) + 5 XP consolation.
      const lifeCost = currentEncounter.difficulty === "SuperHard" ? 2 : 1;
      nextRs = loseLives(nextRs, lifeCost);
      nextRs = gainXp(nextRs, 5);
    }
    set({ run: nextRs, lastCombat: result });
  },

  prepareGhost: () => {
    const rs = get().run; if (!rs) return;
    // Belt-and-braces: ensure there's *something* in the ghost pool. This
    // is a no-op if seedMockGhostsIfEmpty has already run.
    seedMockGhostsIfEmpty(get().rng, 30);
    const streak: "Win" | "Loss" | "Neutral" =
      rs.pvpWinStreak >= 2 ? "Win" : rs.pvpLossStreak >= 2 ? "Loss" : "Neutral";
    const ghost = matchmakeGhost(
      { day: rs.day, level: rs.level, streak },
      get().rng
    );
    if (!ghost) {
      // Truly no opponent — auto-bye and advance immediately.
      let nextRs = { ...rs };
      nextRs.gold += 8;
      nextRs = gainXp(nextRs, 12);
      nextRs.pvpWinStreak += 1;
      nextRs.pvpLossStreak = 0;
      const snap = captureGhost(nextRs);
      persistGhost(snap);
      set({ run: nextRs, screen: "Workshop" });
      get().advance();
      return;
    }
    set({ lastGhost: ghost, screen: "Combat" });
  },
  resolveGhost: () => {
    const { run, lastGhost } = get();
    if (!run) return;
    const hero = heroById(run.heroId);
    const combatHp = combatHpForRun(run);
    const player = {
      id: "player",
      displayName: hero.name,
      natureType: hero.natureType,
      level: run.level,
      maxHp: combatHp,
      currentHp: combatHp,
      inventory: run.battleInventory,
    };

    let result: CombatResult | null = null;
    let nextRs = { ...run };

    if (!lastGhost) {
      // No matchable ghost — auto-bye, mild reward. We also bail out of the
      // Combat screen here in case we landed on it without a ghost — this
      // is the original "stuck on Preparing combat..." failure mode.
      nextRs.gold += 8;
      nextRs = gainXp(nextRs, 12);
      nextRs.pvpWinStreak += 1;
      nextRs.pvpLossStreak = 0;
      set({ run: nextRs, screen: "Workshop" });
      get().advance();
      return;
    } else {
      const enemyCombatant = ghostToCombatant(lastGhost);
      const ghostHero = heroById(lastGhost.hero_id);
      result = simulateCombat(player, enemyCombatant, hero, ghostHero, run.perks);

      if (result.winner === "P") {
        nextRs.gold += 15;
        nextRs = gainXp(nextRs, 25); // halved from 50
        nextRs.pvpWinStreak += 1;
        nextRs.pvpLossStreak = 0;
      } else {
        // Flat -1 life on PvP loss; consolation gold + XP.
        nextRs = loseLives(nextRs, 1);
        nextRs.gold += 3;
        nextRs = gainXp(nextRs, 8); // halved from 15
        nextRs.pvpLossStreak += 1;
        nextRs.pvpWinStreak = 0;
      }
    }

    // Capture and persist this player's snapshot for other players' ghosts
    const snap = captureGhost(nextRs);
    persistGhost(snap);

    set({ run: nextRs, lastCombat: result });
  },

  advance: () => {
    const rs = get().run; if (!rs) return;
    let next = advancePhase(rs);
    // Clear ephemeral combat/encounter so next phase boots fresh
    const cleared = { currentEncounter: null, lastCombat: null, lastGhost: null };
    // End-of-run check
    if (isRunOver(next)) {
      const days = next.day - 1; // they completed this many full days
      const passes = passRewardForDays(days);
      set({
        run: next,
        passesEarned: passes,
        totalPasses: get().totalPasses + passes,
        screen: "EndOfRun",
        ...cleared,
      });
      return;
    }
    set({ run: next, ...cleared });
  },

  applyRunStateUpdate: (updater) => {
    const rs = get().run; if (!rs) return;
    set({ run: updater(rs) });
  },

  abandonRun: () => {
    set({
      run: null,
      shop: null,
      currentEncounter: null,
      lastCombat: null,
      lastGhost: null,
      passesEarned: 0,
      screen: "MainMenu",
    });
  },

  hasSavedRun: () => {
    return get().run !== null;
  },

  pickPerk: (id) => {
    const rs = get().run; if (!rs) return;
    if (rs.pendingPerkChoices <= 0) return;
    set({
      run: {
        ...rs,
        perks: [...rs.perks, id],
        pendingPerkChoices: rs.pendingPerkChoices - 1,
      },
    });
  },
    }),
    {
      name: "mythic-market-state-v1",
      storage: createJSONStorage(() => localStorage),
      // Persist everything except the rng function (functions don't serialize)
      partialize: (state) => ({
        screen: state.screen,
        run: state.run,
        shop: state.shop,
        currentEncounter: state.currentEncounter,
        lastCombat: state.lastCombat,
        lastGhost: state.lastGhost,
        passesEarned: state.passesEarned,
        totalPasses: state.totalPasses,
        audioMuted: state.audioMuted,
      }),
      onRehydrateStorage: () => (state) => {
        // Sync the global SFX mute flag with the persisted preference.
        if (state) setSfxMuted(state.audioMuted ?? false);
      },
      // v2: phaseChoices. v3: combat playback fields. v4: HP→Lives split.
      // v5: perks + pendingPerkChoices. v6: audioMuted preference at top level.
      version: 6,
      migrate: (persisted: any, oldVersion: number) => {
        if (!persisted) return persisted;
        if (oldVersion < 2 && persisted.run && !persisted.run.phaseChoices) {
          persisted.run.phaseChoices = {};
        }
        if (oldVersion < 3) {
          persisted.lastCombat = null;
          persisted.currentEncounter = null;
          persisted.lastGhost = null;
          if (persisted.screen === "Combat") persisted.screen = "DayHub";
        }
        if (oldVersion < 4 && persisted.run) {
          // Drop legacy HP fields, seed lives at full (don't punish migrators).
          delete persisted.run.maxHp;
          delete persisted.run.currentHp;
          if (persisted.run.lives === undefined) persisted.run.lives = 10;
          if (persisted.run.maxLives === undefined) persisted.run.maxLives = 10;
        }
        if (oldVersion < 6) {
          if (typeof persisted.audioMuted !== "boolean") persisted.audioMuted = false;
        }
        // Belt-and-braces: ensure required v6 fields always exist.
        if (persisted.run) {
          if (typeof persisted.run.lives !== "number") persisted.run.lives = 10;
          if (typeof persisted.run.maxLives !== "number") persisted.run.maxLives = 10;
          if (!persisted.run.phaseChoices) persisted.run.phaseChoices = {};
          if (!Array.isArray(persisted.run.perks)) persisted.run.perks = [];
          if (typeof persisted.run.pendingPerkChoices !== "number") persisted.run.pendingPerkChoices = 0;
          delete persisted.run.maxHp;
          delete persisted.run.currentHp;
        }
        if (typeof persisted.audioMuted !== "boolean") persisted.audioMuted = false;
        return persisted;
      },
    }
  )
);

// expose rng for components that need it
export function useRng(): Rng {
  return useGameStore.getState().rng;
}
