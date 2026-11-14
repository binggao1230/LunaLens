# Team folders

One folder per person. Each holds two files:

- `README.md` — what this person owns, which paths they may edit, what they give to and need from others, and how
  to work. Written so it can be handed to an AI agent as its briefing.
- `TODO.md` — their tasks as checkboxes, plus blocked items and a progress log. Kept current by its owner.

| Folder | Person | Role |
|---|---|---|
| `bing/` | Bing Gao | Lead + Sun/Earth positions |
| `zeynep/` | Zeynep Uzan | Design |
| `maeva/` | Maeva Andriamaniraka | Terrain |
| `chenlin/` | Chenlin Wang | Windows + API |
| `eya/` | Eya Amrach | Frontend: Explore |
| `assem/` | Assem Hssini | Frontend: map + compare |

Progress at a glance, from the repository root:

```
grep -c "\[x\]" team/*/TODO.md      # done items per person
grep -c "\[ \]" team/*/TODO.md      # open items per person
grep -A3 "^## Blocked" team/*/TODO.md
```

The plan behind these folders is `doc/WORKPLAN.md`. Contribution rules are in `CONTRIBUTING.md`.
