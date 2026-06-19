# App Store Connect Setup Checklist — PlugIdle (iOS)

Walkthrough for the one-time App Store Connect forms for the **iOS launch**
(spec §6.7 of `docs/superpowers/specs/2026-06-18-ios-app-store-launch-design.md`).

The iOS v1.0 ships **in-app purchases only — no ads, no tracking** (rewarded AdMob
is deferred to v1.1). That posture drives every answer below: App Privacy is
"Data Not Collected", there is no ATT prompt, and export compliance is exempt.
The six IAP products reuse the **same product-ID strings as Android** (see
`store/play-console-checklist.md`) so the catalog never diverges.

> **Do these in order.** The Paid Apps agreement (step 3) is a hard prerequisite:
> IAP products will not load in the app or pass review until it is **Active**.

## 1. Register the App ID / bundle id

Apple Developer → Certificates, Identifiers & Profiles → **Identifiers** → **+** →
**App IDs** → **App**.

- Type: **Explicit** App ID.
- Bundle ID: `com.ignyte.plugidle` (must match Capacitor `appId` / the value
  Codemagic produces — see `capacitor.config.json`). Once registered it can't change.
- Capabilities: **In-App Purchase** is on by default for explicit App IDs — leave it.
  Nothing else (no Push, no Sign in with Apple, no ATT entitlement at launch).

## 2. Create the app record

App Store Connect → **Apps** → **+** → **New App**. Platform: **iOS**.

- **Name:** `PlugIdle - Idle Cord Clicker` (mirrors the Play listing; the App Store
  30-char name limit allows it — 28 chars).
- **Primary language:** English (U.S.).
- **Bundle ID:** select the one registered in step 1.
- **SKU:** any internal string, e.g. `plugidle-ios` (not user-visible).
- **User Access:** Full.

## 3. Paid Apps agreement + banking + tax — HARD prerequisite for IAP

Must be **Active** before IAP products load or pass review. Order matters:

1. ASC → **Business** (formerly "Agreements, Tax, and Banking") → **accept the Paid
   Applications Agreement**. Only the **Account Holder / Legal** role can sign it.
2. Complete **tax forms** (they appear only after the agreement is signed). The
   **U.S. tax form** is required regardless of country, plus any home-country forms.
3. Add **Bank account** details and **Contact** info (the agreement stays "Pending"
   until all three are done).
4. The contract flips to **Active** on its own, usually within ~24 hours. **Do not**
   attempt IAP sandbox testing or submission until it's Active — otherwise products
   return empty / "Cannot connect" and review fails.

## 4. Create the six IAP products

ASC → select the app → **Monetization → In-App Purchases** → **+** → pick type →
enter **Reference Name** (internal, ≤64 chars) and **Product ID** (permanent, unique
across the account). **Reuse the exact Android product-ID strings** so the catalog
doesn't diverge (matches spec §6.2 and `js/monetize.js`).

| Product ID (reuse from Android) | Apple type | Display name (shown to users) | Suggested price |
|---|---|---|---|
| `supporter_pack` | **Non-Consumable** | Supporter Pack | $2.99 |
| `boost_production_25` | **Non-Consumable** | Overclock +25% | $1.99 |
| `starter_cores` | **Non-Consumable** | Starter Cores | $0.99–$2.99 |
| `theme_pack_phosphor` | **Non-Consumable** | CRT Theme Pack | $0.99–$2.99 |
| `timewarp_4h` | **Consumable** | Time Warp · 4h | $0.99–$2.99 |
| `timewarp_24h` | **Consumable** | Time Warp · 24h | $0.99–$2.99 |

Types/prices mirror `store/play-console-checklist.md`. Map the USD prices to the
nearest Apple price **tier** per country.

> **`starter_cores` is Non-Consumable** to match the current `js/game.js`
> (`consumable: false`) and `js/monetize.js` (`NON_CONSUMABLE`). Only make it a
> Consumable if you intend it to be re-purchasable — keep Apple's type consistent
> with the `consumable` flag the game passes in `cfg.skus`.

Per product, complete:

- **Availability:** all/relevant countries (mirror the Android rollout).
- **Price Schedule:** an Apple price tier per country (base USD per the table).
- **Localization (English U.S.):** Display Name + Description (these *are* shown to
  users, unlike the reference name).
- **Review information:** a screenshot of the purchase UI in-app + optional notes.
- The first IAP can be **submitted together with the app's first version** — attach
  the products to the version under "In-App Purchases".

> Apple **does not restore consumables** (`timewarp_*`). This matches the existing
> Android behavior (consumed immediately, idempotent local grant — spec §6.2), so
> there is **no game-side change** needed.

## 5. Sandbox tester (for IAP testing via TestFlight)

ASC → **Users and Access → Sandbox → Test Accounts** → **+**. The email **must not**
already be an Apple Account. TestFlight auto-uses a sandbox and never charges real
money, but an explicit sandbox tester gives repeatable IAP runs.

## 6. App Privacy questionnaire

ASC → app → **App Privacy** → Get Started.

- PlugIdle has **no server, no analytics SDK, no AdMob at launch**, and saves are
  **device-local**. Apple-handled IAP payment data is **explicitly exempt** from
  developer declaration. So the honest answer is **"No, we do not collect data from
  this app."** → Save. This yields a **"Data Not Collected"** privacy label.
- **Tracking:** None. There is **no ATT prompt** and **no `NSUserTrackingUsageDescription`**
  (consistent with spec §6.5; AdMob/IDFA deferred to v1.1).
- Keep this accurate: if any first-party crash/diagnostics reporting is ever added it
  must be declared. At launch there is none, so "Data Not Collected" is correct.

## 7. Age rating (2026 questionnaire)

Apple's current system is **4+, 9+, 13+, 16+, 18+** with added questions on In-app
controls, Capabilities, Medical/wellness, and Violent themes. Answers for PlugIdle
(mirror the Play IARC posture in `store/play-console-checklist.md`):

- Violence / sexual content / profanity / horror / controlled substances → **None**.
- Real-money gambling **and** Simulated Gambling → **No** (the "??? / [DATA CORRUPTED]"
  upgrade and "GRID STORM" are flavor, not gambling).
- **In-app controls / Capabilities:** the app **does offer in-app purchases** → answer
  Yes for purchases/digital content; **no** user-to-user communication, **no**
  unrestricted web access, **no** location sharing.
- Medical/wellness, violent themes → **No / None**.
- Expected result: **4+** (with In-App Purchases indicated), consistent with
  Everyone / PEGI 3 on Android.

## 8. Screenshots — required iPhone size

Apple's **current required** iPhone size is **6.9″ = 1320 × 2868 px (portrait)**; the
older **6.7″ = 1290 × 2796 px** is **still accepted**. Upload the 6.9″ set as primary
(6.7″ is fine for this launch); smaller display sizes are auto-scaled.

- Provide **1–10** portrait screenshots; dimensions must be **pixel-exact** (a 1-px
  deviation is rejected).
- No iPad screenshots at launch (universal binary, iPhone-only marketing — spec §4).
- Reuse the portrait **shot list from `store/listing.md`**: (1) Plug tab mid-game,
  (2) power surge / ×7 Frenzy buff bar, (3) Upgrades tab, (4) Recycle Plant prestige
  offer, (5) Achievements tab. (Item 6 "Store section" can wait until the IAP UI is
  final.) Capture on an iPhone or simulator with a mid-game save loaded.

## 9. Listing metadata

Use `store/app-store-listing.md` for the copy. Key fields:

- **Support / Marketing URL:** `https://nickoverstreet.github.io/PlugIdle/`
- **Privacy Policy URL:** `https://nickoverstreet.github.io/PlugIdle/privacy.html`
- **Category:** Primary **Games → Casual** (optional secondary **Simulation**).
- **Copyright / contact:** `nickcoverstreet@gmail.com`.

## 10. App Review notes (pre-empt Guideline 4.2, confirm 3.1.1)

Put this in the version's **App Review Information → Notes**. No login is needed, so
leave the demo account blank and check **"Sign-in not required"**. Guideline 4.2
("Minimum Functionality" / web-wrapper) is the headline risk for a Capacitor/WKWebView
app — emphasize native, offline depth.

> PlugIdle is a fully self-contained native idle/incremental game (not a web-wrapper
> around a website). All gameplay runs **on-device and completely offline** — there is
> no companion website to mirror, no login, and no account. Content is substantial:
> 27 cord generators, 46 upgrades with synergies, 6 challenge runs with permanent
> perks, a prestige/Recycle system, 58 achievements, timed power-surge mini-events,
> and device-local saves with export codes. No browser UI is shown; navigation is via
> the in-app tab bar. To verify offline functionality, enable Airplane Mode — the
> entire game continues to work.
>
> **In-app purchases (Guideline 3.1.1):** All six products sell **digital goods
> consumed entirely within the app** (production boosts, time-skips, a cosmetic theme,
> a supporter tip, a core grant) and are sold **exclusively through Apple In-App
> Purchase**. There are no external purchase links, license keys, or alternative
> payment mechanisms. To test: open the in-game store, tap any product to trigger the
> Apple purchase sheet (sandbox), and the entitlement is granted locally on success.
>
> The app has **no third-party tracking, no ads, and no analytics** at launch (App
> Privacy: Data Not Collected; no ATT prompt). Orientation is portrait-locked;
> export-compliance is exempt (`ITSAppUsesNonExemptEncryption = NO`).

## 11. Export compliance

`scripts/patch-ios-plist.sh` stamps `ITSAppUsesNonExemptEncryption = NO` into
`Info.plist` (spec §6.5), declaring the app exempt and **skipping the per-build
encryption questionnaire** in ASC. No CCATS / year-end self-report needed.

## Sequencing summary

1. Register App ID (step 1) → create app record (step 2).
2. Sign Paid Apps agreement + banking + tax → wait for **Active** (step 3).
3. Create the six IAP products + a sandbox tester (steps 4–5).
4. Fill App Privacy, age rating, screenshots, listing (steps 6–9).
5. Codemagic builds + uploads to **TestFlight**; IAP sandbox test on a real device.
6. Add review notes (step 10), submit the version (with IAPs attached) for review.
