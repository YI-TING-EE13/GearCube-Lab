# GearCube Lab Documentation Index

Welcome to the canonical documentation tree for **GearCube Lab**.
This directory contains the definitive specifications, architectural contracts, development protocols, and decision records for the project.

---

## 1. Documentation Structure & Map

```text
docs/
├── README.md                           # This index and documentation navigation guide
├── project/
│   └── PROJECT_BLUEPRINT.md            # Primary 30-section long-term project blueprint
├── characterization/
│   ├── PHYSICAL_CHARACTERIZATION_PROTOCOL.md # Phase 0B empirical experiment protocol
│   └── OBSERVATION_TEMPLATE.md         # Reusable operator observation recording form
├── architecture/
│   ├── SYSTEM_ARCHITECTURE.md          # High-level architecture, module boundaries, & data flows
│   └── PUZZLE_CONTRACTS.md             # Core type contracts, state models, kinematics, & solver APIs
├── development/
│   ├── DEVELOPMENT_GUIDE.md            # Environment policies, coding standards, & workflows
│   ├── ROADMAP.md                      # Dependency-ordered project lifecycle (Phases 0A–8) & gates
│   └── TEST_STRATEGY.md                # 12-level testing pyramid, property invariants, & validation
├── operations/
│   └── DEPLOYMENT.md                   # Static HTTPS hosting, Web Worker rules, & security posture
└── decisions/
    └── ADR-0001-FOUNDATION.md          # Architecture Decision Record: Core foundations & tech stack
```

---

## 2. Status Taxonomy

Throughout all documents in `docs/`, technical specifications and mechanical assumptions are strictly tagged with the following statuses:

| Status Tag | Meaning & Governance Rule |
| :--- | :--- |
| **`VERIFIED`** | Empirically or mathematically confirmed through reproducible physical tests or formal proofs. |
| **`OBSERVED`** | Directly witnessed and documented in an operator observation log for a specific trial. |
| **`INFERRED`** | Logically or mathematically deduced from verified or observed data, pending confirmation. |
| **`DECIDED`** | Formally agreed upon architectural decisions recorded in an Architecture Decision Record (ADR). |
| **`PROPOSED`** | Recommended technical direction under evaluation; subject to change before milestone sign-off. |
| **`OPEN` / `TO VERIFY`** | Unverified hypothesis or unknown physical parameter; **prohibited** from being used as a test oracle or hardcoded logic until empirically verified. |
| **`INCONCLUSIVE`** | Experiment was executed, but evidence was ambiguous or inconsistent; requires re-testing. |

---

## 3. Quick Document Navigator

- **Product Vision & Requirements:** [`docs/project/PROJECT_BLUEPRINT.md`](project/PROJECT_BLUEPRINT.md)
- **Physical Characterization Protocol:** [`docs/characterization/PHYSICAL_CHARACTERIZATION_PROTOCOL.md`](characterization/PHYSICAL_CHARACTERIZATION_PROTOCOL.md)
- **Observation Recording Template:** [`docs/characterization/OBSERVATION_TEMPLATE.md`](characterization/OBSERVATION_TEMPLATE.md)
- **Module Boundaries & Data Flow:** [`docs/architecture/SYSTEM_ARCHITECTURE.md`](architecture/SYSTEM_ARCHITECTURE.md)
- **Type Interfaces & Contracts:** [`docs/architecture/PUZZLE_CONTRACTS.md`](architecture/PUZZLE_CONTRACTS.md)
- **Phase Breakdown & Milestones:** [`docs/development/ROADMAP.md`](development/ROADMAP.md)
- **Test Invariants & Protocols:** [`docs/development/TEST_STRATEGY.md`](development/TEST_STRATEGY.md)
- **Developer Guidelines & Tooling:** [`docs/development/DEVELOPMENT_GUIDE.md`](development/DEVELOPMENT_GUIDE.md)
- **Production Deployment & Security:** [`docs/operations/DEPLOYMENT.md`](operations/DEPLOYMENT.md)
- **Foundational Architecture Decisions:** [`docs/decisions/ADR-0001-FOUNDATION.md`](decisions/ADR-0001-FOUNDATION.md)
