# OMP execution handoff

Use one OMP writer and one feature branch. [TODO.md](TODO.md) is the task list and
checkpoint log. This handoff describes how to run it; it is not a second backlog.

## Start or attach

Open the repository checkout that contains this handoff and the current TODO.
Check that no other agent is writing to it. For a new run, branch from the
current plan checkout rather than an older `main`:

```sh
git status --short --branch
git switch -c bing/omp-touchdown-windows
tmux new-session -s lunalens-omp 'caffeinate -i omp'
```

Run the branch creation once; if it already exists, verify its base and use it
rather than overwriting it. If the named tmux session exists, attach to it
instead of starting a second OMP process:

```sh
tmux attach-session -t lunalens-omp
```

`tmux` keeps the terminal session open when the client detaches.
`caffeinate -i` inhibits idle system sleep while OMP runs on macOS. Neither
prevents process exit, network problems, provider quota exhaustion or reboot.

## Paste into a new OMP session

Run `/session info` to get the session UUID and working directory. Record both
with the UTC start time in the [execution log](TODO.md#execution-log). Use goal mode with interactive
continuation enabled. Exit plan mode and leave no unsent draft in the input.
Paste this single line in OMP:

```text
/goal set Use OMP.md as the handoff and TODO.md as the only construction plan. Read AGENTS.md first, then TODO.md and the matching criteria in doc/Background.md. Use doc/Resources.md and the native snapshot metadata to verify data sources. Execute W0 through W6 for user-selected lunar touchdown times and date ranges. Continue to the next unblocked slice after each verified checkpoint without waiting for routine approval. Record evidence and the exact next action in TODO.md. At the ten-hour checkpoint leave a tested, recoverable state with incomplete items open. Keep M1–M5 separate. Do not push, deploy, or submit.
```

Use `/goal show` to confirm the goal was set. OMP 17.3.5's defaults enable
`goal.enabled` and include `interactive` in `goal.continuationModes`; a local
profile can override them. Do not use `/loop` with the goal: loop mode suppresses
goal continuation. The goal's token budget is not a wall-clock timer.

### Standing instructions for the executor

- Follow project conventions in [AGENTS.md](AGENTS.md) and
  [CONTRIBUTING.md](CONTRIBUTING.md). Implement the next unblocked slice in TODO,
  run its acceptance checks and record the evidence before checking it off.
  Keep the three modes of comparison and arbitrary supported UTC dates; example
  dates are regression fixtures.
- Keep Mission, Atlas, Explore, Data and Education behavior outside the current
  slice intact. Compare, Date slip and Plan remain retired. Read the
  [Atlas integration note](doc/PORT_PLAN.md) only when changing Atlas or the new
  map prototype. [SUBMISSION.md](doc/SUBMISSION.md) is release material, not an
  instruction to publish or a list of implemented features.
- Keep one local writer. After each verified slice, or every 45–60 minutes if a
  slice is still open, put the UTC time, branch/SHA, command results, blocker
  and next exact action in the TODO execution log. Make a local checkpoint commit
  for a finished slice. Do not mark a failing or unverified check complete.
- After two failed attempts at the same blocker, record both and continue with
  independent work. If none remains, report the dependency needed to proceed.
  Check elapsed time at each checkpoint. Stop opening new slices at the ten-hour
  mark and leave a safe resume point.
  A time limit or empty token budget does not make the goal complete.
- W0–W6 is the default goal. Start the Mission/Atlas workstream (M1–M5) as a
  separate goal after the core handoff if asked. Do not extend the time box
  silently. Do not push, merge into main, deploy or submit during this run.

## Recover a stopped run

Check the timestamp and next action in the TODO log. A periodic read-only
health check can flag a stale checkpoint; it must not start a second writer or
restart a healthy process. If the terminal client disconnected but the tmux
session is still running, reattach. If the process exited, resume from the
same checkout using the UUID recorded at the start:

```sh
caffeinate -i omp --resume '<session-uuid>'
```

If you also need a new persistent terminal, create or attach to tmux first
and run the resume command inside it. Use `/goal show` and, if the active goal
is paused, `/goal resume`. Compare the working tree against the last verified
checkpoint before continuing. Do not start a fresh goal over unknown edits.
Do not run `/todo export` over this repository's TODO file.

A recorded OMP session is a conversation and tool transcript. If a continuous
screen recording is needed, start a separate local recorder.
