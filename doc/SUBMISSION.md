# LunaLens submission draft

Working draft. Match the text and demo to the exact release that judges can open.
A successful deployment does not prove that a project was submitted. Verify the
event's deadline and required fields on the team project page before submission.
This file is release material; [TODO](../TODO.md) is the implementation plan.

## Project name

LunaLens

## High-level summary

LunaLens helps people explore lighting and direct-to-Earth visibility at lunar
south-pole landing sites. Choose a point and date to see the Sun and Earth
relative to the local skyline, then move along the timeline to see when each
becomes visible. An optional guided Mission story explains why a date delay or
a nearby ridge can change the result.

## Detailed description

- **Where:** Explore lets users pick a known site, click the south-polar map or
  enter coordinates. Covered locations use a terrain skyline; other locations
  use a smooth-sphere reference. The Mission page also shows local relief in 3D.
- **When:** Use the landing date and timeline to inspect Sun and Earth elevation,
  visibility windows and the change from light to shadow. The current native
  landing-date control uses UTC midnight; the timeline previews later times.
- **What changes:** Mission shows how sites differ on a shared landing date and
  can export that comparison. Expert period search, comparisons between two
  independently chosen times, and the South Pole prototype stay out of the
  release description until they are implemented and verified in the release.

The browser uses hourly JPL Horizons data from the local snapshot. Terrain-backed
presets use precomputed LOLA skylines. Custom polar points use the 240 m grid;
some presets also use finer near-field terrain. The Earth margin is a geometric
line-of-sight criterion. LunaLens does not certify a landing, calculate Earth
launch windows, model power output, or predict radio performance.

We checked the calculations against a JPL Horizons fixture and a separate Python
implementation. In a separate long-term sunlight comparison against NASA PGDA
product 69 across 120 sample points, we measured a **rank correlation 0.984**
and an RMS difference of **2.71 percentage points**. This check does not validate
individual touchdown times, communication windows or ground-level terrain.

## Use of Super Intelligence

AI assistance was used for project planning, code, documentation and translations.
The scientific ephemeris and terrain inputs come from the scientific providers
below. Before submission, confirm the final disclosure and visual asset credits
against the team records. The Education verdict is explicitly illustrative and
uses its own teaching rules.

## NASA data

- JPL Horizons / DE441: hourly Sun and Earth positions in the Moon's mean-Earth
  frame. The current native snapshot spans 2026–2030.
- LRO LOLA: polar elevation grids and derived skylines.
- NASA GSFC PGDA product 69: long-term illumination data used for the sunlight
  comparison. NASA SVS 5587 is an independent check of the ephemeris for 2026.

## Other data, code and references

- [Resources](Resources.md) lists the official challenge resources. The in-app
  Data view describes the sources, limits and checks for this implementation.
- Three.js, OrbitControls and GLTFLoader render the 3D views. Font and model
  credits are kept with their assets.
- If the separate Atlas build is included, identify its distinct upstream work
  and data. Resolve permission and attribution as described in the
  [Atlas integration note](PORT_PLAN.md) before relying on it in a judged release.

## Final project link

`https://luna-lens.gaobing1230.workers.dev/`

Check the exact release in an anonymous browser. Make the same check for the demo.
Do not infer the current login policy from an old draft or deployment.

## Demo: seven slides

1. **Problem:** Show why a low Sun or Earth angle makes nearby terrain important.
2. **Pick a point:** Open native Explore and select a terrain-backed south-pole site.
3. **Read the skyline:** Show where the Sun and Earth sit relative to the terrain.
4. **Read the time axis:** Scrub to a visible and a blocked or shaded moment.
5. **Try another location:** In Mission, compare two terrain-backed sites on the
   same date. Quote only figures reproduced on the release used to record the demo.
6. **Evidence and limits:** Open Data and show the long-term check and terrain
   resolution. Explain the distinction between visibility and power/radio performance.
7. **Close:** Show the project link and optionally mention the separate Education mode.

## Before submission

- [ ] Record the release SHA and reproduce the demo. Check both links without login.
- [ ] Verify the current event format (the working format was seven slides or a
  30-second video) and complete required fields and credits in English.
- [ ] Review Atlas rights and attribution if the release includes that build.
- [ ] Check the flow on a physical iOS and Android phone.
- [ ] Have the authorized team member verify judging submission separately from deployment.
