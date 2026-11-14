# LunaLens Mobile App — Product and Technical Specification

- **Status:** Ionic Vue + Capacitor prototype started. The initial accessible welcome and concept screen exists; shared science integration and the full learning flow are still pending.
- **Product:** An educational mobile companion to the LunaLens website.
- **Primary delivery:** Installable Android and iOS applications built from a shared web UI and packaged with Capacitor.

## 1. Product direction

LunaLens will have two complementary experiences:

- **The website** remains the complete analysis tool for detailed maps, custom coordinates, terrain and advanced
  3D exploration.
- **The mobile app** is a focused, attractive learning experience for educators, students and younger learners. It
  helps people understand how lunar location and date affect sunlight and direct visibility of Earth.

The mobile app must use the same trusted science calculations and curated data as the website. It must not become a
second copy of the website or maintain its own interpretation of the science.

### Working definition of “native app”

The selected approach is a **hybrid native app**: the app is installed and distributed as an Android or iOS package,
but its interface is built with web technologies and displayed in the platform's web view. Capacitor connects that
interface to native capabilities when needed.

This is not the same as building every screen from Android Compose/Kotlin or iOS SwiftUI controls. That fully native
approach would require separate UI implementations and is not recommended for the first release. The hybrid approach
best fits the existing JavaScript calculation engine and the goal of keeping one science implementation.

## 2. Audiences and user needs

### Primary audiences

- **Educators** who need a reliable visual aid for a lesson or demonstration.
- **Students** who want to explore why lunar landing sites and dates matter.
- **Younger learners and the public** who may not know astronomy or engineering vocabulary.

No specific age or grade band has been selected. The first version should use short, concrete language without making
age-specific curriculum claims. Educators and learners should review the prototype before the copy and lesson flow are
considered final.

### Core user needs

1. Choose a familiar lunar site and a date without entering specialist settings.
2. Understand the difference between sunlight and a direct line of sight to Earth.
3. See when each condition occurs and when both occur together.
4. Change one thing at a time — the site or date — and notice what changes.
5. Find sources, assumptions and accuracy limits without being overwhelmed by them.

## 3. First-release scope

### Included

- A guided, mobile-first flow with curated sites and supported dates.
- A small set of clear results: sunlight, direct-to-Earth visibility and their overlap.
- A simple, labeled timeline and a short plain-language explanation for each result.
- A guided comparison between a familiar landed site and a south-pole site.
- A way to change the site or date and see the comparison update.
- A short glossary and a “How this is calculated” section with sources and limits.
- English, French and Chinese, matching the website's existing language set, with English as the reference wording.
- Local operation without depending on a live third-party science service.
- Native app packaging for Android and iOS through Capacitor.
- A link to open the full LunaLens website for advanced exploration.

### Excluded from the first release

- Recreating the full website's 3D navigator, terrain maps or custom-coordinate analysis.
- User accounts, classroom rosters, student profiles, chat or social features.
- Push notifications, location tracking, camera, microphone or contacts access.
- Claims that LunaLens certifies a landing site or predicts delivered power or a complete radio link budget.
- Separate Android and iOS UI implementations.

Features outside this list require a deliberate product decision and a corresponding update to `TODO.md` before work
begins.

## 4. Recommended technology choices

| Concern | Choice | Why |
|---|---|---|
| UI framework | Vue 3 | Component-based UI with a relatively small conceptual footprint for a focused app. |
| Mobile UI components | Ionic Vue | Provides mobile-oriented controls, navigation patterns and theming that can be restyled for the LunaLens identity. |
| Build and local development | Vite | Builds the web assets and serves the app during development. |
| Native app container | Capacitor | Packages the web build for Android and iOS and provides optional native plugins. |
| Native IDEs | Android Studio and Xcode | Build, run and inspect the platform projects and emulators. Xcode is required for local iOS builds. |
| UI and learning-flow design | Figma | Review screen layouts and educational content before implementing them. |
| App state | Vue Composition API at first | The initial flow is small; add a state library only if state becomes difficult to manage across screens. |
| Charts | Accessible SVG and text summaries | The MVP needs a small number of simple timelines, not a large charting dependency. |
| Data source | Shared LunaLens engine and local project data | Prevents calculation drift and supports offline operation. |

Ionic Vue is the UI layer; Capacitor is the native runtime; Vite is the build tool. They solve different problems and
should not be treated as interchangeable frameworks. Ionic Vue officially supports Capacitor for iOS, Android and
web delivery. A component library does not guarantee accessibility by itself; the app still needs semantic labels,
screen-reader checks and real-device review. [Ionic Vue documentation](https://ionicframework.com/docs/vue/overview)

Vite supports Vue projects and produces a production build. Capacitor can be added to an existing web application,
but it expects a `package.json`, a separate web build directory such as `dist/`, and an `index.html` at that
directory's root. The supported platform build environments are listed in Capacitor's setup guide. [Vite guide](https://vite.dev/guide/),
[Capacitor installation](https://capacitorjs.com/docs/getting-started),
[Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)

### Alternatives considered

- **PWA only:** useful as a web preview and easy installation path, but not the primary deliverable because the
  current direction is an Android/iOS app package.
- **React Native:** can reuse JavaScript calculations, but its UI uses native React components rather than the
  website's HTML and CSS. That is a larger UI migration for this project.
- **Flutter:** would introduce Dart and a separate UI and maintenance stack without a clear MVP benefit here.
- **Kotlin/Swift native UI:** appropriate if deep platform integration or fully native rendering becomes a firm
  requirement; it would mean maintaining two front ends and is out of scope for the first release.

These are project recommendations, not claims that the alternatives are unsuitable in general. React Native's own
documentation describes its UI in terms of native components. [React Native components](https://reactnative.dev/docs/intro-react-native-components)

## 5. Proposed repository structure

Keep the website and mobile interface separate while sharing data and calculations:

```text
site/                         Existing advanced website
  js/engine/                  Current browser calculation modules
  data/                       Locally provisioned data; not committed to Git

mobile/                       Ionic Vue application source
  src/
    app/                      App shell, navigation and shared state
    pages/                    Welcome, explore, compare and learn screens
    components/               Accessible result cards and timelines
    content/                  Learning copy and glossary by language
    services/                 Adapter for the shared LunaLens engine/data
    theme/                    Mobile design tokens and Ionic overrides
  public/                     App icons and static metadata
  capacitor.config.*          Native app identifier and build configuration
  android/                    Android project/configuration
  ios/                         iOS project/configuration

shared/                       App-agnostic code extracted only when needed
  science/                    Shared calculations and typed app-facing API
  data-contracts/             Input and output definitions

dist-mobile/                  Generated web build; never edited by hand
```

The existing engine currently lives under `site/js/engine/`. Do not duplicate it. Initially, the mobile adapter may
import the existing engine modules. Extract a module into `shared/science/` only when a real import or build constraint
requires it, and update both consumers in the same reviewed change. A shared adapter should expose a small stable API
to the UI rather than letting screens reach into calculation internals.

The native `android/` and `ios/` projects contain source configuration and must be reviewed and versioned when they
carry required app settings or plugins. Never commit signing keys, certificates, provisioning profiles, credentials,
or generated release binaries.

## 6. App structure and learning flow

### Screen 1 — Start a lunar exploration

- Explain the activity in one short sentence.
- Offer “Explore a place” and a small number of curated starting choices.
- Let the learner select a supported date with accessible controls.
- Avoid asking for coordinates or technical mission settings in the first flow.

### Screen 2 — Understand this place and date

- Show three separate concepts: **sunlight**, **direct view of Earth**, and **both at once**.
- Use a labeled timeline that can be read by touch, keyboard and screen reader.
- Pair each result with one short explanation. Do not make a color or a chart the only way to understand it.
- Provide a simple lunar horizon illustration; keep the website's high-detail maps and WebGL terrain out of this screen.
- Offer “Why does this matter?” and “How do we know?” progressive details.

### Screen 3 — Compare and experiment

- Put a familiar landed site beside a south-pole site for the same date.
- Let the learner change one variable at a time: site or date.
- State what changed in ordinary language and retain the numerical values for learners who want them.
- Finish with a short reflection prompt, such as “Which place had more time in sunlight?” Do not grade or track
  the learner.

### Advanced path

An “Open full LunaLens” action opens the website for custom coordinates, detailed maps, terrain and advanced 3D. The
transition should preserve the selected site/date when a stable link format is available; until then it must still
open the relevant website view and explain that the learner may need to select the scenario again.

## 7. Visual design and accessibility requirements

The app should feel welcoming and space-related without sacrificing readability or scientific clarity. Use the
existing LunaLens visual identity as a starting point, then create a smaller mobile design system: readable type,
clear hierarchy, consistent spacing, restrained animation and strong focus states. Figma screens should be reviewed
with at least one educator and one learner before implementation is treated as settled.

### Requirements

- Target **WCAG 2.2 AA** for the web interface and apply platform accessibility guidance to packaged screens.
- Provide semantic headings, control labels, meaningful accessible names, logical focus order and visible keyboard focus.
- Ensure screen readers announce result changes and timeline values in a useful order.
- Do not use color as the only distinction. Pair colors with labels, symbols, line patterns or text.
- Support text enlargement, device orientation changes, reduced motion and high-contrast platform settings where available.
- Make timelines understandable without dragging: include a text summary and accessible previous/next or step controls.
- Use platform-sized targets: at least **44 × 44 pt on iOS** and **48 × 48 dp on Android** for primary touch controls;
  meet WCAG's applicable target-size requirement for web content. These are separate platform units and must not be
  treated as identical CSS pixel values.
- Keep plain-language explanations adjacent to scientific values, while preserving exact units and UTC dates where relevant.

WCAG 2.2 defines a 24-by-24 CSS-pixel minimum target-size criterion with exceptions. Apple recommends 44-by-44-point
targets for iOS and Android recommends 48-by-48-dp touch targets. Use the platform guidance for native touch
controls and verify actual layouts rather than assuming a direct unit conversion. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/),
[Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility),
[Android accessibility guidance](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views)

## 8. Science, data and offline operation

### Single source of truth

- Use the same ephemeris, curated site data and calculation rules as the website.
- Do not recalculate Sun/Earth positions using a different library or unverified source in the app.
- Do not invent missing values. Show “not available” and explain why if a site/date is outside supported data.
- Preserve project conventions: east-positive longitude in 0–360°, south latitude negative, azimuth clockwise from
  north, UTC externally, and the project's established Moon-fixed frame and elevation datum.
- Keep UI wording accurate: a direct geometric line of sight to Earth's centre does not mean a complete radio
  communication link budget has been evaluated.

### Initial data package

- Package only the local datasets needed for curated-site calculations and the educational visuals.
- Do not bundle the website's full-resolution DEMs, advanced 3D models or map assets unless a defined app screen needs them.
- The first app version has no custom coordinates, so it should not load the custom-coordinate DEM workflow by default.
- Record dataset version, provider, coverage dates and checksums in build metadata. Show coverage dates in the app.
- Keep source URLs and processing provenance in the repository. Do not make the app depend on NASA/JPL or mapping
  services being available at runtime.
- If future data updates require a separate download, show its size, purpose and progress before downloading; retain a
  working last-installed dataset and handle interruption safely.

### Offline behavior

- Core learning flow, curated-site results, glossary and sources work after installation with no network connection.
- Keep user preferences such as last selected site on-device. Do not require an account.
- Distinguish “offline data included in this app version” from “new data available”; never silently mix incompatible
  ephemeris and terrain versions.
- A later online update must be versioned, integrity-checked and reversible to the last usable data package.

## 9. Privacy and permissions

- No account, student identity, location permission or analytics is required for the MVP.
- Keep favorites and recent selections on-device unless a future feature has a clear user benefit and separate approval.
- Request native permissions only when a feature needs them and explain the benefit at the moment of request.
- Do not collect names, school, age, precise location or learning-performance data in the first version.
- Before store release, review current Apple and Google policies for an app intended for educators and younger users;
  this specification is not legal advice and does not decide the applicable age category or privacy obligations.

## 10. Development and release workflow

### Local development

1. Install a supported Node.js release and the repository's chosen package manager.
2. Run the mobile Vite development server on `0.0.0.0` so phones on the same LAN can open it.
3. Use browser responsive mode for quick layout checks, then Android Studio Emulator and Xcode Simulator for platform
   behavior.
4. Test on at least one real Android phone and one real iPhone before declaring the MVP usable.
5. Use VoiceOver and TalkBack for the main learner flow, not only automated accessibility scans.

### Build flow

```text
mobile source + shared science modules + versioned local data
             │
             ├── Vite build ──> dist-mobile/
             │                      │
             │                      ├── browser/PWA preview
             │                      └── Capacitor sync
             │                              ├── Android Studio build
             │                              └── Xcode build
             └── source maps and dataset manifest (release/debug policy applies)
```

The build must be reproducible from a clean checkout plus documented data artifacts. `dist-mobile/` and native release
packages are generated outputs; do not edit or commit them. Keep dependency versions locked and document the exact
commands in a mobile-specific README when implementation begins.

### Release gates

- Science outputs agree with the website for shared site/date scenarios.
- App works offline from a fresh install with its bundled dataset.
- No horizontal overflow at narrow phone widths; larger text does not hide key controls or results.
- Main flow is usable with VoiceOver, TalkBack, keyboard/switch access where supported, and reduced motion.
- Data provenance, coverage, units and limitations are visible.
- No permissions, secrets or unintended personal-data collection.
- Android and iOS builds launch and complete the full learner flow on real devices.
- Store metadata, privacy disclosures, support links, signing and review requirements are complete before submission.
- Store acceptance is not guaranteed by choosing Capacitor. Apple requires apps to meet its current minimum
  functionality and quality guidelines; the app must deliver a complete educational experience rather than act as a
  bare website shortcut. [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

## 11. Milestones and acceptance criteria

### M0 — Content and prototype

- Agree on the first lesson's learning outcome and recruit educator/learner reviewers.
- Produce a clickable Figma prototype for the three-screen flow in English, then check French and Chinese text lengths.
- **Accept when:** reviewers can explain the purpose of each screen and identify the difference between sunlight and
  Earth visibility without being taught the interface.

### M1 — Shared calculation boundary

- Define a typed app-facing service for curated sites, supported dates and result summaries.
- Reuse current calculation code; extract modules only where the mobile build requires a clear shared boundary.
- **Accept when:** a selected site/date produces the same raw result on the site and mobile service for a small set
  of documented fixtures.

### M2 — Educational MVP

- Implement the guided site/date, result/timeline and compare/reflection flow.
- Add translations, glossary, source/limit details, settings for motion and text readability, and on-device preferences.
- **Accept when:** a learner completes the core flow without a network connection and without visiting advanced screens.

### M3 — Native packaging and device quality

- Build Android and iOS packages with Capacitor; configure app identity, icons, launch screen and platform navigation.
- Verify performance, memory and large-text behavior on real devices.
- **Accept when:** Android and iOS devices complete the same tested learning flow using the bundled data.

### M4 — Release decision

- Review store requirements, privacy disclosures, support, ownership of signing credentials and maintenance plan.
- Decide whether to publish to both stores, one store, or distribute privately to educators.
- **Accept when:** the team has selected the distribution route and has a responsible maintainer for updates and review feedback.

## 12. Open decisions

These are intentionally unresolved; do not silently invent answers during implementation:

- Which school-age/grade band should the first learning activity serve?
- Should tablet layouts be part of the first release, or should the first release focus on phones?
- Which educator or student will review the learning copy and prototype?
- Which familiar landed site and which polar site should be the default comparison? Use only sites whose data and
  coordinate sources are verified.
- Should the first store release target both platforms at once, or Android first followed by iOS?
- Who owns Apple/Google developer accounts, signing credentials, store support and long-term updates?
- Is the PWA only a development/demo preview, or should it also be offered publicly as an installable web companion?

## 13. References

- [LunaLens challenge background](../doc/Background.md)
- [LunaLens data resources](../doc/Resources.md)
- [Ionic Vue overview](https://ionicframework.com/docs/vue/overview)
- [Vite guide](https://vite.dev/guide/)
- [Capacitor installation](https://capacitorjs.com/docs/getting-started)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Android accessibility guidance](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
