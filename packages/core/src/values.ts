/**
 * @file values.ts
 * @description Canonical value collections and derived TypeScript literal-union types and structural interfaces for GearCube domain state.
 */

export const FACES = Object.freeze(['U', 'D', 'F', 'B', 'R', 'L'] as const);
export type Face = (typeof FACES)[number];

export const DIRECTIONS = Object.freeze(['CW', 'CCW'] as const);
export type Direction = (typeof DIRECTIONS)[number];

export const CORNER_CONFIGURATIONS = Object.freeze([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23
] as const);
export type CornerConfiguration = (typeof CORNER_CONFIGURATIONS)[number];

export const SLICE_PERMUTATION_CLASSES = Object.freeze([0, 1, 2, 3] as const);
export type SlicePermutationClass = (typeof SLICE_PERMUTATION_CLASSES)[number];

export const SLICE_GEAR_PHASES = Object.freeze([0, 1, 2] as const);
export type SliceGearPhase = (typeof SLICE_GEAR_PHASES)[number];

export interface Move {
  readonly face: Face;
  readonly direction: Direction;
}

export interface EdgeSliceCoordinate {
  readonly permutationClass: SlicePermutationClass;
  readonly phase: SliceGearPhase;
}

export interface GearCubeState {
  readonly cornerConfiguration: CornerConfiguration;
  readonly sliceX: EdgeSliceCoordinate;
  readonly sliceY: EdgeSliceCoordinate;
  readonly sliceZ: EdgeSliceCoordinate;
}
