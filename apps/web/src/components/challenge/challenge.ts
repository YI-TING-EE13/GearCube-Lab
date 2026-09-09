import {
  DEFAULT_SPATIAL_FRAME,
  SOLVED_GEAR_CUBE_STATE,
  serializeLogicalState,
  type GearCubeState,
  type Move,
  type SpatialFrame,
} from '@gearcube/core';
import {
  applyScrambleSequence,
  generateScramble,
} from '../history/scramble.js';

export const CHALLENGE_DIFFICULTIES = ['EASY', 'NORMAL', 'CHALLENGE'] as const;
export type ChallengeDifficulty = (typeof CHALLENGE_DIFFICULTIES)[number];

export interface ChallengeDepthRange {
  readonly min: number;
  readonly max: number;
}

export const CHALLENGE_DEPTH_RANGES: Readonly<
  Record<ChallengeDifficulty, ChallengeDepthRange>
> = Object.freeze({
  EASY: Object.freeze({ min: 2, max: 4 }),
  NORMAL: Object.freeze({ min: 5, max: 6 }),
  CHALLENGE: Object.freeze({ min: 7, max: 8 }),
});

/** Fixed bounded retry policy for deterministic candidate certification. */
export const CHALLENGE_MAX_ATTEMPTS = 64;

/**
 * Candidate scramble lengths are sampling heuristics, not difficulty
 * definitions. Final difficulty truth comes only from solver depth.
 */
export const CHALLENGE_SAMPLING_LENGTHS: Readonly<
  Record<ChallengeDifficulty, number>
> = Object.freeze({
  EASY: 4,
  NORMAL: 6,
  // Odd-length sampling reaches the depth-7 band reliably for this puzzle's
  // two-cycle move metric; certification still uses solver depth exclusively.
  CHALLENGE: 9,
});

export interface ChallengeCandidate {
  readonly difficulty: ChallengeDifficulty;
  readonly baseSeed: string;
  readonly candidateSeed: string;
  /** Zero-based deterministic attempt index. */
  readonly attemptIndex: number;
  readonly samplingLength: number;
  readonly scrambleMoves: readonly Move[];
  readonly state: GearCubeState;
  readonly frame: SpatialFrame;
  readonly stateKey: string;
}

function isChallengeDifficultyValue(value: unknown): value is ChallengeDifficulty {
  return (
    typeof value === 'string' &&
    (CHALLENGE_DIFFICULTIES as readonly string[]).includes(value)
  );
}

export function getChallengeDepthRange(
  difficulty: ChallengeDifficulty
): ChallengeDepthRange {
  return CHALLENGE_DEPTH_RANGES[difficulty];
}

export function isChallengeDifficulty(value: unknown): value is ChallengeDifficulty {
  return isChallengeDifficultyValue(value);
}

export function isDepthInChallengeBand(
  difficulty: ChallengeDifficulty,
  depth: number
): boolean {
  const range = getChallengeDepthRange(difficulty);
  return Number.isInteger(depth) && depth >= range.min && depth <= range.max;
}

/**
 * Derives a stable candidate seed from the caller seed, requested difficulty,
 * and attempt index. No clock or ambient random source participates.
 */
export function deriveChallengeCandidateSeed(
  seed: string,
  difficulty: ChallengeDifficulty,
  attemptIndex: number
): string {
  if (typeof seed !== 'string') {
    throw new TypeError('Challenge seed must be a string');
  }
  if (!isChallengeDifficultyValue(difficulty)) {
    throw new TypeError(`Unsupported challenge difficulty: ${String(difficulty)}`);
  }
  if (
    !Number.isInteger(attemptIndex) ||
    attemptIndex < 0 ||
    attemptIndex >= CHALLENGE_MAX_ATTEMPTS
  ) {
    throw new RangeError(
      `Challenge attempt index must be an integer from 0 to ${CHALLENGE_MAX_ATTEMPTS - 1}`
    );
  }
  return `M6|${difficulty}|attempt:${attemptIndex}|seed:${seed}`;
}

/**
 * Builds one solved-rooted deterministic candidate. This function performs no
 * solver work and does not depend on the player's current Play state.
 */
export function createChallengeCandidate(
  seed: string,
  difficulty: ChallengeDifficulty,
  attemptIndex: number
): ChallengeCandidate {
  const candidateSeed = deriveChallengeCandidateSeed(seed, difficulty, attemptIndex);
  const samplingLength = CHALLENGE_SAMPLING_LENGTHS[difficulty];
  const scrambleMoves = generateScramble(candidateSeed, samplingLength);
  const { state, frame } = applyScrambleSequence(
    SOLVED_GEAR_CUBE_STATE,
    DEFAULT_SPATIAL_FRAME,
    scrambleMoves
  );

  return Object.freeze({
    difficulty,
    baseSeed: seed,
    candidateSeed,
    attemptIndex,
    samplingLength,
    scrambleMoves,
    state,
    frame,
    stateKey: serializeLogicalState(state),
  });
}
