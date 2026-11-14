# TODO — what the 14 November call and the Figma file ask for

Sources: the design-review call (`chat.txt`, 14 Nov) and the Figma file *NASA SpaceApps*
(`pj5bENLGkYn0XeqofTY4YW`). Everything below is about `site/`, the only build; `prototype/` was deleted on 14 November.

## What the call decided

- The job is **re-planning**: a site and date were chosen, the mission slipped, and the user must see at a glance
  whether the new site or date is the same, better or worse.
- Two quantities decide that: **sunlight** (power) and the **direct-to-Earth link** (communication). Everything
  else is explanation.
- Comparison has to be **visual first, numbers second**: colour and a percentage on the map, the table behind a
  click. "Traffic lights", a chosen site turning green when its windows overlap.
- One lunar day is two Earth weeks: the moment the Sun sets, there is no power for half a month. Sunsets and
  Earthsets are countdowns, not timestamps.
- Layout follows the house-hunting pattern: map on one side, the list of sites on the other, one active site.
- People: a mission planner (primary), the general public and educators, plus the science/engineering teams.
  Modes and a language switch exist to serve both ends.

## P0 — the demo does not work without these

1. **One feasibility number per site and date, with traffic-light colour.** Compute it from the sunlight and
   Earth-link windows already in `site/js/engine/metrics.js`, show it as colour plus percentage on the map markers
   and in the site list, and put the inputs behind a click. Nothing in the site does this today.
2. **Compare two scenarios on purpose.** Today `Compare` lists every curated site on one date. The call wants:
   pick two (or more) sites or dates → **Compare** → a summary table plus one graphic that shows the windows
   overlapping, and a sentence saying "these overlap, so this is a workable window" or that they do not.
3. **Countdown to sunset and to Earthset, with the consequence.** The tiles show "Sunset in 8 d 5 h"; add what
   happens next (no power until the next lunar day) so the number reads as a deadline.
4. **Map and list point at each other.** Clicking a row highlights that marker and opens a small panel with the
   site's numbers; the map click selects the same row. Today the tiles change but nothing connects the two.
5. **3D Moon with the site coloured by its window.** The 3D view is the local terrain; the Figma and the call both
   ask for the whole Moon, with the chosen site green while the Sun and Earth windows overlap.

## P1 — worth having in the demo if the clock allows

6. **Education mode / Expert mode.** Same data, different wording: plain sentences in one, units and margins in the
   other (Figma has the toggle). Keep the choice in the URL.
7. **Adopt the Figma's look.** Catamaran for type; `#5bcd38` green, `#ea9c43` orange, `#fade52` yellow, greys
   `#d9d9d9` / `#f2f2f2`; radii 50 and 500 for pills. Replaces the ad-hoc colours in `site/index.html`.
8. **Send probe.** A 10→1 countdown and a probe travelling to the Moon, as the Figma notes sketch it. Only if it
   does not delay the numbers.
9. **Finish or drop the placeholders** in Compare: `+ Add scenario`, `Duplicate with another date`, `Duplicate
   with another site`, `Remove`.
10. **Map overlays** (sunlit share, Earth-link share) are dashed placeholders. Either compute precomputed overlays
    or take them out of the demo path.

## P2 — after submission

11. Cross-check our illumination against NASA's PGDA map, one row per curated site (the Data view promises it).
12. Expose the mast height; it is fixed at 2 m today.
13. Test on a real phone; only a headless 390 px run exists.
14. Typo pass on the Figma: *Crête de Noble*, *Solar disk*, `88.89°S` (`88.89°5` today).

## Settled on 14 November

- The unused planning tables (`renderBuild` and its data) are gone from `site/js/app.js`.
- `prototype/` is deleted; `site/` is the only build, online and local.
- The language rule now matches reality: documents and code in English, interface copy may be multilingual
  (`AGENTS.md` § Language).

## Open questions for the team

- **What decides "better"?** Average sunlight over the stay, uninterrupted hours, minutes of Earth link — or a
  weighted score? Pick one, show its parts, and never show the score without them.
- **Two scenarios or many?** The call said do not limit the count; the Figma shows two. Two is enough for the demo
  if the count does not slow the build.
- **Is the 3D Moon required for the pitch?** If WebGL cost or time makes it risky, the 3D terrain view plus a
  coloured 2D Moon may carry the same message.
