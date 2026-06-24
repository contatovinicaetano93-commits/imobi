#!/bin/bash

# Post-Deployment Verification Script
# Run after API deploy on Render
# Usage: bash scripts/post-deploy-verification.sh [api-url]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/api-endpoints.sh
source "${SCRIPT_DIR}/lib/api-endpoints.sh"

API_URL="${1:-https://imobi-api-staging.onrender.com}"
HEALTH_URL="$(api_health_url "$API_URL")"
METRICS_URL="$(api_metrics_url "$API_URL")"
DOCS_URL="$(api_docs_url "$API_URL")"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Post-Deployment Verification${NC}"
echo -e "${BLUE}API URL: ${API_URL}${NC}"
echo -e "${BLUE}Health:  ${HEALTH_URL}${NC}\n"

PASSED=0
FAILED=0

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
}

# 1. Health Check (API-first: /api/v1/health)
echo -e "${BLUE}🏥 Health Checks${NC}"
check "API health reachable" "curl -sf '${HEALTH_URL}' | grep -q '\"status\":\"ok\"'"
check "Database configured" "curl -sf '${HEALTH_URL}' | grep -q '\"database\"'"
check "Redis reported" "curl -sf '${HEALTH_URL}' | grep -q '\"redis\"'"

# 2. API Endpoints
echo -e "\n${BLUE}📡 API Endpoints${NC}"
check "Metrics endpoint accessible" "curl -sf -o /dev/null -w '%{http_code}' '${METRICS_URL}' | grep -q 200"

DOCS_STATUS=$(curl -s -o /dev/null -w '%{http_code}' "${DOCS_URL}" 2>/dev/null || echo "000")
if [ "$DOCS_STATUS" = "200" ]; then
  check "OpenAPI docs accessible" "curl -sf '${DOCS_URL}' | grep -q 'swagger'"
  check "Auth endpoints in docs" "curl -sf '${DOCS_URL}' | grep -q 'auth'"
else
  warn "Swagger /docs HTTP ${DOCS_STATUS} (ok em NODE_ENV=production com SWAGGER_ENABLED=false)"
fi

# 3. Public Endpoints
echo -e "\n${BLUE}🌐 Public Endpoints${NC}"
check "Credit simulator works" "curl -sf -X POST '${API_URL}/api/v1/credito/simular' \
  -H 'Content-Type: application/json' \
  -d '{\"valorSolicitado\": 500000, \"prazoMeses\": 12, \"tipoObra\": \"RESIDENCIAL\"}' \
  | grep -q 'parcelaMensal'"

# 4. Auth Flow
echo -e "\n${BLUE}🔐 Authentication${NC}"

TEST_EMAIL="test-$(date +%s)@imobi.test"
TEST_PASSWORD="TestPass123!@"
TEST_CPF=$(printf "%011d" $(( $(date +%s) % 100000000000 )))

echo "Testing auth flow with: $TEST_EMAIL"

REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/auth/registrar" \
  -H 'Content-Type: application/json' \
  -d "{
    \"nome\": \"Test User\",
    \"email\": \"${TEST_EMAIL}\",
    \"cpf\": \"${TEST_CPF}\",
    \"telefone\": \"11999999999\",
    \"senha\": \"${TEST_PASSWORD}\",
    \"consentidoTermos\": true,
    \"consentidoPrivacy\": true,
    \"consentidoKyc\": true
  }" 2>/dev/null || echo '{}')

if echo "$REGISTER_RESPONSE" | grep -q '"accessToken"'; then
  echo -e "${GREEN}✓${NC} User registration successful"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} User registration failed"
  ((FAILED++))
fi

LOGIN_RESPONSE=$(curl -sf -X POST "${API_URL}/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\": \"${TEST_EMAIL}\", \"senha\": \"${TEST_PASSWORD}\"}" 2>/dev/null || echo '{}')

if echo "$LOGIN_RESPONSE" | grep -q '"accessToken"'; then
  echo -e "${GREEN}✓${NC} User login successful"
  ((PASSED++))

  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

  if curl -sf -H "Authorization: Bearer ${TOKEN}" "${API_URL}/api/v1/obras" | grep -q '\['; then
    echo -e "${GREEN}✓${NC} Protected endpoint accessible with JWT"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} Protected endpoint failed with JWT"
    ((FAILED++))
  fi
else
  echo -e "${RED}✗${NC} User login failed"
  ((FAILED++))
fi

# 5. Rate Limiting
echo -e "\n${BLUE}⚡ Rate Limiting${NC}"

RATE_LIMITED=0
for _ in {1..15}; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST "${API_URL}/api/v1/credito/simular" \
    -H 'Content-Type: application/json' \
    -d '{"valorSolicitado": 500000, "prazoMeses": 12, "tipoObra": "RESIDENCIAL"}')

  if [ "$STATUS" = "429" ]; then
    RATE_LIMITED=1
    break
  fi
done

if [ $RATE_LIMITED -eq 1 ]; then
  echo -e "${GREEN}✓${NC} Rate limiting active"
  ((PASSED++))
else
  warn "Rate limiting not triggered (may be disabled in staging)"
fi

# 6. Monitoring
echo -e "\n${BLUE}📊 Monitoring${NC}"

METRICS=$(curl -sf "${METRICS_URL}" 2>/dev/null || echo "")
METRICS_CODE=$(curl -s -o /dev/null -w '%{http_code}' "${METRICS_URL}" 2>/dev/null || echo "000")
if [ "$METRICS_CODE" = "200" ] && [ -n "$METRICS" ] && echo "$METRICS" | grep -qE 'TYPE|HELP|#'; then
  echo -e "${GREEN}✓${NC} Prometheus metrics available"
  ((PASSED++))
elif [ "$METRICS_CODE" = "200" ]; then
  warn "Metrics endpoint HTTP 200 but empty (instrumentação pendente em staging)"
else
  echo -e "${RED}✗${NC} Prometheus metrics unreachable (HTTP ${METRICS_CODE})"
  ((FAILED++))
fi

# 7. Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Passed:${NC} $PASSED"
echo -e "${RED}✗ Failed:${NC} $FAILED"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✨ All checks passed! API is production-ready.${NC}"
  echo -e "\n${BLUE}Next steps:${NC}"
  echo "1. pnpm vercel:env:push  (NEXT_PUBLIC_API_URL=${API_URL})"
  echo "2. Validar web: curl -s -o /dev/null -w '%{http_code}\n' https://imobi-web-ten.vercel.app/login"
  echo "3. Monitor Sentry + UptimeRobot"
  exit 0
else
  echo -e "\n${RED}❌ Some checks failed. Investigate before going live.${NC}"
  exit 1
fi
