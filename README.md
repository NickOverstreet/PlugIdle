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
- **Upgrades** boost your tap power, individual cord types, or all cords at once.
- **Offline earnings**: your cords keep working while you're away (50% efficiency, capped at 24h).
- **Recycle Plant (prestige)**: melt your whole operation into Prestige Cores for a permanent +5% bonus each.
- **Export / import** your save, toggle sound and animations in settings.

Progress autosaves to `localStorage` on your device.

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
