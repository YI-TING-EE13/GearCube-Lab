# M6.1 Implementation Plan — Classical Solver Portfolio Expansion

> **Milestone status:** `IMPLEMENTATION_CANDIDATE` (contract prepared before production implementation)
> **Baseline:** `feature/m6-play-orientation-certified-challenge` at `8e948167030abee7afdd717591358c5394e28806`
> **Candidate worktree:** `.worktrees/m6-play-orientation-certified-challenge`
> **Baseline tree:** `10a388602f392ab71d854e6a8f62ccada9c1d5cd`
> **Scope:** `@gearcube/solvers`, the existing solver Worker and Play panel, the shared benchmark runner and Research panel, focused tests, and current living documentation

## Purpose and acceptance criteria

M6.1 adds a genuine optimal graph-search A* solver to the existing classical portfolio. The portfolio becomes `BFS`, `BIDIRECTIONAL_BFS`, `A_STAR`, and `IDA_STAR`; the existing three algorithms retain their current behavior.

Acceptance requires:

- `solveAStar` returns an optimal shortest path under the canonical unit-cost 12-move metric.
- The implementation evaluates `f(n) = g(n) + h(n)` with the accepted H2 Two-Slice PDB Max heuristic.
- A binary min-heap, dense rank-indexed search bookkeeping, strict best-`g` updates, stale-entry rejection, and parent reconstruction are covered by code and tests.
- `maxDepth`, `maxNodes`, invalid options, solved input, deterministic output, duplicate-state discovery, and input immutability follow the existing solver result conventions.
- `A_STAR` is available through the existing public solver type/API, one-shot solver Worker, Play selector/result metrics, benchmark validation/dispatch, Research selector, and JSON/CSV reporting without a new Worker or workspace.
- Exact-distance fixtures, a deterministic corpus of at least 100 states, cross-solver depth equality, and the existing exhaustive H2 admissibility/consistency gates pass.
- M6 orientation guidance and Challenge behavior remain unchanged; Challenge certification continues to use `IDA_STAR` only and exposes no solution sequence.
- Current living documentation describes the candidate capability and remains candidate-level. Accepted historical Phase 5C reports, raw artifacts, workflows, rulesets, Core semantics, Kinematics, transition data, dependencies, and lockfiles remain unchanged.

## Current system and source of truth

- `packages/core` owns the canonical state, legal transitions, `ALL_MOVES`, solved state, and the 41,472-state rank domain. M6.1 does not change Core.
- `packages/solvers` owns pure BFS, Bidirectional BFS, and IDA*. `types.ts` and `protocol.ts` define the shared result, telemetry, options, and Worker contracts. `heuristics.ts` owns H2; its neutral internal name will be `estimateH2Heuristic`, with a compatibility alias only if existing package tests need it.
- `state-index.ts` provides the bijection used for dense A* arrays. The existing H2 test already proves admissibility over all 41,472 states and consistency over all 497,664 directed transitions.
- `apps/web/src/workers/solver.worker.ts` is the only solver Worker entrypoint. `SolvePanel.tsx` and `useSolverWorker.ts` own the existing Play selection and lifecycle; cancellation remains host-driven termination with request-identity stale-result rejection.
- `packages/benchmark` validates `SolverAlgorithm`, dispatches the selected solver, and exports the existing version-1 trial schema. `ResearchPanel.tsx` owns the current browser algorithm selector and summary presentation.
- The committed `docs/research/phase5c/**` configuration, raw, and derived files are historical/raw evidence. They are not rewritten to add A*.

## A* contract and module responsibilities

### Algorithm

`solveAStar(state, options?)` uses one unit cost per canonical move. The open set is a binary min-heap ordered deterministically by lower `f`, lower `h`, lower `g`, lower state rank, then stable insertion order. The goal terminates only when its valid best-`g` entry is popped.

The solver stores best `g`, parent rank, parent move index, and closed/reopened bookkeeping in typed arrays indexed by `rankState`. Each heap entry stores `rank`, `g`, `h`, and `f`. Entries whose `g` no longer equals `bestG[rank]` are stale and are discarded. A lower-`g` discovery updates the parent and reopens a previously closed state; correctness therefore does not depend on an undocumented consistency assumption.

`nodesExpanded` counts non-goal nodes whose successors are examined. `nodesGenerated` counts successor states produced by `applyMove`; heap operations are not counted. A node at `maxDepth` is not expanded, and a non-goal is rejected with `MAX_NODES` before expansion when the expansion budget is exhausted. Parent arrays reconstruct a canonical `Move[]` with `moves.length === depth` without mutating the input state.

### H2 reuse

The accepted H2 mathematics remains `max(d_CXY, d_CXZ, d_CYZ)`. A* and IDA* call the same algorithm-neutral internal estimator. Existing independent PDB matching, exhaustive admissibility, and exhaustive consistency tests remain the authority; the M6.1 suite adds no new PDB semantics or public heuristic API.

### Telemetry and UI

`SearchTelemetry` gains an `A_STAR` discriminant with `nodesExpanded`, `nodesGenerated`, `elapsedMs`, `bestF`, `currentDepth`, and `openSize`. The Play panel displays the selected/result algorithm, solution depth, expanded nodes, generated nodes, and time. Timing remains observational and is not presented as a controlled scientific comparison.

### Research and Challenge boundaries

The benchmark validator and runner accept all four algorithms in caller-specified deterministic order. The existing schema version and 14 CSV columns remain unchanged because `algorithm` already uses the shared union. Historical Phase 5C evidence remains frozen. M6 Challenge keeps its fixed `IDA_STAR` certification solver, fixed `EASY = 2..4`, `NORMAL = 5..6`, and `CHALLENGE = 7..8` bands, and has no solver selector.

## Scope

### In scope

- `packages/solvers/src/types.ts`, `index.ts`, `heuristics.ts`, `ida-star.ts`, new `a-star.ts`, and focused solver tests.
- Existing solver Worker dispatch and Play Solver selector/metrics.
- `packages/benchmark/src/config.ts` and `runner.ts`, focused benchmark tests, and the current Research selector/summary tests.
- Current living README, architecture, contract, roadmap, blueprint, and test-strategy documentation where the implemented portfolio changes their claims.

### Out of scope

- `packages/core`, `packages/kinematics`, `transition-data.ts`, canonical move/state semantics, M6 Challenge policy/lifecycle, or a new workspace/Worker.
- Dijkstra/UCS, Greedy Best-First, weighted A*, IDDFS, neural search, or other algorithms.
- Dependency or lockfile changes, workflow/ruleset changes, historical Phase 5C reports/configs/raw/derived artifacts, merge, PR creation, release, tag, or `main` modification.

## Phased implementation

1. **Contract record:** commit this plan and its documentation-index entry; verify exact candidate baseline and clean status.
2. **Pure solver:** add neutral H2 naming, `A_STAR` types, A* heap/search/reconstruction, focused unit tests, and cross-solver exact-distance gates.
3. **Worker and Play:** add exhaustive Worker dispatch, selector option, algorithm-identifiable metrics, generated-node telemetry, and browser regression coverage.
4. **Research:** add A* to live validation, runner dispatch, default Research selection, deterministic ordering tests, and UI summary coverage without touching Phase 5C evidence.
5. **Documentation and qualification:** synchronize current living docs, run focused tests, benchmark characterization across depths 2..8 and four algorithms, all required local gates, and report verified versus open behavior.

Each phase is independently reviewable. Reverting the implementation commit restores the pre-M6.1 portfolio; reverting the plan commit removes only the candidate contract record.

## Verification matrix

| Area | Required evidence |
| :--- | :--- |
| Baseline | Exact branch, HEAD, tree, remote SHA, clean candidate worktree, and unchanged protected checkout |
| A* correctness | Solved input, fixture depths 1..8, returned path application, move/depth equality, input immutability, and deterministic repeated runs |
| A* limits | `maxDepth` 0/below/equal, `maxNodes` boundary, invalid options, and existing `LIMIT_REACHED` reasons |
| Duplicate handling | Best-`g` updates, stale heap-entry rejection, reopen-safe implementation, and broader exact-distance corpus |
| H2 | Existing 41,472-state admissibility and 497,664-edge consistency gates; `h(goal) = 0` |
| Cross-solver | BFS, Bidirectional BFS, A*, IDA*, and the exact oracle agree on representative depths and all paths solve |
| Worker/Play | Real existing Worker dispatch, A* selection, telemetry, result metrics, cancellation/stale guards, and playback acceptance |
| Research | Four-algorithm validation, deterministic trial rotation, optimality, JSON/CSV algorithm preservation, and browser selector/summary |
| M6 regression | Existing orientation legend, responsive controls, Challenge `IDA_STAR` certification, fixed difficulty bands, and no solution disclosure |
| Repository gates | `git diff --check`, `npm run verify`, `npm run test:e2e`, explicit solver/benchmark suites, Phase 5C analyzer count, and production build |

No wall-clock threshold or exact memory number will be claimed unless measured. E2E/visual evidence remains limited to the available browser environments; native Safari, screen readers, physical devices, and hosted CI are open unless directly tested.

## Scope-creep decision

```text
Original goal: Add one optimal H2-guided A* solver to the current M6 classical portfolio.
Additional work considered: Core/kinematics changes, new algorithms, dependency/workflow changes, historical artifact edits, or workspace redesign.
Required by acceptance criteria: No.
Durable reusable asset: The pure A* solver, shared telemetry discriminant, and benchmark dispatch are reusable within the existing contracts.
Existing solution sufficient: Yes. Reuse the current rank index, H2 tables, solver Worker, Play panel, benchmark runner, and Research panel.
Project classification: Product/project delivery with evidence gates.
Time box and exit condition: Implement only the five phases above; stop on any listed M6.1 stop condition or failed required regression gate.
Decision: Continue with the bounded solver portfolio candidate.
```
