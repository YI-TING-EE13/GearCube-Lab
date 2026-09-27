# M7 — Post-Merge Operational Record

> **Document lifecycle:** HISTORICAL / AS-OF
> **Closeout date:** 2026-09-27
> **Repository:** YI-TING-EE13/GearCube-Lab
> **Pull request:** [#14 — feat: add M7 challenge performance and completion UX](https://github.com/YI-TING-EE13/GearCube-Lab/pull/14)

This record preserves the repository-integration, canonical post-merge verification, GitHub Pages promotion, and live smoke evidence for M7. The source tree and active operations documents remain authoritative for current behavior and deployment policy.

## Merge Evidence

- Pre-merge base: `1784e2b65c061f3dedac2b9c76857a44bb3ed1cc`
- Final PR head: `04620fe02476cb07fe9d696a16e3b583061f796b`
- Merge method: normal merge commit
- Actual merge SHA: `dc881d624844623f9f5f990cddd5fbedb9b79e68`
- Actual merge tree: `35d720e635fd3b902098c85618bc98f47fd0d0dd`
- Parent 1: `1784e2b65c061f3dedac2b9c76857a44bb3ed1cc`
- Parent 2: `04620fe02476cb07fe9d696a16e3b583061f796b`
- Synthetic PR qualification merge ref: `4f6b6b83bd8e0cbbd8f4c7c6a7f254c41da2a558`
- Synthetic and actual merge trees: identical

## Canonical Post-Merge Verify

[Verify #79](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/36259254472) ran from the natural `main` push, attempt 1, exact head `dc881d624844623f9f5f990cddd5fbedb9b79e68`.

| Job | Result |
| :--- | :--- |
| `verify` | PASS — TypeScript, Core purity, 44 / 44 Vitest files, 540 / 540 tests, production build |
| `e2e (chromium)` | PASS — 65 passed |
| `e2e (firefox)` | PASS — 64 passed, 1 existing intentional Chromium-only touch skip |
| `e2e (webkit)` | PASS — 64 passed, 1 existing intentional Chromium-only touch skip |

All seven M7 lifecycle gates passed in all three browser projects. M7-specific skips: 0.

## GitHub Pages Promotion

[Deploy GitHub Pages #52](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/36259850820) was created naturally from successful Verify #79.

- Source Verify SHA: `dc881d624844623f9f5f990cddd5fbedb9b79e68`
- Current remote `main` observed by the stale-main gate: same SHA
- Exact-SHA gate: PASS
- Effective Pages base: `/GearCube-Lab/`
- Build: PASS
- Artifact upload: PASS
- Deploy: PASS
- Deployment URL: https://yi-ting-ee13.github.io/GearCube-Lab/
- `pages_build_version`: `dc881d624844623f9f5f990cddd5fbedb9b79e68`

## Live Smoke

The deployed site returned HTTP 200. The current generated JavaScript and CSS assets returned HTTP 200. Browser smoke recorded zero page errors and zero console errors.

The public M7 flow was exercised through normal controls:

1. Certified Challenge controls were reachable.
2. Easy challenge certification succeeded.
3. Challenge Performance appeared.
4. `Challenge in progress` was visible.
5. `Your moves` was 0.
6. `Optimal moves` was visible.
7. At 390×844, the Play controls drawer and Challenge/Performance controls remained reachable with no horizontal overflow.

## Non-Blocking Observations

- Vite continues to report the existing main-bundle size advisory (>500 kB).
- Three.js continues to emit the upstream `THREE.Clock` deprecation warning.
- This closeout did not perform a dedicated Pages concurrency-race stress test; existing M6.2 deployment governance remains the authoritative concurrency contract.

## Final Status

```text
M7_MERGE: PASS
M7_POST_MERGE_VERIFY: PASS
M7_PAGES_PROMOTION: PASS
M7_LIVE_SMOKE: PASS
M7_FINAL_STATUS: ACCEPTED_AND_DEPLOYED
```
