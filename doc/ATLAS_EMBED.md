# Atlas embed contract

Atlas is the third stage of the South Pole workspace: a fixed 3D surface view of **one**
coordinate. The Map stage owns point selection, saved points and comparison; Atlas only
renders the selected point, its own layer row and its own time bar.

This note describes the code in `site/atlas/source/web/src` and
`site/js/views/southpole/index.js`. Items marked **required/pending** are not yet wired on
both sides.

## Loading Atlas

The parent loads Atlas in a same-origin iframe:

```text
atlas/index.html?embed=1&sp=<rev>#s=<lat>,<lon>,<label>&t=<YYYY-MM-DDTHH:MMZ>
```

- `embed=1` is the embed switch. Atlas reads it with
  `new URLSearchParams(location.search).has('embed')` and sets `data-embed="on"`.
  In embed mode it hides the site header, dock cards, welcome/tour and find button. It
  keeps the layer row and the complete bottom time bar.
- `sp=<rev>` is a cache-bust counter only. Atlas ignores it. The parent increments
  `ui.atlasRev` when it builds the URL (`atlas/index.html?embed=1&sp=${++ui.atlasRev}#...`).
- The hash carries one `s` value and one `t` value:
  - `s` is `lat,lon,label`, with latitude and longitude at four decimal places. The
    label may contain commas; Atlas takes the first two fields as numbers and joins
    the rest as the label.
  - `t` is a UTC minute, `YYYY-MM-DDTHH:MMZ`. Atlas only accepts that exact shape.
- Atlas also understands other share-hash keys (`layer`, `goal`, `sun`, `earth`, `h`,
  `f`, `b0`–`b2`), but the parent currently writes only `s` and `t`. Layer changes go
  through `postMessage`, not the hash.
- Malformed hash parts are dropped individually; a bad `s` or `t` does not prevent
  Atlas from loading.

## One coordinate, not A/B/C

The embed contract is one point:

```js
sites: [{ lat, lon, label }]
```

The parent builds that single item from `atlasPoint()` (active saved point, then the
Map target, then the selected study site). With no point selected it sends an empty
`sites` array and `active: null`.

A/B/C slots no longer apply to this integration. The Map stage owns saved points and
comparison, and Atlas is a view of the current point. Atlas still tolerates up to three
sites internally (`MAX_PINS = 3`, `sites.slice(0, 3)` in the command handler), but the
embed caller must send exactly one. Do not build new behaviour on Atlas's three-pin
support.

## Parent → Atlas commands

The parent posts a command to the iframe:

```js
win.postMessage({
  type: 'lunalens:atlas-command',
  sites: [{ lat, lon, label }],
  active: { lat, lon },
  tMs,
  layer: 'natural',
  // send once on Map→Atlas entry only; never on time/layer updates
  focus: { lat, lon },
}, location.origin)
```

Field behaviour in Atlas:

- `sites`: finite `lat`/`lon` are kept; Atlas computes `hM` itself from its terrain.
  The array replaces the current pins.
- `active`: matched to a pin by coordinate (within `1e-6`); the matching pin becomes
  active. The parent currently sends only `lat` and `lon` here, no label.
- `tMs`: finite milliseconds. Atlas stops playback and sets its clock. Its own
  `setTime` clamps to the Atlas ephemeris range.
- `layer`: a layer id string. Atlas casts it to `LayerMode` without validation, so the
  parent must send one of the ids below.
- `focus`: finite `lat`/`lon`. Atlas calls
  `store.goTo({ kind: 'site', lat, lon, hM })`, which animates the camera to that point
  once. This is a camera command only; it does not add a pin.

**Required/pending:** Atlas accepts `focus`, but the parent's
`pushAtlasCommand()` does not send it yet. The parent must send `focus` exactly once
when entering the Atlas stage, and must not send it on time or layer updates.

### Origin check

Atlas drops any command whose `event.origin !== location.origin`. The parent posts
with `location.origin`. Both frames must therefore be served from the same scheme,
host and port. Opening the parent from `file://` or serving Atlas from a different
origin silently breaks the command channel. The parent's state listener checks the
message source window but not the origin; adding an origin check there is recommended.

## Atlas → parent state

Atlas posts its state after it writes its own share hash (debounced, and not while its
clock is running):

```js
{
  type: 'lunalens:atlas-state',
  sites: [{ lat, lon, label, slot }],
  active: { lat, lon, label, slot } | null,
  tMs,
}
```

- `slot` is Atlas's internal pin slot; with one site it is `0`.
- `active` is `null` when Atlas has no active pin.
- There is no `layer` field. If the parent needs to mirror a layer chosen inside
  Atlas, that field must be added (currently not implemented).
- The parent matches incoming sites to its saved waypoints by coordinate (about
  `1e-3` degrees), updates the active target and adopts `tMs` when it differs by more
  than a minute.

## Layers and time bar

Layer ids accepted by the command and used by the Atlas layer row:

| id | Atlas label | Meaning |
| --- | --- | --- |
| `natural` | Sun now | Light and shadow at the selected time |
| `sunavg` | Sun avg | Average sunlight share |
| `earthavg` | Earth avg | Average Earth visibility |
| `psr` | Shadow | Permanent shadow |
| `elevation` | Height | Elevation above the reference sphere |
| `slope` | Slope | Surface slope |

`finder` exists inside Atlas but is not part of the embed layer row; do not send it as
part of this contract.

The Atlas layer row is the visible control in embed mode. The parent's old
`#sp-atlas-layers` row is hidden (`hidden = true`). Atlas does not report its layer in
`lunalens:atlas-state`, so the parent currently cannot know when a user changes the
layer inside Atlas.

The Atlas time bar stays visible, including its play controls and date editor. The parent
sends `tMs` on its own time changes and Atlas posts `tMs` back after its own changes.
Time changes must not trigger a camera fly-in.

## Camera animation rule

- Fly in **once** when the Map stage enters Atlas.
- Never fly in on a time change or a layer change.
- Never replay the fly-in on ordinary `lunalens:atlas-command` updates.

Atlas's `goTo` increments `view.seq`, and `Rig` animates whenever that sequence
changes. Therefore any repeated `focus` command restarts the flight.

Two mechanisms can produce the entry flight:

1. A fresh iframe load restores the `s`/`t` hash and calls `goTo` once.
2. The one-shot `focus` command replays the flight when the iframe is already loaded
   (for example, re-entering Atlas with the same point).

The parent must not send `focus` after a reload that already restored the hash, or the
camera will fly twice. Send it only on the entry path where the frame was not
reloaded. The parent sends this one-shot focus command only on Map→Atlas entry.

## Build and deploy

Edit the vendored source, not the generated bundle:

```sh
# edit site/atlas/source/web/src/...
site/tools/build_atlas.sh
git add site/atlas/source site/atlas/index.html site/atlas/assets \
  site/atlas/welcome site/atlas/draco site/atlas/favicon.svg site/atlas/icons.svg
```

`site/tools/build_atlas.sh` copies `site/atlas/source/web` to a temporary directory,
links `public/data` to `site/atlas/data`, runs `npm ci` and `npm run build`, then copies
the result back to `site/atlas`.

Commit both the source change and the regenerated output. The
`.github/workflows/atlas-build.yml` check rebuilds Atlas and fails if
`git status --porcelain --untracked-files=all -- site/atlas` is non-empty.

`site/atlas/bridge.patch` is a reference diff of the LunaLens bridge, not an input to
the build. Keep it in sync when the bridge changes.

## Coordinates

- Decimal degrees.
- Latitude in `[-90, 90]`.
- Longitude in `[-180, 180]`, **east-positive**.
- The parent normalizes longitude into `[-180, 180]` before writing the hash.
- Atlas's hash reader rejects out-of-range values. The `postMessage` handler only
  checks that `lat`/`lon` are finite, so the parent must validate ranges before
  sending.

## Known contract gaps

- Atlas still accepts up to three sites internally, although the embed contract sends one.
- `lunalens:atlas-state` has no `layer` field, so Atlas layer changes do not reach the
  parent.
- `site/atlas/bridge.patch` is a historical reference and is not kept in sync.
