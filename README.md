# 🔌 Cord Tycoon

An installable **idle game about plugging in cords**, built as a Progressive Web App (PWA). Tap the socket to plug in cords, buy auto-pluggers, unlock upgrades, and recycle your empire for permanent prestige bonuses. Works offline and installs to your phone's home screen.

## Play

It's a fully static site — no build step, no dependencies.

```bash
# Serve the folder over http (a server is required so the service worker can register)
python3 -m http.server 8000
# then open http://localhost:8000 on your phone or desktop
```

On mobile, use your browser's **"Add to Home Screen"** to install it as a standalone app.

## Gameplay

- **Tap the socket** to plug in cords by hand and earn ⚡ watts.
- **Buy cord generators** — from humble USB-A cables all the way to Quantum Links — that plug themselves in automatically for passive watts/sec.
- **Cord milestones**: every 25 of a cord you own **doubles** that cord's output, with the next milestone shown on each cord.
- **Upgrades** boost your tap power, individual cord types, or all cords at once.
- **⚡ Power Surges**: a spark randomly appears during play — tap it for an instant Overload, a Production Frenzy (×7), or a Click Frenzy (×10).
- **🏆 Goals**: a tab full of achievements that unlock as you hit milestones, giving you something to chase.
- **Offline earnings**: your cords keep working while you're away (50% efficiency, capped at 24h), shown in a "Welcome back" summary.
- **Recycle Plant (prestige)**: melt your whole operation into Prestige Cores for a permanent +5% bonus each (achievements and surge stats carry over).
- **Settings**: toggle sound, animations, and scientific notation.

### Designed to be fun, not manipulative

The engagement mechanics are drawn from a survey of what makes idle games compelling (geometric cost curves, prestige loops, ownership milestones, "juice"/game-feel, surprise bonus events, achievement goals). It deliberately **avoids dark patterns** — there's no monetization, no energy/stamina gates, no pay-to-skip, and nothing that punishes you for not playing. Surges and bonuses only ever reward being present.

## Saving

Progress autosaves and is stored **only on your device**, in two layers for durability:
- **IndexedDB** (primary) + a synchronous **localStorage** mirror.
- On load the two are reconciled by timestamp and the freshest is kept, so if one layer is evicted (e.g. iOS Safari clearing localStorage) the other restores your save.
- The game also requests **persistent-storage** permission to opt out of automatic eviction where the browser supports it.

You can also **export/import** a save code from Settings.

## Project structure

```
index.html              # markup / layout
css/style.css           # mobile-first styling
js/game.js              # all game logic (vanilla JS, no deps)
manifest.webmanifest    # PWA metadata
sw.js                   # service worker (offline caching)
icons/                  # app icons (192, 512, maskable)
scripts/make_icons.py   # regenerates icons (pure-Python PNG encoder, no deps)
```

To regenerate icons after tweaking the design: `python3 scripts/make_icons.py`.
