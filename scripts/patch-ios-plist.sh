#!/usr/bin/env bash
#
# Patch the CI-generated iOS Info.plist with the launch settings that are NOT
# expressible in capacitor.config.json. Runs on the Codemagic macOS runner
# after `npx cap add ios`, before the archive (see codemagic.yaml).
#
# Sets:
#   CFBundleDisplayName            = PlugIdle
#   UISupportedInterfaceOrientations = portrait only (matches the Android lock)
#   ITSAppUsesNonExemptEncryption  = NO (export-compliance exempt; skips the
#                                        per-build encryption questionnaire)
#   TARGETED_DEVICE_FAMILY         = 1 (iPhone-only) in project.pbxproj. A
#                                        portrait-locked game can't satisfy
#                                        Apple's "iPad apps must support all
#                                        orientations" rule (upload error 90474),
#                                        and rotating would break the CRT look —
#                                        so ship iPhone-only. Still installs on
#                                        iPad in iPhone-compatibility mode.
#
# Also stamps the AdMob keys now that iOS ships rewarded ads:
#   GADApplicationIdentifier       = Google Mobile Ads app id (REQUIRED — the SDK
#                                    crashes on launch without it)
#   NSUserTrackingUsageDescription = App Tracking Transparency prompt copy
#   SKAdNetworkItems               = ad-attribution networks (Google's primary;
#                                    add Google's full list before production)
#
# The generated ios/ project is ephemeral, so this is idempotent: Set-with-
# Add-fallback handles keys the Capacitor template already seeds, and the
# orientation array is rebuilt from scratch.
set -euo pipefail

PB=/usr/libexec/PlistBuddy
PLIST="${1:-ios/App/App/Info.plist}"

if [[ ! -f "$PLIST" ]]; then
  echo "patch-ios-plist: Info.plist not found at $PLIST" >&2
  echo "  (run after 'npx cap add ios')" >&2
  exit 1
fi

echo "patch-ios-plist: patching $PLIST"

# Display name shown under the icon on the home screen.
"$PB" -c "Set :CFBundleDisplayName PlugIdle" "$PLIST" \
  || "$PB" -c "Add :CFBundleDisplayName string PlugIdle" "$PLIST"

# Portrait-only: drop whatever the template seeded, then recreate with just
# portrait so the result is deterministic regardless of the Capacitor version.
"$PB" -c "Delete :UISupportedInterfaceOrientations" "$PLIST" 2>/dev/null || true
"$PB" -c "Add :UISupportedInterfaceOrientations array" "$PLIST"
"$PB" -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$PLIST"

# iPhone-only: drop any iPad orientation slice and force the device family to
# iPhone in the Xcode project. A portrait-locked app can't meet Apple's iPad
# all-orientations multitasking rule (upload error 90474), and rotating would
# break the CRT design — so don't ship an iPad app at all.
"$PB" -c "Delete :UISupportedInterfaceOrientations~ipad" "$PLIST" 2>/dev/null || true

PBXPROJ="$(dirname "$(dirname "$PLIST")")/App.xcodeproj/project.pbxproj"
sed -i '' 's/TARGETED_DEVICE_FAMILY = "1,2"/TARGETED_DEVICE_FAMILY = "1"/g' "$PBXPROJ"
if ! grep -q 'TARGETED_DEVICE_FAMILY = "1"' "$PBXPROJ"; then
  echo "patch-ios-plist: failed to force iPhone-only; current device family:" >&2
  grep 'TARGETED_DEVICE_FAMILY' "$PBXPROJ" >&2 || true
  exit 1
fi
echo "patch-ios-plist: set iPhone-only (TARGETED_DEVICE_FAMILY=1)"

# Export-compliance exempt — removes the "Missing Compliance" prompt in ASC.
"$PB" -c "Set :ITSAppUsesNonExemptEncryption false" "$PLIST" \
  || "$PB" -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST"

# AdMob (iOS rewarded ads). GADApplicationIdentifier is MANDATORY — the Google
# Mobile Ads SDK aborts on launch without it. TODO(launch): swap the real iOS
# AdMob app id (this is Google's public TEST app id).
"$PB" -c "Set :GADApplicationIdentifier ca-app-pub-3940256099942544~1458002511" "$PLIST" \
  || "$PB" -c "Add :GADApplicationIdentifier string ca-app-pub-3940256099942544~1458002511" "$PLIST"

# App Tracking Transparency: copy shown in the ATT system prompt. No apostrophes
# or quotes — PlistBuddy takes the rest of the line verbatim as the value.
"$PB" -c "Set :NSUserTrackingUsageDescription Allow tracking so PlugIdle can show you more relevant ads. The full game is playable without it." "$PLIST" \
  || "$PB" -c "Add :NSUserTrackingUsageDescription string Allow tracking so PlugIdle can show you more relevant ads. The full game is playable without it." "$PLIST"

# SKAdNetwork (ad attribution). Google's full published list for the Google
# Mobile Ads SDK (developers.google.com/admob/ios/3p-skadnetworks), rebuilt from
# scratch so the result is deterministic. Re-pull that list periodically — Google
# adds networks over time. cstr6suwn9 (Google's own) stays first.
"$PB" -c "Delete :SKAdNetworkItems" "$PLIST" 2>/dev/null || true
"$PB" -c "Add :SKAdNetworkItems array" "$PLIST"
skadnetwork_i=0
for id in \
  cstr6suwn9 4fzdc2evr5 2fnua5tdw4 ydx93a7ass p78axxw29g \
  v72qych5uu ludvb6z3bs cp8zw746q7 3sh42y64q3 c6k4g5qg8m \
  s39g8k73mm wg4vff78zm 3qy4746246 f38h382jlk hs6bdukanm \
  mlmmfzh3r3 v4nxqhlyqp wzmmz9fp6w su67r6k2v3 yclnxrl5pm \
  t38b2kh725 7ug5zh24hu gta9lk7p23 vutu7akeur y5ghdn5j9k \
  v9wttpbfk9 n38lu8286q 47vhws6wlr kbd757ywx3 9t245vhmpl \
  a2p9lx4jpn 22mmun2rn5 44jx6755aq k674qkevps 4468km3ulz \
  2u9pt9hc89 8s468mfl3y klf5c3l5u5 ppxm28t8ap kbmxgpxpgc \
  uw77j35x4d 578prtvx9j 4dzt52r2t5 tl55sbb4fm c3frkrj4fj \
  e5fvkxwrpn 8c4e2ghe7u 3rd42ekr43 97r2b46745 3qcr597p9d; do
  "$PB" -c "Add :SKAdNetworkItems:$skadnetwork_i dict" "$PLIST"
  "$PB" -c "Add :SKAdNetworkItems:$skadnetwork_i:SKAdNetworkIdentifier string ${id}.skadnetwork" "$PLIST"
  skadnetwork_i=$((skadnetwork_i + 1))
done

# Sanity-check the bundle id matches capacitor.config.json appId. The value is
# usually the $(PRODUCT_BUNDLE_IDENTIFIER) build-setting placeholder at this
# stage, so only fail on a concrete mismatch.
BID="$("$PB" -c "Print :CFBundleIdentifier" "$PLIST" 2>/dev/null || echo '')"
case "$BID" in
  ''|*'$('*|com.ignyte.plugidle) ;;
  *) echo "patch-ios-plist: unexpected CFBundleIdentifier '$BID'" >&2; exit 1 ;;
esac

echo "patch-ios-plist: done"
