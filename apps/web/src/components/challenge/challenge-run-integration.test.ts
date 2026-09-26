import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SPATIAL_FRAME,
  SOLVED_GEAR_CUBE_STATE,
  applyMove,
  nextSpatialFrame,
  serializeLogicalState,
  type Move,
} from '@gearcube/core';
import {
  markChallengeRunAssisted,
  startChallengeRun,
  tryCompleteChallengeRun,
} from './challenge-run-controller.js';
import type { CertifiedChallenge } from './challenge-controller.js';
import {
  applyScrambleAndResetChallengeRun,
  installCertifiedChallengeRun,
  retryCertifiedChallengeRun,
} from './challenge-run-integration.js';
import {
  createInitialPlayApplicationState,
  setPlayInteractionMode,
  startPlayMove,
  stepPlayAnimation,
} from '../history/play-session.js';

const challengeMoves: readonly Move[] = [
  { face: 'U', direction: 'CW' },
  { face: 'R', direction: 'CW' },
];

function createCertifiedChallenge(): CertifiedChallenge {
  let state = SOLVED_GEAR_CUBE_STATE;
  let frame = DEFAULT_SPATIAL_FRAME;
  for (const move of challengeMoves) {
    state = applyMove(state, move);
    frame = nextSpatialFrame(frame, move.face);
  }

  return Object.freeze({
    difficulty: 'EASY',
    baseSeed: 'm7b-integration-test',
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

function createCompletedRun(challenge: CertifiedChallenge) {
  const active = markChallengeRunAssisted(startChallengeRun(challenge, 100, 4));
  return tryCompleteChallengeRun(active, {
    currentState: SOLVED_GEAR_CUBE_STATE,
    isPlayIdle: true,
    canonicalCommitSequence: 6,
    nowMs: 800,
  });
}

describe('Challenge run Play integration', () => {
  it('CERTIFIED_INSTALL_STARTS_RUN_GATE: installs the baseline before starting the run', () => {
    const challenge = createCertifiedChallenge();
    const app = completeDirectMove(
      createInitialPlayApplicationState(),
      { face: 'F', direction: 'CW' },
      1000
    );

    const installed = installCertifiedChallengeRun(
      app,
      { status: 'INACTIVE' },
      challenge,
      2000
    );

    expect(installed.status).toBe('INSTALLED');
    if (installed.status !== 'INSTALLED') return;
    expect(installed.nextApp).not.toBe(app);
    expect(installed.nextApp.history.entries).toHaveLength(0);
    expect(installed.nextApp.session.currentState).toBe(challenge.state);
    expect(installed.nextChallengeRun.challenge).toBe(challenge);
    expect(installed.nextChallengeRun.startedAtMs).toBe(2000);
  });

  it('BLOCKED_INSTALL_PRESERVES_APP_AND_RUN_GATE: busy Play does not install or start', () => {
    const challenge = createCertifiedChallenge();
    const priorApp = startPlayMove(
      createInitialPlayApplicationState(),
      { face: 'F', direction: 'CW' },
      1000
    );
    const priorRun = startChallengeRun(challenge, 2000, 0);

    const result = installCertifiedChallengeRun(priorApp, priorRun, challenge, 3000);

    expect(result.status).toBe('BLOCKED');
    expect(result.nextApp).toBe(priorApp);
    expect(result.nextChallengeRun).toBe(priorRun);
  });

  it('RUN_START_SEQUENCE_ORIGIN_GATE: starts from the installed app serial', () => {
    const challenge = createCertifiedChallenge();
    const priorApp = completeDirectMove(
      createInitialPlayApplicationState(),
      { face: 'F', direction: 'CCW' },
      1000
    );

    const result = installCertifiedChallengeRun(
      priorApp,
      { status: 'INACTIVE' },
      challenge,
      2000
    );

    expect(result.status).toBe('INSTALLED');
    if (result.status !== 'INSTALLED') return;
    expect(result.nextApp.canonicalCommitSequence).toBe(1);
    expect(result.nextChallengeRun.startCommitSequence).toBe(
      result.nextApp.canonicalCommitSequence
    );
  });

  it('RETRY_SAME_CERTIFICATE_GATE: preserves certificate identity and every contract field', () => {
    const challenge = createCertifiedChallenge();
    const completedRun = createCompletedRun(challenge);
    expect(completedRun.status).toBe('COMPLETED');
    if (completedRun.status !== 'COMPLETED') return;
    const originalCertificate = completedRun.challenge;
    const originalFields = {
      difficulty: originalCertificate.difficulty,
      baseSeed: originalCertificate.baseSeed,
      depth: originalCertificate.depth,
      state: originalCertificate.state,
      frame: originalCertificate.frame,
      stateKey: originalCertificate.stateKey,
    };

    const result = retryCertifiedChallengeRun(
      createInitialPlayApplicationState(),
      completedRun,
      900
    );

    expect(result.status).toBe('RETRIED');
    if (result.status !== 'RETRIED') return;
    expect(result.nextChallengeRun.challenge).toBe(originalCertificate);
    expect({
      difficulty: result.nextChallengeRun.challenge.difficulty,
      baseSeed: result.nextChallengeRun.challenge.baseSeed,
      depth: result.nextChallengeRun.challenge.depth,
      state: result.nextChallengeRun.challenge.state,
      frame: result.nextChallengeRun.challenge.frame,
      stateKey: result.nextChallengeRun.challenge.stateKey,
    }).toEqual(originalFields);
  });

  it('RETRY_EMPTY_HISTORY_GATE: reinstalls a fresh Play baseline', () => {
    const challenge = createCertifiedChallenge();
    const completedRun = createCompletedRun(challenge);
    const appWithHistory = completeDirectMove(
      createInitialPlayApplicationState(),
      { face: 'F', direction: 'CW' },
      1000
    );

    const result = retryCertifiedChallengeRun(appWithHistory, completedRun, 2000);

    expect(result.status).toBe('RETRIED');
    if (result.status !== 'RETRIED') return;
    expect(result.nextApp.history.entries).toHaveLength(0);
    expect(result.nextApp.history.cursorIndex).toBe(-1);
    expect(result.nextApp.session.currentState).toBe(challenge.state);
  });

  it('RETRY_RESETS_ASSISTANCE_GATE: retry starts a clean unassisted run at the new serial', () => {
    const challenge = createCertifiedChallenge();
    const completedRun = createCompletedRun(challenge);

    const result = retryCertifiedChallengeRun(
      createInitialPlayApplicationState(),
      completedRun,
      900
    );

    expect(result.status).toBe('RETRIED');
    if (result.status !== 'RETRIED') return;
    expect(result.nextChallengeRun.assisted).toBe(false);
    expect(result.nextChallengeRun.startedAtMs).toBe(900);
    expect(result.nextChallengeRun.startCommitSequence).toBe(
      result.nextApp.canonicalCommitSequence
    );
  });

  it('BLOCKED_RETRY_PRESERVES_COMPLETED_RESULT_GATE: busy Play leaves frozen result intact', () => {
    const challenge = createCertifiedChallenge();
    const completedRun = createCompletedRun(challenge);
    expect(completedRun.status).toBe('COMPLETED');
    if (completedRun.status !== 'COMPLETED') return;
    const busyApp = startPlayMove(
      createInitialPlayApplicationState(),
      { face: 'F', direction: 'CW' },
      1000
    );

    const result = retryCertifiedChallengeRun(busyApp, completedRun, 2000);

    expect(result.status).toBe('BLOCKED');
    expect(result.nextApp).toBe(busyApp);
    expect(result.nextChallengeRun).toBe(completedRun);
    expect(result.nextChallengeRun.status).toBe('COMPLETED');
    if (result.nextChallengeRun.status !== 'COMPLETED') return;
    expect(result.nextChallengeRun.result).toBe(completedRun.result);
  });

  it('SCRAMBLE_RESET_RUN_GATE: accepted Scramble abandons run performance', () => {
    const challenge = createCertifiedChallenge();
    const app = completeDirectMove(
      createInitialPlayApplicationState(),
      { face: 'F', direction: 'CW' },
      1000
    );
    const activeRun = startChallengeRun(challenge, 2000, 0);

    const result = applyScrambleAndResetChallengeRun(app, activeRun, 'm7b-scramble');

    expect(result.status).toBe('SCRAMBLED');
    if (result.status !== 'SCRAMBLED') return;
    expect(result.nextApp).not.toBe(app);
    expect(result.nextChallengeRun).toEqual({ status: 'INACTIVE' });
  });

  it('BLOCKED_SCRAMBLE_PRESERVES_RUN_GATE: busy Play causes no partial reset', () => {
    const challenge = createCertifiedChallenge();
    const busyApp = startPlayMove(
      createInitialPlayApplicationState(),
      { face: 'F', direction: 'CW' },
      1000
    );
    const activeRun = startChallengeRun(challenge, 2000, 0);

    const result = applyScrambleAndResetChallengeRun(
      busyApp,
      activeRun,
      'm7b-blocked-scramble'
    );

    expect(result.status).toBe('BLOCKED');
    expect(result.nextApp).toBe(busyApp);
    expect(result.nextChallengeRun).toBe(activeRun);
  });
});
