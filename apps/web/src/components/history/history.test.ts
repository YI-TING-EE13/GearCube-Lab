/**
 * @file history.test.ts
 * @description Comprehensive unit tests for pure move history data structures and transitions.
 */

import { describe, it, expect } from 'vitest';
import {
  applyMove,
  nextSpatialFrame,
  SOLVED_GEAR_CUBE_STATE,
  DEFAULT_SPATIAL_FRAME,
  ALL_MOVES,
  type Move,
  type GearCubeState,
  type SpatialFrame,
} from '@gearcube/core';
import {
  createPlayHistory,
  appendMove,
  formatMoveNotation,
  canUndo,
  canRedo,
  undo,
  redo,
  scrub,
  backToBaseline,
  getCurrentSnapshot,
  type PlayHistoryState,
} from './history.js';

describe('PlayHistory Foundation', () => {
  const initialState: GearCubeState = SOLVED_GEAR_CUBE_STATE;
  const initialFrame: SpatialFrame = DEFAULT_SPATIAL_FRAME;

  const move1: Move = { face: 'U', direction: 'CW' };
  const state1 = applyMove(initialState, move1);
  const frame1 = nextSpatialFrame(initialFrame, move1.face);

  const move2: Move = { face: 'R', direction: 'CCW' };
  const state2 = applyMove(state1, move2);
  const frame2 = nextSpatialFrame(frame1, move2.face);

  const move3: Move = { face: 'F', direction: 'CW' };
  const state3 = applyMove(state2, move3);
  const frame3 = nextSpatialFrame(frame2, move3.face);

  it('HISTORY_INITIAL_GATE: initializes with empty entries and cursor at -1', () => {
    const history = createPlayHistory(initialState, initialFrame);
    expect(history.initialBaselineState).toEqual(initialState);
    expect(history.initialBaselineFrame).toBe(initialFrame);
    expect(history.entries).toHaveLength(0);
    expect(history.cursorIndex).toBe(-1);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it('MOVE_NOTATION_GATE: formats all canonical moves deterministically', () => {
    for (const move of ALL_MOVES) {
      const notation = formatMoveNotation(move);
      const expectedSuffix = move.direction === 'CW' ? '+' : '-';
      expect(notation).toBe(`${move.face}${expectedSuffix}`);
    }
  });

  it('HISTORY_COMMIT_GATE: appending moves commits history entries and advances cursor', () => {
    let history = createPlayHistory(initialState, initialFrame);

    history = appendMove(history, move1, state1, frame1);
    expect(history.entries).toHaveLength(1);
    expect(history.cursorIndex).toBe(0);
    expect(history.entries[0]).toEqual({
      move: move1,
      resultingState: state1,
      resultingFrame: frame1,
      notation: 'U+',
    });
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);

    history = appendMove(history, move2, state2, frame2);
    expect(history.entries).toHaveLength(2);
    expect(history.cursorIndex).toBe(1);
    expect(history.entries[1]!.notation).toBe('R-');

    history = appendMove(history, move3, state3, frame3);
    expect(history.entries).toHaveLength(3);
    expect(history.cursorIndex).toBe(2);
    expect(history.entries[2]!.notation).toBe('F+');
  });

  it('CURRENT_SNAPSHOT_GATE & FRAME_AWARE_HISTORY_GATE: returns exact snapshot at all cursor positions', () => {
    let history = createPlayHistory(initialState, initialFrame);
    expect(getCurrentSnapshot(history)).toEqual({
      state: initialState,
      frame: initialFrame,
    });

    history = appendMove(history, move1, state1, frame1);
    expect(getCurrentSnapshot(history)).toEqual({
      state: state1,
      frame: frame1,
    });

    history = appendMove(history, move2, state2, frame2);
    expect(getCurrentSnapshot(history)).toEqual({
      state: state2,
      frame: frame2,
    });

    history = appendMove(history, move3, state3, frame3);
    expect(getCurrentSnapshot(history)).toEqual({
      state: state3,
      frame: frame3,
    });

    // Undo step-by-step verifying exact state and frame pairing
    history = undo(history);
    expect(getCurrentSnapshot(history)).toEqual({
      state: state2,
      frame: frame2,
    });

    history = undo(history);
    expect(getCurrentSnapshot(history)).toEqual({
      state: state1,
      frame: frame1,
    });

    history = undo(history);
    expect(getCurrentSnapshot(history)).toEqual({
      state: initialState,
      frame: initialFrame,
    });

    // Redo step-by-step verifying exact state and frame pairing
    history = redo(history);
    expect(getCurrentSnapshot(history)).toEqual({
      state: state1,
      frame: frame1,
    });

    history = redo(history);
    expect(getCurrentSnapshot(history)).toEqual({
      state: state2,
      frame: frame2,
    });
  });

  it('UNDO_GATE & REDO_GATE: steps forward and backward correctly', () => {
    let history = createPlayHistory(initialState, initialFrame);
    history = appendMove(history, move1, state1, frame1);
    history = appendMove(history, move2, state2, frame2);
    history = appendMove(history, move3, state3, frame3);

    expect(history.cursorIndex).toBe(2);
    expect(getCurrentSnapshot(history)).toEqual({ state: state3, frame: frame3 });
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);

    history = undo(history);
    expect(history.cursorIndex).toBe(1);
    expect(getCurrentSnapshot(history)).toEqual({ state: state2, frame: frame2 });
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(true);

    history = undo(history);
    expect(history.cursorIndex).toBe(0);
    expect(getCurrentSnapshot(history)).toEqual({ state: state1, frame: frame1 });
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(true);

    history = undo(history);
    expect(history.cursorIndex).toBe(-1);
    expect(getCurrentSnapshot(history)).toEqual({ state: initialState, frame: initialFrame });
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(true);

    // Redo back to top
    history = redo(history);
    expect(history.cursorIndex).toBe(0);
    expect(getCurrentSnapshot(history)).toEqual({ state: state1, frame: frame1 });

    history = redo(history);
    expect(history.cursorIndex).toBe(1);
    expect(getCurrentSnapshot(history)).toEqual({ state: state2, frame: frame2 });

    history = redo(history);
    expect(history.cursorIndex).toBe(2);
    expect(getCurrentSnapshot(history)).toEqual({ state: state3, frame: frame3 });
    expect(canRedo(history)).toBe(false);
  });

  it('UNDO_BOUNDARY_NOOP_GATE & REDO_BOUNDARY_NOOP_GATE: boundary navigation returns identical history instance', () => {
    let history = createPlayHistory(initialState, initialFrame);
    const unchangedUndo = undo(history);
    expect(unchangedUndo).toBe(history);

    history = appendMove(history, move1, state1, frame1);
    const unchangedRedo = redo(history);
    expect(unchangedRedo).toBe(history);
  });

  it('REDO_TRUNCATION_GATE: appending new move after undo truncates subsequent redo entries', () => {
    let history = createPlayHistory(initialState, initialFrame);
    history = appendMove(history, move1, state1, frame1);
    history = appendMove(history, move2, state2, frame2);
    history = appendMove(history, move3, state3, frame3);

    // Undo twice to index 0 (move1: U+)
    history = undo(history);
    history = undo(history);
    expect(history.cursorIndex).toBe(0);
    expect(history.entries).toHaveLength(3);

    // Branch with a new move from state1
    const branchMove: Move = { face: 'D', direction: 'CW' };
    const branchState = applyMove(state1, branchMove);
    const branchFrame = nextSpatialFrame(frame1, branchMove.face);

    history = appendMove(history, branchMove, branchState, branchFrame);

    expect(history.entries).toHaveLength(2);
    expect(history.cursorIndex).toBe(1);
    expect(history.entries[0]!.notation).toBe('U+');
    expect(history.entries[1]!.notation).toBe('D+');
    expect(canRedo(history)).toBe(false);
    expect(getCurrentSnapshot(history)).toEqual({
      state: branchState,
      frame: branchFrame,
    });
  });

  it('ARBITRARY_SCRUB_GATE: scrubs to valid indices (-1 <= index < entries.length)', () => {
    let history = createPlayHistory(initialState, initialFrame);
    history = appendMove(history, move1, state1, frame1);
    history = appendMove(history, move2, state2, frame2);
    history = appendMove(history, move3, state3, frame3);

    // Scrub to -1 (baseline)
    history = scrub(history, -1);
    expect(history.cursorIndex).toBe(-1);
    expect(getCurrentSnapshot(history)).toEqual({
      state: initialState,
      frame: initialFrame,
    });

    // Scrub directly to 1 (state2)
    history = scrub(history, 1);
    expect(history.cursorIndex).toBe(1);
    expect(getCurrentSnapshot(history)).toEqual({
      state: state2,
      frame: frame2,
    });

    // Scrub directly to 0 (state1)
    history = scrub(history, 0);
    expect(history.cursorIndex).toBe(0);
    expect(getCurrentSnapshot(history)).toEqual({
      state: state1,
      frame: frame1,
    });

    // Scrub to current index returns unchanged instance
    const same = scrub(history, 0);
    expect(same).toBe(history);

    // Scrub to top (2)
    history = scrub(history, 2);
    expect(history.cursorIndex).toBe(2);
    expect(getCurrentSnapshot(history)).toEqual({
      state: state3,
      frame: frame3,
    });
  });

  it('INVALID_SCRUB_GATE: rejects invalid scrub targets with RangeError', () => {
    let history = createPlayHistory(initialState, initialFrame);
    history = appendMove(history, move1, state1, frame1);

    expect(() => scrub(history, -2)).toThrow(RangeError);
    expect(() => scrub(history, 1)).toThrow(RangeError);
    expect(() => scrub(history, 2)).toThrow(RangeError);
    expect(() => scrub(history, NaN)).toThrow(RangeError);
    expect(() => scrub(history, 0.5)).toThrow(RangeError);
    expect(() => scrub(history, Infinity)).toThrow(RangeError);
  });

  it('RESET_TO_BASELINE_GATE: backToBaseline returns to -1 while preserving redoable entries', () => {
    let history = createPlayHistory(initialState, initialFrame);
    history = appendMove(history, move1, state1, frame1);
    history = appendMove(history, move2, state2, frame2);

    expect(history.cursorIndex).toBe(1);
    expect(getCurrentSnapshot(history)).toEqual({ state: state2, frame: frame2 });

    history = backToBaseline(history);

    expect(history.cursorIndex).toBe(-1);
    expect(history.entries).toHaveLength(2);
    expect(canRedo(history)).toBe(true);
    expect(getCurrentSnapshot(history)).toEqual({
      state: initialState,
      frame: initialFrame,
    });

    // Calling backToBaseline when already at baseline returns unchanged
    expect(backToBaseline(history)).toBe(history);
  });

  it('IMMUTABILITY_GATE: operations never mutate prior history state or entries array', () => {
    const h0 = createPlayHistory(initialState, initialFrame);
    const h0EntriesRef = h0.entries;

    const h1 = appendMove(h0, move1, state1, frame1);
    const h1EntriesRef = h1.entries;
    const entry0Ref = h1.entries[0]!;

    const h2 = appendMove(h1, move2, state2, frame2);
    const h2EntriesRef = h2.entries;
    const entry1Ref = h2.entries[1]!;

    // h0 remains pristine
    expect(h0.entries).toHaveLength(0);
    expect(h0.cursorIndex).toBe(-1);
    expect(h0.entries).toBe(h0EntriesRef);
    expect(h0.initialBaselineState).toEqual(initialState);
    expect(h0.initialBaselineFrame).toBe(initialFrame);

    // h1 remains pristine
    expect(h1.entries).toHaveLength(1);
    expect(h1.cursorIndex).toBe(0);
    expect(h1.entries).toBe(h1EntriesRef);
    expect(h1.entries[0]).toBe(entry0Ref);
    expect(h1.entries[0]).toEqual({
      move: move1,
      resultingState: state1,
      resultingFrame: frame1,
      notation: 'U+',
    });

    // Undo from h2 produces hUndo without mutating h2
    const hUndo = undo(h2);
    expect(h2.cursorIndex).toBe(1);
    expect(h2.entries).toHaveLength(2);
    expect(h2.entries).toBe(h2EntriesRef);
    expect(h2.entries[0]).toBe(entry0Ref);
    expect(h2.entries[1]).toBe(entry1Ref);
    expect(hUndo.cursorIndex).toBe(0);
    expect(hUndo.entries).toBe(h2.entries);

    // Redo from hUndo produces hRedo without mutating hUndo
    const hRedo = redo(hUndo);
    expect(hUndo.cursorIndex).toBe(0);
    expect(hRedo.cursorIndex).toBe(1);

    // Scrub from h2 produces hScrub without mutating h2
    const hScrub = scrub(h2, 0);
    expect(h2.cursorIndex).toBe(1);
    expect(hScrub.cursorIndex).toBe(0);

    // Back to baseline from h2 produces hBase without mutating h2
    const hBase = backToBaseline(h2);
    expect(h2.cursorIndex).toBe(1);
    expect(hBase.cursorIndex).toBe(-1);
    expect(hBase.entries).toHaveLength(2);
    expect(hBase.entries[0]).toBe(entry0Ref);
    expect(hBase.entries[1]).toBe(entry1Ref);
  });
});
