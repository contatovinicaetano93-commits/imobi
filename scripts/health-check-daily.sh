#!/bin/bash

################################################################################
# IMOBI DAILY HEALTH CHECK REPORT
#
# Purpose: Generate daily health check report and email to team
# Usage: ./scripts/health-check-daily.sh
# Setup: Add to crontab: 0 8 * * * /home/user/imobi/scripts/health-check-daily.sh
#
################################################################################

set -euo pipefail

# Configuration
API_URL="${API_URL:-https://api.imobi.com.br}"
REPORT_FILE="/tmp/imobi-health-check-$(date +%Y%m%d).txt"
EMAIL_TO="${EMAIL_TO:-imobi-oncall@company.com}"
PHONE_PREFIX="${PHONE_PREFIX:-}"

# Generate report
{
  echo "=========================================="
  echo "IMOBI DAILY HEALTH CHECK REPORT"
  echo "Generated: $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "=========================================="
  echo ""

  # 1. API Health Endpoint
  echo "1. API HEALTH ENDPOINT"
  echo "---------------------------------------------"
  if RESPONSE=$(curl -s -m 30 "$API_URL/api/v1/health" 2>/dev/null); then
    STATUS=$(echo "$RESPONSE" | jq -r '.status // "unknown"' 2>/dev/null)
    TIMESTAMP=$(echo "$RESPONSE" | jq -r '.timestamp // "N/A"' 2>/dev/null)
    REDIS=$(echo "$RESPONSE" | jq -r '.redis.status // "unknown"' 2>/dev/null)
    DB=$(echo "$RESPONSE" | jq -r '.database.configured // false' 2>/dev/null)
    EMAIL_CONFIG=$(echo "$RESPONSE" | jq -r '.email.configured // false' 2>/dev/null)

    echo "Overall Status:  $STATUS"
    echo "Timestamp:       $TIMESTAMP"
    echo "Redis Status:    $REDIS"
    echo "Database:        $DB"
    echo "Email Config:    $EMAIL_CONFIG"
    echo ""

    if [ "$STATUS" != "ok" ] && [ "$STATUS" != "degraded" ]; then
      echo "⚠️  WARNING: API health check not OK"
      echo "Response: $RESPONSE"
    elif [ "$STATUS" = "degraded" ]; then
      echo "⚠️  WARNING: API status degraded (optional service unavailable)"
    else
      echo "✅ OK: API is healthy"
    fi
  else
    echo "❌ ERROR: Could not reach API health endpoint"
    echo "URL: $API_URL/api/v1/health"
  fi
  echo ""

  # 2. Uptime Monitoring Status
  echo "2. UPTIME MONITORING STATUS"
  echo "---------------------------------------------"
  echo "UptimeRobot Dashboard: https://uptimerobot.com/dashboard"
  echo ""
  echo "Monitor: Imobi API Health Check"
  echo "URL: $API_URL/api/v1/health"
  echo "Interval: 5 minutes"
  echo ""
  echo "Action: Check UptimeRobot dashboard for any downtime events"
  echo "Target: 100% uptime, no alerts in last 24 hours"
  echo ""

  # 3. Error Monitoring
  echo "3. ERROR MONITORING (Sentry)"
  echo "---------------------------------------------"
  echo "Dashboard: https://sentry.io"
  echo ""
  echo "Targets for 24-hour period:"
  echo "  • Error Rate: < 0.1% (soft launch target)"
  echo "  • Critical Errors: 0"
  echo "  • New Error Types: 0"
  echo ""
  echo "Action: Check Sentry dashboard for error trends"
  echo ""

  # 4. Performance Monitoring
  echo "4. PERFORMANCE MONITORING (Vercel Analytics)"
  echo "---------------------------------------------"
  echo "Dashboard: https://vercel.com/contatovinicaetano93-commits/imobi/analytics"
  echo ""
  echo "Targets for 24-hour period:"
  echo "  • LCP (Largest Contentful Paint): < 2.5s"
  echo "  • FID (First Input Delay): < 100ms"
  echo "  • CLS (Cumulative Layout Shift): < 0.1"
  echo "  • Page Load (p95): < 3s"
  echo "  • Error Rate: < 0.1%"
  echo ""
  echo "Action: Check Vercel Analytics dashboard for web vitals"
  echo ""

  # 5. Infrastructure Health
  echo "5. INFRASTRUCTURE HEALTH"
  echo "---------------------------------------------"
  echo "Monitor the following via provider dashboards:"
  echo ""
  echo "Database (PostgreSQL + PostGIS):"
  echo "  • Connection pool usage: < 70%"
  echo "  • Query performance (p95): < 500ms"
  echo "  • Disk usage: < 80%"
  echo ""
  echo "Cache (Redis):"
  echo "  • Memory usage: < 60%"
  echo "  • Hit rate: > 80%"
  echo "  • Command latency: < 50ms"
  echo ""
  echo "Message Queue (BullMQ):"
  echo "  • Job queue depth: < 100 pending"
  echo "  • Success rate: > 99%"
  echo "  • Average job time: < 30s"
  echo ""

  # 6. Daily Checklist
  echo "6. TODAY'S CHECKLIST"
  echo "---------------------------------------------"
  echo "[ ] Check UptimeRobot dashboard"
  echo "[ ] Review Sentry for errors"
  echo "[ ] Check Vercel Analytics for performance"
  echo "[ ] Verify database connectivity"
  echo "[ ] Review any overnight incidents"
  echo "[ ] Confirm all systems operational"
  echo "[ ] Send status update to team"
  echo ""

  # 7. Escalation Matrix
  echo "7. ESCALATION CONTACTS"
  echo "---------------------------------------------"
  echo "P0 (Critical - Immediate):"
  echo "  • On-Call: [Name] | Phone: [Number]"
  echo ""
  echo "P1 (High - Within 15 min):"
  echo "  • Team Lead: [Name] | Phone: [Number]"
  echo ""
  echo "P2 (Medium - Within 1 hour):"
  echo "  • Engineering: [Name] | Email: [Email]"
  echo ""

  # 8. Useful Links
  echo "8. USEFUL LINKS"
  echo "---------------------------------------------"
  echo "Sentry:       https://sentry.io"
  echo "Vercel:       https://vercel.com/contatovinicaetano93-commits/imobi"
  echo "UptimeRobot:  https://uptimerobot.com/dashboard"
  echo "API Health:   $API_URL/api/v1/health"
  echo ""

  # 9. Summary
  echo "=========================================="
  echo "Report generated on $(hostname) at $(date)"
  echo "=========================================="

} > "$REPORT_FILE"

# Send email
if command -v mail &> /dev/null; then
  mail -s "Imobi Daily Health Check - $(date +%Y-%m-%d)" "$EMAIL_TO" < "$REPORT_FILE"
  echo "Report sent to $EMAIL_TO"
else
  echo "Mail command not found. Report saved to: $REPORT_FILE"
  cat "$REPORT_FILE"
fi

# Log report location
echo "Report saved to: $REPORT_FILE"
