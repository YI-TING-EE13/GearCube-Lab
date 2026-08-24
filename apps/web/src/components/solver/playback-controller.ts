import {
  applyMove,
  serializeLogicalState,
  type GearCubeState,
  type Move,
} from '@gearcube/core';

export interface SolutionPlaybackMetadata {
  readonly solutionStartStateKey: string;
  readonly moves: readonly Move[];
  readonly expectedStateKeys: readonly string[];
  readonly playbackIndex: number;
  readonly playbackStartHistoryCursor: number;
  readonly completedMoveCount: number;
  readonly playing: boolean;
  readonly canonicalMoveInFlight: boolean;
  readonly pauseAfterCurrentMove: boolean;
}

/**
 * Pure construction of immutable playback metadata from a start state, solution moves, and history baseline.
 */
export function createPlaybackMetadata(
  startState: GearCubeState,
  moves: readonly Move[],
  playbackStartHistoryCursor: number
): SolutionPlaybackMetadata {
  const startKey = serializeLogicalState(startState);
  const expectedStateKeys: string[] = [startKey];
  let current = startState;

  for (const move of moves) {
    current = applyMove(current, move);
    expectedStateKeys.push(serializeLogicalState(current));
  }

  return {
    solutionStartStateKey: startKey,
    moves: Object.freeze([...moves]),
    expectedStateKeys: Object.freeze(expectedStateKeys),
    playbackIndex: 0,
    playbackStartHistoryCursor,
    completedMoveCount: 0,
    playing: false,
    canonicalMoveInFlight: false,
    pauseAfterCurrentMove: false,
  };
}

/**
 * Pure transition updating play/pause intent.
 */
export function setPlayIntent(
  meta: SolutionPlaybackMetadata,
  playing: boolean
): SolutionPlaybackMetadata {
  if (playing) {
    if (meta.playbackIndex >= meta.moves.length) {
      return meta;
    }
    return {
      ...meta,
      playing: true,
      pauseAfterCurrentMove: false,
    };
  }

  // Requesting pause
  if (meta.canonicalMoveInFlight) {
    return {
      ...meta,
      pauseAfterCurrentMove: true,
    };
  }

  return {
    ...meta,
    playing: false,
    pauseAfterCurrentMove: false,
  };
}

/**
 * Checks if the next solver move can be dispatched against the current logical state key.
 */
export function canDispatchNextMove(
  meta: SolutionPlaybackMetadata,
  currentLogicalStateKey: string
): boolean {
  if (meta.playbackIndex >= meta.moves.length) {
    return false;
  }
  if (meta.canonicalMoveInFlight) {
    return false;
  }
  const expectedKey = meta.expectedStateKeys[meta.playbackIndex];
  return expectedKey !== undefined && currentLogicalStateKey === expectedKey;
}

/**
 * Returns the next solver move to dispatch.
 */
export function getNextMoveToDispatch(
  meta: SolutionPlaybackMetadata
): Move | null {
  if (meta.playbackIndex >= meta.moves.length) {
    return null;
  }
  return meta.moves[meta.playbackIndex] ?? null;
}

/**
 * Pure transition recording that a solver move has been dispatched to the animation session.
 */
export function recordMoveDispatch(
  meta: SolutionPlaybackMetadata
): SolutionPlaybackMetadata {
  return {
    ...meta,
    canonicalMoveInFlight: true,
  };
}

export type MoveSettlementResult =
  | { readonly status: 'SETTLED'; readonly next: SolutionPlaybackMetadata }
  | { readonly status: 'MISMATCH' };

/**
 * Pure transition recording the settlement of a dispatched move back to session IDLE.
 * Enforces strict prefix alignment against expectedStateKeys[k + 1].
 */
export function recordMoveSettled(
  meta: SolutionPlaybackMetadata,
  currentLogicalStateKey: string
): MoveSettlementResult {
  const expectedNextKey = meta.expectedStateKeys[meta.playbackIndex + 1];
  if (!expectedNextKey || currentLogicalStateKey !== expectedNextKey) {
    return { status: 'MISMATCH' };
  }

  const nextIndex = meta.playbackIndex + 1;
  const isComplete = nextIndex >= meta.moves.length;
  const nextPlaying =
    meta.pauseAfterCurrentMove || isComplete ? false : meta.playing;

  return {
    status: 'SETTLED',
    next: {
      ...meta,
      playbackIndex: nextIndex,
      completedMoveCount: meta.completedMoveCount + 1,
      canonicalMoveInFlight: false,
      playing: nextPlaying,
      pauseAfterCurrentMove: false,
    },
  };
}

/**
 * Verifies if Step Backward is valid from current history and puzzle state.
 */
export function canStepBackward(
  meta: SolutionPlaybackMetadata,
  currentHistoryCursor: number,
  currentLogicalStateKey: string
): boolean {
  if (meta.playing || meta.canonicalMoveInFlight) {
    return false;
  }
  if (meta.completedMoveCount <= 0 || meta.playbackIndex <= 0) {
    return false;
  }
  if (currentHistoryCursor <= meta.playbackStartHistoryCursor) {
    return false;
  }
  const expectedKey = meta.expectedStateKeys[meta.playbackIndex];
  return expectedKey !== undefined && currentLogicalStateKey === expectedKey;
}

export type StepBackwardResult =
  | { readonly status: 'STEPPED_BACK'; readonly next: SolutionPlaybackMetadata }
  | { readonly status: 'MISMATCH' };

/**
 * Pure transition recording a Step Backward after an undo operation.
 */
export function recordStepBackward(
  meta: SolutionPlaybackMetadata,
  resultingLogicalStateKey: string
): StepBackwardResult {
  const expectedPriorKey = meta.expectedStateKeys[meta.playbackIndex - 1];
  if (!expectedPriorKey || resultingLogicalStateKey !== expectedPriorKey) {
    return { status: 'MISMATCH' };
  }

  return {
    status: 'STEPPED_BACK',
    next: {
      ...meta,
      playbackIndex: meta.playbackIndex - 1,
      completedMoveCount: meta.completedMoveCount - 1,
      playing: false,
      canonicalMoveInFlight: false,
      pauseAfterCurrentMove: false,
    },
  };
}
