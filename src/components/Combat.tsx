/**
 * Real-time combat playback.
 *
 * 1. The store has already pre-computed the full event log via
 *    `simulateCombat()`. We don't recompute — we just animate the result.
 * 2. A scheduler advances `playbackTime` over real wall time. At each tick we
 *    apply every event whose `t` has passed since the last frame.
 * 3. Visual state (HP, shield, floating damage numbers, item-trigger shakes,
 *    per-item CD progress) is derived from the event log up to playbackTime.
 *
 * Inspired by The Bazaar: items have CD bars that fill, trigger, reset; HP
 * drains visibly; a Sandstorm kicks in at 30s to guarantee a winner.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { itemById } from "@/data/items";
import { heroById } from "@/data/heroes";
import { HeroArt } from "./HeroArt";
import { CombatCard } from "./CombatCard";
import type { CombatEvent, CombatResult } from "@/core/combat";
import type { ItemInstance } from "@/core/types";

interface FloatNum {
  id: number;
  side: "P" | "E";
  text: string;
  color: string;
}

const TICK_MS = 50; // playback resolution
const SANDSTORM_START = 30;

export function Combat() {
  const {
    run, currentEncounter, lastGhost, lastCombat,
    resolveEncounter, resolveGhost, advance, goto,
  } = useGameStore();

  const [playbackTime, setPlaybackTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const [shaken, setShaken] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);
  // Per-side timestamps of recent FX events (used for avatar reactions).
  const [fxTimes, setFxTimes] = useState<{
    P: { dmg?: number; heal?: number; shield?: number; burn?: number; poison?: number };
    E: { dmg?: number; heal?: number; shield?: number; burn?: number; poison?: number };
  }>({ P: {}, E: {} });

  const lastTRef = useRef(0);
  const floatIdRef = useRef(0);
  // Emergency-escape: if combat hasn't resolved within 3s, show a skip button
  // so the player isn't held hostage by a stuck "Preparing combat..." state.
  const [stuckEscape, setStuckEscape] = useState(false);

  // Resolve combat once on mount (idempotent — store handles updates atomically)
  useEffect(() => {
    if (!lastCombat) {
      if (currentEncounter) resolveEncounter();
      else if (lastGhost !== null) resolveGhost();
      else if (run?.phase === 6) {
        // We're on Combat screen for Phase 6 but no ghost was prepared.
        // Bail back to Workshop and let the lobby handle matchmaking.
        goto("Workshop");
      }
    }
    const t = window.setTimeout(() => setStuckEscape(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Playback scheduler
  useEffect(() => {
    if (!lastCombat || done) return;
    let raf: number | null = null;
    let last = performance.now();
    function loop(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      if (!paused) {
        setPlaybackTime((t) => {
          const next = t + dt * speed;
          if (next >= lastCombat!.duration) {
            setDone(true);
            return lastCombat!.duration;
          }
          return next;
        });
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => { if (raf !== null) cancelAnimationFrame(raf); };
  }, [lastCombat, speed, paused, done]);

  // Apply events that have passed since the last frame
  useEffect(() => {
    if (!lastCombat) return;
    const prev = lastTRef.current;
    const cur = playbackTime;
    if (cur < prev) { lastTRef.current = cur; return; }

    for (const ev of lastCombat.events) {
      if (ev.t < prev || ev.t > cur) continue;
      handleEvent(ev);
    }
    lastTRef.current = cur;
  }, [playbackTime, lastCombat]);

  function handleEvent(ev: CombatEvent) {
    if (ev.kind === "trigger") {
      setShaken((s) => ({ ...s, [ev.itemUid]: Date.now() }));
    } else if (ev.kind === "damage" && ev.amount > 0) {
      pushFloat(ev.targetSide, `-${Math.round(ev.amount)}`, "var(--hp)");
      setFxTimes((s) => ({ ...s, [ev.targetSide]: { ...s[ev.targetSide], dmg: ev.t } }));
    } else if (ev.kind === "heal" && ev.amount > 0) {
      pushFloat(ev.side, `+${Math.round(ev.amount)}`, "var(--plant)");
      setFxTimes((s) => ({ ...s, [ev.side]: { ...s[ev.side], heal: ev.t } }));
    } else if (ev.kind === "shield" && ev.amount > 0) {
      pushFloat(ev.side, `+${ev.amount}🛡`, "var(--shield)");
      setFxTimes((s) => ({ ...s, [ev.side]: { ...s[ev.side], shield: ev.t } }));
    } else if (ev.kind === "sandstorm-tick") {
      pushFloat(ev.targetSide, `-${ev.amount}🌪`, "#e5b675");
      setFxTimes((s) => ({ ...s, [ev.targetSide]: { ...s[ev.targetSide], dmg: ev.t } }));
    } else if (ev.kind === "slow") {
      pushFloat(ev.side === "P" ? "E" : "P", `slow +${ev.amount.toFixed(1)}s`, "var(--fish)");
    } else if (ev.kind === "burn-tick" && ev.amount > 0) {
      pushFloat(ev.targetSide, `-${ev.amount}🔥`, "#ff6e3c");
      setFxTimes((s) => ({ ...s, [ev.targetSide]: { ...s[ev.targetSide], burn: ev.t, dmg: ev.t } }));
    } else if (ev.kind === "burn-apply") {
      setFxTimes((s) => ({ ...s, [ev.targetSide]: { ...s[ev.targetSide], burn: ev.t } }));
    } else if (ev.kind === "poison-tick" && ev.amount > 0) {
      pushFloat(ev.targetSide, `-${ev.amount}☠`, "#7fc97f");
      setFxTimes((s) => ({ ...s, [ev.targetSide]: { ...s[ev.targetSide], poison: ev.t, dmg: ev.t } }));
    } else if (ev.kind === "poison-apply") {
      setFxTimes((s) => ({ ...s, [ev.targetSide]: { ...s[ev.targetSide], poison: ev.t } }));
    } else if (ev.kind === "regen-tick" && ev.amount > 0) {
      pushFloat(ev.side, `+${ev.amount}🌿`, "var(--plant)");
      setFxTimes((s) => ({ ...s, [ev.side]: { ...s[ev.side], heal: ev.t } }));
    }
  }

  function pushFloat(side: "P" | "E", text: string, color: string) {
    const id = ++floatIdRef.current;
    setFloats((fs) => [...fs, { id, side, text, color }]);
    setTimeout(() => setFloats((fs) => fs.filter((f) => f.id !== id)), 1100);
  }

  // ─── Derived state from events at playbackTime ─────────────────────────────
  const visState = useMemo(() => {
    if (!lastCombat || !run) return null;
    let hpP = lastCombat.initialHpP;
    let hpE = lastCombat.initialHpE;
    let shieldP = 0;
    let shieldE = 0;
    const lastTriggerByUid: Record<string, number> = {};

    for (const ev of lastCombat.events) {
      if (ev.t > playbackTime) break;
      if (ev.kind === "trigger") {
        lastTriggerByUid[ev.itemUid] = ev.t;
      } else if (ev.kind === "damage") {
        if (ev.targetSide === "P") hpP -= ev.amount;
        else hpE -= ev.amount;
      } else if (ev.kind === "heal") {
        if (ev.side === "P") hpP += ev.amount;
        else hpE += ev.amount;
      } else if (ev.kind === "shield") {
        if (ev.side === "P") shieldP += ev.amount;
        else shieldE += ev.amount;
      } else if (ev.kind === "sandstorm-tick") {
        if (ev.targetSide === "P") hpP -= ev.amount;
        else hpE -= ev.amount;
      }
    }
    return { hpP: Math.max(0, hpP), hpE: Math.max(0, hpE), shieldP, shieldE, lastTriggerByUid };
  }, [playbackTime, lastCombat, run]);

  if (!run || !lastCombat || !visState) {
    return (
      <div className="screen-pad" style={{ textAlign: "center", paddingTop: 64 }}>
        <em>Preparing combat…</em>
        {stuckEscape && (
          <div style={{ marginTop: 32 }}>
            <p className="muted" style={{ marginBottom: 12, fontSize: 12 }}>
              Combat is taking longer than expected. You can skip back to the day hub.
            </p>
            <button className="mm-btn" onClick={() => { advance(); goto("Workshop"); }}>
              Skip combat →
            </button>
          </div>
        )}
      </div>
    );
  }
  // Defensive: if an older lastCombat lacks the new fields, the playback would
  // misbehave silently. Bail out to a static result so the player can continue.
  if (
    typeof lastCombat.initialHpP !== "number" ||
    typeof lastCombat.duration !== "number" ||
    !lastCombat.effectiveCds
  ) {
    return (
      <div className="screen-pad" style={{ textAlign: "center", paddingTop: 64 }}>
        <h2 className="h2">{lastCombat.winner === "P" ? "VICTORY" : lastCombat.winner === "E" ? "DEFEAT" : "DRAW"}</h2>
        <p className="muted">Animation data missing for this combat (legacy save). Continuing…</p>
        <button className="mm-btn gold" onClick={() => { advance(); goto("Workshop"); }}>Continue →</button>
      </div>
    );
  }

  const hero = heroById(run.heroId);
  const enemyName =
    currentEncounter?.combatant.displayName ??
    (lastGhost ? `${heroById(lastGhost.hero_id).name} Ghost` : "Phantom");

  // Always render from the snapshot baked into lastCombat so rewards
  // acquired after combat resolution don't leak into the playback.
  const playerItems: ItemInstance[] = lastCombat.playerInventory ?? run.battleInventory;
  const enemyItems: ItemInstance[] = lastCombat.enemyInventory ??
    currentEncounter?.combatant.inventory ??
    (lastGhost?.inventory.map((it, i) => ({
      uid: `gh_${i}_${it.def_id}`,
      defId: it.def_id,
      rarity: it.rarity,
      slotIndex: it.slot,
      linkOverride: it.links,
    })) ?? []);

  const enemyMaxHp = lastCombat.initialHpE;
  const sandstormActive = playbackTime >= SANDSTORM_START;
  const sandstormSeverity = sandstormActive ? Math.min(1, (playbackTime - SANDSTORM_START) / 20) : 0;

  return (
    <div className="combat-screen-v2">
      {/* Sandstorm overlay */}
      {sandstormActive && (
        <div
          className="sandstorm-overlay"
          style={{ opacity: 0.15 + sandstormSeverity * 0.25 }}
        />
      )}

      <div className="combat-header">
        <div className="combat-timer">
          ⏱ {playbackTime.toFixed(1)}s {sandstormActive && "🌪 SANDSTORM"}
        </div>
        <div className="combat-controls">
          <button className={`mm-btn ${speed === 1 ? "gold" : ""}`} onClick={() => setSpeed(1)}>1×</button>
          <button className={`mm-btn ${speed === 2 ? "gold" : ""}`} onClick={() => setSpeed(2)}>2×</button>
          <button className={`mm-btn ${speed === 4 ? "gold" : ""}`} onClick={() => setSpeed(4)}>4×</button>
          <button className="mm-btn" onClick={() => setPaused((p) => !p)}>
            {paused ? "▶" : "⏸"}
          </button>
          <button className="mm-btn" onClick={() => { setPlaybackTime(lastCombat.duration); setDone(true); }}>
            Skip ⏭
          </button>
        </div>
      </div>

      <div className="combat-arena">
        {/* Enemy block on top */}
        <CombatantPane
          side="enemy"
          name={enemyName}
          portrait={lastGhost ? heroById(lastGhost.hero_id).portrait : "👹"}
          heroId={lastGhost ? lastGhost.hero_id : undefined}
          hp={visState.hpE}
          maxHp={enemyMaxHp}
          shield={visState.shieldE}
          items={enemyItems}
          lastTriggerByUid={visState.lastTriggerByUid}
          shaken={shaken}
          effectiveCds={lastCombat.effectiveCds}
          playbackTime={playbackTime}
          floats={floats.filter((f) => f.side === "E")}
          recentDamageAt={fxTimes.E.dmg}
          recentHealAt={fxTimes.E.heal}
          recentShieldAt={fxTimes.E.shield}
          recentBurnAt={fxTimes.E.burn}
          recentPoisonAt={fxTimes.E.poison}
        />

        {/* Center divider — battle status / combined HP track */}
        <div className="arena-divider">
          <div className="arena-divider-line" />
          <div className="arena-divider-badge">
            ⚔ {playbackTime.toFixed(1)}s
          </div>
          <div className="arena-divider-line" />
        </div>

        {/* Player block on bottom */}
        <CombatantPane
          side="player"
          name={`${hero.name}  Lv ${run.level}`}
          portrait={hero.portrait}
          heroId={hero.id}
          hp={visState.hpP}
          maxHp={lastCombat.initialHpP}
          shield={visState.shieldP}
          items={playerItems}
          lastTriggerByUid={visState.lastTriggerByUid}
          shaken={shaken}
          effectiveCds={lastCombat.effectiveCds}
          playbackTime={playbackTime}
          floats={floats.filter((f) => f.side === "P")}
          recentDamageAt={fxTimes.P.dmg}
          recentHealAt={fxTimes.P.heal}
          recentShieldAt={fxTimes.P.shield}
          recentBurnAt={fxTimes.P.burn}
          recentPoisonAt={fxTimes.P.poison}
        />
      </div>

      {done && (
        <div className="combat-result-banner">
          <div className="combat-result-text">
            {lastCombat.winner === "P" ? "VICTORY" : lastCombat.winner === "E" ? "DEFEAT" : "DRAW"}
          </div>
          <button className="mm-btn gold" onClick={() => { advance(); goto("Workshop"); }}>
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Combatant pane ────────────────────────────────────────────────────────
interface PaneProps {
  side: "player" | "enemy";
  name: string;
  portrait: string;
  /** Known hero ID, if the side is one of our heroes. Triggers SVG portrait. */
  heroId?: string;
  hp: number;
  maxHp: number;
  shield: number;
  items: ItemInstance[];
  lastTriggerByUid: Record<string, number>;
  shaken: Record<string, number>;
  effectiveCds: Record<string, number>;
  playbackTime: number;
  floats: FloatNum[];
  /** Recent event flags for avatar reactions. */
  recentDamageAt?: number;
  recentHealAt?: number;
  recentShieldAt?: number;
  recentBurnAt?: number;
  recentPoisonAt?: number;
}

function CombatantPane(p: PaneProps) {
  const hpPct = Math.max(0, (p.hp / Math.max(1, p.maxHp)) * 100);
  const shieldPct = Math.min(100 - hpPct, (p.shield / Math.max(1, p.maxHp)) * 100);

  const t = p.playbackTime;
  // "Recent" events look back 0.6s for an active visual state.
  const isHurt    = p.recentDamageAt != null && t - p.recentDamageAt < 0.6;
  const isHealed  = p.recentHealAt   != null && t - p.recentHealAt   < 0.6;
  const isShielded = p.recentShieldAt != null && t - p.recentShieldAt < 0.6;
  const isBurning = p.recentBurnAt   != null && t - p.recentBurnAt   < 1.5;
  const isPoisoned = p.recentPoisonAt != null && t - p.recentPoisonAt < 2.5;

  const avatarClass = [
    "combat-avatar",
    isHurt ? "hurt" : "",
    isHealed ? "healed" : "",
    isShielded ? "shielded" : "",
    isBurning ? "burning" : "",
    isPoisoned ? "poisoned" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={`arena-side arena-side-${p.side}`}>
      {/* Avatar + HP block on the side */}
      <div className="arena-portrait-block">
        <div className={avatarClass}>
          {p.heroId ? (
            <span className="combat-avatar-portrait" style={{ width: 64, height: 64 }}>
              <HeroArt heroId={p.heroId} className="combat-avatar-svg" />
            </span>
          ) : (
            <span className="combat-avatar-portrait">{p.portrait}</span>
          )}
          {isBurning && <div className="avatar-fx burn-fx">🔥</div>}
          {isPoisoned && <div className="avatar-fx poison-fx">☠</div>}
          {isShielded && <div className="avatar-fx shield-fx">✦</div>}
        </div>
        <div className="arena-portrait-name">{p.name}</div>
        <div className="arena-portrait-stats">
          <span className="arena-hp-num">{Math.round(p.hp)}</span>
          <span className="arena-hp-divider">/</span>
          <span className="arena-hp-max">{p.maxHp}</span>
          {p.shield > 0 && (
            <span className="arena-shield-num">⛨ {Math.round(p.shield)}</span>
          )}
        </div>
        <div className="arena-hp-bar">
          <div className="arena-hp-fill" style={{ width: `${hpPct}%` }} />
          {p.shield > 0 && (
            <div className="arena-hp-shield" style={{ left: `${hpPct}%`, width: `${shieldPct}%` }} />
          )}
        </div>
        <div className="float-layer">
          {p.floats.map((f) => (
            <div key={f.id} className="float-num" style={{ color: f.color }}>{f.text}</div>
          ))}
        </div>
      </div>

      {/* Card row */}
      <div className="arena-cards">
        {p.items.map((it) => {
          const def = itemById(it.defId);
          const cd = p.effectiveCds[it.uid] ?? def.baseCooldown;
          const lastTrig = p.lastTriggerByUid[it.uid] ?? 0;
          const since = Math.max(0, p.playbackTime - lastTrig);
          const progress = cd >= 100 ? 1 : Math.min(1, since / cd);
          const triggered = lastTrig > 0 && p.playbackTime - lastTrig < 0.4;
          const ready = progress >= 0.95 && !triggered;
          const shakeKey = p.shaken[it.uid];
          return (
            <div
              key={it.uid}
              className="arena-card-wrap"
              style={{ animation: shakeKey ? `mm-shake 0.3s ${shakeKey}` : undefined }}
            >
              <CombatCard
                inst={it}
                cooldownProgress={progress}
                triggered={triggered}
                ready={ready}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
