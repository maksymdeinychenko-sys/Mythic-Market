/**
 * Bazaar-style combat card. Larger than the workshop ItemTile — meant to be
 * read from across the screen during a fight.
 *
 * Anatomy (top to bottom):
 *   - Stat badge (damage/shield/heal/burn/poison) floating top-left
 *   - Rarity stripe along the top
 *   - Big art panel
 *   - Name strip
 *   - Green cooldown bar
 */
import React from "react";
import { itemById } from "@/data/items";
import { ItemArt } from "./ItemArt";
import type { ItemInstance, Rarity } from "@/core/types";
import { EFFECT_TABLE } from "@/data/scaling";
import { HoverTooltip } from "./HoverTooltip";
import { ItemTooltip } from "./ItemTooltip";

interface Props {
  inst: ItemInstance;
  cooldownProgress: number; // 0..1
  triggered: boolean;
  ready: boolean;
}

export function CombatCard({ inst, cooldownProgress, triggered, ready }: Props) {
  const def = itemById(inst.defId);
  const stat = primaryStatFor(def, inst);
  const cls = [
    "cc",
    `cc-${def.natureType.toLowerCase()}`,
    `cc-r-${inst.rarity}`,
    triggered ? "cc-triggered" : "",
    ready ? "cc-ready" : "",
  ].filter(Boolean).join(" ");

  return (
    <HoverTooltip content={<ItemTooltip inst={inst} />}>
    <div className={cls}>
      {/* rarity stripe */}
      <div className={`cc-rarity-stripe rarity-${inst.rarity}`} />

      {/* primary stat badge (top-left) */}
      {stat && (
        <div className={`cc-stat cc-stat-${stat.kind}`}>
          {stat.icon && <span className="cc-stat-icon">{stat.icon}</span>}
          <span className="cc-stat-value">{stat.value}</span>
        </div>
      )}

      {/* art panel */}
      <div className="cc-art">
        <ItemArt defId={def.id} />
      </div>

      {/* name strip */}
      <div className="cc-name">{def.name}</div>

      {/* cooldown bar at the bottom */}
      <div className="cc-cd">
        <div className="cc-cd-fill" style={{ width: `${cooldownProgress * 100}%` }} />
      </div>

      {/* glow burst on trigger */}
      {triggered && <div className="cc-burst" />}
    </div>
    </HoverTooltip>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
type StatKind = "damage" | "shield" | "heal" | "burn" | "poison" | "regen" | "vamp" | "slow" | "fast";

function primaryStatFor(
  def: ReturnType<typeof itemById>,
  inst: { rarity: Rarity }
): { kind: StatKind; value: string | number; icon?: string } | null {
  // Pick the most defining keyword to show as the headline number.
  const k = def.keywords;
  if (k.includes("Damage")) return { kind: "damage", value: EFFECT_TABLE.Damage[inst.rarity] };
  if (k.includes("Shield")) return { kind: "shield", value: EFFECT_TABLE.Shield[inst.rarity] };
  if (k.includes("Healing") || k.includes("Overhealing")) {
    const v = k.includes("Overhealing") ? EFFECT_TABLE.Overhealing[inst.rarity] : EFFECT_TABLE.Healing[inst.rarity];
    return { kind: "heal", value: v };
  }
  if (k.includes("Burn"))   return { kind: "burn",   value: def.baseEffects.burnStacks ?? 1, icon: "🔥" };
  if (k.includes("Poison")) return { kind: "poison", value: def.baseEffects.poisonStacks ?? 1, icon: "☠" };
  if (k.includes("Regen"))  return { kind: "regen",  value: `${def.baseEffects.regenPerSec ?? 1}/s`, icon: "🌿" };
  if (k.includes("Vampirism")) return { kind: "vamp", value: "%", icon: "🩸" };
  if (k.includes("Slowing")) return { kind: "slow", value: "↯", icon: "⌛" };
  if (k.includes("Fasting")) return { kind: "fast", value: "↑", icon: "⚡" };
  return null;
}
