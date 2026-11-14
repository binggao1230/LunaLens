# Scientific Landing Site Selection Workflow & Implementation Plan

## 1. Overview

This document synthesizes the lunar landing site selection methodologies from NASA and scientific literature and defines the workflow to integrate those decision rules into the **Luna Lens** evaluation engine (`site/`).

### Primary Reference Documents
1. **Binder & Roberts (1970)** — *Criteria for Lunar Site Selection* (IIT Research Institute Report P-30, NASA Contract NASW 1861): Establishes the iterative coupling between scientific objectives ("type sites") and engineering capabilities ("design points"), rejecting candidates that exceed vehicle capabilities and trading off remaining candidates across mission/trajectory constraints.
2. **NASA (2023)** — *Lunar Site Selection* (Moon to Mars Architecture Concept Review White Paper): Frames site selection as balancing **"where we want to go"** (science/utilization objectives) with **"where we can go"** (vehicle safety and environmental constraints: surface slope/roughness, ~6–6.5 days continuous sunlight for early human return, Direct-to-Earth (DTE) communication visibility, and launch/NRHO window availability).
3. **NASA (2023)** — *Safe and Precise Landing at Lunar Sites* (Moon to Mars Architecture Concept Review White Paper): Details Precision Landing and Hazard Avoidance (PL&HA, 50–100 m accuracy), local terrain hazards (slope, crater, boulder tolerances), and the three-way trade-off between **site knowledge** (orbital map resolution), **lander tolerance** (gear design), and **onboard hazard avoidance** (TRN/lidar).
4. **Modern Mission Multi-Criteria Decision Analysis (MCDA)** (*unverified literature summary*): Two-stage funnel combining hard pass/fail constraint masking with normalized weighted scoring (WSM / TOPSIS) and weight sensitivity analysis.

---

## 2. How Scientists Select a Lunar Landing Site (The Two-Stage Funnel)

Scientific and engineering teams do not rely on a single raw metric. Instead, they evaluate candidate sites (and landing dates) through a structured funnel:

```
[Candidate Sites & Landing Dates]
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: Data & Terrain Fidelity Classification             │
│ • Separate sites with real DEM terrain (LOLA 40 m / 240 m)  │
│   from reference-only smooth-sphere sites (horizon = 0°).   │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: Hard Engineering Constraints (Pass / Fail Gate)    │
│ • Touchdown in sunlight & continuous lit run ≥ T_min        │
│   (e.g. 6–6.5 days for early Artemis crewed missions)       │
│ • Direct-to-Earth (DTE) link open at touchdown (if needed)  │
│ • Maximum eclipse / darkness duration ≤ battery limit       │
│ • Regional terrain slope ≤ lander limit (where DEM exists)  │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: Multi-Criteria Scoring & Ranking (Soft Trade-offs) │
│ • Weighted combination of normalized criteria:              │
│   1. Simultaneous Sun + Earth link availability (f_both)    │
│   2. Total illumination & longest continuous sunlit run     │
│   3. Darkness / eclipse risk (1 - longest dark run)         │
│   4. Regional terrain flatness (1 - regional slope)         │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│ STAGE 4: Date-Slip & Sensitivity Check                      │
│ • Evaluate across a launch window (e.g. 28-day slip) to     │
│   measure how many days remain viable if launch slips.      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Mathematical Formulation for Luna Lens

### 3.1 Physical Visibility Series (Already in `site/js/engine/site.js`)
At each hourly sample $t \in \{0, \dots, N-1\}$ over a mission stay of $N$ hours:
- **Solar visibility** (`sunVis[t]`): Upper limb of the solar disk ($r_\odot \approx 0.265^\circ$) clears the terrain horizon $h(\text{az}_\odot)$:
  $$\text{sunVis}(t) = \mathbb{1}\big[\text{el}_\odot(t) + r_\odot > h(\text{az}_\odot(t))\big]$$
- **Solar disk fraction** (`frac[t]` in `app.js`): Circular segment fraction of the solar disk visible above $h(\text{az}_\odot(t))$.
- **Direct-to-Earth (DTE) link** (`comm[t]`): Earth centre clears the terrain horizon by at least the required communication margin $m$ ($2^\circ$ or $5^\circ$):
  $$\text{comm}(t) = \mathbb{1}\big[\text{el}_\oplus(t) > h(\text{az}_\oplus(t)) + m\big]$$

### 3.2 Regional Terrain Slope from LOLA DEM (New Parameter)
Using the 240 m polar stereographic DEM (`site/js/engine/dem.js`), regional surface slope $\theta_{\text{reg}}$ at a polar site $(r, c)$ is computed by central finite differences over grid spacing $\Delta = 240\text{ m}$:
$$\frac{\partial z}{\partial x} = \frac{z(r, c+1) - z(r, c-1)}{2\Delta}, \qquad \frac{\partial z}{\partial y} = \frac{z(r+1, c) - z(r-1, c)}{2\Delta}$$
$$\theta_{\text{reg}} = \arctan\!\left(\sqrt{\left(\frac{\partial z}{\partial x}\right)^2 + \left(\frac{\partial z}{\partial y}\right)^2}\right) \times \frac{180}{\pi}$$
*Accuracy limit note:* An 80–240 m DEM measures **regional baseline slope**, not lander-footprint hazards (boulders or meter-scale craters).

### 3.3 Stage 1 & 2: Terrain Eligibility & Hard Viability Gate
1. **Terrain Eligibility (`hasTerrain`)**:
   Sites with `terrain === "none"` (`horizon === null`, i.e., Apollo and Chandrayaan-3 reference points) use a smooth sphere ($0^\circ$ horizon). Per `TODO.md` Item E, they must be grouped separately and **excluded from polar site recommendations** so they do not artificially outrank real-terrain polar sites.
2. **Hard Pass/Fail Viability (`viable`)**:
   A site and landing time $t_0$ pass the engineering gate if and only if:
   $$\text{viable}(t_0) = \big(L_{\text{sun, touchdown}} \ge T_{\min}\big) \;\wedge\; \big(\neg\text{needLink} \lor \text{comm}(t_0) = 1\big)$$
   where $L_{\text{sun, touchdown}}$ is the continuous sunlit duration starting at $t_0$, and $T_{\min}$ includes **6.5 days (156 h)** to match the NASA Artemis Human Lunar Return requirement alongside 5, 10, and 14 days.

### 3.4 Stage 3: Multi-Criteria Decision Score (Weighted Sum)
For every site $i$ over the stay window of $N$ hours, we define four normalized sub-scores in $[0, 1]$:

1. **Simultaneous Power & Comms ($C_{\text{both}}$):**
   $$C_{\text{both}, i} = \frac{1}{N}\sum_{t=0}^{N-1} \text{sunVis}_i(t) \cdot \text{comm}_i(t)$$
2. **Continuous Sunlight Stability ($C_{\text{run}}$):**
   $$C_{\text{run}, i} = \frac{L_{\text{sun, max}, i}}{N}$$
   where $L_{\text{sun, max}, i}$ is the longest continuous sunlit run in the stay.
3. **Eclipse / Night Survival ($C_{\text{dark}}$):**
   $$C_{\text{dark}, i} = 1 - \frac{L_{\text{dark, max}, i}}{N}$$
   where $L_{\text{dark, max}, i}$ is the longest continuous dark run (smaller dark gap = higher score).
4. **Schedule / Date-Slip Robustness ($C_{\text{slip}}$) or Regional Terrain Margin ($C_{\text{terr}}$):**
   - Horizon obstruction margin: $C_{\text{terr}, i} = \text{clamp}\!\left(1 - \frac{\max_{\text{az}} h_i(\text{az})}{25^\circ},\, 0,\, 1\right)$ (or regional slope factor when DEM is loaded).

The composite **Scientific Site Score** $S_i \in [0, 100]$ is:
$$S_i = 100 \times \frac{w_1 C_{\text{both}, i} + w_2 C_{\text{run}, i} + w_3 C_{\text{dark}, i} + w_4 C_{\text{terr}, i}}{w_1 + w_2 + w_3 + w_4}$$
Default balanced weights: $w_1 = 0.40$ (simultaneous window), $w_2 = 0.25$ (longest sunlit run), $w_3 = 0.20$ (eclipse survival), $w_4 = 0.15$ (terrain horizon clearance).

---

## 4. Implementation Summary (What Was Changed in Code)

This section documents for the team what was implemented on branch `maeva/site-selection-logic`:

| Component | File Modified | Changes Implemented |
|---|---|---|
| **1. Regional Terrain Slope ($\theta_{\text{reg}}$)** | `site/js/engine/dem.js` | Added `dem.slopeDeg(latRad, lonRad)` computing regional surface slope via central finite differences over the 240 m LOLA DEM grid spacing ($\Delta = 240\text{ m}$), and included `slopeDeg` in `computeHorizon()` output for custom polar coordinates. |
| **2. Multi-Criteria Decision Engine (MCDA)** | `site/js/engine/metrics.js` | Added `MCDA_PRESETS` (`balanced`, `power`, `comms`) and `evaluateSiteMcda(site, i0, i1, options)`. Computes `longestSunH`, `longestDarkH`, `longestNoCommH`, `touchdownSunH`, hard pass/fail `viable`, and the composite 0–100 MCDA score $S_i$ combining simultaneous Sun+Earth window ($C_{\text{both}}$), longest continuous sunlit run ($C_{\text{run}}$), eclipse survival ($C_{\text{dark}}$), and terrain horizon clearance ($C_{\text{terr}}$). |
| **3. Terrain Fidelity & Hard-Constraint Recommendation Fix (`TODO.md` Item E)** | `site/js/views/mission.js`, `site/js/app.js` | Sites with `hasTerrain === false` (Apollo 11–17 and Chandrayaan-3, which use a $0^\circ$ smooth-sphere horizon) are explicitly labelled `Reference (smooth sphere)` and sorted below real-terrain LOLA sites. Furthermore, a site only receives the `Recommended` badge (and ranks at the top) if it satisfies the Stage 2 hard viability gate (`score.viable === true`: Direct-to-Earth link open at touchdown AND $\ge 6.5$ days of continuous sunlight from touchdown). Added `Link at touchdown` and `Earthrise in` / `Earthset in` countdowns to the Mission site details panel. |
| **4. NASA Artemis 6.5-Day Threshold & Weighting Presets** | `site/js/app.js`, `site/index.html`, `site/js/i18n.js` | Added `6.5 days (Artemis III)` (156 h continuous sunlight from touchdown, matching the 2023 NASA *Lunar Site Selection* Human Lunar Return baseline) as the default minimum sunlight threshold, and added interactive MCDA weighting presets (`Balanced`, `Power priority`, `Comms priority`) in the **Compare** view with EN/FR/ZH translations. |
| **5. Project Roadmap** | `TODO.md` | Documented the MCDA funnel and terrain recommendation fix under Section E (`Terrain and trust`). |

