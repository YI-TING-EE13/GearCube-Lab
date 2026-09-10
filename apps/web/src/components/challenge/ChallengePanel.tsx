import React from 'react';
import {
  CHALLENGE_DIFFICULTIES,
  type ChallengeDifficulty,
} from './challenge.js';
import type { ChallengeGenerationState } from './challenge-controller.js';

export interface ChallengePanelProps {
  readonly difficulty: ChallengeDifficulty;
  readonly state: ChallengeGenerationState;
  readonly isBusy: boolean;
  readonly onSelectDifficulty: (difficulty: ChallengeDifficulty) => void;
  readonly onStart: () => void;
  readonly onCancel: () => void;
}

function displayDifficulty(difficulty: ChallengeDifficulty): string {
  return difficulty.charAt(0) + difficulty.slice(1).toLowerCase();
}

function statusText(state: ChallengeGenerationState): string {
  switch (state.status) {
    case 'IDLE':
      return 'No certified challenge selected.';
    case 'ACTIVE':
      return `Generating ${displayDifficulty(state.difficulty)} challenge… Attempt ${state.attemptIndex + 1} of 64.`;
    case 'ACCEPTED':
      return `${displayDifficulty(state.result.difficulty)} challenge · Optimal distance: ${state.result.depth} moves`;
    case 'CANCELLED':
      return 'Challenge generation cancelled. No puzzle state was changed.';
    case 'ERROR':
      return `Challenge generation failed: ${state.error}`;
    default: {
      const _exhaustiveCheck: never = state;
      return _exhaustiveCheck;
    }
  }
}

export const ChallengePanel: React.FC<ChallengePanelProps> = ({
  difficulty,
  state,
  isBusy,
  onSelectDifficulty,
  onStart,
  onCancel,
}) => {
  const isActive = state.status === 'ACTIVE';
  const controlsDisabled = isBusy || isActive;
  const [isExpanded, setIsExpanded] = React.useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return !window.matchMedia('(max-width: 1024px)').matches;
  });

  return (
    <section
      className="challenge-panel"
      role="region"
      aria-label="Certified Challenge Controls"
      data-testid="challenge-panel"
    >
      <div className="challenge-header">
        <div className="challenge-heading">
          <h3 className="challenge-title">Certified Challenge</h3>
          <span className="challenge-seed-note">Uses the current Seed</span>
        </div>
        <button
          type="button"
          className="challenge-collapse-toggle"
          aria-expanded={isExpanded}
          aria-controls="challenge-panel-content"
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} certified challenge controls`}
          title={`${isExpanded ? 'Collapse' : 'Expand'} certified challenge controls`}
          disabled={isActive}
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
        </button>
      </div>

      <div
        id="challenge-panel-content"
        className="challenge-panel-content"
        hidden={!isExpanded}
      >
        <div className="challenge-difficulty-row">
          <span className="challenge-label">Difficulty:</span>
          <div className="challenge-difficulty-group" role="group" aria-label="Challenge difficulty">
            {CHALLENGE_DIFFICULTIES.map((option) => (
              <button
                key={option}
                type="button"
                className={`challenge-difficulty-btn ${difficulty === option ? 'challenge-difficulty-selected' : ''}`}
                aria-pressed={difficulty === option}
                aria-label={`Challenge difficulty ${displayDifficulty(option)}`}
                disabled={controlsDisabled}
                onClick={() => onSelectDifficulty(option)}
              >
                {displayDifficulty(option)}
              </button>
            ))}
          </div>
        </div>

        <div className="challenge-action-row">
          {isActive ? (
            <button
              type="button"
              className="challenge-btn challenge-cancel-btn"
              onClick={onCancel}
              aria-label="Cancel challenge generation"
            >
              Cancel Challenge
            </button>
          ) : (
            <button
              type="button"
              className="challenge-btn challenge-start-btn"
              onClick={onStart}
              disabled={controlsDisabled}
              aria-label={`Generate ${displayDifficulty(difficulty)} challenge`}
            >
              Generate Challenge
            </button>
          )}
        </div>

        <div
          className={`challenge-status challenge-status-${state.status.toLowerCase()}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          aria-busy={isActive}
          data-testid="challenge-status"
        >
          {statusText(state)}
        </div>
      </div>
    </section>
  );
};
