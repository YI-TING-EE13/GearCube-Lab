/**
 * @file materializer.ts
 * @description Fixed-spatial PiecePlacementView materialization, Model A center identity derivation, and normalization.
 */

import {
  type Face,
  type CornerConfiguration,
  type SliceGearPhase,
  type SlicePermutationClass,
  type GearCubeState,
} from './values.js';
import { isGearCubeState } from './validation.js';
import {
  type SpatialFrame,
  DEFAULT_SPATIAL_FRAME,
  isSpatialFrame,
  FRAME_SLOT_PERMS,
} from './spatial-frame.js';

// ============================================================================
// 1. Exact Placement Vocabularies & Types
// ============================================================================

export const CORNER_SLOTS = Object.freeze([
  'UFL', 'UBR', 'DFR', 'DBL', // T_ref (0..3)
  'UFR', 'UBL', 'DFL', 'DBR', // T_free (4..7)
] as const);
export type CornerSlot = (typeof CORNER_SLOTS)[number];

export const CORNER_PIECE_IDS = Object.freeze([
  'corner-UFL', 'corner-UBR', 'corner-DFR', 'corner-DBL', // T_ref pieces (0..3)
  'corner-UFR', 'corner-UBL', 'corner-DFL', 'corner-DBR', // T_free pieces (4..7)
] as const);
export type CornerPieceId = (typeof CORNER_PIECE_IDS)[number];

export const EDGE_SLOTS = Object.freeze([
  'UB', 'UF', 'DF', 'DB', // Slice X (0..3)
  'FL', 'FR', 'BR', 'BL', // Slice Y (4..7)
  'UR', 'UL', 'DL', 'DR', // Slice Z (8..11)
] as const);
export type EdgeSlot = (typeof EDGE_SLOTS)[number];

export const EDGE_PIECE_IDS = Object.freeze([
  'edge-UB', 'edge-UF', 'edge-DF', 'edge-DB', // Slice X pieces (0..3)
  'edge-FL', 'edge-FR', 'edge-BR', 'edge-BL', // Slice Y pieces (4..7)
  'edge-UR', 'edge-UL', 'edge-DL', 'edge-DR', // Slice Z pieces (8..11)
] as const);
export type EdgePieceId = (typeof EDGE_PIECE_IDS)[number];

export const CENTER_SLOTS = Object.freeze(['U', 'D', 'F', 'B', 'R', 'L'] as const);
export type CenterSlot = (typeof CENTER_SLOTS)[number];

export const CENTER_PIECE_IDS = Object.freeze([
  'center-U', 'center-D', 'center-F', 'center-B', 'center-R', 'center-L',
] as const);
export type CenterPieceId = (typeof CENTER_PIECE_IDS)[number];

export interface CornerPlacement {
  readonly slot: CornerSlot;
  readonly pieceId: CornerPieceId;
  readonly orbit: 'free' | 'ref';
}

export interface EdgePlacement {
  readonly slot: EdgeSlot;
  readonly pieceId: EdgePieceId;
  readonly slice: 'X' | 'Y' | 'Z';
  readonly phase: SliceGearPhase;
}

export interface CenterPlacement {
  readonly slot: CenterSlot;
  readonly pieceId: CenterPieceId;
}

export interface PiecePlacementView {
  readonly corners: readonly CornerPlacement[];
  readonly edges: readonly EdgePlacement[];
  readonly centers: readonly CenterPlacement[];
}

// ============================================================================
// 2. Canonical Corner and Edge Permutation Tables (Pursuant to ADR-0003 / Model)
// ============================================================================

/** T_ref corner permutations for C in [0..23] */
export const T_REF_TABLE: readonly (readonly [number, number, number, number])[] = Object.freeze([
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

/** T_free corner permutations for C in [0..23] */
const T_FREE_TABLE: readonly (readonly [number, number, number, number])[] = Object.freeze([
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

/** Klein 4-group V4 permutations on 4 elements */
const V4_PERMS: readonly (readonly [number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3] as const), // k=0: Identity
  Object.freeze([1, 0, 3, 2] as const), // k=1: (0 1)(2 3)
  Object.freeze([2, 3, 0, 1] as const), // k=2: (0 2)(1 3)
  Object.freeze([3, 2, 1, 0] as const), // k=3: (0 3)(1 2)
]);

/** Slice X base edge permutations B_X(C) for C in [0..23] */
const B_X_TABLE: readonly (readonly [number, number, number, number])[] = Object.freeze([
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

/** Slice Y base edge permutations B_Y(C) for C in [0..23] */
const B_Y_TABLE: readonly (readonly [number, number, number, number])[] = Object.freeze([
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

/** Slice Z base edge permutations B_Z(C) for C in [0..23] */
const B_Z_TABLE: readonly (readonly [number, number, number, number])[] = Object.freeze([
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

// ============================================================================
// 3. Model A Center Identity Derivation Dictionaries (Pursuant to ADR-0004)
// ============================================================================

/**
 * 24-row dictionary mapping C in [0..23] to canonical center piece placement in
 * slot order ['U', 'D', 'F', 'B', 'R', 'L'] at (k_X=0, k_Y=0, k_Z=0).
 */
export const CENTER_PERM_OF_C: readonly (readonly [
  CenterPieceId,
  CenterPieceId,
  CenterPieceId,
  CenterPieceId,
  CenterPieceId,
  CenterPieceId,
])[] = Object.freeze([
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

/** Center slot index mapping: 0:U, 1:D, 2:F, 3:B, 4:R, 5:L */
export const K_X: readonly (readonly [number, number, number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3, 4, 5] as const), // k=0: Identity
  Object.freeze([0, 1, 3, 2, 5, 4] as const), // k=1: (F B)(R L)
  Object.freeze([1, 0, 3, 2, 4, 5] as const), // k=2: (U D)(F B)
  Object.freeze([1, 0, 2, 3, 5, 4] as const), // k=3: (U D)(R L)
]);

export const K_Y: readonly (readonly [number, number, number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3, 4, 5] as const), // k=0: Identity
  Object.freeze([1, 0, 2, 3, 5, 4] as const), // k=1: (U D)(R L)
  Object.freeze([0, 1, 3, 2, 5, 4] as const), // k=2: (F B)(R L)
  Object.freeze([1, 0, 3, 2, 4, 5] as const), // k=3: (U D)(F B)
]);

export const K_Z: readonly (readonly [number, number, number, number, number, number])[] = Object.freeze([
  Object.freeze([0, 1, 2, 3, 4, 5] as const), // k=0: Identity
  Object.freeze([0, 1, 3, 2, 5, 4] as const), // k=1: (F B)(R L)
  Object.freeze([1, 0, 2, 3, 5, 4] as const), // k=2: (U D)(R L)
  Object.freeze([1, 0, 3, 2, 4, 5] as const), // k=3: (U D)(F B)
]);

/** SpatialFrame slot transformations on center slots ['U', 'D', 'F', 'B', 'R', 'L'] */
const FRAME_CENTER_SLOT_PERMS: Readonly<
  Record<SpatialFrame, readonly [number, number, number, number, number, number]>
> = Object.freeze({
  3: Object.freeze([0, 1, 2, 3, 4, 5] as const), // Identity: [U, D, F, B, R, L]
  2: Object.freeze([0, 1, 3, 2, 5, 4] as const), // Ry(pi): [U, D, B, F, L, R]
  1: Object.freeze([1, 0, 2, 3, 5, 4] as const), // Rz(pi): [D, U, F, B, L, R]
  0: Object.freeze([1, 0, 3, 2, 4, 5] as const), // Rx(pi): [D, U, B, F, R, L]
});

// ============================================================================
// 4. Materialization Implementation
// ============================================================================

/**
 * Materializes a canonical GearCubeState and optional SpatialFrame into a
 * deterministic fixed-spatial PiecePlacementView.
 *
 * @param state Canonical discrete puzzle state
 * @param spatialFrame Physical SpatialFrame orientation (defaults to 3: Solved / Canonical)
 * @returns Fully derived fixed-spatial piece placement view
 * @throws TypeError if state or spatialFrame is invalid
 */
export function materializeState(
  state: GearCubeState,
  spatialFrame: SpatialFrame = DEFAULT_SPATIAL_FRAME,
): PiecePlacementView {
  if (!isGearCubeState(state)) {
    throw new TypeError('Invalid GearCubeState supplied to materializeState');
  }
  if (!isSpatialFrame(spatialFrame)) {
    throw new TypeError(`Invalid SpatialFrame supplied to materializeState: ${String(spatialFrame)}`);
  }

  const C = state.cornerConfiguration;
  const framePerm = FRAME_SLOT_PERMS[spatialFrame];
  const centerFramePerm = FRAME_CENTER_SLOT_PERMS[spatialFrame];

  // --------------------------------------------------------------------------
  // A. Corner Placements (8 fixed-spatial slots)
  // --------------------------------------------------------------------------
  const tRefPerm = T_REF_TABLE[C]!;
  const tFreePerm = T_FREE_TABLE[C]!;

  const corners: CornerPlacement[] = new Array(8);

  // Slots 0..3: T_ref slots ['UFL', 'UBR', 'DFR', 'DBL']
  for (let s = 0; s < 4; s++) {
    const canonicalSlot = framePerm.B[s]!;
    const pieceIdx = tRefPerm[canonicalSlot]!;
    corners[s] = {
      slot: CORNER_SLOTS[s]!,
      pieceId: CORNER_PIECE_IDS[pieceIdx]!,
      orbit: 'ref',
    };
  }

  // Slots 4..7: T_free slots ['UFR', 'UBL', 'DFL', 'DBR']
  for (let s = 0; s < 4; s++) {
    const canonicalSlot = framePerm.A[s]!;
    const pieceIdx = tFreePerm[canonicalSlot]!;
    corners[4 + s] = {
      slot: CORNER_SLOTS[4 + s]!,
      pieceId: CORNER_PIECE_IDS[4 + pieceIdx]!,
      orbit: 'free',
    };
  }

  // --------------------------------------------------------------------------
  // B. Edge Placements (12 fixed-spatial slots)
  // --------------------------------------------------------------------------
  const edges: EdgePlacement[] = new Array(12);

  // Slice X (slots 0..3: 'UB', 'UF', 'DF', 'DB')
  const bX = B_X_TABLE[C]!;
  const v4X = V4_PERMS[state.sliceX.permutationClass]!;
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

  // Slice Y (slots 4..7: 'FL', 'FR', 'BR', 'BL')
  const bY = B_Y_TABLE[C]!;
  const v4Y = V4_PERMS[state.sliceY.permutationClass]!;
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

  // Slice Z (slots 8..11: 'UR', 'UL', 'DL', 'DR')
  const bZ = B_Z_TABLE[C]!;
  const v4Z = V4_PERMS[state.sliceZ.permutationClass]!;
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

  // --------------------------------------------------------------------------
  // C. Center Placements (6 fixed-spatial slots) via Model A
  // --------------------------------------------------------------------------
  const baseCenterRow = CENTER_PERM_OF_C[C]!;
  const kxRow = K_X[state.sliceX.permutationClass]!;
  const kyRow = K_Y[state.sliceY.permutationClass]!;
  const kzRow = K_Z[state.sliceZ.permutationClass]!;

  const centers: CenterPlacement[] = new Array(6);
  for (let s = 0; s < 6; s++) {
    const canonicalSlot = centerFramePerm[s]!;
    // Model A: CENTER_PERM_OF_C[C] o K_X[kX] o K_Y[kY] o K_Z[kZ] (right-to-left)
    const slotZ = kzRow[canonicalSlot]!;
    const slotY = kyRow[slotZ]!;
    const slotX = kxRow[slotY]!;
    const pieceId = baseCenterRow[slotX]!;

    centers[s] = {
      slot: CENTER_SLOTS[s]!,
      pieceId,
    };
  }

  return {
    corners: Object.freeze(corners),
    edges: Object.freeze(edges),
    centers: Object.freeze(centers),
  };
}

// ============================================================================
// 5. Normalization Helper (Internal Verification Oracle)
// ============================================================================

/**
 * Normalizes a physical PiecePlacementView back to its unique canonical GearCubeState
 * and SpatialFrame.
 *
 * @param view Physical piece placement view
 * @returns Reconstructed canonical state and SpatialFrame
 */
export function normalizePiecePlacement(view: PiecePlacementView): {
  state: GearCubeState;
  spatialFrame: SpatialFrame;
} {
  // 1. Detect SpatialFrame from the physical slot of DBL reference piece ('corner-DBL')
  const dblCorner = view.corners.find((c) => c.pieceId === 'corner-DBL');
  if (!dblCorner) {
    throw new Error('Malformed PiecePlacementView: missing reference corner DBL');
  }

  let spatialFrame: SpatialFrame;
  switch (dblCorner.slot) {
    case 'DBL':
      spatialFrame = 3;
      break;
    case 'DFR':
      spatialFrame = 2;
      break;
    case 'UBR':
      spatialFrame = 1;
      break;
    case 'UFL':
      spatialFrame = 0;
      break;
    default:
      throw new Error(`Invalid physical slot for DBL reference corner: ${dblCorner.slot}`);
  }

  const framePerm = FRAME_SLOT_PERMS[spatialFrame];

  // 2. Un-permute T_free corners to identify C in [0..23]
  // Physical T_free slots are slots 4..7
  const canonicalTFreePieces: number[] = new Array(4);
  for (let s = 0; s < 4; s++) {
    const placement = view.corners[4 + s]!;
    const pieceIdx = CORNER_PIECE_IDS.indexOf(placement.pieceId) - 4;
    const canonicalSlot = framePerm.A[s]!;
    canonicalTFreePieces[canonicalSlot] = pieceIdx;
  }

  // Match canonical T_free against T_FREE_TABLE
  let C = -1;
  for (let c = 0; c < 24; c++) {
    const tableRow = T_FREE_TABLE[c]!;
    if (
      tableRow[0] === canonicalTFreePieces[0] &&
      tableRow[1] === canonicalTFreePieces[1] &&
      tableRow[2] === canonicalTFreePieces[2] &&
      tableRow[3] === canonicalTFreePieces[3]
    ) {
      C = c;
      break;
    }
  }
  if (C === -1) {
    throw new Error('Malformed PiecePlacementView: unrecognized corner permutation');
  }

  // 3. Un-permute Edges to recover k_X, k_Y, k_Z
  const bX = B_X_TABLE[C]!;
  const canonicalSliceXPieces: number[] = new Array(4);
  for (let s = 0; s < 4; s++) {
    const placement = view.edges[s]!;
    const pieceIdx = EDGE_PIECE_IDS.indexOf(placement.pieceId);
    const canonicalSlot = framePerm.X[s]!;
    canonicalSliceXPieces[canonicalSlot] = pieceIdx;
  }
  let kX = -1;
  for (let k = 0; k < 4; k++) {
    const v4 = V4_PERMS[k]!;
    if (
      bX[v4[0]!] === canonicalSliceXPieces[0] &&
      bX[v4[1]!] === canonicalSliceXPieces[1] &&
      bX[v4[2]!] === canonicalSliceXPieces[2] &&
      bX[v4[3]!] === canonicalSliceXPieces[3]
    ) {
      kX = k;
      break;
    }
  }

  const bY = B_Y_TABLE[C]!;
  const canonicalSliceYPieces: number[] = new Array(4);
  for (let s = 0; s < 4; s++) {
    const placement = view.edges[4 + s]!;
    const pieceIdx = EDGE_PIECE_IDS.indexOf(placement.pieceId) - 4;
    const canonicalSlot = framePerm.Y[s]!;
    canonicalSliceYPieces[canonicalSlot] = pieceIdx;
  }
  let kY = -1;
  for (let k = 0; k < 4; k++) {
    const v4 = V4_PERMS[k]!;
    if (
      bY[v4[0]!] === canonicalSliceYPieces[0] &&
      bY[v4[1]!] === canonicalSliceYPieces[1] &&
      bY[v4[2]!] === canonicalSliceYPieces[2] &&
      bY[v4[3]!] === canonicalSliceYPieces[3]
    ) {
      kY = k;
      break;
    }
  }

  const bZ = B_Z_TABLE[C]!;
  const canonicalSliceZPieces: number[] = new Array(4);
  for (let s = 0; s < 4; s++) {
    const placement = view.edges[8 + s]!;
    const pieceIdx = EDGE_PIECE_IDS.indexOf(placement.pieceId) - 8;
    const canonicalSlot = framePerm.Z[s]!;
    canonicalSliceZPieces[canonicalSlot] = pieceIdx;
  }
  let kZ = -1;
  for (let k = 0; k < 4; k++) {
    const v4 = V4_PERMS[k]!;
    if (
      bZ[v4[0]!] === canonicalSliceZPieces[0] &&
      bZ[v4[1]!] === canonicalSliceZPieces[1] &&
      bZ[v4[2]!] === canonicalSliceZPieces[2] &&
      bZ[v4[3]!] === canonicalSliceZPieces[3]
    ) {
      kZ = k;
      break;
    }
  }

  if (kX === -1 || kY === -1 || kZ === -1) {
    throw new Error('Malformed PiecePlacementView: unrecognized edge slice permutation');
  }

  const state: GearCubeState = {
    cornerConfiguration: C as CornerConfiguration,
    sliceX: {
      permutationClass: kX as SlicePermutationClass,
      phase: view.edges[0]!.phase,
    },
    sliceY: {
      permutationClass: kY as SlicePermutationClass,
      phase: view.edges[4]!.phase,
    },
    sliceZ: {
      permutationClass: kZ as SlicePermutationClass,
      phase: view.edges[8]!.phase,
    },
  };

  return { state, spatialFrame };
}
