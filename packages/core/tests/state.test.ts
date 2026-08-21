import { describe, expect, it } from 'vitest';
import {
  equalsGearCubeState,
  isGearCubeState,
  isSolved,
  SOLVED_GEAR_CUBE_STATE,
  type GearCubeState,
} from '../src/index.js';

describe('State Operations & Solved State Baseline', () => {
  it('validates canonical SOLVED_GEAR_CUBE_STATE coordinates and freezing', () => {
    expect(SOLVED_GEAR_CUBE_STATE.cornerConfiguration).toBe(0);
    expect(SOLVED_GEAR_CUBE_STATE.sliceX).toEqual({
      permutationClass: 0,
      phase: 0,
    });
    expect(SOLVED_GEAR_CUBE_STATE.sliceY).toEqual({
      permutationClass: 0,
      phase: 0,
    });
    expect(SOLVED_GEAR_CUBE_STATE.sliceZ).toEqual({
      permutationClass: 0,
      phase: 0,
    });

    expect(isGearCubeState(SOLVED_GEAR_CUBE_STATE)).toBe(true);
    expect(Object.isFrozen(SOLVED_GEAR_CUBE_STATE)).toBe(true);
    expect(Object.isFrozen(SOLVED_GEAR_CUBE_STATE.sliceX)).toBe(true);
    expect(Object.isFrozen(SOLVED_GEAR_CUBE_STATE.sliceY)).toBe(true);
    expect(Object.isFrozen(SOLVED_GEAR_CUBE_STATE.sliceZ)).toBe(true);
  });

  describe('equalsGearCubeState', () => {
    it('returns true for structurally identical states', () => {
      const stateA: GearCubeState = {
        cornerConfiguration: 5,
        sliceX: { permutationClass: 1, phase: 2 },
        sliceY: { permutationClass: 2, phase: 1 },
        sliceZ: { permutationClass: 3, phase: 0 },
      };
      const stateB: GearCubeState = {
        cornerConfiguration: 5,
        sliceX: { permutationClass: 1, phase: 2 },
        sliceY: { permutationClass: 2, phase: 1 },
        sliceZ: { permutationClass: 3, phase: 0 },
      };
      expect(equalsGearCubeState(stateA, stateB)).toBe(true);
    });

    it('returns false when cornerConfiguration differs', () => {
      const stateA: GearCubeState = { ...SOLVED_GEAR_CUBE_STATE };
      const stateB: GearCubeState = {
        ...SOLVED_GEAR_CUBE_STATE,
        cornerConfiguration: 1,
      };
      expect(equalsGearCubeState(stateA, stateB)).toBe(false);
    });

    it('returns false when sliceX permutationClass or phase differs', () => {
      const stateDiffPerm: GearCubeState = {
        ...SOLVED_GEAR_CUBE_STATE,
        sliceX: { permutationClass: 1, phase: 0 },
      };
      const stateDiffPhase: GearCubeState = {
        ...SOLVED_GEAR_CUBE_STATE,
        sliceX: { permutationClass: 0, phase: 1 },
      };
      expect(
        equalsGearCubeState(SOLVED_GEAR_CUBE_STATE, stateDiffPerm)
      ).toBe(false);
      expect(
        equalsGearCubeState(SOLVED_GEAR_CUBE_STATE, stateDiffPhase)
      ).toBe(false);
    });

    it('returns false when sliceY or sliceZ differs', () => {
      const stateDiffY: GearCubeState = {
        ...SOLVED_GEAR_CUBE_STATE,
        sliceY: { permutationClass: 2, phase: 0 },
      };
      const stateDiffZ: GearCubeState = {
        ...SOLVED_GEAR_CUBE_STATE,
        sliceZ: { permutationClass: 0, phase: 2 },
      };
      expect(equalsGearCubeState(SOLVED_GEAR_CUBE_STATE, stateDiffY)).toBe(
        false
      );
      expect(equalsGearCubeState(SOLVED_GEAR_CUBE_STATE, stateDiffZ)).toBe(
        false
      );
    });
  });

  describe('isSolved', () => {
    it('returns true for the canonical SOLVED_GEAR_CUBE_STATE constant', () => {
      expect(isSolved(SOLVED_GEAR_CUBE_STATE)).toBe(true);
    });

    it('returns true for a fresh structurally equivalent object', () => {
      const freshSolved: GearCubeState = {
        cornerConfiguration: 0,
        sliceX: { permutationClass: 0, phase: 0 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 0, phase: 0 },
      };
      expect(isSolved(freshSolved)).toBe(true);
    });

    it('returns false for any non-solved state', () => {
      const nonSolved: GearCubeState = {
        cornerConfiguration: 0,
        sliceX: { permutationClass: 0, phase: 1 },
        sliceY: { permutationClass: 0, phase: 0 },
        sliceZ: { permutationClass: 0, phase: 0 },
      };
      expect(isSolved(nonSolved)).toBe(false);
    });
  });
});
