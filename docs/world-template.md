# World template — how PlugIdle worlds stay consistent

PlugIdle has two "worlds" that are really two games sharing one shell. They must
stay consistent across every **shared surface** below — this file exists so they
never drift again (as they had: prestige cores leaking into the volt HUD, the volt
pages not scrolling, and no collapsing tap bar on the volt zap page).

| | World 1 — **Grid** (`grid`) | World 2 — **Voltlands** (`volt`) |
|---|---|---|
| Theme | plug cords for passive watts | slay enemies in waves for volts |
| Spendable currency | Watts `W` | Volts `V` |
| Prestige currency | Prestige Cores `◆` | Storm Shards `⚡` |
| Tap action | `plug()` — earn watts | `zapEnemy()` — deal damage |
| Per-tap value (HUD) | `clickPower()` (W) | `zapPower()` (Z) |
| Passive rate (HUD) | `totalWps()` (W/s) | `totalZps()` (Z/s) |
| Tabs | PLUG, UPGRADE | ZAP, ARSENAL |
| Shop list | `#cordlist` (cords) | `#weaponlist` (weapons) |
| Upgrade list | `#uplist` | `#zuplist` |
| Prestige shop | Core Shop `#corelist` | Storm Shop `#stormlist` |
| Reset | `doPrestige()` → cores | `reincarnate()` → shards |

Both worlds share one header HUD, the bottom-nav shell, tab machinery, challenges,
offline earnings, settings, and **tap surfaces**. Keep these in lockstep.

## World identity
- `activeWorld()` → `'grid' | 'volt'`. `applyWorld()` writes `document.body.dataset.world`,
  which CSS uses to hide the other world's tabs.
- World-only tabs carry `data-tworld="grid|volt"`; `applyWorld` auto-switches off a tab
  that belongs to the other world so you never sit on a hidden tab.

## Shared surface 1 — the header HUD  (`renderStatsLite`)
One header doubles as both worlds' HUD; every field branches on `volt`:
watts/volts, the W/s vs Z/s rate, the per-tap value, their unit labels, and the
currency line `#coresline` (prestige cores `◆` on grid, Storm Shards `⚡` on volt).
**Rule:** never read `state.watts` / `state.cores` / grid labels outside the grid branch.

## Shared surface 2 — tap surfaces  (`TAP_SURFACES`)
Every world taps the same way, driven from one table in js/game.js:

```js
const TAP_SURFACES = [
  { world:'grid', action: plug,     hero:'socket',   panel:'p-plug', sentinel:'plugSentinel', bars:['socketMiniPlug','socketMini'] },
  { world:'volt', action: zapEnemy, hero:'enemyBtn', panel:'p-zap',  sentinel:'zapSentinel',  bars:['enemyBtnMini','zapMini'] },
];
```

Each world has:
- a **hero** tap button on its main tab (`#socket` / `#enemyBtn`);
- a **scroll-collapse panel** (`#p-plug` / `#p-zap`): the hero scrolls away and a pinned
  compact bar (`#socketMiniPlug` / `#enemyBtnMini`, class `.plug-taptab`) takes over,
  wired by `setupScrollCollapse(panel, sentinel)` which toggles `.plug-collapsed`;
- a **mini bar** on its upgrade tab (`#socketMini` / `#zapMini`, class `.taptab`).

`TAP_SURFACES` drives the tap wiring (`bindTap`) and the collapse setup. The per-tap
value updates live in `renderStatsLite` (grid bars → `clickPower()`, volt bars →
`zapPower()`). `tapAnchor()` returns whichever surface is visible so floating numbers
land on the live control.

## Shared surface 3 — scrolling panels  (css/style.css)
Content tabs must scroll: `#p-up, #p-goals, #p-more, #p-plug, #p-zap, #p-arsenal`
all get `overflow-y:auto`. The two tap panels (`#p-plug`, `#p-zap`) additionally get
`padding-top:0` plus an `8px` hero margin so the sticky toolbar pins flush (no sliver).
Collapse visuals are **class-based** (`.plug-toolbar`, `.plug-taptab`, `.plug-sentinel`,
`.plug-collapsed`) so they apply to any world's panel; the `min-width:820px` tablet block
makes the collapse rig dormant for both `#p-plug` and `#p-zap` (the hero stays visible).

## Checklist — adding World 3
1. **DOM** (index.html): add its tabs + panels. Mirror the tap-panel structure — hero in
   a `.arena`/`.socket-wrap`, `.sectitle`, `.plug-sentinel`, a `.plug-toolbar` holding a
   `.taptab.plug-taptab` compact bar, then the shop list — and add a `.taptab` mini bar at
   the top of its upgrade tab. Tag world-only tabs with `data-tworld`.
2. **TAP_SURFACES**: add a row. Add the bar ids to the `el` map and set their value in
   `renderStatsLite`. Wire its tap action and reset/prestige.
3. **HUD** (`renderStatsLite`): add the world's branch for watts/rate/tap/units + currency.
4. **CSS**: add its panels to the `overflow-y:auto` list; add the tap-panel `padding-top:0`
   + hero margin and the tablet-dormant rules; add a tablet grid layout if desired.
5. **State/economy**: world-scoped fields go under a sub-object (cf. `state.slayer`), with
   `normalizeState` backfills and `carryState` / prestige handling.
6. Verify: `node scripts/dev-smoke.mjs`, then check every world in the browser at mobile
   width — scroll each tap panel to confirm the hero collapses into its compact bar.
