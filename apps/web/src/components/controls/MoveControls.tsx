/**
 * @file MoveControls.tsx
 * @description UI overlay providing 12 face move controls (U/D/F/B/R/L CW/CCW) with pointer isolation and disabled state during animation.
 */

import React from 'react';
import { FACES, type Face, type Direction, type Move } from '@gearcube/core';

export interface MoveControlsProps {
  readonly isAnimating: boolean;
  readonly onTriggerMove: (move: Move) => void;
}

interface FaceMoveGroupProps {
  readonly face: Face;
  readonly isAnimating: boolean;
  readonly onTriggerMove: (move: Move) => void;
}

const FaceMoveGroup: React.FC<FaceMoveGroupProps> = React.memo(
  ({ face, isAnimating, onTriggerMove }) => {
    const handleMove = (e: React.MouseEvent, direction: Direction) => {
      e.stopPropagation();
      if (!isAnimating) {
        onTriggerMove({ face, direction });
      }
    };

    return (
      <div className="face-control-card">
        <span className="face-label">{face}</span>
        <div className="button-pair">
          <button
            type="button"
            className="move-btn cw-btn"
            disabled={isAnimating}
            onClick={(e) => handleMove(e, 'CW')}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Rotate ${face} face Clockwise`}
            title={`${face} Clockwise (180°)`}
          >
            ↻
          </button>
          <button
            type="button"
            className="move-btn ccw-btn"
            disabled={isAnimating}
            onClick={(e) => handleMove(e, 'CCW')}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Rotate ${face} face Counter-Clockwise`}
            title={`${face} Counter-Clockwise (180°)`}
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
  ({ isAnimating, onTriggerMove }) => {
    return (
      <div
        className="move-controls-overlay"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="move-controls-panel">
          <div className="move-controls-header">
            <span className="panel-title">Face Controls</span>
            {isAnimating && <span className="animating-indicator">Turning...</span>}
          </div>
          <div className="faces-grid">
            {FACES.map((face) => (
              <FaceMoveGroup
                key={face}
                face={face}
                isAnimating={isAnimating}
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
