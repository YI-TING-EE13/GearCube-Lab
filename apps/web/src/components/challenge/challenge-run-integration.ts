import type { PlayApplicationState } from '../history/play-session.js';
import {
  applyCertifiedChallengeToPlay,
  applyScrambleToPlay,
} from '../history/play-session.js';
import type { CertifiedChallenge } from './challenge-controller.js';
import {
  resetChallengeRun,
  retryChallengeRun,
  startChallengeRun,
  type ActiveChallengeRunState,
  type ChallengeRunState,
  type InactiveChallengeRunState,
} from './challenge-run-controller.js';

export interface BlockedChallengeRunComposition {
  readonly status: 'BLOCKED';
  readonly nextApp: PlayApplicationState;
  readonly nextChallengeRun: ChallengeRunState;
}

export interface InstalledChallengeRunComposition {
  readonly status: 'INSTALLED';
  readonly nextApp: PlayApplicationState;
  readonly nextChallengeRun: ActiveChallengeRunState;
}

export type InstallCertifiedChallengeRunResult =
  | BlockedChallengeRunComposition
  | InstalledChallengeRunComposition;

/**
 * Installs the accepted certificate as a fresh Play baseline before creating
 * its run. A busy Play session returns both original values unchanged.
 */
export function installCertifiedChallengeRun(
  app: PlayApplicationState,
  challengeRun: ChallengeRunState,
  challenge: CertifiedChallenge,
  nowMs: number
): InstallCertifiedChallengeRunResult {
  const nextApp = applyCertifiedChallengeToPlay(
    app,
    challenge.state,
    challenge.frame
  );
  if (nextApp === app) {
    return {
      status: 'BLOCKED',
      nextApp: app,
      nextChallengeRun: challengeRun,
    };
  }

  return {
    status: 'INSTALLED',
    nextApp,
    nextChallengeRun: startChallengeRun(
      challenge,
      nowMs,
      nextApp.canonicalCommitSequence
    ),
  };
}

export type RetryCertifiedChallengeRunResult =
  | BlockedChallengeRunComposition
  | {
      readonly status: 'RETRIED';
      readonly nextApp: PlayApplicationState;
      readonly nextChallengeRun: ActiveChallengeRunState;
    };

/**
 * Reinstalls the exact certificate retained by an active or completed run.
 * Play history becomes a fresh baseline and the returned run starts with a
 * new time/serial origin and no assistance. An unavailable or blocked retry
 * leaves the original app and result untouched.
 */
export function retryCertifiedChallengeRun(
  app: PlayApplicationState,
  challengeRun: ChallengeRunState,
  nowMs: number
): RetryCertifiedChallengeRunResult {
  if (challengeRun.status === 'INACTIVE') {
    return {
      status: 'BLOCKED',
      nextApp: app,
      nextChallengeRun: challengeRun,
    };
  }

  const nextApp = applyCertifiedChallengeToPlay(
    app,
    challengeRun.challenge.state,
    challengeRun.challenge.frame
  );
  if (nextApp === app) {
    return {
      status: 'BLOCKED',
      nextApp: app,
      nextChallengeRun: challengeRun,
    };
  }

  const nextChallengeRun = retryChallengeRun(
    challengeRun,
    nowMs,
    nextApp.canonicalCommitSequence
  );
  if (nextChallengeRun.status !== 'ACTIVE') {
    return {
      status: 'BLOCKED',
      nextApp: app,
      nextChallengeRun: challengeRun,
    };
  }

  return {
    status: 'RETRIED',
    nextApp,
    nextChallengeRun,
  };
}

export type ApplyScrambleAndResetChallengeRunResult =
  | {
      readonly status: 'SCRAMBLED';
      readonly nextApp: PlayApplicationState;
      readonly nextChallengeRun: InactiveChallengeRunState;
    }
  | BlockedChallengeRunComposition;

/**
 * Applies the ordinary current-relative Scramble and resets performance only
 * when Play accepted the new baseline. This function performs no side effects.
 */
export function applyScrambleAndResetChallengeRun(
  app: PlayApplicationState,
  challengeRun: ChallengeRunState,
  seed: string
): ApplyScrambleAndResetChallengeRunResult {
  const nextApp = applyScrambleToPlay(app, seed);
  if (nextApp === app) {
    return {
      status: 'BLOCKED',
      nextApp: app,
      nextChallengeRun: challengeRun,
    };
  }

  return {
    status: 'SCRAMBLED',
    nextApp,
    nextChallengeRun: resetChallengeRun(challengeRun),
  };
}
