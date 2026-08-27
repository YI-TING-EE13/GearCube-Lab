# Phase 5C Classical Solver Benchmark Report

> **Document Status**: `PHASE5C_CLASSICAL_SOLVER_BENCHMARK_REPORT_CANDIDATE`  
> **Research Evidence**: `ACCEPTED` (Commit `4cf4efb47841c7d0fa206991734736a751ac1fd2`)  
> **Execution Baseline**: `1fcc48dffcc10a59dbb9fe1eb1e5d7e2ce123ba6`  
> **Authoritative Main**: `fac6ecf74a06ccfeeb81cb6bf39247a09fcf3369`  
> **Phase 5C Overall Acceptance**: `PENDING INDEPENDENT REPORT REVIEW`  
> **Phase 5D**: `NOT STARTED`  
> **Governance Note**: Required agent skills `$governance-task-planning` and `$technical-writing-editorial-review` were reported as `UNAVAILABLE_IN_CURRENT_AGENT_ENVIRONMENT`; explicit manual editorial and governance review procedures were executed.

---

## 1. Executive Summary

This report documents the empirical results of the Phase 5C classical comparative benchmark experiment for **GearCube Lab**. The benchmark evaluates three exact, optimal classical puzzle solvers across all reachable distance strata (exact depths 1 through 8) of the canonical 41,472-state Gear Cube state space:

1. **Breadth-First Search (BFS)**: Uninformed forward baseline.
2. **Bidirectional BFS (BiBFS)**: Uninformed two-ended search meeting at the middle frontier.
3. **Iterative Deepening A\* (IDA\*)**: Informed heuristic search guided by the accepted additive 12-edge Pattern Database heuristic ($H_2$).

Across a frozen benchmark suite comprising **222 unique structural cases** (666 measured trials) and **64 unique timing cases** (across 3 independent process replicates yielding 2,880 measured rows), the experimental findings demonstrate:

- **Soundness & Optimality (100%)**: All 3,546 measured trials completed with status `SOLVED`, zero search limits reached, zero optimality violations, and exact solution move lengths matching the verified shortest-path depth ($d^*(\sigma) = \text{exactDepth}$).
- **Deterministic Search-Tree Pruning**:
  - Uninformed forward BFS exhibits steep exponential growth in search effort, expanding a median of 41,324 nodes (generating 495,888 nodes) at depth 8.
  - Bidirectional BFS substantially reduces state expansion, expanding a median of 1,892 nodes at depth 8 (a median paired reduction factor of **21.84×** vs. BFS).
  - IDA\* with $H_2$ achieves drastic pruning at deep strata, expanding a median of only 44 nodes at depth 8 (a median paired reduction factor of **939.90×** vs. BFS).
- **Observational Execution Time**: Runtime measurements exhibit consistent rank-ordering with deterministic node counters at resolved depths. However, integer-millisecond timer quantization ($\text{Date.now()}$) renders shallow and highly pruned search cells ($< 1\text{ ms}$) `TIMER_RESOLUTION_LIMITED`.
- **Bit-for-Bit Deterministic Reproducibility**: Three separate, independent CLI execution replicates produced identical case sequences, identical search-tree expansions, and identical optimal move sequences.

---

## 2. Research Questions

This study investigates three predefined research questions:

- **RQ1 (Search Efficiency)**: How do uninformed BFS, Bidirectional BFS, and IDA\* with the $H_2$ Pattern Database compare in deterministic search effort ($\text{nodesExpanded}$ and $\text{nodesGenerated}$) across exact shortest-path depths 1 to 8, including paired BFS-relative reduction factors?
- **RQ2 (Soundness & Optimality)**: Do all three classical solvers produce strictly optimal solutions ($\text{solutionDepth} == \text{exactDepth}$) without timeouts or limit truncations across all benchmark cases?
- **RQ3 (Observational Execution Time & Scaling)**: What are the observational runtime characteristics ($\text{elapsedMs}$) across algorithms and depths on the baseline execution environment, and how does integer-millisecond timer resolution constrain runtime interpretation?

---

## 3. Experiment & Evidence Provenance

All research data in this report was collected strictly from the immutable execution baseline commit under isolated execution conditions.

- **Execution Baseline Commit**: `1fcc48dffcc10a59dbb9fe1eb1e5d7e2ce123ba6`
- **Research Evidence Commit**: `4cf4efb47841c7d0fa206991734736a751ac1fd2`
- **Authoritative Main Reference**: `fac6ecf74a06ccfeeb81cb6bf39247a09fcf3369`

### Execution Environment

The environment metadata recorded in the committed raw JSON reports is:

| Parameter | Recorded Value |
| :--- | :--- |
| **Platform** | `node` |
| **Operating System** | `win32` |
| **Architecture** | `x64` |
| **Node.js Version** | `v22.17.1` |
| **CPU Model** | `13th Gen Intel(R) Core(TM) i5-13600K` |
| **Logical Coores** | `20` |

### Benchmark Execution Timestamps (UTC)

- `structural-depth1.json`: `2026-08-27T08:42:10.667Z`
- `structural-depth2-8.json`: `2026-08-27T08:42:30.700Z`
- `timing-r1.json`: `2026-08-27T08:43:26.108Z`
- `timing-r2.json`: `2026-08-27T08:44:53.339Z`
- `timing-r3.json`: `2026-08-27T08:46:32.993Z`

### Config Artifact Hashes (SHA-256)

- `structural-depth1.json`: `cf88e2f5607a81b008ed5133ef08b8c74d0ad0a83ed87b9fb7c85d427cbafffe`
- `structural-depth2-8.json`: `dfc1d2c00e65fdadb4c81cc034d9e9cf15b63b4167e739fd03bef541da4364fd`
- `timing.json`: `583fbd0f966941af6695d4925a993c5c697bf7be05010de5c37b5fa664bb4b44`

---

## 4. Benchmark Design

The experiment uses the deterministic benchmark engine implemented in Phase 5B. The suite is partitioned into two distinct instruments to avoid confounding structural metrics with timing warm-ups:

```
+-----------------------------------------------------------------------------------+
|                                Phase 5C Benchmark                                 |
+-----------------------------------------+-----------------------------------------+
|            Structural Suites            |              Timing Suite               |
|  - Measured runs: 1, Warmups: 0         |  - Measured runs: 5, Warmups: 2         |
|  - Depth 1: 12 cases (exhaustive)       |  - 8 cases / depth x 8 depths = 64 cases|
|  - Depths 2-8: 30 cases / depth         |  - 3 independent CLI process replicates |
|  - 222 unique cases x 3 algs = 666 rows |  - 2,880 stored rows (1,152 warmups)   |
+-----------------------------------------+-----------------------------------------+
```

### Invocations and Stored Rows

- **Structural Depth 1**: 12 cases $\times$ 3 algorithms $\times$ 1 run = **36 measured trials** (0 warmups).
- **Structural Depths 2–8**: 210 cases $\times$ 3 algorithms $\times$ 1 run = **630 measured trials** (0 warmups).
- **Timing Replicates (R1, R2, R3)**: 3 processes $\times$ 64 cases $\times$ 3 algorithms $\times$ 5 measured runs = **2,880 measured trials** ($3 \times 384 = 1,152$ discarded warmup invocations).
- **Total Stored Measured Rows**: **3,546**.
- **Total Solver Invocations**: **4,698**.

---

## 5. Sampling Coverage

Cases were sampled deterministically from the canonical 41,472-state Gear Cube quotient space using the Mulberry32 PRNG and exact FNV-1a UTF-16 seed hashing without replacement.

| Exact Depth | Canonical Bucket Size | Sampled Cases ($N$) | Coverage Fraction | Sampling Mode |
| :---: | :---: | :---: | :---: | :--- |
| **1** | 12 | 12 | 1.000000 (100.0%) | Exhaustive canonical stratum |
| **2** | 111 | 30 | 0.270270 (27.0%) | Seeded sample without replacement |
| **3** | 822 | 30 | 0.036496 (3.65%) | Seeded sample without replacement |
| **4** | 3,863 | 30 | 0.007766 (0.78%) | Seeded sample without replacement |
| **5** | 11,706 | 30 | 0.002563 (0.26%) | Seeded sample without replacement |
| **6** | 16,410 | 30 | 0.001828 (0.18%) | Seeded sample without replacement |
| **7** | 8,196 | 30 | 0.003660 (0.37%) | Seeded sample without replacement |
| **8** | 351 | 30 | 0.085470 (8.55%) | Seeded sample without replacement |
| **Total** | **41,472** | **222** | — | **Stratified sample** |

*Note*: Depths 2–8 are fixed-seed deterministic subsets. No claim of statistical representativeness or inferential population generalizability is made.

---

## 6. Correctness & Optimality Results (RQ2)

Across all 3,546 measured trials, correctness and optimality were verified with zero defects:

- **Total Solved**: 3,546 / 3,546 (100.0%)
- **Limit Reached**: 0
- **Optimality Violations**: 0
- **Move Sequence Consistency**: Every solved path satisfied $\text{solutionMoves.length} == \text{solutionDepth} == \text{exactDepth}$.

All three classical algorithms (BFS, BiBFS, IDA\*) found strictly shortest-path solutions for every evaluated state across depths 1 through 8.

---

## 7. Deterministic Search-Efficiency Results (RQ1)

Deterministic search effort was evaluated across the 222 structural cases ($N=12$ at depth 1; $N=30$ at depths 2–8). All metrics are derived from [structural-by-depth.csv](phase5c/derived/structural-by-depth.csv).

### Median Nodes Expanded by Depth

| Depth | Canonical Size | Sample $N$ | BFS Median Expanded | BiBFS Median Expanded | IDA\* Median Expanded |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | 12 | 12 | **6.5** | **1** | **1** |
| **2** | 111 | 30 | **72.5** | **2** | **2** |
| **3** | 822 | 30 | **396** | **14** | **3** |
| **4** | 3,863 | 30 | **2,870.5** | **26** | **4** |
| **5** | 11,706 | 30 | **10,612** | **137** | **5** |
| **6** | 16,410 | 30 | **25,647** | **248** | **7** |
| **7** | 8,196 | 30 | **35,958** | **1,070** | **9** |
| **8** | 351 | 30 | **41,324** | **1,892** | **44** |

### Complete Structural Summary Statistics

| Algorithm | Depth | Mean Expanded | Median Expanded | IQR Expanded | Mean Generated | Median Generated | IQR Generated |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **BFS** | 1 | 6.5 | 6.5 | 6 | 78 | 78 | 72 |
| | 2 | 69.7 | 72.5 | 58 | 836.4 | 870 | 696 |
| | 3 | 474.8 | 396 | 502 | 5,697.6 | 4,752 | 6,024 |
| | 4 | 3,082.4 | 2,870.5 | 2,549 | 36,989.2 | 34,446 | 30,588 |
| | 5 | 10,614.2 | 10,612 | 7,805 | 127,370 | 127,344 | 93,660 |
| | 6 | 25,531.4 | 25,647 | 6,703 | 306,376.8 | 307,764 | 80,436 |
| | 7 | 36,387.6 | 35,958 | 4,096 | 436,651.6 | 431,496 | 49,152 |
| | 8 | 41,309.4 | 41,324 | 125 | 495,713.2 | 495,888 | 1,500 |
| **BiBFS** | 1 | 1 | 1 | 0 | 12 | 12 | 0 |
| | 2 | 2 | 2 | 0 | 24 | 24 | 0 |
| | 3 | 14 | 14 | 0 | 168 | 168 | 0 |
| | 4 | 26 | 26 | 0 | 312 | 312 | 0 |
| | 5 | 137 | 137 | 0 | 1,644 | 1,644 | 0 |
| | 6 | 248 | 248 | 0 | 2,976 | 2,976 | 0 |
| | 7 | 1,070 | 1,070 | 0 | 12,840 | 12,840 | 0 |
| | 8 | 1,892 | 1,892 | 0 | 22,704 | 22,704 | 0 |
| **IDA\*** | 1 | 1 | 1 | 0 | 12 | 12 | 0 |
| | 2 | 2 | 2 | 0 | 24 | 24 | 0 |
| | 3 | 3 | 3 | 0 | 36 | 36 | 0 |
| | 4 | 4 | 4 | 0 | 48 | 48 | 0 |
| | 5 | 5.03 | 5 | 0 | 60.4 | 60 | 0 |
| | 6 | 7.77 | 7 | 3 | 93.2 | 84 | 36 |
| | 7 | 9.73 | 9 | 2 | 116.8 | 108 | 24 |
| | 8 | 41.3 | 44 | 14 | 495.6 | 528 | 168 |

---

## 8. Paired BFS-Relative Reduction Results (RQ1)

Paired reduction factors were computed on matching cases ($\text{reductionFactor} = \frac{\text{BFS.nodes}}{\text{algorithm.nodes}}$ when both $>0$).

### Median Paired Reduction Factors vs. BFS

| Exact Depth | BiBFS Median Reduction (Expanded) | BiBFS IQR | IDA\* Median Reduction (Expanded) | IDA\* IQR |
| :---: | :---: | :---: | :---: | :---: |
| **1** | 6.50× | 6.00 | 6.50× | 6.00 |
| **2** | 36.25× | 29.00 | 36.25× | 29.00 |
| **3** | 28.29× | 35.86 | 132.00× | 167.33 |
| **4** | 110.40× | 98.04 | 717.63× | 637.25 |
| **5** | 77.46× | 56.97 | 2,122.40× | 1,561.00 |
| **6** | 103.42× | 27.03 | 3,529.23× | 741.00 |
| **7** | 33.61× | 3.83 | 3,961.06× | 566.65 |
| **8** | **21.84×** | 0.07 | **939.90×** | 334.89 |

*Note*: Paired reduction factors for $\text{nodesGenerated}$ are mathematically identical because branching factors are constant ($\times 12$).

### Search Efficiency Findings

1. **Depths 1–2**: Bidirectional BFS and IDA\* are tied in median node expansions (1 node at depth 1, 2 nodes at depth 2).
2. **Depths 3–7**: IDA\* exhibits orders-of-magnitude lower node expansion than BiBFS, reaching a peak median reduction factor of **3,961.06×** at depth 7.
3. **Depth 8**:
   - BiBFS median reduction factor drops to **21.84×** as the bidirectional frontier expands to 1,892 nodes.
   - IDA\* median reduction factor is **939.90×** as median expansions increase to 44 nodes.
   - Reduction factors are non-monotonic due to topological narrowing of the state space graph at depth 8 (diameter boundary containing only 351 states).

---

## 9. Observational Timing Results (RQ3)

Timing results reflect a two-stage aggregation:
$$\text{elapsedMs}_{5\text{ runs}} \xrightarrow{\text{median}} \text{PROCESS\_CASE\_MEDIAN\_MS} \xrightarrow[3\text{ processes}]{\text{median}} \text{FINAL\_CASE\_TIMING\_MS} \xrightarrow[8\text{ cases / depth}]{\text{summary}} \text{Depth Summary}$$

### Median Observational Elapsed Time ($\text{ms}$)

| Depth | BFS Median $\text{ms}$ | BiBFS Median $\text{ms}$ | IDA\* Median $\text{ms}$ | Resolution Status |
| :---: | :---: | :---: | :---: | :--- |
| **1** | 0 | 0 | 0 | `TIMER_RESOLUTION_LIMITED` |
| **2** | 1 | 0 | 0 | BFS: `OK`, BiBFS/IDA\*: `TIMER_RESOLUTION_LIMITED` |
| **3** | 4.5 | 0 | 0 | BFS: `OK`, BiBFS/IDA\*: `TIMER_RESOLUTION_LIMITED` |
| **4** | 41 | 0.5 | 0 | BFS/BiBFS: `OK`, IDA\*: `TIMER_RESOLUTION_LIMITED` |
| **5** | 143 | 2 | 0 | BFS/BiBFS: `OK`, IDA\*: `TIMER_RESOLUTION_LIMITED` |
| **6** | 303 | 3 | 0 | BFS/BiBFS: `OK`, IDA\*: `TIMER_RESOLUTION_LIMITED` |
| **7** | 429 | 12.5 | 0 | BFS/BiBFS: `OK`, IDA\*: `TIMER_RESOLUTION_LIMITED` |
| **8** | **467** | **21.5** | **1** | **All Solvers Resolved (`OK`)** |

### Timer Quantization Analysis

The JavaScript execution engine provides millisecond-resolution integer timestamps via `Date.now()`. Consequently:
- Sub-millisecond executions record as $0\text{ ms}$.
- IDA\* recorded a median of $0\text{ ms}$ for all depths 1 through 7 ($8/8$ cases per depth recorded $0\text{ ms}$).
- BiBFS recorded a median of $0\text{ ms}$ for depths 1 through 3 ($7/8$ cases at depth 1, $8/8$ at depth 2, $7/8$ at depth 3 recorded $0\text{ ms}$).
- Speedup ratios involving `TIMER_RESOLUTION_LIMITED` cells ($0\text{ ms}$) cannot be mathematically computed and are omitted to avoid undefined division.
- At depth 8, all three solvers achieved resolved non-zero medians (BFS: 467 ms, BiBFS: 21.5 ms, IDA\*: 1 ms).

---

## 10. Reproducibility Results

Cross-process determinism was verified across the three independent timing runs (`timing-r1`, `timing-r2`, `timing-r3`) as documented in [reproducibility-check.json](phase5c/derived/reproducibility-check.json):

```json
{
  "schemaVersion": "1",
  "executionBaselineCommit": "1fcc48dffcc10a59dbb9fe1eb1e5d7e2ce123ba6",
  "suiteId": "phase5c-timing-v1",
  "seed": "phase5c-timing-v1",
  "replicates": [
    "docs/research/phase5c/raw/timing-r1.json",
    "docs/research/phase5c/raw/timing-r2.json",
    "docs/research/phase5c/raw/timing-r3.json"
  ],
  "configContractMatched": true,
  "caseSequenceIdentical": true,
  "deterministicProjectionIdentical": true,
  "expectedCases": 64,
  "expectedTrialsPerReplicate": 960,
  "deterministicMismatches": 0,
  "reproducibilityPassed": true
}
```

- **Case Sequence Identity**: Identical across all 3 replicates ($64/64$ cases).
- **Deterministic Field Equality**: Identical on `caseId`, `exactDepth`, `algorithm`, `repetitionIndex`, `status`, `solutionDepth`, `solutionMoves`, `nodesExpanded`, `nodesGenerated`, and `limitReason` across all 960 trials per replicate ($0$ mismatches).

---

## 11. Phase 5C Gate Evaluation

| Gate | Requirement | Evaluation Evidence | Status |
| :--- | :--- | :--- | :---: |
| **EXECUTION_BASELINE_GATE** | Fixed clean commit baseline before run | Fixed at `1fcc48dffcc10a59dbb9fe1eb1e5d7e2ce123ba6` | **PASS** |
| **RESEARCH_DATASET_GATE** | Exact 222 structural / 64 timing cases | 3,546 measured rows, 4,698 solver invocations | **PASS** |
| **ALL_SOLVED_GATE** | 100% trials solved without limits | 3,546 / 3,546 solved, 0 limit reached | **PASS** |
| **OPTIMALITY_GATE** | solutionDepth == exactDepth | 0 optimality violations across all trials | **PASS** |
| **REPRODUCIBILITY_GATE** | Bit-for-bit determinism across replicates | 0 mismatches across 3 CLI replicates | **PASS** |
| **RAW_ARTIFACT_INTEGRITY_GATE** | Immutable raw JSON/CSV SHA-256 hashes | All 10 raw file hashes match accepted record | **PASS** |
| **STRUCTURAL_ANALYSIS_GATE** | Traceable paired reduction statistics | Derived CSV matches raw data 1:1 | **PASS** |
| **TIMING_RESOLUTION_GATE** | Two-stage median with quantization labeling | `TIMER_RESOLUTION_LIMITED` labeled | **PASS** |
| **METRIC_SEPARATION_GATE** | Primary deterministic / secondary timing | Separate structural and timing tables | **PASS** |
| **REPORT_TRACEABILITY_GATE** | Full traceability to committed artifacts | Relative paths to configs, raw, derived | **PASS** |

> **Formal Acceptance Status**: `PENDING INDEPENDENT REPORT REVIEW`

---

## 12. Limitations

1. **Stratified Sampling**: Depths 2 through 8 are evaluated on fixed-seed deterministic samples ($N=30$), not exhaustive populations.
2. **Platform Specificity**: Observational timing reflects a single host hardware platform (Intel Core i5-13600K, Windows 11, Node.js v22.17.1).
3. **Timer Quantization**: `Date.now()` integer-millisecond timing obscures runtime variations below 1 ms.
4. **Repeated Timing Invocations**: Timing repetitions ($5 \times 3 = 15$) represent repeated measurements on the same puzzle states, not additional distinct states.
5. **No Per-Trial Memory Tracking**: Benchmark schema v1 tracks search-tree node counts; heap memory footprint was not measured per trial.
6. **Descriptive Scope**: Analysis is purely descriptive; no inferential confidence intervals or $p$-values are asserted.
7. **Domain Scope**: Results reflect the canonical Gear Cube state space and the accepted solver implementations in `@gearcube/solvers`.

---

## 13. Conclusions

1. **BFS Scalability**: Uninformed forward BFS is viable only for shallow depths ($\le 4$) in memory/time-constrained environments, expanding over 41,000 nodes at depth 8.
2. **BiBFS Practicality**: Bidirectional BFS provides consistent orders-of-magnitude reduction (21.84× to 110.40×) over forward BFS without requiring precomputed heuristic tables.
3. **IDA\* Dominance with $H_2$**: Informed IDA\* search guided by the 12-edge Pattern Database heuristic provides the highest search efficiency on the Gear Cube, expanding $\le 44$ median nodes across all depths and solving diameter states (depth 8) in $\approx 1\text{ ms}$.
4. **Methodological Rigor**: The frozen execution baseline, deterministic PRNG stream, and separate structural/timing suites successfully prevented metric contamination and produced bit-for-bit reproducible results.

---

## 14. Artifact Traceability

All source configs, raw experimental data, derived tables, and analysis tools are committed to the repository:

- **Experiment Plan**: [PHASE_5C_EXPERIMENT_PLAN.md](PHASE_5C_EXPERIMENT_PLAN.md)
- **Implementation Plan**: [PHASE_5_IMPLEMENTATION_PLAN.md](../development/PHASE_5_IMPLEMENTATION_PLAN.md)
- **Suite Configurations**:
  - [structural-depth1.json](phase5c/configs/structural-depth1.json)
  - [structural-depth2-8.json](phase5c/configs/structural-depth2-8.json)
  - [timing.json](phase5c/configs/timing.json)
- **Raw Evidence Reports**:
  - [structural-depth1.json](phase5c/raw/structural-depth1.json) | [CSV](phase5c/raw/structural-depth1.csv)
  - [structural-depth2-8.json](phase5c/raw/structural-depth2-8.json) | [CSV](phase5c/raw/structural-depth2-8.csv)
  - [timing-r1.json](phase5c/raw/timing-r1.json) | [CSV](phase5c/raw/timing-r1.csv)
  - [timing-r2.json](phase5c/raw/timing-r2.json) | [CSV](phase5c/raw/timing-r2.csv)
  - [timing-r3.json](phase5c/raw/timing-r3.json) | [CSV](phase5c/raw/timing-r3.csv)
- **Derived Analysis Tables**:
  - [structural-by-depth.csv](phase5c/derived/structural-by-depth.csv)
  - [timing-by-depth.csv](phase5c/derived/timing-by-depth.csv)
  - [reproducibility-check.json](phase5c/derived/reproducibility-check.json)
- **Deterministic Analysis Engine**:
  - [analyze-phase5c.mjs](../../scripts/analyze-phase5c.mjs)