# M7 Post-Merge Operational Record

> **Document lifecycle:** Historical / As-of
> **Record date:** 2026-09-27
> **Repository:** YI-TING-EE13/GearCube-Lab
> **Milestone:** M7 — Challenge Performance & Completion UX
> **Technical acceptance record:** [M7_ACCEPTANCE_RECORD.md](M7_ACCEPTANCE_RECORD.md)
> **Pull request:** [#14 — feat: add M7 challenge performance and completion UX](https://github.com/YI-TING-EE13/GearCube-Lab/pull/14)

This record preserves the repository-integration, canonical post-merge verification, automatic GitHub Pages promotion, and live-site smoke evidence that followed the M7 technical acceptance record. It is an immutable as-of evidence snapshot; current source, architecture, test, governance, and deployment documents remain authoritative for present behavior.

## 1. Normal Merge

PR #14 was merged through the protected pull-request path using the normal merge-commit method.

| Evidence | Value |
| :--- | :--- |
| Pre-merge base | `1784e2b65c061f3dedac2b9c76857a44bb3ed1cc` |
| Final PR head | `04620fe02476cb07fe9d696a16e3b583061f796b` |
| Actual merge commit | `dc881d624844623f9f5f990cddd5fbedb9b79e68` |
| Merge tree | `35d720e635fd3b902098c85618bc98f47fd0d0dd` |
| Parent 1 | `1784e2b65c061f3dedac2b9c76857a44bb3ed1cc` |
| Parent 2 | `04620fe02476cb07fe9d696a16e3b583061f796b` |

The actual merge tree matched the final synthetic PR qualification merge-ref tree exactly. No squash, rebase, direct `main` push, force push, tag, or release was used.

## 2. Canonical Post-Merge Verify

The merge-created `main` push naturally triggered [Verify #79](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/36259254472), run ID `36259254472`.

| Field | Evidence |
| :--- | :--- |
| Event | `push` |
| Branch | `main` |
| Head SHA | `dc881d624844623f9f5f990cddd5fbedb9b79e68` |
| Attempt | 1 |
| Overall result | PASS |
| TypeScript | PASS |
| Core purity gate | PASS |
| Vitest | 44/44 files, 540/540 tests |
| Production build | PASS |
| Chromium | 65 passed |
| Firefox | 64 passed, 1 pre-existing intentional non-M7 touch skip |
| WebKit | 64 passed, 1 pre-existing intentional non-M7 touch skip |
| M7-specific skips | 0 |

All seven M7 lifecycle gates passed again in Chromium, Firefox, and WebKit: active move accounting, assisted completion, same-certificate Retry, New Challenge chronology, Scramble reset, workspace preservation, and responsive completion.

## 3. Automatic Pages Promotion

Successful Verify #79 naturally triggered [Deploy GitHub Pages #52](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/36259850820), run ID `36259850820`.

The deployment workflow recorded:

- source Verify SHA: `dc881d624844623f9f5f990cddd5fbedb9b79e68`;
- current remote `main`: the same SHA;
- exact-current-main gate: PASS;
- Pages base path: `/GearCube-Lab/`;
- build: PASS;
- Pages artifact upload: PASS;
- deploy: PASS;
- `pages_build_version`: `dc881d624844623f9f5f990cddd5fbedb9b79e68`;
- canonical URL: https://yi-ting-ee13.github.io/GearCube-Lab/.

The promotion was automatic; no manual deployment dispatch was used.

## 4. Live Production Smoke

A read-only browser smoke was performed after the Pages deployment.

| Gate | Result |
| :--- | :--- |
| HTML | PASS — HTTP 200 |
| Current JS asset | PASS — `/GearCube-Lab/assets/index-VOBkeLFd.js`, HTTP 200 |
| Current CSS asset | PASS — `/GearCube-Lab/assets/index-BQZgGZ9k.css`, HTTP 200 |
| Browser page errors | 0 |
| Browser console errors | 0 |
| Easy Challenge certification | PASS — accepted at optimal distance 4 |
| Challenge Performance | PASS — active, Your moves 0, Optimal moves 4 |
| Compact 390×844 drawer/reachability | PASS |
| Horizontal document overflow | none observed |

A non-fatal `THREE.Clock` deprecation warning was observed. It did not produce a page error or console error.

## 5. Residual Maintenance Observations

The following are non-blocking and do not invalidate M7 acceptance or deployment:

- Vite reports the existing main-bundle >500 kB advisory.
- `THREE.Clock` emits a non-fatal deprecation warning in the live browser.
- M7 did not repeat an artificial Pages concurrency-race stress scenario. The M6.2 exact-SHA and eligibility-safe concurrency contract remains the governing deployment protection.
- The known local Windows Playwright runner / `webServer` teardown behavior remains separate from hosted qualification.
- No tag or release was created for M7.

## 6. Final Status

```text
M7_TECHNICAL_ACCEPTANCE: PASS
M7_FUNCTIONAL_ACCEPTANCE: PASS
M7_PR_INTEGRATION: PASS
M7_POST_MERGE_VERIFY: PASS
M7_PAGES_PROMOTION: PASS
M7_LIVE_SMOKE: PASS
M7_FINAL_STATUS: ACCEPTED_AND_DEPLOYED
```

The accepted M7 implementation is integrated into `main` and present in the verified public Pages artifact at the recorded merge SHA.
