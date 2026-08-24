import React from 'react';
import type { SolutionPlaybackMetadata } from './playback-controller.js';

export interface PlaybackControlsProps {
  readonly playbackMetadata: SolutionPlaybackMetadata | null;
  readonly isSessionBusy: boolean;
  readonly canStepBack: boolean;
  readonly onPlay: () => void;
  readonly onPause: () => void;
  readonly onStepForward: () => void;
  readonly onStepBackward: () => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  playbackMetadata,
  isSessionBusy,
  canStepBack,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
}) => {
  if (!playbackMetadata || playbackMetadata.moves.length === 0) {
    return null;
  }

  const {
    moves,
    playbackIndex,
    playing,
    canonicalMoveInFlight,
  } = playbackMetadata;

  const totalMoves = moves.length;
  const isComplete = playbackIndex >= totalMoves;
  const canPlay = !playing && !isComplete && !isSessionBusy && !canonicalMoveInFlight;
  const canPause = playing || canonicalMoveInFlight;
  const canStepFwd = !playing && !isComplete && !isSessionBusy && !canonicalMoveInFlight;

  return (
    <section
      className="playback-controls-panel"
      aria-label="Solution Playback"
      data-testid="playback-controls"
    >
      <div className="playback-header">
        <h3 className="playback-title">Playback</h3>
        <span className="playback-counter" data-testid="playback-progress">
          {playbackIndex} / {totalMoves}
        </span>
      </div>

      <div className="playback-buttons-row">
        <button
          type="button"
          className="playback-btn step-back-btn"
          onClick={onStepBackward}
          disabled={!canStepBack}
          aria-label="Step solution backward"
          title="Step Backward"
        >
          ⏮ Step Back
        </button>

        {!playing ? (
          <button
            type="button"
            className="playback-btn play-btn"
            onClick={onPlay}
            disabled={!canPlay}
            aria-label="Play solution"
            title="Play Solution"
          >
            ▶ Play
          </button>
        ) : (
          <button
            type="button"
            className="playback-btn pause-btn"
            onClick={onPause}
            disabled={!canPause}
            aria-label="Pause solution"
            title="Pause Solution"
          >
            ⏸ Pause
          </button>
        )}

        <button
          type="button"
          className="playback-btn step-fwd-btn"
          onClick={onStepForward}
          disabled={!canStepFwd}
          aria-label="Step solution forward"
          title="Step Forward"
        >
          Step Fwd ⏭
        </button>
      </div>

      <div className="playback-moves-preview">
        {moves.map((m, idx) => {
          const isCurrent = idx === playbackIndex;
          const isPassed = idx < playbackIndex;
          return (
            <span
              key={idx}
              className={`playback-move-chip ${isCurrent ? 'current' : ''} ${isPassed ? 'passed' : ''}`}
            >
              {m.face}{m.direction === 'CCW' ? "'" : ''}
            </span>
          );
        })}
      </div>
    </section>
  );
};
