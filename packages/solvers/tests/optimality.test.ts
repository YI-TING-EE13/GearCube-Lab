import { describe, it, expect } from 'vitest';
import {
  applyMove,
  deserializeLogicalState,
  isSolved,
  type GearCubeState,
} from '@gearcube/core';
import { solveBfs } from '../src/bfs.js';
import { solveBidirectionalBfs } from '../src/bidirectional-bfs.js';
import { EXACT_DISTANCE_FIXTURES } from './fixtures.js';

describe('Phase 4B BFS & BiBFS Optimality & Equivalence Verification Suite', () => {
  for (const fixture of EXACT_DISTANCE_FIXTURES) {
    it(`verifies BFS and BiBFS optimality on exact distance ${fixture.expectedExactDistance} fixture`, () => {
      const state = deserializeLogicalState(fixture.serializedState);

      // Run BFS
      const bfsResult = solveBfs(state);
      expect(bfsResult.status).toBe('SOLVED');
      if (bfsResult.status === 'SOLVED') {
        expect(bfsResult.depth).toBe(fixture.expectedExactDistance);
        expect(bfsResult.moves.length).toBe(fixture.expectedExactDistance);

        let curr = state;
        for (const m of bfsResult.moves) {
          curr = applyMove(curr, m);
        }
        expect(isSolved(curr)).toBe(true);
      }

      // Run BiBFS
      const bibfsResult = solveBidirectionalBfs(state);
      expect(bibfsResult.status).toBe('SOLVED');
      if (bibfsResult.status === 'SOLVED') {
        expect(bibfsResult.depth).toBe(fixture.expectedExactDistance);
        expect(bibfsResult.moves.length).toBe(fixture.expectedExactDistance);

        let curr = state;
        for (const m of bibfsResult.moves) {
          curr = applyMove(curr, m);
        }
        expect(isSolved(curr)).toBe(true);
      }

      // Both solvers must find proven optimal length
      if (bfsResult.status === 'SOLVED' && bibfsResult.status === 'SOLVED') {
        expect(bfsResult.depth).toBe(bibfsResult.depth);
      }
    });
  }

  it('proves depth 8 determinism across multiple runs for both solvers', () => {
    const depth8Fixture = EXACT_DISTANCE_FIXTURES[7]!;
    expect(depth8Fixture.expectedExactDistance).toBe(8);
    const state = deserializeLogicalState(depth8Fixture.serializedState);

    // BFS determinism
    const bfs1 = solveBfs(state);
    const bfs2 = solveBfs(state);
    expect(bfs1.status).toBe('SOLVED');
    expect(bfs2.status).toBe('SOLVED');
    if (bfs1.status === 'SOLVED' && bfs2.status === 'SOLVED') {
      expect(bfs1.depth).toBe(8);
      expect(bfs1.moves).toEqual(bfs2.moves);
    }

    // BiBFS determinism
    const bibfs1 = solveBidirectionalBfs(state);
    const bibfs2 = solveBidirectionalBfs(state);
    expect(bibfs1.status).toBe('SOLVED');
    expect(bibfs2.status).toBe('SOLVED');
    if (bibfs1.status === 'SOLVED' && bibfs2.status === 'SOLVED') {
      expect(bibfs1.depth).toBe(8);
      expect(bibfs1.moves).toEqual(bibfs2.moves);
    }
  });
});
