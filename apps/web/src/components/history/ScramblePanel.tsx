/**
 * @file ScramblePanel.tsx
 * @description Presentational UI panel for deterministic seed entry, move preview, and scramble generation.
 */

import React, { useMemo } from 'react';
import { generateScramble, DEFAULT_SCRAMBLE_LENGTH } from './scramble.js';
import { formatMoveNotation } from './history.js';

export interface ScramblePanelProps {
  readonly seed: string;
  readonly isBusy: boolean;
  readonly onSeedChange: (seed: string) => void;
  readonly onScramble: () => void;
}

export const ScramblePanel: React.FC<ScramblePanelProps> = ({
  seed,
  isBusy,
  onSeedChange,
  onScramble,
}) => {
  const previewNotation = useMemo(() => {
    try {
      const moves = generateScramble(seed, DEFAULT_SCRAMBLE_LENGTH);
      const notations = moves.map(formatMoveNotation);
      const sample = notations.slice(0, 6).join(' ');
      return `${sample}... (${DEFAULT_SCRAMBLE_LENGTH} moves)`;
    } catch {
      return 'Invalid seed';
    }
  }, [seed]);

  return (
    <div
      className="scramble-panel"
      onPointerDown={(e) => e.stopPropagation()}
      role="region"
      aria-label="Scramble Controls"
    >
      <div className="scramble-header">
        <span className="scramble-title">Deterministic Scramble</span>
      </div>

      <div className="scramble-input-row">
        <input
          type="text"
          className="scramble-seed-input"
          value={seed}
          onChange={(e) => onSeedChange(e.target.value)}
          placeholder="Seed string..."
          aria-label="Scramble seed"
        />

        <button
          type="button"
          className="scramble-btn"
          onClick={onScramble}
          disabled={isBusy}
          aria-label="Generate scramble"
        >
          Scramble
        </button>
      </div>

      <div className="scramble-preview" aria-label="Scramble sequence preview">
        <span className="preview-label">Preview:</span>
        <code className="preview-code">{previewNotation}</code>
      </div>
    </div>
  );
};
