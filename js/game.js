/* ============================================================
   PlugIdle — a retro CRT idle game about plugging in cords.
   Pure vanilla JS, no dependencies.
   Durable saves: localStorage (sync) + IndexedDB (eviction-resistant).
   ============================================================ */
(() => {
  'use strict';

  const VERSION = '1.13.3';       // shown on the settings page; bump alongside sw.js CACHE
  const SAVE_KEY = 'cordTycoon.save.v1';
  const TICK_MS = 100;            // sim resolution
  const SAVE_EVERY_MS = 5000;     // autosave cadence
  const PROD_MULT = 1.6;          // global pacing: scales all income (active, idle & clicks)
  const COST_GROWTH = 1.12;       // per-buy cost multiplier (lower = smoother stacking; was 1.15)

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
    { id: 'indus',  icon: '🏭', name: 'Industrial Bus',   baseCost: 5.1e9,    wps: 4e5,desc: 'Cables thicker than your arm.' },
    { id: 'subsea', icon: '🌊', name: 'Subsea Cable',     baseCost: 7.5e10,   wps: 3.6e6, desc: 'Wiring continents together.' },
    { id: 'orbit',  icon: '🛰️', name: 'Orbital Tether',   baseCost: 1e12,     wps: 3.2e7,   desc: 'A cord from the ground to the stars.' },
    { id: 'quantum',icon: '⚛️', name: 'Quantum Link',     baseCost: 1.4e13,   wps: 2.9e8, desc: 'Entangled. Connected. Everywhere at once.' },
    { id: 'neural',  icon: '🧠', name: 'Neural Cable',     baseCost: 2e14,    wps: 2.6e9,    desc: 'Plugged straight into the cortex.' },
    { id: 'plasma',  icon: '🔥', name: 'Plasma Conduit',   baseCost: 3e15,    wps: 2.3e10,  desc: 'Liquid lightning in a braided sheath.' },
    { id: 'graviton',icon: '🌀', name: 'Graviton Cord',    baseCost: 4e16,    wps: 2.1e11, desc: 'It plugs into spacetime itself.' },
    { id: 'darkfib', icon: '🕳️', name: 'Dark Fiber',       baseCost: 6e17,    wps: 1.9e12, desc: 'Bandwidth drawn from the void.' },
    { id: 'wormhole',icon: '🌌', name: 'Wormhole Jack',    baseCost: 9e18,    wps: 1.7e13,   desc: 'Both ends, everywhere, at once.' },
    { id: 'neutrino',icon: '☄️', name: 'Neutrino Strand',  baseCost: 1.3e20,  wps: 1.5e14, desc: 'Passes through planets to connect.' },
    { id: 'tachyon', icon: '💫', name: 'Tachyon Line',     baseCost: 2e21,    wps: 1.4e15,   desc: 'Delivers the data before you ask.' },
    { id: 'singular',icon: '⚫', name: 'Singularity Bus',  baseCost: 3e22,    wps: 1.25e16, desc: 'One cord to compress them all.' },
    { id: 'cosmic',  icon: '✴️', name: 'Cosmic String',    baseCost: 4.5e23,  wps: 1.1e17, desc: 'A defect in reality, now load-bearing.' },
    { id: 'multivrs',icon: '🪐', name: 'Multiversal Hub',  baseCost: 7e24,    wps: 1e18,   desc: 'Plugs into every timeline at once.' },
    { id: 'divine',  icon: '😇', name: 'Divine Connector', baseCost: 1e26,    wps: 9e18,   desc: 'The port the universe booted from.' },
    { id: 'omega',   icon: '🅾️', name: 'Omega Cord',       baseCost: 1.5e27,  wps: 8e19, desc: 'The final plug. Nothing connects beyond.' },
    { id: 'axiom',   icon: '📐', name: 'Axiom Wire',       baseCost: 2.5e29,  wps: 7e20, desc: 'Plugs pure logic straight into the wall.' },
    { id: 'genesis', icon: '🌱', name: 'Genesis Patch',    baseCost: 4e31,    wps: 6.5e21, desc: 'The cable the next universe boots from.' },
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
    { id: 'u_click4', icon: '🦿', name: 'Exoskeleton Glove',  cost: 5e7,    kind: 'click',  mult: 3, desc: 'Tap power x3.' },
    { id: 'u_click5', icon: '🐝', name: 'Nanobot Swarm',      cost: 1e11,   kind: 'click',  mult: 4, desc: 'Tap power x4.' },
    { id: 'u_click6', icon: '🧠', name: 'Hive-Mind Tap',      cost: 1e16,   kind: 'click',  mult: 5, desc: 'Tap power x5.' },
    { id: 'u_glob5',  icon: '🎛️', name: 'Plug Orchestra',     cost: 1e14,   kind: 'global', mult: 3, desc: 'All cords x3.' },
    { id: 'u_glob6',  icon: '🧮', name: 'AI Cable Router',     cost: 1e18,   kind: 'global', mult: 4, desc: 'All cords x4.' },
    { id: 'u_glob7',  icon: '🌐', name: 'Reality Patchbay',    cost: 1e23,   kind: 'global', mult: 5, desc: 'All cords x5.' },
    { id: 'u_click7', icon: '🥊', name: 'Plasma Gauntlet',     cost: 5e13,   kind: 'click',  mult: 5, desc: 'Tap power x5.' },
    { id: 'u_click8', icon: '🌟', name: 'Singularity Grip',    cost: 1e19,   kind: 'click',  mult: 10, desc: 'Tap power x10.' },
    // Tap-scaling upgrades — each hand-plug also earns a % of your current W/s.
    { id: 'tw1', icon: '⚡', name: 'Live Wire',      cost: 5e4,  kind: 'tapwps', frac: 0.01, req: { cord: 'usbc',  n: 1 }, desc: 'Each tap also earns 1% of your W/s.' },
    { id: 'tw2', icon: '🔋', name: 'Capacitor Bank', cost: 5e7,  kind: 'tapwps', frac: 0.02, req: { cord: 'thndr', n: 1 }, desc: 'Each tap earns +2% of your W/s.' },
    { id: 'tw3', icon: '🗼', name: 'Tesla Coil',     cost: 5e11, kind: 'tapwps', frac: 0.03, req: { cord: 'orbit', n: 1 }, desc: 'Each tap earns +3% of your W/s.' },
    // Synergy upgrades — one cord's fleet boosts another (Cookie-Clicker style).
    { id: 'syn1', icon: '🔗', name: 'Daisy Chain',       cost: 2e4,  kind: 'synergy', cord: 'jack',  from: 'usba',    per: 0.005, req: { cord: 'usba',  n: 10 }, desc: '+0.5% Audio Jack per USB-A owned.' },
    { id: 'syn2', icon: '🪢', name: 'Bandwidth Bonding',  cost: 5e5,  kind: 'synergy', cord: 'eth',   from: 'hdmi',    per: 0.005, req: { cord: 'hdmi',  n: 10 }, desc: '+0.5% Ethernet per HDMI owned.' },
    { id: 'syn3', icon: '🧵', name: 'Backbone Sync',      cost: 5e8,  kind: 'synergy', cord: 'fiber', from: 'power',   per: 0.003, req: { cord: 'power', n: 10 }, desc: '+0.3% Fiber per Power Cord owned.' },
    { id: 'syn4', icon: '♾️', name: 'Quantum Coupling',   cost: 1e27, kind: 'synergy', cord: 'omega', from: 'quantum', per: 0.01,  req: { cord: 'quantum', n: 10 }, desc: '+1% Omega per Quantum Link owned.' },
    // Per-cord doublers for the new tiers (unlock at 5 owned).
    { id: 'u_neural',  icon: '🧠', name: 'Myelin Sheathing',  cost: 6e15,  kind: 'cord', cord: 'neural',   mult: 2, req: { cord: 'neural',   n: 5 }, desc: 'Neural Cable output x2.' },
    { id: 'u_plasma',  icon: '🔥', name: 'Magnetic Bottling', cost: 1e17,  kind: 'cord', cord: 'plasma',   mult: 2, req: { cord: 'plasma',   n: 5 }, desc: 'Plasma Conduit output x2.' },
    { id: 'u_graviton',icon: '🌀', name: 'Tensor Winding',    cost: 1.3e18,kind: 'cord', cord: 'graviton', mult: 2, req: { cord: 'graviton', n: 5 }, desc: 'Graviton Cord output x2.' },
    { id: 'u_darkfib', icon: '🕳️', name: 'Vacuum Pumping',    cost: 2e19,  kind: 'cord', cord: 'darkfib',  mult: 2, req: { cord: 'darkfib',  n: 5 }, desc: 'Dark Fiber output x2.' },
    { id: 'u_wormhole',icon: '🌌', name: 'Throat Stabilizer', cost: 3e20,  kind: 'cord', cord: 'wormhole', mult: 2, req: { cord: 'wormhole', n: 5 }, desc: 'Wormhole Jack output x2.' },
    { id: 'u_neutrino',icon: '☄️', name: 'Flavour Oscillator',cost: 4e21,  kind: 'cord', cord: 'neutrino', mult: 2, req: { cord: 'neutrino', n: 5 }, desc: 'Neutrino Strand output x2.' },
    { id: 'u_tachyon', icon: '💫', name: 'Causality Bypass',  cost: 6e22,  kind: 'cord', cord: 'tachyon',  mult: 2, req: { cord: 'tachyon',  n: 5 }, desc: 'Tachyon Line output x2.' },
    { id: 'u_singular',icon: '⚫', name: 'Event Horizoning',  cost: 1e24,  kind: 'cord', cord: 'singular', mult: 2, req: { cord: 'singular', n: 5 }, desc: 'Singularity Bus output x2.' },
    { id: 'u_cosmic',  icon: '✴️', name: 'Tension Tuning',    cost: 1.5e25,kind: 'cord', cord: 'cosmic',   mult: 2, req: { cord: 'cosmic',   n: 5 }, desc: 'Cosmic String output x2.' },
    { id: 'u_multivrs',icon: '🪐', name: 'Brane Alignment',   cost: 2e26,  kind: 'cord', cord: 'multivrs', mult: 2, req: { cord: 'multivrs', n: 5 }, desc: 'Multiversal Hub output x2.' },
    { id: 'u_divine',  icon: '😇', name: 'Holy Soldering',    cost: 3e27,  kind: 'cord', cord: 'divine',   mult: 2, req: { cord: 'divine',   n: 5 }, desc: 'Divine Connector output x2.' },
    { id: 'u_omega',   icon: '🅾️', name: 'Final Firmware',    cost: 5e28,  kind: 'cord', cord: 'omega',    mult: 2, req: { cord: 'omega',    n: 5 }, desc: 'Omega Cord output x2.' },
    // Post-Omega wave (v1.11): two new tiers + a global + a synergy.
    { id: 'u_glob8',   icon: '🌌', name: 'Universal Mains',   cost: 1e29,  kind: 'global', mult: 5, desc: 'All cords x5.' },
    { id: 'u_axiom',   icon: '📐', name: 'Lemma Lattice',     cost: 8e30,  kind: 'cord', cord: 'axiom',    mult: 2, req: { cord: 'axiom',    n: 5 }, desc: 'Axiom Wire output x2.' },
    { id: 'syn5',      icon: '🧬', name: 'Seed Crystal',      cost: 5e31,  kind: 'synergy', cord: 'genesis', from: 'omega', per: 0.01, req: { cord: 'omega', n: 10 }, desc: '+1% Genesis Patch per Omega Cord owned.' },
    { id: 'u_genesis', icon: '🌱', name: 'Bootstrap Loom',    cost: 1.3e33,kind: 'cord', cord: 'genesis',  mult: 2, req: { cord: 'genesis',  n: 5 }, desc: 'Genesis Patch output x2.' },
  ];

  /* ---------- Content: core upgrades (prestige shop) ----------
     Bought with Prestige Cores (◆). Cores are spent, but your per-core
     production bonus is based on cores ever EARNED, so it never drops. */
  const CORE_UPGRADES = [
    { id: 'thumbs',    icon: '👍', name: 'Overclocked Thumbs', cost: 1,  desc: 'Tap power ×3.' },
    { id: 'static',    icon: '🔱', name: 'Static Discharge',   cost: 5,  desc: 'Each tap also earns 4% of your W/s.' },
    { id: 'phantom',   icon: '🔌', name: 'Phantom Power',      cost: 2,  desc: 'All production ×1.5.' },
    { id: 'battery',   icon: '🔋', name: 'Battery Backup',     cost: 2,  desc: 'Offline cap +24h (48h total).' },
    { id: 'magnet',    icon: '🧲', name: 'Surge Magnet',       cost: 3,  desc: 'Power surges arrive ~40% sooner.' },
    { id: 'jumpstart', icon: '🚀', name: 'Jump Start',         cost: 4,  desc: 'Keep 5% of your watts through recycling.' },
    { id: 'megasurge', icon: '⚡', name: 'Mega Surges',        cost: 4,  desc: 'Surge Overload payouts ×2.' },
    { id: 'recycler',  icon: '♻️', name: "Recycler's Edge",    cost: 6,  desc: 'Prestige core gains ×1.5.' },
    { id: 'resonance', icon: '💠', name: 'Core Resonance',     cost: 8,  desc: 'Each core gives +8% instead of +5%.' },
    { id: 'nightshift',icon: '🌙', name: 'Night Shift',        cost: 10, desc: 'Offline efficiency 50% → 75%.' },
    { id: 'overdrive', icon: '🔥', name: 'Reactor Overdrive',  cost: 12, desc: 'All production ×2.' },
    { id: 'autotap',   icon: '🤖', name: 'Auto-Tapper',        cost: 15, desc: 'Auto-plugs 5×/sec, free forever.' },
    { id: 'autobuy',   icon: '🛒', name: 'Auto-Buyer',         cost: 18, desc: 'Auto-buys cords for you — fast, many at once.' },
    { id: 'autoupg',   icon: '🛠️', name: 'Auto-Upgrader',      cost: 22, desc: 'Auto-buys upgrades the moment you can afford them.' },
    // Late-game core accelerators — the ladder that makes ??? reachable.
    { id: 'fission',   icon: '☢️', name: 'Core Fission',       cost: 5e9,  desc: 'Prestige core gains ×5.' },
    { id: 'cascade',   icon: '🧨', name: 'Core Cascade',       cost: 1e12, desc: 'Prestige core gains ×25.' },
    { id: 'singular2', icon: '🕳️', name: 'Core Singularity',   cost: 6e13, desc: 'Prestige core gains ×100.' },
    { id: 'mystery',   icon: '🌀', name: '???',                cost: 1e15, desc: '[DATA CORRUPTED] Do not plug in.' },
  ];

  /* ---------- Content: challenges ----------
     Special runs with one rule mutated (started from the More tab after the
     first prestige). Resets the run like recycling, no cores gained; reaching
     the goal lifts the rule and unlocks a PERMANENT perk. */
  const CHALLENGES = [
    { id: 'solo',       icon: '1️⃣', name: 'SOLO CIRCUIT', rule: 'Only USB-A cables can be bought.',          goal: 1e8,  reward: 'GOLD PINS — USB-A output ×5, forever.' },
    { id: 'unplugged',  icon: '🚫', name: 'UNPLUGGED',    rule: 'Hand-plugging earns nothing.',              goal: 1e9,  reward: 'JUMP LEADS — every run starts with 5 USB-A cables.' },
    { id: 'minimalist', icon: '🧘', name: 'MINIMALIST',   rule: 'Upgrades cannot be bought.',                goal: 5e9,  reward: 'PREWIRED — runs start with Reinforced Thumbs owned.' },
    { id: 'darkgrid',   icon: '🌑', name: 'DARK GRID',    rule: 'Power surges never appear.',                goal: 1e10, reward: 'SURGE BEACON — surges arrive 20% sooner.' },
    { id: 'overpriced', icon: '💸', name: 'OVERPRICED',   rule: 'Cord costs grow 18% per buy (not 12%).',    goal: 1e11, reward: 'WHOLESALE — all cords cost 3% less.' },
    { id: 'brownout',   icon: '🕯️', name: 'BROWNOUT',     rule: 'All production halved.',                    goal: 1e12, reward: 'AUTO-PLUGGER — auto-buys cords for you, fast (toggle in Settings).' },
  ];
  const ch = () => (state && state.challenge) || '';
  const chDone = (id) => !!(state && state.challengesDone && state.challengesDone[id]);

  /* ---------- Content: the Voltlands (idle slayer) ----------
     Unlocked by the ??? core upgrade. Weapons are this world's generators
     (zaps/sec instead of watts/sec); same cost growth and ownership
     milestones as cords, so the proven early-game curve carries over. */
  const WEAPONS = [
    { id: 'glove',   icon: '🧤', name: 'Static Glove',     baseCost: 15,      zps: 0.1,   desc: 'Shuffle on carpet. Touch enemy.' },
    { id: 'tongs',   icon: '🥢', name: 'Taser Tongs',      baseCost: 100,     zps: 1,     desc: 'For a more civilized electrocution.' },
    { id: 'welder',  icon: '🔧', name: 'Arc Welder',       baseCost: 1100,    zps: 8,     desc: 'Welds enemies to the floor. Permanently.' },
    { id: 'coil',    icon: '🗼', name: 'Tesla Coil',       baseCost: 12000,   zps: 47,    desc: 'Wireless damage transmission.' },
    { id: 'ladder',  icon: '🪜', name: "Jacob's Ladder",   baseCost: 1.3e5,   zps: 260,   desc: 'The climbing spark of doom.' },
    { id: 'cannon',  icon: '🧨', name: 'Capacitor Cannon', baseCost: 1.4e6,   zps: 1400,  desc: 'Charges slowly. Discharges all at once.' },
    { id: 'railgun', icon: '🎯', name: 'Volt Railgun',     baseCost: 2e7,     zps: 7800,  desc: 'The rails are also electrified.' },
    { id: 'storm',   icon: '🌩️', name: 'Storm Caller',     baseCost: 3.3e8,   zps: 44000, desc: 'Subscribe to lightning. Cancel anytime.' },
    { id: 'ball',    icon: '🔮', name: 'Ball Lightning',   baseCost: 5.1e9,   zps: 4e5,   desc: 'Science still cannot explain it. It hurts.' },
    { id: 'zeus',    icon: '🏛️', name: 'Zeus Rig',         baseCost: 7.5e10,  zps: 3.6e6, desc: 'Borrowed. Do not tell him.' },
  ];

  /* kinds: 'zap' multiplies tap-zap power; 'weapon' doubles one weapon
     (unlocks at 5 owned); 'zglobal' multiplies all ZPS; 'crit' = 10% ×10 taps. */
  const ZAP_UPGRADES = [
    { id: 'z_zap1',  icon: '🧤', name: 'Rubber Gloves Off', cost: 100,   kind: 'zap', mult: 2, desc: 'Tap-zap power x2.' },
    { id: 'z_glove', icon: '⚡', name: 'Carpet Static Farm', cost: 500,  kind: 'weapon', weapon: 'glove',  mult: 2, req: { weapon: 'glove', n: 5 },  desc: 'Static Glove zaps x2.' },
    { id: 'z_zap2',  icon: '✌️', name: 'Two-Finger Tesla',  cost: 2500,  kind: 'zap', mult: 2, desc: 'Tap-zap power x2.' },
    { id: 'z_tongs', icon: '🥢', name: 'Insulated Grips',   cost: 5000,  kind: 'weapon', weapon: 'tongs',  mult: 2, req: { weapon: 'tongs', n: 5 },  desc: 'Taser Tongs zaps x2.' },
    { id: 'z_glob1', icon: '🌫️', name: 'Conductive Air',    cost: 25000, kind: 'zglobal', mult: 1.5, desc: 'All weapons +50%.' },
    { id: 'z_weld',  icon: '🔧', name: 'Plasma Cutting Tip',cost: 60000, kind: 'weapon', weapon: 'welder', mult: 2, req: { weapon: 'welder', n: 5 }, desc: 'Arc Welder zaps x2.' },
    { id: 'z_crit',  icon: '💥', name: 'Overcharge',        cost: 150000,kind: 'crit', desc: '10% chance a tap-zap deals x10.' },
    { id: 'z_coil',  icon: '🗼', name: 'Resonant Windings', cost: 6e5,   kind: 'weapon', weapon: 'coil',   mult: 2, req: { weapon: 'coil', n: 5 },   desc: 'Tesla Coil zaps x2.' },
    { id: 'z_glob2', icon: '🌀', name: 'Ion Storm',         cost: 3e6,   kind: 'zglobal', mult: 2, desc: 'All weapons x2.' },
    { id: 'z_ladder',icon: '🪜', name: 'Extension Rungs',   cost: 8e6,   kind: 'weapon', weapon: 'ladder', mult: 2, req: { weapon: 'ladder', n: 5 }, desc: "Jacob's Ladder zaps x2." },
    { id: 'z_zap3',  icon: '🔨', name: 'Mjolnir Grip',      cost: 5e7,   kind: 'zap', mult: 5, desc: 'Tap-zap power x5.' },
    { id: 'z_glob3', icon: '🧲', name: 'Superconductors',   cost: 1e8,   kind: 'zglobal', mult: 3, desc: 'All weapons x3.' },
  ];

  const ENEMIES = [
    { icon: '🦠', name: 'Static Mite' },
    { icon: '🐀', name: 'Copper Rat' },
    { icon: '🦇', name: 'Volt Bat' },
    { icon: '🕷️', name: 'Shock Spider' },
    { icon: '🤖', name: 'Resistor Drone' },
    { icon: '🦂', name: 'Surge Scorpion' },
    { icon: '🧌', name: 'Ohm Golem' },
    { icon: '👾', name: 'Glitch Wraith' },
    { icon: '🦞', name: 'Cable Crab' },
    { icon: '🐍', name: 'Inductor Serpent' },
  ];
  const BOSSES = [
    { icon: '🐉', name: 'Fuse Dragon' },
    { icon: '⛰️', name: 'Breaker Behemoth' },
    { icon: '🦑', name: 'Grounding Kraken' },
    { icon: '👹', name: 'Overload Oni' },
    { icon: '🌪️', name: 'Storm Tyrant' },
  ];
  const ZONES = ['Static Fields', 'Copper Canyons', 'Insulator Wastes', 'Capacitor Crypts',
    'Magnet Mires', 'Dynamo Dunes', 'The Short Circuit', 'Transformer Tombs',
    'Gigavolt Glacier', 'The Eye of the Storm'];

  // Cord output milestones: every CORD_MILESTONE owned grants ×2, except every
  // BIG_MILESTONE owned grants ×BIG_MILESTONE_MULT instead — near-term goals
  // that bump the player past cost walls.
  const CORD_MILESTONE = 25;
  const BIG_MILESTONE = 100;
  const BIG_MILESTONE_MULT = 10;

  /* ---------- Content: achievements ----------
     `cond` decides when one unlocks; optional `prog` returns [current, target]. */
  const ACHIEVEMENTS = [
    { id: 'plug1',    icon: '🔌', name: 'First Contact',   desc: 'Plug in your first cord by hand.',        cond: () => state.clicks >= 1 },
    { id: 'plug100',  icon: '👆', name: 'Button Masher',   desc: 'Hand-plug 100 cords.',                    cond: () => state.clicks >= 100,   prog: () => [state.clicks, 100] },
    { id: 'plug1000', icon: '✋', name: 'Thumb of Steel',  desc: 'Hand-plug 1,000 cords.',                  cond: () => state.clicks >= 1000,  prog: () => [state.clicks, 1000] },
    { id: 'auto1',    icon: '🤖', name: 'Going Automatic', desc: 'Own your first auto-plugging cord.',      cond: () => totalGenerators() >= 1 },
    { id: 'own25',    icon: '📦', name: 'Bulk Buyer',      desc: 'Own 25 of a single cord (a ×2 milestone!).', cond: () => CORDS.some(c => (state.owned[c.id] || 0) >= 25) },
    { id: 'own50',    icon: '🏗️', name: 'Mass Production',  desc: 'Own 50 of a single cord.',                cond: () => CORDS.some(c => (state.owned[c.id] || 0) >= 50) },
    { id: 'own100',   icon: '🏰', name: 'Cord Baron',     desc: 'Own 100 of a single cord (a ×10 milestone!).', cond: () => CORDS.some(c => (state.owned[c.id] || 0) >= 100) },
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
    { id: 'prest1',   icon: '♻️', name: 'Recycler',        desc: 'Recycle for your first prestige core.',   cond: () => (state.coresEarned || 0) >= 1 },
    { id: 'prest10',  icon: '💠', name: 'Core Collector',  desc: 'Earn 10 prestige cores.',                 cond: () => (state.coresEarned || 0) >= 10, prog: () => [state.coresEarned || 0, 10] },
    { id: 'quantum',  icon: '⚛️', name: 'Quantum Leap',    desc: 'Own a Quantum Link.',                     cond: () => (state.owned.quantum || 0) >= 1 },
    { id: 'w1qa',     icon: '💎', name: 'Quadrillionaire', desc: 'Earn 1 quadrillion total watts.',         cond: () => state.totalEarned >= 1e15, prog: () => [state.totalEarned, 1e15] },
    { id: 'w1qi',     icon: '👑', name: 'Quintillion Lord',desc: 'Earn 1 quintillion total watts.',         cond: () => state.totalEarned >= 1e18, prog: () => [state.totalEarned, 1e18] },
    { id: 'w1sx',     icon: '🌠', name: 'Sextillion Sage', desc: 'Earn 1 sextillion total watts.',          cond: () => state.totalEarned >= 1e21, prog: () => [state.totalEarned, 1e21] },
    { id: 'wps1t',    icon: '🌋', name: 'Megastructure',   desc: 'Reach 1 trillion watts/sec.',             cond: () => totalWps() >= 1e12, prog: () => [totalWps(), 1e12] },
    { id: 'wps1qa',   icon: '💥', name: 'Dyson Sphere',    desc: 'Reach 1 quadrillion watts/sec.',          cond: () => totalWps() >= 1e15, prog: () => [totalWps(), 1e15] },
    { id: 'plug10k',  icon: '🤜', name: 'Carpal Tunnel',   desc: 'Hand-plug 10,000 cords.',                 cond: () => state.clicks >= 10000, prog: () => [state.clicks, 10000] },
    { id: 'own250',   icon: '🏙️', name: 'Cord Hoarder',    desc: 'Own 250 of a single cord.',               cond: () => CORDS.some(c => (state.owned[c.id] || 0) >= 250) },
    { id: 'own500',   icon: '🌇', name: 'Cord Singularity', desc: 'Own 500 of a single cord.',              cond: () => CORDS.some(c => (state.owned[c.id] || 0) >= 500) },
    { id: 'gens1k',   icon: '🧰', name: 'Thousand Plugs',  desc: 'Own 1,000 generators in total.',          cond: () => totalGenerators() >= 1000, prog: () => [totalGenerators(), 1000] },
    { id: 'void',     icon: '🕳️', name: 'Into the Void',   desc: 'Own a Dark Fiber.',                       cond: () => (state.owned.darkfib || 0) >= 1 },
    { id: 'sing',     icon: '⚫', name: 'Point of No Return',desc: 'Own a Singularity Bus.',                 cond: () => (state.owned.singular || 0) >= 1 },
    { id: 'multi',    icon: '🪐', name: 'Across Realities', desc: 'Own a Multiversal Hub.',                  cond: () => (state.owned.multivrs || 0) >= 1 },
    { id: 'omega1',   icon: '🅾️', name: 'The Final Plug',  desc: 'Own an Omega Cord.',                      cond: () => (state.owned.omega || 0) >= 1 },
    { id: 'allcord24',icon: '🧰', name: 'Master Electrician',desc: `Own one of all ${CORDS.length} cord types.`, cond: () => CORDS.every(c => (state.owned[c.id] || 0) >= 1), prog: () => [CORDS.filter(c => (state.owned[c.id] || 0) >= 1).length, CORDS.length] },
    { id: 'surge100', icon: '🌪️', name: 'Tempest',         desc: 'Catch 100 power surges.',                 cond: () => (state.surgesCollected || 0) >= 100, prog: () => [state.surgesCollected || 0, 100] },
    { id: 'syn1ach',  icon: '🔗', name: 'Synergist',       desc: 'Buy a synergy upgrade.',                  cond: () => UPGRADES.some(u => u.kind === 'synergy' && state.upgrades[u.id]) },
    { id: 'up15',     icon: '🔩', name: 'Master Tinkerer',  desc: 'Buy 15 upgrades.',                       cond: () => Object.keys(state.upgrades).length >= 15, prog: () => [Object.keys(state.upgrades).length, 15] },
    { id: 'upAll',    icon: '🛠️', name: 'Fully Upgraded',  desc: 'Buy every upgrade.',                      cond: () => Object.keys(state.upgrades).length >= UPGRADES.length, prog: () => [Object.keys(state.upgrades).length, UPGRADES.length] },
    { id: 'prest50',  icon: '🔷', name: 'Core Magnate',    desc: 'Earn 50 prestige cores.',                 cond: () => (state.coresEarned || 0) >= 50, prog: () => [state.coresEarned || 0, 50] },
    { id: 'prest100', icon: '🟣', name: 'Core Overlord',   desc: 'Earn 100 prestige cores.',                cond: () => (state.coresEarned || 0) >= 100, prog: () => [state.coresEarned || 0, 100] },
    { id: 'core1',    icon: '◆', name: 'Spend to Ascend',  desc: 'Buy your first core upgrade.',            cond: () => Object.keys(state.coreUpgrades || {}).length >= 1 },
    { id: 'coreAll',  icon: '💟', name: 'Core Completionist',desc: 'Buy every core upgrade.',                cond: () => Object.keys(state.coreUpgrades || {}).length >= CORE_UPGRADES.length, prog: () => [Object.keys(state.coreUpgrades || {}).length, CORE_UPGRADES.length] },
    { id: 'axiom1',   icon: '📐', name: 'Beyond the End',  desc: 'Own an Axiom Wire. ("Nothing connects beyond," they said.)', cond: () => (state.owned.axiom || 0) >= 1 },
    { id: 'genesis1', icon: '🌱', name: 'New Game Seed',   desc: 'Own a Genesis Patch.',                    cond: () => (state.owned.genesis || 0) >= 1 },
    { id: 'w1sp',     icon: '🌌', name: 'Septillion Spark',desc: 'Earn 1 septillion total watts.',          cond: () => state.totalEarned >= 1e24, prog: () => [state.totalEarned, 1e24] },
    { id: 'chal1',    icon: '🧪', name: 'Lab Rat',         desc: 'Complete a challenge.',                   cond: () => Object.keys(state.challengesDone || {}).length >= 1 },
    { id: 'chalAll',  icon: '🏅', name: 'Grid Scientist',  desc: 'Complete every challenge.',               cond: () => Object.keys(state.challengesDone || {}).length >= CHALLENGES.length, prog: () => [Object.keys(state.challengesDone || {}).length, CHALLENGES.length] },
    { id: 'streak7',  icon: '🔥', name: 'Week of Power',   desc: 'Reach a 7-day check-in streak.',          cond: () => (state.streak || 0) >= 7, prog: () => [state.streak || 0, 7] },
    // Voltlands
    { id: 'worm1',    icon: '🌀', name: 'What Does It Do?',desc: 'Plug in the thing you were told not to.', cond: () => !!state.wormhole },
    { id: 'kill1',    icon: '⚡', name: 'First Contact II', desc: 'Electrocute your first enemy.',           cond: () => (state.slayer?.kills || 0) >= 1 },
    { id: 'boss1',    icon: '👑', name: 'Breaker of Breakers', desc: 'Defeat your first boss.',             cond: () => (state.slayer?.bosses || 0) >= 1 },
    { id: 'wave25',   icon: '🗺️', name: 'Deep in the Voltlands', desc: 'Reach wave 25.',                    cond: () => (state.slayer?.wave || 0) >= 25, prog: () => [state.slayer?.wave || 0, 25] },
    { id: 'wave50',   icon: '🌪️', name: 'Storm Front',     desc: 'Reach wave 50.',                          cond: () => (state.slayer?.wave || 0) >= 50, prog: () => [state.slayer?.wave || 0, 50] },
    { id: 'weap5',    icon: '🔫', name: 'Armed to the Teeth', desc: 'Own 5 different weapons.',             cond: () => WEAPONS.filter(w => (state.slayer?.weapons[w.id] || 0) >= 1).length >= 5, prog: () => [WEAPONS.filter(w => (state.slayer?.weapons[w.id] || 0) >= 1).length, 5] },
    { id: 'weapAll',  icon: '🏛️', name: 'Full Arsenal',    desc: `Own all ${WEAPONS.length} weapons.`,      cond: () => WEAPONS.every(w => (state.slayer?.weapons[w.id] || 0) >= 1), prog: () => [WEAPONS.filter(w => (state.slayer?.weapons[w.id] || 0) >= 1).length, WEAPONS.length] },
    { id: 'volt1m',   icon: '🔋', name: 'Million Volt Smile', desc: 'Earn 1 million total volts.',          cond: () => (state.slayer?.totalVolts || 0) >= 1e6, prog: () => [state.slayer?.totalVolts || 0, 1e6] },
  ];

  /* ---------- State ---------- */
  const defaultState = () => ({
    watts: 0,
    totalEarned: 0,
    clicks: 0,
    cores: 0,            // prestige currency — SPENDABLE on core upgrades
    coresEarned: 0,      // lifetime cores ever earned — drives the permanent bonus
    owned: {},           // cordId -> count
    upgrades: {},        // upgradeId -> true
    coreUpgrades: {},    // coreUpgradeId -> true (permanent, persists across prestige)
    achievements: {},    // achievementId -> true (persists across prestige)
    surgesCollected: 0,  // lifetime power surges caught
    startedAt: Date.now(),
    lastSeen: Date.now(),
    settings: { sound: true, floats: true, sci: false, haptics: true, autobuyOn: true, autoupgOn: true },
    bulk: 1,             // 1, 10, 100, or 'max'
    prestigeV: 2,        // prestige-curve schema (v2 = cbrt gain + softcap)
    challenge: '',       // active challenge id (cleared by completion/abandon/prestige)
    challengesDone: {},  // challengeId -> true (permanent perks)
    streak: 0,           // daily check-in streak (48h forgiveness window)
    streakAt: 0,         // ms timestamp of the last streak claim
    streakDay: '',       // local date of the last streak claim
    streakUntil: 0,      // streak production buff expiry
    // ---- the Voltlands (unlocked by the ??? core upgrade) ----
    wormhole: false,     // has the player been through?
    world: 'grid',       // 'grid' (plug game) | 'volt' (slayer game)
    lifetimeEarned: 0,   // watts ever earned, NEVER resets (grid->volt synergy)
    slayer: defaultSlayer(),
    // ---- monetization (Android only; harmless extras on web) ----
    iap: {},             // non-consumable sku -> true (granted entitlements)
    theme: '',           // '' (green) | 'amber' | 'ice' | 'vapor'
    adDay: '',           // local date the rewarded-ad counters belong to
    adUses: {},          // placement -> uses today (daily caps)
    boostUntil: 0,       // 2x production boost expiry (persists across restarts)
    supporterDay: '',    // last date the supporter daily boost was claimed
  });

  function defaultSlayer() {
    return {
      volts: 0,          // spendable ⚡ currency
      totalVolts: 0,     // lifetime volts (achievements)
      wave: 1,
      killsThisWave: 0,
      kills: 0,          // lifetime kills
      bosses: 0,         // lifetime boss kills (volt->grid synergy)
      hp: 0, maxHp: 0,   // current enemy
      weapons: {},       // weaponId -> count
      upgrades: {},      // zapUpgradeId -> true
    };
  }

  // Normalize any save (fresh boot, legacy, or imported) into a complete state:
  // backfill missing fields, merge settings, and reconstruct prestige fields
  // (older saves used `cores` as the lifetime-bonus source, with no coresEarned).
  function normalizeState(s) {
    s = s || {};
    // Detect legacy saves (no coresEarned / prestigeV / lifetimeEarned)
    // BEFORE the defaults merge backfills them with zero-values.
    const hadCoresEarned = s.coresEarned != null;
    const hadPrestigeV = s.prestigeV != null;
    const hadLifetime = s.lifetimeEarned != null;
    s = Object.assign(defaultState(), s);
    s.settings = Object.assign({ sound: true, floats: true, sci: false, haptics: true, autobuyOn: true, autoupgOn: true }, s.settings || {});
    if (!hadCoresEarned) s.coresEarned = s.cores || 0;
    if (s.coreUpgrades == null) s.coreUpgrades = {};
    if (s.iap == null) s.iap = {};
    if (s.adUses == null) s.adUses = {};
    if (s.challengesDone == null) s.challengesDone = {};
    if (!hadLifetime) s.lifetimeEarned = s.totalEarned || 0;   // best available seed
    s.slayer = Object.assign(defaultSlayer(), s.slayer || {});
    // v2 prestige curve (sqrt -> cbrt): re-baseline coresEarned so "deserved at
    // the same lifetime earnings" is preserved (old n = sqrt(E/1e9) => new
    // potential = cbrt(E/1e9) = n^(2/3)). Spendable cores are left untouched.
    if (!hadPrestigeV) {
      s.coresEarned = Math.round(Math.pow(Math.max(0, s.coresEarned || 0), 2 / 3));
      s.prestigeV = 2;
    }
    return s;
  }

  let state = normalizeState(loadLocal());

  /* ---------- Derived values ---------- */
  const co = (id) => !!(state.coreUpgrades && state.coreUpgrades[id]);
  // Per-core production bonus (lifetime cores), boosted by Core Resonance.
  function corePer() { return co('resonance') ? 0.08 : 0.05; }
  function coreClickMult() { return co('thumbs') ? 3 : 1; }
  function coreProdMult() { let m = 1; if (co('phantom')) m *= 1.5; if (co('overdrive')) m *= 2; return m; }
  function offlineCapMs() { return (24 + (co('battery') ? 24 : 0)) * 3600000; }
  function offlineEff() { return co('nightshift') ? 0.75 : 0.5; }
  function surgeDelayMult() { return co('magnet') ? 0.6 : 1; }
  function surgeRewardMult() { return co('megasurge') ? 2 : 1; }
  function prestigeGainMult() {
    let m = co('recycler') ? 1.5 : 1;
    if (co('fission')) m *= 5;
    if (co('cascade')) m *= 25;
    if (co('singular2')) m *= 100;
    return m;
  }
  function autoTapRate() { return co('autotap') ? 5 : 0; }
  function prestigeKeepFrac() { return co('jumpstart') ? 0.05 : 0; }
  function lifetimeBonusPct() { return Math.round((prestigeMult() - 1) * 100); }

  // Per-core bonus is linear up to a ×10 total multiplier, then square-root
  // dampened — keeps late-game prestige meaningful without the runaway loop
  // (see research/balance-report.md). UI percentages derive from the EFFECTIVE
  // multiplier via prestigeMultFor, so the display never overstates.
  const PRESTIGE_SOFTCAP = 10;
  function prestigeMultFor(coresN) {
    const raw = 1 + corePer() * coresN;
    if (raw <= PRESTIGE_SOFTCAP) return raw;
    return PRESTIGE_SOFTCAP * Math.sqrt(raw / PRESTIGE_SOFTCAP);
  }
  function prestigeMult() {
    return prestigeMultFor(state.coresEarned || 0);
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
      // Synergy: this cord gains +per per unit of another cord owned.
      if (u.kind === 'synergy' && u.cord === cordId) m *= 1 + u.per * (state.owned[u.from] || 0);
    }
    if (cordId === 'usba' && chDone('solo')) m *= 5;   // GOLD PINS challenge perk
    // Ownership milestones: ×2 per CORD_MILESTONE, ×BIG_MILESTONE_MULT per BIG_MILESTONE.
    m *= cordMilestoneMult(state.owned[cordId] || 0);
    return m;
  }

  // Total milestone multiplier for an owned count: ×2 for each CORD_MILESTONE
  // step, but every BIG_MILESTONE step is ×BIG_MILESTONE_MULT instead of ×2.
  function cordMilestoneMult(owned) {
    const steps = Math.floor(owned / CORD_MILESTONE);
    const big = Math.floor(owned / BIG_MILESTONE);
    return Math.pow(2, steps - big) * Math.pow(BIG_MILESTONE_MULT, big);
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

  // Single entry point for earning watts: lifetimeEarned never resets and
  // powers the grid->volt synergy; totalEarned is the per-run figure that
  // drives prestige potential and achievements.
  function gainWatts(n) {
    state.watts += n;
    state.totalEarned += n;
    state.lifetimeEarned = (state.lifetimeEarned || 0) + n;
  }

  // Permanent +25% from the boost_production_25 purchase (Android IAP).
  function iapProdMult() { return state.iap && state.iap.boost_production_25 ? 1.25 : 1; }

  // Grid Bonus: each unlocked achievement grants +1% production, permanently
  // (Cookie Clicker's milk pattern — goals become power; persists prestiges).
  function achCount() {
    let n = 0;
    for (const a of ACHIEVEMENTS) if (state.achievements[a.id]) n++;
    return n;
  }
  function achMult() { return 1 + 0.01 * achCount(); }

  function totalWps() {
    let sum = 0;
    for (const c of CORDS) sum += cordWps(c);
    const challengePenalty = ch() === 'brownout' ? 0.5 : 1;
    return sum * prestigeMult() * PROD_MULT * coreProdMult() * iapProdMult() * achMult() * buffMult('prod') * challengePenalty * bossWattsMult();
  }

  // ---- Tap power: keep hand-plugging relevant for the whole game ----
  // Tap milestones: every threshold of lifetime hand-plugs grants ×1.5 tap power.
  const TAP_MILESTONES = [100, 500, 2500, 10000, 50000, 250000, 1e6, 5e6];
  function tapMilestonesPassed() {
    let n = 0;
    for (const t of TAP_MILESTONES) if ((state.clicks || 0) >= t) n++;
    return n;
  }
  function tapMilestoneMult() { return Math.pow(1.5, tapMilestonesPassed()); }
  function nextTapMilestone() {
    for (const t of TAP_MILESTONES) if ((state.clicks || 0) < t) return t;
    return null;
  }
  // Taps also earn a % of your current W/s (so they scale with production forever).
  function tapWpsFrac() {
    let f = 0;
    for (const u of UPGRADES) if (state.upgrades[u.id] && u.kind === 'tapwps') f += u.frac;
    if (co('static')) f += 0.04;
    return f;
  }

  function clickPower() {
    if (ch() === 'unplugged') return 0;   // UNPLUGGED challenge rule
    let p = 1;
    for (const u of UPGRADES) {
      if (state.upgrades[u.id] && u.kind === 'click') p *= u.mult;
    }
    // hand-plugging also benefits from global upgrades & prestige, lightly
    let glob = 1;
    for (const u of UPGRADES) {
      if (state.upgrades[u.id] && u.kind === 'global') glob *= u.mult;
    }
    const flat = p * glob * prestigeMult() * PROD_MULT * coreClickMult() * tapMilestoneMult();
    const fromWps = tapWpsFrac() * totalWps();   // scales with income, keeps taps useful
    return (flat + fromWps) * buffMult('click');
  }

  // OVERPRICED challenge steepens cost growth; its WHOLESALE perk discounts.
  function costGrowth() { return ch() === 'overpriced' ? 1.18 : COST_GROWTH; }
  function costDiscount() { return chDone('overpriced') ? 0.97 : 1; }

  function cordCost(cord, count) {
    // cost of buying `count` more, starting from current owned
    const owned = state.owned[cord.id] || 0;
    const r = costGrowth();
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += cord.baseCost * Math.pow(r, owned + i);
    }
    return Math.ceil(total * costDiscount());
  }

  function maxAffordable(cord) {
    const owned = state.owned[cord.id] || 0;
    const r = costGrowth();
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
    // Cores "deserved" follows a cube-root curve (×Recycler's Edge bonus); you
    // collect the difference vs. cores already earned this lifetime. Cube root
    // (Cookie Clicker's shape) needs ~8x more lifetime earnings per doubling,
    // keeping late-game cores meaningful instead of cascading.
    const potential = Math.floor(Math.cbrt(state.totalEarned / 1e9) * prestigeGainMult());
    return Math.max(0, potential - (state.coresEarned || 0));
  }

  /* ---------- Number formatting ---------- */
  const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
    'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg', 'Uvg'];
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
    socket: $('#socket'), socketSvg: $('#socketSvg'), tapinfo: $('#tapinfo'), autotapBadge: $('#autotapBadge'),
    socketMini: $('#socketMini'), tapvalMini: $('#tapvalMini'),
    buffBar: $('#buffBar'), floaters: $('#floaters'), surgeLayer: $('#surgeLayer'),
    cordlist: $('#cordlist'), uplist: $('#uplist'), goallist: $('#goallist'), goalcount: $('#goalcount'),
    corelist: $('#corelist'),
    statTotal: $('#statTotal'), statClicks: $('#statClicks'), statWps: $('#statWps'),
    statGens: $('#statGens'), statSurges: $('#statSurges'), statAch: $('#statAch'),
    statTime: $('#statTime'), statCores: $('#statCores'),
    coregain: $('#coregain'), corecount: $('#corecount'), prestigemult: $('#prestigemult'),
    prestigeBtn: $('#prestigeBtn'),
    toast: $('#toast'), modal: $('#modal'), mbox: $('#mbox'),
    savebox: $('#savebox'), exportBtn: $('#exportBtn'), importBtn: $('#importBtn'), wipeBtn: $('#wipeBtn'),
    storageStatus: $('#storageStatus'), version: $('#version'),
    // Voltlands
    worldBtn: $('#worldBtn'), wattsUnit: $('#wattsUnit'), wpsUnit: $('#wpsUnit'), tapUnit: $('#tapUnit'),
    enemyBtn: $('#enemyBtn'), enemyEmoji: $('#enemyEmoji'), enemyName: $('#enemyName'),
    zoneName: $('#zoneName'), hpFill: $('#hpFill'), hpText: $('#hpText'), zapinfo: $('#zapinfo'),
    weaponlist: $('#weaponlist'), zuplist: $('#zuplist'),
  };
  if (el.version) el.version.textContent = `PlugIdle v${VERSION}`;

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
  // Whichever tap control is currently on screen (main socket, or the
  // compact tap button on the Upgrades tab).
  function tapAnchor() {
    if (el.socketMini && document.getElementById('p-up').classList.contains('active')) return el.socketMini;
    return el.socket;
  }
  // Visible "tick" on the socket each time the Auto-Tapper fires, so the player
  // can see it working even while idle. Respects the animations toggle.
  function pulseAutoTap() {
    if (!state.settings.floats || reduceMotion()) return;
    const btn = el.socket;
    if (!btn) return;
    btn.classList.remove('autotap-fire');
    void btn.offsetWidth;          // force reflow so the animation can replay
    btn.classList.add('autotap-fire');
  }
  function spawnFloater(amount) {
    if (!state.settings.floats) return;
    const r = tapAnchor().getBoundingClientRect();
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
  let surgeChain = 0;       // consecutive catches within 60s of each other
  let lastSurgeCatch = 0;
  let stormUntil = 0;       // GRID STORM: surges rush in for 90s

  function scheduleSurge() {
    const storm = stormUntil > Date.now();
    const delay = storm
      ? 8000 + Math.random() * 6000
      : (60000 + Math.random() * 90000) * surgeDelayMult()       // 60–150s (Surge Magnet: ×0.6)
        * (chDone('darkgrid') ? 0.8 : 1);                        // SURGE BEACON challenge perk
    setTimeout(trySpawnSurge, delay);
  }
  function trySpawnSurge() {
    if (document.hidden || surgeActive || ch() === 'darkgrid') { scheduleSurge(); return; }
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
    // Chain: catches within 60s of each other compound — rewards being present.
    surgeChain = now - lastSurgeCatch <= 60000 ? surgeChain + 1 : 1;
    lastSurgeCatch = now;
    const chainMult = Math.min(1 + 0.25 * (surgeChain - 1), 3);      // up to ×3
    const chainExtraMs = Math.min((surgeChain - 1) * 2000, 10000);   // buffs last longer
    const roll = Math.random();
    if (roll < 0.5) {
      const bonus = Math.max(totalWps() * 90, clickPower() * 60, 50) * surgeRewardMult() * chainMult;
      gainWatts(bonus);
      spawnFloater(bonus);
      toast('⚡ OVERLOAD! +' + fmt(bonus) + ' W', true);
    } else if (roll < 0.75) {
      buffs.push({ kind: 'prod', mult: 7, until: now + 15000 + chainExtraMs, icon: '🔥', label: 'FRENZY ×7' });
      toast('🔥 PRODUCTION FRENZY ×7!', true);
    } else {
      buffs.push({ kind: 'click', mult: 10, until: now + 12000 + chainExtraMs, icon: '👆', label: 'CLICK ×10' });
      toast('👆 CLICK FRENZY ×10!', true);
    }
    if (surgeChain >= 2) toast(`⛓️ SURGE CHAIN ×${surgeChain}!`, true);
    // Rare GRID STORM: surges rush in every ~10s for 90 seconds.
    if (Math.random() < 0.07 && stormUntil < now) {
      stormUntil = now + 90000;
      buffs.push({ kind: 'storm', mult: 1, until: stormUntil, icon: '🌩️', label: 'GRID STORM', src: 'storm' });
      toast('🌩️ GRID STORM! Surges rushing in for 90s', true);
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
    const chal = state.challenge ? CHALLENGES.find((x) => x.id === state.challenge) : null;
    if (!buffs.length && !chal) { el.buffBar.classList.remove('show'); el.buffBar.innerHTML = ''; return; }
    el.buffBar.classList.add('show');
    let html = buffs
      .map((b) => {
        const left = Math.ceil((b.until - now) / 1000);
        const t = left >= 60 ? `${Math.floor(left / 60)}m${left % 60 ? (left % 60) + 's' : ''}` : `${left}s`;
        return `<span class="buff">${b.icon} ${b.label} · ${t}</span>`;
      })
      .join('');
    if (chal) html += `<span class="buff">${chal.icon} ${chal.name} · ${fmt(Math.min(state.totalEarned, chal.goal))}/${fmt(chal.goal)}</span>`;
    el.buffBar.innerHTML = html;
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
        toast('🏆 ' + a.name + ' · GRID +1%', true);
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
    const gb = document.getElementById('gridBonus');
    if (gb) gb.textContent = `⚡ GRID BONUS: +${done}% production · +1% per achievement, kept through recycling`;
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
  // Credit `n` taps (manual or from the Auto-Tapper) and celebrate any tap
  // milestone crossed in the process — so auto-taps count toward milestones too.
  function awardClicks(n) {
    if (n <= 0) return;
    const before = state.clicks;
    state.clicks += n;
    for (const t of TAP_MILESTONES) {
      if (t > before && t <= state.clicks) {
        toast(`👆 TAP MILESTONE! Tap power ×1.5 (now ×${fmt(tapMilestoneMult())})`, true);
        blip(990, 0.18, 'sawtooth', 0.05);
        buzz([0, 25, 40, 25]);
        screenShake(1);
      }
    }
  }

  function plug() {
    const gain = clickPower();
    gainWatts(gain);
    awardClicks(1);
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
    if (ch() === 'solo' && cord.id !== 'usba') { toast('🔒 SOLO CIRCUIT: USB-A only'); blip(120, 0.06); return; }
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
    // Celebrate crossing an ownership milestone (×2, or ×10 at every 100).
    if (Math.floor(after / CORD_MILESTONE) > Math.floor(before / CORD_MILESTONE)) {
      const tier = cordMilestoneMult(after);
      const big = Math.floor(after / BIG_MILESTONE) > Math.floor(before / BIG_MILESTONE);
      toast(`✖️ ${cord.name} ${big ? 'MEGA milestone! ×10 ·' : 'milestone!'} Now ×${fmt(tier)}`, true);
      blip(990, 0.18, 'sawtooth', 0.05);
      buzz([0, 25, 40, 25]);
      screenShake(1);
    }
    checkAchievements();
    renderCords();
    renderStatsLite();
  }

  function buyUpgrade(u) {
    if (ch() === 'minimalist') { toast('🔒 MINIMALIST: no upgrades'); blip(120, 0.06); return; }
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

  function buyCoreUpgrade(cu) {
    if (state.coreUpgrades[cu.id]) return;
    if ((state.cores || 0) < cu.cost) { toast('Not enough cores'); blip(120, 0.06); return; }
    state.cores -= cu.cost;
    state.coreUpgrades[cu.id] = true;
    if (cu.id === 'mystery') {           // you were warned not to plug it in
      state.wormhole = true;
      save();
      checkAchievements();
      playWormhole();
      return;
    }
    blip(700, 0.16, 'sawtooth', 0.05);
    buzz([0, 20, 40, 20]);
    toast('◆ ' + cu.name + '!', true);
    checkAchievements();
    renderCoreShop();
    renderShop();        // production multipliers may have changed
    syncSettingsUI();    // reveal the Auto-Buyer / Auto-Upgrader toggle if just bought
    renderStatsLite();
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
      const nextMult = nextMs % BIG_MILESTONE === 0 ? BIG_MILESTONE_MULT : 2;
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
            <div class="owned">own ${fmt(owned)}</div>
            <div class="cost ${can ? 'ok' : 'no'}">${fmt(cost)} W</div>
            <div class="mnote">${owned > 0 ? `×${nextMult} @ ${fmt(nextMs)}` : '&nbsp;'}</div>
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

  function renderCoreShop() {
    if (!el.corelist) return;
    let html = '';
    for (const cu of CORE_UPGRADES) {
      const bought = !!state.coreUpgrades[cu.id];
      const can = !bought && (state.cores || 0) >= cu.cost;
      const cls = bought ? 'bought' : can ? 'ok' : 'no';
      html += `
        <button class="upg core ${cls}" data-core="${cu.id}">
          <div class="un">${cu.icon} ${cu.name}</div>
          <div class="ud">${cu.desc}</div>
          <div class="uc">${bought ? '✓ OWNED' : '◆ ' + cu.cost}</div>
        </button>`;
    }
    el.corelist.innerHTML = html;
  }

  // lightweight per-frame updates (numbers only, no list rebuild)
  function renderStatsLite() {
    const wps = totalWps();
    const volt = activeWorld() === 'volt';
    if (volt) {
      // header doubles as the Voltlands HUD
      el.watts.textContent = fmt(sl().volts);
      el.wps.textContent = fmt(totalZps());
      el.tapval.textContent = fmt(zapPower());
    } else {
      el.watts.textContent = fmt(state.watts);
      el.wps.textContent = fmt(wps);
      el.tapval.textContent = fmt(clickPower());
    }
    if (el.wattsUnit) el.wattsUnit.textContent = volt ? 'V' : 'W';
    if (el.wpsUnit) el.wpsUnit.textContent = volt ? 'Z/s' : 'W/s';
    if (el.tapUnit) el.tapUnit.textContent = volt ? '/ zap' : '/ plug';
    if (el.tapvalMini) el.tapvalMini.textContent = fmt(clickPower());
    if (el.tapinfo) {
      const next = nextTapMilestone();
      const frac = tapWpsFrac();
      const parts = [];
      if (tapMilestonesPassed() > 0) parts.push(`milestone ×${fmt(tapMilestoneMult())}`);
      if (frac > 0) parts.push(`+${Math.round(frac * 100)}% W/s per tap`);
      if (next) parts.push(`next ×1.5 @ ${fmtInt(next)} taps (${fmtInt(state.clicks)})`);
      el.tapinfo.textContent = parts.join(' · ');
    }
    if (el.autotapBadge) el.autotapBadge.hidden = autoTapRate() <= 0;
    el.coresline.textContent = (state.coresEarned || 0) > 0
      ? `◆ ${fmtInt(state.cores)} · +${lifetimeBonusPct()}%` : '';
    el.statTotal.textContent = fmt(state.totalEarned);
    el.statClicks.textContent = fmtInt(state.clicks);
    el.statWps.textContent = fmt(wps);
    el.statGens.textContent = fmtInt(totalGenerators());
    el.statSurges.textContent = fmtInt(state.surgesCollected || 0);
    el.statAch.textContent = ACHIEVEMENTS.filter((a) => state.achievements[a.id]).length + ' / ' + ACHIEVEMENTS.length;
    const sg = document.getElementById('statGrid');
    if (sg) sg.textContent = '+' + achCount() + '%';
    // Voltlands stats (rows stay hidden until the wormhole)
    document.querySelectorAll('.voltstat').forEach((li) => { li.hidden = !state.wormhole; });
    if (state.wormhole) {
      const sv = document.getElementById('statVolts');
      const sw = document.getElementById('statWave');
      const sk = document.getElementById('statKills');
      const sb = document.getElementById('statBosses');
      if (sv) sv.textContent = fmt(sl().totalVolts);
      if (sw) sw.textContent = fmtInt(sl().wave);
      if (sk) sk.textContent = fmtInt(sl().kills);
      if (sb) sb.textContent = `${fmtInt(sl().bosses)} (grid +${sl().bosses * 2}%)`;
    }
    el.statCores.textContent = fmtInt(state.cores || 0);
    el.statTime.textContent = fmtDuration(Date.now() - state.startedAt);
    const pg = prestigeGain();
    el.coregain.textContent = fmtInt(pg);
    el.corecount.textContent = fmtInt(state.cores || 0);
    el.prestigemult.textContent = '+' + lifetimeBonusPct() + '%';
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
    // [data-set] only — the theme-picker buttons also use .sw and must not
    // have their labels clobbered with ON/OFF.
    document.querySelectorAll('.sw[data-set]').forEach((b) => {
      const v = b.dataset.set === 'sound' ? state.settings.sound
              : b.dataset.set === 'haptic' ? state.settings.haptics
              : b.dataset.set === 'anim' ? state.settings.floats
              : b.dataset.set === 'autobuyOn' ? state.settings.autobuyOn
              : b.dataset.set === 'autoupgOn' ? state.settings.autoupgOn
              : state.settings.sci;
      b.classList.toggle('on', !!v);
      b.textContent = v ? 'ON' : 'OFF';
    });
    // Auto-buy toggles appear only once you can auto-buy.
    const abRow = document.getElementById('autobuyRow');
    if (abRow) abRow.hidden = !(co('autobuy') || chDone('brownout'));
    const auRow = document.getElementById('autoupgRow');
    if (auRow) auRow.hidden = !co('autoupg');
    document.body.classList.toggle('noanim', !state.settings.floats);
  }

  function renderAll() {
    renderShop();
    renderCoreShop();
    renderChallenges();
    renderGoals();
    renderBuffs();
    if (state.wormhole) { renderWeapons(); renderZapUpgrades(); renderSlayerLite(); }
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
    if (state.wormhole) {
      sig += '|';
      for (const w of WEAPONS) sig += sl().volts >= weaponCost(w, 1) ? '1' : '0';
      for (const u of ZAP_UPGRADES) {
        if (sl().upgrades[u.id]) { sig += 'b'; continue; }
        sig += sl().volts >= u.cost ? '1' : '0';
      }
    }
    if (sig !== lastSig) {
      lastSig = sig;
      renderShop();
      if (state.wormhole) { renderWeapons(); renderZapUpgrades(); }
    }
  }

  /* ---------- Modal helpers ---------- */
  function showModal(html) { el.mbox.innerHTML = html; el.modal.classList.add('show'); }
  function hideModal() { el.modal.classList.remove('show'); }

  /* ---------- Run resets (prestige & challenges) ---------- */
  // Everything that survives a run reset. Monetization entitlements and streak
  // history are account/device facts, not run progress — losing them on
  // recycle would be a bug (and was: pre-v1.11 prestige dropped IAP grants).
  function carryState(extra) {
    return Object.assign({
      cores: state.cores || 0,
      coresEarned: state.coresEarned || 0,
      coreUpgrades: state.coreUpgrades,
      settings: state.settings,
      achievements: state.achievements,
      surgesCollected: state.surgesCollected,
      startedAt: state.startedAt,
      iap: state.iap, theme: state.theme,
      adDay: state.adDay, adUses: state.adUses,
      boostUntil: state.boostUntil, supporterDay: state.supporterDay,
      streak: state.streak, streakAt: state.streakAt,
      streakDay: state.streakDay, streakUntil: state.streakUntil,
      challengesDone: state.challengesDone,
      // the Voltlands are a parallel world — grid resets never touch them
      wormhole: state.wormhole, world: state.world,
      lifetimeEarned: state.lifetimeEarned, slayer: state.slayer,
    }, extra || {});
  }
  // Challenge-perk head starts applied to every fresh run.
  function applyRunStartPerks() {
    if (chDone('unplugged')) state.owned.usba = Math.max(state.owned.usba || 0, 5);  // JUMP LEADS
    if (chDone('minimalist') && ch() !== 'minimalist') state.upgrades.u_click1 = true; // PREWIRED
  }

  /* ---------- Prestige ---------- */
  function doPrestige() {
    const gain = prestigeGain();
    if (gain <= 0) { toast('Earn more before recycling'); return; }
    const newPct = Math.round((prestigeMultFor((state.coresEarned || 0) + gain) - 1) * 100);
    const kept = Math.floor((state.watts || 0) * prestigeKeepFrac());
    showModal(`
      <h2 class="danger">♻ RECYCLE?</h2>
      <p class="dim">Reset watts, cords &amp; upgrades.<br>Cores, core upgrades &amp; goals are kept.${ch() ? '<br><b>Abandons the active challenge!</b>' : ''}</p>
      <p class="big">+${fmt(gain)} ◆ Cores</p>
      <p>New bonus: <b style="color:var(--green)">+${newPct}%</b>${kept > 0 ? `<br><span class="dim">Jump Start keeps ${fmt(kept)} W</span>` : ''}</p>
      <div class="row2" style="margin-top:14px">
        <button class="bigbtn" id="mYes">CONFIRM</button>
        <button class="smbtn" id="mNo">CANCEL</button>
      </div>`);
    document.getElementById('mYes').addEventListener('click', () => {
      state = Object.assign(defaultState(), carryState({
        cores: (state.cores || 0) + gain,
        coresEarned: (state.coresEarned || 0) + gain,
      }));
      state.watts = kept;
      buffs = [];
      syncBoostBuff();
      syncStreakBuff();
      applyRunStartPerks();
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

  /* ---------- Challenges ---------- */
  function startChallenge(c) {
    if (ch()) { toast('Finish or abandon the current challenge first'); return; }
    showModal(`
      <h2>${c.icon} ${c.name}</h2>
      <p class="dim">${c.rule}</p>
      <p>Goal: earn <b style="color:var(--amber)">${fmt(c.goal)} W</b> in one run</p>
      <p class="dim">Starts a fresh run like recycling (no cores gained).<br>Reward: ${c.reward}</p>
      <div class="row2" style="margin-top:14px">
        <button class="bigbtn" id="mYes">START</button>
        <button class="smbtn" id="mNo">CANCEL</button>
      </div>`);
    document.getElementById('mYes').addEventListener('click', () => {
      state = Object.assign(defaultState(), carryState({ challenge: c.id }));
      buffs = [];
      syncBoostBuff();
      syncStreakBuff();
      applyRunStartPerks();
      // UNPLUGGED disables tapping entirely — without a starter cord the run
      // could never earn its first watt (softlock).
      if (c.id === 'unplugged') state.owned.usba = Math.max(state.owned.usba || 0, 1);
      save();
      hideModal();
      blip(700, 0.16, 'sawtooth', 0.05);
      toast(`${c.icon} ${c.name} — GO!`, true);
      renderAll();
    });
    document.getElementById('mNo').addEventListener('click', hideModal);
  }

  function abandonChallenge() {
    if (!ch()) return;
    state.challenge = '';
    toast('Challenge abandoned — run continues normally');
    save();
    renderAll();
  }

  // Called each tick: lifts the rule and grants the permanent perk on success.
  function checkChallenge() {
    if (!state.challenge) return;
    const c = CHALLENGES.find((x) => x.id === state.challenge);
    if (!c || state.totalEarned < c.goal) return;
    state.challengesDone[c.id] = true;
    state.challenge = '';
    toast(`${c.icon} CHALLENGE COMPLETE! ${c.reward.split(' — ')[0]} unlocked`, true);
    blip(1320, 0.2, 'triangle', 0.06);
    buzz([0, 30, 50, 30, 50, 60]);
    screenShake(1.2);
    checkAchievements();
    save();
    renderAll();
  }

  function renderChallenges() {
    const block = document.getElementById('challengeBlock');
    if (!block) return;
    const unlocked = (state.coresEarned || 0) >= 1 || Object.keys(state.challengesDone || {}).length > 0;
    block.hidden = !unlocked;
    if (!unlocked) return;
    const active = CHALLENGES.find((c) => c.id === ch());
    const ca = document.getElementById('chActive');
    if (ca) {
      ca.hidden = !active;
      if (active) {
        ca.innerHTML = `<p>${active.icon} <b class="hi">${active.name}</b> in progress — earn ${fmt(active.goal)} W this run.</p>
          <button class="smbtn danger" id="chAbandon" style="width:100%">ABANDON CHALLENGE</button>`;
      }
    }
    const list = document.getElementById('chlist');
    if (list) {
      list.innerHTML = CHALLENGES.map((c) => {
        const done = chDone(c.id);
        const cls = done ? 'bought' : active ? 'no' : 'ok';
        return `
          <button class="upg ${cls}" data-ch="${c.id}" ${done || active ? 'disabled' : ''}>
            <div class="un">${c.icon} ${c.name}</div>
            <div class="ud">${c.rule}<br>Goal: ${fmt(c.goal)} W · ${c.reward}</div>
            <div class="uc">${done ? '✓ DONE' : 'START'}</div>
          </button>`;
      }).join('');
    }
  }

  /* ---------- Daily streak (48h forgiveness — miss one day, keep the streak) ---------- */
  function streakMult() { return 1 + 0.05 * Math.min(state.streak || 0, 10); }
  function syncStreakBuff() {
    buffs = buffs.filter((b) => b.src !== 'streak');
    if ((state.streakUntil || 0) > Date.now() && (state.streak || 0) > 0) {
      buffs.push({ kind: 'prod', mult: streakMult(), until: state.streakUntil, icon: '🔥', label: `STREAK ×${streakMult().toFixed(2)}`, src: 'streak' });
    }
    renderBuffs();
  }
  function claimDailyStreak() {
    const today = localDay();
    if (state.streakDay === today) { syncStreakBuff(); return; }   // already claimed today
    const now = Date.now();
    const kept = state.streakAt && now - state.streakAt <= 48 * 3600000;
    state.streak = kept ? (state.streak || 0) + 1 : 1;
    state.streakAt = now;
    state.streakDay = today;
    state.streakUntil = now + 30 * 60000;
    syncStreakBuff();
    toast(`🔥 DAY ${state.streak} STREAK · production ×${streakMult().toFixed(2)} for 30m`, true);
    checkAchievements();
    save();
  }

  /* ---------- The Voltlands: slayer logic ---------- */
  const sl = () => state.slayer;
  const zu = (id) => !!(state.slayer && state.slayer.upgrades[id]);
  const isBossWave = (w) => w % 10 === 0;

  function enemyFor(wave) {
    if (isBossWave(wave)) return BOSSES[(wave / 10 - 1) % BOSSES.length];
    return ENEMIES[(wave - 1) % ENEMIES.length];
  }
  function zoneFor(wave) {
    const idx = Math.floor((wave - 1) / 10);
    const cycle = Math.floor(idx / ZONES.length);
    return ZONES[idx % ZONES.length] + (cycle > 0 ? ` ${cycle + 1}` : '');
  }
  function enemyHp(wave) { return 10 * Math.pow(1.22, wave - 1) * (isBossWave(wave) ? 10 : 1); }
  function voltReward(wave) { return Math.pow(1.19, wave - 1) * (isBossWave(wave) ? 12 : 1); }

  // ---- cross-world synergy ----
  // Volt->Grid: every boss killed is a permanent +2% watts production.
  function bossWattsMult() { return 1 + 0.02 * ((state.slayer && state.slayer.bosses) || 0); }
  // Grid->Volt: +1% ZPS per order of magnitude of watts EVER generated.
  function gridZpsBoost() { return 1 + 0.01 * Math.log10(1 + (state.lifetimeEarned || 0)); }

  function weaponMultiplier(weaponId) {
    let m = 1;
    for (const u of ZAP_UPGRADES) {
      if (!sl().upgrades[u.id]) continue;
      if (u.kind === 'weapon' && u.weapon === weaponId) m *= u.mult;
      if (u.kind === 'zglobal') m *= u.mult;
    }
    return m * cordMilestoneMult(sl().weapons[weaponId] || 0);   // same x2-per-25 milestones
  }
  function totalZps() {
    let sum = 0;
    for (const w of WEAPONS) sum += (sl().weapons[w.id] || 0) * w.zps * weaponMultiplier(w.id);
    return sum * gridZpsBoost() * achMult() * buffMult('prod');
  }
  function zapPower() {
    let p = 1;
    for (const u of ZAP_UPGRADES) if (sl().upgrades[u.id] && u.kind === 'zap') p *= u.mult;
    return p * gridZpsBoost() * achMult() * buffMult('click');
  }
  function weaponCost(w, count) {
    const owned = sl().weapons[w.id] || 0;
    let total = 0;
    for (let i = 0; i < count; i++) total += w.baseCost * Math.pow(COST_GROWTH, owned + i);
    return Math.ceil(total);
  }
  function zapUpgradeUnlocked(u) {
    if (!u.req) return true;
    return (sl().weapons[u.req.weapon] || 0) >= u.req.n;
  }

  function spawnEnemy() {
    sl().maxHp = enemyHp(sl().wave);
    sl().hp = sl().maxHp;
  }

  function killEnemy() {
    const s = sl();
    const boss = isBossWave(s.wave);
    const reward = voltReward(s.wave);
    s.volts += reward;
    s.totalVolts += reward;
    s.kills++;
    s.killsThisWave++;
    if (boss) {
      s.bosses++;
      toast(`💀 ${enemyFor(s.wave).name} DOWN! Grid power +2% (now +${s.bosses * 2}%)`, true);
      blip(220, 0.3, 'sawtooth', 0.06);
      buzz([0, 40, 60, 40]);
      screenShake(1.5);
    }
    const needed = boss ? 1 : 10;
    if (s.killsThisWave >= needed) {
      s.killsThisWave = 0;
      s.wave++;
      if ((s.wave - 1) % 10 === 0 && s.wave > 1) toast(`🗺️ ${zoneFor(s.wave)} — wave ${s.wave}`, true);
    }
    checkAchievements();
  }

  // Damage application with overkill carry (capped kills/tick so a huge ZPS
  // spike can't lock the loop).
  function applyZapDamage(dmg) {
    const s = sl();
    if (s.maxHp <= 0) spawnEnemy();
    s.hp -= dmg;
    let safety = 50;
    while (s.hp <= 0 && safety-- > 0) {
      const leftover = -s.hp;
      killEnemy();
      spawnEnemy();
      s.hp = s.maxHp - leftover;
    }
    if (s.hp <= 0) s.hp = 1;   // safety floor after 50 kills in one tick
  }

  function slayerTick(dt) {
    if (!state.wormhole) return;
    const zps = totalZps();
    if (zps > 0) applyZapDamage(zps * dt);
  }

  function zapEnemy() {
    let dmg = zapPower();
    let crit = false;
    if (zu('z_crit') && Math.random() < 0.10) { dmg *= 10; crit = true; }
    applyZapDamage(dmg);
    if (state.settings.floats && el.enemyBtn) {
      const r = el.enemyBtn.getBoundingClientRect();
      const f = document.createElement('div');
      f.className = 'float' + (crit ? ' crit' : '');
      f.textContent = (crit ? '💥' : '⚡') + fmt(dmg);
      f.style.left = (r.left + r.width / 2 - 20 + (Math.random() * 60 - 30)) + 'px';
      f.style.top = (r.top + 30) + 'px';
      el.floaters.appendChild(f);
      setTimeout(() => f.remove(), 1000);
      el.enemyBtn.classList.remove('zapped');
      void el.enemyBtn.offsetWidth;
      el.enemyBtn.classList.add('zapped');
    }
    blip(crit ? 1500 : 900 + Math.random() * 100, 0.05, 'sawtooth', 0.05);
    buzz(crit ? [0, 30, 30, 30] : 8);
    renderSlayerLite();
  }

  function buyWeapon(w) {
    const cost = weaponCost(w, 1);
    if (sl().volts < cost) { toast('Not enough volts'); blip(120, 0.06); return; }
    sl().volts -= cost;
    const after = (sl().weapons[w.id] || 0) + 1;
    sl().weapons[w.id] = after;
    blip(320, 0.06, 'square', 0.05);
    buzz(12);
    if (after % CORD_MILESTONE === 0) {
      toast(`✖️ ${w.name} milestone! Now ×${fmt(cordMilestoneMult(after))}`, true);
      blip(990, 0.18, 'sawtooth', 0.05);
    }
    checkAchievements();
    renderWeapons();
    renderSlayerLite();
  }

  function buyZapUpgrade(u) {
    if (sl().upgrades[u.id]) return;
    if (sl().volts < u.cost) { toast('Not enough volts'); blip(120, 0.06); return; }
    sl().volts -= u.cost;
    sl().upgrades[u.id] = true;
    blip(880, 0.12, 'sawtooth', 0.05);
    buzz([0, 15, 30, 15]);
    toast('⚡ ' + u.name + ' wired in!');
    renderZapUpgrades();
    renderSlayerLite();
  }

  /* ---------- Voltlands rendering ---------- */
  function renderWeapons() {
    if (!el.weaponlist) return;
    let html = '';
    let anyUnlocked = false;
    WEAPONS.forEach((w, i) => {
      const owned = sl().weapons[w.id] || 0;
      const prevOwned = i === 0 ? 1 : (sl().weapons[WEAPONS[i - 1].id] || 0);
      if (!(owned > 0 || prevOwned > 0)) return;
      anyUnlocked = true;
      const cost = weaponCost(w, 1);
      const can = sl().volts >= cost;
      const each = w.zps * weaponMultiplier(w.id) * gridZpsBoost();
      html += `
        <button class="card buyable" data-weapon="${w.id}">
          <div class="ico">${w.icon}</div>
          <div class="body">
            <div class="nm">${w.name}</div>
            <div class="meta"><span class="pos">${fmt(each)} Z/s each</span> · ${w.desc}</div>
          </div>
          <div class="right">
            <div class="owned">own ${fmtInt(owned)}</div>
            <div class="cost ${can ? 'ok' : 'no'}">${fmt(cost)} V</div>
          </div>
        </button>`;
    });
    if (!anyUnlocked) html = `<p class="empty-note">Zap enemies to earn your first volts!</p>`;
    el.weaponlist.innerHTML = html;
  }

  function renderZapUpgrades() {
    if (!el.zuplist) return;
    const list = ZAP_UPGRADES.filter((u) => sl().upgrades[u.id] || zapUpgradeUnlocked(u))
      .sort((a, b) => a.cost - b.cost);
    if (!list.length) {
      el.zuplist.innerHTML = `<p class="empty-note">Buy more weapons to unlock upgrades…</p>`;
      return;
    }
    el.zuplist.innerHTML = list.map((u) => {
      const bought = !!sl().upgrades[u.id];
      const can = !bought && sl().volts >= u.cost;
      const cls = bought ? 'bought' : can ? 'ok' : 'no';
      return `
        <button class="upg ${cls}" data-zupgrade="${u.id}">
          <div class="un">${u.icon} ${u.name}</div>
          <div class="ud">${u.desc}</div>
          <div class="uc">${bought ? '✓ OWNED' : fmt(u.cost) + ' V'}</div>
        </button>`;
    }).join('');
  }

  function renderSlayerLite() {
    if (!state.wormhole || !el.hpFill) return;
    const s = sl();
    const e = enemyFor(s.wave);
    const boss = isBossWave(s.wave);
    el.enemyEmoji.textContent = e.icon;
    el.enemyName.textContent = (boss ? '👑 BOSS: ' : '') + e.name;
    el.zoneName.textContent = `${zoneFor(s.wave)} · WAVE ${s.wave}${boss ? '' : ` · ${s.killsThisWave}/10`}`;
    const pct = s.maxHp > 0 ? Math.max(0, (s.hp / s.maxHp) * 100) : 0;
    el.hpFill.style.width = pct + '%';
    el.hpText.textContent = `${fmt(Math.max(0, s.hp))} / ${fmt(s.maxHp)} HP`;
    if (el.zapinfo) el.zapinfo.textContent =
      `⚡${fmt(zapPower())} / zap · grid boost ×${gridZpsBoost().toFixed(2)}`;
    el.enemyBtn.classList.toggle('boss', boss);
  }

  /* ---------- World switching & the wormhole ---------- */
  function activeWorld() { return state.wormhole && state.world === 'volt' ? 'volt' : 'grid'; }

  function applyWorld() {
    const w = activeWorld();
    document.body.dataset.world = w;
    if (el.worldBtn) {
      el.worldBtn.hidden = !state.wormhole;
      el.worldBtn.textContent = w === 'volt' ? '🔌' : '🌀';
      el.worldBtn.setAttribute('aria-label', w === 'volt' ? 'Return to the Grid' : 'Enter the wormhole');
    }
    // if the active tab belongs to the other world, jump to this world's home
    const active = document.querySelector('.tab.active');
    const tw = (active && active.dataset.tworld) || 'both';
    if (tw !== 'both' && tw !== w) activateTab(w === 'volt' ? 'zap' : 'plug', true);
    renderStatsLite();
  }

  function switchWorld() {
    if (!state.wormhole) return;
    state.world = activeWorld() === 'volt' ? 'grid' : 'volt';
    blip(state.world === 'volt' ? 180 : 520, 0.2, 'sawtooth', 0.05);
    applyWorld();
    save();
  }

  function playWormhole() {
    state.world = 'volt';
    if (sl().maxHp <= 0) spawnEnemy();
    const ov = document.getElementById('wormhole');
    const instant = !state.settings.floats || reduceMotion() || !ov;
    if (instant) {
      applyWorld();
      renderAll();
      toast('🌀 ARRIVAL: THE VOLTLANDS', true);
      save();
      return;
    }
    ov.classList.add('show');
    blip(80, 1.4, 'sawtooth', 0.07);
    buzz([0, 80, 60, 80, 60, 200]);
    screenShake(2);
    setTimeout(() => {
      applyWorld();
      renderAll();
      toast('🌀 ARRIVAL: THE VOLTLANDS', true);
      save();
      setTimeout(() => ov.classList.remove('show'), 700);
    }, 4200);
  }

  /* ---------- Offline earnings ---------- */
  function applyOffline() {
    const now = Date.now();
    const eff = offlineEff();
    const away = Math.min(now - (state.lastSeen || now), offlineCapMs()); // Battery Backup raises the cap
    if (away < 1000 * 30) return; // ignore < 30s
    const rate = totalWps();
    const earned = rate * (away / 1000) * eff;
    if (earned <= 0) return;
    gainWatts(earned);
    // Voltlands earn too (ZPS keeps zapping; no wave progress offline)
    let voltLine = '';
    if (state.wormhole) {
      const voltsEarned = totalZps() * (away / 1000) * eff;
      if (voltsEarned > 0) {
        sl().volts += voltsEarned;
        sl().totalVolts += voltsEarned;
        voltLine = `<p class="big" style="font-size:22px">+${fmt(voltsEarned)} V</p>`;
      }
    }
    const h = Math.floor(away / 3600000), m = Math.floor((away % 3600000) / 60000);
    const adBtn = window.Monetize?.adsAvailable?.()
      ? `<button class="smbtn" id="wbDouble" style="margin-top:8px;width:100%">📺 WATCH AD · DOUBLE IT</button>` : '';
    showModal(`
      <h2>⚡ WELCOME BACK</h2>
      <p class="dim">Your cords ran for<br><b style="color:var(--cyan)">${h}h ${m}m</b> (${Math.round(eff * 100)}% rate)</p>
      <p class="big">+${fmt(earned)} W</p>${voltLine}
      <button class="bigbtn" id="wbOk" style="margin-top:12px">COLLECT</button>${adBtn}`);
    document.getElementById('wbOk').addEventListener('click', hideModal);
    const dbl = document.getElementById('wbDouble');
    if (dbl) dbl.addEventListener('click', async () => {
      dbl.disabled = true;
      const ok = await window.Monetize.showRewarded();
      if (ok) {
        gainWatts(earned);
        toast('📺 Offline earnings DOUBLED! +' + fmt(earned) + ' W', true);
        save();
        renderStatsLite();
        hideModal();
      } else {
        dbl.disabled = false;
        toast('Ad not ready — try again in a moment');
      }
    });
  }

  /* ---------- Power Store (Android only) ----------
     Rewarded ad bonuses + Google Play purchases, via the js/monetize.js
     facade. On the web Monetize.available() is false and none of this UI
     is ever revealed — the web build stays 100% monetization-free. */

  const IAP_PRODUCTS = [
    { id: 'supporter_pack',      icon: '💖', name: 'Supporter Pack',  consumable: false, desc: 'Supporter badge + claim a free 2x boost every day.' },
    { id: 'boost_production_25', icon: '🚀', name: 'Overclock +25%',  consumable: false, desc: 'All production +25%. Permanent.' },
    { id: 'starter_cores',       icon: '◆',  name: 'Starter Cores',   consumable: false, desc: 'Instantly gain 3 Prestige Cores.' },
    { id: 'timewarp_4h',         icon: '⏩', name: 'Time Warp · 4h',  consumable: true,  desc: 'Instantly earn 4 hours of production.' },
    { id: 'timewarp_24h',        icon: '⏭️', name: 'Time Warp · 24h', consumable: true,  desc: 'Instantly earn 24 hours of production.' },
    { id: 'theme_pack_phosphor', icon: '🎨', name: 'CRT Theme Pack',  consumable: false, desc: 'Amber, Ice & Vapor phosphor themes.' },
  ];
  const AD_LIMITS = { boost: 3, surge: 2 };   // rewarded uses per day, per placement
  const BOOST_MS = 10 * 60000;                // 2x production per boost/claim
  let iapPrices = {};                         // sku -> localized price string

  function localDay() { return new Date().toDateString(); }
  function adUsesLeft(kind) {
    if (state.adDay !== localDay()) { state.adDay = localDay(); state.adUses = {}; }
    return AD_LIMITS[kind] - (state.adUses[kind] || 0);
  }
  function markAdUse(kind) {
    adUsesLeft(kind);                         // roll the day over if needed
    state.adUses[kind] = (state.adUses[kind] || 0) + 1;
  }

  // The 2x boost persists in state.boostUntil so an app restart can't eat a
  // bonus the player watched an ad (or paid goodwill) for.
  function grantBoost(label) {
    const now = Date.now();
    state.boostUntil = Math.max(state.boostUntil || 0, now) + BOOST_MS;
    syncBoostBuff();
    toast(label, true);
    blip(990, 0.18, 'sawtooth', 0.05);
    buzz([0, 25, 40, 25]);
    save();
  }
  function syncBoostBuff() {
    buffs = buffs.filter((b) => b.kind !== 'prod' || b.src !== 'boost');
    if ((state.boostUntil || 0) > Date.now()) {
      buffs.push({ kind: 'prod', mult: 2, until: state.boostUntil, icon: '🚀', label: 'BOOST ×2', src: 'boost' });
    }
    renderBuffs();
  }

  function grantTimewarp(hours) {
    const earned = totalWps() * hours * 3600;
    gainWatts(earned);
    toast(`⏩ TIME WARP! +${fmt(earned)} W (${hours}h)`, true);
    screenShake(1.2);
    save();
    renderAll();
  }

  // Idempotent entitlement grant — Play Billing re-fires owned products on
  // every restore/boot, so non-consumables must only apply once.
  function grantPurchase(sku) {
    const product = IAP_PRODUCTS.find((p) => p.id === sku);
    if (!product) return;
    if (product.consumable) {
      if (sku === 'timewarp_4h') grantTimewarp(4);
      else if (sku === 'timewarp_24h') grantTimewarp(24);
      return;
    }
    if (state.iap[sku]) return;               // already granted
    state.iap[sku] = true;
    if (sku === 'starter_cores') {
      state.cores = (state.cores || 0) + 3;
      state.coresEarned = (state.coresEarned || 0) + 3;
    }
    toast(`${product.icon} ${product.name} — thank you!`, true);
    save();
    renderAll();
    renderStore();
    applyTheme();
  }

  function applyTheme() {
    const t = state.iap.theme_pack_phosphor ? (state.theme || '') : '';
    document.body.dataset.theme = t;
    renderThemePicker();
  }
  const THEMES = [
    { id: '',      name: 'GREEN' },
    { id: 'amber', name: 'AMBER' },
    { id: 'ice',   name: 'ICE' },
    { id: 'vapor', name: 'VAPOR' },
  ];
  function renderThemePicker() {
    const row = document.getElementById('themeRow');
    const wrap = document.getElementById('themeBtns');
    if (!row || !wrap) return;
    const owned = !!state.iap.theme_pack_phosphor;
    row.hidden = !owned;
    if (!owned) return;
    wrap.innerHTML = THEMES.map((t) =>
      `<button class="sw theme-sw ${(state.theme || '') === t.id ? 'on' : ''}" data-theme-pick="${t.id}">${t.name}</button>`
    ).join('');
  }

  function renderStore() {
    const block = document.getElementById('storeBlock');
    if (!block || !window.Monetize?.available?.()) return;
    block.hidden = false;
    const h3 = block.querySelector('h3');
    if (h3) h3.textContent = state.iap.supporter_pack ? '🎁 POWER STORE · 💖 SUPPORTER' : '🎁 POWER STORE';

    const bonus = document.getElementById('bonusArea');
    if (bonus) {
      const supporter = state.iap.supporter_pack && state.supporterDay !== localDay();
      let html = supporter
        ? `<button class="bigbtn" data-bonus="claim" style="margin-bottom:8px">💖 CLAIM DAILY ×2 BOOST</button>` : '';
      if (window.Monetize.adsAvailable()) {
        const boostLeft = adUsesLeft('boost');
        const surgeLeft = adUsesLeft('surge');
        html += `
        <div class="row2">
          <button class="smbtn" data-bonus="boost" ${boostLeft <= 0 ? 'disabled' : ''}>📺 ×2 BOOST 10m<br><small>${boostLeft}/${AD_LIMITS.boost} today</small></button>
          <button class="smbtn" data-bonus="surge" ${surgeLeft <= 0 ? 'disabled' : ''}>📺 SUMMON SURGE<br><small>${surgeLeft}/${AD_LIMITS.surge} today</small></button>
        </div>
        <p class="muted" style="margin:8px 0 4px">Ads are 100% optional — watch one only when YOU want a bonus.</p>`;
      }
      bonus.innerHTML = html;
    }

    const list = document.getElementById('iaplist');
    if (list) {
      list.innerHTML = IAP_PRODUCTS.map((p) => {
        const owned = !p.consumable && state.iap[p.id];
        const price = iapPrices[p.id] || '···';
        return `
          <button class="upg ${owned ? 'bought' : 'ok'}" data-iap="${p.id}" ${owned ? 'disabled' : ''}>
            <div class="un">${p.icon} ${p.name}</div>
            <div class="ud">${p.desc}</div>
            <div class="uc">${owned ? '✓ OWNED' : price}</div>
          </button>`;
      }).join('');
    }
  }

  async function onBonusClick(kind) {
    if (kind === 'claim') {
      if (!state.iap.supporter_pack || state.supporterDay === localDay()) return;
      state.supporterDay = localDay();
      grantBoost('💖 SUPPORTER BOOST ×2 (10m)!');
      renderStore();
      return;
    }
    if (adUsesLeft(kind) <= 0) { toast('Come back tomorrow!'); return; }
    const ok = await window.Monetize.showRewarded();
    if (!ok) { toast('Ad not ready — try again in a moment'); return; }
    markAdUse(kind);
    if (kind === 'boost') grantBoost('📺 BOOST ×2 for 10 minutes!');
    else if (kind === 'surge') {
      if (surgeActive) toast('⚡ A surge is already on screen!');
      else { spawnSurge(); toast('📺 SURGE INCOMING — catch it!', true); }
    }
    save();
    renderStore();
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
      // normalizeState carries over cores, coresEarned, coreUpgrades and the
      // legacy prestige migration, so imported prestige progress is preserved.
      state = normalizeState(obj);
      save();
      const coreNote = (state.coresEarned || 0) > 0 ? ` (◆${fmtInt(state.cores)} cores, +${lifetimeBonusPct()}%)` : '';
      toast('📥 Save imported!' + coreNote, true);
      if (state.wormhole && sl().maxHp <= 0) spawnEnemy();
      applyWorld();
      applyTheme();
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
      applyWorld();
      applyTheme();
      renderAll();
    });
    document.getElementById('wN').addEventListener('click', hideModal);
  }

  /* ---------- Event wiring ---------- */
  el.socket.addEventListener('click', plug);
  el.socketMini.addEventListener('click', plug); // tap button on the Upgrades tab
  if (el.enemyBtn) el.enemyBtn.addEventListener('click', zapEnemy);
  if (el.worldBtn) el.worldBtn.addEventListener('click', switchWorld);
  if (el.weaponlist) el.weaponlist.addEventListener('click', (e) => {
    const item = e.target.closest('[data-weapon]');
    if (item) buyWeapon(WEAPONS.find((w) => w.id === item.dataset.weapon));
  });
  if (el.zuplist) el.zuplist.addEventListener('click', (e) => {
    const item = e.target.closest('[data-zupgrade]');
    if (item) buyZapUpgrade(ZAP_UPGRADES.find((u) => u.id === item.dataset.zupgrade));
  });
  // iOS suppresses :active styling unless a touchstart listener exists.
  document.body.addEventListener('touchstart', () => {}, { passive: true });

  // tabs (bottom nav) — also driven programmatically by world switching
  function activateTab(name, silent) {
    const tab = document.querySelector(`.tab[data-tab="${name}"]`);
    const panel = document.getElementById('p-' + name);
    if (!tab || !panel) return;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    panel.classList.add('active');
    if (!silent) blip(520, 0.03);
    if (name === 'goals') renderGoals();
    else if (name === 'up') renderUpgrades();
    else if (name === 'plug') renderCords();
    else if (name === 'zap') { renderWeapons(); renderSlayerLite(); }
    else if (name === 'arsenal') renderZapUpgrades();
    else if (name === 'more') { renderCoreShop(); renderChallenges(); renderStatsLite(); syncSettingsUI(); renderStore(); }
  }
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
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
  el.corelist.addEventListener('click', (e) => {
    const item = e.target.closest('[data-core]');
    if (item) buyCoreUpgrade(CORE_UPGRADES.find(cu => cu.id === item.dataset.core));
  });

  // Power Store: rewarded bonuses, purchases, restore (delegated; the block
  // only becomes visible inside the native Android shell)
  const storeBlock = document.getElementById('storeBlock');
  if (storeBlock) storeBlock.addEventListener('click', (e) => {
    const bonus = e.target.closest('[data-bonus]');
    if (bonus && !bonus.disabled) { onBonusClick(bonus.dataset.bonus); return; }
    const buyBtn = e.target.closest('[data-iap]');
    if (buyBtn && !buyBtn.disabled) { window.Monetize.buy(buyBtn.dataset.iap); return; }
    if (e.target.closest('#restoreBtn')) window.Monetize.restore();
  });
  // theme picker (revealed once the theme pack is owned)
  const themeRow = document.getElementById('themeRow');
  if (themeRow) themeRow.addEventListener('click', (e) => {
    const pick = e.target.closest('[data-theme-pick]');
    if (!pick) return;
    state.theme = pick.dataset.themePick;
    applyTheme();
    save();
    blip(520, 0.03);
  });

  // prestige + save buttons
  el.prestigeBtn.addEventListener('click', doPrestige);
  el.exportBtn.addEventListener('click', exportSave);
  el.importBtn.addEventListener('click', importSave);
  el.wipeBtn.addEventListener('click', hardReset);

  // challenges: start / abandon (delegated)
  const chBlock = document.getElementById('challengeBlock');
  if (chBlock) chBlock.addEventListener('click', (e) => {
    if (e.target.closest('#chAbandon')) { abandonChallenge(); return; }
    const btn = e.target.closest('[data-ch]');
    if (btn && !btn.disabled) {
      const c = CHALLENGES.find((x) => x.id === btn.dataset.ch);
      if (c) startChallenge(c);
    }
  });

  // settings switches
  document.querySelectorAll('.sw[data-set]').forEach((b) => {
    b.addEventListener('click', () => {
      const k = b.dataset.set;
      if (k === 'sound') state.settings.sound = !state.settings.sound;
      else if (k === 'haptic') { state.settings.haptics = !state.settings.haptics; if (state.settings.haptics) buzz(20); }
      else if (k === 'anim') state.settings.floats = !state.settings.floats;
      else if (k === 'autobuyOn') state.settings.autobuyOn = !state.settings.autobuyOn;
      else if (k === 'autoupgOn') state.settings.autoupgOn = !state.settings.autoupgOn;
      else state.settings.sci = !state.settings.sci;
      syncSettingsUI();
      renderStatsLite();
      renderShop();
      save();
    });
  });

  // close modal by tapping the backdrop
  el.modal.addEventListener('click', (e) => { if (e.target === el.modal) hideModal(); });

  // keyboard: space/enter to plug (or zap, in the Voltlands)
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault();
      if (activeWorld() === 'volt') zapEnemy();
      else plug();
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
  // Auto-buy is available from the Auto-Buyer core upgrade or the BROWNOUT
  // challenge perk, and runs while its Settings toggle is on (default on).
  function autoBuyActive() {
    return (co('autobuy') || chDone('brownout')) && state.settings.autobuyOn;
  }

  // AUTO-BUYER: every tick, grab a fat batch of every affordable cord, highest
  // tier first so watts flow to the best ones. No sounds/toasts and no per-buy
  // re-render — it runs flat-out; milestone celebrations still fire on manual
  // buys. AUTO_BUY_PER_CORD caps work per tier per tick (≈250 cords/tier/sec).
  const AUTO_BUY_PER_CORD = 25;
  function autoBuyTick() {
    if (!autoBuyActive()) return;
    let bought = false;
    for (let i = CORDS.length - 1; i >= 0; i--) {
      const cord = CORDS[i];
      if (ch() === 'solo' && cord.id !== 'usba') continue;   // SOLO CIRCUIT: USB-A only
      const owned = state.owned[cord.id] || 0;
      const prevOwned = i === 0 ? 1 : (state.owned[CORDS[i - 1].id] || 0);
      if (!(owned > 0 || prevOwned > 0)) continue;            // not unlocked yet
      const k = Math.min(maxAffordable(cord), AUTO_BUY_PER_CORD);
      if (k <= 0) continue;
      const cost = cordCost(cord, k);
      if (state.watts < cost) continue;
      state.watts -= cost;
      state.owned[cord.id] = owned + k;
      bought = true;
    }
    if (bought) lastSig = '';   // force the shop's affordability re-render
  }

  // AUTO-UPGRADER (core upgrade): every tick, buy every unlocked, affordable
  // upgrade, cheapest first so cheap ones are never starved by a pricey one.
  function autoBuyUpgrades() {
    if (!co('autoupg') || !state.settings.autoupgOn || ch() === 'minimalist') return;  // MINIMALIST: no upgrades
    let bought = false;
    const avail = UPGRADES
      .filter(u => !state.upgrades[u.id] && upgradeUnlocked(u))
      .sort((a, b) => a.cost - b.cost);
    for (const u of avail) {
      if (state.watts < u.cost) continue;
      state.watts -= u.cost;
      state.upgrades[u.id] = true;
      bought = true;
    }
    if (bought) lastSig = '';   // force the shop's affordability re-render
  }

  let lastTick = Date.now();
  let tickCount = 0;
  let autoTapAccum = 0;   // fractional auto-taps carried between ticks
  function tick() {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    let gain = totalWps() * dt;
    // Auto-Tapper core upgrade: free passive taps, treated exactly like manual taps.
    const taps = autoTapRate();
    if (taps > 0) {
      // Auto-taps use full clickPower() (so every tap upgrade applies) and count
      // toward state.clicks, so they progress the tap milestones just like manual taps.
      gain += clickPower() * taps * dt;
      autoTapAccum += taps * dt;
      const whole = Math.floor(autoTapAccum);
      if (whole > 0) { autoTapAccum -= whole; awardClicks(whole); }
      if (tickCount % 2 === 0) pulseAutoTap();   // ~5 visible pulses/sec, matching the rate
    }
    if (gain > 0) gainWatts(gain);
    slayerTick(dt);           // both economies always tick (parallel worlds)
    tickCount++;
    autoBuyTick();        // fast cord auto-buyer (Auto-Buyer core / BROWNOUT perk)
    autoBuyUpgrades();    // Auto-Upgrader core upgrade
    if (activeWorld() === 'volt' && tickCount % 2 === 0) renderSlayerLite();
    checkChallenge();
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
    if (durable) state = normalizeState(durable);
    await requestPersistence();
    applyOffline();
    syncBoostBuff();     // resurrect a still-running 2x boost after restart
    claimDailyStreak();  // daily check-in bonus (48h forgiveness)
    if (state.wormhole && sl().maxHp <= 0) spawnEnemy();
    applyWorld();        // restore which world the player was in
    applyTheme();
    window.Monetize?.init?.({
      skus: IAP_PRODUCTS.map((p) => ({ id: p.id, consumable: p.consumable })),
      onGrant: grantPurchase,
      onPrices: (prices) => { iapPrices = prices; renderStore(); },
      notify: (msg) => toast(msg),
    });
    renderStore();
    renderAll();
    save();              // re-mirror the reconciled state into both stores (self-heal)
    updateStorageStatus();
    checkAchievements();  // award anything already satisfied by the loaded save
    lastTick = Date.now(); // don't count the async load time as idle earnings
    setInterval(tick, TICK_MS);
    setInterval(save, SAVE_EVERY_MS);
    scheduleSurge();      // begin the power-surge cadence
  })();

  // ---- Capacitor native shell (Android) ----
  // window.Capacitor is injected by the native runtime; absent on the plain web.
  const NATIVE = !!(window.Capacitor?.isNativePlatform?.());
  if (NATIVE) {
    const { App, StatusBar } = window.Capacitor.Plugins;
    try {
      StatusBar.setStyle({ style: 'DARK' });               // light icons on the CRT-dark chrome
      StatusBar.setBackgroundColor({ color: '#070a0f' });  // pre-15 devices without edge-to-edge
    } catch (e) { /* ignore */ }
    try {
      // back button: leave in-app pages first; from the game, save and minimize
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else { save(); App.minimizeApp(); }
      });
    } catch (e) { /* ignore */ }
  }

  // register service worker for installability + offline (web only — the native
  // shell bundles assets locally, and a stale SW cache would fight app updates)
  if (!NATIVE && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
