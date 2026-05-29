#!/bin/bash

set -euo pipefail

# IMOBI Cutover Health Check Script
#
# Propósito: Monitorar saúde de componentes críticos durante cutover
# Uso: ./cutover-health-check.sh
#
# Variáveis de ambiente (opcionais):
#   API_URL         — URL da API (default: https://api.imobi.com.br)
#   CHECK_INTERVAL  — Intervalo entre checks em segundos (default: 5)
#   S3_BUCKET       — S3 bucket para verificar (default: imbobi-evidencias-prod)
#   ALERT_WEBHOOK   — Slack webhook para alertas (opcional)

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuração
API_URL="${API_URL:-https://api.imobi.com.br}"
CHECK_INTERVAL="${CHECK_INTERVAL:-5}"
S3_BUCKET="${S3_BUCKET:-imbobi-evidencias-prod}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

# Estado anterior (para detectar mudanças)
PREV_STATUS=""
CHECK_COUNT=0
START_TIME=$(date +%s)

log_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}IMOBI Cutover Health Check — $(date '+%Y-%m-%d %H:%M:%S %Z')${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"
}

check_api_health() {
  echo -n "  API Health ($API_URL/health): "

  if response=$(curl -s -m 5 "$API_URL/health" 2>/dev/null); then
    if echo "$response" | jq -e '.status' > /dev/null 2>&1; then
      status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "unknown")
      if [ "$status" = "ok" ] || [ "$status" = "degraded" ]; then
        echo -e "${GREEN}✅ $status${NC}"
        return 0
      else
        echo -e "${RED}❌ status=$status${NC}"
        return 1
      fi
    else
      echo -e "${RED}❌ invalid JSON${NC}"
      return 1
    fi
  else
    echo -e "${RED}❌ timeout/connection error${NC}"
    return 1
  fi
}

check_database() {
  echo -n "  Database connectivity: "

  if response=$(curl -s -m 5 "$API_URL/health" 2>/dev/null); then
    if echo "$response" | jq -e '.database.configured == true' > /dev/null 2>&1; then
      echo -e "${GREEN}✅ Connected${NC}"
      return 0
    else
      echo -e "${RED}❌ Not configured${NC}"
      return 1
    fi
  else
    echo -e "${RED}❌ Failed to check${NC}"
    return 1
  fi
}

check_redis() {
  echo -n "  Redis cache: "

  if response=$(curl -s -m 5 "$API_URL/health" 2>/dev/null); then
    redis_status=$(echo "$response" | jq -r '.redis.status' 2>/dev/null || echo "unknown")
    if [ "$redis_status" = "connected" ]; then
      echo -e "${GREEN}✅ Connected${NC}"
      return 0
    else
      redis_error=$(echo "$response" | jq -r '.redis.error // "unknown error"' 2>/dev/null)
      echo -e "${RED}❌ $redis_error${NC}"
      return 1
    fi
  else
    echo -e "${RED}❌ Failed to check${NC}"
    return 1
  fi
}

check_s3() {
  echo -n "  S3 bucket ($S3_BUCKET): "

  if aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    echo -e "${GREEN}✅ Accessible${NC}"
    return 0
  else
    echo -e "${RED}❌ Not accessible${NC}"
    return 1
  fi
}

check_dns() {
  echo -n "  DNS resolution (api.imobi.com.br): "

  if nslookup api.imobi.com.br > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Resolved${NC}"
    return 0
  else
    echo -e "${RED}❌ Failed${NC}"
    return 1
  fi
}

check_web() {
  echo -n "  Web frontend (https://imobi.com.br): "

  http_code=$(curl -s -m 5 -o /dev/null -w "%{http_code}" "https://imobi.com.br" 2>/dev/null || echo "000")

  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✅ 200 OK${NC}"
    return 0
  else
    echo -e "${RED}❌ HTTP $http_code${NC}"
    return 1
  fi
}

determine_status() {
  local api=0 db=0 redis=0 s3=0 dns=0 web=0

  check_api_health && api=1 || api=0
  check_database && db=1 || db=0
  check_redis && redis=1 || redis=0
  check_s3 && s3=1 || s3=0
  check_dns && dns=1 || dns=0
  check_web && web=1 || web=0

  local total=$((api + db + redis + s3 + dns + web))

  echo ""

  if [ $total -eq 6 ]; then
    echo -e "${GREEN}🟢 ALL SYSTEMS OPERATIONAL ($total/6)${NC}"
    return 0
  elif [ $total -ge 4 ]; then
    echo -e "${YELLOW}🟡 DEGRADED ($total/6 checks passing)${NC}"
    return 1
  else
    echo -e "${RED}🔴 CRITICAL ($total/6 checks passing)${NC}"
    return 2
  fi
}

send_slack_alert() {
  local status=$1
  local message=$2

  if [ -n "$ALERT_WEBHOOK" ]; then
    local color="warning"
    local emoji="🟡"

    case "$status" in
      ok)
        color="good"
        emoji="🟢"
        ;;
      critical)
        color="danger"
        emoji="🔴"
        ;;
    esac

    curl -s -X POST "$ALERT_WEBHOOK" \
      -H 'Content-type: application/json' \
      -d "{
        \"attachments\": [{
          \"color\": \"$color\",
          \"title\": \"$emoji imobi Health Check Alert\",
          \"text\": \"$message\",
          \"footer\": \"Cutover 2026-06-02\",
          \"ts\": $(date +%s)
        }]
      }" > /dev/null
  fi
}

print_stats() {
  local elapsed=$(($(date +%s) - START_TIME))
  local minutes=$((elapsed / 60))
  local seconds=$((elapsed % 60))

  echo ""
  echo -e "${BLUE}Stats:${NC}"
  echo "  Checks completed: $CHECK_COUNT"
  echo "  Uptime: ${minutes}m ${seconds}s"
  echo "  Next check in: ${CHECK_INTERVAL}s"
  echo "  Next check at: $(date -u -d "+${CHECK_INTERVAL} seconds" '+%H:%M:%S %Z')"
}

main() {
  echo -e "${GREEN}Starting health check loop${NC}"
  echo "API URL: $API_URL"
  echo "Check interval: ${CHECK_INTERVAL}s"
  echo "Press Ctrl+C to stop"
  echo ""

  while true; do
    clear
    log_header

    CHECK_COUNT=$((CHECK_COUNT + 1))

    determine_status
    status_code=$?

    # Map status code to string
    case $status_code in
      0) current_status="ok" ;;
      1) current_status="degraded" ;;
      2) current_status="critical" ;;
    esac

    # Alert only on state change
    if [ "$PREV_STATUS" != "$current_status" ]; then
      send_slack_alert "$current_status" "Status changed from '$PREV_STATUS' to '$current_status'"
    fi

    PREV_STATUS="$current_status"

    print_stats

    sleep "$CHECK_INTERVAL"
  done
}

# Executar
main "$@"
