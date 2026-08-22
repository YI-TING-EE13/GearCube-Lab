/**
 * @file projection.ts
 * @description Static placement projection and deterministic coordinate/quaternion math.
 */

import {
  CORNER_PIECE_IDS,
  EDGE_PIECE_IDS,
  CENTER_PIECE_IDS,
  type CornerSlot,
  type EdgeSlot,
  type CenterSlot,
  type CornerPieceId,
  type EdgePieceId,
  type CenterPieceId,
  type PiecePlacementView,
  type SliceGearPhase,
} from '@gearcube/core';
import type { ComponentTransform } from './types.js';

/** Vector tuple in R^3 */
export type Vec3 = readonly [number, number, number];

/** Quaternion tuple in R^4 [x, y, z, w] */
export type Quat4 = readonly [number, number, number, number];

/** Numerical tolerance for floating-point calculations */
const EPSILON = 1e-9;

/**
 * Normalizes a 3D vector to unit length.
 */
export function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len < EPSILON) {
    return [0, 0, 0];
  }
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Normalizes a quaternion to unit length and applies deterministic sign canonicalization.
 * The first non-zero component in order (w, z, y, x) is made strictly positive.
 */
export function canonicalizeQuat(q: Quat4): Quat4 {
  const norm = Math.hypot(q[0], q[1], q[2], q[3]);
  if (norm < EPSILON) {
    return [0, 0, 0, 1];
  }
  let x = q[0] / norm;
  let y = q[1] / norm;
  let z = q[2] / norm;
  let w = q[3] / norm;

  // Sign canonicalization: first non-zero in (w, z, y, x) is positive
  const comps = [w, z, y, x];
  for (const c of comps) {
    if (Math.abs(c) > EPSILON) {
      if (c < 0) {
        x = -x;
        y = -y;
        z = -z;
        w = -w;
      }
      break;
    }
  }

  // Clean near-zero components
  return [
    Math.abs(x) < EPSILON ? 0 : x,
    Math.abs(y) < EPSILON ? 0 : y,
    Math.abs(z) < EPSILON ? 0 : z,
    Math.abs(w) < EPSILON ? 0 : w,
  ];
}

/**
 * Multiplies two quaternions q1 * q2 in [x, y, z, w] format.
 */
export function multiplyQuat(q1: Quat4, q2: Quat4): Quat4 {
  const [x1, y1, z1, w1] = q1;
  const [x2, y2, z2, w2] = q2;
  return canonicalizeQuat([
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
  ]);
}

/**
 * Creates a unit quaternion from a rotation axis and angle in radians.
 */
export function quatFromAxisAngle(axis: Vec3, angleRad: number): Quat4 {
  const unitAxis = normalizeVec3(axis);
  const half = angleRad * 0.5;
  const s = Math.sin(half);
  const c = Math.cos(half);
  return canonicalizeQuat([
    unitAxis[0] * s,
    unitAxis[1] * s,
    unitAxis[2] * s,
    c,
  ]);
}

/**
 * Applies a quaternion rotation to a 3D vector.
 */
export function rotateVector(q: Quat4, v: Vec3): Vec3 {
  const [qx, qy, qz, qw] = q;
  const [vx, vy, vz] = v;

  const ix = qw * vx + qy * vz - qz * vy;
  const iy = qw * vy + qz * vx - qx * vz;
  const iz = qw * vz + qx * vy - qy * vx;
  const iw = -qx * vx - qy * vy - qz * vz;

  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

/** Spatial position vectors for all 8 corner slots */
export const CORNER_SLOT_POSITIONS: Readonly<Record<CornerSlot, Vec3>> = {
  UFL: [-1, 1, 1],
  UBR: [1, 1, -1],
  DFR: [1, -1, 1],
  DBL: [-1, -1, -1],
  UFR: [1, 1, 1],
  UBL: [-1, 1, -1],
  DFL: [-1, -1, 1],
  DBR: [1, -1, -1],
};

/** Spatial position vectors for all 12 edge slots */
export const EDGE_SLOT_POSITIONS: Readonly<Record<EdgeSlot, Vec3>> = {
  UB: [0, 1, -1],
  UF: [0, 1, 1],
  DF: [0, -1, 1],
  DB: [0, -1, -1],
  FL: [-1, 0, 1],
  FR: [1, 0, 1],
  BR: [1, 0, -1],
  BL: [-1, 0, -1],
  UR: [1, 1, 0],
  UL: [-1, 1, 0],
  DL: [-1, -1, 0],
  DR: [1, -1, 0],
};

/** Spatial position vectors and outward face normals for all 6 center slots */
export const CENTER_SLOT_POSITIONS: Readonly<Record<CenterSlot, Vec3>> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

const SQRT2_OVER_2 = Math.SQRT1_2;

/**
 * Canonical renderer quaternion table for centers.
 * Maps local center +Y = (0, 1, 0) to outward face normal n.
 */
export const CENTER_CANONICAL_QUATERNIONS: Readonly<Record<CenterSlot, Quat4>> = {
  U: [0, 0, 0, 1],
  D: [1, 0, 0, 0],
  F: [SQRT2_OVER_2, 0, 0, SQRT2_OVER_2],
  B: [-SQRT2_OVER_2, 0, 0, SQRT2_OVER_2],
  R: [0, 0, -SQRT2_OVER_2, SQRT2_OVER_2],
  L: [0, 0, SQRT2_OVER_2, SQRT2_OVER_2],
};

/**
 * Proven finite canonical mapping for all 32 reachable (CornerPieceId, CornerSlot) pairs.
 */
const CORNER_CANONICAL_MAP: Readonly<Record<string, Quat4>> = {
  'corner-DBL|DBL': [0, 0, 0, 1],
  'corner-DBL|DFR': [0, 1, 0, 0],
  'corner-DBL|UBR': [0, 0, 1, 0],
  'corner-DBL|UFL': [1, 0, 0, 0],

  'corner-DBR|DBR': [0, 0, 0, 1],
  'corner-DBR|DFL': [0, 1, 0, 0],
  'corner-DBR|UBL': [0, 0, 1, 0],
  'corner-DBR|UFR': [1, 0, 0, 0],

  'corner-DFL|DBR': [0, 1, 0, 0],
  'corner-DFL|DFL': [0, 0, 0, 1],
  'corner-DFL|UBL': [1, 0, 0, 0],
  'corner-DFL|UFR': [0, 0, 1, 0],

  'corner-DFR|DBL': [0, 1, 0, 0],
  'corner-DFR|DFR': [0, 0, 0, 1],
  'corner-DFR|UBR': [1, 0, 0, 0],
  'corner-DFR|UFL': [0, 0, 1, 0],

  'corner-UBL|DBR': [0, 0, 1, 0],
  'corner-UBL|DFL': [1, 0, 0, 0],
  'corner-UBL|UBL': [0, 0, 0, 1],
  'corner-UBL|UFR': [0, 1, 0, 0],

  'corner-UBR|DBL': [0, 0, 1, 0],
  'corner-UBR|DFR': [1, 0, 0, 0],
  'corner-UBR|UBR': [0, 0, 0, 1],
  'corner-UBR|UFL': [0, 1, 0, 0],

  'corner-UFL|DBL': [1, 0, 0, 0],
  'corner-UFL|DFR': [0, 0, 1, 0],
  'corner-UFL|UBR': [0, 1, 0, 0],
  'corner-UFL|UFL': [0, 0, 0, 1],

  'corner-UFR|DBR': [1, 0, 0, 0],
  'corner-UFR|DFL': [0, 0, 1, 0],
  'corner-UFR|UBL': [0, 1, 0, 0],
  'corner-UFR|UFR': [0, 0, 0, 1],
};

/**
 * Proven finite canonical mapping for all 48 reachable (EdgePieceId, EdgeSlot) phase-zero base pairs.
 */
const EDGE_BASE_MAP: Readonly<Record<string, Quat4>> = {
  'edge-BL|BL': [0, 0, 0, 1],
  'edge-BL|BR': [0, 0, 1, 0],
  'edge-BL|FL': [1, 0, 0, 0],
  'edge-BL|FR': [0, 1, 0, 0],

  'edge-BR|BL': [0, 0, 1, 0],
  'edge-BR|BR': [0, 0, 0, 1],
  'edge-BR|FL': [0, 1, 0, 0],
  'edge-BR|FR': [1, 0, 0, 0],

  'edge-DB|DB': [0, 0, 0, 1],
  'edge-DB|DF': [0, 1, 0, 0],
  'edge-DB|UB': [0, 0, 1, 0],
  'edge-DB|UF': [1, 0, 0, 0],

  'edge-DF|DB': [0, 1, 0, 0],
  'edge-DF|DF': [0, 0, 0, 1],
  'edge-DF|UB': [1, 0, 0, 0],
  'edge-DF|UF': [0, 0, 1, 0],

  'edge-DL|DL': [0, 0, 0, 1],
  'edge-DL|DR': [0, 1, 0, 0],
  'edge-DL|UL': [1, 0, 0, 0],
  'edge-DL|UR': [0, 0, 1, 0],

  'edge-DR|DL': [0, 1, 0, 0],
  'edge-DR|DR': [0, 0, 0, 1],
  'edge-DR|UL': [0, 0, 1, 0],
  'edge-DR|UR': [1, 0, 0, 0],

  'edge-FL|BL': [1, 0, 0, 0],
  'edge-FL|BR': [0, 1, 0, 0],
  'edge-FL|FL': [0, 0, 0, 1],
  'edge-FL|FR': [0, 0, 1, 0],

  'edge-FR|BL': [0, 1, 0, 0],
  'edge-FR|BR': [1, 0, 0, 0],
  'edge-FR|FL': [0, 0, 1, 0],
  'edge-FR|FR': [0, 0, 0, 1],

  'edge-UB|DB': [0, 0, 1, 0],
  'edge-UB|DF': [1, 0, 0, 0],
  'edge-UB|UB': [0, 0, 0, 1],
  'edge-UB|UF': [0, 1, 0, 0],

  'edge-UF|DB': [1, 0, 0, 0],
  'edge-UF|DF': [0, 0, 1, 0],
  'edge-UF|UB': [0, 1, 0, 0],
  'edge-UF|UF': [0, 0, 0, 1],

  'edge-UL|DL': [1, 0, 0, 0],
  'edge-UL|DR': [0, 0, 1, 0],
  'edge-UL|UL': [0, 0, 0, 1],
  'edge-UL|UR': [0, 1, 0, 0],

  'edge-UR|DL': [0, 0, 1, 0],
  'edge-UR|DR': [1, 0, 0, 0],
  'edge-UR|UL': [0, 1, 0, 0],
  'edge-UR|UR': [0, 0, 0, 1],
};

/**
 * Computes canonical corner quaternion from pieceId and slot.
 * @throws {Error} if pieceId and slot do not form a reachable placement.
 */
export function getCornerQuaternion(pieceId: CornerPieceId, slot: CornerSlot): Quat4 {
  const key = `${pieceId}|${slot}`;
  const q = CORNER_CANONICAL_MAP[key];
  if (!q) {
    throw new Error(`Invalid corner placement key: ${key}`);
  }
  return q;
}

/**
 * Computes the local physical radial unit vector for an edge slot position.
 */
export function getEdgeRadialAxis(slot: EdgeSlot): Vec3 {
  const pos = EDGE_SLOT_POSITIONS[slot];
  return normalizeVec3(pos);
}

/**
 * Computes base orientation for an edge piece at phase 0.
 * @throws {Error} if pieceId and slot do not form a reachable placement.
 */
export function getEdgeBaseQuaternion(pieceId: EdgePieceId, slot: EdgeSlot): Quat4 {
  const key = `${pieceId}|${slot}`;
  const q = EDGE_BASE_MAP[key];
  if (!q) {
    throw new Error(`Invalid edge placement key: ${key}`);
  }
  return q;
}

/**
 * Computes composite edge orientation including axial gear phase spin.
 */
export function getEdgeQuaternion(
  pieceId: EdgePieceId,
  slot: EdgeSlot,
  phase: SliceGearPhase
): Quat4 {
  const qBase = getEdgeBaseQuaternion(pieceId, slot);
  if (phase === 0) {
    return qBase;
  }
  const radialAxis = getEdgeRadialAxis(slot);
  const spinAngleRad = (phase * 60 * Math.PI) / 180;
  const qSpin = quatFromAxisAngle(radialAxis, spinAngleRad);
  return multiplyQuat(qSpin, qBase);
}

/**
 * Projects a physical PiecePlacementView into an array of 26 ComponentTransforms.
 * Output order is 100% stable across states and frames:
 * 1. 8 CORNER_PIECE_IDS
 * 2. 12 EDGE_PIECE_IDS
 * 3. 6 CENTER_PIECE_IDS
 */
export function placementToTransforms(
  view: PiecePlacementView
): readonly ComponentTransform[] {
  // Index placements by pieceId
  const cornerMap = new Map<CornerPieceId, CornerSlot>();
  for (const c of view.corners) {
    cornerMap.set(c.pieceId, c.slot);
  }

  const edgeMap = new Map<EdgePieceId, { slot: EdgeSlot; phase: SliceGearPhase }>();
  for (const e of view.edges) {
    edgeMap.set(e.pieceId, { slot: e.slot, phase: e.phase });
  }

  const centerMap = new Map<CenterPieceId, CenterSlot>();
  for (const c of view.centers) {
    centerMap.set(c.pieceId, c.slot);
  }

  const transforms: ComponentTransform[] = new Array(26);
  let idx = 0;

  // 1. Corners (8)
  for (const pieceId of CORNER_PIECE_IDS) {
    const slot = cornerMap.get(pieceId);
    if (!slot) {
      throw new Error(`Missing corner placement for piece: ${pieceId}`);
    }
    transforms[idx++] = {
      componentId: pieceId,
      position: CORNER_SLOT_POSITIONS[slot],
      rotationQuaternion: getCornerQuaternion(pieceId, slot),
    };
  }

  // 2. Edges (12)
  for (const pieceId of EDGE_PIECE_IDS) {
    const placement = edgeMap.get(pieceId);
    if (!placement) {
      throw new Error(`Missing edge placement for piece: ${pieceId}`);
    }
    transforms[idx++] = {
      componentId: pieceId,
      position: EDGE_SLOT_POSITIONS[placement.slot],
      rotationQuaternion: getEdgeQuaternion(pieceId, placement.slot, placement.phase),
    };
  }

  // 3. Centers (6)
  for (const pieceId of CENTER_PIECE_IDS) {
    const slot = centerMap.get(pieceId);
    if (!slot) {
      throw new Error(`Missing center placement for piece: ${pieceId}`);
    }
    transforms[idx++] = {
      componentId: pieceId,
      position: CENTER_SLOT_POSITIONS[slot],
      rotationQuaternion: CENTER_CANONICAL_QUATERNIONS[slot],
    };
  }

  return transforms;
}