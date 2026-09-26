import type { FC } from 'react';

export interface InactiveChallengePerformance {
  readonly status: 'INACTIVE';
}

export interface ActiveChallengePerformance {
  readonly status: 'ACTIVE';
  readonly difficulty: string;
  readonly baseSeed: string;
  readonly playerMoves: number;
  readonly optimalMoves: number;
  readonly assisted: boolean;
}

export interface CompletedChallengePerformance {
  readonly status: 'COMPLETED';
  readonly difficulty: string;
  readonly baseSeed: string;
  readonly playerMoves: number;
  readonly optimalMoves: number;
  readonly movesOverOptimal: number;
  readonly efficiencyPercent: number;
  readonly elapsedMs: number;
  readonly solvedOptimally: boolean;
  readonly assisted: boolean;
}

export type ChallengePerformanceSnapshot =
  | InactiveChallengePerformance
  | ActiveChallengePerformance
  | CompletedChallengePerformance;

export interface ChallengePerformanceProps {
  readonly performance: ChallengePerformanceSnapshot;
  readonly onRetry: () => void;
  readonly onNewChallenge: () => void;
}

export function formatChallengeDuration(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(Math.floor(totalSeconds / 60))}:${pad(seconds)}`;
}

function formatDifficulty(difficulty: string): string {
  return `${difficulty.charAt(0)}${difficulty.slice(1).toLowerCase()}`;
}

export const ChallengePerformance: FC<ChallengePerformanceProps> = ({
  performance,
  onRetry,
  onNewChallenge,
}) => {
  if (performance.status === 'INACTIVE') {
    return null;
  }

  const isCompleted = performance.status === 'COMPLETED';
  return (
    <section
      className="challenge-performance"
      role="region"
      aria-label="Challenge Performance"
      data-testid="challenge-performance"
    >
      {isCompleted ? (
        <>
          <div className="challenge-performance-header">
            <h2 className="challenge-performance-title">Performance</h2>
            <span className="challenge-performance-complete-tag">Complete</span>
          </div>
          <p className="challenge-performance-announcement" role="status" aria-live="polite">
            Challenge Complete
          </p>
        </>
      ) : (
        <div className="challenge-performance-header">
          <h2 className="challenge-performance-title">Challenge in progress</h2>
          <span className="challenge-performance-active-tag">Active</span>
        </div>
      )}

      <dl className="challenge-performance-details">
        <div>
          <dt>Difficulty</dt>
          <dd>{formatDifficulty(performance.difficulty)}</dd>
        </div>
        <div>
          <dt>Seed</dt>
          <dd className="challenge-performance-seed">{performance.baseSeed}</dd>
        </div>
        <div>
          <dt>Your moves</dt>
          <dd>{performance.playerMoves}</dd>
        </div>
        <div>
          <dt>Optimal moves</dt>
          <dd>{performance.optimalMoves}</dd>
        </div>
        {isCompleted ? (
          <>
            <div>
              <dt>Move delta</dt>
              <dd>
                {performance.movesOverOptimal === 0
                  ? 'Matched optimal move count'
                  : `+${performance.movesOverOptimal} over optimal`}
              </dd>
            </div>
            <div>
              <dt>Efficiency</dt>
              <dd>{Math.round(performance.efficiencyPercent)}%</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{formatChallengeDuration(performance.elapsedMs)}</dd>
            </div>
          </>
        ) : null}
      </dl>

      {isCompleted ? (
        <>
          <p className="challenge-performance-outcome">
            {performance.assisted
              ? 'Challenge completed with assistance.'
              : performance.solvedOptimally
                ? 'Solved optimally'
                : 'Challenge completed.'}
          </p>
          <p className="challenge-performance-assistance">
            {performance.assisted
              ? 'Assisted run — solution help was used.'
              : 'No solution help was used.'}
          </p>
          <div className="challenge-performance-actions">
            <button
              type="button"
              className="challenge-performance-button"
              aria-label="Retry same challenge"
              onClick={onRetry}
            >
              Retry
            </button>
            <button
              type="button"
              className="challenge-performance-button challenge-performance-button-primary"
              aria-label="Generate new challenge"
              onClick={onNewChallenge}
            >
              New Challenge
            </button>
          </div>
        </>
      ) : performance.assisted ? (
        <p className="challenge-performance-assistance">
          Assisted — solution help was used.
        </p>
      ) : null}
    </section>
  );
};
