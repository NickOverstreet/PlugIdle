/* ============================================================
   PlugIdle — native monetization bridge (Android + iOS).
   Thin facade over @capacitor-community/admob (rewarded ads on Android
   + iOS) and cordova-plugin-purchase (Google Play / Apple App Store
   IAP). On the web, or if the plugins are missing, everything reports
   unavailable and the game renders no monetization UI at all.

   Loaded before js/game.js; the game talks only to window.Monetize.
   ============================================================ */
(() => {
  'use strict';

  const NATIVE = !!(window.Capacitor?.isNativePlatform?.());
  const PLATFORM = window.Capacitor?.getPlatform?.();
  // Rewarded ads on both native platforms (Android + iOS); null on the web.
  const AdMob = NATIVE ? (window.Capacitor?.Plugins?.AdMob || null) : null;

  // TODO(launch): replace with the real AdMob rewarded ad unit IDs before
  // shipping. These are Google's public TEST rewarded units (platform-specific)
  // — always safe in development (never tap real ads in dev builds).
  const REWARDED_AD_UNIT = PLATFORM === 'ios'
    ? 'ca-app-pub-3940256099942544/1712485313'    // iOS test rewarded
    : 'ca-app-pub-3940256099942544/5224354917';   // Android test rewarded

  let cfg = null;          // { skus, onGrant(sku), onPrices(map), notify(msg) }
  let adLoaded = false;
  let adPreparing = false;
  let iapReady = false;

  // The store platform for cordova-plugin-purchase: Apple on iOS, Google Play
  // everywhere else. Resolved at call time so all three IAP functions agree.
  function storePlatform() {
    const P = window.CdvPurchase?.Platform;
    return PLATFORM === 'ios' ? P.APPLE_APPSTORE : P.GOOGLE_PLAY;
  }

  /* ---------- Rewarded ads ---------- */

  async function initAds() {
    if (!AdMob) return;
    // iOS App Tracking Transparency: ask before initializing so AdMob knows the
    // IDFA status. Non-blocking — if declined, ads still serve (non-personalized).
    if (PLATFORM === 'ios' && AdMob.requestTrackingAuthorization) {
      try { await AdMob.requestTrackingAuthorization(); } catch (e) { /* ATT unavailable */ }
    }
    try {
      // UMP consent (required in EEA/UK/CH before ads can serve)
      const info = await AdMob.requestConsentInfo({});
      if (info?.isConsentFormAvailable && info?.status === 'REQUIRED') {
        await AdMob.showConsentForm();
      }
    } catch (e) { /* consent unavailable — AdMob limits ads itself */ }
    try {
      await AdMob.initialize({});
      prepareAd();
    } catch (e) { /* ads stay unavailable */ }
  }

  async function prepareAd() {
    if (!AdMob || adLoaded || adPreparing) return;
    adPreparing = true;
    try {
      await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_UNIT });
      adLoaded = true;
    } catch (e) {
      adLoaded = false;
      setTimeout(() => { adPreparing = false; prepareAd(); }, 60000); // retry later
      return;
    }
    adPreparing = false;
  }

  // Capacitor's plugin proxy may return the listener handle directly or as a
  // promise; normalize so cleanup works either way.
  function listen(ev, fn, bag) {
    const h = AdMob.addListener(ev, fn);
    bag.push(h);
  }
  function unlistenAll(bag) {
    for (const h of bag) {
      if (h?.remove) h.remove();
      else if (h?.then) h.then((x) => x?.remove?.()).catch(() => {});
    }
  }

  // Shows the loaded rewarded ad. Resolves true only if the reward was earned.
  function showRewarded() {
    return new Promise((resolve) => {
      if (!AdMob || !adLoaded) {
        prepareAd();
        resolve(false);
        return;
      }
      let rewarded = false;
      let settled = false;
      const bag = [];
      const finish = () => {
        if (settled) return;
        settled = true;
        unlistenAll(bag);
        adLoaded = false;
        prepareAd();          // preload the next one
        resolve(rewarded);
      };
      listen('onRewardedVideoAdReward', () => { rewarded = true; }, bag);
      listen('onRewardedVideoAdDismissed', finish, bag);
      listen('onRewardedVideoAdFailedToShow', finish, bag);
      AdMob.showRewardVideoAd().catch(finish);
      setTimeout(finish, 120000);   // safety: never leave the caller hanging
    });
  }

  /* ---------- In-app purchases (Google Play / Apple App Store) ---------- */

  function initIap() {
    const CP = window.CdvPurchase;
    if (!CP?.store) return;
    const { store, ProductType } = CP;

    store.register(cfg.skus.map((s) => ({
      id: s.id,
      type: s.consumable ? ProductType.CONSUMABLE : ProductType.NON_CONSUMABLE,
      platform: storePlatform(),
    })));

    // No server, no receipt validator: approve -> finish locally. Entitlement
    // grants are idempotent on the game side, so restores re-firing is fine.
    store.when()
      .approved((tx) => tx.finish())
      .finished((tx) => {
        for (const p of tx.products || []) cfg.onGrant?.(p.id);
      })
      .productUpdated(() => pushPrices());

    store.error((err) => {
      // user-cancelled flows come through here too; keep it quiet unless real
      if (err?.code !== CP.ErrorCode.PAYMENT_CANCELLED) {
        cfg.notify?.('Store error — try again later');
      }
    });

    store.initialize([storePlatform()])
      .then(() => { iapReady = true; pushPrices(); })
      .catch(() => {});
  }

  function pushPrices() {
    const CP = window.CdvPurchase;
    if (!CP?.store || !cfg?.onPrices) return;
    const prices = {};
    for (const s of cfg.skus) {
      const p = CP.store.get(s.id, storePlatform());
      const offer = p?.getOffer?.();
      const amount = offer?.pricingPhases?.[0]?.price;
      if (amount) prices[s.id] = amount;
    }
    cfg.onPrices(prices);
  }

  function buy(sku) {
    const CP = window.CdvPurchase;
    if (!CP?.store || !iapReady) { cfg?.notify?.('Store not ready yet'); return; }
    const p = CP.store.get(sku, storePlatform());
    const offer = p?.getOffer?.();
    if (!offer) { cfg?.notify?.('Product unavailable'); return; }
    offer.order().then((err) => {
      if (err && err.code !== CP.ErrorCode.PAYMENT_CANCELLED) {
        cfg?.notify?.('Purchase failed');
      }
    });
  }

  function restore() {
    const CP = window.CdvPurchase;
    if (!CP?.store || !iapReady) { cfg?.notify?.('Store not ready yet'); return; }
    CP.store.restorePurchases().then(() => cfg?.notify?.('Purchases restored'));
  }

  /* ---------- Public facade ---------- */

  window.Monetize = {
    available: () => NATIVE && (!!AdMob || !!window.CdvPurchase),
    adsAvailable: () => !!AdMob,
    adReady: () => adLoaded,
    iapReady: () => iapReady,
    showRewarded,
    buy,
    restore,
    init(config) {
      if (!NATIVE) return;
      cfg = config;
      initAds();
      // cordova-plugin-purchase loads via Capacitor's cordova bridge;
      // deviceready is sticky, so a late listener still fires.
      if (window.CdvPurchase) initIap();
      else document.addEventListener('deviceready', initIap, { once: true });
    },
  };
})();
