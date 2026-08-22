/**
 * @file animation.test.ts
 * @description Comprehensive unit test suite covering pure animation session state, easing math, physical two-step turn staging (Phase 2D regression), direct 180 turn mode (Phase 2E), mode switching isolation, and deterministic transition lifecycles.
 */

import { describe, it, expect } from 'vitest';
import {
  type Face,
  type Direction,
  type Move,
  type GearCubeState,
  ALL_MOVES,
  SOLVED_GEAR_CUBE_STATE,
  DEFAULT_SPATIAL_FRAME,
  materializeState,
  applyMove,
  nextSpatialFrame,
} from '@gearcube/core';
import { placementToTransforms, planKinematics } from '@gearcube/kinematics';
import {
  PHYSICAL_STEP_DURATION_MS,
  FULL_CANONICAL_MOVE_DURATION_MS,
  DIRECT_180_DURATION_MS,
  MOVE_DURATION_MS,
  easeInOutCubic,
  createInitialSessionState,
  startMove,
  stepAnimation,
  isSessionIdle,
  isSessionAnimating,
  isSessionHalfTurnLocked,
  getStagingPhase,
  setTurnInteractionMode,
} from './animation';

describe('Phase 2E & Phase 2D Regression — Animation & Turn Interaction Suite', () => {
  // ---------------------------------------------------------------------------
  // 1. Initial State & Render Projection
  // ---------------------------------------------------------------------------
  it('INITIAL_SOLVED_RENDER_GATE: initializes solved session state with 26 fresh static transforms and TWO_STEP default', () => {
    const session = createInitialSessionState();
    expect(session.interactionMode).toBe('TWO_STEP');
    expect(session.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(session.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);
    expect(session.stagedMove).toBeNull();
    expect(isSessionIdle(session)).toBe(true);
    expect(isSessionAnimating(session)).toBe(false);
    expect(isSessionHalfTurnLocked(session)).toBe(false);
    expect(getStagingPhase(session)).toBe('IDLE');

    const expectedTransforms = placementToTransforms(
      materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME)
    );
    expect(session.displayTransforms).toEqual(expectedTransforms);
    expect(session.displayTransforms).toHaveLength(26);
  });

  // ---------------------------------------------------------------------------
  // 2. Easing Math & Monotonicity
  // ---------------------------------------------------------------------------
  it('EASING_MATH_GATE: verifies easeInOutCubic boundary, clamping, strict monotonicity, and zero-velocity endpoints', () => {
    // Boundaries and clamping outside [0, 1]
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(2)).toBe(1);

    // Monotonicity
    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const val = easeInOutCubic(t);
      expect(val).toBeGreaterThanOrEqual(prev);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
      prev = val;
    }

    // Endpoint derivative zero-velocity approximation: 4 * t^3 near 0
    expect(easeInOutCubic(0.01)).toBeCloseTo(0.000004, 6);
    expect(1 - easeInOutCubic(0.99)).toBeCloseTo(0.000004, 6);
  });

  // ---------------------------------------------------------------------------
  // 3. Mode Selection & Mode Switching Isolation (Phase 2E)
  // ---------------------------------------------------------------------------
  it('DEFAULT_MODE_GATE: verifies session initializes with TWO_STEP mode by default', () => {
    const session = createInitialSessionState();
    expect(session.interactionMode).toBe('TWO_STEP');
  });

  it('IDLE_MODE_SWITCH_GATE: verifies mode switching succeeds when IDLE and handles identity no-ops', () => {
    const initial = createInitialSessionState();
    expect(initial.interactionMode).toBe('TWO_STEP');

    // Switch TWO_STEP -> DIRECT_180
    const directSession = setTurnInteractionMode(initial, 'DIRECT_180');
    expect(directSession.interactionMode).toBe('DIRECT_180');
    expect(directSession.currentState).toBe(initial.currentState);
    expect(directSession.currentFrame).toBe(initial.currentFrame);
    expect(directSession.stagedMove).toBeNull();

    // Switch DIRECT_180 -> TWO_STEP
    const twoStepSession = setTurnInteractionMode(directSession, 'TWO_STEP');
    expect(twoStepSession.interactionMode).toBe('TWO_STEP');

    // No-op identity checks
    expect(setTurnInteractionMode(initial, 'TWO_STEP')).toBe(initial);
    expect(setTurnInteractionMode(directSession, 'DIRECT_180')).toBe(directSession);
  });

  it('MODE_SWITCH_BLOCKED_WHILE_BUSY_GATE: verifies mode switching is strictly rejected across all active states', () => {
    const initial = createInitialSessionState();

    // 1. FIRST_HALF_ANIMATING
    const step1 = startMove(initial, { face: 'U', direction: 'CW' }, 1000);
    expect(step1.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');
    expect(setTurnInteractionMode(step1, 'DIRECT_180')).toBe(step1);

    // 2. HALF_TURN_LOCKED
    const locked = stepAnimation(step1, 1200);
    expect(locked.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
    expect(setTurnInteractionMode(locked, 'DIRECT_180')).toBe(locked);

    // 3. SECOND_HALF_ANIMATING
    const step2 = startMove(locked, { face: 'U', direction: 'CW' }, 2000);
    expect(step2.stagedMove?.phase).toBe('SECOND_HALF_ANIMATING');
    expect(setTurnInteractionMode(step2, 'DIRECT_180')).toBe(step2);

    // 4. CANCEL_HALF_ANIMATING
    const cancelStep = startMove(locked, { face: 'U', direction: 'CCW' }, 2000);
    expect(cancelStep.stagedMove?.phase).toBe('CANCEL_HALF_ANIMATING');
    expect(setTurnInteractionMode(cancelStep, 'DIRECT_180')).toBe(cancelStep);

    // 5. DIRECT_FULL_ANIMATING
    const directInitial = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const directStep = startMove(directInitial, { face: 'R', direction: 'CW' }, 3000);
    expect(directStep.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    expect(setTurnInteractionMode(directStep, 'TWO_STEP')).toBe(directStep);
    expect(directStep.interactionMode).toBe('DIRECT_180');
  });

  // ---------------------------------------------------------------------------
  // 4. Direct 180 Execution Gates (Phase 2E)
  // ---------------------------------------------------------------------------
  it('DIRECT_180_START_GATE: verifies one startMove initiates DIRECT_FULL_ANIMATING without uncommitted state mutation', () => {
    const session = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const started = startMove(session, { face: 'F', direction: 'CW' }, 1000);

    expect(started.stagedMove).not.toBeNull();
    expect(started.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    expect(started.stagedMove?.segmentDurationMs).toBe(DIRECT_180_DURATION_MS);
    expect(started.stagedMove?.segmentStartTimeMs).toBe(1000);
    expect(isSessionAnimating(started)).toBe(true);
    expect(isSessionIdle(started)).toBe(false);
    expect(isSessionHalfTurnLocked(started)).toBe(false);
    expect(started.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(started.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);
  });

  it('DIRECT_180_MID_PROGRESS_GATE: verifies continuous progress through midpoint without locking', () => {
    const session = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const started = startMove(session, { face: 'F', direction: 'CW' }, 1000);

    const mid = stepAnimation(started, 1200);
    expect(mid.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    expect(isSessionHalfTurnLocked(mid)).toBe(false);
    expect(isSessionAnimating(mid)).toBe(true);

    const expectedMidTransforms = started.stagedMove!.plan.evaluate(0.5);
    expect(mid.displayTransforms).toEqual(expectedMidTransforms);
    expect(mid.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(mid.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);
  });

  it('DIRECT_180_COMPLETION_GATE: verifies full canonical commit and fresh endpoint projection at 400ms', () => {
    const session = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const move: Move = { face: 'F', direction: 'CW' };
    const started = startMove(session, move, 1000);

    const completed = stepAnimation(started, 1400);
    expect(completed.stagedMove).toBeNull();
    expect(isSessionIdle(completed)).toBe(true);
    expect(isSessionAnimating(completed)).toBe(false);

    const expectedState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
    const expectedFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face);
    expect(completed.currentState).toEqual(expectedState);
    expect(completed.currentFrame).toEqual(expectedFrame);

    const expectedTransforms = placementToTransforms(
      materializeState(expectedState, expectedFrame)
    );
    expect(completed.displayTransforms).toEqual(expectedTransforms);
  });

  it('DIRECT_180_INPUT_BLOCKED_GATE: verifies inputs during DIRECT_FULL_ANIMATING are strictly ignored', () => {
    const session = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const started = startMove(session, { face: 'U', direction: 'CW' }, 1000);
    const mid = stepAnimation(started, 1150);

    const ignored = startMove(mid, { face: 'R', direction: 'CCW' }, 1160);
    expect(ignored).toBe(mid);
  });

  it('DIRECT_180_TWELVE_MOVE_GATE: verifies all 12 canonical moves complete correctly with one click in DIRECT_180 mode', () => {
    for (const move of ALL_MOVES) {
      const initial = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
      const started = startMove(initial, move, 0);
      expect(started.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');

      const completed = stepAnimation(started, 400);
      expect(completed.stagedMove).toBeNull();
      expect(completed.currentState).toEqual(applyMove(SOLVED_GEAR_CUBE_STATE, move));
      expect(completed.currentFrame).toEqual(nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face));

      const freshTransforms = placementToTransforms(
        materializeState(completed.currentState, completed.currentFrame)
      );
      expect(completed.displayTransforms).toEqual(freshTransforms);
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Phase 2D Two-Step Staging Regression Gates
  // ---------------------------------------------------------------------------
  it('FIRST_HALF_GATE: verifies first 90-degree step animates to midpoint and enters HALF_TURN_LOCKED without commit', () => {
    const session = createInitialSessionState();
    const started = startMove(session, { face: 'U', direction: 'CW' }, 1000);
    expect(started.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');
    expect(isSessionAnimating(started)).toBe(true);

    // At 100ms (50% of 200ms step) -> canonical progress = 0.5 * easeInOutCubic(0.5) = 0.25
    const quarter = stepAnimation(started, 1100);
    expect(quarter.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');
    expect(quarter.displayTransforms).toEqual(started.stagedMove!.plan.evaluate(0.25));

    // At 200ms -> reaches exact midpoint and locks
    const locked = stepAnimation(started, 1200);
    expect(locked.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
    expect(isSessionHalfTurnLocked(locked)).toBe(true);
    expect(isSessionAnimating(locked)).toBe(false);
    expect(isSessionIdle(locked)).toBe(false);
    expect(locked.displayTransforms).toEqual(started.stagedMove!.plan.evaluate(0.5));
    expect(locked.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(locked.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);
  });

  it('HALF_TURN_LOCK_GATE: verifies stable hold at midpoint indefinitely without transform drift or state change', () => {
    const session = createInitialSessionState();
    const started = startMove(session, { face: 'U', direction: 'CW' }, 1000);
    const locked = stepAnimation(started, 1200);

    const hold1 = stepAnimation(locked, 1500);
    const hold2 = stepAnimation(locked, 10000);
    expect(hold1).toBe(locked);
    expect(hold2).toBe(locked);
    expect(hold2.displayTransforms).toEqual(started.stagedMove!.plan.evaluate(0.5));
    expect(hold2.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(hold2.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);
  });

  it('SAME_DIRECTION_CONTINUE_GATE: verifies same direction input from midpoint completes full canonical move and commits', () => {
    const session = createInitialSessionState();
    const move: Move = { face: 'U', direction: 'CW' };
    const step1 = startMove(session, move, 1000);
    const locked = stepAnimation(step1, 1200);

    // Second 90-degree step
    const step2 = startMove(locked, move, 1500);
    expect(step2.stagedMove?.phase).toBe('SECOND_HALF_ANIMATING');
    expect(isSessionAnimating(step2)).toBe(true);

    const completed = stepAnimation(step2, 1700);
    expect(completed.stagedMove).toBeNull();
    expect(isSessionIdle(completed)).toBe(true);

    const expectedState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
    const expectedFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face);
    expect(completed.currentState).toEqual(expectedState);
    expect(completed.currentFrame).toEqual(expectedFrame);

    const expectedTransforms = placementToTransforms(
      materializeState(expectedState, expectedFrame)
    );
    expect(completed.displayTransforms).toEqual(expectedTransforms);
  });

  it('OPPOSITE_DIRECTION_CANCEL_GATE: verifies opposite direction input from midpoint cancels back to origin without state mutation', () => {
    const session = createInitialSessionState();
    const step1 = startMove(session, { face: 'U', direction: 'CW' }, 1000);
    const locked = stepAnimation(step1, 1200);

    // Reverse with CCW
    const cancel = startMove(locked, { face: 'U', direction: 'CCW' }, 1500);
    expect(cancel.stagedMove?.phase).toBe('CANCEL_HALF_ANIMATING');
    expect(isSessionAnimating(cancel)).toBe(true);

    const completed = stepAnimation(cancel, 1700);
    expect(completed.stagedMove).toBeNull();
    expect(isSessionIdle(completed)).toBe(true);
    expect(completed.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(completed.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);

    const expectedTransforms = placementToTransforms(
      materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME)
    );
    expect(completed.displayTransforms).toEqual(expectedTransforms);
  });

  it('OTHER_FACE_BLOCKED_GATE: verifies all inputs on the other 5 faces are strictly blocked at half-turn lock', () => {
    const session = createInitialSessionState();
    const step1 = startMove(session, { face: 'U', direction: 'CW' }, 1000);
    const locked = stepAnimation(step1, 1200);

    const otherFaces: Face[] = ['D', 'F', 'B', 'R', 'L'];
    const directions: Direction[] = ['CW', 'CCW'];

    for (const face of otherFaces) {
      for (const direction of directions) {
        const attempted = startMove(locked, { face, direction }, 1300);
        expect(attempted).toBe(locked);
      }
    }
  });

  it('INITIAL_CCW_SYMMETRY_GATE: verifies CCW moves exhibit full two-step staging and cancellation symmetry', () => {
    // 1. Initial CCW -> CCW continue
    const s1 = createInitialSessionState();
    const ccwStep1 = startMove(s1, { face: 'R', direction: 'CCW' }, 0);
    const ccwLocked = stepAnimation(ccwStep1, 200);
    expect(ccwLocked.stagedMove?.phase).toBe('HALF_TURN_LOCKED');

    const ccwStep2 = startMove(ccwLocked, { face: 'R', direction: 'CCW' }, 300);
    const ccwCompleted = stepAnimation(ccwStep2, 500);
    expect(ccwCompleted.currentState).toEqual(applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'R', direction: 'CCW' }));
    expect(ccwCompleted.currentFrame).toEqual(nextSpatialFrame(DEFAULT_SPATIAL_FRAME, 'R'));

    // 2. Initial CCW -> CW cancel
    const s2 = createInitialSessionState();
    const ccwCancel1 = startMove(s2, { face: 'R', direction: 'CCW' }, 0);
    const ccwCancelLocked = stepAnimation(ccwCancel1, 200);
    const ccwCancel2 = startMove(ccwCancelLocked, { face: 'R', direction: 'CW' }, 300);
    const ccwCancelled = stepAnimation(ccwCancel2, 500);
    expect(ccwCancelled.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(ccwCancelled.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);
  });

  it('TWELVE_DIRECTED_MOVE_STAGING_GATE: verifies all 12 canonical moves execute two-step staging to completion', () => {
    for (const move of ALL_MOVES) {
      const initial = createInitialSessionState();
      const step1 = startMove(initial, move, 0);
      expect(step1.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');

      const locked = stepAnimation(step1, 200);
      expect(locked.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
      expect(locked.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);

      const step2 = startMove(locked, move, 300);
      expect(step2.stagedMove?.phase).toBe('SECOND_HALF_ANIMATING');

      const completed = stepAnimation(step2, 500);
      expect(completed.stagedMove).toBeNull();
      expect(completed.currentState).toEqual(applyMove(SOLVED_GEAR_CUBE_STATE, move));
      expect(completed.currentFrame).toEqual(nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face));

      const freshTransforms = placementToTransforms(
        materializeState(completed.currentState, completed.currentFrame)
      );
      expect(completed.displayTransforms).toEqual(freshTransforms);
    }
  });

  it('TWELVE_DIRECTED_MOVE_CANCEL_GATE: verifies all 12 canonical moves execute two-step cancellation to origin', () => {
    for (const move of ALL_MOVES) {
      const initial = createInitialSessionState();
      const step1 = startMove(initial, move, 0);
      const locked = stepAnimation(step1, 200);

      const oppositeDir: Direction = move.direction === 'CW' ? 'CCW' : 'CW';
      const cancel = startMove(locked, { face: move.face, direction: oppositeDir }, 300);
      expect(cancel.stagedMove?.phase).toBe('CANCEL_HALF_ANIMATING');

      const completed = stepAnimation(cancel, 500);
      expect(completed.stagedMove).toBeNull();
      expect(completed.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
      expect(completed.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);

      const freshTransforms = placementToTransforms(
        materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME)
      );
      expect(completed.displayTransforms).toEqual(freshTransforms);
    }
  });

  it('SEQUENTIAL_CANONICAL_MOVE_GATE: verifies multi-axis move sequence chains without state desync', () => {
    const sequence: Move[] = [
      { face: 'U', direction: 'CW' },
      { face: 'R', direction: 'CCW' },
      { face: 'F', direction: 'CW' },
      { face: 'D', direction: 'CCW' },
    ];

    let session = createInitialSessionState();
    let expectedState = SOLVED_GEAR_CUBE_STATE;
    let expectedFrame = DEFAULT_SPATIAL_FRAME;
    let t = 0;

    for (const move of sequence) {
      const step1 = startMove(session, move, t);
      t += 200;
      const locked = stepAnimation(step1, t);
      t += 50;
      const step2 = startMove(locked, move, t);
      t += 200;
      session = stepAnimation(step2, t);

      expectedState = applyMove(expectedState, move);
      expectedFrame = nextSpatialFrame(expectedFrame, move.face);

      expect(session.currentState).toEqual(expectedState);
      expect(session.currentFrame).toEqual(expectedFrame);
      expect(session.displayTransforms).toEqual(
        placementToTransforms(materializeState(expectedState, expectedFrame))
      );
    }
  });

  it('NO_HALF_STATE_COMMIT_GATE: explicitly verifies domain state remains unchanged at midpoint', () => {
    const session = createInitialSessionState();
    const step1 = startMove(session, { face: 'B', direction: 'CW' }, 0);
    const locked = stepAnimation(step1, 200);

    expect(locked.currentState.cornerConfiguration).toBe(SOLVED_GEAR_CUBE_STATE.cornerConfiguration);
    expect(locked.currentState.sliceX).toEqual(SOLVED_GEAR_CUBE_STATE.sliceX);
    expect(locked.currentState.sliceY).toEqual(SOLVED_GEAR_CUBE_STATE.sliceY);
    expect(locked.currentState.sliceZ).toEqual(SOLVED_GEAR_CUBE_STATE.sliceZ);
    expect(locked.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);
  });

  it('FRESH_ENDPOINT_PROJECTION_GATE: verifies fresh endpoint materialization after full completion in both modes', () => {
    // TWO_STEP fresh projection
    const s1 = createInitialSessionState();
    const st1 = startMove(s1, { face: 'L', direction: 'CW' }, 0);
    const l1 = stepAnimation(st1, 200);
    const st2 = startMove(l1, { face: 'L', direction: 'CW' }, 300);
    const c1 = stepAnimation(st2, 500);
    expect(c1.displayTransforms).toEqual(
      placementToTransforms(materializeState(c1.currentState, c1.currentFrame))
    );

    // DIRECT_180 fresh projection
    const s2 = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const directStart = startMove(s2, { face: 'L', direction: 'CW' }, 0);
    const c2 = stepAnimation(directStart, 400);
    expect(c2.displayTransforms).toEqual(
      placementToTransforms(materializeState(c2.currentState, c2.currentFrame))
    );
  });

  it('FRESH_CANCEL_PROJECTION_GATE: verifies fresh original materialization after cancellation', () => {
    const s = createInitialSessionState();
    const step1 = startMove(s, { face: 'F', direction: 'CW' }, 0);
    const locked = stepAnimation(step1, 200);
    const cancel = startMove(locked, { face: 'F', direction: 'CCW' }, 300);
    const completed = stepAnimation(cancel, 500);

    expect(completed.displayTransforms).toEqual(
      placementToTransforms(materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME))
    );
  });

  it('INPUT_DURING_ANIMATION_GATE: verifies inputs are strictly rejected across all animating states', () => {
    // 1. During FIRST_HALF_ANIMATING
    const s1 = startMove(createInitialSessionState(), { face: 'U', direction: 'CW' }, 1000);
    const mid1 = stepAnimation(s1, 1100);
    expect(startMove(mid1, { face: 'D', direction: 'CW' }, 1110)).toBe(mid1);

    // 2. During SECOND_HALF_ANIMATING
    const lock1 = stepAnimation(s1, 1200);
    const s2 = startMove(lock1, { face: 'U', direction: 'CW' }, 1300);
    const mid2 = stepAnimation(s2, 1400);
    expect(startMove(mid2, { face: 'D', direction: 'CW' }, 1410)).toBe(mid2);

    // 3. During CANCEL_HALF_ANIMATING
    const cancel = startMove(lock1, { face: 'U', direction: 'CCW' }, 1300);
    const midCancel = stepAnimation(cancel, 1400);
    expect(startMove(midCancel, { face: 'D', direction: 'CW' }, 1410)).toBe(midCancel);

    // 4. During DIRECT_FULL_ANIMATING
    const direct = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const directStart = startMove(direct, { face: 'U', direction: 'CW' }, 1000);
    const midDirect = stepAnimation(directStart, 1200);
    expect(startMove(midDirect, { face: 'D', direction: 'CW' }, 1210)).toBe(midDirect);
  });

  it('POST_COMPLETION_NOOP_GATE: verifies stepping an idle completed session returns identical session', () => {
    const session = createInitialSessionState();
    const step1 = startMove(session, { face: 'U', direction: 'CW' }, 0);
    const locked = stepAnimation(step1, 200);
    const step2 = startMove(locked, { face: 'U', direction: 'CW' }, 300);
    const completed = stepAnimation(step2, 500);

    expect(stepAnimation(completed, 600)).toBe(completed);
    expect(stepAnimation(completed, 10000)).toBe(completed);
  });

  it('POST_CANCELLATION_NOOP_GATE: verifies stepping an idle cancelled session returns identical session', () => {
    const session = createInitialSessionState();
    const step1 = startMove(session, { face: 'U', direction: 'CW' }, 0);
    const locked = stepAnimation(step1, 200);
    const cancel = startMove(locked, { face: 'U', direction: 'CCW' }, 300);
    const completed = stepAnimation(cancel, 500);

    expect(stepAnimation(completed, 600)).toBe(completed);
    expect(stepAnimation(completed, 10000)).toBe(completed);
  });

  // ---------------------------------------------------------------------------
  // 6. Mode Integration & Immutability
  // ---------------------------------------------------------------------------
  it('MODE_ISOLATION_GATE: verifies TWO_STEP and DIRECT_180 strictly stay within their respective lifecycle phases', () => {
    // TWO_STEP execution
    const twoStep = createInitialSessionState();
    const twoStepStart = startMove(twoStep, { face: 'U', direction: 'CW' }, 1000);
    expect(twoStepStart.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');
    const twoStepLock = stepAnimation(twoStepStart, 1200);
    expect(twoStepLock.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
    const twoStepFinish = startMove(twoStepLock, { face: 'U', direction: 'CW' }, 1300);
    expect(twoStepFinish.stagedMove?.phase).toBe('SECOND_HALF_ANIMATING');
    const twoStepDone = stepAnimation(twoStepFinish, 1500);
    expect(twoStepDone.stagedMove).toBeNull();

    // DIRECT_180 execution
    const direct = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const directStart = startMove(direct, { face: 'U', direction: 'CW' }, 1000);
    expect(directStart.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    const directMid = stepAnimation(directStart, 1200);
    expect(directMid.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    const directDone = stepAnimation(directStart, 1400);
    expect(directDone.stagedMove).toBeNull();
  });

  it('MIXED_MODE_SEQUENCE_GATE: verifies alternating sequences between TWO_STEP and DIRECT_180 preserve continuity', () => {
    // Step 1: TWO_STEP U CW (staged 2-step turn)
    let s = createInitialSessionState();
    s = startMove(s, { face: 'U', direction: 'CW' }, 0);
    s = stepAnimation(s, 200);
    expect(s.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
    s = startMove(s, { face: 'U', direction: 'CW' }, 300);
    s = stepAnimation(s, 500);
    expect(isSessionIdle(s)).toBe(true);

    const expectedState1 = applyMove(SOLVED_GEAR_CUBE_STATE, { face: 'U', direction: 'CW' });
    const expectedFrame1 = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, 'U');
    expect(s.currentState).toEqual(expectedState1);
    expect(s.currentFrame).toEqual(expectedFrame1);

    // Step 2: Switch to DIRECT_180 while IDLE
    s = setTurnInteractionMode(s, 'DIRECT_180');
    expect(s.interactionMode).toBe('DIRECT_180');

    // Step 3: DIRECT_180 R CCW (one-click turn)
    s = startMove(s, { face: 'R', direction: 'CCW' }, 600);
    expect(s.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    s = stepAnimation(s, 1000);
    expect(isSessionIdle(s)).toBe(true);

    const expectedState2 = applyMove(expectedState1, { face: 'R', direction: 'CCW' });
    const expectedFrame2 = nextSpatialFrame(expectedFrame1, 'R');
    expect(s.currentState).toEqual(expectedState2);
    expect(s.currentFrame).toEqual(expectedFrame2);

    // Step 4: Switch back to TWO_STEP while IDLE
    s = setTurnInteractionMode(s, 'TWO_STEP');
    expect(s.interactionMode).toBe('TWO_STEP');

    // Step 5: TWO_STEP F CW (staged 2-step turn)
    s = startMove(s, { face: 'F', direction: 'CW' }, 1100);
    s = stepAnimation(s, 1300);
    expect(s.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
    s = startMove(s, { face: 'F', direction: 'CW' }, 1400);
    s = stepAnimation(s, 1600);
    expect(isSessionIdle(s)).toBe(true);

    const expectedState3 = applyMove(expectedState2, { face: 'F', direction: 'CW' });
    const expectedFrame3 = nextSpatialFrame(expectedFrame2, 'F');
    expect(s.currentState).toEqual(expectedState3);
    expect(s.currentFrame).toEqual(expectedFrame3);
    expect(s.displayTransforms).toEqual(
      placementToTransforms(materializeState(expectedState3, expectedFrame3))
    );
  });

  it('IMMUTABILITY_GATE: verifies all operations preserve reference immutability of domain state', () => {
    const session = createInitialSessionState();
    const frozenState = Object.freeze({
      cornerConfiguration: session.currentState.cornerConfiguration,
      sliceX: Object.freeze({ ...session.currentState.sliceX }),
      sliceY: Object.freeze({ ...session.currentState.sliceY }),
      sliceZ: Object.freeze({ ...session.currentState.sliceZ }),
    });

    const sessionWithFrozen: typeof session = {
      ...session,
      currentState: frozenState,
    };

    expect(() => {
      const s1 = setTurnInteractionMode(sessionWithFrozen, 'DIRECT_180');
      const s2 = startMove(s1, { face: 'U', direction: 'CW' }, 0);
      stepAnimation(s2, 400);
    }).not.toThrow();
  });
});
