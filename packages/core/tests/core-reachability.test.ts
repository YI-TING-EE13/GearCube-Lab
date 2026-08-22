/**
 * @file core-reachability.test.ts
 * @description Phase 1E Exhaustive Core Acceptance Suite.
 *
 * Implements:
 * - Gate 1: Test-local dense rank bijection over Cartesian domain (41,472 / 41,472)
 * - Gate 2: Exhaustive BFS reachability traversal from SOLVED_GEAR_CUBE_STATE (41,472 / 41,472)
 * - Reachable-set consistency assertions (validity & solved count = 1)
 * - Gate 3: Reachable-set 12-move graph closure (497,664 / 497,664)
 * - Gate 4: Per-directed-move domain bijections (12 / 12 in S_41472)
 * - Gate 5 (Informational): Depth histogram & diameter characterization under Canonical Directed Move Metric
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  ALL_MOVES,
  SOLVED_GEAR_CUBE_STATE,
  CORNER_CONFIGURATIONS,
  SLICE_PERMUTATION_CLASSES,
  SLICE_GEAR_PHASES,
  applyMove,
  isGearCubeState,
  isSolved,
  type GearCubeState,
  type Move,
} from '../src/index.js';

// ============================================================================
// 1. Test-Local Dense Rank Function
// ============================================================================

/**
 * Bijective dense integer rank mapping canonical GearCubeState -> [0..41471].
 * Formula: C*1728 + (kX*3 + pX)*144 + (kY*3 + pY)*12 + (kZ*3 + pZ)
 */
function rankState(state: GearCubeState): number {
  return (
    state.cornerConfiguration * 1728 +
    (state.sliceX.permutationClass * 3 + state.sliceX.phase) * 144 +
    (state.sliceY.permutationClass * 3 + state.sliceY.phase) * 12 +
    (state.sliceZ.permutationClass * 3 + state.sliceZ.phase)
  );
}

// ============================================================================
// 2. Shared BFS Fixture for Suite Execution
// ============================================================================

interface BfsTraversalResult {
  reachableStates: GearCubeState[];
  visited: Uint8Array;
  depths: Int16Array;
  head: number;
  maxDepth: number;
  histogram: Map<number, number>;
}

let bfsResult: BfsTraversalResult;

function executeBfsTraversal(): BfsTraversalResult {
  const visited = new Uint8Array(41472);
  const depths = new Int16Array(41472);
  const queue: GearCubeState[] = [SOLVED_GEAR_CUBE_STATE];

  const solvedRank = rankState(SOLVED_GEAR_CUBE_STATE);
  visited[solvedRank] = 1;
  depths[solvedRank] = 0;

  let head = 0;
  let maxDepth = 0;

  while (head < queue.length) {
    const current = queue[head++]!;
    const currentDepth = depths[rankState(current)]!;

    for (const move of ALL_MOVES) {
      const next = applyMove(current, move);

      if (!isGearCubeState(next)) {
        throw new Error(`BFS produced invalid canonical state on move ${JSON.stringify(move)}`);
      }

      const nextRank = rankState(next);
      if (visited[nextRank] === 0) {
        visited[nextRank] = 1;
        const nextDepth = currentDepth + 1;
        depths[nextRank] = nextDepth;
        if (nextDepth > maxDepth) {
          maxDepth = nextDepth;
        }
        queue.push(next);
      }
    }
  }

  const histogram = new Map<number, number>();
  for (let i = 0; i < queue.length; i++) {
    const d = depths[rankState(queue[i]!)]!;
    histogram.set(d, (histogram.get(d) ?? 0) + 1);
  }

  return {
    reachableStates: queue,
    visited,
    depths,
    head,
    maxDepth,
    histogram,
  };
}

// ============================================================================
// 3. Phase 1E Acceptance Test Suite
// ============================================================================

describe('Phase 1E — Exhaustive Core Acceptance Suite', () => {
  beforeAll(() => {
    bfsResult = executeBfsTraversal();
  });

  describe('Gate 1: Dense-Rank Bijection over Cartesian Domain', () => {
    it('verifies rankState forms an exact bijection from 41,472 Cartesian states to [0..41471]', () => {
      const rankSeen = new Uint8Array(41472);
      let stateCount = 0;
      let minRank = Infinity;
      let maxRank = -Infinity;
      let collisions = 0;

      for (const C of CORNER_CONFIGURATIONS) {
        for (const kX of SLICE_PERMUTATION_CLASSES) {
          for (const pX of SLICE_GEAR_PHASES) {
            for (const kY of SLICE_PERMUTATION_CLASSES) {
              for (const pY of SLICE_GEAR_PHASES) {
                for (const kZ of SLICE_PERMUTATION_CLASSES) {
                  for (const pZ of SLICE_GEAR_PHASES) {
                    const state: GearCubeState = {
                      cornerConfiguration: C,
                      sliceX: { permutationClass: kX, phase: pX },
                      sliceY: { permutationClass: kY, phase: pY },
                      sliceZ: { permutationClass: kZ, phase: pZ },
                    };

                    expect(isGearCubeState(state)).toBe(true);

                    const r = rankState(state);
                    stateCount++;

                    if (r < minRank) minRank = r;
                    if (r > maxRank) maxRank = r;

                    if (rankSeen[r] === 1) {
                      collisions++;
                    } else {
                      rankSeen[r] = 1;
                    }
                  }
                }
              }
            }
          }
        }
      }

      let gaps = 0;
      for (let r = 0; r < 41472; r++) {
        if (rankSeen[r] === 0) {
          gaps++;
        }
      }

      expect(stateCount).toBe(41472);
      expect(minRank).toBe(0);
      expect(maxRank).toBe(41471);
      expect(collisions).toBe(0);
      expect(gaps).toBe(0);
    });
  });

  describe('Gate 2: Exhaustive BFS Reachability from Solved State', () => {
    it('discovers exactly 41,472 unique canonical states starting from SOLVED_GEAR_CUBE_STATE', () => {
      expect(bfsResult.reachableStates.length).toBe(41472);
      expect(bfsResult.head).toBe(41472);
      expect(bfsResult.head === bfsResult.reachableStates.length).toBe(true);

      let unvisitedCount = 0;
      for (let r = 0; r < 41472; r++) {
        if (bfsResult.visited[r] === 0) {
          unvisitedCount++;
        }
      }
      expect(unvisitedCount).toBe(0);
    });

    it('verifies all 41,472 discovered states satisfy structural validation and exactly 1 is solved (consistency)', () => {
      let solvedCount = 0;
      for (const state of bfsResult.reachableStates) {
        expect(isGearCubeState(state)).toBe(true);
        if (isSolved(state)) {
          solvedCount++;
        }
      }
      expect(solvedCount).toBe(1);
    });
  });

  describe('Gate 3: Reachable-Set 12-Move Graph Closure', () => {
    it('verifies all 497,664 transitions (41,472 states x 12 moves) land within the reachable set', () => {
      let totalTransitions = 0;
      let outOfSetCount = 0;

      for (const state of bfsResult.reachableStates) {
        for (const move of ALL_MOVES) {
          const next = applyMove(state, move);
          totalTransitions++;

          const nextRank = rankState(next);
          if (bfsResult.visited[nextRank] !== 1) {
            outOfSetCount++;
          }
        }
      }

      expect(totalTransitions).toBe(497664);
      expect(outOfSetCount).toBe(0);
    });
  });

  describe('Gate 4: Per-Directed-Move Domain Bijection', () => {
    it('verifies each of the 12 directed moves acts as a true permutation over the 41,472 states', () => {
      for (const move of ALL_MOVES) {
        const imageRanks = new Uint8Array(41472);
        let imageSize = 0;

        for (const state of bfsResult.reachableStates) {
          const next = applyMove(state, move);
          const r = rankState(next);

          if (imageRanks[r] === 0) {
            imageRanks[r] = 1;
            imageSize++;
          }
        }

        expect(imageSize).toBe(41472);
      }
    });
  });

  describe('Gate 5 (Informational): Canonical Directed Move Metric Distance Characterization', () => {
    it('characterizes BFS depth histogram and diameter under Canonical Directed Move Metric', () => {
      let totalAccumulated = 0;
      const distribution: Record<number, number> = {};

      for (let d = 0; d <= bfsResult.maxDepth; d++) {
        const count = bfsResult.histogram.get(d) ?? 0;
        distribution[d] = count;
        totalAccumulated += count;
      }

      expect(totalAccumulated).toBe(41472);

      // Informational output
      console.log('--- Phase 1E Informational Distance Characterization ---');
      console.log(`Metric: CANONICAL_DIRECTED_MOVE_METRIC (12 directed moves)`);
      console.log(`Maximum Depth (Diameter): ${bfsResult.maxDepth}`);
      console.log('Depth Histogram:', JSON.stringify(distribution, null, 2));
    });
  });
});