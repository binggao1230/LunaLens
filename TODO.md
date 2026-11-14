# LunaLens construction map

Implement the Expert planning workflow described in [Background](doc/Background.md#expert-planning-scenarios).
The finish line is a runnable Explore screen where a newcomer can choose any supported
UTC date or range, see why sites qualify, and compare two results without leaving the
workspace. The first half of 2030 is a regression fixture only; it does not define the
product's search range, default dates or available presets. This is a **lunar touchdown
search**. Earth launch dates, lunar ascent, transfers, landing safety, power output and
radio performance are outside this run.

Use one feature branch based on this plan. Keep the existing navigation: Mission for 3D
and Education, full-width Atlas for regional reference, Explore for native Expert work,
and Data for method and sources. Keep Compare, Date slip and Plan retired as standalone
pages. Keep Mission's same-date comparison and CSV export; do not require Atlas, a flight
animation or a live third-party API for the new workflow.

The [Mission and Atlas workstream](#mission-and-atlas-workstream) is the next product
slice from the voice notes. It adds a prototype tab without replacing the current pages
or expanding the W0–W6 run's ten-hour commitment.

## Decisions to implement

| Input or result | Contract |
|---|---|
| Candidate sites | Start with the six native presets that have stored LOLA skylines. Keep the six other presets as smooth-sphere references. Do not use Atlas results in native rankings. Reserve arbitrary map-wide search for later. Continue to inspect individual custom points in Explore and show their terrain status. |
| Time | Use UTC, with start-inclusive/end-exclusive search ranges and one-hour touchdown samples. Exact hour, day, any selected year's first/second half or full year, and custom ranges that can cross years all use the same evaluator. Derive coverage and available years from the loaded data; select no hard-coded search dates. A date-only end presented as inclusive in the UI maps to the following midnight. Landing time is independent of the preview cursor. |
| Complete stay | An evaluated candidate must have its entire stay covered. Use the conservative bound `touchdown + stay <= last sample`. For incomplete searches show the requested range, evaluated range, and the count omitted for missing data. “Out of coverage” and “evaluated, no match” are different states. Never pad, silently clamp, or shorten a stay. |
| Conditions | One Expert evaluation uses the same stay, Earth margin, required continuous sunlight from touchdown and optional Earth visibility at touchdown. Use `Site.series.sunVis` (apparent solar limb) for the Sun and `earthClr > margin` for Earth visibility. Validate inconsistent settings, including a continuous-sun requirement longer than the stay. Treat the existing 2°/156 h defaults as editable screening assumptions. |
| Window and site ranking | Apply hard conditions before ranking. Group adjacent passing touchdown hours; a gap splits the group. Default site order is most eligible starts, then widest group, then most simultaneous Sun/Earth hours in a qualifying stay, then stable site ID. An alternate “Maximize overlap” order starts with the overlap metric and then uses the default tie-breaks. No failed candidate is recommended. |
| Representative and visible windows | For a given site or group, choose the qualifying start with most overlap, then shortest longest darkness, then earliest UTC. Show up to three groups per site: always include the group containing the site's representative; fill remaining slots by width, then group overlap, then earliest. Display first/last sampled starts, sample count and representative UTC. Do not describe sampled starts as continuous coverage between them. |
| Explain the decision | Each result names the site, terrain source, coverage, active conditions and reasons it passed. Failed cases name their failed conditions; aggregate reasons may overlap. Show visibility totals, overlap, continuous sun from touchdown and longest dark/no-Earth gaps as geometric estimates. If a score stays visible, put it after these facts. |

The recommendation depends on the chosen objective. “More eligible starts” measures
schedule flexibility; “widest window” measures the longest consecutive opportunity; “more
overlap” measures the chosen stay. Do not combine them into an unexplained score.

### Two comparisons, three inputs

| Case | Lock | Compare |
|---|---|---|
| **Two sites, same touchdown** | Same exact UTC hour, stay, thresholds, and Earth margin. | A/B pass/fail reasons, sunlight, Earth visibility and overlap in hours; continuous sun from touchdown, longest dark/no-Earth gaps, terrain source. Show signed B−A deltas and aligned timelines. |
| **Two sites, same period** | Same requested and evaluated hours, stay and conditions. | Eligible starts as count and share of a common denominator, widest group, and count of UTC starts eligible at both sites. Compare each representative stay only after labelling its distinct UTC date. If they share no eligible hour, say so. |
| **One site, two windows** | Same site/terrain, stay and conditions; preserve the original baseline. | Compare two exact starts on an elapsed-hour axis with separate UTC labels. For two ranges, show eligibility counts and shares with each range's own denominator and make the two representative cases explicit. |

For a single-date view, do not infer a simultaneous comparison from two different
dates. Show the absolute UTC date above every timeline, even when the axes use elapsed
hours. Let the user pin A and B from search results instead of entering the query again.

## Reference fixtures

The local `site/data/ephemeris.json` and binary contain 43,824 hourly samples from
**2026-01-01 00:00 UTC to 2030-12-31 23:00 UTC**. For a 709 h stay the complete-stay
policy allows a latest touchdown of **2030-12-02 10:00 UTC**. The existing Explore picker
limits dates earlier because it reserves a fixed lookahead; the construction changes
that behaviour rather than disguising the gap. Both bounds must come from metadata and
the selected duration in the implementation.

| Fixture | Expected result from the native snapshot and rules |
|---|---|
| H1 2030 with six terrain presets | Scan `[2030-01-01T00:00Z, 2030-07-01T00:00Z)`: 4,344 sampled starts per site. Use a 709 h stay, 2° Earth margin, 156 h continuous sunlight from touchdown, Earth visible at touchdown. |
| H1 2030 with those conditions | Eligible sampled starts / widest group (in samples): Nobile rim 1,055 / 241; IM-1 679 / 132; IM-2 419 / 161; de Gerlache rim 354 / 311; Shackleton rim 77 / 62; Shackleton floor 0 / 0. |
| Same query, different ranking | Nobile rim leads for flexibility (1,055/4,344, about 24.3%). De Gerlache rim leads for best overlap: 366 h at its representative touchdown of 2030-05-26 18:00 UTC. The largest window of eligible starts also belongs to de Gerlache rim (311 consecutive sampled starts). |
| Custom range outside the 2030 fixture | Scan `[2028-12-30T00:00Z, 2029-01-02T00:00Z)`: 72 sampled starts per site at full coverage, including the year boundary. Compare the results to the same hourly oracle, without making this range a built-in preset. |
| 2030 whole year and beyond | For a 709 h stay show partial coverage, with 2030-12-02 10:00 UTC included and the next hour excluded. A 2031-only query has no coverage. A fully covered query for Shackleton floor has zero matching starts, which is a different outcome. |
| 2026 change-of-plan exercise | Start at Shackleton rim on 14 November. Try the same site on 23 November and de Gerlache on 23 November. Verify the original is unchanged. The previous UI's separate 14→28 November example showed −52 h sunlight and +11 h Earth visibility (709 h stay, 2° margin). Treat that as a legacy regression clue; if the canonical rule changes the result, record the exact reason rather than requiring obsolete numbers. |

The H1 figures came from an offline sweep through the existing native engine and are not
a shipped feature, an authoritative landing recommendation, or guidance for a real launch.
Record a new fixture only when input files or evaluation rules intentionally change.

## Ten-hour execution order

Time boxes are estimates, not a requirement to keep coding for ten hours. The matrix
shows dependencies and the evidence required to mark a slice done. If the run is short
on time, protect complete-stay validation, one accurate shortlist and the two core A/B
flows. Defer styling, advanced search, orbit redesign and publishing before weakening
those checks.

| Slice | Budget | Depends on | Deliverable |
|---|---:|---|---|
| W0. Establish the baseline | 0.5 h | — | Clean feature branch, known data and reproducible commands |
| W1. Make site, time and conditions consistent | 1.75 h | W0 | Shared Expert scenario and strict evaluation boundaries |
| W2. Calculate regional shortlist | 2 h | W1 | Pure UTC search, eligible groups and transparent ranking |
| W3. Ship the Explore entry | 1.5 h | W2 | Period picker, candidate cards and coverage states |
| W4. Compare pinned options | 1.5 h | W2, W3 | A/B fixed dates and period comparisons without a separate page |
| W5. Verify and polish the core path | 1.75 h | W3, W4 | End-to-end, accessibility, Education and orbit smoke checks |
| W6. Contingency and handoff | 1 h | W5 or time box | Clean recoverable state and evidence for remaining work |

### W0 — Establish the baseline (0.5 h)

- [ ] **W0.1 — Record inputs.** Start a single working branch, record its base SHA, data
  metadata, site counts and the exact first task in the run log below. Verify that the
  snapshot is present and that the native site opens locally using `site/tools/serve.py`
  bound to `0.0.0.0`. Do not download replacement data unless the expected inputs are missing.
- [ ] **W0.2 — Capture the old behavior.** Run `node site/tools/check_js.mjs`,
  `node site/tools/check_team.mjs` with a working Python/NumPy interpreter, and
  `python3 site/tools/check_ephemeris_svs.py`. Record any pre-existing failure. Capture a
  desktop and 390 px Mission/Explore baseline, including both Mission orbit rings if visible.
  If data checks cannot run, note the blocker; do not call the later scan validated.

### W1 — Make site, time and conditions consistent (1.75 h)

- [ ] **W1.1 — Shared native scenario (C1.3).** In the native app keep stable site identities
  for presets and custom pins, a UTC touchdown hour and one set of Expert conditions.
  Mission's “Inspect this site” opens the exact point in Explore. Returning to Mission
  retains it. Follow the existing Mission/Education boundary and preserve Mission CSV.
  **Accept:** return from Explore for both a preset and a custom polar point. A second pin
  must not change the original coordinates. Use rendered labels as evidence.
- [ ] **W1.2 — Strict time and coverage (C2.3, R1).** Put input normalization and validation
  in a pure native engine function. Treat `touchdownMs` and `previewHour` separately.
  Replace the fixed 88-day reservation with stay-aware validation; cap only the cosmetic
  preview/lookahead at available data. Audit callers that assume the full old buffer.
  **Accept:** preserve 23 November 2026 at 12:00 UTC when preview moves six hours; pass the
  boundary, partial-coverage and no-coverage fixtures, with no invalid arrays or NaN.
- [ ] **W1.3 — One set of windows and event meanings (C3.4, C4.3).** Reuse the native site
  samples and expose one fixed-duration evaluation to Mission, Explore and later W2. Use
  the dynamic sampled Sun rule for totals; a drawn disk fraction must not override it.
  Separate geometric Earthset from the margin-based window ending. Truncate any unavailable
  future event explicitly rather than returning a fake countdown.
  **Accept:** both views agree when showing the same case and event. At 2° versus 5° the
  margin result can change while geometric Earthset does not. Test margin equality,
  touchdown requirement on/off, threshold-grazing Sun and an invalid stay.

### W2 — Calculate the shortlist (2 h)

- [ ] **W2.1 — Native search and window grouping (R1, R2).** Put UTC range validation,
  per-hour evaluation, grouping and rank keys in a browser-independent module under
  `site/js/engine/`. Pass the site list and normalized conditions explicitly; no DOM,
  network or Atlas source. Return coverage and reasons as well as results. Cache site
  series; use prefix sums or another bounded approach only if a measured scan needs it.
  **Accept:** unit checks cover start-inclusive/end-exclusive ranges, clipping at both
  boundaries, single-sample groups, one gap splitting two groups, no qualified start,
  excluded reference sites and deterministic ties. No sample may be counted twice.
- [ ] **W2.2 — Build the reproducible oracle (R2).** Add a small local check under
  `site/tools/` for a synthetic array and both local snapshot fixtures (H1 2030 and the
  custom cross-year range). Cross-check the
  implemented results against a simple hourly sweep of the same canonical engine, not
  against the previous screens or Atlas. If they diverge, narrow it to one site/hour
  and explain the difference before continuing. Record full H1 runtime; aim for initial
  results within 2 s on desktop and 4 s at a 390 px viewport with CPU throttling. Record
  the device and throttle used. Move work off the UI thread or yield search in chunks only
  if profiling shows blocking.

### W3 — Ship the Expert entry in Explore (1.5 h)

- [ ] **W3.1 — Period controls (R1, C2.4).** Add one `Find touchdown windows` panel to
  Explore. Offer an exact UTC hour, a day, a full or half year with a selectable year, and
  custom dates with visible UTC, stay and editable
  conditions. Show requested vs evaluated coverage and distinct validation, searching,
  no-data, no-match and result states. Exact time and period searches share the same inputs
  model. **Accept:** a first-time visitor can search a year or half-year they choose or
  type a cross-year custom range without starting a flight or opening Atlas. A year/half-year
  selection and its equivalent custom dates must produce identical results.
- [ ] **W3.2 — Results, recommendation and trade-off (R2, C4.3).** Show the ranked terrain
  candidates, the top windows, representative times, terrain source and a plain-language
  reason for first place. Put the non-recommended reference sites somewhere clearly
  separate. A slower result for an earlier query must not replace the newest selection.
  **Accept:** the H1 regression fixture still puts Nobile first by flexibility and de
  Gerlache first by overlap. A different valid query triggers a fresh ranking. No match
  explains the failing condition. At 390 px controls and cards remain usable.

### W4 — Compare pinned choices in place (1.5 h)

- [ ] **W4.1 — Two exact starts (R3, R4, C1.4).** Pin A/B from inspection or a ranked
  window. Provide same-time two-site and same-site two-time choices. Freeze the comparison
  assumptions; if a global assumption changes, recompute both consistently and say so.
  Show signed deltas, absolute UTC labels and timelines aligned by elapsed stay.
  **Accept:** run the three 2026 cases without retyping coordinates or losing the baseline.
- [ ] **W4.2 — Two ranges (R3, R4).** For two sites use one shared set of UTC candidates
  and report eligible counts, common starts and longest eligible groups. For the same site
  across two windows, keep separate denominators and display each representative date.
  **Accept:** test sites whose windows do and do not intersect, and two same-site periods
  of different lengths. No result from one date is labelled as if it came from the other.

### W5 — Verify the flow, visuals and teaching mode (1.75 h)

- [ ] **W5.1 — Desktop and 390 px (R6, C7.3).** In one isolated Playwright browser, run
  a user-entered search outside the H1 fixture, change the rank preference, pin two
  options, compare and return to Mission. Re-run H1 separately as a regression.
  Exercise both exact-start and period modes as well as no coverage and no matches.
  Verify touch-size controls, keyboard focus, clipping, no console errors, and both old
  hashes redirecting to Explore while preserving mode. Capture screenshots/results and
  separate the automated walkthrough from the still-required newcomer and phone tests.
- [ ] **W5.2 — Preserve and explain the orbits (R5, C5.2).** Verify the two existing
  [Mission rings](site/js/views/polar3d/index.js) from #51: cyan Moon around Earth, amber
  Earth around the Sun. Check two UTC times in Mission at desktop and 390 px. Clearly
  name the schematic rings and distinguish them from the cyan polar boundary. Sun/Earth
  directions change with time; the circles and distances are illustrative.
  Check that a WebGL failure leaves Explore usable. Do not redo the orbit or use it in
  the search. If it fails, report the scene/camera/viewport and screenshot; keep 2D usable.
- [ ] **W5.3 — Protect Education and result provenance (C4.3, C7.2).** Verify that Expert
  settings survive a mode toggle and the guided Mission starts without the retired tabs.
  When showing an Expert recommendation, expose terrain/assumptions and geometry limits.
  When showing an Education verdict, keep the existing illustrative wording. Do not mark
  the full six-step story verified unless actually walked through.

### W6 — Stop cleanly and hand off (1 h)

- [ ] **W6.1 — Re-run the required checks for changed code.** Run window/ephemeris checks
  applicable to the change, both search fixtures, final browser checks and `git diff --check`.
  Fix critical incorrect numbers, unsupported coverage claims and broken baseline state
  before visual polish. If a case cannot be verified, keep its box open.
- [ ] **W6.2 — Leave a restart point.** Check off only verified outcomes in this file and
  [Background](doc/Background.md#release-checks-for-the-planning-workflow). Update the
  numerical score only when its exact weighted check passes. Record branch/SHA, tests
  and outputs, unresolved issues and the exact next slice. No push, deployment or
  competition submission is part of this run.

## OMP run and recovery

Use the copyable goal and recovery commands in [OMP.md](OMP.md). This file remains the
only construction plan and checkpoint log. W0–W6 is the ten-hour core; do not start
M1–M5 under the same goal.

### Execution log

Append one line per checkpoint: **UTC | slice/status | branch and commit | commands and
evidence | blockers | next exact action**. Record the session ID/path separately and use
local screenshots or traces where useful. No implementation run has been started by
this document.

## Mission and Atlas workstream

Build a separate **South Pole** prototype tab (working title) that moves from the
Sun–Earth–Moon overview to a detailed south-pole surface map. The current Mission and
Atlas tabs stay usable while the prototype is evaluated. The new tab is for south-pole
site selection. The 3D view explains where the Moon, Earth and Sun are; the 2D map is
where users inspect terrain, select points and review candidates. Compare, Date slip
and Plan stay retired.

**Which points belong in the new tab.** Draw the south-pole study boundary on the
map. Use coordinates and the active terrain layer's documented footprint to decide
what to show. Presets outside the study area do not appear in the default markers,
site selector or recommendations. Within the study area, a named point may be a
reference, but it qualifies as a candidate only if its terrain and visibility data
cover the selected scenario. Mark missing data explicitly. Newly added presets and
custom points follow the same rule; mission names are not a filter. Leave the legacy
site catalogue and CSV intact.

| Slice | Depends on | First deliverable |
|---|---|---|
| M1. Connect the 3D overview and 2D atlas | W1.1–W1.2 for exact shared context | Tap the Moon to open the detailed polar map and return to the same view |
| M2. Improve globe controls and preserve the orbit rings | Can reproduce in legacy Mission; validate in M1 | Predictable rotation, no unintended navigation, both orbit guides |
| M3. Score a pilot region | W1.3 and M1's map surface | One colored, inspectable grid that recommends candidate cells |
| M4. Scale map loading and add data | M3, plus verified source and coverage | Coarse overview with detailed tiles loaded on demand |
| M5. Show Earth visibility with a signal pulse | W1.3, M1 and M2 | A point-to-Earth illustration driven by the selected site's geometric state |

- [ ] **M1 — Open the detailed map from the Moon.** Add the prototype as one new tab with
  two views: the existing Mission 3D scene and a full-width 2D south-pole map. Reuse the
  [current globe hit test](site/js/views/polar3d/index.js#L278). Show the study area and
  current selection in 3D; leave the default site list and candidate markers to the 2D
  map. Use a deliberate Moon tap to open the map. Provide a keyboard-accessible “Open
  south-pole map” button and a 2D fallback if WebGL fails. Pass the selected site or map
  pin, UTC touchdown and preview time separately. If the clicked point is outside polar
  coverage, center the map on the south pole and explain why. Returning from the map
  restores the camera and keeps any explicitly selected landing point. Use the
  [separate Atlas app](doc/PORT_PLAN.md) in the prototype only where rights and
  integration allow it; use the native polar map as a fallback. The current Atlas hash
  accepts a pin/time on entry, and does not provide a working return path. Do not claim
  an Atlas-to-Mission sync until that handoff is implemented.
  **Accept:** on desktop and at 390 px, open the map by clicking/tapping the Moon, select
  a polar point and return to the scene. Preserve the selected point and exact UTC
  context with the native map. Test the same with Atlas if enabled. Dragging, pinching
  and tapping a site marker do not accidentally switch views. Test three points: one
  outside the study area is absent from the default map and list; a covered polar point
  can be selected; a polar point without usable data is marked unknown and never enters
  the shortlist. Adding a new nonpolar preset must not change the result. The old tabs
  still work.
- [ ] **M2 — Make globe dragging predictable.** Reproduce the current discomfort at an
  overview zoom and near the pole. Compare a damped, north-aligned orbit with a
  grab-the-globe control in which the point follows the pointer. Choose by which is
  easier to track on mouse and touch. Keep the camera interaction separate from the
  body positions, support pinch/wheel zoom, and offer “Reset to south pole”. Reuse the
  existing cyan Moon-around-Earth and amber Earth-around-Sun schematic rings from W5.2;
  do not add new orbit mechanics. Distinguish the cyan polar boundary from the cyan orbit
  in the legend.
  **Accept:** record before/after at desktop and 390 px. At both zooms, the view follows
  a horizontal and vertical drag without jumping or flipping, pinch does not navigate,
  and reset returns to a repeatable view. Check both rings at two UTC times.
- [ ] **M3 — Add a color-coded candidate grid.** Start with a small covered region and
  a regular grid in the documented south-polar projection. Record its bounds, nominal
  cell size and native DEM resolution; do not imply sub-cell accuracy. At one selected
  UTC touchdown and stay, calculate regional slope, total Earth visibility above the
  chosen margin, and its longest continuous window using the native evaluation. Add
  sunlight if an active mission rule requires it. Define editable hard limits and
  preference targets before calculating a simple weighted score, with input values and
  weights visible. Use light green for all limits and targets met, yellow for limits met
  but a target missed, red for an evaluated hard-limit failure, and gray or hatching for
  unknown/outside coverage. An aggregate score must never override a failed hard limit.
  Use text and a legend alongside color. List the top qualifying cells and let users
  jump from the list to the map. Tap a cell to show its metrics, failed rule, resolution
  and an action to use it as a candidate. Treat the score as **regional screening**,
  not landing safety or verified communications.
  **Accept:** demonstrate a green, yellow, red and unknown cell with known inputs.
  Changing the date or Earth margin updates the correct fields while the grid geometry
  stays fixed. Confirm at least one sampled cell against native point inspection.
- [ ] **M4 — Scale the detailed map and data without freezing interaction.** Load a
  coarse overview first, then request fine relief and scoring data for the visible
  bounds and zoom. Cache by data version and separate static slope tiles from
  scenario-dependent visibility results; cancel or ignore old queries after a time or
  region change. Profile the pilot before expanding to the full supported south-pole
  area. Validate data version, coverage, projection and units before adding a source.
  Atlas's existing finder already uses slope and long-term illumination/visibility;
  label that reference layer separately from the native grid for a selected date.
  **Accept:** drag, zoom and select during loading on desktop and at 390 px. The correct
  tile appears after a rapid date change, no stale score is reused for a different
  scenario, and the map explains missing data instead of coloring it red.
- [ ] **M5 — Animate the selected point's Earth visibility.** Add a dashed path from the
  selected lunar site in 3D toward Earth. Move a pulse along it while the native Earth
  visibility state is available and stop it on the first blocked sample at the selected
  time, including terrain or the local horizon. Show “Visible”, “Blocked” or “Unknown”
  as text and use a static line or marker in reduced-motion mode. Paris or another
  named target may be an explicitly illustrative label. A real station model would need
  verified station and Earth-orientation data, plus separate endpoint and link checks;
  the current engine uses Earth's direction and does not check reception in Paris.
  **Accept:** scrub one visible, one blocked and one out-of-coverage case. The pulse and
  label match the same site's native detail readout regardless of how the camera is
  turned. No pulse plays for blocked or unknown; reduced motion has no moving pulse.

## Backlog outside the ten-hour core

These checks from the earlier review still matter. Keep them open even if the primary
demo passes.

- [ ] **C5.3 — Explain the obstructing skyline.** Mark the relevant direction/terrain
  segment when reviewing an event. Verify one terrain-backed rim case at matching UTC in
  2D and 3D. Add a guided Apollo versus south-pole example when the result view is stable.
- [ ] **C7.3 — Observe real users and physical devices.** Time an unfamiliar user on
  desktop and a physical iOS/Android phone. Check whether they can explain the trade-off
  in about a minute. Walk all six Education steps in the three supported languages.
- [ ] **Atlas release decision.** Confirm permission to redistribute the separate app's
  code/assets and document the upstream revision and credits. If it cannot be verified,
  leave Atlas out of the judged build/demo. If kept, add any Atlas-to-Explore handoff
  only with both provenance and exact pin/time preserved.
- [ ] **Data provenance.** Recover generation commands for ephemeris, DEMs, hillshade
  and preset skylines and record gaps in `site/data/PROVENANCE.json`. Check new site
  coordinates against primary sources. Keep computed rim examples distinct from official
  landing targets. Extend search beyond the six current terrain presets only after
  adding validated terrain; slope and landing safety are separate work.
- [ ] **Submission and retirement.** Check the [submission draft](doc/SUBMISSION.md) against
  the exact release and reproduce the demo without retired tabs. Verify the final URLs without
  login and check submission separately from deployment. After the workflow is stable,
  remove the hidden markup, styles and handlers for Compare/Date slip and keep old
  hashes redirecting. Defer new flight effects, orbit mechanics and additional mobile work.
