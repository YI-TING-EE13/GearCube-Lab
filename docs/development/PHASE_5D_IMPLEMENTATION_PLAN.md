# PHASE_5D_IMPLEMENTATION_PLAN.md — Browser Research Mode Architecture & Implementation Plan

> **Document Status:** `PHASE5D_IMPLEMENTATION_ACCEPTED`
> **Authoritative Main Baseline:** `717f2b89a425b2da6437e75adf4c4245aee8dc08`
> **Accepted Technical Head:** `8bc1d51d74e3b047872598f3439755361cd91fb6`
> **Implementation Branch:** `phase/5d-research-mode-implementation`
> **Phase 5 Preflight Status:** `COMPLETED / ACCEPTED ON MAIN`
> **Phase 5A Status:** `COMPLETED / ACCEPTED ON MAIN`
> **Phase 5B Status:** `COMPLETED / ACCEPTED ON MAIN`
> **Phase 5C Status:** `COMPLETED / ACCEPTED ON MAIN`
> **Phase 5D Planning:** `COMPLETED / ACCEPTED`
> **Phase 5D Implementation:** `COMPLETED & ACCEPTED`
> **Phase 5 Overall Status:** `COMPLETED & ACCEPTED`
> **Phase 5D Accepted:** `YES`
> **Lifecycle:** `HISTORICAL MILESTONE ACCEPTANCE RECORD`
> **Current Test Inventory:** 36 Vitest files / 452 tests (the acceptance counts below are as-of the accepted technical head).

---

## Acceptance Record

### Planning Acceptance Record (Historical)
- **Authoritative Main Baseline (Planning):** `6505f41101d716207b39a242ac5a837c4681ebdb`
- **Initial Plan Candidate:** `0680b5355bf95e2e9028098516324917469dbf24`
- **Accepted Technical Plan:** `0920e12765db446eedc657af6bd2901e189e37fc`
- **Independent Final Plan Review:** `PASS`
- **Benchmark Engine API Change Required:** `NO`
- **Phase 5D Planning Status:** `COMPLETED / ACCEPTED`

### Final Implementation Acceptance Record
- **PLANNING_ACCEPTANCE_MAIN:** `717f2b89a425b2da6437e75adf4c4245aee8dc08`
- **IMPLEMENTATION_BRANCH:** `phase/5d-research-mode-implementation`
- **ACCEPTED_TECHNICAL_IMPLEMENTATION_HEAD:** `8bc1d51d74e3b047872598f3439755361cd91fb6`
- **FORMAL_STATUS:** `COMPLETED & ACCEPTED`
- **IMPLEMENTATION_LINEAGE:**
  1. `1250e3c1f136eca6e7a548032301fbb1e5e000db` — Implement Phase 5D benchmark controller contracts
  2. `f1c0f9cb94bd9fbe98b78931959ffc7a6697923d` — Repair Phase 5D filename sanitizer test
  3. `4935a6f4d651dee48d15dcb6f554c74cbb5025f8` — Implement Phase 5D benchmark worker lifecycle
  4. `9479e7a029e5be3cf5370715cc2f0bbca48f0135` — Implement Phase 5D research mode panel
  5. `694e0c218fd7599717424f359e58e1749d8347f3` — Integrate Phase 5D research workspace mode
  6. `ce5ea29f6629702ef9bcfd1854a3d262e03a05dc` — Repair Phase 5D workspace lifecycle and mobile layout
  7. `26a3b8cc548b226b7fb0d9c154663fd221b2ab7f` — Enforce Phase 5D browser research boundaries
  8. `9a1ce67fb9d4538b261e19ead6a468399a26dbfe` — Repair Phase 5D boundary gate precision
  9. `4d5deb57bdacaa86efba49f1a983a077edaf6e72` — Add Phase 5D research mode browser acceptance
  10. `f7b2e580b7520e3b454887bb63ffd5f20f17a0ec` — Harden Phase 5D research browser acceptance
  11. `8bc1d51d74e3b047872598f3439755361cd91fb6` — Repair Phase 5D research benchmark cancellation
- **AUTOMATED_REAL_BROWSER_ACCEPTANCE:** `PASS`
  - Research Playwright Suite (`tests/e2e/research-mode.spec.ts`): `12 / 12 PASS`
  - Full Playwright E2E Suite (`npm run test:e2e`): `40 / 40 PASS`
  - Architecture Boundary Suite (`tests/boundary.test.ts`): `52 / 52 PASS`
  - Benchmark Controller Focused Unit Suite (`tests/unit/benchmark-worker-controller.test.ts`): `32 / 32 PASS`
  - Full Workspace Verification (`npm run verify`): `PASS` (35 / 35 test files, 444 tests, clean TypeScript & Vite production build)
- **INTERACTIVE_BROWSER_ACCEPTANCE (Chrome DevTools MCP):** `PASS`
  - Desktop 1280x800: `PASS`
  - Tablet 768x1024: `PASS`
  - Mobile 375x667: `PASS`
  - Console Runtime Errors: `0`
  - Visual Blockers: `NONE`
- **REAL_CANCEL_REPAIR_RECORD:**
  - Root cause established via non-mutating passive DOM event diagnostic: Cancel button nested inside the benchmark configuration `<form>` triggered form submission upon native click, leading to unintended benchmark restart.
  - Structural repair in `apps/web/src/components/research/ResearchPanel.tsx`: Separated Cancel button outside `<form className="research-form">` when `isBusy === true`, retaining native `<button type="submit">` for Run Benchmark when `!isBusy`.
  - Zero `stopPropagation()` or `preventDefault()` event hacks used.
  - Permanent Playwright Gate 4 assertion (`totalBenchmarkWorkersCreated === 1`) permanently guards against cancellation restart regressions.
- **RAW_WEBGL_ORACLE_RECORD:**
  - Gate 10 verified exact visual state preservation across the full Research Mode lifecycle using direct `HTMLCanvasElement` bitmap capture via `canvas.toDataURL('image/png')`, followed by decoded `ImageData` RGBA comparison (`differingPixels: 0`, `maxChannelDelta: 0`, `diffBoundingBox: null`).
- **BENCHMARK_ENGINE_API_CHANGE:** `NO`
- **PHASE5C_EVIDENCE_MUTATION:** `NO`
- **PHASE5D_TECHNICAL_ACCEPTANCE:** `PASS`
- **FORMAL_ACCEPTANCE_STATUS:** `ACCEPTED`

---

## 1. Governance & Prerequisites

### 1.1. Governance Procedures
Required agent governance skills (`$governance-task-planning`, `$architecture-contract-review`, `$technical-writing-editorial-review`) were queried and evaluated as `UNAVAILABLE_IN_CURRENT_AGENT_ENVIRONMENT`. Explicit manual fallback protocols have been executed, enforcing:
- Exhaustive architectural inspection of existing solver Web Worker, hooks, canvas viewport overlays, and `@gearcube/benchmark` entry points;
- Strict adherence to project-wide unidirectional layer isolation;
- Freezing exact types, state machines, validation layers, test matrices, and error boundaries before implementation.

### 1.2. Baseline Verification
- **Baseline Commit:** `6505f41101d716207b39a242ac5a837c4681ebdb` (main).
- **Worktree State:** Clean isolated worktree on `phase/5d-research-mode-plan`.
- **Baseline Verify Status:** `BASELINE_VERIFY_NOT_RUN_DEPENDENCIES_ABSENT` (dependencies not installed in freshly branched worktree; no modifying package commands run during planning).

---

## 2. Planning-Time Source Inventory & Architectural Baseline (Historical)

### 2.1. Benchmark Engine Inspection (`@gearcube/benchmark`)
Inspection of `packages/benchmark/src/` confirms:
1. **Public Root Entry (`packages/benchmark/src/index.ts`):** Strictly browser-safe. Exports:
   - Types: `BenchmarkSuiteConfig`, `BenchmarkCase`, `BenchmarkTrialResult`, `BenchmarkSummary`, `EnvironmentProvenance`, `BenchmarkReport`, etc.
   - Validation: `validateBenchmarkSuiteConfig`, `validateConfigCorpusCapacity`, `BenchmarkConfigError`.
   - Core Corpus: `buildExactDistanceCorpus`, `createBenchmarkCaseId`.
   - Engine: `runBenchmarkSuite`.
   - Serialization: `serializeBenchmarkReportJson`, `serializeBenchmarkReportCsv`.
2. **Import Boundaries:** Zero DOM, zero UI, zero React/Three.js, zero Node built-ins (`node:fs`, `node:path`) in browser-safe source modules (`config.ts`, `corpus.ts`, `export.ts`, `hash.ts`, `prng.ts`, `runner.ts`, `sampler.ts`). Node CLI adapter (`cli.ts`) is strictly excluded from `tsconfig.json` and root barrel export.
3. **Engine API Stability:**
   `PHASE5D_BENCHMARK_ENGINE_API_CHANGE: NO`
   No refactoring or modification of `@gearcube/benchmark` source is required.

### 2.2. Web Application Inspection (`apps/web`)
1. **Dependencies (`apps/web/package.json`):** At the Phase 5D planning baseline, `apps/web` depended on `@gearcube/core`, `@gearcube/kinematics`, and `@gearcube/solvers`, and did **not** yet depend on `@gearcube/benchmark`. (Final accepted implementation adds `"@gearcube/benchmark": "0.0.0"` to `apps/web/package.json`).
2. **Solve Worker Precedent (`apps/web/src/workers/solver.worker.ts`, `useSolverWorker.ts`, `solver-worker-controller.ts`):**
   - Single-job-per-instance Web Worker lifecycle.
   - Host-side `worker.terminate()` for cancellation.
   - Monotonic string `requestId` guarding against stale callbacks.
   - Pure state transition functions separated from React hooks.
3. **Canvas Viewport (`apps/web/src/components/canvas/GearCubeViewport.tsx`):**
   - Hosts full 3D R3F Canvas and overlay clusters (`HistoryControls`, `ScramblePanel`, `TimelineScrubber`, `SolvePanel`, `PlaybackControls`, `MoveControls`).
   - All layout and overlay styling is centrally defined in `apps/web/src/App.css`.

---

## 3. Goals & Explicit Non-Goals

### 3.1. Phase 5D Goals
1. **Workspace Mode Orchestration:** Introduce a clean top-level presentation mode toggle (`PLAY` vs. `RESEARCH`) owned by `GearCubeViewport.tsx` in `apps/web`.
2. **Dedicated Background Web Worker:** Implement `apps/web/src/workers/benchmark.worker.ts` running `@gearcube/benchmark` entirely off the main thread.
3. **Reactive Worker Hook & Pure Controller:** Build `useBenchmarkWorker.ts`, `benchmark-worker-controller.ts`, and `benchmark-worker-protocol.ts` providing deterministic lifecycle state transitions and cancellation.
4. **Research Mode UI Panel:** Build `ResearchPanel.tsx` with a strongly validated configuration form, real-time lifecycle status display, tabular summary metrics, and client-side JSON/CSV export downloads.
5. **Session & Cube State Isolation:** Ensure benchmark executions are strictly decoupled from the interactive 3D cube session (zero mutation of cube state, history, scrambles, or solver playback).
6. **Automated & Interactive Verification:** Provide exhaustive Vitest controller unit tests, Playwright browser E2E test suite (`tests/e2e/research-mode.spec.ts`), and DevTools interactive validation.

### 3.2. Explicit Non-Goals (Out of Scope for Phase 5D)
- **No In-Band Engine Progress Telemetry:** Because `runBenchmarkSuite` is synchronous, Phase 5D v1 must **not** fabricate progress percentages, progress bars, estimated trial counters, or ETAs.
- **No Historical Run Persistence:** No IndexedDB, `localStorage`, or multi-run comparison database in v1.
- **No Charting / Graphing Libraries:** No D3, Chart.js, or Recharts dependencies.
- **No Server / Cloud Synchronization:** Pure client-side static execution only.
- **No Config Upload / File Import:** Browser form controls configure runs in v1.
- **No Modification of Phase 5C Research Datasets:** Phase 5C raw/derived artifacts remain frozen and immutable.
- **No Premature Phase 6 (ML) or Phase 7 (Vision) Code:** Strictly classical benchmark execution.

---

## 4. Architectural Design & Layer Isolation

```mermaid
graph TD
    subgraph BrowserMainThread [Browser UI / Main Thread — apps/web]
        ModeToggle[Workspace Mode State & Toggle<br/>mode: 'PLAY' | 'RESEARCH']
        Viewport[GearCubeViewport.tsx<br/>Owns WorkspaceMode & useBenchmarkWorker]
        PlayUI[Play / Solve Overlays<br/>MoveControls, SolvePanel, PlaybackControls]
        ResearchUI[ResearchPanel.tsx<br/>Controlled UI: ConfigForm, Summary, Downloads]
        Controller[benchmark-worker-controller.ts<br/>Pure State Transitions & Reduction]
        Hook[useBenchmarkWorker.ts<br/>React Lifecycle & Worker Instance Management]
        StaticValidator[validateBenchmarkSuiteConfig<br/>@gearcube/benchmark (Layer 1)]
    end

    subgraph DedicatedWorkerThread [Background Web Worker — apps/web/src/workers/benchmark.worker.ts]
        WorkerAdapter[Benchmark Worker Protocol Dispatcher]
        Engine[runBenchmarkSuite<br/>@gearcube/benchmark]
        Corpus[buildExactDistanceCorpus<br/>Canonical 41,472 States]
        Solvers[solveBfs / solveBidirectionalBfs / solveIdaStar<br/>@gearcube/solvers]
        Serializers[serializeBenchmarkReportJson / serializeBenchmarkReportCsv<br/>@gearcube/benchmark]
    end

    %% Interactions
    Viewport --> ModeToggle
    Viewport -->|mode === 'PLAY'| PlayUI
    Viewport -->|mode === 'RESEARCH'| ResearchUI
    Viewport --> Hook
    ResearchUI --> StaticValidator
    ResearchUI -->|validated config callback| Viewport
    Viewport -->|start / cancel benchmark| Hook
    Hook --> Controller
    Hook -->|new Worker(...)| DedicatedWorkerThread
    Hook -->|START_BENCHMARK { config, requestId }| WorkerAdapter
    WorkerAdapter -->|BENCHMARK_STARTED| Hook
    WorkerAdapter --> Engine
    Engine --> Corpus
    Engine --> Solvers
    Engine --> Serializers
    WorkerAdapter -->|BENCHMARK_COMPLETE { summary, jsonText, csvText }| Hook
    WorkerAdapter -->|BENCHMARK_ERROR { error, errorKind }| Hook
```

---

## 5. Workspace Mode Lifecycle & Cube Isolation

### 5.1. Workspace Mode Model & Ownership
```typescript
export type WorkspaceMode = 'PLAY' | 'RESEARCH';
```
- **Ownership:** `WorkspaceMode` state is owned by `GearCubeViewport.tsx` (default: `'PLAY'`).
- **Always-Visible Mode Switch:** `GearCubeViewport.tsx` renders the mode toggle button regardless of whether `PLAY` or `RESEARCH` mode is active. `ResearchPanel.tsx` does **not** own the mode toggle; its responsibility is focused entirely on the benchmark configuration form, status, summary, and downloads.
- **Presentation Policy:**
  - In `'PLAY'` mode: All existing Phase 3 (History, Scramble, MoveControls) and Phase 4 (SolvePanel, PlaybackControls) UI clusters render normally.
  - In `'RESEARCH'` mode: Play and Solve overlay clusters (`HistoryControls`, `ScramblePanel`, `TimelineScrubber`, `SolvePanel`, `PlaybackControls`, `MoveControls`) are hidden. The `ResearchPanel` renders on the right/center overlay. The 3D Canvas remains visible in the background for visual coherence.

### 5.2. Mode Transition Invariants
1. **PLAY $	o$ RESEARCH:**
   - Permitted only when the 3D session is idle (`isSessionIdle(app.session)` is true; no active move animation or `HALF_TURN_LOCKED` staged move).
   - Automatically cancels any active solver Worker search (`cancelSearch()`).
   - Clears active solution playback intent (`setPlaybackMetadata(null)`).
   - **Zero mutation** of `app.session.currentState`, `app.history`, or `seed`.
2. **RESEARCH $	o$ PLAY:**
   - If a benchmark Worker is `ACTIVE`, it is immediately terminated via `cancelBenchmark()`.
   - Benchmark configuration and completed results remain in component state while mounted, but no Worker runs hidden in the background.
   - Play mode resumes at the exact cube state preserved from before the transition.

---

## 6. Benchmark Worker Protocol & Lifecycle

### 6.1. Worker Protocol Messages (`benchmark-worker-protocol.ts`)
```typescript
import type {
  BenchmarkSuiteConfig,
  BenchmarkSummary,
  EnvironmentProvenance,
} from '@gearcube/benchmark';

export type BenchmarkErrorKind = 'CONFIG_ERROR' | 'RUNTIME_ERROR';

/** Inbound message from main thread to benchmark Worker. */
export interface StartBenchmarkMessage {
  readonly type: 'START_BENCHMARK';
  readonly requestId: string;
  readonly config: BenchmarkSuiteConfig;
}

export type BenchmarkWorkerInboundMessage = StartBenchmarkMessage;

/** Outbound messages from benchmark Worker to main thread. */
export interface BenchmarkStartedMessage {
  readonly type: 'BENCHMARK_STARTED';
  readonly requestId: string;
}

export interface BenchmarkCompleteMessage {
  readonly type: 'BENCHMARK_COMPLETE';
  readonly requestId: string;
  readonly validatedConfig: BenchmarkSuiteConfig;
  readonly environment: EnvironmentProvenance;
  readonly summary: BenchmarkSummary;
  readonly jsonText: string;
  readonly csvText: string;
}

export interface BenchmarkErrorMessage {
  readonly type: 'BENCHMARK_ERROR';
  readonly requestId: string;
  readonly error: string;
  readonly errorKind: BenchmarkErrorKind;
}

export type BenchmarkWorkerOutboundMessage =
  | BenchmarkStartedMessage
  | BenchmarkCompleteMessage
  | BenchmarkErrorMessage;
```

### 6.2. Worker Lifecycle Controller State Machine (`benchmark-worker-controller.ts`)
```typescript
export type BenchmarkWorkerStatus =
  | 'IDLE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ERROR';

export interface BenchmarkWorkerIdleState {
  readonly status: 'IDLE';
}

export interface BenchmarkWorkerActiveState {
  readonly status: 'ACTIVE';
  readonly requestId: string;
  readonly config: BenchmarkSuiteConfig;
}

export interface BenchmarkWorkerCompletedState {
  readonly status: 'COMPLETED';
  readonly requestId: string;
  readonly config: BenchmarkSuiteConfig;
  readonly environment: EnvironmentProvenance;
  readonly summary: BenchmarkSummary;
  readonly jsonText: string;
  readonly csvText: string;
}

export interface BenchmarkWorkerCancelledState {
  readonly status: 'CANCELLED';
  readonly requestId: string;
}

export interface BenchmarkWorkerErrorState {
  readonly status: 'ERROR';
  readonly requestId: string;
  readonly error: string;
  readonly errorKind: BenchmarkErrorKind;
}

export type BenchmarkWorkerState =
  | BenchmarkWorkerIdleState
  | BenchmarkWorkerActiveState
  | BenchmarkWorkerCompletedState
  | BenchmarkWorkerCancelledState
  | BenchmarkWorkerErrorState;
```

### 6.3. Pure State Transition Functions
1. `beginBenchmark(prev, requestId, config)`: Transitions to `ACTIVE`, storing `requestId` and `config`.
2. `reduceBenchmarkWorkerMessage(prev, message)`:
   - If `prev.status !== 'ACTIVE'` or `message.requestId !== prev.requestId`, message is ignored (stale message isolation).
   - On `BENCHMARK_STARTED`: returns `prev`.
   - On `BENCHMARK_COMPLETE`: returns `COMPLETED` state with summary and export strings.
   - On `BENCHMARK_ERROR`: returns `ERROR` state with error message and kind.
3. `cancelActiveBenchmark(prev)`:
   - If `prev.status === 'ACTIVE'`, returns `CANCELLED` with `prev.requestId`.
   - Otherwise returns `prev`.
4. `failActiveBenchmark(prev, requestId, error, errorKind)`:
   - If `prev.status === 'ACTIVE'` and `prev.requestId === requestId`, returns `ERROR`.

### 6.4. Worker Instance Management (`useBenchmarkWorker.ts`)
- **Single Job Per Worker:** Exactly one fresh `new Worker(new URL('../workers/benchmark.worker.ts', import.meta.url), { type: 'module' })` instance per `startBenchmark` call.
- **Monotonic Request ID:** Counter increments with each run (`"1"`, `"2"`, ...).
- **Clean Disposal:** Terminate worker and clear reference immediately on terminal message (`COMPLETE`, `ERROR`), manual cancellation (`cancelBenchmark`), superseding new run, or component unmount.

---

## 7. Environment Provenance, In-Worker Serialization & Zero-Fake Progress

### 7.1. Genuine Browser Environment Provenance
Inside `apps/web/src/workers/benchmark.worker.ts`, provenance is constructed honestly:
```typescript
const environment: EnvironmentProvenance = {
  platform: 'browser',
  executionTimestamp: new Date().toISOString(),
  ...(typeof navigator !== 'undefined' && navigator.userAgent ? { userAgent: navigator.userAgent } : {}),
  ...(typeof navigator !== 'undefined' && Number.isInteger(navigator.hardwareConcurrency) && navigator.hardwareConcurrency > 0
    ? { logicalCores: navigator.hardwareConcurrency }
    : {}),
};
```
- **Zero Fabrication:** Properties not genuinely available in the browser worker (`nodeVersion`, `cpuModel`, `architecture`, `browserName`, `browserVersion`, `os`, `repositoryCommit`) are left `undefined` and omitted.

### 7.2. In-Worker Serialization Architecture
To prevent structured-cloning thousands of trial objects and performing CPU-heavy string formatting on the main thread:
1. `runBenchmarkSuite(config, environment)` executes inside the Worker.
2. `serializeBenchmarkReportJson(report)` produces the complete JSON string inside the Worker.
3. `serializeBenchmarkReportCsv(report)` produces the RFC-4180 CSV string inside the Worker.
4. Only the lightweight `BenchmarkSummary`, `jsonText`, `csvText`, and provenance are transferred back to the UI thread in `BENCHMARK_COMPLETE`.

### 7.3. Zero Fabricated Progress Guarantee
- `runBenchmarkSuite` is synchronous and atomic.
- In `ACTIVE` status, the UI renders `"Running benchmark..."` with an active spinner/indicator.
- No progress percentages, estimated completed case counts, or speculative ETAs are displayed.

---

## 8. Configuration Form & Two-Layer Validation Contract

### 8.1. Config Form Fields & Schema v1
The form allows users to configure:
1. `suiteId` (string, preserved verbatim as entered without trimming)
2. `seed` (string, default `"GearCube-Lab"`, empty string allowed)
3. `exactDepths` (multi-select checkboxes for depths $1\dots 8$, stored as ascending integer array)
4. `casesPerDepth` (integer $\ge 1$)
5. `algorithms` (multi-select checkboxes for `BFS`, `BIDIRECTIONAL_BFS`, `IDA_STAR`, stored in canonical relative order)
6. `warmupRuns` (integer $\ge 0$)
7. `measuredRuns` (integer $\ge 1$)
8. Optional `maxNodes` (integer $\ge 1$ or empty)
9. Optional `maxDepth` (integer $\ge 0$ or empty)

*Note: If neither `maxNodes` nor `maxDepth` is set, the `limits` property is omitted from the config object.*

### 8.2. Exploratory Browser Default Configuration
```json
{
  "schemaVersion": "1",
  "suiteId": "browser-research-v1",
  "seed": "GearCube-Lab",
  "exactDepths": [1, 2, 3, 4, 5, 6, 7, 8],
  "casesPerDepth": 2,
  "algorithms": ["BFS", "BIDIRECTIONAL_BFS", "IDA_STAR"],
  "warmupRuns": 0,
  "measuredRuns": 1
}
```
*Rationale: This is a deliberately small exploratory default (16 cases, 48 measured trials) intended to bound interactive workload. Actual browser runtime is not frozen at planning time and must be calibrated during Phase 5D implementation and browser acceptance.*

### 8.3. Two-Layer Validation Strategy
- **Layer 1: Main-Thread Static Validation (`validateBenchmarkSuiteConfig`):**
  - Executed before spawning the Worker.
  - `const validatedConfig = validateBenchmarkSuiteConfig(rawFormConfig)` validates types, schema version, non-empty arrays, positive integers, depth ranges ($1\dots 8$), and known algorithm names.
  - `suiteId` is preserved verbatim as validated by `@gearcube/benchmark` without additional trimming or mutation.
  - The exact returned `validatedConfig` is passed directly to `startBenchmark(validatedConfig)`.
  - Does **not** build the 41,472-state corpus on the main thread.
  - If validation fails, displays user-friendly error without creating a Worker.
- **Layer 2: In-Worker Canonical Execution Validation (`runBenchmarkSuite`):**
  - Executed inside the background Worker during corpus sampling via `validateConfigCorpusCapacity`.
  - Validates that `casesPerDepth` does not exceed available corpus capacity at each selected depth (e.g., depth 1 has exactly 12 states in the canonical Gear Cube graph).
  - If capacity validation fails (e.g., `exactDepths: [1]` with `casesPerDepth: 13`), throws `BenchmarkConfigError` which is caught and posted back as `BENCHMARK_ERROR` (`errorKind: 'CONFIG_ERROR'`).

---

## 9. Result Summary, Metric Separation & Download Contract

### 9.1. Result Summary Presentation
Upon `COMPLETED` status, `ResearchPanel` renders:
1. **Suite Metadata:** `suiteId`, total sampled cases, total measured trials.
2. **Algorithm Summary:** For each selected algorithm:
   - Total Solved vs. Total Limit Reached.
   - Overall mean nodes expanded.
   - Overall median elapsed time (ms).
3. **By-Depth Metrics Table:**
   - Columns: `Exact Depth`, `Algorithm`, `Trials`, `Median Nodes Expanded`, `Median Nodes Generated`, `Median Elapsed (ms)`.
4. **Metric Classification Notice:**
   - Clear visual labels denoting `Nodes Expanded` and `Nodes Generated` as *deterministic search tree metrics*, and `Elapsed Time` as *observational, browser-environment-specific execution timing*.

### 9.2. Deterministic Safe Download Policy
- **Download Actions:** "Download JSON" and "Download CSV" buttons enabled only in `COMPLETED` state.
- **Safe Object URL Lifecycle:**
  1. Create `Blob` from `jsonText` (`application/json`) or `csvText` (`text/csv;charset=utf-8;`).
  2. Create temporary object URL via `URL.createObjectURL(blob)`.
  3. Create hidden `<a>` element with sanitized download filename, trigger `anchor.click()`.
  4. Remove anchor element from DOM if attached.
  5. Defer `URL.revokeObjectURL(url)` to the next macrotask (e.g., `setTimeout(() => URL.revokeObjectURL(url), 0)`) so the browser has sufficient time to initiate the download stream before the URL is invalidated, preventing cancelled downloads and avoiding object URL memory leaks.
- **Filename Sanitization Policy:**
  - Template: `gearcube-benchmark-<sanitized-suite-id>.<ext>`
  - Sanitizer regex: replace any character not in `[A-Za-z0-9._-]` with `_`, collapse consecutive `_`, trim leading/trailing `_`.
  - Fallback if empty: `gearcube-benchmark-suite.<ext>`
  - The internal `suiteId` inside the JSON/CSV report remains untouched.

---

## 10. Anticipated Implementation File Map

| Path | Category | Purpose |
| :--- | :--- | :--- |
| `apps/web/package.json` | **Required** | Add workspace dependency `"@gearcube/benchmark": "0.0.0"` |
| `package-lock.json` | **Required** | Lockfile update for web workspace dependency |
| `apps/web/src/components/research/benchmark-worker-protocol.ts` | **Required** | Type contracts for Worker inbound/outbound messages and error kinds |
| `apps/web/src/components/research/benchmark-worker-controller.ts` | **Required** | Pure state machine types, initial state, and reducer/transition functions |
| `apps/web/src/hooks/useBenchmarkWorker.ts` | **Required** | React hook managing Worker lifecycle, single-job dispatch, and cancellation |
| `apps/web/src/workers/benchmark.worker.ts` | **Required** | Dedicated background Web Worker importing `@gearcube/benchmark` |
| `apps/web/src/components/research/download-helper.ts` | **Required** | Pure filename sanitizer and browser Blob download trigger helper |
| `apps/web/src/components/research/ResearchPanel.tsx` | **Required** | UI component hosting Config Form, Status, Summary, and Exports (does not own mode toggle) |
| `apps/web/src/components/canvas/GearCubeViewport.tsx` | **Required** | Owns `WorkspaceMode` state, renders always-visible mode toggle, and orchestrates overlay gating |
| `apps/web/src/App.css` | **Required** | CSS styling for Research Mode panel, config grid, summary table, mode switch, and responsiveness |
| `tests/boundary.test.ts` | **Required** | Architectural boundary tests verifying `@gearcube/web` $	o$ `@gearcube/benchmark` dependency and Worker isolation |
| `tests/unit/benchmark-worker-controller.test.ts` | **Required** | Vitest unit tests for pure benchmark controller state machine |
| `tests/e2e/research-mode.spec.ts` | **Required** | Comprehensive Playwright E2E test suite covering all 13 acceptance scenarios |
| `docs/development/PHASE_5D_IMPLEMENTATION_PLAN.md` | **Current** | This authoritative Phase 5D planning candidate document |
| `docs/README.md` | **Optional** | Documentation navigation entry update for Phase 5D plan candidate |

---

## 11. Verification Strategy & Test Contracts

### 11.1. Pure Controller Vitest Unit Tests (`tests/unit/benchmark-worker-controller.test.ts`)
- `INITIAL_STATE`: verifies initial state is `IDLE`.
- `BEGIN_BENCHMARK`: transitions `IDLE`/`COMPLETED`/`ERROR` $	o$ `ACTIVE` with specified `requestId` and `config`.
- `STARTED_MESSAGE`: maintains `ACTIVE` status.
- `COMPLETE_MESSAGE`: transitions `ACTIVE` $	o$ `COMPLETED` storing summary and serialized strings.
- `ERROR_MESSAGE`: transitions `ACTIVE` $	o$ `ERROR` with error message and classification.
- `CANCEL_ACTIVE`: transitions `ACTIVE` $	o$ `CANCELLED`.
- `CANCEL_IDLE`: no-op when already idle.
- `STALE_REQUEST_ID_ISOLATION`: ignores messages matching mismatched `requestId`.
- `STALE_STATUS_ISOLATION`: ignores messages received when controller is not `ACTIVE`.
- `FAIL_ACTIVE`: records unhandled error only if `ACTIVE` and `requestId` matches.
- `FILENAME_SANITIZATION`: unit tests verifying filename sanitizer against edge cases (spaces, slashes, unicode, empty strings).

### 11.2. Architectural Boundary Tests (`tests/boundary.test.ts`)
Using the existing repository-owned module-specifier extraction and lexical boundary scanner (`extractModuleSpecifiers`):
- Verify `@gearcube/web` package manifest declares `"@gearcube/benchmark": "0.0.0"`.
- Verify `apps/web/src/workers/benchmark.worker.ts` exists.
- Verify `new Worker(...)` for benchmark occurs strictly in `useBenchmarkWorker.ts`.
- Verify benchmark runner functions (`runBenchmarkSuite`, `serializeBenchmarkReportJson`, `serializeBenchmarkReportCsv`) are imported on the web side **only** in `benchmark.worker.ts`, and `validateBenchmarkSuiteConfig` / types are imported in UI code.
- Verify no web code imports from `packages/benchmark/src/cli.ts` or Node built-ins.

### 11.3. Playwright Browser E2E Test Suite (`tests/e2e/research-mode.spec.ts`)
The test suite will enforce the 13 required scenarios:

```typescript
// Deterministic Fixture Configs
export const FAST_VALID_CONFIG: BenchmarkSuiteConfig = {
  schemaVersion: '1',
  suiteId: 'e2e-browser-fast',
  seed: 'e2e-browser-fast',
  exactDepths: [1],
  casesPerDepth: 2,
  algorithms: ['BFS', 'BIDIRECTIONAL_BFS', 'IDA_STAR'],
  warmupRuns: 0,
  measuredRuns: 1,
};

export const LONG_CANCEL_CONFIG: BenchmarkSuiteConfig = {
  schemaVersion: '1',
  suiteId: 'e2e-browser-cancel',
  seed: 'e2e-browser-cancel',
  exactDepths: [8],
  casesPerDepth: 8,
  algorithms: ['BFS'],
  warmupRuns: 0,
  measuredRuns: 1,
};
```

1. **`1. RESEARCH_MODE_UI_GATE`:** Verify mode switcher toggles between `PLAY` and `RESEARCH`. Play controls hidden, Research controls visible in `RESEARCH` mode. Mode switcher remains visible and reachable in both modes.
2. **`2. REAL_BENCHMARK_WORKER_GATE`:** Capture `page.waitForEvent('worker')`. Verify worker URL contains `benchmark.worker`. Verify worker context has `typeof document === 'undefined'`.
3. **`3. MAIN_THREAD_ACTIONABILITY_GATE`:** Start `LONG_CANCEL_CONFIG`. Verify `ACTIVE` state. Interact with a benign UI control (e.g. checkbox or input focus) while worker executes; verify interaction succeeds immediately without main-thread blocking.
4. **`4. BENCHMARK_CANCELLATION_GATE`:** Start `LONG_CANCEL_CONFIG`. Click "Cancel Benchmark". Verify transition to `CANCELLED`. Verify no delayed `COMPLETED` message or summary table appears.
5. **`5. STATIC_CONFIG_ERROR_GATE`:** Submit invalid form (e.g., zero depths selected or empty suiteId). Verify Layer 1 error renders without spawning a Worker.
6. **`6. WORKER_CONFIG_ERROR_GATE`:** Configure depth 1 with `casesPerDepth: 13` (exceeding canonical depth-1 corpus capacity of 12). Verify Layer 1 passes, Worker runs, and surfaces `CONFIG_ERROR` (`BenchmarkConfigError` with message indicating requested cases exceed available states).
7. **`7. RESULT_SUMMARY_GATE`:** Run `FAST_VALID_CONFIG`. Verify summary table renders 2 cases, 6 trials, depth 1 metrics for BFS, BiBFS, and IDA*.
8. **`8. JSON_DOWNLOAD_GATE`:** Click "Download JSON". Intercept Playwright download event. Parse JSON content; verify `schemaVersion === "1"`, `cases.length === 2`, `trials.length === 6`, and `environment.platform === "browser"`.
9. **`9. CSV_DOWNLOAD_GATE`:** Click "Download CSV". Intercept Playwright download event. Verify 14-column RFC-4180 header and exactly 6 measured data rows.
10. **`10. PLAY_RESEARCH_ISOLATION_GATE`:** In Play mode, switch to `DIRECT_180` turn interaction mode. Execute two explicit canonical move button actions (e.g. `U Clockwise` and `R Clockwise`), waiting for each to settle at IDLE. Record logical cube state and move history. Switch to Research mode, run `FAST_VALID_CONFIG` to completion. Switch back to Play mode; verify logical cube state, move history, and canvas transforms remain strictly unaltered.
11. **`11. MODE_SWITCH_CANCELLATION_GATE`:** Start long benchmark in Research mode. Switch mode back to Play while `ACTIVE`. Verify Worker is terminated and background compute stops.
12. **`12. RESPONSIVE_RESEARCH_LAYOUT_GATE`:** Test across Desktop ($1280\times 800$), Tablet ($768\times 1024$), and Mobile ($375\times 667$). Verify `scrollWidth <= clientWidth` (zero horizontal overflow) and all controls clickable.
13. **`13. ZERO_BROWSER_ERROR_GATE`:** Error collector listener verifies 0 `pageerror` events and 0 console error messages throughout the entire E2E test run.

---

## 12. Interactive Browser Acceptance Policy

- **Agent Tooling Status:** `INTERACTIVE_AGENT_BROWSER_TOOL: AVAILABLE` (via Chrome DevTools MCP lazy tools).
- **Dual-Track Acceptance Policy:**
  1. **Automated Track:** All Playwright unit and E2E tests (`npm run test:e2e`) must achieve `PASS`.
  2. **Interactive Track:** Live local browser session inspection verifying visual appearance, canvas rendering, responsive drawer behavior, download triggering, and clean console logs.
- **Integrity Rule:** If live interaction cannot be executed during final review, report `BROWSER_INTERACTION_CAPABILITY: UNAVAILABLE` / `BROWSER_ACCEPTANCE: NEEDS_HUMAN_VERIFICATION`. Do not fabricate visual PASS results.

---

## 13. Comprehensive Acceptance Gates

| Gate Identifier | Description | Verification Method |
| :--- | :--- | :--- |
| `WEB_BENCHMARK_DEPENDENCY_GATE` | `@gearcube/web` depends on `@gearcube/benchmark@0.0.0` | `boundary.test.ts` manifest check |
| `BROWSER_SAFE_BENCHMARK_IMPORT_GATE` | Web code imports only from browser-safe root `@gearcube/benchmark` | `boundary.test.ts` scanner check |
| `RESEARCH_WORKER_ISOLATION_GATE` | Benchmark runner executes off main thread in dedicated Web Worker | Playwright `worker` event & `typeof document` |
| `SINGLE_JOB_WORKER_GATE` | One fresh Worker instance per benchmark run | Code inspection & Worker lifecycle unit test |
| `BENCHMARK_CANCELLATION_GATE` | Active benchmark terminates cleanly via `worker.terminate()` | Playwright cancellation test |
| `STALE_MESSAGE_ISOLATION_GATE` | Stale callbacks from cancelled/superseded runs are ignored | Unit tests in `benchmark-worker-controller.test.ts` |
| `MAIN_THREAD_ACTIONABILITY_GATE` | UI remains interactive while heavy benchmark executes | Playwright parallel interaction test |
| `STATIC_CONFIG_VALIDATION_GATE` | Invalid structural configs caught on main thread before Worker creation | Playwright form validation test |
| `CANONICAL_WORKER_VALIDATION_GATE` | Corpus capacity violations detected and reported by Worker | Playwright capacity error test |
| `BROWSER_PROVENANCE_GATE` | Genuine browser provenance generated with zero fabricated fields | Downloaded JSON inspection |
| `NO_FAKE_PROGRESS_GATE` | No fabricated percentage/ETA telemetry displayed during run | UI inspection & DOM assertions |
| `RESULT_SUMMARY_GATE` | Completed run displays accurate summary and by-depth metrics table | Playwright summary table assertions |
| `EXPORT_SERIALIZATION_GATE` | JSON and CSV strings serialized inside Worker using package serializers | Code inspection & unit tests |
| `JSON_DOWNLOAD_GATE` | Download JSON produces valid, lossless JSON report file | Playwright `download` event & JSON parse |
| `CSV_DOWNLOAD_GATE` | Download CSV produces valid 14-column RFC-4180 CSV file | Playwright `download` event & CSV parse |
| `FILENAME_SANITIZATION_GATE` | Suite ID safely sanitized for filesystem download filename | Unit tests for filename helper |
| `PLAY_RESEARCH_ISOLATION_GATE` | Benchmark runs do not mutate interactive cube state or history | Playwright state preservation test |
| `MODE_SWITCH_LIFECYCLE_GATE` | Mode switching cancels active worker and restores presentation cleanly | Playwright mode transition test |
| `RESPONSIVE_RESEARCH_LAYOUT_GATE` | Zero horizontal overflow across Desktop, Tablet, and Mobile viewports | Playwright viewport assertions |
| `PLAYWRIGHT_RESEARCH_E2E_GATE` | 12 / 12 Research Mode Playwright tests pass (covering all planned scenario gates) | `npm run test:e2e` |
| `ZERO_BROWSER_ERROR_GATE` | Zero page errors and zero console error logs | Playwright error collectors |
| `REGRESSION_GATE` | Existing Play Mode and Solve Mode tests remain green | `tests/e2e/solve-mode.spec.ts` & unit tests |
| `INTERACTIVE_BROWSER_GATE` | Live browser verification of UX and rendering | DevTools inspection (conditional) |

---

## 14. Dependency-Ordered Implementation Sequence

Implementation executed and verified in strict dependency order (Steps A–G Completed & Accepted; Step H Documentation Accepted):
```text
Step A: Workspace Dependency & Pure Protocol/Controller Contracts
        ├─ Update apps/web/package.json + package-lock.json ("@gearcube/benchmark": "0.0.0")
        ├─ Create apps/web/src/components/research/benchmark-worker-protocol.ts
        ├─ Create apps/web/src/components/research/benchmark-worker-controller.ts
        ├─ Create apps/web/src/components/research/download-helper.ts
        └─ Create tests/unit/benchmark-worker-controller.test.ts (Vitest unit tests)
              │
              ▼
Step B: Dedicated Background Web Worker & React Hook
        ├─ Create apps/web/src/workers/benchmark.worker.ts
        └─ Create apps/web/src/hooks/useBenchmarkWorker.ts
              │
              ▼
Step C: Research Mode UI Components & Styling
        ├─ Create apps/web/src/components/research/ResearchPanel.tsx
        └─ Add Research Mode layout, form, table, and responsive rules to apps/web/src/App.css
              │
              ▼
Step D: Viewport Integration & Mode Orchestration
        └─ Integrate WorkspaceMode toggle in GearCubeViewport.tsx with clean overlay gating
              │
              ▼
Step E: Boundary & Unit Test Verification
        ├─ Update tests/boundary.test.ts for benchmark worker isolation
        └─ Run npm test (Vitest verification)
              │
              ▼
Step F: Playwright Research Mode E2E Test Suite
        ├─ Create tests/e2e/research-mode.spec.ts
        └─ Run npm run test:e2e
              │
              ▼
Step G: Interactive Browser Acceptance
        └─ Execute live DevTools inspection and interaction verification
              │
              ▼
Step H: Documentation Synchronization & Formal Phase 5 Acceptance
        ├─ Synchronize ROADMAP.md, TEST_STRATEGY.md, SYSTEM_ARCHITECTURE.md, README.md
        └─ Record formal acceptance of Phase 5D and Phase 5 overall
```

---

## 15. Risk Register & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Main-Thread Benchmark Blocking** | UI freezes during heavy benchmark runs | Enforce execution exclusively inside `benchmark.worker.ts`; verify with `MAIN_THREAD_ACTIONABILITY_GATE`. |
| **Node Built-in Import Leakage** | Vite build fails on browser bundle | Exclude `cli.ts` from package root; verify with `boundary.test.ts`. |
| **Fabricated Progress Telemetry** | Misleading UX regarding search progress | Freeze v1 UI to discrete status labels (`ACTIVE`, `"Running benchmark..."`) without fake counters. |
| **Stale Result Overwrite** | Cancelled job completes and overwrites UI | Match monotonic `requestId` on all outbound messages; reject mismatched callbacks in pure reducer. |
| **Concurrent Solver & Benchmark Worker Conflicts** | CPU resource exhaustion or race conditions | Automatically cancel solver on mode switch to `RESEARCH`; cancel benchmark on mode switch to `PLAY`. |
| **Memory / Serialization Overhead** | Large benchmark reports slow down UI | Serialize JSON and CSV strings directly inside the Worker; transfer only summary + text blobs. |
| **Object URL Memory Leaks / Cancelled Downloads** | Blobs leak or browser download fails | Defer `URL.revokeObjectURL(url)` to next macrotask after `anchor.click()`. |
| **Unsafe Filenames** | Corrupted downloads or browser path errors | Sanitize `suiteId` using strict regex filter (`[A-Za-z0-9._-]`) with fallback to `"suite"`. |
| **Expensive Corpus Work on Invalid Config** | Wasted CPU cycles before validation | Enforce Layer 1 static validation (`validateBenchmarkSuiteConfig`) on main thread before spawning Worker. |
| **Corpus Construction Leaking to Main Thread** | UI lag on config change | Keep `buildExactDistanceCorpus` strictly inside the Worker during execution validation. |
| **Mobile Overlay Visual Collisions** | UI unreadable or controls unclickable on phones | Design responsive collapsible drawer in `App.css` and verify with Playwright mobile viewport. |
| **Cancellation Race Condition in Tests** | Test suite completes before cancel is triggered | Use non-trivial depth-8 fixture (`e2e-browser-cancel`) to ensure an observable active window. |
| **Browser Metadata Fabrication** | Misleading research environment data | Populate only genuinely accessible browser properties (`platform: 'browser'`, `userAgent`, `hardwareConcurrency`). |
| **Accidental Mutation of Phase 5C Data** | Invalidation of accepted Phase 5C research evidence | Isolate browser export downloads to client-side Blob downloads; zero filesystem writes to `docs/research/phase5c/`. |

---

## 16. Stop Conditions

The implementation agent must **STOP** and request clarification if:
1. `@gearcube/benchmark` root cannot bundle or resolve in browser code without bundling Node built-ins.
2. Root import graph leaks Node-only modules into browser-safe entry points.
3. Current benchmark runner or serializer requires benchmark-engine API modification.
4. Current serializers are browser-incompatible.
5. Vite module Worker cannot execute current runner.
6. Required `PLAY`/`RESEARCH` mode isolation needs a larger architectural redesign.
7. Cancellation E2E cannot obtain a reliable `ACTIVE` window without production-only artificial delay.
8. Remote `main` changes before Phase 5D work begins.
9. Protected dirty Phase 1D worktree would need modification.
