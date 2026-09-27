# M7 — Challenge Performance & Completion UX Implementation Plan

> **Document lifecycle:** Historical / Accepted Contract.
> **Implementation status:** M7A, M7B, and M7C, including the collision repair, are completed and accepted.
> **Accepted candidate:** `fix/m7c-challenge-action-hit-target` at `c7960f60b375e9807624f29b6102e5d9a3868844`, based on `origin/main` `1784e2b65c061f3dedac2b9c76857a44bb3ed1cc`.
> **Hosted qualification:** [Verify #76](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/36252841676) passed on the exact candidate head; PR #14 later merged normally as `dc881d624844623f9f5f990cddd5fbedb9b79e68`, canonical [Verify #79](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/36259254472) passed on that exact `main` SHA, and [Pages #52](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/36259850820) deployed the same SHA.
> **Closeout boundary:** The sections below preserve the pre-implementation contract and design intent as historical context. Final repository-integration and deployment evidence is preserved in [`M7_POST_MERGE_OPERATIONAL_RECORD.md`](M7_POST_MERGE_OPERATIONAL_RECORD.md).

This plan specifies an ephemeral performance record for the existing certified Challenge lifecycle. It preserves Core as the only source of puzzle truth, the M6 certification contract, and Play's canonical transition/history behavior.

## 1. Motivation

Certified Challenge currently provides a generated puzzle and a solver-depth difficulty certificate. M7 defines the missing session layer so players can understand how many moves they committed, how long their run took, whether solver help was used, and how their move count compares with the certified optimum. The result should remain stable after completion and make a same-puzzle Retry straightforward.

M7 adds application-level session metrics and completion feedback only. It does not change puzzle validity, move mechanics, or certified difficulty.

## 2. Existing M6 baseline

The implementation baseline is `origin/main` at `1784e2b65c061f3dedac2b9c76857a44bb3ed1cc`. M6 creates deterministic solved-rooted candidates, certifies them using the existing dedicated `IDA_STAR` Worker, and installs an accepted `CertifiedChallenge` as an empty-history Play baseline.

Relevant contracts are in [`challenge.ts`](../../apps/web/src/components/challenge/challenge.ts), [`challenge-controller.ts`](../../apps/web/src/components/challenge/challenge-controller.ts), [`history.ts`](../../apps/web/src/components/history/history.ts), [`play-session.ts`](../../apps/web/src/components/history/play-session.ts), and [`GearCubeViewport.tsx`](../../apps/web/src/components/canvas/GearCubeViewport.tsx). Difficulty remains EASY `2..4`, NORMAL `5..6`, and CHALLENGE `7..8` by certified optimal depth. Sampling length is a candidate-generation heuristic, not difficulty truth. `CertifiedChallenge.depth` remains the authoritative optimal move count; no optimal solver move sequence is added to the certificate.

## 3. Scope / non-scope

In scope: a pure app-layer ChallengeRun controller; monotonic committed-move accounting; completion metrics; assistance disclosure; same-certificate Retry; integration with existing New Challenge and Scramble actions; an accessible performance/completion presentation; deterministic unit, integration, and browser acceptance gates; and later documentation synchronization.

The explicit non-goals are listed in section 21. This planning task changes documentation only and does not implement M7, update test inventory, commit, push, or create a PR.

## 4. User flow

The target path is:

```text
GENERATE → CERTIFY → INSTALL BASELINE → PLAY → TRACK PERFORMANCE
         → SOLVE → EVALUATE → RETRY / NEW CHALLENGE
```

After successful certificate installation, the active run begins at zero committed moves and unassisted. Completed canonical moves are counted once. A Solve search marks the run assisted before search/playback can proceed. A settled solved canonical state completes an active run once and freezes the result. Retry reinstalls the same certificate as a clean baseline; New Challenge invokes the existing generator; ordinary Scramble abandons Challenge performance.

## 5. Domain terminology

- **Certified challenge:** The existing immutable M6 result containing difficulty, base seed, certified depth, canonical state, frame, and stable identity.
- **Challenge run:** One attempt to solve one accepted certificate, including start time, committed-move count, assistance flag, and at most one frozen completion result.
- **Canonical committed move:** One completed 180-degree move accepted by the existing Play transition and appended to Play history. Animation staging is not itself a commit.
- **Player moves:** The ChallengeRun's monotonic count of canonical committed moves during this attempt. It is not derived from history cursor, visible history length, or current path.
- **Assisted run:** A run in which the existing Solve search was started while the run was ACTIVE, regardless of later cancellation, limit, error, or playback outcome.
- **Retry:** A new ChallengeRun over the exact same accepted certificate, installed into a fresh empty-history Play baseline.

## 6. ChallengeRun state machine

The pure controller should expose three primary states:

```ts
type ChallengeRunState =
  | { readonly status: 'INACTIVE' }
  | {
      readonly status: 'ACTIVE';
      readonly challenge: CertifiedChallenge;
      readonly startedAtMs: number;
      readonly startCommitSequence: number;
      readonly assisted: boolean;
    }
  | {
      readonly status: 'COMPLETED';
      readonly challenge: CertifiedChallenge;
      readonly startedAtMs: number;
      readonly completedAtMs: number;
      readonly startCommitSequence: number;
      readonly assisted: boolean;
      readonly result: ChallengeRunResult;
    };
```

The stored `challenge` is the exact accepted immutable `CertifiedChallenge` reference, not a copy or mutable current-puzzle owner. Its identity is the certificate's difficulty, base seed, state key, frame, and certified depth. `ChallengeRunResult` freezes challenge identity, difficulty, base seed, optimal moves, player moves, moves over optimal, efficiency percentage, `startedAtMs`, `completedAtMs`, `elapsedMs`, `solvedOptimally`, and `assisted`.

Required transitions:

```text
INACTIVE  -- CERTIFIED_BASELINE_INSTALLED --> ACTIVE
ACTIVE    -- CANONICAL_MOVE_COMMITTED ----> ACTIVE (global sequence advances)
ACTIVE    -- ELIGIBLE_SOLVED_STATE_OBSERVED -> COMPLETED (freeze result once)
ACTIVE    -- SOLVE_SEARCH_STARTED --------> ACTIVE (assisted = true)
ACTIVE    -- NEW_CHALLENGE_ACCEPTED ------> INACTIVE
ACTIVE    -- SCRAMBLE_BASELINE_INSTALLED -> INACTIVE
COMPLETED -- RETRY_INSTALLED ------------> ACTIVE (same certificate, fresh run)
COMPLETED -- NEW_CHALLENGE_ACCEPTED ------> INACTIVE
COMPLETED -- SCRAMBLE_BASELINE_INSTALLED -> INACTIVE
```

For an ordinary solve, the canonical move commit and solved-state evaluation occur in the same Play transition: `canonicalCommitSequence` advances, then completion freezes from the resulting state. `playerMoves` is derived from the current sequence and run start sequence; the run state does not maintain a second incremented counter.

Pure operations should cover:

```ts
startChallengeRun(challenge, nowMs, canonicalCommitSequence)
getChallengeRunMoveCount(activeRun, currentCanonicalCommitSequence)
markChallengeRunAssisted(state)
tryCompleteChallengeRun(state, { currentState, isPlayIdle, canonicalCommitSequence, nowMs })
retryChallengeRun(activeOrCompletedRun, nowMs, canonicalCommitSequence)
resetChallengeRun(state)
```

Start validates a finite timestamp and non-negative integer serial. Count and completion reject sequence regression. Completion uses Core `isSolved()` and requires an idle Play session. Retry preserves the exact stored certificate reference while taking a new time/serial baseline. Reset returns to INACTIVE and releases the certificate from run state.

Generation failure/cancellation after an accepted New Challenge request leaves the prior run abandoned and no active M7 run. PLAY→RESEARCH→PLAY preserves the same state and does not introduce a PAUSED state. The controller is pure: callers supply typed events and time values; it performs no I/O, clock reads, React updates, or browser-global access.

## 7. Move-accounting semantics

Add a monotonic application-event serial to `PlayApplicationState`:

```ts
readonly canonicalCommitSequence: number;
```

Its initial value is `0`. Increment it exactly once only at the existing `stepPlayAnimation()` canonical completion boundary, when the previous staged phase is `SECOND_HALF_ANIMATING` or `DIRECT_FULL_ANIMATING`, the next session has `stagedMove === null`, and the same transition calls `appendMove()`. This sequence records canonical commits over the lifetime of the Play application state; it is not puzzle state, history length, or a visible-path cursor.

It must remain unchanged for `FIRST_HALF_ANIMATING`, `HALF_TURN_LOCKED`, `CANCEL_HALF_ANIMATING`, partial `DIRECT_FULL_ANIMATING`, Undo, Redo, Scrub, Back to baseline, interaction-mode changes, ordinary Scramble baseline installation, and Certified Challenge baseline installation. Both baseline operations preserve the serial rather than resetting it. Direct full turns and completed second-half turns each increment once. Do not duplicate Core transition logic or infer completion from rendered text, DOM, animation labels, or history shape.

An ACTIVE run records `startCommitSequence`; its move count is derived as:

```text
playerMoves = currentCanonicalCommitSequence - startCommitSequence
```

Require the current serial to be a non-negative integer and not lower than the run start. Do not clamp invalid sequence data. Because navigation cannot decrement the application serial, undoing a committed move leaves it counted. For example, sequence 10 → complete `R+` (11) → Undo (11) → complete `U+` (12) yields two player moves even if branch truncation leaves one visible history entry.

## 8. Completion metric formulas

Complete when the run is ACTIVE, the Play session is settled/IDLE, and the post-transition canonical Core state is solved. Evaluate this after accepted Play-state transitions, including history navigation that reaches a solved snapshot; navigation still never changes the monotonic `canonicalCommitSequence`. A normal move completion is evaluated at the same settled transition that advances the serial. Freeze the result once; subsequent frames, duplicate notifications, or renders cannot alter it.

At accepted completion:

```text
optimalMoves       = CertifiedChallenge.depth
playerMoves        = currentCanonicalCommitSequence - startCommitSequence
movesOverOptimal   = playerMoves - optimalMoves
efficiencyPercent  = 100 * optimalMoves / playerMoves
solvedOptimally    = playerMoves === optimalMoves
elapsedMs          = completedAtMs - startedAtMs
```

Preserve full numeric precision in the stored result. Presentation may round efficiency to a whole percent and format elapsed time as `MM:SS`, switching to `HH:MM:SS` after an hour rather than wrapping. `playerMoves` must be greater than zero; negative `movesOverOptimal`, zero divisor, non-finite times, or decreasing time are invariant failures, not values to silently clamp or present as normal results. “Solved optimally” is move-count equality and must not imply unaided performance when assisted.

## 9. Assistance semantics

When the existing Solve search starts while a run is ACTIVE, set `assisted = true` in the same accepted app-level action that starts the search. Do not wait for a result, playback, or successful solve. Cancellation, limit, and error outcomes do not clear assistance. It remains true until the run ends; only a fresh run resets it.

An assisted run may still complete and show raw player moves, optimal moves, delta, efficiency, and time. Its result must visibly say **“Assisted run — solution help was used.”** Any optimality copy must be qualified as a move-count result, not a claim that the player independently found an optimal solution.

## 10. Retry / New Challenge lifecycle

**Retry:** Reuse the same immutable `CertifiedChallenge` reference stored in the run: same difficulty, base seed, depth, canonical state, frame, and identity. Do not mutate the certificate, generate candidates, or recertify. On successful baseline reinstallation, record the current `canonicalCommitSequence` as the new `startCommitSequence`, set `assisted = false`, and capture a new monotonic start time; derived `playerMoves` is then zero. M7B composes this domain reset with the existing Play baseline installer. Clear stale solver result/playback and transient move-animation metadata needed for a clean baseline. If installation is refused because Play is not idle, do not partially reset the prior state or start a run; expose a recoverable action state. Replace a previous completed result only after successful Retry installation.

**New Challenge:** Start through the existing generation/certification pipeline only. When the new request is accepted, immediately abandon/reset previous performance before candidate work. A cancelled, exhausted, or failed request does not restore the old stats. Existing board presentation may remain under M6 behavior, but no active M7 run exists until a new certificate is successfully installed.

**Scramble:** Ordinary Scramble retains its existing current-relative behavior and clears accepted Challenge certification. When it establishes the non-challenge baseline, also reset M7 run/result state to INACTIVE so no later move can attach to the old certificate.

## 11. Timer semantics

Use a monotonic browser clock (`performance.now()`) at the UI/orchestration boundary. Inject the numeric time into pure transitions; the run controller and React state updater must not read the clock. Start at successful certified baseline installation and stop when solved completion is accepted. `elapsedMs` is the finite difference between those timestamps.

M7 does not require a continuously ticking UI; the first version may show elapsed time only after completion. If active time is displayed, derive it from the same monotonic start without changing run state or continuously announcing ticks. Treat invalid or decreasing timestamps as invariant/test failures.

## 12. Workspace-switch semantics

Preserve M6 behavior: when idle, PLAY→RESEARCH→PLAY keeps the accepted certificate and active run. There is no PAUSED state; monotonic elapsed time continues during Research and includes that time. Returning to PLAY shows the same move counter and timer basis.

If pausing is desired later, it requires a separate contract with explicit pause/resume and elapsed-time semantics; it is not an implementation-time choice in M7.

## 13. UI/component ownership

Keep `ChallengePanel` focused on generation and certification controls. Add a dedicated `ChallengePerformance`/completion component or an equally clear presentation boundary driven by composed app state. Suggested stable states: NO CHALLENGE, GENERATING, ACTIVE CHALLENGE, COMPLETED CHALLENGE, ASSISTED COMPLETION, and ERROR/CANCELLED.

The completion presentation shows difficulty/seed, player moves, optimal moves, move delta, efficiency, time, and optimal/non-optimal move-count outcome; show the assisted badge whenever applicable. Provide Retry and New Challenge actions. Reuse existing M6 responsive layout, keyboard, focus, and accessible-name conventions. Announce meaningful state changes in a suitable status/live region without announcing a ticking clock. Compact layouts must keep the puzzle and completion actions usable.

## 14. Architecture boundaries

Ownership remains:

```text
challenge.ts
    deterministic candidate construction
        ↓
challenge-controller.ts
    solver-depth certification
        ↓
CertifiedChallenge
        ↓
challenge-run-controller.ts (new app-layer pure controller)
    run lifecycle and performance metrics
        ↓
React presentation (ChallengePanel + ChallengePerformance)
```

Core remains the sole owner of canonical state, move transitions, puzzle validity, and solved-state semantics. M7 must not place canonical puzzle logic or difficulty truth in React. `PlayApplicationState.canonicalCommitSequence` is app-level event metadata incremented with `appendMove()` and preserved by navigation and baseline changes. The run stores the exact accepted immutable certificate reference, start serial, and session metadata; it does not own mutable current puzzle state. History remains the navigation record and is not the scoring source.

The global serial is the replay-safe seam: update it in the same pure `stepPlayAnimation()` return value that appends history. Never perform another state update as a side effect of an updater, including `setApp(prev => { const next = ...; setChallengeRun(...); return next; })`. React may evaluate updater callbacks more than once; derive run move counts from serial values instead of cross-state increment side effects. M7A does not wire run state into React. Keep existing generation/request-token stale-result protections for later integration, and start a run only after certified baseline installation actually succeeds.

## 15. M7A — Challenge Run Domain & Metrics

**Scope:** Add the `PlayApplicationState.canonicalCommitSequence` serial at the `appendMove()` boundary, then implement the pure run-state controller, move-count derivation from start/current sequence, assistance marking, completion snapshot, retry/reset semantics, and focused unit/application integration tests. Do not wire the run into `GearCubeViewport`, `ChallengePanel`, or `SolvePanel`; do not build completion UI in this milestone.

**Acceptance criteria:** Run start records a validated current sequence; direct and fully staged canonical commits advance the global serial once; incomplete stages and history navigation preserve it; both baseline-install operations preserve it; move count is current minus start serial; assistance starts immediately and is monotonic; formulas/invariants and exactly-once completion pass deterministic tests; no React updater side effects are introduced.

**Stop gate:** If the global serial cannot be incremented solely at the existing `appendMove()` boundary and preserved by navigation/baseline transitions without duplicating puzzle transition logic, stop and revise the contract before implementation continues.

## 16. M7B — Completion UX & Retry

**Scope:** Add active/completed Challenge performance presentation, completion card, metric formatting and assistance copy, same-certificate Retry, New Challenge integration, ordinary Scramble reset, and responsive/accessibility behavior.

**Acceptance criteria:** Stable completion content and action availability are tested; assisted results cannot appear unaided; Retry preserves certificate identity/depth/seed/state/frame and resets history/run metadata; New Challenge and Scramble clear prior performance under the defined lifecycle.

**Stop gate:** If Retry cannot reinstall the exact certificate with a fresh baseline under existing application ownership, do not substitute regeneration; return to contract review.

## 17. M7C — Browser Acceptance & Documentation

**Scope:** Full lifecycle production-preview Playwright coverage across Chromium, Firefox, and WebKit; update the maintained verification inventory only after tests actually exist; synchronize `ROADMAP.md`, `SYSTEM_ARCHITECTURE.md`, `TEST_STRATEGY.md`, and any relevant public user documentation to the implemented behavior.

**Acceptance criteria:** Browser tests cover generation, active run, assisted search/playback completion, stable metrics, same-certificate Retry and reset, ordinary Scramble, New Challenge, workspace switching, responsive controls, and accessible stable states. Run the then-current `npm run verify` and `npm run test:e2e`; record exact per-browser counts and failures. Do not make transient real-time assertions or hide flakes by changing expected behavior.

**Stop gate:** Browser-specific state divergence, transient-state-dependent tests, or unexplained test-inventory mismatch blocks M7C acceptance until diagnosed.

## 18. Unit / integration / E2E gates

### Pure controller gates

- `RUN_START_GATE`: successful install starts at zero moves/unassisted with supplied finite time; failed install does not start.
- `COMMITTED_MOVE_COUNT_GATE`: derive player moves as current sequence minus start sequence; the Play serial advances once per completed move, while incomplete stages do not.
- `UNDO_DOES_NOT_ERASE_MOVE_COUNT_GATE`: Undo, Redo, Scrub, and Back to baseline never change score.
- `ASSISTANCE_MARKING_GATE`: Solve-start marks assisted immediately; cancellation/error does not clear it.
- `OPTIMAL_COMPLETION_GATE` and `SUBOPTIMAL_COMPLETION_GATE`: equality and greater-than-optimal counts freeze exact expected fields.
- `EFFICIENCY_GATE`: formula/full precision plus zero-move, negative-delta, and invalid-time invariant cases.
- `COMPLETION_IDEMPOTENCE_GATE`: duplicate completion events cannot mutate the frozen result.
- `RETRY_RESET_GATE`: same certificate identity/depth/seed/state/frame, fresh baseline metadata, new time, zero/unassisted run.
- `SCRAMBLE_RESET_GATE`: ordinary Scramble clears active/completed Challenge performance.

### Application integration gates

Verify the serial does not change for Undo, Redo, Scrub, Back to baseline, challenge install, or scramble install. Cover direct full turns and staged second-half commits, excluding first-half/midpoint/reversal. Verify the existing Play path advances the serial once. Verify successful run start captures the current sequence, while invalid inputs fail; a canonical commit that leaves the settled Core state solved completes once; navigation may expose a solved snapshot but does not change the sequence or refreeze a completed result.

Add at least one no-React integration test using real `PlayApplicationState` and `ChallengeRunState`: install a certified challenge baseline, start at its current sequence, complete a move, Undo, complete another move, and assert the run move count is two even when visible history has one entry. Then drive the real Play transition path to a solved state and assert frozen metrics. Do not simulate every count by assigning arbitrary sequence values.

### Play accounting gates

- `CANONICAL_COMMIT_SEQUENCE_INITIAL_GATE`: initial serial is zero.
- `TWO_STEP_COMMIT_SEQUENCE_GATE` and `DIRECT_COMMIT_SEQUENCE_GATE`: completed canonical turns increment once.
- `HALF_TURN_NO_COMMIT_GATE` and `CANCEL_NO_COMMIT_GATE`: staged half, midpoint, and cancellation do not increment.
- `NAVIGATION_SEQUENCE_STABILITY_GATE`: Undo, Redo, Scrub, and Back to baseline preserve the serial.
- `REDO_BRANCH_MONOTONIC_SEQUENCE_GATE`: a new move after Undo increments globally despite history branch truncation.
- `SCRAMBLE_SEQUENCE_PRESERVATION_GATE`, `CHALLENGE_BASELINE_SEQUENCE_PRESERVATION_GATE`, and `MODE_CHANGE_SEQUENCE_PRESERVATION_GATE`: baseline installs and mode changes preserve it.

### Required combined gate names

Play tests must include `CANONICAL_COMMIT_SEQUENCE_INITIAL_GATE`, `TWO_STEP_COMMIT_SEQUENCE_GATE`, `DIRECT_COMMIT_SEQUENCE_GATE`, `HALF_TURN_NO_COMMIT_GATE`, `CANCEL_NO_COMMIT_GATE`, `NAVIGATION_SEQUENCE_STABILITY_GATE`, `REDO_BRANCH_MONOTONIC_SEQUENCE_GATE`, `SCRAMBLE_SEQUENCE_PRESERVATION_GATE`, `CHALLENGE_BASELINE_SEQUENCE_PRESERVATION_GATE`, and `MODE_CHANGE_SEQUENCE_PRESERVATION_GATE`. Controller tests must include `RUN_START_GATE`, `COMMITTED_MOVE_COUNT_GATE`, `UNDO_DOES_NOT_ERASE_MOVE_COUNT_GATE`, `ASSISTANCE_MARKING_GATE`, `OPTIMAL_COMPLETION_GATE`, `SUBOPTIMAL_COMPLETION_GATE`, `EFFICIENCY_GATE`, `COMPLETION_IDEMPOTENCE_GATE`, `RETRY_RESET_GATE`, and `SCRAMBLE_RESET_GATE`, plus defensive sequence/time/solve-state validation cases.

### Browser E2E gates

Cover challenge generation, visible active run, assistance before solver playback, completion card and metrics after solve, Retry with same certificate identity and reset moves/assistance, ordinary Scramble clearing performance, New Challenge through the existing certification pipeline, workspace-switch semantics, responsive behavior, and accessibility. Use stable observable DOM after actions settle rather than narrow timing windows or transient busy-state races. Run all three configured engines: Chromium, Firefox, and WebKit.

## 19. Failure and stale-state handling

Starting an accepted New Challenge abandons the previous run before generation; cancellation, attempt exhaustion, or error leaves the run INACTIVE and does not restore old statistics. A generation result arriving after cancellation, request replacement, unmount, or stale identity must not install a certificate or start a run. Busy Play/refused certificate installation cannot produce a partial run. Retry failure preserves the prior completed result until successful installation. Scramble clears certificate and run state together. Workspace switching preserves state as specified. Completion is idempotent and frozen. These cases must be separate deterministic tests, not inferred from one broad happy-path test.

## 20. Documentation impacts

This preflight task updates only this plan and the M7 registration in [`ROADMAP.md`](./ROADMAP.md). The current verification inventory remains unchanged because no tests are added here.

During M7C, update `SYSTEM_ARCHITECTURE.md` for app-layer run ownership and commit events, `TEST_STRATEGY.md` and its inventory for tests that actually exist, `ROADMAP.md` with evidence-based milestone status, and relevant public/user documentation for completion and assistance semantics. Do not mark implementation or acceptance before its code and verification evidence are available.

## 21. Explicit non-goals

M7 does not include leaderboards, accounts, cloud persistence, `localStorage` challenge history, daily challenges, shareable challenge URLs, multiplayer, social features, new solver algorithms, neural search, vision, new difficulty bands, Core puzzle mechanic/canonical state/transition algebra changes, a second generation pipeline, or a solution sequence in `CertifiedChallenge`. No deployment, merge, release, dependency upgrade, or persistence work is included.

## 22. Acceptance checklist

The M7 preflight plan is ready when all of the following are true:

- [x] The existing M6 baseline and authoritative difficulty/certificate contracts are accurately identified.
- [x] Scope, user flow, terminology, state transitions, metric formulas, precision, and completion conditions are explicit.
- [x] Move counting derives from the serial updated at the canonical commit boundary; Undo/Redo/Scrub/Back to baseline do not change it.
- [x] `PlayApplicationState.canonicalCommitSequence` advances only with `appendMove()`; both baseline installers preserve it and ChallengeRun derives a local count from its start serial.
- [x] Assistance, Retry, New Challenge, Scramble, timer, and workspace-switch semantics are explicit.
- [x] UI, app-layer ownership, Core boundary, stale/failure handling, and three bounded milestone scopes are defined.
- [x] Pure controller, integration, and cross-browser E2E gates are enumerated.
- [x] Documentation impacts and non-goals are recorded; no test inventory or product code is changed.
- [x] Separate no-edit architecture review below found no unresolved design blocker.
- M7 implementation and acceptance gates remain future work; this preflight does not assert them.

### Preflight architecture review (separate, no-edit)

| Review question | Result |
| --- | --- |
| Canonical truth leakage into UI? | PASS — UI consumes composed application state and Core-derived solved status; it does not own canonical state. |
| History cursor used as move score? | PASS — the run derives moves from `canonicalCommitSequence - startCommitSequence`. |
| Solver solution leakage into `CertifiedChallenge`? | PASS — certified depth remains optimal truth; no solution sequence is added or exposed. |
| Duplicate puzzle state ownership? | PASS — the run retains the exact immutable accepted certificate reference but no mutable current-puzzle state. |
| Ambiguous Undo/Redo scoring? | PASS — navigation does not increment or decrement committed moves. |
| Assisted-run cheating path? | PASS — Solve search start marks assistance before result or playback; completion retains the label. |
| Retry accidentally regenerates? | PASS — Retry reuses the exact accepted certificate and installs a fresh baseline. |
| Timer ambiguity? | PASS — monotonic start at installation, stop at completion, no pause state, Research time included. |
| Workspace-switch ambiguity? | PASS — idle PLAY→RESEARCH preserves the active run and timer basis. |
| Persistence/share/AI scope creep? | PASS — explicitly excluded. |

This is a design review of the documented contract, not an implementation review or acceptance claim. M7A must prove that the serial increments exactly at `appendMove()` and that no React updater side effects are used.
