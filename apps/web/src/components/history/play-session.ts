/**
 * @file play-session.ts
 * @description Pure application-level orchestration connecting GearCubeSessionState and PlayHistoryState.
 */

import {
  type GearCubeSessionState,
  type TurnInteractionMode,
  createInitialSessionState,
  startMove,
  stepAnimation,
  isSessionIdle,
  setTurnInteractionMode,
} from '../cube/animation.js';
import {
  type PlayHistoryState,
  createPlayHistory,
  appendMove,
  undo,
  redo,
  scrub,
  backToBaseline,
  getCurrentSnapshot,
  canUndo,
  canRedo,
} from './history.js';
import {
  generateScramble,
  applyScrambleSequence,
  DEFAULT_SCRAMBLE_LENGTH,
} from './scramble.js';
import {
  materializeState,
  type Move,
} from '@gearcube/core';
import { placementToTransforms } from '@gearcube/kinematics';

/**
 * Combined application state encapsulating the active live interactive session and canonical play history.
 */
export interface PlayApplicationState {
  readonly session: GearCubeSessionState;
  readonly history: PlayHistoryState;
}

/**
 * Creates the initial application state rooted at the solved puzzle baseline.
 */
export function createInitialPlayApplicationState(): PlayApplicationState {
  const session = createInitialSessionState();
  const history = createPlayHistory(session.currentState, session.currentFrame);
  return { session, history };
}

/**
 * Initiates or advances a move within the interactive session.
 */
export function startPlayMove(
  app: PlayApplicationState,
  move: Move,
  nowMs: number,
  stepDurationMs?: number
): PlayApplicationState {
  const nextSession = startMove(app.session, move, nowMs, stepDurationMs);
  if (nextSession === app.session) {
    return app;
  }
  return {
    session: nextSession,
    history: app.history,
  };
}

/**
 * Advances the active animation frame. Automatically commits a history entry when a canonical full move completes.
 */
export function stepPlayAnimation(
  app: PlayApplicationState,
  nowMs: number
): PlayApplicationState {
  const prevStaged = app.session.stagedMove;
  if (!prevStaged || prevStaged.phase === 'HALF_TURN_LOCKED') {
    return app;
  }

  const nextSession = stepAnimation(app.session, nowMs);
  if (nextSession === app.session) {
    return app;
  }

  // Detect completion of a canonical 180-degree move
  const didCommitCanonicalMove =
    (prevStaged.phase === 'SECOND_HALF_ANIMATING' ||
      prevStaged.phase === 'DIRECT_FULL_ANIMATING') &&
    nextSession.stagedMove === null;

  if (didCommitCanonicalMove) {
    const nextHistory = appendMove(
      app.history,
      prevStaged.move,
      nextSession.currentState,
      nextSession.currentFrame
    );
    return {
      session: nextSession,
      history: nextHistory,
    };
  }

  return {
    session: nextSession,
    history: app.history,
  };
}

/**
 * Sets the turn interaction mode on the live session.
 */
export function setPlayInteractionMode(
  app: PlayApplicationState,
  mode: TurnInteractionMode
): PlayApplicationState {
  const nextSession = setTurnInteractionMode(app.session, mode);
  if (nextSession === app.session) {
    return app;
  }
  return {
    session: nextSession,
    history: app.history,
  };
}

/**
 * Restores the live session to match the snapshot at the current history cursor.
 */
function restoreSessionFromHistory(
  history: PlayHistoryState,
  currentInteractionMode: TurnInteractionMode
): GearCubeSessionState {
  const snapshot = getCurrentSnapshot(history);
  const view = materializeState(snapshot.state, snapshot.frame);
  const displayTransforms = placementToTransforms(view);

  return {
    currentState: snapshot.state,
    currentFrame: snapshot.frame,
    stagedMove: null,
    displayTransforms,
    interactionMode: currentInteractionMode,
  };
}

/**
 * Steps backward in history, restoring the live session to the previous canonical snapshot.
 * Blocked when the session is busy (animating or at midpoint lock).
 */
export function undoPlay(app: PlayApplicationState): PlayApplicationState {
  if (!isSessionIdle(app.session) || !canUndo(app.history)) {
    return app;
  }

  const nextHistory = undo(app.history);
  if (nextHistory === app.history) {
    return app;
  }

  const nextSession = restoreSessionFromHistory(
    nextHistory,
    app.session.interactionMode
  );

  return {
    session: nextSession,
    history: nextHistory,
  };
}

/**
 * Steps forward in history, restoring the live session to the next recorded canonical snapshot.
 * Blocked when the session is busy (animating or at midpoint lock).
 */
export function redoPlay(app: PlayApplicationState): PlayApplicationState {
  if (!isSessionIdle(app.session) || !canRedo(app.history)) {
    return app;
  }

  const nextHistory = redo(app.history);
  if (nextHistory === app.history) {
    return app;
  }

  const nextSession = restoreSessionFromHistory(
    nextHistory,
    app.session.interactionMode
  );

  return {
    session: nextSession,
    history: nextHistory,
  };
}

/**
 * Scrubs directly to an arbitrary history index (-1 to entries.length - 1).
 * Blocked when the session is busy (animating or at midpoint lock).
 */
export function scrubPlay(
  app: PlayApplicationState,
  targetIndex: number
): PlayApplicationState {
  if (!isSessionIdle(app.session)) {
    return app;
  }

  const nextHistory = scrub(app.history, targetIndex);
  if (nextHistory === app.history) {
    return app;
  }

  const nextSession = restoreSessionFromHistory(
    nextHistory,
    app.session.interactionMode
  );

  return {
    session: nextSession,
    history: nextHistory,
  };
}

/**
 * Returns the history cursor to baseline (-1), preserving future redo entries.
 * Blocked when the session is busy (animating or at midpoint lock).
 */
export function backToBaselinePlay(app: PlayApplicationState): PlayApplicationState {
  if (!isSessionIdle(app.session) || app.history.cursorIndex === -1) {
    return app;
  }

  const nextHistory = backToBaseline(app.history);
  if (nextHistory === app.history) {
    return app;
  }

  const nextSession = restoreSessionFromHistory(
    nextHistory,
    app.session.interactionMode
  );

  return {
    session: nextSession,
    history: nextHistory,
  };
}

/**
 * Applies a deterministic scramble to the live session, establishing a new initial baseline and clearing prior history.
 * Blocked when the session is busy (animating or at midpoint lock).
 */
export function applyScrambleToPlay(
  app: PlayApplicationState,
  seedOrMoves: string | readonly Move[],
  length: number = DEFAULT_SCRAMBLE_LENGTH
): PlayApplicationState {
  if (!isSessionIdle(app.session)) {
    return app;
  }

  const moves =
    typeof seedOrMoves === 'string'
      ? generateScramble(seedOrMoves, length)
      : seedOrMoves;

  const { state: scrambledState, frame: scrambledFrame } = applyScrambleSequence(
    app.session.currentState,
    app.session.currentFrame,
    moves
  );

  const view = materializeState(scrambledState, scrambledFrame);
  const displayTransforms = placementToTransforms(view);

  const nextSession: GearCubeSessionState = {
    currentState: scrambledState,
    currentFrame: scrambledFrame,
    stagedMove: null,
    displayTransforms,
    interactionMode: app.session.interactionMode,
  };

  const nextHistory = createPlayHistory(scrambledState, scrambledFrame);

  return {
    session: nextSession,
    history: nextHistory,
  };
}
