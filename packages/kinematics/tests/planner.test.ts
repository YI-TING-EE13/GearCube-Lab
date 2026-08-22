/**
 * @file planner.test.ts
 * @description Comprehensive unit tests and physical transition verification for KinematicPlanner.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_MOVES,
  SOLVED_GEAR_CUBE_STATE,
  applyMove,
  materializeState,
  nextSpatialFrame,
  serializeLogicalState,
  DEFAULT_SPATIAL_FRAME,
  SPATIAL_FRAMES,
  CORNER_PIECE_IDS,
  EDGE_PIECE_IDS,
  CENTER_PIECE_IDS,
  type Move,
  type Face,
  type CornerSlot,
  type EdgeSlot,
  type CenterSlot,
  type GearCubeState,
  type PiecePlacementView,
} from '@gearcube/core';
import { planKinematics, placementToTransforms } from '../src/index.js';

// ============================================================================
// TEST-LOCAL VECTOR & QUATERNION ORACLE MATH
// ============================================================================

type TestVec3 = readonly [number, number, number];
type TestQuat4 = readonly [number, number, number, number];

const EPSILON = 1e-4;

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

// Test-local slot coordinate dictionaries (Independent of production)
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

// Test-local face normals
const TEST_FACE_NORMALS: Record<Face, TestVec3> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

// Test-local committed motion sign rules
const TEST_COMMITTED_MOTION_SIGNS: Record<
  string,
  { outerSign: number; middleSign: number; spinSign: number }
> = {
  'U CW': { outerSign: -1, middleSign: -1, spinSign: 1 },
  'U CCW': { outerSign: 1, middleSign: 1, spinSign: -1 },
  'D CW': { outerSign: -1, middleSign: -1, spinSign: -1 },
  'D CCW': { outerSign: 1, middleSign: 1, spinSign: 1 },
  'F CW': { outerSign: -1, middleSign: -1, spinSign: 1 },
  'F CCW': { outerSign: 1, middleSign: 1, spinSign: -1 },
  'B CW': { outerSign: -1, middleSign: -1, spinSign: -1 },
  'B CCW': { outerSign: 1, middleSign: 1, spinSign: 1 },
  'R CW': { outerSign: -1, middleSign: -1, spinSign: 1 },
  'R CCW': { outerSign: 1, middleSign: 1, spinSign: -1 },
  'L CW': { outerSign: -1, middleSign: -1, spinSign: -1 },
  'L CCW': { outerSign: 1, middleSign: 1, spinSign: 1 },
};

describe('Kinematic Animation Planner & Transition Invariants', () => {
  // Frozen 10 reproducible move sequences
  const SCRAMBLES: readonly (readonly Move[])[] = [
    [{ face: 'U', direction: 'CW' }], // S1
    [{ face: 'U', direction: 'CCW' }], // S2
    [{ face: 'R', direction: 'CW' }, { face: 'U', direction: 'CW' }], // S3
    [{ face: 'F', direction: 'CW' }, { face: 'R', direction: 'CCW' }], // S4
    [{ face: 'U', direction: 'CW' }, { face: 'R', direction: 'CW' }, { face: 'F', direction: 'CW' }], // S5
    [
      { face: 'D', direction: 'CW' },
      { face: 'L', direction: 'CW' },
      { face: 'B', direction: 'CW' },
      { face: 'U', direction: 'CW' },
    ], // S6
    [
      { face: 'R', direction: 'CW' },
      { face: 'F', direction: 'CW' },
      { face: 'U', direction: 'CW' },
      { face: 'L', direction: 'CW' },
      { face: 'D', direction: 'CW' },
    ], // S7
    [
      { face: 'F', direction: 'CW' },
      { face: 'B', direction: 'CCW' },
      { face: 'R', direction: 'CW' },
      { face: 'L', direction: 'CCW' },
      { face: 'U', direction: 'CW' },
      { face: 'D', direction: 'CCW' },
    ], // S8
    [
      { face: 'U', direction: 'CW' },
      { face: 'U', direction: 'CW' },
      { face: 'R', direction: 'CW' },
      { face: 'R', direction: 'CW' },
    ], // S9
    [
      { face: 'R', direction: 'CW' },
      { face: 'U', direction: 'CW' },
      { face: 'R', direction: 'CW' },
      { face: 'U', direction: 'CCW' },
      { face: 'R', direction: 'CW' },
      { face: 'U', direction: 'CW' },
    ], // S10
  ];

  it('SCRAMBLE_CORE_UNIQUENESS_GATE: 10 / 10 distinct canonical states verified', () => {
    const serializedStates = new Set<string>();

    for (const seq of SCRAMBLES) {
      let state = SOLVED_GEAR_CUBE_STATE;
      for (const m of seq) {
        state = applyMove(state, m);
      }
      const serialized = serializeLogicalState(state);
      expect(serializedStates.has(serialized)).toBe(false);
      serializedStates.add(serialized);
    }

    expect(serializedStates.size).toBe(10);
  });

  it('MOVING_SET_GATE: 12 / 12 moves partition into exact 9 active outer, 8 middle, 9 opposite via test-local slot oracle', () => {
    const fromView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);

    for (const move of ALL_MOVES) {
      const normal = TEST_FACE_NORMALS[move.face];

      // Derive expected classification purely from fromView placement slots and TEST-LOCAL slot tables
      let activeOuterCount = 0;
      let coupledMiddleCount = 0;
      let oppositeFixedCount = 0;

      // 1. Corners (8)
      for (const c of fromView.corners) {
        const pos = TEST_CORNER_SLOTS[c.slot];
        const dot = pos[0] * normal[0] + pos[1] * normal[1] + pos[2] * normal[2];
        if (Math.abs(dot - 1.0) < 0.1) activeOuterCount++;
        else if (Math.abs(dot + 1.0) < 0.1) oppositeFixedCount++;
        else if (Math.abs(dot) < 0.1) coupledMiddleCount++;
      }

      // 2. Edges (12)
      for (const e of fromView.edges) {
        const pos = TEST_EDGE_SLOTS[e.slot];
        const dot = pos[0] * normal[0] + pos[1] * normal[1] + pos[2] * normal[2];
        if (Math.abs(dot - 1.0) < 0.1) activeOuterCount++;
        else if (Math.abs(dot + 1.0) < 0.1) oppositeFixedCount++;
        else if (Math.abs(dot) < 0.1) coupledMiddleCount++;
      }

      // 3. Centers (6)
      for (const c of fromView.centers) {
        const pos = TEST_CENTER_SLOTS[c.slot];
        const dot = pos[0] * normal[0] + pos[1] * normal[1] + pos[2] * normal[2];
        if (Math.abs(dot - 1.0) < 0.1) activeOuterCount++;
        else if (Math.abs(dot + 1.0) < 0.1) oppositeFixedCount++;
        else if (Math.abs(dot) < 0.1) coupledMiddleCount++;
      }

      expect(activeOuterCount).toBe(9);
      expect(coupledMiddleCount).toBe(8);
      expect(oppositeFixedCount).toBe(9);
    }
  });

  it('DIRECTED_MOVE_TRAJECTORY_SIGN_GATE: 12 / 12 moves verified at p = 0.5 against committed sign table', () => {
    for (const move of ALL_MOVES) {
      const key = `${move.face} ${move.direction}`;
      const signs = TEST_COMMITTED_MOTION_SIGNS[key]!;
      expect(signs).toBeDefined();

      const fromView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
      const nextState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
      const toView = materializeState(nextState, nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face));

      const plan = planKinematics(fromView, move, toView);
      const midTransforms = plan.evaluate(0.5);

      const normal = TEST_FACE_NORMALS[move.face];
      const initialTransforms = placementToTransforms(fromView);

      for (let i = 0; i < initialTransforms.length; i++) {
        const init = initialTransforms[i]!;
        const mid = midTransforms[i]!;
        const dot = init.position[0] * normal[0] + init.position[1] * normal[1] + init.position[2] * normal[2];

        if (Math.abs(dot - 1.0) < 0.1) {
          // Active outer: expected rotation is outerSign * 90°
          const qExpected = testQuatFromAxisAngle(normal, signs.outerSign * (Math.PI * 0.5));
          const expectedRot = testQuatMultiply(qExpected, init.rotationQuaternion);
          const expectedPos = testRotateVector(qExpected, init.position);

          expect(mid.position[0]).toBeCloseTo(expectedPos[0], 3);
          expect(mid.position[1]).toBeCloseTo(expectedPos[1], 3);
          expect(mid.position[2]).toBeCloseTo(expectedPos[2], 3);
          expect(testQuatEqualModSign(mid.rotationQuaternion, expectedRot)).toBe(true);
        } else if (Math.abs(dot) < 0.1) {
          // Coupled middle
          const qMidExpected = testQuatFromAxisAngle(normal, signs.middleSign * (Math.PI * 0.25));
          const expectedPos = testRotateVector(qMidExpected, init.position);

          expect(mid.position[0]).toBeCloseTo(expectedPos[0], 3);
          expect(mid.position[1]).toBeCloseTo(expectedPos[1], 3);
          expect(mid.position[2]).toBeCloseTo(expectedPos[2], 3);

          if (init.componentId.startsWith('center-')) {
            const expectedRot = testQuatMultiply(qMidExpected, init.rotationQuaternion);
            expect(testQuatEqualModSign(mid.rotationQuaternion, expectedRot)).toBe(true);
          } else if (init.componentId.startsWith('edge-')) {
            const currentRadialAxis = testNormalizeVec3(expectedPos);
            const qSpin = testQuatFromAxisAngle(currentRadialAxis, signs.spinSign * (Math.PI / 6));
            const expectedRot = testQuatMultiply(qSpin, testQuatMultiply(qMidExpected, init.rotationQuaternion));
            expect(testQuatEqualModSign(mid.rotationQuaternion, expectedRot)).toBe(true);
          }
        } else if (Math.abs(dot + 1.0) < 0.1) {
          // Opposite fixed
          expect(mid.position[0]).toBeCloseTo(init.position[0], 4);
          expect(mid.position[1]).toBeCloseTo(init.position[1], 4);
          expect(mid.position[2]).toBeCloseTo(init.position[2], 4);
          expect(testQuatEqualModSign(mid.rotationQuaternion, init.rotationQuaternion)).toBe(true);
        }
      }
    }
  });

  it('PLANNER_STABLE_OUTPUT_ORDER_GATE: 12 / 12 moves maintain exact STABLE_COMPONENT_ID_ORDER across progress', () => {
    const fromView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const testProgresses = [0.0, 0.25, 0.5, 0.75, 1.0];
    const expectedIds = [...CORNER_PIECE_IDS, ...EDGE_PIECE_IDS, ...CENTER_PIECE_IDS];

    for (const move of ALL_MOVES) {
      const nextState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
      const toView = materializeState(nextState, nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face));

      const plan = planKinematics(fromView, move, toView);

      for (const p of testProgresses) {
        const transforms = plan.evaluate(p);
        expect(transforms).toHaveLength(26);
        for (let i = 0; i < 26; i++) {
          expect(transforms[i]?.componentId).toBe(expectedIds[i]);
        }
      }
    }
  });

  it('toView validation rejects inconsistent/corrupted target views at plan construction', () => {
    const fromView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const move: Move = { face: 'U', direction: 'CW' };
    const correctToView = materializeState(
      applyMove(SOLVED_GEAR_CUBE_STATE, move),
      nextSpatialFrame(DEFAULT_SPATIAL_FRAME, 'U')
    );

    // 1. Valid toView succeeds
    expect(() => planKinematics(fromView, move, correctToView)).not.toThrow();

    // 2. Corrupted toView (e.g. fromView passed as toView for non-identity move) fails
    expect(() => planKinematics(fromView, move, fromView)).toThrow(/Inconsistent toView endpoint/);

    // 3. Mismatched move face toView fails
    const wrongMoveToView = materializeState(
      applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'R', direction: 'CW' }),
      nextSpatialFrame(DEFAULT_SPATIAL_FRAME, 'R')
    );
    expect(() => planKinematics(fromView, move, wrongMoveToView)).toThrow(/Inconsistent toView endpoint/);
  });

  it('Progress validation throws RangeError for invalid values', () => {
    const fromView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const move: Move = { face: 'U', direction: 'CW' };
    const nextState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
    const toView = materializeState(nextState, nextSpatialFrame(DEFAULT_SPATIAL_FRAME, 'U'));

    const plan = planKinematics(fromView, move, toView);

    expect(() => plan.evaluate(-0.01)).toThrow(RangeError);
    expect(() => plan.evaluate(1.01)).toThrow(RangeError);
    expect(() => plan.evaluate(Number.NaN)).toThrow(RangeError);
    expect(() => plan.evaluate(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => plan.evaluate(Number.NEGATIVE_INFINITY)).toThrow(RangeError);

    expect(() => plan.evaluate(0.0)).not.toThrow();
    expect(() => plan.evaluate(0.5)).not.toThrow();
    expect(() => plan.evaluate(1.0)).not.toThrow();
  });

  it('PHASE2A_PHYSICAL_TRANSITION_GATE: 528 / 528 transitions pass all endpoint and partition checks', () => {
    const testStates: GearCubeState[] = [SOLVED_GEAR_CUBE_STATE];
    for (const seq of SCRAMBLES) {
      let state = SOLVED_GEAR_CUBE_STATE;
      for (const m of seq) {
        state = applyMove(state, m);
      }
      testStates.push(state);
    }
    expect(testStates).toHaveLength(11);

    let transitionCount = 0;

    for (const state of testStates) {
      for (const frame of SPATIAL_FRAMES) {
        for (const move of ALL_MOVES) {
          const fromView = materializeState(state, frame);
          const nextState = applyMove(state, move);
          const nextFrame = nextSpatialFrame(frame, move.face);
          const toView = materializeState(nextState, nextFrame);

          const plan = planKinematics(fromView, move, toView);

          // 1. Check p = 0.0 matches fromView exactly
          const t0 = plan.evaluate(0.0);
          const expectedT0 = placementToTransforms(fromView);
          expect(t0).toHaveLength(26);

          for (let i = 0; i < 26; i++) {
            expect(t0[i]?.componentId).toBe(expectedT0[i]?.componentId);
            const pos = t0[i]?.position!;
            const expPos = expectedT0[i]?.position!;
            expect(pos[0]).toBeCloseTo(expPos[0], 4);
            expect(pos[1]).toBeCloseTo(expPos[1], 4);
            expect(pos[2]).toBeCloseTo(expPos[2], 4);

            expect(testQuatEqualModSign(t0[i]?.rotationQuaternion!, expectedT0[i]?.rotationQuaternion!)).toBe(true);
          }

          // 2. Check p = 1.0 matches toView endpoint semantics
          const t1 = plan.evaluate(1.0);
          const expectedT1 = placementToTransforms(toView);

          for (let i = 0; i < 26; i++) {
            const id = t1[i]?.componentId!;
            expect(id).toBe(expectedT1[i]?.componentId);

            const pos1 = t1[i]?.position!;
            const expPos1 = expectedT1[i]?.position!;
            expect(pos1[0]).toBeCloseTo(expPos1[0], 4);
            expect(pos1[1]).toBeCloseTo(expPos1[1], 4);
            expect(pos1[2]).toBeCloseTo(expPos1[2], 4);

            const q1 = t1[i]?.rotationQuaternion!;
            const expQ1 = expectedT1[i]?.rotationQuaternion!;

            if (id.startsWith('corner-')) {
              expect(testQuatEqualModSign(q1, expQ1)).toBe(true);
            } else if (id.startsWith('edge-')) {
              const radialAxis = [pos1[0], pos1[1], pos1[2]] as const;
              expect(testQuatEqualModC2(q1, expQ1, radialAxis)).toBe(true);
            } else if (id.startsWith('center-')) {
              const mappedN = testRotateVector(q1, [0, 1, 0]);
              expect(mappedN[0]).toBeCloseTo(expPos1[0], 4);
              expect(mappedN[1]).toBeCloseTo(expPos1[1], 4);
              expect(mappedN[2]).toBeCloseTo(expPos1[2], 4);
            }
          }

          transitionCount++;
        }
      }
    }

    expect(transitionCount).toBe(528);
  });

  it('Purity and immutability: views are untouched and multiple evaluations are identical', () => {
    const fromView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const move: Move = { face: 'R', direction: 'CW' };
    const toView = materializeState(
      applyMove(SOLVED_GEAR_CUBE_STATE, move),
      nextSpatialFrame(DEFAULT_SPATIAL_FRAME, 'R')
    );

    const fromJsonBefore = JSON.stringify(fromView);
    const toJsonBefore = JSON.stringify(toView);

    const plan = planKinematics(fromView, move, toView);

    const e1 = plan.evaluate(0.35);
    const e2 = plan.evaluate(0.35);

    expect(JSON.stringify(e1)).toBe(JSON.stringify(e2));
    expect(JSON.stringify(fromView)).toBe(fromJsonBefore);
    expect(JSON.stringify(toView)).toBe(toJsonBefore);
  });
});