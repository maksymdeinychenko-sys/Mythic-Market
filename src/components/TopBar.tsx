import React from "react";
import { useGameStore } from "@/store/gameStore";
import { heroById } from "@/data/heroes";
import { xpToNext } from "@/core/progression";
import { HeroArt } from "./HeroArt";

export function TopBar() {
  const { run, totalPasses, screen } = useGameStore();
  if (!run) {
    return (
      <div className="top-bar">
        <div className="h2" style={{ marginBottom: 0 }}>Mythic Market</div>
        <div>
          <span className="stat-pill">🎟️ {totalPasses} Passes</span>
        </div>
      </div>
    );
  }
  const hero = heroById(run.heroId);
  return (
    <div className="top-bar">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="hero-portrait tiny" style={{ width: 36, height: 36 }}>
          <HeroArt heroId={hero.id} />
        </div>
        <div>
          <strong style={{ fontFamily: "var(--font-display)", fontSize: 16 }}>{hero.name}</strong>{" "}
          <span className="muted" style={{ fontSize: 12 }}>— Lv {run.level} ({run.xp}/{xpToNext(run.level)} XP)</span>
          <div className="muted" style={{ fontSize: 11, marginTop: 2, letterSpacing: "0.04em" }}>
            Day {run.day} / 16 · Phase {run.phase}
          </div>
        </div>
      </div>
      <div>
        <span className="stat-pill hp" title="Hearts — your run lives. Lose one per defeat. Run ends at zero.">
          ❤ {run.lives} / {run.maxLives}
        </span>
        <span className="stat-pill gold">⛀ {run.gold}</span>
        <span className="stat-pill">🎟 {totalPasses}</span>
      </div>
    </div>
  );
}
