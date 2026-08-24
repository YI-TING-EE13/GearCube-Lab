import { describe, expect, it } from 'vitest';
import {
  applyMove,
  deserializeLogicalState,
  isSolved,
  SOLVED_GEAR_CUBE_STATE,
  type GearCubeState,
  type MoveAction,
} from '@gearcube/core';
import { solveBfs } from '../src/bfs.js';
import { solveBidirectionalBfs } from '../src/bidirectional-bfs.js';
import { solveIdaStar } from '../src/ida-star.js';
import type { SearchTelemetry, SolverOptions } from '../src/types.js';
import { EXACT_DISTANCE_FIXTURES } from './fixtures.js';

function applyMoveSequence(state: GearCubeState, moves: readonly MoveAction[]): GearCubeState {
  let curr = state;
  for (const move of moves) {
    curr = applyMove(curr, move);
  }
  return curr;
}

describe('Phase 4C — IDA* Solver Contracts & Optimality Suite', () => {
  it('handles already-solved input with zero expansions and empty move list', () => {
    const result = solveIdaStar(SOLVED_GEAR_CUBE_STATE);
    expect(result.status).toBe('SOLVED');
    expect(result.algorithm).toBe('IDA_STAR');
    if (result.status === 'SOLVED') {
      expect(result.moves).toEqual([]);
      expect(result.depth).toBe(0);
      expect(result.counters.nodesExpanded).toBe(0);
      expect(result.counters.nodesGenerated).toBe(0);
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('validates options and rejects invalid parameters with TypeError even on solved input', () => {
    const invalidOptions: unknown[] = [
      'invalid',
      null,
      { maxNodes: -1 },
      { maxNodes: 0 },
      { maxNodes: 1.5 },
      { maxNodes: NaN },
      { maxDepth: -1 },
      { maxDepth: 2.5 },
      { maxDepth: Infinity },
      { progressIntervalNodes: -5 },
      { progressIntervalNodes: 0 },
      { progressIntervalNodes: 1.2 },
      { onProgress: 'not-a-func' },
    ];

    for (const opt of invalidOptions) {
      expect(() => solveIdaStar(SOLVED_GEAR_CUBE_STATE, opt as SolverOptions)).toThrow(TypeError);
    }

    const nonSolved = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[0].serializedState);
    for (const opt of invalidOptions) {
      expect(() => solveIdaStar(nonSolved, opt as SolverOptions)).toThrow(TypeError);
    }
  });

  it('handles maxDepth = 0 on non-solved state with zero expansions', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[1].serializedState);
    const result = solveIdaStar(state, { maxDepth: 0 });
    expect(result.status).toBe('LIMIT_REACHED');
    if (result.status === 'LIMIT_REACHED') {
      expect(result.algorithm).toBe('IDA_STAR');
      expect(result.limit).toBe('MAX_DEPTH');
      expect(result.counters.nodesExpanded).toBe(0);
      expect(result.counters.nodesGenerated).toBe(0);
    }
  });

  it('aborts with MAX_DEPTH before any expansions if h(start) > maxDepth', () => {
    // Distance 5 fixture has h(start) = 5
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[4].serializedState);
    const result = solveIdaStar(state, { maxDepth: 3 });
    expect(result.status).toBe('LIMIT_REACHED');
    if (result.status === 'LIMIT_REACHED') {
      expect(result.limit).toBe('MAX_DEPTH');
      expect(result.counters.nodesExpanded).toBe(0);
      expect(result.counters.nodesGenerated).toBe(0);
    }
  });

  it('enforces exact maxDepth boundary on search solutions', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[2].serializedState); // Distance 3
    const passResult = solveIdaStar(state, { maxDepth: 3 });
    expect(passResult.status).toBe('SOLVED');
    if (passResult.status === 'SOLVED') {
      expect(passResult.depth).toBe(3);
    }

    const failResult = solveIdaStar(state, { maxDepth: 2 });
    expect(failResult.status).toBe('LIMIT_REACHED');
    if (failResult.status === 'LIMIT_REACHED') {
      expect(failResult.limit).toBe('MAX_DEPTH');
    }
  });

  it('enforces maxNodes expansion limit', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[5].serializedState); // Distance 6
    const result = solveIdaStar(state, { maxNodes: 3 });
    expect(result.status).toBe('LIMIT_REACHED');
    if (result.status === 'LIMIT_REACHED') {
      expect(result.limit).toBe('MAX_NODES');
      expect(result.counters.nodesExpanded).toBe(3);
      expect(result.counters.nodesGenerated).toBe(3 * 12);
    }
  });

  it('IDA_STAR_MAXNODES_ACROSS_ITERATIONS: proves maxNodes is cumulative across threshold iterations', () => {
    // Distance 8 fixture has h(start) = 6, optimal depth = 8
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[7].serializedState);
    const telemetryHistory: SearchTelemetry[] = [];

    const fullSolve = solveIdaStar(state, {
      progressIntervalNodes: 1,
      onProgress: (t) => telemetryHistory.push(t),
    });

    expect(fullSolve.status).toBe('SOLVED');
    expect(telemetryHistory.length).toBeGreaterThan(1);

    // Identify threshold values in telemetry
    const thresholds = Array.from(new Set(telemetryHistory.map((t) => (t as { threshold: number }).threshold)));
    expect(thresholds.length).toBeGreaterThanOrEqual(2);
    expect(thresholds[0]).toBe(6);
    expect(thresholds[1]).toBe(8);

    // Count expansions that occurred during threshold 6
    const threshold6Count = telemetryHistory.filter((t) => (t as { threshold: number }).threshold === 6).length;
    expect(threshold6Count).toBeGreaterThan(0);

    // Set maxNodes budget to allow threshold 6 + 1 expansion into threshold 8
    const budget = threshold6Count + 1;
    const cappedSolve = solveIdaStar(state, { maxNodes: budget });

    expect(cappedSolve.status).toBe('LIMIT_REACHED');
    if (cappedSolve.status === 'LIMIT_REACHED') {
      expect(cappedSolve.limit).toBe('MAX_NODES');
      expect(cappedSolve.counters.nodesExpanded).toBe(budget);
      expect(cappedSolve.counters.nodesGenerated).toBe(budget * 12);
    }
  });

  it('IDA_STAR_PROGRESS: verifies progress telemetry interval and counter invariant nodesGenerated === nodesExpanded * 12', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[7].serializedState); // Distance 8
    const telemetry: SearchTelemetry[] = [];

    const result = solveIdaStar(state, {
      progressIntervalNodes: 5,
      onProgress: (t) => telemetry.push(t),
    });

    expect(result.status).toBe('SOLVED');
    expect(telemetry.length).toBeGreaterThan(0);

    for (let i = 0; i < telemetry.length; i++) {
      const t = telemetry[i];
      expect(t.algorithm).toBe('IDA_STAR');
      expect(t.nodesExpanded).toBe((i + 1) * 5);
      expect(t.nodesGenerated).toBe(t.nodesExpanded * 12);
      expect(t.elapsedMs).toBeGreaterThanOrEqual(0);
      expect(typeof (t as { threshold: number }).threshold).toBe('number');
      expect(typeof (t as { currentDepth: number }).currentDepth).toBe('number');
    }
  });

  it('guarantees input state immutability', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[4].serializedState);
    const clone = JSON.parse(JSON.stringify(state));

    solveIdaStar(state);

    expect(state).toEqual(clone);
  });

  it('IDA_STAR_DETERMINISM: proves bit-for-bit identical move sequences on repeat runs for depth 8 fixture', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[7].serializedState);
    const res1 = solveIdaStar(state);
    const res2 = solveIdaStar(state);

    expect(res1.status).toBe('SOLVED');
    expect(res2.status).toBe('SOLVED');
    if (res1.status === 'SOLVED' && res2.status === 'SOLVED') {
      expect(res1.moves).toEqual(res2.moves);
      expect(res1.depth).toBe(8);
      expect(res1.counters).toEqual(res2.counters);
    }
  });

  it('EXACT_DISTANCE_1_TO_8_IDA_STAR_GATE & CROSS_ALGORITHM_OPTIMALITY: finds exact optimal shortest solutions matching BFS and BiBFS for all 8 fixtures', () => {
    for (let i = 0; i < EXACT_DISTANCE_FIXTURES.length; i++) {
      const fixture = EXACT_DISTANCE_FIXTURES[i];
      const state = deserializeLogicalState(fixture.serializedState);
      const expectedDist = fixture.expectedExactDistance;

      const idaResult = solveIdaStar(state);
      expect(idaResult.status).toBe('SOLVED');

      if (idaResult.status === 'SOLVED') {
        expect(idaResult.depth).toBe(expectedDist);
        expect(idaResult.moves.length).toBe(expectedDist);

        const endState = applyMoveSequence(state, idaResult.moves);
        expect(isSolved(endState)).toBe(true);

        const bfsResult = solveBfs(state);
        const biBfsResult = solveBidirectionalBfs(state);

        expect(bfsResult.status).toBe('SOLVED');
        expect(biBfsResult.status).toBe('SOLVED');

        if (bfsResult.status === 'SOLVED' && biBfsResult.status === 'SOLVED') {
          expect(idaResult.depth).toBe(bfsResult.depth);
          expect(idaResult.depth).toBe(biBfsResult.depth);
        }
      }
    }
  });
});
