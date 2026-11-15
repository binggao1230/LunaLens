# LunaLens Applications: Development and Release Plan

This document explains how the LunaLens web experience and LunaLens Learn mobile app are developed, built, previewed, and prepared for future public release. It is an operational plan, not a promise that a store account, signing identity, or production listing already exists.

## Product map

| Target | Source of truth | Output | Release channel |
|---|---|---|---|
| LunaLens web | `site/` | Static website | Cloudflare Pages/Workers through the existing GitHub Actions workflow |
| LunaLens mobile web preview | `mobile/` | Vite static bundle in `mobile/dist/` | Local/LAN preview; optionally a separately configured web host |
| Android | `mobile/` + `mobile/android/` | Signed Android App Bundle (`.aab`) for store submission; APK for direct testing | Google Play or controlled internal distribution |
| iOS | `mobile/` + `mobile/ios/` | Signed archive / `.ipa` for distribution | TestFlight and, when ready, App Store |

The website remains the complete analysis product. LunaLens Learn is the small-screen educational companion and reuses the website's calculation data and engine where practical.

## Repository responsibilities

- `site/` contains the full web product and its current deployment configuration.
- `mobile/src/` contains the mobile app interface and app-specific behavior.
- `mobile/public/` contains files copied into the mobile web bundle, including the web manifest and logo.
- `mobile/assets/` contains source artwork for native icons and launch screens.
- `mobile/android/` and `mobile/ios/` contain the generated native shells and platform-specific configuration. Keep required project files under version control; do not check in signing keys, private provisioning profiles, or release binaries.
- `mobile/scripts/sync-brand-assets.mjs` prepares light and dark logo source files for native asset generation.
- `TODO.md` remains the source of current work. Update it when priorities or acceptance criteria change.

## Development workflow

### Web product

1. Work on a feature branch and keep changes scoped to `site/` unless shared behavior is intended.
2. Restore the versioned data snapshot as described in the root `README.md`.
3. Run the local server with `python3 site/tools/serve.py 8768`; it binds to `0.0.0.0` for LAN device review.
4. Review desktop and a narrow phone viewport. Follow `AGENTS.md` for the required correctness checks when changing scientific calculations or coordinates.
5. Open a pull request. The existing workflow deploys the site from `main` after merge; public deployment needs the project's normal human review.

### Mobile app and native shells

From `mobile/`:

```sh
npm ci
npm run dev -- --host 0.0.0.0
npm run build
npx cap sync
```

Use `npx cap open android` with Android Studio, or `npx cap open ios` on macOS with Xcode. After changing web code or native assets, run the web build and `npx cap sync` again before building in the IDE. Keep `appId` (`org.lunalens.learn`) stable after a store release; changing it creates a different store app identity.

Use physical devices as well as simulator/emulator previews before release. Check startup, language selection, dark/light appearance, globe and timeline controls, offline behavior, screen-reader labels, enlarged text, reduced motion, and navigation/back behavior. The minimum review matrix is one supported iPhone and one supported Android phone; record actual OS/device versions in the release checklist.

## Build and release stages

### 1. Local development

- Build the web experience and mobile app locally.
- Keep all runtime lesson data and calculations usable offline where the product promises offline use.
- Do not put secrets or signing credentials in source, `.env` files committed to Git, or app assets.
- Treat browser preview, simulator builds, and debug APKs as development artifacts only.

### 2. Review build

- Build a release candidate from a reviewed commit on a release branch or tag.
- Record the commit hash, app version, build number, platform, and build date.
- Install on real devices and complete the device/accessibility checklist above.
- Check app name, icon, launch screen, orientation, language fallback, privacy disclosures, and website links.
- Share only through a private test channel (for example, internal Play testing or TestFlight) until explicitly approved for public release.

### 3. Public release preparation

Before submitting anything publicly, the owner must confirm:

- Legal publisher name, store account ownership, and who can administer it.
- Final app name, bundle/package identifier, supported OS versions, versioning, and release notes.
- Privacy policy URL and accurate store privacy/data-safety disclosures based on the actual shipped app and dependencies.
- Store listing copy, screenshots, age/content rating answers, support contact, and required regional information.
- Licenses, attribution, and provenance for NASA/JPL data, textures, and other bundled assets.
- Signing and recovery arrangements. Store signing credentials belong in the platform's secure credential system or an approved secret manager, never in Git.
- Current Google Play and Apple submission requirements, which can change and must be checked at release time.

Do not submit, publish, or enable a public deployment as part of ordinary local development. Obtain explicit owner approval for the outward-facing action after the exact build and listing have been reviewed.

### 4. Release and record keeping

For each production release, preserve a release record with:

```text
Product:
Platform and distribution channel:
Version / build number:
Git commit or tag:
Build date (UTC):
Reviewer and device/OS checks:
Store submission/release date:
Store listing or release URL:
Known issues:
Rollback or withdrawal notes:
```

Keep source and configuration in Git. Keep signed archives and store receipts in the team's approved private storage with limited access and a retention policy. Never store passwords, private keys, provisioning profiles, or API tokens in this repository. Record where such credentials are managed, not their values.

## Versioning and promotion

- Use one human-readable app version across iOS and Android, and increment each platform's build number for every submitted build.
- Choose a versioning scheme before the first public store submission and document it here; the current app is still pre-release (`0.1.0`).
- Promote the same reviewed source commit from local review to private testing to public release. Do not rebuild from an unrecorded working tree for a store upload.
- Tag public source releases (for example, `mobile-vX.Y.Z`) and retain the matching build record.
- Keep web deployment versioning independent from mobile store versions, while noting shared calculation-engine changes in both release notes when relevant.

## Current readiness

| Area | Current state | Remaining work |
|---|---|---|
| Website | Existing static deployment workflow documented in the root README | Continue the normal pull request and deployment process |
| Mobile web app | Ionic Vue app and production build command exist | Continue phone and accessibility review |
| Android project | Capacitor project is generated; debug APK and unsigned release AAB builds succeed | Review on a physical device; configure an owner-controlled upload key only for a future store submission |
| iOS project | Capacitor project is generated; unsigned iOS Simulator build succeeds with Xcode | Review on a simulator and physical device; configure signing only in Xcode/account tooling when authorized |
| Store publication | Not configured or verified in this repository | Confirm publisher accounts, policy requirements, listing content, privacy materials, signing ownership, and owner approval |

Update this table as evidence becomes available. Do not mark a platform ready for publication based only on a successful web build.
