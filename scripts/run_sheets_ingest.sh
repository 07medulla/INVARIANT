#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="$HOME/.openclaw/workspace/.env.local"
PROJECT_ROOT="$HOME/.openclaw/workspace/invariant"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi
cd "$PROJECT_ROOT"
/usr/bin/env python3 scripts/sheets_ingest.py
