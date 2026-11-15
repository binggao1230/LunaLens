# Contributing to Luna Lens

For every team member and every AI agent working for one. Short on purpose; the event is 48 hours.

Repository: `git@github.com:binggao1230/LunaLens.git`

## First time

```
git clone git@github.com:binggao1230/LunaLens.git
cd LunaLens
```

Then read `AGENTS.md` and `TODO.md`.

## Every piece of work

1. **Start from fresh `main`.**
   ```
   git switch main && git pull
   git switch -c <name>/<short-topic>        # e.g. maeva/horizon-mask, eya/timeline-dock
   ```
2. **Work on one `TODO.md` item at a time.** If someone else is already changing the same files, ask
   them first, or open a separate pull request and request their review.
3. **Keep it small.** One `TODO.md` item, or one part of it, per pull request. Aim for a pull request every few hours,
   not one at the end.
4. **Check before you push.** Run what exists for your area (`pytest backend/tests`, `npm run build` in `web/`).
   For anything touching projection, coordinate frames or units, include a check a human can verify by eye.
5. **Say what you did in the pull request description**: what changed, why, how you checked it, and anything that
   blocks you.
6. **Push and open a pull request.**
   ```
   git push -u origin <name>/<short-topic>
   gh pr create --fill          # or use the GitHub website
   ```
   Title: what changed, in plain words. Description: what, why, how you checked it.

## Pull requests

A pull request is how the rest of the team hears about a change.

**`main` needs one approving review.** Review requests are not auto-assigned to every member; ask a
lead in the pull request thread. The repository owner can still force a merge with
`gh pr merge <n> --merge --admin`. Approvals are dismissed when new commits are pushed, so approve last.

A change to files someone else is working in waits for their word in the thread.

If `main` moved while you worked: `git fetch && git rebase origin/main`, fix conflicts in your own files, and ask
the other person about conflicts in theirs. Never force-push `main`.

## Rules that do not bend

- English only in the repository: code, comments, commit messages, pull requests, documents.
- No secrets, no `.env`, no large data files (`data/` is ignored; data is fetched by scripts).
- After the feature freeze at hour 36: bug fixes only.
- If something is wrong but raises no error (a number that looks off, a map that looks mirrored), stop and say so
  in the pull request description and tell Bing. Do not paper over it.

## For AI agents

- You work for one person. Do not edit files someone else is working in.
- Take the next item from `TODO.md` or from your person, unless told otherwise. Report what you did in the pull request.
- Do not invent coordinates, constants, URLs or citations. Mark anything unverified as "unverified".
- Do not push to `main`, do not force-push, and do not merge: open the pull request and stop there.
- Do not add `Co-Authored-By` lines or "generated with" footers naming an AI tool to commits or pull requests.
- When you cannot proceed, write the reason under "Blocked / questions" and tell your person; do not guess.
