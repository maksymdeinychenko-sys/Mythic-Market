import React from "react";
import { useGameStore } from "@/store/gameStore";
import { PHASE_DESCRIPTIONS } from "@/core/runState";

export function DayHub() {
  const { run, goto } = useGameStore();
  if (!run) return null;
  const phaseInfo = PHASE_DESCRIPTIONS[run.phase];

  return (
    <div className="screen-pad">
      <div className="day-hub-path">
        {Array.from({ length: 16 }, (_, i) => i + 1).map((d) => (
          <React.Fragment key={d}>
            <div
              className={`day-node ${d < run.day ? "completed" : d === run.day ? "current" : ""}`}
            >
              {d}
            </div>
            {d < 16 && <div className="day-path-edge" />}
          </React.Fragment>
        ))}
      </div>

      <div className="phase-card">
        <div className="h2">{phaseInfo.title}</div>
        <p className="muted" style={{ marginBottom: 24 }}>{phaseInfo.subtitle}</p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="mm-btn" onClick={() => goto("Workshop")}>
            Enter Workshop →
          </button>
        </div>
        <p className="muted" style={{ marginTop: 24, fontSize: 12 }}>
          (In the Workshop you'll resolve this phase: pick events, visit the trader, fight, or face a Ghost.)
        </p>
      </div>
    </div>
  );
}
