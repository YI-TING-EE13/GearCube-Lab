# Phase 8 — Product Completion & Public-Test Readiness Implementation Plan

> **Document Status:** `PHASE8_IMPLEMENTATION_PLAN_ACCEPTED`
> **Authoritative Main Baseline:** `616d7f18388f25f62067f1eb192b672a4881bb20`
> **Planning Branch:** `phase/8-product-readiness-plan`
> **Phases 0–5 Status:** `COMPLETED & ACCEPTED ON MAIN`
> **Phase 6 Status:** `DEFERRED / OPTIONAL RESEARCH TRACK`
> **Phase 7 Status:** `DEFERRED / OPTIONAL PHYSICAL MODEL & VISION EXPANSION`
> **Phase 8 Strategy:** `APPROVED DIRECTION`
> **Phase 8 Plan Status:** `PHASE8_PLAN_ACCEPTED`
> **Independent Plan Review:** `PASS`
> **Phase 8 Implementation:** `COMPLETED`
> **Phase 8 Formal Acceptance:** `QUALIFIED`
> **Accepted Implementation Baseline:** `3e407caa4f02700422df33e1872a489d4a138ebf`
> **Target Condition:** `PUBLIC_TEST_READY` (Effective upon final fast-forward promotion of the acceptance-record commit to `main`)
> **Acceptance Record:** [`docs/development/PHASE_8_ACCEPTANCE_RECORD.md`](./PHASE_8_ACCEPTANCE_RECORD.md)
> **Lifecycle:** `HISTORICAL MILESTONE PLAN / ACCEPTED`
> **Current Authority:** Current Phase 8/9 lifecycle and verification inventory are maintained in [`ROADMAP.md`](ROADMAP.md), [`TEST_STRATEGY.md`](TEST_STRATEGY.md), and [`REPOSITORY_GOVERNANCE.md`](../operations/REPOSITORY_GOVERNANCE.md).

---

## 1. Executive Summary & Strategy Rebaseline Context

Phase 8 shifts GearCube Lab from progressive subsystem R&D into a self-contained, reproducible, robust, and accessible public-test-ready repository.

### 1.1. Product Strategy Rebaseline
- **Phases 0–5 (Completed & Accepted):** The discrete domain core, 3D kinematics and rendering, interactive Play Mode UI (history, undo/redo, seeded scramble), classical graph search solvers (BFS, BiBFS, IDA* with H2 two-slice PDB) with Solve Mode UI & solution playback, pure benchmark engine, 41,472-state exact-distance corpus, headless CLI, published comparative empirical research report, and browser Research Mode with background Web Worker execution are fully implemented, accepted, and merged into `main`.
- **Phase 6 (Neural Heuristic & AI-Guided Search):** `DEFERRED / OPTIONAL RESEARCH TRACK`. Not required for public-test readiness; does not block Phase 8; no implementation may begin during Phase 8.
- **Phase 7 (Physical Model & Vision Expansion):** `DEFERRED / OPTIONAL PHYSICAL MODEL & VISION EXPANSION`. Not required for public-test readiness; does not block Phase 8; no implementation may begin during Phase 8.
- **Phase 8 (Product Completion & Public-Test Readiness):** This was the `ACTIVE PRODUCT MAINLINE` at plan time. The plan's goal was to ensure an unrelated technically capable user could clone the public repository, install dependencies, launch GearCube Lab, understand the basic operating model, use Play / Solve / Research, and exercise the complete current system without developer-specific knowledge; the milestone is now completed and accepted.

### 1.2. Public-Test Readiness Boundary
- **Target Condition:** A stranger on a clean machine can clone, install, launch, understand, and test the software cleanly.
- **Explicitly NOT Required in Phase 8:** Production web deployment, GitHub Release publication, formal `v1.0` git tag, marketing/announcements, external user recruitment, Phase 6 AI, Phase 7 Vision, or new puzzle physical geometries.

---

## 2. Accepted Phase 8 Preflight Snapshot

An exhaustive, read-only preflight audit was executed from a fresh, disposable clone (`gearcube-phase8-audit`) against authoritative main (`616d7f18388f25f62067f1eb192b672a4881bb20`):

```
PREFLIGHT_AUDIT_STATUS: COMPLETED / ACCEPTED
CANONICAL_MAIN_BASELINE: 616d7f18388f25f62067f1eb192b672a4881bb20
FRESH_CLONE_GATE: PASS
NPM_CI_GATE: PASS (4.7s elapsed, exit code 0, 0 lockfile drift)
NPM_RUN_VERIFY_GATE: PASS (35 / 35 test files, 444 tests passing, clean Vite build)
NPM_RUN_TEST_E2E_GATE: PASS (40 / 40 Playwright browser tests passing in 2.5m)
DEV_SERVER_STARTUP: PASS (Vite 8.2.2 launches on 127.0.0.1:5173 with 0 startup errors)
PRODUCTION_BUILD: PASS (Clean rollup/vite build, 0 fatal errors)
PLAY_INTERACTIVE_FLOW: PASS (Face moves, TWO_STEP lock/finish, history timeline, undo/redo, deterministic scrambler, 3D orbit)
SOLVE_INTERACTIVE_FLOW: PASS (Instant IDA* solve, status metrics, solution playback step-forward/backward)
RESEARCH_INTERACTIVE_FLOW: PASS (Mode switch, validated config, background worker run, summary table, JSON/CSV downloads, clean return to Play)
RESPONSIVE_VIEWPORTS: PASS (1280x800 desktop, 768x1024 tablet, 375x667 mobile verified with 0 overflow)
DEPENDENCY_VULNERABILITIES: 0 (npm audit found 0 runtime critical/high/moderate/low issues)
GENUINE_SECRETS: 0
ACCIDENTAL_TRACKED_ARTIFACTS: 0
PRELIMINARY_ASSESSMENT: NEAR_READY
```

---

## 3. ChatGPT Reviewed Finding Classification

The following authoritative classification governs Phase 8:

### P1 — Required Before Public-Test-Ready
- **`[P1-01]` Missing External-User Onboarding & Quick Start:** `README.md` lacks explicit prerequisites (Node `>=22.12.0 <23`, `npm`), step-by-step commands (`git clone`, `npm ci`, `npm run dev`, `npm run build`, `npm run verify`), 3D camera controls guide, face controls / two-step staging guide, solver playback guide, research mode guide, and CLI benchmark instructions.
- **`[P1-02]` Open-Source Licensing Policy:** Formalization of the human-approved licensing decision (`LICENSE_POLICY: MIT / HUMAN APPROVED`). The repository provides the standard MIT `LICENSE` file and synchronized license terms.
- **`[P1-03]` Roadmap Alignment & Strategy Rebaseline:** Canonical documentation across `ROADMAP.md`, `PROJECT_BLUEPRINT.md`, and `SYSTEM_ARCHITECTURE.md` historically showed Phase 6 and 7 as preceding Phase 8 and must be rebaselined to reflect Phase 6/7 deferred and Phase 8 active mainline.

### P2 — High-Value Completion & Quality Work
- **`[P2-01]` Missing Canonical Production Preview Script:** `package.json` and `apps/web/package.json` lack a `"preview"` command to easily serve and smoke-test the production `dist/` bundle locally.
- **`[P2-02]` Missing Favicon Generating 404 Console Error:** Initial browser load requests `GET /favicon.ico` resulting in HTTP 404 in console logs.
- **`[P2-03]` Research Form Input Semantic Hygiene:** Benchmark checkbox controls lack explicit `id` and `name` attributes (controls are wrapped by labels with accessible text; this is form semantic hygiene, not a proven screen-reader failure).
- **`[P2-04]` Automated Browser Coverage is Chromium-Only:** `playwright.config.ts` currently configures only Desktop Chrome; Firefox and WebKit are unconfigured and unverified.
- **`[P2-05]` Absence of GitHub Actions CI Workflow:** Repository lacks `.github/workflows/verify.yml` to automatically validate pull requests and branch pushes on clean remote infrastructure.

### P3 — Optional / Observational (Out of Scope for Phase 8)
- **`[P3-01]` Three.js `THREE.Clock` Deprecation Warning:** Upstream warning from Three.js/R3F internals; no direct repository use of `THREE.Clock` exists. Do not perform framework upgrades solely for this warning.
- **`[P3-02]` Community Health Files (`CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`):** Optional unless future open-source contributor workflows require them.
- **`[P3-03]` Phase 6 AI / Neural Search:** Deferred to optional future research track.
- **`[P3-04]` Phase 7 Physical Model & Vision Expansion:** Deferred to optional future expansion track.

---

## 4. Scope Principles & Boundaries

### 4.1. Phase 8 Scope Principle
Phase 8 is strictly a **completion, onboarding, robustness, compatibility, and verification** phase. It is **NOT** a feature expansion phase.

### 4.2. Explicit Non-Goals (Strictly Out of Scope)
- No drag-to-turn 3D raycasting interactions.
- No new Gear Cube physical models or Daiso visual remodeling.
- No new search solver algorithms.
- No AI / PyTorch / neural heuristic models.
- No webcam / computer vision ingestion.
- No backend servers, databases, or user accounts.
- No cloud synchronization or IndexedDB benchmark persistence.
- No heavy charting / graphing libraries (D3, Chart.js).
- No major visual redesign of UI themes.

---

## 5. Dependency-Ordered Subphase Decomposition

```
[ Phase 8: Product Completion & Public-Test Readiness ]
  │
  ├─ Phase 8A: Repository & Tooling Foundation
  │     ├─ Canonical "preview" scripts in root and apps/web package.json
  │     └─ GitHub Actions CI workflow (.github/workflows/verify.yml)
  │
  ├─ Phase 8B: First-Time User Onboarding
  │     ├─ Comprehensive root README.md rewrite for external users
  │     ├─ Prerequisites, Quick Start, Build, Preview, Test instructions
  │     └─ Feature guides (Play Mode, 3D Camera, Solve Mode, Research Mode, CLI)
  │
  ├─ Phase 8C: UX, Accessibility & Console Hygiene
  │     ├─ Lightweight repository-owned favicon asset (apps/web/public/favicon.ico)
  │     ├─ Form input id/name accessibility attributes in ResearchPanel.tsx
  │     └─ Zero unexpected app-owned console errors/404s
  │
  ├─ Phase 8D: Browser Compatibility Qualification
  │     ├─ Preserve Chromium baseline
  │     ├─ Evaluate Firefox and WebKit in supported environments
  │     └─ Formally qualify and document supported browser matrix
  │
  ├─ Phase 8E: Public Repository Presentation & Documentation Finalization
  │     ├─ Final synchronization across all canonical docs (README, docs/README, ROADMAP, BLUEPRINT, SYSTEM_ARCHITECTURE, TEST_STRATEGY, DEPLOYMENT)
  │     └─ License decision formalization (LICENSE_POLICY: MIT / HUMAN APPROVED)
  │
  ├─ Phase 8F: Clean-Clone Release-Style Acceptance
  │     ├─ Disposable clean-clone execution across all verification commands
  │     ├─ Security, secret, artifact, and dependency vulnerability scan
  │     └─ Interactive browser acceptance across Desktop, Tablet, Mobile, and Preview
  │
  └─ Phase 8G: Public-Test-Ready Formal Acceptance
        ├─ Documentation synchronization & formal acceptance record
        ├─ Independent ChatGPT review
        └─ Fast-forward-only promotion to main (Status: PUBLIC_TEST_READY)
```

---

## 6. Subphase Specifications

### Phase 8A: Repository & Tooling Foundation
- **Objective:** Establish canonical production preview scripts and automated continuous integration for repeatable repository verification.
- **Planned Implementation:**
  1. Add `"preview": "vite preview"` to `apps/web/package.json`.
  2. Add `"preview": "npm run preview --workspace=@gearcube/web"` to root `package.json`.
  3. Create `.github/workflows/verify.yml` configuring Node 22 environment compatible with `package.json` engines (`>=22.12.0 <23`), running `npm ci`, `npm run verify`, and `npm run test:e2e` (with exact Playwright browser installation mechanics determined during implementation).
  4. Preserve `npm` as canonical package manager, `package-lock.json`, and engine declarations.
- **Verification:** Local `npm run build && npm run preview` smoke test; CI workflow validation.

### Phase 8B: First-Time User Onboarding
- **Objective:** Transform `README.md` into an intuitive, comprehensive guide for a stranger who has never seen the repository.
- **Planned Implementation:**
  1. **What GearCube Lab is:** High-level project summary and key capabilities.
  2. **Product Status:** Current readiness status and implemented capabilities overview.
  3. **Prerequisites:** Explicit Node version (`>=22.12.0 <23`) and `npm`.
  4. **Quick Start:** `git clone`, `cd gearcube-lab`, `npm ci`, `npm run dev`.
  5. **Production Build & Preview:** `npm run build`, `npm run preview`.
  6. **Verification Commands:** `npm run verify`, `npm run test:e2e`, `npm test`.
  7. **Play Mode Guide:** 3D viewport navigation (orbit, pan, zoom), Face rotation buttons, `DIRECT_180` vs `TWO_STEP` modes, Deterministic Scramble, Move History timeline with undo/redo, Keyboard shortcuts table.
  8. **Solve Mode Guide:** Algorithm selection (BFS, BiBFS, IDA*), search metrics display, Solution playback controls (Play, Pause, Step Forward, Step Backward).
  9. **Research Mode Guide:** Browser benchmark suite configuration, background Web Worker execution, live status, summary metrics, by-depth table, JSON/CSV export downloads.
  10. **Headless Benchmark CLI:** Usage of `npm run benchmark -- --config <path> [--json <out>] [--csv <out>]`.
  11. **Known Limitations & Browser Support:** $180^\circ$ quantization, synchronous Worker runs, tested browser support statement.
  12. **Documentation Index & License Section:** Links to `docs/` and license terms (once decided).

### Phase 8C: UX, Accessibility & Console Hygiene
- **Objective:** Eliminate browser console errors and enhance form accessibility hygiene.
- **Planned Implementation:**
  1. Add a clean, lightweight repository-owned favicon asset (`apps/web/public/favicon.ico`) and reference it from `apps/web/index.html` to eliminate the 404 console error.
  2. Add stable `id` and `name` attributes to checkbox inputs in `ResearchPanel.tsx` while preserving all labels, data-testids, values, validation, and benchmark config semantics.
  3. Verify zero unexpected app-owned console errors, page errors, or 404 asset requests across all flows.
  4. Record `THREE.Clock` as an upstream dependency observation without unnecessary framework churn.
- **Verification:** Chrome DevTools console and network audit during Play, Solve, and Research flows.

### Phase 8D: Browser Compatibility Qualification
- **Objective:** Evaluate and document cross-browser compatibility across Chromium, Firefox, and WebKit.
- **Planned Implementation:**
  1. Preserve established Chromium automated baseline.
  2. Execute representative and full E2E suites against Firefox and WebKit in supported environments.
  3. Inspect and classify any engine-specific failures (distinguishing environment/driver installation issues from application defects).
  4. Formally determine and document the verified browser matrix (only adding permanent Playwright projects for engines with reliable pass rates).
- **Verification:** Playwright multi-browser test execution; documented browser compatibility matrix.

### Phase 8E: Public Repository Presentation & Documentation Finalization
- **Objective:** Bring all canonical documentation into exact alignment with Phase 8A–8D implementation.
- **Planned Implementation:**
  1. Synchronize `README.md`, `docs/README.md`, `ROADMAP.md`, `PROJECT_BLUEPRINT.md`, `SYSTEM_ARCHITECTURE.md`, `TEST_STRATEGY.md`, and `DEPLOYMENT.md`.
  2. Formalize the human-approved licensing decision (`LICENSE_POLICY: MIT / HUMAN APPROVED`) and adopt the standard MIT `LICENSE` file.
  3. Document known limitations, tested environments, and CI status badges/instructions.
  4. (Optional) Embed lightweight screenshots or demo GIFs if available.
- **Verification:** `git diff --check`, full documentation link audit, strategy consistency audit.

### Phase 8F: Clean-Clone Release-Style Acceptance
- **Objective:** Execute an independent, release-style acceptance run from a clean disposable extraction.
- **Planned Implementation:**
  1. Clone repository into a unique temporary directory.
  2. Execute `npm ci`, `npm run verify`, `npm run test:e2e`, `npm run build`, `npm run preview`, and `npm run dev`.
  3. Perform dependency security audit (`npm audit --omit=dev --audit-level=high` -> 0 critical/high).
  4. Perform secret candidate scan (0 genuine secrets) and tracked artifact scan (0 unignored artifacts).
  5. Perform interactive browser acceptance across 1280x800 desktop, 768x1024 tablet, and 375x667 mobile viewports.
  6. Perform production preview smoke test with zero console errors and zero unexpected network requests.
- **Verification:** Disposable clean-clone acceptance report.

### Phase 8G: Public-Test-Ready Formal Acceptance
- **Objective:** Formal closure of Phase 8 and promotion of public-test-ready codebase to `main`.
- **Planned Implementation:**
  1. Author formal acceptance record candidate.
  2. Independent review and approval by ChatGPT.
  3. Fast-forward-only promotion of Phase 8 branch to `main`.
  4. Product status formally transitions to `PUBLIC_TEST_READY`.
- **Verification:** Git ref verification (`origin/main === origin/phase/8-*`), clean worktree.

---

## 7. Comprehensive Acceptance Gates

| Gate Identifier | Description | Required Status | Final State |
| :--- | :--- | :--- | :--- |
| `FRESH_CLONE_GATE` | Repository clones cleanly into a fresh temporary directory | `PASS` | `COMPLETED & ACCEPTED` |
| `DEPENDENCY_INSTALL_GATE` | `npm ci` succeeds with exit code 0 and zero lockfile drift | `PASS` | `COMPLETED & ACCEPTED` |
| `VERIFY_GATE` | `npm run verify` passes (typecheck, core-purity, all unit/boundary/reachability tests, clean build) | `PASS` | `COMPLETED & ACCEPTED` |
| `FULL_E2E_GATE` | `npm run test:e2e` passes across all automated browser suites | `PASS` | `COMPLETED & ACCEPTED` |
| `BUILD_GATE` | `npm run build` generates production bundle in `dist/` without error | `PASS` | `COMPLETED & ACCEPTED` |
| `PREVIEW_GATE` | `npm run preview` serves production build locally and passes smoke tests | `PASS` | `COMPLETED & ACCEPTED` |
| `DEV_START_GATE` | `npm run dev` launches development server with zero startup errors | `PASS` | `COMPLETED & ACCEPTED` |
| `PLAY_ACCEPTANCE_GATE` | Interactive face controls, TWO_STEP staging, history, undo/redo, and scrambler function flawlessly | `PASS` | `COMPLETED & ACCEPTED` |
| `SOLVE_ACCEPTANCE_GATE` | Solver executes IDA*/BiBFS/BFS, renders telemetry, and plays back solutions step-by-step | `PASS` | `COMPLETED & ACCEPTED` |
| `RESEARCH_ACCEPTANCE_GATE` | Browser Research Mode executes benchmarks via Worker, displays tables, and downloads JSON/CSV | `PASS` | `COMPLETED & ACCEPTED` |
| `RESPONSIVE_GATE` | Layout is fully actionable and non-overlapping across Desktop (1280x800), Tablet (768x1024), and Mobile (375x667) | `PASS` | `COMPLETED & ACCEPTED` |
| `CONSOLE_ERROR_GATE` | Zero unexpected app-owned console errors or 404 asset requests | `PASS` | `COMPLETED & ACCEPTED` |
| `PAGE_ERROR_GATE` | Zero unhandled runtime exceptions or page errors | `PASS` | `COMPLETED & ACCEPTED` |
| `NO_EXTERNAL_NETWORK_SURPRISE_GATE` | Zero unexpected external network requests initiated by application | `PASS` | `COMPLETED & ACCEPTED` |
| `SECRET_SCAN_GATE` | Zero genuine credentials, API keys, or private material in tracked repository files | `PASS` | `COMPLETED & ACCEPTED` |
| `TRACKED_ARTIFACT_GATE` | Zero accidental build artifacts, test results, logs, or editor state tracked by git | `PASS` | `COMPLETED & ACCEPTED` |
| `README_ONBOARDING_GATE` | `README.md` provides complete, accurate onboarding, prerequisites, quickstart, and feature guides | `PASS` | `COMPLETED & ACCEPTED` |
| `LICENSE_DECISION_GATE` | Explicit human licensing decision made and license terms recorded | `PASS` | `COMPLETED & ACCEPTED` |
| `DOCUMENTATION_SYNC_GATE` | All canonical documentation synchronized with Phase 8 implementation facts | `PASS` | `COMPLETED & ACCEPTED` |
| `BROWSER_SUPPORT_TRUTHFULNESS_GATE` | Documented browser support strictly reflects empirically verified engine matrix | `PASS` | `COMPLETED & ACCEPTED` |
| `INDEPENDENT_REVIEW_GATE` | ChatGPT completes independent review of Phase 8 implementation and acceptance records | `PASS` | `COMPLETED & ACCEPTED` |
| `FAST_FORWARD_PROMOTION_GATE` | Phase 8 promoted to authoritative `main` using fast-forward only | `PASS` | `QUALIFIED (Pending Final Main Fast-Forward)` |

---

## 8. Governance & Role Discipline

- **Authority:** ChatGPT owns architecture, strategy decisions, task scoping, priority, and acceptance sign-off.
- **Execution:** Antigravity executes bounded implementation directives, collects verification evidence, and authors candidate documentation.
- **Candidate Discipline:** No subphase is marked complete or merged without explicit independent verification.
- **Scope Discipline:** No out-of-scope features (AI, Vision, drag-to-turn, backend) may be introduced during Phase 8.
