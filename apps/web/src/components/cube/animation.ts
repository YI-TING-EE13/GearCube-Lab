/**
 * @file animation.ts
 * @description Pure animation session state, cubic easing, physical two-step turn staging lifecycle, and transition functions with injected timestamps.
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

/** Duration of a single 90-degree physical user input step in milliseconds */
export const PHYSICAL_STEP_DURATION_MS = 200;

/** Full canonical 180-degree move duration in milliseconds (sum of two 90-degree steps) */
export const FULL_CANONICAL_MOVE_DURATION_MS = 400;

/** Backward-compatible alias for canonical full move duration */
export const MOVE_DURATION_MS = FULL_CANONICAL_MOVE_DURATION_MS;

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
 * Lifecycle states for physical two-step turn staging.
 */
export type StagingPhase =
  | 'IDLE'
  | 'FIRST_HALF_ANIMATING'
  | 'HALF_TURN_LOCKED'
  | 'SECOND_HALF_ANIMATING'
  | 'CANCEL_HALF_ANIMATING';

/**
 * Encapsulates the active staged canonical move, single kinematics plan, and segment timing.
 */
export interface StagedMoveSession {
  readonly move: Move;
  readonly plan: KinematicPlan;
  readonly nextState: GearCubeState;
  readonly nextFrame: SpatialFrame;
  readonly phase: StagingPhase;
  readonly segmentStartTimeMs: number;
  readonly segmentDurationMs: number;
}

/**
 * Immutable state container for the interactive 3D Gear Cube session.
 */
export interface GearCubeSessionState {
  readonly currentState: GearCubeState;
  readonly currentFrame: SpatialFrame;
  readonly stagedMove: StagedMoveSession | null;
  readonly displayTransforms: readonly ComponentTransform[];
}

/**
 * Returns true if an animation segment is actively transitioning (first half, second half, or cancel).
 */
export function isSessionAnimating(session: GearCubeSessionState): boolean {
  if (session.stagedMove === null) return false;
  const phase = session.stagedMove.phase;
  return (
    phase === 'FIRST_HALF_ANIMATING' ||
    phase === 'SECOND_HALF_ANIMATING' ||
    phase === 'CANCEL_HALF_ANIMATING'
  );
}

/**
 * Returns true if the session is holding at the physical half-turn lock midpoint (p = 0.5).
 */
export function isSessionHalfTurnLocked(session: GearCubeSessionState): boolean {
  return session.stagedMove?.phase === 'HALF_TURN_LOCKED';
}

/**
 * Returns the current staging phase of the session.
 */
export function getStagingPhase(session: GearCubeSessionState): StagingPhase {
  return session.stagedMove?.phase ?? 'IDLE';
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
    stagedMove: null,
    displayTransforms,
  };
}

/**
 * Initiates or advances a physical move transition according to the staging state machine.
 *
 * - From IDLE: Starts FIRST_HALF_ANIMATING (p: 0.0 -> 0.5).
 * - From HALF_TURN_LOCKED:
 *   - Same face + same direction: Starts SECOND_HALF_ANIMATING (p: 0.5 -> 1.0).
 *   - Same face + opposite direction: Starts CANCEL_HALF_ANIMATING (p: 0.5 -> 0.0).
 *   - Other faces: Blocked (returns unchanged session).
 * - During active animation (FIRST/SECOND/CANCEL): Inputs ignored.
 */
export function startMove(
  session: GearCubeSessionState,
  move: Move,
  nowMs: number,
  stepDurationMs: number = PHYSICAL_STEP_DURATION_MS
): GearCubeSessionState {
  const duration = Math.max(1, stepDurationMs);

  // Case 1: Session is idle -> Start first half physical step (p: 0.0 -> 0.5)
  if (session.stagedMove === null || session.stagedMove.phase === 'IDLE') {
    const fromView = materializeState(session.currentState, session.currentFrame);
    const nextState = applyMove(session.currentState, move);
    const nextFrame = nextSpatialFrame(session.currentFrame, move.face);
    const toView = materializeState(nextState, nextFrame);
    const plan = planKinematics(fromView, move, toView);

    const stagedMove: StagedMoveSession = {
      move,
      plan,
      nextState,
      nextFrame,
      phase: 'FIRST_HALF_ANIMATING',
      segmentStartTimeMs: nowMs,
      segmentDurationMs: duration,
    };

    return {
      currentState: session.currentState,
      currentFrame: session.currentFrame,
      stagedMove,
      displayTransforms: session.displayTransforms,
    };
  }

  // Case 2: Session is holding at half-turn lock (p = 0.5)
  if (session.stagedMove.phase === 'HALF_TURN_LOCKED') {
    // Only inputs on the active staged face are allowed
    if (move.face !== session.stagedMove.move.face) {
      return session; // OTHER_FACE_INPUT: BLOCKED
    }

    if (move.direction === session.stagedMove.move.direction) {
      // SAME_FACE_SAME_DIRECTION: Continue to full canonical endpoint (p: 0.5 -> 1.0)
      const stagedMove: StagedMoveSession = {
        ...session.stagedMove,
        phase: 'SECOND_HALF_ANIMATING',
        segmentStartTimeMs: nowMs,
        segmentDurationMs: duration,
      };
      return {
        ...session,
        stagedMove,
      };
    } else {
      // SAME_FACE_OPPOSITE_DIRECTION: Cancel back to original origin (p: 0.5 -> 0.0)
      const stagedMove: StagedMoveSession = {
        ...session.stagedMove,
        phase: 'CANCEL_HALF_ANIMATING',
        segmentStartTimeMs: nowMs,
        segmentDurationMs: duration,
      };
      return {
        ...session,
        stagedMove,
      };
    }
  }

  // Case 3: Animation is actively transitioning -> Ignore input
  return session;
}

/**
 * Advances the physical animation session according to the current timestamp.
 * Evaluates the active kinematic trajectory across local segment progress ranges.
 *
 * - FIRST_HALF_ANIMATING completion: Enters HALF_TURN_LOCKED at p = 0.5 (no logical commit).
 * - SECOND_HALF_ANIMATING completion: Commits nextState/nextFrame and snaps fresh endpoint projection.
 * - CANCEL_HALF_ANIMATING completion: Retains original state/frame and snaps fresh original projection.
 */
export function stepAnimation(
  session: GearCubeSessionState,
  nowMs: number
): GearCubeSessionState {
  if (session.stagedMove === null || session.stagedMove.phase === 'HALF_TURN_LOCKED') {
    return session;
  }

  const { plan, nextState, nextFrame, phase, segmentStartTimeMs, segmentDurationMs } =
    session.stagedMove;
  const elapsed = Math.max(0, nowMs - segmentStartTimeMs);
  const rawSegmentP = Math.min(1.0, elapsed / segmentDurationMs);
  const easedSegmentP = easeInOutCubic(rawSegmentP);

  if (phase === 'FIRST_HALF_ANIMATING') {
    if (rawSegmentP >= 1.0) {
      // Midpoint completion -> enter HALF_TURN_LOCKED
      const midpointTransforms = plan.evaluate(0.5);
      const stagedMove: StagedMoveSession = {
        ...session.stagedMove,
        phase: 'HALF_TURN_LOCKED',
        segmentStartTimeMs: nowMs,
      };
      return {
        currentState: session.currentState,
        currentFrame: session.currentFrame,
        stagedMove,
        displayTransforms: midpointTransforms,
      };
    }

    const canonicalP = 0.5 * easedSegmentP;
    const displayTransforms = plan.evaluate(canonicalP);
    return {
      ...session,
      displayTransforms,
    };
  }

  if (phase === 'SECOND_HALF_ANIMATING') {
    if (rawSegmentP >= 1.0) {
      // Full turn completion sequence:
      // 1. Commit nextState
      // 2. Commit nextFrame
      // 3. Clear staged move session
      // 4. Materialize fresh endpoint projection from committed logical state
      const finalView = materializeState(nextState, nextFrame);
      const finalTransforms = placementToTransforms(finalView);
      return {
        currentState: nextState,
        currentFrame: nextFrame,
        stagedMove: null,
        displayTransforms: finalTransforms,
      };
    }

    const canonicalP = 0.5 + 0.5 * easedSegmentP;
    const displayTransforms = plan.evaluate(canonicalP);
    return {
      ...session,
      displayTransforms,
    };
  }

  if (phase === 'CANCEL_HALF_ANIMATING') {
    if (rawSegmentP >= 1.0) {
      // Cancel completion sequence:
      // 1. Retain original currentState and currentFrame unchanged
      // 2. Clear staged move session
      // 3. Materialize fresh original projection
      const finalView = materializeState(session.currentState, session.currentFrame);
      const finalTransforms = placementToTransforms(finalView);
      return {
        currentState: session.currentState,
        currentFrame: session.currentFrame,
        stagedMove: null,
        displayTransforms: finalTransforms,
      };
    }

    const canonicalP = 0.5 * (1.0 - easedSegmentP);
    const displayTransforms = plan.evaluate(canonicalP);
    return {
      ...session,
      displayTransforms,
    };
  }

  return session;
}
