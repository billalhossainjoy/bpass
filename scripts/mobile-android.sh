#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$ROOT_DIR/apps/mobile"
ANDROID_DIR="$MOBILE_DIR/android"

find_java_home() {
  if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/java" ]]; then
    printf '%s\n' "$JAVA_HOME"
    return 0
  fi

  local candidates=(
    "/opt/android-studio/android-studio/jbr"
    "/opt/android-studio/jbr"
    "$HOME/android-studio/jbr"
    "$HOME/.local/share/JetBrains/Toolbox/apps/android-studio/bin/jbr"
  )

  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate/bin/java" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  candidate="$(find /usr/lib/jvm /opt "$HOME" -maxdepth 5 -path '*/bin/java' -type f -perm -111 2>/dev/null | head -n 1 || true)"
  if [[ -n "$candidate" ]]; then
    dirname "$(dirname "$candidate")"
    return 0
  fi

  return 1
}

JAVA_HOME="$(find_java_home || true)"
if [[ -z "$JAVA_HOME" ]]; then
  cat >&2 <<'EOF'
Could not find Java.

Install a JDK, or set JAVA_HOME to Android Studio's bundled JBR, for example:
  export JAVA_HOME=/opt/android-studio/android-studio/jbr
EOF
  exit 1
fi

export JAVA_HOME
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export ANDROID_SDK_ROOT="${ANDROID_SDK_ROOT:-$ANDROID_HOME}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

command_name="${1:-run}"
shift || true
if [[ "${1:-}" == "--" ]]; then
  shift
fi

case "$command_name" in
  doctor)
    echo "JAVA_HOME=$JAVA_HOME"
    java -version
    echo
    echo "ANDROID_HOME=$ANDROID_HOME"
    if [[ -x "$ANDROID_HOME/platform-tools/adb" ]]; then
      adb version
      echo
      adb devices
    else
      echo "adb not found at $ANDROID_HOME/platform-tools/adb"
    fi
    if [[ -x "$ANDROID_HOME/emulator/emulator" ]]; then
      echo
      echo "Android virtual devices:"
      emulator -list-avds || true
    fi
    ;;
  sync)
    pnpm --dir "$ROOT_DIR" --filter @bpass/mobile build
    pnpm --dir "$ROOT_DIR" --filter @bpass/mobile sync:android
    ;;
  build)
    "$0" sync
    (cd "$ANDROID_DIR" && ./gradlew --no-daemon assembleDebug "$@")
    ;;
  bundle)
    "$0" sync
    (cd "$ANDROID_DIR" && ./gradlew --no-daemon bundleRelease "$@")
    ;;
  run)
    "$0" sync
    pnpm --dir "$MOBILE_DIR" exec cap run android "$@"
    ;;
  open)
    pnpm --dir "$MOBILE_DIR" exec cap open android "$@"
    ;;
  devices)
    adb devices
    if [[ -x "$ANDROID_HOME/emulator/emulator" ]]; then
      echo
      emulator -list-avds || true
    fi
    ;;
  *)
    cat >&2 <<EOF
Unknown command: $command_name

Usage:
  scripts/mobile-android.sh doctor
  scripts/mobile-android.sh sync
  scripts/mobile-android.sh build
  scripts/mobile-android.sh bundle
  scripts/mobile-android.sh run [--target DEVICE_ID]
  scripts/mobile-android.sh open
  scripts/mobile-android.sh devices
EOF
    exit 1
    ;;
esac
