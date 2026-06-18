# CLAUDE.md — PlugIdle project notes

PlugIdle is a vanilla-JS PWA idle game (no build step, no framework) that also
ships as a native Android app via Capacitor. Web assets live at the repo root;
`npm run build:www` stages them into a gitignored `www/` that Capacitor copies
into `android/`. See `README.md` for gameplay/tech and `GOAL.md` for the launch plan.

## Versioning — every place the app version lives

When changing the app version, update **all** of these so the store build, the
package metadata, and the version shown on the in-game settings page agree:

| Where | Field | Notes |
|---|---|---|
| `package.json` | `"version"` | npm package version |
| `package-lock.json` | root `"version"` **and** `packages[""].version` | two spots; keep both in sync with package.json |
| `js/game.js` | `const VERSION` | the string shown on the settings page ("PlugIdle vX.Y.Z") |
| `android/app/build.gradle` | `versionName` | the version players see on the Play Store |

Current version: **0.14.0** (pre-release; intentionally on the 0.x line until launch).

### Do NOT confuse these with the app version
- `android/app/build.gradle` → `versionCode`: a monotonic **integer** counter for
  Play Store uploads (currently 3). It is NOT a semver — bump it (increment by 1)
  for every new upload to any Play track, independently of `versionName`.
- `android/variables.gradle` → `androidxWebkitVersion`: an AndroidX **library**
  version that has coincidentally matched the app version before. Never touch it
  when bumping the app version.
- `sw.js` → `CACHE` (e.g. `plugidle-vNN`): the service-worker cache key, not a
  semver. **You no longer bump this by hand** — the Pages deploy workflow
  (`.github/workflows/deploy-pages.yml`) rewrites it to the short commit SHA
  (`plugidle-<sha>`) in the deployed artifact, so every deploy invalidates the
  old cache and returning PWA players always get fresh assets. The committed
  value is just a placeholder. The Android APK rebundles assets fresh each
  `npm run sync`, so it's unaffected either way.

## Dev checks
- `node scripts/dev-smoke.mjs` — headless smoke test (boot, buy, prestige,
  Voltlands, save roundtrip). Run after touching `js/game.js`.
- `node --check js/game.js` — syntax check.

## Workflow notes
- Active dev branch: `claude/idle-game-ui-cleanup-oeg7ur`; changes are
  fast-forward merged to `main`. Pushing to `main` auto-deploys the web PWA via
  `.github/workflows/deploy-pages.yml`.
- After merging, the Android app needs `git pull` + `npm run sync` + a rebuild to
  pick up changes; `main` alone only updates the web build.

## iOS (Capacitor)

iOS is a **second native target** off the same web source — not a rewrite. The dev
has no Mac, so the iOS project is **generated in cloud CI (Codemagic) on every build
from declarative config** and never committed.

- **Never commit `ios/` or `www/`.** Both are build outputs. `www/` is staged by
  `npm run build:www`; `ios/` is created fresh by `npx cap add ios` in CI each build.
  Only `android/` is committed. All iOS native config lives as code in the repo root
  (`capacitor.config.json`, `scripts/patch-ios-plist.sh`, `assets/`, `codemagic.yaml`)
  so a from-scratch CI build is fully reproducible — never hand-edit a generated
  Xcode project.
- **Codemagic build flow** (`codemagic.yaml`, triggered on `v*` tags + manual):
  `npm ci` → remove the AdMob plugin from the ephemeral install (so its pod never
  enters the Podfile) → `build:www` → `npx cap add ios` →
  `npx @capacitor/assets generate --ios` → `scripts/patch-ios-plist.sh` →
  `npx cap sync ios` → `pod install` → automatic signing (App Store Connect API
  key) → `build-ipa` → publish to TestFlight. Signing secrets live in Codemagic,
  never in the repo.
- **Monetization is platform-gated** (`js/monetize.js`): a single `storePlatform()`
  helper resolves to `Platform.GOOGLE_PLAY` on Android and `Platform.APPLE_APPSTORE`
  on iOS; the same six product-ID strings are reused so the catalog never diverges.
  **Ads are Android-only at launch** — the Google Mobile Ads SDK is excluded from the
  iOS build (no IDFA / ATT / `GADApplicationIdentifier`), so `adsAvailable()` is false
  on iOS. AdMob on iOS returns in v1.1.
- **Icons + splash:** `npx @capacitor/assets generate --ios` builds the iOS asset
  catalog from `assets/icon.png` (1024×1024) on a `#070a0f` CRT-dark background.
- **Info.plist:** `scripts/patch-ios-plist.sh` (PlistBuddy, runs in CI after
  `cap add ios`) stamps `CFBundleDisplayName`, portrait-only orientation, and
  `ITSAppUsesNonExemptEncryption = NO` (export-compliance exempt). It deliberately
  adds **no** `NSUserTrackingUsageDescription` (no tracking at launch).
- App Store Connect setup + listing copy: `store/app-store-connect-checklist.md`
  and `store/app-store-listing.md`. The iOS launch is **IAP only**.
