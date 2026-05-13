import React from "react";
import { useGameStore } from "@/store/gameStore";
import { heroById } from "@/data/heroes";
import { HeroArt } from "./HeroArt";

export function MainMenu() {
  const { goto, totalPasses, run, abandonRun } = useGameStore();
  const hasSave = run !== null;
  const savedHero = hasSave ? heroById(run!.heroId) : null;

  function continueRun() {
    // Send the player back to wherever they were. Default to DayHub if the
    // saved screen was MainMenu (shouldn't happen) or EndOfRun (already done).
    const cur = useGameStore.getState().screen;
    if (cur === "MainMenu" || cur === "EndOfRun" || cur === "HeroSelect") {
      goto("DayHub");
    }
  }

  function abandonAndConfirm() {
    if (confirm("Abandon current run? You'll lose all progress on this attempt.")) {
      abandonRun();
    }
  }

  function fullReset() {
    if (!confirm("Wipe ALL save data, passes, and ghosts? This is irreversible.")) return;
    try {
      localStorage.removeItem("mythic-market-state-v1");
      localStorage.removeItem("mm_ghosts_v1");
    } catch {}
    location.reload();
  }

  return (
    <div className="screen-pad">
      <div style={{ textAlign: "center", marginTop: 56, marginBottom: 48 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.4em", color: "var(--accent-amber)", textTransform: "uppercase", marginBottom: 12 }}>
          ✦ ✦ ✦
        </div>
        <h1 className="h1" style={{ fontSize: 48, marginBottom: 8 }}>Mythic Market</h1>
        <p className="muted" style={{ fontSize: 14, fontStyle: "italic" }}>
          An asynchronous roguelike auto-battler.
        </p>
      </div>

      {hasSave && (
        <div className="phase-card" style={{ maxWidth: 720, margin: "0 auto 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div className="hero-portrait small">
                <HeroArt heroId={savedHero!.id} />
              </div>
              <div>
                <div className="h3" style={{ marginBottom: 6 }}>Continue Run</div>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  {savedHero!.name} — Day {run!.day} / 16, Lv {run!.level}
                </p>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  ❤ {run!.lives ?? 10}/{run!.maxLives ?? 10} Hearts · ⛀ {run!.gold}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="mm-btn gold" onClick={continueRun}>Continue →</button>
              <button className="mm-btn danger" onClick={abandonAndConfirm}>Abandon</button>
            </div>
          </div>
        </div>
      )}

      <div className="menu-card-grid" style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="menu-card" onClick={() => goto("HeroSelect")}>
          <div className="big-icon">❀</div>
          <div className="h2">{hasSave ? "New Run" : "Free Mode"}</div>
          <p className="muted">
            Earn Passes. <br />
            8 / 10 / 13 / 16 days survived = 1 / 2 / 3 / 4 Passes.
          </p>
        </div>
        <div className="menu-card" style={{ opacity: totalPasses > 0 ? 1 : 0.5 }} onClick={() => totalPasses > 0 && goto("HeroSelect")}>
          <div className="big-icon">◈</div>
          <div className="h2">Paid Mode</div>
          <p className="muted">
            Costs 1 Pass per run. <br />
            You have <strong>{totalPasses}</strong> Pass{totalPasses === 1 ? "" : "es"}.
          </p>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 48 }}>
        <button
          onClick={fullReset}
          style={{
            background: "transparent",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "6px 14px",
            fontSize: 11,
            cursor: "pointer",
            opacity: 0.6,
          }}
          title="Wipe all save data and ghosts. Use if the game is in a bad state."
        >
          Reset everything
        </button>
      </div>
    </div>
  );
}
