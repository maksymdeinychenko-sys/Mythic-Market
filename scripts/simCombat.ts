/**
 * Headless smoke test: build a player and an NPC, run combat, print the result.
 * Run with: npx tsx scripts/simCombat.ts
 */
// Tiny shim: we don't run inside Vite, so resolve paths manually.
import { simulateCombat } from "../src/core/combat";
import { buildEncounter } from "../src/core/encounter";
import { makeInstance } from "../src/core/inventory";
import { heroById } from "../src/data/heroes";
import { createRng } from "../src/utils/rng";

const rng = createRng(42);
const hero = heroById("monkey");
const player = {
  id: "player",
  displayName: "Test Monkey",
  natureType: hero.natureType,
  level: 3,
  maxHp: 140,
  currentHp: 140,
  inventory: [
    makeInstance("tiger_claw", "Bronze", 0),
    makeInstance("burning_brand", "Bronze", 1),
    makeInstance("spider_fang", "Bronze", 2),
    makeInstance("lion_mane", "Bronze", 3),
  ],
};

const enc = buildEncounter(rng, 4, "Hard", "IronBark");
console.log(`Player: Lv${player.level} ${player.maxHp} HP, items=${player.inventory.length}`);
console.log(`Enemy:  ${enc.combatant.displayName} Lv${enc.combatant.level} ${enc.combatant.maxHp} HP, items=${enc.combatant.inventory.length}`);

const result = simulateCombat(player, enc.combatant, hero);
console.log("Winner:", result.winner);
console.log("Final HP — P:", Math.round(result.finalHpP), "E:", Math.round(result.finalHpE));
console.log("Events:", result.events.length);
console.log("Last 8 events:");
for (const e of result.events.slice(-8)) console.log("  ", e);
