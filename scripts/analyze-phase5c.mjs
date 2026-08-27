import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * PHASE 5C DETERMINISTIC ANALYSIS SCRIPT
 *
 * Transaction / Fail-Safe Policy:
 * 1. Read-only validation phase:
 *    - Validates exact SHA-256 of all 5 raw JSON files and 3 config files.
 *    - Parses and validates committed config files against strict schema.
 *    - Validates report.config identity against committed configs for all 5 reports.
 *    - Validates structural and timing identity, invariants, and depth distributions.
 *    - Validates timing replicate case sequences and deterministic trial projections.
 * 2. In-memory computation phase:
 *    - Computes structural-by-depth CSV, timing-by-depth CSV, and reproducibility JSON completely in memory.
 * 3. Atomic write phase:
 *    - Writes each output to a .tmp file first.
 *    - Atomically renames .tmp files to canonical filenames.
 *    - If any error occurs during write or rename, all .tmp files and partial canonical targets are removed so no partial derived output is left behind.
 */

const EXPECTED_RAW_SHA256 = {
  'structural-depth1.json': '53ef6938f1355b6c758339b2d64a0851118e45dfabc7ce10b382a2147a7a89f1',
  'structural-depth2-8.json': '769d73674e7153c6b02be35c61674f4dd9e1dd83c2e910c414347f5aa06b0d62',
  'timing-r1.json': 'fa6746df41be905e1bd3457681b4fc3fb946be160e0e6b6d3d551b02b94ad955',
  'timing-r2.json': '49a5e72ec9131a81d8c76619cf3ed287153d440dbacf563992230f44e5cc7f8c',
  'timing-r3.json': '9f31f814dadbe13f685bc3b088ee04b38387b7525c9c8f46f5e6ca0c75161cd4',
};

const EXPECTED_CONFIG_SHA256 = {
  'structural-depth1.json': 'cf88e2f5607a81b008ed5133ef08b8c74d0ad0a83ed87b9fb7c85d427cbafffe',
  'structural-depth2-8.json': 'dfc1d2c00e65fdadb4c81cc034d9e9cf15b63b4167e739fd03bef541da4364fd',
  'timing.json': '583fbd0f966941af6695d4925a993c5c697bf7be05010de5c37b5fa664bb4b44',
};

const EXPECTED_CONFIG_KEYS = [
  'schemaVersion',
  'suiteId',
  'seed',
  'exactDepths',
  'casesPerDepth',
  'algorithms',
  'warmupRuns',
  'measuredRuns',
];

const CANONICAL_BUCKET_SIZES = {
  1: 12,
  2: 111,
  3: 822,
  4: 3863,
  5: 11706,
  6: 16410,
  7: 8196,
  8: 351,
};

const ALGORITHMS = ['BFS', 'BIDIRECTIONAL_BFS', 'IDA_STAR'];

function computeSha256(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').toLowerCase();
}

function computeMedian(sortedArr) {
  const n = sortedArr.length;
  if (n === 0) throw new Error('Cannot compute median of empty array');
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) {
    return sortedArr[mid];
  }
  return (sortedArr[mid - 1] + sortedArr[mid]) / 2;
}

function computeStats(arr) {
  if (arr.length === 0) throw new Error('Cannot compute stats of empty array');
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const min = sorted[0];
  const max = sorted[n - 1];
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;
  const median = computeMedian(sorted);

  let lowerHalf, upperHalf;
  if (n % 2 === 0) {
    lowerHalf = sorted.slice(0, n / 2);
    upperHalf = sorted.slice(n / 2);
  } else {
    lowerHalf = sorted.slice(0, Math.floor(n / 2));
    upperHalf = sorted.slice(Math.floor(n / 2) + 1);
  }

  const q1 = computeMedian(lowerHalf);
  const q3 = computeMedian(upperHalf);
  const iqr = q3 - q1;

  return { mean, median, min, max, q1, q3, iqr };
}

function validateConfigObject(cfg, label) {
  const keys = Object.keys(cfg);
  if (JSON.stringify(keys) !== JSON.stringify(EXPECTED_CONFIG_KEYS)) {
    throw new Error(`${label}: config keys mismatch: ${keys.join(', ')} vs ${EXPECTED_CONFIG_KEYS.join(', ')}`);
  }
  if ('limits' in cfg) throw new Error(`${label}: limits property must be absent`);
  if (cfg.schemaVersion !== '1') throw new Error(`${label}: schemaVersion != "1"`);
  if (typeof cfg.suiteId !== 'string' || cfg.suiteId.length === 0) throw new Error(`${label}: invalid suiteId`);
  if (typeof cfg.seed !== 'string' || cfg.seed.length === 0) throw new Error(`${label}: invalid seed`);
  if (!Array.isArray(cfg.exactDepths) || cfg.exactDepths.length === 0) throw new Error(`${label}: invalid exactDepths`);
  if (!Number.isInteger(cfg.casesPerDepth) || cfg.casesPerDepth <= 0) throw new Error(`${label}: invalid casesPerDepth`);
  if (!Array.isArray(cfg.algorithms) || JSON.stringify(cfg.algorithms) !== JSON.stringify(ALGORITHMS)) {
    throw new Error(`${label}: invalid algorithms`);
  }
  if (!Number.isInteger(cfg.warmupRuns) || cfg.warmupRuns < 0) throw new Error(`${label}: invalid warmupRuns`);
  if (!Number.isInteger(cfg.measuredRuns) || cfg.measuredRuns <= 0) throw new Error(`${label}: invalid measuredRuns`);
}

function main() {
  const rawDir = path.join('docs', 'research', 'phase5c', 'raw');
  const configDir = path.join('docs', 'research', 'phase5c', 'configs');
  const derivedDir = path.join('docs', 'research', 'phase5c', 'derived');

  // ==========================================
  // 1. Verify Raw Hashes
  // ==========================================
  for (const [filename, expectedHash] of Object.entries(EXPECTED_RAW_SHA256)) {
    const filePath = path.join(rawDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing raw file: ${filePath}`);
    }
    const actualHash = computeSha256(filePath);
    if (actualHash !== expectedHash) {
      throw new Error(`Raw SHA256 mismatch for ${filename}: expected ${expectedHash}, got ${actualHash}`);
    }
  }

  // ==========================================
  // 2. Verify Config Hashes & Parse Committed Configs
  // ==========================================
  const committedConfigs = {};
  for (const [filename, expectedHash] of Object.entries(EXPECTED_CONFIG_SHA256)) {
    const filePath = path.join(configDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing config file: ${filePath}`);
    }
    const actualHash = computeSha256(filePath);
    if (actualHash !== expectedHash) {
      throw new Error(`Config SHA256 mismatch for ${filename}: expected ${expectedHash}, got ${actualHash}`);
    }
    const rawText = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(rawText);
    validateConfigObject(parsed, `committed config ${filename}`);
    committedConfigs[filename] = parsed;
  }

  // ==========================================
  // 3. Load & Validate JSON Reports
  // ==========================================
  const reports = {
    sd1: JSON.parse(fs.readFileSync(path.join(rawDir, 'structural-depth1.json'), 'utf8')),
    sd28: JSON.parse(fs.readFileSync(path.join(rawDir, 'structural-depth2-8.json'), 'utf8')),
    tr1: JSON.parse(fs.readFileSync(path.join(rawDir, 'timing-r1.json'), 'utf8')),
    tr2: JSON.parse(fs.readFileSync(path.join(rawDir, 'timing-r2.json'), 'utf8')),
    tr3: JSON.parse(fs.readFileSync(path.join(rawDir, 'timing-r3.json'), 'utf8')),
  };

  const reportConfigMap = {
    sd1: { cfg: committedConfigs['structural-depth1.json'], expectedCases: 12, expectedTrials: 36, isStructural: true },
    sd28: { cfg: committedConfigs['structural-depth2-8.json'], expectedCases: 210, expectedTrials: 630, isStructural: true },
    tr1: { cfg: committedConfigs['timing.json'], expectedCases: 64, expectedTrials: 960, isStructural: false },
    tr2: { cfg: committedConfigs['timing.json'], expectedCases: 64, expectedTrials: 960, isStructural: false },
    tr3: { cfg: committedConfigs['timing.json'], expectedCases: 64, expectedTrials: 960, isStructural: false },
  };

  let configContractMatched = true;

  for (const [key, spec] of Object.entries(reportConfigMap)) {
    const report = reports[key];
    if (report.schemaVersion !== '1') throw new Error(`${key}: schemaVersion != 1`);

    // Strict semantic comparison of report.config vs committed config
    validateConfigObject(report.config, `report.config in ${key}`);
    const expectedCfg = spec.cfg;

    if (report.config.schemaVersion !== expectedCfg.schemaVersion ||
        report.config.suiteId !== expectedCfg.suiteId ||
        report.config.seed !== expectedCfg.seed ||
        JSON.stringify(report.config.exactDepths) !== JSON.stringify(expectedCfg.exactDepths) ||
        report.config.casesPerDepth !== expectedCfg.casesPerDepth ||
        JSON.stringify(report.config.algorithms) !== JSON.stringify(expectedCfg.algorithms) ||
        report.config.warmupRuns !== expectedCfg.warmupRuns ||
        report.config.measuredRuns !== expectedCfg.measuredRuns ||
        'limits' in report.config) {
      configContractMatched = false;
      throw new Error(`${key}: report.config mismatch with committed config`);
    }

    if (report.cases.length !== spec.expectedCases) throw new Error(`${key}: cases count mismatch`);
    if (report.trials.length !== spec.expectedTrials) throw new Error(`${key}: trials count mismatch`);

    const caseMap = new Map();
    const stateKeys = new Set();
    const casesByDepthInReport = new Map();

    for (const c of report.cases) {
      if (caseMap.has(c.caseId)) throw new Error(`${key}: duplicate caseId ${c.caseId}`);
      if (stateKeys.has(c.stateKey)) throw new Error(`${key}: duplicate stateKey ${c.stateKey}`);
      if (c.caseId !== `d${c.exactDepth}:${c.stateKey}`) throw new Error(`${key}: caseId pattern mismatch ${c.caseId}`);
      caseMap.set(c.caseId, c);
      stateKeys.add(c.stateKey);

      if (!casesByDepthInReport.has(c.exactDepth)) casesByDepthInReport.set(c.exactDepth, 0);
      casesByDepthInReport.set(c.exactDepth, casesByDepthInReport.get(c.exactDepth) + 1);
    }

    // Depth distribution check
    if (key === 'sd1') {
      if (casesByDepthInReport.get(1) !== 12) throw new Error('sd1 depth 1 cases count != 12');
    } else if (key === 'sd28') {
      for (let d = 2; d <= 8; d++) {
        if (casesByDepthInReport.get(d) !== 30) throw new Error(`sd28 depth ${d} cases count != 30`);
      }
    } else {
      for (let d = 1; d <= 8; d++) {
        if (casesByDepthInReport.get(d) !== 8) throw new Error(`${key} depth ${d} cases count != 8`);
      }
    }

    // Trial validation
    const trialIdentities = new Set();
    const caseTrialMap = new Map(); // caseId -> Map(alg -> Array of reps)

    for (const t of report.trials) {
      if (!caseMap.has(t.caseId)) throw new Error(`${key}: trial references unknown caseId ${t.caseId}`);
      const c = caseMap.get(t.caseId);
      if (t.exactDepth !== c.exactDepth) throw new Error(`${key}: trial exactDepth mismatch`);
      if (t.status !== 'SOLVED') throw new Error(`${key}: trial status != SOLVED`);
      if (t.solutionDepth !== t.exactDepth) throw new Error(`${key}: solutionDepth != exactDepth`);
      if (!Array.isArray(t.solutionMoves) || t.solutionMoves.length !== t.solutionDepth) {
        throw new Error(`${key}: solutionMoves length mismatch`);
      }
      if (!Number.isInteger(t.nodesExpanded) || t.nodesExpanded < 0) throw new Error(`${key}: invalid nodesExpanded`);
      if (!Number.isInteger(t.nodesGenerated) || t.nodesGenerated < 0) throw new Error(`${key}: invalid nodesGenerated`);
      if (typeof t.elapsedMs !== 'number' || !Number.isFinite(t.elapsedMs) || t.elapsedMs < 0) {
        throw new Error(`${key}: invalid elapsedMs`);
      }
      if (!ALGORITHMS.includes(t.algorithm)) throw new Error(`${key}: unexpected algorithm ${t.algorithm}`);

      const ident = `${t.caseId}|${t.algorithm}|${t.repetitionIndex}`;
      if (trialIdentities.has(ident)) throw new Error(`${key}: duplicate trial identity ${ident}`);
      trialIdentities.add(ident);

      if (!caseTrialMap.has(t.caseId)) caseTrialMap.set(t.caseId, new Map());
      const algMap = caseTrialMap.get(t.caseId);
      if (!algMap.has(t.algorithm)) algMap.set(t.algorithm, []);
      algMap.get(t.algorithm).push(t.repetitionIndex);
    }

    // Exact structural / timing trial identity per case
    for (const c of report.cases) {
      const algMap = caseTrialMap.get(c.caseId);
      if (!algMap) throw new Error(`${key}: missing trials for case ${c.caseId}`);
      for (const alg of ALGORITHMS) {
        const reps = algMap.get(alg);
        if (!reps) throw new Error(`${key}: missing algorithm ${alg} for case ${c.caseId}`);
        reps.sort((a, b) => a - b);
        if (spec.isStructural) {
          if (JSON.stringify(reps) !== JSON.stringify([0])) {
            throw new Error(`${key}: structural reps for ${c.caseId} ${alg} != [0] (got ${reps.join(',')})`);
          }
        } else {
          if (JSON.stringify(reps) !== JSON.stringify([0, 1, 2, 3, 4])) {
            throw new Error(`${key}: timing reps for ${c.caseId} ${alg} != [0,1,2,3,4] (got ${reps.join(',')})`);
          }
        }
      }
    }
  }

  // ==========================================
  // 4. Validate Timing Replicates Deterministic Reproducibility
  // ==========================================
  let caseSequenceIdentical = true;
  let deterministicProjectionIdentical = true;
  let deterministicMismatches = 0;

  const tReports = [reports.tr1, reports.tr2, reports.tr3];
  for (let r = 1; r < 3; r++) {
    const base = tReports[0];
    const target = tReports[r];

    for (let i = 0; i < base.cases.length; i++) {
      if (base.cases[i].caseId !== target.cases[i].caseId ||
          base.cases[i].exactDepth !== target.cases[i].exactDepth ||
          base.cases[i].stateKey !== target.cases[i].stateKey) {
        caseSequenceIdentical = false;
        deterministicMismatches++;
        throw new Error(`Timing replicate ${r + 1} case sequence mismatch at index ${i}`);
      }
    }

    for (let i = 0; i < base.trials.length; i++) {
      const t1 = base.trials[i];
      const t2 = target.trials[i];
      for (const field of ['caseId', 'exactDepth', 'algorithm', 'repetitionIndex', 'status', 'solutionDepth', 'nodesExpanded', 'nodesGenerated', 'limitReason']) {
        if (t1[field] !== t2[field]) {
          deterministicProjectionIdentical = false;
          deterministicMismatches++;
          throw new Error(`Timing replicate ${r + 1} trial field ${field} mismatch at index ${i}`);
        }
      }
      if (JSON.stringify(t1.solutionMoves) !== JSON.stringify(t2.solutionMoves)) {
        deterministicProjectionIdentical = false;
        deterministicMismatches++;
        throw new Error(`Timing replicate ${r + 1} solutionMoves mismatch at index ${i}`);
      }
    }
  }

  const reproducibilityPassed = configContractMatched && caseSequenceIdentical && deterministicProjectionIdentical && deterministicMismatches === 0;

  // ==========================================
  // 5. In-Memory Computation: Structural Output
  // ==========================================
  const structuralCases = [...reports.sd1.cases, ...reports.sd28.cases];
  const structuralTrials = [...reports.sd1.trials, ...reports.sd28.trials];

  if (structuralCases.length !== 222) throw new Error(`Total structural cases != 222 (got ${structuralCases.length})`);
  if (structuralTrials.length !== 666) throw new Error(`Total structural trials != 666 (got ${structuralTrials.length})`);

  const trialsByCase = new Map();
  for (const t of structuralTrials) {
    if (!trialsByCase.has(t.caseId)) trialsByCase.set(t.caseId, new Map());
    trialsByCase.get(t.caseId).set(t.algorithm, t);
  }

  const casesByDepth = new Map();
  for (let d = 1; d <= 8; d++) casesByDepth.set(d, []);
  for (const c of structuralCases) {
    casesByDepth.get(c.exactDepth).push(c);
  }

  const structuralCsvHeader = 'algorithm,exactDepth,caseCount,canonicalBucketSize,coverageFraction,meanNodesExpanded,medianNodesExpanded,minNodesExpanded,maxNodesExpanded,Q1NodesExpanded,Q3NodesExpanded,iqrNodesExpanded,meanNodesGenerated,medianNodesGenerated,minNodesGenerated,maxNodesGenerated,Q1NodesGenerated,Q3NodesGenerated,iqrNodesGenerated,pairedExpandedRatioCaseCount,medianReductionFactorExpanded,Q1ReductionFactorExpanded,Q3ReductionFactorExpanded,iqrReductionFactorExpanded,pairedGeneratedRatioCaseCount,medianReductionFactorGenerated,Q1ReductionFactorGenerated,Q3ReductionFactorGenerated,iqrReductionFactorGenerated';

  const structuralRows = [];

  for (let depth = 1; depth <= 8; depth++) {
    const depthCases = casesByDepth.get(depth);
    const caseCount = depthCases.length;
    const bucketSize = CANONICAL_BUCKET_SIZES[depth];
    const coverageFraction = caseCount / bucketSize;

    for (const algorithm of ALGORITHMS) {
      const expandedList = [];
      const generatedList = [];
      const pairedReductionExpandedList = [];
      const pairedReductionGeneratedList = [];

      for (const c of depthCases) {
        const algTrial = trialsByCase.get(c.caseId).get(algorithm);
        const bfsTrial = trialsByCase.get(c.caseId).get('BFS');

        expandedList.push(algTrial.nodesExpanded);
        generatedList.push(algTrial.nodesGenerated);

        if (algorithm !== 'BFS') {
          if (bfsTrial.nodesExpanded > 0 && algTrial.nodesExpanded > 0) {
            pairedReductionExpandedList.push(bfsTrial.nodesExpanded / algTrial.nodesExpanded);
          }
          if (bfsTrial.nodesGenerated > 0 && algTrial.nodesGenerated > 0) {
            pairedReductionGeneratedList.push(bfsTrial.nodesGenerated / algTrial.nodesGenerated);
          }
        }
      }

      const expStats = computeStats(expandedList);
      const genStats = computeStats(generatedList);

      let pairedExpCount = '';
      let medRedExp = '';
      let q1RedExp = '';
      let q3RedExp = '';
      let iqrRedExp = '';

      let pairedGenCount = '';
      let medRedGen = '';
      let q1RedGen = '';
      let q3RedGen = '';
      let iqrRedGen = '';

      if (algorithm !== 'BFS') {
        pairedExpCount = String(pairedReductionExpandedList.length);
        const redExpStats = computeStats(pairedReductionExpandedList);
        medRedExp = String(redExpStats.median);
        q1RedExp = String(redExpStats.q1);
        q3RedExp = String(redExpStats.q3);
        iqrRedExp = String(redExpStats.iqr);

        pairedGenCount = String(pairedReductionGeneratedList.length);
        const redGenStats = computeStats(pairedReductionGeneratedList);
        medRedGen = String(redGenStats.median);
        q1RedGen = String(redGenStats.q1);
        q3RedGen = String(redGenStats.q3);
        iqrRedGen = String(redGenStats.iqr);
      }

      const row = [
        algorithm,
        String(depth),
        String(caseCount),
        String(bucketSize),
        String(coverageFraction),
        String(expStats.mean),
        String(expStats.median),
        String(expStats.min),
        String(expStats.max),
        String(expStats.q1),
        String(expStats.q3),
        String(expStats.iqr),
        String(genStats.mean),
        String(genStats.median),
        String(genStats.min),
        String(genStats.max),
        String(genStats.q1),
        String(genStats.q3),
        String(genStats.iqr),
        pairedExpCount,
        medRedExp,
        q1RedExp,
        q3RedExp,
        iqrRedExp,
        pairedGenCount,
        medRedGen,
        q1RedGen,
        q3RedGen,
        iqrRedGen,
      ];

      structuralRows.push(row.join(','));
    }
  }

  const structuralCsvContent = structuralCsvHeader + '\n' + structuralRows.join('\n') + '\n';

  // ==========================================
  // 6. In-Memory Computation: Timing Output
  // ==========================================
  const replicateMedians = [];

  for (const rReport of tReports) {
    const caseAlgReps = new Map();
    for (const t of rReport.trials) {
      if (!caseAlgReps.has(t.caseId)) caseAlgReps.set(t.caseId, new Map());
      const algMap = caseAlgReps.get(t.caseId);
      if (!algMap.has(t.algorithm)) algMap.set(t.algorithm, []);
      algMap.get(t.algorithm).push(t.elapsedMs);
    }

    const rMedians = new Map();
    for (const [caseId, algMap] of caseAlgReps.entries()) {
      rMedians.set(caseId, new Map());
      for (const [alg, times] of algMap.entries()) {
        if (times.length !== 5) throw new Error(`Replicate timing count != 5 for ${caseId} ${alg}`);
        const sortedTimes = [...times].sort((a, b) => a - b);
        rMedians.get(caseId).set(alg, computeMedian(sortedTimes));
      }
    }
    replicateMedians.push(rMedians);
  }

  const timingCases = reports.tr1.cases;
  const finalCaseTiming = new Map();

  for (const c of timingCases) {
    finalCaseTiming.set(c.caseId, new Map());
    for (const alg of ALGORITHMS) {
      const pMedians = replicateMedians.map(rMed => rMed.get(c.caseId).get(alg));
      const sortedPMedians = [...pMedians].sort((a, b) => a - b);
      finalCaseTiming.get(c.caseId).set(alg, computeMedian(sortedPMedians));
    }
  }

  const timingCasesByDepth = new Map();
  for (let d = 1; d <= 8; d++) timingCasesByDepth.set(d, []);
  for (const c of timingCases) {
    timingCasesByDepth.get(c.exactDepth).push(c);
  }

  const timingCsvHeader = 'algorithm,exactDepth,caseCount,medianElapsedMs,Q1ElapsedMs,Q3ElapsedMs,iqrElapsedMs,minElapsedMs,maxElapsedMs,zeroMsCaseCount,zeroMsCaseFraction,timerResolutionStatus';

  const timingRows = [];

  for (let depth = 1; depth <= 8; depth++) {
    const depthCases = timingCasesByDepth.get(depth);
    const caseCount = depthCases.length;
    if (caseCount !== 8) throw new Error(`Timing depth ${depth} case count != 8`);

    for (const algorithm of ALGORITHMS) {
      const caseTimes = depthCases.map(c => finalCaseTiming.get(c.caseId).get(algorithm));
      const tStats = computeStats(caseTimes);

      const zeroMsCaseCount = caseTimes.filter(t => t === 0).length;
      const zeroMsCaseFraction = zeroMsCaseCount / caseCount;
      const timerResolutionStatus = tStats.median === 0 ? 'TIMER_RESOLUTION_LIMITED' : 'OK';

      const row = [
        algorithm,
        String(depth),
        String(caseCount),
        String(tStats.median),
        String(tStats.q1),
        String(tStats.q3),
        String(tStats.iqr),
        String(tStats.min),
        String(tStats.max),
        String(zeroMsCaseCount),
        String(zeroMsCaseFraction),
        timerResolutionStatus,
      ];

      timingRows.push(row.join(','));
    }
  }

  const timingCsvContent = timingCsvHeader + '\n' + timingRows.join('\n') + '\n';

  // ==========================================
  // 7. In-Memory Computation: Reproducibility JSON
  // ==========================================
  const reproducibilityJson = {
    schemaVersion: '1',
    executionBaselineCommit: '1fcc48dffcc10a59dbb9fe1eb1e5d7e2ce123ba6',
    suiteId: 'phase5c-timing-v1',
    seed: 'phase5c-timing-v1',
    replicates: [
      'docs/research/phase5c/raw/timing-r1.json',
      'docs/research/phase5c/raw/timing-r2.json',
      'docs/research/phase5c/raw/timing-r3.json',
    ],
    configContractMatched,
    configSha256: {
      'structural-depth1.json': EXPECTED_CONFIG_SHA256['structural-depth1.json'],
      'structural-depth2-8.json': EXPECTED_CONFIG_SHA256['structural-depth2-8.json'],
      'timing.json': EXPECTED_CONFIG_SHA256['timing.json'],
    },
    caseSequenceIdentical,
    deterministicProjectionIdentical,
    expectedCases: 64,
    expectedTrialsPerReplicate: 960,
    deterministicMismatches,
    reproducibilityPassed,
  };

  const reproContent = JSON.stringify(reproducibilityJson, null, 2) + '\n';

  // ==========================================
  // 8. Atomic Output Transaction & Cleanup Policy
  // ==========================================
  const tempFiles = [];
  const canonicalTargets = [
    path.join(derivedDir, 'structural-by-depth.csv'),
    path.join(derivedDir, 'timing-by-depth.csv'),
    path.join(derivedDir, 'reproducibility-check.json'),
  ];

  try {
    const structTmp = path.join(derivedDir, `structural-by-depth.csv.tmp.${Date.now()}`);
    const timingTmp = path.join(derivedDir, `timing-by-depth.csv.tmp.${Date.now()}`);
    const reproTmp = path.join(derivedDir, `reproducibility-check.json.tmp.${Date.now()}`);

    tempFiles.push(structTmp, timingTmp, reproTmp);

    fs.writeFileSync(structTmp, structuralCsvContent, 'utf8');
    fs.writeFileSync(timingTmp, timingCsvContent, 'utf8');
    fs.writeFileSync(reproTmp, reproContent, 'utf8');

    // Atomically replace canonical outputs
    fs.renameSync(structTmp, canonicalTargets[0]);
    fs.renameSync(timingTmp, canonicalTargets[1]);
    fs.renameSync(reproTmp, canonicalTargets[2]);
  } catch (err) {
    // Clean up all temporary files
    for (const tf of tempFiles) {
      if (fs.existsSync(tf)) {
        try { fs.unlinkSync(tf); } catch (_) {}
      }
    }
    // Clean up any partially-written canonical files to prevent partial derived output state
    for (const ct of canonicalTargets) {
      if (fs.existsSync(ct)) {
        try { fs.unlinkSync(ct); } catch (_) {}
      }
    }
    throw err;
  }

  console.log('PHASE5C_ANALYSIS_COMPLETE: All 3 derived artifacts successfully validated and atomically generated.');
}

try {
  main();
} catch (err) {
  console.error('ANALYSIS_FAILED:', err);
  process.exit(1);
}