# TODO — Assem Hssini (Frontend: map + compare)

Tick items as they finish (`- [x]`). Hours count from the start of the event. Keep this file current; it is how
the team sees your progress. How to work: `README.md` in this folder.

## Before the event

- [x] Read `AGENTS.md`, `doc/PRODUCT.md` §4 and `doc/WORKPLAN.md`; open `prototype/index.html`
- [ ] Clone the repository and run Eya's scaffold
- [x] Agree with Eya how features read and change the shared state

## H0–4

- [ ] Site picker: curated list in groups + custom latitude / longitude
- [ ] Scenario settings: landing date and time, mast height, link margin

## H4–12

- [ ] South-pole map with placeholder image: markers, selected state, tap to pick a point
- [ ] Swap in Maeva's real map image; show the directions to the Sun and to Earth

## H12–24

- [ ] Whole-Moon map with day / night boundary
- [ ] Compare page: rows, shared time axis, totals, duplicate / remove actions

## H24–36

- [ ] Date-slip page: chart, thresholds, 'add this day as a scenario'
- [ ] Apply Zeynep's tokens; fix what her review finds

## H36–48

- [ ] Fixes only

## Blocked / questions

- Waiting for Eya's `web/` scaffold (Vite + React + TS) to land. Zustand shared state contract (`SHARED_STATE_CONTRACT.md`) and component specifications for `SitePicker` and `ScenarioSettings` (`COMPONENT_SPECS_H0_4.md`) are defined and ready for implementation.

## Progress log

2026-11-14 11:27 — defined the site picker and scenario settings behavior contract — checked against PRODUCT.md, WORKPLAN.md, and the prototype — no PR yet
2026-11-14 11:30 — prepared functional, API-state, UTC, validation, and mobile test cases — documentation-only check: git diff --check — no PR yet
2026-11-14 11:33 — prepared the frontend integration checklist and south-pole projection contract — checked against WORKPLAN.md, README.md, and the prototype — no PR yet
2026-11-14 12:25 — defined Zustand shared state contract and H0-4 component specs for SitePicker and ScenarioSettings — checked against schemas.py and prototype — no PR yet
