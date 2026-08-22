/**
 * @file spatial-frame.ts
 * @description Official SpatialFrame definitions, slot permutations, and transition lifecycle.
 */

import { type Face } from './values.js';
import { isFace } from './validation.js';

/**
 * Canonical collection of valid SpatialFrame identifiers.
 */
export const SPATIAL_FRAMES = Object.freeze([0, 1, 2, 3] as const);

/**
 * Discrete 4-state spatial frame representing the physical slot
 * location of the reference corner piece DBL (0: UFL, 1: UBR, 2: DFR, 3: DBL).
 * Solved / default canonical reference value: 3.
 */
export type SpatialFrame = (typeof SPATIAL_FRAMES)[number];

export const DEFAULT_SPATIAL_FRAME: SpatialFrame = 3;

/**
 * Runtime type guard validating whether an unknown value is a valid SpatialFrame.
 */
export function isSpatialFrame(value: unknown): value is SpatialFrame {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3;
}

/**
 * Internal slot permutations mapping canonical component slots to physical spatial slots.
 * Each permutation is an order-2 involution (sigma^2 = Identity).
 */
export const FRAME_SLOT_PERMS: Readonly<
  Record<
    SpatialFrame,
    Readonly<{
      readonly A: readonly [number, number, number, number]; // T_free corners
      readonly B: readonly [number, number, number, number]; // T_ref corners
      readonly X: readonly [number, number, number, number]; // Slice X edges
      readonly Y: readonly [number, number, number, number]; // Slice Y edges
      readonly Z: readonly [number, number, number, number]; // Slice Z edges
    }>
  >
> = Object.freeze({
  3: Object.freeze({
    A: Object.freeze([0, 1, 2, 3] as const),
    B: Object.freeze([0, 1, 2, 3] as const),
    X: Object.freeze([0, 1, 2, 3] as const),
    Y: Object.freeze([0, 1, 2, 3] as const),
    Z: Object.freeze([0, 1, 2, 3] as const),
  }),
  2: Object.freeze({
    A: Object.freeze([1, 0, 3, 2] as const),
    B: Object.freeze([1, 0, 3, 2] as const),
    X: Object.freeze([1, 0, 3, 2] as const),
    Y: Object.freeze([2, 3, 0, 1] as const),
    Z: Object.freeze([1, 0, 3, 2] as const),
  }),
  1: Object.freeze({
    A: Object.freeze([2, 3, 0, 1] as const),
    B: Object.freeze([2, 3, 0, 1] as const),
    X: Object.freeze([3, 2, 1, 0] as const),
    Y: Object.freeze([1, 0, 3, 2] as const),
    Z: Object.freeze([2, 3, 0, 1] as const),
  }),
  0: Object.freeze({
    A: Object.freeze([3, 2, 1, 0] as const),
    B: Object.freeze([3, 2, 1, 0] as const),
    X: Object.freeze([2, 3, 0, 1] as const),
    Y: Object.freeze([3, 2, 1, 0] as const),
    Z: Object.freeze([3, 2, 1, 0] as const),
  }),
});

/**
 * Internal 2-cycle frame transposition lookup per physical face turn.
 */
export const FRAME_SWAPS: Readonly<Record<Face, readonly [SpatialFrame, SpatialFrame]>> = Object.freeze({
  U: Object.freeze([0, 1] as const),
  D: Object.freeze([2, 3] as const),
  F: Object.freeze([0, 2] as const),
  B: Object.freeze([1, 3] as const),
  R: Object.freeze([1, 2] as const),
  L: Object.freeze([0, 3] as const),
});

/**
 * Computes the next SpatialFrame resulting from a legal physical face flip.
 *
 * @param frame Current SpatialFrame (0, 1, 2, 3)
 * @param face Physical face turned
 * @returns Next SpatialFrame
 * @throws TypeError if frame or face is invalid
 */
export function nextSpatialFrame(frame: SpatialFrame, face: Face): SpatialFrame {
  if (!isSpatialFrame(frame)) {
    throw new TypeError(`Invalid SpatialFrame supplied to nextSpatialFrame: ${String(frame)}`);
  }
  if (!isFace(face)) {
    throw new TypeError(`Invalid Face supplied to nextSpatialFrame: ${String(face)}`);
  }

  const [s1, s2] = FRAME_SWAPS[face];
  if (frame === s1) return s2;
  if (frame === s2) return s1;
  return frame;
}
