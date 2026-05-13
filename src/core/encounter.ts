/**
 * Build a PvE encounter (Phase C / Phase 3 NPC fight) given a day and difficulty.
 * Translates Doc 4 directly: NPC HP scaling, archetype loadouts, item rarity bands.
 */
import type {
  Combatant, Difficulty, Encounter, ItemInstance, Rarity, ArchetypeId,
} from "@/core/types";
import { archetypeById, ARCHETYPES } from "@/data/npcs";
import { npcHpFor, PVE_REWARD } from "@/data/scaling";
import { rollRarityForDay, makeInstance } from "@/core/inventory";
import { itemById } from "@/data/items";
import { pick, type Rng, uid } from "@/utils/rng";

const SLOTS_BY_DIFFICULTY: Record<Difficulty, number> = {
  Easy: 3,
  Hard: 4,
  SuperHard: 5,
};

function tierBumpForDifficulty(d: Difficulty): number {
  // Easy: -1 tier; Hard: 0; SuperHard: +1 (sometimes +2)
  return d === "Easy" ? -1 : d === "Hard" ? 0 : 1;
}

function bumpRarity(r: Rarity, by: number): Rarity {
  const order: Rarity[] = ["Wooden", "Bronze", "Silver", "Gold", "Diamond"];
  const idx = Math.max(0, Math.min(order.length - 1, order.indexOf(r) + by));
  return order[idx];
}

export function buildEncounter(rng: Rng, day: number, difficulty: Difficulty, archetypeId?: ArchetypeId): Encounter {
  const archetype = archetypeId ? archetypeById(archetypeId) : pick(rng, ARCHETYPES);
  const slots = SLOTS_BY_DIFFICULTY[difficulty];
  const inv: ItemInstance[] = [];

  let placed = 0;
  let cursor = 0;
  while (placed < slots && cursor < 8) {
    const defId = archetype.commonItems[placed % archetype.commonItems.length];
    const def = itemById(defId);
    if (cursor + def.size > 8) break;
    const baseRarity = rollRarityForDay(rng, day);
    const rarity = bumpRarity(baseRarity, tierBumpForDifficulty(difficulty));
    inv.push(makeInstance(defId, rarity, cursor));
    cursor += def.size;
    placed += 1;
  }

  const hp = npcHpFor(day, difficulty);
  const npcLevel = Math.max(1, Math.ceil(day / 2));

  const combatant: Combatant = {
    id: `npc_${archetype.id}_${day}_${difficulty}_${uid("e")}`,
    displayName: `${archetype.name}`,
    natureType: archetype.natureType,
    level: npcLevel,
    maxHp: hp,
    currentHp: hp,
    inventory: inv,
  };

  const reward = PVE_REWARD[difficulty];

  return {
    id: combatant.id,
    day,
    difficulty,
    archetypeId: archetype.id,
    combatant,
    reward: {
      gold: reward.gold,
      xp: reward.xp,
      itemRarityRange: reward.rarityRange,
    },
  };
}
