#!/bin/bash

# Post-Deployment Verification Script
# Run after API deploy on Render
# Usage: bash scripts/post-deploy-verification.sh https://imobi-api-staging.onrender.com

set -e

API_URL="${1:-https://imobi-api-staging.onrender.com}"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Post-Deployment Verification${NC}"
echo -e "${BLUE}API URL: ${API_URL}${NC}\n"

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

# 1. Health Check
echo -e "${BLUE}🏥 Health Checks${NC}"
check "API is reachable" "curl -s -o /dev/null -w '%{http_code}' ${API_URL}/health | grep -q 200"
check "Database connected" "curl -s ${API_URL}/health | grep -q 'connected'"
check "Redis connected" "curl -s ${API_URL}/health | grep -q 'redis'"

# 2. API Endpoints
echo -e "\n${BLUE}📡 API Endpoints${NC}"
check "Metrics endpoint accessible" "curl -s -o /dev/null -w '%{http_code}' ${API_URL}/metrics | grep -q 200"
check "OpenAPI docs accessible" "curl -s -o /dev/null -w '%{http_code}' ${API_URL}/docs | grep -q 200"
check "Auth endpoints exist" "curl -s ${API_URL}/docs | grep -q 'auth/login'"

# 3. Public Endpoints
echo -e "\n${BLUE}🌐 Public Endpoints${NC}"
check "Simulator works" "curl -s -X POST ${API_URL}/api/v1/public/simulador \
  -H 'Content-Type: application/json' \
  -d '{\"valorSolicitado\": 500000, \"prazoMeses\": 12, \"tipoObra\": \"CONSTRUCAO\"}' \
  | grep -q 'parcelaMensal'"

# 4. Auth Flow
echo -e "\n${BLUE}🔐 Authentication${NC}"

# Generate unique test user
TEST_EMAIL="test-$(date +%s)@imobi.test"
TEST_PASSWORD="TestPass123!@"
TEST_CPF="12345678900"

echo "Testing auth flow with: $TEST_EMAIL"

# Register
REGISTER_RESPONSE=$(curl -s -X POST ${API_URL}/api/v1/auth/registro \
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
  }")

if echo "$REGISTER_RESPONSE" | grep -q '"id"'; then
  echo -e "${GREEN}✓${NC} User registration successful"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} User registration failed"
  ((FAILED++))
fi

# Login
LOGIN_RESPONSE=$(curl -s -X POST ${API_URL}/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\": \"${TEST_EMAIL}\", \"senha\": \"${TEST_PASSWORD}\"}")

if echo "$LOGIN_RESPONSE" | grep -q '"accessToken"'; then
  echo -e "${GREEN}✓${NC} User login successful"
  ((PASSED++))

  # Extract token
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

  # Test protected endpoint with token
  if curl -s -H "Authorization: Bearer ${TOKEN}" ${API_URL}/api/v1/obras | grep -q '\['; then
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
for i in {1..15}; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' -X POST ${API_URL}/api/v1/public/simulador \
    -H 'Content-Type: application/json' \
    -d '{"valorSolicitado": 500000, "prazoMeses": 12, "tipoObra": "CONSTRUCAO"}')

  if [ "$STATUS" = "429" ]; then
    RATE_LIMITED=1
    break
  fi
done

if [ $RATE_LIMITED -eq 1 ]; then
  echo -e "${GREEN}✓${NC} Rate limiting active"
  ((PASSED++))
else
  echo -e "${YELLOW}⚠${NC} Rate limiting not triggered (may be disabled)"
fi

# 6. Monitoring
echo -e "\n${BLUE}📊 Monitoring${NC}"

# Check Prometheus metrics format
METRICS=$(curl -s ${API_URL}/metrics)
if echo "$METRICS" | grep -q "http_request_duration_seconds"; then
  echo -e "${GREEN}✓${NC} Prometheus metrics available"
  ((PASSED++))
else
  echo -e "${RED}✗${NC} Prometheus metrics missing"
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
  echo "1. Update frontend API_URL to: ${API_URL}"
  echo "2. Test auth flow in browser"
  echo "3. Monitor Sentry for errors"
  echo "4. Check UptimeRobot dashboard"
  exit 0
else
  echo -e "\n${RED}❌ Some checks failed. Investigate before going live.${NC}"
  exit 1
fi
