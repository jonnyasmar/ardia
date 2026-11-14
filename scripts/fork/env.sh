fork_repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
export XCODE_XCCONFIG_FILE="$fork_repo/apps/browser/macos/AdHoc.xcconfig"
if [[ -z "${ARDIACORE_FRAMEWORK:-}" && ! -d "$HOME/chromium-build/chromium_git/chromium/src/out" ]]; then
  ARDIACORE_FRAMEWORK=$("$fork_repo/packages/ardiacore/scripts/fetch-engine.sh" --nearest) || return 1
  export ARDIACORE_FRAMEWORK
fi
