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

## F. For people who are not specialists

- One plain sentence next to each number, for example "the Sun is 1.6° above the horizon, about three Sun-widths".
- One action that sets Apollo 11 beside a south-pole site on the same date, to show why the pole is hard.
- A glossary: azimuth, elevation, lunar day, libration, direct-to-Earth.
- Visuals for the demo video and the slides.
- Education mode (in progress): a guided six-step story on the Mission page, with a guide character.
  Entry point: an Expert / Education pill in the top bar of every page (global state in `site/js/mode.js`, kept in
  the URL hash and localStorage). In Education mode the
  guide greets on the start page, the probe cards use plain wording (no numbers), and "Start the mission" opens the Mission page
  at step 1 (objective). Then: pick a site, launch, a delayed launch breaks the plan, fix it with four levers,
  mission-complete card. A simplified teaching verdict (battery against the longest night, Earth-contact share,
  relay satellite) lives in `site/js/edu/verdict.js`, is labelled as illustrative, and is used only there; Expert
  mode is unchanged. Story text is in `site/i18n/story.*.json` so it can be edited without code.

## G. Before submission

- Add future CLPS targets and landing sites of other countries' programmes to the curated list; the challenge text
  names both. Every site carries a source for its coordinates.
- Test on real phones: iOS Safari and one Android.
- Confirm the official submission format and deadline. Nobody has checked this year's rules yet.
- Decide what happens to the Cloudflare email check before the judges open the link.
