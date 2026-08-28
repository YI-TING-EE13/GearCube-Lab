# GearCube Lab

GearCube Lab is an interactive browser-based simulator, classical solver engine, and benchmark research suite for the Standard / Original Gear Cube puzzle.

It combines a 3D playable puzzle with mechanically coupled gear kinematics, multi-algorithm classical search solvers with step-by-step playback, and a reproducible benchmarking environment for puzzle research.

---

## What You Can Do

- **Play in 3D:** Rotate and inspect the puzzle in interactive 3D with coupled gear animations.
- **Choose Interaction Modes:** Control moves via staged two-step half-turns (`TWO_STEP`) or direct full turns (`DIRECT_180`).
- **Deterministic Scramble:** Generate reproducible scramble states from any text seed.
- **Timeline & History:** Step through past moves, scrub the timeline, or undo/redo actions.
- **Optimal Solving:** Solve any reachable state using Breadth-First Search (BFS), Bidirectional BFS, or IDA* with the precomputed $H_2$ pattern database heuristic.
- **Solution Playback:** Play solutions automatically or step forward and backward move-by-move.
- **Browser Research Mode:** Run multi-algorithm benchmark experiments across exact distance strata 1..8 in a background Web Worker without altering your play session.
- **Export Benchmark Data:** Download research results as structured JSON reports or RFC-4180 CSV tables.
- **Headless Benchmark CLI:** Run identical reproducible benchmark suites from the command line.

---

## Quick Start

### Prerequisites

- **Node.js:** `>=22.12.0 <23`
- **npm:** Standard with Node.js

### Installation & Launch

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/YI-TING-EE13/GearCube-Lab.git
   cd GearCube-Lab
   npm ci
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```
   Open the local URL displayed in the terminal (typically `http://localhost:5173/`) in a supported browser.

3. Or build and serve the production distribution locally:
   ```bash
   npm run build
   npm run preview
   ```
   Open the preview URL displayed in the terminal (typically `http://localhost:4173/`).

---

## Using GearCube Lab

### Play

The **Play** workspace is the default interactive puzzle environment.

- **3D Camera Navigation:**
  - **Orbit / Rotate:** Click and drag with the left mouse button across the background.
  - **Zoom:** Scroll the mouse wheel or pinch on a trackpad/touchscreen.
  - *Note:* Drag-to-turn direct mesh manipulation is not currently implemented; use on-screen controls or keyboard shortcuts.
- **Turn Interaction Modes:**
  - **TWO_STEP (Default):** Each canonical $180^\circ$ face turn is completed via two staged $90^\circ$ physical half-turns. At the physical midpoint, orthogonal face turns are mechanically locked; only the active face can be completed (**Finish**) or reversed back to baseline (**Reverse**).
  - **DIRECT_180:** Each canonical face move executes as a single continuous $180^\circ$ interaction.
  - Switch between modes at any time using the **Direct 180°** toggle button in the Face Controls panel.
- **Face Move Controls:**
  - 12 on-screen buttons trigger Clockwise (↻) and Counter-Clockwise (↺) moves for all six faces (**U, D, F, B, R, L**).
- **Scramble & History:**
  - Enter any string into the **Seed** field and click **Scramble** to apply a deterministic scramble sequence.
  - Use **Undo**, **Redo**, or **Reset Baseline** in the top bar to navigate history, or click directly on any step in the timeline scrubber.

### Solve

The **Solver** panel allows you to find optimal solution paths from the current cube state.

- **Available Algorithms:**
  - **IDA* (Recommended):** Iterative Deepening A* search informed by the precomputed $H_2$ two-slice pattern database heuristic.
  - **Bidirectional BFS:** Shortest-path graph search exploring simultaneously from the scrambled state and the solved goal state.
  - **Breadth-First Search (BFS):** Baseline exhaustive shortest-path graph search.
- **Solving Workflow:**
  1. Manipulate or scramble the cube to an unsolved state.
  2. Select your desired algorithm from the dropdown.
  3. Click **Solve**. Search executes inside a dedicated background Web Worker, keeping the 3D viewport responsive.
  4. Real-time telemetry displays elapsed time, nodes expanded, and current search depth.
- **Solution Playback:**
  - When solved, the **Playback** controls appear on the right overlay.
  - Click **▶ Play** for continuous animated execution, **⏸ Pause** to hold, or **⏮ Step Back** / **Step Fwd ⏭** to inspect moves individually.
  - Triggering a new manual move or scramble cancels an active search and invalidates stale playback.

### Research

The **Research** workspace provides an isolated environment for conducting reproducible benchmark experiments on classical solver algorithms without affecting your active play cube or history.

- **Switching Modes:** Click the **Research** button in the top mode navigation bar (available whenever the cube is idle).
- **Configuring a Benchmark Suite:**
  - **Suite ID:** Unique label for your benchmark run.
  - **Seed:** PRNG seed used for stratified sampling of puzzle states.
  - **Exact Depths:** Select any subset of exact distance strata from 1 to 8.
  - **Cases Per Depth:** Number of distinct states sampled per distance stratum.
  - **Algorithms:** Select one or more algorithms (**BFS**, **Bidirectional BFS**, **IDA***).
  - **Warmup Runs:** Number of unmeasured warmup runs per trial.
  - **Measured Runs:** Number of timed measurement runs per trial.
  - **Limits (Optional):** Optional constraints on `Max Nodes` and `Max Depth`.
- **Execution & Export:**
  - Click **Run Benchmark** to start the background benchmark worker. A live progress bar indicates progress across depth strata.
  - Click **Cancel Benchmark** at any time to terminate the worker immediately.
  - View summary metrics including solve rate, mean duration, and node expansion statistics per algorithm and depth.
  - Click **Download JSON** for the full structured `BenchmarkReport` or **Download CSV** for 14-column tabular trial records.
  - *Note:* Browser benchmark timings reflect the execution speed of your local browser JavaScript engine and hardware.

---

## Keyboard Shortcuts

GearCube Lab supports full keyboard interaction in the Play workspace:

| Key | Action | Description |
| :--- | :--- | :--- |
| `u`, `d`, `f`, `b`, `r`, `l` | **Face Turn CW** | Turn Up, Down, Front, Back, Right, or Left face clockwise |
| `Shift` + `u`, `d`, `f`, `b`, `r`, `l` | **Face Turn CCW** | Turn corresponding face counter-clockwise |
| `Ctrl` + `Z` / `Cmd` + `Z` | **Undo** | Revert last committed move |
| `Ctrl` + `Shift` + `Z` / `Cmd` + `Shift` + `Z` | **Redo** | Redo previously undone move |
| `Ctrl` + `Y` | **Redo (Win/Linux)** | Redo previously undone move (Windows and Linux only) |

*Shortcuts are disabled while typing inside input fields and during active move animations.*

---

## Development & Verification

### Common Scripts

| Command | Purpose |
| :--- | :--- |
| `npm ci` | Clean install repository dependencies |
| `npm run dev` | Launch local Vite development server for `@gearcube/web` |
| `npm run build` | Typecheck and build production distribution for web application |
| `npm run preview` | Serve built production distribution locally |
| `npm run verify` | Full verification gate: typecheck, pure core boundary check, Vitest unit suite, and production build |
| `npm test` | Run fast Vitest test suite across all workspace packages |
| `npm run test:e2e` | Run Playwright end-to-end browser test suite (Chromium) |
| `npm run benchmark -- --config <path>` | Execute headless CLI benchmark suite |

### CI Verification

The project includes an automated GitHub Actions verification workflow running on hosted Ubuntu with Node.js 22.17.1, validating dependencies (`npm ci`), workspace integrity (`npm run verify`), and full browser end-to-end testing with Playwright (`npm run test:e2e`).

---

## Headless Benchmark CLI

You can execute reproducible benchmark experiments headlessly via Node.js using the benchmark CLI:

```bash
npm run benchmark -- --config <config.json> [--json <output.json>] [--csv <output.csv>]
```

### Example Benchmark Configuration (`config.json`)

```json
{
  "schemaVersion": "1",
  "suiteId": "cli-sample-benchmark",
  "seed": "GearCube-Lab",
  "exactDepths": [1, 2, 3, 4],
  "casesPerDepth": 2,
  "algorithms": [
    "BFS",
    "BIDIRECTIONAL_BFS",
    "IDA_STAR"
  ],
  "warmupRuns": 0,
  "measuredRuns": 1
}
```

The CLI prints live progress to `stderr` and outputs structured JSON or CSV files to the specified paths upon completion.

---

## Tested Environment & Browser Status

- **Runtime Baseline:** Node.js `>=22.12.0 <23` (tested on Node 22.17.1 and 22.17.2).
- **Chromium:** Automated baseline; fully verified via Playwright E2E and interactive browser acceptance.
- **Firefox & WebKit:** Not yet qualified. Formal cross-browser qualification is scheduled for Phase 8D; browser support claims will be updated once empirical test evidence is recorded.

---

## Known Limitations & Deferred Work

- **No Drag-to-Turn Manipulation:** Direct pointer dragging on cube pieces to initiate face turns is not currently implemented; manipulation is handled through the on-screen buttons and keyboard shortcuts.
- **Browser Automation Scope:** Automated E2E test coverage currently targets Chromium. Cross-browser test coverage for Firefox and WebKit is in progress.
- **AI / Neural Search Track (Phase 6):** Offline PyTorch-trained neural heuristics and learned value networks remain a deferred optional research track.
- **Physical Model & Vision Track (Phase 7):** Camera capture, color/sticker extraction, state reconstruction, and physical guidance remain a deferred optional expansion track.
- **Reference Puzzle Model:** The puzzle model implements the canonical combinatorial and mechanical rules of the Standard / Original Gear Cube designed by Oskar van Deventer, rather than a physical-replica scan of third-party retail variants.

---

## Project Status

```
Phases 0–5: Completed & Accepted
Active Mainline: Phase 8 (Product Completion & Public-Test Readiness)
  - Phase 8A (Repository & Tooling Foundation): Completed / Accepted
  - Phase 8B (First-Time User Onboarding): Current Candidate
  - Phases 8C–8G: Scheduled
Deferred Tracks:
  - Phase 6 (AI-Guided Search): Deferred Optional Research
  - Phase 7 (Physical Model & Vision Expansion): Deferred Optional Expansion
```

For complete phase history, specifications, and gating criteria, refer to [`ROADMAP.md`](docs/development/ROADMAP.md) and [`PHASE_8_IMPLEMENTATION_PLAN.md`](docs/development/PHASE_8_IMPLEMENTATION_PLAN.md).

---

## Architecture at a Glance

GearCube Lab enforces a strict unidirectional dependency architecture:

$$\text{UI / Presentation / Solvers / Research} \longrightarrow \text{Discrete Core Contracts}$$

```
                +---------------------------------------+
                |      User Interface & Controls        |
                |      (React / Local Orchestration)    |
                +-------------------+-------------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
          v                                                   v
+-------------------+                               +-------------------+
|    3D Renderer    |                               |  Discrete Core    |
| (R3F / Three.js)  | <--- [Kinematic Plan] ------- | (Pure TypeScript) |
| [Presentation]    |                               |  * State Truth    |
|                   |                               |  * Legal Moves    |
+-------------------+                               +---------+---------+
                                                              ^
          +---------------------------------------------------+
          |
+---------+---------+
| Classical Solver  | <--- [Search State]
| (Worker Engine)   |
+-------------------+
```

- **Domain Core as Sole Source of Truth:** Pure TypeScript engine (`@gearcube/core`) with zero dependencies owns discrete state representation and valid transition rules.
- **Presentation Decoupling:** Three.js and React Three Fiber render visual meshes according to continuous kinematic transformations derived from the core state.
- **Worker Isolation:** Heavy search algorithms and benchmark sampling run in dedicated Web Workers to ensure a smooth, unblocked UI.

For complete architectural specifications, see [`SYSTEM_ARCHITECTURE.md`](docs/architecture/SYSTEM_ARCHITECTURE.md).

---

## Documentation

Comprehensive architectural designs, mathematical models, testing strategies, and historical reports are organized under [`docs/`](docs/README.md):

| Document | Description |
| :--- | :--- |
| [`docs/README.md`](docs/README.md) | Central documentation directory and reading index |
| [`PROJECT_BLUEPRINT.md`](docs/project/PROJECT_BLUEPRINT.md) | Comprehensive 30-section project blueprint, specifications, and scope |
| [`SYSTEM_ARCHITECTURE.md`](docs/architecture/SYSTEM_ARCHITECTURE.md) | Layered architectural contracts, thread boundaries, and invariants |
| [`ROADMAP.md`](docs/development/ROADMAP.md) | Phase roadmap from Phase 0 to Phase 8 with hard gating criteria |
| [`PHASE_8_IMPLEMENTATION_PLAN.md`](docs/development/PHASE_8_IMPLEMENTATION_PLAN.md) | Exact implementation plan for product completion and public-test readiness |
| [`TEST_STRATEGY.md`](docs/development/TEST_STRATEGY.md) | 12-level testing pyramid, property invariants, and verification gates |
| [`DEVELOPMENT_GUIDE.md`](docs/development/DEVELOPMENT_GUIDE.md) | Developer guidelines, toolchain conventions, and coding standards |
| [`DEPLOYMENT.md`](docs/operations/DEPLOYMENT.md) | Static hosting architecture, Web Worker requirements, and deployment strategy |
| [`PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md`](docs/research/PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md) | Empirical classical solver benchmark report across exact depths 1..8 |

---

## Governance

All autonomous coding agents and human contributors must follow the instructions in [`AGENTS.md`](AGENTS.md) before making changes to this repository.

---

## License

Licensing policy is not yet finalized for the public-test candidate; formal license selection and license documentation are scheduled for Phase 8E.
