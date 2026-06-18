# PlugIdle — Voltlands as a Full Peer World (Design Spec)

- **Date:** 2026-06-18
- **Status:** Approved design → ready for implementation plan
- **Scope:** Make the Voltlands (world 2) a structural peer of the Grid (world 1):
  its own prestige + automation, world-scoped settings and challenges, a world-3
  teaser, and per-world section gating. The autobuyer cheapest-first fix shipped
  separately (commit `4942029`). The repo rename is handled outside this spec.

## 1. Summary

The Grid has a full progression spine: tap → generators → upgrades → milestones →
prestige (Recycle Plant → Prestige Cores ◆ → Core Upgrades + a lifetime production
multiplier) → challenges. The Voltlands has the front half (tap-zap → weapons → zap
upgrades → milestones → waves/bosses) but **no prestige, no automation shop, no
challenges of its own**, and it shares the Grid's settings and shows the Grid's
prestige sections. This spec gives the Voltlands its own peer-level back half and
makes the More tab, settings, and challenges world-aware.

## 2. Decisions locked in brainstorming

| # | Decision | Choice |
|---|---|---|
| Autobuyer | Buy cheapest cords first | **Shipped** (`4942029`) — out of scope here |
| W2 prestige | Reset-based **Reincarnation** | Reset the Voltlands run for **Storm Shards ⚡**; lifetime shards drive a permanent, softcapped **ZPS multiplier**. Only world 2 resets; the Grid is untouched. |
| Settings | Per-world **automation toggles only** | Auto-buy/upgrade/click toggles are per-world; sound/animations/sci/haptics stay global device prefs. |
| Challenges | **Per-world active** challenge | `state.challenge` → `state.challenges = {grid, volt}`; each world filters to its own set. |
| World 3 | "Coming soon…" placeholder | Disabled `🌌 ???`-style entry at the **bottom of the Storm Upgrades shop**. |
| Milestones | Already shared | Weapons already use `cordMilestoneMult` ([game.js:1639](../../../js/game.js)); verify display only. |

## 3. Current-state facts (grounding)

- World gate: `state.world` ∈ `{grid, volt}`, behind `state.wormhole`; `activeWorld()`
  / `applyWorld()` set `body.dataset.world` and per-tab `data-tworld`.
- Worlds are parallel — Grid prestige never touches the Voltlands (`carryState`
  keeps `slayer`/`wormhole`/`lifetimeEarned`).
- Slayer state ([game.js:317](../../../js/game.js)): `volts, totalVolts, wave,
  killsThisWave, kills, bosses, hp/maxHp, weapons{}, upgrades{}` (zap upgrades live
  in `slayer.upgrades`, **separate** from Grid `state.upgrades` — so a reincarnation
  reset is clean).
- Cross-world synergy uses lifetime metrics that never reset: `lifetimeEarned`
  (watts→ZPS) and `slayer.bosses` (bosses→watts). Reincarnation must preserve these.
- Grid prestige model to mirror: per-run `totalEarned` → `prestigeGain()` (cbrt
  curve); lifetime `coresEarned` → `prestigeMult()` (softcapped at
  `PRESTIGE_SOFTCAP=10`, sqrt beyond). The Voltlands has lifetime `totalVolts` but
  **no per-run counter** — one must be added.
- Settings are global ([game.js:294](../../../js/game.js)):
  `{sound, floats, sci, haptics, autobuyOn, autoupgOn}`.
- Challenges ([game.js:141](../../../js/game.js)) have no `world` field; `state.challenge`
  is a single global id; the challenge block is unconditional in the More tab.
- Grid auto-tapper has no toggle (runs when owned); auto-buy/upgrade have toggles.

## 4. Components

### 4.1 State & migration (`normalizeState`)
New slayer fields (in `defaultSlayer()`):
- `runVolts` — volts earned **this reincarnation**; resets on reincarnate; drives shard gain.
- `shards` — spendable Storm Shards ⚡.
- `shardsEarned` — lifetime shards; drives the permanent ZPS multiplier.
- `shardUpgrades` {} — Storm Upgrades owned (persist across reincarnation).

Settings refactor: add `settings.world = { grid:{autobuyOn,autoupgOn}, volt:{autobuyOn,autoupgOn,autoclickOn} }`.
Migrate legacy flat `autobuyOn`/`autoupgOn` → `settings.world.grid`. Device prefs
(`sound/floats/sci/haptics`) stay top-level/global.

Challenges: `state.challenge` (string) → `state.challenges = {grid:'', volt:''}`.
Migrate any legacy `state.challenge` → `{grid: <it>, volt: ''}`.

`normalizeState` backfills all of the above so old/imported saves load cleanly.

### 4.2 Storm Reactor — reincarnation (mirror of Recycle Plant)
- `reincarnateGain()` = `floor(cbrt(runVolts / STORM_THRESHOLD) * shardGainMult())`,
  mirroring `prestigeGain`. `STORM_THRESHOLD` is a tuned constant (start: `1e6`,
  finalized with the simulator so first reincarnation lands at a comparable pace to
  the first Grid prestige).
- `shardMult()` = lifetime-shards multiplier, softcapped exactly like `prestigeMultFor`
  (`+5%/shard`, raised to `+8%` by a Storm Upgrade; softcap 10 then sqrt).
- `reincarnate()`:
  - **Reset:** `volts, runVolts, wave, killsThisWave, weapons, slayer.upgrades`,
    re-spawn the wave-1 enemy.
  - **Keep:** `totalVolts, kills, bosses, shards (+gain), shardsEarned, shardUpgrades`,
    all achievements. **Grid state untouched.**
  - Award `reincarnateGain()` shards to `shards` and `shardsEarned`.
- ZPS pipeline multiplies by `shardMult()` (the Voltlands analog of `prestigeMult()`
  in `totalWps`).

### 4.3 Storm Upgrades shop (mirror of Core Upgrades, bought with shards)
A `STORM_UPGRADES` array rendered like `CORE_UPGRADES`. Starting catalog (costs/values
tuned in the plan via the simulator):

| id | name | effect |
|---|---|---|
| `livewire` | Live Wire | Tap-zap power ×3 |
| `conduction` | Conduction | All weapons ×1.5 |
| `capbank` | Capacitor Bank | Offline volts cap +24h |
| `chaser` | Storm Chaser | Storm Shard gains ×1.5 |
| `resocore` | Resonant Core | Each shard gives +8% instead of +5% |
| `overvolt` | Overvoltage | All ZPS ×2 |
| `autozap` | Auto-Zapper | Auto tap-zaps 5×/sec, free forever |
| `autoarsenal` | Auto-Arsenal | Auto-buys weapons (cheapest first) |
| `autotinker` | Auto-Tinker | Auto-buys zap upgrades (cheapest first) |
| `stormfission` | Storm Fission | Storm Shard gains ×5 (late-game accelerator) |
| `w3teaser` | `🌌 ???` | **Disabled**, desc **"Coming soon…"** — world-3 placeholder (#6) |

The `w3teaser` entry renders at the bottom, non-purchasable (greyed, no cost action),
mirroring how `mystery` (`???`) teases the Voltlands from the Core shop.

### 4.4 Voltlands automation (the 3 automations)
- **Auto-Zapper** (`autozap`): in `slayerTick`, apply auto tap-zaps at a fixed rate
  (mirror `autoTapRate`/auto-tap accrual), gated by `settings.world.volt.autoclickOn`.
- **Auto-Arsenal** (`autoarsenal`): `autoBuyWeaponsTick()` — cheapest-first weapon
  buyer mirroring the new `autoBuyTick`, spending volts, gated by `volt.autobuyOn`.
- **Auto-Tinker** (`autotinker`): `autoBuyZapUpgrades()` — buys affordable zap
  upgrades cheapest-first (mirror `autoBuyUpgrades`), gated by `volt.autoupgOn`.

### 4.5 Per-world challenges
- Add `world: 'grid'|'volt'` to every challenge; the existing 6 become `grid`.
- New **Voltlands challenge set** (`world:'volt'`), slayer-flavored, mirroring the
  Grid shapes (rule → permanent perk). Starting set (goals/perks tuned in the plan):
  1. **BARE KNUCKLES** — only the Static Glove can be bought → perk: Static Glove zaps ×5.
  2. **NUMB FINGERS** — tap-zapping earns nothing → perk: each reincarnation starts with 5 Static Gloves.
  3. **NO TOOLS** — zap upgrades cannot be bought → perk: start each run with Rubber Gloves Off.
  4. **SUDDEN DEATH** — bosses have ×3 HP → perk: boss volt rewards ×2.
  5. **STATIC CLING** — all ZPS halved → perk: Auto-Zapper-lite (auto tap-zaps, toggle).
  6. **POWER DRAIN** — weapon costs grow faster → perk: all weapons cost 3% less.
- `ch()` becomes world-aware: `ch(world = activeWorld())` returns
  `state.challenges[world]`. Existing grid rule checks (`ch() === 'solo'`, etc.) keep
  working since they default to the active world. Challenge rules only apply within
  their own world.
- The challenge block filters `CHALLENGES` by `activeWorld()`; **Grid challenges are
  hidden in the Voltlands and vice-versa**. Grid challenges unlock after the first
  Grid prestige (existing); Voltlands challenges unlock after the **first reincarnation**.
- A few Voltlands prestige/challenge **achievements** mirror the Grid set
  (first reincarnation, N shards, complete a Voltlands challenge).

### 4.6 More-tab gating (per world)
`index.html` gains two Voltlands blocks: `#voltPrestigeBlock` (Storm Reactor) and
`#voltShopBlock` (Storm Upgrades). Render logic (in the More-tab refresh) toggles
`hidden` by `activeWorld()`:
- **Grid:** Recycle Plant + Core Upgrades + Grid challenge block.
- **Voltlands:** Storm Reactor + Storm Upgrades + Voltlands challenge block.
- **Both:** Power Store, System Stats, Settings, Save Data.

Settings panel renders the **active world's** automation toggles (grid: 2; volt: 3).

### 4.7 Milestones (#7) — verify only
Weapons already use `cordMilestoneMult` (×2/25, ×10/100). Confirm the weapon cards
render the next-milestone progress bar like cord cards (add it to `renderWeapons` if
missing). No multiplier math changes.

## 5. Testing

Extend `scripts/dev-smoke.mjs` (export new internals via the test hook; remember the
**CRLF gotcha** — run against an LF-normalized copy, restore bytes after, never commit
a CRLF→LF rewrite):
- Reincarnation resets `volts/runVolts/wave/weapons/slayer.upgrades` and **keeps**
  `totalVolts/kills/bosses/shards/shardsEarned/shardUpgrades` and Grid state.
- `shardMult()` rises with `shardsEarned` and respects the softcap.
- Auto-Zapper / Auto-Arsenal / Auto-Tinker buy correctly and stop when their per-world
  toggle is off.
- Per-world challenge filtering and the per-world active-challenge state.
- Update content-count assertions (Core/Storm upgrade counts, challenge counts).

After deploy, **bump `sw.js` CACHE** so returning PWA players get the new `game.js`/
`index.html`/`css` (the recurring cache footgun; the standing fix is the spawned
"auto-version the cache key" task).

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Reincarnation clobbers Grid state | Reset only `slayer` run fields; zap upgrades are in `slayer.upgrades`, isolated. Smoke-tested. |
| Save migration breaks old saves | `normalizeState` backfills `settings.world`, `state.challenges`, new slayer fields; legacy `state.challenge`/flat toggles migrated. Roundtrip-tested. |
| Cross-world synergy regresses | `lifetimeEarned` and `slayer.bosses` are never reset by reincarnation. |
| Balance off (shard pace, costs, goals) | Tune `STORM_THRESHOLD`, shop costs, and challenge goals with the headless simulator before shipping. |
| Forgotten cache bump → stale assets | Bump CACHE on the shipping commit; the cache-auto-version task removes this class of bug. |
| Large change in one 2.5k-line file | Implement as isolated units (state/migration → reincarnation → shop → automation → challenges → gating), each smoke-verified. |

## 7. Out of scope
- Repo rename `pwa-webapp → PlugIdle` (separate, outward-facing step; changes the
  Pages URL).
- iOS App Store work (separate spec/branch).
- Exact balance numbers (finalized in the implementation plan against the simulator).

## 8. Implementation note
Given the size and the parallelizable, well-bounded units above, the implementation
will run as a multi-agent **workflow** (subsystem-per-agent with adversarial review +
the smoke test as the gate), authored after this spec is approved via the writing-plans
skill.
