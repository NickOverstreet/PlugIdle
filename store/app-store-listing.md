# App Store Listing — PlugIdle (iOS)

Copy-paste source for the App Store Connect listing. Mirrors the Play listing in
`store/listing.md`. The iOS build ships **in-app purchases _and_ optional rewarded
AdMob ads with App Tracking Transparency** — the same monetization posture as
Android (`js/monetize.js` returns `adsAvailable: true` on both native platforms).
So the copy frames ads as **opt-in only** and never claims "ad-free"; the
no-dark-patterns promise is **no _forced_ ads / no pay-to-win**. Character limits
noted per field. Content counts are verified against `js/game.js`.

> **Do not claim the app is ad-free.** Ads on iOS is a settled decision (see
> `CLAUDE.md` → iOS, `privacy.html`, and `store/app-store-connect-checklist.md`).
> The App Privacy questionnaire must declare AdMob data collection + **Tracking =
> Yes**; a "no ads" listing would contradict that label and risk rejection.

## App name (30 chars max)

```
PlugIdle - Idle Cord Clicker
```

## Subtitle (30 chars max)

```
Chill retro idle clicker
```

## Promotional text (170 chars max) — 136

```
Plug in. Power up. Prestige. A cozy retro CRT idle clicker — no forced ads, no pay-to-win, and every single thing is reachable for free.
```

## Description (4000 chars max) — 3155

```
Plug in. Power up. Prestige.

There's a stupidly deep satisfaction in shoving a cord into a socket and watching the watts pour out. PlugIdle is built entirely around that feeling - a cozy retro idle game dressed up like an old CRT terminal, all phosphor green and quiet scanline hum. Tap to plug. Buy machines to plug for you. Walk away. Come back richer.

THE LOOP
Tap a socket to plug cords by hand for watts. Then buy cord generators that auto-plug while you do literally anything else - yes, even while the app is closed. Stack upgrades, catch the timed power surges as they crackle past, and when your grid is humming, recycle the whole thing to prestige for permanent boosts. Number goes up. Brain goes brrr.

27 CORD GENERATORS
From a humble USB-A (always upside down) all the way up to the reality-bending Omega Cord, the Genesis Patch, and a final "Ouroboros" cord. Every cord plugs itself in and earns watts per second - even while you're away.

46 UPGRADES + SYNERGIES
Boost tap power, double individual cords, multiply everything at once, and unlock sneaky synergies where one cord's fleet supercharges another.

POWER SURGES
A spark crackles past - tap it fast! Production Frenzies and Click Frenzies reward being there at the right moment, chain your catches for bigger payouts, and ride the rare GRID STORM.

6 CHALLENGE RUNS
Production halved. Tapping disabled. USB-A only. Beat a twisted run and keep a PERMANENT perk - auto-buying, cheaper cords, faster surges, and more.

23 CORE UPGRADES
Melt your operation into Prestige Cores for a permanent production bonus, then climb back faster. Spend cores on 23 permanent upgrades - bigger taps, longer offline cap, auto-tap, auto-buy, faster surges. Your bonus never goes down.

69 ACHIEVEMENTS = REAL POWER
Every achievement permanently adds +1% production to your Grid Bonus, kept forever across prestiges. Plus a daily check-in streak with a generous 48-hour forgiveness window, so one missed day won't wipe your run.

TRULY IDLE
Your cords keep earning while you're gone (capped, so it stays fair) and greet you with a tidy "welcome back" report when you return. No connection needed. Your save lives locally - export a code to move progress to another phone. No account, no login, no nonsense.

AND THEN THERE'S ???
At the very bottom of the prestige shop sits something... corrupted. [DATA CORRUPTED]. We're not going to tell you what happens when you plug it in. Some grids are better left discovered.

FAIR BY DESIGN
Every single thing in PlugIdle is reachable for free. There are 6 optional in-app purchases - a production boost, a couple of time-skips, a cosmetic theme pack, and a tip jar - but they're conveniences, never pay-to-win.

ABOUT ADS
No forced ads. No banners. No interstitials popping up mid-tap. Ads here are 100% optional and opt-in: if you want a quick in-game bonus, you tap a button to watch one rewarded ad - and that's the only time you'll see one. (Before ads run, iOS will ask your tracking preference via the standard App Tracking Transparency prompt.)

Cozy numbers. Satisfying cords. A grid that runs while you live your life.

Plug in. Power up. Prestige.
```

## Keywords (100 chars max, comma-separated, NO spaces) — 98

```
incremental,tapper,tycoon,prestige,offline,watt,upgrade,electric,simulator,casual,cozy,grid,unlock
```

Omits words already indexed via the name/subtitle (idle, cord, clicker, chill,
retro) and avoids "free"/category words, so the 100-char budget isn't wasted.

## What's New (version notes)

```
The full PlugIdle idle game, native and fully offline: 27 cords, 46 upgrades, 6 challenge runs, 23 prestige upgrades, 69 achievements, prestige, power surges, and a secret waiting at the bottom of the core shop. Optional rewarded ads and in-app purchases — everything is still reachable for free.
```

## URLs & contact

- **Support URL:** https://nickoverstreet.github.io/PlugIdle/
- **Marketing URL:** https://nickoverstreet.github.io/PlugIdle/
- **Privacy Policy URL:** https://nickoverstreet.github.io/PlugIdle/privacy.html
- **Copyright:** `2026 Nick Overstreet` (App Store Connect prepends the © automatically)
- **Contact email:** nickcoverstreet@gmail.com

## Categorization

- **Primary category:** Games → Casual
- **Secondary category (optional):** Games → Simulation

## Routing App Coverage File

**Leave blank — not applicable.** This field is only for Navigation-category apps
that provide point-to-point transit routing (you upload a `.geojson` coverage map).
PlugIdle has no routing or maps, so nothing is uploaded.

## Screenshots

Portrait, pixel-exact, PNG, no alpha. Generated into `store/screenshots/` from a
seeded mid-game save (42T watts, ◆30 cores, +275% Grid Bonus, +345-core prestige
offer); the hidden second world stays hidden (its tabs aren't shown).

| Display | Pixels (portrait) | Folder |
|---|---|---|
| iPhone 6.9″ | 1320 × 2868 | `store/screenshots/iphone-6.9/` |
| iPhone 6.7″ | 1290 × 2796 | `store/screenshots/iphone-6.7/` |
| iPhone 6.5″ | 1242 × 2688 | `store/screenshots/iphone-6.5/` |
| iPad 13″ | 2048 × 2732 | `store/screenshots/ipad-13/` |

Apple's **current required** iPhone size is **6.9″**; **6.7″** is still accepted, and
**6.5″** uploads to its own slot. Upload the 6.9″ set as primary; smaller iPhone sizes
auto-scale. The iPad 13″ set fills the slot for **iPad** (the app renders a wide
tablet layout, not a stretched phone column).

Shot list (same five per size):

1. `01-plug.png` — Plug tab: socket, watts, bulk-buy bar, cord ladder with milestones.
2. `02-cords.png` — Plug tab scrolled through the cord generators.
3. `03-upgrades.png` — Upgrades grid (owned + buyable, with synergies).
4. `04-recycle.png` — Recycle Plant prestige offer + Core Upgrades shop.
5. `05-goals.png` — Achievements (shows 31/69 unlocked).

Note: the IAP "Power Store" and ad buttons only render in the native build, so they
don't appear in these web-captured shots (Apple doesn't require a store screenshot).

## App Review notes

See `store/app-store-connect-checklist.md` §10 and `store/screenshots/LISTING.md`.
The notes pre-empt Guideline 4.2 (fully native + offline — verify via Airplane Mode),
confirm 3.1.1 (6 IAPs, Apple-only), and cover 5.1.2 / ATT (opt-in rewarded ads +
tracking prompt). Set **"Sign-in not required."**

## Notes vs. the Play listing

- **Same monetization on both stores now.** iOS ships the same six IAPs **and**
  optional rewarded ads as Android (`js/monetize.js` → `adsAvailable: true` on both).
  The earlier "iOS v1.0 = IAP only, no ads" posture is **obsolete**; the "ABOUT ADS"
  block frames ads as opt-in and the App Privacy form must declare Tracking = Yes.
- **App icon:** the 1024×1024 marketing icon is generated into the iOS asset catalog
  by `@capacitor/assets` from `assets/icon.png` (no separate ASC upload needed if the
  build carries the marketing icon).
- **IAP** mirrors Android (same six product IDs); see
  `store/app-store-connect-checklist.md`.
- **Content counts** are verified against `js/game.js`: 27 cords, 46 upgrades, 23 core
  upgrades, 6 visible Grid challenge runs, 69 achievements, 6 IAPs. (The hidden second
  world adds more challenges/content — kept out of the public copy on purpose.)
```

