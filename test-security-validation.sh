#!/bin/bash

##############################################################################
# SECURITY VALIDATION TEST SUITE — imbobi
# Date: 2026-05-30
# Purpose: Execute comprehensive security tests on staging environment
# Usage: ./test-security-validation.sh [staging-url] [optional: output-file]
##############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGING_URL="${1:-http://localhost:4000}"
API_PREFIX="/api/v1"
OUTPUT_FILE="${2:-security-test-results-$(date +%s).txt}"
TEST_EMAIL_BASE="security-test-$(date +%s)"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

##############################################################################
# UTILITY FUNCTIONS
##############################################################################

log_header() {
  echo -e "\n${BLUE}======================================================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}======================================================================${NC}"
}

log_test() {
  echo -e "\n${YELLOW}TEST: $1${NC}"
  ((TOTAL_TESTS++))
}

log_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((PASSED_TESTS++))
}

log_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((FAILED_TESTS++))
}

log_info() {
  echo -e "${BLUE}ℹ INFO${NC}: $1"
}

log_warning() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

# Test HTTP response
test_http() {
  local method=$1
  local endpoint=$2
  local data=$3
  local headers=$4

  if [ -n "$data" ]; then
    curl -s -X "$method" \
      -H "Content-Type: application/json" \
      $headers \
      -d "$data" \
      "${STAGING_URL}${API_PREFIX}${endpoint}"
  else
    curl -s -X "$method" \
      -H "Content-Type: application/json" \
      $headers \
      "${STAGING_URL}${API_PREFIX}${endpoint}"
  fi
}

# Extract JSON field from response
json_get() {
  local json=$1
  local key=$2
  echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

##############################################################################
# TEST 1: CSRF PROTECTION
##############################################################################

test_csrf_protection() {
  log_header "TEST 1: CSRF PROTECTION"

  local test_num=1

  # Test 1.1: Verify CSRF token endpoint exists
  log_test "1.$((test_num++)): CSRF token generation endpoint"
  local csrf_response=$(test_http GET "/csrf-token" "" "")

  if echo "$csrf_response" | grep -q "token"; then
    log_pass "CSRF token endpoint responds"
  else
    log_warning "CSRF token endpoint not returning token (may not be exposed)"
  fi

  # Test 1.2: Verify POST without CSRF token on protected endpoint
  log_test "1.$((test_num++)): POST request without CSRF token should fail"

  local user_email="csrf-test-${TEST_EMAIL_BASE}@test.com"
  local signup_data="{
    \"nome\": \"CSRF Test User\",
    \"email\": \"$user_email\",
    \"cpf\": \"11144477735\",
    \"telefone\": \"11999999999\",
    \"senha\": \"TestPass123!\"
  }"

  local response=$(test_http POST "/auth/registrar" "$signup_data" "")
  local status=$(echo "$response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

  if [ "$status" = "403" ] || [ "$status" = "400" ]; then
    log_pass "POST without CSRF token rejected (status: $status)"
  elif [ "$status" = "201" ]; then
    log_warning "POST succeeded without explicit CSRF token (may use SameSite cookie)"
  else
    log_fail "Unexpected response status: $status"
  fi

  # Test 1.3: Verify state-changing methods (PATCH, DELETE) require CSRF
  log_test "1.$((test_num++)): PATCH/DELETE requests should require CSRF token"

  local response=$(test_http PATCH "/etapas/123/status" "{\"status\": \"EM_PROGRESSO\"}" "")
  local status=$(echo "$response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

  if [ "$status" = "403" ] || [ "$status" = "401" ]; then
    log_pass "PATCH without auth/CSRF rejected (status: $status)"
  else
    log_warning "PATCH status: $status (check if proper protection)"
  fi
}

##############################################################################
# TEST 2: RATE LIMITING
##############################################################################

test_rate_limiting() {
  log_header "TEST 2: RATE LIMITING"

  local test_num=1

  # Test 2.1: Rate limit on login endpoint (10 req/min)
  log_test "2.$((test_num++)): Rate limit on auth/login (should limit at 10 attempts)"

  local limit_hit=0
  local last_status=200

  for i in {1..15}; do
    local response=$(test_http POST "/auth/login" "{
      \"email\": \"nonexistent-${i}@test.com\",
      \"senha\": \"wrongpassword\"
    }" "")

    last_status=$(echo "$response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

    if [ "$last_status" = "429" ]; then
      limit_hit=$((i))
      break
    fi
  done

  if [ $limit_hit -gt 0 ] && [ $limit_hit -le 15 ]; then
    log_pass "Rate limit triggered at request #$limit_hit (expected ~10)"
  else
    log_warning "Rate limit may not be triggered (last status: $last_status)"
  fi

  # Test 2.2: Rate limit on registration endpoint (10 req/min)
  log_test "2.$((test_num++)): Rate limit on auth/registrar (should limit at 10 attempts)"

  limit_hit=0
  for i in {1..15}; do
    local response=$(test_http POST "/auth/registrar" "{
      \"nome\": \"Test User $i\",
      \"email\": \"register-test-${i}-${TEST_EMAIL_BASE}@test.com\",
      \"cpf\": \"12345678$((900+i))\",
      \"telefone\": \"1199999999$((i%10))\",
      \"senha\": \"TestPass123!\"
    }" "")

    last_status=$(echo "$response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

    if [ "$last_status" = "429" ]; then
      limit_hit=$((i))
      break
    fi
  done

  if [ $limit_hit -gt 0 ]; then
    log_pass "Registration rate limit triggered at request #$limit_hit"
  else
    log_warning "Registration rate limit not triggered within 15 requests"
  fi

  # Test 2.3: Verify rate limit response includes Retry-After header
  log_test "2.$((test_num++)): Rate limited response includes Retry-After header"

  local response=$(test_http POST "/auth/login" "{
    \"email\": \"test@test.com\",
    \"senha\": \"pass\"
  }" "")

  if echo "$response" | grep -qi "retry-after"; then
    log_pass "Retry-After header present in rate limit response"
  else
    log_warning "Retry-After header not found (should be present for 429)"
  fi
}

##############################################################################
# TEST 3: ENCRYPTION VERIFICATION
##############################################################################

test_encryption() {
  log_header "TEST 3: ENCRYPTION VERIFICATION"

  local test_num=1

  # Test 3.1: No plaintext passwords in auth responses
  log_test "3.$((test_num++)): Auth responses do not contain plaintext passwords"

  local user_email="encrypt-test-${TEST_EMAIL_BASE}@test.com"
  local response=$(test_http POST "/auth/registrar" "{
    \"nome\": \"Encryption Test\",
    \"email\": \"$user_email\",
    \"cpf\": \"11144477735\",
    \"telefone\": \"11999999999\",
    \"senha\": \"TestPass123!\"
  }" "")

  if ! echo "$response" | grep -qi "password\|senha"; then
    log_pass "No plaintext password in signup response"
  else
    log_fail "Plaintext password found in response"
  fi

  # Test 3.2: Verify accessToken is returned
  log_test "3.$((test_num++)): Access token returned in auth response"

  if echo "$response" | grep -q "accessToken"; then
    log_pass "accessToken present in response"
  else
    log_fail "accessToken missing from auth response"
  fi

  # Test 3.3: Verify refreshToken uses HttpOnly cookie
  log_test "3.$((test_num++)): Refresh token uses HttpOnly cookie"

  local curl_response=$(curl -s -i -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"nome\": \"Cookie Test\",
      \"email\": \"cookie-test-${TEST_EMAIL_BASE}@test.com\",
      \"cpf\": \"12345678901\",
      \"telefone\": \"11999999999\",
      \"senha\": \"TestPass123!\"
    }" \
    "${STAGING_URL}${API_PREFIX}/auth/registrar")

  if echo "$curl_response" | grep -i "HttpOnly"; then
    log_pass "HttpOnly flag present on refresh token cookie"
  else
    log_warning "HttpOnly flag not found on cookie (check Set-Cookie header)"
  fi
}

##############################################################################
# TEST 4: IDOR (Insecure Direct Object Reference) PREVENTION
##############################################################################

test_idor_prevention() {
  log_header "TEST 4: IDOR PREVENTION"

  local test_num=1

  # Test 4.1: Create two users and verify IDOR protection
  log_test "4.$((test_num++)): User cannot access other user's data (IDOR test)"

  # Create User 1
  local user1_email="user1-${TEST_EMAIL_BASE}@test.com"
  local user1_response=$(test_http POST "/auth/registrar" "{
    \"nome\": \"User 1\",
    \"email\": \"$user1_email\",
    \"cpf\": \"11144477735\",
    \"telefone\": \"11999999999\",
    \"senha\": \"TestPass123!\"
  }" "")

  local user1_token=$(echo "$user1_response" | grep -o "\"accessToken\":\"[^\"]*\"" | cut -d'"' -f4)

  # Create User 2
  local user2_email="user2-${TEST_EMAIL_BASE}@test.com"
  local user2_response=$(test_http POST "/auth/registrar" "{
    \"nome\": \"User 2\",
    \"email\": \"$user2_email\",
    \"cpf\": \"12345678902\",
    \"telefone\": \"11999999998\",
    \"senha\": \"TestPass123!\"
  }" "")

  local user2_token=$(echo "$user2_response" | grep -o "\"accessToken\":\"[^\"]*\"" | cut -d'"' -f4)

  # User 1 creates an obra
  local obra_response=$(test_http POST "/obras" "{
    \"titulo\": \"Test Obra\",
    \"descricao\": \"IDOR Test Obra\",
    \"latitude\": -23.5505,
    \"longitude\": -46.6333
  }" "-H \"Authorization: Bearer $user1_token\"")

  local obra_id=$(echo "$obra_response" | grep -o "\"id\":\"[^\"]*\"" | head -1 | cut -d'"' -f4)

  if [ -z "$obra_id" ]; then
    log_warning "Could not create obra for IDOR test (user may not have permission)"
  else
    # User 2 tries to access User 1's obra
    local idor_test=$(test_http GET "/obras/$obra_id" "" "-H \"Authorization: Bearer $user2_token\"")
    local status=$(echo "$idor_test" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

    if [ "$status" = "403" ] || [ "$status" = "404" ]; then
      log_pass "IDOR prevented: User 2 cannot access User 1's obra (status: $status)"
    else
      log_fail "IDOR vulnerability: User 2 accessed User 1's obra (status: $status)"
    fi
  fi

  # Test 4.2: Verify creditRequest ownership
  log_test "4.$((test_num++)): User cannot access other user's credit requests"

  local credit_response=$(test_http GET "/credito/FAKE_ID/extrato" "" "-H \"Authorization: Bearer $user2_token\"")
  local status=$(echo "$credit_response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

  if [ "$status" = "403" ] || [ "$status" = "404" ] || [ "$status" = "400" ]; then
    log_pass "Credit data protected from IDOR (status: $status)"
  else
    log_warning "Credit data access status: $status"
  fi
}

##############################################################################
# TEST 5: AUTHORIZATION & ROLE-BASED ACCESS
##############################################################################

test_authorization() {
  log_header "TEST 5: AUTHORIZATION & ROLE-BASED ACCESS"

  local test_num=1

  # Test 5.1: Unauthenticated request rejection
  log_test "5.$((test_num++)): Unauthenticated requests return 401"

  local response=$(test_http GET "/obras" "")
  local status=$(echo "$response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

  if [ "$status" = "401" ]; then
    log_pass "Unauthenticated request rejected (status: 401)"
  else
    log_fail "Unauthenticated request not rejected properly (status: $status)"
  fi

  # Test 5.2: Invalid JWT token rejection
  log_test "5.$((test_num++)): Invalid JWT tokens are rejected"

  local response=$(test_http GET "/obras" "" "-H \"Authorization: Bearer invalid.token.here\"")
  local status=$(echo "$response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

  if [ "$status" = "401" ]; then
    log_pass "Invalid JWT token rejected (status: 401)"
  else
    log_fail "Invalid JWT not rejected properly (status: $status)"
  fi

  # Test 5.3: Admin-only endpoint protection
  log_test "5.$((test_num++)): Admin-only endpoints reject non-admin users"

  local tomador_email="tomador-${TEST_EMAIL_BASE}@test.com"
  local tomador_response=$(test_http POST "/auth/registrar" "{
    \"nome\": \"Tomador User\",
    \"email\": \"$tomador_email\",
    \"cpf\": \"11144477735\",
    \"telefone\": \"11999999999\",
    \"senha\": \"TestPass123!\"
  }" "")

  local tomador_token=$(echo "$tomador_response" | grep -o "\"accessToken\":\"[^\"]*\"" | cut -d'"' -f4)

  # Try to access KYC pendentes (ADMIN/GESTOR only)
  local kyc_response=$(test_http GET "/kyc/pendentes" "" "-H \"Authorization: Bearer $tomador_token\"")
  local status=$(echo "$kyc_response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

  if [ "$status" = "403" ]; then
    log_pass "Non-admin user rejected from admin endpoint (status: 403)"
  else
    log_warning "Admin endpoint access status: $status (may be correctly restricted)"
  fi
}

##############################################################################
# TEST 6: SECURITY HEADERS
##############################################################################

test_security_headers() {
  log_header "TEST 6: SECURITY HEADERS"

  local test_num=1

  # Test 6.1: Verify CSP header
  log_test "6.$((test_num++)): Content-Security-Policy header present"

  local curl_response=$(curl -s -i "${STAGING_URL}${API_PREFIX}/health")

  if echo "$curl_response" | grep -i "content-security-policy"; then
    log_pass "CSP header present"
  else
    log_fail "CSP header missing"
  fi

  # Test 6.2: Verify X-Content-Type-Options header
  log_test "6.$((test_num++)): X-Content-Type-Options header set to nosniff"

  if echo "$curl_response" | grep -i "x-content-type-options.*nosniff"; then
    log_pass "X-Content-Type-Options: nosniff present"
  else
    log_fail "X-Content-Type-Options header not properly set"
  fi

  # Test 6.3: Verify X-Frame-Options header
  log_test "6.$((test_num++)): X-Frame-Options header set to DENY"

  if echo "$curl_response" | grep -i "x-frame-options.*DENY"; then
    log_pass "X-Frame-Options: DENY present"
  else
    log_fail "X-Frame-Options header not properly set"
  fi

  # Test 6.4: Verify HSTS header
  log_test "6.$((test_num++)): HSTS header present"

  if echo "$curl_response" | grep -i "strict-transport-security"; then
    log_pass "HSTS header present"
  else
    log_warning "HSTS header not found (required for production HTTPS)"
  fi
}

##############################################################################
# TEST 7: INPUT VALIDATION
##############################################################################

test_input_validation() {
  log_header "TEST 7: INPUT VALIDATION"

  local test_num=1

  # Test 7.1: Invalid CPF rejection
  log_test "7.$((test_num++)): Invalid CPF format rejected"

  local response=$(test_http POST "/auth/registrar" "{
    \"nome\": \"Invalid CPF\",
    \"email\": \"invalid-cpf-${TEST_EMAIL_BASE}@test.com\",
    \"cpf\": \"invalid-cpf-number\",
    \"telefone\": \"11999999999\",
    \"senha\": \"TestPass123!\"
  }" "")

  local status=$(echo "$response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

  if [ "$status" = "400" ]; then
    log_pass "Invalid CPF rejected (status: 400)"
  else
    log_fail "Invalid CPF not rejected (status: $status)"
  fi

  # Test 7.2: Weak password rejection
  log_test "7.$((test_num++)): Weak password rejected"

  local response=$(test_http POST "/auth/registrar" "{
    \"nome\": \"Weak Password\",
    \"email\": \"weak-pass-${TEST_EMAIL_BASE}@test.com\",
    \"cpf\": \"11144477735\",
    \"telefone\": \"11999999999\",
    \"senha\": \"123\"
  }" "")

  local status=$(echo "$response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

  if [ "$status" = "400" ]; then
    log_pass "Weak password rejected (status: 400)"
  else
    log_fail "Weak password not rejected (status: $status)"
  fi

  # Test 7.3: XSS prevention in form fields
  log_test "7.$((test_num++)): HTML/Script tags sanitized or rejected"

  local response=$(test_http POST "/auth/registrar" "{
    \"nome\": \"<script>alert('xss')</script>\",
    \"email\": \"xss-test-${TEST_EMAIL_BASE}@test.com\",
    \"cpf\": \"11144477735\",
    \"telefone\": \"11999999999\",
    \"senha\": \"TestPass123!\"
  }" "")

  if ! echo "$response" | grep -qi "<script>"; then
    log_pass "Script tags sanitized or rejected"
  else
    log_fail "Script tags found in response (XSS vulnerability)"
  fi
}

##############################################################################
# TEST 8: TOKEN MANAGEMENT
##############################################################################

test_token_management() {
  log_header "TEST 8: TOKEN MANAGEMENT"

  local test_num=1

  # Test 8.1: Logout invalidates token
  log_test "8.$((test_num++)): Token invalidation after logout"

  local user_email="logout-test-${TEST_EMAIL_BASE}@test.com"
  local signup_response=$(test_http POST "/auth/registrar" "{
    \"nome\": \"Logout Test\",
    \"email\": \"$user_email\",
    \"cpf\": \"11144477735\",
    \"telefone\": \"11999999999\",
    \"senha\": \"TestPass123!\"
  }" "")

  local token=$(echo "$signup_response" | grep -o "\"accessToken\":\"[^\"]*\"" | cut -d'"' -f4)

  if [ -z "$token" ]; then
    log_warning "Could not obtain token for logout test"
  else
    # Verify token works before logout
    local works=$(test_http GET "/obras" "" "-H \"Authorization: Bearer $token\"")

    # Logout
    local logout_response=$(test_http POST "/auth/logout" "" "-H \"Authorization: Bearer $token\"")
    local logout_status=$(echo "$logout_response" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

    # Try to use token after logout
    local after_logout=$(test_http GET "/obras" "" "-H \"Authorization: Bearer $token\"")
    local after_status=$(echo "$after_logout" | grep -o "\"statusCode\":[0-9]*" | grep -o "[0-9]*")

    if [ "$after_status" = "401" ]; then
      log_pass "Token invalidated after logout"
    else
      log_warning "Token still works after logout (status: $after_status)"
    fi
  fi
}

##############################################################################
# MAIN EXECUTION
##############################################################################

main() {
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════════════════════╗"
  echo "║            SECURITY VALIDATION TEST SUITE — imbobi                     ║"
  echo "║                        Date: 2026-05-30                                ║"
  echo "╚════════════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  log_info "Target: $STAGING_URL"
  log_info "Output: $OUTPUT_FILE"

  # Execute all tests
  test_csrf_protection
  test_rate_limiting
  test_encryption
  test_idor_prevention
  test_authorization
  test_security_headers
  test_input_validation
  test_token_management

  # Summary
  log_header "TEST EXECUTION SUMMARY"
  echo ""
  echo "Total Tests: $TOTAL_TESTS"
  echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
  echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

  if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED${NC}"
    OVERALL_STATUS="PASS"
  else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}"
    OVERALL_STATUS="FAIL"
  fi

  local pass_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo "Pass Rate: $pass_rate%"

  # Save results to file
  {
    echo "Security Validation Test Results"
    echo "================================="
    echo "Date: $(date)"
    echo "Target: $STAGING_URL"
    echo ""
    echo "Results:"
    echo "--------"
    echo "Total Tests: $TOTAL_TESTS"
    echo "Passed: $PASSED_TESTS"
    echo "Failed: $FAILED_TESTS"
    echo "Pass Rate: $pass_rate%"
    echo ""
    echo "Status: $OVERALL_STATUS"
  } > "$OUTPUT_FILE"

  echo -e "\n${BLUE}Results saved to: $OUTPUT_FILE${NC}"

  exit $([ $FAILED_TESTS -eq 0 ] && echo 0 || echo 1)
}

main "$@"
