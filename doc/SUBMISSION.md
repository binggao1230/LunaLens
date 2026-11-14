# Submission page: the text to paste, and the demo to record

Deadline: **Sunday 15 November 2026, 23:59 local event time**. Submission happens on the team page's Project tab
and needs "Submit for Judging" to be clicked; a saved draft does not count. Sources: the official project
submission guide and the 2026 event page, both read on 2026-11-14.

This file holds what goes in each field, so the last hour is copying, not writing.

## Project name

LunaLens

## High-level summary

LunaLens is a planner for lunar south-pole landing sites. Pick a site and a date and it shows, hour by hour,
whether the Sun clears the real terrain horizon and whether Earth is in view — the two things that decide whether a
lander has power and a direct link — and it answers the question missions actually face: *if the date slips, is the
site still viable?* Skyline heights come from NASA LOLA elevation, Sun and Earth positions from JPL Horizons, and
every number is computed in the browser against a published reference: the share of time in sunlight agrees with
NASA's long-term illumination map (rank correlation 0.98, RMS 2.7 points, 120 sampled points).

## Detailed description

**What it does.** Three things a mission planner needs, in one place:

- **Where.** A south-polar map with the real relief, a searchable list of landing sites, and open coordinates. The
  map carries the long-term pictures too: average sunlight, average Earth view, permanent shadow, slope.
- **When.** A landing date and a time scrubber over a 29.5-day stay. For the chosen site the page shows the Sun and
  Earth against the terrain skyline, the elevation of each, the time to sunset and Earthset, and the hours of
  sunlight, Earth link and both.
- **What if.** Scenarios are (site, date) pairs. Compare two and the page answers in one sentence: *"compared with
  14 November, 28 November gains 52 hours of Earth link and loses 52 hours of sunlight; the landing itself is in
  sunlight."*

**How it works.** Sun and Earth positions are precomputed hourly from JPL Horizons in the Moon's mean-Earth frame.
For each site the browser marches 720 rays over the LOLA elevation grids, along great circles and in three
dimensions so lunar curvature is included, and keeps the highest terrain angle in every direction. The Sun counts
as up when any part of its disc clears that skyline, Earth when its centre does; both are discs, not points. Every
total the page shows comes from that skyline, not from a flat horizon.

**Why it is trustworthy.** The engine is checked three ways: against an independent Python implementation, hour by
hour, at every site; against a JPL Horizons fixture for a known point; and against NASA's long-term illumination map
(PGDA product 69) at 120 sampled points, where our share of time in sunlight matches at r = 0.98 with an RMS
difference of 2.7 percentage points. The Data page prints the numbers, the sample size and the four ways the
comparison is not like-for-like.

**Tools.** JavaScript ES modules, no framework and no build step for the product itself; three.js for the 3D views;
Python for the data pipeline (Horizons fetch, LOLA gridding, checks); plain static hosting, so the demo needs no
server.

## Use of Super Intelligence

Yes.

- **Planning and code:** an AI assistant wrote most of the implementation, the data pipeline and this text, working
  from the team's decisions and reviews.
- **Interface text and translations:** the English, French and Chinese interface strings were drafted with it.
- **Data:** no AI-generated data. Every number comes from the sources below and is computed by code we can read.
- **Images:** no AI-generated images, audio or video. The Moon, Earth and Sun textures are NASA imagery.
- **What is ours:** the choice of what to build, the acceptance checks, the site list, and every decision recorded
  in `TODO.md` and `doc/`.

## NASA data

- **JPL Horizons** (DE441): hourly Sun and Earth positions as seen from the Moon, 2026–2030, converted to the
  mean-Earth/polar-axis frame with the lunar rotation during light travel time accounted for.
- **LRO LOLA** gridded elevation: LDEM_75S_240M for the polar cap, LDEM_85S_40M for the ridge sites, plus the
  derived horizon profiles.
- **NASA SVS 4720**: the LROC colour mosaic, and the long-exposure Moon phase table used as an independent check.
- **NASA GSFC PGDA product 69** (Mazarico et al. 2011): average sunlight, average Earth view and permanent shadow
  over 18.6 years — the reference our sunlight share is compared against.

## Other data, code and references

- LRO LOLA PDS documentation; PGDA product 69 and 78 pages.
- Three.js r170 (MIT), OrbitControls, GLTFLoader.
- Fonts: Geist, Geist Mono, Newsreader (SIL OFL 1.1).
- The Atlas page is built from the public `daniel27-space/lunar-navigator` source; its data files carry their own
  attribution in `site/atlas/data`.
- Everything else, including the 3D scene, the map renderer and the data scripts, is in the repository.

## Final project link

`https://luna-lens.gaobing1230.workers.dev` — **the Access gate must be removed first**; judges cannot log in.

## Demo: seven slides

1. **Title** — LunaLens, one line: "A landing site is a date as much as a place."
2. **The problem** — at the south pole the Sun sits within 2° of the horizon, so a ridge two kilometres away
   decides whether a lander has power; missions slip, and nobody can answer "is the site still viable?" quickly.
3. **Where** — the map: real relief, the layer buttons, a site picked by click.
4. **When** — the horizon view and the counts: sunset in 13 h, Earth link available, sunlight 98% of the stay.
5. **What if** — two scenarios on one screen and the sentence: 28 November, −52 h sunlight, +11 h Earth link.
6. **Why trust it** — the Data page: r = 0.98 against NASA's illumination map, the two independent implementations,
   the Horizons fixture.
7. **Close** — what it is not: a screening tool, not a certified site survey; 240 m terrain, no atmospherics, no
   link budget. Then the link.

## Check before pressing submit

- [ ] Access gate off; the link opens in a private window with no login.
- [ ] Demo hosted publicly (seven slides or a 30-second video, not both exceeded).
- [ ] Every field in English.
- [ ] NASA data listed; SI disclosure filled.
- [ ] Phone check: the site opens on one iOS and one Android device.
- [ ] Project page saved, then **Submit for Judging** clicked before 23:59 local time.
