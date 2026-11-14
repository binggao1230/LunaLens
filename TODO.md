# LunaLens construction map

Implement the Expert planning workflow described in [Background](doc/Background.md#expert-planning-scenarios).
The finish line is a runnable Explore screen where a newcomer can choose the first half of
2030, see why sites qualify, and compare two results without leaving the workspace. This
is a **lunar touchdown search**. Earth launch dates, lunar ascent, transfers, landing
safety, power output and radio performance are outside this run.

Use one feature branch based on this plan. Keep the existing navigation: Mission for 3D
and Education, full-width Atlas for regional reference, Explore for native Expert work,
and Data for method and sources. Keep Compare, Date slip and Plan retired as standalone
pages. Keep Mission's same-date comparison and CSV export; do not require Atlas, a flight
animation or a live third-party API for the new workflow.

## Decisions to implement

| Input or result | Contract |
|---|---|
| Candidate sites | Start with the six native presets that have stored LOLA skylines. Keep the six other presets as smooth-sphere references. Do not use Atlas results in native rankings. Reserve arbitrary map-wide search for later. Continue to inspect individual custom points in Explore and show their terrain status. |
| Time | Use UTC, with start-inclusive/end-exclusive search ranges and one-hour touchdown samples. Day, first/second half-year, year and custom controls all produce the same range type. A date-only end presented as inclusive in the UI maps to the following midnight. Landing time is independent of the preview cursor. |
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
  `site/tools/` for a synthetic array and the real H1 2030 fixture. Cross-check the
  implemented results against a simple hourly sweep of the same canonical engine, not
  against the previous screens or Atlas. If they diverge, narrow it to one site/hour
  and explain the difference before continuing. Record full H1 runtime; aim for initial
  results within 2 s on desktop and 4 s at a 390 px viewport with CPU throttling. Record
  the device and throttle used. Move work off the UI thread or yield search in chunks only
  if profiling shows blocking.

### W3 — Ship the Expert entry in Explore (1.5 h)

- [ ] **W3.1 — Period controls (R1, C2.4).** Add one `Find touchdown windows` panel to
  Explore. Offer a day, year/half-year and custom dates with visible UTC, stay and editable
  conditions. Show requested vs evaluated coverage and distinct validation, searching,
  no-data, no-match and result states. Exact time and period searches share the same inputs
  model. **Accept:** a first-time visitor can start H1 2030 without a flight or Atlas.
- [ ] **W3.2 — Results, recommendation and trade-off (R2, C4.3).** Show the ranked terrain
  candidates, the top windows, representative times, terrain source and a plain-language
  reason for first place. Put the non-recommended reference sites somewhere clearly
  separate. A slower result for an earlier query must not replace the newest selection.
  **Accept:** H1 shows Nobile first by flexibility and de Gerlache first by overlap; no
  match explains the failing condition. At 390 px controls and cards remain usable.

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
  H1 search, change the rank preference, pin two options, compare and return to Mission.
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
  applicable to the change, the H1 oracle, final browser checks and `git diff --check`.
  Fix critical incorrect numbers, unsupported coverage claims and broken baseline state
  before visual polish. If a case cannot be verified, keep its box open.
- [ ] **W6.2 — Leave a restart point.** Check off only verified outcomes in this file and
  [Background](doc/Background.md#release-checks-for-the-planning-workflow). Update the
  numerical score only when its exact weighted check passes. Record branch/SHA, tests
  and outputs, unresolved issues and the exact next slice. No push, deployment or
  competition submission is part of this run.

## OMP run and recovery

Use this repository file as the only authoritative task list. Start one OMP coding
session in a persistent terminal on this branch. If the installed profile enables
interactive goal continuation, set one persistent `/goal set` with this file, the
per-slice acceptance rules and a ten-hour **checkpoint**. Do not nest `/loop` inside that
goal: OMP disables goal auto-continuation while loop mode is enabled. Neither command
guarantees ten hours of wall-clock execution or survives host failure on its own.

Suggested kickoff, after switching to the feature branch:

```text
/goal set Read TODO.md and doc/Background.md. Deliver the native Explore touchdown-window workflow in W0–W6 order. Use one writer, prove each acceptance check before marking it complete, and log checkpoints with the exact next action. At the ten-hour checkpoint leave a tested, recoverable state. Do not push or deploy.
```

After each verified slice, or after 45–60 minutes without a finished slice, write a
checkpoint below. Use one writer and a small local commit after an accepted slice; leave
a safe stopping point if interrupted. If two attempts cannot clear a blocker, record
both and continue with independent work. A periodic read-only check can flag that the
checkpoint is stale; it should not start another writer or restart a healthy session.
At the ten-hour checkpoint, stop opening new slices. Finish a safe checkpoint, leave
unverified boxes open, and hand off.

Record the exact OMP session ID/path at startup. If the terminal dies, resume that
session with `omp --resume <id-or-path>` and read the last verified checkpoint and Git
status before editing. Use `/goal resume` if the goal is paused. Do not export an OMP
checklist over this file; its default target can be `TODO.md`. The OMP JSONL records the
conversation and tools. Continuous screen video requires a separate recorder and storage;
neither the recorder nor a periodic check is the source of truth about completed work.

### Execution log

Append one line per checkpoint: **UTC | slice/status | branch and commit | commands and
evidence | blockers | next exact action**. Record the session ID/path separately and use
local screenshots or traces where useful. No implementation run has been started by
this document.

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
- [ ] **Submission and retirement.** Revise [submission text](doc/SUBMISSION.md) to use only
  a reproducible current scenario and no retired tabs. Verify the final URLs without
  login and check submission separately from deployment. After the workflow is stable,
  remove the hidden markup, styles and handlers for Compare/Date slip and keep old
  hashes redirecting. Defer new flight effects, orbit mechanics and additional mobile work.
