/**
 * @file MoveControls.tsx
 * @description UI overlay providing 12 face move controls with Phase 2D physical half-turn lock guidance and selective button enablement.
 */

import React from 'react';
import { FACES, type Face, type Direction, type Move } from '@gearcube/core';
import type { StagedMoveSession } from '../cube/animation';

export interface MoveControlsProps {
  readonly isAnimating: boolean;
  readonly stagedMove: StagedMoveSession | null;
  readonly onTriggerMove: (move: Move) => void;
}

interface FaceMoveGroupProps {
  readonly face: Face;
  readonly isAnimating: boolean;
  readonly stagedMove: StagedMoveSession | null;
  readonly onTriggerMove: (move: Move) => void;
}

const FaceMoveGroup: React.FC<FaceMoveGroupProps> = React.memo(
  ({ face, isAnimating, stagedMove, onTriggerMove }) => {
    const isLocked = stagedMove?.phase === 'HALF_TURN_LOCKED';
    const isStagedFace = stagedMove?.move.face === face;

    // Disabled logic:
    // If animating: all disabled
    // If half-turn locked: only the staged face is enabled; other 5 faces disabled
    const isGroupDisabled = isAnimating || (isLocked && !isStagedFace);

    const handleMove = (e: React.MouseEvent, direction: Direction) => {
      e.stopPropagation();
      if (!isGroupDisabled) {
        onTriggerMove({ face, direction });
      }
    };

    // Tooltip and accessibility text tailored to half-turn staging state
    const getButtonTitle = (direction: Direction): string => {
      if (isLocked && isStagedFace) {
        if (stagedMove.move.direction === direction) {
          return `${face} ${direction} — Finish 180° turn`;
        } else {
          return `${face} ${direction} — Reverse to origin`;
        }
      }
      return `${face} ${direction === 'CW' ? 'Clockwise' : 'Counter-Clockwise'} (90° physical step)`;
    };

    const isCwFinish = isLocked && isStagedFace && stagedMove.move.direction === 'CW';
    const isCcwFinish = isLocked && isStagedFace && stagedMove.move.direction === 'CCW';

    return (
      <div className={`face-control-card ${isLocked && isStagedFace ? 'active-staged-card' : ''}`}>
        <span className="face-label">{face}</span>
        <div className="button-pair">
          <button
            type="button"
            className={`move-btn cw-btn ${isCwFinish ? 'finish-btn' : ''}`}
            disabled={isGroupDisabled}
            onClick={(e) => handleMove(e, 'CW')}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={getButtonTitle('CW')}
            title={getButtonTitle('CW')}
          >
            ↻
          </button>
          <button
            type="button"
            className={`move-btn ccw-btn ${isCcwFinish ? 'finish-btn' : ''}`}
            disabled={isGroupDisabled}
            onClick={(e) => handleMove(e, 'CCW')}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={getButtonTitle('CCW')}
            title={getButtonTitle('CCW')}
          >
            ↺
          </button>
        </div>
      </div>
    );
  }
);

FaceMoveGroup.displayName = 'FaceMoveGroup';

export const MoveControls: React.FC<MoveControlsProps> = React.memo(
  ({ isAnimating, stagedMove, onTriggerMove }) => {
    const isLocked = stagedMove?.phase === 'HALF_TURN_LOCKED';

    return (
      <div
        className="move-controls-overlay"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className={`move-controls-panel ${isLocked ? 'panel-half-turn-locked' : ''}`}>
          <div className="move-controls-header">
            {isLocked && stagedMove ? (
              <div className="half-turn-guidance">
                <span className="locked-badge">HALF-TURN: {stagedMove.move.face} {stagedMove.move.direction}</span>
                <span className="locked-action-hint">
                  Press {stagedMove.move.direction === 'CW' ? '↻' : '↺'} to Finish or {stagedMove.move.direction === 'CW' ? '↺' : '↻'} to Reverse
                </span>
              </div>
            ) : isAnimating ? (
              <span className="animating-indicator">Turning (90°)...</span>
            ) : (
              <span className="panel-title">Face Controls</span>
            )}
          </div>
          <div className="faces-grid">
            {FACES.map((face) => (
              <FaceMoveGroup
                key={face}
                face={face}
                isAnimating={isAnimating}
                stagedMove={stagedMove}
                onTriggerMove={onTriggerMove}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
);

MoveControls.displayName = 'MoveControls';
