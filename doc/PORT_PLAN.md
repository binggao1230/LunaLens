# Port plan: a new map page modelled on `daniel27-space/lunar-navigator`

Status: working document on branch `bing/port-plan`. Not merged. Written 2026-11-14.

Decision taken: the reference entry for the same challenge is the spec. Where it and we differ, it wins. The new
work is **one new page** inside our site; the existing Mission, Explore, Compare and Date-slip views stay until
the new page can replace Explore.

## 1. What the new page is

A full-screen south-polar map with everything the reference app puts around it:

- **Layer bar**, one row of seven layers, each button carrying a label and a one-line subtitle: `Find a site`,
  `Sun now`, `Avg sunlight`, `Avg Earth view`, `Shadow`, `Height`, `Slope`.
- **Map canvas**: south-polar stereographic view, pan and zoom, markers for the curated sites, click to pin a
  point, coordinate readout.
- **Right-hand panel**: onboarding ("Start here" with two entry paths), latitude/longitude entry, assumptions
  (sunlit rule, Earth mask, observer height) collapsed by default, and the finder.
- **Bottom time bar**: play, 1 h / 6 h / 1 d / 7 d speeds, a scrubber and the UTC clock.
- **Verdict and date ranking**: two or three pinned points compared in words with a per-measure winner, and a
  ranked strip of landing dates for a 7 / 14 / 30-day stay.
- **Share and export**: a URL that reopens the same points, date and assumptions, and one CSV.

## 2. Data pipeline — our own scripts, PGDA as the source

We download the source rasters and build our own products, so provenance stays ours. Sources confirmed from the
reference's `layers.json`:

| Layer | Source raster | Native | Product we build |
|---|---|---|---|
| Avg sunlight | `https://pgda.gsfc.nasa.gov/data/MoonIllumination/AVGVISIB_75S_120M_201608.TIF` | 120 m, int16, scale 4e-5 | 2048² WebP, `fraction = value/250`, nodata 255 |
| Avg Earth view | `…/AVGVISIB_75S_120M_201608_EARTH.TIF` | same | same encoding |
| Permanent shadow | `…/LPSR_75S_120M_201608.TIF` | same | 1-bit mask as WebP, 255 = shadowed |
| Height | our `dem240.i16.gz` (LOLA LDEM_75S_240M) | 240 m | hillshade + encoded height tile |
| Slope | computed from `dem240` over an 80 m baseline | 240 m | WebP, degrees × 10 |
| Global DEM for the 3D globe | `https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_16.tif` | 16 px/deg | RGBA PNG, `h_m = (R*256+G)*0.5 − 10000` |

Citation for the three PGDA products: Mazarico et al. (2011), *Icarus* 211, 1066–1081, 2016-08 release, PGDA
product 69. Every product lands in `site/data/layers/` with its own entry in `PROVENANCE.json` and a loader in
`site/js/engine/layers.js`.

All layers share one grid: 2048² over ±304 km, pixel 296.875 m, row 0 = max y, identical to the reference's
`sp_meta.json`, so the same shader and the same hit-testing serve every layer.

## 3. Rendering

- **Map**: one canvas, stereographic projection `r = 2R·tan((90+lat)/2)`, `x = r·sin(lon)`, `y = r·cos(lon)`.
  Layer images drawn on demand and composited with their ramp; a hillshade base underneath; markers on top.
- **`Sun now`**: the reference ray-marches the DEM per pixel on the GPU. We do the same with a fragment shader:
  the DEM goes up as a 16-bit height texture, each pixel marches towards the Sun's azimuth and stops at the first
  occluder; the Sun's disc is 0.5°, so the visible fraction, not a binary test, sets the light. This is the one
  piece that must match their result closely, because it is the same physics our numbers use.
- **3D globe**: replace the 96×64 sphere with a displaced mesh built from their 4K DEM (encoding above, 8 m
  quantum) plus the 4K colour map, so the Moon has real relief at global scale instead of a texture on a ball.
- **Colour**: neutral chrome, hue only for data, one ramp per layer, legend always visible, no colour-only
  signal. Copy their listed rules rather than their CSS.

## 4. Logic to port

From `web/src/lib/`, stripped to plain JS modules under `site/js/engine/`:

| Module | Functions we need |
|---|---|
| `windows.ts` | per-hour sunlight / Earth / both under a `Criteria`, longest gaps, stay slicing |
| `landing.ts` | stay statistics and `fitScore = 0.6 × sunlight + 0.4 × Earth`, date ranking |
| `verdict.ts` | per-measure winner with a threshold; near-equal measures omitted; one sentence out |
| `assumptions.ts` | `any / half / all` sunlit rule, Earth mask `0/2/5/10°`, observer `2/5/10 m` |
| `finder.ts` | hard constraints (slope, sunlight range, Earth minimum, PSR proximity) then preference score |
| `ephem.ts` | table reader and interpolation; our reader stays, its interpolation is ours to match |

Our existing `metrics.js`, `site.js` and `geometry.js` stay as the substrate; the ported modules replace the
precomputed `sunVis` flag with a rule function so the assumptions panel can actually change the answer.

## 5. Phases

| Phase | Work | Acceptance | Est. |
|---|---|---|---|
| **P0** | Data pipeline: download the three PGDA rasters, build the 2048² WebPs, slope and height tiles, the 4K globe DEM, `PROVENANCE.json` entries | Every product loads in a throwaway page; the slope layer matches a hand check at Shackleton; the three PGDA rasters agree with the reference's published means | 6–8 h |
| **P1** | Map canvas: projection, pan/zoom, hillshade base, layer switching, ramps, legend, markers, pin, coordinate readout | The seven layer buttons switch the map; a pin reads back the same lat/lon it was placed at within one pixel; 1440 px and 390 px | 8–10 h |
| **P2** | `Sun now`: DEM to GPU, shadow ray-march, Sun-disc fraction, terminator; time bar with speeds and UTC clock | At Shackleton rim the shader agrees with `site.series.sunVis` for the same hour; the bar moves the shadow at 1 h / 1 d | 6–8 h |
| **P3** | Right panel: onboarding, coordinate entry, assumptions, pin list, share link | Changing the sunlit rule changes every number on the page and raises a non-default badge; a shared URL reopens identical state | 6–8 h |
| **P4** | Finder: constraints, ranking, suitability overlay, shortlist; click a shortlist row to pin it | Slope ≤ 15°, sunlight ≥ 40 %, Earth ≥ 30 % returns ≥ 3 cells and the overlay shades exactly those | 8 h |
| **P5** | `verdict` + `landing`: two-or-three-point comparison in words, ranked landing dates | "Shackleton rim, 14 Nov vs 23 Nov" gets one sentence; the strip names the best date per stay length | 6–8 h |
| **P6** | 3D globe on the 4K DEM; replace the current sphere | Relief visible at the limb; the terminator follows the scrubber; no frame-rate regression at 390 px | 6–8 h |
| **P7** | Site table to 41 entries with re-sourced coordinates; mission cards | Every coordinate carries a source; a spot check of five matches the published site | 4–6 h |
| **P8** | QA: 1440/390, first-load budget, deploy | First load stays under 3 MB; deploy workflow rejects a file over 25 MiB | 4 h |

Order: P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8. P1 and P2 make the page look like the reference; P4 and P5
are what makes it useful; P6 is the visual upgrade the brief asked for.

## 6. What we keep from our side

- The 3D polar view with the graticule, the 75°S ring and the orbit rings.
- The horizon panorama and the countdowns in Explore.
- Our validated ephemeris (2026–2030, SVS-checked) until the rule-based series is proven to reproduce it.
- The trilingual interface and the typing/lint checks.

## 7. Risks

- **Two maps, two answers.** Until the new page replaces Explore, the atlas has two ways to show the polar map.
  Keep the new page behind its own route, and do not surface its numbers in Explore.
- **Shader parity.** A ray-marched shadow that disagrees with `site.series` is worse than no shadow. P2's
  acceptance is that they agree; if they cannot be made to agree, ship the terminator only and say so.
- **Delivery.** Three PGDA rasters plus tiles must not enter the first load. Everything under `site/data/layers/`
  is fetched on the layer's first use.
- **Schedule.** This is 2–3 days of work. P0–P2 give a page that already looks like the reference; if the clock
  runs out there, stop and ship that, not a half-finished finder.
