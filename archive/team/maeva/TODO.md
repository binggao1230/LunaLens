# TODO — Maeva Andriamaniraka (Terrain)

Tick items as they finish (`- [x]`). Hours count from the start of the event. Keep this file current; it is how
the team sees your progress. How to work: `README.md` in this folder.

## Before the event

- [ ] Write `download_data.py` with source URLs; download `LDEM_80S_80M`, `LDEM_85S_40M`, `LDEM_875S_20M`, `LDEM_60S_240M` (+ `.LBL`)
- [ ] Read the labels; write `dem.py` (lat/lon ↔ pixel, height sampling)
- [ ] `test_dem_projection.py`: Shackleton crater is a deep pit at the expected position

## H0–4

- [ ] Commit a stand-in `horizon_profile` with the final signature (flat horizon) in hour 1
- [ ] First real version: ray march over 360 azimuths with curvature, for one site

## H4–12

- [ ] Plot the horizon for the Shackleton ridge site and check it by eye against the map
- [ ] Choose the DEM by site latitude; handle the DEM edge
- [ ] Hour 12: Chenlin's server uses your real horizon for one polar site

## H12–24

- [ ] Speed: about 1 second per site or better; cache results
- [ ] Mast height parameter
- [ ] `make_map_assets.py`: south-pole relief map and whole-Moon locator into `web/public/maps/`
- [ ] Review the formulas in Chenlin's `visibility.py`

## H24–36

- [ ] Only if the horizon is solid: per-pixel sunlit-share overlay for the south-pole map
- [ ] Otherwise: harden edge cases and accuracy

## H36–48

- [ ] Fixes only
- [ ] One paragraph for the pitch: data used, resolution, what the horizon does and does not capture

## Blocked / questions

_Nothing yet. Write here when stuck for more than 30 minutes, with what you need and from whom._

## Progress log

_One line per finished piece of work: `YYYY-MM-DD HH:MM — what was done — how it was checked — PR link`._
