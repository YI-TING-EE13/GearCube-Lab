import React from 'react';
import type { SolverAlgorithm } from '@gearcube/solvers';
import type { SolverWorkerState } from './solver-worker-controller.js';

export interface SolvePanelProps {
  readonly isSolved: boolean;
  readonly isSessionBusy: boolean;
  readonly solverState: SolverWorkerState;
  readonly selectedAlgorithm: SolverAlgorithm;
  readonly onSelectAlgorithm: (algorithm: SolverAlgorithm) => void;
  readonly onSolve: () => void;
  readonly onCancel: () => void;
}

export const SolvePanel: React.FC<SolvePanelProps> = ({
  isSolved,
  isSessionBusy,
  solverState,
  selectedAlgorithm,
  onSelectAlgorithm,
  onSolve,
  onCancel,
}) => {
  const isSearching = solverState.status === 'ACTIVE';
  const canSolve = !isSessionBusy && !isSearching;

  return (
    <section
      className="solve-panel"
      aria-label="Solver Controls"
    >
      <div className="solve-panel-header">
        <h3 className="solve-panel-title">Solver</h3>
        <span
          className={`cube-status-tag ${isSolved ? 'solved' : 'unsolved'}`}
          data-testid="cube-status"
        >
          Cube: {isSolved ? 'Solved' : 'Unsolved'}
        </span>
      </div>

      <div className="solver-controls-row">
        <label htmlFor="solver-algorithm-select" className="solver-label">
          Algorithm:
        </label>
        <select
          id="solver-algorithm-select"
          className="solver-select"
          value={selectedAlgorithm}
          onChange={(e) => onSelectAlgorithm(e.target.value as SolverAlgorithm)}
          disabled={isSearching}
          aria-label="Solver Algorithm"
        >
          <option value="IDA_STAR">IDA* (Recommended)</option>
          <option value="BIDIRECTIONAL_BFS">Bidirectional BFS</option>
          <option value="BFS">Breadth-First Search (BFS)</option>
        </select>
      </div>

      <div className="solver-action-row">
        {!isSearching ? (
          <button
            type="button"
            className="solver-btn solve-btn"
            onClick={onSolve}
            disabled={!canSolve}
            aria-label="Solve current state"
          >
            Solve
          </button>
        ) : (
          <button
            type="button"
            className="solver-btn cancel-btn"
            onClick={onCancel}
            aria-label="Cancel search"
          >
            Cancel Search
          </button>
        )}
      </div>

      <div className="solver-status-container" data-testid="solver-status">
        <div className="solver-status-line">
          <span className="status-label">Status:</span>
          <span className={`status-value status-${solverState.status.toLowerCase()}`}>
            {solverState.status === 'IDLE' && 'Idle'}
            {solverState.status === 'ACTIVE' && 'Searching...'}
            {solverState.status === 'SOLVED' && 'Solved'}
            {solverState.status === 'LIMIT_REACHED' && 'Limit Reached'}
            {solverState.status === 'ERROR' && 'Error'}
          </span>
        </div>

        {solverState.status === 'ACTIVE' && solverState.latestTelemetry && (
          <div className="solver-telemetry-box" data-testid="solver-telemetry">
            <div>Nodes: {solverState.latestTelemetry.nodesExpanded.toLocaleString()}</div>
            <div>Time: {(solverState.latestTelemetry.elapsedMs / 1000).toFixed(2)}s</div>
            {'threshold' in solverState.latestTelemetry && (
              <div>Depth Threshold: {solverState.latestTelemetry.threshold}</div>
            )}
          </div>
        )}

        {solverState.status === 'SOLVED' && (
          <div className="solver-result-box" data-testid="solver-solution-summary">
            <div>Solution Depth: {solverState.result.depth} moves</div>
            <div>Nodes Expanded: {solverState.result.counters.nodesExpanded.toLocaleString()}</div>
            <div>Time: {(solverState.result.elapsedMs / 1000).toFixed(2)}s</div>
          </div>
        )}

        {solverState.status === 'LIMIT_REACHED' && (
          <div className="solver-limit-box">
            Limit exceeded: {solverState.result.limit} ({solverState.result.counters.nodesExpanded.toLocaleString()} nodes)
          </div>
        )}

        {solverState.status === 'ERROR' && (
          <div className="solver-error-box">
            {solverState.error}
          </div>
        )}
      </div>
    </section>
  );
};
