# Prototype notes

**Throwaway.** This directory is a fake-data UI demo. Do not import from it, extend it into the product,
or copy its numbers anywhere. The real frontend is built in `web/` against the API contract in `doc/PLAN.md` §2.4.

## Question it answers

What should Luna Lens look like, and do the five P0/P1 views read well together on desktop and on a phone?

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
