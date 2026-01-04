#!/usr/bin/env bash
# Ouvre l'application Next.js dans le navigateur.

set -e

PORT=${PORT:-3000}
HOST=${HOST:-localhost}
PATHNAME=${APP_PATH:-/login}
URL=${APP_URL:-http://${HOST}:${PORT}${PATHNAME}}

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 &
else
  echo "Ouvre manuellement : $URL"
  exit 0
fi

echo "Ouverture de $URL dans le navigateur…"
