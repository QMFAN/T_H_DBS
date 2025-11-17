#!/usr/bin/env bash
set -euo pipefail
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3308}"
DB_NAME="${DB_NAME:-th_system}"
DB_USER="${DB_USER:-th_user}"
DB_PASSWORD="${DB_PASSWORD:?missing}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIG_DIR="$REPO_DIR/backend/database/migrations"
for f in $(ls "$MIG_DIR"/*.sql | sort); do
  mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$f"
done