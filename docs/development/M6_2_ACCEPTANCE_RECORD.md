# M6.2 — Rerun-Safe GitHub Pages Promotion Acceptance Record

> **Document lifecycle:** `HISTORICAL / AS-OF`
> **Acceptance date:** `2026-09-10`
> **Repository:** `YI-TING-EE13/GearCube-Lab`
> **PR:** [#9](https://github.com/YI-TING-EE13/GearCube-Lab/pull/9)
> **Accepted main commit:** `5e79b3ce6684cd0937b93f9fd92cb79801656007`
> **Accepted tree:** `9200cea577e53b333ced7bb2afe119fc544fdab3`
> **Current operating authority:** [`REPOSITORY_GOVERNANCE.md`](../operations/REPOSITORY_GOVERNANCE.md) and [`DEPLOYMENT.md`](../operations/DEPLOYMENT.md)

This record preserves the independent review, hosted qualification, merge, post-merge promotion, and live smoke evidence for M6.2. The source tree and current operations documents remain authoritative for implementation and deployment behavior. This historical record does not introduce a new runtime contract.

## Accepted Scope

M6.2 covered a narrowly bounded GitHub Pages promotion repair:

- A successful current-main `Verify` rerun may remain eligible for Pages promotion.
- Pages promotion still requires a successful source Verify run from `main` with source event `push`.
- Pages checks out the exact verified `workflow_run.head_sha` and compares that SHA with the current remote `main` SHA before dependency installation or artifact creation.
- Hosted Playwright dependency installation removes only unrelated APT source files containing `dl.google.com/linux/chrome` immediately before `npx playwright install --with-deps`.

Product behavior, Playwright coverage, timeouts, dependencies, and the operational governance contract were not otherwise changed by M6.2.

## Problem / Root Cause

Verify run `34361931058` experienced a hosted WebKit dependency-install timeout on attempt 1. Attempt 2 completed successfully, but Pages run `34379936124` skipped its build and deploy jobs because the deployment predicate required `github.event.workflow_run.run_attempt == 1`.

The source-success, `main`-branch, and `push`-event conditions were valid. The attempt-number condition incorrectly rejected a successful rerun even though the rerun retained the same verified `head_sha`.

## Implemented Contract

The Pages build may run only when all of these conditions hold:

- the source Verify workflow concluded successfully;
- the source branch is `main`;
- the source event is `push`; and
- the verified `head_sha` is still the current remote `refs/heads/main` SHA.

The deployment workflow does not use `run_attempt` as a qualification condition. A successful current-main rerun may redeploy the same content. A successful rerun for an old SHA remains blocked by the stale-main check.

## CI Infrastructure Incident and Bounded Repair

PR qualification run `34383271678` encountered an external Google Chrome Ubuntu APT repository integrity failure on attempts 1 and 2. The failure occurred during `npx playwright install --with-deps` before any Playwright E2E test executed:

```text
Hash Sum mismatch
Expected SHA256: 233e56de019b57db89238fa7bcc3647718dbbea3a40c2dc1c633a8c8952aa9e9
Received SHA256: bc1428ab27c6d76ee9bb76de07f1ded0ddb4aaabd958fc72855634ef5894a4b3
```

The failure was hosted APT infrastructure, not a product defect. The later bounded CI repair removed only APT source files containing `dl.google.com/linux/chrome` immediately before Playwright dependency installation. The `--with-deps` command, browser matrix, E2E execution, and timeouts remained intact.

## PR Qualification

The independently accepted candidate was:

- **Branch:** `maintenance/m6-2-rerun-safe-pages-promotion`
- **Base:** `1b5c012751c9a678b7e3e5d8973fd48f922a09b9`
- **Head:** `e4ee1d867c526f7a60ed261dab6523f12565bfc9`
- **Tree:** `9200cea577e53b333ced7bb2afe119fc544fdab3`

Verify run [34387969879](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/34387969879) completed on `pull_request`, attempt 1, with the exact candidate head:

| Job | Job ID | Result |
| :--- | ---: | :--- |
| `verify` | `102588944323` | PASS |
| `e2e (chromium)` | `102589397363` | PASS — 53 passed |
| `e2e (firefox)` | `102589397452` | PASS — 52 passed, 1 intentional skip |
| `e2e (webkit)` | `102589397497` | PASS — 52 passed, 1 intentional skip |

## Merge Evidence

PR #9 merged through the normal pull-request merge path without bypass. The merge commit is:

```text
commit: 5e79b3ce6684cd0937b93f9fd92cb79801656007
tree:   9200cea577e53b333ced7bb2afe119fc544fdab3
parent: 1b5c012751c9a678b7e3e5d8973fd48f922a09b9
parent: e4ee1d867c526f7a60ed261dab6523f12565bfc9
```

No direct `main` push was used.

## Post-Merge Verify

Verify run [34430949882](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/34430949882) qualified the merge on event `push`, branch `main`, and head SHA `5e79b3ce6684cd0937b93f9fd92cb79801656007`.

Attempt 1 passed all four required jobs:

| Job | Job ID | Result |
| :--- | ---: | :--- |
| `verify` | `102726161893` | PASS |
| `e2e (chromium)` | `102726433980` | PASS — 53 passed |
| `e2e (firefox)` | `102726434025` | PASS — 52 passed, 1 intentional skip |
| `e2e (webkit)` | `102726434013` | PASS — 52 passed, 1 intentional skip |

Attempt 2 retained the same event, branch, and head SHA and also passed:

| Job | Job ID | Result |
| :--- | ---: | :--- |
| `verify` | `102728211863` | PASS |
| `e2e (chromium)` | `102728520222` | PASS — 53 passed |
| `e2e (firefox)` | `102728520247` | PASS — 52 passed, 1 intentional skip |
| `e2e (webkit)` | `102728520185` | PASS — 52 passed, 1 intentional skip |

The browser jobs completed their APT-source isolation, Playwright installation, and browser E2E steps successfully. The dependent browser jobs ran because the browser matrix requires the rerun Verify job; the rerun remained within the same GitHub Actions run and exact SHA.

## Initial Pages Promotion

Pages run [34431507766](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/34431507766) was created from the successful post-merge `push` Verify run. Build and deploy both executed successfully:

| Job | Job ID | Result |
| :--- | ---: | :--- |
| `build` | `102727805460` | PASS |
| `deploy` | `102727869204` | PASS |

The build checked out `5e79b3ce6684cd0937b93f9fd92cb79801656007`. Its exact-current-main gate compared that expected SHA with the same current remote `main` SHA. `npm ci`, the `/GearCube-Lab/` Vite build, Pages artifact upload, and deployment completed successfully.

## Rerun-Safe Operational Proof

The later attempt 2 of Verify run `34430949882` retained:

```text
event       = push
head_branch = main
head_sha    = 5e79b3ce6684cd0937b93f9fd92cb79801656007
conclusion  = success
run_attempt = 2
```

Pages run [34432477464](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/34432477464) then built and deployed rather than skipping its jobs:

| Job | Job ID | Result |
| :--- | ---: | :--- |
| `build` | `102730695013` | PASS |
| `deploy` | `102730763586` | PASS |

The rerun build checked out the exact verified SHA, passed the exact-current-main gate, ran `npm ci`, built with Vite base `/GearCube-Lab/`, and uploaded the Pages artifact. The deploy job created a Pages deployment with `pages_build_version` set to `5e79b3ce6684cd0937b93f9fd92cb79801656007` and reported success.

This positive current-main path operationally verifies that a successful main-push Verify rerun remains Pages-eligible. No artificial stale-SHA scenario was created.

## Stale-Main Safety

The exact-current-main comparison passed on both Pages builds because the verified SHA and current remote `main` SHA were equal. The mismatch branch remains structurally protected by the accepted deployment gate and would terminate a stale build before dependency installation or artifact creation. This record does not claim an intentionally manufactured stale-SHA rejection test.

## Live Smoke

The canonical public site is [https://yi-ting-ee13.github.io/GearCube-Lab/](https://yi-ting-ee13.github.io/GearCube-Lab/).

The live smoke check confirmed:

- the HTML page returned HTTP 200;
- the discovered JavaScript, CSS, and SVG favicon assets returned HTTP 200;
- Playwright loaded the page and rendered the Play controls with zero console errors;
- one scramble interaction changed the cube state to `Unsolved`.

The smoke check covered a hosted browser page, not native Safari, iOS, a physical device, or a new Android qualification.

## Known Non-Blocking Observation

The browser smoke recorded one existing upstream warning:

```text
THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.
```

The warning is non-blocking and outside the M6.2 scope. No product or dependency repair is claimed here.

## Final Acceptance

```text
M6_2_OPERATIONAL_ACCEPTANCE: PASS
M6_2_FINAL_STATUS: COMPLETED_AND_ACCEPTED
PAGES_RERUN_SAFE_PROMOTION: OPERATIONALLY_VERIFIED
```

M6.2 does not activate Phase 6 or Phase 7. The deferred optional research and physical-model tracks remain deferred.
