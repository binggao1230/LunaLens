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
| Accessibility across skill levels | Weak | Three languages. No plain-language explanations, no glossary |

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
- Implement multi-criteria site evaluation (MCDA funnel): separate terrain-backed candidate sites from smooth-sphere
  reference sites, add the 6.5-day Artemis Human Lunar Return continuous-sunlight threshold, compute regional slope
  on the 240 m LOLA DEM, and score sites across simultaneous Sun+Earth window, longest continuous sunlight, eclipse
  survival (longest darkness), and horizon clearance (`archive/team/maeva/site-selection-workflow.md`).
- Put the scripts that produced `ephemeris.*`, `dem240.*`, `dem480.*` and `polar-hillshade.*` into `site/tools/`.
  If they cannot be recovered, say so in `PROVENANCE.json`.
- Compare the sunlit share at a few polar sites with the PGDA 69 average-illumination raster and show the result on
  the Data page.
- The two map overlays (sunlit share, Earth-link share): build them, or remove the buttons.

## F. For people who are not specialists

- One plain sentence next to each number, for example "the Sun is 1.6° above the horizon, about three Sun-widths".
- One action that sets Apollo 11 beside a south-pole site on the same date, to show why the pole is hard.
- A glossary: azimuth, elevation, lunar day, libration, direct-to-Earth.
- Visuals for the demo video and the slides.

## G. Before submission

- **Format and deadline, checked on the official site on 2026-11-14.** Submission happens on the team page's
  Project tab: it opened Saturday 14 November at 09:00 and closes **Sunday 15 November at 23:59 local event time**;
  a saved draft is not a submission, "Submit for Judging" must be clicked. Required fields: project name, summary,
  demo link (slide deck of at most seven slides, or a video of at most 30 seconds, hosted publicly), final project
  link, detailed description, the Super Intelligence disclosure, the NASA data used, and every other reference.
  English throughout. Teams of at most six — we are six.
- **Public links only.** Judges cannot log in: the Cloudflare Access email gate has to come off before submission,
  and the final-project link must open without an account.
- **No NASA branding.** This year's rules forbid generated content that uses NASA logos or design elements; the
  NASA meatball was removed from the app bar on 2026-11-14 and its asset deleted. NASA data itself is encouraged.
- **Site breadth: covered by the Atlas page for now.** Our own curated list stays at the twelve sites whose
  coordinates carry a source, because every added point without a check would break the rule the list exists to
  keep. The Atlas page already carries 41 past, failed and planned missions with their own terrain patches, so a
  judge comparing the two entries sees the full field; the Data page states that those coordinates have not been
  re-sourced. Adding them to our list stays worth doing once each pair is checked against a primary source.
- **Phone pass: engine-level done, hardware outstanding.** Plan, Compare and the framed Atlas were driven at
  390 x 844 with touch in Chrome and again in WebKit (the engine behind iOS Safari): no horizontal overflow, WebGL 2
  present, the Atlas frame renders its canvas, and neither run logged a console error. What is left needs a person:
  open the three pages on one iOS and one Android device and check the address bar, the back gesture and the map's
  pinch zoom.
