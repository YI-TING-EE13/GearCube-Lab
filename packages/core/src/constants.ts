/**
 * @file constants.ts
 * @description Canonical constants, domain cardinality counts, solved state baseline, and internal coordinate metadata.
 */

import {
  CORNER_CONFIGURATIONS,
  DIRECTIONS,
  FACES,
  SLICE_GEAR_PHASES,
  SLICE_PERMUTATION_CLASSES,
  type GearCubeState,
  type Move,
} from './values.js';

export const ALL_MOVES: readonly Move[] = Object.freeze(
  FACES.flatMap((face) =>
    DIRECTIONS.map((direction) => Object.freeze({ face, direction }))
  )
);

export const CORNER_CONFIGURATION_COUNT = CORNER_CONFIGURATIONS.length;

export const EDGE_SLICE_STATE_COUNT =
  SLICE_PERMUTATION_CLASSES.length * SLICE_GEAR_PHASES.length;

export const CANONICAL_DOMAIN_SIZE =
  CORNER_CONFIGURATION_COUNT * EDGE_SLICE_STATE_COUNT ** 3;

export const SOLVED_GEAR_CUBE_STATE: GearCubeState = Object.freeze({
  cornerConfiguration: 0,
  sliceX: Object.freeze({ permutationClass: 0, phase: 0 }),
  sliceY: Object.freeze({ permutationClass: 0, phase: 0 }),
  sliceZ: Object.freeze({ permutationClass: 0, phase: 0 }),
});

/**
 * Internal coordinate metadata: Klein four-group V4 relative permutation classes.
 * @internal
 */
export const V4_PERMUTATIONS: readonly (readonly [number, number, number, number])[] =
  Object.freeze([
    Object.freeze([0, 1, 2, 3] as const),
    Object.freeze([1, 0, 3, 2] as const),
    Object.freeze([2, 3, 0, 1] as const),
    Object.freeze([3, 2, 1, 0] as const),
  ]);

/**
 * Internal coordinate metadata: Canonical edge slot sequences for orthogonal middle slices.
 * @internal
 */
export const SLICE_X_SLOTS = Object.freeze(['UB', 'UF', 'DF', 'DB'] as const);
export const SLICE_Y_SLOTS = Object.freeze(['FL', 'FR', 'BR', 'BL'] as const);
export const SLICE_Z_SLOTS = Object.freeze(['UR', 'UL', 'DL', 'DR'] as const);
