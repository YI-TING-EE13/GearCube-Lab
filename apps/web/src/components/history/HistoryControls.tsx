/**
 * @file HistoryControls.tsx
 * @description Presentational UI controls for undo, redo, and returning to the puzzle baseline.
 */

import React from 'react';

export interface HistoryControlsProps {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canResetBaseline: boolean;
  readonly isBusy: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onResetBaseline: () => void;
}

export const HistoryControls: React.FC<HistoryControlsProps> = ({
  canUndo,
  canRedo,
  canResetBaseline,
  isBusy,
  onUndo,
  onRedo,
  onResetBaseline,
}) => {
  const isUndoDisabled = isBusy || !canUndo;
  const isRedoDisabled = isBusy || !canRedo;
  const isBaselineDisabled = isBusy || !canResetBaseline;

  return (
    <div
      className="history-controls-panel"
      onPointerDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="History Controls"
    >
      <div className="history-button-group">
        <button
          type="button"
          className="history-btn"
          onClick={onUndo}
          disabled={isUndoDisabled}
          aria-label="Undo move"
          title="Undo previous move (Ctrl+Z)"
        >
          ↶ Undo
        </button>

        <button
          type="button"
          className="history-btn"
          onClick={onRedo}
          disabled={isRedoDisabled}
          aria-label="Redo move"
          title="Redo next move (Ctrl+Shift+Z)"
        >
          ↷ Redo
        </button>

        <button
          type="button"
          className="history-btn history-btn-baseline"
          onClick={onResetBaseline}
          disabled={isBaselineDisabled}
          aria-label="Back to baseline"
          title="Return to initial baseline snapshot"
        >
          ⏮ Back to baseline
        </button>
      </div>
    </div>
  );
};
