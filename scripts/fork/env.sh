fork_repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
export XCODE_XCCONFIG_FILE="$fork_repo/apps/browser/macos/AdHoc.xcconfig"

fork_engine_drift() {
  local short=$1 commit public
  public=(engine/ardiacore/src/ardia/core/public engine/chromium/src/chrome/browser/ardia/public)
  while read -r commit; do
    [[ "$("$fork_repo/engine/engine-key.sh" "$commit" 2>/dev/null)" == "$short"* ]] || continue
    if ! git -C "$fork_repo" diff --quiet "$commit" HEAD -- "${public[@]}"; then
      echo "warning: the app's engine API changed since that engine was built; a feature calling these will crash until upstream publishes the next engine:" >&2
      git -C "$fork_repo" diff -U0 "$commit" HEAD -- "${public[@]}" | grep -E '^\+[^+]' | sed 's/^+/    /' >&2
    fi
    return 0
  done < <(git -C "$fork_repo" rev-list HEAD -- $("$fork_repo/engine/engine-key.sh" --paths))
}

if [[ -z "${ARDIACORE_FRAMEWORK:-}" && ! -f "$HOME/chromium-build/chromium_git/chromium/src/out/Release_GN_arm64/Chromium Framework.framework/Versions/Current/Chromium Framework" ]]; then
  ARDIACORE_FRAMEWORK=$("$fork_repo/packages/ardiacore/scripts/fetch-engine.sh" --nearest) || return 1
  export ARDIACORE_FRAMEWORK
  fork_engine=$(basename "$(dirname "$ARDIACORE_FRAMEWORK")")
  [[ "$("$fork_repo/engine/engine-key.sh")" == "$fork_engine"* ]] || fork_engine_drift "$fork_engine"
fi
