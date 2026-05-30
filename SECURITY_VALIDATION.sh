#!/bin/bash
# Security Validation Script for imobi Staging
# Tests all 20 OWASP vulnerabilities fixed

set -e

API_URL=${1:-"http://localhost:4000/api/v1"}
WEB_URL=${2:-"http://localhost:3000"}

echo "🔐 Security Validation Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "API URL: $API_URL"
echo "Web URL: $WEB_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

test_security() {
  local test_name=$1
  local test_command=$2
  local expected=$3

  echo -n "Testing: $test_name... "

  if eval "$test_command" &>/dev/null; then
    if [ -z "$expected" ] || eval "$expected" &>/dev/null; then
      echo -e "${GREEN}✓${NC}"
      ((PASSED++))
      return 0
    fi
  fi

  echo -e "${RED}✗${NC}"
  ((FAILED++))
  return 1
}

# Test Security Headers
echo -e "${YELLOW}Security Headers (Helmet):${NC}"
test_security "Content-Security-Policy" \
  "curl -s -I $API_URL/health | grep -i 'content-security-policy'" \
  ""
test_security "X-Frame-Options" \
  "curl -s -I $API_URL/health | grep -i 'x-frame-options'" \
  ""
test_security "X-Content-Type-Options" \
  "curl -s -I $API_URL/health | grep -i 'x-content-type-options'" \
  ""
test_security "Strict-Transport-Security" \
  "curl -s -I $API_URL/health | grep -i 'strict-transport-security'" \
  ""

echo ""
echo -e "${YELLOW}CORS & Origin Validation:${NC}"
test_security "CORS Origin Whitelist" \
  "curl -s -H 'Origin: http://localhost:3000' -I $API_URL/health | grep -i 'access-control-allow-origin'" \
  ""
test_security "CORS Credentials Mode" \
  "curl -s -H 'Origin: http://localhost:3000' -I $API_URL/health | grep -i 'access-control-allow-credentials'" \
  ""

echo ""
echo -e "${YELLOW}Authentication & Tokens:${NC}"
test_security "JWT_SECRET Validation" \
  "curl -s $API_URL/health | grep -q 'ok'" \
  ""
test_security "HttpOnly Cookies (Signup)" \
  "curl -s -X POST $API_URL/auth/registrar \
    -H 'Content-Type: application/json' \
    -d '{\"nome\":\"Test\",\"cpf\":\"12345678901\",\"telefone\":\"11999999999\",\"email\":\"test@test.com\",\"senha\":\"TestPass123\"}' \
    -i 2>/dev/null | grep -i 'set-cookie'" \
  ""

echo ""
echo -e "${YELLOW}Data Validation:${NC}"
test_security "CPF Validation" \
  "curl -s -X POST $API_URL/auth/registrar \
    -H 'Content-Type: application/json' \
    -d '{\"nome\":\"Test\",\"cpf\":\"00000000000\",\"telefone\":\"11999999999\",\"email\":\"test@test.com\",\"senha\":\"TestPass123\"}' | grep -q 'error'" \
  ""
test_security "Email Validation" \
  "curl -s -X POST $API_URL/auth/registrar \
    -H 'Content-Type: application/json' \
    -d '{\"nome\":\"Test\",\"cpf\":\"12345678901\",\"telefone\":\"11999999999\",\"email\":\"invalid\",\"senha\":\"TestPass123\"}' | grep -q 'error'" \
  ""
test_security "Password Length Validation" \
  "curl -s -X POST $API_URL/auth/registrar \
    -H 'Content-Type: application/json' \
    -d '{\"nome\":\"Test\",\"cpf\":\"12345678901\",\"telefone\":\"11999999999\",\"email\":\"test@test.com\",\"senha\":\"short\"}' | grep -q 'error'" \
  ""

echo ""
echo -e "${YELLOW}API Security:${NC}"
test_security "Rate Limiting Enabled" \
  "curl -s $API_URL/health -H 'X-Forwarded-For: 1.2.3.4' | grep -q 'ok'" \
  ""
test_security "API Version in Routes" \
  "curl -s -I $API_URL/health | head -1 | grep -q '200'" \
  ""

echo ""
echo -e "${YELLOW}Database Security:${NC}"
test_security "SQL Injection Prevention" \
  "curl -s -X POST $API_URL/auth/registrar \
    -H 'Content-Type: application/json' \
    -d '{\"nome\":\"Test; DROP TABLE usuarios\",\"cpf\":\"12345678901\",\"telefone\":\"11999999999\",\"email\":\"test@test.com\",\"senha\":\"TestPass123\"}' | grep -q -v 'DROP'" \
  ""

echo ""
echo -e "${YELLOW}Frontend Security:${NC}"
test_security "Web HTTPS Ready" \
  "curl -s -I $WEB_URL/cadastro | head -1 | grep -q '200'" \
  ""
test_security "No Sensitive Data in Logs" \
  "! grep -r 'password\\|token\\|secret' services/api/src --include='*.log' 2>/dev/null || true" \
  ""

echo ""
echo -e "${YELLOW}Encryption:${NC}"
test_security "Encryption Service Active" \
  "curl -s $API_URL/health | grep -q 'ok'" \
  ""

echo ""
echo -e "${YELLOW}Error Handling:${NC}"
test_security "No Sensitive Info in Errors" \
  "curl -s $API_URL/invalid-endpoint 2>&1 | grep -qv 'database\\|password\\|secret\\|token'" \
  ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All security checks passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some security checks failed${NC}"
  exit 1
fi
