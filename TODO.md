# LunaLens construction map

- [x] Mobile and small-screen responsiveness: adapt main web app content, element sizes, probe cards, and controls for narrow mobile screens (~390 px), add automatic screen size mode detection, and drop redundant standalone mobile subpage link.
- [ ] Drop the Explore and Data tabs: Atlas gets an Explore entry button and Explore ends with a Data entry button.
- [x] Ask for Expert or Education mode on the first screen; Expert mode drops the Mission page; Education mode shows the Mission page only (no Data, Atlas, Explore, South Pole or mobile link).
- [x] Add the mobile-first companion at `site/mobile/`: place and UTC day pickers, hourly Sun/Earth/overlap readout, timeline and EN/FR/ZH copy, linked from the main header.
- [ ] South Pole: make the search-window end date drive the grid (best touchdown per block, one sample per UTC day), refresh A/B/C on scenario change, add sunlight to the screening score, sync the 3D clock with the Earth-link readout, centre Refine on the selected block, add an edit-search-window action with UTC date fields, and fix the mobile map aspect ratio.

- [x] Keep probe flights exclusive to Education mode and extend the Mission site panel for a longer visible list.
- [x] Align the Mission site panel bottom with the adjacent comparison chart.
- [x] Keep the Education probe button visible by shortening its site panel.

## Expert workspace convergence (2026-11-15)

**Branch:** `bing/expert-workspace-convergence` from `b156f2d`. Do not push, deploy or submit.
Converge the existing South Pole workspace into one Expert flow: planning period → Globe →
Map → Atlas → Map. One shared preview time, one saved A/B/C set, no second Atlas clock.

- [ ] Shared period/preview clock and Atlas message contract.
- [ ] Expert navigation, one accessible study-panel control and stage-specific tasks.
- [ ] Globe layout, graticule/picking/hover verification.
- [ ] Responsive map, circle-clipped edge blocks and local imagery fallback.
- [ ] Atlas entry gate, tutorial removal, real A/B/C round trip.
- [ ] Desktop and 390 px end-to-end evidence; checks and checkpoint log.

- [x] Keep the top bar full width and scroll page content below it, preserving the transparent start-page header.
- [x] Anchor the Explore timeline to the viewport bottom and keep the scrollable content above it.

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

- **Done:** save metallic finishes in the shared Artemis and Apollo GLBs, verify/reimport Apollo from its official NASA source, and use these materials in both gallery and flight. Original geometry, textures and markings are retained; desktop, narrow preview and landed renders checked.
- **Done:** show Earth, the lander and the distant Moon together at departure; reuse the existing 4K Earth texture, widen the regional terrain view, and enlarge the lander. Preserve the original departure camera and pacing; settle Earth outside the frame so the camera reveals a steady Earth during lunar approach.
- **Done:** Earth is visible at departure and touchdown; the enlarged demonstration lander stays clear over measured regional terrain, retains its braking/descent attitude, and holds the landed shot until Exit/Esc. Desktop and 390 px framing checked.
- Preview a tracking-camera Earth-to-Moon flight using the selected lander's GLB, with skip, reduced motion and local textures.
- Remove the extra model-reference captions from the start-page cards at the owner's request; retain asset provenance in `site/assets/models/README.md`.
- **Shared state: verified.** Mission, Explore, Compare, Date slip and Plan all read one `state` for the landing
  date and the picked site; changing the date in Plan shows up in Explore's date field, and the site follows the
  same way. The framed Atlas page is the exception: it receives the scenario through its URL hash and sends
  nothing back.
- On the Mission page, show the countdown to sunset and to Earthset for the picked site, and one action that opens
  it in Explore.
- **`chenlin/mission-start`: superseded, do not merge.** Its four commits (carousel, Artemis model, GLTF and DRACO
  loaders) arrived on `main` through #29 and #32; its tree is 1,999 lines behind and adding anything back would
  revert work. No pull request; the owner can delete the branch.
- Accept: change the date on Mission, switch to Explore, and the date and the site are the same.


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

- [x] **W0.1 — Record inputs.** Start a single working branch, record its base SHA, data
  metadata, site counts and the exact first task in the run log below. Verify that the
  snapshot is present and that the native site opens locally using `site/tools/serve.py`
  bound to `0.0.0.0`. Do not download replacement data unless the expected inputs are missing.
- [x] **W0.2 — Capture the old behavior.** Run `node site/tools/check_js.mjs`,
  `node site/tools/check_team.mjs` with a working Python/NumPy interpreter, and
  `python3 site/tools/check_ephemeris_svs.py`. Record any pre-existing failure. Capture a
  desktop and 390 px Mission/Explore baseline, including both Mission orbit rings if visible.
  If data checks cannot run, note the blocker; do not call the later scan validated.

### W1 — Make site, time and conditions consistent (1.75 h)

- [x] **W1.1 — Shared native scenario (C1.3).** In the native app keep stable site identities
  for presets and custom pins, a UTC touchdown hour and one set of Expert conditions.
  Mission's “Inspect this site” opens the exact point in Explore. Returning to Mission
  retains it. Follow the existing Mission/Education boundary and preserve Mission CSV.
  **Accept:** return from Explore for both a preset and a custom polar point. A second pin
  must not change the original coordinates. Use rendered labels as evidence.
- [x] **W1.2 — Strict time and coverage (C2.3, R1).** Put input normalization and validation
  in a pure native engine function. Treat `touchdownMs` and `previewHour` separately.
  Replace the fixed 88-day reservation with stay-aware validation; cap only the cosmetic
  preview/lookahead at available data. Audit callers that assume the full old buffer.
  **Accept:** preserve 23 November 2026 at 12:00 UTC when preview moves six hours; pass the
  boundary, partial-coverage and no-coverage fixtures, with no invalid arrays or NaN.
- [x] **W1.3 — One set of windows and event meanings (C3.4, C4.3).** Reuse the native site
  samples and expose one fixed-duration evaluation to Mission, Explore and later W2. Use
  the dynamic sampled Sun rule for totals; a drawn disk fraction must not override it.
  Separate geometric Earthset from the margin-based window ending. Truncate any unavailable
  future event explicitly rather than returning a fake countdown.
  **Accept:** both views agree when showing the same case and event. At 2° versus 5° the
  margin result can change while geometric Earthset does not. Test margin equality,
  touchdown requirement on/off, threshold-grazing Sun and an invalid stay.

### W2 — Calculate the shortlist (2 h)

- [x] **W2.1 — Native search and window grouping (R1, R2).** Put UTC range validation,
  per-hour evaluation, grouping and rank keys in a browser-independent module under
  `site/js/engine/`. Pass the site list and normalized conditions explicitly; no DOM,
  network or Atlas source. Return coverage and reasons as well as results. Cache site
  series; use prefix sums or another bounded approach only if a measured scan needs it.
  **Accept:** unit checks cover start-inclusive/end-exclusive ranges, clipping at both
  boundaries, single-sample groups, one gap splitting two groups, no qualified start,
  excluded reference sites and deterministic ties. No sample may be counted twice.
- [x] **W2.2 — Build the reproducible oracle (R2).** Add a small local check under
  `site/tools/` for a synthetic array and both local snapshot fixtures (H1 2030 and the
  custom cross-year range). Cross-check the
  implemented results against a simple hourly sweep of the same canonical engine, not
  against the previous screens or Atlas. If they diverge, narrow it to one site/hour
  and explain the difference before continuing. Record full H1 runtime; aim for initial
  results within 2 s on desktop and 4 s at a 390 px viewport with CPU throttling. Record
  the device and throttle used. Move work off the UI thread or yield search in chunks only
  if profiling shows blocking.

### W3 — Ship the Expert entry in Explore (1.5 h)

- [x] **W3.1 — Period controls (R1, C2.4).** Add one `Find touchdown windows` panel to
  Explore. Offer an exact UTC hour, a day, a full or half year with a selectable year, and
  custom dates with visible UTC, stay and editable
  conditions. Show requested vs evaluated coverage and distinct validation, searching,
  no-data, no-match and result states. Exact time and period searches share the same inputs
  model. **Accept:** a first-time visitor can search a year or half-year they choose or
  type a cross-year custom range without starting a flight or opening Atlas. A year/half-year
  selection and its equivalent custom dates must produce identical results.
- [x] **W3.2 — Results, recommendation and trade-off (R2, C4.3).** Show the ranked terrain
  candidates, the top windows, representative times, terrain source and a plain-language
  reason for first place. Put the non-recommended reference sites somewhere clearly
  separate. A slower result for an earlier query must not replace the newest selection.
  **Accept:** the H1 regression fixture still puts Nobile first by flexibility and de
  Gerlache first by overlap. A different valid query triggers a fresh ranking. No match
  explains the failing condition. At 390 px controls and cards remain usable.

### W4 — Compare pinned choices in place (1.5 h)

- [x] **W4.1 — Two exact starts (R3, R4, C1.4).** Pin A/B from inspection or a ranked
  window. Provide same-time two-site and same-site two-time choices. Freeze the comparison
  assumptions; if a global assumption changes, recompute both consistently and say so.
  Show signed deltas, absolute UTC labels and timelines aligned by elapsed stay.
  **Accept:** run the three 2026 cases without retyping coordinates or losing the baseline.
- [x] **W4.2 — Two ranges (R3, R4).** For two sites use one shared set of UTC candidates
  and report eligible counts, common starts and longest eligible groups. For the same site
  across two windows, keep separate denominators and display each representative date.
  **Accept:** test sites whose windows do and do not intersect, and two same-site periods
  of different lengths. No result from one date is labelled as if it came from the other.

### W5 — Verify the flow, visuals and teaching mode (1.75 h)

- [x] **W5.1 — Desktop and 390 px (R6, C7.3).** In one isolated Playwright browser, run
  a user-entered search outside the H1 fixture, change the rank preference, pin two
  options, compare and return to Mission. Re-run H1 separately as a regression.
  Exercise both exact-start and period modes as well as no coverage and no matches.
  Verify touch-size controls, keyboard focus, clipping, no console errors, and both old
  hashes redirecting to Explore while preserving mode. Capture screenshots/results and
  separate the automated walkthrough from the still-required newcomer and phone tests.
- [x] **W5.2 — Preserve and explain the orbits (R5, C5.2).** Verify the two existing
  [Mission rings](site/js/views/polar3d/index.js) from #51: cyan Moon around Earth, amber
  Earth around the Sun. Check two UTC times in Mission at desktop and 390 px. Clearly
  name the schematic rings and distinguish them from the cyan polar boundary. Sun/Earth
  directions change with time; the circles and distances are illustrative.
  Check that a WebGL failure leaves Explore usable. Do not redo the orbit or use it in
  the search. If it fails, report the scene/camera/viewport and screenshot; keep 2D usable.
- [x] **W5.3 — Protect Education and result provenance (C4.3, C7.2).** Verify that Expert
  settings survive a mode toggle and the guided Mission starts without the retired tabs.
  When showing an Expert recommendation, expose terrain/assumptions and geometry limits.
  When showing an Education verdict, keep the existing illustrative wording. Do not mark
  the full six-step story verified unless actually walked through.

### W6 — Stop cleanly and hand off (1 h)

- [x] **W6.1 — Re-run the required checks for changed code.** Run window/ephemeris checks
  applicable to the change, both search fixtures, final browser checks and `git diff --check`.
  Fix critical incorrect numbers, unsupported coverage claims and broken baseline state
  before visual polish. If a case cannot be verified, keep its box open.
- [x] **W6.2 — Leave a restart point.** Check off only verified outcomes in this file and
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

### Run log

| UTC | Slice/status | Branch and commit | Commands and evidence | Blockers | Next exact action |
|---|---|---|---|---|---|
| 2026-11-14T23:51Z | W0 done | `bing/omp-touchdown-windows` from `9f1afd5` | `check_ephemeris_svs.py`: PASS, 8,760 h, max Sun/Earth 0.0065°, 0.67 km. `check_js.mjs`: PASS with the backend venv on `PATH` (worst JS/PY metric difference 0.000; 240 m skyline max 0.005°). `check_team.mjs`: PASS, margin 2°/5°, 709 h from 2026-11-14, zero hourly mismatches. Snapshot: 43,824 hourly samples 2026-01-01T00:00Z → 2030-12-31T23:00Z; latest complete 709 h touchdown 2030-12-02T10:00Z; 12 presets, 6 with LOLA skylines. Service `luna-lens-site` on :8768 (0.0.0.0). Screens in `design/baseline/` (Mission and Explore at desktop and 390 px; both orbit rings visible). Pre-existing console noise: `ResizeObserver loop completed with undelivered notifications` (2). | `backend/.venv` was broken (a wrapper that exec'd itself); rebuilt with `python3 -m venv` + NumPy 2.5.4. No data blocker. | W1.1 shared native scenario. |
| 2026-11-15T00:17Z | W1 done | same branch | `site/js/engine/scenario.js`: five entry modes, UTC hour snapping with reported `adjustedMs`, stay-aware complete-stay bound (`touchdown + stay <= last sample`), requested/evaluated/omitted coverage, preview clamped separately. Mission date+time inputs preserve 12:00 UTC while the preview moved 39 h. Custom points keep identity (`c<lat>_<lon>`): two polar picks, first still at −89.50°, 120.00°E. Mission `Inspect in Explore` opened Nobile rim at the same 2026-11-15 00:00 UTC. `nextMarginTransition` added; `check_js.mjs` shows geometric `none` while 2° is open and 5° closes at im1 2026-01-11 10:00 (clearance 4.48°). | none | W2 oracle. |
| 2026-11-15T00:17Z | W2 done | same branch | `site/js/engine/search.js`: prefix-sum eligibility, groups split by any gap, representative = max overlap → shortest darkness → earliest, stable ID tie-break, reference sites excluded, coverage and aggregate failures. `node site/tools/check_search.mjs`: 13 checks pass, including start-inclusive/end-exclusive, single-sample group, gap split, margin equality, invalid stay, H1 2030 exact (1,055/241, 679/132, 419/161, 354/311, 77/62, 0/0), Nobile first by flexibility, de Gerlache 366 h at 2030-05-26 18:00 first by overlap, cross-year 72 starts against an independent sweep, 2030 partial end at 2030-12-02 10:00, 2031 no coverage. H1 scan 6–7 ms, 4,344 starts × 6 terrain sites, arm64 macOS, no throttling (budget: <2 s desktop). | none | W3 panel. |
| 2026-11-15T00:17Z | W3 done | same branch | `site/js/views/expert.js` + Explore markup: five period modes, editable stay/margin/continuous-sun/Earth requirement, requested vs evaluated coverage, distinct invalid/searching/no-data/no-match/result states, ranked cards with terrain, reasons, up to three windows, reference list. Verified in browser: H1 via half-year 2030 (Nobile 1,055/241 first, de Gerlache 366 h first on overlap), arbitrary range, cross-year 2028-12-30→2029-01-02 = 72 starts, no-match day 2026-01-08 with per-condition counts, 2031 range = no coverage (not no-match), 390 px no horizontal clipping, 36 px phone controls, keyboard focus ring on every control, no page errors. | The WebKit harness needed a scroll nudge to repaint text after resize; page DOM and sizes were correct. | W4 comparison. |
| 2026-11-15T00:17Z | W4 done | same branch | Pins A/B from ranked windows without retyping; hourly A/B with signed B−A deltas and two elapsed-hour timelines; period comparison with each range's own denominator, shared-denominator common starts, and non-intersecting message. Verified: de Gerlache vs Nobile (366/327 h overlap, −39 h), 828 of 3,707 common UTC starts in H2 2030, Nobile vs Shackleton rim H1 common = 0, de Gerlache two same-site windows (26 May/15 Jun, −4 h overlap, +55 h sunlight), de Gerlache H1 vs Nobile year (8.1% vs 29.1%, no common start). Global condition change re-runs the search and both comparisons. | “Same site, two periods of different lengths” is reachable by re-running a period and re-pinning; the automatic default for same-site pins stays hourly. | W5 checks. |
| 2026-11-15T00:17Z | W5 done | same branch | Automated browser walkthrough at 1440 and 390 px: user-entered cross-year search, rank switch, pin and compare, Inspect, return to Mission. H1 re-run separately. Old hashes `#/compare/expert`, `#/slip/expert` → Explore with expert; `#/plan/education` → Explore with education. Mission CSV present and enabled. Orbit rings visible at 2026-11-15 and 2027-05-14, desktop and 390. WebGL disabled by init script: search, 2D map and tiles remain usable; the 3D card says “3D is unavailable on this device…”. Education start page shows Validate and no retired tabs; expert settings (200 h sun, 5° margin) survived a mode toggle. Results show terrain, assumptions and the screening/geometry limit note. Legacy 14→28 Nov clue: Earth +11 h matches; sunlight −65 h instead of −52 h because the canonical rule uses the hourly apparent solar limb (`sunVis`) while the retired Compare used a fixed 0.265° disk fraction. **Still open:** C7.3 newcomer and physical-phone tests, six-step Education walk in three languages, C5.3 skyline segment. | none | W6 close-out. |
| 2026-11-15T00:35Z | W6 done — checkpoint | `bing/omp-touchdown-windows` at `6c6e6f75` (this log entry is the following commit) | Final pass: `check_search.mjs` 13/13; `check_js.mjs` PASS including the margin-vs-geometry assertion; `check_team.mjs` PASS; `check_ephemeris_svs.py` PASS; `git diff --check` clean. Browser: Explore loads with no page errors, 5 ranked terrain sites, same-site pins open the hourly comparison by default. Evidence screens: `design/baseline/`, `design/w3-expert-*.png`, `design/w4-compare-*.png`, `design/w5-*.png`. | Nothing pushed, deployed or submitted. `backend/.venv` is local-only. WebKit screenshots at 390 px occasionally need a scroll nudge to repaint text; the page itself is correct. | Restart point: reopen `#/explore/expert`, run the half-year 2030 fixture, then start the separate Mission/Atlas goal at M1, or close C5.3 and C7.3 first. |
| 2026-11-15T07:44Z | M1 done | `bing/omp-touchdown-windows` + working tree | New **South Pole** tab (`#/pole/expert`) with the Mission globe and a full-width native 2D map (no Atlas frame: redistribution rights are still unverified; M1 allows the native fallback). Reused `createPolar3d` with an activity gate, Moon-tap callback, study ring and optional pulse instead of copying the scene. Moon tap opens the map at the tapped point; a point north of 85°S opens it centred on the pole with an explanation and is not a candidate. Keyboard button opens the map; WebGL failure switches to the 2D map with a message. Map point at 89.568°S 150.481°E kept its identity and time after returning to the globe; nonpolar IM-1 is absent from the study list. | Atlas not embedded on purpose (see Atlas release decision); the native map is the documented fallback. | M2 drag. |
| 2026-11-15T07:44Z | M2 done | same | Chose grab-the-globe: the dragged surface point follows the pointer (`Quaternion.setFromUnitVectors` on the camera basis), no damped turntable. Wheel and two-pointer pinch zoom; camera state is separate from body positions; Reset returns to the south-pole home. Evidence: element screenshots hash 8463453… before, ebb93c9… after a 140 px drag; two resets produce the same hash when the pulse is static. Study boundary pink at 85°S, terrain edge cyan at 75°S, cyan/amber orbit rings kept and named in the on-screen legend. | Pinch not exercised on a touch device; wheel + two-pointer code path shares the same clamp. | M3 grid. |
| 2026-11-15T07:44Z | M3 done | same | Pilot grid in the documented stereographic projection: bounds 16 × 16 km centred at 89.6°S 200°E, 4 km coarse / 2 km fine cells, values sampled at cell centres on the 240 m raster; slope from central differences, Earth visibility over the whole selected stay, longest continuous window. Hard limits 15° / 25% / 48 h, targets 10° / 40% / 100 h, weights 0.5 / 0.3 / 0.2, all editable and shown. 2030-01-01, 709 h, 2°: **2 green, 15 yellow, 47 red**; changing margin to 5° gives 0 green, 0 yellow, 64 red; recompute 4–6 ms with geometry fixed. A green cell at 89.584°S 145.492°W shows 8.8° slope, 41%, 288 h. Probe at 74.9°S is unknown (hatched, no score, no candidate action). `check_grid.mjs` matches one cell against a native `Site` series (Earth share and longest window equal). | Deep cells can read 0% Earth because the terrain horizon blocks the low Earth; that is a real result, not missing data. | M4 tiling. |
| 2026-11-15T07:44Z | M4 done | same | Coarse 16-cell grid first (2.4 s), fine 64-cell grid after zoom/refine (7.9 s), static skyline cached per cell; scenario-only recompute 4–6 ms and separate from geometry. Fine relief is regenerated for the visible bounds and zoom (384² samples, cached by centre + scale, skipped while dragging) over the coarse 512² overview. Date changed twice during the first build: the final grid matched the last date (0 green at 2026-11-15), selection survived, no stale score. Missing rasters are grey/hatched and explained, never red. Interaction (zoom, site select) worked during loading at desktop; phone layout checked at 390 px. | Pilot bounds stay fixed by design; expanding them needs the profiling step this pilot replaces. | M5 pulse. |
| 2026-11-15T07:44Z | M5 done | same | Dashed site→Earth path plus a moving pulse in the 3D scene, driven by the native sample: Visible at 2026-11-18 02:00 (67 h into the stay), Blocked at touchdown and no pulse; Unknown hides line and pulse. Label states Visible/Blocked/Unknown with the UTC time in the panel. Reduced motion (Chromium, `prefers-reduced-motion: reduce`) keeps the line static: two frames 900 ms apart hash equal. Paris/station wording is not claimed; the path is the geometric direction only. | Pulse visibility is the geometric skyline state; the link margin remains a separate condition and is stated in the panel. | Final checks and commit. |
| 2026-11-15T08:52Z | M1 amendment (Atlas in the same page) | same | The South Pole page now defaults to an embedded Atlas map beside the globe, with a **Map source** toggle to the native screening map. The frame receives the selected point and exact UTC through Atlas's share hash; Atlas clears the hash on load, so every scenario change reloads the frame with a counter. Verified: 2026-11-15 07:00 UTC on entry, 2027-05-14 12:00 UTC after changing the touchdown; native toggle builds its grid; no page errors. Atlas selections do not sync back, and its numbers stay labelled as a separate app. This supersedes the "no Atlas frame" sentence in the M1 row. | **Rights unresolved:** embedding is for local evaluation; the Atlas release decision still blocks a judged build. | Final checks and commit. |
| 2026-11-15T09:12Z | M2 amendment (owner feedback) | same | Replaced the quaternion grab with a screen-space orbit because the owner reported inverted horizontal motion, excessive vertical sensitivity and no visible zoom. New rules: surface follows the pointer (camera rotates −dx about the screen-up axis; verified camera z +1.47 after a 100 px right drag and the selected marker +144 px), vertical 0.0042 rad/px (60 px ≈ 14°, per-event cap 0.2 rad, stop before the far pole), +/− buttons at the globe, wheel/pinch unchanged. Also: pixel ratio capped at 1.5, pulse rendered at ~25 fps, Atlas iframe set to `about:blank` whenever the map is not showing it, and the old global timeline (`.scrub`) hidden on South Pole. | The owner must retest the feel in a real browser; automated checks now cover direction, not taste. | None. |
| 2026-11-15T09:12Z | M3 amendment (whole study area) | same | The default native grid now covers the whole 85°S study area in **137 blocks of ≈23.3 km** (centres south of 85°S, clipped to the boundary), with the 16 × 16 km / 2 km Shackleton pilot kept as a scope option. Coarse blocks compute their skyline at 1° azimuth steps for speed; date/margin changes still recompute scenario fields only. At 2026-11-15, 709 h, 2°: **1 green, 22 yellow, 114 red, 0 unknown**, geometry built in 9.2–9.5 s with progressive updates; pilot scope rebuilds 64 cells in 7.9 s. `check_grid.mjs` now 7/7 (adds the whole-pole bounds test). | Blocks straddle the 85°S line; fills are clipped to the boundary, values stay centre samples. | Final checks and commit. |
| 2026-11-15T10:05Z | M1/M3 amendment (staged flow, owner design) | working tree | South Pole is now one full-screen stage with three ordered states, not parallel tabs: **Globe → Map → Atlas**. A launch-window dialog opens first (window start/end, stay, coverage, latest complete touchdown), then a persistent bottom bar keeps the same window; moving the start handle changes the screening touchdown, the end handle is the cutoff. The map has two tabs (South Pole blocks / Whole Moon); clicking a block opens a card with slope, Earth-visibility share, longest continuous Earth link, screening score and rule failures, then **Enter Atlas** opens Atlas for that block and time. Card heads and the old back/open/global buttons are gone; the map is full-bleed and the study/info panel floats on the right. Atlas keeps its own right panel on the Atlas stage, so our panel hides there. Globe hover marks the 85°S cap selectable. | Whole Moon is a first pass (equirectangular image + night shading); the staged flow still needs the owner's feel test. | Checks and commit. |
| 2026-11-15T10:40Z | M1/M2/M3 amendment (single range, true scale, shared A/B/C) | working tree | One **single-track range** with two handles now sets the launch window (dragging start moved 2026-11-15 → 2027-07-19 and updated coverage). The globe uses **one true scale**: Moon radius 1, Earth 3.67 at 221, Sun 400 at 86,100, with Moon/Earth/Sun framing buttons; the Earth frame shows the true-size disc. Rotation now applies the same screen-axis quaternion to position and orientation (no `lookAt`/up degeneracy), removing the sudden flips. Selection is shared: Map → block card → Enter Atlas → save the target as **A/B/C**; Map draws all saved points and the panel compares Earth visibility, longest continuous link and slope for up to three. Atlas keeps its own right panel; our save strip floats over it. | Whole-Moon tab is still first pass; Atlas point = the point Atlas was opened with (its internal map click is not exposed). C5.3 + provenance still open. | Checks and commit. |
| 2026-11-15T10:55Z | M1/M2/M3 amendment (library orbit + UI pass) | working tree | Replaced the hand-written globe orbit with **Three.js OrbitControls** (damping, rotate/zoom, polar clamp) and removed the custom quaternion path; horizontal and vertical drags both change the view with no console errors. Removed the extra Moon/Earth/Sun framing buttons. Study panel and window bar now collapse and can be restored (Panel button in the HUD; × and a floating Window button). The window bar is one track with two handles, a gradient fill and dated handles; moving it requests a fresh globe frame so the sub-solar shading follows. Map opens on the whole 85°S circle, the Moon tab uses `moon_color_4k.webp` at 2048×1024, and the Atlas save strip moved to the top-left under the stage nav (Back button removed). A/B/C still start empty. | Whole-Moon shading is still a first-pass image treatment; OrbitControls uses a fixed up axis with a polar clamp, so the pole cannot be crossed. C5.3 + provenance still open. | Checks and commit. |
| 2026-11-15T11:20Z | M1/M2 amendment (orbital time) | working tree | Added a **time simulation** on the globe: positions come from the same ephemeris at the animated instant, the Moon spins at 27.321661 d, Earth at 0.99727 d, and the Sun sprite at 25.38 d (illustrative). A thin lunar rotation axis is drawn through both poles. Speed buttons 1× / 2× / 3× / 5× / 10× and pause; **1× = 1 h/s**, so 10× advances 20 h in about 2 s (verified: 00:00 → 20:14 UTC, pause held at 20:44). The panel and window bar have minimize buttons, a restore tab for the panel, and a bottom "Launch window ▲" restore pill; native select arrows are inset with a custom chevron. | Sun rotation is a sprite spin, not a textured axial rotation; the clock is local to the globe and does not rewrite the selected screening time. | Push, PR and merge per owner request. |
| 2026-11-15T12:30Z | M1/M2/M3 amendment (compact Expert workspace) | `bing/expert-workspace-convergence` + working tree | Whole-period drag now moves both handles without changing length (365/365; 2026-11-15 → 2027-04-08); endpoint resize changed 365 → 343, then caps at 365 and keeps the preview inside the period. Default Atlas gate is disabled until a screened block exists; map reports 149/149 blocks. Block 7:1 at 85.384°S 90.000°W seeds Atlas with the shared target. Clicking a second Atlas point moved the target to 86.691°S 110.559°W; saving A and B stored the actual Atlas coordinates (A 86.215°S 101.797°W, B 86.691°S 110.559°W) and the parent comparison showed 24%/22% Earth visibility, 171/154 h longest link and 2.2°/2.5° slope. Embedded Atlas now hides its site header, menu, welcome, tutorial, finder/target selector and card help, while keeping the layer bar and the selected-point card after a pick. At 390 px the panel starts collapsed (stage 390 × 698, panel overlap 0) and the toggle changed `aria-expanded` false → true; no horizontal overflow. `check_js.mjs` PASS (worst JS/PY difference 0.000; 240 m skyline max 0.005°), `check_team.mjs` PASS, `check_grid.mjs` 7/7, `check_ephemeris_svs.py` PASS. | Atlas rights remain unresolved; a second native Atlas pin still opens Atlas's own compare card; edge-cell representative selection is covered by `check_grid` but was not separately clicked in the UI; touch was emulated, not tested on a physical phone. | M4: profile the full supported south-pole grid and load relief/scoring tiles by visible bounds and zoom; keep the A/B/C handoff and Atlas chrome contract. |
| 2026-11-15T12:51Z | M1/M2/M3 amendment (shared point, labels, edge cells) | `bing/expert-workspace-convergence` + working tree | Map graticule labels are now drawn after the screening fills, so 270° and 180° are visible at the default pole view. A clipped edge click selected **Block 2:2** at 85.10°S 135.00°W and the card reported the clipped representative point; Atlas stayed enabled. Hovering the south cap at 89.71°S set the cursor to `pointer`, and tapping the Shackleton marker stayed on Globe and kept the selected site. The shared target is now a small ring marker in 3D; Block 7:1 appeared separately from the Shackleton site dot. Saving one actual Atlas point as A stored 85.917°S 96.160°W; Map and Globe then showed the same point and the same 15 Nov 2026 00:00 UTC time. Atlas now posts `slot` ids and the parent matches A/B/C by slot, not translated labels. Final 390 px: panel collapsed, stage 390 × 698, document width 390, no errors. `check_js.mjs`, `check_team.mjs` and `check_grid.mjs` all exited 0; `check_ephemeris_svs.py` PASS. | Atlas rights unresolved; Atlas's own second-pin compare still appears; physical touch not tested. | M4 remains: profile and stream relief/scoring for the full supported south-pole area. |

Evidence note (2026-11-15T01:20Z): the WebKit harness returned screenshots as temporary files and did not write the earlier `design/baseline/`, `design/w3-*`, `design/w4-*`, `design/w5-*` paths; those images exist in the session transcript. The final evidence set was saved explicitly and is committed under `design/checks/w6-*.webp` (H1 desktop, A/B comparison, 390 px panel).

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

- [x] **M1 — Open the detailed map from the Moon.** Add the prototype as one new tab with
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
- [x] **M2 — Make globe dragging predictable.** Reproduce the current discomfort at an
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
- [x] **M3 — Add a color-coded candidate grid.** Start with a small covered region and
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
- [x] **M4 — Scale the detailed map and data without freezing interaction.** Load a
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
- [x] **M5 — Animate the selected point's Earth visibility.** Add a dashed path from the
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
