/**
 * @file index.ts
 * @description Public API boundary for @gearcube/kinematics.
 */

export type {
  ComponentId,
  ComponentTransform,
  KinematicPlan,
  KinematicPlanner,
} from './types.js';

export { placementToTransforms } from './projection.js';
export { planKinematics } from './planner.js';