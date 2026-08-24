import { describe, expect, it } from 'vitest';
import {
  applyMove,
  SOLVED_GEAR_CUBE_STATE,
  serializeLogicalState,
  type Move,
} from '@gearcube/core';
import {
  canDispatchNextMove,
  canStepBackward,
  createPlaybackMetadata,
  getNextMoveToDispatch,
  recordMoveDispatch,
  recordMoveSettled,
  recordStepBackward,
  setPlayIntent,
} from './playback-controller.js';

describe('Phase 4E — Solution Playback Pure Controller', () => {
  const solved = SOLVED_GEAR_CUBE_STATE;
  const move1: Move = { face: 'U', direction: 'CW' };
  const move2: Move = { face: 'R', direction: 'CW' };
  const move3: Move = { face: 'F', direction: 'CCW' };
  const moves: Move[] = [move1, move2, move3];

  it('constructs immutable playback metadata with exact expectedStateKeys length = moves + 1', () => {
    const meta = createPlaybackMetadata(solved, moves, 5);
    expect(meta.solutionStartStateKey).toBe(serializeLogicalState(solved));
    expect(meta.moves).toEqual(moves);
    expect(meta.expectedStateKeys.length).toBe(moves.length + 1);
    expect(meta.expectedStateKeys[0]).toBe(serializeLogicalState(solved));
    expect(meta.playbackIndex).toBe(0);
    expect(meta.playbackStartHistoryCursor).toBe(5);
    expect(meta.completedMoveCount).toBe(0);
    expect(meta.playing).toBe(false);
    expect(meta.canonicalMoveInFlight).toBe(false);
    expect(meta.pauseAfterCurrentMove).toBe(false);

    // Verify key chain
    const state1 = applyMove(solved, move1);
    const state2 = applyMove(state1, move2);
    const state3 = applyMove(state2, move3);
    expect(meta.expectedStateKeys[1]).toBe(serializeLogicalState(state1));
    expect(meta.expectedStateKeys[2]).toBe(serializeLogicalState(state2));
    expect(meta.expectedStateKeys[3]).toBe(serializeLogicalState(state3));
  });

  it('handles play/pause intent transitions and pause-after-current when move in flight', () => {
    const meta = createPlaybackMetadata(solved, moves, 0);

    const playing = setPlayIntent(meta, true);
    expect(playing.playing).toBe(true);
    expect(playing.pauseAfterCurrentMove).toBe(false);

    const pausedIdle = setPlayIntent(playing, false);
    expect(pausedIdle.playing).toBe(false);

    const inFlight = recordMoveDispatch(playing);
    const pauseRequested = setPlayIntent(inFlight, false);
    expect(pauseRequested.playing).toBe(true);
    expect(pauseRequested.pauseAfterCurrentMove).toBe(true);
  });

  it('enforces dispatch state guard and dispatches exact next move', () => {
    const meta = createPlaybackMetadata(solved, moves, 0);
    const validKey = meta.expectedStateKeys[0]!;
    const invalidKey = 'C:1|X:0.0|Y:0.0|Z:0.0';

    expect(canDispatchNextMove(meta, validKey)).toBe(true);
    expect(canDispatchNextMove(meta, invalidKey)).toBe(false);
    expect(getNextMoveToDispatch(meta)).toEqual(move1);

    const inFlight = recordMoveDispatch(meta);
    expect(canDispatchNextMove(inFlight, validKey)).toBe(false);
  });

  it('settles canonical move, advances counters, and stops playing on pause-after-current or completion', () => {
    const meta = createPlaybackMetadata(solved, moves, 0);
    const playing = setPlayIntent(meta, true);
    const inFlight = recordMoveDispatch(playing);

    const state1 = applyMove(solved, move1);
    const state1Key = serializeLogicalState(state1);

    const settle1 = recordMoveSettled(inFlight, state1Key);
    expect(settle1.status).toBe('SETTLED');
    if (settle1.status === 'SETTLED') {
      expect(settle1.next.playbackIndex).toBe(1);
      expect(settle1.next.completedMoveCount).toBe(1);
      expect(settle1.next.canonicalMoveInFlight).toBe(false);
      expect(settle1.next.playing).toBe(true);

      // Now request pause during second move
      const inFlight2 = recordMoveDispatch(settle1.next);
      const pauseDuring = setPlayIntent(inFlight2, false);
      expect(pauseDuring.pauseAfterCurrentMove).toBe(true);

      const state2 = applyMove(state1, move2);
      const settle2 = recordMoveSettled(pauseDuring, serializeLogicalState(state2));
      expect(settle2.status).toBe('SETTLED');
      if (settle2.status === 'SETTLED') {
        expect(settle2.next.playbackIndex).toBe(2);
        expect(settle2.next.completedMoveCount).toBe(2);
        expect(settle2.next.playing).toBe(false); // Paused after move 2
        expect(settle2.next.pauseAfterCurrentMove).toBe(false);
      }
    }
  });

  it('rejects settlement on state key mismatch', () => {
    const meta = createPlaybackMetadata(solved, moves, 0);
    const inFlight = recordMoveDispatch(meta);
    const wrongKey = 'WRONG_KEY';

    const settleResult = recordMoveSettled(inFlight, wrongKey);
    expect(settleResult.status).toBe('MISMATCH');
  });

  it('enforces Step Backward preconditions and prohibits crossing playbackStartHistoryCursor', () => {
    const meta = createPlaybackMetadata(solved, moves, 2);
    const state1 = applyMove(solved, move1);
    const state1Key = serializeLogicalState(state1);

    // Initial state: completedMoveCount is 0, cannot step back
    expect(canStepBackward(meta, 2, meta.expectedStateKeys[0]!)).toBe(false);

    // After move 1 settles at cursor 3
    const settled1Result = recordMoveSettled(recordMoveDispatch(meta), state1Key);
    expect(settled1Result.status).toBe('SETTLED');
    if (settled1Result.status === 'SETTLED') {
      const settled1 = settled1Result.next;
      // Cannot step back if cursor <= playbackStartHistoryCursor (2)
      expect(canStepBackward(settled1, 2, state1Key)).toBe(false);
      // Can step back if cursor is 3 and idle
      expect(canStepBackward(settled1, 3, state1Key)).toBe(true);

      // Execute Step Backward
      const backResult = recordStepBackward(settled1, meta.expectedStateKeys[0]!);
      expect(backResult.status).toBe('STEPPED_BACK');
      if (backResult.status === 'STEPPED_BACK') {
        expect(backResult.next.playbackIndex).toBe(0);
        expect(backResult.next.completedMoveCount).toBe(0);
        expect(getNextMoveToDispatch(backResult.next)).toEqual(move1);
      }

      // Step backward with mismatch
      const badBack = recordStepBackward(settled1, 'CORRUPT_KEY');
      expect(badBack.status).toBe('MISMATCH');
    }
  });

  it('stops automatic playing upon completing all solution moves', () => {
    const oneMove = [move1];
    const meta = createPlaybackMetadata(solved, oneMove, 0);
    const playing = setPlayIntent(meta, true);
    const inFlight = recordMoveDispatch(playing);

    const state1Key = serializeLogicalState(applyMove(solved, move1));
    const settle = recordMoveSettled(inFlight, state1Key);
    expect(settle.status).toBe('SETTLED');
    if (settle.status === 'SETTLED') {
      expect(settle.next.playbackIndex).toBe(1);
      expect(settle.next.completedMoveCount).toBe(1);
      expect(settle.next.playing).toBe(false); // Automatically stopped
      expect(getNextMoveToDispatch(settle.next)).toBeNull();
    }
  });

  it('maintains strict immutability across transitions', () => {
    const initial = Object.freeze(createPlaybackMetadata(solved, moves, 0));
    const playing = Object.freeze(setPlayIntent(initial, true));
    const inFlight = Object.freeze(recordMoveDispatch(playing));

    expect(initial.playing).toBe(false);
    expect(playing.playing).toBe(true);
    expect(playing.canonicalMoveInFlight).toBe(false);
    expect(inFlight.canonicalMoveInFlight).toBe(true);
  });
});
