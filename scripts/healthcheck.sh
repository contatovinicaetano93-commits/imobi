#!/usr/bin/env bash
# Post-deploy health check for imobi API
# Usage: ./scripts/healthcheck.sh [API_URL]
# Returns 0 on success, 1 on failure.

set -euo pipefail

API_URL="${1:-${API_URL:-http://localhost:4000}}"
MAX_RETRIES=12
SLEEP_BETWEEN=5   # seconds
TIMEOUT=5         # curl per-request timeout

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

FAILURES=0

# ── 1. Wait for API to become reachable ──────────────────────────────────────
info "Waiting for API at $API_URL ..."
READY=0
for i in $(seq 1 $MAX_RETRIES); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$API_URL/health" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "200" ]]; then
    READY=1
    break
  fi
  info "Attempt $i/$MAX_RETRIES — got $HTTP_CODE, retrying in ${SLEEP_BETWEEN}s ..."
  sleep "$SLEEP_BETWEEN"
done

if [[ "$READY" -ne 1 ]]; then
  fail "API did not become healthy after $((MAX_RETRIES * SLEEP_BETWEEN))s"
  exit 1
fi
pass "API is reachable"

# ── Helper ────────────────────────────────────────────────────────────────────
check_endpoint() {
  local label="$1"
  local url="$2"
  local expected_code="${3:-200}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "$expected_code" ]]; then
    pass "$label ($HTTP_CODE)"
  else
    fail "$label — expected $expected_code, got $HTTP_CODE"
    FAILURES=$((FAILURES + 1))
  fi
}

check_json_field() {
  local label="$1"
  local url="$2"
  local field="$3"
  BODY=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "{}")
  if echo "$BODY" | grep -q "\"$field\""; then
    pass "$label (field '$field' present)"
  else
    fail "$label — field '$field' missing in response"
    FAILURES=$((FAILURES + 1))
  fi
}

# ── 2. Core API endpoints ─────────────────────────────────────────────────────
check_endpoint "Health endpoint"            "$API_URL/health"                 200
check_endpoint "Auth login (405 = exists)"  "$API_URL/api/v1/auth/login"      405
check_endpoint "Score route (401 = guard)"  "$API_URL/api/v1/score/atual"     401
check_endpoint "Dados bancários (401)"      "$API_URL/api/v1/dados-bancarios/meus" 401
check_endpoint "KYC status (401)"           "$API_URL/api/v1/kyc/status"      401
check_endpoint "Notificações (401)"         "$API_URL/api/v1/notificacoes"    401

# ── 3. Database connectivity (via a lightweight read endpoint) ─────────────────
check_endpoint "DB connectivity (health)"   "$API_URL/health/db"              200

# ── 4. Redis / BullMQ connectivity ────────────────────────────────────────────
check_endpoint "Queue health"               "$API_URL/health/queue"           200

# ── 5. Schema migration check ─────────────────────────────────────────────────
# If a /health/migrations endpoint exists, validate it
HTTP_MIG=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$API_URL/health/migrations" 2>/dev/null || echo "000")
if [[ "$HTTP_MIG" == "200" ]]; then
  pass "Migrations applied"
elif [[ "$HTTP_MIG" == "404" ]]; then
  info "No /health/migrations endpoint — skipping schema check"
else
  fail "Migrations endpoint returned $HTTP_MIG"
  FAILURES=$((FAILURES + 1))
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
if [[ "$FAILURES" -eq 0 ]]; then
  pass "All health checks passed — deploy successful"
  exit 0
else
  fail "$FAILURES check(s) failed — consider rolling back"
  echo ""
  echo "Rollback instructions:"
  echo "  1. psql \$DATABASE_URL < services/api/prisma/migrations/20260618_tarefas1_4/migration.down.sql"
  echo "  2. Deploy the previous image/release"
  echo "  3. Re-run this script to confirm rollback succeeded"
  exit 1
fi
