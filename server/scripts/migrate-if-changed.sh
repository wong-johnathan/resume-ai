#!/usr/bin/env bash
# Run prisma migrate dev only when schema.prisma has changed.

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
