# GearCube Lab Documentation Index

Welcome to the canonical documentation tree for **GearCube Lab**.
The live application is publicly hosted at [https://yi-ting-ee13.github.io/GearCube-Lab/](https://yi-ting-ee13.github.io/GearCube-Lab/).

This directory contains the current specifications, architectural contracts, development protocols, and decision records for the project, together with explicitly preserved historical plans and research evidence.

---

## 1. Documentation Structure & Map

```text
docs/
├── README.md                           # This index and documentation navigation guide
├── project/
│   └── PROJECT_BLUEPRINT.md            # Primary current product blueprint and scope
├── reference/
│   └── STANDARD_GEAR_CUBE_SPEC.md      # Canonical standard Gear Cube reference model specification
├── characterization/
│   ├── PHYSICAL_CHARACTERIZATION_PROTOCOL.md # Optional physical characterization protocol
│   └── OBSERVATION_TEMPLATE.md         # Reusable operator observation recording form
├── architecture/
│   ├── SYSTEM_ARCHITECTURE.md          # High-level architecture, module boundaries, & data flows
│   ├── PUZZLE_CONTRACTS.md             # Core type contracts, state models, kinematics, & solver APIs
│   ├── GEAR_CUBE_STATE_MODEL.md        # Canonical discrete state schema & transition algebra
│   └── KINEMATIC_CONTRACT.md           # Continuous 3D physical kinematics & animation contract
├── development/
│   ├── DEVELOPMENT_GUIDE.md            # Environment policies, coding standards, & workflows
│   ├── ROADMAP.md                      # Dependency-ordered project lifecycle (Phases 0A–9) & gates
│   ├── TEST_STRATEGY.md                # 12-level testing pyramid, property invariants, & validation
│   ├── PHASE_1A_IMPLEMENTATION_PLAN.md # Phase 1A project bootstrap & package boundary plan
│   ├── PHASE_1B_IMPLEMENTATION_PLAN.md # Phase 1B canonical state / value types & validation plan
│   ├── PHASE_1C_IMPLEMENTATION_PLAN.md # Phase 1C direct canonical move-transition engine plan
│   ├── PHASE_1D_IMPLEMENTATION_PLAN.md # Phase 1D SpatialFrame, Materialization & Serialization plan
│   ├── PHASE_1E_IMPLEMENTATION_PLAN.md # Phase 1E Group Invariants & Exhaustive Reachable State Closure plan
│   ├── PHASE_2_IMPLEMENTATION_PLAN.md  # Phase 2 3D Graphics & Kinematic Animation plan
│   ├── PHASE_3_IMPLEMENTATION_PLAN.md  # Phase 3 Interactive UI, History & Scramble plan (Accepted)
│   ├── PHASE_4_IMPLEMENTATION_PLAN.md  # Phase 4 Classical Solver Infrastructure plan (Accepted)
│   ├── PHASE_5_IMPLEMENTATION_PLAN.md  # Phase 5 Research & Benchmarking Harness plan (Preflight Accepted)
│   ├── PHASE_5D_IMPLEMENTATION_PLAN.md # Phase 5D Browser Research Mode plan (Accepted)
│   ├── PHASE_8_ACCEPTANCE_RECORD.md    # Phase 8 Public-Test-Readiness Acceptance Record
│   ├── ADR_0004_CENTER_ORIENTATION_PLAN.md # ADR-0004 Center orientation semantics plan
│   ├── ADR_0005_CANONICAL_MOVE_TRANSITION_PLAN.md # ADR-0005 Canonical move transition plan
│   ├── ADR_0005_TRANSITION_REPAIR_PLAN.md # ADR-0005 Canonical transition repair plan
│   └── POST_PHASE4_DOCUMENTATION_RECONCILIATION.md # Post-Phase 4 repo-wide documentation audit record
├── research/
│   ├── PHASE_5C_EXPERIMENT_PLAN.md     # Accepted Phase 5C research plan (historical)
│   └── PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md # Accepted Phase 5C empirical report
├── operations/
│   ├── DEPLOYMENT.md                   # Static HTTPS hosting (GitHub Pages), Web Worker rules, & security posture
│   └── REPOSITORY_GOVERNANCE.md        # Main branch protection, checks, qualification, & deployment contract
├── decisions/
│   ├── ADR-0001-FOUNDATION.md          # Architecture Decision Record: Core foundations & tech stack
│   ├── ADR-0002-STANDARD-GEAR-CUBE-REFERENCE.md # Decision Record: Standard Gear Cube model adoption
│   ├── ADR-0003-CORE-STATE-REPRESENTATION.md # Decision Record: Canonical state & derived views
│   ├── ADR-0004-CENTER-ORIENTATION-SEMANTICS.md # Decision Record (Accepted): Center orientation quotient & derivation
│   ├── ADR-0005-CANONICAL-MOVE-TRANSITION-ALGEBRA.md # Decision Record (Accepted): Canonical move transition algebra
│   └── ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md # Decision Record (Accepted): View-based kinematics & renderer quotients
```

---

## 2. Status Taxonomy

Throughout all documents in `docs/`, technical specifications and mechanical assumptions are strictly tagged with the following statuses:

| Status Tag | Meaning & Governance Rule |
| :--- | :--- |
| **`SOURCE_SUPPORTED`** | Grounded directly in credible, cited published literature or primary inventor records. |
| **`PROJECT_DECISION`** | Formally agreed upon architectural decisions recorded in an Architecture Decision Record (ADR). |
| **`VERIFIED`** | Empirically or mathematically confirmed through reproducible physical tests or formal proofs. |
| **`OBSERVED`** | Directly witnessed and documented in an operator observation log for a specific trial. |
| **`INFERRED`** | Logically or mathematically deduced from verified or observed data, pending confirmation. |
| **`PROPOSED`** | Recommended technical direction under evaluation; subject to change before milestone sign-off. |
| **`OPEN` / `TO VERIFY`** | Unverified hypothesis or unknown physical parameter; **prohibited** from being used as a test oracle or hardcoded logic until empirically verified. |
| **`OPTIONAL_PHYSICAL_VALIDATION`** | Characterization items deferred for optional comparative hardware research. |
| **`INCONCLUSIVE`** | Experiment was executed, but evidence was ambiguous or inconsistent; requires re-testing. |

---

## 3. Document Classes, Lifecycle & Authority

Evidence status and document lifecycle answer different questions. An evidence status describes the support for a claim inside a document; a lifecycle describes whether the document is current guidance, a preserved decision, a historical record, or immutable evidence; a milestone status describes project delivery progress. A `VERIFIED` claim can therefore live in a historical acceptance record without making that record the current implementation authority.

| Document lifecycle | Repository role | Current-reading rule |
| :--- | :--- | :--- |
| **`LIVING / NORMATIVE`** | Current architecture, state, product, development, and test contracts | Follow it for current implementation and contribution decisions. |
| **`ADR / DECISION`** | Decision rationale, alternatives, and consequences | Preserve the original context; use explicit supersession metadata when later decisions refine it. |
| **`HISTORICAL / AS-OF`** | Completed plans, acceptance records, and audit snapshots | Preserve facts and counts; do not treat old instructions or snapshots as current baselines. |
| **`RESEARCH / EMPIRICAL`** | Accepted experiment plans and measured reports | Preserve measured results; current verifier and provenance statements must remain accurate. |
| **`RAW / DERIVED EVIDENCE`** | Committed benchmark inputs and generated outputs | Treat bytes as evidence; do not edit them editorially. |
| **`OPERATIONAL / CURRENT`** | Governance, deployment, and qualification contracts | Follow the current operational contract and verify live external state where required. |

For current implementation questions, use this authority order: `AGENTS.md` and the active governance/operations contracts; current architecture and state contracts; the current roadmap and test strategy; then the accepted ADRs and research records for rationale and evidence. Historical documents remain valuable context, but their `As-of`, `Superseded by`, or `Normative authority` metadata controls how they are read.

---

## 4. Quick Document Navigator

- **Product Vision & Requirements:** [`docs/project/PROJECT_BLUEPRINT.md`](project/PROJECT_BLUEPRINT.md)
- **Standard Gear Cube Specification:** [`docs/reference/STANDARD_GEAR_CUBE_SPEC.md`](reference/STANDARD_GEAR_CUBE_SPEC.md)
- **Canonical Discrete State Model:** [`docs/architecture/GEAR_CUBE_STATE_MODEL.md`](architecture/GEAR_CUBE_STATE_MODEL.md)
- **Continuous Kinematic Contract:** [`docs/architecture/KINEMATIC_CONTRACT.md`](architecture/KINEMATIC_CONTRACT.md)
- **Reference Model Decision (ADR-0002):** [`docs/decisions/ADR-0002-STANDARD-GEAR-CUBE-REFERENCE.md`](decisions/ADR-0002-STANDARD-GEAR-CUBE-REFERENCE.md)
- **Canonical State Representation (ADR-0003):** [`docs/decisions/ADR-0003-CORE-STATE-REPRESENTATION.md`](decisions/ADR-0003-CORE-STATE-REPRESENTATION.md)
- **Physical Characterization Protocol (Optional):** [`docs/characterization/PHYSICAL_CHARACTERIZATION_PROTOCOL.md`](characterization/PHYSICAL_CHARACTERIZATION_PROTOCOL.md)
- **Observation Recording Template:** [`docs/characterization/OBSERVATION_TEMPLATE.md`](characterization/OBSERVATION_TEMPLATE.md)
- **Module Boundaries & Data Flow:** [`docs/architecture/SYSTEM_ARCHITECTURE.md`](architecture/SYSTEM_ARCHITECTURE.md)
- **Type Interfaces & Contracts:** [`docs/architecture/PUZZLE_CONTRACTS.md`](architecture/PUZZLE_CONTRACTS.md)
- **Phase Breakdown & Milestones:** [`docs/development/ROADMAP.md`](development/ROADMAP.md)
- **Test Invariants & Protocols:** [`docs/development/TEST_STRATEGY.md`](development/TEST_STRATEGY.md)
- **Phase 1A Bootstrap Plan:** [`docs/development/PHASE_1A_IMPLEMENTATION_PLAN.md`](development/PHASE_1A_IMPLEMENTATION_PLAN.md)
- **Phase 1B State & Validation Plan:** [`docs/development/PHASE_1B_IMPLEMENTATION_PLAN.md`](development/PHASE_1B_IMPLEMENTATION_PLAN.md)
- **Phase 1C Move-Transition Engine Plan:** [`docs/development/PHASE_1C_IMPLEMENTATION_PLAN.md`](development/PHASE_1C_IMPLEMENTATION_PLAN.md)
- **Phase 1D Materialization & Serialization Plan:** [`docs/development/PHASE_1D_IMPLEMENTATION_PLAN.md`](development/PHASE_1D_IMPLEMENTATION_PLAN.md)
- **Phase 1E Exhaustive Reachability Plan:** [`docs/development/PHASE_1E_IMPLEMENTATION_PLAN.md`](development/PHASE_1E_IMPLEMENTATION_PLAN.md)
- **Phase 2 Graphics & Kinematics Plan:** [`docs/development/PHASE_2_IMPLEMENTATION_PLAN.md`](development/PHASE_2_IMPLEMENTATION_PLAN.md)
- **Phase 3 Interactive UI, History & Scramble Plan (Accepted):** [`docs/development/PHASE_3_IMPLEMENTATION_PLAN.md`](development/PHASE_3_IMPLEMENTATION_PLAN.md)
- **Phase 4 Classical Solver Infrastructure Plan (Accepted):** [`docs/development/PHASE_4_IMPLEMENTATION_PLAN.md`](development/PHASE_4_IMPLEMENTATION_PLAN.md)
- **Phase 8 Product Completion & Public-Test Readiness Plan (Accepted):** [`docs/development/PHASE_8_IMPLEMENTATION_PLAN.md`](development/PHASE_8_IMPLEMENTATION_PLAN.md)
- **Phase 8 Acceptance Record (Qualified):** [`docs/development/PHASE_8_ACCEPTANCE_RECORD.md`](development/PHASE_8_ACCEPTANCE_RECORD.md)
- **Phase 5 Research & Benchmarking Harness Plan (Completed & Accepted):** [`docs/development/PHASE_5_IMPLEMENTATION_PLAN.md`](development/PHASE_5_IMPLEMENTATION_PLAN.md)
- **Phase 5D Browser Research Mode Plan (Implementation Accepted):** [`docs/development/PHASE_5D_IMPLEMENTATION_PLAN.md`](development/PHASE_5D_IMPLEMENTATION_PLAN.md)
- **Phase 5C Experiment Plan — Accepted:** [`docs/research/PHASE_5C_EXPERIMENT_PLAN.md`](research/PHASE_5C_EXPERIMENT_PLAN.md)
- **Phase 5C Classical Solver Benchmark Report — Accepted:** [`docs/research/PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md`](research/PHASE_5_CLASSICAL_SOLVER_BENCHMARK_REPORT.md)
- **Post-Phase 4 Documentation Reconciliation Record:** [`docs/development/POST_PHASE4_DOCUMENTATION_RECONCILIATION.md`](development/POST_PHASE4_DOCUMENTATION_RECONCILIATION.md)
- **ADR-0004 Center Orientation Plan:** [`docs/development/ADR_0004_CENTER_ORIENTATION_PLAN.md`](development/ADR_0004_CENTER_ORIENTATION_PLAN.md)
- **ADR-0005 Canonical Move Transition Plan:** [`docs/development/ADR_0005_CANONICAL_MOVE_TRANSITION_PLAN.md`](development/ADR_0005_CANONICAL_MOVE_TRANSITION_PLAN.md)
- **ADR-0005 Transition Repair Plan:** [`docs/development/ADR_0005_TRANSITION_REPAIR_PLAN.md`](development/ADR_0005_TRANSITION_REPAIR_PLAN.md)
- **Developer Guidelines & Tooling:** [`docs/development/DEVELOPMENT_GUIDE.md`](development/DEVELOPMENT_GUIDE.md)
- **Production Deployment & Security:** [`docs/operations/DEPLOYMENT.md`](operations/DEPLOYMENT.md)
- **Main Branch Governance & Contribution Contract:** [`docs/operations/REPOSITORY_GOVERNANCE.md`](operations/REPOSITORY_GOVERNANCE.md)
- **Foundational Architecture Decisions (ADR-0001):** [`docs/decisions/ADR-0001-FOUNDATION.md`](decisions/ADR-0001-FOUNDATION.md)
- **Center Orientation Semantics Decision (ADR-0004 - Accepted):** [`docs/decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md`](decisions/ADR-0004-CENTER-ORIENTATION-SEMANTICS.md)
- **Canonical Move Transition Algebra Decision (ADR-0005 - Accepted):** [`docs/decisions/ADR-0005-CANONICAL-MOVE-TRANSITION-ALGEBRA.md`](decisions/ADR-0005-CANONICAL-MOVE-TRANSITION-ALGEBRA.md)
- **View-Based Kinematics & Renderer Quotients Decision (ADR-0006 - Accepted):** [`docs/decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md`](decisions/ADR-0006-VIEW-BASED-KINEMATICS-AND-RENDERER-QUOTIENTS.md)
