/**
 * Level-up perks. On every level-up the player picks 1 of 3 random perks.
 * Some perks stack (you can take "more_combat_hp" several times); others
 * are one-shot (e.g. "burn_on_damage").
 */
import type { PerkId } from "@/core/types";
import { pick, type Rng } from "@/utils/rng";

export interface PerkDef {
  id: PerkId;
  icon: string;
  name: string;
  description: string;
  /** If true, can be picked multiple times (stacks). */
  stackable: boolean;
}

export const PERKS: PerkDef[] = [
  { id: "more_combat_hp",   icon: "❤️",  name: "Hardy",         description: "+50 combat HP per stack. Resets every fight.", stackable: true },
  { id: "recharge_beast",   icon: "🐾",  name: "Primal Haste",  description: "+20% recharge speed for all Beast items.",      stackable: false },
  { id: "recharge_fish",    icon: "🌊",  name: "Tidal Rhythm",  description: "+20% recharge speed for all Fish items.",       stackable: false },
  { id: "recharge_plant",   icon: "🌱",  name: "Mycelial Bloom",description: "+20% recharge speed for all Plant items.",      stackable: false },
  { id: "damage_boost",     icon: "⚔️",  name: "Sharpened",     description: "+20% damage on every damage trigger.",         stackable: true },
  { id: "shield_boost",     icon: "🛡️",  name: "Bulwark",       description: "+20% to all shield gained.",                   stackable: true },
  { id: "heal_boost",       icon: "💚",  name: "Field Medic",   description: "+30% to all healing.",                          stackable: true },
  { id: "vampirism_boost",  icon: "🩸",  name: "Bloodthirst",   description: "+20% Vampirism on lifesteal triggers.",         stackable: false },
  { id: "extra_slot",       icon: "🎒",  name: "Pack Rat",      description: "+1 battle slot beyond your level's allowance.", stackable: true },
  { id: "gold_per_day",     icon: "💰",  name: "Merchant",      description: "+2 gold from your daily allowance every day.",  stackable: true },
  { id: "passive_regen",    icon: "🌿",  name: "Vital Aura",    description: "+1 HP/sec passive regen during combat.",        stackable: true },
  { id: "burn_on_damage",   icon: "🔥",  name: "Cinder Strike", description: "Every damage trigger applies +1 Burn stack.",   stackable: false },
];

const _byId = new Map(PERKS.map((p) => [p.id, p] as const));

export function perkById(id: PerkId): PerkDef {
  return _byId.get(id) ?? PERKS[0];
}

/**
 * Roll 3 perk choices. Skips non-stackable perks already taken; falls back
 * to whatever's left if the player has consumed almost everything.
 */
export function rollPerkChoices(rng: Rng, alreadyTaken: PerkId[], count = 3): PerkDef[] {
  const eligible = PERKS.filter((p) => p.stackable || !alreadyTaken.includes(p.id));
  const pool = eligible.length >= count ? eligible : PERKS;
  const out: PerkDef[] = [];
  const seen = new Set<string>();
  let safety = 0;
  while (out.length < count && safety++ < 50) {
    const p = pick(rng, pool);
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}
