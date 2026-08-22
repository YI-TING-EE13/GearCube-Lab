/**
 * @file planner.ts
 * @description View-based kinematic animation planner implementation.
 */

import type { Move, Face, PiecePlacementView } from '@gearcube/core';
import type { ComponentTransform, KinematicPlan } from './types.js';
import {
  placementToTransforms,
  quatFromAxisAngle,
  multiplyQuat,
  rotateVector,
  normalizeVec3,
  type Vec3,
  type Quat4,
} from './projection.js';

/** Outward unit normal vectors for all 6 puzzle faces */
const FACE_NORMALS: Readonly<Record<Face, Vec3>> = {
  U: [0, 1, 0],
  D: [0, -1, 0],
  F: [0, 0, 1],
  B: [0, 0, -1],
  R: [1, 0, 0],
  L: [-1, 0, 0],
};

/**
 * Returns the gear spin coefficient (+1 or -1) for continuous local radial spin.
 * +1 corresponds to +60° * p, -1 corresponds to -60° * p.
 */
function getGearSpinSign(move: Move): number {
  const isCCW = move.direction === 'CCW';
  switch (move.face) {
    case 'U':
    case 'F':
    case 'R':
      return isCCW ? -1 : 1;
    case 'D':
    case 'B':
    case 'L':
      return isCCW ? 1 : -1;
  }
}

/** Numerical tolerance for moving layer dot products and endpoint validation */
const DOT_EPSILON = 1e-4;
const ENDPOINT_EPSILON = 1e-4;

/** Internal classified component descriptor for kinematic trajectory computation */
interface ClassifiedComponent {
  readonly componentId: ComponentTransform['componentId'];
  readonly motionType: 'ACTIVE_OUTER' | 'MIDDLE_CENTER' | 'MIDDLE_EDGE' | 'OPPOSITE_FIXED';
  readonly initialPosition: Vec3;
  readonly initialQuaternion: Quat4;
  readonly initialRadialAxis: Vec3;
}

/**
 * Checks if two quaternions represent the same SO(3) orientation (modulo q == -q).
 */
function areQuatsEqualModSign(q1: Quat4, q2: Quat4): boolean {
  const dPos = Math.hypot(q1[0] - q2[0], q1[1] - q2[1], q1[2] - q2[2], q1[3] - q2[3]);
  const dNeg = Math.hypot(q1[0] + q2[0], q1[1] + q2[1], q1[2] + q2[2], q1[3] + q2[3]);
  return Math.min(dPos, dNeg) < ENDPOINT_EPSILON;
}

/**
 * Checks if two edge quaternions are equivalent under the intentional C2 (180° radial) axial quotient.
 */
function areEdgeQuatsEqualModC2(q1: Quat4, q2: Quat4, radialAxis: Vec3): boolean {
  if (areQuatsEqualModSign(q1, q2)) {
    return true;
  }
  const q180 = quatFromAxisAngle(radialAxis, Math.PI);
  const qRot = multiplyQuat(q180, q2);
  return areQuatsEqualModSign(q1, qRot);
}

/**
 * Plans a continuous kinematic trajectory for a legal physical move.
 * Operates purely on initial and final PiecePlacementViews.
 * Validates toView endpoint compatibility as an authoritative witness.
 */
export function planKinematics(
  fromView: PiecePlacementView,
  move: Move,
  toView: PiecePlacementView
): KinematicPlan {
  const normal = FACE_NORMALS[move.face];
  const isCCW = move.direction === 'CCW';

  // Base rotation angles per unit progress (p = 1.0)
  // Outer layer: -180° for CW, +180° for CCW
  const outerAngleFullRad = isCCW ? Math.PI : -Math.PI;

  // Middle layer: -90° for CW, +90° for CCW
  const middleAngleFullRad = isCCW ? Math.PI * 0.5 : -Math.PI * 0.5;

  // Edge gear axial spin: +60° or -60°
  const gearSpinSign = getGearSpinSign(move);
  const gearSpinAngleFullRad = (gearSpinSign * 60 * Math.PI) / 180;

  // Obtain initial transforms and target transforms in stable ComponentId order
  const initialTransforms = placementToTransforms(fromView);
  const targetTransforms = placementToTransforms(toView);

  // Partition pieces into 9 active outer, 8 coupled middle (4 edges + 4 centers), 9 opposite fixed
  const components: readonly ClassifiedComponent[] = initialTransforms.map((t) => {
    const pos = t.position;
    const dot = pos[0] * normal[0] + pos[1] * normal[1] + pos[2] * normal[2];
    const isEdge = t.componentId.startsWith('edge-');
    const isCenter = t.componentId.startsWith('center-');

    let motionType: ClassifiedComponent['motionType'];
    if (Math.abs(dot - 1.0) < DOT_EPSILON) {
      motionType = 'ACTIVE_OUTER';
    } else if (Math.abs(dot + 1.0) < DOT_EPSILON) {
      motionType = 'OPPOSITE_FIXED';
    } else if (Math.abs(dot) < DOT_EPSILON) {
      if (isEdge) {
        motionType = 'MIDDLE_EDGE';
      } else if (isCenter) {
        motionType = 'MIDDLE_CENTER';
      } else {
        throw new Error(`Unexpected piece in middle layer: ${t.componentId}`);
      }
    } else {
      throw new Error(`Invalid piece position ${pos} for move face normal ${normal}`);
    }

    const radialAxis = isEdge ? normalizeVec3(pos) : ([0, 0, 0] as const);

    return {
      componentId: t.componentId,
      motionType,
      initialPosition: pos,
      initialQuaternion: t.rotationQuaternion,
      initialRadialAxis: radialAxis,
    };
  });

  // Full-motion rotation quaternions at p = 1.0
  const qOuter1 = quatFromAxisAngle(normal, outerAngleFullRad);
  const qMiddle1 = quatFromAxisAngle(normal, middleAngleFullRad);

  // Validate toView endpoint consistency at plan construction time
  for (let i = 0; i < components.length; i++) {
    const c = components[i]!;
    const target = targetTransforms[i]!;

    let derivedPos: Vec3;
    let derivedRot: Quat4;

    switch (c.motionType) {
      case 'ACTIVE_OUTER': {
        derivedPos = rotateVector(qOuter1, c.initialPosition);
        derivedRot = multiplyQuat(qOuter1, c.initialQuaternion);
        break;
      }
      case 'MIDDLE_CENTER': {
        derivedPos = rotateVector(qMiddle1, c.initialPosition);
        derivedRot = multiplyQuat(qMiddle1, c.initialQuaternion);
        break;
      }
      case 'MIDDLE_EDGE': {
        derivedPos = rotateVector(qMiddle1, c.initialPosition);
        const currentRadialAxis = rotateVector(qMiddle1, c.initialRadialAxis);
        const qSpin = quatFromAxisAngle(currentRadialAxis, gearSpinAngleFullRad);
        derivedRot = multiplyQuat(qSpin, multiplyQuat(qMiddle1, c.initialQuaternion));
        break;
      }
      case 'OPPOSITE_FIXED': {
        derivedPos = c.initialPosition;
        derivedRot = c.initialQuaternion;
        break;
      }
    }

    // Position match
    const posDiff = Math.hypot(
      derivedPos[0] - target.position[0],
      derivedPos[1] - target.position[1],
      derivedPos[2] - target.position[2]
    );
    if (posDiff > ENDPOINT_EPSILON) {
      throw new Error(
        `Inconsistent toView endpoint: component ${c.componentId} position mismatch for move ${move.face} ${move.direction}`
      );
    }

    // Orientation match under category-specific quotient
    if (c.componentId.startsWith('corner-')) {
      if (!areQuatsEqualModSign(derivedRot, target.rotationQuaternion)) {
        throw new Error(
          `Inconsistent toView endpoint: corner ${c.componentId} orientation mismatch for move ${move.face} ${move.direction}`
        );
      }
    } else if (c.componentId.startsWith('edge-')) {
      const radialAxis: Vec3 = [target.position[0], target.position[1], target.position[2]];
      if (!areEdgeQuatsEqualModC2(derivedRot, target.rotationQuaternion, radialAxis)) {
        throw new Error(
          `Inconsistent toView endpoint: edge ${c.componentId} orientation mismatch for move ${move.face} ${move.direction}`
        );
      }
    } else if (c.componentId.startsWith('center-')) {
      const mappedN = rotateVector(derivedRot, [0, 1, 0]);
      const normDiff = Math.hypot(
        mappedN[0] - target.position[0],
        mappedN[1] - target.position[1],
        mappedN[2] - target.position[2]
      );
      if (normDiff > ENDPOINT_EPSILON) {
        throw new Error(
          `Inconsistent toView endpoint: center ${c.componentId} outward normal mismatch for move ${move.face} ${move.direction}`
        );
      }
    }
  }

  return {
    move,
    evaluate(progress: number): readonly ComponentTransform[] {
      if (
        typeof progress !== 'number' ||
        !Number.isFinite(progress) ||
        progress < 0.0 ||
        progress > 1.0
      ) {
        throw new RangeError(
          `KinematicPlan.evaluate: progress must be a finite number in [0, 1], received ${progress}`
        );
      }

      // Compute incremental angles at progress p
      const thetaOuter = outerAngleFullRad * progress;
      const thetaMiddle = middleAngleFullRad * progress;
      const thetaGear = gearSpinAngleFullRad * progress;

      // Outer and middle rotation quaternions
      const qOuter = quatFromAxisAngle(normal, thetaOuter);
      const qMiddle = quatFromAxisAngle(normal, thetaMiddle);

      return components.map((c) => {
        switch (c.motionType) {
          case 'ACTIVE_OUTER': {
            const pos = rotateVector(qOuter, c.initialPosition);
            const rot = multiplyQuat(qOuter, c.initialQuaternion);
            return {
              componentId: c.componentId,
              position: pos,
              rotationQuaternion: rot,
            };
          }
          case 'MIDDLE_CENTER': {
            const pos = rotateVector(qMiddle, c.initialPosition);
            const rot = multiplyQuat(qMiddle, c.initialQuaternion);
            return {
              componentId: c.componentId,
              position: pos,
              rotationQuaternion: rot,
            };
          }
          case 'MIDDLE_EDGE': {
            const pos = rotateVector(qMiddle, c.initialPosition);
            const currentRadialAxis = rotateVector(qMiddle, c.initialRadialAxis);
            const qSpin = quatFromAxisAngle(currentRadialAxis, thetaGear);
            const rot = multiplyQuat(qSpin, multiplyQuat(qMiddle, c.initialQuaternion));
            return {
              componentId: c.componentId,
              position: pos,
              rotationQuaternion: rot,
            };
          }
          case 'OPPOSITE_FIXED': {
            return {
              componentId: c.componentId,
              position: c.initialPosition,
              rotationQuaternion: c.initialQuaternion,
            };
          }
        }
      });
    },
  };
}