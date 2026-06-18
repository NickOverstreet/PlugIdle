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
#
# Deliberately does NOT add NSUserTrackingUsageDescription / any ATT key — the
# launch build carries no tracking (AdMob/IDFA are deferred to v1.1).
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

# iPad slice of the universal binary — keep it portrait too.
"$PB" -c "Delete :UISupportedInterfaceOrientations~ipad" "$PLIST" 2>/dev/null || true
"$PB" -c "Add :UISupportedInterfaceOrientations~ipad array" "$PLIST"
"$PB" -c "Add :UISupportedInterfaceOrientations~ipad:0 string UIInterfaceOrientationPortrait" "$PLIST"

# Export-compliance exempt — removes the "Missing Compliance" prompt in ASC.
"$PB" -c "Set :ITSAppUsesNonExemptEncryption false" "$PLIST" \
  || "$PB" -c "Add :ITSAppUsesNonExemptEncryption bool false" "$PLIST"

# Sanity-check the bundle id matches capacitor.config.json appId. The value is
# usually the $(PRODUCT_BUNDLE_IDENTIFIER) build-setting placeholder at this
# stage, so only fail on a concrete mismatch.
BID="$("$PB" -c "Print :CFBundleIdentifier" "$PLIST" 2>/dev/null || echo '')"
case "$BID" in
  ''|*'$('*|com.nickoverstreet.plugidle) ;;
  *) echo "patch-ios-plist: unexpected CFBundleIdentifier '$BID'" >&2; exit 1 ;;
esac

echo "patch-ios-plist: done"
