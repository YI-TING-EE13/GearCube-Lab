import type { BenchmarkReport, BenchmarkTrialResult } from './types.js';

/**
 * Serializes a complete BenchmarkReport into a formatted JSON string.
 */
export function serializeBenchmarkReportJson(report: BenchmarkReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Escapes a single CSV field pursuant to RFC-4180 rules.
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    const escaped = field.replaceAll('"', '""');
    return '"' + escaped + '"';
  }
  return field;
}

/**
 * Formats a trial's solution moves as space-delimited <FACE>_<DIRECTION> tokens.
 */
function formatSolutionMoves(trial: BenchmarkTrialResult): string {
  if (trial.status === 'SOLVED') {
    return trial.solutionMoves.map((m) => `${m.face}_${m.direction}`).join(' ');
  }
  return '';
}

/**
 * Serializes measured trials into a 14-column RFC-4180 compliant CSV string.
 */
export function serializeBenchmarkReportCsv(report: BenchmarkReport): string {
  const header = [
    'schemaVersion',
    'suiteId',
    'seed',
    'caseId',
    'exactDepth',
    'algorithm',
    'repetitionIndex',
    'status',
    'solutionDepth',
    'solutionMoves',
    'nodesExpanded',
    'nodesGenerated',
    'limitReason',
    'elapsedMs',
  ].join(',');

  const rows: string[] = [header];

  for (const trial of report.trials) {
    const rowFields: string[] = [
      escapeCsvField(report.schemaVersion),
      escapeCsvField(report.config.suiteId),
      escapeCsvField(report.config.seed),
      escapeCsvField(trial.caseId),
      String(trial.exactDepth),
      escapeCsvField(trial.algorithm),
      String(trial.repetitionIndex),
      escapeCsvField(trial.status),
      trial.status === 'SOLVED' ? String(trial.solutionDepth) : '',
      escapeCsvField(formatSolutionMoves(trial)),
      String(trial.nodesExpanded),
      String(trial.nodesGenerated),
      trial.status === 'LIMIT_REACHED' ? escapeCsvField(trial.limitReason) : '',
      String(trial.elapsedMs),
    ];

    rows.push(rowFields.join(','));
  }

  return rows.join('\n') + '\n';
}