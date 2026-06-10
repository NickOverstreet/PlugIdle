# GOAL.md — PlugIdle: Android Launch & Growth Plan

## Vision

Ship **PlugIdle** to the Google Play Store as a free Android game built entirely with
web technologies, earn revenue through **opt-in rewarded ads** and **fair
microtransactions**, and grow a player base with regular content updates.

One codebase serves both targets:

- **Web (today):** GitHub Pages PWA at https://nickoverstreet.github.io/pwa-webapp/
- **Android (new):** the same HTML/CSS/JS wrapped in a **Capacitor** native shell,
  with the web assets bundled inside the APK so the game works fully offline.

Version 1 of the game is feature-complete (24 cord generators, 37 upgrades,
44 achievements, prestige loop, power surges, offline earnings). The work below is
about **packaging, monetizing, launching, and then growing** it.

### Monetization principles

The README promises "no dark patterns" — we keep that promise while still earning:

- **Ads are rewarded-only.** Players choose to watch an ad for a bonus. No banners,
  no interstitials, no forced ads, ever.
- **No pay-to-win walls.** Every purchase is a convenience or a cosmetic; everything
  in the game remains reachable for free.
- **No energy gates, no pay-to-skip-the-fun.** Same game as today, plus optional extras.

(Update the README's "no monetization" line to "no forced ads, no pay-to-win" when
monetization lands, so the public promise stays honest.)

---

## Architecture

### Wrapper: Capacitor

- Add `package.json`, `capacitor.config.ts`, and an `android/` native project via
  `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`.
- Web assets stay at the repo root so the existing GitHub Pages deploy
  (`.github/workflows/deploy-pages.yml`) is untouched. A small `build-www` npm script
  stages `index.html`, `js/`, `css/`, `icons/`, and `manifest.webmanifest` into a
  **gitignored `www/`** directory used as Capacitor's `webDir` (pointing `webDir` at
  the repo root would recursively copy `android/` into itself).
- **Skip service-worker registration inside Capacitor** (`Capacitor.isNativePlatform()`)
  — assets are already local, and a stale SW cache inside a native shell only causes pain.
- **Platform-gate all native features** (ads, billing) behind
  `Capacitor.isNativePlatform()` so the web PWA keeps working exactly as it does now,
  ad-free and IAP-free.
- Saves: the existing IndexedDB + localStorage save system works unchanged in
  Capacitor's WebView. The existing **export/import save codes** double as the
  web ↔ Android transfer mechanism for v1 (cloud save comes later).

### Monetization stack

| Concern | Choice |
|---|---|
| Rewarded ads | `@capacitor-community/admob` (includes Google UMP consent flow for EEA/UK) |
| In-app purchases | Google Play Billing via **`cordova-plugin-purchase`** — no third-party account or API key needed, works immediately with Play license testers (chosen over RevenueCat for ship-speed; can migrate later if server-side receipt validation becomes worth it) |
| Entitlement storage | Existing IndexedDB save (idempotent grants), plus a "Restore purchases" button that re-syncs from the store |
| Bridge module | `js/monetize.js` — single facade the game talks to; reports unavailable on the web so the PWA renders zero monetization UI |

### Rewarded ad placements (opt-in, daily-capped)

1. **Double offline earnings** — button on the "Welcome back" summary.
2. **2× production for 10 minutes** — button in the Plug tab, ~3/day cap.
3. **Summon a power surge** — instantly trigger a surge event, ~2/day cap.

### IAP catalog (v1)

| SKU | Type | Grants |
|---|---|---|
| `supporter_pack` | non-consumable | Supporter badge + one free rewarded-bonus auto-claim per day (since there are no forced ads to remove, "Supporter" framing converts better than "Remove Ads") |
| `boost_production_25` | non-consumable | +25% production forever (plugs into the existing global-multiplier system in `js/game.js`) |
| `starter_cores` | non-consumable | Small grant of Prestige Cores ◆ |
| `timewarp_4h` | consumable | Instantly award 4 hours of production |
| `timewarp_24h` | consumable | Instantly award 24 hours of production |
| `theme_pack_phosphor` | non-consumable | Amber / blue-phosphor / vaporwave CRT themes (CSS variable swaps in `css/style.css`) |

---

## Sprint Plan (aggressive — ship ASAP)

Solo dev, one-week sprints. **The critical path is Google's closed-testing
requirement:** new personal Play Console accounts must run a closed test with
**12 testers opted in for 14 continuous days** before they can apply for production
access. Everything is sequenced to start that clock as early as possible, and the
forced 14-day wait is used to build monetization — so v1.0 launches *with* ads and
IAP without delaying the launch date.

### Sprint 0 — Accounts & clocks start (≈1 day, do immediately)

- [ ] Register a **Google Play Console** developer account ($25 one-time). Identity
      verification can take days — start now.
- [ ] Register an **AdMob** account and create the app entry (approval also takes days).
- [ ] Start recruiting **12+ closed-test testers** (friends, family, r/incremental_games,
      idle-game Discords). This is the long pole; over-recruit to ~20.
- [ ] Install Android Studio + SDK locally.

**Exit criteria:** both accounts created and under verification; tester list growing.

### Sprint 1 — Capacitor wrapper

- [x] `npm init` + install `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`
      (Capacitor 8, targets SDK 36).
- [x] Add the `build-www` staging script (`scripts/build-www.mjs`) and set
      `webDir: 'www'`; gitignore `www/` and Android build outputs.
- [x] `npx cap add android` — native project committed under `android/`.
- [ ] Build and run on a real device; verify saves persist across app restarts.
- [x] Guard SW registration for native (skipped inside Capacitor).
- [x] Native polish: Android back button saves + minimizes instead of exiting,
      status bar matches the CRT theme, portrait lock, CRT-dark splash screen.
- [x] Launcher icons at all densities via `scripts/make_android_assets.py`
      (reuses the dependency-free PNG encoder); fonts self-hosted so the app
      renders correctly offline.
- [ ] Create a release keystore (**back it up — losing it means losing the app
      listing**), build a signed **AAB** in Android Studio.

**Exit criteria:** signed release AAB of the full game running natively on a device.

### Sprint 2 — Store readiness & start the 14-day clock

- [x] Write a **privacy policy** — `privacy.html`, linked from the in-game settings;
      live at `/pwa-webapp/privacy.html` once merged to `main`.
- [x] Store listing copy + assets prepared: `store/listing.md` (title, short/full
      description with ASO keywords, screenshot shot list) and
      `store/feature-graphic.png` (regenerate via `scripts/make_store_assets.py`);
      512px icon = `icons/icon-maskable-512.png`.
- [x] Console form answers prepared: `store/play-console-checklist.md` (Data Safety,
      IARC content rating, ads/target-audience declarations, SKU list, app-ads.txt).
- [ ] Fill in the Play Console forms using the checklist; take 4–8 phone screenshots
      per the shot list.
- [ ] Upload the AAB to the **closed testing** track; enroll Google Play App Signing.
- [ ] Get **12+ testers opted in** and confirm the 14-day counter is running.
- [ ] Set up a feedback channel (Google Form or Discord).

**Exit criteria:** closed test live, ≥12 testers opted in, **14-day clock running.**

### Sprint 3 — Monetization (built during the mandatory 14-day wait)

- [x] `@capacitor-community/admob` integrated via `js/monetize.js`: UMP consent on
      first launch, three rewarded placements (double offline earnings, ×2 boost
      10m — 3/day, summon surge — 2/day). Running on Google **test ad units**;
      swap the `TODO(launch)` IDs in `js/monetize.js` + `AndroidManifest.xml`.
- [x] Play Billing integrated via `cordova-plugin-purchase`: all six SKUs wired with
      purchase + restore flows; entitlements persist in the save (idempotent grants).
- [x] **Power Store** section in the More tab (CRT-styled), revealed only inside the
      native shell; supporter daily claim; restore-purchases button.
- [x] Theme pack implemented (Amber / Ice / Vapor CSS-variable themes, picker in
      settings once owned) and time-warp grant logic.
- [ ] Create the six SKUs in Play Console (names/prices in
      `store/play-console-checklist.md`) and add license testers.
- [ ] Test ads + purchases end-to-end on a device on the closed track.
- [ ] Push the monetization build to closed testing; gather balance/UX feedback.

**Exit criteria:** rewarded ads and all six IAPs working in the closed-test build.

### Sprint 4 — Launch

- [ ] Triage tester feedback; fix crashes and any save-loss reports (launch blockers),
      defer the rest.
- [ ] Swap AdMob test ad units for production units; verify the ads declaration and
      Data Safety form match reality.
- [ ] Publish `app-ads.txt` for AdMob (must live at the **domain root** —
      `nickoverstreet.github.io/app-ads.txt` via a user-site repo, not under
      `/pwa-webapp/`).
- [ ] After the 14 days: **apply for production access**, then release v1.0 with a
      **staged rollout** (20% → 50% → 100%) while watching Play Console vitals
      (crash-free target ≥ 99.5%).
- [ ] Announce: r/incremental_games launch post, itch.io page pointing to Play,
      "Get it on Google Play" badge on the web version.

**Exit criteria:** PlugIdle live in production on Google Play.

### Sprint 5+ — Content & growth (recurring post-launch)

Update cadence target: a meaningful update every 4–6 weeks.

**Shipped early (pre-launch, v1.11):** prestige rebalance (cbrt + softcap — see
`research/balance-report.md`), achievements → +1% production each (Grid Bonus),
6 challenge runs with permanent perks (incl. auto-buy), daily streak with 48h
forgiveness, surge chains + Grid Storm, 2 post-Omega cord tiers + 4 upgrades +
6 achievements.

**Also shipped pre-launch (v1.12 — "The Wormhole Update"):** the second
progression layer landed as the **???** core upgrade (1e15 cores, reachable via
the new core-accelerator ladder ~330 bot-hours in) which opens **the Voltlands**
— a parallel idle-slayer world (zaps/sec, 10 weapons, 12 zap upgrades, waves +
bosses, two-way travel, cross-world synergy buffs, 8 achievements).

Remaining backlog, roughly in order:

- **v1.1 — Retention:** push-notification opt-in ("your rig is at the offline cap").
- **v1.2 — Content:** more challenges, another cord wave, Voltlands depth
  (its own prestige loop, weapon evolutions, named elite enemies).
- **v1.3 — Social:** Google Play Games Services — achievements, leaderboards
  (total watts, fastest prestige), **cloud save** (replaces manual codes on Android).
- **v1.4 — Events:** timed weekend events (e.g., "Surge Storm" — 2× surge frequency),
  seasonal themes; more cosmetic IAP.
- **Ongoing:** respond to every review in the first months, iterate store listing/ASO
  (screenshots, keywords) off conversion data, watch Android vitals, raise rewarded-ad
  caps or placements only if engagement data says players want more.

---

## Risks & gotchas

| Risk | Mitigation |
|---|---|
| **12-tester / 14-day rule** is the critical path | Start Sprint 0 immediately; over-recruit to ~20 testers; build monetization during the wait |
| Losing the release keystore = losing the app | Enroll Google Play App Signing; back up the upload key offline |
| `app-ads.txt` must be at the domain root | Needs a `nickoverstreet.github.io` user-site repo; the project subpath won't work |
| EEA/UK consent for ads | Ship the UMP consent flow with the first ads build, not after |
| Target-API deadlines move yearly | Check Play Console's current requirement at every release |
| Web ↔ Android save divergence | Keep one save schema; gate native-only fields; export/import codes remain the bridge until cloud save |
| AdMob account limited for invalid traffic | Use test ad units for all development; never tap your own production ads |
| Data Safety / ads-declaration mismatch → rejection | Declare AdMob data collection in Sprint 2, before the ads build ships |

## Success metrics

| Metric | Target |
|---|---|
| Production launch | ≤ ~5 weeks from Sprint 0 (14-day test window included) |
| Crash-free sessions | ≥ 99.5% |
| Play Store rating | ≥ 4.5 |
| D1 / D7 retention | ≥ 35% / ≥ 12% (healthy for idle) |
| Rewarded-ad engagement | ≥ 30% of DAU watch ≥ 1 ad/day |
| Revenue | First payout milestone, then ARPDAU trend up via content updates |
