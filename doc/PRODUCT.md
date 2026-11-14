# Luna Lens — Product Plan (v0.1)

> What the product must do to answer the challenge. `PLAN.md` covers how and when we build it; this file
> decides **what** we build. Where the two disagree on features or tiers, this file wins and `PLAN.md` gets fixed.
> Challenge text: `Background.md`. Last updated: 2026-11-14.

Tags follow `PLAN.md`: `[VERIFIED]` · `[KNOWN]` · `[COMPUTED]` · `[INFERRED]` · `[GUESS]`, with HIGH / MED / LOW confidence.

---

## 1. What the challenge asks for

The challenge statement, reduced to its verbs: build an **intuitive** tool that lets users **compare landing
sites and dates quickly**, **visualising Sun and Earth positions relative to the horizon**, in order to **assess
power generation potential and direct-to-Earth communication windows**.

Read strictly, the text contains one firm instruction and six suggestions:

| Objective in the challenge | Wording | Our reading |
|---|---|---|
| Sun and Earth position visualisation | "Display the positions…" | **Required.** The only objective not phrased as "you may consider" |
| Interactive site selection and comparison | "may consider" | Required in practice: "compare landing sites" is in the headline statement |
| Date and time flexibility | "may consider" | Required in practice: "compare … dates" is in the headline statement |
| Power and communication assessment | "may consider" | Required in practice: it is the stated purpose of the tool |
| Multiple visualisation approaches (2D maps, 3D surface) | "may explore" | Optional, but a tool about *landing sites* with no map does not read as complete |
| Temporal dynamics (animation, timeline) | "may consider" | Optional; cheap once the data exists |
| Accessibility across skill levels | "could serve" | Optional; decides how the product is worded, not what it computes |

The background section adds the scenario that should drive the design: a mission's date or site is forced to
change, and the planner needs to see **quickly** what the change costs. A product that shows one site on one date
well, but makes comparison slow, misses the point of the challenge.

The first prototype had charts and no map. That was a gap against the table above, and it is why maps are now an
explicit feature (F1, F8) rather than an afterthought.

---

## 2. Users and the jobs they bring

| User | Job | What "done" looks like for them |
|---|---|---|
| Mission planner | "The launch slipped 9 days. Is my site still viable, and if not, which alternative is?" | A ranked answer in under a minute, with the numbers behind it |
| Science + engineering leads | "Site A has the science, site B has the power. What exactly do we trade?" | Two or more scenarios side by side on the same axes |
| Educator / student / public | "Why is the south pole so hard to land at?" | One view that makes the low Sun and the disappearing Earth obvious without jargon |

The planner is the primary user. When a design choice helps the planner and hurts the public view, the planner wins.

---

## 3. Core concept

The unit of the product is a **scenario**: one site + one landing date (+ mast height).
Everything the user sees is either one scenario in detail or several scenarios compared.

For every scenario the product answers five questions, in this order:

1. Where are the Sun and Earth right now, relative to the **terrain** horizon?
2. Is there power? Is there a direct link to Earth?
3. How long until that changes (sunset, Earthset, or the next rise)?
4. Over the whole surface stay, how much sunlight and link time is there, and in what pattern?
5. How does that compare with the other scenarios on the table?

---

## 4. Features

Tiers: **Must** = without it the entry does not answer the challenge. **Should** = what makes it competitive.
**Could** = only if everything above is solid. Each feature has an acceptance check that a teammate can run.

### F1. Site selection — Must

- A curated library of 10–15 sites in four groups: Apollo (historic), CLPS / commercial, other nations, Artemis
  south-pole candidates. Every entry carries a cited source for its coordinates.
- Pick a site from a list **and** from a map (see F8).
- Enter custom latitude / longitude, or tap any point on the map.
- Accept: a new user can select Shackleton ridge, then a custom point 20 km away, without typing more than two numbers.

### F2. Date and time — Must

- Landing date and time in UTC.
- A time scrubber covering at least one lunar day (29.53 Earth days `[KNOWN, HIGH]`) from landing, with play / pause.
- Jump controls: next sunset, next sunrise, next Earthset, next Earthrise.
- Accept: from any state, the user reaches "the moment the Sun sets" in one action.

### F3. Sun and Earth relative to the horizon — Must (the one firm requirement)

- A horizon panorama: all compass directions on the horizontal axis, elevation on the vertical axis, with the
  terrain silhouette, the no-terrain horizon for reference, the current Sun and Earth positions, and their tracks
  over the surface stay.
- The Sun is drawn and computed as a disk, not a point. Near the pole it spends long periods partly hidden.
- Numeric readout of azimuth and elevation for both bodies, and elevation above the local terrain.
- Accept: at a south-pole site the user can see, without reading numbers, that the Sun skims the horizon and
  that Earth rises and sets; at Apollo 11 they can see that neither is true.

### F4. Power and communication assessment — Must

- Now: solar elevation, visible fraction of the solar disk, link available / blocked.
- Countdowns: time to sunset or sunrise; time to Earthset or link return.
- Over the stay: sunlit share, longest continuous sunlit period, longest darkness, link share, longest link gap.
- Link rule is explicit and adjustable: Earth must clear the terrain by a margin (default 2°, a placeholder `[GUESS]`).
- Mast height input (Should): raising the antenna or array changes the horizon.
- The product reports geometry. It does **not** output watts or data rates; those depend on hardware we do not know.
- Accept: each headline number can be traced to something visible on the panorama or the timeline.

### F5. Timeline — Must

- Two aligned strips over the stay: sunlight (with partial-disk periods distinguishable) and Earth link.
- The scrubber, the panorama, and the map lighting move together.
- Accept: the user can read "how many separate dark periods, and how long is the worst one" at a glance.

### F6. Scenario comparison — Must

- Hold 2–4 scenarios side by side. A scenario may differ by site, by date, or by both.
- Same time axis and same metrics for all of them, so differences are read by eye.
- One-tap "duplicate this scenario and change the date" and "… change the site".
- Accept: comparing the same site on two dates takes no more steps than comparing two sites on one date.

### F7. Date-slip view — Should (our main differentiator)

- For a chosen site, show how the key metrics change as the landing date slips day by day across at least one
  lunar month: sunlight available from touchdown, link share, and whether touchdown itself is in sunlight.
- Mark the viable landing windows against user-set thresholds (for example "at least 5 days of continuous sunlight").
- Accept: the planner in §2 can answer "if we slip 9 days, do we still land in sunlight, and how much do we lose?"
  from a single chart.

### F8. Maps and spatial views — Must (2D), Could (3D)

- **South-pole 2D map** (Must): real LOLA terrain in polar stereographic projection, curated sites marked, tap to
  pick a point, lighting direction following the scrubber, directions to the Sun and Earth indicated.
- **Whole-Moon locator** (Must): where the site sits on the Moon, with the current day / night boundary. Needed for
  the non-polar sites and for the public audience.
- **Illumination overlay** (Should): colour the polar map by sunlit share or link share so good ground is visible
  before the user taps. Source: the PGDA average-illumination rasters, or our own computation if time allows.
- **3D south-pole navigator** (Must since the 14 November call, see `TODO.md` P0): the polar cap with real relief and
  terrain-true shadows, a site close-up and the view from the lander. How it is built: `PLAN_3D.md`.
- Accept: a user who has never seen the tool can find and select a site near the pole using only the map.

### F9. Explanations for non-specialists — Should

- Plain-language one-line summaries next to the numbers ("Sun is 1.9° above the horizon, about four Sun-widths").
- A guided contrast: Apollo 11 vs. a south-pole site, same date, switched with one tap.
- A short glossary: azimuth, elevation, lunar day, libration, direct-to-Earth.
- No separate "education mode" build; it is the same product with clearer words.

### F10. Trust and validation — Should

- A "Data and accuracy" panel: data sources, DEM resolution, what is and is not modelled.
- Our Sun and Earth angles checked against JPL Horizons for fixed test cases, with the error shown.
- Our sunlit share checked against the PGDA average-illumination product at the curated polar sites.
- Accept: a judge asking "how do you know this is right?" gets an answer from the product itself.

### F11. Sharing — Could

- The full state (scenarios, time, settings) encoded in the URL, so a link reproduces the view.
- Export of a comparison as an image or CSV.

### Cross-cutting — Must

- Works in a phone browser as well as on a desktop (responsive web; no native app).
- The demo runs without live calls to third-party services.
- Every displayed number has a unit and uses the conventions in `PLAN.md` §2.4.
- Colour is never the only carrier of meaning (labels and icons alongside).

---

## 5. Minimum bar for "the challenge is answered"

The entry is complete when F1, F2, F3, F4, F5, F6 and the 2D maps of F8 work on **real ephemeris and real terrain
horizons** for at least the curated south-pole sites, on both a laptop and a phone.

Below that bar, in order of what we would give up last:

1. Real terrain horizon for polar sites (without it the polar answers are wrong, see `PLAN.md` §0)
2. Panorama + timeline + countdowns
3. Comparison of at least two scenarios
4. Map-based site picking
5. Custom coordinates

Above the bar, in the order we add: F7 date-slip → F10 validation → F8 illumination overlay → F9 explanations →
mast height → F11 sharing.

---

## 6. Out of scope

- Power in watts, battery state, thermal modelling, data rates, link budgets.
- Relay-satellite or ground-station visibility; "link" means line of sight from the site to Earth only.
- Descent trajectories, landing-ellipse dispersion, hazard maps, slope and roughness assessment.
- Rover traverse planning.
- Accounts, saved projects on a server, collaboration features.
- Native mobile apps.
- Accuracy claims below the DEM resolution; results are regional terrain constraints, not exact landing-point values.

---

## 7. Demo storyline (3 minutes)

1. **The problem** (20 s): Apollo 11 vs. Shackleton ridge on the same date. One has the Sun overhead for two weeks
   and Earth fixed in the sky; the other has the Sun rolling along the mountains and Earth dipping out of view.
2. **One scenario** (50 s): pick a polar site on the map, scrub through a lunar day, watch the panorama, the
   timeline, and the countdowns move together.
3. **Why terrain matters** (30 s): the no-terrain horizon line vs. the real silhouette; the same site looks viable
   on a sphere and marginal on the real Moon.
4. **The schedule slips** (50 s): open the date-slip view, find the days that still give a sunlit landing, pick one,
   compare it side by side with the original plan and with an alternative site.
5. **Why believe it** (30 s): the validation panel, the data sources, and the stated limits.

Every step maps to a Must or Should feature. If a step cannot be shown live, the feature behind it is not done.

---

## 8. Open product questions

| Question | Default until someone decides otherwise |
|---|---|
| Surface-stay length shown by default | One lunar day; user can extend |
| How many scenarios side by side | Up to 4 on desktop, 2 visible at a time on a phone |
| Default link margin | 2° `[GUESS]`, adjustable, shown in the UI |
| Non-polar sites without DEM coverage | No-terrain horizon, clearly labelled as such |
| Viability thresholds in the date-slip view | User-set; ship with "≥ 5 days continuous sunlight" as an example, not a recommendation |
| Language of the UI | English only |

---

## 9. Status of the build against this plan

`site/` is the build people can open, online and locally: real Sun and Earth positions from JPL Horizons (2026–2030),
real LOLA terrain horizons, a 3D terrain and time view, and three interface languages. It covers F1 (list, map tap),
F2 (scrubber, play), F3, F4 (mast height fixed at 2 m), F5, F6 (sites only, not dates), F7 (one metric), the two 2D
maps of F8 and the start of F11. It does not yet show jump controls, scenario-by-date comparison, thresholds, the
illumination overlay, F9 or F10. The throwaway `prototype/` that came before it was deleted on 2026-11-14.
