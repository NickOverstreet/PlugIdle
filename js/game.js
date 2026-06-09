/* ============================================================
   Cord Tycoon — a retro CRT idle game about plugging in cords.
   Pure vanilla JS, no dependencies.
   Durable saves: localStorage (sync) + IndexedDB (eviction-resistant).
   ============================================================ */
(() => {
  'use strict';

  const SAVE_KEY = 'cordTycoon.save.v1';
  const TICK_MS = 100;            // sim resolution
  const SAVE_EVERY_MS = 5000;     // autosave cadence
  const PROD_MULT = 1.6;          // global pacing: scales all income (active, idle & clicks)

  /* ---------- Content: cord generators ----------
     Each generator produces watts/sec. Cost grows 1.15x per buy. */
  const CORDS = [
    { id: 'usba',   icon: '🔌', name: 'USB-A Cable',     baseCost: 15,        wps: 0.1,   desc: 'The humble rectangle. Always upside down.' },
    { id: 'jack',   icon: '🎧', name: '3.5mm Audio Jack', baseCost: 100,      wps: 1,     desc: 'Plug in, hear the hiss of progress.' },
    { id: 'hdmi',   icon: '📺', name: 'HDMI Cable',       baseCost: 1100,     wps: 8,     desc: 'Now in glorious 4K throughput.' },
    { id: 'eth',    icon: '🌐', name: 'Ethernet Cable',   baseCost: 12000,    wps: 47,    desc: 'That satisfying RJ45 click.' },
    { id: 'usbc',   icon: '⚡', name: 'USB-C Cable',      baseCost: 130000,   wps: 260,   desc: 'Reversible. Finally.' },
    { id: 'power',  icon: '🔋', name: 'Power Cord',       baseCost: 1.4e6,    wps: 1400,  desc: 'The three-pronged workhorse.' },
    { id: 'thndr',  icon: '🌩️', name: 'Thunderbolt 4',    baseCost: 2e7,      wps: 7800,  desc: '40 Gbps of pure plug-in bliss.' },
    { id: 'fiber',  icon: '✨', name: 'Fiber Optic Line', baseCost: 3.3e8,    wps: 44000, desc: 'Plugging in at the speed of light.' },
    { id: 'indus',  icon: '🏭', name: 'Industrial Bus',   baseCost: 5.1e9,    wps: 260000,desc: 'Cables thicker than your arm.' },
    { id: 'subsea', icon: '🌊', name: 'Subsea Cable',     baseCost: 7.5e10,   wps: 1.6e6, desc: 'Wiring continents together.' },
    { id: 'orbit',  icon: '🛰️', name: 'Orbital Tether',   baseCost: 1e12,     wps: 1e7,   desc: 'A cord from the ground to the stars.' },
    { id: 'quantum',icon: '⚛️', name: 'Quantum Link',     baseCost: 1.4e13,   wps: 6.5e7, desc: 'Entangled. Connected. Everywhere at once.' },
  ];

  /* ---------- Content: upgrades ----------
     kind: 'click' multiplies tap power; 'global' multiplies all wps;
     'cord' multiplies one cord's output. req = total owned needed to unlock. */
  const UPGRADES = [
    { id: 'u_click1', icon: '👆', name: 'Reinforced Thumbs',  cost: 100,    kind: 'click',  mult: 2, desc: 'Tap power x2.' },
    { id: 'u_usba',   icon: '🔌', name: 'Gold USB Contacts',  cost: 500,    kind: 'cord', cord: 'usba',  mult: 2, req: { cord: 'usba', n: 5 }, desc: 'USB-A output x2.' },
    { id: 'u_click2', icon: '✋', name: 'Two-Handed Plugging',cost: 2000,   kind: 'click',  mult: 2, desc: 'Tap power x2.' },
    { id: 'u_jack',   icon: '🎧', name: 'Hi-Fi Insulation',   cost: 5000,   kind: 'cord', cord: 'jack',  mult: 2, req: { cord: 'jack', n: 5 }, desc: '3.5mm jack output x2.' },
    { id: 'u_glob1',  icon: '🧰', name: 'Cable Management',    cost: 25000,  kind: 'global', mult: 1.25, desc: 'All cords +25%.' },
    { id: 'u_hdmi',   icon: '📺', name: 'HDMI 2.1 Spec',       cost: 60000,  kind: 'cord', cord: 'hdmi',  mult: 2, req: { cord: 'hdmi', n: 5 }, desc: 'HDMI output x2.' },
    { id: 'u_click3', icon: '🦾', name: 'Robotic Plug Arm',   cost: 120000, kind: 'click',  mult: 3, desc: 'Tap power x3.' },
    { id: 'u_eth',    icon: '🌐', name: 'Cat-8 Shielding',     cost: 250000, kind: 'cord', cord: 'eth',   mult: 2, req: { cord: 'eth', n: 5 }, desc: 'Ethernet output x2.' },
    { id: 'u_glob2',  icon: '🏷️', name: 'Color-Coded Labels',  cost: 1e6,    kind: 'global', mult: 1.5,  desc: 'All cords +50%.' },
    { id: 'u_usbc',   icon: '⚡', name: '240W Power Delivery', cost: 3e6,    kind: 'cord', cord: 'usbc',  mult: 2, req: { cord: 'usbc', n: 5 }, desc: 'USB-C output x2.' },
    { id: 'u_power',  icon: '🔋', name: 'Surge Protection',    cost: 2.5e7,  kind: 'cord', cord: 'power', mult: 2, req: { cord: 'power', n: 5 }, desc: 'Power cord output x2.' },
    { id: 'u_glob3',  icon: '🤖', name: 'Automated Patch Bay', cost: 1.5e8,  kind: 'global', mult: 2,    desc: 'All cords x2.' },
    { id: 'u_thndr',  icon: '🌩️', name: 'Active Repeaters',    cost: 5e8,    kind: 'cord', cord: 'thndr', mult: 2, req: { cord: 'thndr', n: 5 }, desc: 'Thunderbolt output x2.' },
    { id: 'u_fiber',  icon: '✨', name: 'Dense WDM',           cost: 8e9,    kind: 'cord', cord: 'fiber', mult: 2, req: { cord: 'fiber', n: 5 }, desc: 'Fiber output x2.' },
    { id: 'u_glob4',  icon: '🛸', name: 'Self-Plugging Drones',cost: 1e11,   kind: 'global', mult: 3,    desc: 'All cords x3.' },
  ];

  // Every CORD_MILESTONE owned of a cord doubles that cord's output — milestone
  // bonuses that give near-term goals and bump the player past cost walls.
  const CORD_MILESTONE = 25;

  /* ---------- Content: achievements ----------
     `cond` decides when one unlocks; optional `prog` returns [current, target]. */
  const ACHIEVEMENTS = [
    { id: 'plug1',    icon: '🔌', name: 'First Contact',   desc: 'Plug in your first cord by hand.',        cond: () => state.clicks >= 1 },
    { id: 'plug100',  icon: '👆', name: 'Button Masher',   desc: 'Hand-plug 100 cords.',                    cond: () => state.clicks >= 100,   prog: () => [state.clicks, 100] },
    { id: 'plug1000', icon: '✋', name: 'Thumb of Steel',  desc: 'Hand-plug 1,000 cords.',                  cond: () => state.clicks >= 1000,  prog: () => [state.clicks, 1000] },
    { id: 'auto1',    icon: '🤖', name: 'Going Automatic', desc: 'Own your first auto-plugging cord.',      cond: () => totalGenerators() >= 1 },
    { id: 'own25',    icon: '📦', name: 'Bulk Buyer',      desc: 'Own 25 of a single cord (a ×2 milestone!).', cond: () => CORDS.some(c => (state.owned[c.id] || 0) >= 25) },
    { id: 'own50',    icon: '🏗️', name: 'Mass Production',  desc: 'Own 50 of a single cord.',                cond: () => CORDS.some(c => (state.owned[c.id] || 0) >= 50) },
    { id: 'own100',   icon: '🏰', name: 'Cord Tycoon',     desc: 'Own 100 of a single cord.',               cond: () => CORDS.some(c => (state.owned[c.id] || 0) >= 100) },
    { id: 'w1k',      icon: '💡', name: 'Kilowatt Club',   desc: 'Earn 1,000 total watts.',                 cond: () => state.totalEarned >= 1e3,  prog: () => [state.totalEarned, 1e3] },
    { id: 'w1m',      icon: '⚡', name: 'Megawatt Mogul',  desc: 'Earn 1 million total watts.',             cond: () => state.totalEarned >= 1e6,  prog: () => [state.totalEarned, 1e6] },
    { id: 'w1b',      icon: '🔆', name: 'Gigawatt Giant',  desc: 'Earn 1 billion total watts.',             cond: () => state.totalEarned >= 1e9,  prog: () => [state.totalEarned, 1e9] },
    { id: 'w1t',      icon: '🌟', name: 'Terawatt Tycoon', desc: 'Earn 1 trillion total watts.',            cond: () => state.totalEarned >= 1e12, prog: () => [state.totalEarned, 1e12] },
    { id: 'wps1k',    icon: '🚗', name: 'Auto Pilot',      desc: 'Reach 1,000 watts/sec.',                  cond: () => totalWps() >= 1e3,  prog: () => [totalWps(), 1e3] },
    { id: 'wps1m',    icon: '🏭', name: 'Power Plant',     desc: 'Reach 1 million watts/sec.',              cond: () => totalWps() >= 1e6,  prog: () => [totalWps(), 1e6] },
    { id: 'wps1b',    icon: '☢️', name: 'Reactor Online',  desc: 'Reach 1 billion watts/sec.',              cond: () => totalWps() >= 1e9,  prog: () => [totalWps(), 1e9] },
    { id: 'up1',      icon: '🧰', name: 'Tinkerer',        desc: 'Buy your first upgrade.',                 cond: () => Object.keys(state.upgrades).length >= 1 },
    { id: 'up5',      icon: '🔧', name: 'Engineer',        desc: 'Buy 5 upgrades.',                         cond: () => Object.keys(state.upgrades).length >= 5, prog: () => [Object.keys(state.upgrades).length, 5] },
    { id: 'allcord',  icon: '🧳', name: 'Full Toolkit',    desc: 'Own at least one of every cord type.',    cond: () => CORDS.every(c => (state.owned[c.id] || 0) >= 1), prog: () => [CORDS.filter(c => (state.owned[c.id] || 0) >= 1).length, CORDS.length] },
    { id: 'surge1',   icon: '✨', name: 'Spark Catcher',   desc: 'Catch your first power surge.',           cond: () => (state.surgesCollected || 0) >= 1 },
    { id: 'surge25',  icon: '🌩️', name: 'Storm Chaser',    desc: 'Catch 25 power surges.',                  cond: () => (state.surgesCollected || 0) >= 25, prog: () => [state.surgesCollected || 0, 25] },
    { id: 'prest1',   icon: '♻️', name: 'Recycler',        desc: 'Recycle for your first prestige core.',   cond: () => (state.cores || 0) >= 1 },
    { id: 'prest10',  icon: '💠', name: 'Core Collector',  desc: 'Hold 10 prestige cores.',                 cond: () => (state.cores || 0) >= 10, prog: () => [state.cores || 0, 10] },
    { id: 'quantum',  icon: '⚛️', name: 'Quantum Leap',    desc: 'Own a Quantum Link.',                     cond: () => (state.owned.quantum || 0) >= 1 },
  ];

  /* ---------- State ---------- */
  const defaultState = () => ({
    watts: 0,
    totalEarned: 0,
    clicks: 0,
    cores: 0,            // prestige currency
    owned: {},           // cordId -> count
    upgrades: {},        // upgradeId -> true
    achievements: {},    // achievementId -> true (persists across prestige)
    surgesCollected: 0,  // lifetime power surges caught
    startedAt: Date.now(),
    lastSeen: Date.now(),
    settings: { sound: true, floats: true, sci: false, haptics: true },
    bulk: 1,             // 1, 10, 100, or 'max'
  });

  let state = loadLocal() || defaultState();
  // backfill any missing fields from older/partial saves
  state = Object.assign(defaultState(), state);
  state.settings = Object.assign({ sound: true, floats: true, sci: false, haptics: true }, state.settings || {});

  /* ---------- Derived values ---------- */
  function prestigeMult() {
    return 1 + 0.05 * (state.cores || 0);
  }

  // An upgrade's multiplier applies to a cord's WHOLE output — every unit you
  // already own and every one you buy later — because output = n × per-unit ×
  // multiplier. Buying an upgrade therefore boosts your existing fleet too.
  function cordMultiplier(cordId) {
    let m = 1;
    for (const u of UPGRADES) {
      if (!state.upgrades[u.id]) continue;
      if (u.kind === 'cord' && u.cord === cordId) m *= u.mult;
      if (u.kind === 'global') m *= u.mult;
    }
    // Ownership milestones: ×2 for every CORD_MILESTONE owned.
    m *= Math.pow(2, Math.floor((state.owned[cordId] || 0) / CORD_MILESTONE));
    return m;
  }

  // Transient multipliers from power surges (not persisted; expire on their own).
  let buffs = [];
  function buffMult(kind) {
    const now = Date.now();
    let m = 1;
    for (const b of buffs) if (b.kind === kind && b.until > now) m *= b.mult;
    return m;
  }

  function cordWps(cord) {
    const n = state.owned[cord.id] || 0;
    return n * cord.wps * cordMultiplier(cord.id);
  }

  function totalWps() {
    let sum = 0;
    for (const c of CORDS) sum += cordWps(c);
    return sum * prestigeMult() * PROD_MULT * buffMult('prod');
  }

  function clickPower() {
    let p = 1;
    for (const u of UPGRADES) {
      if (state.upgrades[u.id] && u.kind === 'click') p *= u.mult;
    }
    // hand-plugging also benefits from global upgrades & prestige, lightly
    let glob = 1;
    for (const u of UPGRADES) {
      if (state.upgrades[u.id] && u.kind === 'global') glob *= u.mult;
    }
    return p * glob * prestigeMult() * PROD_MULT * buffMult('click');
  }

  function cordCost(cord, count) {
    // cost of buying `count` more, starting from current owned
    const owned = state.owned[cord.id] || 0;
    const r = 1.15;
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += cord.baseCost * Math.pow(r, owned + i);
    }
    return Math.ceil(total);
  }

  function maxAffordable(cord) {
    const owned = state.owned[cord.id] || 0;
    const r = 1.15;
    const base = cord.baseCost * Math.pow(r, owned);
    // geometric series: watts >= base*(r^k - 1)/(r-1)
    const w = state.watts;
    const k = Math.floor(Math.log((w * (r - 1)) / base + 1) / Math.log(r));
    return Math.max(0, isFinite(k) ? k : 0);
  }

  function buyCount(cord) {
    if (state.bulk === 'max') return Math.max(1, maxAffordable(cord));
    return state.bulk;
  }

  function totalGenerators() {
    let n = 0;
    for (const c of CORDS) n += state.owned[c.id] || 0;
    return n;
  }

  function prestigeGain() {
    // Total cores this run "deserves" follows a sqrt curve; you collect the
    // difference between that and what you already hold.
    const potential = Math.floor(Math.sqrt(state.totalEarned / 1e9));
    return Math.max(0, potential - (state.cores || 0));
  }

  /* ---------- Number formatting ---------- */
  const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 1000) return (Math.floor(n * 10) / 10).toString().replace(/\.0$/, '');
    if (state.settings.sci) return n.toExponential(2).replace('e+', 'e');
    const tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIXES.length) return n.toExponential(2).replace('e+', 'e');
    const scaled = n / Math.pow(1000, tier);
    return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + SUFFIXES[tier];
  }
  function fmtInt(n) { return Math.floor(n).toLocaleString('en-US'); }

  /* ---------- Persistence ----------
     Saves are written to two client-side stores for durability:
       • localStorage — synchronous, so it survives `pagehide`/`beforeunload`
       • IndexedDB    — larger quota and far more eviction-resistant; the primary
     On load we reconcile the two by `lastSeen` and keep the freshest. */

  const DB_NAME = 'cordTycoon';
  const DB_STORE = 'saves';

  function idbOpen() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no-idb'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function idbGet(key) {
    return idbOpen().then(db => new Promise((resolve, reject) => {
      const r = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(r.error);
    })).catch(() => null);
  }
  function idbSet(key, value) {
    return idbOpen().then(db => new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    })).catch(() => false);
  }
  function idbDel(key) {
    return idbOpen().then(db => new Promise((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    })).catch(() => false);
  }

  // Ask the browser to exempt our data from automatic eviction.
  async function requestPersistence() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        const already = navigator.storage.persisted ? await navigator.storage.persisted() : false;
        if (!already) await navigator.storage.persist();
      }
    } catch (e) { /* not supported */ }
  }

  function save() {
    state.lastSeen = Date.now();
    const json = JSON.stringify(state);
    try { localStorage.setItem(SAVE_KEY, json); } catch (e) { /* full/blocked */ }
    idbSet(SAVE_KEY, json); // async durable mirror of the synchronous copy above
  }

  // Synchronous, localStorage-only — keeps `state` ready before the async boot.
  function loadLocal() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // Durable load: read both stores and return whichever save is newest.
  async function loadDurable() {
    const ls = loadLocal();
    let idb = null;
    try {
      const raw = await idbGet(SAVE_KEY);
      idb = raw ? JSON.parse(raw) : null;
    } catch (e) { idb = null; }
    if (ls && idb) return (idb.lastSeen || 0) >= (ls.lastSeen || 0) ? idb : ls;
    return idb || ls;
  }

  async function storageInfo() {
    let persisted = false;
    try {
      if (navigator.storage?.persisted) persisted = await navigator.storage.persisted();
    } catch (e) { /* unsupported */ }
    return { persisted, idb: 'indexedDB' in window };
  }

  /* ---------- DOM refs ---------- */
  const $ = (s) => document.querySelector(s);
  const el = {
    watts: $('#watts'), wps: $('#wps'), tapval: $('#tapval'), coresline: $('#coresline'),
    socket: $('#socket'), socketSvg: $('#socketSvg'),
    buffBar: $('#buffBar'), floaters: $('#floaters'), surgeLayer: $('#surgeLayer'),
    cordlist: $('#cordlist'), uplist: $('#uplist'), goallist: $('#goallist'), goalcount: $('#goalcount'),
    statTotal: $('#statTotal'), statClicks: $('#statClicks'), statWps: $('#statWps'),
    statGens: $('#statGens'), statSurges: $('#statSurges'), statAch: $('#statAch'),
    statTime: $('#statTime'), statCores: $('#statCores'),
    coregain: $('#coregain'), corecount: $('#corecount'), prestigemult: $('#prestigemult'),
    prestigeBtn: $('#prestigeBtn'),
    toast: $('#toast'), modal: $('#modal'), mbox: $('#mbox'),
    savebox: $('#savebox'), exportBtn: $('#exportBtn'), importBtn: $('#importBtn'), wipeBtn: $('#wipeBtn'),
    storageStatus: $('#storageStatus'),
  };

  /* ---------- Toast (stacked) ---------- */
  function toast(msg, gold) {
    const t = document.createElement('div');
    t.className = 'toast' + (gold ? ' gold' : '');
    t.textContent = msg;
    el.toast.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  /* ---------- Sound (tiny WebAudio blips) ---------- */
  let audioCtx;
  function blip(freq = 440, dur = 0.05, type = 'square', gain = 0.04) {
    if (!state.settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.value = gain;
      o.connect(g); g.connect(audioCtx.destination);
      const t = audioCtx.currentTime;
      o.start(t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.stop(t + dur);
    } catch (e) { /* audio blocked */ }
  }

  /* ---------- Haptics (Vibration API) ----------
     Progressive enhancement: unsupported on iOS Safari, where the audio +
     visual feedback already covers it. Feature-detected and setting-gated. */
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  function buzz(pattern) {
    if (!state.settings.haptics || !canVibrate) return;
    try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
  }

  /* ---------- Floating numbers ---------- */
  function spawnFloater(amount) {
    if (!state.settings.floats) return;
    const r = el.socket.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'float';
    f.textContent = '+' + fmt(amount);
    f.style.left = (r.left + r.width / 2 - 20 + (Math.random() * 60 - 30)) + 'px';
    f.style.top = (r.top + 40) + 'px';
    el.floaters.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }

  /* ---------- Juice: subtle screenshake ---------- */
  const reduceMotion = () =>
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function screenShake(intensity = 1) {
    if (!state.settings.floats || reduceMotion()) return; // respect the animations toggle
    const app = document.getElementById('app');
    if (!app || !app.animate) return;
    const k = intensity;
    app.animate([
      { transform: 'translate(0,0)' },
      { transform: `translate(${-5 * k}px, ${2 * k}px)` },
      { transform: `translate(${4 * k}px, ${-3 * k}px)` },
      { transform: `translate(${-2 * k}px, ${1 * k}px)` },
      { transform: 'translate(0,0)' },
    ], { duration: 180, easing: 'ease-out' });
  }

  /* ---------- Power surges (Golden-Cookie style bonus events) ---------- */
  let surgeActive = false;
  let surgeHideTimer = null;

  function scheduleSurge() {
    const delay = 60000 + Math.random() * 90000; // 60–150s between surges
    setTimeout(trySpawnSurge, delay);
  }
  function trySpawnSurge() {
    if (document.hidden || surgeActive) { scheduleSurge(); return; }
    spawnSurge();
  }
  function spawnSurge() {
    surgeActive = true;
    const node = document.createElement('button');
    node.className = 'surge';
    node.type = 'button';
    node.setAttribute('aria-label', 'Tap the power surge for a bonus!');
    node.textContent = '⚡';
    node.style.left = (12 + Math.random() * 70) + '%';
    node.style.top = (16 + Math.random() * 60) + '%';
    node.addEventListener('click', () => collectSurge(node));
    el.surgeLayer.appendChild(node);
    blip(880, 0.16, 'sine', 0.045); // gentle chime to draw the eye
    surgeHideTimer = setTimeout(() => { removeSurge(node); scheduleSurge(); }, 14000);
  }
  function removeSurge(node) {
    surgeActive = false;
    if (surgeHideTimer) { clearTimeout(surgeHideTimer); surgeHideTimer = null; }
    if (node) node.remove();
  }
  function collectSurge(node) {
    removeSurge(node);
    const now = Date.now();
    const roll = Math.random();
    if (roll < 0.5) {
      const bonus = Math.max(totalWps() * 90, clickPower() * 60, 50);
      state.watts += bonus;
      state.totalEarned += bonus;
      spawnFloater(bonus);
      toast('⚡ OVERLOAD! +' + fmt(bonus) + ' W', true);
    } else if (roll < 0.75) {
      buffs.push({ kind: 'prod', mult: 7, until: now + 15000, icon: '🔥', label: 'FRENZY ×7' });
      toast('🔥 PRODUCTION FRENZY ×7!', true);
    } else {
      buffs.push({ kind: 'click', mult: 10, until: now + 12000, icon: '👆', label: 'CLICK ×10' });
      toast('👆 CLICK FRENZY ×10!', true);
    }
    state.surgesCollected = (state.surgesCollected || 0) + 1;
    blip(1200, 0.18, 'square', 0.06);
    buzz([0, 30, 50, 30]);
    screenShake(1.2);
    checkAchievements();
    renderBuffs();
    renderStatsLite();
    scheduleSurge();
  }

  function renderBuffs() {
    const now = Date.now();
    buffs = buffs.filter((b) => b.until > now);
    if (!buffs.length) { el.buffBar.classList.remove('show'); el.buffBar.innerHTML = ''; return; }
    el.buffBar.classList.add('show');
    el.buffBar.innerHTML = buffs
      .map((b) => `<span class="buff">${b.icon} ${b.label} · ${Math.ceil((b.until - now) / 1000)}s</span>`)
      .join('');
  }

  /* ---------- Achievements ---------- */
  function checkAchievements() {
    let earnedNew = false;
    for (const a of ACHIEVEMENTS) {
      if (state.achievements[a.id]) continue;
      let ok = false;
      try { ok = a.cond(); } catch (e) { ok = false; }
      if (ok) {
        state.achievements[a.id] = true;
        earnedNew = true;
        toast('🏆 ' + a.name, true);
        blip(1320, 0.2, 'triangle', 0.06);
        buzz([0, 20, 50, 20, 50, 40]);
        screenShake(0.8);
      }
    }
    if (earnedNew && document.getElementById('p-goals').classList.contains('active')) {
      renderGoals();
    }
  }

  function renderGoals() {
    const done = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length;
    el.goalcount.textContent = `(${done}/${ACHIEVEMENTS.length})`;
    let html = '';
    for (const a of ACHIEVEMENTS) {
      const got = !!state.achievements[a.id];
      let prog = '';
      if (!got && a.prog) {
        const [cur, max] = a.prog();
        const pct = Math.max(0, Math.min(100, (cur / max) * 100));
        prog = `<div class="ach-prog"><i style="width:${pct}%"></i></div>` +
               `<div class="ach-progtext">${fmt(Math.min(cur, max))} / ${fmt(max)}</div>`;
      }
      html += `
        <div class="goal ${got ? 'done' : 'locked'}">
          <div class="gi">${got ? a.icon : '🔒'}</div>
          <div class="gbody">
            <div class="gn">${a.name}</div>
            <div class="gd">${a.desc}</div>
            ${prog}
          </div>
          ${got ? '<div class="gcheck">✓</div>' : ''}
        </div>`;
    }
    el.goallist.innerHTML = html;
  }

  /* ---------- Core actions ---------- */
  function plug() {
    const gain = clickPower();
    state.watts += gain;
    state.totalEarned += gain;
    state.clicks++;
    spawnFloater(gain);
    blip(660 + Math.random() * 80, 0.04, 'triangle');
    buzz(8); // light tap tick
    if (state.settings.floats) {
      el.socket.classList.add('tapping');
      setTimeout(() => el.socket.classList.remove('tapping'), 200);
      el.socketSvg.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
        { duration: 160, easing: 'ease-out' }
      );
    }
    checkAchievements();
    renderStatsLite();
  }

  function buyCord(cord) {
    const count = buyCount(cord);
    if (count <= 0) return;
    const cost = cordCost(cord, count);
    if (state.watts < cost) { toast('Not enough watts'); blip(120, 0.06); return; }
    const before = state.owned[cord.id] || 0;
    state.watts -= cost;
    const after = before + count;
    state.owned[cord.id] = after;
    blip(320, 0.06, 'square', 0.05);
    buzz(12);
    // Celebrate crossing a ×2 ownership milestone.
    if (Math.floor(after / CORD_MILESTONE) > Math.floor(before / CORD_MILESTONE)) {
      const tier = Math.pow(2, Math.floor(after / CORD_MILESTONE));
      toast(`✖️ ${cord.name} milestone! Now ×${tier}`, true);
      blip(990, 0.18, 'sawtooth', 0.05);
      buzz([0, 25, 40, 25]);
      screenShake(1);
    }
    checkAchievements();
    renderCords();
    renderStatsLite();
  }

  function buyUpgrade(u) {
    if (state.upgrades[u.id]) return;
    if (state.watts < u.cost) { toast('Not enough watts'); blip(120, 0.06); return; }
    state.watts -= u.cost;
    state.upgrades[u.id] = true;
    blip(880, 0.12, 'sawtooth', 0.05);
    buzz([0, 15, 30, 15]);
    toast('⬆ ' + u.name + ' purchased!');
    checkAchievements();
    renderShop();
    renderStatsLite();
  }

  function upgradeUnlocked(u) {
    if (!u.req) return true;
    return (state.owned[u.req.cord] || 0) >= u.req.n;
  }

  /* ---------- Rendering ---------- */
  function renderShop() {
    renderCords();
    renderUpgrades();
  }

  function renderCords() {
    const bulkBar = `
      <div class="bulk-bar">
        ${[1, 10, 100, 'max'].map(b =>
          `<button class="bulk-btn ${state.bulk === b ? 'active' : ''}" data-bulk="${b}">${b === 'max' ? 'MAX' : 'x' + b}</button>`
        ).join('')}
      </div>`;

    let html = bulkBar;
    let anyUnlocked = false;
    CORDS.forEach((cord, i) => {
      const owned = state.owned[cord.id] || 0;
      // unlock a cord once the previous one has at least 1, or it's the first
      const prevOwned = i === 0 ? 1 : (state.owned[CORDS[i - 1].id] || 0);
      const visible = owned > 0 || prevOwned > 0;
      if (!visible) return;
      anyUnlocked = true;
      const count = buyCount(cord);
      const cost = cordCost(cord, count);
      const can = state.watts >= cost;
      const each = cord.wps * cordMultiplier(cord.id) * prestigeMult() * PROD_MULT;
      const nextMs = (Math.floor(owned / CORD_MILESTONE) + 1) * CORD_MILESTONE;
      const msPct = (owned % CORD_MILESTONE) / CORD_MILESTONE * 100;
      html += `
        <button class="card buyable" data-cord="${cord.id}">
          <div class="ico">${cord.icon}</div>
          <div class="body">
            <div class="nm">${cord.name}</div>
            <div class="meta"><span class="pos">${fmt(each)} W/s each</span> · ${cord.desc}</div>
            <div class="milestone"><i style="width:${msPct}%"></i></div>
          </div>
          <div class="right">
            <div class="owned">own ${fmtInt(owned)}${count > 1 ? `<small> +${count}</small>` : ''}</div>
            <div class="cost ${can ? 'ok' : 'no'}">${fmt(cost)} W</div>
            ${owned > 0 ? `<div class="mnote">×2 @ ${nextMs}</div>` : ''}
          </div>
        </button>`;
    });
    if (!anyUnlocked) html += `<p class="empty-note">Tap the socket to earn your first watts!</p>`;
    el.cordlist.innerHTML = html;
  }

  function renderUpgrades() {
    // Show every unlocked upgrade; purchased ones stay visible but greyed.
    const list = UPGRADES
      .filter(u => state.upgrades[u.id] || upgradeUnlocked(u))
      .sort((a, b) => a.cost - b.cost);
    if (list.length === 0) {
      el.uplist.innerHTML = `<p class="empty-note">Buy more cords to unlock upgrades…</p>`;
      return;
    }
    let html = '';
    for (const u of list) {
      const bought = !!state.upgrades[u.id];
      const can = !bought && state.watts >= u.cost;
      const cls = bought ? 'bought' : can ? 'ok' : 'no';
      html += `
        <button class="upg ${cls}" data-upgrade="${u.id}">
          <div class="un">${u.name}</div>
          <div class="ud">${u.desc}</div>
          <div class="uc">${bought ? '✓ OWNED' : fmt(u.cost) + ' W'}</div>
        </button>`;
    }
    el.uplist.innerHTML = html;
  }

  // lightweight per-frame updates (numbers only, no list rebuild)
  function renderStatsLite() {
    const wps = totalWps();
    el.watts.textContent = fmt(state.watts);
    el.wps.textContent = fmt(wps);
    el.tapval.textContent = fmt(clickPower());
    el.coresline.textContent = (state.cores || 0) > 0
      ? `◆ ${fmtInt(state.cores)} cores +${state.cores * 5}%` : '';
    el.statTotal.textContent = fmt(state.totalEarned);
    el.statClicks.textContent = fmtInt(state.clicks);
    el.statWps.textContent = fmt(wps);
    el.statGens.textContent = fmtInt(totalGenerators());
    el.statSurges.textContent = fmtInt(state.surgesCollected || 0);
    el.statAch.textContent = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length + ' / ' + ACHIEVEMENTS.length;
    el.statCores.textContent = fmtInt(state.cores || 0);
    el.statTime.textContent = fmtDuration(Date.now() - state.startedAt);
    const pg = prestigeGain();
    el.coregain.textContent = fmtInt(pg);
    el.corecount.textContent = fmtInt(state.cores || 0);
    el.prestigemult.textContent = '+' + ((state.cores || 0) * 5) + '%';
    el.prestigeBtn.classList.toggle('dis', pg < 1);
  }

  function fmtDuration(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function syncSettingsUI() {
    document.querySelectorAll('.sw').forEach((b) => {
      const v = b.dataset.set === 'sound' ? state.settings.sound
              : b.dataset.set === 'haptic' ? state.settings.haptics
              : b.dataset.set === 'anim' ? state.settings.floats
              : state.settings.sci;
      b.classList.toggle('on', !!v);
      b.textContent = v ? 'ON' : 'OFF';
    });
    document.body.classList.toggle('noanim', !state.settings.floats);
  }

  function renderAll() {
    renderShop();
    renderGoals();
    renderBuffs();
    renderStatsLite();
    syncSettingsUI();
  }

  /* ---------- Affordability refresh (cheap, runs each tick) ---------- */
  let lastSig = '';
  function refreshAffordability() {
    let sig = state.bulk + '|';
    for (let i = 0; i < CORDS.length; i++) {
      const c = CORDS[i];
      const owned = state.owned[c.id] || 0;
      const prevOwned = i === 0 ? 1 : (state.owned[CORDS[i - 1].id] || 0);
      const visible = owned > 0 || prevOwned > 0;
      sig += (visible ? (state.watts >= cordCost(c, buyCount(c)) ? '1' : '0') : '-');
    }
    sig += '|';
    for (const u of UPGRADES) {
      if (state.upgrades[u.id]) { sig += 'b'; continue; }
      if (!upgradeUnlocked(u)) { sig += '-'; continue; }
      sig += state.watts >= u.cost ? '1' : '0';
    }
    if (sig !== lastSig) {
      lastSig = sig;
      renderShop();
    }
  }

  /* ---------- Modal helpers ---------- */
  function showModal(html) { el.mbox.innerHTML = html; el.modal.classList.add('show'); }
  function hideModal() { el.modal.classList.remove('show'); }

  /* ---------- Prestige ---------- */
  function doPrestige() {
    const gain = prestigeGain();
    if (gain <= 0) { toast('Earn more before recycling'); return; }
    const newPct = ((state.cores || 0) + gain) * 5;
    showModal(`
      <h2 class="danger">♻ RECYCLE?</h2>
      <p class="dim">Reset all watts, cords &amp; upgrades.</p>
      <p class="big">+${fmt(gain)} ◆ Cores</p>
      <p>New bonus: <b style="color:var(--green)">+${newPct}%</b></p>
      <div class="row2" style="margin-top:14px">
        <button class="bigbtn" id="mYes">CONFIRM</button>
        <button class="smbtn" id="mNo">CANCEL</button>
      </div>`);
    document.getElementById('mYes').addEventListener('click', () => {
      const carry = {
        cores: (state.cores || 0) + gain,
        settings: state.settings,
        achievements: state.achievements,
        surgesCollected: state.surgesCollected,
        startedAt: state.startedAt,
      };
      state = Object.assign(defaultState(), carry);
      buffs = [];
      save();
      hideModal();
      blip(220, 0.3, 'sawtooth', 0.06);
      buzz([0, 40, 60, 40, 60, 80]);
      screenShake(1.5);
      toast(`♻ Empire recycled. +${gain} cores`, true);
      checkAchievements();
      renderAll();
    });
    document.getElementById('mNo').addEventListener('click', hideModal);
  }

  /* ---------- Offline earnings ---------- */
  function applyOffline() {
    const now = Date.now();
    const away = Math.min(now - (state.lastSeen || now), 1000 * 60 * 60 * 24); // cap 24h
    if (away < 1000 * 30) return; // ignore < 30s
    const rate = totalWps();
    const earned = rate * (away / 1000) * 0.5; // 50% efficiency while away
    if (earned <= 0) return;
    state.watts += earned;
    state.totalEarned += earned;
    const h = Math.floor(away / 3600000), m = Math.floor((away % 3600000) / 60000);
    showModal(`
      <h2>⚡ WELCOME BACK</h2>
      <p class="dim">Your cords ran for<br><b style="color:var(--cyan)">${h}h ${m}m</b> (50% rate)</p>
      <p class="big">+${fmt(earned)} W</p>
      <button class="bigbtn" id="wbOk" style="margin-top:12px">COLLECT</button>`);
    document.getElementById('wbOk').addEventListener('click', hideModal);
  }

  /* ---------- Save / load UI ---------- */
  function exportSave() {
    save();
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    el.savebox.value = code;
    try { navigator.clipboard?.writeText(code); } catch (e) { /* ignore */ }
    toast('📤 Save exported to box');
  }
  function importSave() {
    const code = (el.savebox.value || '').trim();
    if (!code) { toast('Paste a save code first'); return; }
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(code))));
      if (typeof obj !== 'object' || obj.watts === undefined) throw new Error('bad');
      state = Object.assign(defaultState(), obj);
      state.settings = Object.assign({ sound: true, floats: true, sci: false, haptics: true }, state.settings || {});
      save();
      toast('📥 Save imported!');
      renderAll();
    } catch (e) { toast('⚠ Invalid save code'); }
  }
  function hardReset() {
    showModal(`
      <h2 class="danger">⚠ HARD RESET</h2>
      <p class="dim">Erase everything permanently?</p>
      <div class="row2" style="margin-top:14px">
        <button class="bigbtn danger" id="wY">ERASE</button>
        <button class="smbtn" id="wN">CANCEL</button>
      </div>`);
    document.getElementById('wY').addEventListener('click', () => {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
      idbDel(SAVE_KEY);
      state = defaultState();
      buffs = [];
      save();
      hideModal();
      toast('Reset complete');
      renderAll();
    });
    document.getElementById('wN').addEventListener('click', hideModal);
  }

  /* ---------- Event wiring ---------- */
  el.socket.addEventListener('click', plug);
  // iOS suppresses :active styling unless a touchstart listener exists.
  document.body.addEventListener('touchstart', () => {}, { passive: true });

  // tabs (bottom nav)
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('p-' + tab.dataset.tab).classList.add('active');
      blip(520, 0.03);
      if (tab.dataset.tab === 'goals') renderGoals();
      else if (tab.dataset.tab === 'up') renderUpgrades();
      else if (tab.dataset.tab === 'plug') renderCords();
      else if (tab.dataset.tab === 'more') { renderStatsLite(); syncSettingsUI(); }
    });
  });

  // delegated shop clicks
  el.cordlist.addEventListener('click', (e) => {
    const bulkBtn = e.target.closest('[data-bulk]');
    if (bulkBtn) {
      const v = bulkBtn.dataset.bulk;
      state.bulk = v === 'max' ? 'max' : parseInt(v, 10);
      lastSig = '';
      renderCords();
      return;
    }
    const item = e.target.closest('[data-cord]');
    if (item) buyCord(CORDS.find(c => c.id === item.dataset.cord));
  });
  el.uplist.addEventListener('click', (e) => {
    const item = e.target.closest('[data-upgrade]');
    if (item) buyUpgrade(UPGRADES.find(u => u.id === item.dataset.upgrade));
  });

  // prestige + save buttons
  el.prestigeBtn.addEventListener('click', doPrestige);
  el.exportBtn.addEventListener('click', exportSave);
  el.importBtn.addEventListener('click', importSave);
  el.wipeBtn.addEventListener('click', hardReset);

  // settings switches
  document.querySelectorAll('.sw').forEach((b) => {
    b.addEventListener('click', () => {
      const k = b.dataset.set;
      if (k === 'sound') state.settings.sound = !state.settings.sound;
      else if (k === 'haptic') { state.settings.haptics = !state.settings.haptics; if (state.settings.haptics) buzz(20); }
      else if (k === 'anim') state.settings.floats = !state.settings.floats;
      else state.settings.sci = !state.settings.sci;
      syncSettingsUI();
      renderStatsLite();
      renderShop();
      save();
    });
  });

  // close modal by tapping the backdrop
  el.modal.addEventListener('click', (e) => { if (e.target === el.modal) hideModal(); });

  // keyboard: space/enter to plug
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault();
      plug();
    }
  });

  // save on hide / unload
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeunload', save);

  // Reflect where/how the save is stored, shown in the settings panel.
  async function updateStorageStatus() {
    if (!el.storageStatus) return;
    const info = await storageInfo();
    const stores = ['localStorage', info.idb ? 'IndexedDB' : null].filter(Boolean).join(' + ');
    const lock = info.persisted ? ' · persistent' : '';
    el.storageStatus.textContent = `Saved on this device via ${stores}${lock}.`;
  }

  /* ---------- Main loop ---------- */
  let lastTick = Date.now();
  let tickCount = 0;
  function tick() {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    const gain = totalWps() * dt;
    if (gain > 0) {
      state.watts += gain;
      state.totalEarned += gain;
    }
    tickCount++;
    renderBuffs();            // count down / clear expired surge buffs
    checkAchievements();      // catches threshold (watts/time) unlocks
    renderStatsLite();
    refreshAffordability();
    // Live-refresh the Goals tab's progress bars while it's open (~2x/sec).
    if (tickCount % 5 === 0 && document.getElementById('p-goals').classList.contains('active')) {
      renderGoals();
    }
  }

  /* ---------- Boot ---------- */
  (async function boot() {
    // Reconcile with the durable IndexedDB copy before anything accrues.
    const durable = await loadDurable();
    if (durable) {
      state = Object.assign(defaultState(), durable);
      state.settings = Object.assign({ sound: true, floats: true, sci: false, haptics: true }, state.settings || {});
    }
    await requestPersistence();
    applyOffline();
    renderAll();
    save();              // re-mirror the reconciled state into both stores (self-heal)
    updateStorageStatus();
    checkAchievements();  // award anything already satisfied by the loaded save
    lastTick = Date.now(); // don't count the async load time as idle earnings
    setInterval(tick, TICK_MS);
    setInterval(save, SAVE_EVERY_MS);
    scheduleSurge();      // begin the power-surge cadence
  })();

  // register service worker for installability + offline
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
