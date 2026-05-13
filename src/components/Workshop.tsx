import React, { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { ItemTile } from "./ItemTile";
import { itemById } from "@/data/items";
import { buildGrid, BATTLE_SLOTS } from "@/core/inventory";
import { slotsForRun } from "@/core/progression";
import { Shop } from "./Shop";
import { PhaseEventBox } from "./PhaseEventBox";
import { DifficultyPicker } from "./DifficultyPicker";
import { GhostMatchPanel } from "./GhostMatchPanel";
import { PhaseChoice } from "./PhaseChoice";
import { StashDrawer } from "./StashDrawer";

type DragSource = { kind: "stash" | "battle"; uid: string };

export function Workshop() {
  const { run, shop, openShop, closeShop, placeStashInSlot, unplaceFromBattle, mergeBattle, mergeStashToBattle, sellStash, advance, goto } = useGameStore();
  const [drag, setDrag] = useState<DragSource | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);

  const choosablePhase = run && (run.phase === 2 || run.phase === 4 || run.phase === 5) ? (run.phase as 2 | 4 | 5) : null;
  const phaseChoices = run?.phaseChoices ?? {};
  const branchPicked = choosablePhase ? phaseChoices[choosablePhase] : undefined;

  // Open/close the shop based on the active branch
  useEffect(() => {
    if (!run) return;
    const choices = run.phaseChoices ?? {};
    const wantsShop =
      (run.phase === 2 && choices[2] === "Trader") ||
      (run.phase === 4 && choices[4] === "Trader") ||
      (run.phase === 5 && choices[5] === "Trader");
    if (wantsShop && !shop) openShop();
    if (!wantsShop && shop) closeShop();
  }, [run?.phase, phaseChoices[2], phaseChoices[4], phaseChoices[5]]);

  if (!run) return null;
  const grid = buildGrid(run.battleInventory);

  function dragStart(src: DragSource) {
    return (e: React.DragEvent) => {
      setDrag(src);
      e.dataTransfer.setData("text/plain", JSON.stringify(src));
      e.dataTransfer.effectAllowed = "move";
    };
  }

  function handleSlotDrop(slotIdx: number) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      setHoverSlot(null);
      if (!drag) return;
      const targetItem = grid[slotIdx];

      if (targetItem) {
        // Try merge
        if (drag.kind === "battle") mergeBattle(drag.uid, targetItem.uid);
        else mergeStashToBattle(drag.uid, targetItem.uid);
      } else {
        if (drag.kind === "stash") placeStashInSlot(drag.uid, slotIdx);
        if (drag.kind === "battle") {
          unplaceFromBattle(drag.uid);
          // small UX: re-place at target slot next tick is messy; for prototype just unplace.
          setTimeout(() => placeStashInSlot(drag.uid, slotIdx), 0);
        }
      }
      setDrag(null);
    };
  }

  return (
    <div className="workshop screen-pad">
      <div className="opponent-preview">
        <div className="h3">Battle Inventory ({run.battleInventory.length} items)</div>
        <div className="muted" style={{ fontSize: 12 }}>
          Drag from Stash to a slot. Drop on an identical item to merge. Double-click in battle to send to stash.
        </div>
      </div>

      <div className="battle-grid">
        {Array.from({ length: BATTLE_SLOTS }, (_, i) => {
          const occupant = grid[i];
          const slotsAvailable = slotsForRun(run);
          const isLocked = i >= slotsAvailable;
          // Render a tile only at its left edge so wide items render once.
          const isLeftEdge = occupant && (i === 0 || grid[i - 1]?.uid !== occupant.uid);
          if (occupant && !isLeftEdge) return null;
          return (
            <div
              key={i}
              className={`grid-slot ${hoverSlot === i ? "dragover" : ""} ${isLocked ? "locked" : ""}`}
              onDragOver={(e) => { if (!isLocked) { e.preventDefault(); setHoverSlot(i); } }}
              onDragLeave={() => setHoverSlot(null)}
              onDrop={isLocked ? undefined : handleSlotDrop(i)}
              style={occupant ? {
                gridColumn: `span ${itemById(occupant.defId).size}`,
                aspectRatio: `${itemById(occupant.defId).size} / 1`,
              } : undefined}
              title={isLocked ? `Unlocks at level ${unlockLevelForSlot(i)}` : undefined}
            >
              {occupant ? (
                <ItemTile
                  inst={occupant}
                  draggable={!isLocked}
                  onDragStart={dragStart({ kind: "battle", uid: occupant.uid })}
                  onClick={() => {}}
                />
              ) : isLocked ? (
                <span className="muted" style={{ fontSize: 11 }}>🔒 Lv {unlockLevelForSlot(i)}</span>
              ) : (
                <span className="muted" style={{ fontSize: 11 }}>{i + 1}</span>
              )}
            </div>
          );
        }).filter(Boolean)}
      </div>

      {/* Phase-specific zone */}
      <div className="stash-shop-zone">
        {/* Phase 1: always a Find event */}
        {run.phase === 1 && <PhaseEventBox />}

        {/* Phase 2/4/5: choice node, then branch sub-flow */}
        {choosablePhase && !branchPicked && <PhaseChoice phase={choosablePhase} />}
        {choosablePhase === 2 && branchPicked === "Find" && <PhaseEventBox />}
        {choosablePhase === 2 && branchPicked === "Trader" && <Shop mini />}
        {choosablePhase === 4 && branchPicked === "Find" && <PhaseEventBox />}
        {choosablePhase === 4 && branchPicked === "Trader" && <Shop />}
        {choosablePhase === 5 && branchPicked === "Trader" && <Shop />}
        {choosablePhase === 5 && branchPicked === "PvE" && <DifficultyPicker />}

        {/* Phase 3: always PvE */}
        {run.phase === 3 && <DifficultyPicker />}

        {/* Phase 6: always Ghost PvP */}
        {run.phase === 6 && <GhostMatchPanel />}

        <StashDrawer onDragStart={dragStart} />
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button className="mm-btn" onClick={() => goto("DayHub")}>← Day Hub</button>
      </div>
    </div>
  );
}

/**
 * Per the SLOTS_BY_LEVEL table: 3 slots at L1-2, 4 at L3-4, 5 at L5-6, etc.
 * Slot indices 0-2 unlock at L1, 3 at L3, 4 at L5, 5 at L7, 6 at L9, 7 at L11.
 */
function unlockLevelForSlot(idx: number): number {
  if (idx <= 2) return 1;
  return 1 + (idx - 2) * 2;
}
