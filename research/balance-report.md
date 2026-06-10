# PlugIdle — Progression Balance & Depth Research Report

*June 2026 · Deep-research run: 5 search angles → 15+ sources → claim extraction →
3-vote adversarial verification → headless economy simulation against the live code.*

---

## Executive summary

**The complaint is real and now quantified.** A greedy-bot simulation of the live
economy (`scripts/sim-balance.mjs`, reading the actual formulas from `js/game.js`)
shows the prestige loop collapsing into a singularity at **~39.5 hours** of play:
prestige intervals shrink from hours to literal seconds, prestige cores explode to
10^58, and the Omega Cord — the final content — falls at **39h37m**. The simulation
is *conservative* (no core upgrades, no surges, no offline bonuses), so real players
hit this faster.

**Root cause:** `cores = floor(sqrt(totalEarned/1e9))` with a linear, uncapped
+5%-per-core production bonus is structurally identical to AdVenture Capitalist's
angel system — which the design literature identifies as the most inflation-prone
prestige shape [S2, S6]. Because the bonus feeds production, production feeds
lifetime earnings, and earnings feed cores, every prestige shortens the next run
geometrically. The cost curve itself is fine: without prestige, the bot can't even
reach the Graviton Cord in 96 hours.

**The fix is two lines** (validated by simulation):

1. `prestigeGain`: **sqrt → cbrt** — `floor(Math.cbrt(totalEarned/1e9))`
2. `prestigeMult`: **softcap at ×10** — full +5%/core up to ×10 total, square-root
   dampening beyond.

Result: the first 2 hours and first prestiges are **unchanged**, every one of the 24
generators lands on a steady multi-day ladder, and Omega falls at **~111 bot-hours**
(realistically 3–5 weeks of casual play) — a **2.8× content lifetime** — with the
inflation point pushed to *after* content completion, exactly where a future second
prestige layer should take over.

**Top depth features by playtime-per-effort** (details in §6): achievements that
grant production (Cookie Clicker's milk pattern — the single cheapest retention
feature available to this codebase), challenge runs rewarding automation, a daily
streak with a 48-hour forgiveness window, and a second prestige layer ("Grid
Ascension") for v1.2.

---

## 1. Method

- **5 parallel search angles:** cost/production curves, prestige formulas, retention
  systems, content pacing, balance pitfalls & simulation technique.
- **Verification:** 6 load-bearing claims were each checked by 3 independent
  adversarial agents (majority verdict; see Appendix A).
- **Simulation:** `scripts/sim-balance.mjs` extracts `CORDS`, `UPGRADES`,
  `COST_GROWTH`, and `PROD_MULT` from `js/game.js` at runtime (so it can't drift
  from the shipped balance), then plays a greedy cheapest-purchase bot with light
  early tapping and a prestige-when-cores-double strategy. Greedy bots are a
  near-optimal lower bound for time-to-X in this class of game (formal analysis of
  Cookie Clicker, arXiv:1808.07540) [S9] — a method independently recommended by
  the Pecorella GDC worksheets [S5].

---

## 2. Diagnosis: the live economy

### 2.1 Without prestige, pacing is healthy

Single-lifetime run (96h, no prestige): the first 9 generators arrive in the first
8 hours at a good cadence; tier arrival then stretches (Subsea 17h, Quantum 43h,
Plasma 88h) and **Graviton through Omega are unreachable** — by design, that's what
prestige is for. Cost growth 1.12× sits inside the genre's 1.07–1.15 corridor
(Cookie Clicker 1.15, Clicker Heroes 1.07, AdCap 1.07–1.15 per tier) [S1, S8], and
the ×2/25 + ×10/100 milestones do **not** invert the curve on their own: production
exponent from milestones (~n/100·log10) stays far below the cost exponent
(n·log 1.12) [S5, S6].

### 2.2 With prestige, the loop detonates

Live formula, prestige-when-doubled bot:

| Prestige # | Time | Cores after | Production mult |
|---|---|---|---|
| 1 | 2h05m | 1 | ×1.05 |
| 5 | 16h20m | 16 | ×1.8 |
| 8 | 30h55m | 128 | ×7.4 |
| 11 | 37h25m | 1,027 | ×52 |
| 15 | 39h23m | 16,600 | ×831 |
| 20 | 39h36m | 536,539 | ×26,800 |
| 146 (end) | 39h37m+ | ~10^58 | ×5.6×10^56 |

Runs shrink ~geometrically (2h → 1h22m → 56m → … → seconds). **Omega Cord:
39h37m.** After that, numbers outrun the suffix table and every purchase is
instant — "end game too quick, cores too easy" is exactly what the math predicts
for sqrt-currency × linear-uncapped-bonus [S2, S6].

### 2.3 Why naive fixes fail (all simulated)

| Variant | First core | Outcome |
|---|---|---|
| **Live:** sqrt, ÷1e9 | 2h05m | singularity @ 39.5h, Omega 39h37m |
| cbrt, ÷1e9 | 2h05m | singularity delayed to ~83h — still collapses |
| sqrt, ÷1e12 | ~9h | 16 cores in 96h — starves the 72-core upgrade shop |
| cbrt, ÷1e12 | ~27h | 8 cores in 96h — worse |
| log₂ ladder | 2h05m | no singularity ever, but Omega unreachable; runs hit 84h |
| **cbrt + softcap ×10** | **2h05m** | **Omega @ 110h50m; collapse only after content ends** |

Any power-law currency with a linear bonus eventually collapses; the question is
*where you place the collapse relative to your content*. The softcap (an
Antimatter-Dimensions-style dampener [S3]) places it just past Omega.

### 2.4 The recommended curve, in detail (cbrt ÷1e9 + softcap ×10)

First-buy ladder: Power Cord 1h12m · Thunderbolt 4h04m · Fiber 8h57m · Subsea
35h31m · Quantum 59h21m · Plasma 80h30m · **Graviton 86h07m · Dark Fiber 94h53m ·
Wormhole 98h18m · Singularity 106h29m · Divine 110h15m · Omega 110h50m** — every
tier becomes a real goal instead of tiers 15–24 arriving in one cascade.

Prestige cadence: 2h05m, 5h11m, 9h39m, 16h21m, 26h06m, 37h45m… — comfortably
inside the "first prestige in the 2–6 hour hook-to-habit band, several prestiges
in week one" guideline [S4, S10]. Day-one core income: 8 (vs 32 live) — slower,
but the 72-core upgrade shop then carries a full week instead of an afternoon.

---

## 3. What the genre actually does (verified)

| Game | Prestige gain | Per-unit bonus | Notes |
|---|---|---|---|
| Cookie Clicker | `floor(cbrt(lifetime/1e12))` | +1% CpS (gated by heavenly upgrades) | cubic ladder: level n costs n³·1e12 ✅3/3 |
| AdVenture Capitalist | `floor(150·sqrt(lifetime/1e15))` | +2% additive | PlugIdle's current shape, with a 1e15 divisor ✅3/3 |
| Antimatter Dimensions | `10^(log10(antimatter)/308 − 0.75)` | spent on upgrades | log-shaped; inflation handled by *layers* of resets [S3] |
| Realm Grinder | quadratic gem ladder (gem n costs ~n·5e11 more) | additive % (exact % unverified) | ≈ sqrt growth ⚠️ |
| Egg Inc. | soul eggs ~ power of earnings | +10% each, but Prophecy Eggs **compound** | cautionary case: compounding bonus = runaway [S2] |

**Doubling heuristics:** under sqrt, doubling prestige currency needs ~4× the
lifetime earnings; under cbrt, ~8× [S4, S5] — cbrt is the standard tool for
stretching mid/late game without touching the early loop. Cookie Clicker pairs the
*most generous bonus structure* (+1% linear) with the *strictest ladder* (cubic);
AdCap pairs +2% with sqrt but hides it behind a 1e15 divisor and per-tier cost
multipliers up to 1.15. PlugIdle currently takes the generous half of both.

**Milestones:** AdCap's 25/50/100/… unlocks are cycle-time halvings that stack
multiplicatively to ×4096 (✅2/3 — the "additive" rule applies to its separate
shop-multiplier system), so PlugIdle's ×2/25 with ×10/100 is *somewhat hotter* than
genre norm but, per §2.1, not the cause of the collapse. Optional polish: soften
×10 → ×5 at the 100s if late-game purchase spikes feel lurchy after the prestige
fix. Not required.

---

## 4. P0 — The rebalance (ship before launch)

In `js/game.js`:

```js
// prestigeGain(): sqrt → cbrt (8x earnings to double cores, was 4x)
const potential = Math.floor(Math.cbrt(state.totalEarned / 1e9) * prestigeGainMult());

// prestigeMult(): softcap — full value to ×10, sqrt-dampened beyond
function prestigeMult() {
  const raw = 1 + corePer() * (state.coresEarned || 0);
  const CAP = 10;
  return raw <= CAP ? raw : CAP * Math.sqrt(raw / CAP);
}
```

**Save migration** (one line in `normalizeState`): preserve each player's
"deserved at the same lifetime earnings" position by converting once:
`coresEarned_new = round(coresEarned_old ^ (2/3))` (since old = sqrt(E/1e9) ⇒
new = cbrt(E/1e9) = old^(2/3)). Spent core upgrades stay owned. With the game not
yet launched, the cost of skipping migration is small — but it's one line.

**Knock-on checks (all verified in sim):** time warps (`totalWps × hours`) and the
rewarded ×2 boost are unaffected; the Recycler's Edge (×1.5 gain) and Core
Resonance (+8%/core) upgrades keep their value; the UI's core-gain preview needs
no change since it calls `prestigeGain()`.

---

## 5. P0.5 — Tuning guardrails going forward

Re-run before every balance-touching release (takes seconds):

```bash
node scripts/sim-balance.mjs --hours 96                         # lifetime pacing
node scripts/sim-balance.mjs --hours 168 --prestige --root cbrt --softcap 10
```

Watch four metrics [S5]: (1) first-buy time per generator (no dead zones, no
cascades), (2) purchase cadence (should grow gently, never collapse to seconds),
(3) prestige run lengths (each run longer in earnings, similar-or-shorter in feel),
(4) prestige mult at content end (should be ≤ ~×100 when Omega falls).

---

## 6. Features for depth & longer play (ranked by playtime per effort)

1. **Achievements → production ("milk")** · *effort: hours · impact: high.*
   Cookie Clicker's achievement→milk→kitten pipeline turns goals into power
   [S7]. PlugIdle's 44 achievements currently grant nothing. Give +1% production
   each (additive, ×1.44 at full clear) — instantly converts the Goals tab into a
   hunt, compounds gently, and reuses everything that exists. Add a visible
   "GRID BONUS +N%" line so the source is legible.

2. **Challenge runs → automation rewards** · *effort: days · impact: very high.*
   The genre's best content-per-dev-hour [S3]: a challenge is a prestige reset
   with one rule mutated (e.g. "no tap power", "USB-A only", "costs grow 1.25×",
   "surges never spawn"). Each completion permanently unlocks a QoL/automation
   perk (auto-buy cheapest cord, bulk-buy upgrades, start runs with 5 of each
   early cord). 6–8 challenges ≈ 30–90 engaged minutes each, and automation makes
   subsequent prestige runs feel different rather than just faster — Antimatter
   Dimensions' exact blueprint (challenges 1–10 each award an autobuyer) ✅.

3. **Daily streak with 48h forgiveness** · *effort: hours · impact: medium-high.*
   A check-in bonus (e.g. +10% production for 30 min, growing with streak) that
   only resets after 48h absent. Note the verification result: tight offline caps
   and 24h streak resets are flagged as dark patterns by darkpattern.games ❌ —
   the 48h forgiveness window and PlugIdle's already-generous 24–48h offline cap
   are the defensible posture, and consistent with the README's promise.

4. **Golden-surge depth** · *effort: hours · impact: medium.* The surge system is
   PlugIdle's golden cookie [S7]; deepen rather than add: surge *chains* (catching
   one within 60s of the last upgrades the reward tier), a rare "Grid Storm"
   (3 surges at once), and 2–3 new core upgrades that interact with chains. Pairs
   naturally with the existing rewarded-ad "summon surge".

5. **"Grid Ascension" — second prestige layer (v1.2)** · *effort: ~1 sprint ·
   impact: highest total.* Multi-layer resets are what separate 200–500-hour
   incrementals from one-week ones [S10]. Trigger: introduce it when the first
   loop is solved — sources converge on "veteran completes a prestige run in
   ~15 min" [S3]; with the P0 fix that's right around Omega (~111 bot-hours).
   Shape: consume/reset cores (and the softcapped multiplier) for **Grid Points**;
   spend on a small tree of permanently-game-changing nodes (start with
   challenges unlocked, milestone interval 25→20, a 25th cord tier, surge
   autocatch). This also *re-monetizes* late game healthily: time warps stay
   valuable across layers.

6. **New content riding the fixed curve (v1.1+):** with cbrt+softcap, tiers
   beyond Omega become meaningful again — add cords at 1e29/1e31/1e33 and a
   second wave of synergy upgrades; each new tier is now multiple days of
   play instead of seconds.

---

## Appendix A — Verified claims (3-vote adversarial)

| # | Claim | Verdict |
|---|---|---|
| A | AdCap milestone unlocks = cycle-time halvings, stack multiplicatively (×4096 max); its *shop* profit multipliers are the additive system | ✅ CONFIRMED 2/3 (dissent conflated the two systems) |
| B | Cookie Clicker prestige = `floor(cbrt(lifetime/1e12))`, +1%/level gated by heavenly upgrades | ✅ CONFIRMED 3/3 |
| C | AdCap angels = `floor(150·sqrt(lifetime/1e15))`, +2% additive each | ✅ CONFIRMED 3/3 |
| D | Realm Grinder gems: quadratic ladder (≈sqrt growth); +2%/gem | ⚠️ PARTIAL — ladder confirmed, exact % unverified |
| E | GameAnalytics: idle stickiness 18% vs 10.5% hyper-casual (2020 report) | ✅ CONFIRMED 3/3 |
| F | 8–24h offline caps are standard *and respectful* | ⚠️ SPLIT — range confirmed; "respectful" framing refuted (dark-pattern critiques); generous caps + forgiveness windows are the defensible end |

## Appendix B — Key sources

- [S1] Cookie Clicker wiki — Building costs ×1.15 — cookieclicker.fandom.com/wiki/Building
- [S2] AdVenture Capitalist wiki — Angel Investors — adventure-capitalist.fandom.com/wiki/Angel_Investors
- [S3] Antimatter Dimensions wiki — Challenges / Eternity — antimatter-dimensions.fandom.com/wiki/Challenges
- [S4] Pecorella, "The Math of Idle Games" I–III (Kongregate / Game Developer) — gamedeveloper.com/design/the-math-of-idle-games-part-i
- [S5] Pecorella, "Quest for Progress" GDC Europe 2016 + idle game worksheets — gdcvault.com/play/1023876 · archive.org/details/idlegameworksheets
- [S6] IdleFramework mechanics research — github.com/ac2522/IdleFramework/blob/main/IDLE_GAME_MECHANICS_RESEARCH.md
- [S7] Cookie Clicker wiki — Milk / Golden Cookie / Ascension guide — cookieclicker.fandom.com/wiki/Milk
- [S8] Envato Tuts+ — "Numbers Getting Bigger" — code.tutsplus.com/...incremental-games--cms-24023
- [S9] Formal analysis of Cookie Clicker — arxiv.org/pdf/1808.07540
- [S10] GameAnalytics / Game World Observer idle benchmarks; Wikipedia "Incremental game"; GridInc/MindStudios practitioner guides

## Appendix C — Reproduce

```bash
node scripts/sim-balance.mjs --hours 96                                  # live, no prestige
node scripts/sim-balance.mjs --hours 96  --prestige                      # live (collapses @39.5h)
node scripts/sim-balance.mjs --hours 168 --prestige --root cbrt --softcap 10   # recommended
node scripts/sim-balance.mjs --hours 168 --prestige --root log2          # rejected variant
```
