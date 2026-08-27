import { describe, it, expect, beforeAll } from 'vitest';
import { SOLVED_GEAR_CUBE_STATE, serializeLogicalState } from '@gearcube/core';
import {
  buildExactDistanceCorpus,
  createBenchmarkCaseId,
  type ExactDistanceCorpus,
} from '../src/corpus.js';

describe('Phase 5A Exact-Distance Corpus & Case Identity Gates', () => {
  let corpus: ExactDistanceCorpus;
  const solvedKey = serializeLogicalState(SOLVED_GEAR_CUBE_STATE);

  const EXPECTED_HISTOGRAM: Readonly<Record<number, number>> = Object.freeze({
    0: 1,
    1: 12,
    2: 111,
    3: 822,
    4: 3863,
    5: 11706,
    6: 16410,
    7: 8196,
    8: 351,
  });

  beforeAll(() => {
    corpus = buildExactDistanceCorpus();
  });

  it('EXACT_DISTANCE_CORPUS_CLOSURE_GATE: discovers exactly 41,472 reachable states', () => {
    expect(corpus.totalStates).toBe(41472);
  });

  it('EXACT_DISTANCE_SOLVED_GATE: contains solved state at exact distance 0', () => {
    expect(corpus.hasState(solvedKey)).toBe(true);
    expect(corpus.getExactDistance(solvedKey)).toBe(0);
    const depth0States = corpus.getStatesAtDepth(0);
    expect(depth0States).toEqual([solvedKey]);
  });

  it('EXACT_DISTANCE_DIAMETER_GATE: verifies maximum exact distance is 8', () => {
    expect(corpus.diameter).toBe(8);
    expect(corpus.getStatesAtDepth(8).length).toBe(351);
    expect(corpus.getStatesAtDepth(9).length).toBe(0);
  });

  it('EXACT_DISTANCE_HISTOGRAM_GATE: matches exact canonical distance distribution', () => {
    expect(corpus.histogram).toEqual(EXPECTED_HISTOGRAM);
  });

  it('BUCKET_TOTAL_GATE: sum of all depth buckets equals exactly 41,472', () => {
    let totalFromBuckets = 0;
    for (let d = 0; d <= corpus.diameter; d++) {
      totalFromBuckets += corpus.getStatesAtDepth(d).length;
    }
    expect(totalFromBuckets).toBe(41472);
  });

  it('CASE_ID_STABILITY_GATE: generates state-derived caseId invariant to external context', () => {
    const caseId = createBenchmarkCaseId(3, solvedKey);
    expect(caseId).toBe(`d3:${solvedKey}`);

    // Verify format for a depth 8 state
    const depth8States = corpus.getStatesAtDepth(8);
    expect(depth8States.length).toBeGreaterThan(0);
    const d8Key = depth8States[0];
    const d8CaseId = createBenchmarkCaseId(8, d8Key);
    expect(d8CaseId).toBe(`d8:${d8Key}`);
  });

  it('returns empty array for out-of-range depths', () => {
    expect(corpus.getStatesAtDepth(-1)).toEqual([]);
    expect(corpus.getStatesAtDepth(9)).toEqual([]);
    expect(corpus.getStatesAtDepth(100)).toEqual([]);
  });

  it('returns undefined distance for non-existent states', () => {
    expect(corpus.getExactDistance('NON_EXISTENT_STATE_KEY')).toBeUndefined();
    expect(corpus.hasState('NON_EXISTENT_STATE_KEY')).toBe(false);
  });
});
