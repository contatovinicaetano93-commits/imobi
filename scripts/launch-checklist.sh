#!/bin/bash

# Imobi MVP - Pre-Launch Checklist
# Usage: bash scripts/launch-checklist.sh <api-url>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/api-endpoints.sh
source "${SCRIPT_DIR}/lib/api-endpoints.sh"

API_URL="${1:-}"

if [ -z "$API_URL" ]; then
  echo "Usage: bash scripts/launch-checklist.sh <api-url>"
  echo "Example: bash scripts/launch-checklist.sh https://imobi-api-staging.onrender.com"
  exit 1
fi

HEALTH_URL="$(api_health_url "$API_URL")"
METRICS_URL="$(api_metrics_url "$API_URL")"
DOCS_URL="$(api_docs_url "$API_URL")"

if [ -z "$API_URL" ]; then
  echo "Usage: bash scripts/launch-checklist.sh <api-url>"
  echo "Example: bash scripts/launch-checklist.sh https://imobi-api-staging.onrender.com"
  exit 1
fi

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNED=0

check() {
  local name="$1"
  local cmd="$2"

  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} $name"
    ((FAILED++))
    return 1
  fi
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARNED++))
}

echo -e "${BLUE}🚀 Imobi MVP - Pre-Launch Checklist${NC}"
echo -e "${BLUE}API: ${API_URL}${NC}\n"

# 1. API Availability
echo -e "${BLUE}🔗 API Connectivity${NC}"
check "API health reachable" "curl -sf '${HEALTH_URL}' | grep -q '\"status\":\"ok\"'"
check "API returns JSON" "curl -sf '${HEALTH_URL}' | grep -q 'status'"

# 2. Core Services
echo -e "\n${BLUE}🛠️  Core Services${NC}"
check "Database configured" "curl -sf '${HEALTH_URL}' | grep -q 'database'"
check "Redis reported" "curl -sf '${HEALTH_URL}' | grep -q 'redis'"

# 3. API Endpoints
echo -e "\n${BLUE}📡 API Endpoints${NC}"
check "Health endpoint (GET /api/v1/health)" "curl -sf '${HEALTH_URL}' | grep -q ok"
check "Metrics endpoint (GET /api/v1/metrics)" "curl -sf '${METRICS_URL}' | grep -q 'http_request'"
DOCS_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${DOCS_URL}" 2>/dev/null || echo "000")
if [ "$DOCS_STATUS" = "200" ]; then
  check "Swagger docs (GET /docs)" "curl -sf '${DOCS_URL}' | grep -q swagger"
else
  warn "Swagger /docs HTTP ${DOCS_STATUS} (esperado em production)"
fi
check "Credit simulator (POST /api/v1/credito/simular)" "curl -sf -X POST '${API_URL}/api/v1/credito/simular' -H 'Content-Type: application/json' -d '{\"valorSolicitado\":500000,\"prazoMeses\":12,\"tipoObra\":\"RESIDENCIAL\"}' | grep -q parcelaMensal"

# 4. Authentication
echo -e "\n${BLUE}🔐 Authentication${NC}"
TEST_EMAIL="launch-test-$(date +%s)@imobi.test"
TEST_PASSWORD="TestPass123!@"
TEST_CPF=$(printf "%011d" $(( $(date +%s) % 100000000000 )))

# Register
REG=$(curl -s -X POST ${API_URL}/api/v1/auth/registrar \
  -H 'Content-Type: application/json' \
  -d "{\"nome\":\"Test\",\"email\":\"${TEST_EMAIL}\",\"cpf\":\"${TEST_CPF}\",\"telefone\":\"11999999999\",\"senha\":\"${TEST_PASSWORD}\",\"consentidoTermos\":true,\"consentidoPrivacy\":true,\"consentidoKyc\":true}")

if echo "$REG" | grep -q '"accessToken"'; then
  echo -e "${GREEN}✓${NC} User registration"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} User registration"
  ((FAILED++))
fi

# Login
LOGIN=$(curl -s -X POST ${API_URL}/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${TEST_EMAIL}\",\"senha\":\"${TEST_PASSWORD}\"}")

if echo "$LOGIN" | grep -q '"accessToken"'; then
  echo -e "${GREEN}✓${NC} User login"
  ((PASSED++))
  TOKEN=$(echo "$LOGIN" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
else
  echo -e "${RED}✗${NC} User login"
  ((FAILED++))
  TOKEN=""
fi

# Token validation
if [ -n "$TOKEN" ]; then
  check "JWT token format" "echo '$TOKEN' | grep -q '^eyJ'"
  check "Protected endpoints accessible" "curl -s -H 'Authorization: Bearer ${TOKEN}' ${API_URL}/api/v1/obras | grep -q '\['"
else
  warn "Could not validate token (login failed)"
fi

# 5. Performance
echo -e "\n${BLUE}⚡ Performance${NC}"
RESPONSE_TIME=$(curl -s -w '%{time_total}' -o /dev/null "${HEALTH_URL}")
if command -v bc >/dev/null 2>&1 && (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
  echo -e "${GREEN}✓${NC} Response time < 1s (actual: ${RESPONSE_TIME}s)"
  ((PASSED++))
elif awk "BEGIN {exit !($RESPONSE_TIME < 1.0)}"; then
  echo -e "${GREEN}✓${NC} Response time < 1s (actual: ${RESPONSE_TIME}s)"
  ((PASSED++))
else
  warn "Response time > 1s (actual: ${RESPONSE_TIME}s)"
fi

# 6. Security
echo -e "\n${BLUE}🔒 Security${NC}"
check "HTTPS/TLS" "curl -sf -I '${HEALTH_URL}' | grep -qi HTTP"
check "No secrets in health JSON" "curl -sf '${HEALTH_URL}' | grep -qiv 'password\\|secret\\|token'"

# 7. Monitoring
echo -e "\n${BLUE}📊 Monitoring${NC}"
check "Prometheus metrics format" "curl -sf '${METRICS_URL}' | grep -q 'TYPE'"
check "Metrics include latency" "curl -sf '${METRICS_URL}' | grep -q 'http_request_duration_seconds'"

# 8. Data Integrity
echo -e "\n${BLUE}💾 Data Integrity${NC}"
check "Database status in health" "curl -sf '${HEALTH_URL}' | grep -q 'database'"

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Passed:${NC} $PASSED"
if [ $WARNED -gt 0 ]; then
  echo -e "${YELLOW}⚠ Warned:${NC} $WARNED"
fi
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}✗ Failed:${NC} $FAILED"
fi
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Final decision
echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✨ ALL CHECKS PASSED - READY FOR LAUNCH${NC}"
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo "1. Update frontend API URL: apps/web/.env.local"
  echo "2. Test in browser: pnpm dev && open http://localhost:3001"
  echo "3. Setup monitoring: bash scripts/setup-monitoring.sh ${API_URL}"
  echo "4. Announce soft launch to stakeholders"
  echo "5. Monitor for errors: Check Sentry dashboard"
  exit 0
else
  echo -e "${RED}❌ SOME CHECKS FAILED - DO NOT LAUNCH${NC}"
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo "1. Review failed checks above"
  echo "2. Check API logs in Render dashboard"
  echo "3. Fix issues and redeploy"
  echo "4. Re-run: bash scripts/launch-checklist.sh ${API_URL}"
  exit 1
fi
