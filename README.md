# Luna Lens

A browser tool for inspecting lunar landing sites, with a south-pole focus. It shows the Sun
and Earth relative to the local skyline and estimates sunlight and direct-to-Earth visibility
windows. These are geometric estimates; the tool does not calculate power output or radio performance.

Built for the NASA Space Apps Challenge 2026, *Lunar Landing Site Navigator*:
https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator

## Status

`site/` is the product: a static site with real Sun and Earth positions (JPL Horizons, 2026–2030) and real
terrain horizons (LRO LOLA), computed in the browser. It runs locally and online. What is left is in `TODO.md`.

## Get the code

You need Git and SSH access to this private repository (ask Bing to add you as a collaborator).

```
git clone git@github.com:binggao1230/LunaLens.git
cd LunaLens
```

## Run the site

`site/` is the product. There is no build step. Python 3 can serve it locally once the native
snapshot is in `site/data/`, which is kept out of Git.

**1. Restore the data if it is missing.** Skip this when the expected snapshot is already present.

```sh
lunalens_snapshot_dir="$(mktemp -d)"
gh release download lunalens-snapshot-2026-11-14 \
  --pattern 'lunalens.zip.part*' --pattern 'restore-lunalens.py' --pattern 'lunalens-files.json' \
  --dir "$lunalens_snapshot_dir"
python3 "$lunalens_snapshot_dir/restore-lunalens.py"
mkdir -p site/data
cp -a "$lunalens_snapshot_dir/lunalens/site/data/." site/data/
```

**2. Serve it:**

```sh
python3 site/tools/serve.py 8768
```

**3. Open it.** On this machine, http://localhost:8768/. From a phone or another computer, use the same machine's
own address instead of `localhost` — `ipconfig getifaddr en0` on macOS, `hostname -I` on Linux, or the address shown
by your network settings. The server listens on `0.0.0.0`, so both work.

In this checkout, Mission provides 3D and an optional Education story, Explore provides native point
and time inspection plus the Expert touchdown search, Atlas is a separate regional map, and Data
explains sources and accuracy. Standalone Compare and Date slip are retired; their old links go to
Explore. The period search is implemented in `site/js/engine/search.js`; the combined South Pole tab
is still planned in TODO. The public release can lag a local branch.

Inside Explore, `Find touchdown windows` takes an exact UTC hour, a day, a half-year, a year, or a
custom range, ranks terrain-backed sites under one set of conditions, and lets two pinned windows be
compared in place. Every result carries its coverage and the reason it qualified; smooth-sphere
references are listed separately and never ranked. Stay length, Earth margin, continuous-sun hours and
the touchdown Earth requirement are editable screening assumptions, not mission requirements.

## Checks

```sh
node site/tools/check_search.mjs        # search rules, H1 2030 fixture, cross-year fixture, runtime
node site/tools/check_js.mjs            # browser engine vs the Python reference (needs NumPy)
node site/tools/check_team.mjs          # browser windows vs backend/lunalens/windows
python3 site/tools/check_ephemeris_svs.py
```

`check_js.mjs` and `check_team.mjs` read a Python interpreter from `PATH` (or the backend venv argument
for the second). Records for the current run are in `TODO.md` under `Run log`.

## Online version

https://luna-lens.gaobing1230.workers.dev

This URL serves the deployed `site/`. Verify anonymous access before sharing a release with
judges: `node site/tools/preflight.mjs` checks the public entry and submission draft without deploying.

Publishing is automatic: every push to `main` deploys through `.github/workflows/deploy.yml` (Wrangler, using the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets). The workflow can also be run by hand from
the Actions tab. To deploy from a machine instead, from the repository root:

```
npx wrangler deploy
```

What gets published is set in `wrangler.jsonc` (`site/`). The workflow downloads
the released snapshot and unpacks it into `site/data/` before deploying.

## Find your work

| File | Use it for |
|---|---|
| [AGENTS.md](AGENTS.md) and [CONTRIBUTING.md](CONTRIBUTING.md) | Project rules, validation and Git workflow |
| [TODO.md](TODO.md) | The construction map, task order, acceptance checks and execution log |
| [Background.md](doc/Background.md) | Official challenge plus LunaLens annotations, criteria and scorecard |
| [Resources.md](doc/Resources.md) | Official data and reference links; the native snapshot also carries metadata under `site/data/` |
| [OMP.md](OMP.md) | Copyable OMP goal, checkpoint policy and session recovery |
| [PORT_PLAN.md](doc/PORT_PLAN.md) | Current Atlas integration, its limits and pending release decision |
| [SUBMISSION.md](doc/SUBMISSION.md) | Draft release description and demo checks |

Use the TODO for implementation decisions and proof of completion. Archived plans and the
submission draft do not define the next task.

## Contribute

Nobody commits to `main` directly.

```
git switch main && git pull
git switch -c <your-name>/<short-topic>
# ... work ...
git push -u origin <your-name>/<short-topic>
```

Then follow [CONTRIBUTING.md](CONTRIBUTING.md) for the pull request and review.

## Repository map

```
README.md          this file
AGENTS.md          rules for everyone and every AI agent
CONTRIBUTING.md    branches, pull requests, who merges
TODO.md            what is left to do
OMP.md             executor setup and recovery
doc/               challenge text, Atlas integration note and submission draft
site/              the product; site/data/ is not in git
backend/           Python reference for the window rules, used by the site's checks
archive/           retired plans, history only
```

## Conventions in one place

English only in the repository. Longitude east-positive 0–360, south latitude negative, angles in degrees,
azimuth clockwise from north, times in UTC. Details: `AGENTS.md`.

## LunaLens Mobile App
LunaLens Mobile Repo : https://github.com/Dev-code3D/LunaLens-Mobile
