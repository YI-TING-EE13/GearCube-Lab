/**
 * @file animation.ts
 * @description Pure animation session state, cubic easing, and lifecycle transition functions with injected timestamps.
 */

import {
  type Face,
  type Direction,
  type Move,
  type GearCubeState,
  type SpatialFrame,
  SOLVED_GEAR_CUBE_STATE,
  DEFAULT_SPATIAL_FRAME,
  materializeState,
  applyMove,
  nextSpatialFrame,
} from '@gearcube/core';
import {
  type ComponentTransform,
  type KinematicPlan,
  placementToTransforms,
  planKinematics,
} from '@gearcube/kinematics';

/** Default duration for a single 180-degree layer turn in milliseconds */
export const MOVE_DURATION_MS = 400;

/**
 * Standard cubic ease-in-out monotonic function: [0, 1] -> [0, 1].
 * Satisfies zero velocity at endpoints (t = 0, t = 1) with continuous C1 derivative.
 */
export function easeInOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/**
 * Encapsulates the active kinematics plan and pre-derived target endpoint during an animation.
 */
export interface AnimationSession {
  readonly move: Move;
  readonly plan: KinematicPlan;
  readonly nextState: GearCubeState;
  readonly nextFrame: SpatialFrame;
  readonly startTimeMs: number;
  readonly durationMs: number;
}

/**
 * Immutable state container for the interactive 3D Gear Cube session.
 */
export interface GearCubeSessionState {
  readonly currentState: GearCubeState;
  readonly currentFrame: SpatialFrame;
  readonly activeAnimation: AnimationSession | null;
  readonly displayTransforms: readonly ComponentTransform[];
}

/**
 * Creates the initial solved session state with default spatial frame and fresh static transforms.
 */
export function createInitialSessionState(): GearCubeSessionState {
  const currentState = SOLVED_GEAR_CUBE_STATE;
  const currentFrame = DEFAULT_SPATIAL_FRAME;
  const view = materializeState(currentState, currentFrame);
  const displayTransforms = placementToTransforms(view);

  return {
    currentState,
    currentFrame,
    activeAnimation: null,
    displayTransforms,
  };
}

/**
 * Initiates a new move transition if the session is currently idle.
 * If an animation is already active, returns the existing session unmodified (INPUT_DURING_ANIMATION_POLICY: IGNORED).
 */
export function startMove(
  session: GearCubeSessionState,
  move: Move,
  nowMs: number,
  durationMs: number = MOVE_DURATION_MS
): GearCubeSessionState {
  if (session.activeAnimation !== null) {
    return session;
  }

  const fromView = materializeState(session.currentState, session.currentFrame);
  const nextState = applyMove(session.currentState, move);
  const nextFrame = nextSpatialFrame(session.currentFrame, move.face);
  const toView = materializeState(nextState, nextFrame);
  const plan = planKinematics(fromView, move, toView);

  const activeAnimation: AnimationSession = {
    move,
    plan,
    nextState,
    nextFrame,
    startTimeMs: nowMs,
    durationMs: Math.max(1, durationMs),
  };

  return {
    currentState: session.currentState,
    currentFrame: session.currentFrame,
    activeAnimation,
    displayTransforms: session.displayTransforms,
  };
}

/**
 * Advances the animation session according to the current timestamp.
 * Evaluates the active kinematic trajectory at eased progress while active.
 * Atomically commits logical state and fresh endpoint projection upon completion (p >= 1.0).
 */
export function stepAnimation(
  session: GearCubeSessionState,
  nowMs: number
): GearCubeSessionState {
  if (session.activeAnimation === null) {
    return session;
  }

  const { plan, nextState, nextFrame, startTimeMs, durationMs } = session.activeAnimation;
  const elapsed = Math.max(0, nowMs - startTimeMs);
  const rawProgress = Math.min(1.0, elapsed / durationMs);

  if (rawProgress >= 1.0) {
    // Completion sequence:
    // 1. Commit nextState
    // 2. Commit nextFrame
    // 3. Clear active animation session
    // 4. Materialize fresh endpoint projection from committed logical state (anti-drift authority)
    const finalView = materializeState(nextState, nextFrame);
    const finalTransforms = placementToTransforms(finalView);

    return {
      currentState: nextState,
      currentFrame: nextFrame,
      activeAnimation: null,
      displayTransforms: finalTransforms,
    };
  }

  const easedProgress = easeInOutCubic(rawProgress);
  const displayTransforms = plan.evaluate(easedProgress);

  return {
    currentState: session.currentState,
    currentFrame: session.currentFrame,
    activeAnimation: session.activeAnimation,
    displayTransforms,
  };
}
