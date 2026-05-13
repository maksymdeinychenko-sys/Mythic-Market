/**
 * Combat simulator — deterministic, cooldown-driven auto-battler.
 *
 * Resolution model:
 *   1. Build "active items" for both sides from their battle inventory.
 *   2. Each item carries a (possibly modified) cooldown. Hero passive applies
 *      a CD reduction to items matching the hero's nature type. Adjacent links
 *      that grant cooldownReductionPct apply too.
 *   3. We tick simulated time at 0.05s steps. Each tick checks every item; if
 *      its remaining CD reaches 0 it triggers and resets its CD (modified by
 *      any active Fasting buff).
 *   4. Effects resolve in keyword order: Damage → Vampirism → Shield → Healing
 *      → Status (Slow/Fast/Recharge).
 *   5. Combat ends when one side reaches 0 HP, or after a 60s timeout.
 *
 * The output is both the final winner and a structured event log usable by the
 * combat screen for scrubbing animation.
 */
import type {
  Combatant, ItemInstance, Rarity, Hero, PerkId,
} from "@/core/types";
import { itemById } from "@/data/items";
import {
  EFFECT_TABLE, VAMPIRISM_PCT, SLOWING_SEC, FASTING_SEC, RECHARGE_SEC,
  BURN_TICK_DPS, POISON_TICK_DPS, REGEN_PER_SEC, BURN_DECAY_SEC, POISON_DECAY_SEC,
  HERO_RECHARGE_PCT_PER_LEVEL, ASCENSION,
} from "@/data/scaling";
import { activeLinks } from "@/core/inventory";

export type CombatEvent =
  | { t: number; kind: "trigger"; side: "P" | "E"; itemUid: string }
  | { t: number; kind: "damage"; side: "P" | "E"; amount: number; targetSide: "P" | "E" }
  | { t: number; kind: "shield"; side: "P" | "E"; amount: number }
  | { t: number; kind: "heal"; side: "P" | "E"; amount: number }
  | { t: number; kind: "slow"; side: "P" | "E"; amount: number }
  | { t: number; kind: "fast"; side: "P" | "E"; durationSec: number; itemUid?: string }
  | { t: number; kind: "recharge"; side: "P" | "E"; amount: number; itemUid: string }
  | { t: number; kind: "burn-apply"; side: "P" | "E"; targetSide: "P" | "E"; stacks: number }
  | { t: number; kind: "burn-tick"; targetSide: "P" | "E"; amount: number }
  | { t: number; kind: "poison-apply"; side: "P" | "E"; targetSide: "P" | "E"; stacks: number }
  | { t: number; kind: "poison-tick"; targetSide: "P" | "E"; amount: number }
  | { t: number; kind: "regen-tick"; side: "P" | "E"; amount: number }
  | { t: number; kind: "sandstorm-start" }
  | { t: number; kind: "sandstorm-tick"; amount: number; targetSide: "P" | "E" }
  | { t: number; kind: "end"; winner: "P" | "E" | "Draw" };

export interface CombatResult {
  winner: "P" | "E" | "Draw";
  events: CombatEvent[];
  finalHpP: number;
  finalHpE: number;
  initialHpP: number;
  initialHpE: number;
  /** Effective cooldown (post hero passive + links) for every item, by uid. */
  effectiveCds: Record<string, number>;
  /** Total duration of the simulated combat, in seconds. */
  duration: number;
  /** When the Sandstorm started, if it did. */
  sandstormStartedAt?: number;
  /**
   * Inventory snapshots captured at the moment combat resolved. Combat
   * playback renders these instead of the live RunState — so items
   * acquired as rewards don't visually appear during the fight.
   */
  playerInventory: ItemInstance[];
  enemyInventory: ItemInstance[];
}

// ─── Sandstorm tuning ───────────────────────────────────────────────────────
const SANDSTORM_START = 30;       // seconds
const SANDSTORM_TICK_INTERVAL = 1; // seconds between ticks
/** Damage at tick i (0-indexed). Ramps so battles cannot last forever. */
function sandstormDamageAt(elapsedSinceStart: number): number {
  return 1 + Math.floor(elapsedSinceStart);
}

interface RuntimeItem {
  inst: ItemInstance;
  /** Time until next trigger, in seconds. */
  cdRemaining: number;
  /** Modified cooldown after passives & links. */
  effectiveCd: number;
  /** Active Fasting buff timer (sec). */
  fastingUntil: number;
  /** Bonus damage from links. */
  bonusDamage: number;
  bonusShield: number;
  bonusHealingPct: number;
  bonusVampPct: number;
}

interface RuntimeSide {
  combatant: Combatant;
  items: RuntimeItem[];
  shield: number;
  /** Diamond Bastion: damage reduction %. */
  damageReductionPct: number;
  /** Diamond Slayer: shield pierce %. */
  shieldPiercePct: number;
  // Status effects
  burnStacks: number;
  poisonStacks: number;
  regenPerSec: number;
  // Perk-derived multipliers
  damageMult: number;
  shieldMult: number;
  healMult: number;
  vampPctBonus: number;
  /** Cooldown reduction multiplier per nature type (perk-based). */
  natureCdMult: { Beast: number; Fish: number; Plant: number; Universal: number };
  /** Burn-on-damage perk: each damage trigger applies +1 burn stack. */
  appliesBurnOnDamage: boolean;
}

const TICK = 0.05;
const MAX_TIME = 60;

/**
 * Primary numeric effects (Damage / Shield / Healing / Overhealing) read
 * directly from the rarity table. An item's baseEffects field for these
 * keywords is now just a *flag* meaning "this item carries this keyword" —
 * the magnitude comes from the rarity. Item identity is in cooldown +
 * keyword combos + link bonuses, not raw numbers.
 */
function rarityKeyEffect(
  inst: ItemInstance,
  key: "Damage" | "Shield" | "Healing" | "Overhealing"
): number {
  return EFFECT_TABLE[key][inst.rarity];
}

function buildSide(combatant: Combatant, hero?: Hero, perks: PerkId[] = []): RuntimeSide {
  const links = activeLinks(combatant.inventory);

  // Pre-compute static link bonuses applied to each item.
  const bonusDamage = new Map<string, number>();
  const bonusShield = new Map<string, number>();
  const bonusHealingPct = new Map<string, number>();
  const bonusVampPct = new Map<string, number>();
  const cdMultByItem = new Map<string, number>();

  for (const link of links) {
    const def = itemById(link.from.defId);
    const lb = def.link;
    if (!lb) continue;
    const tUid = link.to.uid;
    if (lb.damage) bonusDamage.set(tUid, (bonusDamage.get(tUid) ?? 0) + lb.damage);
    if (lb.shield) bonusShield.set(tUid, (bonusShield.get(tUid) ?? 0) + lb.shield);
    if (lb.healingPct) bonusHealingPct.set(tUid, (bonusHealingPct.get(tUid) ?? 0) + lb.healingPct);
    if (lb.vampirismPct) bonusVampPct.set(tUid, (bonusVampPct.get(tUid) ?? 0) + lb.vampirismPct);
    if (lb.cooldownReductionPct) {
      const cur = cdMultByItem.get(tUid) ?? 1;
      cdMultByItem.set(tUid, cur * (1 - lb.cooldownReductionPct / 100));
    }
  }

  // ─── Resolve perk multipliers for this combatant ─────────────────────
  let damageMult = 1, shieldMult = 1, healMult = 1, vampPctBonus = 0;
  let regenPerSec = 0;
  let appliesBurnOnDamage = false;
  const natureCdMult = { Beast: 1, Fish: 1, Plant: 1, Universal: 1 };
  for (const p of perks) {
    if (p === "damage_boost")    damageMult *= 1.20;
    if (p === "shield_boost")    shieldMult *= 1.20;
    if (p === "heal_boost")      healMult   *= 1.30;
    if (p === "vampirism_boost") vampPctBonus += 20;
    if (p === "recharge_beast")  natureCdMult.Beast *= (1 / 1.20);
    if (p === "recharge_fish")   natureCdMult.Fish  *= (1 / 1.20);
    if (p === "recharge_plant")  natureCdMult.Plant *= (1 / 1.20);
    if (p === "passive_regen")   regenPerSec += 1;
    if (p === "burn_on_damage")  appliesBurnOnDamage = true;
  }

  // Hero passive: +5% recharge per level on items matching hero nature
  let damageReductionPct = 0;
  let shieldPiercePct = 0;

  const items: RuntimeItem[] = combatant.inventory.map((inst) => {
    const def = itemById(inst.defId);
    let cd = def.baseCooldown;

    if (hero && def.natureType === hero.natureType) {
      const pct = combatant.level * HERO_RECHARGE_PCT_PER_LEVEL;
      cd = cd / (1 + pct / 100);
    }
    // Per-nature perk recharge (multiplicative with hero passive)
    const perkMult = natureCdMult[def.natureType] ?? 1;
    cd = cd * perkMult;
    const linkMult = cdMultByItem.get(inst.uid) ?? 1;
    cd = cd * linkMult;

    // Diamond ascensions
    if (inst.rarity === "Diamond") {
      if (def.keywords.includes("Damage")) shieldPiercePct = Math.max(shieldPiercePct, ASCENSION.Slayer.shieldPiercePct);
      if (def.keywords.includes("Shield")) damageReductionPct = Math.max(damageReductionPct, ASCENSION.Bastion.damageReductionPct);
    }

    // Items with intrinsic Regen contribute their stack to the side's regen pool.
    if (def.keywords.includes("Regen")) {
      regenPerSec += REGEN_PER_SEC[inst.rarity];
    }

    return {
      inst,
      effectiveCd: cd,
      cdRemaining: cd,
      fastingUntil: 0,
      bonusDamage: bonusDamage.get(inst.uid) ?? 0,
      bonusShield: bonusShield.get(inst.uid) ?? 0,
      bonusHealingPct: bonusHealingPct.get(inst.uid) ?? 0,
      bonusVampPct: bonusVampPct.get(inst.uid) ?? 0,
    };
  });

  return {
    combatant: { ...combatant, currentHp: combatant.currentHp },
    items,
    shield: 0,
    damageReductionPct,
    shieldPiercePct,
    burnStacks: 0,
    poisonStacks: 0,
    regenPerSec,
    damageMult,
    shieldMult,
    healMult,
    vampPctBonus,
    natureCdMult,
    appliesBurnOnDamage,
  };
}

function applyDamage(target: RuntimeSide, amount: number, piercePct = 0): number {
  // Mitigate with damageReductionPct first.
  const mitigated = amount * (1 - target.damageReductionPct / 100);
  // Pierce shield first
  let dealt = 0;
  let dmg = mitigated;
  if (target.shield > 0) {
    const piercing = dmg * (piercePct / 100);
    const shielded = dmg - piercing;
    const absorbed = Math.min(target.shield, shielded);
    target.shield -= absorbed;
    dmg = piercing + (shielded - absorbed);
  }
  if (dmg > 0) {
    const before = target.combatant.currentHp;
    target.combatant.currentHp = Math.max(0, before - dmg);
    dealt = before - target.combatant.currentHp;
  }
  return dealt;
}

function applyHeal(side: RuntimeSide, amount: number, allowOverheal = false): number {
  const max = side.combatant.maxHp;
  const cap = allowOverheal ? max * 2 : max;
  const before = side.combatant.currentHp;
  side.combatant.currentHp = Math.min(cap, before + amount);
  return side.combatant.currentHp - before;
}

export function simulateCombat(
  player: Combatant,
  enemy: Combatant,
  playerHero?: Hero,
  enemyHero?: Hero,
  playerPerks: PerkId[] = [],
  enemyPerks: PerkId[] = []
): CombatResult {
  const P = buildSide(player, playerHero, playerPerks);
  const E = buildSide(enemy, enemyHero, enemyPerks);
  const events: CombatEvent[] = [];

  // Effective CD map for visualization
  const effectiveCds: Record<string, number> = {};
  for (const ri of P.items) effectiveCds[ri.inst.uid] = ri.effectiveCd;
  for (const ri of E.items) effectiveCds[ri.inst.uid] = ri.effectiveCd;

  const initialHpP = P.combatant.currentHp;
  const initialHpE = E.combatant.currentHp;

  let sandstormStartedAt: number | undefined;
  let nextSandstormTick = SANDSTORM_START;
  // Status effect tick schedules
  let nextBurnTick = 1.0;       // burn ticks every 1s
  let nextPoisonTick = 2.0;     // poison ticks every 2s
  let nextRegenTick = 1.0;      // regen ticks every 1s
  let nextDecayTick = 1.0;      // stack decay every 1s

  let t = 0;
  while (t <= MAX_TIME) {
    if (P.combatant.currentHp <= 0 || E.combatant.currentHp <= 0) break;

    // ─── Status effect ticks (burn/poison/regen) ────────────────────────────
    while (t >= nextBurnTick) {
      for (const sideKey of ["P", "E"] as const) {
        const side = sideKey === "P" ? P : E;
        if (side.burnStacks > 0) {
          // Burn damage = stacks * Bronze-tier dps (a baseline rate).
          const dmg = side.burnStacks * BURN_TICK_DPS.Bronze;
          // Hits shield first then HP.
          let remaining = dmg;
          if (side.shield > 0) {
            const absorbed = Math.min(side.shield, remaining);
            side.shield -= absorbed;
            remaining -= absorbed;
          }
          if (remaining > 0) {
            side.combatant.currentHp = Math.max(0, side.combatant.currentHp - remaining);
          }
          events.push({ t: nextBurnTick, kind: "burn-tick", targetSide: sideKey, amount: dmg });
        }
      }
      nextBurnTick += 1.0;
    }
    while (t >= nextPoisonTick) {
      for (const sideKey of ["P", "E"] as const) {
        const side = sideKey === "P" ? P : E;
        if (side.poisonStacks > 0) {
          const dmg = side.poisonStacks * POISON_TICK_DPS.Bronze;
          // Bypass shield entirely.
          side.combatant.currentHp = Math.max(0, side.combatant.currentHp - dmg);
          events.push({ t: nextPoisonTick, kind: "poison-tick", targetSide: sideKey, amount: dmg });
        }
      }
      nextPoisonTick += 2.0;
    }
    while (t >= nextRegenTick) {
      for (const sideKey of ["P", "E"] as const) {
        const side = sideKey === "P" ? P : E;
        if (side.regenPerSec > 0 && side.combatant.currentHp > 0) {
          const before = side.combatant.currentHp;
          side.combatant.currentHp = Math.min(
            side.combatant.maxHp,
            before + side.regenPerSec
          );
          const healed = side.combatant.currentHp - before;
          if (healed > 0) {
            events.push({ t: nextRegenTick, kind: "regen-tick", side: sideKey, amount: healed });
          }
        }
      }
      nextRegenTick += 1.0;
    }
    while (t >= nextDecayTick) {
      // Decay stacks: lose 1 burn stack every BURN_DECAY_SEC, 1 poison every POISON_DECAY_SEC.
      const burnDecay  = nextDecayTick % BURN_DECAY_SEC   === 0 ? 1 : 0;
      const poisonDecay = nextDecayTick % POISON_DECAY_SEC === 0 ? 1 : 0;
      P.burnStacks   = Math.max(0, P.burnStacks   - burnDecay);
      E.burnStacks   = Math.max(0, E.burnStacks   - burnDecay);
      P.poisonStacks = Math.max(0, P.poisonStacks - poisonDecay);
      E.poisonStacks = Math.max(0, E.poisonStacks - poisonDecay);
      nextDecayTick += 1.0;
    }
    if (P.combatant.currentHp <= 0 || E.combatant.currentHp <= 0) break;

    // ─── Sandstorm: starts at t=30, hits every second, ramps. Ignores shields ───
    if (t >= SANDSTORM_START) {
      if (sandstormStartedAt === undefined) {
        sandstormStartedAt = t;
        events.push({ t, kind: "sandstorm-start" });
      }
      while (t >= nextSandstormTick) {
        const elapsed = nextSandstormTick - SANDSTORM_START;
        const dmg = sandstormDamageAt(elapsed);
        // Bypass shield AND damage reduction so it can break stalemates.
        for (const side of [P, E]) {
          const before = side.combatant.currentHp;
          side.combatant.currentHp = Math.max(0, before - dmg);
          events.push({
            t: nextSandstormTick,
            kind: "sandstorm-tick",
            amount: dmg,
            targetSide: side === P ? "P" : "E",
          });
        }
        nextSandstormTick += SANDSTORM_TICK_INTERVAL;
        if (P.combatant.currentHp <= 0 || E.combatant.currentHp <= 0) break;
      }
      if (P.combatant.currentHp <= 0 || E.combatant.currentHp <= 0) break;
    }

    for (const sideKey of ["P", "E"] as const) {
      const self = sideKey === "P" ? P : E;
      const other = sideKey === "P" ? E : P;

      for (const ri of self.items) {
        // tick CD with fasting
        const speed = t < ri.fastingUntil ? 2 : 1;
        ri.cdRemaining -= TICK * speed;
        if (ri.cdRemaining > 0) continue;

        const def = itemById(ri.inst.defId);
        // Skip pure-passive items (e.g., Whetstone has CD 999)
        if (def.baseCooldown >= 100) {
          ri.cdRemaining = def.baseCooldown;
          continue;
        }

        events.push({ t, kind: "trigger", side: sideKey, itemUid: ri.inst.uid });

        // Resolve keywords
        if (def.keywords.includes("Damage")) {
          const baseDmg = rarityKeyEffect(ri.inst, "Damage") + ri.bonusDamage;
          const dmg = Math.round(baseDmg * self.damageMult);
          if (dmg > 0) {
            const dealt = applyDamage(other, dmg, self.shieldPiercePct);
            events.push({ t, kind: "damage", side: sideKey, amount: dealt, targetSide: sideKey === "P" ? "E" : "P" });
            if (def.keywords.includes("Vampirism")) {
              const pct = (ri.inst.rarity in VAMPIRISM_PCT ? VAMPIRISM_PCT[ri.inst.rarity] : 0) + ri.bonusVampPct + self.vampPctBonus;
              const heal = Math.round((dealt * pct) / 100);
              const healed = applyHeal(self, heal, true);
              events.push({ t, kind: "heal", side: sideKey, amount: healed });
            }
            // Burn-on-damage perk: every damage hit applies +1 burn stack.
            if (self.appliesBurnOnDamage) {
              other.burnStacks += 1;
              events.push({ t, kind: "burn-apply", side: sideKey, targetSide: sideKey === "P" ? "E" : "P", stacks: 1 });
            }
          }
        }
        if (def.keywords.includes("Shield")) {
          const baseSh = rarityKeyEffect(ri.inst, "Shield") + ri.bonusShield;
          const sh = Math.round(baseSh * self.shieldMult);
          self.shield += sh;
          events.push({ t, kind: "shield", side: sideKey, amount: sh });
        }
        if (def.keywords.includes("Healing") || def.keywords.includes("Overhealing")) {
          const baseHeal = rarityKeyEffect(ri.inst, "Healing") || rarityKeyEffect(ri.inst, "Overhealing");
          const allowOverheal = def.keywords.includes("Overhealing");
          const finalHeal = Math.round(baseHeal * (1 + ri.bonusHealingPct / 100) * self.healMult);
          const healed = applyHeal(self, finalHeal, allowOverheal);
          events.push({ t, kind: "heal", side: sideKey, amount: healed });
        }
        // ─── New keywords: Burn / Poison ──────────────────────────────────
        if (def.keywords.includes("Burn")) {
          const stacks = def.baseEffects.burnStacks ?? 1;
          other.burnStacks += stacks;
          events.push({ t, kind: "burn-apply", side: sideKey, targetSide: sideKey === "P" ? "E" : "P", stacks });
        }
        if (def.keywords.includes("Poison")) {
          const stacks = def.baseEffects.poisonStacks ?? 1;
          other.poisonStacks += stacks;
          events.push({ t, kind: "poison-apply", side: sideKey, targetSide: sideKey === "P" ? "E" : "P", stacks });
        }
        // Regen items contribute to side.regenPerSec at buildSide time, not on trigger.
        if (def.keywords.includes("Slowing")) {
          const slow = SLOWING_SEC[ri.inst.rarity];
          // Add `slow` to a random enemy item's CD.
          const candidates = other.items.filter((x) => itemById(x.inst.defId).baseCooldown < 100);
          if (candidates.length > 0) {
            const target = candidates[Math.floor((self.items.indexOf(ri) + Math.floor(t * 10)) % candidates.length)];
            target.cdRemaining += slow;
            events.push({ t, kind: "slow", side: sideKey, amount: slow });
          }
        }
        if (def.keywords.includes("Fasting")) {
          const dur = FASTING_SEC[ri.inst.rarity];
          ri.fastingUntil = t + dur;
          events.push({ t, kind: "fast", side: sideKey, durationSec: dur, itemUid: ri.inst.uid });
        }
        if (def.keywords.includes("Recharge")) {
          const r = RECHARGE_SEC[ri.inst.rarity];
          // Reduce CD of a same-nature item if the def is plant/beast/fish, else any.
          const targetPool = self.items.filter((x) =>
            x !== ri && (itemById(x.inst.defId).natureType === def.natureType || def.natureType === "Universal")
          );
          if (targetPool.length > 0) {
            const tgt = targetPool[Math.floor(t * 7) % targetPool.length];
            tgt.cdRemaining = Math.max(0, tgt.cdRemaining - r);
            events.push({ t, kind: "recharge", side: sideKey, amount: r, itemUid: tgt.inst.uid });
          }
        }
        // Cursed Idol self-damage
        if (ri.inst.defId === "cursed_idol") {
          applyDamage(self, 5, 0);
        }

        ri.cdRemaining = ri.effectiveCd;
      }
    }

    t += TICK;
  }

  let winner: "P" | "E" | "Draw" = "Draw";
  if (P.combatant.currentHp > 0 && E.combatant.currentHp <= 0) winner = "P";
  else if (E.combatant.currentHp > 0 && P.combatant.currentHp <= 0) winner = "E";
  events.push({ t, kind: "end", winner });

  return {
    winner,
    events,
    finalHpP: P.combatant.currentHp,
    finalHpE: E.combatant.currentHp,
    initialHpP,
    initialHpE,
    effectiveCds,
    duration: t,
    sandstormStartedAt,
    // Deep copy so any later mutation to the source RunState (e.g. acquiring
    // a reward item) doesn't bleed into the visual playback.
    playerInventory: player.inventory.map((it) => ({ ...it })),
    enemyInventory: enemy.inventory.map((it) => ({ ...it })),
  };
}

/** Helper: re-derive human-readable damage from raw rarity table for tooltips. */
export function damageAtRarity(rarity: Rarity): number {
  return EFFECT_TABLE.Damage[rarity];
}
