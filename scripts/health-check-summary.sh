#!/bin/bash

################################################################################
# IMOBI STATUS CHECK - Terminal Output
#
# Purpose: Quick status check for terminal/CLI
# Usage: ./scripts/health-check-summary.sh
# Output: Colored status summary
#
################################################################################

set -euo pipefail

API_URL="${API_URL:-https://api.imobi.com.br}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Header
echo -e "${BLUE}=========================================="
echo "IMOBI STATUS CHECK"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "==========================================${NC}"
echo ""

# Function to check service
check_service() {
  local name=$1
  local url=$2
  local expected=$3

  echo -n "$name:     "

  if response=$(curl -s -m 10 "$url" 2>/dev/null); then
    if echo "$response" | grep -q "$expected"; then
      echo -e "${GREEN}✅ OK${NC}"
      return 0
    else
      echo -e "${YELLOW}⚠️  Response unexpected${NC}"
      return 1
    fi
  else
    echo -e "${RED}❌ UNREACHABLE${NC}"
    return 1
  fi
}

# Check API Health
echo -e "${BLUE}CORE SERVICES${NC}"
echo "─────────────────────────────────────────"

api_ok=0
if response=$(curl -s -m 10 "$API_URL/api/v1/health" 2>/dev/null); then
  status=$(echo "$response" | jq -r '.status // "unknown"')

  echo -n "API Overall:    "
  if [ "$status" = "ok" ]; then
    echo -e "${GREEN}✅ OK${NC}"
    api_ok=1
  elif [ "$status" = "degraded" ]; then
    echo -e "${YELLOW}⚠️  DEGRADED${NC}"
    api_ok=1
  else
    echo -e "${RED}❌ ERROR${NC}"
    api_ok=0
  fi

  # Sub-components
  redis_status=$(echo "$response" | jq -r '.redis.status // "unknown"')
  db_configured=$(echo "$response" | jq -r '.database.configured // false')
  email_configured=$(echo "$response" | jq -r '.email.configured // false')

  echo -n "  Redis:        "
  if [ "$redis_status" = "connected" ]; then
    echo -e "${GREEN}✅ Connected${NC}"
  else
    echo -e "${RED}❌ Error${NC}"
  fi

  echo -n "  Database:     "
  if [ "$db_configured" = "true" ]; then
    echo -e "${GREEN}✅ Configured${NC}"
  else
    echo -e "${RED}❌ Not configured${NC}"
  fi

  echo -n "  Email:        "
  if [ "$email_configured" = "true" ]; then
    echo -e "${GREEN}✅ Configured${NC}"
  else
    echo -e "${YELLOW}⚠️  Not configured${NC}"
  fi
else
  echo -e "${RED}❌ API UNREACHABLE${NC}"
  api_ok=0
fi

echo ""

# Summary
echo -e "${BLUE}MONITORING DASHBOARDS${NC}"
echo "─────────────────────────────────────────"
echo "Sentry:       https://sentry.io"
echo "Vercel:       https://vercel.com/contatovinicaetano93-commits/imobi/analytics"
echo "UptimeRobot:  https://uptimerobot.com/dashboard"
echo "API Health:   $API_URL/api/v1/health"
echo ""

# Final status
echo -e "${BLUE}OVERALL STATUS${NC}"
echo "─────────────────────────────────────────"
if [ $api_ok -eq 1 ]; then
  echo -e "${GREEN}🟢 Systems Operational${NC}"
  exit 0
else
  echo -e "${RED}🔴 System Issues Detected${NC}"
  exit 1
fi
