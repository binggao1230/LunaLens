# Chenlin Wang — Windows + API

This file briefs Chenlin and any AI agent working for them. Tasks are in `TODO.md` next to it.

## Your job

You combine Bing's Sun/Earth angles with Maeva's horizon into what the user sees: is the Sun up, is the link open, when does that change, and the totals over the stay. You also run the server the frontend talks to.

## Paths you own

- `backend/lunalens/windows/`
- `backend/lunalens/api/`
- backend/lunalens/config.py, backend/pyproject.toml
- backend/scripts/precompute.py, backend/scripts/validate.py
- `backend/tests/test_windows.py`
- web/src/api/mock/ (example responses)

Everything else belongs to someone else (`team/README.md` lists who). Changing it needs that owner's review.

## What you give to others

- `backend/lunalens/api/schemas.py`: the response formats, which are the contract with the frontend
- Example responses in `web/src/api/mock/` in hour 1, so Eya and Assem can build without a server
- Endpoints `/api/sites`, `/api/scenario`, `/api/slip`, `/api/validation` (`doc/WORKPLAN.md` §4.2)
- Precomputed JSON for curated sites, as an offline fallback for the demo

## What you need from others

- `sun_earth_azel` from Bing and `horizon_profile` from Maeva (stand-ins arrive in hour 1)
- `sites.json` from Bing
- Maeva's review of the formulas in `visibility.py`

## Things to know

- Code written fast with AI help can be wrong without failing. Every function in `windows/` gets a hand-made test with a known answer before it is wired into the API.
- Solar disk fraction: the Sun is a disk about 0.53° across, not a point. With h = Sun-centre elevation above the local horizon and r = 0.265°: fraction = 1 − (acos(x) − x·√(1−x²))/π for x = h/r in [−1, 1], 0 below, 1 above.
- Link rule: Earth-centre elevation > terrain horizon at Earth's azimuth + margin (default 2°, a placeholder).
- Any change to `schemas.py` after hour 2 needs Bing's approval and a message to Eya and Assem.
- Servers bind `0.0.0.0`. Conventions for units and angles are in `AGENTS.md`.

## How to work

1. Read `AGENTS.md` (project rules) and `CONTRIBUTING.md` (branches and pull requests) once.
2. Take the next unticked item in `TODO.md`.
3. `git switch main && git pull && git switch -c chenlin/<short-topic>`
4. Do the work inside your paths. Check it (tests, a build, or something a human can verify by eye).
5. In the same branch, update `TODO.md`: tick the item, add one line to the progress log.
6. `git push -u origin chenlin/<short-topic>` and open a pull request on GitHub (`git@github.com:binggao1230/LunaLens.git`).
   Changes only in your own paths: merge when checks pass. Anything else: wait for the owner's approval.

## Keeping progress in sync

- `TODO.md` is how the team sees your progress. Update it every time something finishes, not at the end of the day.
- If you are stuck for more than 30 minutes, write it under "Blocked / questions" in `TODO.md`, push, and tell Bing.
- If you find the plan is wrong (a task is missing, an interface does not fit), say so in "Blocked / questions";
  do not silently work around it.
- At each checkpoint (hours 2, 12, 24, 36) your `TODO.md` should match reality before the meeting starts.

## Instructions for an AI agent

- You work for Chenlin Wang. Edit only the paths listed above and this folder.
- Write everything in English, whatever language you are spoken to in.
- Do not invent coordinates, constants, URLs or citations; mark unverified facts as "unverified".
- Never push to `main`, never force-push, never merge a pull request that needs someone else's approval.
- When an item is done: tick it in `TODO.md`, add a progress-log line with what was done and how it was checked.
- When you cannot proceed: record why under "Blocked / questions" and tell Chenlin. Do not guess.
