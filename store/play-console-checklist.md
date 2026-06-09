# Play Console Setup Checklist — PlugIdle

Walkthrough for the one-time Play Console forms (Sprint 2 of `GOAL.md`).
These answers assume v1.0 ships **with rewarded AdMob ads and Play Billing IAP**,
so nothing needs re-review when monetization lands.

## App creation

- App name: `PlugIdle - Idle Cord Clicker`
- Default language: English (United States)
- App or game: **Game** · Free or paid: **Free**
- Package name (fixed forever): `com.nickoverstreet.plugidle`

## Store settings

- Category: **Games → Casual**
- Contact email: nickcoverstreet@gmail.com
- Website: https://nickoverstreet.github.io/pwa-webapp/

## App content forms (Policy → App content)

### Privacy policy
`https://nickoverstreet.github.io/pwa-webapp/privacy.html`

### Ads
- Contains ads: **Yes** (rewarded ads via AdMob).

### App access
- **All functionality is available without special access** (no login, no credentials).

### Content rating (IARC questionnaire)
- Category: Game.
- Violence / sexuality / language / controlled substances: **No** to all.
- Gambling (real money): **No**. Simulated gambling: **No**.
- Interaction: no user communication, no location sharing, no personal-info sharing.
- Digital purchases: **Yes** (in-app purchases). Ads: **Yes**.
- Expected result: **Everyone / PEGI 3** (with "In-Game Purchases" and ads interest-based descriptors).

### Target audience & content
- Target age group: **13 and over** (do NOT select under-13 — that triggers
  Families policy and heavily restricts ads).
- "Appeals to children" question: answer honestly — cartoon socket art; selecting
  13+ with no child-directed marketing is the correct posture.

### News app: **No** · COVID-19 app: **No**

### Data safety form
With rewarded AdMob ads, declare (per Google's published AdMob data-safety guidance):

| Data type | Collected? | Shared? | Purpose |
|---|---|---|---|
| Location → Approximate location | Yes | Yes | Advertising or marketing |
| App activity → App interactions | Yes | Yes | Advertising, Analytics (ad performance) |
| App info & performance → Diagnostics, Crash logs | Yes | Yes | Analytics (SDK health) |
| Device or other IDs (advertising ID) | Yes | Yes | Advertising or marketing |

- Is all collected data encrypted in transit? **Yes**.
- Can users request data deletion? Select **No account is created /
  data not linked to identity**; local saves are deleted by uninstalling.
  (PlugIdle itself collects nothing; all of the above is the AdMob SDK.)
- Check AdMob's current "Play data disclosure" doc when filling this in —
  Google updates it: https://developers.google.com/admob/android/play-data-disclosure

### Government apps / Financial features: **No** to all.

## Monetization setup

- Products → In-app products: create the six SKUs from `GOAL.md`
  (`supporter_pack`, `boost_production_25`, `starter_cores`, `timewarp_4h`,
  `timewarp_24h`, `theme_pack_phosphor`). Suggested launch prices:
  $2.99 supporter / $1.99 boost / $0.99–$2.99 the rest. Tune later.
- License testing (Play Console → Settings → License testing): add your own +
  testers' Gmail addresses so test purchases don't charge real money.

## Release path (new personal accounts)

1. **Internal testing** track first — sanity-check the AAB installs from Play.
2. **Closed testing** track — needs **12+ testers opted in for 14 continuous days**
   before you can apply for production. Share the opt-in URL; testers must click
   it AND install.
3. After 14 days: **Apply for production** (Dashboard prompt), then production
   release with a **staged rollout** (20% → 50% → 100%).

## Signing & build

- Enroll in **Play App Signing** when uploading the first AAB (default; keep it).
- Your upload keystore: create once in Android Studio, **back it up** (password
  manager + offline copy). Losing it is recoverable with Play App Signing but painful.
- Version code must increase with every upload (`android/app/build.gradle`
  → `versionCode` / `versionName`).

## AdMob side (do in parallel)

- Create the AdMob app + 3 rewarded ad units (offline-double, production-boost,
  summon-surge). Use **test ad unit IDs** in all dev builds.
- Link the AdMob app to the Play listing once it's published.
- `app-ads.txt`: must be served at the **root** of the developer website domain.
  GitHub Pages project sites can't serve the domain root — create a
  `NickOverstreet/nickoverstreet.github.io` repo containing just `app-ads.txt`
  (AdMob shows the exact line to use under Apps → app-ads.txt), and set the
  Play listing website to `https://nickoverstreet.github.io/`.
