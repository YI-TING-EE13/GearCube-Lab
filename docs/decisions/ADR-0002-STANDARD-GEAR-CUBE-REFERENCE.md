# ADR-0002: Adoption of the Standard Gear Cube Reference Model

> **Status:** `DECIDED`
> **Date:** Phase 0B.2 Baseline
> **Deciders:** Project Architect / Core Contributor

---

## 1. Context & Problem Statement

In Phase 0A and early Phase 0B.1, `GearCube Lab` initially contemplated reverse-engineering the physical Daiso Gear Cube (SKU `4550480834955`) through an extensive multi-batch operator empirical characterization protocol before developing the discrete domain engine.

While physical observation is valuable, requiring an exhaustive physical reverse-engineering process of a single consumer clone creates significant development friction and risks building the primary simulator around potential manufacturing tolerances, mold variations, or obscure deviations rather than the canonical twisty puzzle mathematics established in the literature.

A formal product and architectural decision is required to select the canonical reference puzzle model for the MVP simulator and define the role of physical characterization moving forward.

---

## 2. Decision Drivers

- **Mathematical Rigor & Provenance:** The canonical state space, move algebra, and God's Algorithm for the original Gear Cube are well-established in published mathematical literature (e.g., Jaap Scherphuis, Jim Storer).
- **Development Velocity:** Adopting a well-documented reference model allows the project to move forward into formal contract synthesis (Phase 0B.3) and Core implementation (Phase 1) without waiting for exhaustive physical measurements.
- **Modularity & Fidelity Profiles:** The architecture should allow physical variants (including the Daiso SKU) to be integrated as specialized visual skins or experimental validation targets without altering the canonical engine.
- **Empirical Honesty:** The repository must strictly distinguish between published reference mechanics and unverified claims regarding consumer clones.

---

## 3. Considered Options

- **Option A: Full Physical Reverse-Engineering of Daiso SKU as Sole Truth:**
  - *Pros:* Fully tailored to the physical puzzle in the operator's hands.
  - *Cons:* Heavy operator manual burden; unverified whether Daiso has unique anomalies; lacks published mathematical verification; blocks software progress.
- **Option B: Adopt Standard / Original Gear Cube as Canonical Reference Model (Chosen):**
  - *Pros:* Canonical mathematics grounded in authoritative published literature (41,472 state space, published God's Algorithm analysis reporting max distance 12 under `Single turns` / 6 under `Multiple turns`, 2-tetrad corner structure); Daiso puzzle reclassified as optional physical validation target; clear, unambiguous MVP target.
  - *Cons:* Requires documenting differences between standard and variant models (e.g., edge-base marked variants).

---

## 4. Decision Outcome

We formally adopt **Option B**:

1. **Canonical MVP Puzzle Model:** The MVP simulator will implement the published combinatorial and mechanical rules of the **standard / original Gear Cube** designed by Oskar van Deventer / Meffert's (standard unmarked edge-base variant, 41,472 reachable states).
2. **Reclassification of Daiso Characterization:** The physical Daiso puzzle (SKU `4550480834955`) and the Phase 0B.1 characterization protocol are reclassified as **optional validation and high-fidelity modeling tools**. They no longer block Phase 1 Core or Phase 2 Kinematics.
3. **Explicit Directional Modeling:** Move direction (`CW` vs. `CCW`, defined observationally from outside the face) remains explicitly distinct in the domain contract ($\text{CW} \neq \text{CCW}$).
4. **Decoupled Visual Defaults:** A standard 6-color palette (White/Yellow, Green/Blue, Red/Orange) is adopted as a presentation-only default and decoupled from state representation.

---

## 5. Consequences

### Positive:
- Unlocks immediate discrete contract synthesis in Phase 0B.3 based on robust, peer-reviewed mathematical literature.
- Eliminates operator testing bottlenecks for Core development.
- Preserves all physical characterization protocols as reusable validation tooling for future comparative research.

### Negative / Trade-offs:
- The Daiso physical puzzle is not guaranteed to be 100% mechanically identical to the standard reference model; any potential divergence will be analyzed in future optional fidelity phases.

---

## 6. References & Literature
- Jaap Scherphuis, *The Gear Cube / The Gear MasterMorphix*, `https://www.jaapsch.net/puzzles/gearcube.htm` (Accessed: 2026-08-20)
- Jim Storer, *Gear Cube*, `https://www.cs.brandeis.edu/~storer/JimPuzzles/ZPAGES/zzzGearCube.html` (Accessed: 2026-08-20)
- Canonical Specification: [`docs/reference/STANDARD_GEAR_CUBE_SPEC.md`](../reference/STANDARD_GEAR_CUBE_SPEC.md)
