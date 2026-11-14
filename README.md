# Luna Lens

A tool for comparing lunar landing sites and dates: where the Sun and Earth sit above the real terrain horizon,
how long until they set, and whether a site and date give enough power and a direct link to Earth.

Built for the NASA Space Apps Challenge 2026, *Lunar Landing Site Navigator*:
https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator

## Status

Planning is done; the product code is not written yet. What exists today:

| Part | State |
|---|---|
| Plans and rules (`doc/`, `AGENTS.md`, `CONTRIBUTING.md`, `team/`) | Ready |
| Layout prototype (`prototype/`) | Runs locally, see below. Fake numbers, real maps |
| Backend (`backend/`) | Not started. Skeleton owner: Chenlin |
| Frontend (`web/`) | Not started. Skeleton owner: Eya |

## Get the code

You need Git and SSH access to this private repository (ask Bing to add you as a collaborator).

```
git clone git@github.com:binggao1230/LunaLens.git
cd LunaLens
```

## Run the layout prototype

The prototype is one static page. It needs Python 3 and nothing else: no install step, no build.

```
python3 -m http.server 8765 --bind 0.0.0.0 --directory prototype
```

On Windows use `python` instead of `python3`. Then open:

- on the same computer: http://localhost:8765/
- on a phone or another computer on the same network: `http://<your-computer's-IP>:8765/`

Stop it with `Ctrl+C`. If port 8765 is taken, pick another number in both places.

What to look at:

- **Explore, Compare, Date slip** (top bar; bottom tabs on a phone) are the three views of the product.
- The **timeline at the bottom** is the time control: drag it, or press Play.
- Controls with a **dashed border** are not built. Hover or tap them to read what they will do.
- Each block has a small label saying **who builds it**.
- **Build map** (top right) shows who does what and when. It is a planning page and will be removed before the demo.

## Online version

https://luna-lens.gaobing1230.workers.dev

Today this serves the layout prototype. It is behind an email check (Cloudflare Access): enter your email, receive
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

What gets published is set in `wrangler.jsonc` (the `prototype/` folder for now). Background: `doc/PLAN.md` §2.5.

## Find your work

1. Open `team/<your-name>/README.md`: what you own, what you give to and need from others, how to work.
2. Open `team/<your-name>/TODO.md`: your tasks. Tick them as you go; this is how the team sees progress.
3. Read `CONTRIBUTING.md` once: branches and pull requests.

If you work with an AI agent, point it at the same three files plus `AGENTS.md`.

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
team/<name>/       README.md (briefing) + TODO.md (tasks and progress), one folder per person
prototype/         throwaway layout prototype; never import from it
backend/  web/     product code, to come
```

## Conventions in one place

English only in the repository. Longitude east-positive 0–360, south latitude negative, angles in degrees,
azimuth clockwise from north, times in UTC. Details: `AGENTS.md`.
