#!/bin/bash
# AppTuner IPA Re-signing Script
#
# Re-signs the pre-built AppTuner Mobile shell IPA with a user's Apple certificate.
# Requires zsign installed on the VPS. Install: https://github.com/zhlynn/zsign
#
# Usage:
#   bash sign-ipa.sh <cert.p12> <cert-password> <app.mobileprovision> \
#                    <shell.ipa> <app-name> <bundle-id> <output.ipa> [icon.png]
#
# VPS setup required:
#   1. apt-get install zsign  (or build from source)
#   2. Place pre-built AppTuner shell IPA at /opt/apptuner/AppTunerMobile.ipa
#   3. mkdir -p /tmp/apptuner-builds
#   4. Set env vars in relay server: BUILDS_DIR, SHELL_IPA_PATH

set -euo pipefail

CERT_P12="$1"
CERT_PASSWORD="$2"
MOBILE_PROVISION="$3"
SHELL_IPA="$4"
APP_NAME="$5"
BUNDLE_ID="$6"
OUTPUT_IPA="$7"
ICON_PNG="${8:-}"

echo "[sign-ipa] App: $APP_NAME"
echo "[sign-ipa] Bundle ID: $BUNDLE_ID"
echo "[sign-ipa] Shell IPA: $SHELL_IPA"
echo "[sign-ipa] Output: $OUTPUT_IPA"

# Verify inputs exist
if [ ! -f "$CERT_P12" ]; then
  echo "[sign-ipa] ERROR: Certificate file not found: $CERT_P12" >&2
  exit 1
fi

if [ ! -f "$MOBILE_PROVISION" ]; then
  echo "[sign-ipa] ERROR: Provisioning profile not found: $MOBILE_PROVISION" >&2
  exit 1
fi

if [ ! -f "$SHELL_IPA" ]; then
  echo "[sign-ipa] ERROR: Shell IPA not found: $SHELL_IPA" >&2
  exit 1
fi

# Check zsign is installed
if ! command -v zsign &> /dev/null; then
  echo "[sign-ipa] ERROR: zsign not found." >&2
  echo "[sign-ipa] Install with: apt-get install -y zsign" >&2
  echo "[sign-ipa] Or build from source: https://github.com/zhlynn/zsign" >&2
  exit 1
fi

# Build zsign command
ZSIGN_ARGS=(
  -k "$CERT_P12"
  -p "$CERT_PASSWORD"
  -m "$MOBILE_PROVISION"
  -n "$APP_NAME"
  -b "$BUNDLE_ID"
  -o "$OUTPUT_IPA"
)

if [ -n "$ICON_PNG" ] && [ -f "$ICON_PNG" ]; then
  ZSIGN_ARGS+=(-i "$ICON_PNG")
  echo "[sign-ipa] Including custom icon: $ICON_PNG"
fi

ZSIGN_ARGS+=("$SHELL_IPA")

echo "[sign-ipa] Signing..."
zsign "${ZSIGN_ARGS[@]}"

if [ -f "$OUTPUT_IPA" ]; then
  SIZE=$(du -sh "$OUTPUT_IPA" | cut -f1)
  echo "[sign-ipa] Success: $OUTPUT_IPA ($SIZE)"
else
  echo "[sign-ipa] ERROR: zsign completed but output IPA not found" >&2
  exit 1
fi
