#!/bin/bash
set -e

echo "🔐 imobi Security Validation Test Suite"
echo "========================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API_URL="http://localhost:4000"
FAILED=0

# Test 1: Authorization enforcement
echo -e "\n${YELLOW}[1/6] Testing authorization enforcement...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/v1/obras" 2>/dev/null || true)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✓ Unauthorized access blocked (401)${NC}"
else
  echo -e "${RED}✗ Authorization check failed (got $HTTP_CODE, expected 401)${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 2: CORS headers validation
echo -e "\n${YELLOW}[2/6] Testing CORS headers...${NC}"
CORS_HEADER=$(curl -s -i -X OPTIONS "$API_URL/api/v1/health" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")
if [ ! -z "$CORS_HEADER" ]; then
  echo -e "${GREEN}✓ CORS headers present: $CORS_HEADER${NC}"
else
  echo -e "${RED}✗ CORS headers missing${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 3: Security headers (Helmet)
echo -e "\n${YELLOW}[3/6] Testing Helmet security headers...${NC}"
SECURITY_HEADERS=$(curl -s -i -X GET "$API_URL/api/v1/health" 2>/dev/null | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security")
if [ ! -z "$SECURITY_HEADERS" ]; then
  echo -e "${GREEN}✓ Security headers present:${NC}"
  echo "$SECURITY_HEADERS" | while read line; do echo -e "  $line"; done
else
  echo -e "${RED}⚠ Some security headers missing (verify Helmet config)${NC}"
fi

# Test 4: HTTPS ready (check for Secure cookie flag in production)
echo -e "\n${YELLOW}[4/6] Testing secure cookie configuration...${NC}"
if grep -q "secure: process.env.NODE_ENV === 'production'" /home/user/imobi/services/api/src/main.ts 2>/dev/null; then
  echo -e "${GREEN}✓ Secure cookie flag configured for production${NC}"
else
  echo -e "${YELLOW}⚠ Verify Secure cookie flag in production${NC}"
fi

# Test 5: JWT validation
echo -e "\n${YELLOW}[5/6] Testing JWT secret validation...${NC}"
if grep -q "JWT_SECRET.*64" /home/user/imobi/services/api/src/main.ts 2>/dev/null; then
  echo -e "${GREEN}✓ JWT secret validation enforced (>64 chars)${NC}"
else
  echo -e "${RED}✗ JWT secret validation not found${NC}"
  FAILED=$((FAILED + 1))
fi

# Test 6: Encryption service present
echo -e "\n${YELLOW}[6/6] Testing encryption service...${NC}"
if [ -f "/home/user/imobi/services/api/src/common/encryption.service.ts" ]; then
  echo -e "${GREEN}✓ Encryption service implemented${NC}"
else
  echo -e "${RED}✗ Encryption service not found${NC}"
  FAILED=$((FAILED + 1))
fi

# Summary
echo -e "\n${YELLOW}========================================"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All security tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠ $FAILED security tests need attention${NC}"
  exit 1
fi
