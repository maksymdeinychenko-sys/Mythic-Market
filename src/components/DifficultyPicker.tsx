import React from "react";
import { useGameStore } from "@/store/gameStore";
import { PVE_REWARD } from "@/data/scaling";

export function DifficultyPicker() {
  const { prepareEncounter, advance } = useGameStore();
  return (
    <div>
      <div className="h3">PvE Battle — Pick a difficulty</div>
      <div className="diff-grid">
        <div className="diff-card easy" onClick={() => prepareEncounter("Easy")}>
          <div className="h2">Easy</div>
          <p className="muted">Reward: {PVE_REWARD.Easy.gold}🪙 / {PVE_REWARD.Easy.xp} XP</p>
        </div>
        <div className="diff-card hard" onClick={() => prepareEncounter("Hard")}>
          <div className="h2">Hard</div>
          <p className="muted">Reward: {PVE_REWARD.Hard.gold}🪙 / {PVE_REWARD.Hard.xp} XP</p>
        </div>
        <div className="diff-card super" onClick={() => prepareEncounter("SuperHard")}>
          <div className="h2">Super Hard</div>
          <p className="muted">Reward: {PVE_REWARD.SuperHard.gold}🪙 / {PVE_REWARD.SuperHard.xp} XP</p>
        </div>
      </div>
      <button className="mm-btn" style={{ marginTop: 16 }} onClick={advance}>Skip this fight →</button>
    </div>
  );
}
