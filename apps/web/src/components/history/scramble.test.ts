/**
 * @file scramble.test.ts
 * @description Comprehensive unit tests for deterministic seeded scramble generator and endpoint evaluator.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_MOVES,
  isMove,
  isGearCubeState,
  isSpatialFrame,
  SOLVED_GEAR_CUBE_STATE,
  DEFAULT_SPATIAL_FRAME,
  type Move,
} from '@gearcube/core';
import {
  hashSeed,
  createMulberry32,
  generateScramble,
  applyScrambleSequence,
  DEFAULT_SCRAMBLE_LENGTH,
  MIN_SCRAMBLE_LENGTH,
  MAX_SCRAMBLE_LENGTH,
} from './scramble.js';
import { formatMoveNotation } from './history.js';

describe('Deterministic Scramble Foundation', () => {
  it('FNV1A_GOLDEN_GATE: produces exact 32-bit unsigned hashes for reference seeds', () => {
    expect(hashSeed('')).toBe(0x811c9dc5);
    expect(hashSeed('a')).toBe(0xe40c292c);
    expect(hashSeed('abc')).toBe(0x1a47e90b);
    expect(hashSeed('GearCube')).toBe(0x55f7284b);

    // Exact string sensitivity (no trim, no lowercase)
    expect(hashSeed('abc')).not.toBe(hashSeed(' abc'));
    expect(hashSeed('abc')).not.toBe(hashSeed('ABC'));
    expect(hashSeed('abc')).not.toBe(hashSeed('abc '));
  });

  it('UTF16_NON_BMP_HASH_GATE: correctly hashes multi-byte UTF-16 surrogate pairs', () => {
    // '😃' is encoded as surrogate pair [0xD83D, 0xDE03]
    expect(hashSeed('😃')).toBe(0xce31c971);
  });

  it('MULBERRY32_DETERMINISM_GATE: produces repeatable pseudo-random float sequence in [0, 1)', () => {
    const prng1 = createMulberry32(0x1a47e90b);
    const prng2 = createMulberry32(0x1a47e90b);

    const seq1: number[] = [];
    const seq2: number[] = [];

    for (let i = 0; i < 100; i++) {
      const v1 = prng1();
      const v2 = prng2();
      expect(v1).toBeGreaterThanOrEqual(0);
      expect(v1).toBeLessThan(1);
      seq1.push(v1);
      seq2.push(v2);
    }

    expect(seq1).toEqual(seq2);
  });

  it('EMPTY_SEED_DETERMINISM_GATE: empty string is a valid deterministic seed', () => {
    const s1 = generateScramble('', 20);
    const s2 = generateScramble('', 20);
    expect(s1).toEqual(s2);
    expect(s1).toHaveLength(20);
  });

  it('DEFAULT_LENGTH_GATE: defaults to 20 moves when length is omitted', () => {
    const scramble = generateScramble('test_seed');
    expect(scramble).toHaveLength(DEFAULT_SCRAMBLE_LENGTH);
    expect(DEFAULT_SCRAMBLE_LENGTH).toBe(20);
  });

  it('LENGTH_BOUNDARY_GATE: supports lengths from 1 to 50', () => {
    const sMin = generateScramble('min', MIN_SCRAMBLE_LENGTH);
    expect(sMin).toHaveLength(1);

    const sMax = generateScramble('max', MAX_SCRAMBLE_LENGTH);
    expect(sMax).toHaveLength(50);
  });

  it('INVALID_LENGTH_GATE: rejects invalid lengths with RangeError', () => {
    expect(() => generateScramble('seed', 0)).toThrow(RangeError);
    expect(() => generateScramble('seed', 51)).toThrow(RangeError);
    expect(() => generateScramble('seed', -5)).toThrow(RangeError);
    expect(() => generateScramble('seed', NaN)).toThrow(RangeError);
    expect(() => generateScramble('seed', 10.5)).toThrow(RangeError);
    expect(() => generateScramble('seed', Infinity)).toThrow(RangeError);
  });

  it('ALL_MOVES_AUTHORITY_GATE: every generated Move belongs to authoritative ALL_MOVES', () => {
    const testSeeds = ['seed1', 'GearCube-Lab', '12345', 'alpha', 'beta', ''];
    for (const seed of testSeeds) {
      const scramble = generateScramble(seed, 30);
      for (const move of scramble) {
        expect(isMove(move)).toBe(true);
        expect(ALL_MOVES).toContainEqual(move);
      }
    }
  });

  it('NO_CONSECUTIVE_SAME_FACE_GATE: prevents consecutive moves on identical faces', () => {
    const testSeeds = ['seedA', 'seedB', 'test-long-seed', '42', 'gear_cube_lab', ''];
    for (const seed of testSeeds) {
      const scramble = generateScramble(seed, 50);
      for (let i = 1; i < scramble.length; i++) {
        const prevFace = scramble[i - 1]!.face;
        const currFace = scramble[i]!.face;
        expect(currFace).not.toBe(prevFace);
      }
    }
  });

  it('SEEDED_SCRAMBLE_GOLDEN_GATE: matches exact independent golden sequence for seed "abc"', () => {
    const scramble = generateScramble('abc', 20);

    const expectedNotations = [
      'B+', 'U+', 'L+', 'R+', 'F-', 'L+', 'B-', 'R+', 'F+', 'D-',
      'B+', 'F+', 'U+', 'D+', 'R+', 'U-', 'R-', 'L+', 'F-', 'D-',
    ];

    const expectedMoves: Move[] = [
      { face: 'B', direction: 'CW' },
      { face: 'U', direction: 'CW' },
      { face: 'L', direction: 'CW' },
      { face: 'R', direction: 'CW' },
      { face: 'F', direction: 'CCW' },
      { face: 'L', direction: 'CW' },
      { face: 'B', direction: 'CCW' },
      { face: 'R', direction: 'CW' },
      { face: 'F', direction: 'CW' },
      { face: 'D', direction: 'CCW' },
      { face: 'B', direction: 'CW' },
      { face: 'F', direction: 'CW' },
      { face: 'U', direction: 'CW' },
      { face: 'D', direction: 'CW' },
      { face: 'R', direction: 'CW' },
      { face: 'U', direction: 'CCW' },
      { face: 'R', direction: 'CCW' },
      { face: 'L', direction: 'CW' },
      { face: 'F', direction: 'CCW' },
      { face: 'D', direction: 'CCW' },
    ];

    const notations = scramble.map(formatMoveNotation);
    expect(notations).toEqual(expectedNotations);
    expect(scramble).toEqual(expectedMoves);
  });

  it('SEEDED_SCRAMBLE_DETERMINISM_GATE: produces identical sequence across multiple calls with same seed and length', () => {
    const s1 = generateScramble('deterministic_seed_123', 35);
    const s2 = generateScramble('deterministic_seed_123', 35);
    expect(s1).toEqual(s2);
  });

  it('SCRAMBLE_ENDPOINT_GATE & SCRAMBLE_FRAME_AWARE_GATE: sequentially evaluates state and spatial frame', () => {
    const scramble = generateScramble('abc', 20);
    const { state, frame } = applyScrambleSequence(
      SOLVED_GEAR_CUBE_STATE,
      DEFAULT_SPATIAL_FRAME,
      scramble
    );

    expect(isGearCubeState(state)).toBe(true);
    expect(isSpatialFrame(frame)).toBe(true);

    // Verify evaluation on 0 moves returns initial state/frame
    const identity = applyScrambleSequence(
      SOLVED_GEAR_CUBE_STATE,
      DEFAULT_SPATIAL_FRAME,
      []
    );
    expect(identity.state).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(identity.frame).toBe(DEFAULT_SPATIAL_FRAME);
  });

  it('IMMUTABILITY_GATE: generated scramble arrays are frozen against mutations', () => {
    const scramble = generateScramble('immutability_test', 10);
    expect(Object.isFrozen(scramble)).toBe(true);
    expect(() => {
      // @ts-expect-error - testing runtime mutation rejection
      scramble.push({ face: 'U', direction: 'CW' });
    }).toThrow();
  });
});
