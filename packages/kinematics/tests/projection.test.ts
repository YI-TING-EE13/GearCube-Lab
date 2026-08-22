/**
 * @file projection.test.ts
 * @description Bounded independent oracle tests for static projection and component orientation mappings.
 */

import { describe, it, expect } from 'vitest';
import {
  CORNER_PIECE_IDS,
  EDGE_PIECE_IDS,
  CENTER_PIECE_IDS,
  CORNER_SLOTS,
  EDGE_SLOTS,
  CENTER_SLOTS,
  SOLVED_GEAR_CUBE_STATE,
  materializeState,
  DEFAULT_SPATIAL_FRAME,
  SPATIAL_FRAMES,
  type CornerSlot,
  type EdgeSlot,
  type CenterSlot,
  type CornerPieceId,
  type EdgePieceId,
  type CenterPieceId,
  type PiecePlacementView,
  type SliceGearPhase,
} from '@gearcube/core';
import { placementToTransforms } from '../src/index.js';

// ============================================================================
// TEST-LOCAL INDEPENDENT VECTOR & QUATERNION ORACLE MATH
// ============================================================================

type TestVec3 = readonly [number, number, number];
type TestQuat4 = readonly [number, number, number, number];

const EPSILON = 1e-5;

function testNormalizeVec3(v: TestVec3): TestVec3 {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

function testQuatFromAxisAngle(axis: TestVec3, angleRad: number): TestQuat4 {
  const u = testNormalizeVec3(axis);
  const half = angleRad * 0.5;
  const s = Math.sin(half);
  const c = Math.cos(half);
  return [u[0] * s, u[1] * s, u[2] * s, c];
}

function testQuatMultiply(q1: TestQuat4, q2: TestQuat4): TestQuat4 {
  const [x1, y1, z1, w1] = q1;
  const [x2, y2, z2, w2] = q2;
  return [
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
  ];
}

function testRotateVector(q: TestQuat4, v: TestVec3): TestVec3 {
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

function testQuatEqualModSign(q1: TestQuat4, q2: TestQuat4): boolean {
  const dPos = Math.hypot(q1[0] - q2[0], q1[1] - q2[1], q1[2] - q2[2], q1[3] - q2[3]);
  const dNeg = Math.hypot(q1[0] + q2[0], q1[1] + q2[1], q1[2] + q2[2], q1[3] + q2[3]);
  return Math.min(dPos, dNeg) < EPSILON;
}

function testQuatEqualModC2(q1: TestQuat4, q2: TestQuat4, radialAxis: TestVec3): boolean {
  if (testQuatEqualModSign(q1, q2)) {
    return true;
  }
  const q180 = testQuatFromAxisAngle(radialAxis, Math.PI);
  const qRot = testQuatMultiply(q180, q2);
  return testQuatEqualModSign(q1, qRot);
}

// Test-local slot coordinate dictionaries
const TEST_CORNER_SLOTS: Record<CornerSlot, TestVec3> = {
  UFL: [-1, 1, 1],
  UBR: [1, 1, -1],
  DFR: [1, -1, 1],
  DBL: [-1, -1, -1],
  UFR: [1, 1, 1],
  UBL: [-1, 1, -1],
  DFL: [-1, -1, 1],
  DBR: [1, -1, -1],
};

const TEST_EDGE_SLOTS: Record<EdgeSlot, TestVec3> = {
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

const TEST_CENTER_SLOTS: Record<CenterSlot, TestVec3> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

// ============================================================================
// TEST-LOCAL EXPLICIT INDEPENDENT ORACLE TABLES
// ============================================================================

/**
 * Test-local explicit expected table for all 32 valid (CornerPieceId, CornerSlot) pairs.
 * Values independently formalized from the Klein four-group V4 physical endpoint symmetry.
 */
const TEST_EXPECTED_CORNER_MAP: Readonly<Record<string, TestQuat4>> = {
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
 * Test-local explicit expected table for all 48 valid phase-zero (EdgePieceId, EdgeSlot) pairs.
 */
const TEST_EXPECTED_EDGE_BASE_MAP: Readonly<Record<string, TestQuat4>> = {
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

describe('Projection Engine & Bounded Independent Oracle Verification', () => {
  it('CORNER_MAPPING_GATE: 32 / 32 reachable pairs verified against test-local explicit expected table', () => {
    expect(Object.keys(TEST_EXPECTED_CORNER_MAP).length).toBe(32);

    const fullView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);

    for (const [key, expectedQ] of Object.entries(TEST_EXPECTED_CORNER_MAP)) {
      const [pieceId, slot] = key.split('|') as [CornerPieceId, CornerSlot];

      const testView: PiecePlacementView = {
        ...fullView,
        corners: fullView.corners.map((c) => (c.pieceId === pieceId ? { slot, pieceId, orbit: c.orbit } : c)),
      };

      const transforms = placementToTransforms(testView);
      const transform = transforms.find((t) => t.componentId === pieceId)!;

      expect(transform).toBeDefined();
      expect(transform.position).toEqual(TEST_CORNER_SLOTS[slot]);
      expect(testQuatEqualModSign(transform.rotationQuaternion, expectedQ)).toBe(true);
    }
  });

  it('EDGE_MAPPING_GATE & EDGE_PHASE_DECOMPOSITION_GATE: 144 / 144 verified against test-local oracle', () => {
    expect(Object.keys(TEST_EXPECTED_EDGE_BASE_MAP).length).toBe(48);

    const fullView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const phases: SliceGearPhase[] = [0, 1, 2];

    let fullKeyCount = 0;

    for (const [baseKey, qBase] of Object.entries(TEST_EXPECTED_EDGE_BASE_MAP)) {
      const [pieceId, slot] = baseKey.split('|') as [EdgePieceId, EdgeSlot];
      const radialAxis = testNormalizeVec3(TEST_EDGE_SLOTS[slot]);

      for (const phase of phases) {
        // Derive expected quaternion via test-local independent math
        const spinAngleRad = (phase * 60 * Math.PI) / 180;
        const qSpin = testQuatFromAxisAngle(radialAxis, spinAngleRad);
        const expectedQ = testQuatMultiply(qSpin, qBase);

        const testView: PiecePlacementView = {
          ...fullView,
          edges: fullView.edges.map((e) => (e.pieceId === pieceId ? { slot, pieceId, slice: e.slice, phase } : e)),
        };

        const transforms = placementToTransforms(testView);
        const transform = transforms.find((t) => t.componentId === pieceId)!;

        expect(transform).toBeDefined();
        expect(transform.position).toEqual(TEST_EDGE_SLOTS[slot]);
        expect(testQuatEqualModC2(transform.rotationQuaternion, expectedQ, radialAxis)).toBe(true);

        fullKeyCount++;
      }
    }

    expect(fullKeyCount).toBe(144);
  });

  it('CENTER_MAPPING_GATE: 6 / 6 canonical quaternions map local +Y to target face normal', () => {
    const fullView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const transforms = placementToTransforms(fullView);

    let centerCount = 0;
    for (const slot of CENTER_SLOTS) {
      const pieceId = `center-${slot}` as CenterPieceId;
      const t = transforms.find((x) => x.componentId === pieceId)!;
      expect(t).toBeDefined();
      expect(t.position).toEqual(TEST_CENTER_SLOTS[slot]);

      const mappedY = testRotateVector(t.rotationQuaternion, [0, 1, 0]);
      const targetPos = TEST_CENTER_SLOTS[slot];
      expect(mappedY[0]).toBeCloseTo(targetPos[0], 5);
      expect(mappedY[1]).toBeCloseTo(targetPos[1], 5);
      expect(mappedY[2]).toBeCloseTo(targetPos[2], 5);
      centerCount++;
    }
    expect(centerCount).toBe(6);
  });

  it('QUATERNION_NORMALIZATION_GATE & QUATERNION_SIGN_CANONICALIZATION_GATE: verifies all output quaternions', () => {
    for (const frame of SPATIAL_FRAMES) {
      const view = materializeState(SOLVED_GEAR_CUBE_STATE, frame);
      const transforms = placementToTransforms(view);

      for (const t of transforms) {
        const q = t.rotationQuaternion;
        // 1. Normalization: norm(q) approx 1.0
        const norm = Math.hypot(q[0], q[1], q[2], q[3]);
        expect(norm).toBeCloseTo(1.0, 5);

        // 2. Sign canonicalization: first non-zero in (w, z, y, x) is strictly positive
        const comps = [q[3], q[2], q[1], q[0]];
        const firstNonZero = comps.find((c) => Math.abs(c) > 1e-6);
        expect(firstNonZero).toBeDefined();
        expect(firstNonZero!).toBeGreaterThan(0);
      }
    }
  });

  it('PROJECTION_DETERMINISM_GATE & PROJECTION_INPUT_IMMUTABILITY_GATE: repeatable across all SpatialFrames', () => {
    for (const frame of SPATIAL_FRAMES) {
      const view = materializeState(SOLVED_GEAR_CUBE_STATE, frame);
      const viewJsonBefore = JSON.stringify(view);

      const t1 = placementToTransforms(view);
      const t2 = placementToTransforms(view);

      // 1. Determinism: t1 and t2 are identical
      expect(JSON.stringify(t1)).toBe(JSON.stringify(t2));

      // 2. Immutability: input view is unchanged
      expect(JSON.stringify(view)).toBe(viewJsonBefore);

      // 3. Stable array ordering
      expect(t1).toHaveLength(26);
      const expectedIds = [...CORNER_PIECE_IDS, ...EDGE_PIECE_IDS, ...CENTER_PIECE_IDS];
      for (let i = 0; i < 26; i++) {
        expect(t1[i]?.componentId).toBe(expectedIds[i]);
      }
    }
  });
});