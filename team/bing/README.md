# Bing Gao — Lead + Sun/Earth positions

This file briefs Bing and any AI agent working for them. Tasks are in `TODO.md` next to it.

## Your job

You keep the team unblocked and the scope honest, and you compute where the Sun and Earth are in the sky as seen from a point on the Moon (no terrain).

## Paths you own

- `doc/`
- `team/`
- CONTRIBUTING.md, AGENTS.md
- `backend/lunalens/ephem/`
- backend/lunalens/sites.py, backend/lunalens/data/sites.json
- `backend/tests/test_ephem_horizons.py`

Everything else belongs to someone else (`team/README.md` lists who). Changing it needs that owner's review.

## What you give to others

- `sun_earth_azel(lat, lon, alt_m, times_utc)` → Sun and Earth azimuth/elevation arrays in degrees (to Chenlin). Signature in `doc/WORKPLAN.md` §4.1
- `sites.json`: curated sites, each with a cited source (to Chenlin and Assem)
- Decisions: scope cuts, merges of contract changes, who helps whom

## What you need from others

- Everyone's TODO files kept current, so checkpoints take minutes
- Accuracy inputs from Maeva and Chenlin for the pitch

## Things to know

- Use the Moon ME (Mean Earth) frame; convert from the PA frame explicitly. Time conversion only through `spiceypy`.
- The Horizons regression values are in `doc/PLAN.md` §2.2. Target: within 0.01°.
- Site coordinates in `doc/PLAN.md` §6 are unverified seed values. Each needs a primary source before it enters `sites.json`.
- If a seventh member who writes Python joins, hand them the ephemeris items and keep the lead items.

## How to work

1. Read `AGENTS.md` (project rules) and `CONTRIBUTING.md` (branches and pull requests) once.
2. Take the next unticked item in `TODO.md`.
3. `git switch main && git pull && git switch -c bing/<short-topic>`
4. Do the work inside your paths. Check it (tests, a build, or something a human can verify by eye).
5. In the same branch, update `TODO.md`: tick the item, add one line to the progress log.
6. `git push -u origin bing/<short-topic>` and open a pull request on GitHub (`git@github.com:binggao1230/LunaLens.git`).
   Changes only in your own paths: merge when checks pass. Anything else: wait for the owner's approval.

## Keeping progress in sync

- `TODO.md` is how the team sees your progress. Update it every time something finishes, not at the end of the day.
- If you are stuck for more than 30 minutes, write it under "Blocked / questions" in `TODO.md`, push, and tell Bing.
- If you find the plan is wrong (a task is missing, an interface does not fit), say so in "Blocked / questions";
  do not silently work around it.
- At each checkpoint (hours 2, 12, 24, 36) your `TODO.md` should match reality before the meeting starts.

## Instructions for an AI agent

- You work for Bing Gao. Edit only the paths listed above and this folder.
- Write everything in English, whatever language you are spoken to in.
- Do not invent coordinates, constants, URLs or citations; mark unverified facts as "unverified".
- Never push to `main`, never force-push, never merge a pull request that needs someone else's approval.
- When an item is done: tick it in `TODO.md`, add a progress-log line with what was done and how it was checked.
- When you cannot proceed: record why under "Blocked / questions" and tell Bing. Do not guess.
