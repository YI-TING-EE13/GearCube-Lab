/**
 * @file animation.test.ts
 * @description Pure Node/Vitest automated unit tests for Phase 2C animation session lifecycle, easing, 12-move coverage, and endpoint projection.
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
  MOVE_DURATION_MS,
  easeInOutCubic,
  createInitialSessionState,
  startMove,
  stepAnimation,
  type GearCubeSessionState,
} from './animation';

describe('Phase 2C — Animation Session & Lifecycle Unit Suite (Pure Vitest Node)', () => {
  it('INITIAL_SOLVED_RENDER_GATE: initial session produces exactly 26 transforms matching solved projection', () => {
    const session = createInitialSessionState();

    expect(session.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(session.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);
    expect(session.activeAnimation).toBeNull();
    expect(session.displayTransforms).toHaveLength(26);

    const expectedView = materializeState(SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME);
    const expectedTransforms = placementToTransforms(expectedView);
    expect(session.displayTransforms).toEqual(expectedTransforms);
  });

  it('Easing Math Gate: easeInOutCubic satisfies boundary, monotonicity, and C1 zero-endpoint velocity', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);

    // Clamping behavior
    expect(easeInOutCubic(-0.5)).toBe(0);
    expect(easeInOutCubic(1.5)).toBe(1);

    // Strict monotonicity in (0, 1)
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

    // Zero initial/terminal velocity check (finite difference delta)
    const dt = 1e-4;
    const vStart = (easeInOutCubic(dt) - easeInOutCubic(0)) / dt;
    const vEnd = (easeInOutCubic(1) - easeInOutCubic(1 - dt)) / dt;
    expect(vStart).toBeCloseTo(0, 2);
    expect(vEnd).toBeCloseTo(0, 2);
  });

  it('MOVE_START_GATE: startMove initiates active animation session with valid kinematics plan and target state', () => {
    const session = createInitialSessionState();
    const move: Move = { face: 'U', direction: 'CW' };
    const startTime = 1000;

    const startedSession = startMove(session, move, startTime);

    expect(startedSession.activeAnimation).not.toBeNull();
    expect(startedSession.activeAnimation?.move).toEqual(move);
    expect(startedSession.activeAnimation?.startTimeMs).toBe(startTime);
    expect(startedSession.activeAnimation?.durationMs).toBe(MOVE_DURATION_MS);

    // Target state and frame are pre-derived correctly
    const expectedNextState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
    const expectedNextFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face);
    expect(startedSession.activeAnimation?.nextState).toEqual(expectedNextState);
    expect(startedSession.activeAnimation?.nextFrame).toBe(expectedNextFrame);

    // Logical state is NOT committed yet during active animation
    expect(startedSession.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(startedSession.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);
  });

  it('MID_ANIMATION_EVALUATION_GATE: stepAnimation evaluates plan continuously without NaN or intermediate state mutation', () => {
    const session = createInitialSessionState();
    const move: Move = { face: 'R', direction: 'CCW' };
    const startTime = 5000;
    const startedSession = startMove(session, move, startTime);

    // Evaluate at quarter progress (elapsed 100ms)
    const mid1 = stepAnimation(startedSession, startTime + 100);
    expect(mid1.activeAnimation).not.toBeNull();
    expect(mid1.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(mid1.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);
    expect(mid1.displayTransforms).toHaveLength(26);

    for (const t of mid1.displayTransforms) {
      expect(Number.isFinite(t.position[0])).toBe(true);
      expect(Number.isFinite(t.position[1])).toBe(true);
      expect(Number.isFinite(t.position[2])).toBe(true);
      expect(Number.isFinite(t.rotationQuaternion[0])).toBe(true);
      expect(Number.isFinite(t.rotationQuaternion[1])).toBe(true);
      expect(Number.isFinite(t.rotationQuaternion[2])).toBe(true);
      expect(Number.isFinite(t.rotationQuaternion[3])).toBe(true);
    }

    // Evaluate at half progress (elapsed 200ms)
    const mid2 = stepAnimation(startedSession, startTime + 200);
    expect(mid2.activeAnimation).not.toBeNull();
    expect(mid2.displayTransforms).toHaveLength(26);
  });

  it('COMPLETION_GATE: session atomically commits nextState, nextFrame, clears activeAnimation, and projects fresh endpoint', () => {
    const session = createInitialSessionState();
    const move: Move = { face: 'F', direction: 'CW' };
    const startTime = 10000;
    const startedSession = startMove(session, move, startTime);

    // Advance to exactly completion (elapsed 400ms)
    const completedSession = stepAnimation(startedSession, startTime + MOVE_DURATION_MS);

    const expectedNextState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
    const expectedNextFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face);

    expect(completedSession.activeAnimation).toBeNull();
    expect(completedSession.currentState).toEqual(expectedNextState);
    expect(completedSession.currentFrame).toBe(expectedNextFrame);

    // Permanent display transforms match fresh materialization authority
    const expectedFreshView = materializeState(expectedNextState, expectedNextFrame);
    const expectedFreshTransforms = placementToTransforms(expectedFreshView);
    expect(completedSession.displayTransforms).toEqual(expectedFreshTransforms);

    // Stepping an idle completed session is a no-op
    const idleStep = stepAnimation(completedSession, startTime + 5000);
    expect(idleStep).toBe(completedSession);
  });

  it('INPUT_IGNORED_GATE: startMove ignores new moves while animation is active', () => {
    const session = createInitialSessionState();
    const move1: Move = { face: 'U', direction: 'CW' };
    const move2: Move = { face: 'D', direction: 'CCW' };
    const startTime = 1000;

    const started = startMove(session, move1, startTime);
    expect(started.activeAnimation?.move).toEqual(move1);

    // Attempt to trigger move2 while move1 is still animating
    const ignored = startMove(started, move2, startTime + 100);
    expect(ignored).toBe(started);
    expect(ignored.activeAnimation?.move).toEqual(move1);
    expect(ignored.activeAnimation?.nextState).toEqual(applyMove(SOLVED_GEAR_CUBE_STATE, move1));
  });

  it('SEQUENTIAL_MOVE_GATE: sequential moves chain from prior committed endpoint without drift or desync', () => {
    let session = createInitialSessionState();
    let clock = 1000;

    const moveSequence: Move[] = [
      { face: 'U', direction: 'CW' },
      { face: 'R', direction: 'CCW' },
      { face: 'F', direction: 'CW' },
      { face: 'D', direction: 'CCW' },
      { face: 'B', direction: 'CW' },
      { face: 'L', direction: 'CCW' },
    ];

    for (const move of moveSequence) {
      const stateBefore = session.currentState;
      const frameBefore = session.currentFrame;

      // Start move
      session = startMove(session, move, clock);
      expect(session.activeAnimation).not.toBeNull();
      expect(session.currentState).toEqual(stateBefore);
      expect(session.currentFrame).toEqual(frameBefore);

      // Mid step
      session = stepAnimation(session, clock + 200);
      expect(session.activeAnimation).not.toBeNull();

      // Complete move
      clock += MOVE_DURATION_MS;
      session = stepAnimation(session, clock);
      expect(session.activeAnimation).toBeNull();

      const expectedState = applyMove(stateBefore, move);
      const expectedFrame = nextSpatialFrame(frameBefore, move.face);
      expect(session.currentState).toEqual(expectedState);
      expect(session.currentFrame).toBe(expectedFrame);

      // Verify exact fresh endpoint match
      const expectedView = materializeState(expectedState, expectedFrame);
      const expectedTransforms = placementToTransforms(expectedView);
      expect(session.displayTransforms).toEqual(expectedTransforms);

      clock += 100; // brief idle pause
    }
  });

  it('TWELVE_MOVE_COVERAGE_GATE: all 12 directed moves can start, plan, evaluate, and reach committed endpoint', () => {
    for (const move of ALL_MOVES) {
      const initial = createInitialSessionState();
      const startTime = 1000;

      const started = startMove(initial, move, startTime);
      expect(started.activeAnimation).not.toBeNull();
      expect(started.activeAnimation?.move).toEqual(move);

      const mid = stepAnimation(started, startTime + 200);
      expect(mid.displayTransforms).toHaveLength(26);

      const completed = stepAnimation(started, startTime + MOVE_DURATION_MS);
      expect(completed.activeAnimation).toBeNull();

      const expectedState = applyMove(SOLVED_GEAR_CUBE_STATE, move);
      const expectedFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, move.face);
      expect(completed.currentState).toEqual(expectedState);
      expect(completed.currentFrame).toBe(expectedFrame);

      const expectedTransforms = placementToTransforms(materializeState(expectedState, expectedFrame));
      expect(completed.displayTransforms).toEqual(expectedTransforms);
    }
  });

  it('IMMUTABILITY_GATE: session lifecycle operations leave input states and frames untouched', () => {
    const initialSession = createInitialSessionState();
    const stateFrozenJson = JSON.stringify(initialSession.currentState);
    const frameFrozen = initialSession.currentFrame;

    const move: Move = { face: 'U', direction: 'CW' };
    const started = startMove(initialSession, move, 1000);
    expect(JSON.stringify(initialSession.currentState)).toBe(stateFrozenJson);
    expect(initialSession.currentFrame).toBe(frameFrozen);

    const completed = stepAnimation(started, 1400);
    expect(JSON.stringify(initialSession.currentState)).toBe(stateFrozenJson);
    expect(initialSession.currentFrame).toBe(frameFrozen);
    expect(equalsGearCubeState(initialSession.currentState, SOLVED_GEAR_CUBE_STATE)).toBe(true);
  });
});
