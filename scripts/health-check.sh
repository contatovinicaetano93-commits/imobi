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

# Check for bc availability, provide fallback for floating point comparisons
# bc is preferred but not required - we use bash arithmetic as fallback
float_compare() {
    # Compare two floats: $1 operator $2
    # Operators: lt, le, gt, ge, eq, ne
    local num1=$1 op=$2 num2=$3

    if command -v bc >/dev/null 2>&1; then
        case "$op" in
            lt) [ "$(echo "$num1 < $num2" | bc -l)" = "1" ] && return 0 || return 1 ;;
            le) [ "$(echo "$num1 <= $num2" | bc -l)" = "1" ] && return 0 || return 1 ;;
            gt) [ "$(echo "$num1 > $num2" | bc -l)" = "1" ] && return 0 || return 1 ;;
            ge) [ "$(echo "$num1 >= $num2" | bc -l)" = "1" ] && return 0 || return 1 ;;
            eq) [ "$(echo "$num1 == $num2" | bc -l)" = "1" ] && return 0 || return 1 ;;
            ne) [ "$(echo "$num1 != $num2" | bc -l)" = "1" ] && return 0 || return 1 ;;
        esac
    else
        # Fallback using bash arithmetic (integer comparison)
        # Convert floats to integers by removing decimal point
        num1=${num1%.*}
        num2=${num2%.*}
        case "$op" in
            lt) [ "$num1" -lt "$num2" ] && return 0 || return 1 ;;
            le) [ "$num1" -le "$num2" ] && return 0 || return 1 ;;
            gt) [ "$num1" -gt "$num2" ] && return 0 || return 1 ;;
            ge) [ "$num1" -ge "$num2" ] && return 0 || return 1 ;;
            eq) [ "$num1" -eq "$num2" ] && return 0 || return 1 ;;
            ne) [ "$num1" -ne "$num2" ] && return 0 || return 1 ;;
        esac
    fi
}

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
        if float_compare "$ERROR_RATE" "lt" "1"; then
            echo -e "${GREEN}✓ ${ERROR_RATE}%${NC}"
            HEALTHY=$((HEALTHY+1))
        elif float_compare "$ERROR_RATE" "lt" "5"; then
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
