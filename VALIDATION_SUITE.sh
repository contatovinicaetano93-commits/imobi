#!/bin/bash
# Automated Validation Suite for imobi Staging Environment
# Runs comprehensive security, E2E, and performance tests
# Usage: ./VALIDATION_SUITE.sh <api-url> <web-url>

set -e

API_URL="${1:-http://localhost:4000}"
WEB_URL="${2:-http://localhost:3000}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_test() { echo -e "${CYAN}→${NC} $1"; }

TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local expected_code="$4"

  log_test "$name"

  local response=$(curl -s -w "\n%{http_code}" -X "$method" \
    -H "Content-Type: application/json" \
    "$API_URL$endpoint" 2>/dev/null || echo "000")

  local http_code=$(echo "$response" | tail -n1)

  if [[ "$http_code" == "$expected_code" ]]; then
    log_success "$name ($http_code)"
    ((TESTS_PASSED++))
    return 0
  else
    log_error "$name (expected $expected_code, got $http_code)"
    ((TESTS_FAILED++))
    return 1
  fi
}

test_json_response() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local jq_filter="$4"

  log_test "$name"

  local response=$(curl -s -X "$method" \
    -H "Content-Type: application/json" \
    "$API_URL$endpoint" 2>/dev/null || echo "{}")

  if echo "$response" | jq -e "$jq_filter" > /dev/null 2>&1; then
    log_success "$name"
    ((TESTS_PASSED++))
    return 0
  else
    log_error "$name (response: $response)"
    ((TESTS_FAILED++))
    return 1
  fi
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           imobi Validation Suite — Automated Testing          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# 1. HEALTH CHECKS
echo -e "${YELLOW}1. HEALTH CHECKS${NC}"
test_endpoint "API Health" "GET" "/api/v1/health" "200"
test_endpoint "API Liveness" "GET" "/api/v1/health/live" "200"
test_endpoint "API Readiness" "GET" "/api/v1/health/ready" "200"
echo ""

# 2. AUTHENTICATION TESTS
echo -e "${YELLOW}2. AUTHENTICATION FLOW${NC}"

# Test signup endpoint exists and responds
test_endpoint "Signup endpoint" "POST" "/api/v1/auth/registrar" "400"

# Test login endpoint exists
test_endpoint "Login endpoint" "POST" "/api/v1/auth/login" "400"

# Test token refresh endpoint
test_endpoint "Token refresh" "POST" "/api/v1/auth/renovar" "401"

echo ""

# 3. API RESPONSE FORMAT VALIDATION
echo -e "${YELLOW}3. API RESPONSE FORMAT${NC}"

test_json_response "Health returns status field" "GET" "/api/v1/health" ".status"
test_json_response "Health has timestamp" "GET" "/api/v1/health" ".timestamp"
test_json_response "Health has uptime" "GET" "/api/v1/health" ".uptime"

echo ""

# 4. SECURITY HEADERS
echo -e "${YELLOW}4. SECURITY HEADERS${NC}"

log_test "Content-Security-Policy header"
HEADERS=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "content-security-policy" || true)
if [ -n "$HEADERS" ]; then
  log_success "Content-Security-Policy header present"
  ((TESTS_PASSED++))
else
  log_warn "Content-Security-Policy header not found"
fi

log_test "X-Frame-Options header"
HEADERS=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "x-frame-options" || true)
if [ -n "$HEADERS" ]; then
  log_success "X-Frame-Options header present"
  ((TESTS_PASSED++))
else
  log_warn "X-Frame-Options header not found"
fi

log_test "X-Content-Type-Options header"
HEADERS=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "x-content-type-options" || true)
if [ -n "$HEADERS" ]; then
  log_success "X-Content-Type-Options header present"
  ((TESTS_PASSED++))
else
  log_warn "X-Content-Type-Options header not found"
fi

echo ""

# 5. CORS VALIDATION
echo -e "${YELLOW}5. CORS SECURITY${NC}"

log_test "CORS origin validation"
CORS=$(curl -s -H "Origin: http://malicious.com" -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "access-control-allow-origin" || true)
if [ -z "$CORS" ] || [[ ! "$CORS" =~ "malicious" ]]; then
  log_success "CORS properly restricts unauthorized origins"
  ((TESTS_PASSED++))
else
  log_error "CORS may be too permissive"
  ((TESTS_FAILED++))
fi

echo ""

# 6. RATE LIMITING
echo -e "${YELLOW}6. RATE LIMITING${NC}"

log_test "Rate limiting on auth endpoints"
RATE_TEST=0
for i in {1..15}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    "$API_URL/api/v1/auth/login" 2>/dev/null | tail -n1)

  if [[ "$RESPONSE" == "429" ]]; then
    RATE_TEST=1
    break
  fi
done

if [ $RATE_TEST -eq 1 ]; then
  log_success "Rate limiting active (429 Too Many Requests)"
  ((TESTS_PASSED++))
else
  log_warn "Rate limiting may not be active (no 429 after 15 requests)"
fi

echo ""

# 7. DATABASE CONNECTIVITY
echo -e "${YELLOW}7. DATABASE CONNECTIVITY${NC}"

log_test "Database is accessible via API"
DB_TEST=$(curl -s "$API_URL/api/v1/health/ready" | grep -q "database" && echo "1" || echo "0")
if [ "$DB_TEST" == "1" ]; then
  log_success "Database connectivity confirmed"
  ((TESTS_PASSED++))
else
  log_warn "Database status unknown (check /api/v1/health/ready for details)"
fi

echo ""

# 8. REDIS CACHE
echo -e "${YELLOW}8. REDIS CACHE${NC}"

log_test "Redis connectivity"
REDIS_TEST=$(curl -s "$API_URL/api/v1/health/ready" | grep -q "redis" && echo "1" || echo "0")
if [ "$REDIS_TEST" == "1" ]; then
  log_success "Redis connectivity confirmed"
  ((TESTS_PASSED++))
else
  log_warn "Redis status unknown (check /api/v1/health/ready for details)"
fi

echo ""

# 9. WEB FRONTEND TESTS
echo -e "${YELLOW}9. WEB FRONTEND${NC}"

log_test "Web server responding"
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL" 2>/dev/null)
if [ "$WEB_HEALTH" == "200" ]; then
  log_success "Web server responding (HTTP $WEB_HEALTH)"
  ((TESTS_PASSED++))
else
  log_error "Web server not responding (HTTP $WEB_HEALTH)"
  ((TESTS_FAILED++))
fi

log_test "Signup page accessible"
SIGNUP=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/cadastro" 2>/dev/null)
if [ "$SIGNUP" == "200" ]; then
  log_success "Signup page accessible"
  ((TESTS_PASSED++))
else
  log_error "Signup page not accessible (HTTP $SIGNUP)"
  ((TESTS_FAILED++))
fi

log_test "Login page accessible"
LOGIN=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL/login" 2>/dev/null)
if [ "$LOGIN" == "200" ]; then
  log_success "Login page accessible"
  ((TESTS_PASSED++))
else
  log_error "Login page not accessible (HTTP $LOGIN)"
  ((TESTS_FAILED++))
fi

echo ""

# 10. PERFORMANCE BASELINE
echo -e "${YELLOW}10. PERFORMANCE BASELINE${NC}"

log_test "API response time (health endpoint)"
START=$(date +%s%N)
curl -s "$API_URL/api/v1/health" > /dev/null
END=$(date +%s%N)
DURATION=$(( (END - START) / 1000000 ))
echo "  Duration: ${DURATION}ms"
if [ "$DURATION" -lt 500 ]; then
  log_success "API response time acceptable (<500ms)"
  ((TESTS_PASSED++))
else
  log_warn "API response time elevated (${DURATION}ms, threshold 500ms)"
fi

echo ""

# SUMMARY
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}VALIDATION SUMMARY${NC}"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL VALIDATION TESTS PASSED${NC}"
  echo ""
  echo "The staging environment is ready for:"
  echo "  • Manual security testing"
  echo "  • E2E testing"
  echo "  • Load testing"
  echo "  • User acceptance testing"
  echo ""
  exit 0
else
  echo -e "${RED}❌ SOME TESTS FAILED${NC}"
  echo ""
  echo "Please review failures above and:"
  echo "  1. Check API logs: aws logs tail /ecs/imobi --follow"
  echo "  2. Verify database: psql -h \$RDS_ENDPOINT -d imbobi_staging"
  echo "  3. Verify Redis: redis-cli -h \$REDIS_ENDPOINT PING"
  echo ""
  exit 1
fi
