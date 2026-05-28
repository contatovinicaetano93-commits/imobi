#!/bin/bash
# Health Check Script for imbobi API
# This script checks the API health status every minute
# Usage: ./health-check.sh or add to crontab: * * * * * /path/to/health-check.sh

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
HEALTH_ENDPOINT="${API_URL}/api/v1/health"
LOG_FILE="${LOG_FILE:-/tmp/health-check.log}"
TIMEOUT="${TIMEOUT:-10}"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Perform health check
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/health-check-response.json --max-time "$TIMEOUT" "$HEALTH_ENDPOINT")
RESPONSE=$(cat /tmp/health-check-response.json 2>/dev/null || echo "")

# Log result
if [ "$HTTP_CODE" = "200" ]; then
  STATUS="SUCCESS"
  HEALTH_STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  REDIS_STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | head -2 | tail -1 | cut -d'"' -f4)

  LOG_ENTRY="$TIMESTAMP | $STATUS | HTTP $HTTP_CODE | Status: $HEALTH_STATUS | Redis: $REDIS_STATUS"
else
  STATUS="FAILED"
  LOG_ENTRY="$TIMESTAMP | $STATUS | HTTP $HTTP_CODE | Response: $RESPONSE"
fi

# Append to log with timestamp
echo "$LOG_ENTRY" >> "$LOG_FILE"

# Keep log file manageable (keep last 10000 lines = ~7 days at 1 check/min)
if [ $(wc -l < "$LOG_FILE") -gt 10000 ]; then
  tail -10000 "$LOG_FILE" > "${LOG_FILE}.tmp"
  mv "${LOG_FILE}.tmp" "$LOG_FILE"
fi

# Exit with appropriate code
[ "$HTTP_CODE" = "200" ] && exit 0 || exit 1
