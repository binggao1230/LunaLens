# Luna Lens site on the real engine

The prototype's layout (Explore, Compare, Date slip, Data) driven by real data instead of synthetic data:
JPL Horizons Sun and Earth positions for 2026-2030 and LRO LOLA terrain horizons, computed in the browser,
plus a 3D terrain and time view. English, French and Chinese (selector in the top bar, or `?lang=fr` / `?lang=zh`; default English).

## Data

`data/` is not in git (see `.gitignore`). It holds `ephemeris.*`, `sites.json`, `dem240.*`, `dem480.*`,
`polar-hillshade.*`. Take it from the `data/` folder of the snapshot on the `lunalens-snapshot-2026-11-14`
release (`archive/team/chenlin/WEBSITE.md` explains how to download it) and place it here as `site/data/`.

## Open it

```sh
python3 tools/serve.py 8768
```

Then open <http://127.0.0.1:8768/>. Opening `index.html` as a file does not work (module loading is blocked on `file://`).

## Design tokens and UI kit

Fonts, colours and shapes are defined once in `css/tokens.css`. `ui-kit.html` (open it from the same server) shows
every token and component live, in Expert and Education mode, and says how to use them.

## Checks

```sh
node tools/check_js.mjs      # browser engine vs. Python reference (needs python3 with numpy)
node tools/check_team.mjs    # browser rules vs. backend/lunalens/windows on the same real inputs (uses ../backend/.venv)
```

## Not done

See the root `TODO.md`.

