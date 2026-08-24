/**
 * @file scramble.ts
 * @description Deterministic seeded scramble generator and canonical sequence evaluator for GearCube Lab.
 */

import {
  ALL_MOVES,
  applyMove,
  nextSpatialFrame,
  type GearCubeState,
  type Move,
  type SpatialFrame,
} from '@gearcube/core';

export const DEFAULT_SCRAMBLE_LENGTH = 20;
export const MIN_SCRAMBLE_LENGTH = 1;
export const MAX_SCRAMBLE_LENGTH = 50;

/**
 * Computes a 32-bit unsigned FNV-1a hash over JavaScript UTF-16 code units.
 * Exactly preserves string bytes without trimming, case normalization, or locale alteration.
 */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Creates a deterministic Mulberry32 32-bit PRNG returning float values in [0, 1).
 */
export function createMulberry32(seedU32: number): () => number {
  let a = seedU32 >>> 0;
  return function next(): number {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a deterministic sequence of legal Moves from a seed string.
 * Consecutive moves on the same face (e.g. U+ followed by U- or U+) are rejected and redrawn.
 */
export function generateScramble(
  seed: string,
  length: number = DEFAULT_SCRAMBLE_LENGTH
): readonly Move[] {
  if (
    !Number.isInteger(length) ||
    length < MIN_SCRAMBLE_LENGTH ||
    length > MAX_SCRAMBLE_LENGTH
  ) {
    throw new RangeError(
      `Invalid scramble length ${length}. Allowed range: ${MIN_SCRAMBLE_LENGTH} to ${MAX_SCRAMBLE_LENGTH} integer.`
    );
  }

  const seedHash = hashSeed(seed);
  const prng = createMulberry32(seedHash);
  const moves: Move[] = [];

  while (moves.length < length) {
    const rnd = prng();
    const index = Math.floor(rnd * ALL_MOVES.length);
    const candidate = ALL_MOVES[index]!;

    if (moves.length > 0) {
      const prevFace = moves[moves.length - 1]!.face;
      if (candidate.face === prevFace) {
        continue;
      }
    }

    moves.push(candidate);
  }

  return Object.freeze(moves);
}

/**
 * Evaluates a sequence of Moves against a starting GearCubeState and SpatialFrame using pure Core transitions.
 * Returns the final resulting state and spatial frame.
 */
export function applyScrambleSequence(
  initialState: GearCubeState,
  initialFrame: SpatialFrame,
  moves: readonly Move[]
): {
  state: GearCubeState;
  frame: SpatialFrame;
} {
  let state = initialState;
  let frame = initialFrame;

  for (const move of moves) {
    state = applyMove(state, move);
    frame = nextSpatialFrame(frame, move.face);
  }

  return { state, frame };
}
