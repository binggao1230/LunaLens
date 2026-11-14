# TODO

Reviewed against `main` at `6be10c5` on 14 November 2026. [The challenge](doc/Background.md) asks
one practical question: if a lunar landing slips, can we quickly compare a new date at the same
site and a nearby site on that date? Use `site/`, the web product, to answer it. Start with P0. Keep
the full-width Atlas layout and keep the Plan page retired.

## What works today

- Explore shows the Sun and Earth against a local skyline, with a timeline, playback and
  countdowns. Mission has a south-pole 3D view with a local terrain patch and its own countdowns.
  The Data page has a glossary, data sources and model limits.
- Compare shows separate site/date rows and reports differences in hours. The `+14 d` shortcut
  works. For Shackleton rim crest on 14 vs 28 November 2026, with the default 709-hour stay and
  2° Earth margin, the deployed site reports **52 fewer hours of sunlight and 11 more hours of
  Earth visibility above the margin**. The same-date Mission comparison and CSV export also work.
- The Horizons fixture, browser/Python comparisons and 120-point PGDA sunlight check were rerun.
  The PGDA check measured a Spearman correlation of 0.984 and an RMS difference of 2.71 percentage
  points for long-term sunlight. It does not validate individual rise/set times or landing points.
- The deployed homepage answered without login. Explore, Compare and Date slip had no horizontal
  overflow at 390 px in headless Chromium. Physical phones and the final demo link remain unchecked.

## P0 — Make the date-slip decision work

- [ ] **Add the exact site and time the user chose.** Add a direct action from the selected point
  in Explore to Compare. Make “Add scenario” use the current site and landing time; let users
  edit each row's site or UTC landing time without changing the baseline. Store custom points
  separately so a later pin cannot rewrite an earlier row. Keep the working `+14 d` shortcut.
  See [scenario handling](site/js/app.js#L562).
- [ ] **Turn a Date slip result into a comparison.** Let users select a day by touch or keyboard
  and add it as another row, preserving the site and UTC time of day. The current control is
  a [placeholder](site/index.html#L346). Show the selected date and its result before adding it.
- [ ] **Use the same conditions for the same scenario.** Mission, Compare and Date slip should
  agree on stay length, Earth margin, minimum continuous sunlight from touchdown and whether
  Earth must be visible at touchdown. Distinguish geometric Earthrise/Earthset from the
  opening/closing of the Earth visibility window at the selected margin. Show any failed
  condition by name; put the score after the reasons. Check results at two margins, with and
  without the touchdown requirement, and at a non-midnight landing time. State the time
  resolution and guard against scenarios beyond the available data.

**Acceptance:** From Shackleton rim crest on 14 November 2026, compare the same site on 23 November
and de Gerlache rim crest on 23 November. Keep all three rows intact when editing a row or picking
a second custom point. At desktop width and about 390 px, a first-time user should be able to do
this within one minute and explain which conditions each option passes and what it gains or loses.

## P1 — Make the result credible and the demo repeatable

- [ ] **Label terrain and show the quantities behind the score.** Six of the twelve native
  presets use a smooth-sphere horizon; label them as references and keep them outside terrain
  recommendations. Distinguish 40 m near-field + 240 m far-field profiles from 240 m-only
  calculations. Put sunlight, Earth visibility, their overlap, the longest dark period and
  the longest period without Earth visibility next to any score. Describe these as geometric
  estimates, not actual power output, radio performance or battery survival. A user should be
  able to tell why a case passed or failed without opening the Data page.
- [ ] **Resolve the Atlas dependency before relying on it in a judged demo.** Atlas is the
  [upstream app's production build](doc/PORT_PLAN.md), with separate defaults and data. The
  current handoff carries a point and date into Atlas only. Confirm permission to redistribute
  the code and assets and document the revision and credits. If permission cannot be verified,
  leave Atlas out of the judged build and demo. The core workflow must work in native Explore,
  Compare and Date slip either way.
- [ ] **Make the data reproducible.** Recover or document the scripts or exact commands that
  produced the ephemeris, DEMs, hillshade and preset skylines, with source URLs and parameters.
  Record any missing steps in `site/data/PROVENANCE.json`. Verify coordinates against primary
  sources before adding more presets; keep computed rim points distinct from official targets.
- [ ] **Rehearse and check the submission.** Update [the submission draft](doc/SUBMISSION.md):
  use the verified `+11 h` example, qualify the claims about terrain and link availability, and
  reflect the current login status. Record the demo from one reproducible scenario. Check the
  project and demo links without an account, and try the workflow on a physical iOS and Android
  device. Confirm judging submission status separately; a successful deployment does not
  confirm submission. See the draft for the event checklist.

## P2 — Extend after the core flow passes

- [ ] Let the native map shortlist nearby candidates for the chosen date and show which part
  of the skyline blocks the Sun or Earth. Add regional slope to screening only once its
  resolution and meaning are clear; the current score uses skyline clearance.
- [ ] Compare dates across longer spans than the 28-day slip sweep, and add a guided Apollo
  versus south-pole example for educators. Keep terms and assumptions understandable in all
  three interface languages.
- [ ] Improve 3D as an explanation of a result: verify the polar terrain and landmarks against
  the same site used in 2D; keep the full lunar disc and polar boundary legible. Defer additional
  flight effects, lander models and mobile app work.
