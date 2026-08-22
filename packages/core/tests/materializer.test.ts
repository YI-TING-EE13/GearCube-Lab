/**
 * @file materializer.test.ts
 * @description Comprehensive independent oracle test suite for Phase 1D SpatialFrame, Materialization, and Center Semantics.
 *
 * All expected references in this suite are derived strictly from authoritative documentation contracts:
 * - docs/decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md (Sections 6, 7, 8)
 * - docs/architecture/GEAR_CUBE_STATE_MODEL.md (Sections 3, 4, 5, 8)
 * - docs/development/PHASE_1D_IMPLEMENTATION_PLAN.md (Sections 4, 5, 14, 16)
 *
 * The expected/oracle side of all verification gates is structurally isolated and NEVER invokes
 * Phase 1D production logic (materializeState, nextSpatialFrame, isSpatialFrame, normalizePiecePlacement).
 */

import { describe, it, expect } from 'vitest';
import {
  FACES,
  ALL_MOVES,
  SOLVED_GEAR_CUBE_STATE,
  CANONICAL_DOMAIN_SIZE,
  applyMove,
  equalsGearCubeState,
  SPATIAL_FRAMES,
  DEFAULT_SPATIAL_FRAME,
  isSpatialFrame,
  nextSpatialFrame,
  CORNER_SLOTS,
  EDGE_SLOTS,
  CENTER_SLOTS,
  CORNER_PIECE_IDS,
  EDGE_PIECE_IDS,
  CENTER_PIECE_IDS,
  materializeState,
  type Face,
  type Move,
  type SpatialFrame,
  type GearCubeState,
  type CornerConfiguration,
  type SlicePermutationClass,
  type SliceGearPhase,
  type PiecePlacementView,
  type CornerPlacement,
  type EdgePlacement,
  type CenterPlacement,
} from '../src/index.js';
import { normalizePiecePlacement } from '../src/materializer.js';

// ============================================================================
// 1. Independent Test-Local Normative Reference Data & Coordinate Geometry
// ============================================================================

type Vec3 = readonly [number, number, number];

/**
 * Normative 3D Slot Coordinates in canonical reference space (right-handed: +X right, +Y up, +Z front).
 * Sourced from docs/architecture/GEAR_CUBE_STATE_MODEL.md Section 3.
 */
const CORNER_SLOT_COORDS: Record<string, Vec3> = Object.freeze({
  UFL: Object.freeze([-1, 1, 1] as const),
  UBR: Object.freeze([1, 1, -1] as const),
  DFR: Object.freeze([1, -1, 1] as const),
  DBL: Object.freeze([-1, -1, -1] as const),
  UFR: Object.freeze([1, 1, 1] as const),
  UBL: Object.freeze([-1, 1, -1] as const),
  DFL: Object.freeze([-1, -1, 1] as const),
  DBR: Object.freeze([1, -1, -1] as const),
});

const CENTER_SLOT_COORDS: Record<string, Vec3> = Object.freeze({
  U: Object.freeze([0, 1, 0] as const),
  D: Object.freeze([0, -1, 0] as const),
  F: Object.freeze([0, 0, 1] as const),
  B: Object.freeze([0, 0, -1] as const),
  R: Object.freeze([1, 0, 0] as const),
  L: Object.freeze([-1, 0, 0] as const),
});

const EDGE_SLOT_COORDS: Record<string, Vec3> = Object.freeze({
  UB: Object.freeze([0, 1, -1] as const),
  UF: Object.freeze([0, 1, 1] as const),
  DF: Object.freeze([0, -1, 1] as const),
  DB: Object.freeze([0, -1, -1] as const),
  FL: Object.freeze([-1, 0, 1] as const),
  FR: Object.freeze([1, 0, 1] as const),
  BR: Object.freeze([1, 0, -1] as const),
  BL: Object.freeze([-1, 0, -1] as const),
  UR: Object.freeze([1, 1, 0] as const),
  UL: Object.freeze([-1, 1, 0] as const),
  DL: Object.freeze([-1, -1, 0] as const),
  DR: Object.freeze([1, -1, 0] as const),
});

/**
 * Evaluates the 3D rigid rotation for each of the 4 SpatialFrames.
 * 3: Identity, 2: Ry(pi), 1: Rz(pi), 0: Rx(pi).
 * Sourced from docs/decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md Section 8.1.
 */
function applySpatialFrameRotation(frame: SpatialFrame, v: Vec3): Vec3 {
  const [x, y, z] = v;
  switch (frame) {
    case 3:
      return [x, y, z];
    case 2:
      return [-x, y, -z]; // Ry(pi)
    case 1:
      return [-x, -y, z]; // Rz(pi)
    case 0:
      return [x, -y, -z]; // Rx(pi)
  }
}

/**
 * Derives the slot permutation for a component array under a given SpatialFrame geometrically.
 * Maps physical slot index s to canonical slot index c.
 */
function deriveGeometricFramePerm(
  frame: SpatialFrame,
  slotList: readonly string[],
  coordDict: Record<string, Vec3>,
): readonly number[] {
  const perm: number[] = new Array(slotList.length);
  for (let s = 0; s < slotList.length; s++) {
    const pSlot = slotList[s]!;
    const pCoord = coordDict[pSlot]!;
    const cCoord = applySpatialFrameRotation(frame, pCoord);
    const cSlot = Object.keys(coordDict).find(
      (k) =>
        coordDict[k]![0] === cCoord[0] &&
        coordDict[k]![1] === cCoord[1] &&
        coordDict[k]![2] === cCoord[2],
    )!;
    perm[s] = slotList.indexOf(cSlot);
  }
  return Object.freeze(perm);
}

/** Precomputed test-local geometric frame slot permutations */
const ORACLE_FRAME_PERMS = Object.freeze({
  0: Object.freeze({
    T_ref: deriveGeometricFramePerm(0, CORNER_SLOTS.slice(0, 4), CORNER_SLOT_COORDS),
    T_free: deriveGeometricFramePerm(0, CORNER_SLOTS.slice(4, 8), CORNER_SLOT_COORDS),
    X: deriveGeometricFramePerm(0, EDGE_SLOTS.slice(0, 4), EDGE_SLOT_COORDS),
    Y: deriveGeometricFramePerm(0, EDGE_SLOTS.slice(4, 8), EDGE_SLOT_COORDS),
    Z: deriveGeometricFramePerm(0, EDGE_SLOTS.slice(8, 12), EDGE_SLOT_COORDS),
    centers: deriveGeometricFramePerm(0, CENTER_SLOTS, CENTER_SLOT_COORDS),
  }),
  1: Object.freeze({
    T_ref: deriveGeometricFramePerm(1, CORNER_SLOTS.slice(0, 4), CORNER_SLOT_COORDS),
    T_free: deriveGeometricFramePerm(1, CORNER_SLOTS.slice(4, 8), CORNER_SLOT_COORDS),
    X: deriveGeometricFramePerm(1, EDGE_SLOTS.slice(0, 4), EDGE_SLOT_COORDS),
    Y: deriveGeometricFramePerm(1, EDGE_SLOTS.slice(4, 8), EDGE_SLOT_COORDS),
    Z: deriveGeometricFramePerm(1, EDGE_SLOTS.slice(8, 12), EDGE_SLOT_COORDS),
    centers: deriveGeometricFramePerm(1, CENTER_SLOTS, CENTER_SLOT_COORDS),
  }),
  2: Object.freeze({
    T_ref: deriveGeometricFramePerm(2, CORNER_SLOTS.slice(0, 4), CORNER_SLOT_COORDS),
    T_free: deriveGeometricFramePerm(2, CORNER_SLOTS.slice(4, 8), CORNER_SLOT_COORDS),
    X: deriveGeometricFramePerm(2, EDGE_SLOTS.slice(0, 4), EDGE_SLOT_COORDS),
    Y: deriveGeometricFramePerm(2, EDGE_SLOTS.slice(4, 8), EDGE_SLOT_COORDS),
    Z: deriveGeometricFramePerm(2, EDGE_SLOTS.slice(8, 12), EDGE_SLOT_COORDS),
    centers: deriveGeometricFramePerm(2, CENTER_SLOTS, CENTER_SLOT_COORDS),
  }),
  3: Object.freeze({
    T_ref: deriveGeometricFramePerm(3, CORNER_SLOTS.slice(0, 4), CORNER_SLOT_COORDS),
    T_free: deriveGeometricFramePerm(3, CORNER_SLOTS.slice(4, 8), CORNER_SLOT_COORDS),
    X: deriveGeometricFramePerm(3, EDGE_SLOTS.slice(0, 4), EDGE_SLOT_COORDS),
    Y: deriveGeometricFramePerm(3, EDGE_SLOTS.slice(4, 8), EDGE_SLOT_COORDS),
    Z: deriveGeometricFramePerm(3, EDGE_SLOTS.slice(8, 12), EDGE_SLOT_COORDS),
    centers: deriveGeometricFramePerm(3, CENTER_SLOTS, CENTER_SLOT_COORDS),
  }),
});

/**
 * Derives the next SpatialFrame geometrically by tracking the physical 3D position
 * of reference corner piece DBL (piece 3) under a 180° physical face turn.
 * Sourced from docs/architecture/GEAR_CUBE_STATE_MODEL.md Section 3.
 */
function deriveGeometricNextSpatialFrame(frame: SpatialFrame, face: Face): SpatialFrame {
  const FRAME_TO_DBL_SLOT: Record<SpatialFrame, string> = {
    0: 'UFL',
    1: 'UBR',
    2: 'DFR',
    3: 'DBL',
  };
  const DBL_SLOT_TO_FRAME: Record<string, SpatialFrame> = {
    UFL: 0,
    UBR: 1,
    DFR: 2,
    DBL: 3,
  };

  const currentDblSlot = FRAME_TO_DBL_SLOT[frame];
  const [x, y, z] = CORNER_SLOT_COORDS[currentDblSlot]!;

  let nextX = x;
  let nextY = y;
  let nextZ = z;

  if (face === 'U' && y === 1) {
    nextX = -x;
    nextZ = -z;
  } else if (face === 'D' && y === -1) {
    nextX = -x;
    nextZ = -z;
  } else if (face === 'F' && z === 1) {
    nextX = -x;
    nextY = -y;
  } else if (face === 'B' && z === -1) {
    nextX = -x;
    nextY = -y;
  } else if (face === 'R' && x === 1) {
    nextY = -y;
    nextZ = -z;
  } else if (face === 'L' && x === -1) {
    nextY = -y;
    nextZ = -z;
  }

  const nextSlot = Object.keys(CORNER_SLOT_COORDS).find(
    (k) =>
      CORNER_SLOT_COORDS[k]![0] === nextX &&
      CORNER_SLOT_COORDS[k]![1] === nextY &&
      CORNER_SLOT_COORDS[k]![2] === nextZ,
  )!;

  return DBL_SLOT_TO_FRAME[nextSlot]!;
}

// ============================================================================
// 2. Independent Normative Tables (Sourced from ADR-0004 & STATE_MODEL)
// ============================================================================

/**
 * Normative Model A Base Corner Action Dictionary (24 rows).
 * Sourced from docs/decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md Section 6.2.
 */
const ORACLE_CENTER_PERM_OF_C: readonly (readonly string[])[] = Object.freeze([
  Object.freeze(['center-U', 'center-D', 'center-F', 'center-B', 'center-R', 'center-L'] as const), // C=0
  Object.freeze(['center-D', 'center-U', 'center-R', 'center-L', 'center-F', 'center-B'] as const), // C=1
  Object.freeze(['center-B', 'center-F', 'center-D', 'center-U', 'center-L', 'center-R'] as const), // C=2
  Object.freeze(['center-F', 'center-B', 'center-L', 'center-R', 'center-D', 'center-U'] as const), // C=3
  Object.freeze(['center-L', 'center-R', 'center-U', 'center-D', 'center-B', 'center-F'] as const), // C=4
  Object.freeze(['center-R', 'center-L', 'center-B', 'center-F', 'center-U', 'center-D'] as const), // C=5
  Object.freeze(['center-D', 'center-U', 'center-L', 'center-R', 'center-B', 'center-F'] as const), // C=6
  Object.freeze(['center-U', 'center-D', 'center-B', 'center-F', 'center-L', 'center-R'] as const), // C=7
  Object.freeze(['center-R', 'center-L', 'center-U', 'center-D', 'center-F', 'center-B'] as const), // C=8
  Object.freeze(['center-L', 'center-R', 'center-F', 'center-B', 'center-U', 'center-D'] as const), // C=9
  Object.freeze(['center-F', 'center-B', 'center-D', 'center-U', 'center-R', 'center-L'] as const), // C=10
  Object.freeze(['center-B', 'center-F', 'center-R', 'center-L', 'center-D', 'center-U'] as const), // C=11
  Object.freeze(['center-F', 'center-B', 'center-R', 'center-L', 'center-U', 'center-D'] as const), // C=12
  Object.freeze(['center-B', 'center-F', 'center-U', 'center-D', 'center-R', 'center-L'] as const), // C=13
  Object.freeze(['center-L', 'center-R', 'center-B', 'center-F', 'center-D', 'center-U'] as const), // C=14
  Object.freeze(['center-R', 'center-L', 'center-D', 'center-U', 'center-B', 'center-F'] as const), // C=15
  Object.freeze(['center-D', 'center-U', 'center-F', 'center-B', 'center-L', 'center-R'] as const), // C=16
  Object.freeze(['center-U', 'center-D', 'center-L', 'center-R', 'center-F', 'center-B'] as const), // C=17
  Object.freeze(['center-R', 'center-L', 'center-F', 'center-B', 'center-D', 'center-U'] as const), // C=18
  Object.freeze(['center-L', 'center-R', 'center-D', 'center-U', 'center-F', 'center-B'] as const), // C=19
  Object.freeze(['center-B', 'center-F', 'center-L', 'center-R', 'center-U', 'center-D'] as const), // C=20
  Object.freeze(['center-F', 'center-B', 'center-U', 'center-D', 'center-L', 'center-R'] as const), // C=21
  Object.freeze(['center-U', 'center-D', 'center-R', 'center-L', 'center-B', 'center-F'] as const), // C=22
  Object.freeze(['center-D', 'center-U', 'center-B', 'center-F', 'center-R', 'center-L'] as const), // C=23
]);

/**
 * Normative Slice Action Dictionaries K_X, K_Y, K_Z (4 rows each).
 * Sourced from docs/decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md Section 6.3.
 */
const ORACLE_K_X = Object.freeze([
  Object.freeze([0, 1, 2, 3, 4, 5] as const), // Identity
  Object.freeze([0, 1, 3, 2, 5, 4] as const), // (F B)(R L)
  Object.freeze([1, 0, 3, 2, 4, 5] as const), // (U D)(F B)
  Object.freeze([1, 0, 2, 3, 5, 4] as const), // (U D)(R L)
]);

const ORACLE_K_Y = Object.freeze([
  Object.freeze([0, 1, 2, 3, 4, 5] as const), // Identity
  Object.freeze([1, 0, 2, 3, 5, 4] as const), // (U D)(R L)
  Object.freeze([0, 1, 3, 2, 5, 4] as const), // (F B)(R L)
  Object.freeze([1, 0, 3, 2, 4, 5] as const), // (U D)(F B)
]);

const ORACLE_K_Z = Object.freeze([
  Object.freeze([0, 1, 2, 3, 4, 5] as const), // Identity
  Object.freeze([0, 1, 3, 2, 5, 4] as const), // (F B)(R L)
  Object.freeze([1, 0, 2, 3, 5, 4] as const), // (U D)(R L)
  Object.freeze([1, 0, 3, 2, 4, 5] as const), // (U D)(F B)
]);

/**
 * Normative Corner Materialization Tables T_ref and T_free.
 * Sourced from docs/architecture/GEAR_CUBE_STATE_MODEL.md Section 4.
 */
const ORACLE_T_REF_TABLE: readonly (readonly [number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3] as const), // C=0
  Object.freeze([1, 0, 2, 3] as const), // C=1
  Object.freeze([0, 2, 1, 3] as const), // C=2
  Object.freeze([2, 0, 1, 3] as const), // C=3
  Object.freeze([1, 2, 0, 3] as const), // C=4
  Object.freeze([2, 1, 0, 3] as const), // C=5
  Object.freeze([1, 0, 2, 3] as const), // C=6
  Object.freeze([0, 1, 2, 3] as const), // C=7
  Object.freeze([1, 2, 0, 3] as const), // C=8
  Object.freeze([2, 1, 0, 3] as const), // C=9
  Object.freeze([0, 2, 1, 3] as const), // C=10
  Object.freeze([2, 0, 1, 3] as const), // C=11
  Object.freeze([2, 0, 1, 3] as const), // C=12
  Object.freeze([0, 2, 1, 3] as const), // C=13
  Object.freeze([2, 1, 0, 3] as const), // C=14
  Object.freeze([1, 2, 0, 3] as const), // C=15
  Object.freeze([0, 1, 2, 3] as const), // C=16
  Object.freeze([1, 0, 2, 3] as const), // C=17
  Object.freeze([2, 1, 0, 3] as const), // C=18
  Object.freeze([1, 2, 0, 3] as const), // C=19
  Object.freeze([2, 0, 1, 3] as const), // C=20
  Object.freeze([0, 2, 1, 3] as const), // C=21
  Object.freeze([1, 0, 2, 3] as const), // C=22
  Object.freeze([0, 1, 2, 3] as const), // C=23
]);

const ORACLE_T_FREE_TABLE: readonly (readonly [number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3] as const), // C=0
  Object.freeze([0, 1, 3, 2] as const), // C=1
  Object.freeze([0, 2, 1, 3] as const), // C=2
  Object.freeze([0, 2, 3, 1] as const), // C=3
  Object.freeze([0, 3, 1, 2] as const), // C=4
  Object.freeze([0, 3, 2, 1] as const), // C=5
  Object.freeze([1, 0, 2, 3] as const), // C=6
  Object.freeze([1, 0, 3, 2] as const), // C=7
  Object.freeze([1, 2, 0, 3] as const), // C=8
  Object.freeze([1, 2, 3, 0] as const), // C=9
  Object.freeze([1, 3, 0, 2] as const), // C=10
  Object.freeze([1, 3, 2, 0] as const), // C=11
  Object.freeze([2, 0, 1, 3] as const), // C=12
  Object.freeze([2, 0, 3, 1] as const), // C=13
  Object.freeze([2, 1, 0, 3] as const), // C=14
  Object.freeze([2, 1, 3, 0] as const), // C=15
  Object.freeze([2, 3, 0, 1] as const), // C=16
  Object.freeze([2, 3, 1, 0] as const), // C=17
  Object.freeze([3, 0, 1, 2] as const), // C=18
  Object.freeze([3, 0, 2, 1] as const), // C=19
  Object.freeze([3, 1, 0, 2] as const), // C=20
  Object.freeze([3, 1, 2, 0] as const), // C=21
  Object.freeze([3, 2, 0, 1] as const), // C=22
  Object.freeze([3, 2, 1, 0] as const), // C=23
]);

/**
 * Normative Edge Base Action Dictionaries B_X, B_Y, B_Z.
 * Sourced from docs/architecture/GEAR_CUBE_STATE_MODEL.md Section 5.
 */
const ORACLE_B_X_TABLE: readonly (readonly [number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3] as const), // C=0
  Object.freeze([0, 1, 3, 2] as const), // C=1
  Object.freeze([0, 3, 2, 1] as const), // C=2
  Object.freeze([0, 3, 1, 2] as const), // C=3
  Object.freeze([0, 2, 3, 1] as const), // C=4
  Object.freeze([0, 2, 1, 3] as const), // C=5
  Object.freeze([0, 1, 3, 2] as const), // C=6
  Object.freeze([0, 1, 2, 3] as const), // C=7
  Object.freeze([0, 2, 3, 1] as const), // C=8
  Object.freeze([0, 2, 1, 3] as const), // C=9
  Object.freeze([0, 3, 2, 1] as const), // C=10
  Object.freeze([0, 3, 1, 2] as const), // C=11
  Object.freeze([0, 3, 1, 2] as const), // C=12
  Object.freeze([0, 3, 2, 1] as const), // C=13
  Object.freeze([0, 2, 1, 3] as const), // C=14
  Object.freeze([0, 2, 3, 1] as const), // C=15
  Object.freeze([0, 1, 2, 3] as const), // C=16
  Object.freeze([0, 1, 3, 2] as const), // C=17
  Object.freeze([0, 2, 1, 3] as const), // C=18
  Object.freeze([0, 2, 3, 1] as const), // C=19
  Object.freeze([0, 3, 1, 2] as const), // C=20
  Object.freeze([0, 3, 2, 1] as const), // C=21
  Object.freeze([0, 1, 3, 2] as const), // C=22
  Object.freeze([0, 1, 2, 3] as const), // C=23
]);

const ORACLE_B_Y_TABLE: readonly (readonly [number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3] as const), // C=0
  Object.freeze([0, 3, 2, 1] as const), // C=1
  Object.freeze([0, 2, 1, 3] as const), // C=2
  Object.freeze([0, 3, 1, 2] as const), // C=3
  Object.freeze([0, 2, 3, 1] as const), // C=4
  Object.freeze([0, 1, 3, 2] as const), // C=5
  Object.freeze([0, 3, 2, 1] as const), // C=6
  Object.freeze([0, 1, 2, 3] as const), // C=7
  Object.freeze([0, 2, 3, 1] as const), // C=8
  Object.freeze([0, 1, 3, 2] as const), // C=9
  Object.freeze([0, 2, 1, 3] as const), // C=10
  Object.freeze([0, 3, 1, 2] as const), // C=11
  Object.freeze([0, 3, 1, 2] as const), // C=12
  Object.freeze([0, 2, 1, 3] as const), // C=13
  Object.freeze([0, 1, 3, 2] as const), // C=14
  Object.freeze([0, 2, 3, 1] as const), // C=15
  Object.freeze([0, 1, 2, 3] as const), // C=16
  Object.freeze([0, 3, 2, 1] as const), // C=17
  Object.freeze([0, 1, 3, 2] as const), // C=18
  Object.freeze([0, 2, 3, 1] as const), // C=19
  Object.freeze([0, 3, 1, 2] as const), // C=20
  Object.freeze([0, 2, 1, 3] as const), // C=21
  Object.freeze([0, 3, 2, 1] as const), // C=22
  Object.freeze([0, 1, 2, 3] as const), // C=23
]);

const ORACLE_B_Z_TABLE: readonly (readonly [number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3] as const), // C=0
  Object.freeze([0, 1, 3, 2] as const), // C=1
  Object.freeze([0, 2, 1, 3] as const), // C=2
  Object.freeze([0, 2, 3, 1] as const), // C=3
  Object.freeze([0, 3, 1, 2] as const), // C=4
  Object.freeze([0, 3, 2, 1] as const), // C=5
  Object.freeze([0, 1, 3, 2] as const), // C=6
  Object.freeze([0, 1, 2, 3] as const), // C=7
  Object.freeze([0, 3, 1, 2] as const), // C=8
  Object.freeze([0, 3, 2, 1] as const), // C=9
  Object.freeze([0, 2, 1, 3] as const), // C=10
  Object.freeze([0, 2, 3, 1] as const), // C=11
  Object.freeze([0, 2, 3, 1] as const), // C=12
  Object.freeze([0, 2, 1, 3] as const), // C=13
  Object.freeze([0, 3, 2, 1] as const), // C=14
  Object.freeze([0, 3, 1, 2] as const), // C=15
  Object.freeze([0, 1, 2, 3] as const), // C=16
  Object.freeze([0, 1, 3, 2] as const), // C=17
  Object.freeze([0, 3, 2, 1] as const), // C=18
  Object.freeze([0, 3, 1, 2] as const), // C=19
  Object.freeze([0, 2, 3, 1] as const), // C=20
  Object.freeze([0, 2, 1, 3] as const), // C=21
  Object.freeze([0, 1, 3, 2] as const), // C=22
  Object.freeze([0, 1, 2, 3] as const), // C=23
]);

const ORACLE_V4_PERMS = Object.freeze([
  Object.freeze([0, 1, 2, 3] as const), // 0: I
  Object.freeze([1, 0, 3, 2] as const), // 1: (0 1)(2 3)
  Object.freeze([2, 3, 0, 1] as const), // 2: (0 2)(1 3)
  Object.freeze([3, 2, 1, 0] as const), // 3: (0 3)(1 2)
]);

// ============================================================================
// 3. Independent Test-Local Materialization & Physical Simulation Oracles
// ============================================================================

/**
 * Evaluates the Model A center permutation from canonical coordinates (C, kX, kY, kZ).
 * Formula: CENTER_PERM_OF_C[C] o K_X[kX] o K_Y[kY] o K_Z[kZ] (evaluated right-to-left).
 * Sourced from docs/decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md Section 6.1.
 */
function deriveOracleCanonicalCenters(
  c: CornerConfiguration,
  kX: SlicePermutationClass,
  kY: SlicePermutationClass,
  kZ: SlicePermutationClass,
): readonly string[] {
  const rowC = ORACLE_CENTER_PERM_OF_C[c]!;
  const rowX = ORACLE_K_X[kX]!;
  const rowY = ORACLE_K_Y[kY]!;
  const rowZ = ORACLE_K_Z[kZ]!;

  const result: string[] = new Array(6);
  for (let s = 0; s < 6; s++) {
    const slotZ = rowZ[s]!;
    const slotY = rowY[slotZ]!;
    const slotX = rowX[slotY]!;
    result[s] = rowC[slotX]!;
  }
  return result;
}

/**
 * Independent materialization oracle deriving physical piece placements from
 * (canonicalState, spatialFrame) using test-local normative tables and 3D coordinate geometry.
 */
function oracleMaterializeState(
  state: GearCubeState,
  frame: SpatialFrame = 3,
): PiecePlacementView {
  const c = state.cornerConfiguration;
  const framePerm = ORACLE_FRAME_PERMS[frame];

  // 1. Corners
  const tRef = ORACLE_T_REF_TABLE[c]!;
  const tFree = ORACLE_T_FREE_TABLE[c]!;
  const corners: CornerPlacement[] = new Array(8);

  // Slots 0..3: T_ref slots ['UFL', 'UBR', 'DFR', 'DBL']
  for (let s = 0; s < 4; s++) {
    const canonicalSlot = framePerm.T_ref[s]!;
    const pieceIdx = tRef[canonicalSlot]!;
    corners[s] = {
      slot: CORNER_SLOTS[s]!,
      pieceId: CORNER_PIECE_IDS[pieceIdx]!,
      orbit: 'ref',
    };
  }

  // Slots 4..7: T_free slots ['UFR', 'UBL', 'DFL', 'DBR']
  for (let s = 0; s < 4; s++) {
    const canonicalSlot = framePerm.T_free[s]!;
    const pieceIdx = tFree[canonicalSlot]!;
    corners[4 + s] = {
      slot: CORNER_SLOTS[4 + s]!,
      pieceId: CORNER_PIECE_IDS[4 + pieceIdx]!,
      orbit: 'free',
    };
  }

  // 2. Edges
  const bX = ORACLE_B_X_TABLE[c]!;
  const bY = ORACLE_B_Y_TABLE[c]!;
  const bZ = ORACLE_B_Z_TABLE[c]!;
  const v4X = ORACLE_V4_PERMS[state.sliceX.permutationClass]!;
  const v4Y = ORACLE_V4_PERMS[state.sliceY.permutationClass]!;
  const v4Z = ORACLE_V4_PERMS[state.sliceZ.permutationClass]!;

  const edges: EdgePlacement[] = new Array(12);

  // Slice X: Slots 0..3 ['UB', 'UF', 'DF', 'DB']
  for (let s = 0; s < 4; s++) {
    const canonicalSlot = framePerm.X[s]!;
    const pieceIdx = bX[v4X[canonicalSlot]!]!;
    edges[s] = {
      slot: EDGE_SLOTS[s]!,
      pieceId: EDGE_PIECE_IDS[pieceIdx]!,
      slice: 'X',
      phase: state.sliceX.phase,
    };
  }

  // Slice Y: Slots 4..7 ['FL', 'FR', 'BR', 'BL']
  for (let s = 0; s < 4; s++) {
    const canonicalSlot = framePerm.Y[s]!;
    const pieceIdx = bY[v4Y[canonicalSlot]!]!;
    edges[4 + s] = {
      slot: EDGE_SLOTS[4 + s]!,
      pieceId: EDGE_PIECE_IDS[4 + pieceIdx]!,
      slice: 'Y',
      phase: state.sliceY.phase,
    };
  }

  // Slice Z: Slots 8..11 ['UR', 'UL', 'DL', 'DR']
  for (let s = 0; s < 4; s++) {
    const canonicalSlot = framePerm.Z[s]!;
    const pieceIdx = bZ[v4Z[canonicalSlot]!]!;
    edges[8 + s] = {
      slot: EDGE_SLOTS[8 + s]!,
      pieceId: EDGE_PIECE_IDS[8 + pieceIdx]!,
      slice: 'Z',
      phase: state.sliceZ.phase,
    };
  }

  // 3. Centers (Model A with SpatialFrame transposition)
  const canonicalCenters = deriveOracleCanonicalCenters(
    c,
    state.sliceX.permutationClass,
    state.sliceY.permutationClass,
    state.sliceZ.permutationClass,
  );
  const centers: CenterPlacement[] = new Array(6);
  for (let s = 0; s < 6; s++) {
    const canonicalSlot = framePerm.centers[s]!;
    centers[s] = {
      slot: CENTER_SLOTS[s]!,
      pieceId: canonicalCenters[canonicalSlot] as any,
    };
  }

  return {
    corners: Object.freeze(corners),
    edges: Object.freeze(edges),
    centers: Object.freeze(centers),
  };
}

/** 3D Vector rotation functions for physical move simulation */
function rotateX180(v: Vec3): Vec3 {
  return [v[0], -v[1], -v[2]];
}
function rotateY180(v: Vec3): Vec3 {
  return [-v[0], v[1], -v[2]];
}
function rotateZ180(v: Vec3): Vec3 {
  return [-v[0], -v[1], v[2]];
}
function rotateX90(v: Vec3, dir: 1 | -1): Vec3 {
  return dir === 1 ? [v[0], -v[2], v[1]] : [v[0], v[2], -v[1]];
}
function rotateY90(v: Vec3, dir: 1 | -1): Vec3 {
  return dir === 1 ? [v[2], v[1], -v[0]] : [-v[2], v[1], v[0]];
}
function rotateZ90(v: Vec3, dir: 1 | -1): Vec3 {
  return dir === 1 ? [-v[1], v[0], v[2]] : [v[1], -v[0], v[2]];
}

/**
 * Independent 3D Euclidean physical simulation oracle.
 * Sourced from docs/decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md Section 8.2.
 */
function simulatePhysicalMoveOnPlacement(
  view: PiecePlacementView,
  move: Move,
): PiecePlacementView {
  const { face, direction } = move;
  const dirSign: 1 | -1 = direction === 'CW' ? 1 : -1;

  // 1. Transform corner pieces (180 degree outer face rotation)
  const nextCorners: CornerPlacement[] = new Array(8);
  for (const cp of view.corners) {
    const coord = CORNER_SLOT_COORDS[cp.slot]!;
    let nextCoord: Vec3 = coord;

    if (
      (face === 'U' && coord[1] === 1) ||
      (face === 'D' && coord[1] === -1) ||
      (face === 'F' && coord[2] === 1) ||
      (face === 'B' && coord[2] === -1) ||
      (face === 'R' && coord[0] === 1) ||
      (face === 'L' && coord[0] === -1)
    ) {
      if (face === 'U' || face === 'D') nextCoord = rotateY180(coord);
      else if (face === 'F' || face === 'B') nextCoord = rotateZ180(coord);
      else if (face === 'R' || face === 'L') nextCoord = rotateX180(coord);
    }

    const nextSlot = Object.keys(CORNER_SLOT_COORDS).find(
      (k) =>
        CORNER_SLOT_COORDS[k]![0] === nextCoord[0] &&
        CORNER_SLOT_COORDS[k]![1] === nextCoord[1] &&
        CORNER_SLOT_COORDS[k]![2] === nextCoord[2],
    )!;

    const slotIdx = CORNER_SLOTS.indexOf(nextSlot as any);
    nextCorners[slotIdx] = {
      slot: nextSlot as any,
      pieceId: cp.pieceId,
      orbit: cp.orbit,
    };
  }

  // 2. Transform center pieces (directed +-90 degree middle slice rotation, opposite center fixed)
  const nextCenters: CenterPlacement[] = new Array(6);
  for (const cp of view.centers) {
    const coord = CENTER_SLOT_COORDS[cp.slot]!;
    let nextCoord: Vec3 = coord;

    if (face === 'U') {
      if (coord[1] === 0) nextCoord = rotateY90(coord, dirSign === 1 ? -1 : 1);
    } else if (face === 'D') {
      if (coord[1] === 0) nextCoord = rotateY90(coord, dirSign === 1 ? 1 : -1);
    } else if (face === 'F') {
      if (coord[2] === 0) nextCoord = rotateZ90(coord, dirSign === 1 ? -1 : 1);
    } else if (face === 'B') {
      if (coord[2] === 0) nextCoord = rotateZ90(coord, dirSign === 1 ? 1 : -1);
    } else if (face === 'R') {
      if (coord[0] === 0) nextCoord = rotateX90(coord, dirSign === 1 ? -1 : 1);
    } else if (face === 'L') {
      if (coord[0] === 0) nextCoord = rotateX90(coord, dirSign === 1 ? 1 : -1);
    }

    const nextSlot = Object.keys(CENTER_SLOT_COORDS).find(
      (k) =>
        CENTER_SLOT_COORDS[k]![0] === nextCoord[0] &&
        CENTER_SLOT_COORDS[k]![1] === nextCoord[1] &&
        CENTER_SLOT_COORDS[k]![2] === nextCoord[2],
    )!;

    const slotIdx = CENTER_SLOTS.indexOf(nextSlot as any);
    nextCenters[slotIdx] = {
      slot: nextSlot as any,
      pieceId: cp.pieceId,
    };
  }

  // 3. Transform edge pieces (180 degree outer face rotation, +-90 degree middle rotation + mod 3 twist)
  const nextEdges: EdgePlacement[] = new Array(12);
  for (const ep of view.edges) {
    const coord = EDGE_SLOT_COORDS[ep.slot]!;
    let nextCoord: Vec3 = coord;
    let nextPhase = ep.phase;

    if (face === 'U') {
      if (coord[1] === 1) {
        nextCoord = rotateY180(coord);
      } else if (coord[1] === 0) {
        nextCoord = rotateY90(coord, dirSign === 1 ? -1 : 1);
        nextPhase = ((ep.phase + (dirSign === 1 ? 1 : 2)) % 3) as SliceGearPhase;
      }
    } else if (face === 'D') {
      if (coord[1] === -1) {
        nextCoord = rotateY180(coord);
      } else if (coord[1] === 0) {
        nextCoord = rotateY90(coord, dirSign === 1 ? 1 : -1);
        nextPhase = ((ep.phase + (dirSign === 1 ? 2 : 1)) % 3) as SliceGearPhase;
      }
    } else if (face === 'F') {
      if (coord[2] === 1) {
        nextCoord = rotateZ180(coord);
      } else if (coord[2] === 0) {
        nextCoord = rotateZ90(coord, dirSign === 1 ? -1 : 1);
        nextPhase = ((ep.phase + (dirSign === 1 ? 1 : 2)) % 3) as SliceGearPhase;
      }
    } else if (face === 'B') {
      if (coord[2] === -1) {
        nextCoord = rotateZ180(coord);
      } else if (coord[2] === 0) {
        nextCoord = rotateZ90(coord, dirSign === 1 ? 1 : -1);
        nextPhase = ((ep.phase + (dirSign === 1 ? 2 : 1)) % 3) as SliceGearPhase;
      }
    } else if (face === 'R') {
      if (coord[0] === 1) {
        nextCoord = rotateX180(coord);
      } else if (coord[0] === 0) {
        nextCoord = rotateX90(coord, dirSign === 1 ? -1 : 1);
        nextPhase = ((ep.phase + (dirSign === 1 ? 1 : 2)) % 3) as SliceGearPhase;
      }
    } else if (face === 'L') {
      if (coord[0] === -1) {
        nextCoord = rotateX180(coord);
      } else if (coord[0] === 0) {
        nextCoord = rotateX90(coord, dirSign === 1 ? 1 : -1);
        nextPhase = ((ep.phase + (dirSign === 1 ? 2 : 1)) % 3) as SliceGearPhase;
      }
    }

    const nextSlot = Object.keys(EDGE_SLOT_COORDS).find(
      (k) =>
        EDGE_SLOT_COORDS[k]![0] === nextCoord[0] &&
        EDGE_SLOT_COORDS[k]![1] === nextCoord[1] &&
        EDGE_SLOT_COORDS[k]![2] === nextCoord[2],
    )!;

    const slotIdx = EDGE_SLOTS.indexOf(nextSlot as any);
    nextEdges[slotIdx] = {
      slot: nextSlot as any,
      pieceId: ep.pieceId,
      slice: ep.slice,
      phase: nextPhase,
    };
  }

  return {
    corners: Object.freeze(nextCorners),
    edges: Object.freeze(nextEdges),
    centers: Object.freeze(nextCenters),
  };
}

// ============================================================================
// 4. Main Test Suites (Independent Verification Gates)
// ============================================================================

describe('Phase 1D — Independent Oracle Verification', () => {
  // --------------------------------------------------------------------------
  // Gate 1: Next SpatialFrame Geometric Gate (24 / 24)
  // --------------------------------------------------------------------------
  describe('Gate 1: Next SpatialFrame Geometric Gate (24 / 24)', () => {
    it('isSpatialFrame validates 0, 1, 2, 3 correctly', () => {
      expect(isSpatialFrame(0)).toBe(true);
      expect(isSpatialFrame(1)).toBe(true);
      expect(isSpatialFrame(2)).toBe(true);
      expect(isSpatialFrame(3)).toBe(true);
      expect(isSpatialFrame(-1)).toBe(false);
      expect(isSpatialFrame(4)).toBe(false);
      expect(isSpatialFrame(1.5)).toBe(false);
      expect(isSpatialFrame(null)).toBe(false);
      expect(isSpatialFrame('3')).toBe(false);
    });

    it('verifies all 24 nextSpatialFrame transitions against independent geometric oracle', () => {
      let verifiedTransitions = 0;
      for (const frame of SPATIAL_FRAMES) {
        for (const face of FACES) {
          const actualNextFrame = nextSpatialFrame(frame, face);
          const expectedNextFrame = deriveGeometricNextSpatialFrame(frame, face);
          expect(actualNextFrame).toBe(expectedNextFrame);
          verifiedTransitions++;
        }
      }
      expect(verifiedTransitions).toBe(24);
    });

    it('nextSpatialFrame throws TypeError on invalid arguments', () => {
      // @ts-expect-error Testing runtime validation
      expect(() => nextSpatialFrame(4, 'U')).toThrow(TypeError);
      // @ts-expect-error Testing runtime validation
      expect(() => nextSpatialFrame(3, 'X')).toThrow(TypeError);
    });
  });

  // --------------------------------------------------------------------------
  // Gate 2: Model A 1,536 Raw Coordinate Key Verification
  // --------------------------------------------------------------------------
  describe('Gate 2: Model A 1,536 Raw Coordinate Key Verification', () => {
    it('verifies Model A produces 1,536 / 1,536 exact matches with independent ADR-0004 composition', () => {
      let testedKeys = 0;
      for (let c = 0; c < 24; c++) {
        for (let kX = 0; kX < 4; kX++) {
          for (let kY = 0; kY < 4; kY++) {
            for (let kZ = 0; kZ < 4; kZ++) {
              const state: GearCubeState = {
                cornerConfiguration: c as CornerConfiguration,
                sliceX: { permutationClass: kX as SlicePermutationClass, phase: 0 },
                sliceY: { permutationClass: kY as SlicePermutationClass, phase: 0 },
                sliceZ: { permutationClass: kZ as SlicePermutationClass, phase: 0 },
              };

              const productionView = materializeState(state, 3);
              const actualCenterPieces = productionView.centers.map((cp) => cp.pieceId);
              const expectedCenterPieces = deriveOracleCanonicalCenters(
                c as CornerConfiguration,
                kX as SlicePermutationClass,
                kY as SlicePermutationClass,
                kZ as SlicePermutationClass,
              );

              expect(actualCenterPieces).toEqual(expectedCenterPieces);
              testedKeys++;
            }
          }
        }
      }
      expect(testedKeys).toBe(1536);
    });
  });

  // --------------------------------------------------------------------------
  // Gate 3: Center Identity Domain Gate (41,472 / 41,472)
  // --------------------------------------------------------------------------
  describe('Gate 3: Center Identity Domain Gate (41,472 / 41,472)', () => {
    it('verifies 41,472 / 41,472 center identities match independent ADR-0004 oracle', () => {
      let testedStates = 0;
      for (let c = 0; c < 24; c++) {
        for (let kX = 0; kX < 4; kX++) {
          for (let pX = 0; pX < 3; pX++) {
            for (let kY = 0; kY < 4; kY++) {
              for (let pY = 0; pY < 3; pY++) {
                for (let kZ = 0; kZ < 4; kZ++) {
                  for (let pZ = 0; pZ < 3; pZ++) {
                    const state: GearCubeState = {
                      cornerConfiguration: c as CornerConfiguration,
                      sliceX: { permutationClass: kX as SlicePermutationClass, phase: pX as SliceGearPhase },
                      sliceY: { permutationClass: kY as SlicePermutationClass, phase: pY as SliceGearPhase },
                      sliceZ: { permutationClass: kZ as SlicePermutationClass, phase: pZ as SliceGearPhase },
                    };

                    const productionCenters = materializeState(state, DEFAULT_SPATIAL_FRAME).centers.map(
                      (cp) => cp.pieceId,
                    );
                    const expectedCenters = deriveOracleCanonicalCenters(
                      c as CornerConfiguration,
                      kX as SlicePermutationClass,
                      kY as SlicePermutationClass,
                      kZ as SlicePermutationClass,
                    );

                    expect(productionCenters).toEqual(expectedCenters);
                    testedStates++;
                  }
                }
              }
            }
          }
        }
      }
      expect(testedStates).toBe(CANONICAL_DOMAIN_SIZE);
    });
  });

  // --------------------------------------------------------------------------
  // Gate 4: Single Move Center Placement Goldens (Pursuant to ADR-0004 Section 7)
  // --------------------------------------------------------------------------
  describe('Gate 4: Single Move Center Placement Goldens (ADR-0004 Section 7)', () => {
    it('verifies Solved + all 12 single-move center placement goldens in SpatialFrame 3', () => {
      // Normative Goldens table directly from ADR-0004 Section 7 (SpatialFrame 3)
      const normativeGoldens: Record<string, string[]> = {
        SOLVED: ['center-U', 'center-D', 'center-F', 'center-B', 'center-R', 'center-L'],
        'U CW': ['center-U', 'center-D', 'center-R', 'center-L', 'center-B', 'center-F'],
        'U CCW': ['center-U', 'center-D', 'center-L', 'center-R', 'center-F', 'center-B'],
        'D CW': ['center-U', 'center-D', 'center-R', 'center-L', 'center-B', 'center-F'],
        'D CCW': ['center-U', 'center-D', 'center-L', 'center-R', 'center-F', 'center-B'],
        'F CW': ['center-L', 'center-R', 'center-F', 'center-B', 'center-U', 'center-D'],
        'F CCW': ['center-R', 'center-L', 'center-F', 'center-B', 'center-D', 'center-U'],
        'B CW': ['center-L', 'center-R', 'center-F', 'center-B', 'center-U', 'center-D'],
        'B CCW': ['center-R', 'center-L', 'center-F', 'center-B', 'center-D', 'center-U'],
        'R CW': ['center-F', 'center-B', 'center-D', 'center-U', 'center-R', 'center-L'],
        'R CCW': ['center-B', 'center-F', 'center-U', 'center-D', 'center-R', 'center-L'],
        'L CW': ['center-F', 'center-B', 'center-D', 'center-U', 'center-R', 'center-L'],
        'L CCW': ['center-B', 'center-F', 'center-U', 'center-D', 'center-R', 'center-L'],
      };

      // 1. Solved Golden
      const solvedView = materializeState(SOLVED_GEAR_CUBE_STATE, 3);
      expect(solvedView.centers.map((c) => c.pieceId)).toEqual(normativeGoldens.SOLVED);

      // 2. 12 Directed Move Goldens
      for (const move of ALL_MOVES) {
        const moveKey = `${move.face} ${move.direction}`;
        const nextState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
        const viewInFrame3 = materializeState(nextState, 3);
        const centerPieces = viewInFrame3.centers.map((c) => c.pieceId);
        expect(centerPieces).toEqual(normativeGoldens[moveKey]);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Gate 5: Exhaustive 165,888 State-Frame Materialization Gate
  // --------------------------------------------------------------------------
  describe('Gate 5: Exhaustive 165,888 State-Frame Materialization Gate', () => {
    it('verifies 165,888 / 165,888 materializations match independent oracle field-by-field', { timeout: 30000 }, () => {
      let verifiedCount = 0;

      for (let c = 0; c < 24; c++) {
        for (let kX = 0; kX < 4; kX++) {
          for (let pX = 0; pX < 3; pX++) {
            for (let kY = 0; kY < 4; kY++) {
              for (let pY = 0; pY < 3; pY++) {
                for (let kZ = 0; kZ < 4; kZ++) {
                  for (let pZ = 0; pZ < 3; pZ++) {
                    const state: GearCubeState = {
                      cornerConfiguration: c as CornerConfiguration,
                      sliceX: {
                        permutationClass: kX as SlicePermutationClass,
                        phase: pX as SliceGearPhase,
                      },
                      sliceY: {
                        permutationClass: kY as SlicePermutationClass,
                        phase: pY as SliceGearPhase,
                      },
                      sliceZ: {
                        permutationClass: kZ as SlicePermutationClass,
                        phase: pZ as SliceGearPhase,
                      },
                    };

                    for (const frame of SPATIAL_FRAMES) {
                      const actualView = materializeState(state, frame);
                      const expectedView = oracleMaterializeState(state, frame);

                      // Corners comparison
                      if (actualView.corners.length !== 8) throw new Error('Corner count mismatch');
                      for (let i = 0; i < 8; i++) {
                        if (
                          actualView.corners[i]!.slot !== expectedView.corners[i]!.slot ||
                          actualView.corners[i]!.pieceId !== expectedView.corners[i]!.pieceId ||
                          actualView.corners[i]!.orbit !== expectedView.corners[i]!.orbit
                        ) {
                          throw new Error(`Corner mismatch at c=${c}, frame=${frame}, index=${i}`);
                        }
                      }

                      // Edges comparison
                      if (actualView.edges.length !== 12) throw new Error('Edge count mismatch');
                      for (let i = 0; i < 12; i++) {
                        if (
                          actualView.edges[i]!.slot !== expectedView.edges[i]!.slot ||
                          actualView.edges[i]!.pieceId !== expectedView.edges[i]!.pieceId ||
                          actualView.edges[i]!.slice !== expectedView.edges[i]!.slice ||
                          actualView.edges[i]!.phase !== expectedView.edges[i]!.phase
                        ) {
                          throw new Error(`Edge mismatch at c=${c}, frame=${frame}, index=${i}`);
                        }
                      }

                      // Centers comparison
                      if (actualView.centers.length !== 6) throw new Error('Center count mismatch');
                      for (let i = 0; i < 6; i++) {
                        if (
                          actualView.centers[i]!.slot !== expectedView.centers[i]!.slot ||
                          actualView.centers[i]!.pieceId !== expectedView.centers[i]!.pieceId ||
                          'orientationAngleDegrees' in actualView.centers[i]!
                        ) {
                          throw new Error(`Center mismatch at c=${c}, frame=${frame}, index=${i}`);
                        }
                      }

                      // Slot & Piece bijection checks
                      if (
                        new Set(actualView.corners.map((p) => p.pieceId)).size !== 8 ||
                        new Set(actualView.edges.map((p) => p.pieceId)).size !== 12 ||
                        new Set(actualView.centers.map((p) => p.pieceId)).size !== 6
                      ) {
                        throw new Error(`Bijection violation at c=${c}, frame=${frame}`);
                      }

                      verifiedCount++;
                    }
                  }
                }
              }
            }
          }
        }
      }

      expect(verifiedCount).toBe(CANONICAL_DOMAIN_SIZE * 4);
    });
  });

  // --------------------------------------------------------------------------
  // Gate 6: Exhaustive 1,990,656 Application Lifecycle Gate
  // --------------------------------------------------------------------------
  describe('Gate 6: Exhaustive 1,990,656 Application Lifecycle Gate', () => {
    it('verifies 1,990,656 / 1,990,656 transitions match independent physical oracle', { timeout: 60000 }, () => {
      let verifiedTransitions = 0;

      for (let c = 0; c < 24; c++) {
        for (let kX = 0; kX < 4; kX++) {
          for (let pX = 0; pX < 3; pX++) {
            for (let kY = 0; kY < 4; kY++) {
              for (let pY = 0; pY < 3; pY++) {
                for (let kZ = 0; kZ < 4; kZ++) {
                  for (let pZ = 0; pZ < 3; pZ++) {
                    const state: GearCubeState = {
                      cornerConfiguration: c as CornerConfiguration,
                      sliceX: {
                        permutationClass: kX as SlicePermutationClass,
                        phase: pX as SliceGearPhase,
                      },
                      sliceY: {
                        permutationClass: kY as SlicePermutationClass,
                        phase: pY as SliceGearPhase,
                      },
                      sliceZ: {
                        permutationClass: kZ as SlicePermutationClass,
                        phase: pZ as SliceGearPhase,
                      },
                    };

                    for (const frame of SPATIAL_FRAMES) {
                      // Expected path starts strictly from independent oracle materialization
                      const initialOracleView = oracleMaterializeState(state, frame);

                      for (const move of ALL_MOVES) {
                        // 1. SUT Path: applyMove + nextSpatialFrame + materializeState (Direct Move Semantics)
                        const nextState = applyMove(state, move);
                        const nextFrame = nextSpatialFrame(frame, move.face);
                        const sutNextView = materializeState(nextState, nextFrame);

                        // 2. Expected Path: independent 3D physical simulation
                        const expectedOracleNextView = simulatePhysicalMoveOnPlacement(
                          initialOracleView,
                          move,
                        );

                        // 3. Direct Field Comparisons
                        // Corners
                        for (let i = 0; i < 8; i++) {
                          if (sutNextView.corners[i]!.pieceId !== expectedOracleNextView.corners[i]!.pieceId) {
                            throw new Error(
                              `Lifecycle Corner mismatch on move ${move.face} ${move.direction} at frame ${frame}`,
                            );
                          }
                        }

                        // Edges
                        for (let i = 0; i < 12; i++) {
                          if (
                            sutNextView.edges[i]!.pieceId !== expectedOracleNextView.edges[i]!.pieceId ||
                            sutNextView.edges[i]!.phase !== expectedOracleNextView.edges[i]!.phase
                          ) {
                            throw new Error(
                              `Lifecycle Edge mismatch on move ${move.face} ${move.direction} at frame ${frame}`,
                            );
                          }
                        }

                        // Centers (slot + pieceId only)
                        for (let i = 0; i < 6; i++) {
                          if (sutNextView.centers[i]!.pieceId !== expectedOracleNextView.centers[i]!.pieceId) {
                            throw new Error(
                              `Lifecycle Center mismatch on move ${move.face} ${move.direction} at frame ${frame}`,
                            );
                          }
                        }

                        verifiedTransitions++;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      expect(verifiedTransitions).toBe(CANONICAL_DOMAIN_SIZE * 4 * 12);
    });
  });

  // --------------------------------------------------------------------------
  // Gate 7: Round-Trip Invertibility Property (Internal Normalizer)
  // --------------------------------------------------------------------------
  describe('Gate 7: Round-Trip Invertibility Property', () => {
    it('verifies normalizePiecePlacement recovers exact canonical state and SpatialFrame for all 165,888 views', { timeout: 30000 }, () => {
      let roundTrips = 0;

      for (let c = 0; c < 24; c++) {
        for (let kX = 0; kX < 4; kX++) {
          for (let pX = 0; pX < 3; pX++) {
            for (let kY = 0; kY < 4; kY++) {
              for (let pY = 0; pY < 3; pY++) {
                for (let kZ = 0; kZ < 4; kZ++) {
                  for (let pZ = 0; pZ < 3; pZ++) {
                    const originalState: GearCubeState = {
                      cornerConfiguration: c as CornerConfiguration,
                      sliceX: {
                        permutationClass: kX as SlicePermutationClass,
                        phase: pX as SliceGearPhase,
                      },
                      sliceY: {
                        permutationClass: kY as SlicePermutationClass,
                        phase: pY as SliceGearPhase,
                      },
                      sliceZ: {
                        permutationClass: kZ as SlicePermutationClass,
                        phase: pZ as SliceGearPhase,
                      },
                    };

                    for (const frame of SPATIAL_FRAMES) {
                      const view = materializeState(originalState, frame);
                      const recovered = normalizePiecePlacement(view);

                      if (
                        recovered.spatialFrame !== frame ||
                        !equalsGearCubeState(recovered.state, originalState)
                      ) {
                        throw new Error(`Round-trip normalization mismatch at frame ${frame}`);
                      }

                      roundTrips++;
                    }
                  }
                }
              }
            }
          }
        }
      }

      expect(roundTrips).toBe(CANONICAL_DOMAIN_SIZE * 4);
    });
  });
});
