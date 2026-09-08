#!/bin/zsh
# Fix local Android build for Naija Jollof Kitchen (JDK 17 + cmdline-tools + no-spaces path).
set -euo pipefail

STAFF_REAL="/Users/valentinedev/Downloads/apps/Saas for Industries/Naija Jollof/mobile/staff"
LINK_ROOT="/Users/valentinedev/Downloads/apps/naija-jollof"
SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
JAVA17="/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home"

echo "==> JDK 17"
if [[ ! -x "$JAVA17/bin/java" ]]; then
  echo "Install Zulu/Temurin JDK 17 first, then re-run."
  exit 1
fi
export JAVA_HOME="$JAVA17"
export PATH="$JAVA_HOME/bin:$(dirname "$(which node)"):$PATH"

echo "==> Symlink without spaces (CMake breaks on 'Saas for Industries')"
mkdir -p "$(dirname "$LINK_ROOT")"
ln -sfn "/Users/valentinedev/Downloads/apps/Saas for Industries/Naija Jollof" "$LINK_ROOT"
STAFF="$LINK_ROOT/mobile/staff"
cd "$STAFF"

echo "==> Pin Gradle to JDK 17"
if ! grep -q 'org.gradle.java.home=' android/gradle.properties 2>/dev/null; then
  printf '\norg.gradle.java.home=%s\n' "$JAVA17" >> android/gradle.properties
fi

echo "==> Android SDK command-line tools (fixes CXX5304)"
if [[ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]]; then
  echo "cmdline-tools missing. Install via Android Studio:"
  echo "  Settings → Languages & Frameworks → Android SDK → SDK Tools"
  echo "  ☑ Android SDK Command-line Tools (latest)"
  echo "  ☑ CMake"
  echo "  ☑ NDK (Side by side) 27.1.12297006"
  echo ""
  echo "Or after Studio installs them, re-run this script."
  if [[ -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]]; then
    yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" \
      "cmdline-tools;latest" "cmake;3.22.1" "ndk;27.1.12297006" || true
  fi
else
  yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" \
    "cmdline-tools;latest" "cmake;3.22.1" "ndk;27.1.12297006" || true
fi

echo "==> Stop Gradle + clean CMake caches"
(
  cd android
  ./gradlew --stop || true
  ./gradlew -version | sed -n '1,20p'
)
rm -rf node_modules/react-native-screens/android/.cxx \
       node_modules/react-native-worklets/android/.cxx \
       android/app/.cxx \
       android/.gradle

echo "==> Build + install on device"
echo "Working from: $STAFF"
npx expo run:android --device
