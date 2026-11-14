# TODO — Chenlin Wang (Windows + API)

Tick items as they finish (`- [x]`). Hours count from the start of the event. Keep this file current; it is how
the team sees your progress. How to work: `README.md` in this folder.

## Before the event

- [ ] Backend skeleton: `backend/pyproject.toml`, package layout from `doc/WORKPLAN.md` §3, FastAPI hello endpoint, pytest running

## H0–4

- [ ] `schemas.py` for the four endpoints
- [ ] Hand-written example response for each endpoint in `web/src/api/mock/` (hour 1)
- [ ] Server answering all endpoints using the stand-in functions

## H4–12

- [ ] `visibility.py`: disk fraction and link rule, with tests
- [ ] `windows.py`: sunlight and link intervals, next sunset / sunrise / Earthset / Earthrise
- [ ] `metrics.py`: sunlit share, longest sunlit, longest dark, link share, longest link gap
- [ ] Hour 12: `/api/scenario` on real inputs for one polar site

## H12–24

- [ ] `slip.py` and `/api/slip`
- [ ] Caching of horizon profiles and scenarios
- [ ] `precompute.py`: static JSON for all curated sites

## H24–36

- [ ] `validate.py`: our angles vs. JPL Horizons, our sunlit share vs. the PGDA illumination map → `/api/validation`
- [ ] Make the public build work with no server: frontend reads the precomputed JSON for curated sites (`doc/PLAN.md` §2.5)
- [ ] `/api/health` endpoint, so the frontend can tell whether the live backend is reachable
- [ ] Run the live backend on Bing's Mac under PM2 (`luna-lens-api`, bound to `0.0.0.0`); Bing exposes it through a Cloudflare Tunnel

## H36–48

- [ ] Fixes only
- [ ] Keep the demo server up; confirm the offline fallback works with the network unplugged

## Blocked / questions

_Nothing yet. Write here when stuck for more than 30 minutes, with what you need and from whom._

## Progress log

_One line per finished piece of work: `YYYY-MM-DD HH:MM — what was done — how it was checked — PR link`._
