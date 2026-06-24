# Voltlands Expansion Plan

> Research-informed, adversarially-vetted plan to flesh out **world 2 (the
> Voltlands)** so it exceeds the Grid in material, progresses at ~0.8× the Grid's
> speed, and gains one crucial new gameplay feature — plus the world-switch UI
> move. Read `world-template.md` first; every item here is written to fit that
> parity contract.

## How this plan was produced

A deep-research pass (Antimatter Dimensions, Realm Grinder, AdVenture Capitalist,
the Kongregate "Math of Idle Games" series) surfaced six confidence-tagged
findings. A second design pass generated five independent expansion designs (one
per "crucial feature" thesis) and a three-judge panel ranked them. **All three
judges independently picked the same winner**: a branching combat research tree
("Surge Grid"). The losing designs were mined for the best graftable ideas.

Key research findings that drove the decision:
- **[HIGH]** Depth should come from a **branching research tree with prerequisites,
  mutually-exclusive forced branches, and free respec** — a structure the first
  layer lacks (Antimatter Dimensions Time Studies).
- **[HIGH]** Differentiate by **playstyle, not cosmetics**; lean the second world
  **harder into active depth** (Realm Grinder active-vs-idle split).
- **[MED]** Highest retention lever = **combinatorial build customization /
  loadouts** (Realm Grinder Mercenary).
- **[HIGH]** The pacing dial for "~0.8× speed" is the **cost-growth exponent base**
  (Grid uses `1.12`). *Caveat: no source maps an exponent to a precise ratio —
  0.8× is an inference that must be validated by simulation, never hardcoded.*
- Finding "own currency + own production, hard-gated behind world 1" is **already
  satisfied** (Voltlands has volts, ZPS, Storm Shards, gated behind the ???
  upgrade). So the crucial feature must go *beyond* that.

---

## 1. The crucial new feature — the **Surge Grid**

A **branching combat research tree** that is genuinely new to *both* worlds (the
Grid has a flat core-upgrade shop; the Voltlands has flat zap/storm lists — neither
has a tree with forced branches and respec).

**Why it's crucial, not decorative:** today the Voltlands is two flat catalogs you
buy in order — no build identity, combat is "tap and wait." The Surge Grid turns
active combat into a *planning problem* with real replay depth, and it is fed by an
**active-minted sub-currency** (charges from kills), which is the idle-vs-active
differentiator the Grid structurally cannot have. It was also judged the *cheapest*
deep system to build safely: every node folds multiplicatively into the **existing**
damage/income chains, defaulting to ×1 for saves that never touch it (byte-identical
baseline for old saves).

### Mechanics
- **New sub-currency — Surge Charges (`sc`)**, minted by combat in `killEnemy()`
  ([js/game.js:2156](../js/game.js)): `+1` per normal kill, `+5` per boss. Flat per
  kill (deliberately un-inflated, like AD Time Theorems) so the tree fills at a
  combat-gated rate independent of volt inflation.
- **~28 nodes** in a new `SURGE_NODES` array: linear prerequisite chains plus **three
  mutually-exclusive branch capstones** (e.g. `surge_crit` burst, `surge_flow` idle
  ZPS, `surge_hunt` boss-pusher), each gating a 4–5 node sub-tree so the choice has
  downstream weight.
- **Free full respec on reincarnation** — `reincarnate()` ([js/game.js:1812](../js/game.js))
  wipes `surgeNodes`/`surgeBranch`/`surgeCharges` (keeps lifetime `surgeChargesEarned`).
  The run boundary *is* the respec; no new button, and it makes reincarnation more
  meaningful.

### Tick hooks (all multiplicative, appended to existing chains, default ×1)
| Hook | Site | Effect |
|---|---|---|
| `surgeZpsMult()` | `totalZps()` [:2105] | passive ZPS branch |
| `surgeTapMult()` | `zapPower()` [:2114] | hand-zap branch |
| `surgeCritChance()/Mult()` | `zapEnemy()` crit [:2220] | replaces hardcoded 0.10/×10 |
| `surgeAutoRate()` | auto-zapper in `slayerTick()` [:2213] | auto-zap rate |
| `surgeVoltMult()` | `voltReward()` [:2077] | volt income |
| `surgeShardMult()` | `reincarnateGain()` [:719] | shard income |

`buySurgeNode()` is modeled exactly on `buyStormUpgrade()` ([:1269]) incl. a
branch-exclusivity guard. **Each helper folds only owned nodes**, so an un-specced
player and every old save are unaffected — the smoke test must assert this.

### State (lives in `state.slayer`, auto-carried by `carryState()` [:1735])
`surgeCharges:0` (reset on reincarnate), `surgeChargesEarned:0` (lifetime, kept),
`surgeNodes:{}` (reset = the respec), `surgeBranch:''` (reset). Add to
`defaultSlayer()`; backfill in `normalizeState()` ([:375]).

### UI
New `data-tab="surge" data-tworld="volt"` tab + `#p-surge` panel; tree renders as
stacked tier-rows (mobile-first, 2–3 nodes/row), reusing `.upg` card chrome from the
storm shop (no new CSS). A "CHOOSE ONE PATH" row holds the three capstones.
`renderSurgeTree`/`updateSurgeTree` **must** follow the two-tier render contract
(full rebuild only on struct change; cheap `textContent`/class patch per tick) and
append to `refreshAffordability()`'s signature.

---

## 2. Grafts from the runner-up designs

These cover the Surge Grid's one weak axis (it's planning-depth, light on
moment-to-moment skill) without importing the losing designs' cost/risk:

1. **Saved build presets** *(from Conductor Loadouts, D2 — the top retention lever).*
   2–3 named slots storing `{name, nodes[]}` so players can save and **hot-swap**
   branch configs across runs instead of re-clicking the whole tree. Cheap — just an
   array in the slayer subtree.
2. **One triggered active ability + skill mint** *(from Ability Deck, D3).* A single
   **Discharge** ability fired from Surge Charges, routed through the existing
   **capped** `applyZapDamage()` loop ([:2187]) — adds active skill without a 4-slot
   ability dock. Optionally: an **Overcharge meter** where well-timed/rapid tapping
   mints *bonus* charges, and a single **boss weak-point tap** (~0.8 s window for a
   guaranteed mega-crit). All cheap, all routed through existing hooks.
3. **Tiered, repeatable challenges + cross-world coupling** *(from Storm Trials, D5).*
   Give the new volt challenges **2–3 tiers each** (reuses `beginChallenge()` snapshot
   machinery, background-safe) as a steady charge/reward sink, and add a
   `trialGridBoost()`-style "cleared tiers → small permanent Grid watts" function as
   the named cross-world synergy.
4. **Deterministic affixes only** *(from Overcharge Gambit, D4).* If any elite/variant
   flavor is added, generate it as a **pure function of wave number (no `Math.random`)**
   to preserve offline-catch-up determinism. **Drop the run-losing fail-state entirely**
   — it is retention-negative and has an offline-correctness hazard.

> **Hard constraints the judges flagged (consensus):** `slayerTick()` runs in the
> **1 Hz background sim** ([:3159]) — **never** add a fail-state meter that accrues
> offline, and **never** put a full-rebuild renderer on the tick path (the exact
> tap-eating bug `world-template.md` §2 exists to prevent). Ship the whole thing
> **behind a flag** and watch real engagement before committing more content.

---

## 3. Content expansion — exceed the Grid on every axis

| Catalog | Grid (now) | Voltlands (now → target) |
|---|---|---|
| Generators | 28 cords | 10 → **29 weapons** |
| Upgrades | ~50 | 12 → **52 zap upgrades** |
| Prestige-shop | 23 core upgrades | 10 → **26 storm upgrades** |
| Challenges | 6 | 6 → **8 (tiered)** |
| Achievements | deep set | piggyback → **+~12 volt-specific** |
| Bestiary | — | 10/5/10 → **16 enemies / 8 bosses / 14 zones** |
| **Unique system** | core shop | — → **Surge Grid (~28 nodes)** |

Discrete buyables: **~135 Voltlands** (29 + 52 + 26 + 28) vs **~101 Grid** — plus a
whole category (bestiary, branching tree) the Grid has no equivalent of. New weapons
continue the electrical-arsenal naming ladder and **auto-inherit** `cordMilestoneMult`,
the bulk bar, and `visibleWeapons()` progressive unlock — zero new plumbing. New
volt achievements grant the shared `+1%` `achMult()` ([:609]), helping both worlds.

---

## 4. Pacing — ~0.8× the Grid, via one constant

- Add `VOLT_COST_GROWTH = 1.14` next to `COST_GROWTH = 1.12` ([js/game.js:14](../js/game.js))
  and point `weaponCostGrowth()` ([:2121]) at it (challenge `1.18` override and
  `0.97` SURPLUS discount stay). One constant tunes the whole world's depth.
- The income *shape* already targets ~0.8× (the comment at ~[:2083] notes
  `voltReward` base 8 vs enemy-HP base 10 → volts/sec ≈ 0.8× grid watts/sec at equal
  production). `1.14` lengthens the *spend* side to match.
- **Do not hardcode 0.8× anywhere.** It is an unverified inference. **Deliverable:**
  extend `scripts/dev-smoke.mjs` to measure waves-reached-per-sim-second for Grid vs
  Voltlands and tune `VOLT_COST_GROWTH` until the ratio lands ~0.8×. Secondary dials
  if needed: `STORM_THRESHOLD` (1.3e5 → ~1.6e5) and the charge mint rate.

---

## 5. UI change — world-switch button → More page

**Current:** `#worldBtn` (`.worldswitch`) lives in the bottom tab bar
([index.html:226](../index.html)), shown once `state.wormhole`. The `mystery` core
upgrade ([js/game.js:134](../js/game.js)) — "??? [DATA CORRUPTED]" — sets
`state.wormhole` and triggers `playWormhole()` when bought.

**Target edits:**
1. **Remove** `#worldBtn` from `.tabbar` (delete index.html:226). Grep every
   `worldBtn` reference first — `applyWorld()` ([:2448]) currently mutates
   `el.worldBtn` (icon/label/hidden); repoint it at the new block or you leave a dead
   reference.
2. **Add `#worldswitchBlock`** as a `.block` on the More page **directly after
   `#coreShopBlock`** (index.html ~line 132). Gate it in `renderMoreGating()`
   ([:1602]) to show whenever `state.wormhole` (both worlds). Migrate the
   `.worldswitch` styling + `@keyframes wormpulse` (css/style.css ~453–468) to the
   new block selector. Note: on tablet `#p-more` is a CSS grid — give the block
   `grid-column:1/-1` if it should span.
3. **Transform the bought `mystery` upgrade into the switch:** in `renderCoreShop()`
   ([:1463]), **early-return** (skip the card) when `cu.id === 'mystery' && bought &&
   state.wormhole`, so it visually "becomes" the dedicated block below. **Gotcha:**
   `buyCoreUpgrade()` returns early for mystery and does *not* re-render the shop — so
   call `renderCoreShop()` from `playWormhole()` after the cutscene so the transform
   lands.

This phase is **fully independent** of the Surge Grid and can ship first/standalone.

---

## 6. Parity checklist (maps to `world-template.md`)

- ☐ Surge tab uses `data-tworld="volt"`; `renderMoreGating()` handles new blocks.
- ☐ `renderSurgeTree`/`updateSurgeTree` two-tier; struct-key guard; appended to
  `refreshAffordability()` signature; **never** full-rebuild on tick.
- ☐ New weapons reuse `cordMilestoneMult`, bulk bar, `visibleWeapons()`.
- ☐ Cost growth via named `VOLT_COST_GROWTH` override; milestone/softcap untouched.
- ☐ New `slayer` fields in `defaultSlayer()` + `normalizeState()` backfill; whole
  subtree auto-carried by `carryState()`.
- ☐ Surge/loadout mults *appended* to chains already carrying
  `buffMult`/`iapProdMult`/`achMult` — not replacing them.
- ☐ New challenges `world:'volt'` + softlock seeds in `beginChallenge()` + perks in
  `applyReincarnatePerks()`.
- ☐ Cross-world synergy as an explicit named fn (one-way volt→grid).
- ☐ `node --check js/game.js` + `node scripts/dev-smoke.mjs` green; smoke asserts
  charge mint/reset **and** byte-identical baseline with empty `surgeNodes`.

---

## 7. Phased rollout

1. **State + currency mint** — `VOLT_COST_GROWTH`; slayer fields; reincarnate resets;
   mint charges in `killEnemy`; point `weaponCostGrowth()` at the new base. Smoke
   asserts mint + reset.
2. **Tree data + buy logic** — `SURGE_NODES`, `sg()`, `surgeNodeCost()`,
   `buySurgeNode()` (branch-exclusive), the `surge*Mult()` helpers.
3. **Tick hooks** — wire the six helpers in; re-run smoke to confirm un-specced
   behavior is identical to baseline.
4. **Surge tab UI** — tab + `#p-surge` + two-tier render + `refreshAffordability`.
5. **Content bulk** — append 19 weapons, 40 zap upgrades, 16 storm upgrades, tiered
   challenges (+seeds/perks), ~12 achievements, extend bestiary. Verify counts > Grid.
6. **Grafts** — saved presets; Discharge ability + overcharge meter + boss weak-point
   tap; tiered-challenge sink + `trialGridBoost()` cross-world coupling.
7. **UI move** — the §5 world-switch change (independent; can be pulled earlier).
8. **Tune + verify** — dev-smoke ratio measurement → tune `VOLT_COST_GROWTH` toward
   0.8×; final `node --check` + smoke green; manual mobile tap-eating pass.

---

## 8. Risks & mitigations

- **0.8× is unverified** → one tunable constant + a dev-smoke measurement; treat 1.14
  as a starting guess, iterate.
- **Six hot-path insertions** (`totalZps`/`zapPower`/`zapEnemy`/`slayerTick`/
  `voltReward`/`reincarnateGain`) → each defaults to ×1; smoke asserts baseline.
- **Overkill/kill-cap stability** — surge mults change damage magnitude; re-confirm
  the dt-scaled cap in `applyZapDamage()` still self-terminates.
- **Tap-eating drift** — enforce the struct-key guard on the Surge tab (the world-2
  bug the contract was written to prevent).
- **Content volume** (19 weapons + 40 upgrades + 28 nodes) → reuse the geometric
  ladder; smoke-test buy loops for curve discontinuities.
- **UI move** → grep `worldBtn` before deleting; re-call `renderCoreShop()` after the
  wormhole cutscene so the transform renders.

## 9. Open questions to resolve during build

- Exact `VOLT_COST_GROWTH` value for ~0.8× (needs simulation).
- Whether tiered challenges measurably help retention (research **could not confirm**
  the challenge-ladder claim — ship behind a flag and measure).
- How much cross-world synergy: recommend the **surgical** first ship — a single
  deep-branch node boosting *shard gain* (stays entirely inside the slayer subtree,
  zero grid-side edits), deferring `trialGridBoost()`.

## Sources
- Antimatter Dimensions — Eternity / Time Studies (fandom wiki + developer "How to
  play" reference)
- Realm Grinder — Factions / Mercenary (fandom wiki + Steam community breakdown)
- "The Math of Idle Games, Part I" (gamedeveloper.com) + AdVenture Capitalist
  Coefficient wiki (cost-growth pacing)
