import React from "react";
import { useGameStore } from "@/store/gameStore";

export function EndOfRun() {
  const { run, passesEarned, goto } = useGameStore();
  if (!run) return null;
  const survived = run.day - 1;
  const victory = run.day > 16;
  return (
    <div className="screen-pad" style={{ textAlign: "center", paddingTop: 64 }}>
      <h1 className="h1">{victory ? "VICTORY" : "RUN ENDED"}</h1>
      <p className="muted" style={{ marginBottom: 32 }}>
        Days survived: <strong>{survived}</strong>
      </p>
      <div className="phase-card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="h3">Run Stats</div>
        <p className="muted">Final Level: {run.level}</p>
        <p className="muted">Final Gold: {run.gold}</p>
        <p className="muted">Lives Remaining: {run.lives} / {run.maxLives}</p>
        <p className="muted">Items Owned: {run.battleInventory.length + run.stash.length}</p>
        <hr style={{ margin: "16px 0", border: 0, borderTop: "1px solid var(--border)" }} />
        <div className="h2">+{passesEarned} 🎟️ Pass{passesEarned === 1 ? "" : "es"}</div>
      </div>
      <div style={{ marginTop: 32 }}>
        <button className="mm-btn gold" onClick={() => goto("MainMenu")}>
          Return to Market
        </button>
      </div>
    </div>
  );
}
