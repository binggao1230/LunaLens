# Atlas integration: current state and release decision

Atlas is a separate lunar mapping application served within LunaLens, not the native
Expert calculation engine. This note records what exists; [TODO](../TODO.md#mission-and-atlas-workstream)
owns the next implementation.

## What is in the repository

- The production build of [daniel27-space/lunar-navigator](https://github.com/daniel27-space/lunar-navigator)
  was added in #52 under [`site/atlas/`](../site/atlas/index.html). LunaLens opens it
  in a same-origin frame on the full-width Atlas tab. `.vendor/lunar-navigator/`,
  when present, is an ignored local checkout, not an authoritative build manifest.
- Atlas includes a polar terrain map, slope and long-term illumination layers, a
  site finder, date ranking, and mission cards. The finder uses regional slope
  and long-term averages. It does not implement the native selected-stay scoring
  planned for the South Pole prototype.
- Atlas ships its own [ephemeris metadata](../site/atlas/data/ephem/ephem.json)
  (SPICE/DE440), terrain and PGDA layers. Native LunaLens uses a separate
  Horizons/DE441 snapshot and native skyline rules. Shared coordinate conventions
  do not make the two sets of visibility results interchangeable.

## What the handoff supports

[LunaLens passes a site, UTC time and optional layer](../site/js/app.js#L385) into
Atlas through its share hash. The current native date control produces a midnight
landing time. A reverse helper exists in the code but is not connected to the
running app: an Atlas selection does not update the native site automatically.
Keep this limitation explicit when testing or demonstrating Atlas.

Mission and Atlas remain separate tabs. The **South Pole** prototype now exists as a new tab
(`#/pole/expert`): the Mission globe plus a full-width native map, a pilot screening grid and an
Earth-link pulse. It deliberately uses the native map, not the Atlas frame, because the
redistribution decision below is still open; it does not replace Mission or Atlas. The core native
Explore search and comparison do not depend on Atlas. Compare, Date slip and Plan are retired as
standalone views.

## Before using Atlas in the prototype or judged release

- Verify permission to redistribute the upstream code and assets, and record
  the exact built revision, attribution and build steps. The original vendoring
  note did not pin a source revision; the local checkout alone does not prove it.
- If the decision allows reuse, test the redesigned handoff with a custom point,
  a non-midnight UTC time and a return to the original camera. Say which engine
  produced each number and which rules it used.
- If redistribution permission cannot be verified, use the native polar map for
  the planned workflow and leave the vendor build out of the judged demo/build.
  Do not present Atlas features as native LunaLens work.

The original vendoring decision and its historical browser checks are recorded
in commit `d9584dc` (#52). Recheck any changed integration at desktop and 390 px.
