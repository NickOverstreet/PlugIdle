# App Store Listing — PlugIdle (iOS)

Copy-paste source for the App Store Connect listing. Mirrors the Play listing in
`store/listing.md`, with Google-specific wording removed: the iOS v1.0 ships **IAP
only — no ads** (rewarded AdMob is deferred to v1.1), so the "rewarded ad" line is
dropped and the no-dark-patterns promise leads with **no forced ads / no pay-to-win**.
Character limits noted per field.

## App name (30 chars max)

```
PlugIdle - Idle Cord Clicker
```

## Subtitle (30 chars max)

```
Chill retro idle clicker
```

## Promotional text (170 chars max)

```
Plug in cords, earn watts, prestige! A chill retro CRT idle clicker. No forced ads, no pay-to-win — everything in the game is reachable for free.
```

## Description (4000 chars max)

```
Tap the socket. Plug in a cord. Feel the watts flow. ⚡

PlugIdle is a chill retro idle game about plugging in every type of cord
imaginable — from the humble USB-A cable (always upside down) all the way to
the reality-bending Omega Cord. Buy cord generators that plug themselves in,
stack upgrades, catch power surges, and recycle your whole empire for
permanent prestige bonuses.

It looks like a CRT terminal, plays like a pocket power plant, and respects
your time AND your wallet.

🔌 27 CORD GENERATORS
Start with USB cables and audio jacks. End with quantum links, wormhole
jacks, and cosmic strings — and discover what plugs in BEYOND the final
plug. Every cord plugs itself in and earns watts per second — even while
you're away.

⬆️ 46 UPGRADES + SYNERGIES
Boost your tap power, double individual cords, multiply everything at once,
and unlock synergies where one cord's fleet supercharges another.

⚡ POWER SURGES & CHAINS
A spark appears — tap it fast! Overloads, Production Frenzies (×7), and
Click Frenzies (×10) reward you for being there at the right moment. Chain
catches for bigger payouts, and ride the rare GRID STORM.

🧪 6 CHALLENGE RUNS
Production halved. Tapping disabled. USB-A only. Beat a twisted run to earn
a PERMANENT perk — auto-buying, cheaper cords, faster surges, and more.

♻️ PRESTIGE THAT FEELS GOOD
Melt your operation down into Prestige Cores for a permanent production
bonus, then climb back faster than ever. Spend cores on permanent upgrades —
bigger taps, longer offline earnings, auto-tapping, and more. Your bonus
never goes down.

🏆 58 ACHIEVEMENTS = REAL POWER
Every achievement permanently adds +1% production (the Grid Bonus), kept
forever across prestiges. And a daily check-in streak that FORGIVES a
missed day instead of punishing you.

🌀 AND THEN THERE'S "???"
At the bottom of the core shop sits a corrupted upgrade. [DATA CORRUPTED]
Do not plug in. (Plug it in.)

🌙 TRUE OFFLINE PLAY
No connection needed. Your cords keep working while you sleep, and a
"welcome back" report shows what you earned. Saves live on your device, with
export codes so you can move progress between devices.

🚫 NO DARK PATTERNS
• No forced ads — ever. No banners, no interstitials, nothing that nags.
• No energy bars, no timers that punish you for living your life.
• No pay-to-win. Optional purchases are conveniences and cosmetics; every
  single thing in the game is reachable for free.

Perfect for fans of idle games, incremental games, clicker games, and anyone
who has ever felt the deep satisfaction of a plug sliding into a socket.

Plug in. Power up. Prestige. 🔌⚡
```

## Keywords (100 chars max, comma-separated)

```
idle,clicker,incremental,cords,retro,CRT,offline,prestige,casual,tap
```

## What's New (version notes)

```
First App Store release of PlugIdle. The full idle game — 27 cords, 46
upgrades, 6 challenges, 58 achievements, prestige, and the hidden Voltlands —
running natively and fully offline.
```

## URLs & contact

- **Support URL:** https://nickoverstreet.github.io/PlugIdle/
- **Marketing URL:** https://nickoverstreet.github.io/PlugIdle/
- **Privacy Policy URL:** https://nickoverstreet.github.io/PlugIdle/privacy.html
- **Copyright:** © 2026 Nick Overstreet
- **Contact email:** nickcoverstreet@gmail.com

## Categorization

- **Primary category:** Games → Casual
- **Secondary category (optional):** Games → Simulation

## Screenshots

iPhone, **portrait**. Apple's current required size is **6.9″ (1320 × 2868 px)**;
**6.7″ (1290 × 2796 px)** is still accepted. Dimensions must be pixel-exact. No iPad
screenshots at launch (iPhone-only marketing — universal binary). Reuse the shot list
from `store/listing.md`:

1. **Plug tab** mid-game: socket + a healthy list of cord generators with affordable buys lit up.
2. **A power surge on screen** (the spark) or an active ×7 Frenzy buff bar — the action moment.
3. **Upgrades tab** with several affordable upgrades glowing.
4. **Recycle Plant** (More tab) showing a juicy "+N ◆ Cores" prestige offer.
5. **Achievements tab** with a good mix of unlocked goals.
6. (after the IAP UI is final) **Power Store** section — reinforces "optional purchases only".

Tip: load a mid-game save first (or import one) so numbers look alive; a fresh save
reads as empty.

## Notes vs. the Play listing

- **No "Watch a rewarded ad…" copy.** iOS v1.0 has no ads; the AdMob SDK is excluded
  from the iOS build (spec §6.3). The "NO DARK PATTERNS" block leads with no forced
  ads / no pay-to-win instead of the Android rewarded-ad framing.
- **App icon:** the 1024×1024 marketing icon is generated into the iOS asset catalog
  by `@capacitor/assets` from `assets/icon.png` (no separate upload needed in ASC if
  the build carries the marketing icon).
- **IAP** mirrors Android (same six product IDs); see `store/app-store-connect-checklist.md`.
