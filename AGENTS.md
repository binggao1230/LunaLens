# Luna Lens — Rules for Agents and Collaborators

This file applies to everyone and every agent working in this repository (Claude Code, Codex, omp, and others).
The workspace rules in `../AGENTS.md` also apply; where they conflict, this file wins.

## Language

- **Documents, code, comments, identifiers and commit messages are written in English**: README, `doc/`, `TODO.md`, source, tests, commit subjects. No Chinese in those.
- **The interface may be multilingual.** `site/` ships English, French and Chinese; user-facing strings live in `site/js/i18n.js`. English stays the default and the reference wording. Prose written for people to read as documents is English even when the product speaks three languages.
- The only exceptions are the official challenge texts in `doc/Background.md` and `doc/Resources.md`, which stay as published.
- The project owner talks to agents in Chinese. Reply to them in Chinese in the conversation, but write every file and deliverable in English. A request made in Chinese is not a request for Chinese output.

## What this project is

A NASA challenge entry: a tool for rapidly comparing Sun and Earth positions relative to the horizon at lunar landing sites, with the south pole as the focus.
Team of 7, roughly 2 days. Current stage: **early planning, no code yet**.

- Challenge text: `doc/Background.md`, `doc/Resources.md` (official content; do not rewrite)
- Product plan: `doc/PRODUCT.md` (what we build: features, tiers, acceptance checks, minimum bar, out of scope)
- Build plan: `doc/PLAN.md` (technical approach, roadmap, pitfalls, resources)
- 3D plan: `doc/PLAN_3D.md` (the south-pole 3D navigator: decisions, data, milestones, acceptance checks)
- Work plan: `doc/WORKPLAN.md` (layout, code structure, interfaces, the seven work packages and their task lists)
- On features and tiers `PRODUCT.md` wins; on everything else `PLAN.md` is the source of truth. On who owns what and on interfaces `WORKPLAN.md` wins. Change the document first, then the code.

## Read before starting work

**The per-person work plans are retired.** `archive/team/` keeps them for history only; do not follow them or add to them. Work is tracked in pull requests, and the plan documents below say what to build.

1. Read `doc/PRODUCT.md` §4–§6 (features, minimum bar, out of scope) and `doc/PLAN.md` §0, §2.4 (API contract), §4 (pitfalls). Then find your role in `doc/WORKPLAN.md` §5.
2. If the work is not a feature in `PRODUCT.md`, add it there before starting. Do not expand scope silently.
3. After the H36 feature freeze, fix bugs only; add no features.

## Directory layout

```
doc/                  PRODUCT.md, PLAN.md, WORKPLAN.md, challenge text
backend/lunalens/     Python package: ephem/, terrain/, windows/, api/
backend/scripts/      data download, map assets, precompute, validation
backend/tests/        includes the Horizons regression fixture and the DEM projection check
web/                  frontend (Vite + React + TS): app/, state/, api/, ui/, lib/, features/*
data/                 DEMs, SPICE kernels, intermediates — not in Git
archive/team/         retired per-person plans, history only
design/               exported screens, logo, slides
site/                 the published static site (real engine); site/data/ is not in git
```

File-level structure and the owner of each directory are in `doc/WORKPLAN.md` §3. Follow it:

- One owner per directory. Change another owner's directory through them or a reviewed pull request.
- `web/src/features/*` do not import each other; they share through `state/`, `api/`, `ui/`, `lib/`.
- Backend layers go one way: `api → windows → (ephem, terrain)`.
- `backend/lunalens/api/schemas.py` is the API contract; `web/src/api/types.ts` is generated from it and never edited by hand.

The frontend must be responsive and usable in a phone browser; check every UI change at a narrow width (about 390 px) as well as on desktop.

## Hard data conventions

Changing any of these requires updating `doc/PLAN.md` §2.4 and `doc/WORKPLAN.md` §4 and notifying everyone.

- Longitude: east-positive, range 0–360. Latitude: south is negative. Angles in degrees.
- Azimuth: clockwise from north (north 0 → east 90).
- Time: ISO-8601 UTC everywhere externally; inside SPICE, convert time with library functions only, never by hand.
- Elevation: relative to the 1737.4 km reference sphere, in metres.
- Moon-fixed frame: ME (Mean Earth) throughout; any use of the PA frame must convert explicitly and carry a comment.
- Read DEM scaling factor, offset, and projection parameters from the `.LBL` label. Do not hard-code them or write them from memory.

## Correctness rules

- After any change to ephemeris code, run the Horizons regression test (fixture in `doc/PLAN.md` §2.2).
- "Wrong result, no error" is the most dangerous failure in this project. Any change touching projection, coordinate frames, or units must come with a check that can be verified by eye (a known feature, a known value).
- Factual content such as site coordinates, physical constants, and dataset descriptions must carry a source. Anything from memory and not checked must be marked "unverified". Do not invent citations, URLs, or values.
- If something cannot be verified, say you do not know rather than giving a specific-looking guess.
- State accuracy limits honestly: an 80 m DEM gives regional terrain constraints, not exact landing-point values.

## Running and networking

- Every dev or preview server must bind `0.0.0.0`, never `127.0.0.1` only (it must be reachable from other devices on the LAN).
- Long-running local services are managed with PM2, named with the project prefix (e.g. `luna-lens-api`, `luna-lens-web`), followed by `pm2 save`. Leave unrelated PM2 apps alone.
- The demo path must not depend on third-party services at runtime (Horizons, Trek tiles, etc.). Prefetch or render locally.

## Git

- One commit per request or task, with a message saying what changed and why.
- No AI attribution in commits or pull requests: no `Co-Authored-By` lines for AI tools and no "generated with" footers. The author is the person the agent works for.
- Do not commit: large files under `data/`, secrets, `.env`, build output, `node_modules`.
- Data is reproduced through download scripts in `scripts/`, each stating its source URL.
- Remote: `git@github.com:binggao1230/LunaLens.git`. Nobody commits to `main` directly; work on a branch and open a pull request as described in `CONTRIBUTING.md`. Do not force-push `main`.
- When changing the API contract or scope in `doc/PLAN.md`, start the commit message with `plan:` so others can find it.

## Actions that need human confirmation

Confirm before deleting data, force-pushing, or anything outward-facing (deploying publicly, submitting competition materials, sending messages). For other preference-type choices, pick the recommended option and say so in one line.
