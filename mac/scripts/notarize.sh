#!/bin/bash
# Has Apple notarize a Developer ID build (DEVELOPER_ID=1 ./build-app.sh) or its .dmg, and staples the ticket to it, so
# Gatekeeper opens it without a warning, offline too. The app goes up as a zip, a .dmg as itself (signed here first).
# Apple's answer takes minutes, the first ones of a new account can take days; on a rejection its log says why.
#   scripts/notarize.sh build/release/Orbiterm.app
#   scripts/notarize.sh "build/Orbiterm 0.28.0.dmg"
#   ATALAY_NOTARY_PROFILE   notarytool's keychain profile (default orbiterm-notary:
#                           xcrun notarytool store-credentials orbiterm-notary --apple-id … --team-id 8MPHM92P3S)
#   ATALAY_DEVELOPER_ID     the identity a .dmg is signed with (default: Orbiterm's Developer ID Application)
set -euo pipefail

TARGET="${1:?usage: scripts/notarize.sh <app or dmg>}"
TARGET="${TARGET%/}"
PROFILE="${ATALAY_NOTARY_PROFILE:-orbiterm-notary}"
DEVID=${ATALAY_DEVELOPER_ID:-"Developer ID Application: ATALAY KARAHAN (8MPHM92P3S)"}
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

case "$TARGET" in
  *.app)
    codesign --verify --deep --strict "$TARGET"
    UPLOAD="$WORK/$(basename "$TARGET" .app).zip"
    ditto -c -k --keepParent "$TARGET" "$UPLOAD" ;;
  *.dmg)
    codesign --force --timestamp --sign "$DEVID" "$TARGET"
    UPLOAD="$TARGET" ;;
  *) echo "notarize: $TARGET is neither an .app nor a .dmg" >&2; exit 1 ;;
esac

echo "notarize: sending $(basename "$TARGET") to Apple, waiting for the answer…"
xcrun notarytool submit "$UPLOAD" --keychain-profile "$PROFILE" --wait --output-format json > "$WORK/result.json" || true
read -r ID STATUS < <(python3 -c 'import json, sys
try: r = json.load(open(sys.argv[1]))
except Exception: r = {}
print(r.get("id") or "-", r.get("status") or "none")' "$WORK/result.json")
if [ "$STATUS" != Accepted ]; then
  echo "notarize: Apple's answer for $(basename "$TARGET"): $STATUS" >&2
  cat "$WORK/result.json" >&2
  [ "$ID" = - ] || xcrun notarytool log "$ID" --keychain-profile "$PROFILE" >&2 || true
  exit 1
fi
xcrun stapler staple "$TARGET"
xcrun stapler validate "$TARGET"
case "$TARGET" in
  *.app) codesign --verify --deep --strict "$TARGET"
         spctl -a -vvv -t exec "$TARGET" ;;
  *.dmg) spctl -a -vvv -t open --context context:primary-signature "$TARGET" ;;
esac
echo "notarized $TARGET ($ID)"
