import React, { useMemo, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { ItemTile } from "./ItemTile";
import { itemById } from "@/data/items";
import { STASH_CAP } from "@/core/inventory";
import { RARITY_INDEX } from "@/core/types";
import type { ItemInstance, NatureType } from "@/core/types";

type Filter = "All" | NatureType;
type Sort = "Recent" | "Rarity" | "CD" | "Name";

interface Props {
  onDragStart: (src: { kind: "stash" | "battle"; uid: string }) => (e: React.DragEvent) => void;
}

export function StashDrawer({ onDragStart }: Props) {
  const { run, sellStash, mergeStashToStash, mergeBattleToStash, unplaceFromBattle } = useGameStore();
  const [filter, setFilter] = useState<Filter>("All");
  const [sort, setSort] = useState<Sort>("Recent");
  const [stripDragOver, setStripDragOver] = useState(false);

  /** Drop on a specific stash tile — try to merge with it. */
  function onDropOnStashItem(targetUid: string) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const raw = e.dataTransfer.getData("text/plain");
        if (!raw) return;
        const src = JSON.parse(raw) as { kind: "stash" | "battle"; uid: string };
        if (src.kind === "stash" && src.uid !== targetUid) {
          mergeStashToStash(src.uid, targetUid);
        } else if (src.kind === "battle") {
          // Battle item dropped on a stash item — merge if same, else
          // just unequip and let it sit next to the target.
          const beforeBattle = run!.battleInventory.length;
          mergeBattleToStash(src.uid, targetUid);
          // mergeBattleToStash is a no-op when types don't match; in that
          // case fall back to plain unequip so the drop isn't lost.
          if (run!.battleInventory.length === beforeBattle) {
            unplaceFromBattle(src.uid);
          }
        }
      } catch {}
    };
  }

  /** Drop on the strip background — unequip a battle item to the stash. */
  function onDropOnStashStrip(e: React.DragEvent) {
    e.preventDefault();
    setStripDragOver(false);
    try {
      const raw = e.dataTransfer.getData("text/plain");
      if (!raw) return;
      const src = JSON.parse(raw) as { kind: "stash" | "battle"; uid: string };
      if (src.kind === "battle") unplaceFromBattle(src.uid);
    } catch {}
  }

  const filtered: ItemInstance[] = useMemo(() => {
    if (!run) return [];
    let xs = [...run.stash];
    if (filter !== "All") xs = xs.filter((i) => itemById(i.defId).natureType === filter);
    if (sort === "Rarity") xs.sort((a, b) => RARITY_INDEX[b.rarity] - RARITY_INDEX[a.rarity]);
    else if (sort === "CD") xs.sort((a, b) => itemById(a.defId).baseCooldown - itemById(b.defId).baseCooldown);
    else if (sort === "Name") xs.sort((a, b) => itemById(a.defId).name.localeCompare(itemById(b.defId).name));
    // "Recent" = original insertion order — no sort
    return xs;
  }, [run?.stash, filter, sort]);

  if (!run) return null;
  const count = run.stash.length;
  const isFull = count >= STASH_CAP;
  const isWarning = count >= STASH_CAP - 3;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="h3" style={{ marginBottom: 0 }}>
          Stash{" "}
          <span className={isFull ? "rarity-Diamond" : isWarning ? "rarity-Gold" : ""} style={{ fontWeight: 400 }}>
            ({count}/{STASH_CAP})
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(["All", "Beast", "Fish", "Plant", "Universal"] as Filter[]).map((f) => (
            <button
              key={f}
              className="mm-btn"
              style={{
                padding: "4px 8px",
                fontSize: 11,
                background: filter === f ? "var(--accent-mystic)" : undefined,
              }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 11,
            }}
          >
            <option value="Recent">Sort: Recent</option>
            <option value="Rarity">Sort: Rarity</option>
            <option value="CD">Sort: CD</option>
            <option value="Name">Sort: Name</option>
          </select>
        </div>
      </div>

      {isFull && (
        <div style={{
          background: "rgba(214, 96, 77, 0.15)",
          border: "1px solid var(--hp)",
          borderRadius: 6,
          padding: "8px 12px",
          marginBottom: 8,
          fontSize: 12,
        }}>
          ⚠️ Stash is full. New items you'd find will be lost — sell something to make room.
        </div>
      )}

      <div
        className={`tile-strip stash-strip ${stripDragOver ? "drop-target" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setStripDragOver(true); }}
        onDragLeave={(e) => {
          // Only clear when leaving the strip itself, not a child.
          if (e.currentTarget === e.target) setStripDragOver(false);
        }}
        onDrop={onDropOnStashStrip}
      >
        {filtered.map((it) => (
          <div key={it.uid} style={{ position: "relative" }}>
            <ItemTile
              inst={it}
              draggable
              onDragStart={onDragStart({ kind: "stash", uid: it.uid })}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDropOnStashItem(it.uid)}
              onSell={() => sellStash(it.uid)}
              small
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <span className="muted">
            {count === 0
              ? "Empty stash. Drop a battle item here to unequip it."
              : "No items match this filter."}
          </span>
        )}
      </div>
    </div>
  );
}
