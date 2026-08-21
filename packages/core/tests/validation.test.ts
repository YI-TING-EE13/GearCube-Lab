import { describe, expect, it } from 'vitest';
import {
  isCornerConfiguration,
  isDirection,
  isEdgeSliceCoordinate,
  isFace,
  isGearCubeState,
  isMove,
  isSliceGearPhase,
  isSlicePermutationClass,
  SOLVED_GEAR_CUBE_STATE,
} from '../src/index.js';

describe('Validation Type Guards & Exact Own-Key Semantics', () => {
  describe('isFace', () => {
    it('accepts the 6 valid face identifiers', () => {
      expect(isFace('U')).toBe(true);
      expect(isFace('D')).toBe(true);
      expect(isFace('F')).toBe(true);
      expect(isFace('B')).toBe(true);
      expect(isFace('R')).toBe(true);
      expect(isFace('L')).toBe(true);
    });

    it('rejects invalid face identifiers and non-strings', () => {
      expect(isFace('M')).toBe(false);
      expect(isFace('E')).toBe(false);
      expect(isFace('S')).toBe(false);
      expect(isFace('u')).toBe(false);
      expect(isFace('')).toBe(false);
      expect(isFace(null)).toBe(false);
      expect(isFace(undefined)).toBe(false);
      expect(isFace(1)).toBe(false);
      expect(isFace({})).toBe(false);
      expect(isFace(['U'])).toBe(false);
    });
  });

  describe('isDirection', () => {
    it('accepts CW and CCW', () => {
      expect(isDirection('CW')).toBe(true);
      expect(isDirection('CCW')).toBe(true);
    });

    it('rejects invalid directions and numeric angle values', () => {
      expect(isDirection('180')).toBe(false);
      expect(isDirection('HALF')).toBe(false);
      expect(isDirection('cw')).toBe(false);
      expect(isDirection('ccw')).toBe(false);
      expect(isDirection(180)).toBe(false);
      expect(isDirection(-180)).toBe(false);
      expect(isDirection(null)).toBe(false);
      expect(isDirection(undefined)).toBe(false);
    });
  });

  describe('isCornerConfiguration', () => {
    it('accepts integers 0 through 23', () => {
      for (let c = 0; c < 24; c++) {
        expect(isCornerConfiguration(c)).toBe(true);
      }
    });

    it('rejects numbers outside [0, 23], non-integers, and non-numbers', () => {
      expect(isCornerConfiguration(-1)).toBe(false);
      expect(isCornerConfiguration(24)).toBe(false);
      expect(isCornerConfiguration(25)).toBe(false);
      expect(isCornerConfiguration(1.5)).toBe(false);
      expect(isCornerConfiguration(NaN)).toBe(false);
      expect(isCornerConfiguration(Infinity)).toBe(false);
      expect(isCornerConfiguration('0')).toBe(false);
      expect(isCornerConfiguration(null)).toBe(false);
      expect(isCornerConfiguration(undefined)).toBe(false);
      expect(isCornerConfiguration({})).toBe(false);
    });
  });

  describe('isSlicePermutationClass', () => {
    it('accepts integers 0, 1, 2, 3', () => {
      expect(isSlicePermutationClass(0)).toBe(true);
      expect(isSlicePermutationClass(1)).toBe(true);
      expect(isSlicePermutationClass(2)).toBe(true);
      expect(isSlicePermutationClass(3)).toBe(true);
    });

    it('rejects integers outside [0, 3], floats, and non-numbers', () => {
      expect(isSlicePermutationClass(-1)).toBe(false);
      expect(isSlicePermutationClass(4)).toBe(false);
      expect(isSlicePermutationClass(0.5)).toBe(false);
      expect(isSlicePermutationClass(NaN)).toBe(false);
      expect(isSlicePermutationClass('0')).toBe(false);
      expect(isSlicePermutationClass(null)).toBe(false);
      expect(isSlicePermutationClass(undefined)).toBe(false);
    });
  });

  describe('isSliceGearPhase', () => {
    it('accepts integers 0, 1, 2', () => {
      expect(isSliceGearPhase(0)).toBe(true);
      expect(isSliceGearPhase(1)).toBe(true);
      expect(isSliceGearPhase(2)).toBe(true);
    });

    it('rejects integers outside [0, 2], degree values (60, 120), floats, and non-numbers', () => {
      expect(isSliceGearPhase(-1)).toBe(false);
      expect(isSliceGearPhase(3)).toBe(false);
      expect(isSliceGearPhase(60)).toBe(false);
      expect(isSliceGearPhase(120)).toBe(false);
      expect(isSliceGearPhase(1.5)).toBe(false);
      expect(isSliceGearPhase(NaN)).toBe(false);
      expect(isSliceGearPhase('0')).toBe(false);
      expect(isSliceGearPhase(null)).toBe(false);
    });
  });

  describe('isMove (Exact Own-Key Validation)', () => {
    it('accepts valid Move in canonical and reversed property order', () => {
      expect(isMove({ face: 'U', direction: 'CW' })).toBe(true);
      expect(isMove({ direction: 'CCW', face: 'R' })).toBe(true);
    });

    it('rejects Move with missing properties', () => {
      expect(isMove({ face: 'U' })).toBe(false);
      expect(isMove({ direction: 'CW' })).toBe(false);
      expect(isMove({})).toBe(false);
    });

    it('rejects Move with extra enumerable properties', () => {
      expect(isMove({ face: 'U', direction: 'CW', extra: 1 })).toBe(false);
      expect(isMove({ face: 'U', direction: 'CW', degrees: 180 })).toBe(false);
    });

    it('rejects Move with extra non-enumerable own properties', () => {
      const move = { face: 'U', direction: 'CW' };
      Object.defineProperty(move, 'hidden', {
        value: 'meta',
        enumerable: false,
        configurable: true,
      });
      expect(isMove(move)).toBe(false);
    });

    it('rejects Move with extra symbol properties', () => {
      const sym = Symbol('meta');
      const move = { face: 'U', direction: 'CW', [sym]: true };
      expect(isMove(move)).toBe(false);
    });

    it('rejects Move with invalid property values, null, arrays, primitives', () => {
      expect(isMove({ face: 'INVALID', direction: 'CW' })).toBe(false);
      expect(isMove({ face: 'U', direction: 'INVALID' })).toBe(false);
      expect(isMove(null)).toBe(false);
      expect(isMove(undefined)).toBe(false);
      expect(isMove(['U', 'CW'])).toBe(false);
      expect(isMove('U CW')).toBe(false);
    });
  });

  describe('isEdgeSliceCoordinate (Exact Own-Key Validation)', () => {
    it('accepts valid coordinate in canonical and reversed property order', () => {
      expect(
        isEdgeSliceCoordinate({ permutationClass: 0, phase: 0 })
      ).toBe(true);
      expect(
        isEdgeSliceCoordinate({ phase: 2, permutationClass: 3 })
      ).toBe(true);
    });

    it('rejects coordinate with missing properties', () => {
      expect(isEdgeSliceCoordinate({ permutationClass: 0 })).toBe(false);
      expect(isEdgeSliceCoordinate({ phase: 0 })).toBe(false);
      expect(isEdgeSliceCoordinate({})).toBe(false);
    });

    it('rejects coordinate with extra enumerable properties', () => {
      expect(
        isEdgeSliceCoordinate({
          permutationClass: 0,
          phase: 0,
          extra: true,
        })
      ).toBe(false);
    });

    it('rejects coordinate with extra non-enumerable or symbol properties', () => {
      const coord = { permutationClass: 0, phase: 0 };
      Object.defineProperty(coord, 'meta', {
        value: 123,
        enumerable: false,
        configurable: true,
      });
      expect(isEdgeSliceCoordinate(coord)).toBe(false);

      const symCoord = {
        permutationClass: 0,
        phase: 0,
        [Symbol('sym')]: 1,
      };
      expect(isEdgeSliceCoordinate(symCoord)).toBe(false);
    });

    it('rejects coordinate with out-of-range values or non-objects', () => {
      expect(
        isEdgeSliceCoordinate({ permutationClass: 4, phase: 0 })
      ).toBe(false);
      expect(
        isEdgeSliceCoordinate({ permutationClass: 0, phase: 3 })
      ).toBe(false);
      expect(isEdgeSliceCoordinate(null)).toBe(false);
      expect(isEdgeSliceCoordinate([0, 0])).toBe(false);
    });
  });

  describe('isGearCubeState (Exact Own-Key Validation & Rejection of SpatialFrame)', () => {
    it('accepts valid state in canonical property order', () => {
      expect(isGearCubeState(SOLVED_GEAR_CUBE_STATE)).toBe(true);
    });

    it('accepts valid state in reordered property order', () => {
      const reordered = {
        sliceZ: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceX: { permutationClass: 0, phase: 0 },
        cornerConfiguration: 0,
      };
      expect(isGearCubeState(reordered)).toBe(true);
    });

    it('rejects state with missing slice properties', () => {
      const missingSlice = {
        cornerConfiguration: 0,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 0, phase: 0 },
      };
      expect(isGearCubeState(missingSlice)).toBe(false);
    });

    it('rejects state with spatialFrame or extraneous enumerable properties', () => {
      const withSpatialFrame = {
        ...SOLVED_GEAR_CUBE_STATE,
        spatialFrame: 1,
      };
      expect(isGearCubeState(withSpatialFrame)).toBe(false);

      const withHistory = {
        ...SOLVED_GEAR_CUBE_STATE,
        history: [],
      };
      expect(isGearCubeState(withHistory)).toBe(false);

      const withSolverCost = {
        ...SOLVED_GEAR_CUBE_STATE,
        solverCost: 5,
      };
      expect(isGearCubeState(withSolverCost)).toBe(false);
    });

    it('rejects state with extra non-enumerable own properties', () => {
      const state = {
        cornerConfiguration: 0,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 0, phase: 0 },
      };
      Object.defineProperty(state, 'hiddenMeta', {
        value: 'prohibited',
        enumerable: false,
        configurable: true,
      });
      expect(isGearCubeState(state)).toBe(false);
    });

    it('rejects state with extra symbol own properties', () => {
      const state = {
        cornerConfiguration: 0,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 0, phase: 0 },
        [Symbol('prohibited')]: true,
      };
      expect(isGearCubeState(state)).toBe(false);
    });

    it('rejects state with malformed nested coordinates or out-of-range corner', () => {
      const badCorner = {
        ...SOLVED_GEAR_CUBE_STATE,
        cornerConfiguration: 24,
      };
      expect(isGearCubeState(badCorner)).toBe(false);

      const badSliceX = {
        ...SOLVED_GEAR_CUBE_STATE,
        sliceX: { permutationClass: 4, phase: 0 },
      };
      expect(isGearCubeState(badSliceX)).toBe(false);

      expect(isGearCubeState(null)).toBe(false);
      expect(isGearCubeState(undefined)).toBe(false);
      expect(isGearCubeState([])).toBe(false);
    });
  });
});
