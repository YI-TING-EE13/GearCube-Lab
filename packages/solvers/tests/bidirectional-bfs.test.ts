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
import { solveBidirectionalBfs } from '../src/bidirectional-bfs.js';
import type { SearchTelemetry } from '../src/types.js';
import { EXACT_DISTANCE_FIXTURES } from './fixtures.js';

describe('Phase 4B Bidirectional Breadth-First Search (BiBFS) Suite', () => {
  it('returns immediate zero-move solution for already solved state', () => {
    const result = solveBidirectionalBfs(SOLVED_GEAR_CUBE_STATE);
    expect(result.status).toBe('SOLVED');
    if (result.status === 'SOLVED') {
      expect(result.algorithm).toBe('BIDIRECTIONAL_BFS');
      expect(result.moves).toEqual([]);
      expect(result.depth).toBe(0);
      expect(result.counters.nodesExpanded).toBe(0);
      expect(result.counters.nodesGenerated).toBe(0);
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('solves single-move state with exact depth 1', () => {
    const singleMoveState = applyMove(SOLVED_GEAR_CUBE_STATE, ALL_MOVES[3]!);
    const result = solveBidirectionalBfs(singleMoveState);
    expect(result.status).toBe('SOLVED');
    if (result.status === 'SOLVED') {
      expect(result.depth).toBe(1);
      expect(result.moves.length).toBe(1);
      const solved = applyMove(singleMoveState, result.moves[0]!);
      expect(isSolved(solved)).toBe(true);
    }
  });

  it('guarantees deterministic identical move sequence across multiple runs', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[4]!.serializedState);
    const run1 = solveBidirectionalBfs(state);
    const run2 = solveBidirectionalBfs(state);
    const run3 = solveBidirectionalBfs(state);

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
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[3]!.serializedState);
    const stateCopy = JSON.parse(JSON.stringify(state));
    solveBidirectionalBfs(state);
    expect(state).toEqual(stateCopy);
  });

  it('synchronously validates and rejects invalid options with TypeError', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[0]!.serializedState);

    expect(() => solveBidirectionalBfs(state, { maxNodes: 0 })).toThrow(TypeError);
    expect(() => solveBidirectionalBfs(state, { maxNodes: -1 })).toThrow(TypeError);
    expect(() => solveBidirectionalBfs(state, { maxNodes: 2.3 })).toThrow(TypeError);
    expect(() => solveBidirectionalBfs(state, { maxDepth: -1 })).toThrow(TypeError);
    expect(() => solveBidirectionalBfs(state, { maxDepth: 1.5 })).toThrow(TypeError);
    expect(() => solveBidirectionalBfs(state, { progressIntervalNodes: 0 })).toThrow(TypeError);
    expect(() => solveBidirectionalBfs(state, 'bad' as any)).toThrow(TypeError);
    expect(() => solveBidirectionalBfs(SOLVED_GEAR_CUBE_STATE, { maxDepth: -1 })).toThrow(TypeError);
  });

  it('verifies maxDepth = 0 semantics', () => {
    const solvedRes = solveBidirectionalBfs(SOLVED_GEAR_CUBE_STATE, { maxDepth: 0 });
    expect(solvedRes.status).toBe('SOLVED');

    const unsolvedState = applyMove(SOLVED_GEAR_CUBE_STATE, ALL_MOVES[5]!);
    const limitRes = solveBidirectionalBfs(unsolvedState, { maxDepth: 0 });
    expect(limitRes.status).toBe('LIMIT_REACHED');
    if (limitRes.status === 'LIMIT_REACHED') {
      expect(limitRes.limit).toBe('MAX_DEPTH');
      expect(limitRes.counters.nodesExpanded).toBe(0);
      expect(limitRes.counters.nodesGenerated).toBe(0);
    }
  });

  it('verifies exact maxDepth boundaries on fixtures', () => {
    const fixture3 = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[2]!.serializedState);
    expect(solveBidirectionalBfs(fixture3, { maxDepth: 2 }).status).toBe('LIMIT_REACHED');
    expect(solveBidirectionalBfs(fixture3, { maxDepth: 3 }).status).toBe('SOLVED');
  });

  it('verifies maxNodes limits aggregate expansions', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[3]!.serializedState);
    const result = solveBidirectionalBfs(state, { maxNodes: 10 });
    expect(result.status).toBe('LIMIT_REACHED');
    if (result.status === 'LIMIT_REACHED') {
      expect(result.limit).toBe('MAX_NODES');
      expect(result.counters.nodesExpanded).toBe(10);
      expect(result.counters.nodesGenerated).toBe(120);
    }
  });

  it('emits onProgress telemetry with BiBFS telemetry payload', () => {
    const telemetryEvents: SearchTelemetry[] = [];
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[3]!.serializedState);

    const result = solveBidirectionalBfs(state, {
      progressIntervalNodes: 20,
      onProgress: (t) => telemetryEvents.push(t),
    });

    expect(result.status).toBe('SOLVED');
    if (result.status === 'SOLVED' && result.counters.nodesExpanded >= 20) {
      expect(telemetryEvents.length).toBeGreaterThan(0);
      for (const event of telemetryEvents) {
        expect(event.algorithm).toBe('BIDIRECTIONAL_BFS');
        if (event.algorithm === 'BIDIRECTIONAL_BFS') {
          expect(event.nodesExpanded % 20).toBe(0);
          expect(event.nodesGenerated).toBe(event.nodesExpanded * 12);
          expect(event.elapsedMs).toBeGreaterThanOrEqual(0);
          expect(event.forwardDepth).toBeGreaterThanOrEqual(0);
          expect(event.backwardDepth).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('verifies correct bidirectional meeting reconstruction for multi-step scramble', () => {
    // Generate a 5-move scramble using ALL_MOVES
    const scrambleMoves: Move[] = [
      ALL_MOVES[0]!,
      ALL_MOVES[4]!,
      ALL_MOVES[8]!,
      ALL_MOVES[2]!,
      ALL_MOVES[6]!,
    ];
    let state = SOLVED_GEAR_CUBE_STATE;
    for (const m of scrambleMoves) {
      state = applyMove(state, m);
    }

    const result = solveBidirectionalBfs(state);
    expect(result.status).toBe('SOLVED');
    if (result.status === 'SOLVED') {
      expect(result.depth).toBe(result.moves.length);
      expect(result.depth).toBeLessThanOrEqual(5);

      let curr = state;
      for (const m of result.moves) {
        curr = applyMove(curr, m);
      }
      expect(isSolved(curr)).toBe(true);
    }
  });
});
