import { describe, expect, it } from 'vitest';
import { solveIdaStar } from '@gearcube/solvers';
import { createChallengeCandidate } from '../apps/web/src/components/challenge/challenge.js';
import {
  beginChallenge,
  decideChallengeCertification,
  INITIAL_CHALLENGE_GENERATION_STATE,
} from '../apps/web/src/components/challenge/challenge-controller.js';

describe('M6 challenge certification and optimal solver integration', () => {
  it('SOLVER_DEPTH_TRUTH_GATE: accepts only the actual optimal IDA* depth and does not retain moves', () => {
    const candidate = createChallengeCandidate('GearCube-Lab', 'NORMAL', 1);
    const optimal = solveIdaStar(candidate.state);
    expect(optimal.status).toBe('SOLVED');
    if (optimal.status !== 'SOLVED') return;

    const active = beginChallenge(
      INITIAL_CHALLENGE_GENERATION_STATE,
      'm6-integration',
      candidate
    );
    const decision = decideChallengeCertification(
      active,
      'm6-integration',
      optimal.depth
    );

    expect(decision.status).toBe('ACCEPT');
    if (decision.status !== 'ACCEPT') return;
    expect(decision.result.depth).toBe(optimal.depth);
    expect('moves' in decision.result).toBe(false);
  });
});
