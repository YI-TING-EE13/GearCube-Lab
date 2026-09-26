# M7 Technical Acceptance Record

> **Document lifecycle:** Historical / As-of
> **Acceptance date:** 2026-09-27
> **Repository:** YI-TING-EE13/GearCube-Lab
> **Pull request:** [#14 — feat: add M7 challenge performance and completion UX](https://github.com/YI-TING-EE13/GearCube-Lab/pull/14)

This record preserves M7 technical acceptance and PR qualification evidence. The source tree remains authoritative for behavior. Merge, post-merge `main` qualification, and Pages promotion are separate repository/operations evidence and are not claimed by this record.

## 1. Scope

M7 delivered Challenge performance and completion behavior in three submilestones:

- **M7A — Challenge Run Domain & Metrics:** application-layer run state, replay-safe committed-move accounting, assistance tracking, and completion metrics.
- **M7B — Completion UX & Retry:** completion presentation, frozen results, same-certificate Retry, and certified New Challenge lifecycle.
- **M7C — Cross-Browser Acceptance & Documentation Sync:** seven lifecycle gates across Chromium, Firefox, and WebKit, plus synchronized architecture, roadmap, test inventory, governance, deployment, and public documentation.
- **Desktop Challenge / Face Controls collision repair:** bounded the Challenge stack and kept its actions reachable without bypassing normal hit testing.
- **Documentation/governance closeout:** recorded the accepted behavior and qualification evidence without changing product behavior.

M7 does not add leaderboards, persistent personal bests or Challenge history, Daily Challenge, share URLs, accounts, new solver algorithms, neural search, vision, or Core puzzle-rule changes.

## 2. Architectural Contract

The accepted implementation preserves these invariants:

- Core remains the canonical authority for puzzle state, legal transitions, and solved-state meaning.
- `PlayApplicationState.canonicalCommitSequence` is monotonic application commit metadata. A canonical move commit advances the sequence.
- History records navigation. Undo, Redo, Scrub, and baseline navigation do not define Challenge score.
- `CertifiedChallenge.depth` is the optimal-move truth.
- `ChallengeRunState` stores the accepted certificate and session metadata only; it does not own mutable puzzle state.
- Starting Solve marks an `ACTIVE` run assisted when search begins.
- Completion requires an `ACTIVE` run, settled/`IDLE` Play state, and a Core-solved state.
- A completion result freezes once; subsequent navigation does not rewrite it.
- Retry reinstalls the exact same accepted certificate and starts a fresh run.
- New Challenge abandons the prior run before using the existing generation and certification pipeline.
- An ordinary Scramble clears the accepted certificate and Challenge performance.
- `PLAY → RESEARCH → PLAY` preserves an active run.

See [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md), [Test Strategy](TEST_STRATEGY.md), and the [M7 implementation contract](M7_CHALLENGE_PERFORMANCE_IMPLEMENTATION_PLAN.md) for maintained details.

## 3. Accepted Candidate Chain

The accepted branch was based on `main` at `1784e2b65c061f3dedac2b9c76857a44bb3ed1cc` and contained this linear candidate chain:

| Role | Commit | Message |
|---|---|---|
| Contract | `d857c174ed40b0b823eecbcea915f322adc7dfa2` | `docs: define M7 challenge performance contracts` |
| Contract refinement | `7a9d1c331813dcf971a5738f489e29468281085c` | `docs: refine M7 replay-safe accounting contract` |
| M7A implementation | `7470c3452f7e245b4c11777f15cbff6fc630891c` | `feat: add challenge run performance domain` |
| M7B implementation | `2d2b1e165e7271536020ebd741bbfecde9ae7dea` | `feat: add challenge completion experience` |
| M7C acceptance tests | `67a08ed1677891b1cef7cdfc01d60b7a21727bed` | `test: add M7 challenge lifecycle acceptance` |
| Accepted implementation candidate | `c7960f60b375e9807624f29b6102e5d9a3868844` | `fix: keep challenge actions clear of face controls` |
| Pre-record PR-qualified head | `d5a04e41be7dffd1ca73d698bc2fe2b7cae5cc29` | `docs: close out M7 technical acceptance` |

The accepted implementation candidate is `c7960f60b375e9807624f29b6102e5d9a3868844`. The PR head qualified before this record was `d5a04e41be7dffd1ca73d698bc2fe2b7cae5cc29`; it added the documentation closeout commit to the accepted candidate.

## 4. Independent Review

The accepted M7 review evidence records `PASS` for each area below. This table records outcomes and does not attribute the review to an external reviewer.

| Review area | Result |
|---|---|
| M7A domain review | PASS |
| Move-accounting review | PASS |
| Completion-invariant review | PASS |
| React replay-safety review | PASS |
| Assistance review | PASS |
| Retry-identity review | PASS |
| New Challenge lifecycle review | PASS |
| Scramble-reset review | PASS |
| Responsive UX review | PASS |
| Collision-repair review | PASS |
| Documentation-governance review | PASS |
| M7 final technical review | PASS |

## 5. Hosted Technical Qualification

Hosted [Verify #76](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/36252841676) qualified the exact accepted implementation candidate:

| Field | Value |
|---|---|
| Workflow | `Verify` |
| Run number / ID | `#76` / `36252841676` |
| Event / attempt | `workflow_dispatch` / `1` |
| Exact head | `c7960f60b375e9807624f29b6102e5d9a3868844` |
| Conclusion | SUCCESS |

| Job | Result |
|---|---|
| `verify` | PASS — TypeScript, Core purity, 44/44 Vitest files, 540/540 tests, and production build |
| Chromium | PASS — 65 passed |
| Firefox | PASS — 64 passed, 1 existing intentional skip |
| WebKit | PASS — 64 passed, 1 existing intentional skip |

All seven M7 lifecycle gates passed in Chromium, Firefox, and WebKit:

- `M7_ACTIVE_MOVE_ACCOUNTING_GATE`
- `M7_ASSISTED_COMPLETION_GATE`
- `M7_RETRY_SAME_CERTIFICATE_GATE`
- `M7_NEW_CHALLENGE_GATE`
- `M7_SCRAMBLE_RESET_GATE`
- `M7_WORKSPACE_PRESERVATION_GATE`
- `M7_RESPONSIVE_COMPLETION_GATE`

## 6. Defect Discovery and Bounded Repair

The initial M7C hosted candidate `67a08ed1677891b1cef7cdfc01d60b7a21727bed` failed hosted [Verify #75](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/36242261789), run ID `36242261789`. The `verify` job passed, but the E2E jobs failed in Chromium, Firefox, and WebKit on:

- `M7_RETRY_SAME_CERTIFICATE_GATE`
- `M7_NEW_CHALLENGE_GATE`

Playwright's normal `locator.click()` timed out after 60 seconds because elements in the Face Controls `.move-controls-overlay` intercepted pointer events over Challenge Performance actions. The Challenge panel and Face Controls physically overlapped at desktop sizes.

Commit `c7960f60b375e9807624f29b6102e5d9a3868844` bounded the desktop Challenge stack to the available viewport and made that stack the desktop scroll container. Rendered-geometry checks verify separation from Face Controls, and trial clicks verify that normal hit testing reaches the actions. The repair did not use forced clicks, DOM clicks, pointer-event bypass, a z-index-only bypass, browser skips, timeout relaxation, or domain-logic changes.

Verify #76 passed the complete browser matrix after the repair.

## 7. PR Qualification

PR [#14](https://github.com/YI-TING-EE13/GearCube-Lab/pull/14) was qualified by hosted [Verify #77](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/36255773958):

| Field | Value |
|---|---|
| Workflow | `Verify` |
| Run number / ID | `#77` / `36255773958` |
| Event / attempt | `pull_request` / `1` |
| PR base | `main` at `1784e2b65c061f3dedac2b9c76857a44bb3ed1cc` |
| PR head | `d5a04e41be7dffd1ca73d698bc2fe2b7cae5cc29` |
| Qualified checkout object | Synthetic PR merge ref `ec68a2fe8fb54dcdb311818da04003b6e033cae0` |
| Conclusion | SUCCESS |

The Verify and all three E2E jobs checked out `refs/remotes/pull/14/merge`. The merge object parents were exactly the recorded `main` base and PR head:

| Parent | SHA |
|---|---|
| Base | `1784e2b65c061f3dedac2b9c76857a44bb3ed1cc` |
| PR head | `d5a04e41be7dffd1ca73d698bc2fe2b7cae5cc29` |

All four required checks passed:

| Required check | Result |
|---|---|
| `verify` | PASS — 44 Vitest files, 540 tests, production build |
| `e2e (chromium)` | PASS — 65 passed |
| `e2e (firefox)` | PASS — 64 passed, 1 intentional existing touch-gate skip |
| `e2e (webkit)` | PASS — 64 passed, 1 intentional existing touch-gate skip |

`ec68a2fe8fb54dcdb311818da04003b6e033cae0` is a synthetic PR qualification merge object. It is not a final `main` merge commit. Verify #77 qualifies the recorded PR head against the recorded base; it does not claim repository integration or deployment.

## 8. Verification Inventory

The maintained test inventory is:

| Suite | Inventory |
|---|---|
| Vitest | 44 files / 540 tests |
| Playwright | 65 logical tests |
| Browser-project matrix | 195 project-test cases |
| Applicable Playwright executions | 193 |
| Existing intentional skips | 2 — the Chromium-only touch-emulation gate is skipped in Firefox and WebKit |
| M7 lifecycle gates | 7 logical tests, each passing in Chromium, Firefox, and WebKit |
| M7-specific skips | 0 |

Inventory totals describe discovery and applicability; Verify #76 and #77 provide the separate pass evidence recorded above.

## 9. Limitations

- Playwright WebKit qualification is not native Safari qualification.
- No physical-device qualification is implied.
- No direct screen-reader acceptance is implied.
- The known local Windows Playwright runner / `webServer` teardown behavior is separate from hosted qualification.
- No release or tag is implied.
- Persistent Challenge statistics are not implemented.
- This record does not claim a `main` merge, post-merge Verify, or Pages deployment.

## 10. Acceptance Status

```text
M7_TECHNICAL_ACCEPTANCE: PASS
M7_PR_QUALIFICATION: PASS
M7_FUNCTIONAL_ACCEPTANCE: PASS
M7_MILESTONE_STATUS: COMPLETED_AND_ACCEPTED

MAIN_MERGE_EVIDENCE: NOT_PART_OF_THIS_RECORD
POST_MERGE_VERIFY_EVIDENCE: NOT_PART_OF_THIS_RECORD
PAGES_DEPLOYMENT_EVIDENCE: NOT_PART_OF_THIS_RECORD
```
