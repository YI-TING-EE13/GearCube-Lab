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

    it('D CW: C=6, X=(1,0), Y=(3,2), Z=(1,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'D', direction: 'CW' });
      expect(next).toEqual({
        cornerConfiguration: 6,
        sliceX: { permutationClass: 1, phase: 0 },
        sliceY: { permutationClass: 3, phase: 2 },
        sliceZ: { permutationClass: 1, phase: 0 },
      });
    });

    it('D CCW: C=6, X=(1,0), Y=(1,1), Z=(1,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'D', direction: 'CCW' });
      expect(next).toEqual({
        cornerConfiguration: 6,
        sliceX: { permutationClass: 1, phase: 0 },
        sliceY: { permutationClass: 1, phase: 1 },
        sliceZ: { permutationClass: 1, phase: 0 },
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

    it('B CW: C=14, X=(0,0), Y=(1,0), Z=(3,2)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'B', direction: 'CW' });
      expect(next).toEqual({
        cornerConfiguration: 14,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 1, phase: 0 },
        sliceZ: { permutationClass: 3, phase: 2 },
      });
    });

    it('B CCW: C=14, X=(0,0), Y=(1,0), Z=(1,1)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'B', direction: 'CCW' });
      expect(next).toEqual({
        cornerConfiguration: 14,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 1, phase: 0 },
        sliceZ: { permutationClass: 1, phase: 1 },
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

    it('L CW: C=21, X=(3,2), Y=(0,0), Z=(3,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'L', direction: 'CW' });
      expect(next).toEqual({
        cornerConfiguration: 21,
        sliceX: { permutationClass: 3, phase: 2 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 3, phase: 0 },
      });
    });

    it('L CCW: C=21, X=(1,1), Y=(0,0), Z=(3,0)', () => {
      const next = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'L', direction: 'CCW' });
      expect(next).toEqual({
        cornerConfiguration: 21,
        sliceX: { permutationClass: 1, phase: 1 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 3, phase: 0 },
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

  describe('Phase 1D / ADR-0005 — Exhaustive Canonical Transition Regression Gate', () => {
    const T_REF: readonly (readonly number[])[] = [
      [0, 1, 2, 3], [1, 0, 2, 3], [0, 2, 1, 3], [2, 0, 1, 3], [1, 2, 0, 3], [2, 1, 0, 3],
      [1, 0, 2, 3], [0, 1, 2, 3], [1, 2, 0, 3], [2, 1, 0, 3], [0, 2, 1, 3], [2, 0, 1, 3],
      [2, 0, 1, 3], [0, 2, 1, 3], [2, 1, 0, 3], [1, 2, 0, 3], [0, 1, 2, 3], [1, 0, 2, 3],
      [2, 1, 0, 3], [1, 2, 0, 3], [2, 0, 1, 3], [0, 2, 1, 3], [1, 0, 2, 3], [0, 1, 2, 3],
    ];
    const T_FREE: readonly (readonly number[])[] = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1],
      [1, 0, 2, 3], [1, 0, 3, 2], [1, 2, 0, 3], [1, 2, 3, 0], [1, 3, 0, 2], [1, 3, 2, 0],
      [2, 0, 1, 3], [2, 0, 3, 1], [2, 1, 0, 3], [2, 1, 3, 0], [2, 3, 0, 1], [2, 3, 1, 0],
      [3, 0, 1, 2], [3, 0, 2, 1], [3, 1, 0, 2], [3, 1, 2, 0], [3, 2, 0, 1], [3, 2, 1, 0],
    ];
    const B_X: readonly (readonly number[])[] = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 3, 2, 1], [0, 3, 1, 2], [0, 2, 3, 1], [0, 2, 1, 3],
      [0, 1, 3, 2], [0, 1, 2, 3], [0, 2, 3, 1], [0, 2, 1, 3], [0, 3, 2, 1], [0, 3, 1, 2],
      [0, 3, 1, 2], [0, 3, 2, 1], [0, 2, 1, 3], [0, 2, 3, 1], [0, 1, 2, 3], [0, 1, 3, 2],
      [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1], [0, 1, 3, 2], [0, 1, 2, 3],
    ];
    const B_Y: readonly (readonly number[])[] = [
      [0, 1, 2, 3], [0, 3, 2, 1], [0, 2, 1, 3], [0, 3, 1, 2], [0, 2, 3, 1], [0, 1, 3, 2],
      [0, 3, 2, 1], [0, 1, 2, 3], [0, 2, 3, 1], [0, 1, 3, 2], [0, 2, 1, 3], [0, 3, 1, 2],
      [0, 3, 1, 2], [0, 2, 1, 3], [0, 1, 3, 2], [0, 2, 3, 1], [0, 1, 2, 3], [0, 3, 2, 1],
      [0, 1, 3, 2], [0, 2, 3, 1], [0, 3, 1, 2], [0, 2, 1, 3], [0, 3, 2, 1], [0, 1, 2, 3],
    ];
    const B_Z: readonly (readonly number[])[] = [
      [0, 1, 2, 3], [0, 1, 3, 2], [0, 2, 1, 3], [0, 2, 3, 1], [0, 3, 1, 2], [0, 3, 2, 1],
      [0, 1, 3, 2], [0, 1, 2, 3], [0, 3, 1, 2], [0, 3, 2, 1], [0, 2, 1, 3], [0, 2, 3, 1],
      [0, 2, 3, 1], [0, 2, 1, 3], [0, 3, 2, 1], [0, 3, 1, 2], [0, 1, 2, 3], [0, 1, 3, 2],
      [0, 3, 2, 1], [0, 3, 1, 2], [0, 2, 3, 1], [0, 2, 1, 3], [0, 1, 3, 2], [0, 1, 2, 3],
    ];
    const V4: readonly (readonly number[])[] = [
      [0, 1, 2, 3], [1, 0, 3, 2], [2, 3, 0, 1], [3, 2, 1, 0],
    ];
    const FRAME_PERMS: Record<number, {
      readonly T_ref: readonly number[];
      readonly T_free: readonly number[];
      readonly X: readonly number[];
      readonly Y: readonly number[];
      readonly Z: readonly number[];
    }> = {
      3: { T_ref: [0, 1, 2, 3], T_free: [0, 1, 2, 3], X: [0, 1, 2, 3], Y: [0, 1, 2, 3], Z: [0, 1, 2, 3] },
      2: { T_ref: [1, 0, 3, 2], T_free: [1, 0, 3, 2], X: [1, 0, 3, 2], Y: [2, 3, 0, 1], Z: [1, 0, 3, 2] },
      1: { T_ref: [2, 3, 0, 1], T_free: [2, 3, 0, 1], X: [3, 2, 1, 0], Y: [1, 0, 3, 2], Z: [2, 3, 0, 1] },
      0: { T_ref: [3, 2, 1, 0], T_free: [3, 2, 1, 0], X: [2, 3, 0, 1], Y: [3, 2, 1, 0], Z: [3, 2, 1, 0] },
    };

    const CORNER_LOOKUP = new Map<string, CornerConfiguration>();
    for (let i = 0; i < 24; i++) {
      CORNER_LOOKUP.set(`${T_REF[i]!.join(',')}|${T_FREE[i]!.join(',')}`, i as CornerConfiguration);
    }
    const V4_LOOKUP = new Map<string, SlicePermutationClass>();
    for (let k = 0; k < 4; k++) {
      V4_LOOKUP.set(V4[k]!.join(','), k as SlicePermutationClass);
    }

    const CORNER_SLOTS = ['UFL', 'UBR', 'DFR', 'DBL', 'UFR', 'UBL', 'DFL', 'DBR'];
    const EDGE_SLOTS = ['UB', 'UF', 'DF', 'DB', 'FL', 'FR', 'BR', 'BL', 'UR', 'UL', 'DL', 'DR'];
    const CORNER_SLOT_COORDS: Record<string, readonly [number, number, number]> = {
      UFL: [-1, 1, 1], UBR: [1, 1, -1], DFR: [1, -1, 1], DBL: [-1, -1, -1],
      UFR: [1, 1, 1], UBL: [-1, 1, -1], DFL: [-1, -1, 1], DBR: [1, -1, -1],
    };
    const EDGE_SLOT_COORDS: Record<string, readonly [number, number, number]> = {
      UB: [0, 1, -1], UF: [0, 1, 1], DF: [0, -1, 1], DB: [0, -1, -1],
      FL: [-1, 0, 1], FR: [1, 0, 1], BR: [1, 0, -1], BL: [-1, 0, -1],
      UR: [1, 1, 0], UL: [-1, 1, 0], DL: [-1, -1, 0], DR: [1, -1, 0],
    };

    function rotX180(v: readonly [number, number, number]): [number, number, number] { return [v[0], -v[1], -v[2]]; }
    function rotY180(v: readonly [number, number, number]): [number, number, number] { return [-v[0], v[1], -v[2]]; }
    function rotZ180(v: readonly [number, number, number]): [number, number, number] { return [-v[0], -v[1], v[2]]; }
    function rotX90(v: readonly [number, number, number], d: number): [number, number, number] { return d === 1 ? [v[0], -v[2], v[1]] : [v[0], v[2], -v[1]]; }
    function rotY90(v: readonly [number, number, number], d: number): [number, number, number] { return d === 1 ? [v[2], v[1], -v[0]] : [-v[2], v[1], v[0]]; }
    function rotZ90(v: readonly [number, number, number], d: number): [number, number, number] { return d === 1 ? [-v[1], v[0], v[2]] : [v[1], -v[0], v[2]]; }

    const PHYS_CORNER_MAP: Record<string, readonly number[]> = {};
    const PHYS_EDGE_MAP: Record<string, readonly number[]> = {};
    const PHYS_EDGE_DP: Record<string, readonly number[]> = {};

    for (const move of ALL_MOVES) {
      const { face, direction } = move;
      const key = `${face}-${direction}`;
      const dirSign = direction === 'CW' ? 1 : -1;
      const cp: number[] = [];
      for (let s = 0; s < 8; s++) {
        const name = CORNER_SLOTS[s]!;
        const coord = CORNER_SLOT_COORDS[name]!;
        let nc = coord;
        if ((face === 'U' && coord[1] === 1) || (face === 'D' && coord[1] === -1)) nc = rotY180(coord);
        else if ((face === 'F' && coord[2] === 1) || (face === 'B' && coord[2] === -1)) nc = rotZ180(coord);
        else if ((face === 'R' && coord[0] === 1) || (face === 'L' && coord[0] === -1)) nc = rotX180(coord);
        const nSlot = Object.keys(CORNER_SLOT_COORDS).find(k => CORNER_SLOT_COORDS[k]![0] === nc[0] && CORNER_SLOT_COORDS[k]![1] === nc[1] && CORNER_SLOT_COORDS[k]![2] === nc[2])!;
        cp.push(CORNER_SLOTS.indexOf(nSlot));
      }
      PHYS_CORNER_MAP[key] = cp;

      const ep: number[] = [];
      const dp: number[] = [];
      for (let s = 0; s < 12; s++) {
        const name = EDGE_SLOTS[s]!;
        const coord = EDGE_SLOT_COORDS[name]!;
        let nc = coord;
        let dPhase = 0;
        if (face === 'U') {
          if (coord[1] === 1) nc = rotY180(coord);
          else if (coord[1] === 0) { nc = rotY90(coord, dirSign === 1 ? -1 : 1); dPhase = dirSign === 1 ? 1 : 2; }
        } else if (face === 'D') {
          if (coord[1] === -1) nc = rotY180(coord);
          else if (coord[1] === 0) { nc = rotY90(coord, dirSign === 1 ? 1 : -1); dPhase = dirSign === 1 ? 2 : 1; }
        } else if (face === 'F') {
          if (coord[2] === 1) nc = rotZ180(coord);
          else if (coord[2] === 0) { nc = rotZ90(coord, dirSign === 1 ? -1 : 1); dPhase = dirSign === 1 ? 1 : 2; }
        } else if (face === 'B') {
          if (coord[2] === -1) nc = rotZ180(coord);
          else if (coord[2] === 0) { nc = rotZ90(coord, dirSign === 1 ? 1 : -1); dPhase = dirSign === 1 ? 2 : 1; }
        } else if (face === 'R') {
          if (coord[0] === 1) nc = rotX180(coord);
          else if (coord[0] === 0) { nc = rotX90(coord, dirSign === 1 ? -1 : 1); dPhase = dirSign === 1 ? 1 : 2; }
        } else if (face === 'L') {
          if (coord[0] === -1) nc = rotX180(coord);
          else if (coord[0] === 0) { nc = rotX90(coord, dirSign === 1 ? 1 : -1); dPhase = dirSign === 1 ? 2 : 1; }
        }
        const nSlot = Object.keys(EDGE_SLOT_COORDS).find(k => EDGE_SLOT_COORDS[k]![0] === nc[0] && EDGE_SLOT_COORDS[k]![1] === nc[1] && EDGE_SLOT_COORDS[k]![2] === nc[2])!;
        ep.push(EDGE_SLOTS.indexOf(nSlot));
        dp.push(dPhase);
      }
      PHYS_EDGE_MAP[key] = ep;
      PHYS_EDGE_DP[key] = dp;
    }

    function independentOracleNextState(state: GearCubeState, move: Move): GearCubeState {
      const c = state.cornerConfiguration;
      const tRefC = T_REF[c]!;
      const tFreeC = T_FREE[c]!;
      const bxC = B_X[c]!;
      const byC = B_Y[c]!;
      const bzC = B_Z[c]!;
      const v4x = V4[state.sliceX.permutationClass]!;
      const v4y = V4[state.sliceY.permutationClass]!;
      const v4z = V4[state.sliceZ.permutationClass]!;

      const fp = FRAME_PERMS[3]!;
      const cView = [
        tRefC[fp.T_ref[0]!]!, tRefC[fp.T_ref[1]!]!, tRefC[fp.T_ref[2]!]!, tRefC[fp.T_ref[3]!]!,
        4 + tFreeC[fp.T_free[0]!]!, 4 + tFreeC[fp.T_free[1]!]!, 4 + tFreeC[fp.T_free[2]!]!, 4 + tFreeC[fp.T_free[3]!]!,
      ];
      const eView = [
        bxC[v4x[fp.X[0]!]!]!, bxC[v4x[fp.X[1]!]!]!, bxC[v4x[fp.X[2]!]!]!, bxC[v4x[fp.X[3]!]!]!,
        4 + byC[v4y[fp.Y[0]!]!]!, 4 + byC[v4y[fp.Y[1]!]!]!, 4 + byC[v4y[fp.Y[2]!]!]!, 4 + byC[v4y[fp.Y[3]!]!]!,
        8 + bzC[v4z[fp.Z[0]!]!]!, 8 + bzC[v4z[fp.Z[1]!]!]!, 8 + bzC[v4z[fp.Z[2]!]!]!, 8 + bzC[v4z[fp.Z[3]!]!]!,
      ];

      const key = `${move.face}-${move.direction}`;
      const cMap = PHYS_CORNER_MAP[key]!;
      const eMap = PHYS_EDGE_MAP[key]!;
      const eDp = PHYS_EDGE_DP[key]!;

      const nextCView: number[] = new Array(8);
      for (let s = 0; s < 8; s++) nextCView[cMap[s]!] = cView[s]!;
      const nextEView: number[] = new Array(12);
      for (let s = 0; s < 12; s++) nextEView[eMap[s]!] = eView[s]!;

      const dblSlot = nextCView.indexOf(3);
      const nextFp = FRAME_PERMS[dblSlot]!;

      const tRefCur = `${nextCView[nextFp.T_ref[0]!]!},${nextCView[nextFp.T_ref[1]!]!},${nextCView[nextFp.T_ref[2]!]!},${nextCView[nextFp.T_ref[3]!]!}`;
      const tFreeCur = `${nextCView[4 + nextFp.T_free[0]!]! - 4},${nextCView[4 + nextFp.T_free[1]!]! - 4},${nextCView[4 + nextFp.T_free[2]!]! - 4},${nextCView[4 + nextFp.T_free[3]!]! - 4}`;
      const nextC = CORNER_LOOKUP.get(`${tRefCur}|${tFreeCur}`)!;

      const nbx = B_X[nextC]!;
      const xCur = `${nbx.indexOf(nextEView[nextFp.X[0]!]!)},${nbx.indexOf(nextEView[nextFp.X[1]!]!)},${nbx.indexOf(nextEView[nextFp.X[2]!]!)},${nbx.indexOf(nextEView[nextFp.X[3]!]!)}`;
      const nextKx = V4_LOOKUP.get(xCur)!;
      const nextPx = ((state.sliceX.phase + eDp[0]!) % 3) as SliceGearPhase;

      const nby = B_Y[nextC]!;
      const yCur = `${nby.indexOf(nextEView[4 + nextFp.Y[0]!]! - 4)},${nby.indexOf(nextEView[4 + nextFp.Y[1]!]! - 4)},${nby.indexOf(nextEView[4 + nextFp.Y[2]!]! - 4)},${nby.indexOf(nextEView[4 + nextFp.Y[3]!]! - 4)}`;
      const nextKy = V4_LOOKUP.get(yCur)!;
      const nextPy = ((state.sliceY.phase + eDp[4]!) % 3) as SliceGearPhase;

      const nbz = B_Z[nextC]!;
      const zCur = `${nbz.indexOf(nextEView[8 + nextFp.Z[0]!]! - 8)},${nbz.indexOf(nextEView[8 + nextFp.Z[1]!]! - 8)},${nbz.indexOf(nextEView[8 + nextFp.Z[2]!]! - 8)},${nbz.indexOf(nextEView[8 + nextFp.Z[3]!]! - 8)}`;
      const nextKz = V4_LOOKUP.get(zCur)!;
      const nextPz = ((state.sliceZ.phase + eDp[8]!) % 3) as SliceGearPhase;

      return {
        cornerConfiguration: nextC,
        sliceX: { permutationClass: nextKx, phase: nextPx },
        sliceY: { permutationClass: nextKy, phase: nextPy },
        sliceZ: { permutationClass: nextKz, phase: nextPz },
      };
    }

    it('reproduces all 248,832 U/F/R canonical transitions without regression', () => {
      const ufrMoves = ALL_MOVES.filter(m => m.face === 'U' || m.face === 'F' || m.face === 'R');
      let matches = 0;
      for (let c = 0; c < 24; c++) {
        for (let kx = 0; kx < 4; kx++) {
          for (let px = 0; px < 3; px++) {
            for (let ky = 0; ky < 4; ky++) {
              for (let py = 0; py < 3; py++) {
                for (let kz = 0; kz < 4; kz++) {
                  for (let pz = 0; pz < 3; pz++) {
                    const st: GearCubeState = {
                      cornerConfiguration: c as CornerConfiguration,
                      sliceX: { permutationClass: kx as SlicePermutationClass, phase: px as SliceGearPhase },
                      sliceY: { permutationClass: ky as SlicePermutationClass, phase: py as SliceGearPhase },
                      sliceZ: { permutationClass: kz as SlicePermutationClass, phase: pz as SliceGearPhase },
                    };
                    for (const m of ufrMoves) {
                      const actual = applyMove(st, m);
                      const expected = independentOracleNextState(st, m);
                      if (equalsGearCubeState(actual, expected)) matches++;
                    }
                  }
                }
              }
            }
          }
        }
      }
      expect(matches).toBe(248832);
    });

    it('validates all 248,832 D/B/L canonical transitions against independent oracle', () => {
      const dblMoves = ALL_MOVES.filter(m => m.face === 'D' || m.face === 'B' || m.face === 'L');
      let matches = 0;
      for (let c = 0; c < 24; c++) {
        for (let kx = 0; kx < 4; kx++) {
          for (let px = 0; px < 3; px++) {
            for (let ky = 0; ky < 4; ky++) {
              for (let py = 0; py < 3; py++) {
                for (let kz = 0; kz < 4; kz++) {
                  for (let pz = 0; pz < 3; pz++) {
                    const st: GearCubeState = {
                      cornerConfiguration: c as CornerConfiguration,
                      sliceX: { permutationClass: kx as SlicePermutationClass, phase: px as SliceGearPhase },
                      sliceY: { permutationClass: ky as SlicePermutationClass, phase: py as SliceGearPhase },
                      sliceZ: { permutationClass: kz as SlicePermutationClass, phase: pz as SliceGearPhase },
                    };
                    for (const m of dblMoves) {
                      const actual = applyMove(st, m);
                      const expected = independentOracleNextState(st, m);
                      if (equalsGearCubeState(actual, expected)) matches++;
                    }
                  }
                }
              }
            }
          }
        }
      }
      expect(matches).toBe(248832);
    });

    it('passes exhaustive canonical gate across all 497,664 transitions (41,472 states x 12 moves)', () => {
      let matches = 0;
      for (let c = 0; c < 24; c++) {
        for (let kx = 0; kx < 4; kx++) {
          for (let px = 0; px < 3; px++) {
            for (let ky = 0; ky < 4; ky++) {
              for (let py = 0; py < 3; py++) {
                for (let kz = 0; kz < 4; kz++) {
                  for (let pz = 0; pz < 3; pz++) {
                    const st: GearCubeState = {
                      cornerConfiguration: c as CornerConfiguration,
                      sliceX: { permutationClass: kx as SlicePermutationClass, phase: px as SliceGearPhase },
                      sliceY: { permutationClass: ky as SlicePermutationClass, phase: py as SliceGearPhase },
                      sliceZ: { permutationClass: kz as SlicePermutationClass, phase: pz as SliceGearPhase },
                    };
                    for (const m of ALL_MOVES) {
                      const actual = applyMove(st, m);
                      const expected = independentOracleNextState(st, m);
                      if (equalsGearCubeState(actual, expected)) matches++;
                    }
                  }
                }
              }
            }
          }
        }
      }
      expect(matches).toBe(497664);
    });
  });
});
