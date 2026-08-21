/**
 * @file validation.ts
 * @description Pure boolean runtime type guards with exact own-key set validation using Reflect.ownKeys().
 */

import {
  CORNER_CONFIGURATIONS,
  DIRECTIONS,
  FACES,
  SLICE_GEAR_PHASES,
  SLICE_PERMUTATION_CLASSES,
  type CornerConfiguration,
  type Direction,
  type EdgeSliceCoordinate,
  type Face,
  type GearCubeState,
  type Move,
  type SliceGearPhase,
  type SlicePermutationClass,
} from './values.js';

const MOVE_KEYS = ['face', 'direction'] as const;
const EDGE_SLICE_KEYS = ['permutationClass', 'phase'] as const;
const STATE_KEYS = [
  'cornerConfiguration',
  'sliceX',
  'sliceY',
  'sliceZ',
] as const;

/**
 * Validates that an object possesses exactly the required own property keys (order-independent),
 * with zero extra enumerable, non-enumerable, or symbol keys.
 */
function hasExactOwnKeys(
  value: object,
  requiredKeys: readonly string[]
): boolean {
  const keys = Reflect.ownKeys(value);
  if (keys.length !== requiredKeys.length) {
    return false;
  }
  for (const key of requiredKeys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      return false;
    }
  }
  return true;
}

export function isFace(value: unknown): value is Face {
  return (
    typeof value === 'string' && (FACES as readonly string[]).includes(value)
  );
}

export function isDirection(value: unknown): value is Direction {
  return (
    typeof value === 'string' &&
    (DIRECTIONS as readonly string[]).includes(value)
  );
}

export function isCornerConfiguration(
  value: unknown
): value is CornerConfiguration {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (CORNER_CONFIGURATIONS as readonly number[]).includes(value)
  );
}

export function isSlicePermutationClass(
  value: unknown
): value is SlicePermutationClass {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (SLICE_PERMUTATION_CLASSES as readonly number[]).includes(value)
  );
}

export function isSliceGearPhase(value: unknown): value is SliceGearPhase {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (SLICE_GEAR_PHASES as readonly number[]).includes(value)
  );
}

export function isMove(value: unknown): value is Move {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return (
    hasExactOwnKeys(value, MOVE_KEYS) &&
    isFace((value as Move).face) &&
    isDirection((value as Move).direction)
  );
}

export function isEdgeSliceCoordinate(
  value: unknown
): value is EdgeSliceCoordinate {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return (
    hasExactOwnKeys(value, EDGE_SLICE_KEYS) &&
    isSlicePermutationClass((value as EdgeSliceCoordinate).permutationClass) &&
    isSliceGearPhase((value as EdgeSliceCoordinate).phase)
  );
}

export function isGearCubeState(value: unknown): value is GearCubeState {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  return (
    hasExactOwnKeys(value, STATE_KEYS) &&
    isCornerConfiguration((value as GearCubeState).cornerConfiguration) &&
    isEdgeSliceCoordinate((value as GearCubeState).sliceX) &&
    isEdgeSliceCoordinate((value as GearCubeState).sliceY) &&
    isEdgeSliceCoordinate((value as GearCubeState).sliceZ)
  );
}
