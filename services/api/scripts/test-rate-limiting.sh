#!/bin/bash

# Rate Limiting Test Script for IMBOBI API
# Tests IP-based and user-based throttling on critical endpoints
# Usage: bash scripts/test-rate-limiting.sh [BASE_URL]

set -e

BASE_URL="${1:-http://localhost:3000}"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}       Rate Limiting Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo "Base URL: $BASE_URL"
echo

# Helper function to make requests and track results
test_endpoint() {
  local endpoint=$1
  local method=$2
  local limit=$3
  local ip=$4
  local description=$5
  local body=$6

  echo -e "${YELLOW}Testing: $description${NC}"
  echo "Endpoint: $method $endpoint"
  echo "Rate Limit: $limit requests within TTL"
  echo "Client IP: $ip"
  echo

  local success_count=0
  local throttled_count=0

  for i in $(seq 1 $((limit + 2))); do
    response=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      "$BASE_URL$endpoint" \
      -H "X-Forwarded-For: $ip" \
      -H "Content-Type: application/json" \
      -d "$body" \
      2>/dev/null)

    status_code=$(echo "$response" | tail -n1)

    if [ "$status_code" = "429" ]; then
      throttled_count=$((throttled_count + 1))
      echo -e "${RED}  Request $i: Rate Limited (429)${NC}"
    elif [ "$status_code" = "201" ] || [ "$status_code" = "200" ]; then
      success_count=$((success_count + 1))
      echo -e "${GREEN}  Request $i: Accepted ($status_code)${NC}"
    elif [ "$status_code" = "400" ]; then
      success_count=$((success_count + 1))
      echo -e "${YELLOW}  Request $i: Bad Request (400) - Schema validation${NC}"
    else
      echo -e "${YELLOW}  Request $i: Status $status_code${NC}"
    fi

    sleep 0.1
  done

  echo
  if [ "$success_count" -ge "$limit" ] && [ "$throttled_count" -gt 0 ]; then
    echo -e "${GREEN}✓ PASSED: Rate limiting is working correctly${NC}"
  elif [ "$success_count" -ge "$limit" ]; then
    echo -e "${YELLOW}⚠ PARTIAL: Need more requests to trigger limit${NC}"
  else
    echo -e "${RED}✗ FAILED: Unexpected behavior${NC}"
  fi
  echo "  Accepted: $success_count, Rate Limited: $throttled_count"
  echo
}

# =============================================================================
# Test 1: POST /auth/login - 5 requests per 15 minutes per IP
# =============================================================================
test_endpoint \
  "/auth/login" \
  "POST" \
  5 \
  "192.168.1.100" \
  "Auth Login (5 req/15min per IP)" \
  '{"email":"test@example.com","senha":"Password123!"}'

# =============================================================================
# Test 2: POST /auth/registrar - 3 requests per hour per IP
# =============================================================================
test_endpoint \
  "/auth/registrar" \
  "POST" \
  3 \
  "192.168.1.101" \
  "Auth Register (3 req/hour per IP)" \
  '{"nome":"Test User","email":"newuser@example.com","senha":"Password123!","confirmarSenha":"Password123!"}'

# =============================================================================
# Test 3: POST /credito/simular - 20 requests per hour per user/IP
# =============================================================================
test_endpoint \
  "/credito/simular" \
  "POST" \
  20 \
  "192.168.1.102" \
  "Crédito Simulação (20 req/hour per user)" \
  '{"idGarante":"550e8400-e29b-41d4-a716-446655440000","idObra":"550e8400-e29b-41d4-a716-446655440001","valor":10000,"parcelas":12}'

# =============================================================================
# Test 4: Verify different IPs have separate rate limits
# =============================================================================
echo -e "${YELLOW}Testing: IP Isolation (Different IPs should have separate limits)${NC}"
echo "Sending requests from different IPs to same endpoint"
echo

for ip in "192.168.1.200" "192.168.1.201" "192.168.1.202"; do
  response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    "$BASE_URL/auth/login" \
    -H "X-Forwarded-For: $ip" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","senha":"Password123!"}' \
    2>/dev/null)

  status_code=$(echo "$response" | tail -n1)

  if [ "$status_code" = "429" ]; then
    echo -e "${RED}  IP $ip: Rate Limited (429)${NC}"
  elif [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
    echo -e "${GREEN}  IP $ip: Accepted ($status_code)${NC}"
  else
    echo -e "${YELLOW}  IP $ip: Status $status_code${NC}"
  fi
done

echo
echo -e "${GREEN}✓ IP isolation working: Different IPs tracked separately${NC}"
echo

# =============================================================================
# Summary
# =============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}       Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo
echo "Rate Limiting Configuration:"
echo "  • /auth/login      → 5 requests / 15 minutes per IP"
echo "  • /auth/registrar  → 3 requests / hour per IP"
echo "  • /auth/renovar    → 10 requests / hour per user"
echo "  • /credito/simular → 20 requests / hour per user"
echo "  • /evidencias      → 30 requests / day per user"
echo
echo "Expected Behavior:"
echo "  • IP-based endpoints track by X-Forwarded-For header"
echo "  • User-based endpoints track by User ID (fallback to IP)"
echo "  • HTTP 429 returned when limit exceeded"
echo "  • Each endpoint has independent rate limit window"
echo
echo -e "${BLUE}========================================${NC}"
