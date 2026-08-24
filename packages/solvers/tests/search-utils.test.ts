import { describe, it, expect } from 'vitest';
import {
  ALL_MOVES,
  CORNER_CONFIGURATIONS,
  equalsGearCubeState,
  SLICE_PERMUTATION_CLASSES,
  SLICE_GEAR_PHASES,
  applyMove,
  type GearCubeState,
} from '@gearcube/core';
import { inverseMove } from '../src/search-utils.js';

describe('Phase 4A — Solver Search Utilities (inverseMove)', () => {
  it('maps all 12 ALL_MOVES to correct same-face opposite direction and satisfies double-inverse identity', () => {
    expect(ALL_MOVES).toHaveLength(12);

    for (const move of ALL_MOVES) {
      const inv = inverseMove(move);
      expect(inv.face).toBe(move.face);
      expect(inv.direction).toBe(move.direction === 'CW' ? 'CCW' : 'CW');
      expect(inverseMove(inv)).toEqual(move);
    }
  });

  it('verifies exact algebraic inverse recovery across all 497,664 state-move transitions', { timeout: 30000 }, () => {
    let transitionCount = 0;
    let failureCount = 0;

    for (const c of CORNER_CONFIGURATIONS) {
      for (const px of SLICE_PERMUTATION_CLASSES) {
        for (const hx of SLICE_GEAR_PHASES) {
          for (const py of SLICE_PERMUTATION_CLASSES) {
            for (const hy of SLICE_GEAR_PHASES) {
              for (const pz of SLICE_PERMUTATION_CLASSES) {
                for (const hz of SLICE_GEAR_PHASES) {
                  const state: GearCubeState = {
                    cornerConfiguration: c,
                    sliceX: { permutationClass: px, phase: hx },
                    sliceY: { permutationClass: py, phase: hy },
                    sliceZ: { permutationClass: pz, phase: hz },
                  };

                  for (const move of ALL_MOVES) {
                    const nextState = applyMove(state, move);
                    const restoredState = applyMove(nextState, inverseMove(move));
                    if (!equalsGearCubeState(restoredState, state)) {
                      failureCount++;
                    }
                    transitionCount++;
                  }
                }
              }
            }
          }
        }
      }
    }

    expect(transitionCount).toBe(497664);
    expect(failureCount).toBe(0);
  });
});
