# M6 Implementation Plan — Play Orientation & Certified Challenge UX

> **Milestone status:** `IMPLEMENTATION_CANDIDATE` (contract prepared before production implementation)
> **Baseline:** `origin/main` `659c18f3cf93d49eafdd5ea279054a4188332f7d`
> **Candidate branch:** `feature/m6-play-orientation-certified-challenge`
> **Candidate worktree:** `.worktrees/m6-play-orientation-certified-challenge`
> **Scope:** `apps/web` application-layer UI and worker orchestration, focused tests, and living documentation

## Goal and acceptance criteria

M6 adds two Play-workspace capabilities for operators of the browser simulator:

1. A persistent orientation and move-action guide that exposes the accepted coordinate axes and the face-local clockwise/counter-clockwise convention without relying on hover tooltips.
2. A deterministic challenge generator with `EASY`, `NORMAL`, and `CHALLENGE` product difficulty labels. The label is accepted only from the shortest depth returned by the existing optimal `IDA_STAR` solver.

Acceptance requires:

- all six face-axis mappings and face-local direction wording are unit-tested;
- direct 180°, TWO_STEP first-step, midpoint finish, and midpoint reverse guidance are unit-tested and visible in accessible control names;
- the challenge depth contract is exactly `EASY = 2..4`, `NORMAL = 5..6`, and `CHALLENGE = 7..8`;
- challenge candidates are generated deterministically from the solved baseline using the user seed, difficulty, and attempt index;
- certification runs in a dedicated existing solver Worker adapter lifecycle and never blocks the main UI thread;
- retries are bounded at 64 attempts, out-of-band results are rejected, and failure leaves the displayed puzzle unchanged;
- an accepted challenge installs a solved-rooted state as the new Play baseline with empty history while preserving interaction mode;
- cancellation, workspace switching, unmount, stale results, and concurrent Play mutations cannot apply an uncertified or obsolete candidate;
- Playwright coverage verifies visible orientation guidance, challenge selection/action/status, certified depth, no solution disclosure, baseline reset, deterministic Scramble regression, and representative responsive layouts;
- the required repository verification commands run and their exact results are reported. M6 remains a candidate pending independent review.

## Current system and source of truth

The current implementation establishes these facts:

- `@gearcube/core` owns `GearCubeState`, legal moves, canonical 180° transitions, and `SpatialFrame`. It is the sole puzzle-state authority.
- `@gearcube/solvers` owns pure BFS, Bidirectional BFS, and `IDA_STAR`. `SolveSuccess.depth` is the accepted shortest canonical move depth. Solvers do not depend on renderer state or `SpatialFrame`.
- `GearCubeViewport.tsx` owns `WorkspaceMode`, the Play application state, current solver Worker hook, overlays, and workspace cancellation.
- `play-session.ts` applies ordinary deterministic Scramble relative to the current endpoint and atomically establishes its baseline. Challenge installation needs a separate solved-rooted application-layer helper.
- `useSolverWorker.ts` creates one one-shot Worker per request, uses monotonic request IDs, terminates on cancellation/terminal messages/unmount, and filters stale responses.
- `MoveControls.tsx` owns the Play move affordances and delegates transitions to the parent. `animation.ts` remains the authority for TWO_STEP midpoint locking and `DIRECT_180` timing.
- `App.css` owns the existing desktop overlays, responsive drawer, and collision/overflow behavior. The M6 controls remain inside the existing Play drawer and do not create a workspace.

The accepted coordinate and direction source of truth is:

| Face | Axis identity |
| :--- | :--- |
| `R` | `+X` |
| `L` | `-X` |
| `U` | `+Y` |
| `D` | `-Y` |
| `F` | `+Z` |
| `B` | `-Z` |

`CW` and `CCW` are always described as viewed from outside the selected face toward the cube center. They are never defined from the current camera screen orientation.

## Scope

### In scope

- A pure application-layer move-guidance module and focused tests.
- A compact persistent `OrientationLegend` associated with `MoveControls`.
- Semantic face labels, explicit `CW`/`CCW` text, accessible names, focus-visible styling, and dynamic action guidance for idle, direct, TWO_STEP, and midpoint states.
- A small read-only camera-synchronized axis aid using the installed Drei/R3F API if the API is available without interaction side effects. If the API is not cleanly read-only or materially complicates the overlay, retain the textual legend and record the limitation.
- Pure challenge difficulty/range validation, deterministic candidate construction, solved-rooted state/frame evaluation, bounded retry policy, and challenge result types.
- A dedicated challenge controller/hook that reuses `solver.worker.ts` and `@gearcube/solvers` rather than adding a search algorithm or altering solver contracts.
- A `play-session.ts` application-layer installation helper for an already-certified solved-rooted candidate.
- Viewport integration, effective Play busy-state gating, status/error/result presentation, and cancellation on Research switch/unmount.
- Focused Vitest coverage, boundary/lifecycle tests, and Playwright Play/Solve regression extensions.
- Living documentation synchronization in the root README, documentation index, roadmap, test strategy, architecture/blueprint documents where the implemented behavior changes their current claims.

### Out of scope

- Any change to `packages/core`, canonical transition tables, move algebra, 180° semantics, `SpatialFrame`, `packages/kinematics`, solver optimality, or benchmark/research artifacts.
- New solver algorithms, solver cost metrics, solution-path disclosure, renderer-owned challenge state, or camera-derived puzzle state.
- Dependency upgrades, package-manager changes, lockfile churn without a demonstrated need, or a new workspace/workspace mode.
- Accounts, persistence, server/cloud challenge services, `Math.random()`, time-derived challenge truth, or unbounded retries.
- Historical acceptance-record rewrites, ruleset/governance changes, merges, releases, tags, PR creation, or direct `main` pushes.

## Contracts and safety boundaries

### Orientation contract

- `FACE_AXIS_MAP` is the only UI axis mapping and exposes all six face identities.
- The legend persistently renders `X axis: L (-X) ↔ R (+X)`, `Y axis: D (-Y) ↔ U (+Y)`, `Z axis: B (-Z) ↔ F (+Z)`, and the face-local viewing convention.
- A control's semantic label contains the face, axis identity, `CW` or `CCW`, and the action explanation. The explanation is available in the rendered accessible name and visible guidance text; `title` is supplementary only.
- In `DIRECT_180`, an idle action describes a 180° face rotation. In `TWO_STEP`, an idle action describes the first 90° physical step. At `HALF_TURN_LOCKED`, the staged direction says `Finish the canonical 180° turn`; the opposite direction says `Reverse to the original position`.
- The axis aid, if retained, is presentation-only, camera-synchronized, non-interactive, and has no path to Core state or camera mutation.

### Difficulty and certification contract

```text
EASY       = 2..4
NORMAL     = 5..6
CHALLENGE  = 7..8
SOLVER     = IDA_STAR
MAX_ATTEMPTS = 64
```

- The final label is computed only by `SolveSuccess.depth`; scramble length and attempt count are sampling metadata, never difficulty truth.
- Each candidate starts from `SOLVED_GEAR_CUBE_STATE` and `DEFAULT_SPATIAL_FRAME` and is evaluated with the existing pure Core transition pipeline.
- Candidate sampling uses a deterministic derived seed containing the caller seed, difficulty, and zero-based attempt index. Candidate lengths are explicit sampling heuristics and are documented/reportable separately from the difficulty definition.
- A candidate is accepted only when the returned `SolveSuccess.depth` falls inside the requested range. The returned challenge summary contains the certified depth and requested difficulty, but no solution `Move[]`.
- After 64 failed/out-of-band attempts, the hook reports a bounded error and applies no candidate. Solver errors are terminal generation errors unless cancellation or a newer request supersedes them.

### Challenge lifecycle and concurrency contract

```text
PLAY idle
  -> begin challenge request
  -> generate candidate from solved root
  -> dedicated one-shot solver Worker (IDA_STAR)
  -> depth in requested band? accept : next deterministic attempt
  -> on accept, install new Play baseline atomically
```

- The challenge hook owns a separate Worker reference, request counter, active generation token, and controller state from `useSolverWorker`. It reuses the existing `solver.worker.ts` entry and protocol.
- Starting a challenge is allowed only from Play when the session is idle and neither solver search nor another challenge generation is active. The effective Play busy state disables move buttons, keyboard moves, history mutations, ordinary Scramble, mode switching, and Solve start while certification is pending.
- Any external Play mutation first cancels challenge generation and invalidates its token. Switching to Research cancels challenge generation before changing workspace. Unmount terminates the Worker.
- A result is accepted only when its request/generation token still matches, the hook is mounted, and the generation is active. Termination and token invalidation happen before applying the candidate.
- The visible SolvePanel lifecycle remains independent. A Challenge panel does not read or overwrite visible Solve search state, playback metadata, or solver selection.
- Candidate certification never mutates `app.session` or `app.history`. The installation helper runs only after certification and creates a fresh baseline with `entries = []` and `cursorIndex = -1`, preserving `interactionMode`.

## Phased implementation

1. **Contract and dependency preflight**
   - Commit this plan and its documentation-index entry.
   - Install the existing lockfile dependencies only if needed for verification, inspect Drei's installed gizmo API, and record the no-upgrade decision.
   - Focused gate: clean candidate worktree, exact baseline ancestry, no protected checkout changes.

2. **Orientation guidance**
   - Add pure axis/direction wording and unit tests.
   - Add `OrientationLegend`, integrate it into `MoveControls`, and update semantic labels/focus styles.
   - Add/read the existing Drei gizmo without creating a new state owner; omit it with an explicit limitation if unsafe or disproportionate.
   - Focused gate: guidance unit tests, static accessibility assertions, typecheck, and responsive DOM inspection.

3. **Pure challenge policy and controller**
   - Add difficulty/range policy, deterministic candidate builder, bounded-attempt decision functions, and solved-rooted baseline installation helper.
   - Add challenge Worker controller/hook using the existing one-shot solver Worker and `IDA_STAR`; keep solution moves internal to certification and discard them before UI state.
   - Focused gate: boundary depths, out-of-band rejection, deterministic same-seed selection, independent attempts, bounded failure, solved-root distinction, cancellation/stale transitions, and accepted-depth equality.

4. **Play integration and UX**
   - Add difficulty selector, Start/Generate Challenge action, accessible status/result/error text, and effective busy gating.
   - Wire accepted candidates into `GearCubeViewport` through the application-layer baseline helper and cancel paths.
   - Preserve ordinary deterministic Scramble, SolvePanel state, playback state, mode toggle rules, and interaction mode.
   - Focused gate: component/static tests and Playwright state/DOM conditions without arbitrary timing sleeps.

5. **Documentation synchronization and verification**
   - Update living docs only where current behavior/roadmap/test inventory/contracts changed; keep status `IMPLEMENTATION_CANDIDATE`.
   - Run the focused tests, deterministic 20-seed-per-difficulty generation batch, `git diff --check`, `npm run verify`, `npm run test:e2e`, and production build evidence.
   - Inspect browser console/error collectors and representative `1440x900`, `768x1024`, `375x667`, `390x844`, `667x375` layouts.
   - Commit plan and implementation separately, then push only the feature branch after all local gates pass. Do not create a PR.

## Verification matrix

| Area | Required evidence |
| :--- | :--- |
| Baseline/scope | `git fetch origin --prune`; exact `origin/main`; clean initial candidate worktree; protected checkout remains distinguishable |
| Orientation pure logic | All six mappings, face-local convention, direct wording, TWO_STEP first step, midpoint finish/reverse, and accessible semantic controls |
| Challenge pure logic | `2,3,4 -> EASY`; `5,6 -> NORMAL`; `7,8 -> CHALLENGE`; out-of-band rejection; deterministic candidate selection; independent attempts; bounded failure; solved-rooted candidate; accepted depth equals solver result |
| Worker lifecycle | Dedicated Worker construction/reuse of `solver.worker.ts`; off-main-thread execution; independent visible Solve state; cancellation, unmount, request/token stale rejection; no post-cancel application |
| Play baseline | Accepted challenge resets history and baseline atomically, preserves interaction mode, leaves no solution moves visible, and leaves failed generation unchanged |
| Responsive/accessibility | No horizontal overflow/collisions; reachable controls at desktop/tablet/mobile sizes; `aria-pressed` difficulty state; semantic region and status live text; visible CW/CCW labels; focus-visible controls |
| Repository regression | `git diff --check`, `npm run verify`, `npm run test:e2e`; exact Vitest file/test counts, Phase 5C analyzer count if included, browser pass/skip counts, and production build result |
| Empirical sampling | At least 20 base seeds per difficulty, with success/failure, accepted depths, and min/median/max attempts. This validates sampling only and does not redefine difficulty. |

## Rollback and recovery

- The plan commit is independently revertible before feature implementation.
- Orientation changes are isolated to `apps/web` presentation modules and CSS; revert those files without touching Core or Kinematics.
- Challenge policy, controller, hook, and viewport integration are application-layer changes. Reverting the implementation commit restores the pre-M6 Play flow and existing deterministic Scramble/Solve behavior.
- If a verification gate fails, leave the feature branch at the failing evidence, record the exact command/output, and do not push or promote the candidate.
- Do not reset, clean, delete, or modify the protected historical checkout or unrelated worktrees.

## Risks and open assumptions

- **Drei gizmo API:** The manifest pins `@react-three/drei` `10.7.8`, but the fresh worktree has no installed dependencies yet. The installed package types/build are the authority; textual guidance remains the fallback if a clean read-only gizmo cannot be established.
- **Sampling hit rate:** Candidate lengths are heuristics. The deterministic batch gate must establish that 64 attempts is useful for representative seeds; a poor hit rate is a bounded candidate limitation, not permission to weaken certification.
- **Worker cost:** `IDA_STAR` certification may take observable time at depths 7–8. The UI must remain actionable for permitted non-mutating interaction and must expose active/cancel/error state without fabricating progress.
- **Architecture expansion:** If the required lifecycle cannot reuse the existing solver Worker/protocol without changing a public Core/Kinematics/Solver contract, stop with `ARCHITECTURE_SCOPE_EXPANSION_REQUIRED`.
- **Browser evidence:** DOM/E2E checks do not replace independent visual review of WebGL gizmo placement. Any unavailable interactive browser evidence remains explicitly open.

## Scope-creep decision

```text
Original goal: Add Play orientation guidance and solver-certified Easy/Normal/Challenge generation.
Additional work considered: Core, Kinematics, solver algorithm, dependency, renderer, persistence, or workspace redesign.
Required by user outcome: No.
Durable reusable asset: The focused application-layer policy/controller and maintained contract are reusable; broader redesign is not required.
Existing solution sufficient: Yes. Reuse Core transitions, IDA_STAR, solver.worker.ts, and the existing Play drawer.
Project classification: Product/project delivery with evidence gates.
Time box and exit condition: Implement only the listed phases; stop on any mission stop condition or failed required regression gate.
Decision: Continue with the bounded application-layer candidate.
```
