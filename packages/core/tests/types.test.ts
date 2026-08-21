import { describe, expect, it } from 'vitest';
import {
  ALL_MOVES,
  CANONICAL_DOMAIN_SIZE,
  CORNER_CONFIGURATIONS,
  CORNER_CONFIGURATION_COUNT,
  DIRECTIONS,
  EDGE_SLICE_STATE_COUNT,
  FACES,
  SLICE_GEAR_PHASES,
  SLICE_PERMUTATION_CLASSES,
} from '../src/index.js';
import {
  SLICE_X_SLOTS,
  SLICE_Y_SLOTS,
  SLICE_Z_SLOTS,
  V4_PERMUTATIONS,
} from '../src/constants.js';

describe('Canonical Value Domains & Constants', () => {
  it('defines FACES in canonical deterministic order with exactly 6 elements', () => {
    expect(FACES).toEqual(['U', 'D', 'F', 'B', 'R', 'L']);
    expect(FACES.length).toBe(6);
    expect(new Set(FACES).size).toBe(6);
  });

  it('defines DIRECTIONS in canonical order with exactly 2 elements', () => {
    expect(DIRECTIONS).toEqual(['CW', 'CCW']);
    expect(DIRECTIONS.length).toBe(2);
  });

  it('defines CORNER_CONFIGURATIONS as integers 0 through 23 inclusive', () => {
    expect(CORNER_CONFIGURATIONS.length).toBe(24);
    expect(CORNER_CONFIGURATIONS).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23,
    ]);
  });

  it('defines SLICE_PERMUTATION_CLASSES as integers 0, 1, 2, 3', () => {
    expect(SLICE_PERMUTATION_CLASSES).toEqual([0, 1, 2, 3]);
  });

  it('defines SLICE_GEAR_PHASES as abstract integers 0, 1, 2', () => {
    expect(SLICE_GEAR_PHASES).toEqual([0, 1, 2]);
  });

  it('defines exact cardinality constants', () => {
    expect(CORNER_CONFIGURATION_COUNT).toBe(24);
    expect(EDGE_SLICE_STATE_COUNT).toBe(12);
    expect(CANONICAL_DOMAIN_SIZE).toBe(41472);
  });

  it('generates ALL_MOVES in exact canonical (FACES x DIRECTIONS) order with 12 moves', () => {
    expect(ALL_MOVES.length).toBe(12);
    expect(ALL_MOVES).toEqual([
      { face: 'U', direction: 'CW' },
      { face: 'U', direction: 'CCW' },
      { face: 'D', direction: 'CW' },
      { face: 'D', direction: 'CCW' },
      { face: 'F', direction: 'CW' },
      { face: 'F', direction: 'CCW' },
      { face: 'B', direction: 'CW' },
      { face: 'B', direction: 'CCW' },
      { face: 'R', direction: 'CW' },
      { face: 'R', direction: 'CCW' },
      { face: 'L', direction: 'CW' },
      { face: 'L', direction: 'CCW' },
    ]);
  });

  it('encodes exact internal V4 Klein four-group permutation classes', () => {
    expect(V4_PERMUTATIONS.length).toBe(4);
    expect(V4_PERMUTATIONS[0]).toEqual([0, 1, 2, 3]);
    expect(V4_PERMUTATIONS[1]).toEqual([1, 0, 3, 2]);
    expect(V4_PERMUTATIONS[2]).toEqual([2, 3, 0, 1]);
    expect(V4_PERMUTATIONS[3]).toEqual([3, 2, 1, 0]);
  });

  it('encodes exact internal canonical edge slot sequences for X, Y, and Z slices', () => {
    expect(SLICE_X_SLOTS).toEqual(['UB', 'UF', 'DF', 'DB']);
    expect(SLICE_Y_SLOTS).toEqual(['FL', 'FR', 'BR', 'BL']);
    expect(SLICE_Z_SLOTS).toEqual(['UR', 'UL', 'DL', 'DR']);
  });

  it('deeply freezes all static exported and internal collections at runtime', () => {
    expect(Object.isFrozen(FACES)).toBe(true);
    expect(Object.isFrozen(DIRECTIONS)).toBe(true);
    expect(Object.isFrozen(CORNER_CONFIGURATIONS)).toBe(true);
    expect(Object.isFrozen(SLICE_PERMUTATION_CLASSES)).toBe(true);
    expect(Object.isFrozen(SLICE_GEAR_PHASES)).toBe(true);

    expect(Object.isFrozen(ALL_MOVES)).toBe(true);
    expect(ALL_MOVES.every((move) => Object.isFrozen(move))).toBe(true);

    expect(Object.isFrozen(V4_PERMUTATIONS)).toBe(true);
    expect(V4_PERMUTATIONS.every((perm) => Object.isFrozen(perm))).toBe(true);

    expect(Object.isFrozen(SLICE_X_SLOTS)).toBe(true);
    expect(Object.isFrozen(SLICE_Y_SLOTS)).toBe(true);
    expect(Object.isFrozen(SLICE_Z_SLOTS)).toBe(true);
  });
});
