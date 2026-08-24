/**
 * @file TimelineScrubber.tsx
 * @description Presentational timeline scrubber UI displaying linear history entries with arbitrary step navigation.
 */

import React from 'react';
import type { HistoryEntry } from './history.js';

export interface TimelineScrubberProps {
  readonly entries: readonly HistoryEntry[];
  readonly cursorIndex: number;
  readonly isBusy: boolean;
  readonly onScrub: (index: number) => void;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  entries,
  cursorIndex,
  isBusy,
  onScrub,
}) => {
  return (
    <div
      className="timeline-scrubber-panel"
      onPointerDown={(e) => e.stopPropagation()}
      role="region"
      aria-label="Move History Timeline"
    >
      <div className="timeline-header">
        <span className="timeline-title">Move History</span>
        <span className="timeline-count">
          {cursorIndex === -1 ? '0' : `${cursorIndex + 1}`} / {entries.length}
        </span>
      </div>

      <div className="timeline-scroll-container">
        <button
          type="button"
          className={`timeline-chip ${cursorIndex === -1 ? 'timeline-chip-active' : ''}`}
          onClick={() => onScrub(-1)}
          disabled={isBusy}
          aria-label="Timeline start baseline"
          aria-current={cursorIndex === -1 ? 'step' : undefined}
        >
          Baseline
        </button>

        {entries.map((entry, index) => {
          const isActive = cursorIndex === index;
          return (
            <button
              key={`${index}-${entry.notation}`}
              type="button"
              className={`timeline-chip ${isActive ? 'timeline-chip-active' : ''}`}
              onClick={() => onScrub(index)}
              disabled={isBusy}
              aria-label={`Step ${index + 1}: ${entry.notation}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="chip-step">{index + 1}.</span>
              <span className="chip-notation">{entry.notation}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
