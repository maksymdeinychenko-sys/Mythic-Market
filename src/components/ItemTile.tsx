import React from "react";
import type { ItemInstance } from "@/core/types";
import { itemById } from "@/data/items";
import { effectiveLinkDir } from "@/core/inventory";
import { sellPrice } from "@/core/shop";
import { ItemArt } from "./ItemArt";
import { HoverTooltip } from "./HoverTooltip";
import { ItemTooltip } from "./ItemTooltip";

interface Props {
  inst: ItemInstance;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onClick?: () => void;
  /** Double-click handler — used to unequip battle items into the stash. */
  onDoubleClick?: () => void;
  /** Hover-revealed sell button; pass a handler to enable. */
  onSell?: () => void;
  small?: boolean;
}

export function ItemTile({ inst, draggable = false, onDragStart, onDragOver, onDragLeave, onDrop, onClick, onDoubleClick, onSell, small }: Props) {
  const def = itemById(inst.defId);
  const dir = effectiveLinkDir(inst);
  const sizeClass = def.size === 2 ? "size-2" : def.size === 3 ? "size-3" : "";
  const natureClass = def.natureType.toLowerCase();

  return (
    <HoverTooltip content={<ItemTooltip inst={inst} />}>
      <div
        className={`item-tile ${natureClass} ${sizeClass}`}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        data-uid={inst.uid}
      >
        <div className="item-art"><ItemArt defId={def.id} /></div>
        {!small && <div className="item-name">{def.name}</div>}
        <div className={`item-rarity rarity-${inst.rarity}`}>{inst.rarity}</div>
        {dir === "Left" && <div className="link-arrow left">←</div>}
        {dir === "Right" && <div className="link-arrow right">→</div>}
        {dir === "Both" && <div className="link-arrow both">↔</div>}
        {onSell && (
          <button
            className="item-tile-sell"
            // stopPropagation prevents the click from also triggering drag.
            onClick={(e) => { e.stopPropagation(); onSell(); }}
            onMouseDown={(e) => e.stopPropagation()}
            title={`Sell for ${sellPrice(inst.rarity)} gold`}
            aria-label={`Sell for ${sellPrice(inst.rarity)} gold`}
          >
            {sellPrice(inst.rarity)}
          </button>
        )}
      </div>
    </HoverTooltip>
  );
}
