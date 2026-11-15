# Atlas upstream

`site/atlas` is a build of the open-source [Lunar Landing Site Navigator](https://github.com/daniel27-space/lunar-navigator)
(Apache-2.0), commit `3866a6f2ef2c6009489b5b94bd927ecbcddb8276`.

LunaLens keeps the upstream app and adds a small workspace bridge: Atlas posts its pinned
sites, active point and time as `lunalens:atlas-state` and accepts a `lunalens:atlas-command`
from the parent. The A/B/C colours and playback rates also follow the Map. The exact source
diff is in `bridge.patch`. This lets the Map stage own the same A/B/C slots instead of scraping the rendered panel.

The upstream web source, already carrying the bridge, is vendored in `source/web`; the original
README is `source/README.upstream.md`. Build with `site/tools/build_atlas.sh`. It copies that
source to a temporary directory, links `public/data` to this directory's `data/`, runs `npm ci`
and `npm run build`, and copies the result here. No clone or network fetch is needed beyond npm
dependencies.

`data/` is kept from the LunaLens snapshot release and is not part of this source tree.
