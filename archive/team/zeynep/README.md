# Zeynep Uzan — Design

This file briefs Zeynep and any AI agent working for them. Tasks are in `TODO.md` next to it.

## Your job

You decide how Luna Lens looks and reads: the visual system, every screen, chart styling, wording, and the presentation materials. The layout prototype fixes where blocks go; everything visual is yours.

## Paths you own

- design/ (exported screens, logo, slides, video assets)
- web/src/ui/tokens.css (shared with Eya; she reviews code changes)
- UI wording anywhere in web/ — through a pull request reviewed by the owner of that feature

Everything else belongs to someone else (`team/README.md` lists who). Changing it needs that owner's review.

## What you give to others

- Design tokens: colours (light and dark), type scale, spacing, radii → `web/src/ui/tokens.css` (to Eya and Assem)
- High-fidelity screens for Explore, Compare, Date slip, Data — desktop and phone (to Eya and Assem)
- Chart styling for the horizon panorama, the timeline dock and the status tiles
- Slides, video visuals, logo, screenshots (to Bing)

## What you need from others

- The layout prototype at `prototype/index.html` as the starting structure
- Early builds from Eya and Assem to review against your screens

## Things to know

- Keep it minimal: one top bar, one content area, one bottom dock. No decoration that does not carry information.
- Hard problems worth your time first: the Sun sits within a few degrees of the horizon on a very wide chart; the Sun can be partly hidden; 'link available / blocked' must be readable without relying on colour alone.
- Reserve one colour for the Sun and one for Earth across every chart, and check them in both light and dark themes and for colour-blind readers.
- Design work lives in Figma; export what developers need into `design/` and link the Figma file in your TODO. If you change code yourself, limit it to tokens and wording and open a pull request.

## How to work

1. Read `AGENTS.md` (project rules) and `CONTRIBUTING.md` (branches and pull requests) once.
2. Take the next unticked item in `TODO.md`.
3. `git switch main && git pull && git switch -c zeynep/<short-topic>`
4. Do the work inside your paths. Check it (tests, a build, or something a human can verify by eye).
5. In the same branch, update `TODO.md`: tick the item, add one line to the progress log.
6. `git push -u origin zeynep/<short-topic>` and open a pull request on GitHub (`git@github.com:binggao1230/LunaLens.git`).
   Changes only in your own paths: merge when checks pass. Anything else: wait for the owner's approval.

## Keeping progress in sync

- `TODO.md` is how the team sees your progress. Update it every time something finishes, not at the end of the day.
- If you are stuck for more than 30 minutes, write it under "Blocked / questions" in `TODO.md`, push, and tell Bing.
- If you find the plan is wrong (a task is missing, an interface does not fit), say so in "Blocked / questions";
  do not silently work around it.
- At each checkpoint (hours 2, 12, 24, 36) your `TODO.md` should match reality before the meeting starts.

## Instructions for an AI agent

- You work for Zeynep Uzan. Edit only the paths listed above and this folder.
- Write everything in English, whatever language you are spoken to in.
- Do not invent coordinates, constants, URLs or citations; mark unverified facts as "unverified".
- Never push to `main`, never force-push, never merge a pull request that needs someone else's approval.
- When an item is done: tick it in `TODO.md`, add a progress-log line with what was done and how it was checked.
- When you cannot proceed: record why under "Blocked / questions" and tell Zeynep. Do not guess.
