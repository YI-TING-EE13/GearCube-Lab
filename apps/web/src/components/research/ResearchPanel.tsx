import React, { useCallback, useMemo, useState } from 'react';
import {
  validateBenchmarkSuiteConfig,
  BenchmarkConfigError,
  type BenchmarkSuiteConfig,
} from '@gearcube/benchmark';
import type { SolverAlgorithm } from '@gearcube/solvers';
import type { BenchmarkWorkerState } from './benchmark-worker-controller.js';
import {
  buildBenchmarkDownloadFilename,
  downloadBenchmarkText,
} from './download-helper.js';

export interface ResearchPanelProps {
  readonly benchmarkState: BenchmarkWorkerState;
  readonly onStartBenchmark: (config: BenchmarkSuiteConfig) => void;
  readonly onCancelBenchmark: () => void;
}

const CANONICAL_ALGORITHMS: readonly SolverAlgorithm[] = [
  'BFS',
  'BIDIRECTIONAL_BFS',
  'IDA_STAR',
];

const CANONICAL_DEPTHS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8];

const ALGORITHM_LABELS: Record<SolverAlgorithm, string> = {
  BFS: 'Breadth-First Search (BFS)',
  BIDIRECTIONAL_BFS: 'Bidirectional BFS',
  IDA_STAR: 'IDA*',
};

export const ResearchPanel: React.FC<ResearchPanelProps> = ({
  benchmarkState,
  onStartBenchmark,
  onCancelBenchmark,
}) => {
  // Form State
  const [suiteId, setSuiteId] = useState<string>('browser-research-v1');
  const [seed, setSeed] = useState<string>('GearCube-Lab');
  const [exactDepths, setExactDepths] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8]);
  const [casesPerDepth, setCasesPerDepth] = useState<string>('2');
  const [algorithms, setAlgorithms] = useState<SolverAlgorithm[]>([
    'BFS',
    'BIDIRECTIONAL_BFS',
    'IDA_STAR',
  ]);
  const [warmupRuns, setWarmupRuns] = useState<string>('0');
  const [measuredRuns, setMeasuredRuns] = useState<string>('1');
  const [maxNodes, setMaxNodes] = useState<string>('');
  const [maxDepth, setMaxDepth] = useState<string>('');

  // Local Static Validation Error State
  const [validationError, setValidationError] = useState<string | null>(null);

  const isBusy = benchmarkState.status === 'ACTIVE';

  // Field change handlers that clear static validation errors
  const handleSuiteIdChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSuiteId(e.target.value);
    setValidationError(null);
  }, []);

  const handleSeedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSeed(e.target.value);
    setValidationError(null);
  }, []);

  const handleDepthToggle = useCallback((depth: number) => {
    setExactDepths((prev) => {
      const next = prev.includes(depth)
        ? prev.filter((d) => d !== depth)
        : [...prev, depth];
      return next.sort((a, b) => a - b);
    });
    setValidationError(null);
  }, []);

  const handleAlgorithmToggle = useCallback((algo: SolverAlgorithm) => {
    setAlgorithms((prev) => {
      const nextSet = new Set(
        prev.includes(algo) ? prev.filter((a) => a !== algo) : [...prev, algo]
      );
      return CANONICAL_ALGORITHMS.filter((a) => nextSet.has(a));
    });
    setValidationError(null);
  }, []);

  const handleCasesPerDepthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCasesPerDepth(e.target.value);
    setValidationError(null);
  }, []);

  const handleWarmupRunsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWarmupRuns(e.target.value);
    setValidationError(null);
  }, []);

  const handleMeasuredRunsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMeasuredRuns(e.target.value);
    setValidationError(null);
  }, []);

  const handleMaxNodesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxNodes(e.target.value);
    setValidationError(null);
  }, []);

  const handleMaxDepthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxDepth(e.target.value);
    setValidationError(null);
  }, []);

  // Form submission and static validation
  const handleRunBenchmark = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (isBusy) return;

      const parseRequiredNumber = (val: string): number =>
        val.trim() === '' ? NaN : Number(val);

      const parsedCasesPerDepth = parseRequiredNumber(casesPerDepth);
      const parsedWarmupRuns = parseRequiredNumber(warmupRuns);
      const parsedMeasuredRuns = parseRequiredNumber(measuredRuns);

      const parsedMaxNodes =
        maxNodes.trim() === '' ? undefined : Number(maxNodes);
      const parsedMaxDepth =
        maxDepth.trim() === '' ? undefined : Number(maxDepth);

      const hasLimits = parsedMaxNodes !== undefined || parsedMaxDepth !== undefined;
      const limits = hasLimits
        ? {
            ...(parsedMaxNodes !== undefined ? { maxNodes: parsedMaxNodes } : {}),
            ...(parsedMaxDepth !== undefined ? { maxDepth: parsedMaxDepth } : {}),
          }
        : undefined;

      const rawConfig = {
        schemaVersion: '1',
        suiteId,
        seed,
        exactDepths,
        casesPerDepth: parsedCasesPerDepth,
        algorithms,
        warmupRuns: parsedWarmupRuns,
        measuredRuns: parsedMeasuredRuns,
        ...(limits !== undefined ? { limits } : {}),
      };

      try {
        const validatedConfig = validateBenchmarkSuiteConfig(rawConfig);
        setValidationError(null);
        onStartBenchmark(validatedConfig);
      } catch (err) {
        if (err instanceof BenchmarkConfigError) {
          setValidationError(err.message);
        } else {
          setValidationError(
            err instanceof Error ? err.message : 'Invalid configuration'
          );
        }
      }
    },
    [
      isBusy,
      suiteId,
      seed,
      exactDepths,
      casesPerDepth,
      algorithms,
      warmupRuns,
      measuredRuns,
      maxNodes,
      maxDepth,
      onStartBenchmark,
    ]
  );

  // Download handlers
  const handleDownloadJson = useCallback(() => {
    if (benchmarkState.status !== 'COMPLETED') return;
    const filename = buildBenchmarkDownloadFilename(
      benchmarkState.config.suiteId,
      'json'
    );
    downloadBenchmarkText(
      benchmarkState.jsonText,
      filename,
      'application/json;charset=utf-8;'
    );
  }, [benchmarkState]);

  const handleDownloadCsv = useCallback(() => {
    if (benchmarkState.status !== 'COMPLETED') return;
    const filename = buildBenchmarkDownloadFilename(
      benchmarkState.config.suiteId,
      'csv'
    );
    downloadBenchmarkText(
      benchmarkState.csvText,
      filename,
      'text/csv;charset=utf-8;'
    );
  }, [benchmarkState]);

  // Flattened summary rows
  const summaryRows = useMemo(() => {
    if (benchmarkState.status !== 'COMPLETED') return [];
    const rows: Array<{
      algorithm: SolverAlgorithm;
      algorithmLabel: string;
      exactDepth: number;
      totalTrials: number;
      solvedCount: number;
      limitCount: number;
      medianNodesExpanded: number;
      medianNodesGenerated: number;
      medianElapsedMs: number;
    }> = [];

    for (const algSummary of benchmarkState.summary.algorithms) {
      for (const depthSummary of algSummary.byDepth) {
        rows.push({
          algorithm: algSummary.algorithm,
          algorithmLabel: ALGORITHM_LABELS[algSummary.algorithm] || algSummary.algorithm,
          exactDepth: depthSummary.exactDepth,
          totalTrials: depthSummary.totalTrials,
          solvedCount: depthSummary.solvedCount,
          limitCount: depthSummary.limitCount,
          medianNodesExpanded: depthSummary.medianNodesExpanded,
          medianNodesGenerated: depthSummary.medianNodesGenerated,
          medianElapsedMs: depthSummary.medianElapsedMs,
        });
      }
    }
    return rows;
  }, [benchmarkState]);

  return (
    <section
      className="research-panel"
      aria-label="Research Mode Benchmark Suite"
      data-testid="research-panel"
    >
      <div className="research-panel-header">
        <div className="research-header-title-row">
          <h2 className="research-panel-title">Classical Solver Benchmark</h2>
          <span
            className={`research-status-badge status-${benchmarkState.status.toLowerCase()}`}
            data-testid="research-status"
          >
            {benchmarkState.status === 'IDLE' && 'Idle'}
            {benchmarkState.status === 'ACTIVE' && 'Running benchmark...'}
            {benchmarkState.status === 'COMPLETED' && 'Completed'}
            {benchmarkState.status === 'CANCELLED' && 'Cancelled'}
            {benchmarkState.status === 'ERROR' && 'Error'}
          </span>
        </div>
        <p className="research-panel-subtitle">
          In-browser benchmarking harness for classical Gear Cube search algorithms.
        </p>
      </div>

      {validationError && (
        <div
          className="research-error-banner"
          role="alert"
          data-testid="research-config-error"
        >
          <strong>Validation Error:</strong> {validationError}
        </div>
      )}

      {benchmarkState.status === 'ERROR' && (
        <div
          className="research-error-banner"
          role="alert"
          data-testid="research-worker-error"
        >
          <strong>{benchmarkState.errorKind}:</strong> {benchmarkState.error}
        </div>
      )}

      <form onSubmit={handleRunBenchmark} className="research-form">
        <fieldset className="research-fieldset" disabled={isBusy}>
          <legend className="research-legend">Suite Configuration</legend>

          <div className="research-form-grid">
            <div className="research-field">
              <label htmlFor="research-suite-id" className="research-label">
                Suite ID
              </label>
              <input
                id="research-suite-id"
                type="text"
                className="research-input"
                value={suiteId}
                onChange={handleSuiteIdChange}
                disabled={isBusy}
                data-testid="research-input-suite-id"
                required
              />
            </div>

            <div className="research-field">
              <label htmlFor="research-seed" className="research-label">
                PRNG Seed
              </label>
              <input
                id="research-seed"
                type="text"
                className="research-input"
                value={seed}
                onChange={handleSeedChange}
                disabled={isBusy}
                data-testid="research-input-seed"
              />
            </div>

            <div className="research-field">
              <label htmlFor="research-cases-per-depth" className="research-label">
                Cases Per Depth
              </label>
              <input
                id="research-cases-per-depth"
                type="number"
                min="1"
                className="research-input"
                value={casesPerDepth}
                onChange={handleCasesPerDepthChange}
                disabled={isBusy}
                data-testid="research-input-cases-per-depth"
                required
              />
            </div>

            <div className="research-field">
              <label htmlFor="research-measured-runs" className="research-label">
                Measured Runs / Case
              </label>
              <input
                id="research-measured-runs"
                type="number"
                min="1"
                className="research-input"
                value={measuredRuns}
                onChange={handleMeasuredRunsChange}
                disabled={isBusy}
                data-testid="research-input-measured-runs"
                required
              />
            </div>

            <div className="research-field">
              <label htmlFor="research-warmup-runs" className="research-label">
                Warmup Runs
              </label>
              <input
                id="research-warmup-runs"
                type="number"
                min="0"
                className="research-input"
                value={warmupRuns}
                onChange={handleWarmupRunsChange}
                disabled={isBusy}
                data-testid="research-input-warmup-runs"
                required
              />
            </div>

            <div className="research-field">
              <label htmlFor="research-max-nodes" className="research-label">
                Max Nodes (Optional)
              </label>
              <input
                id="research-max-nodes"
                type="number"
                min="1"
                placeholder="Unlimited"
                className="research-input"
                value={maxNodes}
                onChange={handleMaxNodesChange}
                disabled={isBusy}
                data-testid="research-input-max-nodes"
              />
            </div>

            <div className="research-field">
              <label htmlFor="research-max-depth" className="research-label">
                Max Depth (Optional)
              </label>
              <input
                id="research-max-depth"
                type="number"
                min="0"
                placeholder="Unlimited"
                className="research-input"
                value={maxDepth}
                onChange={handleMaxDepthChange}
                disabled={isBusy}
                data-testid="research-input-max-depth"
              />
            </div>
          </div>

          <div className="research-group-section">
            <span className="research-group-title">Exact Distance Depths (1–8):</span>
            <div className="research-checkbox-group">
              {CANONICAL_DEPTHS.map((depth) => (
                <label key={depth} className="research-checkbox-label">
                  <input
                    id={`research-depth-${depth}`}
                    name="exactDepths"
                    value={String(depth)}
                    type="checkbox"
                    checked={exactDepths.includes(depth)}
                    onChange={() => handleDepthToggle(depth)}
                    disabled={isBusy}
                    data-testid={`research-checkbox-depth-${depth}`}
                  />
                  <span>Depth {depth}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="research-group-section">
            <span className="research-group-title">Algorithms:</span>
            <div className="research-checkbox-group">
              {CANONICAL_ALGORITHMS.map((algo) => (
                <label key={algo} className="research-checkbox-label">
                  <input
                    id={`research-algorithm-${algo}`}
                    name="algorithms"
                    value={algo}
                    type="checkbox"
                    checked={algorithms.includes(algo)}
                    onChange={() => handleAlgorithmToggle(algo)}
                    disabled={isBusy}
                    data-testid={`research-checkbox-algo-${algo}`}
                  />
                  <span>{ALGORITHM_LABELS[algo]}</span>
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        {!isBusy && (
          <div className="research-action-row">
            <button
              type="submit"
              className="research-btn run-btn"
              data-testid="research-run-button"
            >
              Run Benchmark
            </button>
          </div>
        )}
      </form>

      {isBusy && (
        <div className="research-action-row">
          <button
            type="button"
            className="research-btn cancel-btn"
            onClick={onCancelBenchmark}
            data-testid="research-cancel-button"
          >
            Cancel Benchmark
          </button>
        </div>
      )}

      {benchmarkState.status === 'COMPLETED' && (
        <section className="research-results-section" data-testid="research-summary">
          <div className="research-results-header">
            <h3 className="research-results-title">Benchmark Results</h3>
            <div className="research-download-actions">
              <button
                type="button"
                className="research-btn download-btn"
                onClick={handleDownloadJson}
                data-testid="research-download-json"
              >
                Download JSON
              </button>
              <button
                type="button"
                className="research-btn download-btn"
                onClick={handleDownloadCsv}
                data-testid="research-download-csv"
              >
                Download CSV
              </button>
            </div>
          </div>

          <div className="research-meta-grid">
            <div className="meta-card">
              <span className="meta-label">Suite ID</span>
              <span className="meta-value">{benchmarkState.config.suiteId}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Sampled Cases</span>
              <span className="meta-value">{benchmarkState.summary.totalCases}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Measured Trials</span>
              <span className="meta-value">{benchmarkState.summary.totalTrials}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Platform</span>
              <span className="meta-value">{benchmarkState.environment.platform}</span>
            </div>
            <div className="meta-card">
              <span className="meta-label">Execution Time</span>
              <span className="meta-value">
                {new Date(benchmarkState.environment.executionTimestamp).toLocaleTimeString()}
              </span>
            </div>
            {benchmarkState.environment.logicalCores !== undefined && (
              <div className="meta-card">
                <span className="meta-label">Logical Cores</span>
                <span className="meta-value">{benchmarkState.environment.logicalCores}</span>
              </div>
            )}
          </div>

          <div className="research-algorithm-cards">
            {benchmarkState.summary.algorithms.map((alg) => (
              <div key={alg.algorithm} className="alg-summary-card">
                <div className="alg-summary-title">{ALGORITHM_LABELS[alg.algorithm]}</div>
                <div className="alg-metrics">
                  <div>
                    Solved: <strong>{alg.totalSolved}</strong> / Limits:{' '}
                    <strong>{alg.totalLimits}</strong>
                  </div>
                  <div>
                    Mean Expanded: <strong>{alg.overallMeanNodesExpanded.toFixed(1)}</strong>
                  </div>
                  <div>
                    Median Elapsed:{' '}
                    <strong>{alg.overallMedianElapsedMs.toFixed(2)} ms</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="research-table-container">
            <table
              className="research-summary-table"
              data-testid="research-summary-table"
            >
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Depth</th>
                  <th>Trials</th>
                  <th>Solved</th>
                  <th>Limits</th>
                  <th>Median Nodes Expanded</th>
                  <th>Median Nodes Generated</th>
                  <th>Median Elapsed (ms)</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, idx) => (
                  <tr key={`${row.algorithm}-${row.exactDepth}-${idx}`}>
                    <td>{row.algorithmLabel}</td>
                    <td>{row.exactDepth}</td>
                    <td>{row.totalTrials}</td>
                    <td>{row.solvedCount}</td>
                    <td>{row.limitCount}</td>
                    <td>{row.medianNodesExpanded.toLocaleString()}</td>
                    <td>{row.medianNodesGenerated.toLocaleString()}</td>
                    <td>{row.medianElapsedMs.toFixed(2)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="research-metrics-notice">
            <p>
              <strong>Metric Classification:</strong> Nodes expanded and generated are{' '}
              <em>deterministic search-effort metrics</em>. Elapsed timing is{' '}
              <em>observational and browser-environment-specific</em>.
            </p>
          </div>
        </section>
      )}
    </section>
  );
};
