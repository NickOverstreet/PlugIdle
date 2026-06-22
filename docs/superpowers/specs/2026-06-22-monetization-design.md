# PlugIdle — Monetization Redesign (Design Spec)

- **Date:** 2026-06-22
- **Status:** Draft design → pending owner sign-off on the open decisions (§3), then implementation plan
- **Owner:** Nick Overstreet (solo dev, Windows; no Mac)
- **Source of intent:** `PlugIdle Monetization Plan.txt` (owner-supplied), reconciled against the live code.

## 1. Summary

Restructure PlugIdle's in-app purchases and rewarded ads around three ideas:

1. **A single, mutually-exclusive "production multiplier" ladder** — Overclock **1.5×** ($0.49) → **2×** ($0.99) → **5×** ($1.99) → **10×** ($3.99). You only ever benefit from the highest rung you own, and upgrading charges **only the price difference** ("Upgrade to 10× for $3.50" when you own Overclock), never the full price again.
2. **A clear stacking model** — the ladder does **not** stack with itself, but the **Supporter Pack boost** and **rewarded-ad boosts** stack on top of whatever ladder rung you own (and on top of the existing prestige/core/achievement multipliers).
3. **A rewarded-ad boost surface** — a small opt-in "**×2 production · 5 min**" chip that appears 10 minutes into a session, leads to a rewarded ad, and then hides for a 10-minute cooldown; plus a richer "**×4 production · 10 min**" option. No banners, no interstitials, **no adult-themed ads**.

All other products keep their current behavior and are simply **repriced**: Supporter Pack $0.99, Time Warp 4h $0.49 / 24h $0.89, Starter Cores $0.59, CRT Theme Pack $0.99.

This touches `js/game.js` (catalog, grants, production chain, store UI, ad chip), `js/monetize.js` (SKU registration, ad content-rating), `index.html` / `css/style.css` (chip + ladder UI), and the store/launch docs. The web PWA stays **100% monetization-free** (all of this is gated behind `Monetize.available()`, which is false on the web). The **rewarded-ad chip is Android-only at launch**; iOS keeps shipping IAP-only with ads deferred to v1.1 (per the iOS launch spec) — the IAP ladder and repricing apply to **both** stores.

## 2. Current state (facts grounding this design)

All line numbers are `js/game.js` unless noted; verified by code read on 2026-06-22.

- **Catalog** — six products in `IAP_PRODUCTS` (2244–2251). Prices are **not** in code; they come live from the store plugin (`pushPrices()`, `js/monetize.js:140-151`) and render as `iapPrices[id] || '···'` (2369).
- **Overclock** is the SKU `boost_production_25` (non-consumable). Its only effect is `iapProdMult()` → **×1.25** (543-544), applied once in the production chain `totalWps()` (555-560):
  `sum × prestigeMult() × PROD_MULT(1.6) × coreProdMult() × iapProdMult() × achMult() × buffMult('prod') × challengePenalty × bossWattsMult()`.
- **Supporter Pack** (`supporter_pack`, non-consumable) = a "💖 SUPPORTER" store header (2345) + a **daily-claimable ×2 production boost for 10 min** (`onBonusClick('claim')` → `grantBoost`, 2381-2386). It is **not** a permanent multiplier.
- **Time Warp 4h/24h** (consumable) = `grantTimewarp(h)` (2285-2292): instantly credits `totalWps() × h × 3600` watts — **no** offline-efficiency penalty and **no** cap (unlike real `applyOffline()`), Grid only (does not advance Voltlands).
- **Starter Cores** (non-consumable) = `state.cores += 3; state.coresEarned += 3` (2306-2309).
- **CRT Theme Pack** (`theme_pack_phosphor`, non-consumable) = unlock gate for the Amber/Ice/Vapor theme picker; a full theme system already exists (`THEMES` 2322-2327, `applyTheme()` 2317-2321, palettes `css/style.css:350-369`).
- **Temporary boosts** are persisted-and-resynced: `state.boostUntil` (saved at 1626) → `grantBoost()` (2268-2276, using the module constant `BOOST_MS = 10*60000` at 2253) → `syncBoostBuff()` (2277-2283) pushes a `{kind:'prod', mult:2, until, src:'boost'}` buff; `buffMult('prod')` (522-527) multiplies all live `kind:'prod'` buffs into production. Streak uses the same shape (`streakUntil`).
- **Ads** — `@capacitor-community/admob`, **Android-only** gate (`AdMob = (NATIVE && PLATFORM==='android') ? … : null`, `js/monetize.js:13-16`; `adsAvailable() => !!AdMob`, :176). `showRewarded()` (:80-104) returns `Promise<boolean>` (true only if reward earned), using **one** rewarded unit (currently Google's **test** unit, `TODO(launch)` at :21). Existing placements: welcome-back **double offline** (2214-2236, uncapped), store **×2 BOOST 10m** (`boost`, cap 3/day), store **SUMMON SURGE** (`surge`, cap 2/day); daily caps in `AD_LIMITS = {boost:3, surge:2}` (2252) tracked in `state.adUses` per `localDay()`.
- **Grant routing** — `grantPurchase(sku)` (2296-2315): consumables call `grantTimewarp` and return (never recorded owned); non-consumables are **idempotent** (`if (state.iap[sku]) return; state.iap[sku] = true`). Ownership lives in the **local save** `state.iap` (345, saved 1624); there is **no server / no receipt validation** (`approved → finish` locally, `js/monetize.js:122`). `restorePurchases()` re-fires owned non-consumables through the same idempotent grant path.
- **Store UI** — `renderStore()` (2340-2378) maps `IAP_PRODUCTS` into `#iaplist`; non-consumables flip to a disabled "✓ OWNED" row once `state.iap[id]` is set. One delegated click handler on `#storeBlock` routes `data-iap` → `Monetize.buy(sku)` and `data-bonus` → `onBonusClick(kind)` (2550-2556).
- **Docs that restate the catalog/prices** (must stay in sync): `GOAL.md` (model 24-34, catalog 75-83, ad placements 67-72), `store/play-console-checklist.md` (SKUs+prices 67-71, ads/data-safety), `store/app-store-connect-checklist.md` (IAP table+prices 58-65), `store/app-store-listing.md`, `README.md`, `CLAUDE.md`, and `android/app/src/main/AndroidManifest.xml` (AdMob app-id `TODO(launch)`).

## 3. Open decisions (recommended answers in **bold** — confirm or override)

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | How to charge "only the difference" on the stores | (a) **Upgrade-SKU matrix** — 10 non-consumable SKUs, one-tap jumps; (b) stepwise — 7 SKUs but multi-tap to skip rungs; (c) drop difference-pricing | **(a)** — it's the only store-compliant way to deliver the one-tap "Upgrade to 10× for $X" UX you described (see §6). |
| D2 | Does Supporter Pack gain a **permanent** production bonus? | (a) **No** — keep badge + daily ×2 claim (already stacks); (b) add a small permanent stacking ×, e.g. +25% | **(a)** — "stacks with other production boosts" is already satisfied by its daily ×2 buff stacking on the ladder; a permanent stacking bonus would cannibalize the ladder. |
| D3 | Can the two ad boosts (×2/5m and ×4/10m) be active **at once**? | (a) **One at a time** — chip hidden while a boost runs; (b) allow stacking ×2·×4 | **(a)** — simpler, prevents ad-spam stacking; they still stack with the ladder and Supporter boost. |
| D4 | "30-second" vs "longer" ad copy | AdMob does **not** let the app pick ad length | **Differentiate by reward, not by promised seconds.** Copy: "Watch an ad → ×2 · 5 min" / "→ ×4 · 10 min"; optionally a longer cooldown after the ×4 claim. |
| D5 | Keep the old in-store "×2 BOOST 10m" ad button? | (a) **Retire it**, fold into the chip; (b) keep both | **(a)** — one boost surface avoids confusing duplicate ×2 offers. Keep SUMMON SURGE + welcome-back double. |
| D6 | Renumber/rename the Overclock SKU id | `boost_production_25` literally encodes "+25%" (now wrong) | **Use clean new ladder ids** + a back-compat grant mapping `boost_production_25 → 1.5×` (app is pre-launch; no production owners). |

## 4. Goals / Non-goals

**Goals**
- A mutually-exclusive permanent production ladder (1.5× / 2× / 5× / 10×) with **difference-only** upgrade pricing.
- A precise, documented **stacking model** (ladder × Supporter boost × ad boost × existing game multipliers).
- An opt-in **rewarded-ad boost chip** with the 10-min-into-session appearance and 10-min post-watch cooldown, plus a richer ×4/10-min option, **no adult-themed ads**.
- Repriced catalog exactly per the owner plan.
- Web stays monetization-free; iOS stays IAP-only at launch (ad chip Android-only); restore works across devices for all permanent entitlements.

**Non-goals (this change)**
- Server-side receipt validation (still local-only; out of scope, noted as a risk).
- Rewarded ads on iOS (still deferred to v1.1 per the iOS launch spec).
- Changing Time Warp's grant math, Starter Cores' amount, or the theme system — only **reprice** those.
- New themes or new cosmetic packs.
- Voltlands-specific monetization (the ladder multiplies Grid watts only; Voltlands ZPS has its own chain and is unchanged).

## 5. The new catalog (15 SKUs)

> **Production ladder** (all **non-consumable**, so restore reconstructs the highest tier — see §10). The owner sets each price in both consoles; the app shows the live store price, it never hardcodes currency.

| SKU id | Reaches tier | Price (USD) | Offered when current tier is |
|---|---|---|---|
| `prodboost_overclock` | 1.5× | **$0.49** | none |
| `prodboost_2x` | 2× | **$0.99** | none |
| `prodboost_5x` | 5× | **$1.99** | none |
| `prodboost_10x` | 10× | **$3.99** | none |
| `prodboost_up_oc_2x` | 2× | **$0.50** | 1.5× |
| `prodboost_up_oc_5x` | 5× | **$1.50** | 1.5× |
| `prodboost_up_oc_10x` | 10× | **$3.50** | 1.5× |
| `prodboost_up_2x_5x` | 5× | **$1.00** | 2× |
| `prodboost_up_2x_10x` | 10× | **$3.00** | 2× |
| `prodboost_up_5x_10x` | 10× | **$2.00** | 5× |

Every delta equals `target_full_price − current_full_price` (0.99−0.49 = 0.50, 3.99−0.49 = 3.50, 1.99−0.99 = 1.00, 3.99−1.99 = 2.00, …), so total spend to reach any tier is identical no matter the upgrade path. *(The plan's illustrative "Upgrade to 10× for $2.98" was an arithmetic slip — the correct 2×→10× delta is $3.00 and 1.5×→10× is $3.50; this spec uses the exact differences.)*

> **Other products** (behavior unchanged; **reprice only**):

| SKU id | Type | Price | Effect (unchanged) |
|---|---|---|---|
| `supporter_pack` | non-consumable | **$0.99** | Supporter badge + daily-claimable ×2 / 10-min boost (stacks — §7) |
| `starter_cores` | non-consumable | **$0.59** | +3 Prestige Cores ◆ |
| `timewarp_4h` | consumable | **$0.49** | Instantly earn 4h of production |
| `timewarp_24h` | consumable | **$0.89** | Instantly earn 24h of production |
| `theme_pack_phosphor` | non-consumable | **$0.99** | Amber / Ice / Vapor CRT themes |

**Removed:** `boost_production_25` leaves the active catalog (its role is now `prodboost_overclock` at 1.5×). A back-compat grant keeps any internal-test owner whole (§6, §10).

## 6. Production ladder design

### 6.1 In-game model

Store one scalar, **`state.iap.prodTier`** ∈ {1, 1.5, 2, 5, 10} (absent ⇒ 1). A new helper replaces `iapProdMult()`:

```js
// Permanent production ladder (mutually exclusive; only the highest owned tier applies).
function permTierMult() { return (state.iap && state.iap.prodTier) || 1; }
```

Swap it into the production chain at `totalWps()` (559), in the same slot Overclock used:

```js
return sum * prestigeMult() * PROD_MULT * coreProdMult()
           * permTierMult()            // was iapProdMult()
           * achMult() * buffMult('prod') * challengePenalty * bossWattsMult();
```

Mutual-exclusivity is automatic: a single scalar can hold only one value. Tap power inherits the ladder **proportionally** through the existing `fromWps = tapWpsFrac() × totalWps()` share (600) — exactly how Overclock behaved; the flat tap component is intentionally untouched.

### 6.2 Granting & restore

Map every ladder SKU to the tier it confers and take the max (so any purchase/restore order converges to the highest owned), inside `grantPurchase()` (2296):

```js
const LADDER_TIER = {
  prodboost_overclock: 1.5, prodboost_2x: 2, prodboost_5x: 5, prodboost_10x: 10,
  prodboost_up_oc_2x: 2,  prodboost_up_oc_5x: 5,  prodboost_up_oc_10x: 10,
  prodboost_up_2x_5x: 5,  prodboost_up_2x_10x: 10, prodboost_up_5x_10x: 10,
  boost_production_25: 1.5,   // back-compat: legacy Overclock +25% -> new Overclock 1.5x
};
// in grantPurchase(sku), before the generic non-consumable branch:
if (LADDER_TIER[sku]) {
  state.iap[sku] = true;                                   // owned flag (idempotent / restore)
  state.iap.prodTier = Math.max(state.iap.prodTier || 1, LADDER_TIER[sku]);
  save(); renderStore(); renderAll();
  return;
}
```

**Safety guard (never double-charge).** `renderProdLadder()` only ever offers strictly-higher tiers, but as belt-and-suspenders against a stale render or race, guard the purchase itself: block `Monetize.buy(sku)` **and** no-op the grant when `LADDER_TIER[sku] <= (state.iap.prodTier || 1)`, surfacing a "you already own a higher tier" toast. Without this, a mis-rendered row could let a player pay full price for an equal/lower tier and receive nothing — a refund/chargeback vector, since there is no server-side validation.

Because the SKUs are **non-consumable**, `restorePurchases()` re-fires every ladder SKU the user ever bought; `Math.max` rebuilds the correct `prodTier` on a fresh device. No server needed; consistent with the existing local-entitlement model.

### 6.3 Store UI — `renderProdLadder()`

The ladder is rendered **specially** (which SKUs to show depends on the current tier), not via the generic `IAP_PRODUCTS` row map. Add a `group:'ladder'` flag to the ladder entries so `renderStore()` skips them in the generic loop and calls `renderProdLadder()` for that block.

Current tier → the SKU to offer for each higher target:

| Current | → 2× | → 5× | → 10× |
|---|---|---|---|
| none (1×) | `prodboost_2x` | `prodboost_5x` | `prodboost_10x` |
| 1.5× | `prodboost_up_oc_2x` | `prodboost_up_oc_5x` | `prodboost_up_oc_10x` |
| 2× | — | `prodboost_up_2x_5x` | `prodboost_up_2x_10x` |
| 5× | — | — | `prodboost_up_5x_10x` |

(At tier 1 the fourth buy row — **Overclock 1.5×** — maps to `prodboost_overclock`; it's omitted from the table above, which only enumerates the 2×/5×/10× targets.)

Rendering rules:
- **Tier 1 (none):** show all four rungs as buy rows (1.5× / 2× / 5× / 10×), each priced from `iapPrices[sku]`.
- **Tier 1.5×/2×/5×:** show a status line ("⚡ Active: N× production") + one "**Upgrade to X×**" row per reachable higher tier, each wired (via `data-iap`) to the mapped upgrade SKU, showing the store's difference price.
- **Tier 10×:** show "✓ MAXED — 10× production" (no rows).

The existing delegated `data-iap` → `Monetize.buy()` handler (2554) needs no change; only the row-building differs.

### 6.4 Why a 10-SKU matrix (the store constraint)

Neither App Store nor Google Play can natively charge "the difference" between two separate non-consumables — there's no built-in upgrade/credit for non-subscription IAP. The only way to deliver one-tap, difference-priced upgrades is a **matrix of upgrade SKUs**, each priced at the delta, surfaced based on what the player already owns. This is operationally heavier (10 ladder SKUs to create/price in **each** console) but it's the honest cost of the UX in the plan. Alternatives are in §13.

## 7. Stacking model (the rule that governs all multipliers)

Monetization multipliers compose with the existing game multipliers as **independent factors** in `totalWps()`:

```
production = base
           × prestigeMult × PROD_MULT × coreProdMult × achMult × challengePenalty × bossWattsMult   (existing game)
           × permTierMult                       ← LADDER: exactly one of {1, 1.5, 2, 5, 10}
           × buffMult('prod')                   ← TIMED BUFFS, all multiply together:
                                                    • Supporter daily ×2 (src:'boost')   — stacks
                                                    • Ad boost ×2 or ×4 (src:'adboost')  — stacks
                                                    • Surge frenzy ×7, streak ×N         — unchanged
```

- **Ladder vs. ladder:** mutually exclusive — a single scalar, only the highest applies. ✅ ("not mutually stackable")
- **Supporter boost:** a separate `kind:'prod'` buff → multiplies on top of the ladder. ✅ ("stacks with other production boosts")
- **Ad boosts:** separate `kind:'prod'` buffs → multiply on top of the ladder and Supporter boost. ✅ ("stackable with other purchased production boosts")
- **Two ad boosts at once:** disallowed (D3) — the chip is hidden while an ad boost is live, so you can't run ×2 and ×4 simultaneously.

Worked example (all opt-in): own **10×**, claim Supporter **×2**, watch the **×4** ad → during the overlap, production = base game multipliers × **10 × 2 × 4 = ×80**. The 10× is permanent; the ×2/×4 expire. Tap power scales proportionally via `fromWps`.

## 8. Rewarded-ad boost chip (Android-only at launch)

### 8.1 Behavior

A small, dismissible **chip** (e.g. a fixed-position pill near the header) labeled **"📺 ×2 production · 5 min"**:

- **Visible only when:** `Monetize.adsAvailable()` (Android native) **AND** `now ≥ adChipReadyAt` **AND** no ad boost currently active.
- **First appearance:** 10 minutes into the session. At boot set `adChipReadyAt = sessionStart + 10*60000` (a **session var**, not persisted — a fresh launch always re-arms the 10-min timer, matching "show up 10 mins after starting the game").
- **Tap →** a small chooser (reuse the existing modal) with two options:
  - **"📺 Watch ad → ×2 production · 5 min"**
  - **"📺 Watch ad → ×4 production · 10 min"**
- **On a completed ad** (`await Monetize.showRewarded() === true`): grant the chosen boost, hide the chip, and set `adChipReadyAt = Date.now() + AD_CHIP_COOLDOWN_MS`. Canonical cooldown is a flat **`AD_CHIP_COOLDOWN_MS = 10 min`** for both tiers (D4); the optional longer ×4 cooldown floated in §8.5/§15 Q3, *if adopted*, supersedes this for the ×4 path only. On a skipped/failed ad: no grant, chip stays.
- While the granted boost is live the chip stays hidden; with the flat 10-min cooldown, since ×2 lasts 5 min and ×4 lasts 10 min (≤ the cooldown), the chip naturally reappears ~10 min after the watch.

### 8.2 Grant (persisted, restart-safe)

Reuse the `boostUntil`/`syncBoostBuff` pattern with a generalized, **persisted** ad-boost so closing the app can't eat a watched reward:

```js
// new persisted state (defaults near 349; add to the save snapshot near 1626)
adBoostUntil: 0,
adBoostMult: 1,

function grantAdBoost(mult, minutes) {
  state.adBoostUntil = Date.now() + minutes * 60000;
  state.adBoostMult = mult;
  syncAdBoostBuff(); save(); renderAll();
}
function syncAdBoostBuff() {                       // re-derive the transient buff on boot/claim
  buffs = buffs.filter(b => b.src !== 'adboost');
  if (state.adBoostUntil > Date.now()) {
    buffs.push({ kind:'prod', mult: state.adBoostMult, until: state.adBoostUntil,
                 icon:'📺', label:`AD ×${state.adBoostMult}`, src:'adboost' });
  }
}
```

Call `syncAdBoostBuff()` on boot (next to the existing `syncBoostBuff()` resync) so a restart re-arms the live boost. Because it's a `kind:'prod'` buff, it flows through `buffMult('prod')` automatically — no `totalWps()` change beyond §6's `permTierMult` swap. (D3: one ad boost at a time — `grantAdBoost` overwrites rather than adds.)

### 8.3 No adult-themed ads

Constrain the ad request to general-audience content:

- In AdMob init (`js/monetize.js` `initAds()`, which today calls `AdMob.initialize({})`), set the **max ad content rating to `'G'`** (General audiences) — the `@capacitor-community/admob` `maxAdContentRating` option (values G/PG/T/MA); verify the exact name against the installed plugin version. `'G'` is the most restrictive; `'PG'` is the loosest acceptable; this excludes Teen/Mature/adult creatives. Note AdMob's content rating is **its own system, independent of the App Store / Play age rating** — don't conflate the two.
- The request flag alone isn't the whole story: also configure the **AdMob console** app-level *max ad content rating* **and** the *sensitive-category / blocked ad content* settings so adult/suggestive creatives are filtered server-side regardless of the request. (Don't set child-directed flags like `tagForChildDirectedTreatment` — the app is 13+/Everyone, not under-13.)
- Rewarded-only is already the case (no banner/interstitial code exists), and the reward is granted **only** on a completed view (`showRewarded() === true`, i.e. the reward/`onUserEarnedReward` callback) — as rewarded-ad policy requires.

### 8.4 Reconciling with existing placements (D5)

**Retire** the in-store "📺 ×2 BOOST 10m" button (its job moves to the chip). **Keep** "📺 SUMMON SURGE" (cap 2/day) and the welcome-back "double offline" placement. The chip is gated by the **time-based cooldown**, not the daily `AD_LIMITS` cap; remove the `boost` entry from `AD_LIMITS` (keep `surge`). Optionally retain a generous daily safety cap on the chip if desired.

### 8.5 Ad-length caveat (D4)

AdMob decides rewarded-ad length; the app **cannot** request "a 30-second ad" vs "a longer ad." Both chip options therefore show the **same** rewarded ad type; the difference is the **reward** (×2/5 min vs ×4/10 min), not guaranteed ad duration. Copy should not promise an exact number of seconds. If the ×4 should "cost more of the player's time," the only app-controlled lever is a **longer cooldown** after the ×4 claim (e.g. 20 min) — proposed as optional.

## 9. Platform applicability

| Feature | Web PWA | Android | iOS (launch) |
|---|---|---|---|
| Production ladder + all IAP repricing | hidden | ✅ | ✅ (IAP works on both) |
| Supporter / Starter Cores / Time Warp / Theme | hidden | ✅ | ✅ |
| Rewarded-ad chip (×2/×4 boosts) | hidden | ✅ | ❌ deferred to v1.1 (AdMob excluded from iOS build; `adsAvailable()` false) |

Everything remains behind `Monetize.available()` (false on web). The iOS launch posture (IAP-only, no ATT/IDFA) is unchanged — the chip simply never renders on iOS.

## 10. Persistence & restore

- **`state.iap.prodTier`** lives in the already-saved `state.iap` map (1624) — no new save plumbing for the ladder. Ladder SKUs are **non-consumable** ⇒ `restorePurchases()` re-fires them and `Math.max` rebuilds the tier on a new device.
- **`state.adBoostUntil` / `state.adBoostMult`** are new persisted fields (add to defaults and the save snapshot near 1626); `syncAdBoostBuff()` re-derives the live buff on boot.
- **`adChipReadyAt` / `sessionStart`** are **session-only** (not saved) — a fresh launch re-arms the 10-min first-appearance.
- **Time Warps** stay consumable (not restored — fire-and-forget, as today).
- **No receipt validation** (unchanged). Acceptable for a casual game; flagged as a risk (§14).

## 11. Store-console setup (both stores)

Create/lay out **all 15 SKUs** with the §5 prices. Key per-store notes:

- **Google Play:** supports **custom prices**, so every price in the §5 tables can be set exactly — the full distinct set is $0.49, $0.50, $0.59, $0.89, $0.99, $1.00, $1.50, $1.99, $2.00, $3.00, $3.50, $3.99. Ladder SKUs = **in-app products (managed, non-consumable)**; Time Warps = **consumable**. Each owned/restored purchase must be **acknowledged within 3 days** or Play auto-refunds it — confirm the existing `approved → finish()` path (which acknowledges) runs for **restored** ladder SKUs, not just fresh buys.
- **Apple App Store:** prices come from Apple's **price-point list**. Apple's 2023 expansion (900 points) covers the sub-dollar base prices ($0.49 / $0.59 / $0.89) **and** the round-dollar deltas here ($0.50 / $1.00 / $1.50 / $2.00 / $3.00 / $3.50), so in practice these are expected to land **exactly**. Still **validate each delta** against the current list; if a non-standard delta is ever missing, snap to the nearest point or request an expanded/custom price point in App Store Connect. (A minor wrinkle for this matrix, not a blocker — none of the current deltas are expected to need snapping.)
- **AdMob (Android):** swap the `TODO(launch)` real **rewarded unit** (`js/monetize.js:21`) and **app id** (`AndroidManifest.xml:16`); set the account **content rating filter to G**; the 3 documented rewarded units collapse to the placements actually used (chip + surge + offline-double can share one unit — the code already uses one).

## 12. Docs & code that must stay in sync

Single-source the catalog facts; update **all** of these together:

- **Code:** `js/game.js` (`IAP_PRODUCTS`, `LADDER_TIER`/`grantPurchase`, `permTierMult` in `totalWps`, `grantAdBoost`/`syncAdBoostBuff`, `renderProdLadder`/`renderStore`, ad-chip wiring, new defaults+save fields, `Monetize.init` SKU list); `js/monetize.js` (register ladder SKUs, `maxAdContentRating`); `index.html` (`#adChip`, ladder container); `css/style.css` (chip + ladder rows).
- **Docs:** `GOAL.md` (model 24-34, catalog 75-83, ad placements 67-72), `store/play-console-checklist.md` (SKU list + new prices), `store/app-store-connect-checklist.md` (IAP table + new prices + the 15 SKUs; note ad chip is iOS-v1.1), `store/app-store-listing.md`, `README.md` (content/monetization lines), `CLAUDE.md` (the "six product-ID strings" note now describes the ladder + repriced catalog). `AndroidManifest.xml` AdMob app-id `TODO(launch)`.

## 13. File-by-file implementation outline

1. **`js/game.js` — catalog.** Remove `boost_production_25` from `IAP_PRODUCTS`; reprice nothing in-code (prices are store-driven). Add a `LADDER_PRODUCTS` set (10 ids, `consumable:false`, `group:'ladder'`) registered with the store but rendered via `renderProdLadder()`.
2. **`js/game.js` — production chain.** Replace `iapProdMult()` with `permTierMult()`; delete `iapProdMult`.
3. **`js/game.js` — grants.** Add `LADDER_TIER` + the ladder branch (incl. `boost_production_25` back-compat) to `grantPurchase`.
4. **`js/game.js` — ad boost.** Add `adBoostUntil`/`adBoostMult` defaults + save fields; `grantAdBoost`, `syncAdBoostBuff`; call the resync on boot.
5. **`js/game.js` — store UI.** `renderProdLadder()` (§6.3); have `renderStore()` skip `group:'ladder'` rows and render the ladder block; retire the in-store `boost` ad button (D5); drop `boost` from `AD_LIMITS`.
6. **`js/game.js` + `index.html` + `css` — chip.** `#adChip` element; visibility logic (`adsAvailable && now≥adChipReadyAt && !adBoostActive`); chooser modal; cooldown bookkeeping (`sessionStart`, `adChipReadyAt`).
7. **`js/monetize.js`.** Ensure all 15 SKUs are registered (they flow from the game's `skus` list); set `maxAdContentRating:'G'` in `initAds()`.
8. **Docs.** Per §12.
9. **Verify:** `node --check js/game.js`; `node scripts/dev-smoke.mjs` (extend it with: ladder max-tier resolution across out-of-order grants, back-compat `boost_production_25→1.5`, `permTierMult` in `totalWps`, ad-boost persist/resync, chip cooldown gating). Manual: store renders correct ladder rows per tier; web shows no monetization UI.

## 14. Risks, constraints & alternatives

- **iOS price snapping (minor):** the current round-dollar deltas are expected to be valid Apple price points (§11), so exact difference-pricing should hold on iOS; the residual risk is only a future *non-standard* delta with no matching point — snap to nearest or request a custom point then. *Fallback if it ever bites:* full-price tiers on iOS only — but that diverges from the plan.
- **SKU count / operational load:** 15 SKUs (10 ladder) to create, price, and localize in two consoles. *Alternative A (lean, 7 SKUs):* stepwise upgrades only (1.5→2→5→10) — fewer SKUs, deltas telescope to the same totals, but skipping rungs needs multiple taps. *Alternative B:* sell 4 full-price tiers with no difference-pricing — simplest (4 SKUs) but explicitly rejected by the plan ("not stay the full price").
- **No receipt validation:** entitlements are local; a determined user could edit `localStorage` to fake a tier. Same exposure as today; acceptable for a casual single-player idle game. A server validator would slot into `approved((tx)=>tx.finish())` (`js/monetize.js:122`) if ever warranted.
- **Ad length not app-controllable (D4):** the "30s vs longer" framing can't be guaranteed; differentiate by reward/cooldown instead.
- **Balance:** stacked opt-in multipliers can reach ×80 transiently (§7). That's intentional for idle game-feel and time-limited except the permanent ladder; revisit core/prestige tuning only if it trivializes progression.
- **Back-compat:** any internal-test owner of `boost_production_25` is mapped to 1.5× on next grant/restore; verify with a seeded save in the smoke test.

## 15. Open questions for the owner

1. Confirm the §3 decisions (esp. **D1** the SKU-matrix approach, **D2** Supporter Pack staying daily-claim, **D5** retiring the old in-store boost button).
2. iOS difference-pricing: accept nearest-point snapping, or tune base prices so deltas land exactly? (§11/§14)
3. Should the **×4/10-min** ad claim impose a longer cooldown than the ×2 (e.g. 20 min), or keep a flat 10 min for both? (§8.5)
4. Keep Time Warp Grid-only, or should it also advance Voltlands now that the catalog is being revisited? (out of scope by default)
5. **Explicit deviation from the plan:** the plan asks the chip to "lead to a 30 second ad," but AdMob does not let the app control ad length (§8.5). The spec drops the 30-second promise and differentiates the two options by **reward** (and optionally cooldown) instead. Confirm this is acceptable.
