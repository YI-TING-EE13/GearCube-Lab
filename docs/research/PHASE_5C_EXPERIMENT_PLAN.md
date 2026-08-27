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

Phase 5C conducts the first rigorous empirical comparative evaluation of classical search algorithms on the Gear Cube puzzle domain:
1. **Breadth-First Search (BFS)** — Uninformed forward shortest-path baseline.
2. **Bidirectional BFS (BiBFS)** — Meet-in-the-middle bidirectional shortest-path baseline with algebraic move inverse predecessor generation.
3. **Iterative Deepening A\* (IDA\*)** — Memory-bounded heuristic search guided by the admissible, consistent H2 two-slice pattern database (PDB) heuristic ($10.37\text{ KB}$ footprint).

This document formalizes the complete Phase 5C experiment design, statistical analysis units, deterministic matrices, timing interpretation constraints, raw/derived artifact layouts, reproducibility gates, and pilot calibration evidence **prior to** executing any final research benchmark runs.

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
- **Aggregations:** Mean, median, minimum, maximum, and interquartile range (IQR) computed across unique sampled cases within each exact-distance bucket $d \in [1 \dots 8]$.

### 4.2. Observational Timing Metrics
- **Analysis Unit:** Process replicate $\times$ canonical case $\times$ algorithm.
- **Within-Process Aggregation:** For multi-repetition timing suites (`measuredRuns > 1`), compute the median `elapsedMs` over the measured repetitions for that specific case and algorithm.
- **Cross-Process Aggregation:** Compute the median case-level timing across the 3 independent process replicates (`timing-r1`, `timing-r2`, `timing-r3`), then summarize by exact depth.
- **Timer Resolution Constraint:** The production solver uses `Date.now()` integer-millisecond timing. If the median timing for an algorithm $\times$ depth cell is $0\text{ ms}$, the cell is classified as `TIMER_RESOLUTION_LIMITED`. Speedup ratios involving `TIMER_RESOLUTION_LIMITED` cells must not be calculated or published.

---

## 5. Proposed Benchmark Matrices

### 5.1. Structural Benchmark Matrix (Deterministic Search Complexity)

| Suite Parameter | Structural Suite A (`depth1`) | Structural Suite B (`depth2-8`) |
| :--- | :--- | :--- |
| **Suite ID** | `phase5c-structural-depth1-v1` | `phase5c-structural-depth2-8-v1` |
| **Seed** | `phase5c-structural-d1-v1` | `phase5c-structural-d2-8-v1` |
| **Exact Depths** | `[1]` | `[2, 3, 4, 5, 6, 7, 8]` |
| **Cases Per Depth** | `12` (100% of depth-1 bucket) | `30` per depth |
| **Algorithms** | `["BFS", "BIDIRECTIONAL_BFS", "IDA_STAR"]` | `["BFS", "BIDIRECTIONAL_BFS", "IDA_STAR"]` |
| **Warmup Runs** | `0` | `0` |
| **Measured Runs** | `1` | `1` |
| **Resource Limits** | Omitted (unbounded) | Omitted (unbounded) |
| **Total Cases** | 12 | 210 |
| **Measured Trials** | 36 | 630 |
| **Total Solver Invocations** | 36 | 630 |

- **Structural Total:** 222 unique canonical cases, 666 measured solver trials.
- **Coverage:** Evaluates 100% of depth 1 ($12/12$), $27.0\%$ of depth 2 ($30/111$), $3.6\%$ of depth 3 ($30/822$), and representative samples ($30$ cases each) for depths 4 through 8.

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

## 6. Pilot Calibration Evidence

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

### 6.3. Feasibility Estimation
- **Pilot Invocations:** $96$
- **Proposed Final Invocations:** $4,698$
- **Linear Invocation Scale Factor:** $\frac{4698}{96} = 48.9375$
- **Naive Linear Full Runtime Estimate:** $10.12\text{ s} \times 48.9375 \approx 495.25\text{ seconds}$ ($\approx 8.25\text{ minutes}$).
- **Feasibility Classification:** `FEASIBLE_FOR_REVIEW` ($495.25\text{ s} \le 7200\text{ s}$).

### 6.4. Timer Resolution Audit (Zero-Millisecond Analysis)
The pilot recorded $21 / 48$ trials ($43.75\%$) with `elapsedMs == 0`:

| Algorithm | Depth 1 | Depth 2 | Depth 3 | Depth 4 | Depth 5 | Depth 6 | Depth 7 | Depth 8 | Total Zero-ms |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BFS** | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 2\text{ ms}$) | $0/2$ ($5, 9\text{ ms}$) | $0/2$ ($58, 67\text{ ms}$) | $0/2$ ($128, 153\text{ ms}$) | $0/2$ ($366, 455\text{ ms}$) | $0/2$ ($550, 574\text{ ms}$) | $0/2$ ($727, 742\text{ ms}$) | **$3/16$** ($18.8\%$) |
| **Bidirectional BFS** | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | $2/2$ ($0\text{ ms}$) | $0/2$ ($2, 3\text{ ms}$) | $0/2$ ($3\text{ ms}$) | $0/2$ ($18, 20\text{ ms}$) | $0/2$ ($31, 35\text{ ms}$) | **$6/16$** ($37.5\%$) |
| **IDA\* (H2 PDB)** | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | $2/2$ ($0\text{ ms}$) | $1/2$ ($0, 1\text{ ms}$) | **$12/16$** ($75.0\%$) |

- **Empirical Takeaway:** IDA* is so efficient on this domain (expanding at most 49 nodes at depth 8) that $75\%$ of its executions complete in $< 1\text{ ms}$ and register as $0\text{ ms}$ under `Date.now()`. This finding proves that deterministic node counters (`nodesExpanded`, `nodesGenerated`) must serve as the primary scientific metric of algorithm efficiency.

---

## 7. Artifact & Directory Layout (To Freeze)

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

---

## 8. Deterministic Reproducibility & Verification Gates

### 8.1. Bit-for-Bit Determinism Invariant
Between the 3 independent process runs (`timing-r1`, `timing-r2`, `timing-r3`), the following fields must match bit-for-bit:
- `cases` (caseId, stateKey, exactDepth in exact identical sequence)
- `trials.caseId`
- `trials.exactDepth`
- `trials.algorithm`
- `trials.repetitionIndex`
- `trials.status`
- `trials.solutionDepth`
- `trials.solutionMoves`
- `trials.nodesExpanded`
- `trials.nodesGenerated`
- `trials.limitReason`

### 8.2. Correctness & Quality Stop Policy
If any final Phase 5C trial produces:
1. `status === "LIMIT_REACHED"` (resource limit reached on canonical case);
2. `solutionDepth !== exactDepth` (optimality violation);
3. Unhandled exception or CLI exit code $\ne 0$;
4. Mismatch in deterministic search metrics between timing replicates $r_1, r_2, r_3$;

**The research run is immediately declared INVALID and execution must STOP.** No source modifications may be performed during a research execution task.

---

## 9. Next Steps & Execution Discipline

1. **Independent Review:** Review and accept this candidate experiment plan (`PHASE_5C_EXPERIMENT_PLAN.md`).
2. **Phase 5C Execution Task (Separate Prompt):**
   - Author configs in `docs/research/phase5c/configs/`.
   - Execute CLI runs serially to produce raw artifacts in `docs/research/phase5c/raw/`.
   - Implement `scripts/analyze-phase5c.mjs` (using Node standard library only).
   - Generate derived tables in `docs/research/phase5c/derived/`.
   - Author the final research report `docs/research/PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md`.