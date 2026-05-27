#!/bin/bash
set -euo pipefail

API_URL="${1:-https://staging-api.imbobi.com}"
TIMEOUT=30
MAX_RETRIES=5
RETRY_DELAY=2

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Staging Health Check Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo "API URL: $API_URL"
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

check_health() {
    local name="$1"
    local url="$2"
    local method="${3:-GET}"
    local body="${4:-}"
    local expected_code="${5:-200}"
    
    echo -n "▶ $name ... "
    
    for attempt in $(seq 1 $MAX_RETRIES); do
        if [ "$method" = "POST" ] && [ -n "$body" ]; then
            response=$(curl -s -w "\n%{http_code}" \
                -X "$method" \
                "$url" \
                -H "Content-Type: application/json" \
                -d "$body" \
                --max-time "$TIMEOUT" 2>/dev/null || echo -e "\n000")
        else
            response=$(curl -s -w "\n%{http_code}" \
                -X "$method" \
                "$url" \
                --max-time "$TIMEOUT" 2>/dev/null || echo -e "\n000")
        fi
        
        http_code=$(echo "$response" | tail -n1)
        body_content=$(echo "$response" | sed '$d')
        
        if [ "$http_code" = "$expected_code" ]; then
            echo -e "${GREEN}OK${NC} (HTTP $http_code)"
            CHECKS_PASSED=$((CHECKS_PASSED + 1))
            return 0
        fi
        
        if [ "$attempt" -lt "$MAX_RETRIES" ]; then
            echo -n "retry($attempt/$MAX_RETRIES)... "
            sleep "$RETRY_DELAY"
        fi
    done
    
    echo -e "${RED}FAILED${NC} (HTTP $http_code)"
    echo "  Response: ${body_content:0:100}"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    return 1
}

echo -e "${YELLOW}[API]${NC}"
check_health "API Health" "$API_URL/api/v1/health" "GET" "" "200"
check_health "API Status" "$API_URL/api/v1/status" "GET" "" "200"

echo ""
echo -e "${YELLOW}[Database]${NC}"
check_health "Database Connection" "$API_URL/api/v1/health/database" "GET" "" "200"

echo ""
echo -e "${YELLOW}[Cache/Queue]${NC}"
check_health "Redis Connection" "$API_URL/api/v1/health/redis" "GET" "" "200"

echo ""
echo -e "${YELLOW}[Email Service]${NC}"
check_health "Email Service" "$API_URL/api/v1/health/email" "GET" "" "200"

echo ""
echo -e "${YELLOW}[Push Notifications]${NC}"
check_health "Firebase Initialization" "$API_URL/api/v1/health/firebase" "GET" "" "200"

echo ""
echo -e "${YELLOW}[External Integrations]${NC}"
check_health "S3 Configuration" "$API_URL/api/v1/health/s3" "GET" "" "200"
check_health "Encryption Service" "$API_URL/api/v1/health/encryption" "GET" "" "200"

echo ""
echo -e "${BLUE}========================================${NC}"
TOTAL=$((CHECKS_PASSED + CHECKS_FAILED))
PASS_RATE=$((CHECKS_PASSED * 100 / TOTAL))

echo "✓ Passed: $CHECKS_PASSED / $TOTAL ($PASS_RATE%)"

if [ "$CHECKS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ All health checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $CHECKS_FAILED check(s) failed${NC}"
    exit 1
fi
