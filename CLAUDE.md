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
  semver. Bump it when shipping changed web assets so returning PWA players get
  the update. The Android APK rebundles assets fresh each `npm run sync`, so it's
  unaffected by this. (Note: it has lagged behind asset changes historically.)

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
