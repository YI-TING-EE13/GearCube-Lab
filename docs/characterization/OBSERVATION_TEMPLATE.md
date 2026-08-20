# OBSERVATION_TEMPLATE.md — Physical Observation Recording Template

> **Usage:** Reusable form for the human operator to record physical observations during Phase 0B execution.
> **Submission:** Fill out this template in Markdown or paste the structured responses into chat.

---

## 1. Blank Observation Form

```markdown
### Experiment Observation Log

#### 1. Metadata & Reference Orientation
- **Experiment ID:** [e.g., EXP-REF-01 / EXP-MOVE-01 / EXP-DIR-01 / EXP-STATE-01 / EXP-PERIOD-01 / EXP-KIN-01]
- **Date & Time:** [YYYY-MM-DD HH:MM]
- **Operator:** [Operator Identifier]
- **Initial Puzzle State:** [e.g., Pristine Solved Reference / Scrambled Depth N / Other]
- **Reference Orientation:**
  - Front (OBS-F): [Visible Color / Feature]
  - Top (OBS-U): [Visible Color / Feature]
  - Right (OBS-R): [Visible Color / Feature]

#### 2. Physical Operation Executed
- **Target Face / Observational Axis:** [e.g., OBS-F / OBS-R / OBS-U]
- **Physical Direction:** [Clockwise (CW) / Counter-Clockwise (CCW) / Other]
- **Nominal Endpoint Angle:** [e.g., ~90° / ~180° / ~360°]
- **Number of Turn Repetitions (if periodic test):** [1, 2, 3...]

#### 3. Evidence Attachments & References
- **Start-State Photos / Videos:** [e.g., IMG_0001.JPG, IMG_0002.JPG]
- **End-State Photos / Videos:** [e.g., IMG_0003.JPG, IMG_0004.JPG]
- **Video Clip File (if kinematic test):** [e.g., VID_0001.MP4, recorded frame rate if known]

#### 4. Direct Physical Observations (Raw Facts Only)
- **Observed Moving Components:** [Describe which visible components/features rotated or moved]
- **Observed Stationary Components:** [Describe which visible components/features remained static]
- **Observed Position Permutations:** [Describe visible component location changes using observational coordinates]
- **Observed Orientation / Phase Changes:** [Describe whether component alignments or gear tooth orientations changed]
- **Intermediate Pose Stability & Subsequent Availability (if testing EXP-MOVE-01):**
  - Stable at ~90° without holding: [YES / NO / UNCERTAIN]
  - Operations available from ~90°: [AVAILABLE / NOT AVAILABLE / PARTIALLY CONSTRAINED / NOT SAFELY TESTABLE / UNCERTAIN]
- **Tactile / Mechanical Resistance:** [Normal / High Friction / Binding / Skipping / Other]

#### 5. Operator Evaluation & Inferences
- **Outcome Classification:** [OBSERVED / INCONCLUSIVE / INCONCLUSIVE_WITHIN_CAP / ANOMALOUS]
- **Confidence Level:** [High / Moderate / Low]
- **Identified Ambiguities / Uncertainties:** [Note any visual or physical ambiguity]
- **State Restorability:** [YES — Confirmed returned to reference state / NO — Requires manual reset]
- **Operator Inferences / Notes:** [Optional qualitative notes; keep separate from direct facts above]
```

---

## 2. Completed Illustrative Example

> [!NOTE]
> **EXAMPLE ONLY — NOT PHYSICAL EVIDENCE**
> The following sample log illustrates the expected structural detail and neutrality. The contents are purely generic and do **not** represent verified experimental facts or assumed mechanics of the Daiso Gear Cube.

```markdown
### Experiment Observation Log (EXAMPLE ONLY — NOT PHYSICAL EVIDENCE)

#### 1. Metadata & Reference Orientation
- **Experiment ID:** EXP-MOVE-01 (Sample Illustration)
- **Date & Time:** 2026-08-21 10:00
- **Operator:** Lab-Operator-1
- **Initial Puzzle State:** Pristine Solved Reference
- **Reference Orientation:**
  - Front (OBS-F): Green Face
  - Top (OBS-U): White Face
  - Right (OBS-R): Red Face

#### 2. Physical Operation Executed
- **Target Face / Observational Axis:** OBS-F
- **Physical Direction:** Clockwise (CW)
- **Nominal Endpoint Angle:** Explored ~90° intermediate pose, then continued to ~180°
- **Number of Turn Repetitions:** 1

#### 3. Evidence Attachments & References
- **Start-State Photos / Videos:** SAMPLE_START_F.JPG, SAMPLE_START_U.JPG
- **End-State Photos / Videos:** SAMPLE_END_F.JPG, SAMPLE_END_U.JPG
- **Video Clip File:** None

#### 4. Direct Physical Observations (Raw Facts Only)
- **Observed Moving Components:** Visible components in the Front observational layer and intermediate components on the surrounding middle slice.
- **Observed Stationary Components:** Visible components in the Back observational layer.
- **Observed Position Permutations:** Components at the 4 corner positions of OBS-F exchanged spatial positions.
- **Observed Orientation / Phase Changes:** Intermediate gear-shaped components on the middle slice rotated around their axes.
- **Intermediate Pose Stability & Subsequent Availability:**
  - Stable at ~90° without holding: YES (holds position mechanically)
  - Operations available from ~90°: NOT AVAILABLE (perpendicular faces encounter physical resistance without forcing)
- **Tactile / Mechanical Resistance:** Smooth throughout 180° rotation; no skipping or binding.

#### 5. Operator Evaluation & Inferences
- **Outcome Classification:** OBSERVED
- **Confidence Level:** High
- **Identified Ambiguities / Uncertainties:** None
- **State Restorability:** YES — Applying reverse 180° turn on OBS-F restored solved reference state.
- **Operator Inferences / Notes:** 180° turn appears to be a stable discrete stopping point on OBS-F.
```
