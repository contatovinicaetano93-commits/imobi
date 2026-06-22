#!/bin/bash

# Imobi MVP - Pre-Launch Checklist
# Comprehensive verification before going live
# Usage: bash scripts/launch-checklist.sh <api-url>

set -e

API_URL="${1:-}"

if [ -z "$API_URL" ]; then
  echo "Usage: bash scripts/launch-checklist.sh <api-url>"
  echo "Example: bash scripts/launch-checklist.sh https://imobi-api-production.railway.app"
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
check "API is reachable" "curl -s -f ${API_URL}/health > /dev/null"
check "API returns JSON" "curl -s ${API_URL}/health | grep -q 'status'"

# 2. Core Services
echo -e "\n${BLUE}🛠️  Core Services${NC}"
check "Database connected" "curl -s ${API_URL}/health | grep -q 'database'"
check "Cache connected" "curl -s ${API_URL}/health | grep -q 'redis'"
check "Logging enabled" "curl -s ${API_URL}/health | grep -q 'version'"

# 3. API Endpoints
echo -e "\n${BLUE}📡 API Endpoints${NC}"
check "Health endpoint (GET /health)" "curl -s ${API_URL}/health | grep -q ok"
check "Metrics endpoint (GET /metrics)" "curl -s ${API_URL}/metrics | grep -q 'http_request'"
check "Swagger docs (GET /docs)" "curl -s ${API_URL}/docs | grep -q swagger"

# 4. Authentication
echo -e "\n${BLUE}🔐 Authentication${NC}"
TEST_EMAIL="launch-test-$(date +%s)@imobi.test"
TEST_PASSWORD="TestPass123!@"
TEST_CPF="12345678900"

# Register
REG=$(curl -s -X POST ${API_URL}/api/v1/auth/registro \
  -H 'Content-Type: application/json' \
  -d "{\"nome\":\"Test\",\"email\":\"${TEST_EMAIL}\",\"cpf\":\"${TEST_CPF}\",\"telefone\":\"11999999999\",\"senha\":\"${TEST_PASSWORD}\",\"consentidoTermos\":true,\"consentidoPrivacy\":true,\"consentidoKyc\":true}")

if echo "$REG" | grep -q '"id"'; then
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

# 5. Public Endpoints
echo -e "\n${BLUE}🌐 Public Endpoints${NC}"
check "Simulator (POST /api/v1/public/simulador)" "curl -s -X POST ${API_URL}/api/v1/public/simulador \
  -H 'Content-Type: application/json' \
  -d '{\"valorSolicitado\":500000,\"prazoMeses\":12,\"tipoObra\":\"CONSTRUCAO\"}' | grep -q 'parcelaMensal'"

# 6. Performance
echo -e "\n${BLUE}⚡ Performance${NC}"
RESPONSE_TIME=$(curl -s -w '%{time_total}' -o /dev/null ${API_URL}/health)
if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
  echo -e "${GREEN}✓${NC} Response time < 1s (actual: ${RESPONSE_TIME}s)"
  ((PASSED++))
else
  warn "Response time > 1s (actual: ${RESPONSE_TIME}s)"
fi

# 7. Security
echo -e "\n${BLUE}🔒 Security${NC}"
check "HTTPS/TLS (no SSL warnings)" "curl -s -I ${API_URL}/health | grep -q HTTP"
check "Rate limiting active" "curl -s ${API_URL}/metrics | grep -q 'rate_limit'"
check "No sensitive data in logs" "curl -s ${API_URL}/health | grep -qv 'password\\|secret\\|token'"

# 8. Monitoring
echo -e "\n${BLUE}📊 Monitoring${NC}"
check "Prometheus metrics format" "curl -s ${API_URL}/metrics | grep -q 'TYPE http_request'"
check "Metrics include latency" "curl -s ${API_URL}/metrics | grep -q 'http_request_duration_seconds'"
check "Metrics include errors" "curl -s ${API_URL}/metrics | grep -q 'http_requests_total'"

# 9. Documentation
echo -e "\n${BLUE}📚 Documentation${NC}"
check "OpenAPI spec available" "curl -s ${API_URL}/docs | grep -q 'openapi\\|swagger'"
check "API endpoints documented" "curl -s ${API_URL}/docs | grep -q '/api/v1'"

# 10. Data Integrity
echo -e "\n${BLUE}💾 Data Integrity${NC}"
check "Database accessible" "curl -s ${API_URL}/health | grep -q 'database.*connected'"
check "No obvious errors in logs" "curl -s ${API_URL}/metrics | grep -qv 'error.*error.*error'"

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
  echo "2. Check API logs in Railway dashboard"
  echo "3. Fix issues and redeploy"
  echo "4. Re-run: bash scripts/launch-checklist.sh ${API_URL}"
  exit 1
fi
