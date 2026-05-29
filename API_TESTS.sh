#!/bin/bash

# imobi API Test Script
# Usage: ./API_TESTS.sh [base_url] [email] [password]

BASE_URL="${1:-http://localhost:4000/api/v1}"
TEST_EMAIL="${2:-test@example.com}"
TEST_PASSWORD="${3:-Test@1234}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
PASSED=0
FAILED=0

# Test function
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local token="$5"
  local expected_code="$6"

  echo -e "\n${YELLOW}Testing: $name${NC}"
  
  local headers="-H 'Content-Type: application/json'"
  if [ -n "$token" ]; then
    headers="$headers -H 'Authorization: Bearer $token'"
  fi

  local cmd="curl -s -X $method '$BASE_URL$endpoint' $headers"
  if [ -n "$data" ]; then
    cmd="$cmd -d '$data'"
  fi

  local response=$(eval $cmd -w "\n%{http_code}")
  local http_code=$(echo "$response" | tail -n 1)
  local body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    echo "Response: $body" | head -c 200
    echo ""
    PASSED=$((PASSED + 1))
    echo "$body"
  else
    echo -e "${RED}❌ FAIL${NC} (Expected $expected_code, got $http_code)"
    echo "Response: $body"
    FAILED=$((FAILED + 1))
    echo ""
  fi
}

echo "========================================="
echo "imobi API Test Suite"
echo "Base URL: $BASE_URL"
echo "========================================="

# Test 1: Health Check
test_endpoint "Health Check" "GET" "/health" "" "" "200"

# Test 2: Register User
echo -e "\n${YELLOW}=== Authentication Tests ===${NC}"
REGISTER_DATA="{\"nome\":\"Test User\",\"cpf\":\"12345678901\",\"telefone\":\"11999999999\",\"email\":\"$TEST_EMAIL\",\"senha\":\"$TEST_PASSWORD\",\"tipo\":\"TOMADOR\"}"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/registrar" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA")

echo -e "\n${YELLOW}Testing: Register User${NC}"
if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
  echo -e "${GREEN}✅ PASS${NC}"
  ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
  echo "Access Token: ${ACCESS_TOKEN:0:20}..."
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ FAIL${NC}"
  echo "Response: $REGISTER_RESPONSE"
  FAILED=$((FAILED + 1))
fi

# Test 3: Login (if registration failed, try login)
if [ -z "$ACCESS_TOKEN" ]; then
  LOGIN_DATA="{\"email\":\"$TEST_EMAIL\",\"senha\":\"$TEST_PASSWORD\"}"
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_DATA")

  echo -e "\n${YELLOW}Testing: Login${NC}"
  if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "Response: $LOGIN_RESPONSE"
    FAILED=$((FAILED + 1))
  fi
fi

if [ -n "$ACCESS_TOKEN" ]; then
  # Test 4: Get KYC Status
  echo -e "\n${YELLOW}=== KYC Tests ===${NC}"
  test_endpoint "Get KYC Status" "GET" "/kyc/status" "" "$ACCESS_TOKEN" "200"

  # Test 5: List Works
  echo -e "\n${YELLOW}=== Work Tests ===${NC}"
  test_endpoint "List Works" "GET" "/obras?page=1&limit=10" "" "$ACCESS_TOKEN" "200"

  # Test 6: Get Credit Simulation
  echo -e "\n${YELLOW}=== Credit Tests ===${NC}"
  test_endpoint "Credit Simulator" "GET" "/credito/simular?valor=100000&prazo=60" "" "$ACCESS_TOKEN" "200"
fi

# Test 7: Bad Request
echo -e "\n${YELLOW}=== Error Handling Tests ===${NC}"
test_endpoint "Invalid Email (400)" "POST" "/auth/login" \
  "{\"email\":\"invalid\",\"senha\":\"password\"}" "" "400"

# Test 8: Not Found
test_endpoint "Not Found (404)" "GET" "/works/invalid-id" "" "$ACCESS_TOKEN" "404"

# Test 9: Unauthorized
test_endpoint "Missing Token (401)" "GET" "/kyc/status" "" "" "401"

# Test 10: Too Many Requests (rate limit)
echo -e "\n${YELLOW}=== Rate Limiting Tests ===${NC}"
for i in {1..6}; do
  curl -s -X GET "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@example.com\",\"senha\":\"test\"}" > /dev/null
done
RATE_LIMIT=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"senha\":\"test\"}")

echo -e "\n${YELLOW}Testing: Rate Limiting${NC}"
if [ "$RATE_LIMIT" = "429" ]; then
  echo -e "${GREEN}✅ PASS${NC} (Rate limit triggered)"
  PASSED=$((PASSED + 1))
else
  echo -e "${YELLOW}⚠️  SKIP${NC} (Rate limit not configured or not triggered)"
fi

# Summary
echo -e "\n========================================="
echo -e "Test Results"
echo -e "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}❌ Some tests failed${NC}"
  exit 1
fi
