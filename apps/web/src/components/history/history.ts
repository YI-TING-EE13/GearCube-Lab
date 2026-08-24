/**
 * @file history.ts
 * @description Pure application-level move history data structures and transition functions for GearCube Lab.
 */

import type { GearCubeState, Move, SpatialFrame } from '@gearcube/core';

/**
 * An immutable record of a committed canonical move and its resulting state and spatial frame.
 */
export interface HistoryEntry {
  readonly move: Move;
  readonly resultingState: GearCubeState;
  readonly resultingFrame: SpatialFrame;
  readonly notation: string;
}

/**
 * Immutable application play history state.
 * cursorIndex === -1 represents initialBaselineState + initialBaselineFrame.
 * cursorIndex >= 0 represents entries[cursorIndex].
 */
export interface PlayHistoryState {
  readonly initialBaselineState: GearCubeState;
  readonly initialBaselineFrame: SpatialFrame;
  readonly entries: readonly HistoryEntry[];
  readonly cursorIndex: number;
}

/**
 * Formats a Move into canonical notation (e.g., 'U+' for CW, 'U-' for CCW).
 */
export function formatMoveNotation(move: Move): string {
  return `${move.face}${move.direction === 'CW' ? '+' : '-'}`;
}

/**
 * Creates a fresh PlayHistoryState rooted at the given baseline state and spatial frame.
 */
export function createPlayHistory(
  initialBaselineState: GearCubeState,
  initialBaselineFrame: SpatialFrame
): PlayHistoryState {
  return {
    initialBaselineState,
    initialBaselineFrame,
    entries: [],
    cursorIndex: -1,
  };
}

/**
 * Appends a committed canonical move to history, truncating any subsequent redo branch.
 */
export function appendMove(
  history: PlayHistoryState,
  move: Move,
  resultingState: GearCubeState,
  resultingFrame: SpatialFrame
): PlayHistoryState {
  const truncatedEntries = history.entries.slice(0, history.cursorIndex + 1);
  const newEntry: HistoryEntry = {
    move,
    resultingState,
    resultingFrame,
    notation: formatMoveNotation(move),
  };

  return {
    initialBaselineState: history.initialBaselineState,
    initialBaselineFrame: history.initialBaselineFrame,
    entries: [...truncatedEntries, newEntry],
    cursorIndex: truncatedEntries.length,
  };
}

/**
 * Returns true if an undo operation is valid from the current history position.
 */
export function canUndo(history: PlayHistoryState): boolean {
  return history.cursorIndex > -1;
}

/**
 * Returns true if a redo operation is valid from the current history position.
 */
export function canRedo(history: PlayHistoryState): boolean {
  return history.cursorIndex < history.entries.length - 1;
}

/**
 * Steps backward in history. Returns the unchanged history if already at the baseline.
 */
export function undo(history: PlayHistoryState): PlayHistoryState {
  if (!canUndo(history)) {
    return history;
  }
  return {
    ...history,
    cursorIndex: history.cursorIndex - 1,
  };
}

/**
 * Steps forward in history. Returns the unchanged history if already at the latest entry.
 */
export function redo(history: PlayHistoryState): PlayHistoryState {
  if (!canRedo(history)) {
    return history;
  }
  return {
    ...history,
    cursorIndex: history.cursorIndex + 1,
  };
}

/**
 * Scrubs directly to an arbitrary history index (-1 <= targetIndex < entries.length).
 * Throws RangeError if targetIndex is out of range or not an integer.
 */
export function scrub(history: PlayHistoryState, targetIndex: number): PlayHistoryState {
  if (!Number.isInteger(targetIndex) || targetIndex < -1 || targetIndex >= history.entries.length) {
    throw new RangeError(
      `Invalid scrub targetIndex ${targetIndex}. Allowed range: -1 to ${history.entries.length - 1}`
    );
  }
  if (targetIndex === history.cursorIndex) {
    return history;
  }
  return {
    ...history,
    cursorIndex: targetIndex,
  };
}

/**
 * Returns the history cursor to the initial baseline (-1), preserving existing entries for redo.
 */
export function backToBaseline(history: PlayHistoryState): PlayHistoryState {
  if (history.cursorIndex === -1) {
    return history;
  }
  return {
    ...history,
    cursorIndex: -1,
  };
}

/**
 * Returns the canonical GearCubeState and SpatialFrame corresponding to the current history cursor.
 */
export function getCurrentSnapshot(history: PlayHistoryState): {
  state: GearCubeState;
  frame: SpatialFrame;
} {
  if (history.cursorIndex === -1) {
    return {
      state: history.initialBaselineState,
      frame: history.initialBaselineFrame,
    };
  }
  const entry = history.entries[history.cursorIndex];
  if (!entry) {
    throw new Error(`Corrupt history state: cursorIndex ${history.cursorIndex} not found in entries`);
  }
  return {
    state: entry.resultingState,
    frame: entry.resultingFrame,
  };
}
