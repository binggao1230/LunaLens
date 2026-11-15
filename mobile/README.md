# LunaLens Learn

An Ionic Vue and Capacitor app for a short, accessible introduction to lunar sunlight and direct-to-Earth visibility. The full analysis tools remain on the LunaLens website.

## Development

Use Node.js 22 or later and npm. From this directory:

```sh
npm install
npm run dev -- --host 0.0.0.0
```

The Vite development server listens on all network interfaces so a phone on the same local network can open the preview. The first prototype is in `src/views/HomePage.vue`.

Create a production web build and synchronize it into the generated native projects with:

```sh
npm run build
npx cap sync
```

The Android and iOS projects are already generated in `android/` and `ios/`. Open them with:

```sh
npx cap open android
npx cap open ios
```

Android builds require Android Studio and an installed Android SDK. Local iOS builds require macOS and Xcode. Keep the generated native projects checked in; never commit signing keys, private provisioning profiles, or release binaries. See [`../MOBILE_RELEASE_PLAN.md`](../MOBILE_RELEASE_PLAN.md) for device review and future store publication steps.

### Build Android test packages

From the repository root, rebuild the web assets and synchronize them first:

```sh
cd mobile
npm run build
npx cap sync
cd android
./gradlew assembleDebug bundleRelease
```

If the terminal uses an incompatible Java version on macOS, select Android Studio's bundled JDK before running Gradle:

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```

The debug APK is written to `mobile/android/app/build/outputs/apk/debug/app-debug.apk` and can be installed for local testing. Android automatically signs this debug APK with the debug key so devices can install it; this is not a store signing key. The release AAB is written to `mobile/android/app/build/outputs/bundle/release/app-release.aab` and this build is unsigned. These build outputs are ignored by Git. For a store upload, configure an owner-controlled upload key outside the repository and rebuild the AAB.

## Current prototype boundary

The welcome screen offers a short entry point, an English/French/Simplified Chinese language menu, and expandable NASA-sourced notes about lunar light and temperature. The exploration screen lets a learner choose from all 12 curated sites, select a supported UTC date, and view the calculated hourly sunlight, Earth visibility, and overlap. Results import the existing engine and curated site data from `../site/`; the ephemeris binary is emitted as a local build asset. No sample numbers substitute for the shared LunaLens engine.

Explanations are expandable so learners can choose how much detail they want. The next implementation step is the guided comparison flow. Keep the app independent from runtime network access and do not bundle the advanced website's full terrain datasets by default.

## Accessibility baseline

- Use semantic headings, labeled controls and a logical focus order.
- Keep primary controls at least 48 CSS pixels high and preserve browser text zoom.
- Pair color with text or symbols; keep explanations beside data visualizations.
- Respect `prefers-reduced-motion` and provide visible keyboard focus.
- Verify VoiceOver, TalkBack, enlarged text and narrow phone layouts before release.

Ionic components do not guarantee accessibility by themselves. The app needs manual assistive-technology and real-device review.
