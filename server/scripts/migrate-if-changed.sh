#!/usr/bin/env bash
# Run prisma migrate dev only when schema.prisma has changed.

# Load .dev.env if present
DEV_ENV="$(dirname "$0")/../.dev.env"
if [ -f "$DEV_ENV" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$DEV_ENV"
  set +a
fi

SCHEMA="$(dirname "$0")/../prisma/schema.prisma"
HASH_FILE="$(dirname "$0")/../prisma/.schema.hash"

current=$(sha256sum "$SCHEMA" | awk '{print $1}')
stored=$(cat "$HASH_FILE" 2>/dev/null || echo "")

if [ "$current" != "$stored" ]; then
  echo "[migrate] Schema changed — running prisma migrate dev..."
  npx prisma migrate dev --name auto
  echo "$current" > "$HASH_FILE"
else
  echo "[migrate] Schema unchanged — skipping migration."
fi
