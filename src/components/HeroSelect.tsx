import React from "react";
import { HEROES } from "@/data/heroes";
import { useGameStore } from "@/store/gameStore";
import { HeroArt } from "./HeroArt";

export function HeroSelect() {
  const { startRun, goto } = useGameStore();
  return (
    <div className="screen-pad">
      <h2 className="h2" style={{ textAlign: "center", marginBottom: 24 }}>Choose Your Hero</h2>
      <p className="muted" style={{ textAlign: "center", marginBottom: 32, fontSize: 13 }}>
        Each hero has a unique nature type. Items matching that type recharge faster as you level.
      </p>
      <div className="hero-grid">
        {HEROES.map((h) => (
          <div key={h.id} className={`hero-card ${h.natureType.toLowerCase()}`} onClick={() => startRun(h.id)}>
            <div className="hero-portrait">
              <HeroArt heroId={h.id} />
            </div>
            <div className="h2" style={{ marginBottom: 4 }}>{h.name}</div>
            <div className="muted" style={{ marginBottom: 14, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h.natureType}</div>
            <div style={{ fontWeight: 600, color: "var(--accent-amber)" }}>{h.passiveName}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>{h.passiveDescription}</p>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 40 }}>
        <button className="mm-btn" onClick={() => goto("MainMenu")}>← Back</button>
      </div>
    </div>
  );
}
