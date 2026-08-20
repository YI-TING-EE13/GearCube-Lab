# PHYSICAL_CHARACTERIZATION_PROTOCOL.md — Physical Characterization Protocol

> **Target Puzzle Reference:** Daiso Rotating 3D Gear Puzzle (SKU: `4550480834955`)
> **Document Status:** `DECIDED` (Protocol Specification Baseline)
> **Applicability:** Mandatory experimental protocol for human operator execution and AI evidence evaluation in Phase 0B.

---

## 1. Purpose and Scope

### 1.1. Why Physical Characterization Gates Core Implementation
The mathematical structure of twisty gear puzzles cannot be safely guessed from external visual similarity to other puzzles (e.g., Meffert's Gear Cube, QiYi Gear Cube, or generic 3x3x3 Rubik's cubes). Codifying unverified assumptions into the domain core risks building on an invalid group structure, incorrect move algebras, or inaccurate state spaces.

This protocol establishes a rigorous, reproducible, observation-first, and non-destructive experimental procedure to observe, document, and categorize the physical mechanics of the reference Daiso puzzle before software implementation in Phase 1 (`packages/core`) or Phase 2 (`packages/kinematics`).

### 1.2. Scope Bounding
- **What this protocol does:** Defines structured experiment matrices, evidence capture standards, reference orientation setups, and safety limits to observe discrete move semantics and continuous gear coupling.
- **What this protocol does NOT attempt to do:**
  - It does not require full destructive mechanical teardown or internal core disassembly.
  - It does not force proof of unobservable internal mechanics if safe, observable mathematical abstractions suffice for discrete solver modeling.
  - It does not assume any predetermined mechanical result (e.g., gear ratio, tooth count, cycle period, or axis symmetry).

---

## 2. Evidence Status Vocabulary

Every recorded mechanical statement and observation must be categorized under one of the following formal statuses:

| Status Tag | Definition & Governance Rule |
| :--- | :--- |
| **`VERIFIED`** | Empirically proven through reproducible physical observation with photo/video evidence or mathematically proven from formal axioms. Sufficient to establish canonical software contracts. |
| **`OBSERVED`** | Directly witnessed and documented in an operator observation log for a specific trial, pending multi-trial cross-verification or mathematical synthesis. |
| **`INFERRED`** | Logically or mathematically deduced from `VERIFIED` or `OBSERVED` data, pending empirical confirmation. |
| **`PROPOSED`** | Working engineering hypothesis or candidate design model under active evaluation. |
| **`OPEN` / `TO VERIFY`** | Unverified physical parameter or unresolved question; **must not** be hardcoded into core logic or test oracles. |
| **`INCONCLUSIVE`** | Experiment was executed, but evidence was ambiguous, contradictory, or disrupted by mechanical binding; requires re-testing. |

---

## 3. Operator and AI Evidence Roles

To maintain scientific integrity, the boundary between human physical action and AI analysis is strictly separated:

### 3.1. Human Operator (Physical Custodian)
- **Authorized Actions:**
  - Physically holds and manipulates the physical Daiso Gear Cube.
  - Captures and uploads phone photographs, videos, and angle measurements.
  - Assesses tactile resistance, mechanical play, and physical gear mesh behavior.
  - Restores the physical puzzle to a documented reference state after each trial.
- **Strict Boundary:** The operator reports raw visual/tactile observations without feeling pressured to interpret mathematical group theory or confirm pre-conceived mechanisms.

### 3.2. Antigravity AI (Research Assistant)
- **Authorized Actions:**
  - Designs structured experimental protocols and observation templates.
  - Ingests and analyzes operator-provided logs, photographs, and video descriptions.
  - Synthesizes observations into candidate state schemas, move definitions, and kinematic equations.
  - Identifies ambiguities and designs targeted follow-up verification trials.
- **Strict Prohibition:** Antigravity **cannot** physically manipulate the cube, **cannot** claim observations occurred unless reported by the user, and **must not** convert unverified internet claims into physical facts.

---

## 4. Physical Safety & Stop Conditions

The reference puzzle is lightweight consumer plastic. The following safety rules prevent mechanical damage and experimental distortion:

1. **Conservative Manual Force:** Apply gentle, steady manual torque during face turns. Never force a turn through strong mechanical resistance.
2. **Immediate Stop Triggers:** Stop the experiment immediately if any of the following occur:
   - Sudden mechanical binding or jamming.
   - Audible plastic cracking, clicking, or internal tooth skipping.
   - Visible gear tooth deformation or shaft warping.
   - Misalignment where intermediate gears jump out of mesh.
3. **No Non-Authorized Disassembly:** Do not pry apart pieces, remove center caps, or unscrew core shafts in Phase 0B unless explicitly requested in a dedicated protocol.
4. **No Destructive Marking:** Do not use permanent markers, adhesives, or abrasive tools on the puzzle faces.
5. **Documented Initial State:** Every experiment must start from a documented reference orientation to guarantee recoverability.

---

## 5. Reference Orientation & Observational Component Conventions

Because twisty puzzles can be rotated in 3D space, observational labels must be established independently of any assumptions about internal core mechanisms:

### 5.1. Observational Coordinate System
We establish six static observational faces relative to the operator's view:
- **`OBS-F` (Front):** Face directly facing the operator.
- **`OBS-U` (Up):** Face facing upward.
- **`OBS-D` (Down):** Face facing downward.
- **`OBS-B` (Back):** Face facing away from the operator.
- **`OBS-R` (Right):** Face to the operator's right.
- **`OBS-L` (Left):** Face to the operator's left.

### 5.2. Reference Orientation Baseline
1. Place the solved Daiso puzzle on a flat surface with a chosen distinct face as `OBS-F` and a chosen distinct top face as `OBS-U`.
2. Capture a 6-face photograph set (the **Reference Set**).
3. Document the primary visible color layout / colored face feature on each face:
   - `OBS-U`: [Color/Pattern]
   - `OBS-D`: [Color/Pattern]
   - `OBS-F`: [Color/Pattern]
   - `OBS-B`: [Color/Pattern]
   - `OBS-R`: [Color/Pattern]
   - `OBS-L`: [Color/Pattern]
4. Maintain this spatial orientation convention across all subsequent experiments.

### 5.3. Observational Component Descriptors (Non-Canonical)
> [!IMPORTANT]
> **Taxonomy Neutrality Note:** The canonical piece taxonomy remains `OPEN`. Positional descriptors and temporary component IDs (e.g., `OBS-COMP-xx`, "visible colored face feature", "gear-shaped visible component at position (F, U, R)") are purely observational recording aids. They do **not** define canonical puzzle-piece classes or internal mechanical structures.

---

## 6. Evidence Capture Guidelines

1. **Camera Setup:** A standard smartphone camera is fully sufficient. No specialized optical equipment is required.
2. **Lighting:** Ensure even, diffused lighting that avoids strong glare on colored surfaces or gear teeth.
3. **Video Recording:**
   - Record continuous operations at standard 30 FPS or 60 FPS.
   - Maintain a stable perspective showing both the driving face and the perpendicular intermediate components.
4. **Photographs:**
   - Capture clean orthogonal (straight-on) photos of affected faces before and after the operation.
   - Include close-ups of gear-shaped component tooth orientations where rotational phase is being evaluated.

---

## 7. Evidence Tiers & Prioritization

To avoid overwhelming the human operator, physical characterization is partitioned into three priority tiers:

```text
+-----------------------------------------------------------------------------------+
| Tier A — Discrete Core Blocking (Required for Phase 1 Engine)                     |
|  * Observed face move set and endpoint angular quantization                       |
|  * CW (+180°) vs. CCW (-180°) discrete state equivalence/distinctness             |
|  * Endpoint transformation mapping of state-relevant observable components        |
|  * Whether visible component phase/orientation participates in state equality    |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| Tier B — Kinematic Animation Blocking (Required for Phase 2 3D Viewport)          |
|  * Visibly moving component sets and intermediate coupling axes                  |
|  * Angular displacement and approximate gear transmission ratios                  |
|  * Uniformity of motion and notable intermediate visual poses                     |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
| Tier C — Optional High-Fidelity Geometry (Non-Blocking for Core/Kinematics)        |
|  * Exact gear tooth count and tooth profile geometry                              |
|  * Physical dimension measurements and manufacturing clearances                   |
|  * Internal core spider/shaft topology                                            |
+-----------------------------------------------------------------------------------+
```

---

## 8. Experiment Matrix & Protocols

### Family 1: Reference State Capture (REF)

#### `EXP-REF-01`: Baseline Reference State Documentation
- **Evidence Tier:** Tier A (Core Blocking)
- **Objective:** Document the pristine reference physical state across all 6 observational faces and establish the standard reference orientation.
- **Prerequisite:** Puzzle in pristine reference state.
- **Initial State:** Solved cube aligned with observational axes (`OBS-U`, `OBS-F`, etc.).
- **Physical Operation:** None (static inspection).
- **Observations to Record:**
  - Visible color layout across all 6 faces.
  - Visual alignment of all visible gear-shaped components (e.g., whether gear teeth align flush with face boundaries).
  - Any visible asymmetric markings, logos, or manufacturing textures.
- **Required Evidence:** 6 photos (one for each observational face: U, D, F, B, R, L).
- **Reset/Recovery:** N/A.
- **Contract Decision Informed:** Solved target state contract (`isSolved`), initial `PuzzleState` definition.

---

### Family 2: Legal Operation Envelope (MOVE)

#### `EXP-MOVE-01`: Face Operation Endpoint and Intermediate Pose Exploration
- **Evidence Tier:** Tier A (Core Blocking)
- **Objective:** Determine whether candidate face operations have stable endpoints at ~90° or ~180°, determine the physical availability of subsequent face operations from intermediate poses, and observe whether behavior differs across observational faces/axes.
- **Prerequisite:** `EXP-REF-01` completed.
- **Initial State:** Solved reference state.
- **Physical Operation:**
  1. Slowly turn face `OBS-F` by approximately 90°.
     - Observe whether the face can physically rest at ~90° without manual holding force.
     - Without applying excessive force, test whether candidate operations on other perpendicular faces (e.g., `OBS-R`, `OBS-U`) or parallel face (`OBS-B`) appear:
       - `available`
       - `not available`
       - `partially available / mechanically constrained`
       - `uncertain`
       - `not safely testable`
  2. Continue turning `OBS-F` to approximately 180°.
     - Observe whether a stable mechanical endpoint is reached.
     - Test which candidate operations appear available from this 180° state.
  3. Return to solved reference state. Repeat the same exploration on at least two other distinct observational faces/axes (e.g., `OBS-R` and `OBS-U`).
- **Observations to Record:**
  - Can a face rest stably at ~90°?
  - Are subsequent operations physically available from the ~90° pose?
  - Does turning to ~180° yield a stable endpoint supporting subsequent operations?
  - Do all tested faces/axes exhibit identical operation envelope behavior, or are differences observed?
- **Required Evidence:** Photographs or video sequence of the ~90° pose and ~180° endpoint for each tested face.
- **Reset/Recovery:** Turn the tested face back by 180° to restore the solved reference state.
- **Contract Decision Informed:** Discrete `Move` definition, legal move generator (`getLegalMoves`), intermediate pose modeling.

---

### Family 3: Directional Semantics (DIR)

#### `EXP-DIR-01`: Directional Equivalence (+180° vs. -180°)
- **Evidence Tier:** Tier A (Core Blocking)
- **Objective:** Determine whether rotating a face clockwise (+180°) vs. counter-clockwise (-180°) from the solved reference state produces identical, inverse, or distinct discrete component configurations.
- **Prerequisite:** `EXP-REF-01`, `EXP-MOVE-01`.
- **Initial State:** Solved reference state.
- **Physical Operation:**
  - **Trial 1:** From Solved, apply $+180^\circ$ (Clockwise) on `OBS-F`. Record end state ($S_{\text{CW}}$). Return to Solved.
  - **Trial 2:** From Solved, apply $-180^\circ$ (Counter-Clockwise) on `OBS-F`. Record end state ($S_{\text{CCW}}$). Return to Solved.
- **Observations to Record:**
  - Compare visible component positions between $S_{\text{CW}}$ and $S_{\text{CCW}}$.
  - Compare visible component orientations between $S_{\text{CW}}$ and $S_{\text{CCW}}$.
  - Compare visible gear-shaped component rotational phases/patterns between $S_{\text{CW}}$ and $S_{\text{CCW}}$.
  - Record whether $S_{\text{CW}}$ and $S_{\text{CCW}}$ are visibly and mechanically indistinguishable, or distinct.
- **Required Evidence:** Photos of `OBS-F`, `OBS-U`, `OBS-R`, `OBS-L`, `OBS-D` for both trials.
- **Reset/Recovery:** Apply reverse 180° turn to return to Solved.
- **Contract Decision Informed:** Definition of `Move.turns` (whether `+1` and `-1` are distinct operators or an identical involution).

---

### Family 4: Endpoint State Mapping (STATE)

#### `EXP-STATE-01`: Single-Move Component Transformation Mapping
- **Evidence Tier:** Tier A (Core Blocking)
- **Objective:** Map which visible components change position, which components change orientation/phase, and which components remain fixed after a single 180° face turn on a representative face (`OBS-F`).
- **Prerequisite:** `EXP-REF-01`.
- **Initial State:** Solved reference state.
- **Physical Operation:** Apply one 180° turn on `OBS-F`.
- **Observations to Record:**
  - Positions and orientations of visible corner-region components: which changed position/orientation, which remained static?
  - Positions and rotational phases of gear-shaped components on the driving face and on the intermediate slice perpendicular to `OBS-F`.
  - State of the central face components.
- **Required Evidence:** Photos of all 6 faces after the single 180° turn.
- **Reset/Recovery:** Apply reverse 180° turn on `OBS-F`.
- **Contract Decision Informed:** Discrete `PuzzleState` candidate schema, `applyMove(state, move)` transition function.

---

### Family 5: Repeated-Operation Characterization (PERIOD)

#### `EXP-PERIOD-01`: Single-Axis Repeated Operation Cycle Exploration
- **Evidence Tier:** Tier A / Tier B
- **Objective:** Apply repeated identical 180° turns along a single axis from the solved reference state to observe after how many turns the visible puzzle state returns to initial identity, up to an operational workload cap.
- **Prerequisite:** `EXP-REF-01`, `EXP-STATE-01`.
- **Initial State:** Solved reference state.
- **Physical Operation:**
  - Apply repeated 180° turns on `OBS-F` in the same direction.
  - After each 180° turn ($k = 1, 2, 3, \dots$), inspect:
    1. Observable component positions.
    2. Observable component orientations.
    3. Observable gear-shaped component rotational phases/patterns.
  - **Workload / Observation Cap:** Stop when full observed identity is restored, or when $k = 24$ (operational observation cap).
  - **Early Stop Triggers:** Stop immediately if abnormal resistance, gear skipping, binding, or tracking uncertainty occurs.
- **Observations to Record:**
  - Value of $k$ where component positions return to starting state (if observed).
  - Value of $k$ where component orientations return to starting state (if observed).
  - Value of $k$ where gear-shaped component phase returns to starting state (if observed).
  - If full identity is not restored by $k = 24$, record outcome as `INCONCLUSIVE_WITHIN_CAP` (do not extrapolate period > 24).
- **Required Evidence:** Photo log at $k = 2, 4, 6, \dots$ until full restoration or cap reached.
- **Reset/Recovery:** Continue until full cycle completes, or reverse the exact count of applied moves.
- **Contract Decision Informed:** State periodicity property invariants ($F^N = I$), group order validation.

---

### Family 6: Continuous Kinematic Coupling (KIN)

#### `EXP-KIN-01`: Video-Based Intermediate Gear Coupling Observation
- **Evidence Tier:** Tier B (Kinematics Blocking)
- **Objective:** Record and observe continuous coupled motion between the driving face and intermediate gear-shaped components during a 180° rotation.
- **Prerequisite:** `EXP-MOVE-01`.
- **Initial State:** Solved reference state.
- **Physical Operation:** Slowly rotate `OBS-F` by 180° over ~5 seconds while recording video.
- **Observations to Record:**
  - Which intermediate components visibly rotate during the face turn?
  - Do intermediate components rotate around axes parallel to or perpendicular to the driving face axis?
  - Does motion appear smooth and continuous throughout the turn?
  - Approximate visual displacement of intermediate components relative to the driving face.
- **Required Evidence:** 1 continuous video clip (~5–10 seconds) focusing on intermediate component mesh.
- **Reset/Recovery:** Return face to solved orientation.
- **Contract Decision Informed:** `KinematicPlan` trajectory formulas, visual mesh rotation coupling ratios in Phase 2.

---

### Family 7: Optional Geometry Characterization (FIDELITY)

#### `EXP-FIDELITY-01`: Visible Gear Tooth Counting and Profile Inspection
- **Evidence Tier:** Tier C (Optional / Non-Blocking)
- **Objective:** Count visible teeth on gear-shaped components and inspect tooth profiles for 3D modeling accuracy.
- **Prerequisite:** `EXP-REF-01`.
- **Initial State:** Solved reference state.
- **Physical Operation:** Visual inspection with close-up photography.
- **Observations to Record:**
  - Visible tooth count per gear segment / wheel.
  - Visible tooth profile shape.
- **Required Evidence:** Close-up photograph of meshing gear-shaped components.
- **Reset/Recovery:** None.
- **Contract Decision Informed:** 3D GLTF asset modeling and visual skin assets in Phase 2.

---

## 9. Execution Batches & Workload Management

To manage operator effort, characterization is partitioned into sequential execution batches:

```text
===================================================================================
BATCH A: Initial Semantic Reconnaissance (Minimum First Operator Workload)
-----------------------------------------------------------------------------------
  1. EXP-REF-01   — Solved reference state 6-face photos
  2. EXP-MOVE-01  — Operation envelope & intermediate pose exploration (F, R, U)
  3. EXP-DIR-01   — Test CW (+180°) vs. CCW (-180°) on OBS-F
  4. EXP-STATE-01 — Document single 180° turn component changes on OBS-F
===================================================================================
                                      │ (Proceed upon Batch A evaluation)
                                      ▼
===================================================================================
BATCH B: State Invariants & Periodicity
-----------------------------------------------------------------------------------
  5. EXP-PERIOD-01 — Single-axis repeated turn cycle test (observation cap k <= 24)
===================================================================================
                                      │ (Proceed upon Batch B evaluation)
                                      ▼
===================================================================================
BATCH C: Kinematics Video Capture
-----------------------------------------------------------------------------------
  6. EXP-KIN-01    — Video recording of coupled intermediate component rotation
===================================================================================
                                      │ (Optional / Non-blocking)
                                      ▼
===================================================================================
BATCH D: High-Fidelity Geometry
-----------------------------------------------------------------------------------
  7. EXP-FIDELITY-01 — Tooth counting and visual geometry close-ups
===================================================================================
```

---

## 10. Batch A vs. Complete Phase 1 Evidence Gate

> [!IMPORTANT]
> **Scope Distinction:** **Batch A is an initial semantic reconnaissance**, designed to provide a lightweight first operator workload. It is **not** by itself sufficient to finalize all 6 face move transition tables in `packages/core`.

Before the Phase 1 Core move transition contracts can be finalized, the project must follow one of two evidence paths:

### Path A — Full Empirical Coverage
Relevant endpoint component transformations are physically observed and documented for every required observational face/action across all 3 axes.

### Path B — Evidence-Backed Symmetry Derivation
A formal Phase 0B analysis proves that all face operations can be derived by spatial rotational symmetry from representative measured moves, supported by physical confirmation of axis equivalence.

*(Phase 0B.1 does not assume Path B or axis symmetry in advance; the choice between Path A and Path B will be determined by the evidence gathered in Phase 0B.2 and synthesized in Phase 0B.3).*

---

## 11. Contract Decision Mapping Matrix

| Contract Question | Informing Experiments | Evidence Tier | Blocking For |
| :--- | :--- | :--- | :--- |
| What constitutes a legal discrete `Move`? | `EXP-MOVE-01`, `EXP-DIR-01` | Tier A | Phase 1 Core |
| Does `Move.turns` require a directional sign ($+1$ vs. $-1$)? | `EXP-DIR-01` | Tier A | Phase 1 Core |
| What observable component fields define `PuzzleState`? | `EXP-STATE-01`, `EXP-REF-01` | Tier A | Phase 1 Core |
| Does visible component phase/orientation participate in `isSolved()` and state equality? | `EXP-STATE-01`, `EXP-PERIOD-01` | Tier A | Phase 1 Core |
| What is the single-axis cycle invariant $F^N = I$? | `EXP-PERIOD-01` | Tier A | Phase 1 Tests |
| What continuous rotation trajectory does the renderer animate? | `EXP-KIN-01` | Tier B | Phase 2 Kinematics |
| What are the exact 3D gear mesh tooth counts? | `EXP-FIDELITY-01` | Tier C | Optional Phase 2+ |
