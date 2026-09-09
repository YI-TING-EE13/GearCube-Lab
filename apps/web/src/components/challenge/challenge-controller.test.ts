import { describe, expect, it } from 'vitest';
import { SOLVED_GEAR_CUBE_STATE, DEFAULT_SPATIAL_FRAME } from '@gearcube/core';
import {
  CHALLENGE_MAX_ATTEMPTS,
  createChallengeCandidate,
} from './challenge.js';
import {
  acceptChallenge,
  beginChallenge,
  beginChallengeAttempt,
  cancelActiveChallenge,
  decideChallengeCertification,
  failActiveChallenge,
  INITIAL_CHALLENGE_GENERATION_STATE,
  recordChallengeCertificationDepth,
} from './challenge-controller.js';

describe('M6 certified challenge policy and lifecycle controller', () => {
  it('DIFFICULTY_BOUNDARY_GATE: accepts only the exact requested depth bands', () => {
    const expected = {
      EASY: [2, 3, 4],
      NORMAL: [5, 6],
      CHALLENGE: [7, 8],
    } as const;

    for (const [difficulty, depths] of Object.entries(expected)) {
      const candidate = createChallengeCandidate('boundary', difficulty as keyof typeof expected, 0);
      let state = beginChallenge(INITIAL_CHALLENGE_GENERATION_STATE, difficulty, candidate);
      for (const depth of depths) {
        const decision = decideChallengeCertification(state, difficulty, depth);
        expect(decision.status).toBe('ACCEPT');
        if (decision.status === 'ACCEPT') {
          expect(decision.result.depth).toBe(depth);
        }
      }

      const below = depths[0]! - 1;
      const above = depths[depths.length - 1]! + 1;
      expect(decideChallengeCertification(state, difficulty, below).status).toBe('RETRY');
      expect(decideChallengeCertification(state, difficulty, above).status).toBe('RETRY');
      const recorded = recordChallengeCertificationDepth(state, difficulty, depths[0]!);
      expect(recorded.status).toBe('ACTIVE');
    }
  });

  it('DETERMINISTIC_CANDIDATE_GATE: same seed, difficulty, and attempt reproduce exactly', () => {
    for (const difficulty of ['EASY', 'NORMAL', 'CHALLENGE'] as const) {
      const first = createChallengeCandidate('same-seed', difficulty, 3);
      const second = createChallengeCandidate('same-seed', difficulty, 3);
      expect(second).toEqual(first);
      expect(second.stateKey).toBe(first.stateKey);
      expect(second.frame).toBe(first.frame);
    }
  });

  it('INDEPENDENT_ATTEMPTS_GATE: attempt index changes candidate derivation', () => {
    const first = createChallengeCandidate('attempt-seed', 'NORMAL', 0);
    const second = createChallengeCandidate('attempt-seed', 'NORMAL', 1);
    expect(second.candidateSeed).not.toBe(first.candidateSeed);
    expect(second.scrambleMoves).not.toEqual(first.scrambleMoves);
  });

  it('OUT_OF_BAND_REJECTION_GATE: a certified depth outside the requested band is never accepted', () => {
    const candidate = createChallengeCandidate('reject', 'CHALLENGE', 0);
    const state = beginChallenge(INITIAL_CHALLENGE_GENERATION_STATE, 'request-1', candidate);
    expect(decideChallengeCertification(state, 'request-1', 6).status).toBe('RETRY');
    expect(decideChallengeCertification(state, 'request-1', 9).status).toBe('RETRY');
  });

  it('BOUNDED_RETRY_GATE: the final out-of-band attempt returns a bounded failure', () => {
    const candidate = createChallengeCandidate('bounded', 'EASY', CHALLENGE_MAX_ATTEMPTS - 1);
    const state = beginChallenge(INITIAL_CHALLENGE_GENERATION_STATE, 'request-2', candidate);
    const decision = decideChallengeCertification(state, 'request-2', 8);
    expect(decision.status).toBe('FAIL');
    if (decision.status === 'FAIL') {
      expect(decision.error).toContain(`${CHALLENGE_MAX_ATTEMPTS} attempts`);
    }
  });

  it('STALE_AND_CANCEL_GATE: stale results are ignored and cancellation cannot accept later', () => {
    const candidate = createChallengeCandidate('stale', 'NORMAL', 0);
    const active = beginChallenge(INITIAL_CHALLENGE_GENERATION_STATE, 'request-3', candidate);
    expect(decideChallengeCertification(active, 'old-request', 5)).toEqual({ status: 'IGNORED' });

    const cancelled = cancelActiveChallenge(active);
    expect(cancelled.status).toBe('CANCELLED');
    expect(decideChallengeCertification(cancelled, 'request-3', 5)).toEqual({ status: 'IGNORED' });
    expect(failActiveChallenge(cancelled, 'request-3', 'late')).toBe(cancelled);
  });

  it('ACCEPTED_RESULT_GATE: accepted state contains certification metadata but no solution sequence', () => {
    const candidate = createChallengeCandidate('accepted', 'EASY', 0);
    const active = beginChallenge(INITIAL_CHALLENGE_GENERATION_STATE, 'request-4', candidate);
    const decision = decideChallengeCertification(active, 'request-4', 3);
    expect(decision.status).toBe('ACCEPT');
    if (decision.status !== 'ACCEPT') return;

    const accepted = acceptChallenge(active, decision.result);
    expect(accepted.status).toBe('ACCEPTED');
    if (accepted.status === 'ACCEPTED') {
      expect(accepted.result.depth).toBe(3);
      expect(accepted.result.state).toEqual(candidate.state);
      expect(accepted.result.frame).toBe(candidate.frame);
      expect('moves' in accepted.result).toBe(false);
    }
  });

  it('RETRY_ATTEMPT_STATE_GATE: advancing an attempt preserves the generation request and replaces candidate', () => {
    const first = createChallengeCandidate('retry', 'NORMAL', 0);
    const second = createChallengeCandidate('retry', 'NORMAL', 1);
    const active = beginChallenge(INITIAL_CHALLENGE_GENERATION_STATE, 'request-5', first);
    const next = beginChallengeAttempt(active, second);
    expect(next.requestId).toBe('request-5');
    expect(next.attemptIndex).toBe(1);
    expect(next.candidate).toBe(second);
    expect(next.latestCertificationDepth).toBeNull();
  });

  it('SOLVED_ROOT_CONTRACT_GATE: candidate is rooted at solved state rather than a current Play state', () => {
    const candidate = createChallengeCandidate('root', 'EASY', 0);
    expect(candidate.state).not.toEqual(SOLVED_GEAR_CUBE_STATE);
    expect(candidate.frame).not.toBe(DEFAULT_SPATIAL_FRAME);
  });
});
