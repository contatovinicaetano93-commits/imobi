#!/usr/bin/env bash
# Production deploy script for imobi API
# Usage: ./scripts/deploy.sh [migration_sql_file] [api_url]
#
# 1. Applies the migration
# 2. Restarts the API process (docker / pm2 / systemd — adapt below)
# 3. Runs the health check
# 4. Rolls back the migration automatically if health check fails

set -euo pipefail

MIGRATION_FILE="${1:-}"
API_URL="${2:-${API_URL:-http://localhost:4000}}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL must be set}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${YELLOW}[DEPLOY]${NC} $1"; }
success() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
error()   { echo -e "${RED}[DEPLOY]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Step 1: Apply migration (if provided) ────────────────────────────────────
if [[ -n "$MIGRATION_FILE" && -f "$MIGRATION_FILE" ]]; then
  info "Applying migration: $MIGRATION_FILE"
  psql "$DATABASE_URL" -f "$MIGRATION_FILE" || {
    error "Migration failed — aborting deploy (no rollback needed, DB unchanged)"
    exit 1
  }
  success "Migration applied"

  # Derive down migration path
  DOWN_FILE="${MIGRATION_FILE%.sql}.down.sql"
else
  info "No migration file specified — skipping DB changes"
  DOWN_FILE=""
fi

# ── Step 2: Restart API ──────────────────────────────────────────────────────
info "Restarting API service ..."
# Adapt to your deployment method:
if command -v docker &>/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "imobi-api"; then
  docker restart imobi-api
elif command -v pm2 &>/dev/null; then
  pm2 restart imobi-api
elif systemctl is-active --quiet imobi-api 2>/dev/null; then
  systemctl restart imobi-api
else
  info "No known process manager found — skipping restart (restart manually if needed)"
fi

# ── Step 3: Health check ─────────────────────────────────────────────────────
info "Running health check against $API_URL ..."
if ! "$SCRIPT_DIR/healthcheck.sh" "$API_URL"; then
  error "Health check FAILED"

  # ── Step 4: Auto-rollback ─────────────────────────────────────────────────
  if [[ -n "$DOWN_FILE" && -f "$DOWN_FILE" ]]; then
    error "Rolling back migration: $DOWN_FILE"
    psql "$DATABASE_URL" -f "$DOWN_FILE" && success "Rollback applied" || error "Rollback also failed — manual intervention required"
  else
    error "No down migration file found — manual DB rollback required"
  fi

  exit 1
fi

success "Deploy completed successfully"
