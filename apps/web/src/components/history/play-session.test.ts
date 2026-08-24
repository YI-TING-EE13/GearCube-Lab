/**
 * @file play-session.test.ts
 * @description Comprehensive unit and integration tests for pure play session orchestration.
 */

import { describe, it, expect } from 'vitest';
// Explicitly import the static UI test suite so it executes within Vitest's
// current *.test.ts include pattern without requiring config modifications.
import './history-ui.test.js';
import {
  SOLVED_GEAR_CUBE_STATE,
  DEFAULT_SPATIAL_FRAME,
  type Move,
  applyMove,
  nextSpatialFrame,
} from '@gearcube/core';
import {
  createInitialPlayApplicationState,
  startPlayMove,
  stepPlayAnimation,
  setPlayInteractionMode,
  undoPlay,
  redoPlay,
  scrubPlay,
  backToBaselinePlay,
  applyScrambleToPlay,
} from './play-session.js';
import { getCurrentSnapshot } from './history.js';
import { generateScramble, applyScrambleSequence } from './scramble.js';

describe('Play Session Orchestration', () => {
  const moveU: Move = { face: 'U', direction: 'CW' };
  const moveR: Move = { face: 'R', direction: 'CW' };
  const moveF: Move = { face: 'F', direction: 'CCW' };
  const moveL: Move = { face: 'L', direction: 'CW' };

  it('INITIAL_SESSION_HISTORY_ALIGNMENT_GATE: initializes clean session and history alignment', () => {
    const app = createInitialPlayApplicationState();
    expect(app.session.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(app.session.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);
    expect(app.session.stagedMove).toBeNull();
    expect(app.session.interactionMode).toBe('TWO_STEP');

    expect(app.history.initialBaselineState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(app.history.initialBaselineFrame).toBe(DEFAULT_SPATIAL_FRAME);
    expect(app.history.entries).toHaveLength(0);
    expect(app.history.cursorIndex).toBe(-1);
  });

  it('NO_HISTORY_AT_HALF_GATE: first half-turn locks at midpoint with zero history entries', () => {
    let app = createInitialPlayApplicationState();
    app = startPlayMove(app, moveU, 1000, 200);
    expect(app.session.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');
    expect(app.history.entries).toHaveLength(0);

    // Step halfway (p = 0.25)
    app = stepPlayAnimation(app, 1100);
    expect(app.session.stagedMove?.phase).toBe('FIRST_HALF_ANIMATING');
    expect(app.history.entries).toHaveLength(0);

    // Step to completion of first half (p = 0.5) -> HALF_TURN_LOCKED
    app = stepPlayAnimation(app, 1200);
    expect(app.session.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
    expect(app.session.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(app.history.entries).toHaveLength(0);
    expect(app.history.cursorIndex).toBe(-1);
  });

  it('NO_HISTORY_ON_CANCEL_GATE: cancelling from half-turn lock restores origin with zero history entries', () => {
    let app = createInitialPlayApplicationState();
    app = startPlayMove(app, moveU, 1000, 200);
    app = stepPlayAnimation(app, 1200); // HALF_TURN_LOCKED

    // Cancel by sending opposite direction
    const cancelMove: Move = { face: 'U', direction: 'CCW' };
    app = startPlayMove(app, cancelMove, 1300, 200);
    expect(app.session.stagedMove?.phase).toBe('CANCEL_HALF_ANIMATING');
    expect(app.history.entries).toHaveLength(0);

    // Complete cancel animation
    app = stepPlayAnimation(app, 1500);
    expect(app.session.stagedMove).toBeNull();
    expect(app.session.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(app.session.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);
    expect(app.history.entries).toHaveLength(0);
    expect(app.history.cursorIndex).toBe(-1);
  });

  it('TWO_STEP_HISTORY_COMMIT_GATE: completing second half commits exactly one canonical history entry', () => {
    let app = createInitialPlayApplicationState();
    app = startPlayMove(app, moveU, 1000, 200);
    app = stepPlayAnimation(app, 1200); // HALF_TURN_LOCKED

    // Continue second half
    app = startPlayMove(app, moveU, 1300, 200);
    expect(app.session.stagedMove?.phase).toBe('SECOND_HALF_ANIMATING');
    expect(app.history.entries).toHaveLength(0);

    // Complete second half -> IDLE
    app = stepPlayAnimation(app, 1500);
    expect(app.session.stagedMove).toBeNull();

    const expectedState = applyMove(SOLVED_GEAR_CUBE_STATE, moveU);
    const expectedFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, 'U');

    expect(app.session.currentState).toEqual(expectedState);
    expect(app.session.currentFrame).toBe(expectedFrame);

    expect(app.history.entries).toHaveLength(1);
    expect(app.history.cursorIndex).toBe(0);
    expect(app.history.entries[0]).toEqual({
      move: moveU,
      resultingState: expectedState,
      resultingFrame: expectedFrame,
      notation: 'U+',
    });
  });

  it('DIRECT_HISTORY_COMMIT_GATE: completing direct 180 turn commits exactly one canonical history entry', () => {
    let app = createInitialPlayApplicationState();
    app = setPlayInteractionMode(app, 'DIRECT_180');
    expect(app.session.interactionMode).toBe('DIRECT_180');

    app = startPlayMove(app, moveR, 1000, 400);
    expect(app.session.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    expect(app.history.entries).toHaveLength(0);

    // Midpoint of direct turn (p = 0.5) -> still animating, no history
    app = stepPlayAnimation(app, 1200);
    expect(app.session.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    expect(app.history.entries).toHaveLength(0);

    // Complete direct turn
    app = stepPlayAnimation(app, 1400);
    expect(app.session.stagedMove).toBeNull();

    const expectedState = applyMove(SOLVED_GEAR_CUBE_STATE, moveR);
    const expectedFrame = nextSpatialFrame(DEFAULT_SPATIAL_FRAME, 'R');

    expect(app.session.currentState).toEqual(expectedState);
    expect(app.session.currentFrame).toBe(expectedFrame);

    expect(app.history.entries).toHaveLength(1);
    expect(app.history.cursorIndex).toBe(0);
    expect(app.history.entries[0]!.notation).toBe('R+');
  });

  it('UNDO_GATE & REDO_GATE & FRAME_AWARE_HISTORY_GATE: traverses history and restores canonical session', () => {
    let app = createInitialPlayApplicationState();
    app = setPlayInteractionMode(app, 'DIRECT_180');

    // Move 1: U+
    app = startPlayMove(app, moveU, 1000, 400);
    app = stepPlayAnimation(app, 1400);
    const stateU = app.session.currentState;
    const frameU = app.session.currentFrame;

    // Move 2: R+
    app = startPlayMove(app, moveR, 2000, 400);
    app = stepPlayAnimation(app, 2400);
    const stateR = app.session.currentState;
    const frameR = app.session.currentFrame;

    expect(app.history.entries).toHaveLength(2);
    expect(app.history.cursorIndex).toBe(1);

    // Undo Move 2 -> restores stateU + frameU
    app = undoPlay(app);
    expect(app.history.cursorIndex).toBe(0);
    expect(app.session.currentState).toEqual(stateU);
    expect(app.session.currentFrame).toBe(frameU);
    expect(app.session.stagedMove).toBeNull();
    expect(app.session.interactionMode).toBe('DIRECT_180');

    // Undo Move 1 -> restores baseline solved state + default frame
    app = undoPlay(app);
    expect(app.history.cursorIndex).toBe(-1);
    expect(app.session.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(app.session.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);

    // Undo when already at baseline is no-op
    const noopUndo = undoPlay(app);
    expect(noopUndo).toBe(app);

    // Redo to Move 1
    app = redoPlay(app);
    expect(app.history.cursorIndex).toBe(0);
    expect(app.session.currentState).toEqual(stateU);
    expect(app.session.currentFrame).toBe(frameU);

    // Redo to Move 2
    app = redoPlay(app);
    expect(app.history.cursorIndex).toBe(1);
    expect(app.session.currentState).toEqual(stateR);
    expect(app.session.currentFrame).toBe(frameR);

    // Redo at end is no-op
    const noopRedo = redoPlay(app);
    expect(noopRedo).toBe(app);
  });

  it('REDO_TRUNCATION_GATE: new move after undo discards future redo entries', () => {
    let app = createInitialPlayApplicationState();
    app = setPlayInteractionMode(app, 'DIRECT_180');

    // Move 1: U+
    app = startPlayMove(app, moveU, 1000, 400);
    app = stepPlayAnimation(app, 1400);

    // Move 2: R+
    app = startPlayMove(app, moveR, 2000, 400);
    app = stepPlayAnimation(app, 2400);

    // Undo Move 2
    app = undoPlay(app);
    expect(app.history.cursorIndex).toBe(0);
    expect(app.history.entries).toHaveLength(2);

    // Branch with Move 3: F-
    app = startPlayMove(app, moveF, 3000, 400);
    app = stepPlayAnimation(app, 3400);

    expect(app.history.entries).toHaveLength(2);
    expect(app.history.cursorIndex).toBe(1);
    expect(app.history.entries[0]!.notation).toBe('U+');
    expect(app.history.entries[1]!.notation).toBe('F-');
  });

  it('ARBITRARY_SCRUB_GATE & RESET_TO_BASELINE_GATE: direct timeline scrubbing and backToBaseline', () => {
    let app = createInitialPlayApplicationState();
    app = setPlayInteractionMode(app, 'DIRECT_180');

    // Move 1: U+
    app = startPlayMove(app, moveU, 1000, 400);
    app = stepPlayAnimation(app, 1400);
    const state1 = app.session.currentState;
    const frame1 = app.session.currentFrame;

    // Move 2: R+
    app = startPlayMove(app, moveR, 2000, 400);
    app = stepPlayAnimation(app, 2400);
    const state2 = app.session.currentState;
    const frame2 = app.session.currentFrame;

    // Scrub to -1 (baseline)
    app = scrubPlay(app, -1);
    expect(app.history.cursorIndex).toBe(-1);
    expect(app.session.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(app.session.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);

    // Scrub directly to index 1 (state2)
    app = scrubPlay(app, 1);
    expect(app.history.cursorIndex).toBe(1);
    expect(app.session.currentState).toEqual(state2);
    expect(app.session.currentFrame).toBe(frame2);

    // Back to baseline
    app = backToBaselinePlay(app);
    expect(app.history.cursorIndex).toBe(-1);
    expect(app.session.currentState).toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(app.session.currentFrame).toBe(DEFAULT_SPATIAL_FRAME);
    expect(app.history.entries).toHaveLength(2); // Redo history preserved

    // Scrub to index 0 (state1)
    app = scrubPlay(app, 0);
    expect(app.history.cursorIndex).toBe(0);
    expect(app.session.currentState).toEqual(state1);
    expect(app.session.currentFrame).toBe(frame1);
  });

  it('SESSION_HISTORY_ALIGNMENT_GATE: session matches history snapshot across all idle operations', () => {
    let app = createInitialPlayApplicationState();
    expect(app.session.currentState).toEqual(getCurrentSnapshot(app.history).state);
    expect(app.session.currentFrame).toBe(getCurrentSnapshot(app.history).frame);

    app = setPlayInteractionMode(app, 'DIRECT_180');
    app = startPlayMove(app, moveU, 1000, 400);
    app = stepPlayAnimation(app, 1400);

    expect(app.session.currentState).toEqual(getCurrentSnapshot(app.history).state);
    expect(app.session.currentFrame).toBe(getCurrentSnapshot(app.history).frame);

    app = undoPlay(app);
    expect(app.session.currentState).toEqual(getCurrentSnapshot(app.history).state);
    expect(app.session.currentFrame).toBe(getCurrentSnapshot(app.history).frame);
  });

  it('SCRAMBLE_BASELINE_GATE & SCRAMBLE_NO_HISTORY_ENTRIES_GATE & SCRAMBLE_FRAME_AWARE_GATE: atomic scramble baseline from current endpoint', () => {
    let app = createInitialPlayApplicationState();
    app = setPlayInteractionMode(app, 'DIRECT_180');

    // 1. Complete a nontrivial canonical move from solved
    app = startPlayMove(app, moveL, 1000, 400);
    app = stepPlayAnimation(app, 1400);
    expect(app.history.entries).toHaveLength(1);

    // 2. Capture pre-scramble canonical endpoint
    const preScrambleState = app.session.currentState;
    const preScrambleFrame = app.session.currentFrame;

    // 3. Fixed seed and length
    const seed = 'test_seed_123';
    const length = 20;

    // 4. Independently derive expected sequence and current-endpoint application
    const moves = generateScramble(seed, length);
    const expectedFromCurrent = applyScrambleSequence(
      preScrambleState,
      preScrambleFrame,
      moves
    );

    // 5. Independently derive incorrect-control endpoint (scrambling from solved origin)
    const wrongFromSolved = applyScrambleSequence(
      SOLVED_GEAR_CUBE_STATE,
      DEFAULT_SPATIAL_FRAME,
      moves
    );

    // 6. Prove test case distinguishes current endpoint from solved origin
    expect(expectedFromCurrent.state).not.toEqual(wrongFromSolved.state);
    expect(expectedFromCurrent.frame).not.toBe(wrongFromSolved.frame);

    // 7. Execute scramble on application
    app = applyScrambleToPlay(app, seed, length);

    // 8. Assert exact equality with expectedFromCurrent and verify all history/session contracts
    expect(app.session.currentState).toEqual(expectedFromCurrent.state);
    expect(app.session.currentFrame).toBe(expectedFromCurrent.frame);

    expect(app.history.initialBaselineState).toEqual(expectedFromCurrent.state);
    expect(app.history.initialBaselineFrame).toBe(expectedFromCurrent.frame);

    expect(app.history.entries).toHaveLength(0);
    expect(app.history.cursorIndex).toBe(-1);
    expect(app.session.stagedMove).toBeNull();
    expect(app.session.interactionMode).toBe('DIRECT_180'); // Preserved
  });

  it('MODE_COMPATIBILITY_GATE: switching mode does not affect history or baseline', () => {
    let app = createInitialPlayApplicationState();
    app = setPlayInteractionMode(app, 'DIRECT_180');
    app = startPlayMove(app, moveU, 1000, 400);
    app = stepPlayAnimation(app, 1400);

    expect(app.history.entries).toHaveLength(1);
    expect(app.history.cursorIndex).toBe(0);

    app = setPlayInteractionMode(app, 'TWO_STEP');
    expect(app.session.interactionMode).toBe('TWO_STEP');
    expect(app.history.entries).toHaveLength(1);
    expect(app.history.cursorIndex).toBe(0);
  });

  it('BUSY_INPUT_BLOCK_GATE: navigation and scramble are rejected during active animation and half-turn lock', () => {
    let app = createInitialPlayApplicationState();
    app = setPlayInteractionMode(app, 'TWO_STEP');

    // 1. During FIRST_HALF_ANIMATING
    app = startPlayMove(app, moveU, 1000, 200);
    expect(undoPlay(app)).toBe(app);
    expect(redoPlay(app)).toBe(app);
    expect(scrubPlay(app, -1)).toBe(app);
    expect(backToBaselinePlay(app)).toBe(app);
    expect(applyScrambleToPlay(app, 'seed')).toBe(app);

    // 2. During HALF_TURN_LOCKED
    app = stepPlayAnimation(app, 1200);
    expect(app.session.stagedMove?.phase).toBe('HALF_TURN_LOCKED');
    expect(undoPlay(app)).toBe(app);
    expect(redoPlay(app)).toBe(app);
    expect(scrubPlay(app, -1)).toBe(app);
    expect(backToBaselinePlay(app)).toBe(app);
    expect(applyScrambleToPlay(app, 'seed')).toBe(app);
  });

  it('IMMUTABILITY_GATE: orchestration does not mutate prior application state instances', () => {
    const app0 = createInitialPlayApplicationState();
    const app1 = setPlayInteractionMode(app0, 'DIRECT_180');
    const app2 = startPlayMove(app1, moveU, 1000, 400);
    const app3 = stepPlayAnimation(app2, 1400);

    expect(app0.session.interactionMode).toBe('TWO_STEP');
    expect(app0.history.entries).toHaveLength(0);

    expect(app1.session.interactionMode).toBe('DIRECT_180');
    expect(app1.session.stagedMove).toBeNull();
    expect(app1.history.entries).toHaveLength(0);

    expect(app2.session.stagedMove?.phase).toBe('DIRECT_FULL_ANIMATING');
    expect(app2.history.entries).toHaveLength(0);

    expect(app3.session.stagedMove).toBeNull();
    expect(app3.history.entries).toHaveLength(1);
  });
});
