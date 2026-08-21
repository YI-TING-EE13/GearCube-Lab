/**
 * @file transitions.test.ts
 * @description Unit tests for Phase 1C canonical move transitions, golden vectors, validation, and anti-aliasing.
 */

import { describe, expect, it } from 'vitest';
import * as corePublicApi from '../src/index.js';
import {
  ALL_MOVES,
  applyMove,
  CANONICAL_DOMAIN_SIZE,
  CORNER_CONFIGURATION_COUNT,
  CORNER_CONFIGURATIONS,
  DIRECTIONS,
  EDGE_SLICE_STATE_COUNT,
  equalsGearCubeState,
  FACES,
  isCornerConfiguration,
  isDirection,
  isEdgeSliceCoordinate,
  isFace,
  isGearCubeState,
  isMove,
  isSliceGearPhase,
  isSlicePermutationClass,
  isSolved,
  SLICE_GEAR_PHASES,
  SLICE_PERMUTATION_CLASSES,
  SOLVED_GEAR_CUBE_STATE,
  type GearCubeState,
  type Move,
} from '../src/index.js';

/** Test-local helper mapping CW <-> CCW for property assertions */
function inverseMove(move: Move): Move {
  return {
    face: move.face,
    direction: move.direction === 'CW' ? 'CCW' : 'CW',
  };
}

describe('Phase 1C — Canonical Move Transitions Unit Tests', () => {
  describe('Solved-State 12 Golden Transition Vectors', () => {
    it('U CW: C=6, X=(1,0), Y=(3,1), Z=(1,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'U', direction: 'CW' });
      expect(next).toEqual({
        cornerConfiguration: 6,
        sliceX: { permutationClass: 1, phase: 0 },
        sliceY: { permutationClass: 3, phase: 1 },
        sliceZ: { permutationClass: 1, phase: 0 },
      });
    });

    it('U CCW: C=6, X=(1,0), Y=(1,2), Z=(1,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'U', direction: 'CCW' });
      expect(next).toEqual({
        cornerConfiguration: 6,
        sliceX: { permutationClass: 1, phase: 0 },
        sliceY: { permutationClass: 1, phase: 2 },
        sliceZ: { permutationClass: 1, phase: 0 },
      });
    });

    it('D CW: C=1, X=(0,0), Y=(1,2), Z=(0,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'D', direction: 'CW' });
      expect(next).toEqual({
        cornerConfiguration: 1,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 1, phase: 2 },
        sliceZ: { permutationClass: 0, phase: 0 },
      });
    });

    it('D CCW: C=1, X=(0,0), Y=(3,1), Z=(0,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'D', direction: 'CCW' });
      expect(next).toEqual({
        cornerConfiguration: 1,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 3, phase: 1 },
        sliceZ: { permutationClass: 0, phase: 0 },
      });
    });

    it('F CW: C=14, X=(0,0), Y=(1,0), Z=(3,1)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'F', direction: 'CW' });
      expect(next).toEqual({
        cornerConfiguration: 14,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 1, phase: 0 },
        sliceZ: { permutationClass: 3, phase: 1 },
      });
    });

    it('F CCW: C=14, X=(0,0), Y=(1,0), Z=(1,2)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'F', direction: 'CCW' });
      expect(next).toEqual({
        cornerConfiguration: 14,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 1, phase: 0 },
        sliceZ: { permutationClass: 1, phase: 2 },
      });
    });

    it('B CW: C=5, X=(3,0), Y=(0,0), Z=(1,2)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'B', direction: 'CW' });
      expect(next).toEqual({
        cornerConfiguration: 5,
        sliceX: { permutationClass: 3, phase: 0 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 1, phase: 2 },
      });
    });

    it('B CCW: C=5, X=(3,0), Y=(0,0), Z=(3,1)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'B', direction: 'CCW' });
      expect(next).toEqual({
        cornerConfiguration: 5,
        sliceX: { permutationClass: 3, phase: 0 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 3, phase: 1 },
      });
    });

    it('R CW: C=21, X=(3,1), Y=(0,0), Z=(3,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'R', direction: 'CW' });
      expect(next).toEqual({
        cornerConfiguration: 21,
        sliceX: { permutationClass: 3, phase: 1 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 3, phase: 0 },
      });
    });

    it('R CCW: C=21, X=(1,2), Y=(0,0), Z=(3,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'R', direction: 'CCW' });
      expect(next).toEqual({
        cornerConfiguration: 21,
        sliceX: { permutationClass: 1, phase: 2 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 3, phase: 0 },
      });
    });

    it('L CW: C=2, X=(1,2), Y=(3,0), Z=(0,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'L', direction: 'CW' });
      expect(next).toEqual({
        cornerConfiguration: 2,
        sliceX: { permutationClass: 1, phase: 2 },
        sliceY: { permutationClass: 3, phase: 0 },
        sliceZ: { permutationClass: 0, phase: 0 },
      });
    });

    it('L CCW: C=2, X=(3,1), Y=(3,0), Z=(0,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'L', direction: 'CCW' });
      expect(next).toEqual({
        cornerConfiguration: 2,
        sliceX: { permutationClass: 3, phase: 1 },
        sliceY: { permutationClass: 3, phase: 0 },
        sliceZ: { permutationClass: 0, phase: 0 },
      });
    });
  });

  describe('Input Validation & Error Behavior', () => {
    it('throws TypeError when state is invalid', () => {
      expect(() => applyMove(null as unknown as GearCubeState, { face: 'U', direction: 'CW' })).toThrow(
        TypeError
      );
      expect(() =>
        applyMove(
          { cornerConfiguration: 24, sliceX: { permutationClass: 0, phase: 0 }, sliceY: { permutationClass: 0, phase: 0 }, sliceZ: { permutationClass: 0, phase: 0 } } as unknown as GearCubeState,
          { face: 'U', direction: 'CW' }
        )
      ).toThrow(TypeError);
    });

    it('throws TypeError when move is invalid', () => {
      expect(() => applyMove(SOLVED_GEAR_CUBE_STATE, null as unknown as Move)).toThrow(TypeError);
      expect(() =>
        applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'M' as unknown as 'U', direction: 'CW' })
      ).toThrow(TypeError);
      expect(() =>
        applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'U', direction: 'FORWARD' as unknown as 'CW' })
      ).toThrow(TypeError);
    });

    it('reports state validation error first when both state and move are invalid', () => {
      expect(() => applyMove('bad-state' as unknown as GearCubeState, 'bad-move' as unknown as Move)).toThrow(
        'Invalid GearCubeState'
      );
    });
  });

  describe('Immutability and Anti-Aliasing Policy', () => {
    it('does not mutate input state', () => {
      const input: GearCubeState = {
        cornerConfiguration: 0,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 0, phase: 0 },
      };
      const inputCopy = JSON.parse(JSON.stringify(input));
      applyMove(input, { face: 'U', direction: 'CW' });
      expect(input).toEqual(inputCopy);
    });

    it('always returns fresh outer object and fresh slice objects', () => {
      const input: GearCubeState = {
        cornerConfiguration: 0,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 0, phase: 0 },
      };
      const out = applyMove(input, { face: 'D', direction: 'CW' });
      expect(out).not.toBe(input);
      expect(out.sliceX).not.toBe(input.sliceX);
      expect(out.sliceY).not.toBe(input.sliceY);
      expect(out.sliceZ).not.toBe(input.sliceZ);
    });

    it('mutating caller-owned input object after applyMove does not affect output', () => {
      const mutableInput = {
        cornerConfiguration: 0,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 0, phase: 0 },
      };
      const out = applyMove(mutableInput as GearCubeState, { face: 'R', direction: 'CW' });
      mutableInput.cornerConfiguration = 99;
      mutableInput.sliceX.phase = 2;
      expect(out.cornerConfiguration).toBe(21);
      expect(out.sliceX.phase).toBe(1);
    });
  });

  describe('Opposing Face Commutativity', () => {
    it('U and D moves commute', () => {
      const uThenD = applyMove(
        applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'U', direction: 'CW' }),
        { face: 'D', direction: 'CW' }
      );
      const dThenU = applyMove(
        applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'D', direction: 'CW' }),
        { face: 'U', direction: 'CW' }
      );
      expect(equalsGearCubeState(uThenD, dThenU)).toBe(true);
    });

    it('F and B moves commute', () => {
      const fThenB = applyMove(
        applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'F', direction: 'CW' }),
        { face: 'B', direction: 'CW' }
      );
      const bThenF = applyMove(
        applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'B', direction: 'CW' }),
        { face: 'F', direction: 'CW' }
      );
      expect(equalsGearCubeState(fThenB, bThenF)).toBe(true);
    });

    it('R and L moves commute', () => {
      const rThenL = applyMove(
        applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'R', direction: 'CW' }),
        { face: 'L', direction: 'CW' }
      );
      const lThenR = applyMove(
        applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'L', direction: 'CW' }),
        { face: 'R', direction: 'CW' }
      );
      expect(equalsGearCubeState(rThenL, lThenR)).toBe(true);
    });
  });

  describe('Public API Surface Audit', () => {
    it('preserves all Phase 1B exports and adds only applyMove', () => {
      const expectedPhase1BExports = [
        'FACES',
        'DIRECTIONS',
        'CORNER_CONFIGURATIONS',
        'SLICE_PERMUTATION_CLASSES',
        'SLICE_GEAR_PHASES',
        'ALL_MOVES',
        'CORNER_CONFIGURATION_COUNT',
        'EDGE_SLICE_STATE_COUNT',
        'CANONICAL_DOMAIN_SIZE',
        'SOLVED_GEAR_CUBE_STATE',
        'isFace',
        'isDirection',
        'isMove',
        'isCornerConfiguration',
        'isSlicePermutationClass',
        'isSliceGearPhase',
        'isEdgeSliceCoordinate',
        'isGearCubeState',
        'equalsGearCubeState',
        'isSolved',
      ];

      for (const symbol of expectedPhase1BExports) {
        expect(corePublicApi).toHaveProperty(symbol);
      }

      expect(corePublicApi).toHaveProperty('applyMove');
      expect(typeof corePublicApi.applyMove).toBe('function');

      // Verify no internal transition tables or test helpers are exported
      expect(corePublicApi).not.toHaveProperty('inverseMove');
      expect(corePublicApi).not.toHaveProperty('CORNER_TRANSITIONS');
      expect(corePublicApi).not.toHaveProperty('SLICE_K_TRANSITIONS');
      expect(corePublicApi).not.toHaveProperty('SLICE_DELTA_PHASES');
      expect(corePublicApi).not.toHaveProperty('referenceOracle');
    });
  });
});
