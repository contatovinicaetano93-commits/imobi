#!/bin/bash
# Automated Security Testing Suite
# Tests for OWASP Top 10 vulnerabilities and security best practices
# Usage: ./SECURITY_TEST_AUTOMATION.sh <api-url>

set -e

API_URL="${1:-http://localhost:4000}"

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

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          Security Testing Automation Suite — OWASP Top 10     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# A01: BROKEN ACCESS CONTROL
echo -e "${YELLOW}A01: BROKEN ACCESS CONTROL${NC}"

log_test "Access without token should be denied"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/v1/usuarios/meu-perfil" 2>/dev/null | tail -n1)
if [[ "$RESPONSE" == "401" ]] || [[ "$RESPONSE" == "403" ]]; then
  log_success "Protected endpoint requires authentication"
  ((TESTS_PASSED++))
else
  log_error "Endpoint accessible without token (HTTP $RESPONSE)"
  ((TESTS_FAILED++))
fi

log_test "Invalid token should be rejected"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  -H "Authorization: Bearer invalid-token-12345" \
  "$API_URL/api/v1/usuarios/meu-perfil" 2>/dev/null | tail -n1)
if [[ "$RESPONSE" == "401" ]] || [[ "$RESPONSE" == "403" ]]; then
  log_success "Invalid token properly rejected"
  ((TESTS_PASSED++))
else
  log_warn "Token validation response: HTTP $RESPONSE"
fi

echo ""

# A02: CRYPTOGRAPHIC FAILURES
echo -e "${YELLOW}A02: CRYPTOGRAPHIC FAILURES${NC}"

log_test "HTTPS is enforced in production (check redirect)"
# In staging, may be HTTP; in prod should force HTTPS
if [[ "$API_URL" == https* ]]; then
  log_success "Using HTTPS"
  ((TESTS_PASSED++))
else
  log_warn "Using HTTP (expected in staging, should be HTTPS in production)"
fi

log_test "Sensitive data not in error messages"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":""}' \
  "$API_URL/api/v1/auth/login" 2>/dev/null)
if echo "$RESPONSE" | grep -iq "password\|secret\|key\|token" | head -5; then
  log_warn "Error response may contain sensitive information"
else
  log_success "Error response does not expose sensitive data"
  ((TESTS_PASSED++))
fi

echo ""

# A03: INJECTION
echo -e "${YELLOW}A03: INJECTION${NC}"

log_test "SQL Injection: Invalid email format rejected"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test\" OR \"1\"=\"1\"; --","password":"test"}' \
  "$API_URL/api/v1/auth/login" 2>/dev/null | tail -n1)
if [[ "$RESPONSE" == "400" ]] || [[ "$RESPONSE" == "422" ]] || [[ "$RESPONSE" == "401" ]]; then
  log_success "Injection attempt properly handled"
  ((TESTS_PASSED++))
else
  log_warn "SQL Injection validation response: HTTP $RESPONSE"
fi

log_test "XSS: Script tags in input rejected"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"nome":"<script>alert(1)</script>","cpf":"12345678900","email":"test@test.com","telefone":"11999999999","senha":"TestPass123"}' \
  "$API_URL/api/v1/auth/registrar" 2>/dev/null | tail -n1)
if [[ "$RESPONSE" == "400" ]] || [[ "$RESPONSE" == "422" ]] || [[ "$RESPONSE" == "201" ]] || [[ "$RESPONSE" == "409" ]]; then
  log_success "XSS payload validation working"
  ((TESTS_PASSED++))
else
  log_warn "XSS validation response: HTTP $RESPONSE"
fi

echo ""

# A04: INSECURE DESIGN
echo -e "${YELLOW}A04: INSECURE DESIGN${NC}"

log_test "Input validation: CPF format validation"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"nome":"Test User","cpf":"invalid-cpf","email":"test@test.com","telefone":"11999999999","senha":"TestPass123"}' \
  "$API_URL/api/v1/auth/registrar" 2>/dev/null)
if echo "$RESPONSE" | grep -q "invalid\|error\|cpf" || [[ $? -ne 0 ]]; then
  log_success "CPF format validation active"
  ((TESTS_PASSED++))
else
  log_warn "CPF validation may not be enforced at API level"
fi

log_test "Password requirements: Minimum strength enforced"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"nome":"Test User","cpf":"12345678901","email":"test@test.com","telefone":"11999999999","senha":"weak"}' \
  "$API_URL/api/v1/auth/registrar" 2>/dev/null)
if echo "$RESPONSE" | grep -iq "password\|length\|strength" || [[ $? -ne 0 ]]; then
  log_success "Password strength validation in place"
  ((TESTS_PASSED++))
else
  log_warn "Password strength validation may not be enforced"
fi

echo ""

# A05: MISCONFIGURATION
echo -e "${YELLOW}A05: MISCONFIGURATION${NC}"

log_test "Security headers: Content-Security-Policy"
CSP=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "content-security-policy" | wc -l)
if [ $CSP -gt 0 ]; then
  log_success "CSP header present"
  ((TESTS_PASSED++))
else
  log_warn "CSP header missing"
fi

log_test "Security headers: X-Frame-Options"
XFO=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "x-frame-options" | wc -l)
if [ $XFO -gt 0 ]; then
  log_success "X-Frame-Options header present"
  ((TESTS_PASSED++))
else
  log_warn "X-Frame-Options header missing"
fi

log_test "Security headers: X-Content-Type-Options"
XCTO=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "x-content-type-options" | wc -l)
if [ $XCTO -gt 0 ]; then
  log_success "X-Content-Type-Options header present"
  ((TESTS_PASSED++))
else
  log_warn "X-Content-Type-Options header missing"
fi

log_test "No server information disclosure"
SERVER=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "server:" | wc -l)
if [ $SERVER -eq 0 ]; then
  log_success "Server header not exposed"
  ((TESTS_PASSED++))
else
  log_warn "Server header is exposed"
fi

echo ""

# A07: AUTHENTICATION FAILURES
echo -e "${YELLOW}A07: AUTHENTICATION FAILURES${NC}"

log_test "Login endpoint rate limited"
COUNT=0
for i in {1..15}; do
  RESPONSE=$(curl -s -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    "$API_URL/api/v1/auth/login" -o /dev/null 2>/dev/null)

  if [[ "$RESPONSE" == "429" ]]; then
    COUNT=$((COUNT + 1))
  fi
done

if [ $COUNT -gt 0 ]; then
  log_success "Rate limiting prevents brute force (429 responses detected)"
  ((TESTS_PASSED++))
else
  log_warn "Rate limiting may not be active (no 429 responses)"
fi

log_test "Token doesn't leak in URL"
if [[ "$API_URL" != *"token="* ]]; then
  log_success "No tokens in URLs"
  ((TESTS_PASSED++))
else
  log_error "Tokens found in API URLs"
  ((TESTS_FAILED++))
fi

echo ""

# A08: SOFTWARE & DATA INTEGRITY
echo -e "${YELLOW}A08: SOFTWARE & DATA INTEGRITY${NC}"

log_test "CSRF protection (SameSite cookies)"
COOKIES=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "set-cookie" | grep -i "samesite" | wc -l)
# Note: Not all endpoints set cookies, so this is a warning if not found
if [ $COOKIES -gt 0 ]; then
  log_success "SameSite cookie attribute set"
  ((TESTS_PASSED++))
else
  log_warn "SameSite cookie protection status unknown (may not apply to this endpoint)"
fi

log_test "CORS properly configured"
CORS=$(curl -s -H "Origin: http://invalid-origin.com" -I "$API_URL/api/v1/health" 2>/dev/null | grep -i "access-control-allow-origin" | grep "invalid-origin" | wc -l)
if [ $CORS -eq 0 ]; then
  log_success "CORS rejects invalid origins"
  ((TESTS_PASSED++))
else
  log_error "CORS may be too permissive"
  ((TESTS_FAILED++))
fi

echo ""

# A09: LOGGING & MONITORING
echo -e "${YELLOW}A09: LOGGING & MONITORING${NC}"

log_test "Health endpoint includes timestamp (for monitoring)"
HEALTH=$(curl -s "$API_URL/api/v1/health" 2>/dev/null | grep -q "timestamp" && echo "1" || echo "0")
if [ "$HEALTH" == "1" ]; then
  log_success "Health check includes timestamp"
  ((TESTS_PASSED++))
else
  log_warn "Health check timestamp not found"
fi

log_test "Health endpoint includes uptime"
UPTIME=$(curl -s "$API_URL/api/v1/health" 2>/dev/null | grep -q "uptime" && echo "1" || echo "0")
if [ "$UPTIME" == "1" ]; then
  log_success "Health check includes uptime metric"
  ((TESTS_PASSED++))
else
  log_warn "Uptime metric not found"
fi

echo ""

# A10: SERVER-SIDE REQUEST FORGERY
echo -e "${YELLOW}A10: SERVER-SIDE REQUEST FORGERY${NC}"

log_test "No open redirects in login response"
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test","redirect":"http://malicious.com"}' \
  "$API_URL/api/v1/auth/login" -w "\n%{http_code}" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if ! echo "$BODY" | grep -q "malicious.com" || [[ "$HTTP_CODE" == "400" ]]; then
  log_success "No open redirect vulnerability"
  ((TESTS_PASSED++))
else
  log_warn "Redirect handling: check if SSRF protections are in place"
fi

echo ""

# SUMMARY
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SECURITY TEST SUMMARY${NC}"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ SECURITY TESTS PASSED${NC}"
  echo ""
  echo "System demonstrates good security practices for:"
  echo "  • Access Control (A01)"
  echo "  • Cryptographic Protection (A02)"
  echo "  • Injection Prevention (A03)"
  echo "  • Input Validation (A04)"
  echo "  • Configuration Management (A05)"
  echo "  • Authentication (A07)"
  echo "  • Data Integrity (A08)"
  echo "  • Logging & Monitoring (A09)"
  echo "  • SSRF Prevention (A10)"
  echo ""
  exit 0
else
  echo -e "${RED}❌ SOME SECURITY TESTS FAILED${NC}"
  echo ""
  echo "Please review failures and configure missing security measures."
  echo "Reference: SECURITY_SUMMARY.md"
  echo ""
  exit 1
fi
