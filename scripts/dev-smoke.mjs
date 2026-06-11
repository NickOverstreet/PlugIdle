#!/usr/bin/env node
/* Headless smoke test for PlugIdle. Stubs just enough DOM to load js/game.js
   in Node, exposes the IIFE's internals via a test-only suffix injected at
   load time (shipped code is untouched), then drives the critical paths:
   boot -> buy ??? -> wormhole -> zap/kill/waves -> boss -> weapon buys ->
   world switch -> prestige (slayer must survive) -> save roundtrip.

   Run: node scripts/dev-smoke.mjs   (exits non-zero on failure) */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ---------- minimal DOM stub ---------- */
const elements = new Map();           // id/selector -> element (stable identity)
function makeEl(tag = 'div') {
  const listeners = {};
  const children = [];
  const classes = new Set();
  const el = {
    tagName: String(tag).toUpperCase(),
    style: {}, dataset: {}, hidden: false,
    textContent: '', innerHTML: '', value: '', disabled: false, offsetWidth: 1,
    classList: {
      add: (...c) => c.forEach((x) => classes.add(x)),
      remove: (...c) => c.forEach((x) => classes.delete(x)),
      toggle: (c, v) => { (v === undefined ? !classes.has(c) : v) ? classes.add(c) : classes.delete(c); },
      contains: (c) => classes.has(c),
    },
    addEventListener: (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); },
    fire: (ev, arg) => { (listeners[ev] || []).forEach((fn) => fn(arg || { target: el })); },
    appendChild: (c) => { children.push(c); return c; },
    remove: () => {}, setAttribute: () => {}, getAttribute: () => null,
    closest: () => null, querySelector: () => makeEl(), querySelectorAll: () => [],
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    animate: () => ({}),
  };
  return el;
}
const byKey = (key) => { if (!elements.has(key)) elements.set(key, makeEl()); return elements.get(key); };

global.window = global;
global.addEventListener = () => {};
global.document = {
  hidden: false,
  body: Object.assign(makeEl('body'), {}),
  getElementById: (id) => byKey('#' + id),
  querySelector: (sel) => byKey(sel),
  querySelectorAll: () => [],
  createElement: (tag) => makeEl(tag),
  addEventListener: () => {},
};
const store = new Map();
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
Object.defineProperty(global, 'navigator', { value: { userAgent: 'smoke' }, configurable: true });
global.matchMedia = () => ({ matches: false });

/* ---------- seed a late-game save (2e15 cores, curve v2) ---------- */
const now = Date.now();
store.set('cordTycoon.save.v1', JSON.stringify({
  watts: 1e6, totalEarned: 1e6, cores: 2e15, coresEarned: 2e15,
  prestigeV: 2, lastSeen: now, startedAt: now,
}));

/* ---------- load game.js with a test-only exposure suffix ---------- */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let src = readFileSync(join(root, 'js', 'game.js'), 'utf8');
const hook = `
  window.__test = {
    get state() { return state; },
    CORE_UPGRADES, WEAPONS, ZAP_UPGRADES, CHALLENGES, CORDS, UPGRADES,
    buyCoreUpgrade, zapEnemy, buyWeapon, buyZapUpgrade, switchWorld,
    totalZps, zapPower, bossWattsMult, gridZpsBoost, prestigeGain, prestigeMult,
    carryState, defaultState, normalizeState, applyZapDamage, spawnEnemy,
    autoBuyTick, autoBuyUpgrades, autoTapRate, autoTapGainPerSec, clickPowerFlat, totalWps,
  };
})();`;
if (!src.endsWith('})();\n')) throw new Error('unexpected game.js tail');
src = src.slice(0, src.lastIndexOf('})();')) + hook;
eval(src);

/* ---------- assertions ---------- */
let failures = 0;
const check = (name, ok) => {
  console.log((ok ? '  ok ' : 'FAIL ') + name);
  if (!ok) failures++;
};

await new Promise((r) => setTimeout(r, 150));   // let async boot() finish
const T = window.__test;
const S = () => T.state;

check('boot: save loaded (2e15 cores)', S().cores === 2e15);
check('boot: world starts grid', (document.body.dataset.world || 'grid') === 'grid');

// buy ??? (instant path: disable animations first)
S().settings.floats = false;
const mystery = T.CORE_UPGRADES.find((c) => c.id === 'mystery');
check('content: ??? exists at 1e15', mystery && mystery.cost === 1e15);
T.buyCoreUpgrade(mystery);
check('wormhole: flag set', S().wormhole === true);
check('wormhole: world is volt', S().world === 'volt');
check('wormhole: enemy spawned', S().slayer.maxHp > 0);
check('wormhole: achievement granted', !!S().achievements.worm1);
check('wormhole: cores deducted', S().cores === 1e15);

// zap until first kill (wave 1 enemy = 10 HP, zapPower >= 1)
const zapsNeeded = Math.ceil(S().slayer.maxHp / T.zapPower()) + 2;
for (let i = 0; i < zapsNeeded; i++) T.zapEnemy();
check('combat: first kill counted', S().slayer.kills >= 1);
check('combat: volts earned', S().slayer.volts > 0);
check('combat: kill achievement', !!S().achievements.kill1);

// grind to the wave-10 boss and beyond (cap iterations for safety)
let guard = 2e5;
while (S().slayer.bosses < 1 && guard-- > 0) T.applyZapDamage(T.zapPower() * 5);
check('combat: boss killed', S().slayer.bosses >= 1);
check('combat: boss achievement', !!S().achievements.boss1);
check('synergy: bossWattsMult > 1', T.bossWattsMult() > 1);
check('combat: wave advanced past 10', S().slayer.wave >= 11);

// weapon purchase
S().slayer.volts = 1e6;
const glove = T.WEAPONS[0];
T.buyWeapon(glove);
check('arsenal: weapon bought', S().slayer.weapons.glove === 1);
check('arsenal: totalZps > 0', T.totalZps() > 0);
const zu = T.ZAP_UPGRADES[0];
T.buyZapUpgrade(zu);
check('arsenal: zap upgrade bought', !!S().slayer.upgrades[zu.id]);
check('synergy: gridZpsBoost > 1', T.gridZpsBoost() > 1);

// world switch both ways
T.switchWorld();
check('travel: back to grid', S().world === 'grid');
T.switchWorld();
check('travel: back to volt', S().world === 'volt');

// prestige carry: slayer must survive a grid reset
const before = JSON.stringify(S().slayer);
const carried = Object.assign(T.defaultState(), T.carryState({}));
check('carry: slayer survives reset', JSON.stringify(carried.slayer) === before);
check('carry: wormhole survives reset', carried.wormhole === true);
check('carry: lifetimeEarned survives reset', carried.lifetimeEarned === S().lifetimeEarned);

// save roundtrip through normalizeState (export/import path)
const round = T.normalizeState(JSON.parse(JSON.stringify(S())));
check('save: roundtrip keeps wormhole', round.wormhole === true);
check('save: roundtrip keeps weapons', round.slayer.weapons.glove === 1);
check('save: legacy save gets slayer backfilled', T.normalizeState({ watts: 5 }).slayer.wave === 1);

// accelerators present and wired
check('content: 23 core upgrades', T.CORE_UPGRADES.length === 23);
S().coreUpgrades.fission = true;
const g1 = T.prestigeGain();
delete S().coreUpgrades.fission;
check('accelerators: fission multiplies gain', g1 >= T.prestigeGain());

// Auto-Buyer core upgrade: one tick buys MANY cords across tiers (not 1)
S().challenge = '';
S().coreUpgrades.autobuy = true;
S().owned = { usba: 1 };
S().watts = 1e9;
const tally = () => T.CORDS.reduce((n, c) => n + (S().owned[c.id] || 0), 0);
const cordsBefore = tally();
T.autoBuyTick();
const cordsAfter = tally();
check('autobuy: buys many cords in one tick', cordsAfter - cordsBefore > 1);

// ...and its Settings toggle stops it
S().settings.autobuyOn = false;
const offBefore = tally();
T.autoBuyTick();
check('autobuy: toggle off stops buying', tally() === offBefore);
S().settings.autobuyOn = true;

// Auto-Upgrader core upgrade: buys all unlocked affordable upgrades at once
S().coreUpgrades.autoupg = true;
S().upgrades = {};
S().owned = { usba: 10, jack: 10 };
S().watts = 1e9;
T.autoBuyUpgrades();
check('autoupg: buys affordable upgrades', Object.keys(S().upgrades).length > 1);

// ...and its Settings toggle stops it
S().settings.autoupgOn = false;
S().upgrades = {};
T.autoBuyUpgrades();
check('autoupg: toggle off stops buying', Object.keys(S().upgrades).length === 0);
S().settings.autoupgOn = true;

// Auto-Tapper ladder: rate scales 5→1000 and each tier needs the previous
S().coreUpgrades = {};
check('autotap: rate 0 with none owned', T.autoTapRate() === 0);
S().cores = 1e6;
T.buyCoreUpgrade(T.CORE_UPGRADES.find(c => c.id === 'autotap10'));
check('autotap: II is locked without I', !S().coreUpgrades.autotap10);
S().coreUpgrades.autotap = true;
check('autotap: base rate is 5', T.autoTapRate() === 5);
['autotap10', 'autotap20', 'autotap50', 'autotap100', 'autotap1000'].forEach(id => { S().coreUpgrades[id] = true; });
check('autotap: maxed rate is 1000', T.autoTapRate() === 1000);

// W/s share of auto-taps is capped: 1000/sec × Static must NOT give ~40× W/s
S().challenge = '';
S().coreUpgrades.static = true;   // each tap earns 4% of W/s
S().upgrades = {};
S().owned = { usba: 1000 };       // gives a nonzero W/s to draw the share from
const apShare = T.autoTapGainPerSec() - T.clickPowerFlat() * T.autoTapRate();
check('autotap: W/s share is capped (no balloon)', apShare <= T.totalWps() * 1.001);

// Ouroboros Cord: 0 watts, boosts prestige core gain, never auto-bought
const ouro = T.CORDS.find(c => c.coreGain);
check('content: ouroboros core-gain cord exists', !!ouro && ouro.wps === 0);
S().coreUpgrades = {};
S().owned = {};
S().totalEarned = 1e30;
S().coresEarned = 0;
const baseGain = T.prestigeGain();
S().owned[ouro.id] = 50;
check('ouroboros: boosts prestige gain', T.prestigeGain() > baseGain);

S().challenge = '';
S().coreUpgrades = { autobuy: true };
S().settings.autobuyOn = true;
S().owned = { genesis: 1 };       // unlocks ouro (its previous cord)
S().watts = 1e40;                 // more than enough to afford ouro
T.autoBuyTick();
check('autobuy: never buys the core-gain cord', (S().owned[ouro.id] || 0) === 0);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
