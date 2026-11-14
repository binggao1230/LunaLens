# LunaLens Learn

An Ionic Vue and Capacitor app for a short, accessible introduction to lunar sunlight and direct-to-Earth visibility. The full analysis tools remain on the LunaLens website.

## Development

Use Node.js 22 or later and npm. From this directory:

```sh
npm install
npm run dev -- --host 0.0.0.0
```

The Vite development server listens on all network interfaces so a phone on the same local network can open the preview. The first prototype is in `src/views/HomePage.vue`.

Create a production web build with:

```sh
npm run build
```

Add native platforms after the web build is ready:

```sh
npx cap add android
npx cap add ios
npx cap sync
```

Android builds require Android Studio. Local iOS builds require macOS and Xcode. Native projects are generated from the app configuration and should be checked in when created; never commit signing keys or release binaries.

## Current prototype boundary

The welcome screen introduces the lesson and the distinctions between sunlight and Earth visibility. The exploration screen lets a learner choose between Tranquility Base and the Shackleton rim, select a supported UTC date, and view the calculated hourly sunlight, Earth visibility, and overlap. Results import the existing engine and curated site data from `../site/`; the ephemeris binary is emitted as a local build asset. No sample numbers substitute for the shared LunaLens engine.

Explanations are expandable so learners can choose how much detail they want. The next implementation step is the guided comparison flow. Keep the app independent from runtime network access and do not bundle the advanced website's full terrain datasets by default.

## Accessibility baseline

- Use semantic headings, labeled controls and a logical focus order.
- Keep primary controls at least 48 CSS pixels high and preserve browser text zoom.
- Pair color with text or symbols; keep explanations beside data visualizations.
- Respect `prefers-reduced-motion` and provide visible keyboard focus.
- Verify VoiceOver, TalkBack, enlarged text and narrow phone layouts before release.

Ionic components do not guarantee accessibility by themselves. The app needs manual assistive-technology and real-device review.
