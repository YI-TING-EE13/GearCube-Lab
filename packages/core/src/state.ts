/**
 * @file state.ts
 * @description Pure state operations: structural coordinate equality and solved-state detector.
 */

import { SOLVED_GEAR_CUBE_STATE } from './constants.js';
import type { GearCubeState } from './values.js';

export function equalsGearCubeState(
  a: GearCubeState,
  b: GearCubeState
): boolean {
  return (
    a.cornerConfiguration === b.cornerConfiguration &&
    a.sliceX.permutationClass === b.sliceX.permutationClass &&
    a.sliceX.phase === b.sliceX.phase &&
    a.sliceY.permutationClass === b.sliceY.permutationClass &&
    a.sliceY.phase === b.sliceY.phase &&
    a.sliceZ.permutationClass === b.sliceZ.permutationClass &&
    a.sliceZ.phase === b.sliceZ.phase
  );
}

export function isSolved(state: GearCubeState): boolean {
  return equalsGearCubeState(state, SOLVED_GEAR_CUBE_STATE);
}
