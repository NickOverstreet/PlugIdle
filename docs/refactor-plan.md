# PlugIdle — Refactor Plan: Modularization, Componentization & Optimization

**Audience:** an implementing Claude Code session.
**Goal:** break the 3,152-line `js/game.js` monolith into ES modules, replace the
hand-rolled `render*`/`update*` DOM-patching with a small component model, and
land concrete performance wins — **without changing gameplay, the stack, or the
build-free deploy.** This is a *refactor, not a rewrite.*

---

## 0. Read this first — non-negotiable constraints

These are the project's existing values (see `CLAUDE.md`, `README.md`, `GOAL.md`).
Violating any of them is a failed task.

1. **No build step. No bundler. No transpile.** The web target is served as static
   files from GitHub Pages and bundled verbatim into Capacitor. Use **native ES
   modules** (`<script type="module">` + `import`/`export`). Browsers and the
   Capacitor WebView both support them. Do **not** introduce Vite/Webpack/Rollup/
   esbuild, JSX that needs compiling, or TypeScript-that-emits.
2. **No runtime framework with a build dependency.** Any view helper must load as
   plain ESM (see §5 — preferred: a ~50-line in-repo reactive helper; acceptable
   alternative: `htm` + `preact` via ESM, no build). Default to the in-repo helper.
3. **Behavior must be byte-for-byte preservable.** Every phase ends green on
   `node scripts/dev-smoke.mjs` and `node --check`. Saves made before the refactor
   must load after it (`SAVE_KEY = 'cordTycoon.save.v1'` and the save shape are
   frozen — do not rename fields).
4. **Don't touch the cross-platform plumbing.** `capacitor.config.json`, `android/`,
   `codemagic.yaml`, `sw.js`, `js/monetize.js`, the deploy workflow, and the
   versioning scheme stay as they are. `js/monetize.js` is already a clean facade —
   it is the *model* for the rest of this work, not a thing to change.
5. **Two worlds stay in lockstep.** `docs/world-template.md` documents shared
   surfaces (Grid vs Voltlands). This refactor should turn that prose contract into
   a *code* contract (a shared `World` interface), not break it.
6. **Keep the good bits that already exist.** The sim is already decoupled from
   rendering: a fixed-rate `setInterval(tick, …)` (`game.js:3018`) vs a frame-capped
   `requestAnimationFrame` loop (`renderFrame`, `game.js:3054`) that auto-pauses when
   hidden and throttles slow UI to ~6Hz. **Preserve this architecture** — modularize
   around it, don't flatten it.

---

## 1. Why we're doing this

| Symptom (today) | Cause | What this plan changes |
|---|---|---|
| One 3,152-line IIFE, 181 functions, 318 `state` refs all in one scope | No module boundaries | Split into ~20 focused ES modules behind explicit imports |
| Bugs from one world reading the other's state (the reason `world-template.md` exists) | Shared mutable globals, no enforced interface | A `World` interface + per-world modules; ESLint/JSDoc guards |
| `render*` builds DOM, `update*` reaches back in to patch text — duplicated, drift-prone | Hand-rolled diffing | A tiny component + reactive-binding model (§5) deletes the `update*` twins |
| Content (27 cords, 46 upgrades, 61 achievements, weapons, enemies, themes…) inlined as giant literals | Data mixed with logic | Pure data modules under `js/content/` |
| Hard to unit-test the economy | Math entangled with DOM | A framework-free `engine/` layer that imports zero DOM |

**Do not** read this as license to swap the stack. Vanilla web + Capacitor + PWA is
the correct cross-platform choice for an idle game and stays. The debt is *internal*.

---

## 2. Target module layout

All paths under `js/`. Keep filenames lowercase-kebab. Every module is native ESM
(`export`/`import`, no globals). The single entry point is `js/main.js`, loaded with
`<script type="module" src="js/main.js">` from `index.html` (replacing the current
`<script src="js/game.js">` at `index.html:245`).

```
js/
  main.js                # entry: wires modules, starts sim + render loops
  config.js              # VERSION, SAVE_KEY, TICK_MS, SAVE_EVERY_MS, PROD_MULT, COST_GROWTH, FPS_OPTIONS
  monetize.js            # UNCHANGED (already a clean facade)

  content/               # PURE DATA — no logic, no DOM, no imports except maybe each other
    cords.js             # CORDS               (game.js:18)
    upgrades.js          # UPGRADES            (game.js:53)
    core-upgrades.js     # CORE_UPGRADES       (game.js:109)
    storm-upgrades.js    # STORM_UPGRADES      (game.js:144)
    challenges.js        # CHALLENGES          (game.js:162)
    weapons.js           # WEAPONS             (game.js:189)
    zap-upgrades.js      # ZAP_UPGRADES        (game.js:204)
    enemies.js           # ENEMIES, BOSSES, ZONES (game.js:219/231/238)
    achievements.js      # ACHIEVEMENTS        (game.js:251)
    themes.js            # THEMES              (game.js:2524)
    iap.js               # IAP_PRODUCTS        (game.js:2446)
    tap-milestones.js    # TAP_MILESTONES      (game.js:617)

  core/
    state.js             # the canonical state object, defaults, getters/setters; the ONLY module that owns `state`
    save.js              # save() / loadLocal() / loadDurable() / migrate / reconcile (game.js:786–824)
    transfer.js          # exportSave() / importSave() (game.js:2604–2620)
    format.js            # number formatting, SUFFIXES (game.js:721), scientific-notation toggle
    events.js            # tiny pub/sub or signal primitives used by the view layer (§5)

  engine/                # PURE economy/sim math — imports content/ + core/state, NEVER touches the DOM
    economy.js           # totalWps, clickPower, cost curves, milestones, prestige core gain
    slayer.js            # Voltlands economy: totalZps, zapPower, waves, bosses, slayerTick
    autobuy.js           # autoBuyTick / autoBuyUpgrades / autoBuyWeaponsTick / autoBuyZapUpgrades
    surges.js            # power-surge buffs + chain logic
    achievements.js      # checkAchievements (threshold evaluation only)
    challenges.js        # checkChallenge + perk application
    offline.js           # offline-earnings computation
    tick.js              # the fixed-rate tick() orchestrator (game.js:3018) — calls the above

  worlds/
    world.js             # the World interface/contract (see §4) + activeWorld()/applyWorld()
    grid.js              # Grid world binding (cords/watts/cores)
    volt.js              # Voltlands world binding (weapons/volts/shards)

  ui/
    runtime.js           # the component + reactive-binding runtime (§5) — small, in-repo, no deps
    dom.js               # minimal helpers (el(), on(), bound text/attr) used by components
    render-loop.js       # the rAF render loop (renderFrame/startRender/stopRender, game.js:3054–3079)
    components/
      hud.js             # renderStatsLite (game.js:1513) — the shared header HUD
      shop.js            # renderShop/renderCords/renderUpgrades (+ retire updateCords/updateUpgrades)
      core-shop.js       # renderCoreShop / renderStormShop
      goals.js           # renderGoals
      buffs.js           # renderBuffs
      challenges.js      # renderChallenges
      arsenal.js         # renderWeapons / renderZapUpgrades / renderSlayerLite
      store.js           # renderStore / renderThemePicker (IAP UI)
      tabs.js            # updateTabDots / renderMoreGating / tab machinery
      tap-surfaces.js    # TAP_SURFACES + scroll-collapse (game.js:2713–2772)
      settings.js        # settings UI + storage status (updateStorageStatus, game.js:2900)
```

> Exact file boundaries can flex if the code reveals a cleaner seam — but the
> **layering rule is fixed: `content` → `engine`/`core` → `worlds` → `ui` → `main`.
> Lower layers must never import from higher ones, and nothing below `ui/` may touch
> the DOM.** This is the invariant that makes the economy testable and the worlds
> non-leaky.

---

## 3. Phased execution (each phase ships green & behavior-preserving)

Work in this order. **After every phase**, run the gate in §6 and commit. Never let
two phases be in flight at once. Prefer many small commits.

### Phase 1 — Switch to modules, extract pure content (lowest risk, ~⅓ of the file)
1. Add `<script type="module" src="js/main.js">` to `index.html`; keep `monetize.js`
   as the existing non-module script (it sets a global facade the modules can read,
   or convert it to an ESM export — your call, but don't change its behavior).
2. Move the IIFE body of `game.js` into `js/main.js` essentially verbatim first
   (still one big module) — confirm green. This proves the module switch in isolation.
3. Extract every `content/` table (§2) into its own module, `export const`-ing each.
   Replace the inline literals in `main.js` with imports. These are pure data — zero
   behavior risk. Also extract `config.js` and `core/format.js` (`SUFFIXES`).
4. **Gate. Commit.** `game.js` is now deleted (its content lives in `main.js` +
   `content/`); `main.js` should already be noticeably smaller.

### Phase 2 — Extract `core/` (state, save, format) behind a real owner
1. Create `core/state.js` as the **sole owner** of the `state` object + `defaults`.
   Export accessors the rest of the code already needs. Critically: the **save shape,
   `SAVE_KEY`, and field names are frozen.** Add a comment block listing them.
2. Move `save/loadLocal/loadDurable/migrate/reconcile` → `core/save.js` and
   `exportSave/importSave` → `core/transfer.js`. Keep IndexedDB + localStorage dual
   write intact.
3. **Gate** with extra emphasis on the save-roundtrip portion of `dev-smoke.mjs`,
   plus a manual check: load a pre-refactor save export string and confirm it hydrates.
4. **Commit.**

### Phase 3 — Extract the `engine/` (pure sim, no DOM)
1. Move all economy math (`totalWps`, `clickPower`, cost/milestone curves, prestige
   core gain), `slayer*`, `autoBuy*`, surge buffs, `checkAchievements`,
   `checkChallenge`, offline earnings, and the `tick()` orchestrator (`game.js:3018`)
   into `engine/`.
2. **Hard rule:** no `engine/` module may reference `document`, `window`, or any DOM
   API. If something does, that line belongs in `ui/`. Enforce with a grep in the gate.
3. Add unit tests: a new `scripts/test-engine.mjs` that imports `engine/economy.js`
   and `engine/slayer.js` directly and asserts known values (cost of the 10th USB-A,
   `totalWps` for a fixed state, a prestige-core calc, an offline-earnings cap at 24h).
   This is now *possible* because the math no longer needs a DOM.
4. **Gate + new test. Commit.**

### Phase 4 — Componentize the view layer (the headline change; see §5)
1. Land `ui/runtime.js` + `ui/dom.js` (the small reactive runtime).
2. Migrate **one component first** end-to-end as the reference: **`hud.js`
   (`renderStatsLite`)**, because it's the shared two-world surface and exercises the
   reactive bindings hardest. Delete its imperative re-render in favor of bindings.
3. Then migrate the rest, **collapsing each `render*`/`update*` pair into one
   component** (`renderCords`+`updateCords`; `renderUpgrades`+`updateUpgrades`). The
   `update*` functions should cease to exist — their job becomes a reactive binding.
4. Rewire `render-loop.js` to drive components via the reactive runtime instead of
   calling `renderStatsLite()`/`renderBuffs()` imperatively. **Keep the existing
   throttling semantics** (frame cap from `state.settings.fps`, ~6Hz heavy tier,
   rAF auto-pause when hidden) — these are perf-critical and must survive.
5. **Gate. Commit per component** (≈10 small commits).

### Phase 5 — Formalize the two-world contract
1. Create `worlds/world.js` exporting a `World` shape (the columns of the
   `world-template.md` table: currency, prestige currency, tap fn, per-tap HUD,
   passive-rate HUD, tab ids, shop list ids, reset fn). `grid.js`/`volt.js` implement it.
2. Replace ad-hoc `state.world === 'volt'` branching in the UI with `activeWorld()`
   returning the active `World` object; components read fields off it. This is what
   stops cross-world leakage structurally.
3. Update `docs/world-template.md`: add a line that the contract now lives in
   `worlds/world.js` and the doc is the human-readable mirror.
4. **Gate. Commit.**

### Phase 6 — Optimization pass (see §7) + typecheck-in-CI
1. Apply the targeted perf wins in §7 (now cheap because the code is modular).
2. Add JSDoc types to `core/state.js`, `engine/`, and `worlds/world.js`; wire
   `tsc --checkJs --noEmit` (devDependency `typescript` only, **no emit, no build**)
   into a new `npm run typecheck` and into the smoke/CI step. This catches the
   cross-world field-name bugs the prose doc currently guards by hand.
3. **Final gate. Commit.**

---

## 4. The `World` contract (componentization of the two games)

`world-template.md` is currently enforced by vigilance. Encode it:

```js
// worlds/world.js
/** @typedef {Object} World
 *  @property {'grid'|'volt'} id
 *  @property {() => number} currency      // spendable: watts | volts
 *  @property {() => number} prestige      // cores ◆ | storm shards ⚡
 *  @property {() => void}   tap           // plug() | zapEnemy()
 *  @property {() => number} perTap        // clickPower() | zapPower()
 *  @property {() => number} passiveRate   // totalWps() | totalZps()
 *  @property {{watts:string, rate:string, perTap:string, prestige:string}} labels
 *  @property {() => void}   reset         // doPrestige() | reincarnate()
 *  @property {string[]} tabs              // tab ids owned by this world
 */
```

`grid.js` and `volt.js` each `export default` a `World`. The HUD, tap surfaces, and
prestige UI read **only** through the active `World` — never `state.watts` directly
outside `grid.js`. That rule (today a comment in the doc) becomes mechanically true.

---

## 5. The component & reactivity model (kills the `render`/`update` split)

**Problem being solved:** every list/HUD has a `render*` that builds DOM via
`innerHTML` and a twin `update*` that re-queries and patches `textContent`. That's a
hand-rolled, drift-prone diff. We replace it with **build-once + reactive bindings**.

**Preferred approach — a ~50-line in-repo signal runtime (no dependency at all):**

```js
// core/events.js  — signals
export function signal(v){ const subs=new Set(); return {
  get(){ return v; },
  set(n){ if(n!==v){ v=n; subs.forEach(f=>f(v)); } },
  sub(f){ subs.add(f); f(v); return ()=>subs.delete(f); },
};}

// ui/dom.js — bound element helpers
export const el = (tag, props={}, ...kids) => { /* create + bind */ };
export const bindText = (node, sig, fmt=String) => sig.sub(v => node.textContent = fmt(v));
export const bindAttr = (node, attr, sig) => sig.sub(v => node.setAttribute(attr, v));
```

A component is a function that **builds its DOM once** and wires `bindText`/`bindAttr`
from signals. When the engine updates state, it bumps the relevant signal; only the
bound text node changes — no re-query, no `innerHTML` thrash, no `update*` twin.

- **Lists** (cords, upgrades, weapons, goals): build each row once, keyed by id;
  bind the volatile bits (owned count, cost, affordability class). Only rebuild a
  row when the row *set* changes (a new tier unlocks), not every frame.
- **HUD** (`renderStatsLite`): pure bindings — the highest-frequency surface, so it
  benefits most.

> **Acceptable alternative if you strongly prefer JSX-like ergonomics:** `htm` +
> `preact` loaded via ESM (`import { html, render } from 'https://esm.sh/htm/preact'`
> pinned/vendored locally so it works offline and inside Capacitor). **Default to the
> in-repo signals** — zero dependency, smaller, and it matches the project's
> no-dependency ethos. Do not pull in Preact unless the in-repo runtime proves
> insufficient, and if you do, **vendor it locally** (never a runtime CDN fetch — the
> app must work offline/PWA).

**Hard requirement:** whichever you pick, the existing render-loop throttling
(`state.settings.fps` cap, ~6Hz heavy tier, rAF auto-pause when hidden,
`game.js:3054–3079`) must be preserved. Reactivity changes *what* repaints, not the
*cadence* governor.

---

## 6. The gate (run after EVERY phase; all must pass before committing)

```bash
node --check js/main.js                       # and every changed module
node scripts/dev-smoke.mjs                     # boot, buy, prestige, Voltlands, save roundtrip
node scripts/sim-balance.mjs                   # economy pacing unchanged (compare before/after)
node scripts/test-engine.mjs                   # NEW (added in Phase 3)
grep -RnE "document\.|window\.|innerHTML" js/engine js/content js/core && echo "LAYER VIOLATION" || echo "layers clean"
npm run typecheck                              # NEW (added in Phase 6)
```

Plus a manual smoke in a browser (`python3 -m http.server 8000`): tap, buy a cord,
buy an upgrade, prestige, enter the Voltlands, toggle settings, export+reimport a
save, hard-refresh and confirm the save persists. **And** load a save string exported
from `main` *before* the refactor and confirm it hydrates byte-identical.

`dev-smoke.mjs` currently loads `js/game.js`; update it to load `js/main.js` (and to
import `engine/` modules directly where that gives finer assertions).

---

## 7. Optimization targets (do these in Phase 6, once modular)

These are concrete and measurable. Note current good behavior to *preserve* first:
the sim/render split, frame cap, and hidden-tab throttle already exist — keep them.

1. **Eliminate per-frame `innerHTML` rebuilds.** The biggest win and the natural
   consequence of §5: lists build once and bind; only structural changes rebuild a
   row. Today `update*`/`render*` re-touch the DOM far more than necessary.
2. **Cache DOM lookups.** 155 `getElementById`/`querySelector` calls; many run inside
   render functions every frame. After componentization each node is captured once at
   build time — verify none remain in the hot path with the §6 grep extended to
   `getElementById` inside `ui/render-loop` and components' update paths.
3. **Memoize economy aggregates.** `totalWps()`/`totalZps()` sum across all owned
   tiers every tick. Cache the result and invalidate only on buy/upgrade/prestige/
   buff-change (a dirty flag in `core/state`). Tick then reads a cached number.
4. **Batch signal flushes.** Coalesce signal updates produced within one `tick()`
   into a single microtask flush so a tick that changes 5 fields triggers one paint
   pass, not five. Keep it inside the existing frame cap.
5. **Format-string caching.** `format()` (SUFFIXES) is called for many on-screen
   numbers per frame. Cache last-input→last-output per bound node; skip work when the
   displayed integer hasn't changed (most frames, the big numbers' visible digits
   don't move). This pairs naturally with `bindText`.
6. **Lazy-render inactive tabs.** Only the active tab's list needs live bindings;
   pause bindings for hidden tabs and refresh on tab-show. (The render loop already
   special-cases the active goals tab — generalize it.)
7. **Module load order / no blocking.** Ensure `type="module"` (deferred by spec)
   doesn't regress first paint; keep `monetize.js` non-blocking. Measure boot time
   before/after — it must not regress.

**Measurement:** capture a before/after of (a) scripting time per frame in DevTools
Performance over 10s of idle on the Plug tab, and (b) boot-to-interactive. Record the
numbers in the final commit message. Target: lower per-frame scripting, no boot
regression, identical gameplay output from `sim-balance.mjs`.

---

## 8. Out of scope (do NOT do these)

- No framework migration (React Native / Flutter / Unity / Godot). The stack stays.
- No bundler, no transpile step, no TypeScript emit. JSDoc + `--checkJs` only.
- No changes to `sw.js`, `codemagic.yaml`, `android/`, `capacitor.config.json`, the
  versioning scheme, or `monetize.js` behavior.
- No save-format changes, field renames, or `SAVE_KEY` changes.
- No gameplay/balance changes. `sim-balance.mjs` output must match.
- No version bump (this is internal; bump separately when shipping).

## 9. Risks & rollback

- **Risk: save incompatibility.** Mitigated by freezing the save shape (Phase 2) and
  the pre-refactor-save hydration check in the gate. If it ever fails, stop and fix
  before proceeding — never ship a save-breaking commit.
- **Risk: subtle render regressions** (a counter that stops updating). Mitigated by
  migrating one reference component first (HUD) and the manual browser smoke each phase.
- **Risk: layer leakage** (DOM creeping into `engine/`). Mitigated by the grep gate.
- **Rollback:** each phase is an isolated, green commit. Revert the offending phase's
  commits; earlier phases remain valid. Keep `git` history linear and per-phase.

## 10. Definition of done

- `js/game.js` is gone; logic lives in the §2 module tree.
- No `update*` twin of a `render*` remains; the view layer is component + signals.
- The two worlds share one `World` interface; no UI module reads another world's
  raw state fields.
- `engine/` imports zero DOM; `scripts/test-engine.mjs` passes.
- All §6 gates pass, including the pre-refactor save hydration check and
  `sim-balance.mjs` parity.
- §7 optimizations applied with before/after numbers recorded.
- `npm run typecheck` is green and wired into CI/smoke.
