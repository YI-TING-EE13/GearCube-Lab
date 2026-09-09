# M6.2 — Rerun-Safe GitHub Pages Promotion

> **Document Status:** `IMPLEMENTATION PLAN / CURRENT`
> **Scope:** CI and GitHub Pages deployment governance only; no product behavior.

## Incident

Verify run `34361931058` qualified the merged M6/M6.1 main SHA `1b5c012751c9a678b7e3e5d8973fd48f922a09b9` after a hosted WebKit dependency-install timeout on attempt 1. Attempt 2 completed successfully, but Pages run `34379936124` skipped its build and deploy jobs because the deployment predicate required `github.event.workflow_run.run_attempt == 1`.

## Root cause

The first three deployment conditions were valid: the source Verify run must be successful, originate from `main`, and use the `push` event. The attempt-number condition rejected a successful rerun even though the rerun retained the same verified `head_sha`.

## Required promotion contract

The Pages build MAY run only when all of these conditions hold:

- the source Verify workflow concluded successfully;
- the source branch is `main`;
- the source event is `push`; and
- the verified `head_sha` is still the current remote `refs/heads/main` SHA.

The deployment workflow MUST NOT use `run_attempt` or another attempt-number restriction. A successful current-main rerun may redeploy the same content. A successful rerun for an old SHA must fail the stale-main check.

## Preserved stale-main gate

The workflow continues to check out `github.event.workflow_run.head_sha` and compare it with `git ls-remote origin refs/heads/main`. A mismatch terminates the build before dependency installation or Pages artifact creation. This gate prevents an old successful Verify run from promoting stale content after `main` advances.

## Verification plan

1. Run the focused `Pages Promotion Governance Gate` in `tests/boundary.test.ts` to verify the structural contract.
2. Run `git diff --check` and `npm run verify` in the supported Node.js 22 environment.
3. Qualify the exact pull-request head with `verify`, `e2e (chromium)`, `e2e (firefox)`, and `e2e (webkit)`.
4. Record static contract evidence as `STATIC_CONTRACT_VERIFIED`. Hosted rerun promotion remains `HOSTED_OPERATIONAL_BEHAVIOR_PENDING` until an independently authorized post-merge sequence observes it.

## Operational post-merge acceptance

After independent review and merge authorization:

1. Merge the pull request normally into `main`.
2. Require the new `main` push Verify run to pass all four required jobs.
3. Confirm the Pages workflow builds and deploys the exact current `main` SHA.
4. If the same Verify run is rerun, confirm the successful later attempt remains eligible for Pages and passes the exact-current-main check.
5. If `main` advances before an older Pages build checks the remote ref, require the stale-main check to fail and prevent deployment.

Manual Pages deployment, a no-op commit, direct main push, and workflow timeout changes are outside this plan.
