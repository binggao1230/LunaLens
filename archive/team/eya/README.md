# Eya Amrach — Frontend: Explore

This file briefs Eya and any AI agent working for them. Tasks are in `TODO.md` next to it.

## Your job

You build the app everyone else's work shows up in: the shell, the shared state, and the Explore page's status tiles, horizon panorama and timeline dock.

## Paths you own

- web/ (project setup and config)
- web/src/app/, web/src/state/, web/src/api/ (client and generated types), web/src/lib/
- web/src/ui/ (shared with Zeynep)
- web/src/features/now/, panorama/, timeline/, about/
- `web/src/features/scenario/ScenarioTray`

Everything else belongs to someone else (`team/README.md` lists who). Changing it needs that owner's review.

## What you give to others

- A running app shell with tabs and responsive layout (to Assem, from before the event)
- Shared state: the list of scenarios, the active scenario, the current time (to Assem)
- The data client and typed responses (to Assem)
- UI primitives in `web/src/ui/` built on Zeynep's tokens

## What you need from others

- Example responses from Chenlin in `web/src/api/mock/` (hour 1); the live server at hour 12
- Tokens and screens from Zeynep; until they arrive, build plain

## Things to know

- The layout reference is `prototype/index.html`. Copy its structure, not its code: it is one throwaway file with fake data.
- The timeline dock is the time control: dragging the strips scrubs time. There is no separate slider.
- Features do not import each other. Shared things go through `state/`, `api/`, `ui/`, `lib/`.
- `web/src/api/types.ts` is generated from the backend schemas; never edit it by hand.
- Check every change at about 390 px wide as well as on desktop. Dev server binds `0.0.0.0`.

## How to work

1. Read `AGENTS.md` (project rules) and `CONTRIBUTING.md` (branches and pull requests) once.
2. Take the next unticked item in `TODO.md`.
3. `git switch main && git pull && git switch -c eya/<short-topic>`
4. Do the work inside your paths. Check it (tests, a build, or something a human can verify by eye).
5. In the same branch, update `TODO.md`: tick the item, add one line to the progress log.
6. `git push -u origin eya/<short-topic>` and open a pull request on GitHub (`git@github.com:binggao1230/LunaLens.git`).
   Changes only in your own paths: merge when checks pass. Anything else: wait for the owner's approval.

## Keeping progress in sync

- `TODO.md` is how the team sees your progress. Update it every time something finishes, not at the end of the day.
- If you are stuck for more than 30 minutes, write it under "Blocked / questions" in `TODO.md`, push, and tell Bing.
- If you find the plan is wrong (a task is missing, an interface does not fit), say so in "Blocked / questions";
  do not silently work around it.
- At each checkpoint (hours 2, 12, 24, 36) your `TODO.md` should match reality before the meeting starts.

## Instructions for an AI agent

- You work for Eya Amrach. Edit only the paths listed above and this folder.
- Write everything in English, whatever language you are spoken to in.
- Do not invent coordinates, constants, URLs or citations; mark unverified facts as "unverified".
- Never push to `main`, never force-push, never merge a pull request that needs someone else's approval.
- When an item is done: tick it in `TODO.md`, add a progress-log line with what was done and how it was checked.
- When you cannot proceed: record why under "Blocked / questions" and tell Eya. Do not guess.
