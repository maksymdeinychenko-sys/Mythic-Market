import type { Hero } from "@/core/types";

export const HEROES: Hero[] = [
  {
    id: "monkey",
    name: "Monkey",
    natureType: "Beast",
    passiveName: "Primal Haste",
    passiveDescription: "Increases Beast item recharge by 5% per level.",
    portrait: "🐒",
  },
  {
    id: "mermaid",
    name: "Mermaid",
    natureType: "Fish",
    passiveName: "Tidecaller",
    passiveDescription: "Increases Fish item recharge by 5% per level.",
    portrait: "🧜",
  },
  {
    id: "mushroom",
    name: "Mushroom",
    natureType: "Plant",
    passiveName: "Mycelial Bloom",
    passiveDescription: "Increases Plant item recharge by 5% per level.",
    portrait: "🍄",
  },
];

const UNKNOWN_HERO: Hero = {
  id: "__unknown",
  name: "Unknown Hero",
  natureType: "Beast",
  passiveName: "—",
  passiveDescription: "Missing hero definition.",
  portrait: "❔",
};

export function heroById(id: string): Hero {
  const h = HEROES.find((x) => x.id === id);
  if (!h) {
    // eslint-disable-next-line no-console
    console.warn(`[heroes] Unknown hero: "${id}" — falling back to placeholder.`);
    return UNKNOWN_HERO;
  }
  return h;
}
