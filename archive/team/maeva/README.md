# Maeva Andriamaniraka — Terrain

This file briefs Maeva and any AI agent working for them. Tasks are in `TODO.md` next to it.

## Your job

You turn Moon elevation data into the real horizon around a landing site: for each compass direction, how high the terrain rises. This is the critical path; without it the south-pole answers are wrong.

## Paths you own

- `backend/lunalens/terrain/`
- backend/scripts/download_data.py, backend/scripts/make_map_assets.py
- `backend/tests/test_dem_projection.py`
- web/public/maps/ (generated map images)

Everything else belongs to someone else (`team/README.md` lists who). Changing it needs that owner's review.

## What you give to others

- `horizon_profile(lat, lon, mast_m)` → 360 elevation angles in degrees, one per degree of azimuth, plus site altitude and `has_terrain` (to Chenlin). Signature in `doc/WORKPLAN.md` §4.1
- Map images for the frontend: south-pole relief map and whole-Moon locator (to Assem)
- Formula review for Chenlin's `visibility.py` (solar disk fraction, link rule)

## What you need from others

- Nothing to start. Site list from Bing later, for precomputing curated sites

## Things to know

- Read projection parameters, scaling factor and offset from the `.LBL` label shipped with each DEM. Do not hard-code them or write them from memory.
- A projection check already passed on `LDEM_75S_240M`: polar stereographic centred on 90°S / 0°E, east to the right, 0° longitude up; Shackleton crater (89.67°S, 129.8°E) reads −2786 m. Reproduce this in `test_dem_projection.py` for every DEM you use. See `prototype/make_prototype_assets.py`.
- Search radius must be at least 150 km: a 5 km high feature is visible from about 132 km. Account for the Moon's curvature (R = 1737.4 km).
- DEM choice and sizes are in `doc/PLAN.md` §5.2. Start with `LDEM_80S_80M`. Sites between 80°S and 82°S run past its edge.
- Elevations are relative to the 1737.4 km sphere, in metres. Frame is ME. Azimuth is clockwise from north.
- Non-polar sites have no DEM coverage here: return a flat profile with `has_terrain=False`.

## How to work

1. Read `AGENTS.md` (project rules) and `CONTRIBUTING.md` (branches and pull requests) once.
2. Take the next unticked item in `TODO.md`.
3. `git switch main && git pull && git switch -c maeva/<short-topic>`
4. Do the work inside your paths. Check it (tests, a build, or something a human can verify by eye).
5. In the same branch, update `TODO.md`: tick the item, add one line to the progress log.
6. `git push -u origin maeva/<short-topic>` and open a pull request on GitHub (`git@github.com:binggao1230/LunaLens.git`).
   Changes only in your own paths: merge when checks pass. Anything else: wait for the owner's approval.

## Keeping progress in sync

- `TODO.md` is how the team sees your progress. Update it every time something finishes, not at the end of the day.
- If you are stuck for more than 30 minutes, write it under "Blocked / questions" in `TODO.md`, push, and tell Bing.
- If you find the plan is wrong (a task is missing, an interface does not fit), say so in "Blocked / questions";
  do not silently work around it.
- At each checkpoint (hours 2, 12, 24, 36) your `TODO.md` should match reality before the meeting starts.

## Instructions for an AI agent

- You work for Maeva Andriamaniraka. Edit only the paths listed above and this folder.
- Write everything in English, whatever language you are spoken to in.
- Do not invent coordinates, constants, URLs or citations; mark unverified facts as "unverified".
- Never push to `main`, never force-push, never merge a pull request that needs someone else's approval.
- When an item is done: tick it in `TODO.md`, add a progress-log line with what was done and how it was checked.
- When you cannot proceed: record why under "Blocked / questions" and tell Maeva. Do not guess.
