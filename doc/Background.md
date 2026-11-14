# Lunar Landing Site Navigator — challenge text and LunaLens assessment

**Reading this page:** The NASA challenge text below is unchanged. The notes labelled
**LunaLens** and the [scorecard](#lunalens-scorecard) are our own assessment. They are
not NASA criteria or an official judging score. The [implementation plan](../TODO.md)
links each remaining check to a proposed change and an acceptance test.

Missions to the Moon’s south pole face extreme lighting and communication constraints, and planning them takes careful coordination between science and engineering teams. Tools for determining Sun and Earth positions at candidate landing sites exist, but their complicated interfaces make it difficult to evaluate critical information with efficiency. Your challenge is to create an intuitive tool or application that lets mission planners, educators, and the public compare landing sites and dates quickly, visualizing Sun and Earth positions relative to the horizon to assess power generation potential and direct-to-Earth communication windows.

> **LunaLens (C1–C7):** LunaLens uses a browser-based Expert workspace and a separate Education story. The Expert map, skyline and time controls exist. A first-time user still needs a repeatable way to test a change of date or place without losing the original plan.

## **Background**

NASA’s Commercial Lunar Payload Services (CLPS) program and other lunar missions depend on careful selection of landing sites and dates that balance the needs of both science and engineering teams. One of the most significant challenges in this process is understanding the local lighting and communication environment at a potential landing site. The position of the Sun determines power availability for solar arrays and thermal conditions for equipment, while the position of Earth determines whether direct communication is possible without relay satellites.

> **LunaLens (C3, C4):** Explore shows solar elevation and Earth clearance, and Mission shows visibility windows. These are geometric estimates. Power output, thermal survival and radio performance are outside the Expert model.

This challenge is particularly acute at the Moon's south pole, where many future missions are planned due to the presence of water ice and other scientifically valuable resources. The south pole's geometry creates extreme variations in solar illumination and Earth visibility across different lunar days and seasons. Small changes in landing location or date can dramatically affect both power generation potential and communication windows, making rapid site evaluation critical.

> **LunaLens (C2, C3, C5):** LOLA terrain and hourly ephemerides drive the south-pole views. Inspect a nearby ridge and hollow on the same date; show the terrain source and the skyline that explains any difference. Longer-range exploration still needs a guided check.

In practice, mission development rarely proceeds on a fixed timeline. Hardware development challenges, launch delays, or other factors often force mission planners to reconsider their original landing date and location. When this happens, engineers need to quickly evaluate alternative sites in the same region, or alternative dates at the same site, to understand how these changes impact mission feasibility. A tool that enables rapid, intuitive comparison of multiple scenarios would accelerate this decision-making process and help teams identify viable alternatives when constraints shift.

> **LunaLens (C1, C2):** Mission can compare sites on one date. The standalone Compare and Date slip tabs are retired. Keep a baseline in Explore, then either try another point and time or start with a date range and ask which known sites offer usable touchdown windows. See the [Expert planning scenarios](#expert-planning-scenarios).

Tools that provide this information — such as NASA's Quickmap, Moon Trek, and the JPL Horizons System — are built for detailed analysis and are often difficult for non-specialists to use effectively for rapid scenario comparison. Evaluating each site-data combination means navigating multiple interfaces and interpreting raw data. This leaves a gap between the technical data available and the accessible tools needed to support agile mission planning. An intuitive interface that translates complex ephemeris and topographic data into clear, comparable visualizations could help bridge that gap.

> **LunaLens (C1, C5, C7):** Explore puts the map, skyline and results on one page. Atlas still uses separate assumptions, and its pins do not return to Expert. The release test is one workflow with no repeated data entry.

## **Objectives**

Your challenge is to create a tool or application that enables rapid evaluation of lunar landing site options. Your solution may include:

> **LunaLens (C1–C7):** The seven ideas below are used as internal product criteria. Each criterion has a test and a status in the scorecard at the end of this document.

- **Interactive site selection and comparison:** You may consider allowing users to choose from a curated list of notable landing sites – such as past Apollo missions, future CLPS mission targets, targets of other commercial lunar missions, or landing sites from other countries' lunar programs – as well as the ability to input custom lunar coordinates. You may also consider enabling side-by-side or sequential comparison of multiple sites to help users quickly assess trade-offs.
> **LunaLens (C1):** Explore supports named sites and latitude/longitude. Mission compares several sites on one date. Add the Expert comparison of different sites at the same UTC time or over the same period, and of different windows at one site.

- **Date and time flexibility:** You may consider allowing users to select landing dates and times, and providing tools to explore how conditions change across different lunar days or seasons. This enables users to understand how mission schedule adjustments affect feasibility.
> **LunaLens (C2):** Users can choose a landing date and preview later hours. The stored landing is still UTC midnight. Add a UTC hour and period presets such as “First half of 2030”, show the date range the selected stay can actually use, and test across seasons.

- **Sun and Earth position visualization:** Display the positions of the Sun and Earth relative to the horizon at a selected landing site on a chosen date. You may consider showing how much time remains before sunset or Earthset, as this directly impacts mission operations and power generation windows.
  > **LunaLens (C3):** The Explore panorama shows both bodies against the site skyline. Countdown labels still need to distinguish Earth crossing the geometric horizon from Earth crossing the selected link margin.

- **Power and communication assessment:** You may consider highlighting key metrics such as solar elevation angle (which affects power generation efficiency), duration of sunlight, and Earth visibility windows. These metrics help mission planners quickly assess whether a site-date combination is viable.
  > **LunaLens (C4):** Explore shows the angles and the two windows. Mission shows overlap and a site score. Put the physical meanings and failed conditions next to the results before refining the score.

- **Multiple visualization approaches:** You may explore 2D maps, 3D surface visualizations, or other creative representations that help users understand the spatial relationships between the landing site, Sun, and Earth.
> **LunaLens (C5):** The native 2D map and 3D terrain view exist. Mission already draws schematic Moon-around-Earth and Earth-around-Sun rings. Preserve both as explanatory visuals and identify the skyline segment that blocks a body when inspecting a case. Atlas is supplementary to the native path.

- **Temporal dynamics:** You may consider creating animations or timeline views that show how Sun and Earth positions change over a lunar day or across multiple days, helping users understand the duration and timing of operational windows.
  > **LunaLens (C6):** Playback and the timeline already show the changing Sun and Earth windows. Recheck that preview controls still leave the landing time unchanged when a time-of-day field is added.

- **Accessibility across skill levels:** Your tool could serve mission planners seeking detailed technical information for rapid decision-making, as well as educators and the general public curious about why the Moon presents such distinct engineering challenges.
  > **LunaLens (C7):** The Education story and a glossary exist. Prove that a first-time user can complete and explain the workflow on a phone, using the actual controls rather than relying on desktop-only hints.

You are encouraged to be creative in how you present this information. Your solution might be a web application, a mobile app, an interactive visualization, an educational game, or another format entirely — as long as it makes rapid site evaluation clear and efficient.

> **LunaLens (C1, C5, C7):** The static web app is the deliverable. Mission’s story is an optional way in; users should be able to reach the Expert result without starting a flight animation.

## **Potential Considerations**

*You may (but are not required to) consider the following:*

> **LunaLens (C2–C7):** The optional ideas below are implementation notes and evidence. They do not add points beyond the seven project criteria.

Technical approach:

- Ephemeris data – the positions and motions of celestial bodies – can be calculated using tools like the JPL Horizons System, or you may consider using pre-computed datasets.
  > **LunaLens (C2, C3):** The native app uses precomputed hourly JPL Horizons inputs. The repository has ephemeris checks; the full data regeneration instructions remain a separate backlog item.

- Lunar topography data from sources like the Lunar Orbiter Laser Altimeter (LOLA) can help create realistic surface visualizations and accurate horizon calculations.
  > **LunaLens (C3, C5):** The native app uses LOLA horizons for covered sites and a smooth-sphere fallback elsewhere. Some presets combine 40 m near-field and 240 m far-field terrain; custom polar calculations use 240 m.

- Consider how to handle the Moon's lack of atmosphere when calculating horizon positions. Without atmospheric refraction, the horizon is determined by local terrain and the edge of the lunar sphere as seen from the landing site.
  > **LunaLens (C3):** The native skyline calculation accounts for lunar curvature and does not add atmospheric refraction. Check how that fallback and terrain coverage are named in the result.

- Solar elevation angle is a key metric for power generation, and you may consider calculating and displaying this prominently.
  > **LunaLens (C3, C4):** Explore shows solar elevation and clearance relative to terrain. Treat those as inputs to assessing sunlight; the app does not model a particular solar array.

User experience:

- Your interface could prioritize rapid scenario comparison, allowing mission planners to evaluate multiple site-date combinations efficiently.
> **LunaLens (C1, C7):** Keep the baseline visible while the user tries a change in the current workspace. Show why the ranked option is first and let the user put two results side by side without retyping coordinates, dates or conditions.

- Consider how to clearly communicate time remaining before sunset or Earthset, as this is critical operational information.
  > **LunaLens (C3):** Countdowns exist. A link-margin crossing needs its own label and must use the same margin as the visible window.

- Think about how to make the extreme differences between lunar and terrestrial conditions apparent—they can be compelling when visualized effectively.
  > **LunaLens (C5, C7):** The Education delay-and-recovery story introduces the problem. Add a same-date Apollo versus south-pole example using the existing site and horizon views.

- You may consider features that help users understand why small location or date changes have large impacts on mission feasibility.
  > **LunaLens (C1, C5):** Show the baseline and the alternative under identical conditions. Highlight the changed azimuth and skyline if terrain is responsible; explain which time or threshold changed otherwise.

Data and accuracy:

- Consider accounting for the Moon's actual topography, as terrain elevation can significantly affect horizon positions and visibility windows.
  > **LunaLens (C3, C4):** The terrain calculations and validation are covered in Data. Put the specific resolution or fallback next to the site result, especially for custom points near rims.

- Consider whether your tool will account for factors like Earth's libration (wobble) or the Moon's orbital variations.
  > **LunaLens (C2, C3):** The native ephemeris varies with time; the SVS check compares the changing Earth and Sun positions. Longer-range events still need a user-facing check over the supported dates.

- South pole terrain is particularly complex, and you may consider how to represent steep slopes and deep craters that create extreme shadow conditions.
  > **LunaLens (C3, C5):** Local relief and skylines represent ridges and craters. The relief lighting is illustrative; the numerical skyline, not the 3D shading, determines the window.

Engagement and impact:

- Your solution could support mission planners in coordinating between science and engineering teams during mission development.
  > **LunaLens (C1, C4):** Mission provides same-date CSV export. A reproducible decision also needs the exact UTC landing time, observation time if relevant, mission conditions and terrain source on the result or export.

- It could help teams respond quickly when schedule changes or hardware development challenges require landing date or location adjustments.
> **LunaLens (C1, C2):** Rehearse both a nine-day delay to a known plan and a period-first search for a plan that has no fixed date yet. Keep the original values visible enough to explain what changed.

- It could also serve as an educational tool to help students and the public understand lunar exploration challenges and why mission planning is so complex.
  > **LunaLens (C7):** The merged Education story includes a guide and a clearly separate illustrative verdict. Completion in all three languages and on a physical phone is still unverified.

*For data and resources related to this challenge, refer to the Resources tab at the top of the page. More resources may be added before the hackathon begins.*

> **LunaLens (C3–C5):** See [Resources.md](Resources.md) and the Expert Data view for sources and limits. Data is retained even though the standalone Compare and Date slip views were retired.

## Expert planning scenarios

This section is a LunaLens proposal, not part of the official challenge text. A **touchdown
window** is a sequence of hourly UTC sample times at which a lander could start a stay and
meet the selected Sun and Earth visibility conditions. It is a screen for lunar surface
conditions. It is not an Earth launch window, an ascent window from the Moon, a transfer
trajectory, or a landing safety assessment. Those decisions require trajectory, vehicle
and other mission inputs this product does not have.

| Planner's question | Use the existing Explore workspace to answer it |
|---|---|
| “We know only the year or half-year. Which sites and dates should we investigate?” | Enter a UTC period and a stay length. Rank terrain-backed candidate sites under one set of conditions, show up to three useful windows per site, and state why each recommended result qualifies. |
| “Which site works better if we arrive at the same time?” | Pin two sites at the same UTC touchdown. Show pass/fail reasons and the difference in visibility and outages over the same elapsed stay. |
| “Which site gives us more choice over the same period?” | Evaluate both sites against the same UTC samples, conditions and stay length. Compare the count and share of eligible starts, widest eligible window, and shared opportunities. Clearly label the two dates if each site's representative plan differs. |
| “We are committed to this site. Which time is better?” | Keep the site and conditions fixed. Compare two exact touchdowns, or two date ranges with their own valid sample counts. Show both UTC dates and compare the stays on a common elapsed-hour axis. |

The default recommendation favors easier scheduling: more eligible touchdown hours, then a
wider uninterrupted set of starts. A planner can instead prioritize overlap between sunlight
and Earth view during the stay. The two preferences may recommend different sites. Always
show the required thresholds, terrain source, earliest and latest eligible sampled starts,
and the representative touchdown. If there are no matches, show which conditions rule
options out. If the data end early, show the covered period separately from failed starts.

### Release checks for the planning workflow

These checks clarify the open items in the scorecard; they do not add points or change the
baseline. The [construction map](../TODO.md) gives the implementation and verification order.

- [ ] **R1 (C2.3, C2.4):** Search a day, first/second half-year, year or custom UTC range,
  with hourly touchdown samples and a complete stay. Report partial or absent coverage.
- [ ] **R2 (C1.4, C4.3):** Return a native shortlist of terrain-backed sites and eligible
  windows. Explain the ranking and show the no-match state; exclude smooth-sphere references
  from recommendations.
- [ ] **R3 (C1.4, C4.3):** Compare two sites at the same UTC touchdown and over a shared
  period. Expose shared eligible starts and use a common denominator for period results.
- [ ] **R4 (C1.4, C2.3):** Compare two windows at one site without changing the baseline,
  terrain or constraints. Include absolute UTC and align the two stays by elapsed time.
- [ ] **R5 (C5.2):** Retest both existing orbit rings at two UTC times. Label them as
  schematic, distinguish the polar boundary, and keep 2D planning usable without WebGL.
- [ ] **R6 (C7.3):** From an unopened app, an unfamiliar user can find and compare two
  plausible options for the example period without re-entering a site or changing tabs.

## LunaLens scorecard

Baseline: #59 plus the retirement of the standalone Compare and Date slip pages.
Award the listed points only for a check that has working behavior or a documented
technical check. An open or unverified check earns zero. Do not count the vendor
Atlas as evidence that a native Expert workflow works.

| Criterion | Earned / possible | What it measures |
|---|---:|---|
| C1. Site and scenario selection | 8 / 25 | Find a point, preserve the baseline and test a change |
| C2. Landing time | 7 / 15 | Choose an exact landing time and inspect time changes |
| C3. Horizon and body positions | 16 / 20 | Explain where the Sun and Earth are and when visibility changes |
| C4. Mission conditions | 9 / 15 | Quantify windows and explain which conditions are met |
| C5. Visual explanation | 8 / 10 | Connect the map, 3D terrain and local obstruction |
| C6. Temporal dynamics | 5 / 5 | Inspect how visibility changes during a stay |
| C7. Accessibility and education | 6 / 10 | Make the workflow usable and understandable for newcomers |
| **Total** | **59 / 100** | **Internal baseline, not a predicted judging score** |

### C1. Site and scenario selection

- [x] **C1.1 (5):** Select a preset or enter custom lunar coordinates in Explore.
- [x] **C1.2 (3):** See multiple sites on one landing date in Mission.
- [ ] **C1.3 (7):** Switch between Mission and Explore with the same exact point, landing time and conditions.
- [ ] **C1.4 (10):** Recommend sites from a period, compare two sites at one time or across one period, and compare two times at one site without losing the baseline or restoring a standalone tab. See R2–R4.

### C2. Landing time

- [x] **C2.1 (3):** Choose a supported landing date.
- [x] **C2.2 (4):** Move the playback cursor without changing the landing date.
- [ ] **C2.3 (5):** Enter and preserve a non-midnight UTC landing time; explain resolution and reject out-of-range stays.
- [ ] **C2.4 (3):** Search comparable UTC periods including a year and half-year, respect the available full-stay coverage, and explain differences across dates within the data range. See R1.

### C3. Horizon and body positions

- [x] **C3.1 (8):** Show Sun and Earth against the local skyline, with azimuth and elevation.
- [x] **C3.2 (5):** Use terrain where supported and document differences in terrain coverage and the fallback.
- [x] **C3.3 (3):** Surface the next Sun and Earth visibility transitions.
- [ ] **C3.4 (4):** Distinguish geometric Earthset from the end of visibility at the chosen link margin, with consistent timing across views.

### C4. Mission conditions

- [x] **C4.1 (5):** Show sunlight and Earth visibility over a stay and distinguish them from measured power and communications performance in Data.
- [x] **C4.2 (4):** Show the overlap and longest continuous sunlight in Mission.
- [ ] **C4.3 (6):** Show pass/fail reasons and relevant gaps using one set of Expert conditions; disclose the terrain source beside the result.

### C5. Visual explanation

- [x] **C5.1 (4):** Pick points on a 2D lunar map with a polar view.
- [x] **C5.2 (4):** Inspect the Moon and local polar relief in 3D.
- [ ] **C5.3 (2):** Identify the part of the skyline that explains the result for a selected point and time.

### C6. Temporal dynamics

- [x] **C6.1 (5):** Scrub a timeline or play it to see visibility change during a stay.

### C7. Accessibility and education

- [x] **C7.1 (4):** Provide English, French and Chinese interface options and a glossary of the core terms.
- [x] **C7.2 (2):** Provide a guided Education entry with an explicitly illustrative verdict.
- [ ] **C7.3 (4):** Watch a newcomer complete and explain both the period-first search and a date change at desktop and phone widths with touch and keyboard checks. See R6.
