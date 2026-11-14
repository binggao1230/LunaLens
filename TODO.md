# TODO — next steps

Sources: the team's 14 November design call and the Figma file *NASA SpaceApps*
(`pj5bENLGkYn0XeqofTY4YW`). Everything is about `site/`, the only build.

## What the call decided

- The job is **re-planning**: a site and date were chosen, the mission slipped, and the user must see at a glance
  whether the new site or date is the same, better or worse.
- Two quantities decide that: **sunlight** (power) and the **direct-to-Earth link** (communication). Everything
  else is explanation.
- Comparison has to be **visual first, numbers second**: colour and a percentage, the table behind a click.
- One lunar day is two Earth weeks: the moment the Sun sets, there is no power for half a month.
- Layout follows the house-hunting pattern: map on one side, the list of sites on the other, one active site.

## P0 — the 3D navigator comes first

1. **One 3D scene of the Moon, Earth and Sun, driven by time.** The Moon as a sphere with the real terminator, the
   chosen site marked and coloured by its link state, Earth and Sun drawn in the directions the ephemeris gives,
   libration and the orbit visible. It replaces the flat whole-Moon map as the main visual of the Mission page.
   - Positions come from the same Horizons run that already fills `site/data/ephemeris.*`; the scene reads
     sub-solar and sub-Earth point per hour and interpolates. Nothing is recomputed per frame.
   - The terminator is geometry — `dot(surface normal, sun direction)` — not a painted texture.
   - Site markers reuse the existing colour rule: green with an Earth link, yellow sunlit without one, grey in
     shadow.
   - The date picker and the time scrubber in `site/` drive the scene.
2. **One feasibility number per site and date, with traffic-light colour**, shown on the markers and in the list,
   inputs behind a click.
3. **Compare two scenarios on purpose**: pick two, get a summary table, one overlap graphic, and a sentence saying
   whether the windows meet.
4. **Countdown to sunset and Earthset with the consequence** spelled out.
5. **Map and list point at each other.**

## P1 — if the clock allows

6. **Education mode / Expert mode**: same data, plain sentences versus units and margins.
7. **Send probe**: the 10→1 countdown and the flight, if it does not delay the numbers.
8. **Finish or drop the placeholders** in Compare and the two map overlays (sunlit share, Earth-link share).
9. **Real-phone pass**: iOS Safari and one Android, portrait and landscape; only headless 390 px exists.

## Open questions

- **Which source for the positions**: precomputed table, SPICE inside the browser, or one as the default and the
  other for arbitrary dates.
- **Which renderer**: three.js (already vendored), CesiumJS, or globe.gl.
- **How far the scene goes**: Moon and terminator only, Moon plus Earth, or the full Sun–Earth–Moon geometry.
- **What decides "better"**: average sunlight, uninterrupted hours, Earth-link minutes, or a weighted score — and
  the score must never appear without its inputs.
