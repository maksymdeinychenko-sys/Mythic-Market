import React from "react";
import { useGameStore } from "@/store/gameStore";
import { ItemTile } from "./ItemTile";
import { REROLL_COST } from "@/core/shop";

interface Props {
  /** Mini shop variant: shows only first 2 offers, free reroll, no lock buttons. */
  mini?: boolean;
}

export function Shop({ mini = false }: Props) {
  const { shop, run, rerollShop, toggleShopLock, buyShopOffer, advance } = useGameStore();
  if (!shop || !run) return null;
  const visibleOffers = mini ? shop.offers.slice(0, 2) : shop.offers;
  const rerollCost = mini ? 0 : REROLL_COST;
  return (
    <div>
      <div className="h3">{mini ? "Wandering Trader" : "The Market"}</div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
        {mini
          ? "A modest selection. Free reroll. No locks."
          : `Click an offer to buy. Click 🔒 to lock (free). Reroll: ${REROLL_COST}🪙.`}
      </div>
      <div className="tile-strip">
        {visibleOffers.map((o, i) => (
          <div key={o.inst.uid} className={`shop-offer ${o.locked ? "locked" : ""}`}>
            <ItemTile inst={o.inst} small />
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              <button
                className="mm-btn gold"
                style={{ padding: "2px 6px", fontSize: 11, flex: 1 }}
                onClick={() => buyShopOffer(i)}
                disabled={run.gold < o.price}
              >
                {o.price}🪙
              </button>
              {!mini && (
                <button
                  className="mm-btn"
                  style={{ padding: "2px 6px", fontSize: 11 }}
                  onClick={() => toggleShopLock(i)}
                >
                  {o.locked ? "🔒" : "🔓"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button className="mm-btn" onClick={rerollShop} disabled={run.gold < rerollCost}>
          Reroll{rerollCost > 0 ? ` (${rerollCost}🪙)` : " (free)"}
        </button>
        <button className="mm-btn gold" onClick={advance}>Done shopping →</button>
      </div>
    </div>
  );
}
