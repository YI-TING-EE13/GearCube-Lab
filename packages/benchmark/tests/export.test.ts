import { describe, it, expect } from 'vitest';
import { serializeBenchmarkReportCsv, serializeBenchmarkReportJson } from '../src/export.js';
import type { BenchmarkReport } from '../src/types.js';

describe('Phase 5B JSON & CSV Exporter Gates', () => {
  const mockReport: BenchmarkReport = {
    schemaVersion: '1',
    config: {
      schemaVersion: '1',
      suiteId: 'suite-sample',
      seed: 'seed-xyz',
      exactDepths: [1, 2],
      casesPerDepth: 1,
      algorithms: ['BFS', 'IDA_STAR'],
      warmupRuns: 0,
      measuredRuns: 1,
      limits: { maxNodes: 5000 },
    },
    environment: {
      platform: 'node',
      executionTimestamp: '2026-08-27T00:00:00.000Z',
      os: 'linux',
      architecture: 'x64',
      nodeVersion: 'v22.12.0',
    },
    cases: [
      { caseId: 'd1:STATE_A', stateKey: 'STATE_A', exactDepth: 1 },
      { caseId: 'd2:STATE_B', stateKey: 'STATE_B', exactDepth: 2 },
    ],
    trials: [
      {
        caseId: 'd1:STATE_A',
        exactDepth: 1,
        algorithm: 'BFS',
        repetitionIndex: 0,
        status: 'SOLVED',
        solutionDepth: 1,
        solutionMoves: [{ face: 'F', direction: 'CW' }],
        nodesExpanded: 13,
        nodesGenerated: 144,
        elapsedMs: 1.25,
      },
      {
        caseId: 'd1:STATE_A',
        exactDepth: 1,
        algorithm: 'IDA_STAR',
        repetitionIndex: 0,
        status: 'SOLVED',
        solutionDepth: 1,
        solutionMoves: [{ face: 'F', direction: 'CW' }],
        nodesExpanded: 5,
        nodesGenerated: 36,
        elapsedMs: 0.85,
      },
      {
        caseId: 'd2:STATE_B',
        exactDepth: 2,
        algorithm: 'BFS',
        repetitionIndex: 0,
        status: 'LIMIT_REACHED',
        limitReason: 'MAX_NODES',
        nodesExpanded: 5000,
        nodesGenerated: 12000,
        elapsedMs: 15.4,
      },
    ],
    summary: {
      totalCases: 2,
      totalTrials: 3,
      algorithms: [
        {
          algorithm: 'BFS',
          byDepth: [
            {
              exactDepth: 1,
              totalTrials: 1,
              solvedCount: 1,
              limitCount: 0,
              meanNodesExpanded: 13,
              medianNodesExpanded: 13,
              meanNodesGenerated: 144,
              medianNodesGenerated: 144,
              meanElapsedMs: 1.25,
              medianElapsedMs: 1.25,
            },
            {
              exactDepth: 2,
              totalTrials: 1,
              solvedCount: 0,
              limitCount: 1,
              meanNodesExpanded: 5000,
              medianNodesExpanded: 5000,
              meanNodesGenerated: 12000,
              medianNodesGenerated: 12000,
              meanElapsedMs: 15.4,
              medianElapsedMs: 15.4,
            },
          ],
          totalSolved: 1,
          totalLimits: 1,
          overallMeanNodesExpanded: 2506.5,
          overallMedianElapsedMs: 8.325,
        },
        {
          algorithm: 'IDA_STAR',
          byDepth: [
            {
              exactDepth: 1,
              totalTrials: 1,
              solvedCount: 1,
              limitCount: 0,
              meanNodesExpanded: 5,
              medianNodesExpanded: 5,
              meanNodesGenerated: 36,
              medianNodesGenerated: 36,
              meanElapsedMs: 0.85,
              medianElapsedMs: 0.85,
            },
          ],
          totalSolved: 1,
          totalLimits: 0,
          overallMeanNodesExpanded: 5,
          overallMedianElapsedMs: 0.85,
        },
      ],
    },
  };

  describe('JSON Export', () => {
    it('JSON_ROUNDTRIP: losslessly round-trips benchmark report through JSON serialization', () => {
      const json = serializeBenchmarkReportJson(mockReport);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(mockReport);
    });
  });

  describe('CSV Export', () => {
    it('CSV_SCHEMA_GATE: produces exact 14 columns header and correct trial rows', () => {
      const csv = serializeBenchmarkReportCsv(mockReport);
      const lines = csv.trim().split('\n');

      expect(lines.length).toBe(4); // Header + 3 trials

      const expectedHeader =
        'schemaVersion,suiteId,seed,caseId,exactDepth,algorithm,repetitionIndex,status,solutionDepth,solutionMoves,nodesExpanded,nodesGenerated,limitReason,elapsedMs';
      expect(lines[0]).toBe(expectedHeader);

      // Row 1: Solved BFS
      expect(lines[1]).toBe('1,suite-sample,seed-xyz,d1:STATE_A,1,BFS,0,SOLVED,1,F_CW,13,144,,1.25');

      // Row 2: Solved IDA_STAR
      expect(lines[2]).toBe('1,suite-sample,seed-xyz,d1:STATE_A,1,IDA_STAR,0,SOLVED,1,F_CW,5,36,,0.85');

      // Row 3: Limit reached BFS
      expect(lines[3]).toBe('1,suite-sample,seed-xyz,d2:STATE_B,2,BFS,0,LIMIT_REACHED,,,5000,12000,MAX_NODES,15.4');
    });

    it('CSV_ESCAPING: properly escapes commas, quotes, and newlines in RFC-4180 format', () => {
      const hostileReport: BenchmarkReport = {
        ...mockReport,
        config: {
          ...mockReport.config,
          suiteId: 'suite,"alpha",complex',
          seed: 'seed\nwith\rnewline and "quotes"',
        },
      };

      const csv = serializeBenchmarkReportCsv(hostileReport);
      expect(csv.includes('"suite,""alpha"",complex"')).toBe(true);
      expect(csv.includes('"seed\nwith\rnewline and ""quotes"""')).toBe(true);
    });
  });
});