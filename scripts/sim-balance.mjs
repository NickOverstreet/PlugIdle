#!/usr/bin/env node
/* Headless balance simulator for PlugIdle.
   Extracts CORDS/UPGRADES and the real formulas from js/game.js, then runs a
   greedy bot (cheapest-purchase-first, light tapping early) to measure pacing:
   time to each generator tier, total-earned growth, prestige-core accrual.

   Usage: node scripts/sim-balance.mjs [--hours N] [--divisor X] [--root sqrt|cbrt]
     --hours    simulated play time per run (default 96)
     --divisor  prestige divisor (default 1e9, the live value)
     --root     prestige shape: cbrt (live) | sqrt (pre-v2) | log2
     --softcap  prestige-mult softcap knee (default 10, the live value; 0 = off)
*/
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'js', 'game.js'), 'utf8');

function extractArray(name) {
  const start = src.indexOf(`const ${name} = [`);
  const open = src.indexOf('[', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) break; }
  }
  // The tables are pure data (no functions) — safe to eval from our own file.
  return eval(src.slice(open, i + 1));
}

const CORDS = extractArray('CORDS');
const UPGRADES = extractArray('UPGRADES').filter((u) => u.kind !== 'tapwps' || true);
const COST_GROWTH = parseFloat(src.match(/COST_GROWTH = ([\d.]+)/)[1]);
const PROD_MULT = parseFloat(src.match(/PROD_MULT = ([\d.]+)/)[1]);

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : dflt;
};
const HOURS = parseFloat(opt('hours', '96'));
const DIVISOR = parseFloat(opt('divisor', '1e9'));
const ROOT = opt('root', 'cbrt');
// 'log2': each successive core needs 2x more lifetime earnings than the last —
// a geometric core ladder (Realm Grinder / Egg Inc style) with no singularity.
const rootFn = ROOT === 'cbrt' ? Math.cbrt
  : ROOT === 'log2' ? (x) => (x >= 1 ? Math.floor(Math.log2(x)) + 1 : 0)
  : Math.sqrt;

const PRESTIGE = args.includes('--prestige');
const CORE_PCT = parseFloat(opt('corepct', '0.05'));   // per-core bonus

/* ---------- state ---------- */
let owned = {}; let ups = {};
let watts = 0, totalEarned = 0, clicks = 0, t = 0; // t in seconds
let runEarned = 0;        // totalEarned resets each prestige in the real game;
                          // core potential is computed from the CURRENT run only
let coresEarned = 0;
const prestiges = [];                                   // {t, gained, total}

const TAP_MILESTONES = [100, 500, 2500, 10000, 50000, 250000, 1e6, 5e6];
const tapMs = () => TAP_MILESTONES.filter((x) => clicks >= x).length;

function milestoneMult(n) {
  const steps = Math.floor(n / 25), big = Math.floor(n / 100);
  return Math.pow(2, steps - big) * Math.pow(10, big);
}
function cordMultiplier(id) {
  let m = 1;
  for (const u of UPGRADES) {
    if (!ups[u.id]) continue;
    if (u.kind === 'cord' && u.cord === id) m *= u.mult;
    if (u.kind === 'global') m *= u.mult;
    if (u.kind === 'synergy' && u.cord === id) m *= 1 + u.per * (owned[u.from] || 0);
  }
  return m * milestoneMult(owned[id] || 0);
}
// --softcap X: full +5%/core up to a ×X total multiplier, then square-root
// dampening beyond the knee (Antimatter-Dimensions-style softcap).
const SOFTCAP = parseFloat(opt('softcap', '10')); // 0 = off
const prestigeMult = () => {
  const raw = 1 + CORE_PCT * coresEarned;
  if (!SOFTCAP || raw <= SOFTCAP) return raw;
  return SOFTCAP * Math.sqrt(raw / SOFTCAP);
};
function totalWps() {
  let sum = 0;
  for (const c of CORDS) sum += (owned[c.id] || 0) * c.wps * cordMultiplier(c.id);
  return sum * PROD_MULT * prestigeMult(); // no core-upgrade/buff multipliers (conservative)
}
function tapWpsFrac() {
  let f = 0;
  for (const u of UPGRADES) if (ups[u.id] && u.kind === 'tapwps') f += u.frac;
  return f;
}
function clickPower() {
  let p = 1, glob = 1;
  for (const u of UPGRADES) {
    if (!ups[u.id]) continue;
    if (u.kind === 'click') p *= u.mult;
    if (u.kind === 'global') glob *= u.mult;
  }
  return p * glob * PROD_MULT * prestigeMult() * Math.pow(1.5, tapMs()) + tapWpsFrac() * totalWps();
}
const nextCordCost = (c) => Math.ceil(c.baseCost * Math.pow(COST_GROWTH, owned[c.id] || 0));
const cordUnlocked = (i) => i === 0 || (owned[CORDS[i].id] || 0) > 0 || (owned[CORDS[i - 1].id] || 0) > 0;
const upUnlocked = (u) => !u.req || (owned[u.req.cord] || 0) >= u.req.n;
const cores = () => Math.floor(rootFn(runEarned / DIVISOR));

/* ---------- greedy run ---------- */
const TAP_RATE = 4;            // taps/sec while "active" (first 15 min + after each wall)
const ACTIVE_TAP_BUDGET = 15 * 60;
let tapSecondsLeft = ACTIVE_TAP_BUDGET;

const firstBuy = {};           // cordId -> seconds
const coreMarks = [];          // {t, cores, totalEarned} each time cores increases by >=10%
let lastCores = 0;
const decades = [];            // totalEarned decade crossings
let nextDecade = 1e3;
let purchases = 0;

const END = HOURS * 3600;
while (t < END) {
  // candidate purchases: next unit of each unlocked cord + each unlocked upgrade
  let best = null;
  for (let i = 0; i < CORDS.length; i++) {
    if (!cordUnlocked(i)) continue;
    const cost = nextCordCost(CORDS[i]);
    if (!best || cost < best.cost) best = { cost, buy: () => { owned[CORDS[i].id] = (owned[CORDS[i].id] || 0) + 1; if (!firstBuy[CORDS[i].id]) firstBuy[CORDS[i].id] = t; } };
  }
  for (const u of UPGRADES) {
    if (ups[u.id] || !upUnlocked(u)) continue;
    if (!best || u.cost < best.cost) best = { cost: u.cost, buy: () => { ups[u.id] = true; } };
  }
  if (!best) break;

  // advance until affordable (tapping adds income while the budget lasts)
  while (watts < best.cost && t < END) {
    const wps = totalWps();
    const tapping = tapSecondsLeft > 0 || wps === 0;
    const rate = wps + (tapping ? TAP_RATE * clickPower() : 0);
    if (rate <= 0) { t = END; break; }
    let dt = Math.min((best.cost - watts) / rate, 300); // re-evaluate clickPower etc.
    dt = Math.max(dt, 0.05);
    watts += rate * dt;
    totalEarned += rate * dt;
    runEarned += rate * dt;
    if (tapping) { clicks += TAP_RATE * dt; tapSecondsLeft = Math.max(0, tapSecondsLeft - dt); }
    t += dt;
    while (totalEarned >= nextDecade) { decades.push({ t, v: nextDecade }); nextDecade *= 10; }
    const c = cores();
    if (c >= Math.max(1, Math.ceil(lastCores * 1.1))) { coreMarks.push({ t, c, e: totalEarned }); lastCores = c; }
  }
  if (watts >= best.cost) { watts -= best.cost; best.buy(); purchases++; }

  // Prestige strategy (mirrors the in-game "deserved - earned" rule): reset
  // when doing so at least doubles lifetime cores. totalEarned persists across
  // runs in the real game, so the gain pool keeps growing.
  if (PRESTIGE) {
    const gain = Math.max(0, cores() - coresEarned);
    if (gain >= Math.max(1, coresEarned)) {
      coresEarned += gain;
      prestiges.push({ t, gained: gain, total: coresEarned });
      owned = {}; ups = {}; watts = 0; runEarned = 0;
      tapSecondsLeft = ACTIVE_TAP_BUDGET;   // player is active right after a reset
    }
  }
}

/* ---------- report ---------- */
const hm = (s) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, '0')}m` : `${m}m${Math.floor(s % 60)}s`;
};
const sci = (n) => n.toExponential(1);

console.log(`# PlugIdle balance sim — greedy bot, ${HOURS}h, prestige=${ROOT}(E/${sci(DIVISOR)})`);
console.log(`cost growth ${COST_GROWTH}, PROD_MULT ${PROD_MULT}, surges/prestige excluded (conservative)\n`);
console.log('## First purchase of each generator');
for (const c of CORDS) {
  if (firstBuy[c.id] != null) console.log(`  ${hm(firstBuy[c.id]).padStart(8)}  ${c.name} (base ${sci(c.baseCost)})`);
  else console.log(`     never  ${c.name} (base ${sci(c.baseCost)})`);
}
console.log('\n## Total-earned decades (orders of magnitude over time)');
for (const d of decades.filter((_, i) => i % 3 === 0)) console.log(`  ${hm(d.t).padStart(8)}  reached ${sci(d.v)} W total`);
console.log('\n## Prestige cores over time (deserved, never collected)');
for (const m of coreMarks.filter((_, i, a) => i % Math.ceil(a.length / 20) === 0 || i === a.length - 1)) {
  console.log(`  ${hm(m.t).padStart(8)}  ${String(m.c).padStart(10)} cores  (E=${sci(m.e)})`);
}
if (PRESTIGE) {
  console.log('\n## Prestige runs (reset when cores at least double)');
  for (const p of prestiges.slice(0, 30)) {
    console.log(`  ${hm(p.t).padStart(8)}  +${p.gained.toLocaleString()} cores → ${p.total.toLocaleString()} total (prod ×${(1 + CORE_PCT * p.total).toExponential(2)})`);
  }
  if (prestiges.length > 30) console.log(`  … ${prestiges.length - 30} more prestiges`);
}
console.log(`\n## End state @ ${hm(t)}`);
console.log(`  totalEarned ${sci(totalEarned)}  wps ${sci(totalWps())}  purchases ${purchases}`);
console.log(`  cores deserved ${cores().toLocaleString()}, earned ${coresEarned.toLocaleString()}  (prestige mult ×${(1 + CORE_PCT * Math.max(cores(), coresEarned)).toExponential(2)})`);
const last = CORDS[CORDS.length - 1];
console.log(`  ${last.name} (final tier) first bought: ${firstBuy[last.id] != null ? hm(firstBuy[last.id]) : 'never'}`);
