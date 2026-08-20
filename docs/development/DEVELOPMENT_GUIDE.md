# DEVELOPMENT_GUIDE.md — Engineering Standards & Development Workflows

> **Document Status:** `DECIDED`
> **Applicability:** All human engineers and AI coding agents contributing to GearCube Lab.

---

## 1. Environment Philosophy & Tooling Standards

GearCube Lab relies on modern, strict, and reproducible development tooling:

- **TypeScript / Node Environment:**
  - Standard JavaScript/TypeScript package manager: `npm` (initial low-complexity default).
  - Target Node.js version: Active LTS (v20+ or v22+).
  - Bundler & Dev Server: **Vite** for rapid hot module replacement and optimized static distribution.
- **Python / Machine Learning Environment:**
  - Environment & Dependency Manager: **`uv`** exclusively. All virtual environments, tool invocations, and dependencies in `ml/` must be managed via `uv run` and `uv pip`.
  - Python version: To be selected later based on actual compatibility requirements of PyTorch, ML, and CV dependencies (no premature version lock).

---

## 2. Coding & Architecture Standards

### 2.1. TypeScript Strictness
All TypeScript configuration files must enforce maximum compiler strictness:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### 2.2. Separation of Domain Logic and Framework Code
- Pure business and mathematical logic lives in `packages/core` and `packages/kinematics`.
- Framework-specific code (React hooks, Three.js shaders, Zustand stores, DOM listeners) lives strictly in `packages/ui` and `packages/renderer`.
- Never import React or Three.js inside `core` or `solvers`.

### 2.3. Dependency Management Rules
- **Domain Core:** Exactly zero external runtime dependencies.
- **Solvers:** Zero UI/rendering dependencies.
- **UI / Renderer:** Keep dependencies minimal, focused on standard Three.js/R3F ecosystem.
- Always commit lockfiles (`package-lock.json`, `uv.lock`) once dependencies are created in Phase 1+.

---

## 3. Branching, Task Discipline & Git Policy

### 3.1. Phase-Scoped Task Discipline
- Every development task must explicitly correspond to a single roadmap milestone defined in [`docs/development/ROADMAP.md`](ROADMAP.md).
- Do not mix tasks across different phases (e.g., do not scaffold UI components while working on domain state logic).

### 3.2. Git Operation Rules
- **No Unauthorized Remote Operations:** Agents must never execute `git push`, `git merge`, or create remote tags without explicit user authorization.
- **Preserve Unrelated Work:** Never overwrite, revert, or clean up uncommitted or unrelated user files.
- **Commit Messages:** Follow conventional commits format:
  - `docs(phase-0a): establish project governance and canonical blueprint`
  - `feat(core): implement discrete move permutation validator`
  - `test(solvers): add BFS optimal path verification suite`

---

## 4. Error Handling & Logging Standards

- **Domain Errors:** Throw domain-specific Error subclasses (e.g., `IllegalMoveError`, `InvalidStateError`) with structured context properties.
- **UI Degradation:** The 3D viewport and main UI must catch worker or domain exceptions gracefully, displaying unobtrusive notification banners rather than crashing the application.
- **Console Hygiene:** Production builds must strip verbose debugging logs. Benchmarking and telemetry logs should be routed through dedicated structured exporter utilities.

---

## 5. Documentation Synchronization Protocol

> [!IMPORTANT]
> **Mandatory Documentation Sync:** Any pull request or task that alters public interfaces, move semantics, state schemas, roadmap milestones, or operational policies **must update the relevant markdown files in `docs/` within the exact same task**. Code and documentation must never diverge.

---

## 6. Future Development Commands Reference

*(The following commands represent future development workflows once packages and dependencies are bootstrapped in Phase 1+.)*

```bash
# Future TypeScript / Node workflows (Phase 1+)
npm install              # Install repository dependencies
npm run dev              # Start Vite local development server
npm run build            # Compile production static bundle
npm run test             # Run full Vitest unit test suite
npm run test:e2e         # Run Playwright browser interaction tests
npm run lint             # Execute ESLint and type checking
npm run typecheck        # Run tsc --noEmit

# Future Python ML workflows (Phase 6+)
uv venv                  # Create isolated Python virtual environment
uv pip install -r ml/requirements.txt # Install ML dependencies
uv run python ml/train.py             # Train neural heuristic model
uv run pytest ml/tests/               # Run ML test suite
```
