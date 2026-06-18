# 🔌 PlugIdle

An installable **idle game about plugging in cords**, built as a Progressive Web App (PWA). Tap the socket to plug in cords, buy auto-pluggers, unlock upgrades, catch power surges, chase achievements, and recycle your empire for permanent prestige bonuses. Pure vanilla JS — no frameworks, no build step, no dependencies. Works offline and installs to your phone's home screen.

## ▶️ Play

**Play now (no install needed): https://nickoverstreet.github.io/PlugIdle/**

Open it on your phone and tap away. To keep it as an app icon that launches fullscreen and works offline, use your browser's **"Add to Home Screen"**.

### Run it locally

It's a fully static site, but a web server is required so the service worker can register (opening `index.html` via `file://` won't enable offline/install):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## 🎮 Gameplay

- **Tap the socket** to plug in cords by hand and earn ⚡ watts.
- **Buy cord generators** — from humble USB-A cables past the Omega Cord to the Genesis Patch — that plug themselves in automatically for passive watts/sec. **27 tiers** in all, the last of which (the Ouroboros Cord) carries no watts and instead boosts your prestige core gain.
- **Cord milestones**: every 25 of a cord you own **doubles** that cord's output — and every 100th milestone is a bigger **×10** instead of ×2. The next milestone is shown on each cord.
- **Upgrades** (46 of them) boost tap power, individual cord types, or all cords at once — including **synergy upgrades** where one cord's fleet boosts another.
- **⚡ Power Surges**: a spark randomly appears during play — tap it for an instant Overload, a Production Frenzy (×7), or a Click Frenzy (×10). Catch surges back-to-back for **chain bonuses**, and watch for the rare **Grid Storm** that sends surges rushing in for 90 seconds.
- **🧪 Challenges** (after your first prestige): six special runs with a twist — production halved, no tapping, USB-A only… — each rewarding a **permanent perk** like auto-buying or cheaper cords.
- **🔥 Daily streak**: checking in daily builds a streak with a production bonus — and missing a single day won't break it (48-hour forgiveness).
- **🏆 Goals**: 58 achievements that unlock as you hit milestones — each one permanently adds **+1% production** (the Grid Bonus), so chasing goals makes you stronger.
- **Offline earnings**: your cords keep working while you're away (50% efficiency, capped at 24h), shown in a "Welcome back" summary.
- **Recycle Plant (prestige)**: melt your whole operation into Prestige Cores for a permanent per-core production bonus (achievements, core upgrades, and surge stats carry over).
- **◆ Core Upgrades**: spend Prestige Cores on **permanent** boosts — bigger taps, more production, longer offline cap, faster/stronger surges, auto-tapping, auto-buying cords &amp; upgrades, core-gain accelerators, and more. Your per-core bonus is based on cores *ever earned*, so spending never lowers it.
- **🌀 ???**: at the bottom of the core shop sits a corrupted upgrade costing 1 quadrillion cores. `[DATA CORRUPTED] Do not plug in.` Those who do discover **the Voltlands** — a parallel idle-slayer world where you electrocute enemies for ⚡ volts, build a 10-weapon arsenal with zaps-per-second, fight bosses every 10th wave, and travel freely between worlds. Each world boosts the other: watts ever earned raise your zap power, and every boss killed permanently raises grid production.
- **At-a-glance prompts**: a pulsing notification dot lights up the Upgrade, More, and Arsenal tabs whenever you can afford something there, so you never miss a purchase. Temporary notifications scroll across a banner ticker under the header instead of covering the buttons you're tapping.
- **Settings**: toggle sound, haptics (vibration), animations, and scientific notation.

### Designed to be fun, not manipulative

The engagement mechanics are drawn from a survey of what makes idle games compelling (geometric cost curves, prestige loops, ownership milestones, "juice"/game-feel, surprise bonus events, achievement goals). It deliberately **avoids dark patterns** — no forced ads, no pay-to-win, no energy/stamina gates, and nothing that punishes you for not playing. **The web version has no monetization at all.** The Android app adds strictly optional rewarded ads (watch one only when *you* want a bonus) and fair convenience/cosmetic purchases. The iOS app ships those same in-app purchases (rewarded ads come in a later update) — and on every platform, everything in the game remains reachable for free.

## 💾 Saving

Progress autosaves and is stored **only on your device**, in two layers for durability:

- **IndexedDB** (primary) + a synchronous **localStorage** mirror.
- On load the two are reconciled by timestamp and the freshest is kept, so if one layer is evicted (e.g. iOS Safari clearing localStorage) the other restores your save.
- The game also requests **persistent-storage** permission to opt out of automatic eviction where the browser supports it.

You can also **export/import** a save code from Settings. Because saves are device-local, exporting is the only way to move progress between devices.

## 🧱 Tech & PWA details

- **Vanilla JS / HTML / CSS**, no dependencies and no build step.
- **Installable PWA**: `manifest.webmanifest` + a service worker (`sw.js`) that caches assets for offline play (network-first for navigations, cache-first for assets; bump the `CACHE` version in `sw.js` to ship asset updates to returning players).
- **App icons** are generated by a dependency-free pure-Python PNG encoder (no Pillow required).
- All asset paths and the service-worker scope are **relative**, so the app works correctly when served from a project subpath like `/PlugIdle/`.
- Content: **27 cord tiers · 46 upgrades · 23 core (prestige) upgrades · 6 challenges · 58 achievements · a hidden second world with 10 weapons + 12 zap upgrades**.

## 🚀 Deployment

The site auto-deploys to **GitHub Pages** via GitHub Actions. Every push to `main` runs `.github/workflows/deploy-pages.yml`, which uploads the repo as a Pages artifact and deploys it — no build step. The live URL is **https://nickoverstreet.github.io/PlugIdle/**.

> First-time setup only: GitHub Pages must be enabled once in **Settings → Pages → Source: GitHub Actions** (a one-time, human-only step GitHub requires). After that, deploys are automatic.

## 🤖 Android (Capacitor)

The game also builds as a native Android app via [Capacitor](https://capacitorjs.com) — same code, wrapped in a native shell with the web assets bundled inside the APK (see `GOAL.md` for the Play Store roadmap). The repo root stays the source of truth; `npm run build:www` stages the web files into a gitignored `www/` folder that Capacitor copies into the Android project.

```bash
npm install            # once: Capacitor CLI + Android platform
npm run sync           # stage www/ and copy into android/
npm run open:android   # open in Android Studio to build/run
```

Requires Android Studio (or an Android SDK + **JDK 17 or newer** — the Android Gradle plugin for SDK 36 won't run on JDK 11; point `JAVA_HOME` at a 17+ JDK such as the one bundled with Android Studio). To install a debug build on your own phone: `npm run sync` then `cd android && ./gradlew assembleDebug`, and sideload `android/app/build/outputs/apk/debug/app-debug.apk`. To build a release AAB for the Play Store: **Build → Generate Signed App Bundle** in Android Studio with your upload keystore (create one once and **back it up**).

Native niceties handled in code: the service worker is skipped inside the app (assets are already local), the Android back button saves and minimizes instead of killing the game, and the status bar + splash screen match the CRT theme. Launcher icons are generated by `scripts/make_android_assets.py` (same dependency-free PNG encoder as the PWA icons).

## 🍏 iOS (Capacitor)

The same Capacitor app also ships to the **Apple App Store** — **no Mac required**. Because the project is maintained on Windows, the iOS Xcode project is **generated in cloud CI ([Codemagic](https://codemagic.io)) on every build from declarative config and never committed** (only `android/` is committed; `ios/` and `www/` are build outputs). All iOS native config lives as code in the repo root, so a from-scratch CI build is fully reproducible.

Codemagic builds on a macOS runner: `npm ci` → exclude the AdMob plugin (so its pod never enters the Podfile) → `npm run build:www` → `npx cap add ios` (ephemeral) → `npx @capacitor/assets generate --ios` (icon + CRT-dark splash from `assets/`) → `scripts/patch-ios-plist.sh` (PlistBuddy: portrait lock, display name, export-compliance exempt) → `npx cap sync ios` → `pod install` → automatic signing via an App Store Connect API key → `build-ipa` → upload to **TestFlight**. Triggered on `v*` git tags (and manually). Signing secrets live in Codemagic, never in the repo.

The iOS v1.0 ships **in-app purchases only** (the same six products as Android, via Apple IAP); rewarded ads are deferred to v1.1, so the Google Mobile Ads SDK is excluded from the iOS build. See `GOAL.md` ("iOS App Store Launch") and `store/app-store-connect-checklist.md` for the full pipeline and the App Store Connect setup.

## 📁 Project structure

```
index.html                       # markup / layout
css/style.css                    # mobile-first styling
js/game.js                       # all game logic (vanilla JS, no deps)
js/monetize.js                   # native-only ads/IAP facade (no-op on the web)
fonts/                           # self-hosted fonts (offline + native app)
manifest.webmanifest             # PWA metadata
sw.js                            # service worker (offline caching + installability)
.nojekyll                        # serve files as-is (skip Jekyll processing)
icons/                           # app icons: 192, 512, and maskable 512
assets/                          # @capacitor/assets source (1024 icon + splash) for iOS
scripts/make_icons.py            # regenerates the icons (pure-Python PNG encoder)
scripts/make_android_assets.py   # regenerates Android launcher icons
scripts/build-www.mjs            # stages web assets into www/ for Capacitor
scripts/patch-ios-plist.sh       # stamps iOS Info.plist keys in CI (PlistBuddy)
capacitor.config.json            # Capacitor app id / webDir config
android/                         # native Android project (Capacitor; committed)
codemagic.yaml                   # Codemagic CI: builds the iOS app (ios/ is CI-generated)
GOAL.md                          # Play Store + App Store launch & growth sprint plan
.github/workflows/deploy-pages.yml  # GitHub Pages deploy on push to main
```

## 🎨 Regenerating icons

The icons are committed, but if you tweak the design in `scripts/make_icons.py`, regenerate them with:

```bash
python3 scripts/make_icons.py
```

It writes `icons/icon-192.png`, `icons/icon-512.png`, and `icons/icon-maskable-512.png` using only the Python standard library.
