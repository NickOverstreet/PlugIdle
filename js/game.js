/* ============================================================
   Cord Tycoon — an idle game about plugging in cords.
   Pure vanilla JS, no dependencies. Saves to localStorage.
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

  /* ---------- State ---------- */
  const defaultState = () => ({
    watts: 0,
    totalEarned: 0,
    clicks: 0,
    cores: 0,            // prestige currency
    owned: {},           // cordId -> count
    upgrades: {},        // upgradeId -> true
    startedAt: Date.now(),
    lastSeen: Date.now(),
    settings: { sound: true, floats: true, sci: false },
    bulk: 1,             // 1, 10, 100, or 'max'
  });

  let state = loadLocal() || defaultState();
  // backfill any missing fields from older/partial saves
  state = Object.assign(defaultState(), state);
  state.settings = Object.assign({ sound: true, floats: true, sci: false }, state.settings || {});

  /* ---------- Derived values ---------- */
  function prestigeMult() {
    return 1 + 0.05 * (state.cores || 0);
  }

  function cordMultiplier(cordId) {
    let m = 1;
    for (const u of UPGRADES) {
      if (!state.upgrades[u.id]) continue;
      if (u.kind === 'cord' && u.cord === cordId) m *= u.mult;
      if (u.kind === 'global') m *= u.mult;
    }
    return m;
  }

  function cordWps(cord) {
    const n = state.owned[cord.id] || 0;
    return n * cord.wps * cordMultiplier(cord.id);
  }

  function totalWps() {
    let sum = 0;
    for (const c of CORDS) sum += cordWps(c);
    return sum * prestigeMult() * PROD_MULT;
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
    return p * glob * prestigeMult() * PROD_MULT;
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
    if (n < 1000) return (Math.floor(n * 10) / 10).toString().replace(/\.0$/, '');
    // Scientific notation mode (settings toggle): e.g. 1.23e6
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
     On load we reconcile the two by `lastSeen` and keep the freshest, so if one
     layer is wiped (e.g. iOS Safari evicts localStorage after ~7 idle days) the
     other restores it. We also request persistent-storage permission to opt out
     of eviction entirely where the browser supports it. */

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
    let persisted = false, usage = 0, quota = 0;
    try {
      if (navigator.storage?.persisted) persisted = await navigator.storage.persisted();
      if (navigator.storage?.estimate) {
        const est = await navigator.storage.estimate();
        usage = est.usage || 0; quota = est.quota || 0;
      }
    } catch (e) { /* unsupported */ }
    return { persisted, idb: 'indexedDB' in window, usage, quota };
  }

  /* ---------- DOM refs ---------- */
  const $ = (s) => document.querySelector(s);
  const el = {
    watts: $('#watts'), wps: $('#wps'), perClick: $('#perClick'),
    socket: $('#socket'), socketIcon: $('#socketIcon'), floaters: $('#floaters'),
    cords: $('#cords'), upgrades: $('#upgrades'),
    statTotal: $('#statTotal'), statClicks: $('#statClicks'), statWps: $('#statWps'),
    statGens: $('#statGens'), statTime: $('#statTime'), statCores: $('#statCores'),
    prestigeGain: $('#prestigeGain'), prestigeBtn: $('#prestigeBtn'),
    toast: $('#toast'),
    offlineModal: $('#offlineModal'), offlineAmount: $('#offlineAmount'), offlineClose: $('#offlineClose'),
    menuModal: $('#menuModal'), menuBtn: $('#menuBtn'), menuClose: $('#menuClose'),
    soundToggle: $('#soundToggle'), floatToggle: $('#floatToggle'), sciToggle: $('#sciToggle'),
    exportBtn: $('#exportBtn'), importBtn: $('#importBtn'), resetBtn: $('#resetBtn'),
    storageStatus: $('#storageStatus'),
  };

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 1800);
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

  /* ---------- Floating numbers ---------- */
  function spawnFloater(amount) {
    if (!state.settings.floats) return;
    const f = document.createElement('div');
    f.className = 'floater';
    f.textContent = '+' + fmt(amount);
    const x = 40 + Math.random() * 90; // px from left within tap zone
    f.style.left = x + 'px';
    f.style.top = '55%';
    el.floaters.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  /* ---------- Core actions ---------- */
  function plug() {
    const gain = clickPower();
    state.watts += gain;
    state.totalEarned += gain;
    state.clicks++;
    spawnFloater(gain);
    blip(660 + Math.random() * 80, 0.04, 'triangle');
    // pulse the socket icon
    el.socketIcon.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
      { duration: 160, easing: 'ease-out' }
    );
    renderStatsLite();
  }

  function buyCord(cord) {
    const count = buyCount(cord);
    if (count <= 0) return;
    const cost = cordCost(cord, count);
    if (state.watts < cost) { toast('Not enough watts'); return; }
    state.watts -= cost;
    state.owned[cord.id] = (state.owned[cord.id] || 0) + count;
    blip(320, 0.06, 'square', 0.05);
    renderShop();
    renderStatsLite();
  }

  function buyUpgrade(u) {
    if (state.upgrades[u.id]) return;
    if (state.watts < u.cost) { toast('Not enough watts'); return; }
    state.watts -= u.cost;
    state.upgrades[u.id] = true;
    blip(880, 0.12, 'sawtooth', 0.05);
    toast('Upgrade: ' + u.name);
    renderShop();
    renderStatsLite();
  }

  function upgradeUnlocked(u) {
    if (!u.req) return true;
    return (state.owned[u.req.cord] || 0) >= u.req.n;
  }

  function doPrestige() {
    const gain = prestigeGain();
    if (gain <= 0) { toast('Earn more before recycling'); return; }
    if (!confirm(`Recycle everything for ${gain} prestige core(s)? Your watts, cords, and upgrades reset.`)) return;
    const keepCores = (state.cores || 0) + gain;
    const settings = state.settings;
    state = defaultState();
    state.cores = keepCores;
    state.settings = settings;
    save();
    blip(220, 0.3, 'sawtooth', 0.06);
    toast(`+${gain} prestige core(s)! All earnings boosted.`);
    renderAll();
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
      html += `
        <button class="item ${can ? 'affordable' : ''}" data-cord="${cord.id}">
          <div class="item-icon">${cord.icon}</div>
          <div class="item-body">
            <div class="item-name">${cord.name}</div>
            <div class="item-desc">${fmt(each)} W/s each · ${cord.desc}</div>
          </div>
          <div class="item-right">
            <div class="item-cost ${can ? 'cheap' : 'pricey'}">${fmt(cost)}</div>
            <div class="item-owned">own ${owned}${count > 1 ? ' · +' + count : ''}</div>
          </div>
        </button>`;
    });
    if (!anyUnlocked) html += `<p class="empty-note">Tap the socket to earn your first watts!</p>`;
    el.cords.innerHTML = html;
  }

  function renderUpgrades() {
    const available = UPGRADES.filter(u => !state.upgrades[u.id] && upgradeUnlocked(u));
    if (available.length === 0) {
      el.upgrades.innerHTML = `<p class="empty-note">No upgrades available right now.<br/>Buy more cords to unlock upgrades!</p>`;
      return;
    }
    let html = '';
    available
      .sort((a, b) => a.cost - b.cost)
      .forEach(u => {
        const can = state.watts >= u.cost;
        html += `
          <button class="item ${can ? 'affordable' : ''}" data-upgrade="${u.id}">
            <div class="item-icon">${u.icon}</div>
            <div class="item-body">
              <div class="item-name">${u.name}</div>
              <div class="item-desc">${u.desc}</div>
            </div>
            <div class="item-right">
              <div class="item-cost ${can ? 'cheap' : 'pricey'}">${fmt(u.cost)}</div>
            </div>
          </button>`;
      });
    el.upgrades.innerHTML = html;
  }

  // lightweight per-frame updates (numbers only, no list rebuild)
  function renderStatsLite() {
    el.watts.textContent = fmt(state.watts);
    el.wps.textContent = fmt(totalWps());
    el.perClick.textContent = '+' + fmt(clickPower());
    el.statTotal.textContent = fmt(state.totalEarned);
    el.statClicks.textContent = fmtInt(state.clicks);
    el.statWps.textContent = fmt(totalWps());
    el.statGens.textContent = fmtInt(totalGenerators());
    el.statCores.textContent = fmtInt(state.cores || 0);
    el.statTime.textContent = fmtDuration(Date.now() - state.startedAt);
    const pg = prestigeGain();
    el.prestigeGain.textContent = fmtInt(pg);
    el.prestigeBtn.disabled = pg <= 0;
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

  function renderAll() {
    renderShop();
    renderStatsLite();
  }

  /* ---------- Affordability refresh (cheap, runs each tick) ---------- */
  let lastSig = '';
  function refreshAffordability() {
    // Rebuild shop only when affordability set changes, to keep DOM cheap.
    let sig = state.bulk + '|';
    for (const c of CORDS) {
      const owned = state.owned[c.id] || 0;
      const prevOwned = c === CORDS[0] ? 1 : (state.owned[CORDS[CORDS.indexOf(c) - 1].id] || 0);
      const visible = owned > 0 || prevOwned > 0;
      sig += (visible ? (state.watts >= cordCost(c, buyCount(c)) ? '1' : '0') : '-');
    }
    sig += '|';
    for (const u of UPGRADES) {
      if (state.upgrades[u.id] || !upgradeUnlocked(u)) { sig += '-'; continue; }
      sig += state.watts >= u.cost ? '1' : '0';
    }
    if (sig !== lastSig) {
      lastSig = sig;
      renderShop();
    }
  }

  /* ---------- Main loop ---------- */
  let lastTick = Date.now();
  function tick() {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    const gain = totalWps() * dt;
    if (gain > 0) {
      state.watts += gain;
      state.totalEarned += gain;
    }
    renderStatsLite();
    refreshAffordability();
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
    el.offlineAmount.textContent = fmt(earned);
    el.offlineModal.classList.remove('hidden');
  }

  /* ---------- Save / load UI ---------- */
  function exportSave() {
    save();
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    navigator.clipboard?.writeText(data).then(
      () => toast('Save copied to clipboard'),
      () => prompt('Copy your save code:', data)
    );
    if (!navigator.clipboard) prompt('Copy your save code:', data);
  }
  function importSave() {
    const code = prompt('Paste your save code:');
    if (!code) return;
    try {
      const obj = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
      if (typeof obj !== 'object' || obj.watts === undefined) throw new Error('bad');
      state = Object.assign(defaultState(), obj);
      state.settings = Object.assign({ sound: true, floats: true, sci: false }, state.settings || {});
      save();
      toast('Save imported!');
      renderAll();
    } catch (e) { toast('Invalid save code'); }
  }
  function hardReset() {
    if (!confirm('Erase ALL progress permanently? This cannot be undone.')) return;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    idbDel(SAVE_KEY);
    state = defaultState();
    save();
    toast('Game reset');
    renderAll();
  }

  /* ---------- Event wiring ---------- */
  el.socket.addEventListener('click', plug);

  // tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  // delegated shop clicks
  el.cords.addEventListener('click', (e) => {
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
  el.upgrades.addEventListener('click', (e) => {
    const item = e.target.closest('[data-upgrade]');
    if (item) buyUpgrade(UPGRADES.find(u => u.id === item.dataset.upgrade));
  });

  // prestige + save buttons
  el.prestigeBtn.addEventListener('click', doPrestige);
  el.exportBtn.addEventListener('click', exportSave);
  el.importBtn.addEventListener('click', importSave);
  el.resetBtn.addEventListener('click', hardReset);

  // modals
  el.offlineClose.addEventListener('click', () => el.offlineModal.classList.add('hidden'));
  el.menuBtn.addEventListener('click', () => { el.menuModal.classList.remove('hidden'); updateStorageStatus(); });
  el.menuClose.addEventListener('click', () => el.menuModal.classList.add('hidden'));
  el.soundToggle.checked = state.settings.sound;
  el.floatToggle.checked = state.settings.floats;
  el.sciToggle.checked = state.settings.sci;
  el.soundToggle.addEventListener('change', () => { state.settings.sound = el.soundToggle.checked; save(); });
  el.floatToggle.addEventListener('change', () => { state.settings.floats = el.floatToggle.checked; save(); });
  el.sciToggle.addEventListener('change', () => { state.settings.sci = el.sciToggle.checked; renderAll(); save(); });

  // keyboard: space/enter to plug
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat &&
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
    const lock = info.persisted ? ' · persistent (won’t be evicted)' : '';
    el.storageStatus.textContent = `Saved on this device via ${stores}${lock}.`;
  }

  /* ---------- Boot ---------- */
  (async function boot() {
    // Reconcile with the durable IndexedDB copy before anything accrues. If
    // localStorage was evicted but IndexedDB survived (or vice versa), this
    // restores the freshest save instead of starting over.
    const durable = await loadDurable();
    if (durable) {
      state = Object.assign(defaultState(), durable);
      state.settings = Object.assign({ sound: true, floats: true, sci: false }, state.settings || {});
      el.soundToggle.checked = state.settings.sound;
      el.floatToggle.checked = state.settings.floats;
      el.sciToggle.checked = state.settings.sci;
    }
    await requestPersistence();
    applyOffline();
    renderAll();
    save();              // re-mirror the reconciled state into both stores (self-heal)
    updateStorageStatus();
    lastTick = Date.now(); // don't count the async load time as idle earnings
    setInterval(tick, TICK_MS);
    setInterval(save, SAVE_EVERY_MS);
  })();

  // register service worker for installability + offline
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
