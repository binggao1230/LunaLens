# TODO

Use the [annotated challenge and scorecard](doc/Background.md#lunalens-scorecard) as the
acceptance checklist. The IDs below point to what each proposed change should satisfy.
Start with handoff, time and conditions. Keep proposed dates and sites inside the existing
Expert workflow; Compare, Date slip and Plan stay retired as standalone pages.

| Page | Role |
|---|---|
| Mission | Guided Education story and 3D inspection. Keep the existing same-date site comparison and CSV export. |
| Atlas | Full-width regional map and layers. It is a separate app with its own assumptions; see the release decision below. |
| Explore | Expert site inspection: pick a point, set the landing time, and inspect the local skyline and windows. |
| Data | Expert reference for sources, resolution, validation and limitations. |

- [x] Remove Compare and Date slip from desktop and mobile navigation. Redirect their old
  URLs to Explore without changing the selected mode. Keep Data available in Expert.
- [x] Retain the Education work merged in #59: a six-step Mission story, a guide, translations
  in `site/i18n/story.*.json`, and a separate illustrative verdict.
- [x] Retain the audit evidence: the Horizons fixture, browser/Python window checks, and
  the 120-point long-term PGDA sunlight check passed. PGDA measures agreement in long-term
  sunlight share and does not validate individual event times or landing points.

## P0 — Connect the Expert workflow

- [ ] **C1.3 — Carry the exact point between Mission and Explore.** Keep one active Expert
  scenario with a stable site reference, landing UTC time and conditions. Mission's “Inspect
  this site” action opens that point in Explore; returning to Mission keeps it selected.
  Keep custom pins separately so a second pin cannot change an already selected reference.
  **Accept:** go Mission → Explore → Mission for a preset and a custom polar point. The
  coordinates match on both views. Pick a second custom point and reopen the first unchanged.
- [ ] **C2.3 — Separate landing time from preview time.** Provide one UTC landing-time control
  in Explore. Start with whole-hour inputs to match the native hourly totals. Treat the time
  scrubber as a preview cursor; it must not edit landing time. Explain the available range
  and reject any start that cannot cover the requested stay.
  **Accept:** set 23 November 2026, 12:00 UTC, change the preview by six hours and open
  Mission. Touchdown stays at 12:00 UTC. A stay that extends beyond the data gets a clear
  validation message.
- [ ] **C3.4 — Name and compute two distinct Earth events.** Use the same native clearance in
  both views. “Earthset” is the horizon crossing; “Earth visibility window ends” is the
  crossing of the selected link margin. Give each event a distinct label and report the
  precision of its estimate. **Accept:** at the same point and instant, switch from the 2°
  margin to 5°. The link-margin event and window may change; the geometric Earthset does not.
  Both views agree when displaying the same event.
- [ ] **C4.3 — Show the verdict and its inputs.** Share Expert stay length, Earth margin,
  minimum continuous sunlight from touchdown and touchdown visibility requirement. Put the
  pass/fail reasons, overlap, longest darkness and longest gap without Earth view ahead of
  the optional score. Label each result as 40 m near-field + 240 m far-field, 240 m only,
  or smooth sphere. Keep the six smooth-sphere presets as references. Leave the Education
  verdict separate and illustrative. **Accept:** toggle the touchdown requirement and
  compare both views. Their window totals, sources and pass/fail reasons agree; the screen
  describes a geometric estimate, not certified power or radio performance.
- [ ] **C1.4 — Try an alternative inside Explore.** Keep the current landing as a visible
  baseline. Offer two small actions beside it: “Try another date” (keep the site) and “Try
  a nearby site” (keep the date). Show the change in sunlight, Earth visibility and the
  thresholds using the same conditions. Preserve Mission's existing same-date comparison;
  do not add a new page. **Accept:** start at Shackleton rim crest on 14 November 2026, try
  the same point on 23 November, then de Gerlache rim crest on 23 November. Show the baseline
  and the changes without retyping a location or overwriting the original.

## P1 — Explain the result and verify it with users

- [ ] **C7.3 — Test with someone new to the site.** Have them run the C1.4 case without
  instructions at desktop width and about 390 px. Ask them to explain which option meets the
  conditions and why. Aim for one minute; note where they stop. Check keyboard focus and
  touch inputs and repeat on a physical iOS and Android phone. Separately walk through the
  six Education steps in English, French and Chinese; verify that returning to Expert
  leaves its settings intact.
- [ ] **C5.3 — Show what blocks the view.** Mark a Sun or Earth event on the timeline and
  highlight its direction and the relevant skyline segment. Label the terrain source on
  both the map and result; explain that 3D relief lighting illustrates the scene.
  **Accept:** at a terrain-backed rim site, show the cause of one visibility change using
  the matching skyline, time and site in 2D and 3D.
- [ ] **Resolve the Atlas dependency.** The [vendor build](doc/PORT_PLAN.md) has separate
  ephemeris data and defaults, and the current handoff only sends a point and date into it.
  Confirm permission to redistribute its code and assets; document the revision and credits.
  If permission cannot be verified, leave it out of the judged build and demo. If an “Open
  in Explore” action is added, test that a custom pin and exact UTC time survive the handoff
  and that the result distinguishes Atlas from native calculations.
- [ ] **Make the inputs reproducible.** Recover the commands or scripts for the ephemeris,
  DEMs, hillshade and preset skylines. Record the exact source, parameters and gaps in
  `site/data/PROVENANCE.json`. Verify new preset coordinates against primary sources and
  distinguish computed examples from official targets.
- [ ] **Update and rehearse the [submission draft](doc/SUBMISSION.md).** Remove steps that
  use retired pages. Keep the previous Shackleton case as a regression fixture: 14 to 28
  November 2026, 709-hour stay, 2° margin, 52 fewer hours of sunlight and 11 more hours of
  Earth visibility above the margin. Quote it only if the current workflow reproduces it.
  Check the final project and demo links without an account. Verify judging submission
  separately from deployment.

## P2 — Broaden coverage after the core checks pass

- [ ] **C2.4 — Reuse the same site across seasons.** Let users try a second supported date
  outside the current month with the same site and conditions. **Accept:** verify two
  different seasons inside the data range and show which window changes and why. Extend
  the existing date alternative before considering multi-season ranking.
- [ ] Add a guided Apollo versus south-pole example and shortlist nearby terrain-backed
  candidates. Add regional slope only after its resolution and meaning are clear.
- [ ] Verify polar landmarks, the full lunar disc and the polar boundary in 3D. Defer
  extra flight effects, lander models and mobile app work.
- [ ] Delete the retired views' hidden markup, styles and handlers after checking that
  the Mission comparison and native window calculations do not depend on them. Keep the
  redirects for existing links.
