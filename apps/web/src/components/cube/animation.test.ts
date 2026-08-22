/**
 * @file animation.test.ts
 * @description Pure Node/Vitest automated unit tests for Phase 2D physical two-step turn staging lifecycle, half-turn lock, continuation, cancellation, and 12-move symmetry.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_MOVES,
  SOLVED_GEAR_CUBE_STATE,
  DEFAULT_SPATIAL_FRAME,
  materializeState,
  applyMove,
  nextSpatialFrame,
  equalsGearCubeState,
  type Move,
  type Face,
} from '@gearcube/core';
import { placementToTransforms } from '@gearcube/kinematics';
import {
  PHYSICAL_STEP_DURATION_MS,
  FULL_CANONICAL_MOVE_DURATION_MS,
  easeInOutCubic,
  createInitialSessionState,
  startMove,
  stepAnimation,
  isSessionAnimating,
  isSessionHalfTurnLocked,
  getStagingPhase,
  type GearCubeSessionState,
} from './animation';

describe('Phase 2D — Physical Two-Step Turn Staging Unit Suite (Pure Vitest Node)', () => {
  it('Initial Solved Session Gate: produces 26 solved transforms and starts in IDLE phase', () => {
    const session = createInitialSessionState();

    expect(session.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(session.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);
    expect(session.stagedMove).toBeNull();
    expect(getStagingPhase(session)).toBe('IDLE');
    expect(isSessionAnimating(session)).toBe(false);
    expect(isSessionHalfTurnLocked(session)).toBe(false);
    expect(session.displayTransforms).toHaveLength(26);

    const expectedView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const expectedTransforms = placementToTransforms(expectedView);
    expect(session.displayTransforms).toEqual(expectedTransforms);
  });

  it('Easing Math Gate: easeInOutCubic satisfies boundary, monotonicity, and C1 zero-endpoint velocity', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);

    expect(easeInOutCubic(-0.5)).toBe(0);
    expect(easeInOutCubic(1.5)).toBe(1);

    const samples = 100;
    let prev = 0;
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const val = easeInOutCubic(t);
      expect(val).toBeGreaterThanOrEqual(prev);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
      prev = val;
    }

    const dt = 1e-4;
    const vStart = (easeInOutCubic(dt) - easeInOutCubic(0)) / dt;
    const vEnd = (easeInOutCubic(1) - easeInOutCubic(1 - dt)) / dt;
    expect(vStart).toBeCloseTo(0, 2);
    expect(vEnd).toBeCloseTo(0, 2);
  });

  it('FIRST_HALF_GATE: startMove initiates FIRST_HALF_ANIMATING and reaches exactly p=0.5 with zero logical commit', () => {
    const session = createInitialSessionState();
    const move: Move = { face: 'U', direction: 'CW' };
    const startTime = 1000;

    const started = startMove(session, move, startTime);

    expect(started.stagedMove).not.toBeNull();
    expect(started.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');
    expect(isSessionAnimating(started)).toBe(true);
    expect(isSessionHalfTurnLocked(started)).toBe(false);
    expect(started.stagedMove?.move).toEqual(move);

    // Target state and frame are pre-derived
    const expectedNextState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
    const expectedNextFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face);
    expect(started.stagedMove?.nextState).toEqual(expectedNextState);
    expect(started.stagedMove?.nextFrame).toBe(expectedNextFrame);

    // Logical state is NOT committed
    expect(started.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(started.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);

    // Mid-step evaluation
    const midStep = stepAnimation(started, startTime + 100);
    expect(midStep.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');
    expect(midStep.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);

    // Step to completion of first half (200ms)
    const locked = stepAnimation(started, startTime + PHYSICAL_STEP_DURATION_MS);
    expect(locked.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
    expect(isSessionAnimating(locked)).toBe(false);
    expect(isSessionHalfTurnLocked(locked)).toBe(true);

    // Logical state remains original
    expect(locked.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(locked.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);

    // Display transforms equal exact plan.evaluate(0.5)
    const expectedMidpointTransforms = started.stagedMove!.plan.evaluate(0.5);
    expect(locked.displayTransforms).toEqual(expectedMidpointTransforms);
  });

  it('HALF_TURN_LOCK_GATE: session holds in HALF_TURN_LOCKED indefinitely and stepping time is a no-op', () => {
    const session = createInitialSessionState();
    const move: Move = { face: 'R', direction: 'CW' };
    const startTime = 2000;

    const started = startMove(session, move, startTime);
    const locked = stepAnimation(started, startTime + PHYSICAL_STEP_DURATION_MS);

    expect(isSessionHalfTurnLocked(locked)).toBe(true);

    // Stepping time further while locked does not change phase or transforms
    const steppedLater1 = stepAnimation(locked, startTime + 5000);
    expect(steppedLater1).toBe(locked);

    const steppedLater2 = stepAnimation(locked, startTime + 10000);
    expect(steppedLater2).toBe(locked);
    expect(steppedLater2.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
  });

  it('SAME_DIRECTION_CONTINUE_GATE: same face + same direction starts SECOND_HALF_ANIMATING, finishes at p=1.0, and commits canonical state', () => {
    const session = createInitialSessionState();
    const move: Move = { face: 'F', direction: 'CW' };
    const startTime = 1000;

    const started = startMove(session, move, startTime);
    const locked = stepAnimation(started, startTime + PHYSICAL_STEP_DURATION_MS);

    const secondHalfStartTime = 3000;
    const continuing = startMove(locked, move, secondHalfStartTime);

    expect(continuing.stagedMove?.phase).toBe('SECOND_HALF_ANIMATING');
    expect(isSessionAnimating(continuing)).toBe(true);
    expect(isSessionHalfTurnLocked(continuing)).toBe(false);

    // Advance to full completion (200ms)
    const completed = stepAnimation(continuing, secondHalfStartTime + PHYSICAL_STEP_DURATION_MS);

    expect(completed.stagedMove).toBeNull();
    expect(getStagingPhase(completed)).toBe('IDLE');
    expect(isSessionAnimating(completed)).toBe(false);

    // Logical state and frame committed exactly once
    const expectedNextState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
    const expectedNextFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face);
    expect(completed.currentState).toEqual(expectedNextState);
    expect(completed.currentFrame).toBe(expectedNextFrame);

    // Permanent display transforms derived from fresh endpoint projection
    const expectedFreshView = materializeState(expectedNextState, expectedNextFrame);
    const expectedFreshTransforms = placementToTransforms(expectedFreshView);
    expect(completed.displayTransforms).toEqual(expectedFreshTransforms);
  });

  it('OPPOSITE_DIRECTION_CANCEL_GATE: same face + opposite direction starts CANCEL_HALF_ANIMATING, reverses to p=0.0, and leaves state uncommitted', () => {
    const session = createInitialSessionState();
    const move: Move = { face: 'B', direction: 'CW' };
    const reverseMove: Move = { face: 'B', direction: 'CCW' };
    const startTime = 1000;

    const started = startMove(session, move, startTime);
    const locked = stepAnimation(started, startTime + PHYSICAL_STEP_DURATION_MS);

    const cancelStartTime = 4000;
    const cancelling = startMove(locked, reverseMove, cancelStartTime);

    expect(cancelling.stagedMove?.phase).toBe('CANCEL_HALF_ANIMATING');
    expect(isSessionAnimating(cancelling)).toBe(true);

    // Advance to full cancel completion (200ms)
    const cancelled = stepAnimation(cancelling, cancelStartTime + PHYSICAL_STEP_DURATION_MS);

    expect(cancelled.stagedMove).toBeNull();
    expect(getStagingPhase(cancelled)).toBe('IDLE');
    expect(isSessionAnimating(cancelled)).toBe(false);

    // Logical state and frame remain original solved state
    expect(cancelled.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(cancelled.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);

    // Permanent display transforms derived from fresh original projection
    const expectedFreshView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const expectedFreshTransforms = placementToTransforms(expectedFreshView);
    expect(cancelled.displayTransforms).toEqual(expectedFreshTransforms);
  });

  it('OTHER_FACE_BLOCKED_GATE: all other faces are strictly ignored during HALF_TURN_LOCKED', () => {
    const session = createInitialSessionState();
    const stagedMove: Move = { face: 'U', direction: 'CW' };
    const startTime = 1000;

    const started = startMove(session, stagedMove, startTime);
    const locked = stepAnimation(started, startTime + PHYSICAL_STEP_DURATION_MS);

    const nonActiveFaces: Face[] = ['D', 'F', 'B', 'R', 'L'];
    for (const face of nonActiveFaces) {
      const cwBlocked = startMove(locked, { face, direction: 'CW' }, startTime + 500);
      expect(cwBlocked).toBe(locked);

      const ccwBlocked = startMove(locked, { face, direction: 'CCW' }, startTime + 500);
      expect(ccwBlocked).toBe(locked);
    }
  });

  it('INITIAL_CCW_SYMMETRY_GATE: initial CCW move holds at p=0.5, subsequent CCW continues, and CW cancels', () => {
    const moveCCW: Move = { face: 'L', direction: 'CCW' };
    const moveCW: Move = { face: 'L', direction: 'CW' };

    // Trial 1: CCW -> CCW (Continuation)
    const initial = createInitialSessionState();
    const started = startMove(initial, moveCCW, 1000);
    const locked = stepAnimation(started, 1000 + PHYSICAL_STEP_DURATION_MS);
    expect(locked.stagedMove?.phase).toBe('HALF_TURN_LOCKED');

    const continuing = startMove(locked, moveCCW, 2000);
    expect(continuing.stagedMove?.phase).toBe('SECOND_HALF_ANIMATING');

    const completed = stepAnimation(continuing, 2000 + PHYSICAL_STEP_DURATION_MS);
    expect(completed.currentState).toEqual(applyMove(SOLVED_GEAR_CUBE_STATE, moveCCW));
    expect(completed.currentFrame).toBe(nextSpatialFrame(DEFAULT_SPATIAL_FRAME, 'L'));

    // Trial 2: CCW -> CW (Cancellation)
    const started2 = startMove(initial, moveCCW, 1000);
    const locked2 = stepAnimation(started2, 1000 + PHYSICAL_STEP_DURATION_MS);

    const cancelling = startMove(locked2, moveCW, 2000);
    expect(cancelling.stagedMove?.phase).toBe('CANCEL_HALF_ANIMATING');

    const cancelled = stepAnimation(cancelling, 2000 + PHYSICAL_STEP_DURATION_MS);
    expect(cancelled.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(cancelled.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);
  });

  it('TWELVE_DIRECTED_MOVE_STAGING_GATE: all 12 directed moves can execute two-step staging to full canonical endpoint', () => {
    for (const move of ALL_MOVES) {
      const initial = createInitialSessionState();
      const t0 = 1000;

      // Step 1: 0.0 -> 0.5
      const s1 = startMove(initial, move, t0);
      expect(s1.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');
      const locked = stepAnimation(s1, t0 + PHYSICAL_STEP_DURATION_MS);
      expect(locked.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
      expect(locked.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);

      // Step 2: 0.5 -> 1.0
      const t1 = 2000;
      const s2 = startMove(locked, move, t1);
      expect(s2.stagedMove?.phase).toBe('SECOND_HALF_ANIMATING');
      const completed = stepAnimation(s2, t1 + PHYSICAL_STEP_DURATION_MS);
      expect(completed.stagedMove).toBeNull();

      const expectedNextState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
      const expectedNextFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face);
      expect(completed.currentState).toEqual(expectedNextState);
      expect(completed.currentFrame).toBe(expectedNextFrame);

      const expectedTransforms = placementToTransforms(
        materializeState(expectedNextState, expectedNextFrame)
      );
      expect(completed.displayTransforms).toEqual(expectedTransforms);
    }
  });

  it('TWELVE_DIRECTED_MOVE_CANCEL_GATE: all 12 directed moves can execute first half and cancel back to origin', () => {
    for (const move of ALL_MOVES) {
      const initial = createInitialSessionState();
      const oppMove: Move = {
        face: move.face,
        direction: move.direction === 'CW' ? 'CCW' : 'CW',
      };
      const t0 = 1000;

      const s1 = startMove(initial, move, t0);
      const locked = stepAnimation(s1, t0 + PHYSICAL_STEP_DURATION_MS);

      const t1 = 2000;
      const s2 = startMove(locked, oppMove, t1);
      expect(s2.stagedMove?.phase).toBe('CANCEL_HALF_ANIMATING');

      const cancelled = stepAnimation(s2, t1 + PHYSICAL_STEP_DURATION_MS);
      expect(cancelled.stagedMove).toBeNull();
      expect(cancelled.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
      expect(cancelled.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);

      const expectedTransforms = placementToTransforms(
        materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME)
      );
      expect(cancelled.displayTransforms).toEqual(expectedTransforms);
    }
  });

  it('SEQUENTIAL_CANONICAL_MOVE_GATE: sequential two-step staged moves chain accurately without drift', () => {
    let session = createInitialSessionState();
    let clock = 1000;

    const sequence: Move[] = [
      { face: 'U', direction: 'CW' },
      { face: 'R', direction: 'CCW' },
      { face: 'F', direction: 'CW' },
      { face: 'D', direction: 'CCW' },
    ];

    for (const move of sequence) {
      const stateBefore = session.currentState;
      const frameBefore = session.currentFrame;

      // First physical input (0.0 -> 0.5)
      session = startMove(session, move, clock);
      clock += PHYSICAL_STEP_DURATION_MS;
      session = stepAnimation(session, clock);
      expect(session.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
      expect(session.currentState).toEqual(stateBefore);
      expect(session.currentFrame).toBe(frameBefore);

      // Second physical input (0.5 -> 1.0)
      clock += 100;
      session = startMove(session, move, clock);
      clock += PHYSICAL_STEP_DURATION_MS;
      session = stepAnimation(session, clock);
      expect(session.stagedMove).toBeNull();

      const expectedState = applyMove(stateBefore, move);
      const expectedFrame = nextSpatialFrame(frameBefore, move.face);
      expect(session.currentState).toEqual(expectedState);
      expect(session.currentFrame).toBe(expectedFrame);

      const expectedTransforms = placementToTransforms(
        materializeState(expectedState, expectedFrame)
      );
      expect(session.displayTransforms).toEqual(expectedTransforms);

      clock += 100;
    }
  });

  it('INPUT_DURING_ANIMATION_GATE: inputs during active animation segments are rejected', () => {
    const session = createInitialSessionState();
    const move1: Move = { face: 'U', direction: 'CW' };
    const move2: Move = { face: 'D', direction: 'CCW' };
    const startTime = 1000;

    // During FIRST_HALF_ANIMATING
    const s1 = startMove(session, move1, startTime);
    const rejected1 = startMove(s1, move2, startTime + 50);
    expect(rejected1).toBe(s1);

    // Reach lock
    const locked = stepAnimation(s1, startTime + PHYSICAL_STEP_DURATION_MS);

    // During SECOND_HALF_ANIMATING
    const s2 = startMove(locked, move1, 2000);
    const rejected2 = startMove(s2, move2, 2050);
    expect(rejected2).toBe(s2);

    // During CANCEL_HALF_ANIMATING
    const s1_again = startMove(session, move1, 3000);
    const locked_again = stepAnimation(s1_again, 3000 + PHYSICAL_STEP_DURATION_MS);
    const cancel = startMove(locked_again, { face: 'U', direction: 'CCW' }, 4000);
    const rejected3 = startMove(cancel, move2, 4050);
    expect(rejected3).toBe(cancel);

    // Repeated stepAnimation after completion is a no-op
    const completed = stepAnimation(s2, 2000 + PHYSICAL_STEP_DURATION_MS);
    const steppedAfter = stepAnimation(completed, 5000);
    expect(steppedAfter).toBe(completed);
  });

  it('NO_HALF_STATE_COMMIT_GATE & IMMUTABILITY_GATE: domain structures remain 100% untouched and unmutated', () => {
    const initialSession = createInitialSessionState();
    const stateFrozenJson = JSON.stringify(initialSession.currentState);
    const frameFrozen = initialSession.currentFrame;

    const move: Move = { face: 'U', direction: 'CW' };
    const s1 = startMove(initialSession, move, 1000);
    const locked = stepAnimation(s1, 1000 + PHYSICAL_STEP_DURATION_MS);

    expect(JSON.stringify(initialSession.currentState)).toBe(stateFrozenJson);
    expect(initialSession.currentFrame).toBe(frameFrozen);
    expect(JSON.stringify(locked.currentState)).toBe(stateFrozenJson);
    expect(locked.currentFrame).toBe(frameFrozen);
    expect(equalsGearCubeState(locked.currentState, SOLVED_GEAR_CUBE_STATE)).toBe(true);
  });
});
