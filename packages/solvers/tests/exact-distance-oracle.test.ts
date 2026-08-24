import { describe, it, expect } from 'vitest';
import {
  ALL_MOVES,
  applyMove,
  deserializeLogicalState,
  isGearCubeState,
  serializeLogicalState,
  SOLVED_GEAR_CUBE_STATE,
} from '@gearcube/core';
import { buildExactDistanceOracle } from './exact-distance-oracle.js';
import { EXACT_DISTANCE_FIXTURES } from './fixtures.js';

describe('Phase 4A — Independent Test-Only Exact Distance Oracle & Fixtures', () => {
  const oracle = buildExactDistanceOracle();

  it('verifies EXACT_DISTANCE_ORACLE_STATE_COUNT is exactly 41,472', () => {
    expect(oracle.distances.size).toBe(41472);
  });

  it('verifies EXACT_DISTANCE_ORACLE_SOLVED_DEPTH is exactly 0', () => {
    const solvedKey = serializeLogicalState(SOLVED_GEAR_CUBE_STATE);
    expect(oracle.distances.get(solvedKey)).toBe(0);
  });

  it('verifies EXACT_DISTANCE_ORACLE_DIAMETER is exactly 8', () => {
    expect(oracle.diameter).toBe(8);
  });

  it('verifies exact depth histogram matches authoritative Phase 1E characterization', () => {
    expect(oracle.histogram).toEqual({
      0: 1,
      1: 12,
      2: 111,
      3: 822,
      4: 3863,
      5: 11706,
      6: 16410,
      7: 8196,
      8: 351,
    });
  });

  it('verifies every committed fixture in EXACT_DISTANCE_FIXTURES matches exact oracle distance', () => {
    expect(EXACT_DISTANCE_FIXTURES).toHaveLength(8);

    for (let d = 1; d <= 8; d++) {
      const fixture = EXACT_DISTANCE_FIXTURES[d - 1];
      expect(fixture.expectedExactDistance).toBe(d);

      // Verify oracle distance lookup
      expect(oracle.distances.has(fixture.serializedState)).toBe(true);
      expect(oracle.distances.get(fixture.serializedState)).toBe(d);

      // Verify deserialization validity
      const state = deserializeLogicalState(fixture.serializedState);
      expect(isGearCubeState(state)).toBe(true);
      expect(serializeLogicalState(state)).toBe(fixture.serializedState);
    }
  });

  it('verifies local metric consistency (triangle inequality: adjacent transitions differ in distance by <= 1)', () => {
    for (const fixture of EXACT_DISTANCE_FIXTURES) {
      const state = deserializeLogicalState(fixture.serializedState);
      const baseDist = oracle.distances.get(fixture.serializedState)!;

      for (const move of ALL_MOVES) {
        const neighbor = applyMove(state, move);
        const neighborKey = serializeLogicalState(neighbor);
        const neighborDist = oracle.distances.get(neighborKey)!;

        expect(Math.abs(neighborDist - baseDist)).toBeLessThanOrEqual(1);
      }
    }
  });
});
