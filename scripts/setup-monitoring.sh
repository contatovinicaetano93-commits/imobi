#!/bin/bash

# Imobi MVP - Monitoring Setup Script
# Configures Sentry, UptimeRobot, and Prometheus monitoring
# Usage: bash scripts/setup-monitoring.sh <api-url>

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📊 Imobi MVP - Monitoring Setup${NC}\n"

API_URL="${1:-}"

if [ -z "$API_URL" ]; then
  read -p "Enter API URL (default: https://imobi-api-staging.onrender.com): " API_URL
  API_URL="${API_URL:-https://imobi-api-staging.onrender.com}"
fi

echo -e "${BLUE}🔧 Monitoring Options${NC}\n"
echo "1. Sentry (error tracking) - Optional, recommended"
echo "2. UptimeRobot (uptime monitoring) - Optional, recommended"
echo "3. Prometheus (metrics collection) - Already enabled"
echo ""

# Option 1: Sentry Setup
read -p "Setup Sentry error tracking? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}📝 Sentry Setup${NC}"
  echo ""
  echo "Steps:"
  echo "1. Go to https://sentry.io"
  echo "2. Sign up / Login"
  echo "3. Create new project: Node.js"
  echo "4. Copy the DSN (looks like: https://xxx@sentry.io/xxx)"
  echo ""
  read -p "Paste Sentry DSN: " SENTRY_DSN

  if [ -n "$SENTRY_DSN" ]; then
    echo -e "${YELLOW}Manual Step:${NC}"
    echo "1. Add SENTRY_DSN to .env.render.local"
    echo "2. Run: pnpm render:env:push"
    echo "   Or set in Render dashboard → imobi-api-staging → Environment"
    echo "3. Redeploy: pnpm render:redeploy"
    echo ""
    read -p "Press Enter when Sentry is configured..."
    echo -e "${GREEN}✓${NC} Sentry configured"
  fi
fi

# Option 2: UptimeRobot Setup
read -p "Setup UptimeRobot monitoring? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${BLUE}📝 UptimeRobot Setup${NC}"
  echo ""
  echo "Steps:"
  echo "1. Go to https://uptime.robot"
  echo "2. Sign up / Login"
  echo "3. Click 'Add New Monitor'"
  echo "4. Monitor Type: HTTP(S)"
  echo "5. URL: ${API_URL}/health"
  echo "6. Monitoring Interval: Every 5 minutes"
  echo "7. Acceptable Status Codes: 200"
  echo "8. Alert Contacts: (your email)"
  echo "9. Save Monitor"
  echo ""
  read -p "Press Enter when UptimeRobot is configured..."
  echo -e "${GREEN}✓${NC} UptimeRobot configured"
fi

# Option 3: Prometheus (auto-enabled)
echo -e "${BLUE}📊 Prometheus Metrics${NC}"
echo "✓ Already enabled in API"
echo ""
echo "Access metrics at: ${API_URL}/metrics"
echo "Metrics available:"
echo "  • http_request_duration_seconds (latency)"
echo "  • database_query_duration (DB performance)"
echo "  • circuit_breaker_state (resilience)"
echo "  • cache_hits_total (cache effectiveness)"
echo ""

# Create monitoring dashboard script
echo -e "${BLUE}📈 Creating monitoring dashboard script...${NC}"

cat > /tmp/imobi-monitor-health.sh << 'MONITOR_EOF'
#!/bin/bash

API_URL="${1:-}"
if [ -z "$API_URL" ]; then
  echo "Usage: bash imobi-monitor-health.sh <api-url>"
  exit 1
fi

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}📊 Imobi API Health Dashboard${NC}\n"

# Health check
echo -e "${BLUE}Health Status${NC}"
HEALTH=$(curl -s "${API_URL}/health")
STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*' | cut -d'"' -f4)

if [ "$STATUS" = "ok" ]; then
  echo -e "${GREEN}✓${NC} API: Running"
else
  echo -e "${RED}✗${NC} API: Down"
  exit 1
fi

# Database status
DB_STATUS=$(echo "$HEALTH" | grep -o '"database":"[^"]*' | cut -d'"' -f4)
if [ "$DB_STATUS" = "connected" ]; then
  echo -e "${GREEN}✓${NC} Database: Connected"
else
  echo -e "${YELLOW}⚠${NC} Database: Issue"
fi

# Redis status
REDIS_STATUS=$(echo "$HEALTH" | grep -o '"redis":"[^"]*' | cut -d'"' -f4)
if [ "$REDIS_STATUS" = "connected" ]; then
  echo -e "${GREEN}✓${NC} Cache: Connected"
else
  echo -e "${YELLOW}⚠${NC} Cache: Issue"
fi

# Metrics
echo -e "\n${BLUE}Performance Metrics${NC}"
METRICS=$(curl -s "${API_URL}/metrics")

# Response time
LATENCY=$(echo "$METRICS" | grep 'http_request_duration_seconds_bucket{le="0.5"' | tail -1 | grep -o '[0-9.]*$')
if [ -n "$LATENCY" ]; then
  echo "  Response Time (p95): ${LATENCY}s"
fi

# Uptime
UPTIME=$(echo "$HEALTH" | grep -o '"uptime":[0-9.]*' | cut -d':' -f2)
if [ -n "$UPTIME" ]; then
  UPTIME_HOURS=$(echo "scale=2; $UPTIME / 3600" | bc)
  echo "  Uptime: ${UPTIME_HOURS}h"
fi

echo -e "\n${BLUE}Endpoints Status${NC}"

# Auth endpoint
if curl -s "${API_URL}/api/v1/auth/login" 2>/dev/null | grep -q 'email'; then
  echo -e "${GREEN}✓${NC} Auth: Responding"
else
  echo -e "${RED}✗${NC} Auth: Error"
fi

# Public endpoint
if curl -s -X POST "${API_URL}/api/v1/public/simulador" \
  -H 'Content-Type: application/json' \
  -d '{"valorSolicitado":1000000,"prazoMeses":24,"tipoObra":"CONSTRUCAO"}' | grep -q 'parcelaMensal'; then
  echo -e "${GREEN}✓${NC} Simulator: Working"
else
  echo -e "${RED}✗${NC} Simulator: Error"
fi

# Swagger docs
if curl -s "${API_URL}/docs" | grep -q 'swagger'; then
  echo -e "${GREEN}✓${NC} Docs: Available"
else
  echo -e "${RED}✗${NC} Docs: Error"
fi

echo ""
echo "Last check: $(date)"
MONITOR_EOF

chmod +x /tmp/imobi-monitor-health.sh
cp /tmp/imobi-monitor-health.sh scripts/monitor-health.sh

echo -e "${GREEN}✓${NC} Created: scripts/monitor-health.sh"

# Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✨ Monitoring Setup Complete${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Available Monitoring:${NC}"
echo "  • API Health: ${API_URL}/health"
echo "  • Metrics: ${API_URL}/metrics"
echo "  • Swagger Docs: ${API_URL}/docs"
echo ""
echo -e "${BLUE}Health Dashboard:${NC}"
echo "  bash scripts/monitor-health.sh ${API_URL}"
echo ""
echo -e "${BLUE}Recommended Checks:${NC}"
echo "  • Daily: Review error rate in Sentry"
echo "  • Weekly: Check performance metrics (p95 latency)"
echo "  • Weekly: Review database slow queries"
echo "  • Monthly: Analyze usage patterns"
echo ""
