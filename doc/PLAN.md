# Luna Lens — Build Plan (v0.1, early planning)

> Challenge: a tool for rapidly comparing Sun and Earth positions relative to the horizon at lunar south pole landing sites (original text in `Background.md` and `Resources.md`).
> Team of 7, roughly 2 days (planned as 48 h). This file is the single source of truth for the plan; changes go through Git.
> Last updated: 2026-11-13.

**Tagging convention**: `[VERIFIED]` checked live while writing this plan (2026-11-13) · `[KNOWN]` established domain fact · `[COMPUTED]` calculated in this document · `[INFERRED]` deduction · `[GUESS]` estimate with no basis. Confidence: HIGH ≥80% / MED 50–80% / LOW <50%.

---

## 0. Conclusions first

1. **Sun/Earth elevation without terrain is worthless for this project.** At the south pole the Sun's maximum elevation is only about 1.5° plus the colatitude `[KNOWN, HIGH]`, and Earth's elevation swings within about ±6.7° `[KNOWN, HIGH]`, while surrounding terrain routinely blocks several degrees. Without a terrain horizon, the illumination and communication windows at the pole are essentially wrong. JPL Horizons returns exactly this no-terrain result `[VERIFIED]`, which is the gap the challenge describes when it says existing tools are hard to use.
2. **So the core work is the terrain horizon mask plus the comparison experience**, not the ephemeris. The ephemeris takes half a day; the terrain pipeline is the critical path.
3. **The four official resources are not enough.** Three are websites built for people to click through (Quickmap, Moon Trek, the CSA portal); only Horizons can be called programmatically, and it has no terrain. We must add LOLA DEMs and SPICE kernels ourselves. Both are public NASA data and confirmed downloadable (see §5).
4. **Seven people in two days can finish P0 and roughly half of P1** `[GUESS, LOW]`. The biggest risk is not the algorithm. It is getting a coordinate frame or projection convention wrong so that results look right but are not, and letting integration slip into the afternoon of day 2.

---

## 1. Product definition

**One sentence**: pick a site and a date, and within 3 seconds see where the Sun and Earth sit above the real terrain horizon, how long until sunset and Earthset, and whether the combination is viable, with several site × date combinations side by side.

**Users and scenarios** (by priority):
| User | Key question | Feature |
|---|---|---|
| Mission planner | Launch slips N days. Is the original site still viable? Which alternative? | Date-slip comparison, viability calendar |
| Science/engineering coordination | Power vs. communication trade-off between site A and site B | Side-by-side scorecards |
| Educators / public | Why is the south pole so hard? | Panorama animation, contrast with an equatorial site |

**Feature definitions, acceptance checks, and the minimum bar for a complete entry live in `PRODUCT.md`.** The tiers below are the build-order summary; if they disagree with `PRODUCT.md`, that file wins. Note that `PRODUCT.md` treats the 2D site-picking maps as required, not as a P1 extra.

**Feature tiers**
- **P0 (required, the demo storyline)**
  - Site library (10–15 curated sites) plus custom latitude/longitude
  - 2D maps for site picking: south pole (polar stereographic, hillshade from the DEM) and a whole-Moon locator
  - Horizon panorama: azimuth 0–360° × elevation, showing the terrain silhouette plus Sun/Earth tracks and current positions
  - Timeline: illumination and direct-to-Earth communication windows across one lunar day (29.53 days `[KNOWN, HIGH]`), with "time to sunset / time to Earthset" countdowns
  - Metric cards: solar elevation, visible fraction of the solar disk, continuous illumination duration, communication window duration and share
  - Side-by-side comparison of 2–4 site × date combinations
  - Responsive web layout that works in a phone browser from day one. No native app and no phone-specific interaction design; judges and teammates are likely to open the link on a phone `[INFERRED, MED]`
- **P1 (differentiators)**
  - Date-slip view: effect of moving the landing date ±N days on each metric (the core pain point in paragraph 3 of the challenge background)
  - Mast height parameter (antenna or solar array 2 m / 10 m above ground), which strongly affects windows near the pole `[KNOWN, MED]`
  - 3D terrain with live shadows
  - Validation page against Horizons and the PGDA illumination maps (directly serves the judges' validity criterion)
- **P2 (if time allows)**: year-scale seasonal view, education-mode narration, report export

**Look-and-feel prototype**: `prototype/index.html` is a throwaway, fake-data demo of the P0 views plus the date-slip chart, used to agree on layout before the event. Its data is synthetic and its code does not seed `web/`. See `prototype/NOTES.md`.

---

## 2. Technical approach

### 2.1 Architecture

```
[LOLA DEM .IMG] ──► terrain/ horizon mask ────────┐
[SPICE kernels] ──► ephem/ Sun & Earth az/el ─────┼─► api/ (FastAPI) ──► web/ (Vite+React+TS)
[sites.json curated sites] ───────────────────────┘        │
                              precomputed JSON (curated sites, offline fallback)
```

- **Code layout**: one Python package `backend/lunalens/` (`ephem`, `terrain`, `windows`, `api`) and one frontend `web/`; file-level structure and owners are in `WORKPLAN.md` §3.
- **Backend**: Python + FastAPI + `spiceypy` + `numpy`. The DEM `.IMG` files are raw 16-bit rasters readable with `numpy.memmap`, with no GDAL dependency `[COMPUTED: file bytes = side² × 2, see §5; HIGH]`.
- **Frontend**: Vite + React + TypeScript; ECharts or D3 for the panorama and timeline; Three.js for 3D.
- **Fallback**: precompute the horizon mask and one year of ephemeris for the curated sites into static JSON shipped with the frontend, so the demo runs even if the API is down.

### 2.2 Ephemeris (simple, half a day)

- Local SPICE: `de440s.bsp` + `moon_pa_de440_200625.bpc` + a Moon-fixed frame kernel + leap seconds. Site Moon-fixed coordinates → local ENU → azimuth/elevation. A single point takes microseconds, so compute on demand.
- **Horizons is the validation reference, not a runtime dependency** (external service, not suited to concurrent requests, venue network is out of our control).
- Horizons call for a lunar surface observer, tested `[VERIFIED]`:
  `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `SITE_COORD='east_lon,lat,alt_km'`, `QUANTITIES='4'` (airless azimuth/elevation, azimuth clockwise from north).
- Regression fixture (goes into the tests) `[VERIFIED]`: site 222.69°E, 89.45°S, 0 km; target Earth;
  2027-01-01 00:00 UT → Az 144.4607°, El −6.6957°; 2027-01-02 00:00 UT → Az 143.8238°, El −7.2105°.

### 2.3 Terrain horizon (critical path)

- Algorithm: from the site, march rays across the DEM along 360 azimuths (1° step), account for lunar curvature, and take the maximum terrain elevation angle per azimuth → `horizon[az]`.
- The search radius must be large: a feature of height h is visible out to √(2Rh). With R = 1737.4 km and h = 5 km that is **about 132 km** `[COMPUTED, HIGH]`. Use a radius ≥150 km; cropping a small DEM patch is not acceptable.
- Cost: 360 azimuths × (150 km / 80 m ≈ 1875 steps) ≈ 675,000 samples `[COMPUTED]`. Vectorised numpy should finish in under a second or so `[INFERRED, MED]`, so custom coordinates can be computed on demand.
- Treat the Sun as a **disk** (apparent diameter about 0.53° `[KNOWN, HIGH]`): output the fraction of the disk above the horizon, not 0/1. Near the pole the Sun rolls along the horizon for long periods, and this directly decides the power conclusion.
- Communication criterion: Earth-centre elevation > terrain horizon + a configurable margin (default to be decided, tagged `[GUESS]`, shown explicitly in the UI).
- Power metrics: report both the visible disk fraction (for a vertical tracking array) and `sin(elevation)` (for a horizontal array), without making the assumption for the user.

### 2.5 Deployment (decided 2026-11-14, no paid services)

Two layers, so the public link never depends on anyone's laptop:

| Layer | Runs where | Serves | Always on |
|---|---|---|---|
| **Public static site** | Cloudflare's network (Workers static assets, `*.workers.dev`) | The built frontend, map images, and precomputed JSON for every curated site | Yes |
| **Live backend** (optional) | The lead's Mac, under PM2, exposed through a Cloudflare Tunnel | The same API computed on demand, which adds custom coordinates | Only while the Mac is on |

- The frontend reads precomputed JSON by default and uses the live backend only when it answers a health check.
  With the backend down, curated sites work fully and custom points show "available in the live demo".
- None of Cloudflare Workers, Vercel or GitHub Pages can run our Python backend on a free plan (SPICE, numpy,
  115 MB elevation files), which is why the public layer is static.
- Free-plan limits checked on 2026-11-14 `[VERIFIED]`: 20,000 files per Worker version, 25 MiB per file.
  Precomputed JSON and map images must stay under 25 MiB each; raw DEMs are never deployed.
- The lead runs deployments from their own machine (`npx wrangler deploy`, config in `wrangler.jsonc`).
- Live since 2026-11-14 at `https://luna-lens.gaobing1230.workers.dev`, serving the prototype behind a Cloudflare
  Access email check (one-time code, team emails only). The check comes off before submission so judges can open it.

### 2.4 API contract (frozen in the first two hours; changes require notifying everyone)

```
GET /api/sites                                              → [{id, name, lat, lon, category, source}]
GET /api/scenario?lat&lon&start&days&mast_m&margin_deg      → {horizon, samples[], sun_windows, comm_windows, metrics}
GET /api/slip?lat&lon&start&slip_days&mast_m&margin_deg     → [{slip_day, sunlit_at_touchdown, continuous_sun_h, link_share}]
GET /api/validation                                         → static JSON
```

One scenario is one request. Field-level definitions live in `backend/lunalens/api/schemas.py`; see `WORKPLAN.md` §4.

Conventions: longitude east-positive 0–360; south latitude negative; angles in degrees; time in ISO-8601 UTC; elevation relative to the 1737.4 km reference sphere, in metres.

---

## 3. Build roadmap (48 h)

| Time | Milestone | Acceptance |
|---|---|---|
| **Before the event (T−1 day)** | Data and environment ready | DEMs and kernels downloaded to shared storage; repo, draft contract, and first site table ready; everyone can run the empty skeleton locally |
| **H0–H4** | Walking skeleton | Frontend → API → fake data → panorama renders. Contract frozen |
| **H4–H12** | Real data in | Ephemeris within 0.01° of the Horizons fixture; `horizon[az]` plotted for one site |
| **H12–H16** | **Integration checkpoint 1** | Panorama and timeline run on real data for one south pole site. If not, cut P1 |
| **H16–H28** | P0 complete | Site library, metric cards, side-by-side comparison, countdowns all working |
| **H28–H36** | P1 differentiators | Date-slip view, mast height, validation page; 3D or map, pick one |
| **H36** | **Feature freeze** | Bug fixes, polish, and precomputed fallback data only |
| **H36–H44** | Polish and deliverables | Deployment, demo video/slides, project page copy, README |
| **H44–H48** | Submission buffer | Submit 2 h early, not at the deadline |

**Critical path**: DEM reading and projection check → horizon mask → window calculation → panorama. A delay in any of these delays the demo directly; staff them with the strongest people.

---

## 4. Work breakdown and roles (7 people)

The seven work packages (including the designer), their files, task lists and hand-offs are in `WORKPLAN.md` §5. In short: lead / product, designer, three science roles (ephemeris, terrain, windows + API) and two frontend roles (explore, map + compare). References below to "role N" follow the numbering in that file.

### Pitfalls

1. **Projection orientation**: the LOLA polar products are polar stereographic. Take the row/column ↔ lat/lon formula and axis orientation from the `.LBL` label shipped with the data, not from memory. Validate against a known feature (e.g. Shackleton crater, about 89.67°S, 129.8°E `[KNOWN, MED]`, which should land inside a deep pit).
2. **Elevation encoding**: read the scaling factor and offset for `.IMG` pixel values from the `.LBL`; do not hard-code them.
3. **Moon-fixed frames**: the ME (Mean Earth) and PA (Principal Axis) frames differ by several hundred metres up to about 1 km `[KNOWN, MED]`. LOLA products use ME; SPICE's PA frame must be converted to ME through the frame kernel. Mixing them produces small, hard-to-find errors in azimuth and elevation.
4. **Azimuth is ill-conditioned near the pole**: the closer to the pole, the more sensitive "north" becomes. When comparing with Horizons, use the identical site coordinates and check digit by digit.
5. **Time systems**: UTC everywhere externally; SPICE uses ET/TDB internally. Leave conversion to `spiceypy`; never do it by hand.
6. **Elevation datum**: Horizons `SITE_COORD` altitude is in km relative to the reference surface; our DEM elevation is in metres. The site's true elevation changes the geometric horizon and must be passed correctly.
7. **Be honest about DEM resolution**: an 80 m grid cannot see rocks or small craters next to the lander. State conclusions as "windows under regional terrain constraints", not exact landing-point values. Say so in the UI and in the pitch.
8. **No runtime third-party dependencies**: Horizons and Trek tiles may be slow or down during the demo. Prefetch or render everything ourselves.
9. **No large files in Git**: DEMs and kernels live in `data/` (gitignored) and are reproduced with download scripts.
10. **Every curated site coordinate needs a source**: see §6. The lead verifies each row before it enters `sites.json`.

---

## 5. Resource audit

### 5.1 Official resources (`Resources.md`)

| Resource | What it is actually good for | Programmatic | Verdict |
|---|---|---|---|
| JPL Horizons | Sun/Earth azimuth and elevation from any lunar coordinate (no terrain) | REST API, tested working `[VERIFIED]` | **Validation reference**, not a runtime dependency |
| Moon Trek | Browsing terrain; also a WMTS tile service (docs page reachable `[VERIFIED]`) | WMTS | Possible basemap; whether a south polar projection layer meets our needs is **unverified** |
| Quickmap | Manual inspection of imagery and terrain, picking sites, visual checks | No public stable API `[KNOWN, MED]` | Manual reference only |
| CSA Moon Exploration | Background portal | None | Storytelling only |

**Verdict: not enough.** Missing terrain data, an offline-capable ephemeris, and an illumination reference. We fill these ourselves below; all are public NASA data.

### 5.2 Resources to add

| Resource | Use | Status |
|---|---|---|
| LOLA polar DEMs `imbrium.mit.edu/DATA/LOLA_GDR/POLAR/IMG/` | Primary data for the horizon mask | Directory reachable `[VERIFIED]`; file list below |
| PGDA #78 "High-Resolution LOLA Topography for Lunar South Pole Sites" | High-resolution DEMs for key sites (near field / 3D display) | Page reachable `[VERIFIED]`; file formats and sizes not checked |
| PGDA #81 "South Pole LOLA DEM Mosaic", #90 "A New View of the Lunar South Pole from LOLA" | Alternative / newer south pole DEMs | Pages reachable `[VERIFIED]`; contents not read in detail |
| PGDA #69 "Lunar Polar Illumination" | Average illumination/visibility rasters (e.g. `AVGVISIB_85S_060M_201608.TIF`), **used to validate our results** | Page and download links exist `[VERIFIED]` |
| NAIF generic kernels `naif.jpl.nasa.gov/pub/naif/generic_kernels/` | Local ephemeris | `moon_pa_de440_200625.bpc` (12 MB) exists `[VERIFIED]`; the other kernels (de440s, frame, lsk) not individually checked, expected to exist `[KNOWN, HIGH]` |
| PDS Geosciences LOLA GDR (JP2 version) | DEM mirror | Directory reachable `[VERIFIED]` |

**South pole DEM selection** (file sizes are from the server listing `[VERIFIED]`; coverage is derived from byte counts `[COMPUTED]`):

| File | Size | Grid | Coverage | Use |
|---|---|---|---|---|
| `LDEM_80S_80M.IMG` | 115.5 MB | 7600² | About ±304 km around the pole (south of 80°S) | **Workhorse**: horizon mask |
| `LDEM_85S_40M.IMG` | 115.0 MB | 7584² | About ±152 km (south of 85°S) | Refinement for near-pole sites |
| `LDEM_875S_20M.IMG` | 115.0 MB | 7584² | About ±76 km (south of 87.5°S) | Near field around Shackleton |
| `LDEM_80S_20M.IMG` | 1.85 GB | — | Same as 80S | Only if there is spare capacity |
| `LDEM_875S_5M.IMG` | 1.84 GB | 30336² | Same as 87.5S | Only for 3D display tiles |
| `LDEM_60S_240M.IMG` | 120 MB | — | South of 60°S | Far field for sites north of 80°S (e.g. Chandrayaan-3) |

Download the first three plus 60S_240M before the event, about 466 MB in total `[COMPUTED]`. That is sufficient. **Note**: for a site at 80–82°S, a 150 km search radius runs past the edge of the 80S product; stitch in the 60S product or flag it explicitly.

**Non-polar sites** (Apollo etc.): no polar DEM coverage. In P0 treat them with a no-terrain spherical horizon and say so in the UI; at equatorial sites the Sun is high and terrain matters relatively less `[INFERRED, MED]`.

### 5.3 Open resource questions

- Does Trek WMTS have a directly usable south polar projection layer → unverified. **Default: render our own hillshade basemap from the DEM** and do not wait on it.
- Which sites PGDA #78 covers, and whether they include our curated sites → Science B checks before the event.
- Competition rules (submission format, AI-use disclosure, judging criteria) → the lead checks against this year's official site. This document does not speak for the organisers.

---

## 6. Curated sites (seed table, **unverified, do not load as-is**)

These coordinates are from memory and are a starting point only. The lead must check each row against a primary source before writing it to `sites.json` and filling in the `source` field.

| Site | Latitude | East longitude | Category | Confidence |
|---|---|---|---|---|
| Apollo 11 | 0.674°N | 23.473°E | Historic | `[KNOWN, HIGH]` |
| Apollo 15 | 26.13°N | 3.63°E | Historic | `[KNOWN, HIGH]` |
| Apollo 17 | 20.19°N | 30.77°E | Historic | `[KNOWN, HIGH]` |
| Chandrayaan-3 | 69.37°S | 32.32°E | Other nations | `[KNOWN, HIGH]` |
| Chang'e-4 | 45.44°S | 177.60°E | Other nations / far side | `[KNOWN, MED]` |
| Chang'e-6 | 41.64°S | 206.01°E (153.99°W) | Other nations / far side | `[KNOWN, MED]` |
| SLIM | 13.32°S | 25.25°E | Other nations | `[KNOWN, MED]` |
| IM-1 Odysseus (near Malapert A) | ≈80.1°S | ≈1.4°E | CLPS | `[KNOWN, MED]` |
| IM-2 Athena (Mons Mouton) | ≈84.8°S | ≈29.2°E | CLPS | `[KNOWN, LOW–MED]` |
| Shackleton connecting ridge | 89.45°S | 222.69°E | Artemis candidate | `[KNOWN, MED]` |
| Artemis III candidate regions (Haworth, Malapert Massif, Mons Mouton Plateau, Nobile Rim 1/2, de Gerlache Rim 2, Slater Plain, peak near Cabeus B, etc.) | TBD | TBD | Artemis candidate | Names `[KNOWN, MED]`, coordinates unknown |

Far-side sites (Chang'e-4/6) never see Earth `[KNOWN, HIGH]`, which makes them a good "communication window = 0" contrast case.

---

## 7. Highlights and difficulty

### Highlights (ordered by persuasiveness to judges)

1. **Real terrain horizon**: most teams will stop at "call Horizons and plot two curves" `[GUESS, LOW]`. We include terrain occlusion and validate against the PGDA illumination maps, which puts the credibility of our conclusions in a different class.
2. **Date-slip comparison**: answers the "what now that the launch has slipped" question from the challenge background directly, instead of generic visualisation.
3. **Horizon panorama**: one chart shows the terrain silhouette, the Sun rolling along the ground, and Earth bobbing up and down. High information density, readable by non-specialists, and cheap to build.
4. **Built-in validation page**: openly shows our error against Horizons and our comparison with PGDA average illumination. Exposing the accuracy limits is more convincing than claiming precision.
5. **Extreme contrast**: Apollo 11 (Sun high overhead, Earth nearly fixed) vs. Shackleton (Sun always at the horizon, Earth gone for half of each month). The educational value is immediate.

### Difficulty assessment

| Module | Difficulty | Main risk | Notes |
|---|---|---|---|
| Ephemeris + Horizons validation | Low | Mixed coordinate frames | A reference exists, so errors get caught |
| DEM reading and projection | Medium | Wrong axis orientation or scaling | Fails silently with wrong results; the most dangerous |
| Horizon mask | Medium | Search radius, curvature correction, performance | The algorithm itself is mature `[KNOWN, HIGH]` |
| Windows and metrics | Low–medium | Geometry details of the disk fraction | |
| Panorama / timeline | Low–medium | — | Best value in P0 |
| Side-by-side comparison UX | Medium | Information overload | More a design problem than a technical one |
| 3D terrain + shadows | Medium–high | Time sink | **First to cut** |
| Integration and deployment | Medium | Left until the end | Hedged by the H4 skeleton and the H12 checkpoint |

**Overall**: P0 is achievable with moderately high confidence `[GUESS, LOW]`. Finishing all of P1 is unrealistic; the date-slip view and the validation page take priority over 3D.

### Cut order

3D terrain → illumination overlay on the map → mast height → year-scale view. **Never cut**: terrain horizon, panorama, side-by-side comparison, 2D map picker.

---

## 8. Open decisions

| Item | Default | Owner |
|---|---|---|
| Compute on demand vs. precompute everything | On demand, with precomputed fallback for curated sites | Science C |
| Basemap source | Hillshade rendered from the DEM | Science B |
| Default communication margin | 2° for now, adjustable in the UI `[GUESS]` | Science C |
| Deployment location | **Decided 2026-11-14: Cloudflare (free plan), see §2.5** | Lead deploys; Science C prepares the build |
| Names against roles | To be filled in by the team lead | Team lead |
