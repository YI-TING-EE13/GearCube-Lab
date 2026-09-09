import type { GearCubeState, SpatialFrame } from '@gearcube/core';
import {
  CHALLENGE_MAX_ATTEMPTS,
  getChallengeDepthRange,
  isDepthInChallengeBand,
  type ChallengeCandidate,
  type ChallengeDifficulty,
} from './challenge.js';

export interface CertifiedChallenge {
  readonly difficulty: ChallengeDifficulty;
  readonly baseSeed: string;
  readonly attemptIndex: number;
  readonly samplingLength: number;
  readonly depth: number;
  readonly state: GearCubeState;
  readonly frame: SpatialFrame;
  readonly stateKey: string;
}

export interface ChallengeGenerationIdleState {
  readonly status: 'IDLE';
}

export interface ChallengeGenerationActiveState {
  readonly status: 'ACTIVE';
  readonly requestId: string;
  readonly difficulty: ChallengeDifficulty;
  readonly seed: string;
  readonly attemptIndex: number;
  readonly candidate: ChallengeCandidate;
  readonly latestCertificationDepth: number | null;
}

export interface ChallengeGenerationAcceptedState {
  readonly status: 'ACCEPTED';
  readonly requestId: string;
  readonly difficulty: ChallengeDifficulty;
  readonly seed: string;
  readonly attemptIndex: number;
  readonly result: CertifiedChallenge;
}

export interface ChallengeGenerationErrorState {
  readonly status: 'ERROR';
  readonly requestId: string;
  readonly difficulty: ChallengeDifficulty;
  readonly seed: string;
  readonly attemptIndex: number;
  readonly error: string;
}

export interface ChallengeGenerationCancelledState {
  readonly status: 'CANCELLED';
  readonly requestId: string;
  readonly difficulty: ChallengeDifficulty;
  readonly seed: string;
  readonly attemptIndex: number;
}

export type ChallengeGenerationState =
  | ChallengeGenerationIdleState
  | ChallengeGenerationActiveState
  | ChallengeGenerationAcceptedState
  | ChallengeGenerationErrorState
  | ChallengeGenerationCancelledState;

export const INITIAL_CHALLENGE_GENERATION_STATE: ChallengeGenerationIdleState = Object.freeze({
  status: 'IDLE',
});

export function beginChallenge(
  _previousState: ChallengeGenerationState,
  requestId: string,
  candidate: ChallengeCandidate
): ChallengeGenerationActiveState {
  return {
    status: 'ACTIVE',
    requestId,
    difficulty: candidate.difficulty,
    seed: candidate.baseSeed,
    attemptIndex: candidate.attemptIndex,
    candidate,
    latestCertificationDepth: null,
  };
}

export function beginChallengeAttempt(
  state: ChallengeGenerationActiveState,
  candidate: ChallengeCandidate
): ChallengeGenerationActiveState {
  if (
    candidate.difficulty !== state.difficulty ||
    candidate.baseSeed !== state.seed ||
    candidate.attemptIndex <= state.attemptIndex ||
    candidate.attemptIndex >= CHALLENGE_MAX_ATTEMPTS
  ) {
    throw new Error('Challenge candidate does not belong to the active generation request');
  }
  return {
    ...state,
    attemptIndex: candidate.attemptIndex,
    candidate,
    latestCertificationDepth: null,
  };
}

export function recordChallengeCertificationDepth(
  state: ChallengeGenerationState,
  requestId: string,
  depth: number
): ChallengeGenerationState {
  if (state.status !== 'ACTIVE' || state.requestId !== requestId) {
    return state;
  }
  return {
    ...state,
    latestCertificationDepth: depth,
  };
}

export type ChallengeCertificationDecision =
  | { readonly status: 'ACCEPT'; readonly result: CertifiedChallenge }
  | { readonly status: 'RETRY'; readonly nextAttemptIndex: number }
  | { readonly status: 'FAIL'; readonly error: string }
  | { readonly status: 'IGNORED' };

/**
 * Converts one optimal solver depth into an accept/retry/fail decision. The
 * sequence returned by the solver is intentionally not part of this contract.
 */
export function decideChallengeCertification(
  state: ChallengeGenerationState,
  requestId: string,
  depth: number
): ChallengeCertificationDecision {
  if (state.status !== 'ACTIVE' || state.requestId !== requestId) {
    return { status: 'IGNORED' };
  }

  if (isDepthInChallengeBand(state.difficulty, depth)) {
    return {
      status: 'ACCEPT',
      result: {
        difficulty: state.difficulty,
        baseSeed: state.seed,
        attemptIndex: state.attemptIndex,
        samplingLength: state.candidate.samplingLength,
        depth,
        state: state.candidate.state,
        frame: state.candidate.frame,
        stateKey: state.candidate.stateKey,
      },
    };
  }

  if (state.attemptIndex >= CHALLENGE_MAX_ATTEMPTS - 1) {
    const range = getChallengeDepthRange(state.difficulty);
    return {
      status: 'FAIL',
      error: `No ${state.difficulty} challenge was certified in ${CHALLENGE_MAX_ATTEMPTS} attempts; required optimal distance is ${range.min}..${range.max}.`,
    };
  }

  return {
    status: 'RETRY',
    nextAttemptIndex: state.attemptIndex + 1,
  };
}

export function acceptChallenge(
  state: ChallengeGenerationState,
  result: CertifiedChallenge
): ChallengeGenerationState {
  if (
    state.status !== 'ACTIVE' ||
    state.attemptIndex !== result.attemptIndex ||
    state.difficulty !== result.difficulty ||
    state.seed !== result.baseSeed ||
    state.candidate.samplingLength !== result.samplingLength ||
    state.candidate.state !== result.state ||
    state.candidate.frame !== result.frame ||
    state.candidate.stateKey !== result.stateKey ||
    !isDepthInChallengeBand(state.difficulty, result.depth)
  ) {
    return state;
  }
  return {
    status: 'ACCEPTED',
    requestId: state.requestId,
    difficulty: state.difficulty,
    seed: state.seed,
    attemptIndex: state.attemptIndex,
    result,
  };
}

export function failActiveChallenge(
  state: ChallengeGenerationState,
  requestId: string,
  error: string
): ChallengeGenerationState {
  if (state.status !== 'ACTIVE' || state.requestId !== requestId) {
    return state;
  }
  return {
    status: 'ERROR',
    requestId: state.requestId,
    difficulty: state.difficulty,
    seed: state.seed,
    attemptIndex: state.attemptIndex,
    error,
  };
}

export function cancelActiveChallenge(
  state: ChallengeGenerationState
): ChallengeGenerationState {
  if (state.status !== 'ACTIVE') {
    return state;
  }
  return {
    status: 'CANCELLED',
    requestId: state.requestId,
    difficulty: state.difficulty,
    seed: state.seed,
    attemptIndex: state.attemptIndex,
  };
}
