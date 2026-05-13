/**
 * Rich item tooltip — shows every keyword's actual numeric value at the
 * item's current rarity, link bonus details, description, and a merge hint
 * when applicable. Designed to be the canonical way to read an item.
 */
import React from "react";
import type { ItemInstance, Rarity } from "@/core/types";
import { itemById } from "@/data/items";
import {
  EFFECT_TABLE, VAMPIRISM_PCT, SLOWING_SEC, FASTING_SEC, RECHARGE_SEC,
  BURN_TICK_DPS, POISON_TICK_DPS, REGEN_PER_SEC,
} from "@/data/scaling";

const RARITY_ORDER: Rarity[] = ["Wooden", "Bronze", "Silver", "Gold", "Diamond"];
function nextRarity(r: Rarity): Rarity | null {
  const idx = RARITY_ORDER.indexOf(r);
  return idx >= 0 && idx < RARITY_ORDER.length - 1 ? RARITY_ORDER[idx + 1] : null;
}

interface Props {
  inst: ItemInstance;
}

export function ItemTooltip({ inst }: Props) {
  const def = itemById(inst.defId);
  const next = nextRarity(inst.rarity);
  const canMergeUp = next && RARITY_ORDER.indexOf(next) <= RARITY_ORDER.indexOf(def.maxRarity);

  return (
    <div className="it-tip">
      {/* Header: name + rarity */}
      <div className="it-tip-header">
        <div className="it-tip-name">{def.name}</div>
        <div className={`it-tip-rarity rarity-${inst.rarity}`}>{inst.rarity}</div>
      </div>

      {/* Meta tags */}
      <div className="it-tip-meta">
        <span className={`it-tip-tag it-tip-tag-${def.natureType.toLowerCase()}`}>{def.natureType}</span>
        <span className="it-tip-tag">{def.size === 1 ? "Small" : def.size === 2 ? "Medium" : "Large"} {def.size}×1</span>
        {def.baseCooldown < 100 ? (
          <span className="it-tip-tag">⏱ {def.baseCooldown}s</span>
        ) : (
          <span className="it-tip-tag">Passive</span>
        )}
        {def.heavy && <span className="it-tip-tag heavy">Heavy</span>}
      </div>

      {/* Effects at current rarity */}
      <div className="it-tip-effects">
        {def.keywords.includes("Damage") && (
          <Row icon="⚔" color="damage" label="Damage" value={`${EFFECT_TABLE.Damage[inst.rarity]}`} />
        )}
        {def.keywords.includes("Shield") && (
          <Row icon="⛨" color="shield" label="Shield" value={`${EFFECT_TABLE.Shield[inst.rarity]}`} />
        )}
        {def.keywords.includes("Healing") && (
          <Row icon="✚" color="heal" label="Healing" value={`${EFFECT_TABLE.Healing[inst.rarity]} HP`} />
        )}
        {def.keywords.includes("Overhealing") && (
          <Row icon="✚" color="heal" label="Overheal" value={`${EFFECT_TABLE.Overhealing[inst.rarity]} HP (cap 2× max)`} />
        )}
        {def.keywords.includes("Vampirism") && (
          <Row icon="🩸" color="vamp" label="Vampirism" value={`${VAMPIRISM_PCT[inst.rarity]}% of damage → HP`} />
        )}
        {def.keywords.includes("Slowing") && (
          <Row icon="⌛" color="slow" label="Slow" value={`+${SLOWING_SEC[inst.rarity].toFixed(1)}s to enemy CD`} />
        )}
        {def.keywords.includes("Recharge") && (
          <Row icon="↻" color="recharge" label="Recharge" value={`-${RECHARGE_SEC[inst.rarity].toFixed(1)}s instantly`} />
        )}
        {def.keywords.includes("Fasting") && (
          <Row icon="⚡" color="fast" label="Fasting" value={`2× speed for ${FASTING_SEC[inst.rarity].toFixed(1)}s`} />
        )}
        {def.keywords.includes("Burn") && (
          <Row
            icon="🔥"
            color="burn"
            label="Burn"
            value={`+${def.baseEffects.burnStacks ?? 1} stacks  (~${(def.baseEffects.burnStacks ?? 1) * BURN_TICK_DPS.Bronze} dmg/sec, hits shield first)`}
          />
        )}
        {def.keywords.includes("Poison") && (
          <Row
            icon="☠"
            color="poison"
            label="Poison"
            value={`+${def.baseEffects.poisonStacks ?? 1} stacks  (~${(def.baseEffects.poisonStacks ?? 1) * POISON_TICK_DPS.Bronze} dmg/2sec, ignores shield)`}
          />
        )}
        {def.keywords.includes("Regen") && (
          <Row
            icon="🌿"
            color="regen"
            label="Regen"
            value={`+${REGEN_PER_SEC[inst.rarity]} HP/sec  (passive while equipped)`}
          />
        )}
      </div>

      {/* Link bonus */}
      {def.link && def.link.direction !== "None" && (
        <div className="it-tip-link">
          <strong>{linkLabel(def.link.direction)}</strong>: {linkSummary(def.link)}
        </div>
      )}

      {/* Description */}
      {def.description && (
        <div className="it-tip-desc">"{def.description}"</div>
      )}

      {/* Merge hint */}
      {canMergeUp && next && (
        <div className="it-tip-merge">
          Merge two to upgrade to <span className={`rarity-${next}`}>{next}</span>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function Row({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <div className={`it-tip-row it-tip-row-${color}`}>
      <span className="it-tip-row-icon">{icon}</span>
      <span className="it-tip-row-label">{label}</span>
      <span className="it-tip-row-value">{value}</span>
    </div>
  );
}

function linkLabel(d: string): string {
  if (d === "Left") return "Left ←";
  if (d === "Right") return "Right →";
  if (d === "Both") return "Both ↔";
  if (d === "Global") return "Global ✦";
  return d;
}

function linkSummary(l: NonNullable<ReturnType<typeof itemById>["link"]>): string {
  const parts: string[] = [];
  if (l.damage) parts.push(`+${l.damage} damage`);
  if (l.shield) parts.push(`+${l.shield} shield`);
  if (l.healingPct) parts.push(`+${l.healingPct}% healing`);
  if (l.vampirismPct) parts.push(`+${l.vampirismPct}% vampirism`);
  if (l.cooldownReductionPct) parts.push(`-${l.cooldownReductionPct}% CD`);
  if (l.globalTarget) parts.push(`(to all ${l.globalTarget} items)`);
  return parts.join(", ") || "—";
}
