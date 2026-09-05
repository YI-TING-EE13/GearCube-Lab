# DEPLOYMENT.md — Production Hosting & Deployment Strategy

> **Document Status:** `ACTIVE / DEPLOYED` (Live GitHub Pages Deployment Verified)
> **Live Public URL:** https://yi-ting-ee13.github.io/GearCube-Lab/
> **Target Architecture:** Static HTTPS Web Application on GitHub Pages via Verification-Gated GitHub Actions

---

## 1. Deployment Philosophy & Target Environment

GearCube Lab is architected as a **100% static, client-side web application** across all simulation, classical solving, and research benchmarking workspaces (Phases 0 through 5, qualified for public testing in Phase 8 and live deployment in Phase 9).

### Key Deployment Characteristics:
- **Zero Server Infrastructure:** The core application requires no backend API server, database, or server-side compute. All state transitions, 3D animations, and search algorithms execute locally within the user's browser.
- **GitHub Pages Static Hosting:** The live public application is hosted as a GitHub Pages site served securely over HTTPS.
- **Web Worker Support:** Both the classical solver engine (`solver.worker.ts`) and the research benchmarking harness (`benchmark.worker.ts`) are compiled as dedicated Web Worker bundles, delivered with proper MIME types (`application/javascript`), and executed off the main UI thread.

---

## 2. Dynamic Subpath Base Configuration

- **Local Development:** Normal local development (`npm run dev`) and local preview (`npm run preview`) serve from the standard root base (`/`).
- **GitHub Pages Subpath:** In the GitHub Pages deployment workflow, the repository base path is dynamically resolved via `actions/configure-pages` (`steps.pages.outputs.base_path` -> `/GearCube-Lab`) and normalized to `/GearCube-Lab/`.
- **Vite Build Contract:** The base path is passed dynamically via CLI (`npm run build --workspace=@gearcube/web -- --base="/GearCube-Lab/"`), preserving a clean, unmutated `vite.config.ts`.

---

## 3. Verification-Gated Continuous Deployment Workflow

The public GitHub Pages deployment is fully automated and strictly gated by the canonical test suite via `.github/workflows/deploy-pages.yml`.

### 3.1. Control-Flow Architecture

```text
main branch push
      ↓
Verify Workflow (.github/workflows/verify.yml)
      ├─ Workspace verify (typecheck, boundary checks, Vitest 444/444)
      └─ Parallel Playwright E2E matrix (50 logical tests; 148 applicable executions, 2 intentional skips)
      ↓ (attempt 1 == success)
Deploy GitHub Pages Workflow (.github/workflows/deploy-pages.yml via workflow_run)
      ├─ Checkout exact verified SHA (github.event.workflow_run.head_sha)
      ├─ Stale-main guard (verifies origin/main equals verified SHA)
      ├─ Setup Node.js 22.17.1 & npm ci
      ├─ Configure GitHub Pages & Build with dynamic base (/GearCube-Lab/)
      ├─ Upload Pages artifact (apps/web/dist)
      └─ Deploy to github-pages environment
```

### 3.2. Hard Qualification Gate

The deployment workflow runs only when the triggering `Verify` workflow satisfies all four conditions:
```yaml
if: >
  github.event.workflow_run.conclusion == 'success' &&
  github.event.workflow_run.head_branch == 'main' &&
  github.event.workflow_run.event == 'push' &&
  github.event.workflow_run.run_attempt == 1
```

- Non-main branches (`phase/**`), pull requests, manual workflow dispatches, failed Verify runs, cancelled runs, and rerun attempts ($>1$) **never** trigger deployment.
- **Exact Verified Checkout:** `actions/checkout` checks out `github.event.workflow_run.head_sha`.
- **Stale-Main Protection:** A pre-build step queries `git ls-remote origin refs/heads/main` to ensure `main` has not advanced past the tested commit, preventing stale deployments.
- **Zero-Secret Posture:** The deployment workflow relies only on GitHub-provided credentials:
  - `GITHUB_TOKEN` with bounded repository/Pages permissions (`contents: read`, `pages: write`);
  - GitHub OIDC identity-token capability enabled by `id-token: write` for the official Pages deployment flow.
  No custom PAT or repository deployment secret is required.
- **No `gh-pages` Branch:** Deployments use official GitHub Pages artifact uploads; `dist/` is never committed to Git history.

---

## 4. Build & Static Distribution Layout

The production bundle generated in `apps/web/dist` compiles to the following static distribution structure:

```text
dist/
├── index.html                               # Main HTML entry point (base-prefixed)
├── favicon.svg                              # SVG favicon asset
└── assets/
    ├── index-[hash].js                      # Application client bundle (React / Three.js / R3F)
    ├── index-[hash].css                     # Application stylesheets
    ├── solver.worker-[hash].js              # Dedicated classical solver Web Worker bundle
    └── benchmark.worker-[hash].js           # Dedicated research benchmark Web Worker bundle
```

All asset references in `index.html` and worker bundle instantiations resolve beneath `/GearCube-Lab/assets/`. Zero unresolved raw TypeScript worker URLs remain in production artifacts.

---

## 5. Browser & Security Posture

### 5.1. HTTPS Hosting
- **Transport Security:** GitHub Pages serves the public application over HTTPS, providing authenticated and encrypted transport and a secure browser context.
- **Worker & WebGL2 Verification:** The currently deployed Web Worker and WebGL2 functionality has been verified successfully over the public HTTPS site. Ordinary Web Workers and WebGL2 do not inherently require HTTPS, but benefit from standard origin isolation and secure delivery.
- **Future Camera Context:** Future camera functionality in Phase 7 using `navigator.mediaDevices.getUserMedia()` strictly requires a secure context (HTTPS, with trustworthy local-development origins treated according to browser rules).

### 5.2. Browser Compatibility Baseline

The current Playwright inventory contains 50 logical tests across Chromium, Firefox, and WebKit projects. The Chromium-only touch gate is intentionally skipped in Firefox and WebKit, yielding 150 project cases: 148 applicable executions and 2 intentional skips.

| Browser project | Applicable executions | Intentional touch skips |
| :--- | ---: | ---: |
| Chromium | 50 | 0 |
| Firefox | 49 | 1 |
| WebKit | 49 | 1 |

These are inventory counts, not a claim that every run passes. Exact qualification evidence belongs to the corresponding `Verify` workflow run for the tested commit; inspect `verify` and all three browser jobs. See [TEST_STRATEGY.md](../development/TEST_STRATEGY.md) for maintained test coverage.

- **Hosted Firefox:** On hosted Linux CI, Firefox executes headed under Xvfb with a CI WebGL2 preference.
- **Safari Qualification Notice:** Native Safari has not been separately verified.
- **Android Emulator Qualification Notice:** Two Android phone-class emulator environments have been separately qualified against the live Pages site through actual Android Chrome using serial-specific direct CDP: `Pixel_7` on Android 15/API 35 with Chrome `124.0.6367.219`, and `Small_Phone` on Android 16/API 36 with Chrome `151.0.7922.139`. This evidence is distinct from desktop viewport and touch emulation and does not guarantee compatibility across all Android environments.
- **Physical Device Qualification Notice:** Physical Android/mobile hardware and tablet qualification have not been performed. Native Safari and iOS browser qualification remain unverified.

### 5.3. Zero-Secret & Privacy Posture
- Under no circumstances are private API keys, proprietary tokens, or backend credentials bundled into client-side JavaScript.
- Zero network requests are made to third-party telemetry, tracking, or analytics services.

### 5.4. Camera & Vision Posture (Future Phase 7)
When camera-based puzzle reconstruction is introduced in Phase 7:
1. **Explicit User Consent:** Native permission modals trigger only upon explicit user action.
2. **Local-First Processing:** Video frames are processed in-memory via HTML5 canvas/WebGL and discarded immediately.
3. **No Automatic Persistence:** Captured images are never transmitted to external servers.

---

## 6. Historical Initial Live Deployment Record & Qualification Evidence

The following record preserves the initial Phase 9 live deployment and its acceptance results, including the then-current 123-case suite. It does not describe the current test inventory or the latest deployed commit; use Section 5.2 and the corresponding workflow run for current qualification.

### 6.1. Deployment Metadata
- **Initial Live Deployment SHA:** `febe270621892fc5b985af24600ef0fa4be61e36`
- **Main Verify Workflow Run:** `33254251003` (`conclusion: success`, Attempt 1, 123 / 123 E2E passed)
- **Deploy GitHub Pages Workflow Run:** `33254681960` (`conclusion: success`)
- **Hosting Target:** GitHub Pages (`environment: github-pages`, Deployment ID `6156109027`)
- **Authoritative Public URL:** https://yi-ting-ee13.github.io/GearCube-Lab/

### 6.2. Live Acceptance Smoke Results
- **Public Reachability:** HTTPS 200 OK with valid security headers (`Strict-Transport-Security`).
- **Initial 3D Render:** 3D viewport canvas rendered cleanly across Chromium, Firefox, and WebKit.
- **Play Mode:** Two-step $90^\circ$ physical half-turn, move completion, and timeline undo to baseline verified.
- **Solve Mode:** Deterministic scramble, real Solver Worker execution over HTTPS, solution generation, and animated playback to solved state verified.
- **Research Mode:** Stratified benchmark suite execution in real Benchmark Worker, result summary table rendering, and structured JSON / CSV report downloads verified.
- **Responsive Viewports:** Clean layout and zero document horizontal overflow verified across desktop ($1280 \times 800$), tablet ($768 \times 1024$), and mobile ($375 \times 667$).
- **Network & Console Hygiene:** 0 asset 404s, 0 worker 404s, 0 MIME errors, 0 CORS errors, 0 third-party requests, and 0 console/page errors.
