# Luna Lens — Rules for Agents and Collaborators

This file applies to everyone and every agent working in this repository (Claude Code, Codex, omp, and others).
The workspace rules in `../AGENTS.md` also apply; where they conflict, this file wins.

## Language

- **Everything in this project is written in English**: documents, code, comments, identifiers, commit messages, UI copy, the demo script, slides, and submission materials. No Chinese in the repository.
- The only exceptions are the official challenge texts in `doc/Background.md` and `doc/Resources.md`, which stay as published.
- The project owner talks to agents in Chinese. Reply to them in Chinese in the conversation, but write every file and deliverable in English. A request made in Chinese is not a request for Chinese output.

## What this project is

A NASA challenge entry: a tool for rapidly comparing Sun and Earth positions relative to the horizon at lunar landing sites, with the south pole as the focus.
Team of 7, roughly 2 days. Current stage: **early planning, no code yet**.

- Challenge text: `doc/Background.md`, `doc/Resources.md` (official content; do not rewrite)
- Plan and decisions: `doc/PLAN.md` (single source of truth; change scope, roles, and the API contract here first)

## Read before starting work

1. Read `doc/PLAN.md` §0, §2.4 (API contract), and §4 (pitfalls).
2. If the work is not in the P0/P1 scope of the plan, add it to the plan before starting. Do not expand scope silently.
3. After the H36 feature freeze, fix bugs only; add no features.

## Directory layout (follow this when code is created)

```
doc/        plan and challenge documents
api/        FastAPI service
ephem/      ephemeris (SPICE wrapper)
terrain/    DEM reading, horizon mask
windows/    illumination and communication windows, metrics
web/        frontend (Vite + React + TS)
scripts/    data download and precomputation scripts
data/       DEMs, SPICE kernels, precomputed intermediates — not in Git
tests/      includes the Horizons regression fixture
prototype/  throwaway fake-data UI demo — never import from it or build on it
```

The frontend must be responsive and usable in a phone browser; check every UI change at a narrow width (about 390 px) as well as on desktop.

## Hard data conventions

Changing any of these requires updating `doc/PLAN.md` §2.4 and notifying everyone.

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
- Do not commit: large files under `data/`, secrets, `.env`, build output, `node_modules`.
- Data is reproduced through download scripts in `scripts/`, each stating its source URL.
- When several people work in parallel, each uses a branch; regression tests must pass before merging. Do not force-push shared branches.
- When changing the API contract or scope in `doc/PLAN.md`, start the commit message with `plan:` so others can find it.

## Actions that need human confirmation

Confirm before deleting data, force-pushing, or anything outward-facing (deploying publicly, submitting competition materials, sending messages). For other preference-type choices, pick the recommended option and say so in one line.
