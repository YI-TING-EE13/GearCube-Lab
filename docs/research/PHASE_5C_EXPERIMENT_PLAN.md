# PHASE_5C_EXPERIMENT_PLAN.md — Classical Solver Benchmark Experiment Design & Calibration

> **Document Status:** `PHASE5C_EXPERIMENT_PLAN_CANDIDATE`
> **Authoritative Main Baseline:** `e0711761a0ffeeb5555c55e9ae92abc29000c21c`
> **Planning Branch:** `phase/5c-experiment-plan`
> **Phase 5 Preflight Status:** `COMPLETED / ACCEPTED ON MAIN`
> **Phase 5A Status:** `COMPLETED / ACCEPTED ON MAIN`
> **Phase 5B Status:** `COMPLETED / ACCEPTED ON MAIN`
> **Phase 5C Status:** `NOT STARTED` (Planning / Calibration Candidate Only)
> **Phase 5D Status:** `NOT STARTED`
> **Final Research Execution Started:** `NO`
> **Final Research Data Collected:** `NO`
> **Phase 5C Overall Accepted:** `NO`

---

## 1. Executive Summary & Purpose

Phase 5C establishes the empirical comparative evaluation of classical search algorithms on the Gear Cube puzzle domain:
1. **Breadth-First Search (BFS)** — Uninformed forward shortest-path baseline.
2. **Bidirectional BFS (BiBFS)** — Meet-in-the-middle bidirectional shortest-path baseline with algebraic move inverse predecessor generation.
3. **Iterative Deepening A\* (IDA\*)** — Memory-bounded heuristic search guided by the admissible, consistent H2 two-slice pattern database (PDB) heuristic ($10.37\text{ KB}$ footprint).

This document formalizes the complete Phase 5C experiment design, statistical analysis units, deterministic matrices, timing interpretation constraints, execution environment protocols, quartile algorithms, raw/derived artifact layouts, reproducibility gates, and pilot calibration evidence **prior to** executing any final research benchmark runs.

---

## 2. Governance & Prerequisites

### 2.1. Prerequisites Verified on Main
- **Phase 0–4 Foundation:** Discrete domain truth, 3D kinematics, Play Mode UI, Classical Search engine, and Solve Mode playback are fully accepted.
- **Phase 5 Preflight:** Architecture boundaries, metric schema, PRNG algorithms, and acceptance gates are frozen (`PHASE_5_IMPLEMENTATION_PLAN.md`).
- **Phase 5A Bootstrap:** Materialized v1 schemas, `BenchmarkSuiteConfig` validation, stable case identifiers (`d${exactDepth}:${stateKey}`), and the independent Core-only 41,472-state exact-distance corpus builder.
- **Phase 5B Engine & CLI:** Deterministic FNV-1a hash, Mulberry32 PRNG, stratified sampling, cyclic runner orchestration, lossless JSON exporter, 14-column CSV exporter, and Node CLI (`npm run benchmark`).

### 2.2. Invariant Contracts
- **No Production Schema/Runner Changes:** All Phase 5C runs execute strictly through the accepted `@gearcube/benchmark` runner and Node CLI without modifying production source code.
- **Zero Resource Limits in Production Matrices:** Because the canonical Gear Cube state space is finite (41,472 states, diameter 8), final Phase 5C benchmark suites omit `limits.maxNodes` and `limits.maxDepth`. Every valid canonical case must be solved optimally (`100% SOLVED`, `0 LIMIT_REACHED`).
- **Separation of Metrics:** Deterministic search complexity metrics (`nodesExpanded`, `nodesGenerated`, `solutionDepth`, `solutionMoves`, `status`) are primary; execution timing (`elapsedMs`) is secondary and observational.

---

## 3. Research Questions

- **RQ1 (Deterministic Search Tree Efficiency):** How do BFS, Bidirectional BFS, and IDA* compare in terms of search nodes expanded and search nodes generated across exact solution depths $d \in [1 \dots 8]$? What are the empirical reduction factors achieved by bidirectional search and the H2 PDB heuristic over forward BFS?
- **RQ2 (Solution Optimality & Soundness):** Across 100% of sampled canonical benchmark cases, do all three algorithms return optimal shortest paths satisfying $\text{solutionDepth} \equiv \text{exactDepth}$?
- **RQ3 (Observational Execution Timing & Scaling):** On a recorded reference execution environment, how does wall-clock execution time (`elapsedMs`) scale across depths and algorithms? What are the empirical bounds and limitations imposed by integer-millisecond timer resolution on fast/shallow searches?

---

## 4. Analysis Unit & Aggregation Rules

### 4.1. Deterministic Search Metrics
- **Analysis Unit:** One unique canonical case $\times$ algorithm pair (`caseId × algorithm`).
- **Rule:** Search tree metrics (`nodesExpanded`, `nodesGenerated`, `solutionDepth`, `solutionMoves`, `status`) are mathematically deterministic functions of the puzzle state and algorithm. Repetitions of the same case $\times$ algorithm yield bit-for-bit identical counters and must **not** be treated as independent degrees of freedom or separate puzzle instances.
- **Sampling Scope:** For depth 1, the sample is exhaustive ($12/12$ cases). For depths 2–8, the sample is a fixed-seed, deterministic subset sampled without replacement ($30$ cases per depth). It is descriptive of the sampled strata and must not be characterized as a statistically certified population representation.

### 4.2. Quartile & Spread Algorithm
To ensure deterministic analysis without ambiguity across tooling, all quartiles ($Q_1, Q_3$) and interquartile ranges ($\text{IQR} = Q_3 - Q_1$) across structural counters and timing medians are calculated via the following convention:
1. Sort values in ascending numerical order: $x_1 \le x_2 \le \dots \le x_n$.
2. Compute median $M = \text{median}(X)$.
3. **If $n$ is even:**
   - $\text{Lower half} = x_1 \dots x_{n/2}$
   - $\text{Upper half} = x_{n/2 + 1} \dots x_n$
   - $Q_1 = \text{median}(\text{Lower half})$
   - $Q_3 = \text{median}(\text{Upper half})$
4. **If $n$ is odd:**
   - Exclude the single middle value ($x_{(n+1)/2}$) from both halves.
   - $\text{Lower half} = x_1 \dots x_{(n-1)/2}$
   - $\text{Upper half} = x_{(n+3)/2} \dots x_n$
   - $Q_1 = \text{median}(\text{Lower half})$
   - $Q_3 = \text{median}(\text{Upper half})$
5. $\text{IQR} = Q_3 - Q_1$.

### 4.3. Exact Two-Stage Observational Timing Procedure
- **Stage 1 (Within-Process Median):** For each process replicate $r \in \{r_1, r_2, r_3\}$, unique `caseId`, and `algorithm`, take the median of the 5 measured `elapsedMs` repetitions:
  $$\text{timing}_{\text{rep}}(r, \text{caseId}, \text{alg}) = \text{median}_{k=1 \dots 5}(\text{elapsedMs}_{r, \text{caseId}, \text{alg}, k})$$
- **Stage 2 (Cross-Process Case Median):** For each unique `caseId` and `algorithm`, take the median of the 3 process-level medians:
  $$\text{FINAL\_CASE\_TIMING\_MS}(\text{caseId}, \text{alg}) = \text{median}_{r \in \{r_1, r_2, r_3\}}(\text{timing}_{\text{rep}}(r, \text{caseId}, \text{alg}))$$
- **Stage 3 (Depth-Strata Summary):** For each `algorithm` and `exactDepth`, summarize the 8 $\text{FINAL\_CASE\_TIMING\_MS}$ values using:
  - `caseCount` ($8$)
  - `medianElapsedMs`
  - `Q1`, `Q3`, `IQR`
  - `minElapsedMs`, `maxElapsedMs`
  - `zeroMsCaseCount`: Number of cases where $\text{FINAL\_CASE\_TIMING\_MS} == 0$.
  - `zeroMsCaseFraction`: $\frac{\text{zeroMsCaseCount}}{\text{caseCount}}$.
  - `timerResolutionStatus`: If cell `medianElapsedMs == 0`, mark as `TIMER_RESOLUTION_LIMITED`.
- **Constraint:** Speedup ratios involving a `TIMER_RESOLUTION_LIMITED` timing cell must not be computed or published.

### 4.4. Paired Case Comparison Rules
- Comparisons between algorithms are paired strictly on identical `caseId` instances.
- **Normalized Node Metrics:**
  - $\text{normalizedExpanded} = \frac{\text{algorithm.nodesExpanded}}{\text{BFS.nodesExpanded}}$ (defined only when $\text{BFS.nodesExpanded} > 0$)
  - $\text{normalizedGenerated} = \frac{\text{algorithm.nodesGenerated}}{\text{BFS.nodesGenerated}}$ (defined only when $\text{BFS.nodesGenerated} > 0$)
- **Reduction Factors:**
  - $\text{reductionFactorExpanded} = \frac{\text{BFS.nodesExpanded}}{\text{algorithm.nodesExpanded}}$ (defined only when both values $> 0$)
  - $\text{reductionFactorGenerated} = \frac{\text{BFS.nodesGenerated}}{\text{algorithm.nodesGenerated}}$ (defined only when both values $> 0$)
- **Reporting Rule:** The report must clearly distinguish between the *median of per-case paired ratios* and the *ratio of aggregate group means*. They must never be conflated.

### 4.5. Prohibition on Inferential Significance Claims
- `PHASE5C_V1_ANALYSIS: DESCRIPTIVE`.
- The analysis presents descriptive statistics and exact empirical distributions for the evaluated suites.
- No p-values, null-hypothesis tests, or population inference confidence intervals may be generated or claimed.

---

## 5. Proposed Benchmark Matrices

### 5.1. Structural Benchmark Matrix (Deterministic Search Complexity)

| Suite Parameter | Structural Suite A (`depth1`) | Structural Suite B (`depth2-8`) |
| :--- | :--- | :--- |
| **Suite ID** | `phase5c-structural-depth1-v1` | `phase5c-structural-depth2-8-v1` |
| **Seed** | `phase5c-structural-d1-v1` | `phase5c-structural-d2-8-v1` |
| **Exact Depths** | `[1]` | `[2, 3, 4, 5, 6, 7, 8]` |
| **Cases Per Depth** | `12` (100% of depth-1 bucket) | `30` per depth (deterministic seeded subset) |
| **Algorithms** | `["BFS", "BIDIRECTIONAL_BFS", "IDA_STAR"]` | `["BFS", "BIDIRECTIONAL_BFS", "IDA_STAR"]` |
| **Warmup Runs** | `0` | `0` |
| **Measured Runs** | `1` | `1` |
| **Resource Limits** | Omitted (unbounded) | Omitted (unbounded) |
| **Total Cases** | 12 | 210 |
| **Measured Trials** | 36 | 630 |
| **Total Solver Invocations** | 36 | 630 |

- **Structural Total:** 222 unique canonical cases, 666 measured solver trials.
- **Coverage:** Evaluates 100% of depth 1 ($12/12$), $27.0\%$ of depth 2 ($30/111$), $3.6\%$ of depth 3 ($30/822$), $0.78\%$ of depth 4 ($30/3863$), $0.26\%$ of depth 5 ($30/11706$), $0.18\%$ of depth 6 ($30/16410$), $0.37\%$ of depth 7 ($30/8196$), and $8.55\%$ of depth 8 ($30/351$).

### 5.2. Timing Benchmark Matrix (Process-Replicated Observational Timing)

| Suite Parameter | Timing Suite (Replicates: `timing-r1`, `timing-r2`, `timing-r3`) |
| :--- | :--- |
| **Suite ID** | `phase5c-timing-v1` |
| **Seed** | `phase5c-timing-v1` |
| **Exact Depths** | `[1, 2, 3, 4, 5, 6, 7, 8]` |
| **Cases Per Depth** | `8` per depth ($64$ total cases) |
| **Algorithms** | `["BFS", "BIDIRECTIONAL_BFS", "IDA_STAR"]` |
| **Warmup Runs** | `2` (discarded and unmeasured) |
| **Measured Runs** | `5` (measured in cyclic rotated execution order) |
| **Resource Limits** | Omitted (unbounded) |
| **Cases Per Process** | 64 |
| **Measured Trials Per Process** | $64 \times 3 \times 5 = 960$ |
| **Warmup Invocations Per Process** | $64 \times 3 \times 2 = 384$ |
| **Total Solver Invocations Per Process** | $960 + 384 = 1344$ |
| **Process Replicates** | 3 separate CLI process executions with identical config and seed |
| **Total Timing Measured Rows** | $960 \times 3 = 2880$ rows across 3 CSV/JSON reports |
| **Total Timing Solver Invocations** | $1344 \times 3 = 4032$ invocations |

### 5.3. Cumulative Workload Summary

| Component | Cases | Warmup Invocations | Measured Trials | Stored Dataset Rows | Total Solver Invocations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Structural A (Depth 1)** | 12 | 0 | 36 | 36 | 36 |
| **Structural B (Depths 2–8)** | 210 | 0 | 630 | 630 | 630 |
| **Timing Replicate 1** | 64 | 384 | 960 | 960 | 1344 |
| **Timing Replicate 2** | 64 | 384 | 960 | 960 | 1344 |
| **Timing Replicate 3** | 64 | 384 | 960 | 960 | 1344 |
| **Grand Total** | — | **1,152** | **3,546** | **3,546** | **4,698** |

---

## 6. Pilot Calibration Evidence & Feasibility Estimate

To validate workload feasibility and audit timer resolution prior to freezing the experiment design, a single disposable pilot calibration run was executed in an isolated temporary directory outside the repository.

### 6.1. Pilot Configuration
```json
{
  "schemaVersion": "1",
  "suiteId": "phase5c-pilot-v1",
  "seed": "phase5c-pilot-v1",
  "exactDepths": [1, 2, 3, 4, 5, 6, 7, 8],
  "casesPerDepth": 2,
  "algorithms": ["BFS", "BIDIRECTIONAL_BFS", "IDA_STAR"],
  "warmupRuns": 1,
  "measuredRuns": 1
}
```

### 6.2. Pilot Execution Results
- **Exit Code:** `0` (Success)
- **Sampled Cases:** `16` (2 per depth)
- **Measured Trials:** `48` ($16 \times 3 \times 1$)
- **Warmup Invocations:** `48` ($16 \times 3 \times 1$, discarded)
- **Total Solver Invocations:** `96`
- **Resource Limits Reached:** `0`
- **Optimality Violations:** `0` (100% of trials solved with `solutionDepth === exactDepth`)
- **JSON Schema Validation:** PASS (full lossless `BenchmarkReport`)
- **CSV Header Validation:** PASS (exact 14 columns RFC-4180 format)
- **Complete Wall-Clock Time:** $10.12\text{ seconds}$
- **Host Environment:** Windows x64, Node v22.17.1, 13th Gen Intel Core i5-13600K (20 logical cores).

### 6.3. Feasibility Estimation (Rough & Non-Predictive)
- **Pilot Invocations:** $96$
- **Proposed Final Invocations:** $4,698$
- **Linear Invocation Scale Factor:** $\frac{4698}{96} = 48.9375$
- **Naive Linear Full Runtime Estimate:** $10.12\text{ s} \times 48.9375 \approx 495.25\text{ seconds}$ ($\approx 8.25\text{ minutes}$).
- **Feasibility Classification:** `FEASIBLE_FOR_REVIEW` ($495.25\text{ s} \le 7200\text{ s}$).
- **Caveat:** This calculation is a rough, non-predictive feasibility check. It does not model five separate Node process startup costs, repeated canonical 41,472-state corpus BFS constructions, differences in state search difficulty across larger sample sizes, OS background scheduling, or thermal throttling. It must not be treated as a deterministic execution SLA.

### 6.4. Timer Resolution Audit (Zero-Millisecond Analysis)
The pilot recorded $21 / 48$ trials ($43.75\%$) with `elapsedMs == 0`:

| Algorithm | Depth 1 | Depth 2 | Depth 3 | Depth 4 | Depth 5 | Depth 6 | Depth 7 | Depth 8 | Total Zero-ms |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BFS** | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 2\text{ ms}$) | $0/2$ ($5, 9\text{ ms}$) | $0/2$ ($58, 67\text{ ms}$) | $0/2$ ($128, 153\text{ ms}$) | $0/2$ ($366, 455\text{ ms}$) | $0/2$ ($550, 574\text{ ms}$) | $0/2$ ($727, 742\text{ ms}$) | **$3/16$** ($18.8\%$) |
| **Bidirectional BFS** | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | $2/2$ ($0\text{ ms}$) | $0/2$ ($2, 3\text{ ms}$) | $0/2$ ($3\text{ ms}$) | $0/2$ ($18, 20\text{ ms}$) | $0/2$ ($31, 35\text{ ms}$) | **$6/16$** ($37.5\%$) |
| **IDA\* (H2 PDB)** | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | **$12/16$** ($75.0\%$) |

- **Empirical Takeaway:** In the two sampled depth-8 pilot cases, the maximum observed IDA* `nodesExpanded` value was 49. Because IDA* search completes rapidly at this scale, $75\%$ of its pilot trial executions were recorded as $0\text{ ms}$ at the `Date.now()`-based integer-millisecond measurement resolution. This empirical observation strongly supports the decision to treat deterministic node counters (`nodesExpanded`, `nodesGenerated`) as the primary scientific efficiency metrics and classify cells with median $0\text{ ms}$ as `TIMER_RESOLUTION_LIMITED`.

---

## 7. Execution Environment & Worktree Protocol

### 7.1. Execution Conditions
All five final Phase 5C CLI executions (`structural-depth1`, `structural-depth2-8`, `timing-r1`, `timing-r2`, `timing-r3`) must be executed under the following strict protocol:
- `SERIAL_EXECUTION: YES` (runs executed sequentially one after another; never concurrently).
- `CONCURRENT_BENCHMARKS: NO`.
- `PHYSICAL_MACHINE: SAME`.
- `REPOSITORY_COMMIT: SAME EXACT COMMIT`.
- `NODE_VERSION: SAME`.
- `TOOLCHAIN / LOCKFILE: SAME`.
- `PRODUCTION_SOURCE_CHANGE_BETWEEN_RUNS: NO`.
- `CONFIG_MUTATION_BETWEEN_TIMING_REPLICATES: NO`.

### 7.2. Dependency & Worktree Preparation
- Final research execution must occur in its own clean dedicated execution worktree.
- Dependencies must be prepared via standard `npm ci` using the committed `package-lock.json`.
- Copied `node_modules` trees, ad-hoc symlinks, or cross-worktree package junction hacks are strictly prohibited for final data collection.
- *Note:* The planning pilot used local temporary dependency scaffolding solely for pre-flight calibration; pilot numbers are not part of the final research dataset.

### 7.3. Environment Metadata Logging
The research report and reproducibility record must log:
- Git repository commit SHA
- Node.js runtime version
- Host operating system and platform
- System architecture
- CPU model and clock/family identifier
- Total logical processor cores
- ISO-8601 execution timestamp for each raw report

---

## 8. Artifact & Directory Layout (To Freeze)

The future Phase 5C execution task will populate the following frozen tracked directory structure:

```
docs/research/
├── PHASE_5C_EXPERIMENT_PLAN.md                     # This frozen experiment design
├── PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md    # Final research report
└── phase5c/
    ├── configs/
    │   ├── structural-depth1.json                  # Structural suite A configuration
    │   ├── structural-depth2-8.json                # Structural suite B configuration
    │   └── timing.json                             # Multi-repetition timing configuration
    ├── raw/
    │   ├── structural-depth1.json                  # Raw JSON report (36 trials)
    │   ├── structural-depth1.csv                   # Raw 14-column CSV (36 trials)
    │   ├── structural-depth2-8.json                # Raw JSON report (630 trials)
    │   ├── structural-depth2-8.csv                 # Raw 14-column CSV (630 trials)
    │   ├── timing-r1.json                          # Replicate 1 JSON report (960 trials)
    │   ├── timing-r1.csv                           # Replicate 1 CSV (960 trials)
    │   ├── timing-r2.json                          # Replicate 2 JSON report (960 trials)
    │   ├── timing-r2.csv                           # Replicate 2 CSV (960 trials)
    │   ├── timing-r3.json                          # Replicate 3 JSON report (960 trials)
    │   └── timing-r3.csv                           # Replicate 3 CSV (960 trials)
    └── derived/
        ├── structural-by-depth.csv                 # Script-generated structural summary
        ├── timing-by-depth.csv                     # Script-generated timing summary
        └── reproducibility-check.json              # Script-verified bit-for-bit check
scripts/
└── analyze-phase5c.mjs                             # Node-standard-library deterministic analysis script
```

### 8.1. Raw Data Immutability
- Once generated and verified, all raw JSON and CSV files in `docs/research/phase5c/raw/` are immutable scientific records.
- If an execution fails any verification gate, the entire run attempt is invalid and must be discarded according to the stop policy; individual rows must never be hand-edited or selectively overwritten.

### 8.2. Analysis Script Contract (`scripts/analyze-phase5c.mjs`)
- Uses strictly Node.js standard library modules (`node:fs`, `node:path`). No external npm dependencies.
- **Inputs:** Strictly the five committed raw JSON files in `docs/research/phase5c/raw/` (CSV files serve as tabular cross-checks).
- **Behavior:** Deterministic, pure data extraction and statistical reduction. Performs zero solver calls, zero corpus rebuilds, zero resampling, zero configuration mutations, zero row mutations, zero network requests, and zero silent data filtering.
- **Error Behavior:** Exits with non-zero exit code on missing inputs, schema errors, unexpected trial counts, `LIMIT_REACHED` presence, optimality mismatches, or deterministic timing replicate discrepancies.

### 8.3. Reproducibility Record Schema (`reproducibility-check.json`)
The analysis script will emit `reproducibility-check.json` documenting:
```json
{
  "schemaVersion": "1",
  "repositoryCommit": "<commit-sha>",
  "suiteId": "phase5c-timing-v1",
  "seed": "phase5c-timing-v1",
  "replicates": [
    "docs/research/phase5c/raw/timing-r1.json",
    "docs/research/phase5c/raw/timing-r2.json",
    "docs/research/phase5c/raw/timing-r3.json"
  ],
  "caseSequenceIdentical": true,
  "deterministicProjectionIdentical": true,
  "expectedCases": 64,
  "expectedTrialsPerReplicate": 960,
  "deterministicMismatches": 0,
  "reproducibilityPassed": true
}
```

---

## 9. Structural & Timing Report Schema Contracts

### 9.1. Structural Summary Table Schema (`structural-by-depth.csv`)
For each `algorithm × exactDepth`, the derived structural table contains:
- `algorithm`
- `exactDepth`
- `caseCount` (unique sampled cases)
- `canonicalBucketSize` (total states in distance bucket: $12, 111, 822, 3863, 11706, 16410, 8196, 351$)
- `coverageFraction` ($\frac{\text{caseCount}}{\text{canonicalBucketSize}}$)
- `meanNodesExpanded`, `medianNodesExpanded`, `minNodesExpanded`, `maxNodesExpanded`, `Q1NodesExpanded`, `Q3NodesExpanded`, `iqrNodesExpanded`
- `meanNodesGenerated`, `medianNodesGenerated`, `minNodesGenerated`, `maxNodesGenerated`, `Q1NodesGenerated`, `Q3NodesGenerated`, `iqrNodesGenerated`

### 9.2. Timing Summary Table Schema (`timing-by-depth.csv`)
For each `algorithm × exactDepth`, the derived timing table contains:
- `algorithm`
- `exactDepth`
- `caseCount` ($8$)
- `medianElapsedMs`
- `Q1ElapsedMs`, `Q3ElapsedMs`, `iqrElapsedMs`
- `minElapsedMs`, `maxElapsedMs`
- `zeroMsCaseCount` (number of cases where case median across replicates equals 0)
- `zeroMsCaseFraction` ($\frac{\text{zeroMsCaseCount}}{8}$)
- `timerResolutionStatus` (`OK` or `TIMER_RESOLUTION_LIMITED`)

---

## 10. Future Phase 5C Acceptance Criteria & Quality Stop Policy

The final Phase 5C execution task must satisfy all nine explicit acceptance gates:

| Gate Identifier | Pass Requirement |
| :--- | :--- |
| **`RESEARCH_DATASET_GATE`** | All five raw JSON/CSV reports exist with exact expected trial counts (36, 630, 960, 960, 960). |
| **`ALL_SOLVED_GATE`** | Exactly 0 trials reach `LIMIT_REACHED`; 100% of trials finish with status `SOLVED`. |
| **`OPTIMALITY_GATE`** | Every solved trial satisfies $\text{solutionDepth} \equiv \text{exactDepth}$ without exception. |
| **`REPRODUCIBILITY_GATE`** | `reproducibility-check.json` confirms bit-for-bit identity of deterministic projections across `timing-r1`, `timing-r2`, `timing-r3`. |
| **`RAW_ARTIFACT_INTEGRITY_GATE`** | Raw files are present, valid, conform to RFC-4180 / JSON v1 schemas, and are left unmutated by analysis. |
| **`STRUCTURAL_ANALYSIS_GATE`** | `structural-by-depth.csv` correctly aggregates all 222 structural cases across all 8 exact depths. |
| **`TIMING_RESOLUTION_GATE`** | `timing-by-depth.csv` reports two-stage case medians, zero-ms counts/fractions, and `TIMER_RESOLUTION_LIMITED` classifications. |
| **`METRIC_SEPARATION_GATE`** | Final research report uses deterministic node counters as primary evidence and labels `elapsedMs` as observational. |
| **`REPORT_TRACEABILITY_GATE`** | Every table, figure, and quantitative claim in `PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md` is strictly traceable to committed raw/derived CSVs. |

### Quality Stop Policy
If any final research trial produces a `LIMIT_REACHED` outcome, an optimality violation, a CLI runtime crash, or a discrepancy across deterministic timing replicate fields, **the research execution is immediately declared INVALID and execution must STOP**. No ad-hoc parameter tweaks or source fixes may be made during a data collection task.