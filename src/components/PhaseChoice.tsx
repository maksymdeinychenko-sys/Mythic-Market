import React from "react";
import { useGameStore } from "@/store/gameStore";
import type { PhaseBranch } from "@/core/types";
import { setPhaseChoice } from "@/core/runState";

interface BranchCardProps {
  icon: string;
  title: string;
  description: string;
  onPick: () => void;
}

function BranchCard({ icon, title, description, onPick }: BranchCardProps) {
  return (
    <div className="diff-card" onClick={onPick}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>{icon}</div>
      <div className="h2">{title}</div>
      <p className="muted" style={{ fontSize: 13 }}>{description}</p>
    </div>
  );
}

interface Props { phase: 2 | 4 | 5 }

/**
 * The doc's intended Phase 2 / 4 / 5 branching:
 *  - Phase 2: Find (event) vs Trader (mini-shop, free reroll, fewer offers)
 *  - Phase 4: Find (richer event) vs Trader (full shop)
 *  - Phase 5: Trader (full shop) vs PvE (extra fight, higher stakes)
 */
export function PhaseChoice({ phase }: Props) {
  const { run, applyRunStateUpdate } = useGameStore();
  if (!run) return null;

  function pick(branch: PhaseBranch) {
    applyRunStateUpdate((rs) => setPhaseChoice(rs, phase, branch));
  }

  let cards: BranchCardProps[] = [];
  let title = "";
  if (phase === 2) {
    title = "Phase 2 — Choose your path";
    cards = [
      { icon: "🔍", title: "Find", description: "Random discovery: small gold cache or item find.", onPick: () => pick("Find") },
      { icon: "🛒", title: "Trader", description: "Mini-shop: 2 random items at a small discount, no reroll cost.", onPick: () => pick("Trader") },
    ];
  } else if (phase === 4) {
    title = "Phase 4 — Strategy shift";
    cards = [
      { icon: "🌲", title: "Find", description: "Richer event: blessing, curse, or rare item.", onPick: () => pick("Find") },
      { icon: "💰", title: "Trader (Market)", description: "Open the full Market: 4 items + 1 utility, reroll for 1g, free locks.", onPick: () => pick("Trader") },
    ];
  } else {
    title = "Phase 5 — Final preparation";
    cards = [
      { icon: "💰", title: "Trader (Market)", description: "Open the full Market for last-minute synergy fishing.", onPick: () => pick("Trader") },
      { icon: "⚔️", title: "Extra PvE", description: "Take an additional fight for bonus gold + XP. Risk extra HP damage if you lose.", onPick: () => pick("PvE") },
    ];
  }

  return (
    <div>
      <div className="h3">{title}</div>
      <div className="diff-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {cards.map((c) => <BranchCard key={c.title} {...c} />)}
      </div>
    </div>
  );
}
