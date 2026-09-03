#!/bin/zsh
set -euo pipefail
cd "/Users/valentinedev/Downloads/apps/Saas for Industries/Naija Jollof/mobile/staff"

echo "=== Naija Jollof Kitchen — Apple device + EAS preview ==="
echo "1) Sign in to Apple when prompted"
echo "2) Prefer Website method to register this iPhone"
echo "3) After devices are registered, the preview iOS build starts"
echo ""

npx eas-cli device:create
echo ""
echo "Device step done. Starting preview iOS build…"
npx eas-cli build --profile preview --platform ios

echo ""
echo "Build command finished."
echo "Copy the Expo install URL above, open it on your iPhone, install, then sign in against prod."
echo "Press Return to close."
read -r _
