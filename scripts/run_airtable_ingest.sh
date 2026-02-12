#!/usr/bin/env bash
set -euo pipefail
PROJECT_ROOT="$HOME/.openclaw/workspace/invariant"
ENV_FILE="$HOME/.openclaw/workspace/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  source "$ENV_FILE"
  set +a
fi
cd "$PROJECT_ROOT"
/usr/bin/env python3 scripts/airtable_ingest.py
