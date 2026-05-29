#!/bin/bash

# imobi — Health Check Script
# Verifies all critical services are healthy
# Usage: ./health-check.sh [api_url] [interval]
# Example: ./health-check.sh http://api.imobi.com 30

API_URL="${1:-http://localhost:4000}"
INTERVAL="${2:-0}"  # 0 = run once, >0 = run every N seconds
TIMEOUT=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
HEALTHY=0
WARNINGS=0
CRITICAL=0

run_checks() {
    HEALTHY=0
    WARNINGS=0
    CRITICAL=0

    echo -e "${GREEN}=== imobi Health Check ===${NC}"
    echo "Time: $(date +'%Y-%m-%d %H:%M:%S')"
    echo "API URL: $API_URL"
    echo

    # 1. API Health
    echo -n "🔧 API Health... "
    if curl -s --connect-timeout $TIMEOUT "$API_URL/api/v1/health" > /tmp/health.json 2>&1; then
        STATUS=$(jq -r '.status' /tmp/health.json 2>/dev/null || echo "unknown")
        if [ "$STATUS" = "ok" ]; then
            echo -e "${GREEN}✓ OK${NC}"
            HEALTHY=$((HEALTHY+1))
        else
            echo -e "${YELLOW}⚠ Degraded${NC}"
            WARNINGS=$((WARNINGS+1))
        fi
    else
        echo -e "${RED}✗ FAILED${NC}"
        CRITICAL=$((CRITICAL+1))
    fi

    # 2. Database Status
    echo -n "🗄️  Database... "
    if curl -s --connect-timeout $TIMEOUT "$API_URL/api/v1/health" 2>/dev/null | jq -e '.database == "connected"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Connected${NC}"
        HEALTHY=$((HEALTHY+1))
    else
        echo -e "${YELLOW}⚠ Disconnected${NC}"
        WARNINGS=$((WARNINGS+1))
    fi

    # 3. Redis Status
    echo -n "💾 Redis Cache... "
    if curl -s --connect-timeout $TIMEOUT "$API_URL/api/v1/health" 2>/dev/null | jq -e '.redis == "connected"' > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Connected${NC}"
        HEALTHY=$((HEALTHY+1))
    else
        echo -e "${YELLOW}⚠ Disconnected${NC}"
        WARNINGS=$((WARNINGS+1))
    fi

    # 4. Response Time
    echo -n "⏱️  Response Time... "
    START=$(date +%s%N)
    curl -s --connect-timeout $TIMEOUT "$API_URL/api/v1/health" > /dev/null 2>&1
    END=$(date +%s%N)
    LATENCY=$(( (END - START) / 1000000 ))

    if [ $LATENCY -lt 1000 ]; then
        echo -e "${GREEN}✓ ${LATENCY}ms${NC}"
        HEALTHY=$((HEALTHY+1))
    elif [ $LATENCY -lt 3000 ]; then
        echo -e "${YELLOW}⚠ ${LATENCY}ms${NC}"
        WARNINGS=$((WARNINGS+1))
    else
        echo -e "${RED}✗ ${LATENCY}ms${NC}"
        CRITICAL=$((CRITICAL+1))
    fi

    # 5. Error Rate
    echo -n "📊 Error Rate... "
    ERROR_RATE=$(curl -s --connect-timeout $TIMEOUT "$API_URL/api/v1/metrics" 2>/dev/null | jq -r '.error_rate' 2>/dev/null || echo "unknown")
    if [ "$ERROR_RATE" != "unknown" ]; then
        if (( $(echo "$ERROR_RATE < 1" | bc -l 2>/dev/null || echo "1") )); then
            echo -e "${GREEN}✓ ${ERROR_RATE}%${NC}"
            HEALTHY=$((HEALTHY+1))
        elif (( $(echo "$ERROR_RATE < 5" | bc -l 2>/dev/null || echo "1") )); then
            echo -e "${YELLOW}⚠ ${ERROR_RATE}%${NC}"
            WARNINGS=$((WARNINGS+1))
        else
            echo -e "${RED}✗ ${ERROR_RATE}%${NC}"
            CRITICAL=$((CRITICAL+1))
        fi
    else
        echo -e "${YELLOW}⚠ Unknown${NC}"
        WARNINGS=$((WARNINGS+1))
    fi

    echo
    echo "Summary:"
    echo -e "  ${GREEN}✓ Healthy: $HEALTHY${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "  ${YELLOW}⚠ Warnings: $WARNINGS${NC}"
    fi
    if [ $CRITICAL -gt 0 ]; then
        echo -e "  ${RED}✗ Critical: $CRITICAL${NC}"
    fi
    echo

    # Determine exit code
    if [ $CRITICAL -gt 0 ]; then
        return 2
    elif [ $WARNINGS -gt 0 ]; then
        return 1
    else
        return 0
    fi
}

# Main loop
if [ "$INTERVAL" -gt 0 ]; then
    while true; do
        clear
        run_checks
        sleep "$INTERVAL"
    done
else
    run_checks
    exit $?
fi
