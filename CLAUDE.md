# CLAUDE.md — PlugIdle project notes

PlugIdle is a vanilla-JS PWA idle game (no build step, no framework) that also
ships as a native Android app via Capacitor. Web assets live at the repo root;
`npm run build:www` stages them into a gitignored `www/` that Capacitor copies
into `android/`. See `README.md` for gameplay/tech and `GOAL.md` for the launch plan.

## Versioning — every place the app version lives

Run `npm run bump -- <major.minor.patch>` to update all of these at once
(`scripts/bump-version.mjs`); add `--tag` to also commit, tag `v<version>`, and
push — which triggers the Codemagic build of **both** stores. The fields it edits,
which must agree so the store build, the package metadata, and the in-game
settings page all match:

| Where | Field | Notes |
|---|---|---|
| `package.json` | `"version"` | npm package version |
| `package-lock.json` | root `"version"` **and** `packages[""].version` | two spots; keep both in sync with package.json |
| `js/game.js` | `const VERSION` | the string shown on the settings page ("PlugIdle vX.Y.Z") |
| `android/app/build.gradle` | `versionName` | the version players see on the Play Store |

Current version: **0.14.5** (pre-release; intentionally on the 0.x line until launch).

### Do NOT confuse these with the app version
- `android/app/build.gradle` → `versionCode`: a monotonic **integer** counter for
  Play Store uploads. It is NOT a semver. **You no longer bump this by hand** —
  the `android-release` Codemagic workflow passes `-PversionCode=$PROJECT_BUILD_NUMBER`,
  so each upload gets a unique, strictly-increasing code automatically. The
  committed value (`3`) is just the local fallback for builds outside CI.
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
  `npm ci` → `build:www` → `npx cap add ios` →
  `npx @capacitor/assets generate --ios` → `scripts/patch-ios-plist.sh` →
  `npx cap sync ios` → `pod install` → automatic signing (App Store Connect API
  key) → `build-ipa` → publish to TestFlight. Signing secrets live in Codemagic,
  never in the repo.
- **One tag publishes both stores.** `codemagic.yaml` also has an `android-release`
  workflow on the same `v*.*.*` trigger: it stages the web assets, `cap sync android`,
  builds a signed AAB on Linux, and uploads to the
  Google Play **internal** track via a service-account JSON. So `npm run bump -- X --tag`
  fires both the iOS and Android builds at once. The Android upload keystore and the
  `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` JSON live in Codemagic; see the setup footer in
  `codemagic.yaml`. Note Google rejects API uploads until the **first** AAB is uploaded
  to Play Console by hand.
- **Monetization is platform-gated** (`js/monetize.js`): a single `storePlatform()`
  helper resolves to `Platform.GOOGLE_PLAY` on Android and `Platform.APPLE_APPSTORE`
  on iOS; the same six product-ID strings are reused so the catalog never diverges.
  **Rewarded ads ship on both Android and iOS** — `adsAvailable()` is true on both
  native platforms (false on the web). `js/monetize.js` picks the platform's AdMob
  test rewarded unit; `scripts/patch-ios-plist.sh` stamps the iOS
  `GADApplicationIdentifier` (mandatory), the ATT `NSUserTrackingUsageDescription`,
  and SKAdNetwork items. **Still on TEST ad units** (swap real IDs before launch),
  and **iOS App Privacy must now declare AdMob data collection + Tracking** in App
  Store Connect (no longer "Data Not Collected").
- **Icons + splash:** `npx @capacitor/assets generate --ios` builds the iOS asset
  catalog from `assets/icon.png` (1024×1024) on a `#070a0f` CRT-dark background.
- **Info.plist:** `scripts/patch-ios-plist.sh` (PlistBuddy, runs in CI after
  `cap add ios`) stamps `CFBundleDisplayName`, portrait-only orientation, and
  `ITSAppUsesNonExemptEncryption = NO` (export-compliance exempt), and — now that
  iOS ships ads — `GADApplicationIdentifier`, `NSUserTrackingUsageDescription`
  (ATT), and `SKAdNetworkItems`.
- App Store Connect setup + listing copy: `store/app-store-connect-checklist.md`
  and `store/app-store-listing.md`. The iOS build now ships **IAP + rewarded ads**.
