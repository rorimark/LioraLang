#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

violations="$(
  rg -n \
    --glob 'src/**/*.{js,jsx}' \
    --glob '!src/shared/platform/**' \
    --glob '!src/shared/api/**' \
    "(from\\s+['\"][^'\"]*electron[^'\"]*['\"]|from\\s+['\"]@shared/api['\"]|from\\s+['\"][^'\"]*shared/api[^'\"]*['\"]|window\\.electronAPI)" \
    src || true
)"

if [[ -n "$violations" ]]; then
  echo "Boundary check failed. Direct Electron/API usage found outside platform layer:"
  echo "$violations"
  exit 1
fi

echo "Boundary check passed: no direct Electron imports outside shared/platform."
