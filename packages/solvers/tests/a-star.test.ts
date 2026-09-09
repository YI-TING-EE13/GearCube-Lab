import { beforeAll, describe, expect, it } from 'vitest';
import {
  applyMove,
  deserializeLogicalState,
  isSolved,
  serializeLogicalState,
  SOLVED_GEAR_CUBE_STATE,
  type GearCubeState,
  type Move,
} from '@gearcube/core';
import { solveAStar } from '../src/a-star.js';
import type { SearchTelemetry, SolverOptions } from '../src/types.js';
import { EXACT_DISTANCE_FIXTURES } from './fixtures.js';
import { buildExactDistanceOracle } from './exact-distance-oracle.js';

function applyMoveSequence(state: GearCubeState, moves: readonly Move[]): GearCubeState {
  let current = state;
  for (const move of moves) {
    current = applyMove(current, move);
  }
  return current;
}

function collectRepresentativeCorpus(): Array<{ state: GearCubeState; exactDepth: number }> {
  const oracle = buildExactDistanceOracle();
  const statesByDepth = new Map<number, Array<{ state: GearCubeState; exactDepth: number }>>();

  for (const [stateKey, exactDepth] of oracle.distances) {
    if (exactDepth < 1 || exactDepth > 8) {
      continue;
    }
    const bucket = statesByDepth.get(exactDepth) ?? [];
    bucket.push({ state: deserializeLogicalState(stateKey), exactDepth });
    statesByDepth.set(exactDepth, bucket);
  }

  const corpus: Array<{ state: GearCubeState; exactDepth: number }> = [];
  for (let depth = 1; depth <= 8; depth++) {
    const bucket = statesByDepth.get(depth) ?? [];
    const sampleCount = depth === 1 ? bucket.length : Math.min(16, bucket.length);
    corpus.push(...bucket.slice(0, sampleCount));
  }
  return corpus;
}

describe('M6.1 — A* H2 Solver Contract & Optimality Suite', () => {
  let representativeCorpus: Array<{ state: GearCubeState; exactDepth: number }>;

  beforeAll(() => {
    representativeCorpus = collectRepresentativeCorpus();
  });

  it('handles solved input with an empty optimal path and zero search work', () => {
    const result = solveAStar(SOLVED_GEAR_CUBE_STATE);

    expect(result.status).toBe('SOLVED');
    expect(result.algorithm).toBe('A_STAR');
    if (result.status === 'SOLVED') {
      expect(result.moves).toEqual([]);
      expect(result.depth).toBe(0);
      expect(result.counters).toEqual({ nodesExpanded: 0, nodesGenerated: 0 });
      expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('rejects the same invalid option shapes and values as the existing solvers', () => {
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
      { onProgress: 'not-a-function' },
    ];

    for (const options of invalidOptions) {
      expect(() => solveAStar(SOLVED_GEAR_CUBE_STATE, options as SolverOptions)).toThrow(TypeError);
      expect(() => solveAStar(representativeCorpus[0]!.state, options as SolverOptions)).toThrow(TypeError);
    }
  });

  it('returns exact optimal paths for fixtures at every depth from 1 through 8', () => {
    for (const fixture of EXACT_DISTANCE_FIXTURES) {
      const state = deserializeLogicalState(fixture.serializedState);
      const originalKey = serializeLogicalState(state);
      const result = solveAStar(state);

      expect(result.status).toBe('SOLVED');
      expect(result.algorithm).toBe('A_STAR');
      if (result.status === 'SOLVED') {
        expect(result.depth).toBe(fixture.expectedExactDistance);
        expect(result.moves).toHaveLength(fixture.expectedExactDistance);
        expect(isSolved(applyMoveSequence(state, result.moves))).toBe(true);
      }
      expect(serializeLogicalState(state)).toBe(originalKey);
    }
  });

  it('matches the independent exact-distance oracle on a deterministic corpus spanning depths 1 through 8', () => {
    expect(representativeCorpus.length).toBeGreaterThanOrEqual(100);

    for (const { state, exactDepth } of representativeCorpus) {
      const originalKey = serializeLogicalState(state);
      const result = solveAStar(state);

      expect(result.status).toBe('SOLVED');
      if (result.status === 'SOLVED') {
        expect(result.depth).toBe(exactDepth);
        expect(result.moves).toHaveLength(exactDepth);
        expect(isSolved(applyMoveSequence(state, result.moves))).toBe(true);
      }
      expect(serializeLogicalState(state)).toBe(originalKey);
    }
  }, 30000);

  it('enforces maxDepth at zero, below, and exactly at the known solution depth', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[2]!.serializedState);

    const zeroDepth = solveAStar(state, { maxDepth: 0 });
    expect(zeroDepth).toMatchObject({
      status: 'LIMIT_REACHED',
      algorithm: 'A_STAR',
      limit: 'MAX_DEPTH',
      counters: { nodesExpanded: 0, nodesGenerated: 0 },
    });

    const belowDepth = solveAStar(state, { maxDepth: 2 });
    expect(belowDepth.status).toBe('LIMIT_REACHED');
    if (belowDepth.status === 'LIMIT_REACHED') {
      expect(belowDepth.limit).toBe('MAX_DEPTH');
      expect(belowDepth.counters.nodesExpanded).toBeGreaterThanOrEqual(0);
    }

    const exactDepth = solveAStar(state, { maxDepth: 3 });
    expect(exactDepth.status).toBe('SOLVED');
    if (exactDepth.status === 'SOLVED') {
      expect(exactDepth.depth).toBe(3);
    }
  });

  it('counts only expanded search nodes against maxNodes and reports generated successors separately', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[7]!.serializedState);
    const result = solveAStar(state, { maxNodes: 1 });

    expect(result.status).toBe('LIMIT_REACHED');
    if (result.status === 'LIMIT_REACHED') {
      expect(result.algorithm).toBe('A_STAR');
      expect(result.limit).toBe('MAX_NODES');
      expect(result.counters.nodesExpanded).toBe(1);
      expect(result.counters.nodesGenerated).toBe(12);
    }
  });

  it('emits deterministic A* telemetry with H2/open-set fields at the configured cadence', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[7]!.serializedState);
    const telemetry: SearchTelemetry[] = [];
    const result = solveAStar(state, {
      progressIntervalNodes: 1,
      onProgress: (snapshot) => telemetry.push(snapshot),
    });

    expect(result.status).toBe('SOLVED');
    expect(telemetry.length).toBeGreaterThan(0);
    for (const snapshot of telemetry) {
      expect(snapshot.algorithm).toBe('A_STAR');
      expect(snapshot.nodesExpanded).toBeGreaterThan(0);
      expect(snapshot.nodesGenerated).toBeGreaterThanOrEqual(snapshot.nodesExpanded);
      expect(snapshot.elapsedMs).toBeGreaterThanOrEqual(0);
      if (snapshot.algorithm === 'A_STAR') {
        expect(snapshot.bestF).toBeGreaterThanOrEqual(0);
        expect(snapshot.currentDepth).toBeGreaterThanOrEqual(0);
        expect(snapshot.openSize).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('is deterministic in terminal status, path, depth, and counters', () => {
    const state = deserializeLogicalState(EXACT_DISTANCE_FIXTURES[7]!.serializedState);
    const first = solveAStar(state);
    const second = solveAStar(state);

    expect({
      status: first.status,
      algorithm: first.algorithm,
      depth: first.status === 'SOLVED' ? first.depth : undefined,
      moves: first.status === 'SOLVED' ? first.moves : undefined,
      limit: first.status === 'LIMIT_REACHED' ? first.limit : undefined,
      counters: first.counters,
    }).toEqual({
      status: second.status,
      algorithm: second.algorithm,
      depth: second.status === 'SOLVED' ? second.depth : undefined,
      moves: second.status === 'SOLVED' ? second.moves : undefined,
      limit: second.status === 'LIMIT_REACHED' ? second.limit : undefined,
      counters: second.counters,
    });
  });
});
