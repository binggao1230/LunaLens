# Assem Hssini — Frontend: map + compare

This file briefs Assem and any AI agent working for them. Tasks are in `TODO.md` next to it.

## Your job

You build how users choose and compare: the maps, the site picker and settings, the Compare page and the Date-slip page.

## Paths you own

- `web/src/features/map/`
- web/src/features/scenario/SitePicker, ScenarioSettings
- `web/src/features/compare/`
- `web/src/features/slip/`

Everything else belongs to someone else (`team/README.md` lists who). Changing it needs that owner's review.

## What you give to others

- South-pole map and whole-Moon map with site markers and tap-to-pick
- Site picker (curated list + custom coordinates) and scenario settings
- Compare page: one row per scenario on a shared time axis
- Date-slip page: chart per day of delay, thresholds, 'add this day as a scenario'

## What you need from others

- App shell, shared state and data client from Eya
- Example responses from Chenlin (hour 1); the live server at hour 12
- Map images from Maeva (a placeholder image until about hour 6)
- Tokens and screens from Zeynep; until they arrive, build plain

## Things to know

- The layout reference is `prototype/index.html`. Copy its structure, not its code.
- South-pole map projection: polar stereographic centred on the pole, 0° longitude up, east to the right. Put the lat/lon ↔ pixel maths in `web/src/lib/geo.ts` and test it with a known point.
- Longitude is east-positive 0–360; south latitude is negative.
- Features do not import each other; read and change scenarios through the shared state.
- All written work in the repository is in English: code, comments, commits, pull requests.
- Check every change at about 390 px wide as well as on desktop.

## How to work

1. Read `AGENTS.md` (project rules) and `CONTRIBUTING.md` (branches and pull requests) once.
2. Take the next unticked item in `TODO.md`.
3. `git switch main && git pull && git switch -c assem/<short-topic>`
4. Do the work inside your paths. Check it (tests, a build, or something a human can verify by eye).
5. In the same branch, update `TODO.md`: tick the item, add one line to the progress log.
6. `git push -u origin assem/<short-topic>` and open a pull request on GitHub (`git@github.com:binggao1230/LunaLens.git`).
   Changes only in your own paths: merge when checks pass. Anything else: wait for the owner's approval.

## Keeping progress in sync

- `TODO.md` is how the team sees your progress. Update it every time something finishes, not at the end of the day.
- If you are stuck for more than 30 minutes, write it under "Blocked / questions" in `TODO.md`, push, and tell Bing.
- If you find the plan is wrong (a task is missing, an interface does not fit), say so in "Blocked / questions";
  do not silently work around it.
- At each checkpoint (hours 2, 12, 24, 36) your `TODO.md` should match reality before the meeting starts.

## Instructions for an AI agent

- You work for Assem Hssini. Edit only the paths listed above and this folder.
- Write everything in English, whatever language you are spoken to in.
- Do not invent coordinates, constants, URLs or citations; mark unverified facts as "unverified".
- Never push to `main`, never force-push, never merge a pull request that needs someone else's approval.
- When an item is done: tick it in `TODO.md`, add a progress-log line with what was done and how it was checked.
- When you cannot proceed: record why under "Blocked / questions" and tell Assem. Do not guess.
