import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPATIAL_FRAME,
  SOLVED_GEAR_CUBE_STATE,
  applyMove,
  isSolved,
  nextSpatialFrame,
  serializeLogicalState,
  type Move,
} from '@gearcube/core';
import { createChallengeCandidate } from './challenge.js';
import {
  acceptChallenge,
  beginChallenge,
  decideChallengeCertification,
  INITIAL_CHALLENGE_GENERATION_STATE,
  type CertifiedChallenge,
} from './challenge-controller.js';
import {
  getChallengeRunMoveCount,
  INITIAL_CHALLENGE_RUN_STATE,
  markChallengeRunAssisted,
  resetChallengeRun,
  retryChallengeRun,
  startChallengeRun,
  tryCompleteChallengeRun,
} from './challenge-run-controller.js';
import {
  applyCertifiedChallengeToPlay,
  backToBaselinePlay,
  createInitialPlayApplicationState,
  setPlayInteractionMode,
  startPlayMove,
  stepPlayAnimation,
  undoPlay,
} from '../history/play-session.js';
import { isSessionIdle } from '../cube/animation.js';

function createCertifiedChallenge() {
  const candidate = createChallengeCandidate('run-controller-test', 'EASY', 0);
  const active = beginChallenge(
    INITIAL_CHALLENGE_GENERATION_STATE,
    'run-controller-test-request',
    candidate
  );
  const decision = decideChallengeCertification(
    active,
    'run-controller-test-request',
    3
  );
  if (decision.status !== 'ACCEPT') {
    throw new Error('Test fixture depth must be accepted for EASY');
  }
  const accepted = acceptChallenge(active, decision.result);
  if (accepted.status !== 'ACCEPTED') {
    throw new Error(`Test fixture challenge must be accepted, got ${accepted.status}`);
  }
  return accepted.result;
}

function createTwoMoveCertifiedChallenge(): CertifiedChallenge {
  const scrambleMoves: readonly Move[] = [
    { face: 'U', direction: 'CW' },
    { face: 'R', direction: 'CW' },
  ];
  let state = SOLVED_GEAR_CUBE_STATE;
  let frame = DEFAULT_SPATIAL_FRAME;
  for (const move of scrambleMoves) {
    state = applyMove(state, move);
    frame = nextSpatialFrame(frame, move.face);
  }

  return Object.freeze({
    difficulty: 'EASY',
    baseSeed: 'play-run-integration',
    attemptIndex: 0,
    samplingLength: 2,
    depth: 2,
    state,
    frame,
    stateKey: serializeLogicalState(state),
  });
}

function completeDirectMove(
  app: ReturnType<typeof createInitialPlayApplicationState>,
  move: Move,
  startMs: number
) {
  const direct = setPlayInteractionMode(app, 'DIRECT_180');
  const started = startPlayMove(direct, move, startMs, 400);
  return stepPlayAnimation(started, startMs + 400);
}

describe('Challenge run domain controller', () => {
  it('RUN_START_GATE: stores the exact certificate and validated run baseline', () => {
    const challenge = createCertifiedChallenge();

    const state = startChallengeRun(challenge, 123.5, 10);

    expect(state).toEqual({
      status: 'ACTIVE',
      challenge,
      startedAtMs: 123.5,
      startCommitSequence: 10,
      assisted: false,
    });
    expect(state.challenge).toBe(challenge);
    expect(() => startChallengeRun(challenge, Number.NaN, 0)).toThrow(RangeError);
    expect(() => startChallengeRun(challenge, 10, -1)).toThrow(RangeError);
    expect(() => startChallengeRun(challenge, 10, 1.5)).toThrow(RangeError);
  });

  it('COMMITTED_MOVE_COUNT_GATE: derives moves from the monotonic sequence delta', () => {
    const state = startChallengeRun(createCertifiedChallenge(), 123.5, 10);

    expect(getChallengeRunMoveCount(state, 12)).toBe(2);
  });

  it('COMMITTED_MOVE_COUNT_GATE rejects sequence regression and invalid serials', () => {
    const state = startChallengeRun(createCertifiedChallenge(), 123.5, 10);

    expect(() => getChallengeRunMoveCount(state, 9)).toThrow(RangeError);
    expect(() => getChallengeRunMoveCount(state, -1)).toThrow(RangeError);
    expect(() => getChallengeRunMoveCount(state, Number.MAX_SAFE_INTEGER + 1)).toThrow(
      RangeError
    );
  });

  it('ASSISTANCE_MARKING_GATE: assistance is monotonic and idempotent', () => {
    const inactive = INITIAL_CHALLENGE_RUN_STATE;
    expect(markChallengeRunAssisted(inactive)).toBe(inactive);

    const active = startChallengeRun(createCertifiedChallenge(), 123.5, 10);
    const assisted = markChallengeRunAssisted(active);
    expect(assisted.status).toBe('ACTIVE');
    if (assisted.status !== 'ACTIVE') return;
    expect(assisted.assisted).toBe(true);
    expect(markChallengeRunAssisted(assisted)).toBe(assisted);
  });

  it('OPTIMAL_COMPLETION_GATE: solved idle run freezes exact optimal metrics once', () => {
    const challenge = createCertifiedChallenge();
    const active = startChallengeRun(challenge, 123.5, 10);

    const completed = tryCompleteChallengeRun(active, {
      currentState: SOLVED_GEAR_CUBE_STATE,
      isPlayIdle: true,
      canonicalCommitSequence: 13,
      nowMs: 423.5,
    });

    expect(completed.status).toBe('COMPLETED');
    if (completed.status !== 'COMPLETED') return;
    expect(completed.challenge).toBe(challenge);
    expect(completed.result).toEqual({
      difficulty: 'EASY',
      baseSeed: 'run-controller-test',
      playerMoves: 3,
      optimalMoves: 3,
      movesOverOptimal: 0,
      efficiencyPercent: 100,
      startedAtMs: 123.5,
      completedAtMs: 423.5,
      elapsedMs: 300,
      solvedOptimally: true,
      assisted: false,
    });
  });

  it('SUBOPTIMAL_COMPLETION_GATE: solved run records exact positive move delta', () => {
    const active = startChallengeRun(createCertifiedChallenge(), 100, 20);

    const completed = tryCompleteChallengeRun(active, {
      currentState: SOLVED_GEAR_CUBE_STATE,
      isPlayIdle: true,
      canonicalCommitSequence: 25,
      nowMs: 12125.75,
    });

    expect(completed.status).toBe('COMPLETED');
    if (completed.status !== 'COMPLETED') return;
    expect(completed.result.playerMoves).toBe(5);
    expect(completed.result.optimalMoves).toBe(3);
    expect(completed.result.movesOverOptimal).toBe(2);
    expect(completed.result.efficiencyPercent).toBe(60);
    expect(completed.result.solvedOptimally).toBe(false);
    expect(completed.result.elapsedMs).toBe(12025.75);
  });

  it('EFFICIENCY_GATE: stores the unrounded metric formula', () => {
    const active = startChallengeRun(createCertifiedChallenge(), 100, 0);
    const completed = tryCompleteChallengeRun(active, {
      currentState: SOLVED_GEAR_CUBE_STATE,
      isPlayIdle: true,
      canonicalCommitSequence: 7,
      nowMs: 200,
    });

    expect(completed.status).toBe('COMPLETED');
    if (completed.status !== 'COMPLETED') return;
    expect(completed.result.efficiencyPercent).toBe(300 / 7);
  });

  it('COMPLETION_IDEMPOTENCE_GATE: non-eligible states stay unchanged and completion freezes', () => {
    const active = startChallengeRun(createCertifiedChallenge(), 100, 0);
    const unsolved = applyMove(SOLVED_GEAR_CUBE_STATE, {
      face: 'U',
      direction: 'CW',
    });

    expect(
      tryCompleteChallengeRun(active, {
        currentState: SOLVED_GEAR_CUBE_STATE,
        isPlayIdle: false,
        canonicalCommitSequence: 3,
        nowMs: 200,
      })
    ).toBe(active);
    expect(
      tryCompleteChallengeRun(active, {
        currentState: unsolved,
        isPlayIdle: true,
        canonicalCommitSequence: 3,
        nowMs: 200,
      })
    ).toBe(active);

    const completed = tryCompleteChallengeRun(active, {
      currentState: SOLVED_GEAR_CUBE_STATE,
      isPlayIdle: true,
      canonicalCommitSequence: 3,
      nowMs: 200,
    });
    const duplicate = tryCompleteChallengeRun(completed, {
      currentState: SOLVED_GEAR_CUBE_STATE,
      isPlayIdle: true,
      canonicalCommitSequence: Number.NaN,
      nowMs: Number.NaN,
    });
    expect(duplicate).toBe(completed);
    expect(markChallengeRunAssisted(completed)).toBe(completed);
  });

  it('COMPLETION_INVARIANT_GATE: invalid sequence, time, or below-optimal score fails explicitly', () => {
    const challenge = createCertifiedChallenge();
    const active = startChallengeRun(challenge, 100, 10);
    const completion = (canonicalCommitSequence: number, nowMs: number) =>
      tryCompleteChallengeRun(active, {
        currentState: SOLVED_GEAR_CUBE_STATE,
        isPlayIdle: true,
        canonicalCommitSequence,
        nowMs,
      });

    expect(() => completion(9, 200)).toThrow(RangeError);
    expect(() => completion(10, 200)).toThrow(RangeError);
    expect(() => completion(11, 200)).toThrow(RangeError);
    expect(() => completion(13, 99)).toThrow(RangeError);
    expect(() => completion(13, Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it('RETRY_RESET_GATE: retry reuses the certificate with a new time and serial origin', () => {
    const challenge = createCertifiedChallenge();
    const active = markChallengeRunAssisted(
      startChallengeRun(challenge, 100, 10)
    );
    const completed = tryCompleteChallengeRun(active, {
      currentState: SOLVED_GEAR_CUBE_STATE,
      isPlayIdle: true,
      canonicalCommitSequence: 15,
      nowMs: 600,
    });

    const retried = retryChallengeRun(completed, 900, 20);

    expect(retried.status).toBe('ACTIVE');
    if (retried.status !== 'ACTIVE') return;
    expect(retried.challenge).toBe(challenge);
    expect(retried.challenge.depth).toBe(challenge.depth);
    expect(retried.challenge.baseSeed).toBe(challenge.baseSeed);
    expect(retried.challenge.state).toBe(challenge.state);
    expect(retried.challenge.frame).toBe(challenge.frame);
    expect(retried.startedAtMs).toBe(900);
    expect(retried.startCommitSequence).toBe(20);
    expect(retried.assisted).toBe(false);
    expect(getChallengeRunMoveCount(retried, 20)).toBe(0);
  });

  it('SCRAMBLE_RESET_GATE: resetting or abandoning a run returns INACTIVE', () => {
    const active = startChallengeRun(createCertifiedChallenge(), 100, 10);

    expect(resetChallengeRun(active)).toBe(INITIAL_CHALLENGE_RUN_STATE);
    expect(resetChallengeRun(INITIAL_CHALLENGE_RUN_STATE)).toBe(
      INITIAL_CHALLENGE_RUN_STATE
    );
  });

  it('UNDO_DOES_NOT_ERASE_MOVE_COUNT_GATE: real Play branch accounting survives navigation and completes', () => {
    const challenge = createTwoMoveCertifiedChallenge();
    let play = completeDirectMove(
      createInitialPlayApplicationState(),
      { face: 'F', direction: 'CCW' },
      1000
    );
    const preChallengeSequence = play.canonicalCommitSequence;
    play = applyCertifiedChallengeToPlay(play, challenge.state, challenge.frame);
    const active = startChallengeRun(
      challenge,
      2000,
      play.canonicalCommitSequence
    );

    play = completeDirectMove(play, { face: 'R', direction: 'CW' }, 3000);
    play = undoPlay(play);
    expect(play.canonicalCommitSequence).toBe(preChallengeSequence + 1);
    play = completeDirectMove(play, { face: 'F', direction: 'CCW' }, 4000);
    expect(play.history.entries).toHaveLength(1);
    expect(play.canonicalCommitSequence).toBe(preChallengeSequence + 2);
    expect(
      getChallengeRunMoveCount(active, play.canonicalCommitSequence)
    ).toBe(2);

    play = backToBaselinePlay(play);
    play = completeDirectMove(play, { face: 'R', direction: 'CCW' }, 5000);
    play = completeDirectMove(play, { face: 'U', direction: 'CCW' }, 6000);
    expect(isSessionIdle(play.session)).toBe(true);
    expect(isSolved(play.session.currentState)).toBe(true);

    const completed = tryCompleteChallengeRun(active, {
      currentState: play.session.currentState,
      isPlayIdle: isSessionIdle(play.session),
      canonicalCommitSequence: play.canonicalCommitSequence,
      nowMs: 7000,
    });
    expect(completed.status).toBe('COMPLETED');
    if (completed.status !== 'COMPLETED') return;
    expect(completed.result.playerMoves).toBe(4);
    expect(completed.result.optimalMoves).toBe(2);
    expect(completed.result.movesOverOptimal).toBe(2);
    expect(completed.result.efficiencyPercent).toBe(50);
  });
});
