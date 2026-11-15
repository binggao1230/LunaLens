# LunaLens — Space Apps submission form answers

Working answers for the NASA Space Apps Challenge 2026 project page. The demo link was
verified as public on 15 November 2026; recheck it before submitting.

Project page: https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator

---

## Project Name

```text
LunaLens
```

---

## Summary

```text
LunaLens is a browser-based lunar landing-site explorer for the Moon's south pole. Mission planners, educators and the public choose a UTC touchdown window, inspect Sun and Earth positions against the real LOLA terrain skyline, and compare candidate points on a shared timeline. The Expert flow moves from touchdown-window search to a 3D Globe, a 2D screening Map and a terrain Atlas; Mission and Education modes explain the same geometry without the full controls. Users can see when a site is sunlit, when Earth is above the local horizon, and how a nearby ridge changes both. LunaLens uses JPL Horizons ephemerides and NASA LRO LOLA terrain, runs entirely in the browser, and states its limits: it is a geometric screening tool, not a landing-safety, power or radio-link model.
```

Word count: 127.

---

## Project Demonstration

The form requires a public slide presentation (maximum 7 slides including the title and
introduction) or a video of 30 seconds or less. The live project is not a substitute for
the demo link.

```text
https://drive.google.com/file/d/1ADRdtMhWl3E4a7Gwni7cMtdsIJp8bd-s/view
```

Verified: MP4, 1920×1080, 28.76 seconds, public download without login.

Suggested 30-second recording path:

1. Open Windows and press `Find windows`.
2. Choose a candidate and press `Use this date`.
3. Confirm the window in Globe.
4. Open Map, select two points and press `Add to compare`.
5. Open `Detailed comparison`.
6. Enter Atlas and show the floating comparison sidebar and four layers.

Suggested seven-slide deck:

1. Title and one-line pitch.
2. Problem: low polar Sun angles and terrain occlusion.
3. Windows: find a touchdown window.
4. Globe and Map: choose a point, read Sun/Earth bars.
5. Compare: shared timeline and detailed comparison.
6. Atlas: terrain, four layers and floating comparison sidebar.
7. Limits and live project link.

---

## Project

```text
https://binggao1230.github.io/LunaLens/
```

Source:

```text
https://github.com/binggao1230/LunaLens
```

---

## Project Details

```text
LunaLens is a browser-based comparison workspace for lunar south-pole landing sites. It helps mission planners, educators and the public understand how local terrain changes sunlight and direct-to-Earth visibility.

What it does:
- Expert flow: Windows → Globe → Map → Atlas → Explore.
- Windows searches a UTC period for touchdown dates that meet one set of Sun and Earth conditions.
- Globe confirms the selected window and shows the Moon at that time.
- Map selects points and adds up to three saved points to a shared comparison.
- Compare shows Sun/Earth visibility, longest Earth link, longest night, all-points-sunlit time, slope, touchdown time and screening status on one timeline and one table.
- Detailed comparison opens a two- or three-column modal for saved points.
- Atlas shows the selected point on terrain with Sun now, average sunlight, average Earth view and shadow layers.
- Mission and Education modes explain the same geometry with fewer controls and a guided story.
- English, French and Chinese interfaces are included.

How it works:
- Sun and Earth positions come from precomputed hourly JPL Horizons data in the Moon's mean-Earth frame; the browser interpolates the table and applies the observer's surface position.
- Terrain horizons come from NASA LRO LOLA polar elevation products. The browser traces the local skyline; the native screening grid uses the 240 m raster and selected sites use finer near-field terrain.
- The Sun and Earth are treated as discs rather than points. A site can be sunlit while Earth is below the terrain horizon, or the reverse.
- Atlas is a separate Apache-2.0 upstream mapping application embedded in the workspace; its data and rendering are not the native LunaLens calculation engine.

Why it matters:
Near the lunar south pole the Sun stays close to the horizon, so a small terrain feature can decide whether a site has power and whether Earth is visible for a direct link. LunaLens makes that trade-off visible without a GIS workstation.

Tools and languages:
- HTML, CSS and vanilla JavaScript.
- Three.js, OrbitControls and GLTFLoader for 3D views.
- Python scripts for data preparation and reference checks.
- React/Vite Atlas build from daniel27-space/lunar-navigator.
- GitHub Actions for GitHub Pages deployment.

Creativity and considerations:
- One shared clock and comparison model across Map and Atlas.
- Timeline combines Sun, Earth, longest night and all-sunlit time.
- Floating, collapsible Atlas sidebar keeps terrain visible during comparison.
- Explicit separation between illustrative Education verdicts and scientific screening.
- Limits are stated in the interface: no power, thermal, radio, launch-window or landing-safety model; terrain is regional, not a certified landing-point survey.
```

---

## Use of Super Intelligence

Selected options:

```text
Coding, Debugging, or Troubleshooting
Writing, Editing, or Translation
Research or Information Gathering
```

Explanation:

```text
AI coding assistants and large language models were used for implementation planning, application code, data-processing scripts, debugging and consistency checks, documentation, interface copy, and English/French/Chinese translation.

The scientific ephemeris and terrain products are provider data, not model output. The browser performs deterministic geometry on those inputs.

The project does not knowingly include SI-generated images, audio or video. No NASA logo, flag, mission identifier or other NASA branding was generated or modified.

The Education mode verdict is explicitly illustrative and must not be read as a NASA result.
```

---

## NASA Data

Add each row separately:

| Link Text | Link URL |
|---|---|
| JPL Horizons — Sun and Earth ephemerides | https://ssd.jpl.nasa.gov/horizons/ |
| NASA LRO LOLA — polar elevation products | https://pds-geosciences.wustl.edu/missions/lro/lola.htm |
| NASA GSFC PGDA product 69 — long-term illumination, Earth visibility and permanent shadow | https://pgda.gsfc.nasa.gov/products/69 |
| NASA GSFC PGDA product 78 — LOLA south-pole terrain used by Atlas | https://pgda.gsfc.nasa.gov/products/78 |
| NASA SVS 5587 — Moon Phase and Libration 2026 | https://svs.gsfc.nasa.gov/5587 |
| NASA Earth Observatory Blue Marble — Earth texture used by Atlas | https://earthobservatory.nasa.gov/features/BlueMarble |
| NASA/GSFC/Arizona State University LROC — mission imagery and maps in Atlas | https://www.lroc.asu.edu/ |
| NASA SVS 4720 — LROC lunar color texture | https://svs.gsfc.nasa.gov/4720 |
| NASA GIBS — Blue Marble Shaded Relief and Bathymetry | https://gibs.earthdata.nasa.gov/ |
| NASA SDO/AIA — 304 Å solar disc | https://sdo.gsfc.nasa.gov/ |
| NASA Apollo 8 Earthrise AS08-14-2383 — landing-page background | https://images.nasa.gov/details/as08-14-2383 |
| NASA GSFC PGDA product 54 — SLDEM2015 terrain used by Atlas | https://pgda.gsfc.nasa.gov/products/54 |
| NASA 3D Resources — Apollo Lunar Module | https://science.nasa.gov/3d-resources/apollo-lunar-module/ |

---

## Space Agency Partner & Other Data

Add each row separately:

| Link Text | Link URL |
|---|---|
| daniel27-space/lunar-navigator — upstream Atlas application, Apache-2.0 | https://github.com/daniel27-space/lunar-navigator |
| Three.js, OrbitControls and GLTFLoader — 3D rendering, MIT | https://threejs.org/ |
| Draco mesh decoder — compressed geometry, Apache-2.0 | https://github.com/google/draco |
| noUiSlider — range controls, MIT | https://refreshless.com/nouislider/ |
| Geist and Geist Mono — interface fonts, SIL OFL 1.1 | https://github.com/vercel/geist-font |
| Atlas mission metadata and credits | https://github.com/binggao1230/LunaLens/blob/main/site/atlas/data/missions.json |
| Wikipedia, where cited for mission history | https://www.wikipedia.org/ |
| Lunar lander display model — Innerscene Corp, CC0 1.0 | https://github.com/binggao1230/LunaLens/blob/main/site/assets/models/lunar-lander.glb |
| Chandrayaan-2 in flight configuration — tashtego, CC BY 4.0 | https://sketchfab.com/3d-models/chandrayaan-2-in-flight-configuration-4d0017f2c5fb49bb9817601858106ddb |
| 3D model credits and licence notes | https://github.com/binggao1230/LunaLens/blob/main/site/assets/models/README.md |
| ImageMagick — texture conversion for NASA assets | https://imagemagick.org/ |

> **Artemis concept model:** `site/assets/models/artemis-lite.glb` has unverified
> redistribution terms. Do not submit until the source and licence are confirmed and added
> here, or remove the model, card and flight from the public build.

---

## Project Submission Verification

Select both:

```text
Agree to Terms and Conditions
Confirm All Work is Original
```

Notes:

- LunaLens native code and text are the team's original work.
- Atlas is an Apache-2.0 upstream project; do not present it as native LunaLens work.
- All NASA data, third-party libraries, fonts and Atlas resources are listed above.
- No NASA logo, flag or official endorsement is claimed.
- The demo link must open anonymously. Do not use the project home page as the demo.

---

## Before submitting

1. Open the project anonymously: https://binggao1230.github.io/LunaLens/
2. Record and upload the public demo; paste its URL above.
3. Check every NASA Data and Other Data link without login.
4. Re-read the Summary and Project Details against the final release.
5. Tick both verification boxes.
6. Press Save, then Submit. Deployment is not submission.
