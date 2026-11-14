# Atlas: the reference app vendored into our site

Status: branch `bing/port-plan`, local only. Written 2026-11-14.

## What was decided

The reference entry for this challenge is the spec. Instead of re-implementing its map page in our
buildless site, its production build is vendored and served as a page of its own.

- Source: `github.com/daniel27-space/lunar-navigator`, `web/` (Vite + React + TypeScript).
- Built once with `npm ci && npm run build`; `base: './'` in its `vite.config.ts` already makes the
  output path-independent.
- Output copied to `site/atlas/` (151 files, 94 MB, of which 90 MB is its precomputed data:
  ephemeris table, south-polar elevation and slope tiles, the three PGDA illumination layers,
  per-site terrain patches, mission images and lander models).
- Nav: `Atlas` is a view of this site (`#/atlas`) that frames `atlas/index.html` under our own header
  and tab bar. The frame's `src` carries a share hash built from the current scenario
  (`s=lat,lon,label&t=ISO`), so it opens on the site and date the rest of the page is showing.
- `.vendor/lunar-navigator/` holds the clone used for the build and is git-ignored.
- `site/atlas/data/` is re-included through `!site/atlas/data/` in `.gitignore`, because the global
  `data/` rule would otherwise drop the app's data.

## What it brings

Seven south-polar layers (`Find a site`, `Sun now`, `Avg sunlight`, `Avg Earth view`, `Shadow`,
`Height`, `Slope`), a site finder with hard limits and a ranked shortlist, landing-date ranking with
a baseline comparison, adjustable assumptions (sunlit rule, Earth mask, observer height), pinning by
click or coordinates, a share link and CSV export, 41 landing sites with mission cards, and a 3D
mission view.

Its data contract matches ours (MOON_ME, R = 1737.4 km, east-positive, azimuth clockwise from
north), which is why our own site can cite the same sources without a frame conversion.

## Verified

- Served from our own static server: page loads at `#/` and at `/atlas/`, layers switch, site finder
  and time bar work, back link returns to `index.html`.
- 1440 x 900 and 390 x 844: no overlap between the back link and the app's own controls after
  moving it below the layer bar on desktop and below the title on mobile.
- Console: only the app's own `THREE.Clock` deprecation warning and one a11y notice.

## Still open

1. **Deploy cost.** The deploy workflow uploads `site/` to Cloudflare Workers; 94 MB and 151 files
   are inside the plan's limits (25 MiB per file, 20,000 files) but the upload time and the
   repository size (`.git` is now about 196 MB) are real costs. Options: keep it, or move the data
   to a release asset fetched at deploy time.
2. **Two products, one nav.** The handoff is one-way: our date and site travel into the frame through
   the URL hash, nothing travels back. Two-way sync needs `postMessage` both ways (the app already
   serialises its own state, so the frame can be asked to send it).
3. **Our own pages.** Mission, Explore, Compare and Date slip stay as they are. The Atlas page is
   additive; nothing in it replaces them yet.
4. **Provenance.** The app carries its own credits. Our Data page should link to the Atlas sources
   (PGDA product 69, LOLA, JPL DE440) so the two pages do not disagree.
