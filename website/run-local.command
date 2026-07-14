#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

append_path() {
  if [ -d "$1" ]; then
    PATH="$1:$PATH"
  fi
}

append_path "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
append_path "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback"
append_path "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override"
append_path "/opt/homebrew/bin"
append_path "/usr/local/bin"
append_path "/usr/bin"
append_path "/bin"

PACKAGE_MANAGER=""

if command -v pnpm >/dev/null 2>&1; then
  PACKAGE_MANAGER="pnpm"
elif command -v npm >/dev/null 2>&1; then
  PACKAGE_MANAGER="npm"
fi

if [ -z "$PACKAGE_MANAGER" ]; then
  echo "Node.js package manager not found."
  echo "Install Node.js or run this script from Codex with bundled runtime access."
  exit 1
fi

if [ ! -d node_modules ]; then
  "$PACKAGE_MANAGER" install
fi

exec "$PACKAGE_MANAGER" run dev -- --host
