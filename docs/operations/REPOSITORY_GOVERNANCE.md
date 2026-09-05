# Repository Governance — Main Branch Contract

> **Document Status:** `ACTIVE / CURRENT`
> **Scope:** Contribution qualification, main-branch protection, and the hand-off to Pages deployment.

This document records the current operating contract for changes to `main`. It is a concise companion to [`AGENTS.md`](../../AGENTS.md), the verification workflows, and the deployment runbook. Historical acceptance records preserve their original evidence and are not rewritten to represent this current contract.

## Source of truth

The active contract is defined by these sources together:

- The live GitHub ruleset **Protect main**, currently active for `refs/heads/main` (ruleset ID `22288774` at the time of this audit).
- [`verify.yml`](../../.github/workflows/verify.yml), which defines the verification workflow and job names.
- [`deploy-pages.yml`](../../.github/workflows/deploy-pages.yml), which defines the downstream deployment gate.
- [`DEPLOYMENT.md`](DEPLOYMENT.md), which records the deployment architecture and exact-SHA safeguards.
- [`TEST_STRATEGY.md`](../development/TEST_STRATEGY.md), which owns the maintained test inventory and qualification boundaries.

The numeric ruleset ID is an audit reference, not a substitute for inspecting the live ruleset. Re-audit this page if the protected ref, required checks, workflow names, deployment conditions, or test inventory changes.

## Normal contribution path

The normal path is:

1. Create a focused topic or maintenance branch from the current `main`.
2. Open a pull request targeting `main`.
3. Qualify the exact pull-request head with the four required `Verify` checks.
4. Obtain independent technical acceptance, then use the normal protected pull-request merge path.
5. The resulting `main` push starts a new canonical `Verify` run. Pull-request qualification does not replace this post-merge qualification.
6. A successful, first-attempt `main` push Verify run may be consumed by the `workflow_run`-based Pages deployment workflow.

Direct pushes, administrative bypasses, routine ruleset bypasses, and disabling protection are not normal contribution methods.

## Protect main contract

The active ruleset currently enforces:

| Control | Current contract |
| --- | --- |
| Protected ref | `refs/heads/main` |
| Enforcement | Active ruleset named `Protect main` |
| History safety | Deletion protection and non-fast-forward protection enabled |
| Pull request | Required before updating `main` |
| Approvals | `0` required approvals; this is deliberate for the solo maintainer, not a claim that review or acceptance is unnecessary |
| CODEOWNERS | No CODEOWNERS approval required |
| Review threads | No required review-thread resolution |
| Required statuses | Exactly the four contexts listed below |
| Strict status policy | `false`; the four contexts remain required, but the branch need not be updated to the latest base solely through strict status policy |
| Owner bypass | Exceptional `pull_request`-only bypass capability; not the normal path |

The ruleset protects deletion and non-fast-forward history changes. It does not, by those controls alone, require signed commits or a linear history.

## Required-check name invariant

These visible check names are a governance contract and must remain synchronized with both `verify.yml` and the live ruleset:

```text
verify
e2e (chromium)
e2e (firefox)
e2e (webkit)
```

A check rename requires ruleset and documentation reconciliation. A stale required context can block otherwise valid pull requests; an unreviewed new context can leave an expected gate outside the required contract. The `workflow_run` Pages deployment is intentionally not one of these pre-merge required checks, because making deployment a prerequisite for the Verify run would create a circular dependency.

## Approval and bypass policy

Zero required approvals reflects the repository's solo-maintainer operating model. Independent technical acceptance remains expected for a candidate before merge, including confirmation of scope, exact-head qualification, and relevant deployment or post-merge evidence.

The owner bypass is limited to `pull_request` mode and is an exceptional recovery or governance action. This contract does not recommend direct pushes, administrator bypasses, routine bypass use, or disabling the ruleset. No bypass is part of the accepted M3B or benchmark-stability repair path.

## Deployment-cycle invariant

The contribution and deployment cycle is:

```text
topic/maintenance branch
        ↓
pull request → four required Verify checks → normal PR merge
        ↓
main push → Verify (attempt 1)
        ↓
workflow_run Pages deployment
```

The Pages workflow may proceed only when the source Verify run is successful, its source branch is `main`, its event is `push`, and its `run_attempt` is `1`. It checks out the exact verified SHA, confirms that `origin/main` has not advanced, configures the `/GearCube-Lab/` Pages base, builds the site, uploads the Pages artifact, and deploys it. The deployment workflow is downstream evidence; it is not a pre-merge required check.

## Post-merge qualification contract

Pull-request checks qualify the proposed exact head. After a normal merge, the new merge commit must receive a separate canonical `Verify` run for `main` with event `push`, attempt `1`, and successful results for:

- `verify`
- `e2e (chromium)`
- `e2e (firefox)`
- `e2e (webkit)`

Only that canonical main-run evidence can satisfy the source gate for automatic Pages deployment. A rerun or a pull-request run is not interchangeable with the first-attempt main push run required by the deployment contract.

## Current verification baseline

The maintained automated inventory is:

| Suite | Current inventory |
| --- | --- |
| Vitest | 35 test files / 444 tests |
| Playwright | 50 logical tests across Chromium, Firefox, and WebKit |
| Playwright project cases | 150 total: 50 Chromium, 49 Firefox applicable plus 1 intentional skip, and 49 WebKit applicable plus 1 intentional skip |
| Applicable Playwright executions | 148 |
| Intentional skips | 2 total, one in Firefox and one in WebKit, because the touch-emulation gate is Chromium-only |

These are inventory counts, not a claim that every listed case passed in every run. Exact qualification evidence belongs to the corresponding `Verify` workflow run for the tested commit, including all four jobs.

## Qualification boundaries

- Playwright WebKit coverage is not native Safari qualification; native Safari has not been separately verified.
- Browser viewport and touch emulation do not constitute real mobile or tablet hardware qualification; real-device testing has not been performed.
- The automated baseline does not by itself establish production-ready, stable-release, or `v1` status.
- This governance contract does not create a tag or release. Release state remains governed separately.

## Related maintained documents

- [`AGENTS.md`](../../AGENTS.md) — repository-wide contribution and agent instructions.
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — Pages architecture, deployment gates, and current browser inventory.
- [`TEST_STRATEGY.md`](../development/TEST_STRATEGY.md) — test levels, inventory, and qualification boundaries.
- [`DEVELOPMENT_GUIDE.md`](../development/DEVELOPMENT_GUIDE.md) — development commands and task discipline.
