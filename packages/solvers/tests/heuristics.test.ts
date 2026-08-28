import { describe, expect, it } from 'vitest';
import {
  ALL_MOVES,
  applyMove,
  CANONICAL_DOMAIN_SIZE,
  serializeLogicalState,
  SOLVED_GEAR_CUBE_STATE,
  type EdgeSliceState,
  type GearCubeState,
} from '@gearcube/core';
import { estimateIdaStarHeuristic } from '../src/heuristics.js';
import * as publicSolverApi from '../src/index.js';
import { unrankState } from '../src/state-index.js';
import { buildExactDistanceOracle } from './exact-distance-oracle.js';

// --- Independent Test-Side Reference PDB Implementation ---

function refSliceIndex(slice: EdgeSliceState): number {
  return slice.permutationClass * 3 + slice.phase;
}

function refDecodeSlice(q: number): EdgeSliceState {
  return {
    permutationClass: Math.floor(q / 3),
    phase: q % 3,
  };
}

function refIndexCXY(c: number, x: number, y: number): number {
  return (c * 12 + x) * 12 + y;
}

function refIndexCXZ(c: number, x: number, z: number): number {
  return (c * 12 + x) * 12 + z;
}

function refIndexCYZ(c: number, y: number, z: number): number {
  return (c * 12 + y) * 12 + z;
}

function buildTestRefPdbCxy(): { table: Int8Array; reachableCount: number; maxDist: number } {
  const table = new Int8Array(3456).fill(-1);
  const queue = new Int32Array(3456);
  let head = 0;
  let tail = 0;

  const rootIndex = refIndexCXY(
    SOLVED_GEAR_CUBE_STATE.cornerConfiguration,
    refSliceIndex(SOLVED_GEAR_CUBE_STATE.sliceX),
    refSliceIndex(SOLVED_GEAR_CUBE_STATE.sliceY)
  );

  table[rootIndex] = 0;
  queue[tail++] = rootIndex;
  let maxDist = 0;

  while (head < tail) {
    const curr = queue[head++];
    const d = table[curr];
    if (d > maxDist) maxDist = d;

    const y = curr % 12;
    const cX = Math.floor(curr / 12);
    const x = cX % 12;
    const c = Math.floor(cX / 12);

    const rep: GearCubeState = {
      cornerConfiguration: c,
      sliceX: refDecodeSlice(x),
      sliceY: refDecodeSlice(y),
      sliceZ: { permutationClass: 0, phase: 0 },
    };

    for (let m = 0; m < ALL_MOVES.length; m++) {
      const nextConcrete = applyMove(rep, ALL_MOVES[m]);
      const nextIdx = refIndexCXY(
        nextConcrete.cornerConfiguration,
        refSliceIndex(nextConcrete.sliceX),
        refSliceIndex(nextConcrete.sliceY)
      );

      if (table[nextIdx] === -1) {
        table[nextIdx] = d + 1;
        queue[tail++] = nextIdx;
      }
    }
  }

  return { table, reachableCount: tail, maxDist };
}

function buildTestRefPdbCxz(): { table: Int8Array; reachableCount: number; maxDist: number } {
  const table = new Int8Array(3456).fill(-1);
  const queue = new Int32Array(3456);
  let head = 0;
  let tail = 0;

  const rootIndex = refIndexCXZ(
    SOLVED_GEAR_CUBE_STATE.cornerConfiguration,
    refSliceIndex(SOLVED_GEAR_CUBE_STATE.sliceX),
    refSliceIndex(SOLVED_GEAR_CUBE_STATE.sliceZ)
  );

  table[rootIndex] = 0;
  queue[tail++] = rootIndex;
  let maxDist = 0;

  while (head < tail) {
    const curr = queue[head++];
    const d = table[curr];
    if (d > maxDist) maxDist = d;

    const z = curr % 12;
    const cX = Math.floor(curr / 12);
    const x = cX % 12;
    const c = Math.floor(cX / 12);

    const rep: GearCubeState = {
      cornerConfiguration: c,
      sliceX: refDecodeSlice(x),
      sliceY: { permutationClass: 0, phase: 0 },
      sliceZ: refDecodeSlice(z),
    };

    for (let m = 0; m < ALL_MOVES.length; m++) {
      const nextConcrete = applyMove(rep, ALL_MOVES[m]);
      const nextIdx = refIndexCXZ(
        nextConcrete.cornerConfiguration,
        refSliceIndex(nextConcrete.sliceX),
        refSliceIndex(nextConcrete.sliceZ)
      );

      if (table[nextIdx] === -1) {
        table[nextIdx] = d + 1;
        queue[tail++] = nextIdx;
      }
    }
  }

  return { table, reachableCount: tail, maxDist };
}

function buildTestRefPdbCyz(): { table: Int8Array; reachableCount: number; maxDist: number } {
  const table = new Int8Array(3456).fill(-1);
  const queue = new Int32Array(3456);
  let head = 0;
  let tail = 0;

  const rootIndex = refIndexCYZ(
    SOLVED_GEAR_CUBE_STATE.cornerConfiguration,
    refSliceIndex(SOLVED_GEAR_CUBE_STATE.sliceY),
    refSliceIndex(SOLVED_GEAR_CUBE_STATE.sliceZ)
  );

  table[rootIndex] = 0;
  queue[tail++] = rootIndex;
  let maxDist = 0;

  while (head < tail) {
    const curr = queue[head++];
    const d = table[curr];
    if (d > maxDist) maxDist = d;

    const z = curr % 12;
    const cY = Math.floor(curr / 12);
    const y = cY % 12;
    const c = Math.floor(cY / 12);

    const rep: GearCubeState = {
      cornerConfiguration: c,
      sliceX: { permutationClass: 0, phase: 0 },
      sliceY: refDecodeSlice(y),
      sliceZ: refDecodeSlice(z),
    };

    for (let m = 0; m < ALL_MOVES.length; m++) {
      const nextConcrete = applyMove(rep, ALL_MOVES[m]);
      const nextIdx = refIndexCYZ(
        nextConcrete.cornerConfiguration,
        refSliceIndex(nextConcrete.sliceY),
        refSliceIndex(nextConcrete.sliceZ)
      );

      if (table[nextIdx] === -1) {
        table[nextIdx] = d + 1;
        queue[tail++] = nextIdx;
      }
    }
  }

  return { table, reachableCount: tail, maxDist };
}

describe('Phase 4C — H2 Pattern Database & Heuristic Contracts', () => {
  const refCxy = buildTestRefPdbCxy();
  const refCxz = buildTestRefPdbCxz();
  const refCyz = buildTestRefPdbCyz();

  it('verifies independent reference PDB structure, complete reachability, and diameters', () => {
    expect(refCxy.reachableCount).toBe(3456);
    expect(refCxy.maxDist).toBe(7);
    expect(refCxy.table.length).toBe(3456);
    for (let i = 0; i < 3456; i++) {
      expect(refCxy.table[i]).toBeGreaterThanOrEqual(0);
      expect(refCxy.table[i]).toBeLessThanOrEqual(7);
    }

    expect(refCxz.reachableCount).toBe(3456);
    expect(refCxz.maxDist).toBe(7);
    expect(refCxz.table.length).toBe(3456);
    for (let i = 0; i < 3456; i++) {
      expect(refCxz.table[i]).toBeGreaterThanOrEqual(0);
      expect(refCxz.table[i]).toBeLessThanOrEqual(7);
    }

    expect(refCyz.reachableCount).toBe(3456);
    expect(refCyz.maxDist).toBe(7);
    expect(refCyz.table.length).toBe(3456);
    for (let i = 0; i < 3456; i++) {
      expect(refCyz.table[i]).toBeGreaterThanOrEqual(0);
      expect(refCyz.table[i]).toBeLessThanOrEqual(7);
    }
  });

  it('H2_PRODUCTION_REFERENCE_MATCH: matches independent H2 reference value for all 41,472 canonical states', () => {
    let matchCount = 0;

    for (let rank = 0; rank < CANONICAL_DOMAIN_SIZE; rank++) {
      const state = unrankState(rank);
      const actualH = estimateIdaStarHeuristic(state);

      const c = state.cornerConfiguration;
      const x = refSliceIndex(state.sliceX);
      const y = refSliceIndex(state.sliceY);
      const z = refSliceIndex(state.sliceZ);

      const expCxy = refCxy.table[refIndexCXY(c, x, y)];
      const expCxz = refCxz.table[refIndexCXZ(c, x, z)];
      const expCyz = refCyz.table[refIndexCYZ(c, y, z)];
      const expectedH = Math.max(expCxy, expCxz, expCyz);

      if (actualH === expectedH) {
        matchCount++;
      }
    }

    expect(matchCount).toBe(41472);
  });

  it('H2_EXHAUSTIVE_ADMISSIBILITY: proves 0 <= h2(s) <= d*(s) across all 41,472 states with zero over-estimates', () => {
    const oracle = buildExactDistanceOracle();
    let admissibleCount = 0;
    let overEstimateCount = 0;
    let nonGoalZeroCount = 0;
    let maxH = 0;

    for (let rank = 0; rank < CANONICAL_DOMAIN_SIZE; rank++) {
      const state = unrankState(rank);
      const h = estimateIdaStarHeuristic(state);
      const dStar = oracle.distances.get(serializeLogicalState(state))!;

      if (h > maxH) maxH = h;

      if (dStar === 0) {
        expect(h).toBe(0);
      } else {
        if (h === 0) {
          nonGoalZeroCount++;
        }
      }

      if (h <= dStar && h >= 0) {
        admissibleCount++;
      } else if (h > dStar) {
        overEstimateCount++;
      }
    }

    expect(admissibleCount).toBe(41472);
    expect(overEstimateCount).toBe(0);
    expect(nonGoalZeroCount).toBe(0);
    expect(maxH).toBe(7);
  });

  it('H2_EXHAUSTIVE_CONSISTENCY: proves h2(u) <= 1 + h2(v) across all 497,664 directed edges', () => {
    let consistentEdges = 0;

    for (let rank = 0; rank < CANONICAL_DOMAIN_SIZE; rank++) {
      const u = unrankState(rank);
      const hu = estimateIdaStarHeuristic(u);

      for (let m = 0; m < ALL_MOVES.length; m++) {
        const v = applyMove(u, ALL_MOVES[m]);
        const hv = estimateIdaStarHeuristic(v);

        if (hu <= 1 + hv) {
          consistentEdges++;
        }
      }
    }

    expect(consistentEdges).toBe(497664);
  });

  it('H2_REPRESENTATIVE_SUCCESSOR_EQUIVALENCE: verifies quotient representative successor equivalence for all 497,664 edges', { timeout: 30000 }, () => {
    let cxyEdges = 0;
    let cxzEdges = 0;
    let cyzEdges = 0;

    for (let rank = 0; rank < CANONICAL_DOMAIN_SIZE; rank++) {
      const state = unrankState(rank);
      const c = state.cornerConfiguration;
      const x = refSliceIndex(state.sliceX);
      const y = refSliceIndex(state.sliceY);
      const z = refSliceIndex(state.sliceZ);

      const repCxy: GearCubeState = {
        cornerConfiguration: c,
        sliceX: refDecodeSlice(x),
        sliceY: refDecodeSlice(y),
        sliceZ: { permutationClass: 0, phase: 0 },
      };

      const repCxz: GearCubeState = {
        cornerConfiguration: c,
        sliceX: refDecodeSlice(x),
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: refDecodeSlice(z),
      };

      const repCyz: GearCubeState = {
        cornerConfiguration: c,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: refDecodeSlice(y),
        sliceZ: refDecodeSlice(z),
      };

      for (let m = 0; m < ALL_MOVES.length; m++) {
        const move = ALL_MOVES[m];
        const nextActual = applyMove(state, move);

        const nextActualCxy = refIndexCXY(
          nextActual.cornerConfiguration,
          refSliceIndex(nextActual.sliceX),
          refSliceIndex(nextActual.sliceY)
        );
        const nextRepCxy = applyMove(repCxy, move);
        const nextFromRepCxy = refIndexCXY(
          nextRepCxy.cornerConfiguration,
          refSliceIndex(nextRepCxy.sliceX),
          refSliceIndex(nextRepCxy.sliceY)
        );
        if (nextActualCxy === nextFromRepCxy) cxyEdges++;

        const nextActualCxz = refIndexCXZ(
          nextActual.cornerConfiguration,
          refSliceIndex(nextActual.sliceX),
          refSliceIndex(nextActual.sliceZ)
        );
        const nextRepCxz = applyMove(repCxz, move);
        const nextFromRepCxz = refIndexCXZ(
          nextRepCxz.cornerConfiguration,
          refSliceIndex(nextRepCxz.sliceX),
          refSliceIndex(nextRepCxz.sliceZ)
        );
        if (nextActualCxz === nextFromRepCxz) cxzEdges++;

        const nextActualCyz = refIndexCYZ(
          nextActual.cornerConfiguration,
          refSliceIndex(nextActual.sliceY),
          refSliceIndex(nextActual.sliceZ)
        );
        const nextRepCyz = applyMove(repCyz, move);
        const nextFromRepCyz = refIndexCYZ(
          nextRepCyz.cornerConfiguration,
          refSliceIndex(nextRepCyz.sliceY),
          refSliceIndex(nextRepCyz.sliceZ)
        );
        if (nextActualCyz === nextFromRepCyz) cyzEdges++;
      }
    }

    expect(cxyEdges).toBe(497664);
    expect(cxzEdges).toBe(497664);
    expect(cyzEdges).toBe(497664);
  });

  it('NO_PUBLIC_HEURISTIC_API: verifies public package boundary contains solvers but hides internal heuristics and indexing', () => {
    expect(typeof publicSolverApi.solveBfs).toBe('function');
    expect(typeof publicSolverApi.solveBidirectionalBfs).toBe('function');
    expect(typeof publicSolverApi.solveIdaStar).toBe('function');

    expect((publicSolverApi as Record<string, unknown>).estimateIdaStarHeuristic).toBeUndefined();
    expect((publicSolverApi as Record<string, unknown>).rankState).toBeUndefined();
    expect((publicSolverApi as Record<string, unknown>).unrankState).toBeUndefined();
    expect((publicSolverApi as Record<string, unknown>).inverseMove).toBeUndefined();
  });
});
