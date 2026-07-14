#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PACKAGE_MANAGER=""

if command -v pnpm >/dev/null 2>&1; then
  PACKAGE_MANAGER="pnpm"
elif command -v npm >/dev/null 2>&1; then
  PACKAGE_MANAGER="npm"
fi

if [ -z "$PACKAGE_MANAGER" ]; then
  echo "Node.js package manager not found."
  echo "Install Node.js so that pnpm or npm is available in PATH."
  exit 1
fi

if [ ! -d node_modules ]; then
  "$PACKAGE_MANAGER" install
fi

exec "$PACKAGE_MANAGER" run dev -- --host
