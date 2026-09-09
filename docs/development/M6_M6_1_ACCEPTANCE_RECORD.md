# M6 + M6.1 Acceptance Record

> **Document lifecycle:** `HISTORICAL / AS-OF`
> **Acceptance date:** `2026-09-09`
> **Repository:** `YI-TING-EE13/GearCube-Lab`
> **PR:** [#8](https://github.com/YI-TING-EE13/GearCube-Lab/pull/8)

This record preserves the independent review and hosted qualification evidence for the accepted M6 and M6.1 implementation candidate. The source tree remains authoritative for behavior; this record does not introduce a new runtime contract.

## Scope

- M6 orientation and rotation guidance.
- Certified Challenge generation.
- The M6.1 four-algorithm classical solver portfolio.
- A* and shared H2 integration.
- The bounded CSS overlay repair that keeps the expanded guidance panel clear of the desktop timeline.

## Accepted Candidate

- Feature branch: `feature/m6-play-orientation-certified-challenge`.
- Pre-closeout implementation head: `4338ad350ede53dafb4c628d6b5350b3be7da80c`.
- Base: `659c18f3cf93d49eafdd5ea279054a4188332f7d`.
- PR: [#8](https://github.com/YI-TING-EE13/GearCube-Lab/pull/8).

## Independent Review

The independent ChatGPT review recorded these results:

| Review gate | Result |
| :--- | :--- |
| `M6_SOURCE_REVIEW` | PASS |
| `M6_ARCHITECTURE_REVIEW` | PASS |
| `M6_CHALLENGE_REVIEW` | PASS |
| `M6_1_A_STAR_ALGORITHM_REVIEW` | PASS |
| `M6_1_H2_CORRECTNESS_REVIEW` | PASS |
| `M6_1_SOLVER_INTEGRATION_REVIEW` | PASS |
| `BOUNDED_CSS_REPAIR_REVIEW` | PASS |
| `HOSTED_MERGE_REF_CI` | PASS |
| `CROSS_BROWSER_QUALIFICATION` | PASS |
| `M6_M6_1_FUNCTIONAL_ACCEPTANCE` | PASS |

The review confirmed:

- Challenge candidates are solved-rooted, and Challenge certification uses only `IDA_STAR`.
- Challenge acceptance uses solver depth and exposes no solution sequence.
- Bounded retry, stale-result, cancellation, unmount, and workspace-switch safeguards preserve the Play baseline.
- A* performs genuine optimal graph search with unit move costs and the shared H2 heuristic.
- H2 admissibility is exhaustive over 41,472 states, and H2 consistency is exhaustive over 497,664 directed edges.
- BFS, Bidirectional BFS, A*, and IDA* agree on exact solution depth across the reviewed fixtures and corpus.
- The CSS repair remains bounded to the overlay layout and does not alter product implementation contracts.

## Hosted Qualification

Run [34356378953](https://github.com/YI-TING-EE13/GearCube-Lab/actions/runs/34356378953) completed on event `pull_request`, attempt `1`.

The hosted workflow tested GitHub's PR merge ref containing:

```text
head 4338ad350ede53dafb4c628d6b5350b3be7da80c
merged into
base 659c18f3cf93d49eafdd5ea279054a4188332f7d
```

| Job | Job ID | Result |
| :--- | ---: | :--- |
| `verify` | `102482004333` | PASS — 40 Vitest files / 480 tests + build |
| `e2e (chromium)` | `102482561738` | PASS — 53 passed |
| `e2e (firefox)` | `102482561591` | PASS — 52 passed / 1 intentional skip |
| `e2e (webkit)` | `102482562483` | PASS — 52 passed / 1 intentional skip |

The Firefox and WebKit skips are the intentional Chromium-only touch-emulation case. The hosted matrix qualified the built preview on GitHub-hosted Linux; it did not qualify native Safari or a physical device.

## Limitations

- Playwright WebKit is not native Safari.
- No physical-device qualification is implied.
- No direct screen-reader acceptance is implied.
- Local Windows Firefox runtime/setup limitations are not equivalent to hosted Firefox qualification.
- The record does not claim a release or version that does not exist.

## Acceptance Status

```text
M6: COMPLETED & ACCEPTED
M6.1: COMPLETED & ACCEPTED
```
