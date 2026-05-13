import React, { useState } from "react";
import { useGameStore, useRng } from "@/store/gameStore";
import { randomEvent, type EventDef } from "@/data/events";

export function PhaseEventBox() {
  const { run, advance, applyRunStateUpdate } = useGameStore();
  const rng = useRng();
  const [event, setEvent] = useState<EventDef | null>(() => randomEvent(rng, run?.phase === 1 ? "Find" : undefined));
  const [resolved, setResolved] = useState(false);

  if (!run || !event) return null;

  function applyChoice(choiceId: string) {
    const choice = event!.choices.find((c) => c.id === choiceId);
    if (!choice) return;
    applyRunStateUpdate((rs) => choice.apply(rs, rng));
    setResolved(true);
  }

  return (
    <div>
      <div className="h3">{event.title}</div>
      <p className="muted" style={{ marginBottom: 12 }}>{event.description}</p>
      {!resolved ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {event.choices.map((c) => (
            <button key={c.id} className="mm-btn" onClick={() => applyChoice(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <button className="mm-btn gold" onClick={advance}>Continue →</button>
      )}
    </div>
  );
}
