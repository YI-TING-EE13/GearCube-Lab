/**
 * @file animation.ts
 * @description Pure animation session state, cubic easing, physical two-step turn staging lifecycle, direct 180 turn mode, and transition functions with injected timestamps.
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

/** Full canonical 180-degree move duration in milliseconds (sum of two 90-degree steps or direct 180 turn) */
export const FULL_CANONICAL_MOVE_DURATION_MS = 400;

/** Direct 180-degree turn duration in milliseconds */
export const DIRECT_180_DURATION_MS = FULL_CANONICAL_MOVE_DURATION_MS;

/** Backward-compatible alias for canonical full move duration */
export const MOVE_DURATION_MS = FULL_CANONICAL_MOVE_DURATION_MS;

/** Supported user turn interaction modes */
export type TurnInteractionMode = 'TWO_STEP' | 'DIRECT_180';

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
 * Lifecycle states for physical two-step turn staging and direct 180 turns.
 */
export type StagingPhase =
  | 'IDLE'
  | 'FIRST_HALF_ANIMATING'
  | 'HALF_TURN_LOCKED'
  | 'SECOND_HALF_ANIMATING'
  | 'CANCEL_HALF_ANIMATING'
  | 'DIRECT_FULL_ANIMATING';

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
  readonly interactionMode: TurnInteractionMode;
}

/**
 * Returns true if the session is fully idle at a resting canonical endpoint.
 */
export function isSessionIdle(session: GearCubeSessionState): boolean {
  return session.stagedMove === null;
}

/**
 * Returns true if an animation segment is actively transitioning.
 */
export function isSessionAnimating(session: GearCubeSessionState): boolean {
  if (session.stagedMove === null) return false;
  const phase = session.stagedMove.phase;
  return (
    phase === 'FIRST_HALF_ANIMATING' ||
    phase === 'SECOND_HALF_ANIMATING' ||
    phase === 'CANCEL_HALF_ANIMATING' ||
    phase === 'DIRECT_FULL_ANIMATING'
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
 * Pure function to switch turn interaction mode.
 * Mode switching is allowed strictly when the session is fully IDLE.
 * If the session is busy (animating or half-turn locked), returns unchanged session.
 */
export function setTurnInteractionMode(
  session: GearCubeSessionState,
  mode: TurnInteractionMode
): GearCubeSessionState {
  if (!isSessionIdle(session)) {
    return session;
  }
  if (session.interactionMode === mode) {
    return session;
  }
  return {
    ...session,
    interactionMode: mode,
  };
}

/**
 * Creates the initial solved session state with default spatial frame, fresh static transforms, and TWO_STEP default mode.
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
    interactionMode: 'TWO_STEP',
  };
}

/**
 * Initiates or advances a move transition according to the active interaction mode and state machine.
 *
 * - In TWO_STEP mode:
 *   - From IDLE: Starts FIRST_HALF_ANIMATING (p: 0.0 -> 0.5, 200ms).
 *   - From HALF_TURN_LOCKED:
 *     - Same face + same direction: Starts SECOND_HALF_ANIMATING (p: 0.5 -> 1.0, 200ms).
 *     - Same face + opposite direction: Starts CANCEL_HALF_ANIMATING (p: 0.5 -> 0.0, 200ms).
 *     - Other faces: Blocked (returns unchanged session).
 * - In DIRECT_180 mode:
 *   - From IDLE: Starts DIRECT_FULL_ANIMATING (p: 0.0 -> 1.0, 400ms).
 * - During active animation: Inputs ignored.
 */
export function startMove(
  session: GearCubeSessionState,
  move: Move,
  nowMs: number,
  stepDurationMs?: number
): GearCubeSessionState {
  // Case 1: Session is fully idle -> Start new move based on interactionMode
  if (session.stagedMove === null || session.stagedMove.phase === 'IDLE') {
    const fromView = materializeState(session.currentState, session.currentFrame);
    const nextState = applyMove(session.currentState, move);
    const nextFrame = nextSpatialFrame(session.currentFrame, move.face);
    const toView = materializeState(nextState, nextFrame);
    const plan = planKinematics(fromView, move, toView);

    if (session.interactionMode === 'DIRECT_180') {
      const duration = Math.max(1, stepDurationMs ?? DIRECT_180_DURATION_MS);
      const stagedMove: StagedMoveSession = {
        move,
        plan,
        nextState,
        nextFrame,
        phase: 'DIRECT_FULL_ANIMATING',
        segmentStartTimeMs: nowMs,
        segmentDurationMs: duration,
      };

      return {
        currentState: session.currentState,
        currentFrame: session.currentFrame,
        stagedMove,
        displayTransforms: session.displayTransforms,
        interactionMode: session.interactionMode,
      };
    } else {
      const duration = Math.max(1, stepDurationMs ?? PHYSICAL_STEP_DURATION_MS);
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
        interactionMode: session.interactionMode,
      };
    }
  }

  // Case 2: Session is holding at half-turn lock (p = 0.5) in TWO_STEP mode
  if (session.stagedMove.phase === 'HALF_TURN_LOCKED') {
    const duration = Math.max(1, stepDurationMs ?? PHYSICAL_STEP_DURATION_MS);

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
 * Advances the animation session according to the current timestamp.
 * Evaluates the active kinematic trajectory across progress ranges for the active phase.
 *
 * - FIRST_HALF_ANIMATING completion: Enters HALF_TURN_LOCKED at p = 0.5 (no logical commit).
 * - SECOND_HALF_ANIMATING completion: Commits nextState/nextFrame and snaps fresh endpoint projection.
 * - CANCEL_HALF_ANIMATING completion: Retains original state/frame and snaps fresh original projection.
 * - DIRECT_FULL_ANIMATING completion: Commits nextState/nextFrame and snaps fresh endpoint projection.
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
        interactionMode: session.interactionMode,
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
      const finalView = materializeState(nextState, nextFrame);
      const finalTransforms = placementToTransforms(finalView);
      return {
        currentState: nextState,
        currentFrame: nextFrame,
        stagedMove: null,
        displayTransforms: finalTransforms,
        interactionMode: session.interactionMode,
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
      const finalView = materializeState(session.currentState, session.currentFrame);
      const finalTransforms = placementToTransforms(finalView);
      return {
        currentState: session.currentState,
        currentFrame: session.currentFrame,
        stagedMove: null,
        displayTransforms: finalTransforms,
        interactionMode: session.interactionMode,
      };
    }

    const canonicalP = 0.5 * (1.0 - easedSegmentP);
    const displayTransforms = plan.evaluate(canonicalP);
    return {
      ...session,
      displayTransforms,
    };
  }

  if (phase === 'DIRECT_FULL_ANIMATING') {
    if (rawSegmentP >= 1.0) {
      const finalView = materializeState(nextState, nextFrame);
      const finalTransforms = placementToTransforms(finalView);
      return {
        currentState: nextState,
        currentFrame: nextFrame,
        stagedMove: null,
        displayTransforms: finalTransforms,
        interactionMode: session.interactionMode,
      };
    }

    const canonicalP = easedSegmentP;
    const displayTransforms = plan.evaluate(canonicalP);
    return {
      ...session,
      displayTransforms,
    };
  }

  return session;
}
