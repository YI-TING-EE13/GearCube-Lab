# Phase 1A — Project Bootstrap & Core Package-Boundary Implementation Plan

> **Phase:** 1A (Project Bootstrap & Core Package Boundary)
> **Status:** `PLANNING / READY FOR REVIEW`
> **Target Subphase:** Phase 1A of Discrete Domain Core Engine
> **Authoritative Specifications:** [`PROJECT_BLUEPRINT.md`](../project/PROJECT_BLUEPRINT.md), [`SYSTEM_ARCHITECTURE.md`](../architecture/SYSTEM_ARCHITECTURE.md), [`PUZZLE_CONTRACTS.md`](../architecture/PUZZLE_CONTRACTS.md), [`GEAR_CUBE_STATE_MODEL.md`](../architecture/GEAR_CUBE_STATE_MODEL.md), [`KINEMATIC_CONTRACT.md`](../architecture/KINEMATIC_CONTRACT.md), [`STANDARD_GEAR_CUBE_SPEC.md`](../reference/STANDARD_GEAR_CUBE_SPEC.md), [`ADR-0001`](../decisions/ADR-0001-FOUNDATION.md), [`ADR-0002`](../decisions/ADR-0002-STANDARD-GEAR-CUBE-REFERENCE.md), [`ADR-0003`](../decisions/ADR-0003-CORE-STATE-REPRESENTATION.md), [`ROADMAP.md`](ROADMAP.md), [`TEST_STRATEGY.md`](TEST_STRATEGY.md)

---

## 1. Objective & Scope

Phase 1A establishes the foundational developer tooling, workspace isolation, and package boundaries for GearCube Lab. It delivers:
1. An **npm workspaces monorepo structure** (`apps/`, `packages/`).
2. A strictly isolated, pure TypeScript **`packages/core` package boundary** with zero runtime and dev dependencies.
3. A minimal **`apps/web` application shell** (Vite + React + TypeScript) that consumes `@gearcube/core` through native npm workspace resolution without custom bundler aliases.
4. A unified **TypeScript configuration hierarchy** and root-level **Vitest test harness**.
5. Automated **dependency boundary and quality gates** via a dedicated Node.js verification script (`scripts/check-core-deps.mjs`).

### Explicit Non-Goals for Phase 1A
- **No Mathematical Engine Implementation:** Canonical state representation, move transition tables ($B_X, B_Y, B_Z$), and validation algebra are deferred to **Phase 1B** and **Phase 1C**.
- **No 3D / Three.js / R3F Rendering:** 3D viewport, GLTF meshes, and kinematic animation engines belong to **Phase 2**.
- **No UI Controls / Scramble Generators:** Interactive buttons, history scrubbers, and stores belong to **Phase 3**.
- **No Solvers / Web Workers:** Search algorithms belong to **Phase 4**.
- **No Premature Package Scaffolding:** `packages/kinematics`, `packages/renderer`, `packages/ui`, `packages/solvers`, and `packages/vision` will **NOT** be created in Phase 1A.

---

## 2. Frozen Phase 0 Prerequisites

The mathematical and architectural contracts finalized and accepted in Phase 0 are immutable constraints:
- **Canonical Cardinality:** Strictly $24 \times 12^3 = \mathbf{41,472}$ reachable states in Cartesian domain.
- **Reference Corner Convention:** Fixed reference corner piece `DBL` at slot `DBL` ($(-1, -1, -1)$), free corner tetrad $T_{\text{free}} \in S_4$ supplying the 24-state `CornerConfiguration`.
- **Middle Slices:** Three independent orthogonal orbits in $V_4 \times \mathbb{Z}_3$ ($4 \times 3 = 12$ states each).
- **Physical Context:** Discrete 4-state `SpatialFrame` ($0 \dots 3$) and expanded $165,888 = 41,472 \times 4$ fixed-spatial state space.
- **Public Moves:** 6 outer faces $\times$ 2 directions (`CW` / `CCW`, defined observationally from outside the face) with intrinsic $180^\circ$ legal turn angle.
- **Boundary Invariants:** Pure Domain Core is the sole source of truth and has zero dependencies on rendering, UI, or browser APIs.

---

## 3. Package Manager & Workspace Strategy

### 3.1. Inherited ADR Decision
In accordance with [`ADR-0001`](../decisions/ADR-0001-FOUNDATION.md) Section 4.3:
- **Selected Package Manager:** **`npm workspaces`** (configured via root `package.json` `"workspaces": ["apps/*", "packages/*"]`).
- **Rationale:**
  1. **Inherited Architectural Decision:** Formally adopted in ADR-0001.
  2. **Zero Extra Tooling Surface:** Bundled natively with standard Node.js LTS; requires no external global package-manager installation on developer or CI environments.
  3. **Native Workspace Resolution:** Standard symlink handling natively supported by Node.js, Vite, and Vitest.
  4. **Single Deterministic Lockfile:** Monorepo dependencies managed via a single committed `package-lock.json`.
  5. **Sufficient for Scope:** Perfectly tailored for the initial two-workspace setup (`@gearcube/core` and `@gearcube/web`).

---

## 4. Workspace Package Identity & Dependency Ownership

### 4.1. Explicit Package Identities
All workspace packages are private, with explicit initial versions:
- **Root Package:** `"private": true`
- **`@gearcube/core`:** `"name": "@gearcube/core"`, `"version": "0.0.0"`, `"private": true`, `"type": "module"`
- **`@gearcube/web`:** `"name": "@gearcube/web"`, `"version": "0.0.0"`, `"private": true`, `"type": "module"`

### 4.2. Exact Local Workspace Dependency Linking
`apps/web` declares the local `@gearcube/core` dependency using the exact matching internal version:
```json
"dependencies": {
  "@gearcube/core": "0.0.0"
}
```
*(No wildcard `"*"`, no bundler alias, and no registry fallback).*

### 4.3. Frozen Dependency Ownership Hierarchy
- **Root Manifest (`package.json`):**
  - `"devDependencies"`: `typescript`, `vitest`, `@types/node`
- **`apps/web/package.json`:**
  - `"dependencies"`: `@gearcube/core` (`"0.0.0"`), `react`, `react-dom`
  - `"devDependencies"`: `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`
- **`packages/core/package.json`:**
  - `"dependencies"`: **`{}`** *(empty)*
  - `"optionalDependencies"`: **`{}`** *(or absent)*
  - `"peerDependencies"`: **`{}`** *(or absent)*
  - `"devDependencies"`: **`{}`** *(or absent — toolchain managed at root)*

---

## 5. Workspace Package Resolution Matrix (No Vite Alias)

### 5.1. Source-First Workspace Export Strategy
`@gearcube/core/package.json` configures standard package exports pointing to the Core source entry:
```json
{
  "name": "@gearcube/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```
*Note on Scope:* This is a Phase 1A source-first workspace/bootstrap strategy verified through TypeScript, Vitest, and Vite. It does not yet promise direct native-Node execution of the TypeScript source package. A publishable/native-Node library emit strategy is deferred until a concrete consumer requires it. No Core `dist/` is created in Phase 1A.

### 5.2. Unified Resolution Matrix
The package name `@gearcube/core` resolves natively without any bundler aliases across all three tools:

| Tool / Consumer | Resolution Mechanism | Verification Path | Status |
| :--- | :--- | :--- | :---: |
| **TypeScript (`tsc`)** | `moduleResolution: "bundler"` + root/workspace symlink | `npm run typecheck` resolves `import '@gearcube/core'` | **`PASS (NO ALIAS)`** |
| **Vitest** | Node.js ESM native workspace symlink resolution | `tests/boundary.test.ts` executes `import '@gearcube/core'` | **`PASS (NO ALIAS)`** |
| **Vite Bundler / Dev** | Native npm workspace symlink in `apps/web/node_modules` | `apps/web/src/App.tsx` executes `import '@gearcube/core'` | **`PASS (NO ALIAS)`** |

**Strict Prohibition:** `apps/web/vite.config.ts` must **NOT** define `resolve.alias` for `@gearcube/core`.

---

## 6. Minimal Core Entry & Build Ownership Strategy

### 6.1. Compile-Safe Empty Module Entry
To prevent inventing throwaway or placeholder domain APIs ahead of Phase 1B:
- `packages/core/src/index.ts` contains only a compile-safe empty module boundary:
  ```typescript
  export {};
  ```
- `apps/web/src/App.tsx` (or `main.tsx`) and `tests/boundary.test.ts` execute a package-resolution smoke import:
  ```typescript
  import '@gearcube/core';
  ```
- This proves that Vite, TypeScript, and Vitest resolve the real workspace package boundary without scaffolding premature domain APIs.

### 6.2. Source-First Core Build Model
- **Core Build Ownership:** In Phase 1A, `packages/core` is a private source-first workspace package. It produces no emitted `dist/` bundle.
- **Core Phase 1A Gate:** Independent TypeScript typecheck (`tsc -p tsconfig.json --noEmit`).
- **Web Phase 1A Gate:** Vite production build (`vite build` in `apps/web`).
- **Root Build Behavior:** `npm run build` runs the web application build. Core compilation is validated via `npm run typecheck`.

---

## 7. TypeScript Configuration Hierarchy & Typecheck Topology

### 7.1. Shared Base Compiler Options (`tsconfig.base.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 7.2. Package-Specific Configurations
- **`packages/core/tsconfig.json`**:
  - Extends `../../tsconfig.base.json`.
  - `"compilerOptions"`:
    - `"lib": ["ES2022"]` *(Strictly OMITS `"DOM"`)*.
  - `"include": ["src/**/*"]`.
- **`apps/web/tsconfig.json`** (or standard Vite split config `tsconfig.app.json` / `tsconfig.node.json`):
  - Extends `../../tsconfig.base.json`.
  - `"compilerOptions"`:
    - `"lib": ["ES2022", "DOM", "DOM.Iterable"]`.
    - `"jsx": "react-jsx"`.
    - `"noEmit": true`.
  - `"include": ["src/**/*", "vite.config.ts"]`.

### 7.3. Typecheck Topology
- `packages/core`: `npm run typecheck` $\to$ `tsc -p tsconfig.json --noEmit`.
- `apps/web`: `npm run typecheck` $\to$ `tsc -p tsconfig.json --noEmit` (or matching Vite tsconfig).
- Root: `npm run typecheck` $\to$ `npm run typecheck --workspaces --if-present`.

---

## 8. Core Test & Environment Isolation

### 8.1. Environment Neutrality Invariant
- Core production source (`packages/core/src/`) must compile in an environment with **no DOM globals** (`window`, `document`) and **no Node-specific runtime coupling**.
- `packages/core/tsconfig.json` specifies `"lib": ["ES2022"]`.

### 8.2. Infrastructure / Boundary Test Placement
- Tests that inspect file system paths, manifests, or package boundaries (e.g. asserting `packages/core/package.json` purity) are placed in the root-level test suite (`tests/boundary.test.ts`) executed by Vitest.
- `tests/boundary.test.ts` imports `@gearcube/core` using its canonical package name (`import '@gearcube/core';`), testing the workspace resolution smoke path without relative filesystem paths.
- This ensures `@types/node` and Node APIs are never introduced into the compilation scope of `packages/core/src/`.

---

## 9. Core Purity Gate Script (`scripts/check-core-deps.mjs`)

An automated purity gate script (`scripts/check-core-deps.mjs`), implemented strictly using Node.js standard library, verifies:
1. **Manifest Purity:** In `packages/core/package.json`, all runtime and development dependency fields (`dependencies`, `optionalDependencies`, `peerDependencies`, `devDependencies`) must be empty or absent.
2. **Import Scanning:** Core source files in `packages/core/src/` must contain zero import statements referencing:
   - `react`, `react-dom`
   - `three`, `@react-three/*`
   - `zustand`
   - `apps/web`, `packages/renderer`, `packages/ui`
3. **DOM Type Exclusion:** `packages/core/tsconfig.json` must not include `"DOM"` in `"lib"`.
4. **Exit Code:** Fails with a non-zero exit code if any violation is detected.

Root package script:
```json
"check:core-deps": "node scripts/check-core-deps.mjs"
```

---

## 10. Durable Toolchain & Official Compatibility Policy

The toolchain versions will not be hard-coded as permanent architecture decisions in this plan. Instead, Phase 1A implementation will execute the following official compatibility protocol:

### 10.1. Implementation-Time Resolution Protocol
At the beginning of Phase 1A implementation:
1. Inspect the official Node.js release/support schedule.
2. Inspect the official currently-supported Vite release documentation.
3. Inspect the official current React stable release documentation (noting React is versioned in stable channels, not LTS).
4. Inspect the official currently-supported Vitest release documentation.
5. Resolve one mutually compatible set of releases across Node LTS, Vite, React, Vitest, and TypeScript.
6. Install explicit package versions using `npm install`.
7. Generate and verify `package-lock.json` via `npm ci`.
8. Record exact local versions in the implementation report:
   - `node --version`
   - `npm --version`
   - `npm ls vite react react-dom vitest typescript`

### 10.2. Planning-Time Node Preference & Engine Range Policy
- **Planning Preference:** Node 24 LTS is currently preferred.
- **Engine Range Policy:** The implementation task will declare `engines.node` in root `package.json` based on the tested Node major (e.g. a major-bounded range such as `">=24 <25"` if tested on Node 24), rather than claiming unverified future major support.

---

## 11. Root Command Surface

| Command | Scope | Action / Verification Semantics |
| :--- | :--- | :--- |
| **`npm run dev`** | `apps/web` | Starts Vite local development server (`npm run dev --workspace=@gearcube/web`) |
| **`npm run build`** | `apps/web` | Compiles production web bundle (`npm run build --workspace=@gearcube/web` $\to$ `apps/web/dist`) |
| **`npm test`** | Root | Executes root Vitest infrastructure/boundary suite (`vitest run`) |
| **`npm run typecheck`** | Root & workspaces | Runs `tsc --noEmit` across all workspace projects (`npm run typecheck --workspaces --if-present`) |
| **`npm run check:core-deps`** | Root | Executes automated purity gate script (`node scripts/check-core-deps.mjs`) |
| **`npm run verify`** | Full repository | Authoritative aggregate gate (`npm run typecheck && npm run check:core-deps && npm test && npm run build`) |

---

## 12. Target Repository Tree & Implementation Inventory

### 12.1. Pre-Implementation Repository Inventory Check
- `.gitignore`: **EXISTS** (created in Phase 0A). Requires minor update to ensure `.vite/` is ignored.
- `package.json`, `package-lock.json`, `tsconfig*`, `apps/`, `packages/`, `scripts/`, `tests/`: **DO NOT EXIST**.

### 12.2. Exact Implementation Action Scope
```text
GearCube Lab/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── App.css                     [CREATE] Minimal neutral styling
│       │   ├── App.tsx                     [CREATE] Minimal shell importing '@gearcube/core'
│       │   └── main.tsx                    [CREATE] React root entry
│       ├── index.html                      [CREATE] SPA HTML entry
│       ├── package.json                    [CREATE] @gearcube/web manifest (depends on "@gearcube/core": "0.0.0")
│       ├── tsconfig.json                   [CREATE] Web TS config (React + DOM)
│       └── vite.config.ts                  [CREATE] Vite config (NO alias for core)
│
├── packages/
│   └── core/
│       ├── src/
│       │   └── index.ts                    [CREATE] Compile-safe empty module (export {})
│       ├── package.json                    [CREATE] @gearcube/core manifest (version: "0.0.0", dependencies: {})
│       └── tsconfig.json                   [CREATE] Pure TS config (ES2022, NO DOM)
│
├── scripts/
│   └── check-core-deps.mjs                 [CREATE] Node.js Core purity verification script
│
├── tests/
│   └── boundary.test.ts                    [CREATE] Root-level package boundary & purity test (imports '@gearcube/core')
│
├── docs/                                   [UNCHANGED] Canonical Phase 0 contracts
├── .gitignore                              [MODIFY] Ensure .vite/ cache is ignored
├── package.json                            [CREATE] Monorepo root workspace manifest (private: true)
├── package-lock.json                       [CREATE] Deterministic lockfile from npm install/ci
├── tsconfig.base.json                      [CREATE] Shared strict compiler options
└── vitest.config.ts                        [CREATE] Root Vitest runner configuration
```

---

## 13. Concrete Acceptance Gates (`PHASE_1A_PASS`)

When Phase 1A implementation is executed, all of the following gates must pass:

1. **`GATE-1A-CLEAN-START`**: Starting commit HEAD equals accepted Phase 0B.4 commit (`12bd4d0fca1e6033d85dab1b5e9b02511055ba62`).
2. **`GATE-1A-INSTALL`**: `npm install` executes cleanly with zero peer dependency conflicts, generating `package-lock.json`.
3. **`GATE-1A-REPRODUCIBLE-CI`**: `npm ci` executes cleanly and deterministically against the generated lockfile.
4. **`GATE-1A-WORKSPACE-GRAPH`**: `npm ls @gearcube/core --workspace=@gearcube/web` confirms `@gearcube/web` resolves the local workspace symlink at version `0.0.0`.
5. **`GATE-1A-NO-VITE-ALIAS`**: `apps/web/vite.config.ts` contains no alias for `@gearcube/core`; resolution is handled purely by npm workspaces.
6. **`GATE-1A-CORE-PURITY`**: `npm run check:core-deps` passes, confirming `packages/core/package.json` dependency fields (`dependencies`, `optionalDependencies`, `peerDependencies`, `devDependencies`) are empty/absent, Core source contains zero framework imports, and DOM lib is omitted.
7. **`GATE-1A-TYPECHECK`**: `npm run typecheck` passes with `0 errors` across all workspaces.
8. **`GATE-1A-UNIT-TESTS`**: `npm test` executes Vitest and passes 100% of boundary tests, verifying `import '@gearcube/core'` resolves.
9. **`GATE-1A-BUILD`**: `npm run build` generates production bundle in `apps/web/dist` with `0 errors`.
10. **`GATE-1A-HYGIENE`**: `git diff --check` passes with 0 whitespace errors, and read-only link checker passes with 0 broken links.
11. **`GATE-1A-NO-FORBIDDEN-FILES`**: Zero premature packages (`packages/kinematics`, etc.) and zero untracked runtime artifacts.

---

## 14. Planning Risks & Mitigations

| Risk | Severity | Mitigation Strategy | Verification Gate |
| :--- | :---: | :--- | :--- |
| **Workspace Export / Resolution Mismatch** | Medium | Use standard npm workspace linking with explicit `"exports"` in `@gearcube/core/package.json`. Strictly avoid Vite aliases. | `GATE-1A-WORKSPACE-GRAPH`, `GATE-1A-BUILD`, `GATE-1A-NO-VITE-ALIAS` |
| **DOM Lib Leakage into Core** | Medium | Explicitly configure `"lib": ["ES2022"]` without `"DOM"` in `packages/core/tsconfig.json`. | `GATE-1A-CORE-PURITY`, `npm run typecheck` |
| **Node Environment Contamination of Core** | Low | Place boundary/manifest inspection tests in root `tests/` so `@types/node` is excluded from Core source compilation. | `GATE-1A-CORE-PURITY`, `GATE-1A-TYPECHECK` |
| **Premature Package Proliferation** | Low | Strictly restrict Phase 1A creation to `apps/web` and `packages/core`. | `GATE-1A-NO-FORBIDDEN-FILES` |

---

## 15. Next Step

Following review and approval of this finalized plan, begin the Phase 1A implementation task by executing the file scaffolding, toolchain configuration, and acceptance gates defined above.
