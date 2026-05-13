import type { NPCArchetype } from "@/core/types";

export const ARCHETYPES: NPCArchetype[] = [
  {
    id: "IronBark",
    name: "The Iron Bark",
    description: "Defensive/Shielding. Outlasts the player with high armor.",
    commonItems: ["coral_shield", "ancient_root", "bear_pelt"],
    natureType: "Plant",
  },
  {
    id: "Viper",
    name: "The Viper",
    description: "Status/Slowing. Aims to freeze the player's cooldowns.",
    commonItems: ["thorny_vine", "electric_eel", "cursed_idol"],
    natureType: "Fish",
  },
  {
    id: "Predator",
    name: "The Predator",
    description: "Aggro/Vampirism. High damage, lower health.",
    commonItems: ["tiger_claw", "monkey_paw", "vampire_squid"],
    natureType: "Beast",
  },
  {
    id: "Druid",
    name: "The Druid",
    description: "Sustain/Healing. Uses Overhealing to stay above max HP.",
    commonItems: ["berry_bush", "world_seed", "abyssal_pearl"],
    natureType: "Plant",
  },
];

export function archetypeById(id: string): NPCArchetype {
  const a = ARCHETYPES.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown archetype: ${id}`);
  return a;
}
