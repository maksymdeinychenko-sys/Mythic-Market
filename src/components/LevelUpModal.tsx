import React, { useMemo } from "react";
import { useGameStore, useRng } from "@/store/gameStore";
import { rollPerkChoices, type PerkDef } from "@/data/perks";

/**
 * Shown over the workshop whenever pendingPerkChoices > 0. Locks input until
 * the player picks. Choices are rolled once per pending count so re-rendering
 * doesn't shuffle the displayed options under them.
 */
export function LevelUpModal() {
  const { run, pickPerk, screen } = useGameStore();
  const rng = useRng();
  // Seed choices from the run state so re-render doesn't reshuffle.
  const seed = run ? `${run.level}-${run.pendingPerkChoices}` : "0";
  const choices: PerkDef[] = useMemo(
    () => (run ? rollPerkChoices(rng, run.perks, 3) : []),
    [seed]
  );

  if (!run || run.pendingPerkChoices <= 0) return null;
  // Defer the perk picker until the player is back on a non-combat screen so
  // it can't overlap an in-progress combat playback. Combat ends → Continue
  // → screen becomes Workshop → modal appears.
  if (screen === "Combat") return null;

  return (
    <div className="lvlup-overlay">
      <div className="lvlup-card">
        <div className="lvlup-banner">⭐ LEVEL {run.level} ⭐</div>
        <div className="muted" style={{ marginBottom: 16 }}>
          Choose a perk. {run.pendingPerkChoices > 1 && (
            <strong>{run.pendingPerkChoices - 1} more after this.</strong>
          )}
        </div>
        <div className="lvlup-choices">
          {choices.map((p) => (
            <button
              key={p.id}
              className="lvlup-choice"
              onClick={() => pickPerk(p.id)}
            >
              <div className="lvlup-icon">{p.icon}</div>
              <div className="lvlup-name">{p.name}</div>
              <div className="lvlup-desc">{p.description}</div>
              {p.stackable && <div className="lvlup-stack">stackable</div>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
