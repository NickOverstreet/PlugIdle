# PlugIdle — App Store Connect listing (copy-paste source)

Generated for iOS app **v1.1.4**. All content counts verified against `js/game.js`.
Screenshots live next to this file (`iphone-6.5/`, `ipad-13/`).

> Note: the iOS build ships **optional rewarded ads + 6 IAPs + App Tracking
> Transparency** (confirmed in `js/monetize.js`). The copy below frames ads as
> opt-in only and never claims "ad-free." App Privacy MUST declare AdMob data
> collection + **Tracking = Yes** to match.

---

## Promotional Text (136 / 170)

```
Plug in. Power up. Prestige. A cozy retro CRT idle clicker — no forced ads, no pay-to-win, and every single thing is reachable for free.
```

## Keywords (98 / 100 — 13 tokens, no spaces)

```
incremental,tapper,tycoon,prestige,offline,watt,upgrade,electric,simulator,casual,cozy,grid,unlock
```

Deliberately omits words already indexed via the name/subtitle (idle, cord,
clicker, chill, retro) and avoids "free"/category words.

## Description (3155 / 4000)

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

---

## URLs & metadata

| Field | Value |
|---|---|
| **Support URL** | `https://nickoverstreet.github.io/PlugIdle/` |
| **Marketing URL** | `https://nickoverstreet.github.io/PlugIdle/` |
| **Privacy Policy URL** | `https://nickoverstreet.github.io/PlugIdle/privacy.html` |
| **Copyright** | `2026 Nick Overstreet` (ASC prepends the © automatically) |
| **Routing App Coverage File** | **Leave blank — not applicable.** Only for Navigation-category apps that provide point-to-point transit routing (a .geojson coverage file). PlugIdle has no routing/maps. |

---

## App Review Information → Notes (check "Sign-in not required")

```
PlugIdle is a fully self-contained native idle/incremental game built with Capacitor (WKWebView) — NOT a thin web wrapper around a website. All gameplay runs on-device and entirely offline: there is no companion website to mirror, no login, and no account. To verify, enable Airplane Mode — the whole game keeps working. Navigation is via the in-app tab bar; no browser chrome is shown.

Content depth: 27 cord generators, 46 upgrades with synergies, 23 permanent prestige upgrades, 6 challenge runs that grant permanent perks, timed power-surge events, 69 achievements, device-local saves with export codes, and a hidden second mode.

In-app purchases (Guideline 3.1.1): All 6 products sell digital goods consumed entirely within the app (a production boost, two time-skips, a cosmetic theme pack, a core grant, and a supporter tip) and are sold exclusively through Apple In-App Purchase. There are no external purchase links or alternative payment methods. To test: open the in-game store (MORE tab → Power Store), tap any product to trigger the Apple sandbox purchase sheet; the entitlement is granted locally on success.

Ads & tracking (Guideline 5.1.2 / ATT): The app shows optional rewarded ads only — the player taps a button to watch one ad in exchange for an in-game reward. Ads never interrupt play and are fully opt-in; there are no banners or interstitials. Before the first ad, the app presents the standard App Tracking Transparency prompt. The entire game is playable whether the user allows or denies tracking. This matches the App Privacy declaration (data collected for Third-Party Advertising; Tracking = Yes) and the privacy policy at https://nickoverstreet.github.io/PlugIdle/privacy.html. There is no first-party analytics and no server.

Orientation is portrait-locked. Export compliance: ITSAppUsesNonExemptEncryption = NO (exempt). Bundle ID: com.ignyte.plugidle.
```

---

## Screenshot set (portrait, pixel-exact, PNG, no alpha)

**iPhone 6.5″ — 1242 × 2688** (`iphone-6.5/`) · **iPad 13″ — 2048 × 2732** (`ipad-13/`)

1. `01-plug.png` — main Plug tab: socket, watts, bulk-buy bar, cord ladder
2. `02-cords.png` — Plug tab scrolled through the cord generators
3. `03-upgrades.png` — Upgrades grid (owned + buyable, with synergies)
4. `04-recycle.png` — Recycle Plant prestige offer + Core Upgrades shop
5. `05-goals.png` — Achievements (shows 31/69 unlocked)

Captured from a seeded mid-game save (42T watts, ◆30 cores, +275% Grid Bonus,
+345-core prestige offer). The hidden second world stays hidden (its tabs are
not shown). No IAP/ads UI appears because those only render in the native build.
