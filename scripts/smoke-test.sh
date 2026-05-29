#!/bin/bash

# Smoke Tests — Basic functionality validation after deployment
# Run after deploying to verify core features work
# Usage: ./smoke-test.sh [api_url]
# Example: ./smoke-test.sh http://localhost:4000

API_URL="${1:-http://localhost:4000}"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
test_start() { echo -e "${BLUE}Testing:${NC} $1"; TOTAL_TESTS=$((TOTAL_TESTS+1)); }
test_pass() { echo -e "  ${GREEN}✓${NC} $1"; PASSED_TESTS=$((PASSED_TESTS+1)); }
test_fail() { echo -e "  ${RED}✗${NC} $1"; FAILED_TESTS=$((FAILED_TESTS+1)); }

echo -e "${BLUE}=== imobi Smoke Tests ===${NC}"
echo "Target: $API_URL"
echo

# =============================================================================
# TEST 1: API Health
# =============================================================================

test_start "API Health Check"

RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    test_pass "HTTP 200 OK"
else
    test_fail "Expected HTTP 200, got $HTTP_CODE"
fi

if echo "$BODY" | jq -e '.status == "ok"' > /dev/null 2>&1; then
    test_pass "Status is 'ok'"
else
    test_fail "Status is not 'ok'"
fi

# =============================================================================
# TEST 2: Authentication Endpoints
# =============================================================================

test_start "Authentication Signup"

SIGNUP_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Smoke Test User",
    "email": "smoktest-'$(date +%s)'@example.com",
    "cpf": "12345678901",
    "telefone": "11999999999",
    "senha": "SmokeTest@123"
  }')

if echo "$SIGNUP_RESPONSE" | jq -e '.accessToken' > /dev/null 2>&1; then
    test_pass "Signup successful"
    ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.accessToken')
    USER_EMAIL=$(echo "$SIGNUP_RESPONSE" | jq -r '.user.email // "unknown"')
else
    test_fail "Signup failed"
    test_fail "Response: $SIGNUP_RESPONSE"
fi

# =============================================================================
# TEST 3: Protected Endpoints
# =============================================================================

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    test_start "Protected Endpoint Access"

    PROTECTED_RESPONSE=$(curl -s -X GET "$API_URL/api/v1/obras" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/v1/obras" \
      -H "Authorization: Bearer $ACCESS_TOKEN")

    if [ "$HTTP_CODE" = "200" ]; then
        test_pass "Protected endpoint accessible"
    else
        test_fail "Protected endpoint returned HTTP $HTTP_CODE"
    fi
else
    test_fail "Skipping protected endpoint tests (no auth token)"
fi

# =============================================================================
# TEST 4: Unauthorized Access
# =============================================================================

test_start "Unauthorized Access Prevention"

UNAUTH_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/obras")

if [ "$UNAUTH_HTTP" = "401" ]; then
    test_pass "Correctly rejected unauthorized request"
else
    test_fail "Expected 401 Unauthorized, got $UNAUTH_HTTP"
fi

# =============================================================================
# TEST 5: Invalid Input Validation
# =============================================================================

test_start "Input Validation"

INVALID_RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Invalid User",
    "email": "not-an-email",
    "cpf": "invalid",
    "telefone": "123",
    "senha": "short"
  }')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Invalid",
    "email": "bad",
    "cpf": "bad",
    "telefone": "bad",
    "senha": "bad"
  }')

if [ "$HTTP_CODE" = "400" ]; then
    test_pass "Invalid input correctly rejected"
else
    test_fail "Expected 400 Bad Request, got $HTTP_CODE"
fi

# =============================================================================
# TEST 6: Database Connectivity
# =============================================================================

test_start "Database Connectivity"

if curl -s "$API_URL/api/v1/health" | jq -e '.database == "connected"' > /dev/null 2>&1; then
    test_pass "Database is connected"
else
    test_fail "Database is not connected"
fi

# =============================================================================
# TEST 7: Cache/Redis
# =============================================================================

test_start "Cache System"

if curl -s "$API_URL/api/v1/health" | jq -e '.redis == "connected"' > /dev/null 2>&1; then
    test_pass "Cache is connected"
else
    test_fail "Cache is not connected (optional)"
fi

# =============================================================================
# TEST 8: Response Time SLA
# =============================================================================

test_start "Response Time SLA (< 2s)"

START=$(date +%s%N)
curl -s "$API_URL/api/v1/health" > /dev/null
END=$(date +%s%N)
LATENCY=$(( (END - START) / 1000000 ))

if [ $LATENCY -lt 2000 ]; then
    test_pass "Response time ${LATENCY}ms (< 2000ms)"
else
    test_fail "Response time ${LATENCY}ms (SLA exceeded)"
fi

# =============================================================================
# SUMMARY
# =============================================================================

echo
echo -e "${BLUE}========================================${NC}"
echo "Smoke Test Results"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
else
    echo -e "${GREEN}Failed: 0${NC}"
fi

SUCCESS_RATE=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
echo -e "Success Rate: ${GREEN}${SUCCESS_RATE}%${NC}"
echo -e "${BLUE}========================================${NC}"
echo

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All smoke tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Check deployment.${NC}"
    exit 1
fi
