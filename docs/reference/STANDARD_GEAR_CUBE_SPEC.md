# STANDARD_GEAR_CUBE_SPEC.md — Standard Gear Cube Reference Specification

> **Specification Status:** `DECIDED` (Canonical MVP Reference Model)
> **Target Puzzle Model:** Standard / Original Gear Cube (Oskar van Deventer / Meffert's Design)
> **Document Role:** Canonical theoretical, mechanical, and combinatorial specification governing Phase 1 Core and Phase 2 Kinematics.

---

## 1. Executive Summary & Product Reference Decision

### 1.1. Canonical Reference Model
`GearCube Lab` formally adopts the published combinatorial and mechanical rules of the **standard / original Gear Cube** designed by **Oskar van Deventer** (based on an idea by **Bram Cohen**) and manufactured by **Uwe Meffert (Meffert's)** as its canonical MVP puzzle model [`PROJECT_DECISION`].

### 1.2. Role of the Daiso Physical Reference Cube
The physical puzzle (Daiso Rotating 3D Gear Puzzle, SKU `4550480834955`) is reclassified as:
- Initial project inspiration;
- An optional physical comparison target;
- A candidate for a future custom visual skin / fidelity profile [`PROJECT_DECISION`].

Physical Daiso characterization is deferred and is **no longer a blocking requirement** for Phase 1 Core or Phase 2 Kinematics. No mechanical equivalence between the Daiso SKU and the original Meffert's puzzle is claimed [`OPEN`].

---

## 2. Source Provenance & Primary Literature

This specification is grounded directly in published specialist analyses from the twisty puzzle literature:

### 2.1. Primary Sources

| Source ID | Author / Title | URL & Access Date | Supported Contract Facts | Evidence Status |
| :--- | :--- | :--- | :--- | :--- |
| **`[REF-JAAP-01]`** | **Jaap Scherphuis**<br/>*The Gear Cube / The Gear MasterMorphix* | `https://www.jaapsch.net/puzzles/gearcube.htm`<br/>(Accessed: 2026-08-20) | - Invented by Oskar van Deventer (idea by Bram Cohen), manufactured/sold by Uwe Meffert.<br/>- $180^\circ$ face turn drives middle layer by $90^\circ$.<br/>- Canonical reachable state space is **$41,472$** ($4!(4\cdot 3)^3$) for standard unmarked variant.<br/>- Corners partition into two non-mixing tetrads (anti-slice group).<br/>- Edges partition into 3 slice orbits and never leave their slice.<br/>- All 4 edges in a slice share the same twist state ($3^3$ factor).<br/>- Center permutations fully determined by edge permutations.<br/>- Edge-base marked variant has **$165,888$** states ($4!(4\cdot 3)^3 \cdot 4$).<br/>- Published God's Algorithm distance table reports maximum distance 12 under `Single turns` and 6 under `Multiple turns`. | `SOURCE_SUPPORTED` |
| **`[REF-STORER-01]`** | **James A. Storer**<br/>*Gear Cube* (Jim Storer Puzzles) | `https://www.cs.brandeis.edu/~storer/JimPuzzles/ZPAGES/zzzGearCube.html`<br/>(Accessed: 2026-08-20) | - Invented by Oskar van Deventer; author's example purchased from Meffert's (2010).<br/>- Only $180^\circ$ face rotations ("flips") are legal discrete operations.<br/>- $90^\circ$ face rotation physically locks up orthogonal turns.<br/>- A flip cycles adjacent middle layer by $90^\circ$ and rotates its 4 gear edges by $60^\circ$ each.<br/>- 3 identical flips return adjacent middle layer to a flat plane.<br/>- 12 identical directed flips return complete puzzle to starting state.<br/>- Gear edges do not leave their middle layer.<br/>- Clockwise and counter-clockwise flips are operationally distinguished in solution steps. | `SOURCE_SUPPORTED` |

---

## 3. Reference Variant Selection

### 3.1. Adopted Standard Variant (MVP Target)
The canonical model adopts the **standard unmarked edge-base variant** [`PROJECT_DECISION`]:
- Edge components possess colored faces on the rotating gear cogs only.
- The non-rotating base structural mounting of each edge component is unstickered (orientation of the edge base is invisible).
- **Total Canonical Reachable State Space:** **$41,472$ states** `[REF-JAAP-01]`.

### 3.2. Alternative Variants (Documented for Provenance)
1. **Edge-Base Marked Variant (Supercube-like):**
   - Possesses orientation markings on the non-rotating base part of edge pieces.
   - Increases state cardinality by a factor of 4 to **$165,888$ states** ($4!(4\cdot 3)^3 \cdot 4$) `[REF-JAAP-01]`.
2. **Gear MasterMorphix (Tetrahedral):**
   - Tetrahedral shape modification where face centers become 2-color edge centers with visible orientation.
   - Increases state cardinality by a factor of $2^3 = 8$ over the marked variant to **$1,327,104$ states** `[REF-JAAP-01]`.
3. **Gear Cube Extreme / Ultimate (Anisotropic):**
   - Contains differing gear ratios on different axes (some non-geared 90° faces). Distinct puzzle family outside the standard Gear Cube scope.

---

## 4. Mechanical & Combinatorial Rules

### 4.1. Legal Move Envelope & Quantization
- **Outer Face Turn Quantization:** Legal discrete face operations are strictly quantized to **$180^\circ$ increments** (half-turns / "flips") `[REF-JAAP-01]`, `[REF-STORER-01]`.
- **Intermediate $90^\circ$ Lockup:** Turning a face by $90^\circ$ puts the puzzle into an intermediate shape that physically and mechanically blocks orthogonal face rotations `[REF-STORER-01]`.
- **Continuous vs. Discrete Separation:** The $90^\circ$ intermediate pose is modeled as a continuous animation keyframe in the kinematic engine, not as a legal discrete state in the domain core [`PROJECT_DECISION`].

### 4.2. Middle Layer & Gear Coupling Dynamics
During a single $180^\circ$ outer face turn:
1. The perpendicular adjacent middle layer rotates by **$90^\circ$** ($\frac{1}{2}$ the outer face angular displacement) `[REF-JAAP-01]`, `[REF-STORER-01]`.
2. The 4 edge gear cogs on that middle layer rotate by **$60^\circ$** ($\frac{1}{6}$ turn) around their local axes `[REF-STORER-01]`.
3. The remaining 8 edge gears (4 on the turning face, 4 on the opposing face) participate in spatial permutation with their respective face layers.

### 4.3. Single-Axis Repeated-Operation Dynamics
Applying repeated identical $180^\circ$ face turns along a fixed directed single axis from the solved state yields:
- **3 Flips ($3 \times 180^\circ = 540^\circ$):** The middle slice returns to a flat planar boundary, but edge gears remain in an intermediate rotational phase ($3 \times 60^\circ = 180^\circ$) `[REF-STORER-01]`.
- **6 Flips ($6 \times 180^\circ = 1080^\circ$):** Exchanges front/rear and top/bottom of the vertical center layer `[REF-STORER-01]`.
- **12 Flips ($12 \times 180^\circ = 2160^\circ$):** Storer reports that twelve repetitions return the complete puzzle to its exact starting state `[REF-STORER-01]` (algebraically represented as $F^{12} = I$ for a fixed directed generator $F$).

*(Note: Phase 0B.2 establishes this as reported physical/mechanical behavior; formal generator order implementation, inverse encoding, move normalization, and solver pruning rules will be derived in Phase 0B.3 contract synthesis).*

---

## 5. Discrete State Space & Invariants

### 5.1. Component Orbits and Invariant Structure
Under pure $180^\circ$ face moves (anti-slice group):
1. **Corner Tetrads:** 8 corners split into two distinct orbits of 4 corners each (two interlocking tetrahedral orbits). Corners in one tetrad never mix with corners in the other `[REF-JAAP-01]`.
2. **Edge Slices:** The 12 edge gears are partitioned into 3 distinct slices of 4 edges each. Edge gears never leave their original slice orbit `[REF-JAAP-01]`, `[REF-STORER-01]`.
3. **Face Centers:** Center pieces permute in sets fully determined by the edge permutations `[REF-JAAP-01]`.
4. **Edge Twist / Phase:** For the standard unmarked variant, the 4 edges in any slice always share the same twist/phase state (3 possible discrete orientations per slice) `[REF-JAAP-01]`.

### 5.2. State Space Derivation Breakdown
From Jaap Scherphuis' analysis `[REF-JAAP-01]`:
$$\text{Total States} = 4! \times (4 \times 3)^3 = 24 \times 1728 = 41,472$$
- $4! = 24$: Permutations of the active corner tetrad relative to a fixed corner reference.
- $(4 \times 3)^3 = 1728$: For each of the 3 edge slices, 4 valid edge permutations and 3 shared twist phases ($12 \times 12 \times 12$).
- Centers: Fully determined by edge permutation (contributes factor 1).

---

## 6. Published God's Algorithm Analysis & Source Metrics

Jaap Scherphuis documents exhaustive search results for the standard 41,472-state Gear Cube (`[REF-JAAP-01]`) categorized across two source table axes:

### 6.1. Source Metric Categories & Published Maxima

| Source Metric Axis | Description in Source | Published Maximum Table Distance | Source Status |
| :--- | :--- | :---: | :--- |
| **`Single turns`** | Single turns counted individually | **12** (row total: 6 states) | `SOURCE_SUPPORTED` `[REF-JAAP-01]` |
| **`Multiple turns`** | Repeated turns of a single face grouped | **6** (column total: 2,889 states) | `SOURCE_SUPPORTED` `[REF-JAAP-01]` |

*(Note on Project Metric Mapping: The exact mapping between Jaap's source metric definitions and future GearCube Lab solver cost metrics is classified as `OPEN / TO DEFINE` for Phase 4 benchmark and solver design. Unqualified references to "solution length" or "diameter" without specifying the metric are prohibited).*

### 6.2. Single Turns Row Distribution Table
From Scherphuis' exhaustive table of the 41,472 standard states `[REF-JAAP-01]`:

| `Single turns` Distance | Total States in Row | Cumulative States |
| :---: | :---: | :---: |
| **0** | 1 | 1 |
| **1** | 6 | 7 |
| **2** | 30 | 37 |
| **3** | 138 | 175 |
| **4** | 606 | 781 |
| **5** | 2,100 | 2,881 |
| **6** | 6,041 | 8,922 |
| **7** | 13,452 | 22,374 |
| **8** | 13,278 | 35,652 |
| **9** | 4,992 | 40,644 |
| **10** | 774 | 41,418 |
| **11** | 48 | 41,466 |
| **12** | 6 | **41,472** |

*(For comparison: In the source table, the column totals for `Multiple turns` range from distance 0 to 6, with column 6 containing 2,889 states across various single-turn depths).*

---

## 7. Directional Semantics & Public Move Interface

### 7.1. Explicit Directional Modeling
Although a $180^\circ$ turn on an isolated outer face produces the same spatial boundary whether turned clockwise (`CW`) or counter-clockwise (`CCW`), the coupled intermediate gear cogs rotate in opposite directions.
- In the public domain contract, move direction is maintained explicitly: `CW` and `CCW` [`PROJECT_DECISION`].
- `CW` and `CCW` are defined observationally as viewed directly from outside the selected face toward the cube center.
- In the right-handed coordinate convention where each face's positive axis is its outward normal, `CW` corresponds to negative right-hand rotation (outer: $-180^\circ$, middle: $-90^\circ$) and `CCW` corresponds to positive right-hand rotation (outer: $+180^\circ$, middle: $+90^\circ$).
- `CW` and `CCW` produce distinct discrete state transitions on the coupled middle slice and gear cogs ($\text{CW} \neq \text{CCW}$) and are never collapsed in Core.

### 7.2. Six-Face Public/UI Interface
The user-facing simulator and domain API will expose all six outer faces:
$$\text{Faces} = \{ \text{U}, \text{D}, \text{F}, \text{B}, \text{R}, \text{L} \}$$
- Public Move API supports 12 basic operations ($6 \text{ faces} \times 2 \text{ directions}$) [`PROJECT_DECISION`].
- Any reduction to a minimal generator set (e.g., $\{ \text{U}, \text{R}, \text{F} \}$) is strictly internal to solver optimization in Phase 4 and does not restrict user interaction.

---

## 8. Deterministic Default Visual Mapping

Color placement is purely a presentation concern, strictly decoupled from discrete state transition semantics [`PROJECT_DECISION`].

### 8.1. Default MVP Palette
```text
OBS-U (Up)    = White   (#FFFFFF)
OBS-D (Down)  = Yellow  (#FFD500)
OBS-F (Front) = Green   (#009E60)
OBS-B (Back)  = Blue    (#0051BA)
OBS-R (Right) = Red     (#C41E3A)
OBS-L (Left)  = Orange  (#FF5800)
```

### 8.2. Architectural Decoupling
- `ColorScheme` and `VisualSkin` belong strictly to presentation layers.
- Discrete `GearCubeState` in the domain core operates strictly on canonical piece indices, positions, and phase integers.
- Switching visual themes (e.g., standard plastic, stickerless, high-contrast, or Daiso OEM) does not modify solver or domain logic.

---

## 9. Status Classification Summary

| Specification Element | Formal Status | Provenance / Evidence Base |
| :--- | :--- | :--- |
| Oskar van Deventer / Meffert's reference model | `PROJECT_DECISION` | Canonical MVP baseline adopted for GearCube Lab |
| $180^\circ$ legal outer turn quantization | `SOURCE_SUPPORTED` | Scherphuis `[REF-JAAP-01]`, Storer `[REF-STORER-01]` |
| $90^\circ$ middle slice coupling / $60^\circ$ gear cog rotation | `SOURCE_SUPPORTED` | Storer `[REF-STORER-01]` ($90^\circ$ middle layer also in Scherphuis `[REF-JAAP-01]`) |
| Single-axis 12-turn return to identity ($F^{12} = I$) | `SOURCE_SUPPORTED` | Storer `[REF-STORER-01]` |
| Standard unmarked state count ($41,472$) | `SOURCE_SUPPORTED` | Scherphuis `[REF-JAAP-01]` |
| Source distance maxima: 12 (`Single turns`), 6 (`Multiple turns`) | `SOURCE_SUPPORTED` | Scherphuis `[REF-JAAP-01]` |
| Solver cost metric mapping to source categories | `OPEN / TO DEFINE` | To be formalized during Phase 4 solver & benchmark design |
| Explicit move direction (`CW` vs. `CCW`, $\text{CW} \neq \text{CCW}$) | `PROJECT_DECISION` | Distinct discrete transitions on coupled middle slice and gears |
| Six-face public Move API ($\{ \text{U}, \text{D}, \text{F}, \text{B}, \text{R}, \text{L} \}$) | `PROJECT_DECISION` | Intuitive UI/simulator interaction |
| Default visual color scheme | `PROJECT_DECISION` | Standard WCA-style Rubik's orientation |
| Daiso SKU `4550480834955` equivalence | `OPEN` | Unverified; reclassified to optional validation |
| Exact 3D tooth mesh profile | `OPTIONAL_PHYSICAL_VALIDATION` | Non-blocking for Core; refined in Phase 2 |
