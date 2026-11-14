# Luna Lens

A tool for comparing lunar landing sites and dates: where the Sun and Earth sit above the real terrain horizon,
how long until they set, and whether a site and date give enough power and a direct link to Earth.

Built for the NASA Space Apps Challenge 2026, *Lunar Landing Site Navigator*:
https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator

## Status

Planning is done; the product code is not written yet. What exists today:

| Part | State |
|---|---|
| Plans and rules (`doc/`, `AGENTS.md`, `CONTRIBUTING.md`) | Ready |
| Layout prototype (`prototype/`) | Runs locally, see below. Fake numbers, real maps |
| Backend (`backend/`) | Not started. Skeleton owner: Chenlin |
| Frontend (`web/`) | Not started. Skeleton owner: Eya |

## Get the code

You need Git and SSH access to this private repository (ask Bing to add you as a collaborator).

```
git clone git@github.com:binggao1230/LunaLens.git
cd LunaLens
```

## Run the site

`site/` is the product. There is no build step and nothing to install beyond Python 3 — but it needs its data
folder, 34 MB that is kept out of git.

**1. Get the data** (once, and again whenever the snapshot release changes):

```sh
gh release download lunalens-snapshot-2026-11-14 --pattern '*'   # or download it from the Releases page
python3 restore-lunalens.py                                      # checks every part, unpacks lunalens/
cp -a lunalens/site/data ./site/data
```

**2. Serve it:**

```sh
python3 site/tools/serve.py 8768
```

**3. Open it.** On this machine, http://localhost:8768/. From a phone or another computer, use the same machine's
own address instead of `localhost` — `ipconfig getifaddr en0` on macOS, `hostname -I` on Linux, or the address shown
by your network settings. The server listens on `0.0.0.0`, so both work.

Explore (map, tiles, horizon panorama, 3D view), Compare, Date slip and Data are the four views; the bar along the
bottom is the time control. Controls with a dashed border are not built yet and say so on hover or tap.

`prototype/` is the older fake-data layout. It is kept as a reference and is not published.

## Online version

https://luna-lens.gaobing1230.workers.dev

This serves `site/`, the same build as the local one, behind an email check (Cloudflare Access): enter your email,
a one-time code, and you are in for a week. Every address is accepted while the team is still being onboarded; the
policy narrows to team addresses later, and the check comes off before submission.

The code comes from `noreply@notify.cloudflare.com`. Cloudflare says "a code has been emailed" even when it sends
nothing: an address outside the app's policy, or a repeat request within a few minutes, is dropped silently. If no
code arrives after one try, check the spam folder, wait five minutes, and request one more.

Publishing is automatic: every push to `main` deploys through `.github/workflows/deploy.yml` (Wrangler, using the
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets). The workflow can also be run by hand from
the Actions tab. To deploy from a machine instead, from the repository root:

```
npx wrangler deploy
```

What gets published is set in `wrangler.jsonc` (`site/`). Its 34 MB `data/` folder is not in git, so the workflow
downloads the released snapshot and unpacks it into `site/data/` before deploying; the same two commands in the
section above do that by hand. Background: `doc/PLAN.md` §2.5.

## Find your work

1. `doc/PRODUCT.md` and `doc/PLAN.md` say what we build and how; `doc/WORKPLAN.md` holds the interfaces.
2. Read `CONTRIBUTING.md` once: branches and pull requests.
3. Take items from the plan or from the person you work with. The per-person folders in `archive/team/` are retired.

If you work with an AI agent, point it at `AGENTS.md` too.

## Contribute

Nobody commits to `main` directly.

```
git switch main && git pull
git switch -c <your-name>/<short-topic>
# ... work, then update your TODO.md ...
git push -u origin <your-name>/<short-topic>
```

Then open a pull request on GitHub. If it only touches your own paths, merge it yourself once checks pass.
Full rules: `CONTRIBUTING.md`.

## Run the backend and the frontend

Not available yet. These sections are filled in by their owners when the skeletons merge, and must then contain
commands that work from a fresh clone:

- **Backend** (Python, FastAPI) — install, download data, run the server, run tests. Owner: Chenlin.
- **Frontend** (Vite, React, TypeScript) — install, run the dev server, build. Owner: Eya.
- **Data** (Moon elevation files and ephemeris kernels, about 0.5 GB, not stored in Git) — download script. Owner: Maeva.

Two rules already apply to both: servers bind `0.0.0.0` so teammates on the same network can open them, and the
demo must run without live calls to third-party services.

## Repository map

```
README.md          this file
AGENTS.md          rules for everyone and every AI agent
CONTRIBUTING.md    branches, pull requests, who merges
doc/               PRODUCT.md (what we build) · PLAN.md (approach, roadmap, resources)
                   WORKPLAN.md (layout, code structure, interfaces, roles) · challenge text
archive/team/      retired per-person plans, history only
prototype/         throwaway layout prototype; never import from it
backend/  web/     product code, to come
```

## Conventions in one place

English only in the repository. Longitude east-positive 0–360, south latitude negative, angles in degrees,
azimuth clockwise from north, times in UTC. Details: `AGENTS.md`.
