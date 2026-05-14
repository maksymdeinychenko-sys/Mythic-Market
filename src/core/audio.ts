/**
 * Procedurally-synthesized sound effects.
 *
 * No audio assets — every sound is generated on the fly via the Web Audio
 * API (oscillators + filtered noise). Total bundle cost is ~3 KB of code.
 *
 * Browser autoplay rules block AudioContext until the user interacts with
 * the page. We attach a one-time click listener to resume the context on
 * first interaction. Until then, calls to `play()` silently no-op.
 *
 * Each sound is rate-limited per-key (default 40ms) so events that fire
 * many times per second (e.g. a fast Banana → Recharge chain) don't stack
 * into a buzzing wall of overlapping tones.
 */

let _ctx: AudioContext | null = null;
let _muted = false;
const _lastPlay = new Map<string, number>();
const RATE_LIMIT_MS = 40;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    const Ctor =
      (window as any).AudioContext ||
      (window as any).webkitAudioContext;
    if (!Ctor) return null;
    const created: AudioContext = new Ctor();
    _ctx = created;
    // Hook a single click to resume after autoplay block.
    if (created.state === "suspended") {
      const resume = () => {
        created.resume();
        document.removeEventListener("click", resume);
        document.removeEventListener("keydown", resume);
      };
      document.addEventListener("click", resume, { once: true });
      document.addEventListener("keydown", resume, { once: true });
    }
  }
  return _ctx;
}

export function setMuted(m: boolean): void { _muted = m; }
export function isMuted(): boolean { return _muted; }

// ─── Primitive: a quick tone with optional pitch sweep ─────────────────────
function tone(
  freq: number,
  durationSec: number,
  opts: {
    type?: OscillatorType;
    volume?: number;
    freqEnd?: number;
    delayMs?: number;
  } = {}
): void {
  if (_muted) return;
  const ac = ctx();
  if (!ac) return;
  const start = ac.currentTime + (opts.delayMs ?? 0) / 1000;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, opts.freqEnd),
      start + durationSec
    );
  }
  const vol = opts.volume ?? 0.15;
  // tiny attack so we don't get a click on note-on
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + durationSec + 0.02);
}

// ─── Primitive: filtered noise burst ───────────────────────────────────────
function noise(
  durationSec: number,
  opts: {
    volume?: number;
    lowpass?: number;
    highpass?: number;
    delayMs?: number;
  } = {}
): void {
  if (_muted) return;
  const ac = ctx();
  if (!ac) return;
  const start = ac.currentTime + (opts.delayMs ?? 0) / 1000;
  const sampleCount = Math.max(1, Math.floor(ac.sampleRate * durationSec));
  const buffer = ac.createBuffer(1, sampleCount, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  const vol = opts.volume ?? 0.12;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);

  let chain: AudioNode = src;
  if (opts.lowpass !== undefined) {
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = opts.lowpass;
    chain.connect(f);
    chain = f;
  }
  if (opts.highpass !== undefined) {
    const f = ac.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = opts.highpass;
    chain.connect(f);
    chain = f;
  }
  chain.connect(gain).connect(ac.destination);
  src.start(start);
  src.stop(start + durationSec + 0.02);
}

// Rate-limit wrapper so events that fire rapidly don't pile up.
function gated(key: string, fn: () => void) {
  const now = performance.now();
  const last = _lastPlay.get(key) ?? 0;
  if (now - last < RATE_LIMIT_MS) return;
  _lastPlay.set(key, now);
  fn();
}

// ─── Public effect catalog ─────────────────────────────────────────────────
export const SFX = {
  /** Generic UI tick — for buttons, menu nav. */
  click() {
    gated("click", () => tone(660, 0.04, { type: "sine", volume: 0.08 }));
  },

  /** Item activation in combat — short, bright. */
  trigger() {
    gated("trigger", () => tone(880, 0.06, { type: "triangle", volume: 0.10 }));
  },

  /** Big-trigger variant for important items (Diamond, multi-keyword). */
  triggerBig() {
    gated("triggerBig", () => {
      tone(880, 0.08, { type: "triangle", volume: 0.14 });
      tone(1320, 0.08, { type: "sine", volume: 0.10, delayMs: 20 });
    });
  },

  /** Damage landed on a combatant. */
  damage() {
    gated("damage", () => noise(0.10, { volume: 0.16, lowpass: 900 }));
  },

  /** Heal applied. */
  heal() {
    gated("heal", () => tone(659, 0.18, { type: "sine", volume: 0.13, freqEnd: 988 }));
  },

  /** Shield gained — chord ping. */
  shield() {
    gated("shield", () => {
      tone(523, 0.08, { type: "sine", volume: 0.10 });
      tone(659, 0.08, { type: "sine", volume: 0.10, delayMs: 30 });
      tone(784, 0.10, { type: "sine", volume: 0.10, delayMs: 60 });
    });
  },

  /** Burn tick — fire crackle. */
  burn() {
    gated("burn", () => noise(0.08, { volume: 0.10, highpass: 2000 }));
  },

  /** Poison tick — descending sickly tone. */
  poison() {
    gated("poison", () => tone(330, 0.18, { type: "sawtooth", volume: 0.08, freqEnd: 165 }));
  },

  /** Slowing applied — low whoosh. */
  slow() {
    gated("slow", () => noise(0.15, { volume: 0.10, lowpass: 400 }));
  },

  /** Sandstorm tick — low rumble. */
  sandstorm() {
    gated("sandstorm", () => noise(0.20, { volume: 0.14, lowpass: 500 }));
  },

  /** Combat victory — ascending triad. */
  victory() {
    tone(523, 0.10, { type: "triangle", volume: 0.14 });
    tone(659, 0.10, { type: "triangle", volume: 0.14, delayMs: 90 });
    tone(784, 0.16, { type: "triangle", volume: 0.16, delayMs: 180 });
    tone(1047, 0.30, { type: "triangle", volume: 0.18, delayMs: 320 });
  },

  /** Combat defeat — descending minor. */
  defeat() {
    tone(440, 0.18, { type: "sine", volume: 0.16, freqEnd: 220 });
    tone(330, 0.30, { type: "sine", volume: 0.14, freqEnd: 165, delayMs: 200 });
  },

  /** Level-up fanfare. */
  levelUp() {
    tone(523, 0.08, { type: "triangle", volume: 0.13 });
    tone(659, 0.08, { type: "triangle", volume: 0.13, delayMs: 70 });
    tone(784, 0.08, { type: "triangle", volume: 0.13, delayMs: 140 });
    tone(1047, 0.24, { type: "triangle", volume: 0.16, delayMs: 210 });
  },

  /** Gold gained. */
  coin() {
    gated("coin", () => {
      tone(988, 0.05, { type: "square", volume: 0.08 });
      tone(1319, 0.08, { type: "square", volume: 0.10, delayMs: 30 });
    });
  },

  /** Item purchased from shop. */
  purchase() {
    tone(659, 0.06, { type: "triangle", volume: 0.10 });
    tone(880, 0.10, { type: "triangle", volume: 0.10, delayMs: 50 });
  },

  /** Item sold. */
  sell() {
    tone(523, 0.06, { type: "triangle", volume: 0.10 });
    tone(440, 0.10, { type: "triangle", volume: 0.10, delayMs: 50 });
  },

  /** Item merged into next rarity. */
  merge() {
    tone(659, 0.06, { type: "triangle", volume: 0.10 });
    tone(880, 0.06, { type: "triangle", volume: 0.10, delayMs: 50 });
    tone(1175, 0.12, { type: "triangle", volume: 0.13, delayMs: 100 });
  },
};
