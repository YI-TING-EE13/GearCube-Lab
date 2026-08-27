/**
 * Hashes an arbitrary string seed using 32-bit FNV-1a over UTF-16 code units.
 * Pure, deterministic, and free from locale/Unicode-normalization side effects.
 */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}