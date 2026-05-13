import React, { useEffect, useState } from "react";
import { useGameStore, useRng } from "@/store/gameStore";
import { heroById } from "@/data/heroes";
import { matchmakeGhost, seedMockGhostsIfEmpty } from "@/core/ghost";
import type { GhostSnapshot } from "@/core/types";

/**
 * Phase 6 lobby. Used to auto-fire the fight on mount, which made Phase 6
 * feel like it ambushed the player. Now: silently runs matchmaking to show
 * a preview of the opponent, and waits for the player to click Begin Battle
 * before switching screens.
 */
export function GhostMatchPanel() {
  const { run, prepareGhost } = useGameStore();
  const rng = useRng();
  const [preview, setPreview] = useState<GhostSnapshot | null>(null);

  useEffect(() => {
    if (!run || run.phase !== 6) return;
    // Make sure there are seeded opponents to draw from.
    seedMockGhostsIfEmpty(rng, 30);
    const streak: "Win" | "Loss" | "Neutral" =
      run.pvpWinStreak >= 2 ? "Win" : run.pvpLossStreak >= 2 ? "Loss" : "Neutral";
    const g = matchmakeGhost(
      { day: run.day, level: run.level, streak },
      rng
    );
    setPreview(g);
  }, [run?.phase]);

  if (!run) return null;

  return (
    <div>
      <div className="h3">Phase 6 — Ghost PvP</div>
      {preview ? (
        <>
          <p className="muted" style={{ marginBottom: 8 }}>
            <strong>{heroById(preview.hero_id).name}</strong> Ghost · Lv {preview.hero_level} · {preview.inventory.length} items · {preview.max_hp} HP
          </p>
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            Take a moment to look over your loadout. The fight is automatic — there's no input during combat.
          </p>
        </>
      ) : (
        <p className="muted" style={{ marginBottom: 12 }}>
          No matching opponent — you'll receive a small consolation reward instead.
        </p>
      )}
      <button className="mm-btn gold" onClick={prepareGhost}>
        {preview ? "Begin Battle →" : "Continue →"}
      </button>
    </div>
  );
}
