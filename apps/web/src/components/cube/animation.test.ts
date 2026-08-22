/**
 * @file animation.test.ts
 * @description Unit test suite for pure animation session state, easing monotonicity, physical two-step turn staging, direct 180 turn mode, mode switching isolation, and deterministic transition lifecycles.
 */

import { describe, it, expect } from 'vitest';
import {
  type Face,
  type Direction,
  type Move,
  type GearCubeState,
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

const ALL_MOVES: readonly Move[] = [
  { face: 'U', direction: 'CW' },
  { face: 'U', direction: 'CCW' },
  { face: 'D', direction: 'CW' },
  { face: 'D', direction: 'CCW' },
  { face: 'F', direction: 'CW' },
  { face: 'F', direction: 'CCW' },
  { face: 'B', direction: 'CW' },
  { face: 'B', direction: 'CCW' },
  { face: 'R', direction: 'CW' },
  { face: 'R', direction: 'CCW' },
  { face: 'L', direction: 'CW' },
  { face: 'L', direction: 'CCW' },
];

describe('Phase 2E — Turn Interaction Mode & Staging State Machine', () => {
  it('EASING_MONOTONICITY_GATE: verifies easeInOutCubic boundary and strict monotonicity', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);

    let prev = -1;
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const val = easeInOutCubic(t);
      expect(val).toBeGreaterThanOrEqual(prev);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
      prev = val;
    }
  });

  it('DEFAULT_MODE_GATE: verifies initial session state defaults to TWO_STEP and solved placement', () => {
    const session = createInitialSessionState();
    expect(session.interactionMode).toBe('TWO_STEP');
    expect(session.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(session.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);
    expect(session.stagedMove).toBeNull();
    expect(isSessionIdle(session)).toBe(true);
    expect(isSessionAnimating(session)).toBe(false);
    expect(isSessionHalfTurnLocked(session)).toBe(false);
    expect(getStagingPhase(session)).toBe('IDLE');
    expect(session.displayTransforms).toHaveLength(26);
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

    // No-op identity check: setting same mode returns exact reference
    expect(setTurnInteractionMode(initial, 'TWO_STEP')).toBe(initial);
    expect(setTurnInteractionMode(directSession, 'DIRECT_180')).toBe(directSession);
  });

  it('MODE_SWITCH_BLOCKED_WHILE_BUSY_GATE: verifies mode switching is strictly rejected across all active states', () => {
    const initial = createInitialSessionState();

    // 1. During FIRST_HALF_ANIMATING
    const step1 = startMove(initial, { face: 'U', direction: 'CW' }, 1000);
    expect(step1.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');
    expect(setTurnInteractionMode(step1, 'DIRECT_180')).toBe(step1);
    expect(step1.interactionMode).toBe('TWO_STEP');

    // 2. During HALF_TURN_LOCKED
    const locked = stepAnimation(step1, 1200);
    expect(locked.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
    expect(setTurnInteractionMode(locked, 'DIRECT_180')).toBe(locked);
    expect(locked.interactionMode).toBe('TWO_STEP');

    // 3. During SECOND_HALF_ANIMATING
    const step2 = startMove(locked, { face: 'U', direction: 'CW' }, 2000);
    expect(step2.stagedMove?.phase).toBe('SECOND_HALF_ANIMATING');
    expect(setTurnInteractionMode(step2, 'DIRECT_180')).toBe(step2);

    // 4. During CANCEL_HALF_ANIMATING
    const cancelStep = startMove(locked, { face: 'U', direction: 'CCW' }, 2000);
    expect(cancelStep.stagedMove?.phase).toBe('CANCEL_HALF_ANIMATING');
    expect(setTurnInteractionMode(cancelStep, 'DIRECT_180')).toBe(cancelStep);

    // 5. During DIRECT_FULL_ANIMATING
    const directInitial = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const directStep = startMove(directInitial, { face: 'R', direction: 'CW' }, 3000);
    expect(directStep.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    expect(setTurnInteractionMode(directStep, 'TWO_STEP')).toBe(directStep);
    expect(directStep.interactionMode).toBe('DIRECT_180');
  });

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

    // Domain state and frame remain strictly original
    expect(started.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(started.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);
  });

  it('DIRECT_180_MID_PROGRESS_GATE: verifies continuous progress through midpoint without locking', () => {
    const session = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const started = startMove(session, { face: 'F', direction: 'CW' }, 1000);

    // At t = 200ms (50% of 400ms duration)
    const mid = stepAnimation(started, 1200);
    expect(mid.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    expect(isSessionHalfTurnLocked(mid)).toBe(false);
    expect(isSessionAnimating(mid)).toBe(true);

    // Evaluated transforms correspond to canonical p = 0.5
    const expectedMidTransforms = started.stagedMove!.plan.evaluate(0.5);
    expect(mid.displayTransforms).toEqual(expectedMidTransforms);

    // Domain state remains uncommitted
    expect(mid.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(mid.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);
  });

  it('DIRECT_180_COMPLETION_GATE: verifies full canonical commit and fresh endpoint projection at 400ms', () => {
    const session = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const move: Move = { face: 'F', direction: 'CW' };
    const started = startMove(session, move, 1000);

    // Advance to completion at t = 1400ms (400ms elapsed)
    const completed = stepAnimation(started, 1400);
    expect(completed.stagedMove).toBeNull();
    expect(isSessionIdle(completed)).toBe(true);
    expect(isSessionAnimating(completed)).toBe(false);

    // Verifies canonical endpoint commit
    const expectedState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
    const expectedFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face);
    expect(completed.currentState).toEqual(expectedState);
    expect(completed.currentFrame).toEqual(expectedFrame);

    // Verifies fresh static projection
    const expectedTransforms = placementToTransforms(
      materializeState(expectedState, expectedFrame)
    );
    expect(completed.displayTransforms).toEqual(expectedTransforms);
  });

  it('DIRECT_180_INPUT_BLOCKED_GATE: verifies inputs during DIRECT_FULL_ANIMATING are strictly ignored', () => {
    const session = setTurnInteractionMode(createInitialSessionState(), 'DIRECT_180');
    const started = startMove(session, { face: 'U', direction: 'CW' }, 1000);
    const mid = stepAnimation(started, 1150);

    // Try triggering another move while animating
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

  it('TWO_STEP_REGRESSION_GATE: verifies all Phase 2D continue, cancel, and block behaviors remain intact', () => {
    // 1. Cancellation test
    let s = createInitialSessionState();
    s = startMove(s, { face: 'D', direction: 'CW' }, 0);
    s = stepAnimation(s, 200);
    expect(s.stagedMove?.phase).toBe('HALF_TURN_LOCKED');

    // Reverse with opposite direction
    s = startMove(s, { face: 'D', direction: 'CCW' }, 300);
    expect(s.stagedMove?.phase).toBe('CANCEL_HALF_ANIMATING');
    s = stepAnimation(s, 500);
    expect(isSessionIdle(s)).toBe(true);
    expect(s.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(s.currentFrame).toEqual(DEFAULT_SPATIAL_FRAME);

    // 2. Other face blocked test
    s = startMove(s, { face: 'B', direction: 'CW' }, 600);
    s = stepAnimation(s, 800);
    expect(s.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
    const blocked = startMove(s, { face: 'L', direction: 'CW' }, 900);
    expect(blocked).toBe(s);
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
