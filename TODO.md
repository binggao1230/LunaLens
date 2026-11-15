# TODO

What is left to do on `site/`, the only build. The measure is the challenge text: `doc/Background.md` and
`doc/Resources.md`. Written 2026-11-14 against `main` at `9b70eb2`; still under discussion.

## Where we stand against the challenge

| Objective in `Background.md` | State | Gap |
|---|---|---|
| Site selection and comparison | Partly | 12 curated sites and custom coordinates work. Compare only shows different sites on one date |
| Date and time flexibility | Partly | A date can be chosen, not a time of day. No view across seasons |
| Sun and Earth relative to the horizon | Done | The horizon panorama and the countdowns are in Explore. The Mission page has neither |
| Power and communication assessment | Done | Mast height is fixed at 2 m |
| Multiple visualisation approaches | Partly | The 2D polar map and the terrain 3D in Explore work. The Mission 3D is weak. Two map overlays are placeholders |
| Temporal dynamics | Done | Timeline and play work |
| Accessibility across skill levels | Partly | Three languages and a glossary; no guided, mobile-first learning path |

The background section's own scenario is a mission that slips: "alternative sites in the same region, or
alternative dates at the same site". The second half is what the product cannot do yet, so it comes first.
3D is "may explore" in the challenge text; it is not where the remaining time should go.

## A. Compare scenarios, not only sites

- Finish the scenario tray: add, duplicate with another date, duplicate with another site, remove. All four are
  dashed placeholders today.
- A row in Compare is a scenario (site + landing date), not a fixed list of the curated sites.
- Accept: Shackleton rim crest on 14 November and on 23 November sit in two rows, in no more steps than comparing
  two sites.

## B. A one-line verdict when the date slips

- Wire "Add selected day as a scenario" in Date slip to the tray from A.
- When two scenarios are compared, say it in one sentence: hours of sunlight gained or lost, hours of Earth link
  gained or lost, whether touchdown is in sunlight.
- Add a landing time of day; it is fixed at 00:00 UTC.
- Accept: "we slip 9 days, is the site still viable?" is answered without reading a table.

## C. One product, not two

- Preview a tracking-camera Earth-to-Moon flight using the selected lander's GLB, with skip, reduced motion and local textures.
- Remove the extra model-reference captions from the start-page cards at the owner's request; retain asset provenance in `site/assets/models/README.md`.
- The Mission page (start page, probe, send probe) and Explore / Compare / Date slip look like two products.
  Check whether they share the landing date and the picked site; this has not been verified. If they do not, make
  them share one state.
- On the Mission page, show the countdown to sunset and to Earthset for the picked site, and one action that opens
  it in Explore.
- Open a pull request for the two commits left on `chenlin/mission-start` (lander model, GLTF loader), or drop them.
- Accept: change the date on Mission, switch to Explore, and the date and the site are the same.

## D. 3D: stop the loss (two hours at most)

- Drop the rendering code on `bing/3d-m1-wip`: the scene there shows a tan slab and a white dot. Keep only
  `moon_color_4k.webp`. The Sun and Earth textures are not needed.
- Mission 3D becomes: the camera starts over the south pole, the Moon uses the 4K texture, and picking a polar site
  reuses the terrain patch that already works in Explore (`terrain-mesh.js`).
- Heights at ×1 by default, or a caption that says the shadows are illustrative.
- If the two hours run out, keep what is on `main` and change only the starting camera.

## E. Terrain and trust

- Fix the ranking: sites with no terrain (Chandrayaan-3 and the Apollo sites) rank above polar sites computed on
  real terrain, and one of them carries the "Recommended" badge. Leave them out of the recommendation, or group
  them apart and say why.
- Put the scripts that produced `ephemeris.*`, `dem240.*`, `dem480.*` and `polar-hillshade.*` into `site/tools/`.
  If they cannot be recovered, say so in `PROVENANCE.json`.
- Compare the sunlit share at a few polar sites with the PGDA 69 average-illumination raster and show the result on
  the Data page.
- The two map overlays (sunlit share, Earth-link share): build them, or remove the buttons.

## F. An educational mobile companion

- **In progress:** Ionic Vue + Capacitor app in `mobile/` has a simple branded start screen, saved English/French/Simplified Chinese language choice, all 12 curated sites, and local daily results for sunlight, Earth visibility, and their overlap. Expandable, NASA-sourced learning notes cover lunar daylight and broad surface-temperature ranges. The guided site comparison, native device review, and educator review remain.
- Add concise, localized context for each selected reference site and explain how to read hourly samples and polar illumination limits.
- **Next:** guide a same-date comparison between a familiar landed site and a south-pole site, with a plain-language prompt about how sunlight and Earth visibility differ.
- Build a separate, mobile-first (PWA) or mobile app for educators, students and younger learners. Keep the full analysis tools on
  the website; the app is a short, welcoming learning experience, not a smaller copy of every website view.
- Let learners choose a curated site and date, then explain sunlight, direct-to-Earth visibility and their overlap
  in plain language with a clear timeline and a small number of readable results.
- Guide a simple comparison between a familiar landed site and a south-pole site, prompting learners to change
  either the location or date and observe what changes.
- Reuse the website's calculation engine and data. Keep sources and accuracy limits visible, and link to the full
  website for custom coordinates, detailed maps and advanced 3D exploration.
- Design for touch, keyboard and screen-reader use; do not rely on colour alone, and respect reduced-motion settings.
- Accept: a learner can complete the site/date comparison on a phone and explain the difference between sunlight
  and a direct line of sight to Earth without needing the advanced website.
- Create the educational visuals needed for the demo and slides.

## G. Before submission

- Add future CLPS targets and landing sites of other countries' programmes to the curated list; the challenge text
  names both. Every site carries a source for its coordinates.
- Test on real phones: iOS Safari and one Android.
- Confirm the official submission format and deadline. Nobody has checked this year's rules yet.
- Decide what happens to the Cloudflare email check before the judges open the link.
