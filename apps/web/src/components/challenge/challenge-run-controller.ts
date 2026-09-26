import { isSolved, type GearCubeState } from '@gearcube/core';
import type { ChallengeDifficulty } from './challenge.js';
import type { CertifiedChallenge } from './challenge-controller.js';

export interface ChallengeRunResult {
  readonly difficulty: ChallengeDifficulty;
  readonly baseSeed: string;
  readonly playerMoves: number;
  readonly optimalMoves: number;
  readonly movesOverOptimal: number;
  readonly efficiencyPercent: number;
  readonly startedAtMs: number;
  readonly completedAtMs: number;
  readonly elapsedMs: number;
  readonly solvedOptimally: boolean;
  readonly assisted: boolean;
}

export interface InactiveChallengeRunState {
  readonly status: 'INACTIVE';
}

export interface ActiveChallengeRunState {
  readonly status: 'ACTIVE';
  readonly challenge: CertifiedChallenge;
  readonly startedAtMs: number;
  readonly startCommitSequence: number;
  readonly assisted: boolean;
}

export interface CompletedChallengeRunState {
  readonly status: 'COMPLETED';
  readonly challenge: CertifiedChallenge;
  readonly startedAtMs: number;
  readonly completedAtMs: number;
  readonly startCommitSequence: number;
  readonly assisted: boolean;
  readonly result: ChallengeRunResult;
}

export type ChallengeRunState =
  | InactiveChallengeRunState
  | ActiveChallengeRunState
  | CompletedChallengeRunState;

export const INITIAL_CHALLENGE_RUN_STATE: InactiveChallengeRunState = Object.freeze({
  status: 'INACTIVE',
});

function assertValidCommitSequence(sequence: number): void {
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new RangeError('canonicalCommitSequence must be a non-negative safe integer');
  }
}

function assertFiniteTimestamp(timestampMs: number, name: string): void {
  if (!Number.isFinite(timestampMs)) {
    throw new RangeError(`${name} must be a finite number`);
  }
}

export function startChallengeRun(
  challenge: CertifiedChallenge,
  nowMs: number,
  canonicalCommitSequence: number
): ActiveChallengeRunState {
  assertFiniteTimestamp(nowMs, 'nowMs');
  assertValidCommitSequence(canonicalCommitSequence);

  return {
    status: 'ACTIVE',
    challenge,
    startedAtMs: nowMs,
    startCommitSequence: canonicalCommitSequence,
    assisted: false,
  };
}

export function getChallengeRunMoveCount(
  activeRun: ActiveChallengeRunState,
  currentCanonicalCommitSequence: number
): number {
  assertValidCommitSequence(currentCanonicalCommitSequence);
  if (currentCanonicalCommitSequence < activeRun.startCommitSequence) {
    throw new RangeError(
      'current canonicalCommitSequence cannot be lower than startCommitSequence'
    );
  }
  return currentCanonicalCommitSequence - activeRun.startCommitSequence;
}

export function markChallengeRunAssisted(
  state: ChallengeRunState
): ChallengeRunState {
  if (state.status !== 'ACTIVE' || state.assisted) {
    return state;
  }
  return { ...state, assisted: true };
}

export interface TryCompleteChallengeRunInput {
  readonly currentState: GearCubeState;
  readonly isPlayIdle: boolean;
  readonly canonicalCommitSequence: number;
  readonly nowMs: number;
}

export function tryCompleteChallengeRun(
  state: ChallengeRunState,
  input: TryCompleteChallengeRunInput
): ChallengeRunState {
  if (state.status !== 'ACTIVE') {
    return state;
  }
  if (!input.isPlayIdle || !isSolved(input.currentState)) {
    return state;
  }

  assertValidCommitSequence(input.canonicalCommitSequence);
  assertFiniteTimestamp(input.nowMs, 'completedAtMs');
  if (input.nowMs < state.startedAtMs) {
    throw new RangeError('completedAtMs cannot be earlier than startedAtMs');
  }

  const elapsedMs = input.nowMs - state.startedAtMs;
  if (!Number.isFinite(elapsedMs)) {
    throw new RangeError('elapsedMs must be finite');
  }

  const playerMoves = getChallengeRunMoveCount(
    state,
    input.canonicalCommitSequence
  );
  if (playerMoves <= 0) {
    throw new RangeError('playerMoves must be greater than zero at completion');
  }

  const optimalMoves = state.challenge.depth;
  if (!Number.isSafeInteger(optimalMoves) || optimalMoves <= 0) {
    throw new RangeError('CertifiedChallenge.depth must be a positive safe integer');
  }
  if (playerMoves < optimalMoves) {
    throw new RangeError('playerMoves cannot be lower than certified optimalMoves');
  }

  const movesOverOptimal = playerMoves - optimalMoves;
  const efficiencyPercent = (100 * optimalMoves) / playerMoves;
  if (movesOverOptimal < 0 || efficiencyPercent > 100) {
    throw new RangeError('Completion metrics violate certified optimal-depth invariants');
  }

  const completedAtMs = input.nowMs;
  const result: ChallengeRunResult = Object.freeze({
    difficulty: state.challenge.difficulty,
    baseSeed: state.challenge.baseSeed,
    playerMoves,
    optimalMoves,
    movesOverOptimal,
    efficiencyPercent,
    startedAtMs: state.startedAtMs,
    completedAtMs,
    elapsedMs,
    solvedOptimally: playerMoves === optimalMoves,
    assisted: state.assisted,
  });

  return {
    status: 'COMPLETED',
    challenge: state.challenge,
    startedAtMs: state.startedAtMs,
    completedAtMs,
    startCommitSequence: state.startCommitSequence,
    assisted: state.assisted,
    result,
  };
}

export function retryChallengeRun(
  state: ChallengeRunState,
  nowMs: number,
  canonicalCommitSequence: number
): ChallengeRunState {
  if (state.status === 'INACTIVE') {
    return state;
  }
  return startChallengeRun(state.challenge, nowMs, canonicalCommitSequence);
}

export function resetChallengeRun(
  state: ChallengeRunState
): InactiveChallengeRunState {
  return state.status === 'INACTIVE' ? state : INITIAL_CHALLENGE_RUN_STATE;
}
