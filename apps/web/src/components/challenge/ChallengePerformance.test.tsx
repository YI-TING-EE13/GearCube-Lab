import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  ChallengePerformance,
  formatChallengeDuration,
  type ActiveChallengePerformance,
  type CompletedChallengePerformance,
} from './ChallengePerformance.js';

function renderPerformance(
  performance:
    | { readonly status: 'INACTIVE' }
    | ActiveChallengePerformance
    | CompletedChallengePerformance
) {
  return renderToStaticMarkup(
    <ChallengePerformance
      performance={performance}
      onRetry={() => undefined}
      onNewChallenge={() => undefined}
    />
  );
}

function activePerformance(
  overrides: Partial<ActiveChallengePerformance> = {}
): ActiveChallengePerformance {
  return {
    status: 'ACTIVE',
    difficulty: 'NORMAL',
    baseSeed: 'challenge-seed-123',
    playerMoves: 3,
    optimalMoves: 5,
    assisted: false,
    ...overrides,
  };
}

function completedPerformance(
  overrides: Partial<CompletedChallengePerformance> = {}
): CompletedChallengePerformance {
  return {
    status: 'COMPLETED',
    difficulty: 'HARD',
    baseSeed: 'challenge-seed-456',
    playerMoves: 5,
    optimalMoves: 4,
    movesOverOptimal: 1,
    efficiencyPercent: 80,
    elapsedMs: 65_000,
    solvedOptimally: false,
    assisted: false,
    ...overrides,
  };
}

describe('ChallengePerformance', () => {
  it('INACTIVE_RENDER_GATE: hides stale performance state', () => {
    expect(renderPerformance({ status: 'INACTIVE' })).toBe('');
  });

  it('ACTIVE_PERFORMANCE_RENDER_GATE: shows current progress and certificate metadata', () => {
    const markup = renderPerformance(activePerformance());

    expect(markup).toContain('Challenge in progress');
    expect(markup).toContain('Normal');
    expect(markup).toContain('challenge-seed-123');
    expect(markup).toContain('Your moves');
    expect(markup).toContain('>3</dd>');
    expect(markup).toContain('Optimal moves');
    expect(markup).toContain('>5</dd>');
    expect(markup).not.toContain('role="status"');
  });

  it('ACTIVE_ASSISTED_RENDER_GATE: explains solution assistance during an active run', () => {
    const markup = renderPerformance(activePerformance({ assisted: true }));

    expect(markup).toContain('Assisted — solution help was used.');
  });

  it('COMPLETED_OPTIMAL_RENDER_GATE: reports an independent optimal result', () => {
    const markup = renderPerformance(
      completedPerformance({
        playerMoves: 4,
        optimalMoves: 4,
        movesOverOptimal: 0,
        efficiencyPercent: 100,
        solvedOptimally: true,
      })
    );

    expect(markup).toContain('Challenge Complete');
    expect(markup).toContain('Solved optimally');
    expect(markup).toContain('Matched optimal move count');
    expect(markup).toContain('No solution help was used.');
  });

  it('COMPLETED_SUBOPTIMAL_RENDER_GATE: reports positive move delta and efficiency', () => {
    const markup = renderPerformance(completedPerformance());

    expect(markup).toContain('+1 over optimal');
    expect(markup).toContain('80%');
    expect(markup).toContain('01:05');
  });

  it('COMPLETED_ASSISTED_WORDING_GATE: assisted optimal metrics are not called unqualified optimal', () => {
    const markup = renderPerformance(
      completedPerformance({
        playerMoves: 4,
        optimalMoves: 4,
        movesOverOptimal: 0,
        efficiencyPercent: 100,
        solvedOptimally: true,
        assisted: true,
      })
    );

    expect(markup).toContain('Challenge completed with assistance.');
    expect(markup).toContain('Assisted run — solution help was used.');
    expect(markup).toContain('Matched optimal move count');
    expect(markup).not.toContain('Solved optimally');
  });

  it('EFFICIENCY_FORMAT_GATE: rounds only the displayed percentage', () => {
    const markup = renderPerformance(
      completedPerformance({ efficiencyPercent: 74.6 })
    );

    expect(markup).toContain('75%');
    expect(markup).not.toContain('74.6%');
  });

  it('DURATION_MMSS_GATE: floors durations and does not wrap into negative time', () => {
    expect(formatChallengeDuration(0)).toBe('00:00');
    expect(formatChallengeDuration(42_900)).toBe('00:42');
    expect(formatChallengeDuration(65_000)).toBe('01:05');
    expect(formatChallengeDuration(-500)).toBe('00:00');
  });

  it('DURATION_HHMMSS_GATE: keeps whole hours instead of wrapping minutes', () => {
    expect(formatChallengeDuration(3_600_000)).toBe('01:00:00');
    expect(formatChallengeDuration(7_265_999)).toBe('02:01:05');
  });

  it('ACTION_ACCESSIBILITY_GATE: exposes stable completion status and named actions', () => {
    const onRetry = vi.fn();
    const onNewChallenge = vi.fn();
    const markup = renderToStaticMarkup(
      <ChallengePerformance
        performance={completedPerformance()}
        onRetry={onRetry}
        onNewChallenge={onNewChallenge}
      />
    );

    expect(markup).toContain('role="region" aria-label="Challenge Performance"');
    expect(markup).toContain('role="status" aria-live="polite"');
    expect(markup).toContain('aria-label="Retry same challenge"');
    expect(markup).toContain('aria-label="Generate new challenge"');
    expect(markup).not.toMatch(/<dd[^>]*role="status"/);
  });
});
