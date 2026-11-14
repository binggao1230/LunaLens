# TODO — Bing Gao (Lead + Sun/Earth positions)

Tick items as they finish (`- [x]`). Hours count from the start of the event. Keep this file current; it is how
the team sees your progress. How to work: `README.md` in this folder.

## Before the event

- [ ] Confirm the six role assignments with each person; fill or close the seventh seat
- [ ] Give everyone access to the GitHub repository; make the first push of `main`
- [ ] Confirm event rules on the official site: deadline, submission format, judging criteria, AI-use disclosure
- [ ] Verify every site in `doc/PLAN.md` §6 against a primary source; write `sites.json` with a `source` for each
- [ ] Download SPICE kernels (de440s, moon_pa_de440, Moon frame kernel, leap seconds) and get `spiceypy` loading them

## H0–4

- [ ] Run the interface freeze: function signatures and API formats in `doc/WORKPLAN.md` §4 agreed by hour 2
- [ ] Commit a stand-in `sun_earth_azel` with the final signature (spherical Moon is fine) in hour 1
- [ ] Hour-2 checkpoint: stand-ins and example data committed, app shell runs

## H4–12

- [ ] Real `sun_earth_azel` in the ME frame
- [ ] `test_ephem_horizons.py` passes the fixture in `doc/PLAN.md` §2.2 within 0.01°
- [ ] Add Horizons cases for at least 3 more sites and 3 more dates
- [ ] Hour-12 checkpoint: Explore page on the live server for one polar site with real terrain. If it fails: join Maeva

## H12–24

- [ ] Write the 3-minute demo script (`doc/PRODUCT.md` §7) and list which features it needs live
- [ ] Help whoever is blocked; review contract changes
- [ ] Hour-24 checkpoint: Compare works, all curated sites load, usable on a phone

## H24–36

- [ ] Cut scope using the order in `doc/PRODUCT.md` §5
- [ ] Deploy the static site to Cloudflare; put the deploy commands in the root `README.md`
- [ ] Optional: Cloudflare Tunnel from the Mac to the live backend, for custom coordinates during the demo
- [ ] Rehearse the demo script on the real build twice
- [ ] Hour-36 checkpoint: feature freeze; the full script runs

## H36–48

- [ ] Project page text
- [ ] Record the video with Zeynep
- [ ] Remove the Build map page and owner labels from anything shown publicly
- [ ] Submit 2 hours before the deadline

## Blocked / questions

_Nothing yet. Write here when stuck for more than 30 minutes, with what you need and from whom._

## Progress log

_One line per finished piece of work: `YYYY-MM-DD HH:MM — what was done — how it was checked — PR link`._
