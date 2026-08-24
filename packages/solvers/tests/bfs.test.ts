import { describe, it, expect } from 'vitest';
import {
  ALL_MOVES,
  applyMove,
  deserializeLogicalState,
  isSolved,
  SOLVED_GEAR_CUBE_STATE,
  type GearCubeState,
  type Move,
} from '@gearcube/core';
import { solveBfs } from '../src/bfs.js';
import type { SearchTelemetry, SolveLimitReached, SolveSuccess } from '../src/types.js';
import { EXACT_DISTANCE_FIXTURES } from './fixtures.js';

describe('Phase 4B Breadth-First Search (BFS) Solver Suite', () => {
  it('returns immediate zero-move solution for already solved state', () => {
    const result = solveBfs(SOLVED_GEAR_CUBE_STATE);
    expect(result.status).toBe('SOLVED');
    if (result.status === 'SOLVED') {
      expect(result.algorithm).toBe('BFS');
      expect(result.moves).toEqual([]);
      expect(result.depth).toBe(0);
      expect(result.counters.nodesExpanded).toBe(0);
      expect(result.counters.nodesGenerated).toBe(0);
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('solves single-move state with exact depth 1 and valid move sequence', () => {
    const singleMoveState = applyMove(SOLVED_GEAR_CUBE_STATE, ALL_MOVES[1]!);
    const result = solveBfs(singleMoveState);
    expect(result.status).toBe('SOLVED');
    if (result.status === 'SOLVED') {
      expect(result.depth).toBe(1);
      expect(result.moves.length).toBe(1);
      const solved = applyMove(singleMoveState, result.moves[0]!);
      expect(isSolved(solved)).toBe(true);
      expect(result.counters.nodesExpanded).toBe(1);
      expect(result.counters.nodesGenerated).toBe(12);
    }
  });

  it('guarantees deterministic identical move sequence across multiple runs', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[3]!.serializedState);
    const run1 = solveBfs(state);
    const run2 = solveBfs(state);
    const run3 = solveBfs(state);

    expect(run1.status).toBe('SOLVED');
    expect(run2.status).toBe('SOLVED');
    expect(run3.status).toBe('SOLVED');

    if (run1.status === 'SOLVED' && run2.status === 'SOLVED' && run3.status === 'SOLVED') {
      expect(run1.moves).toEqual(run2.moves);
      expect(run2.moves).toEqual(run3.moves);
      expect(run1.depth).toBe(run2.depth);
    }
  });

  it('does not mutate input state', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[1]!.serializedState);
    const stateCopy = JSON.parse(JSON.stringify(state));
    solveBfs(state);
    expect(state).toEqual(stateCopy);
  });

  it('synchronously validates and rejects invalid options with TypeError', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[0]!.serializedState);

    // Invalid maxNodes
    expect(() => solveBfs(state, { maxNodes: 0 })).toThrow(TypeError);
    expect(() => solveBfs(state, { maxNodes: -1 })).toThrow(TypeError);
    expect(() => solveBfs(state, { maxNodes: 1.5 })).toThrow(TypeError);
    expect(() => solveBfs(state, { maxNodes: NaN })).toThrow(TypeError);
    expect(() => solveBfs(state, { maxNodes: Infinity })).toThrow(TypeError);

    // Invalid maxDepth
    expect(() => solveBfs(state, { maxDepth: -1 })).toThrow(TypeError);
    expect(() => solveBfs(state, { maxDepth: 2.5 })).toThrow(TypeError);
    expect(() => solveBfs(state, { maxDepth: NaN })).toThrow(TypeError);

    // Invalid progressIntervalNodes
    expect(() => solveBfs(state, { progressIntervalNodes: 0 })).toThrow(TypeError);
    expect(() => solveBfs(state, { progressIntervalNodes: -5 })).toThrow(TypeError);
    expect(() => solveBfs(state, { progressIntervalNodes: 1.1 })).toThrow(TypeError);

    // Invalid options type
    expect(() => solveBfs(state, 'invalid' as any)).toThrow(TypeError);
    expect(() => solveBfs(state, { onProgress: 'not-a-fn' as any })).toThrow(TypeError);

    // Rejection occurs even on solved state
    expect(() => solveBfs(SOLVED_GEAR_CUBE_STATE, { maxNodes: 0 })).toThrow(TypeError);
  });

  it('verifies maxDepth = 0 semantics', () => {
    // Solved state with maxDepth 0 -> SOLVED
    const solvedRes = solveBfs(SOLVED_GEAR_CUBE_STATE, { maxDepth: 0 });
    expect(solvedRes.status).toBe('SOLVED');

    // Unsolved state with maxDepth 0 -> LIMIT_REACHED (MAX_DEPTH)
    const unsolvedState = applyMove(SOLVED_GEAR_CUBE_STATE, ALL_MOVES[4]!);
    const limitRes = solveBfs(unsolvedState, { maxDepth: 0 });
    expect(limitRes.status).toBe('LIMIT_REACHED');
    if (limitRes.status === 'LIMIT_REACHED') {
      expect(limitRes.limit).toBe('MAX_DEPTH');
      expect(limitRes.counters.nodesExpanded).toBe(0);
      expect(limitRes.counters.nodesGenerated).toBe(0);
    }
  });

  it('verifies exact maxDepth boundaries on known depth-1 and depth-2 fixtures', () => {
    const fixture1 = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[0]!.serializedState);
    expect(solveBfs(fixture1, { maxDepth: 0 }).status).toBe('LIMIT_REACHED');
    expect(solveBfs(fixture1, { maxDepth: 1 }).status).toBe('SOLVED');

    const fixture2 = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[1]!.serializedState);
    expect(solveBfs(fixture2, { maxDepth: 1 }).status).toBe('LIMIT_REACHED');
    expect(solveBfs(fixture2, { maxDepth: 2 }).status).toBe('SOLVED');
  });

  it('verifies maxNodes limits expansions and returns MAX_NODES limit reached', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[2]!.serializedState);
    const result = solveBfs(state, { maxNodes: 5 });
    expect(result.status).toBe('LIMIT_REACHED');
    if (result.status === 'LIMIT_REACHED') {
      expect(result.limit).toBe('MAX_NODES');
      expect(result.counters.nodesExpanded).toBe(5);
      expect(result.counters.nodesGenerated).toBe(60);
    }
  });

  it('verifies goal dequeued when nodesExpanded === maxNodes returns SOLVED', () => {
    const state = applyMove(SOLVED_GEAR_CUBE_STATE, ALL_MOVES[1]!);
    // maxNodes: 1 allows expanding root (nodesExpanded = 1) and goal ALL_MOVES[0] is first dequeued on next step
    const result = solveBfs(state, { maxNodes: 1 });
    expect(result.status).toBe('SOLVED');
    if (result.status === 'SOLVED') {
      expect(result.depth).toBe(1);
      expect(result.counters.nodesExpanded).toBe(1);
    }
  });

  it('emits onProgress telemetry at specified interval multiples', () => {
    const telemetryEvents: SearchTelemetry[] = [];
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[2]!.serializedState);

    const result = solveBfs(state, {
      progressIntervalNodes: 50,
      onProgress: (t) => telemetryEvents.push(t),
    });

    expect(result.status).toBe('SOLVED');
    if (result.status === 'SOLVED' && result.counters.nodesExpanded >= 50) {
      expect(telemetryEvents.length).toBeGreaterThan(0);
      for (const event of telemetryEvents) {
        expect(event.algorithm).toBe('BFS');
        expect(event.nodesExpanded % 50).toBe(0);
        expect(event.nodesGenerated).toBe(event.nodesExpanded * 12);
        expect(event.elapsedMs).toBeGreaterThanOrEqual(0);
        expect(event.frontierDepth).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
