/**
 * @file transitions.ts
 * @description Direct canonical move-transition engine for the Standard Gear Cube.
 */

import {
  CORNER_TRANSITIONS,
  SLICE_DELTA_PHASES,
  SLICE_K_TRANSITIONS,
} from './transition-data.js';
import { isGearCubeState, isMove } from './validation.js';
import type { GearCubeState, Move, SliceGearPhase } from './values.js';

/**
 * Applies a canonical move to a valid GearCubeState and returns the resulting state.
 *
 * @param state - Valid canonical GearCubeState
 * @param move - Valid Move { face, direction }
 * @returns Structurally independent, fresh valid GearCubeState resulting from the transition
 * @throws TypeError if state or move violates structural runtime contracts
 */
export function applyMove(state: GearCubeState, move: Move): GearCubeState {
  if (!isGearCubeState(state)) {
    throw new TypeError('Invalid GearCubeState supplied to applyMove');
  }
  if (!isMove(move)) {
    throw new TypeError('Invalid Move supplied to applyMove');
  }

  const { face, direction } = move;
  const c = state.cornerConfiguration;
  const nextC = CORNER_TRANSITIONS[face][c]!;

  const kTables = SLICE_K_TRANSITIONS[face][direction];
  const dpTable = SLICE_DELTA_PHASES[face][direction];

  return {
    cornerConfiguration: nextC,
    sliceX: {
      permutationClass: kTables.X[c]![state.sliceX.permutationClass]!,
      phase: ((state.sliceX.phase + dpTable.X) % 3) as SliceGearPhase,
    },
    sliceY: {
      permutationClass: kTables.Y[c]![state.sliceY.permutationClass]!,
      phase: ((state.sliceY.phase + dpTable.Y) % 3) as SliceGearPhase,
    },
    sliceZ: {
      permutationClass: kTables.Z[c]![state.sliceZ.permutationClass]!,
      phase: ((state.sliceZ.phase + dpTable.Z) % 3) as SliceGearPhase,
    },
  };
}
