# Contributing to Luna Lens

For every team member and every AI agent working for one. Short on purpose; the event is 48 hours.

Repository: `git@github.com:binggao1230/LunaLens.git`

## First time

```
git clone git@github.com:binggao1230/LunaLens.git
cd LunaLens
```

Then read, in this order: `AGENTS.md`, your `team/<name>/README.md`, your `team/<name>/TODO.md`.

## Every piece of work

1. **Start from fresh `main`.**
   ```
   git switch main && git pull
   git switch -c <name>/<short-topic>        # e.g. maeva/horizon-mask, eya/timeline-dock
   ```
2. **Work only inside the paths your README lists as yours.** If you need a change somewhere else, ask that
   owner, or open a separate pull request and request their review.
3. **Keep it small.** One TODO item, or one part of it, per pull request. Aim for a pull request every few hours,
   not one at the end.
4. **Check before you push.** Run what exists for your area (`pytest backend/tests`, `npm run build` in `web/`).
   For anything touching projection, coordinate frames or units, include a check a human can verify by eye.
5. **Update your `TODO.md` in the same branch**: tick what is done, add a line to the progress log, write down
   anything that blocks you.
6. **Push and open a pull request.**
   ```
   git push -u origin <name>/<short-topic>
   gh pr create --fill          # or use the GitHub website
   ```
   Title: what changed, in plain words. Description: what, why, how you checked it, which TODO item it closes.

## Who merges

| The pull request touches | Needs |
|---|---|
| Only your own paths | Checks pass → merge it yourself (squash merge). Do not wait |
| Someone else's paths | That owner's approval |
| The API contract (`backend/lunalens/api/schemas.py`, `web/src/api/mock/`) or `doc/` | Approval from Bing, and a message to both frontend developers |

After merging, delete the branch. If `main` moved while you worked: `git fetch && git rebase origin/main`, fix
conflicts in your own files, and ask the other owner about conflicts in theirs. Never force-push `main`.

## Rules that do not bend

- English only in the repository: code, comments, commit messages, pull requests, documents.
- No secrets, no `.env`, no large data files (`data/` is ignored; data is fetched by scripts).
- After the feature freeze at hour 36: bug fixes only.
- If something is wrong but raises no error (a number that looks off, a map that looks mirrored), stop and say so
  in your TODO under "Blocked / questions" and tell Bing. Do not paper over it.

## For AI agents

- You work for one person. Their folder is `team/<name>/`. Do not edit another person's folder or paths.
- Do the next unticked item in `TODO.md` unless told otherwise. When an item is done, tick it and log it.
- Do not invent coordinates, constants, URLs or citations. Mark anything unverified as "unverified".
- Do not push to `main`, do not force-push, do not merge pull requests that need someone else's approval.
- Do not add `Co-Authored-By` lines or "generated with" footers naming an AI tool to commits or pull requests.
- When you cannot proceed, write the reason under "Blocked / questions" and tell your person; do not guess.
