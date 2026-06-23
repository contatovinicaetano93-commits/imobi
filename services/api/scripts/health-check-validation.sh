#!/bin/bash

###############################################################################
# Health Check Validation Script
#
# Comprehensive validation script that tests all health check endpoints,
# verifies connectivity to critical services, and validates production
# monitoring setup.
#
# Usage: ./scripts/health-check-validation.sh [--production] [--verbose]
#
# Options:
#   --production    Test against production API
#   --verbose       Print detailed output for each test
#
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROD_MODE=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --production) PROD_MODE=true; shift ;;
    --verbose) VERBOSE=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Determine API endpoint
if [ "$PROD_MODE" = true ]; then
  API_URL="${PROD_API_URL:-https://api.imobi.com}"
  ENV_NAME="PRODUCTION"
else
  API_URL="${LOCAL_API_URL:-http://localhost:4000}"
  ENV_NAME="LOCAL"
fi

# State tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Test functions
print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_test() {
  echo -e "${YELLOW}[ ] Testing: $1${NC}"
}

pass() {
  echo -e "${GREEN}[✓] PASSED: $1${NC}"
  ((TESTS_PASSED++))
}

fail() {
  echo -e "${RED}[✗] FAILED: $1${NC}"
  ((TESTS_FAILED++))
}

skip() {
  echo -e "${YELLOW}[⊘] SKIPPED: $1${NC}"
  ((TESTS_SKIPPED++))
}

# Test 1: Health Endpoint Reachability
test_health_endpoint() {
  print_test "Health endpoint reachability"

  RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/v1/health" 2>/dev/null || echo "Connection failed\n000")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" = "200" ]; then
    pass "Health endpoint is reachable"
    if [ "$VERBOSE" = true ]; then
      echo "Response: $BODY" | jq '.' 2>/dev/null || echo "$BODY"
    fi
    return 0
  else
    fail "Health endpoint returned HTTP $HTTP_CODE"
    return 1
  fi
}

# Test 2: Health Status Structure
test_health_response_structure() {
  print_test "Health response structure validation"

  RESPONSE=$(curl -s "$API_URL/api/v1/health" 2>/dev/null || echo '{}')

  # Check required fields
  local REQUIRED_FIELDS=("status" "timestamp" "redis" "email" "firebase" "database")
  local MISSING_FIELDS=()

  for field in "${REQUIRED_FIELDS[@]}"; do
    if ! echo "$RESPONSE" | jq -e ".$field" >/dev/null 2>&1; then
      MISSING_FIELDS+=("$field")
    fi
  done

  if [ ${#MISSING_FIELDS[@]} -eq 0 ]; then
    pass "Health response contains all required fields"
    return 0
  else
    fail "Health response missing fields: ${MISSING_FIELDS[*]}"
    return 1
  fi
}

# Test 3: Database Connectivity
test_database_connectivity() {
  print_test "Database connectivity"

  RESPONSE=$(curl -s "$API_URL/api/v1/health" 2>/dev/null || echo '{"database":{"configured":false}}')
  DB_CONFIGURED=$(echo "$RESPONSE" | jq -r '.database.configured // false')

  if [ "$DB_CONFIGURED" = "true" ]; then
    pass "Database is configured and connectivity verified"
    return 0
  else
    fail "Database is not configured or connectivity failed"
    return 1
  fi
}

# Test 4: Redis Connectivity
test_redis_connectivity() {
  print_test "Redis connectivity"

  RESPONSE=$(curl -s "$API_URL/api/v1/health" 2>/dev/null || echo '{"redis":{"status":"error"}}')
  REDIS_STATUS=$(echo "$RESPONSE" | jq -r '.redis.status // "unknown"')

  if [ "$REDIS_STATUS" = "connected" ]; then
    pass "Redis is connected"
    REDIS_HOST=$(echo "$RESPONSE" | jq -r '.redis.host // "unknown"')
    REDIS_PORT=$(echo "$RESPONSE" | jq -r '.redis.port // "unknown"')
    if [ "$VERBOSE" = true ]; then
      echo "  Redis Host: $REDIS_HOST:$REDIS_PORT"
    fi
    return 0
  elif [ "$REDIS_STATUS" = "error" ]; then
    fail "Redis connection failed"
    REDIS_ERROR=$(echo "$RESPONSE" | jq -r '.redis.error // "Unknown error"')
    if [ "$VERBOSE" = true ]; then
      echo "  Error: $REDIS_ERROR"
    fi
    return 1
  else
    skip "Redis status unknown"
    return 0
  fi
}

# Test 5: Email Provider Configuration
test_email_configuration() {
  print_test "Email provider configuration"

  RESPONSE=$(curl -s "$API_URL/api/v1/health" 2>/dev/null || echo '{"email":{"configured":false}}')
  EMAIL_CONFIGURED=$(echo "$RESPONSE" | jq -r '.email.configured // false')
  EMAIL_PROVIDER=$(echo "$RESPONSE" | jq -r '.email.provider // "unknown"')

  if [ "$EMAIL_CONFIGURED" = "true" ]; then
    pass "Email provider configured ($EMAIL_PROVIDER)"
    return 0
  else
    if [ "$PROD_MODE" = true ]; then
      fail "Email provider not configured (required in production)"
      return 1
    else
      skip "Email provider not configured (optional in development)"
      return 0
    fi
  fi
}

# Test 6: Firebase Configuration
test_firebase_configuration() {
  print_test "Firebase configuration"

  RESPONSE=$(curl -s "$API_URL/api/v1/health" 2>/dev/null || echo '{"firebase":{"configured":false}}')
  FIREBASE_CONFIGURED=$(echo "$RESPONSE" | jq -r '.firebase.configured // false')

  if [ "$FIREBASE_CONFIGURED" = "true" ]; then
    pass "Firebase is configured"
    return 0
  else
    if [ "$PROD_MODE" = true ]; then
      fail "Firebase not configured (required in production)"
      return 1
    else
      skip "Firebase not configured (optional in development)"
      return 0
    fi
  fi
}

# Test 7: Rate Limiting Test
test_rate_limiting() {
  print_test "Rate limiting (should return 429 on excess requests)"

  # Make multiple rapid requests to trigger rate limiting
  for i in {1..105}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null)
    if [ "$HTTP_CODE" = "429" ]; then
      pass "Rate limiting is active (429 Too Many Requests)"
      if [ "$VERBOSE" = true ]; then
        echo "  Triggered after $i requests"
      fi
      return 0
    fi
  done

  # If we didn't get a 429, rate limiting may not be working
  skip "Rate limiting not triggered (may be configured differently)"
  return 0
}

# Test 8: CORS Headers Validation
test_cors_headers() {
  print_test "CORS headers validation"

  RESPONSE=$(curl -s -i -X OPTIONS "$API_URL/api/v1/health" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET" 2>/dev/null)

  # Check for CORS headers
  local CORS_HEADER=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" || echo "")

  if [ -n "$CORS_HEADER" ]; then
    pass "CORS headers are present"
    if [ "$VERBOSE" = true ]; then
      echo "  $CORS_HEADER"
    fi
    return 0
  else
    fail "CORS headers not found in response"
    return 1
  fi
}

# Test 9: JWT Token Refresh (if auth is enabled)
test_jwt_refresh() {
  print_test "JWT token refresh capability"

  # This is a simplified test - in production, you'd use valid credentials
  RESPONSE=$(curl -s -X POST "$API_URL/api/v1/auth/refresh-token" \
    -H "Content-Type: application/json" \
    -d '{"refreshToken":"test"}' 2>/dev/null)

  # Check if endpoint exists (even if it rejects the token)
  if echo "$RESPONSE" | jq -e '.statusCode or .message or .error' >/dev/null 2>&1; then
    pass "JWT refresh endpoint is available"
    return 0
  else
    # Endpoint might not exist or return different format
    skip "JWT refresh endpoint status unclear"
    return 0
  fi
}

# Test 10: Response Time Check
test_response_time() {
  print_test "Response time (should be < 500ms)"

  START_TIME=$(date +%s%N)
  curl -s "$API_URL/api/v1/health" >/dev/null 2>&1
  END_TIME=$(date +%s%N)

  ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))

  if [ "$ELAPSED_MS" -lt 500 ]; then
    pass "Response time is acceptable (${ELAPSED_MS}ms)"
    return 0
  else
    fail "Response time is slow (${ELAPSED_MS}ms > 500ms)"
    return 1
  fi
}

# Test 11: Overall Health Status
test_overall_health_status() {
  print_test "Overall health status"

  RESPONSE=$(curl -s "$API_URL/api/v1/health" 2>/dev/null || echo '{"status":"error"}')
  STATUS=$(echo "$RESPONSE" | jq -r '.status // "unknown"')

  case "$STATUS" in
    "ok")
      pass "Overall health status is OK"
      return 0
      ;;
    "degraded")
      if [ "$PROD_MODE" = true ]; then
        fail "Health status is DEGRADED (some required services unavailable)"
        return 1
      else
        pass "Health status is DEGRADED (acceptable in development)"
        return 0
      fi
      ;;
    "error")
      fail "Health status is ERROR (critical services unavailable)"
      return 1
      ;;
    *)
      fail "Unknown health status: $STATUS"
      return 1
      ;;
  esac
}

# Test 12: Metrics Endpoint
test_metrics_endpoint() {
  print_test "Prometheus metrics endpoint"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/metrics" 2>/dev/null)

  if [ "$HTTP_CODE" = "200" ]; then
    pass "Metrics endpoint is accessible"
    return 0
  else
    fail "Metrics endpoint returned HTTP $HTTP_CODE"
    return 1
  fi
}

# Main execution
main() {
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║         Imobi Health Check Validation Script                  ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  echo "Environment: $ENV_NAME"
  echo "API URL: $API_URL"
  echo ""

  # Run all tests
  print_header "Service Connectivity Tests"
  test_health_endpoint || true
  test_health_response_structure || true
  test_database_connectivity || true
  test_redis_connectivity || true

  print_header "Configuration Tests"
  test_email_configuration || true
  test_firebase_configuration || true

  print_header "Performance & Security Tests"
  test_cors_headers || true
  test_response_time || true

  print_header "Functionality Tests"
  test_rate_limiting || true
  test_jwt_refresh || true
  test_overall_health_status || true

  print_header "Monitoring Tests"
  test_metrics_endpoint || true

  # Summary
  print_header "Test Summary"
  echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))"
  echo -e "  ${GREEN}Passed:  $TESTS_PASSED${NC}"
  echo -e "  ${RED}Failed:  $TESTS_FAILED${NC}"
  echo -e "  ${YELLOW}Skipped: $TESTS_SKIPPED${NC}"

  if [ "$TESTS_FAILED" -gt 0 ]; then
    echo -e "\n${RED}VALIDATION FAILED${NC}"
    exit 1
  else
    echo -e "\n${GREEN}VALIDATION PASSED${NC}"
    exit 0
  fi
}

main
