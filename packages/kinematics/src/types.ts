/**
 * @file types.ts
 * @description Public type definitions for @gearcube/kinematics.
 */

import type {
  Move,
  CornerPieceId,
  EdgePieceId,
  CenterPieceId,
  PiecePlacementView,
} from '@gearcube/core';

/**
 * Stable physical component identifier derived from Core piece identity vocabularies.
 */
export type ComponentId =
  | CornerPieceId
  | EdgePieceId
  | CenterPieceId;

/**
 * Continuous 3D spatial transformation for a physical component.
 * Quaternion is the sole orientation authority ([x, y, z, w]).
 */
export interface ComponentTransform {
  readonly componentId: ComponentId;
  readonly position: readonly [number, number, number];
  readonly rotationQuaternion: readonly [number, number, number, number];
}

/**
 * Continuous kinematic trajectory representation for a physical move.
 * Pure mathematical evaluation as a function of normalized progress p in [0, 1].
 */
export interface KinematicPlan {
  readonly move: Move;

  /**
   * Computes component transforms at normalized mechanical progress p in [0, 1].
   * @throws {RangeError} if progress < 0, progress > 1, or progress is not a finite number.
   */
  evaluate(
    progress: number
  ): readonly ComponentTransform[];
}

/**
 * Downstream view-based kinematic trajectory generator function contract.
 */
export type KinematicPlanner = (
  fromView: PiecePlacementView,
  move: Move,
  toView: PiecePlacementView
) => KinematicPlan;