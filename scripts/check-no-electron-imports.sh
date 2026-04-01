#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PATTERN="(from\\s+['\"][^'\"]*electron[^'\"]*['\"]|from\\s+['\"]@shared/api['\"]|from\\s+['\"][^'\"]*shared/api[^'\"]*['\"]|window\\.electronAPI)"

if command -v rg >/dev/null 2>&1; then
  violations="$(
    rg -n \
      --glob 'src/**/*.{js,jsx}' \
      --glob '!src/shared/platform/**' \
      --glob '!src/shared/api/**' \
      --glob 'packages/shared/src/**/*.{js,jsx}' \
      --glob '!packages/shared/src/platform/**' \
      --glob '!packages/shared/src/api/**' \
      "$PATTERN" \
      src packages/shared/src || true
  )"
else
  violations="$(
    find src packages/shared/src \
      -type f \
      \( -name '*.js' -o -name '*.jsx' \) \
      ! -path 'src/shared/platform/*' \
      ! -path 'src/shared/platform/**/*' \
      ! -path 'src/shared/api/*' \
      ! -path 'src/shared/api/**/*' \
      ! -path 'packages/shared/src/platform/*' \
      ! -path 'packages/shared/src/platform/**/*' \
      ! -path 'packages/shared/src/api/*' \
      ! -path 'packages/shared/src/api/**/*' \
      -print0 |
      xargs -0 grep -nE "$PATTERN" 2>/dev/null || true
  )"
fi

if [[ -n "$violations" ]]; then
  echo "Boundary check failed. Direct Electron/API usage found outside platform layer:"
  echo "$violations"
  exit 1
fi

echo "Boundary check passed: no direct Electron imports outside shared/platform."
