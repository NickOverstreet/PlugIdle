# world-template.md — the contract every PlugIdle "world" must follow

PlugIdle is built around **parallel worlds** sharing one save: the **Grid**
(world 1, id `grid` — watts / cords / cores) and the **Voltlands** (world 2, id
`volt` — volts / weapons / shards). World 2 was added after world 1 and drifted
out of parity (e.g. the bulk-buy bar was never ported, and its shop did full
`innerHTML` rebuilds every tick, eating mid-press taps). This document is the
source of truth for what is **shared** between worlds and what is allowed to
**intentionally diverge**, so a new world starts consistent.

> **Read this before creating a new world or touching world-specific UI.** The
> Grid is the reference implementation; new worlds copy its patterns and only
> diverge where this doc explicitly says they may.

Everything below lives in `js/game.js` unless noted. Line numbers drift — search
by symbol name.

---

## 1. World identity & switching

- `state.world` — `'grid' | 'volt'`. `activeWorld()` returns `'volt'` only when
  `state.wormhole && state.world === 'volt'`, else `'grid'`.
- `applyWorld()` sets `document.body.dataset.world = activeWorld()`; CSS keys off
  `body[data-world="…"]`. `switchWorld()` flips `state.world` and re-applies.
- `worldBtn` (`#worldBtn`, hidden until `state.wormhole`) travels between worlds.
- **Tabs are gated by a `data-tworld` attribute** (`grid` / `volt` / `both`); CSS
  hides tabs whose `data-tworld` ≠ the active world. A new world adds its own
  tabs with `data-tworld="<id>"` and a home tab to jump to on switch
  (see the `activateTab(w === 'volt' ? 'zap' : 'plug', …)` line in `applyWorld`).
- **More-tab gating** (`renderMoreGating()`): each world shows only its own
  prestige + prestige-shop blocks; everything else is hidden for the other world.

## 2. Shop rendering contract (the part most likely to drift)

Each world's buyable list (cords / weapons / …) **MUST** use the Grid's two-tier
render, or it will eat taps:

1. **`render<Things>()`** — full `innerHTML` rebuild. Run it only when the
   *visible set or `state.bulk` changes* (struct change), on tab switch, and from
   `renderAll()`. It also (re)builds the `state.bulk` bulk bar, builds a
   `<thing>StructKey` (`state.bulk + '|' + visibleIds.join(',')`), and caches the
   per-row child nodes (`owned/cost/mnote/pos/ms/meta/flavor`) into a
   `<thing>Nodes` array.
2. **`update<Things>()`** — cheap per-tick patch. Recompute the struct key; if it
   differs (or a node is disconnected / count mismatched) fall back to a full
   `render`, otherwise patch `.textContent` and the `.cost` `ok/no` class in
   place. **Never full-rebuild on the per-tick path** — `refreshAffordability()`
   fires up to 10×/sec (auto-buyers dirty it) and a rebuild destroys whatever
   button the player is mid-press on.

Reference pairs: `renderCords`/`updateCords`, `renderUpgrades`/`updateUpgrades`,
and the ported `renderWeapons`/`updateWeapons`, `renderZapUpgrades`/`updateZapUpgrades`.
`refreshAffordability()` builds one signature string across both worlds and only
calls the `update*` patchers when it changes — a new world appends its own
section to that signature (include `state.bulk` and per-item affordability).

**Progressive unlock:** `visible<Things>()` shows an item once the previous one
is owned (or it's the first) — `visibleCords()` / `visibleWeapons()`.

**Bulk-buy bar (shared `state.bulk`):** every generator shop gets a
`<div class="bulk-bar" id="bulkBar…">` in its sticky toolbar. `state.bulk` is a
single **global** value (`1 | 5 | 10 | 'max'`) shared by all worlds (they're
never on-screen together). Each world needs:
- a `maxAffordable<Thing>(x)` (geometric-series log solve, using that world's
  currency + cost-growth + discount) and a `<thing>BuyCount(x)`
  (`state.bulk === 'max' ? max(1, maxAffordable) : state.bulk`). Mirror
  `maxAffordable`/`buyCount` and `maxAffordableWeapon`/`weaponBuyCount`.
- a buy fn that purchases `count` in one transaction and celebrates **crossing**
  a milestone with the same test as `buyCord`:
  `Math.floor(after/CORD_MILESTONE) > Math.floor(before/CORD_MILESTONE)` (don't
  use `after % CORD_MILESTONE === 0` — bulk buys jump over the exact multiple).
- a `delegateTap(el.bulkBar…, 'data-bulk', …)` handler that sets `state.bulk`,
  resets `lastSig = ''`, and re-renders that world's generator list.

**Card markup parity:** generator cards use `.card.buyable` with `.ico`, `.body`
(`.nm`, `.meta` containing `<span class="pos">…</span>` + `<span class="flavor">
 · desc</span>`, `.milestone > i`), and `.right` (`.owned` via `fmt(owned)`,
`.cost.{ok|no}`, `.mnote`). The `.flavor` span is required so long descriptions
hide responsively via `fitFlavor()` / `refitFlavors()` (add the world's nodes to
`refitFlavors`). One-time upgrade cards use `.upg` with `.un/.ud/.uc` and the
`bought | ok | no` class. Affordability classes (`ok`/`no`/`bought`) and the
`.milestone` bar are shared CSS — reuse, don't reinvent.

> **Allowed exception — the Surge Grid** (Voltlands research tree, `renderSurgeTree`):
> it is a one-time-purchase list but renders as a branching *tree* (a `.sg-node`
> spine + a three-way `.sg-branchcard` fork + chosen-branch spine), not the flat
> `.upg` grid, with its own `.sg-*` classes and `is-owned|is-affordable|is-unaffordable|is-locked`
> state classes. This is a deliberate divergence from the `.upg` reuse rule because a
> tree is not a 2-column grid. It still honors the **two-tier** contract above
> (`renderSurgeTree` rebuilds on struct change; `updateSurgeTree` patches per tick) —
> that part is **not** optional.

## 3. Economy formulas (shared shapes)

- **Cost growth:** base `COST_GROWTH = 1.12`, geometric series for buying `count`
  (`cordCost` / `weaponCost`). A world's active challenge may steepen growth
  (`…CostGrowth()` → 1.18) and its completion perk may discount (`…CostDiscount()`
  → 0.97). Keep this symmetric.
- **Ownership milestones:** `cordMilestoneMult(owned)` is **global** — ×2 every
  `CORD_MILESTONE` (25), ×10 every `BIG_MILESTONE` (100). Reuse it for any world's
  generators.
- **Prestige softcap:** linear `1 + per()·n` up to a ×10 softcap, then
  sqrt-dampened. Cores (`prestigeMultFor`/`corePer`) and shards
  (`shardMultFor`/`shardPer`) share this exact shape — clone it, don't invent a
  new curve.

### Intentional per-world divergences (do NOT "fix" these)

These are deliberate balance, documented so they aren't mistaken for drift:

| Aspect | Grid | Voltlands | Why |
|---|---|---|---|
| Passive production | `totalWps()` × `coreProdMult()` | `totalZps()` × `gridZpsBoost()` × `overvolt` × `shardMult()` (no `coreProdMult`) | Each world has its own prestige/synergy scalers |
| Tap/click power | `clickPower()` scales with prestige, `PROD_MULT`, tap milestones (×1.5/step) | `zapPower()` scales with `gridZpsBoost()`, surge/storm mults, and zap milestones (leaner ×1.25/step) | Both share `TAP_MILESTONES` + `milestoneMult(count, base)`; only the per-step base differs — Voltlands is deliberately leaner |
| Prestige gain basis | cube-root of lifetime `totalEarned` | cube-root of per-run `runVolts` | Different pacing per world |

If a future request is "rebalance," that's a separate, explicit decision — UI/
structure parity work must leave these formulas untouched.

## 4. Shared global systems (implement once; every world consumes)

- **Buffs:** one global `buffs` array; `buffMult('prod')` / `buffMult('click')`
  multiply *every* world's production / tap fn. Ad/supporter boosts go through
  `grantBoost()` / `syncBoostBuff()` (persisted via `state.boostUntil`). A new
  world's production/tap fns must include the relevant `buffMult(...)`.
- **Monetization:** `iapProdMult()` (the Overclock +25% IAP) is global and is
  applied to **every** world's production fn (`totalWps`, `totalZps`, …). Ad
  limits live in `AD_LIMITS`; `js/monetize.js` is world-agnostic. Surge is a
  Grid-only event; the ×2 production boost is global.
- **Achievements:** single `ACHIEVEMENTS` array; `achMult()` (+1% per unlocked)
  multiplies every world's production. World-specific achievements just check
  that world's state and may be tagged by `world`.
- **Formatting & feedback:** `fmt()` / `fmtInt()`, `toast()`, floats, `blip()` /
  `buzz()` / `screenShake()` are global — reuse them; never world-fork them.
- **Cross-world synergy** is the intended way worlds couple:
  `gridZpsBoost()` (grid lifetime watts → volt ZPS) and `bossWattsMult()` (volt
  bosses → grid watts). New worlds should add explicit, named synergy fns rather
  than reaching into another world's internals.

## 5. Per-world state

- **Automation toggles** live under `state.settings.world.<id>` (e.g.
  `grid.autobuyOn`, `volt.autoclickOn`). Read via the `"world.path"` form in
  `getSet`/`setSet`. Toggle rows are hidden unless the owning world is active AND
  the unlocking upgrade is owned (`syncSettingsUI`). Each world wires its
  automation to its own prestige-shop upgrades.
- **Challenges:** one `CHALLENGES` array; each entry has a `world` field. Active
  challenge per world in `state.challenges.<id>`; pre-challenge snapshot in
  `state.challengeBackup.<id>`; completions in `state.challengesDone` (forever).
  `ch(world)` / `chDone(id)` are the accessors. Provide softlock-prevention
  seeds (see `applyRunStartPerks` / `applyReincarnatePerks`).
- **Prestige currency:** spendable + lifetime pair (`cores`/`coresEarned`,
  `slayer.shards`/`shardsEarned`); the lifetime value drives the permanent bonus.
- **Save/migration:** `defaultState()` is merged over a loaded save
  (`Object.assign(defaultState(), loaded)`) so new fields backfill on old saves —
  add new world fields with sane defaults. `carryState()` lists everything that
  survives a Grid prestige (the entire Voltlands sub-tree is carried, never
  reset). A new world's persistent sub-tree must be added to `carryState`.

## 6. HUD / navigation

- Header currency + per-second readout + tap value are swapped by `activeWorld()`
  (watts/`W`/`W/s`/`/plug` vs volts/`V`/`Z/s`/`/zap`); the prestige line shows
  that world's currency + bonus %.
- Per-world stat rows (e.g. `.voltstat`) stay hidden until that world unlocks.
- Tab notification dots (`updateTabDots`) light when something in that tab is
  affordable; world-only dots also gate on the world being unlocked.

---

## Parity checklist — adding a new world

- [ ] `state.world` value, `activeWorld()` branch, `applyWorld()` body attr +
      home-tab jump, `worldBtn` label/icon.
- [ ] Tabs with `data-tworld="<id>"`; `renderMoreGating()` blocks; `.statworld`
      rows.
- [ ] Generator shop with the **two-tier** `render*`/`update*` pair, `visible*`
      gating, struct-key + node cache.
- [ ] Bulk-buy bar reusing global `state.bulk`; `maxAffordable*` + `*BuyCount`;
      buy fn with milestone-**crossing** toast; `delegateTap` handler.
- [ ] Card markup matches `.card`/`.upg` (incl. `.flavor` span + `refitFlavors`).
- [ ] Production fn includes `buffMult('prod')`, `iapProdMult()`, `achMult()`;
      tap fn includes `buffMult('click')`.
- [ ] `cordMilestoneMult`, cost-growth/discount, prestige softcap **reused**, not
      reinvented.
- [ ] Append the world's section to `refreshAffordability()`'s signature.
- [ ] `state.settings.world.<id>` toggles + `syncSettingsUI` gating.
- [ ] Challenges tagged with `world`; backup/restore; softlock seeds.
- [ ] Persistent sub-tree added to `carryState()` and backfilled in
      `defaultState()`.
- [ ] Cross-world synergy fns named explicitly.
- [ ] `node --check js/game.js` + `node scripts/dev-smoke.mjs` green.
