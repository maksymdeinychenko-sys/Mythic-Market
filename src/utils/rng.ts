/** Deterministic seeded PRNG (Mulberry32). Returns 0..1. */
export type Rng = () => number;

export function createRng(seed = Date.now() & 0xffffffff): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(rng: Rng, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pick from empty array");
  return arr[Math.floor(rng() * arr.length)];
}

/** Weighted pick. Weights ≥ 0; zero-weight items skipped. */
export function pickWeighted<T>(
  rng: Rng,
  items: readonly T[],
  weights: readonly number[]
): T {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return items[0];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function uid(prefix = "i"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
