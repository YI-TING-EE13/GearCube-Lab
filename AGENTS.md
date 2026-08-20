# AGENTS.md — Repository Governance & Agent Operational Rules

> **Target Repository:** GearCube Lab
> **Applicability:** Mandatory for all AI agents, subagents, and automated tools working on this codebase.

---

## 1. Core Operating Philosophy

1. **Documentation-First & Contract-First:**
   Every architectural decision, state contract, move transition rule, and interface boundary MUST be formalized in [`docs/`](docs/README.md) before writing implementation code. Code serves as the concrete execution of documentation contracts, not the reverse.

2. **Domain Core Independence:**
   The Puzzle Domain Core (`packages/core` or `src/core`) is the **sole source of truth**. Under no circumstances may 3D rendering meshes, visual scene graphs, UI components, or state stores (e.g., Zustand) own or dictate discrete puzzle state. The Core must have zero runtime dependencies on React, Three.js, R3F, Zustand, Vite, Web APIs, DOM, or ML frameworks.

3. **Empirical Fact vs. Hypothesis Separation:**
   No mechanical assumption (such as gear tooth counts, gear ratios, cycle periods, center-layer angles, or parity invariants) may be codified as canonical truth without documented empirical or mathematical evidence. All unverified assumptions must be explicitly tagged as `OPEN` or `TO VERIFY`.

4. **Scope Discipline:**
   Agents must strictly constrain work to the currently assigned roadmap phase and explicit user requirements. Do not prematurely scaffold future phases, install unnecessary dependencies, or introduce unrequested refactorings.

---

## 2. Governance Skill Routing

Agents must conceptually follow and route tasks through the established project governance protocols:

- **`$project-governance-bootstrap`**: Invoked when establishing or modifying repository-wide governance baselines, structure, and foundational rules.
- **`$governance-task-planning`**: Invoked before starting multi-step or multi-file tasks to construct a dependency-ordered plan with clear verification gates.
- **`$architecture-contract-review`**: Invoked whenever changing public interfaces, state schemas, move definitions, or cross-module boundary contracts.
- **`$documentation-sync`**: Invoked at the conclusion of every code change to guarantee that architecture blueprints, API contracts, and roadmap statuses remain 100% synchronized with implementation.
- **`$technical-writing-editorial-review`**: Invoked on all documentation changes to verify clarity, tone restraint, structural consistency, and link validity.

---

## 3. Strict Prohibitions & Invariants

| Invariant / Rule | Description & Enforcement |
| :--- | :--- |
| **No Renderer State as Truth** | Rendering objects (meshes, group rotations, transforms) must never store puzzle state. All visual models derive their transformations from discrete state via the Kinematic Model. |
| **Zero Core Framework Coupling** | Core TypeScript code must compile in pure Node/Deno/browser environments with zero dependencies. |
| **No Premature Mechanics Codification** | Do not invent gear tooth ratios or state counts to satisfy test cases without empirical confirmation (see [Phase 0B](docs/development/ROADMAP.md)). |
| **No Destructive Overwriting** | Never overwrite, revert, or clean up unrelated user files or dirty worktree modifications. |
| **No Unauthorized Remote Operations** | Never execute `git push`, `git merge`, create remote tags, or trigger production releases without explicit user confirmation. |
| **No False Claims** | Never claim tests passed, builds succeeded, or performance targets were achieved without executing verifiable terminal commands and including their outputs in the report. |
| **Separation of Acceptance & Repair** | If an acceptance gate check fails, clearly report the failure (`FAIL`) and document required repair actions rather than masking or bypassing the gate. |

---

## 4. Documentation Synchronization Requirement

Whenever a task modifies, adds, or deprecates:
- A public TypeScript interface or type contract,
- A puzzle state transition or move legality rule,
- A module boundary or dependency direction,
- A tool, package manager, or environment requirement,
- A phase deliverable or milestone status,

the corresponding documents in [`docs/`](docs/README.md) **MUST be updated in the exact same task/commit**. Documentation drift is treated as a critical build failure.

---

## 5. Verification & Reporting Protocol

Every task completion report returned by an agent must contain:

1. **`BASELINE`**: Repository path, Git branch, commit HEAD, and initial worktree state.
2. **`FILES`**: Full list of created, modified, or deleted files with specific rationale.
3. **`ARCHITECTURE`**: Summary of contract boundaries preserved or updated.
4. **`VERIFIED_VS_OPEN`**: Clear distinction between verified facts and unresolved open questions.
5. **`VERIFICATION`**: Exact commands executed, test outputs, and link validation results.
6. **`DIFF`**: `git diff --stat` output summarizing changes.
7. **`FINAL_STATUS`**: Clear status code (e.g., `PHASE_XX_PASS` or `PHASE_XX_FAIL`).
8. **`NEXT_RECOMMENDED_TASK`**: The next logical step according to [`docs/development/ROADMAP.md`](docs/development/ROADMAP.md).
