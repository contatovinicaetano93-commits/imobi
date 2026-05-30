#!/bin/bash
# Monitor Vercel build in real-time
# Usage: ./scripts/monitor-vercel-build.sh
# Requires: jq, curl installed

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'

# Project config
PROJECT_JSON=".vercel/project.json"
if [ ! -f "$PROJECT_JSON" ]; then
  echo -e "${RED}Error: $PROJECT_JSON not found${NC}"
  echo "Run 'vercel link' first"
  exit 1
fi

PROJECT_ID=$(jq -r '.projectId' "$PROJECT_JSON")
TEAM_ID=$(jq -r '.teamId // .orgId' "$PROJECT_JSON")

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Vercel Build Monitor${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GRAY}Project: $PROJECT_ID${NC}"
echo -e "${GRAY}Team: $TEAM_ID${NC}"
echo ""

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  VERCEL_TOKEN not set. Using 'vercel' CLI instead of API.${NC}"
  echo -e "${YELLOW}    (API would be faster, but CLI works too)${NC}"
  echo ""
  USE_CLI=true
else
  USE_CLI=false
fi

# Function to get latest build status via API
get_build_status_api() {
  curl -s "https://api.vercel.com/v6/deployments?projectId=$PROJECT_ID&teamId=$TEAM_ID&limit=1" \
    -H "Authorization: Bearer $VERCEL_TOKEN" | jq '.deployments[0]'
}

# Function to get build status via CLI
get_build_status_cli() {
  vercel deployments list --project="$PROJECT_ID" 1 | tail -1
}

# Function to format timestamp
format_time() {
  date -d @"$(($1 / 1000))" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "N/A"
}

# Function to get pretty status
get_status_emoji() {
  local status=$1
  case "$status" in
    READY) echo -e "${GREEN}✅ Ready${NC}" ;;
    BUILDING) echo -e "${YELLOW}⏳ Building${NC}" ;;
    QUEUED) echo -e "${GRAY}⏱️  Queued${NC}" ;;
    ERROR) echo -e "${RED}❌ Error${NC}" ;;
    CANCELED) echo -e "${RED}⛔ Canceled${NC}" ;;
    *) echo -e "${GRAY}❓ $status${NC}" ;;
  esac
}

# Monitoring loop
LAST_STATUS=""
POLL_INTERVAL=5
TIMEOUT=300  # 5 minutes max wait
ELAPSED=0

echo -e "${YELLOW}Waiting for build to appear...${NC}"
echo ""

while [ $ELAPSED -lt $TIMEOUT ]; do
  if [ "$USE_CLI" = true ]; then
    BUILD_INFO=$(get_build_status_cli)
  else
    BUILD_INFO=$(get_build_status_api)
  fi

  if [ -n "$BUILD_INFO" ]; then
    # Extract status
    if [ "$USE_CLI" = true ]; then
      STATUS=$(echo "$BUILD_INFO" | awk '{print $2}')
      CREATED=$(echo "$BUILD_INFO" | awk '{print $3, $4}')
    else
      STATUS=$(echo "$BUILD_INFO" | jq -r '.state' 2>/dev/null || echo "UNKNOWN")
      CREATED=$(echo "$BUILD_INFO" | jq -r '.createdAt' 2>/dev/null || echo "N/A")
    fi

    # Display only on status change
    if [ "$STATUS" != "$LAST_STATUS" ]; then
      LAST_STATUS="$STATUS"
      echo -e "$(get_status_emoji "$STATUS") — $(format_time "${CREATED:-$(date +%s%3N)}")"
    fi

    # Check if build completed
    if [ "$STATUS" = "READY" ]; then
      echo ""
      echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
      echo -e "${GREEN}✅ BUILD SUCCESSFUL!${NC}"
      echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
      echo ""
      echo -e "Build completed at: $(format_time "${CREATED:-$(date +%s%3N)}")"
      echo ""
      echo -e "${YELLOW}Next Steps:${NC}"
      echo "  1. Verify deployment: https://vercel.com/contatovinicaetano93-commits/imobi"
      echo "  2. Test preview URL: https://imobi.vercel.app"
      echo "  3. Check Sentry for errors: https://sentry.io"
      echo "  4. Run: ./scripts/validate-vercel-env.sh"
      echo ""
      exit 0
    elif [ "$STATUS" = "ERROR" ] || [ "$STATUS" = "CANCELED" ]; then
      echo ""
      echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
      echo -e "${RED}❌ BUILD FAILED!${NC}"
      echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
      echo ""
      echo -e "Status: $STATUS"
      echo -e "${YELLOW}Troubleshooting:${NC}"
      echo "  1. Check Vercel dashboard: https://vercel.com/contatovinicaetano93-commits/imobi"
      echo "  2. Review build logs for error details"
      echo "  3. Common fixes:"
      echo "     - Verify all 12 env vars are configured"
      echo "     - Check AWS/SendGrid/Sentry credentials"
      echo "     - Run: ./scripts/validate-vercel-env.sh"
      echo ""
      exit 1
    fi
  fi

  # Sleep and update elapsed time
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))
  echo -ne "${GRAY}Polling... (${ELAPSED}s)${NC}\r"
done

echo ""
echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
echo -e "${RED}⏱️  TIMEOUT: Build did not complete in 5 minutes${NC}"
echo -e "${RED}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Check the Vercel dashboard:${NC}"
echo "  https://vercel.com/contatovinicaetano93-commits/imobi"
echo ""
exit 2
