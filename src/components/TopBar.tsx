import React from "react";
import { useGameStore } from "@/store/gameStore";
import { heroById } from "@/data/heroes";
import { xpToNext } from "@/core/progression";
import { HeroArt } from "./HeroArt";

export function TopBar() {
  const { run, totalPasses, screen, audioMuted, toggleAudioMute, abandonRun } = useGameStore();

  function giveUp() {
    if (confirm("Give up this run and return to the main menu? Your progress will be lost.")) {
      abandonRun();
    }
  }

  // ─── Idle state (no run) ────────────────────────────────────────────────
  if (!run) {
    return (
      <div className="top-bar">
        <div className="h2" style={{ marginBottom: 0 }}>Mythic Market</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="stat-pill">🎟️ {totalPasses} Passes</span>
          <button
            className="topbar-icon-btn"
            onClick={toggleAudioMute}
            title={audioMuted ? "Unmute sound" : "Mute sound"}
            aria-label={audioMuted ? "Unmute sound" : "Mute sound"}
          >
            {audioMuted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>
    );
  }

  // ─── In-run state ───────────────────────────────────────────────────────
  const hero = heroById(run.heroId);
  // Hide destructive buttons during Combat so they can't be mis-clicked mid-fight.
  const canGiveUp = screen !== "Combat";

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
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span className="stat-pill hp" title="Hearts — your run lives. Lose one per defeat. Run ends at zero.">
          ❤ {run.lives} / {run.maxLives}
        </span>
        <span className="stat-pill gold">⛀ {run.gold}</span>
        <span className="stat-pill">🎟 {totalPasses}</span>
        <button
          className="topbar-icon-btn"
          onClick={toggleAudioMute}
          title={audioMuted ? "Unmute sound" : "Mute sound"}
          aria-label={audioMuted ? "Unmute sound" : "Mute sound"}
        >
          {audioMuted ? "🔇" : "🔊"}
        </button>
        {canGiveUp && (
          <button
            className="topbar-icon-btn danger"
            onClick={giveUp}
            title="Give up this run and return to the main menu"
          >
            Give Up
          </button>
        )}
      </div>
    </div>
  );
}
