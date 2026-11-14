# Luna Lens — Work Plan (v0.1)

> Who builds what, in which files, against which interfaces. Read this to find your own job.
> `PRODUCT.md` says what the product does; `PLAN.md` covers technical approach, roadmap and resources; this file
> turns both into seven work packages. Last updated: 2026-11-14.

---

## 1. The app in one paragraph

A single-page web app with four views that share one set of **scenarios** (site + landing date + mast height)
and one **time scrubber**:

| View | Purpose | Features (`PRODUCT.md` §4) |
|---|---|---|
| **Explore** | One scenario in detail: map, status, horizon panorama, timeline | F1–F5, F8 |
| **Compare** | 2–4 scenarios side by side on the same time axis | F6 |
| **Date slip** | What happens if the landing date moves | F7 |
| **Data & accuracy** | Sources, limits, validation, glossary | F9, F10 |

## 2. Layout

Wireframes with numbered blocks: open `prototype/wireframe.html`
(served on the owner's LAN at `http://192.168.1.36:8765/wireframe.html`). The numbers below are the same.

```
EXPLORE — desktop                                   EXPLORE — phone
┌──────────────────────────────────────────────┐    ┌────────────────┐
│ 1 App bar: logo · Explore|Compare|Slip|Data   │    │ 1 App bar      │
├──────────────────────────────────────────────┤    │ 2 Tray         │
│ 2 Scenario tray: [A] [B] [+ add]              │    │ 3 Map (folds)  │
├───────────────────┬──────────────────────────┤    │ 4+5 Site/date  │
│ 3 Map             │ 6 Status tiles            │    │   (sheet)      │
│   pole | Moon     ├──────────────────────────┤    │ 6 Tiles 2×3    │
│                   │ 7 Horizon panorama        │    │ 7 Panorama     │
├───────────────────┤                           │    │ 8 Timeline     │
│ 4 Site picker     ├──────────────────────────┤    │ 9 Scrubber     │
│ 5 Date · mast     │ 8 Stay timeline + totals  │    │ 1 Bottom tabs  │
├───────────────────┴──────────────────────────┤    └────────────────┘
│ 9 Time scrubber: ▶ · slider · jump buttons    │
└──────────────────────────────────────────────┘

COMPARE: 1, 2, then 10 comparison table (one row per scenario), 11 scenario actions, 9 scrubber
SLIP:    1, 2, then 12 thresholds, 13 slip chart, 14 "add this day as a scenario"
DATA:    15 trust panel
```

Layout rules: the left column answers "which scenario", the right column answers "what happens there";
the scrubber is always visible; on a phone everything is one column in the order above.

The wireframe fixes **position and content** of blocks. Colours, type, spacing, icons and chart styling are the
designer's decisions and are not fixed by the wireframe or by the earlier fake-data demo.

---

## 3. Code structure

Two deployable parts with one contract between them.

```
backend/
  pyproject.toml
  lunalens/
    config.py              constants (Moon radius, Sun radius, default margin), data paths
    sites.py               load and validate data/sites.json                      ← Lead
    data/sites.json        curated sites, each with a cited source                ← Lead
    ephem/                                                                        ← Science A
      kernels.py           load SPICE kernels once
      bodies.py            sun_earth_azel(site, times) -> az/el arrays
    terrain/                                                                      ← Science B
      dem.py               read .IMG + .LBL, lat/lon <-> pixel, sample heights
      horizon.py           horizon_profile(site, mast_m) -> 360 elevations
      hillshade.py         render map images for the frontend
    windows/                                                                      ← Science C
      visibility.py        disk_fraction(), link_ok()
      windows.py           intervals, next sunset / Earthset, countdowns
      metrics.py           stay totals (sunlit %, longest dark, link %, ...)
      slip.py              metrics for each day of landing delay
    api/                                                                          ← Science C
      schemas.py           response models = the contract (source of truth)
      main.py              FastAPI app, routes, caching
  scripts/
    download_data.py       DEMs + kernels, with source URLs                       ← Science B
    make_map_assets.py     hillshade / locator images for web/public/maps         ← Science B
    precompute.py          static JSON for curated sites (offline fallback)       ← Science C
    validate.py            compare with Horizons and PGDA, write validation.json  ← Science C
  tests/
    test_ephem_horizons.py Horizons regression fixture                            ← Science A
    test_dem_projection.py known-feature check (Shackleton)                       ← Science B
    test_windows.py        hand-made cases                                        ← Science C

web/
  public/maps/             generated map images
  src/
    app/                   App shell, tabs, responsive layout                     ← Frontend A
    state/                 scenarios store, time store, URL sync                  ← Frontend A
    api/
      types.ts             generated from backend schemas — never edited by hand
      client.ts            fetch + cache                                          ← Frontend A
      mock/                fixture JSON so the UI runs with no backend            ← Frontend A
    ui/                    design-system primitives + tokens.css                  ← Designer + Frontend A
    lib/                   format.ts (angles, durations), geo.ts (projections)
    features/
      scenario/            ScenarioTray, SitePicker, ScenarioSettings             ← A (tray), B (rest)
      now/                 StatusTiles, Countdown                                 ← Frontend A
      panorama/            HorizonPanorama                                        ← Frontend A
      timeline/            StayTimeline, TimeScrubber                             ← Frontend A
      map/                 PolarMap, MoonLocator                                  ← Frontend B
      compare/             CompareTable, ScenarioActions                          ← Frontend B
      slip/                SlipChart, Thresholds                                  ← Frontend B
      about/               TrustPanel, Glossary                                   ← Frontend A

data/        DEMs, kernels, intermediates — not in Git
doc/         PRODUCT.md, PLAN.md, WORKPLAN.md, challenge text
prototype/   throwaway demo + wireframe.html — never imported
```

Rules that keep seven people out of each other's way:

- **One owner per directory.** Change someone else's directory through them or through a reviewed pull request.
- **Features do not import each other.** `features/*` may import from `state/`, `api/`, `ui/`, `lib/` only.
- **Backend layers go one way:** `api → windows → (ephem, terrain)`. `ephem` and `terrain` know nothing about each other.
- **`api/schemas.py` is the contract.** `web/src/api/types.ts` is generated from it. A schema change is announced
  to both frontend developers before it merges.

---

## 4. Interfaces (freeze these in the first two hours)

### 4.1 Between backend modules

```python
# ephem/bodies.py                                            Science A provides
def sun_earth_azel(lat: float, lon: float, alt_m: float, times_utc: list[datetime]) -> AzEl:
    """AzEl: sun_az, sun_el, earth_az, earth_el — numpy arrays, degrees, no terrain."""

# terrain/horizon.py                                         Science B provides
def horizon_profile(lat: float, lon: float, mast_m: float = 2.0) -> HorizonProfile:
    """HorizonProfile: elev_deg[360] (index = azimuth in degrees), site_alt_m, dem_name, radius_km.
    Sites without DEM coverage return a flat profile and has_terrain=False."""

# windows/                                                   Science C provides, using the two above
def scenario(lat, lon, start_utc, days, mast_m, margin_deg) -> ScenarioResult
def slip(lat, lon, start_utc, slip_days, mast_m, margin_deg) -> SlipResult
```

Until the real functions exist, A and B each ship a **stub with the right signature in hour 1**
(spherical Moon, flat horizon), so C and the API are never blocked.

### 4.2 Between backend and frontend

| Endpoint | Returns | Used by blocks |
|---|---|---|
| `GET /api/sites` | curated sites: id, name, lat, lon, category, source | 3, 4 |
| `GET /api/scenario?lat&lon&start&days&mast_m&margin_deg` | horizon profile; hourly samples (Sun az / el / disk fraction, Earth az / el / link); sunlight and link windows; stay metrics | 6, 7, 8, 9, 10 |
| `GET /api/slip?lat&lon&start&slip_days&mast_m&margin_deg` | per day of delay: sunlit at touchdown, continuous sunlight from touchdown, link share | 13 |
| `GET /api/validation` | static JSON: Horizons errors, PGDA comparison | 15 |

One scenario = one request. This replaces the separate `/api/horizon`, `/api/ephemeris` and `/api/windows`
endpoints sketched in `PLAN.md` §2.4, which that section now reflects. Units and conventions are unchanged.

Science C commits a **hand-written example response for each endpoint in hour 1** to `web/src/api/mock/`.
Both frontend developers build against those files and switch to the live API at the H12 checkpoint.

---

## 5. Seven work packages

Six people are confirmed; the seventh seat is open. The assignment below is a **proposal by the planning agent,
not yet confirmed by the people named**. Zeynep, Eya and Assem are placed from their own introductions; the three ESILV members are placed from the
lead's description of their strengths. Keep one owner per package.

| # | Role | Person (proposed) | Basis | Owns | Features |
|---|---|---|---|---|---|
| 1 | **Lead / product** | Bing Gao | Team lead | Scope, `sites.json`, demo script, submission, merging, unblocking | F1 data, all of §7 demo |
| 2 | **Designer** | Zeynep Uzan | UX/UI designer, Figma, presentation materials | Visual system, high-fidelity screens, chart styling, copy, slides and video visuals | F9 wording, all screens |
| 3 | **Science A — ephemeris** | Bing Gao until a seventh member joins | Smallest science package (about half a day) | `ephem/`, Horizons tests; then helps C | F3 (angles) |
| 4 | **Science B — terrain** | Maeva Andriamaniraka | Numerical computation, mathematics, theory; writes Python | `terrain/`, data download, map images | F3 (horizon), F8 (map data) |
| 5 | **Science C — windows + API** | Chenlin Wang | Fast AI-assisted coding; this package is mostly integration | `windows/`, `api/`, precompute, validation | F4, F5, F7, F10 data |
| 6 | **Frontend A — explore** | Eya Amrach | Computer engineering graduate, UX/UI + web development | `app/`, `state/`, `api/`, blocks 1, 2, 6, 7, 8, 9, 15 | F2, F3, F4, F5 |
| 7 | **Frontend B — map + compare** | Assem Hssini | Web engineering student, builds interfaces | Blocks 3, 4, 5, 10–14 | F1, F6, F7, F8 |

Consequences of having six people:

- The lead carries the ephemeris package for the first 8–12 hours. It is the best one to double up on: it is
  short, it has a reference to test against, and it ends before the first checkpoint the lead has to run.
- After H12 nobody is free to reinforce Science B and C. The terrain horizon is the critical path, so if it is
  late at H12 the lead joins Science B and the demo script waits.
- If a seventh member joins and can write Python, they take Science A from hour 0. If they are a third web
  developer instead, Frontend A hands them `state/` and `api/` and the lead keeps ephemeris.
- Maeva owns the hardest mathematics (projection, curvature, horizon mask) and also **reviews the formulas in
  Science C** (`visibility.py`: solar disk fraction, link rule). Chenlin writes that code; Maeva signs off the maths.
- AI-assisted code in `windows/` and `api/` moves fast and can be wrong without failing. Every function in
  `windows/` gets a hand-made test case with a known answer before it is wired into the API (see `AGENTS.md`,
  correctness rules).
- If the terrain package needs more coding hands than mathematics, Chenlin pairs with Maeva on `terrain/` after
  the API stubs are serving (about H3), and the lead covers `windows/` once ephemeris is done.
- Eya also has UX/UI experience and is the natural reviewer for the designer's hand-off to code.

Working language is English (see `AGENTS.md`). Several members also speak French; spoken coordination can use
whatever the people in the conversation share, but everything written into the repository stays English.

### Task list per person

Hours follow the roadmap in `PLAN.md` §3. "Pre" = before the event.

**1. Lead / product**
- Pre: confirm people against roles; confirm rules, deadline and submission format on the official site; verify every row of the site table against a primary source.
- H0–H2: run the interface freeze (§4); H2–H12: finish `sites.json`, write the 3-minute demo script.
- H12, H24, H36: run the checkpoints, cut scope using the order in `PRODUCT.md` §5.
- H36–H48: project page text, record the video with the designer, submit 2 h early.

**2. Designer**
- Pre: colour, type and spacing tokens (light and dark); high-fidelity Explore screen for desktop and phone, starting from the wireframe.
- H0–H8: panorama, timeline and tile styling (these are the hard ones: low Sun on a tall-and-narrow axis; partial-disk state; link OK / blocked without relying on colour alone).
- H8–H20: Compare and Date slip screens; map marker and overlay styling; empty, loading and error states.
- H20–H36: review the built UI against the screens with Frontend A and B; microcopy and glossary wording (F9).
- H36–H48: slide deck, video titles, screenshots, logo.
- Hands off to frontend as: `ui/tokens.css` values + screens in the design tool. No waiting: frontend starts on the wireframe and restyles as tokens land.

**3. Science A — ephemeris**
- Pre: download kernels; get `spiceypy` running.
- H0–H1: stub `sun_earth_azel`. H1–H8: real implementation in the ME frame; pass the Horizons fixture within 0.01°.
- H8–H12: more Horizons cases (several sites and dates) → input for `validate.py`.
- H12 onward: join Science C on `slip.py` and performance; own the "is it right?" answers for the pitch.

**4. Science B — terrain** (critical path)
- Pre: download the DEMs; read the `.LBL`; pass the Shackleton projection check.
- H0–H1: stub `horizon_profile`. H1–H12: real horizon mask (curvature, ≥150 km radius), plotted for one site.
- H12–H20: speed (target about 1 s per site), mast height, sites near the DEM edge; hillshade + locator images for Frontend B.
- H20–H36: illumination overlay data for the map (F8 Should) if the horizon mask is solid; otherwise keep hardening.

**5. Science C — windows + API**
- H0–H1: `schemas.py` + example responses into `web/src/api/mock/`. H1–H3: FastAPI serving the stubs end to end.
- H3–H12: `visibility.py`, `windows.py`, `metrics.py` on real A + B outputs.
- H12–H24: `slip.py` and `/api/slip`; caching; `precompute.py` for curated sites.
- H24–H36: `validate.py` (Horizons, PGDA) → `/api/validation`; deploy.

**6. Frontend A — explore**
- Pre: scaffold `web/` (Vite + React + TS), tabs, responsive shell.
- H0–H4: stores (scenarios, time), API client on mocks, scrubber. H4–H12: panorama, timeline, tiles on mock data.
- H12–H16: switch to the live API. H16–H28: jump buttons, URL sync, phone layout pass.
- H28–H36: trust panel; apply design tokens; fix what the designer's review finds.

**7. Frontend B — map + compare**
- H0–H6: site picker and settings on mocks; polar map with placeholder image, markers and tap-to-pick.
- H6–H16: real map images from Science B, Sun / Earth direction, whole-Moon locator.
- H16–H28: Compare view (rows, shared axis, duplicate actions).
- H28–H36: Date-slip view with thresholds and "add as scenario"; apply design tokens.

### Who waits on whom

```
Science A ─┐
           ├─► Science C ─► live API ─► Frontend A, Frontend B   (mocks remove the wait until H12)
Science B ─┘        │
Science B ─► map images ─► Frontend B                             (placeholder image until H6)
Lead ─► sites.json ─► Science C, Frontend B                       (seed table until verified)
Designer ─► tokens + screens ─► Frontend A, Frontend B            (wireframe until tokens land)
```

Every arrow has a stand-in listed on the right, so nobody is idle in the first hours.

---

## 6. Checkpoints

| When | Everyone shows | If it fails |
|---|---|---|
| H2 | Interfaces frozen; stubs and mocks committed; UI shell runs on mocks | Stop and fix; nothing else matters yet |
| H12 | Explore view on live API for one polar site with a real terrain horizon | Science A joins B; drop the illumination overlay |
| H24 | Compare works; all curated sites load; phone layout usable | Drop Date-slip thresholds, keep the plain chart |
| H36 | Feature freeze; full demo script runs start to finish | Cut whatever the script cannot show |

## 7. Before the event

- [ ] Lead: confirm the proposed names in §5 with each person; fill or close the seventh seat; repository access for everyone
- [ ] Everyone: clone, read `AGENTS.md`, `PRODUCT.md` §4–§6 and their section here
- [ ] Science A + B: data downloaded and shared (about 0.5 GB)
- [ ] Frontend A: `web/` scaffold merged; Science C: `backend/` scaffold merged
- [ ] Designer: tokens and the Explore screen
- [ ] Lead: site table verified; rules and submission format confirmed
