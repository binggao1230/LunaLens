# Luna Lens — 3D South-Pole Navigator Plan (v0.1)

> The plan for the next block of work on `site/`: replace the current 3D view of the Mission page with a
> south-pole navigator whose Sun, Earth and shadows can be defended in front of a judge.
> `PRODUCT.md` decides features, `PLAN.md` the overall approach; this file decides how the 3D view is built.
> Written 2026-11-14 against `main` at `1f1ec99`.

Tags follow `PLAN.md`: `[VERIFIED]` checked on 2026-11-14 · `[KNOWN]` · `[COMPUTED]` · `[INFERRED]` · `[GUESS]`.
Anything marked **unverified** must be checked by whoever uses it, before use.

---

## 0. Conclusions first

1. **The positions are already right. The rendering is what is not professional.** The hourly table in
   `site/data/ephemeris.*` (JPL Horizons, Moon mean-Earth frame) was compared with NASA SVS *Moon Phase and
   Libration 2026* over all 8,760 hours of 2026: the largest differences are 0.0007° (sub-solar longitude),
   0.0006° (sub-solar latitude), 0.0065° (sub-Earth longitude), 0.0010° (sub-Earth latitude) and 0.7 km
   (Earth–Moon distance) `[VERIFIED]`. The SVS values are published rounded to 0.001° and 1 km, so most of that is
   rounding. Do not spend time on a new ephemeris source.
2. **The work is the south pole.** The current scene is a whole-Moon ball seen from the Earth side, with the pole on
   the bottom edge, no relief and a 10.7 km/pixel texture `[COMPUTED: 2π·1737.4 km / 1024 px]`. A challenge about
   polar landing sites needs the pole in the middle of the screen, with real terrain and real shadows.
3. **Shadows must come from the terrain horizon, not from a shadow map.** With the Sun 1.5° above the horizon a
   3 km crater rim throws a shadow about 115 km long `[COMPUTED: 3 km / tan 1.5°]`. Shadow maps cannot hold that,
   and the ×3 height exaggeration in today's terrain patch triples every shadow, which makes the picture wrong.
4. **Keep three.js. Do not adopt CesiumJS, globe.gl or SPICE in the browser** (reasons in §3).
5. **One scene, three distances**: the pole cap, a site close-up, and the view from the lander. The third is the
   literal answer to the challenge's one firm requirement, "Sun and Earth relative to the horizon".

---

## 1. What is wrong today

Seen in `site/js/views/mission.js` (`create3d`) and `site/js/views/scene3d.js` at `1f1ec99`:

| # | Problem | Consequence |
|---|---|---|
| 1 | Home camera sits over the sub-Earth point | The south pole, the subject of the tool, is on the limb |
| 2 | The Moon is a smooth sphere with `moon_1024.jpg` | No relief; the polar texture is stretched and almost featureless |
| 3 | Lighting is one directional light on a sphere | The terminator is right, but no crater is ever in shadow; a site in a permanently shadowed crater looks lit |
| 4 | The terrain close-up is a separate scene (`scene3d.js`) on another page, with shadow-map shadows, ambient and fill light, and ×3 heights | Two 3D views that disagree; shadows there are illustrative, as its own caption admits |
| 5 | Earth is a flat blue sprite, Sun a yellow ball, at arbitrary distances and sizes | "Not to scale" is stated, but nothing in the scene has a true angular size |
| 6 | 900 random stars | Decoration presented next to science data |
| 7 | `create3d` is 190 lines inside a 743-line view file | Hard to change without breaking the list, the 2D map and the probe flight |
| 8 | The scripts that produced `site/data/ephemeris.*`, `dem240.*` and `polar-hillshade.*` are not in the repository | The data cannot be regenerated or extended from a fresh clone |

What is right and stays: the frame convention (`unit(lat, lon)`, Moon-fixed, y towards the north pole), the marker
colour rule, the date picker and scrubber driving one `frame()`, redraw on demand instead of a render loop, and the
fallback to 2D when WebGL fails.

---

## 2. Target

### 2.1 Three distances, one scene

| View | Camera | Shows | Answers |
|---|---|---|---|
| **Pole** (default) | Orbits the south pole, 0° longitude up to match the 2D map, tilt and zoom free | The cap 75°S–90°S with true relief, true shadows for the current hour, all polar sites, the directions to Sun and Earth on the rim of the view | Where is it light right now, and which sites are in it |
| **Site** | Flies to the picked site, 20–80 km across | The same terrain closer, the site's horizon ring, Sun and Earth direction arrows with elevation | Why this site is lit or dark: which ridge is in the way |
| **Surface** | Stands at the site at mast height, looks along the horizon, turns 360° | The skyline, the Sun as a disk and Earth as a disk at their true angular sizes and true azimuth and elevation | Sun and Earth relative to the horizon, as the lander sees them |

A fourth, **Moon** view (the whole globe, today's picture) stays as the zoomed-out end of the Pole view for the
non-polar sites. It needs no new work beyond a better texture.

### 2.2 Accuracy rules for the scene

- The scene frame is the Moon-fixed mean-Earth frame. The Moon never rotates in the scene; Sun and Earth move.
- Sun and Earth **directions** always come from `Ephemeris.stateAt()`. Nothing is recomputed from orbital elements.
- Lit or dark on screen is decided by the same rule the numbers use: the Sun's upper limb against the terrain
  horizon (`engine/site.js`). The picture and the table must never disagree about a curated site.
- Heights are drawn at ×1 by default. If an exaggeration control is kept, it changes the mesh only, never the
  shadows, and the caption says so.
- In the Surface view, angular sizes are true: Sun about 0.53°, Earth about 1.9° `[COMPUTED: 2·asin(6371/384400)]`.
  In the Pole and Site views Sun and Earth are direction indicators and the caption says they are not to scale.
- No ambient or fill light on the terrain. Shadowed ground is drawn dark but not black (a fixed low floor so relief
  stays readable), and the legend says that this floor is a display aid, not earthshine.
- Every caption that states a resolution or a source reads it from the data descriptor (`*.json`), not from a
  string typed into the view.

---

## 3. Decisions and why

### 3.1 Positions: the precomputed Horizons table

| Option | Verdict |
|---|---|
| **Precomputed hourly table** (`site/data/ephemeris.*`, 2026–2030, 2 MB) | **Use.** Verified against SVS (§0). Offline, reproducible, already wired |
| SPICE in the browser (WASM builds such as `tspice`) | Rejected for now. Needs `de440s.bsp` (32.7 MB `[VERIFIED]`) plus frame kernels at page load, and the candidate libraries are young. It buys arbitrary dates outside 2026–2030, which nobody has asked for |
| Analytic series (e.g. `astronomy-engine`) | Rejected as a source. Acceptable later as an independent cross-check; libration accuracy **unverified** |

One addition is worth making when the table is next regenerated: a per-hour rotation from the inertial frame to the
Moon-fixed frame (a quaternion, four more columns). It is what a real star field and a correctly turned Earth need.
Until it exists, stars are either removed or labelled decorative (§5, M4).

### 3.2 Renderer: three.js r170, already vendored

| Option | Verdict |
|---|---|
| **three.js** (`site/js/vendor/three`, r170, MIT) | **Use.** Already paid for, no build step, full control of the shader that decides light and shadow |
| CesiumJS + Cesium Moon Terrain (ion asset 2684829) | Rejected. The terrain is streamed from Cesium ion with an account token, which breaks the rule that the demo path has no third-party runtime dependency (`AGENTS.md`). Lighting is a globe sun model, not our horizon rule. Coverage is good (60 m to 5 m towards the pole `[VERIFIED: cesium.com product page]`) but we cannot ship it offline |
| NASA-AMMOS `3DTilesRendererJS` (Apache-2.0 `[VERIFIED]`, works with three.js) | Not now. It is the right tool if we ever tile a 5 m DEM ourselves. The cap at 240 m is one 3812² grid and needs no tiling |
| globe.gl | Rejected. A data-globe library; no custom terrain shading |

Reference tools to imitate for interaction, not to embed: Moon Trek and QuickMap 3D (both in `Resources.md`), and
NASA Eyes. None of them ships as a library we can host.

### 3.3 Terrain: a displaced polar cap, shaded per pixel

- Geometry: a regular grid in the south polar stereographic plane, each vertex lifted onto the sphere of radius
  1737.4 km plus its DEM height. Across the ±457 km cap the sphere falls away by about 59 km
  `[COMPUTED: R·(1 − cos 15°)]`, so a flat plane is not acceptable.
- Mesh resolution is a performance choice (start near 512² vertices). Detail comes from **per-pixel normals read
  from the height texture**, so relief stays sharp when the mesh is coarse.
- The DEM is the one already shipped: `dem240` (3812², 240 m, `LDEM_75S_240M`) and `dem480` for phones. 3812 fits
  the 4096-pixel texture limit common on phones `[KNOWN]`. Integer textures cannot be filtered in WebGL 2, so pack
  heights into a filterable format (half-float, or two 8-bit channels decoded in the shader).

### 3.4 Shadows: a precomputed horizon atlas

For every ground pixel of the cap, store the terrain horizon elevation in N compass directions. At draw time the
fragment shader looks up the horizon in the Sun's direction and compares it with the Sun's elevation at that pixel:
the result is the visible fraction of the solar disk, the same quantity the engine computes for a site.

- It is the engine's algorithm (`computeHorizon` in `engine/dem.js`) run on a grid instead of on one point, so it
  can be tested against the engine at every curated site.
- It costs one texture lookup per pixel, which a phone can afford. Ray-marching the height field in the shader costs
  tens of lookups per pixel and is the fallback only if the atlas cannot be produced in time.
- **The same atlas gives the Earth-link overlay for free**: compare the horizon in Earth's direction with Earth's
  elevation plus the margin. That is the map overlay `PRODUCT.md` F8 lists and `site/README.md` reports as a
  placeholder.
- Starting size: 1024² pixels × 32 directions × 1 byte = 33.5 MB raw; a 512² version for phones is 8.4 MB
  `[COMPUTED]`. Compressed sizes are unknown until built. The Cloudflare free plan allows 25 MiB per file, so split
  or compress accordingly.
- Build cost: 1024² × 32 × 625 steps (150 km at 240 m) ≈ 2.1 × 10¹⁰ samples `[COMPUTED]`; vectorised numpy, run once,
  minutes not hours `[INFERRED]`. Keep the ≥150 km search radius from `PLAN.md` §2.3.
- The atlas is **display data**. Every number in the product keeps coming from the engine's per-site skyline at 1°
  steps. The caption of the 3D view says which resolution the picture uses.

### 3.5 Surface colour

South of 70°S the NASA colour mosaic is itself filled in from LOLA laser albedo and is "optimized for aesthetics,
not science" `[VERIFIED: SVS 4720 page text]`. On the cap, draw a uniform regolith grey lit by our own shading; that
is more honest and looks better at grazing light. Use the mosaic only for the zoomed-out Moon view.

---

## 4. Data

Everything below is public. "Checked" means the URL answered on 2026-11-14.

| Need | Source | State |
|---|---|---|
| Sun and Earth positions | JPL Horizons, already in `site/data/ephemeris.*` | In use; verified (§0) |
| Independent position check | NASA SVS 5587, `https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/mooninfo_2026.json` (hourly sub-solar and sub-Earth points, distance; 2.1 MB) | Checked. 2026 only; later years **unverified** |
| Cap terrain | `LDEM_75S_240M`, already in `site/data/dem240.*` | In use |
| Closer terrain for the Site view | LOLA polar grids at `https://imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/`: `LDEM_80S_20M`, `LDEM_85S_10M`, `LDEM_85S_20M`, `LDEM_875S_5M`, `LDEM_875S_10M`, `LDEM_875S_20M` and coarser | Listing checked. Crop per site; never ship a whole file |
| Best terrain at the pole | PGDA 81 *South Pole LOLA DEM Mosaic*, 87–90°S at 5 m, `https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp.tif` | Checked, 3.47 GB. Offline cropping only; needs a GeoTIFF reader |
| Site-scale terrain with uncertainty | PGDA 78, 5 m grids per site (`Site01`, `Site07`, `DM1`, `NPD`, …) | Page checked. Which of our curated sites it covers is **unverified** |
| Illumination reference | PGDA 69 *Lunar Polar Illumination* | Listed in `PLAN.md` §5.2; not re-checked today |
| Moon colour for the far view | NASA SVS 4720 *CGI Moon Kit*, `lroc_color_poles_4k.tif` (13.1 MB) → convert to WebP | Checked |
| Global relief for the far view | SVS 4720 `ldem_16.tif` (63 MB) → downsample to a normal map | Listed on the page; optional |
| Star field | NASA SVS 4851 *Deep Star Maps 2020*, `starmap_2020_4k.exr` (36 MB) | Checked. Usable only with the inertial rotation from §3.1 |
| Earth image | NASA Blue Marble | **Unverified** URL and licence; also needs Earth's rotation, which the table does not hold. Optional |
| Frames, if the table is regenerated with SPICE | NAIF generic kernels: `de440s.bsp` (32.7 MB), `moon_pa_de440_200625.bpc` (12.9 MB), `fk/satellites/moon_de440_250416.tf` | All three checked |

Rules for data work:

- Each new file under `site/data/` gets a generator script in `site/tools/` that states its source URL, and an
  entry in `PROVENANCE.json`. **Start by adding the missing generators for the files that already exist**
  (§1, row 8); if the original scripts cannot be recovered, say so in `PROVENANCE.json` rather than inventing them.
- Read scale, offset and projection from the `.LBL` or GeoTIFF tags (`AGENTS.md`).
- New data must be added to the snapshot release that CI unpacks, or the deploy will publish a site without it.

---

## 5. Milestones

Each milestone is one pull request, mergeable on its own, with the old view still working until M2 lands.
Estimates are focused agent hours `[GUESS]`.

Rules for whoever builds this:

- Work in order, M0 → M1 → M2 → M3. A milestone starts only after the previous one is merged and its acceptance
  check has passed.
- Every pull request carries the acceptance check's result in its description, and screenshots at **1440 px and
  390 px** of what changed.
- If an acceptance check fails, stop and report it instead of merging.
- **Do not start M4** until M0–M3 are merged and checked.

### M0 — Lock the truth (about 1 h)

- `site/tools/check_ephemeris_svs.py`: compare `ephemeris.f64` with `mooninfo_2026.json`, fail above 0.01° or 2 km.
  Expected today: 0.0007° / 0.0006° / 0.0065° / 0.0010° / 0.7 km.
- Add the `PLAN.md` §2.2 Horizons fixture (222.69°E, 89.45°S; Earth; 2027-01-01 00:00 UT → Az 144.4607°,
  El −6.6957°) to `check_js.mjs` through `engine/geometry.js`. Record the measured difference before choosing a
  tolerance; the table is hourly and the fixture is on the hour.
- Move `create3d` out of `mission.js` into `site/js/views/polar3d/` with no change in behaviour.
- Accept: both checks pass; the Mission page looks the same as before.

### M1 — The pole, with real relief (about 3 h)

- Cap mesh on the sphere from `dem240` / `dem480`, per-pixel normals, uniform grey, one directional Sun, no
  ambient. Heights ×1.
- Camera: default over the south pole, 0° longitude up, limits so the user cannot get lost; "Reset view" returns
  there; picking a site flies to it. Zoomed fully out, the whole Moon with the better texture.
- Graticule and labels: 85°S and 80°S circles, 0° / 90° / 180° / 270° meridians, the pole marker, a scale bar.
- Accept (by eye, known features): Shackleton sits at the pole with its floor about 2.8 km below datum
  (89.67°S, 129.8°E reads −2786 m in the DEM `[VERIFIED earlier]`), de Gerlache beside it, 0° longitude pointing
  to the top as in the 2D map. Screenshot at 1440 px and at 390 px in the pull request.

### M2 — True shadows and the two overlays (about 4 h)

- `site/tools/make_horizon_atlas.py` → horizon atlas (§3.4), with a descriptor JSON and a `PROVENANCE.json` entry.
- Shader: visible Sun-disk fraction per pixel from the atlas; the terminator and every crater shadow follow the
  scrubber.
- Overlay toggle: **Sunlit now** / **Earth link now** / none, using the existing three marker colours and the
  current margin setting. Colour is never the only carrier: keep the legend and the list badges.
- Accept:
  1. For every curated polar site and every hour of a 30-day window, the atlas says lit or dark the same as
     `site.series.sunVis`. Print the agreement rate per site in the check; investigate any site below the others
     before choosing a pass mark, and write the chosen mark and its reason into the check.
  2. Shackleton floor is dark at every hour tested; Nobile rim crest is lit for a share of hours close to the
     engine's.
  3. Scrubbing one lunar day stays interactive on a phone (measure and report frames per second; do not claim a
     number that was not measured).

### M3 — Site and Surface views (about 3 h)

- Site view: horizon ring around the site drawn from `site.horizonDeg`, Sun and Earth arrows with their elevation
  above the terrain, the blocking ridge highlighted in the Sun's azimuth.
- Surface view: camera at the site at mast height, the skyline built from the same `horizonDeg`, Sun and Earth
  disks at true angular size, azimuth and elevation; compass ticks; drag to look around.
- Accept: at Shackleton rim crest on 2026-11-14 12:00 UT the Surface view shows the Sun and Earth on the same side
  of the skyline as `site.skyAt()` reports, and their on-screen elevation matches the readout to within one Sun
  radius.

### M4 — Only if M0–M3 are merged and checked

- Inertial rotation in the ephemeris table, then the real star field and an Earth that turns.
- Closer terrain: per-site crops from the 20 m or 5 m grids for the Site view.
- Comparison of the atlas-derived average illumination with PGDA 69.
- Retire `scene3d.js` on the Explore page in favour of the Site view, so there is one 3D implementation.

---

## 6. Code layout

```
site/js/views/polar3d/
  index.js        createPolar3d(canvas, ctx) → { request, reset, focus(site), setView(name), setOverlay(name), dispose }
  camera.js       the three views, limits, fly-to
  cap.js          cap mesh, height texture, graticule
  shading.js      shader source: normals, horizon-atlas lookup, overlays
  bodies.js       Sun and Earth indicators and disks
  markers.js      site markers, selection ring, labels
site/tools/
  check_ephemeris_svs.py
  make_horizon_atlas.py
  check_horizon_atlas.mjs
```

- `mission.js` keeps owning state (`frame()`, picked site, mode) and calls the interface above. The 3D module
  imports from `engine/` and never from other views.
- Draw on demand (`request()`), as today. No permanent animation loop.
- Keep the WebGL-failure fallback to 2D, and add one for a missing atlas: the scene falls back to plain
  directional light and says so in the caption.
- New user-facing strings go through `i18n.js` in all three languages.

---

## 7. Risks

| Risk | Guard |
|---|---|
| A wrong axis or a mirrored map that still looks plausible | M1 acceptance uses named features and the 2D map's orientation; M2 compares with the engine site by site |
| The atlas is too coarse in azimuth (32 directions against the engine's 360) | The M2 check measures it. Raise the direction count or lower the pixel count before trusting the picture |
| Payload: `dem240` is 24 MB gzipped, the atlas adds more | Load `dem480` and the small atlas first, upgrade after first paint; phones stay on the small set |
| Open pull request #21 changes `mission.js` and `mission.css` (3D dragging) | Rebase on it once it merges; do the M0 extraction in one small pull request to keep the conflict short |
| The picture is taken as landing-point truth | Caption states the DEM resolution and that results are regional constraints (`PRODUCT.md` §6) |
| Scope creep into stars, Earth textures, 5 m terrain | They are M4. Do not start them before the M2 check is green |

---

## 8. How this was checked

- Read `site/js/views/mission.js`, `scene3d.js`, `engine/ephemeris.js`, `engine/geometry.js`, the data descriptors
  and `PROVENANCE.json` at `1f1ec99`; opened the Mission page locally at 1440 × 900.
- Ran the SVS comparison in §0 on the local `site/data/ephemeris.f64`.
- Sent a request to each URL in §4 marked "checked" and read the SVS 4720, Cesium Moon, PGDA 78 and PGDA 81 pages.
- Not done: no code was changed, no atlas was built, nothing was measured on a phone. Every size and time in §3.4
  and §5 that is not marked `[VERIFIED]` is an estimate.
