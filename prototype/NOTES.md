# Prototype notes

**Throwaway.** This directory is a fake-data UI demo. Do not import from it, extend it into the product,
or copy its numbers anywhere. The real frontend is built in `web/` against the API contract in `doc/PLAN.md` §2.4.

`index.html` is the **clickable layout prototype** for the real product: a minimal top bar with three tabs, a
two-column Explore view, a timeline dock fixed at the bottom, bottom tabs on a phone. Controls with a dashed border
are placeholders that explain themselves on hover or tap. The **Build map** page and the owner labels on each
block are planning aids; delete them before the demo. Do not add real computation to this file.

## Question it answers

What should Luna Lens look like, and do the five P0/P1 views read well together on desktop and on a phone?

0. Site-picking maps (south pole terrain, whole Moon with day/night)
1. Metric tiles with sunset / Earthset countdowns
2. Horizon panorama (terrain silhouette, Sun and Earth tracks)
3. One-lunar-day timeline of sunlight and Earth-link windows
4. Side-by-side site comparison
5. Date-slip chart

## How to run

One static file, no build step:

```
python3 -m http.server 8765 --bind 0.0.0.0 --directory prototype
```

On the owner's machine it is served by PM2 as `luna-lens-prototype` on port 8765.

## What is real

- **South pole map**: `assets/sp_dem_1200m.bin` is LOLA `LDEM_75S_240M` block-averaged to 1.2 km, built by
  `prototype/make_prototype_assets.py`. The projection was checked at Shackleton crater (89.67°S, 129.8°E reads
  −2786 m, a deep pit, with east to the right and 0° longitude up). The shading is relief only, lit from the
  model's Sun direction at a fixed 10° height. It is not a shadow map.
- **Whole-Moon map**: `assets/moon_1024.jpg` is the LROC colour mosaic from the NASA SVS CGI Moon Kit, downscaled.

The maps are for picking sites. They do not feed the horizon profiles or any number on the page.

## What is fake

- **Terrain horizons** are seeded random sine sums. They have no relation to LOLA data.
- **Sun and Earth motion** is a simplified model: the subsolar point circles once per synodic month with a
  ±1.54° seasonal latitude term; the sub-Earth point librates ±7° / ±6.7° with arbitrary phases. No parallax,
  no SPICE.
- **Site coordinates** are the unverified seed values from `doc/PLAN.md` §6.
- The 2° communication margin is a placeholder.

The disk-fraction formula and the az/el geometry are correct in form and can be reused as a reference, but
port them deliberately rather than copying the file.

## Verdict

_To be filled in by the team after review: which views stay, what changes, then delete this directory._
