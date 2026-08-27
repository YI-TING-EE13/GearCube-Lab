/**
 * Creates a deterministic 32-bit pseudo-random number generator stream using Mulberry32.
 * Returns values uniformly distributed in the half-open interval [0, 1).
 */
export function createMulberry32(seed32: number): () => number {
  let state = seed32 >>> 0;
  return (): number => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}