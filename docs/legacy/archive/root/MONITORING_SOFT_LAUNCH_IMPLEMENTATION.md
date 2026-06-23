# Imobi Soft Launch — Monitoring & Alerting Implementation Guide

**Document Version**: 1.0  
**Created**: June 22, 2026  
**Status**: PRODUCTION READY  
**Owner**: DevOps / Operations Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [Monitoring Stack Architecture](#monitoring-stack-architecture)
4. [Implementation Checklist](#implementation-checklist)
5. [UptimeRobot Health Check Setup](#uptimerobot-health-check-setup)
6. [Slack/Email Alert Configuration](#slackemail-alert-configuration)
7. [Daily Health Check Script](#daily-health-check-script)
8. [Monitoring Dashboard Checklist](#monitoring-dashboard-checklist)
9. [SLA Targets & Thresholds](#sla-targets--thresholds)
10. [Log Aggregation Setup](#log-aggregation-setup)
11. [Incident Response Template](#incident-response-template)
12. [Escalation Procedures](#escalation-procedures)

---

## Executive Summary

The Imobi platform has comprehensive monitoring infrastructure in place, but requires coordination and activation of alerting mechanisms for the soft launch. This guide provides a **structured, ready-to-implement checklist** for:

- **24/7 Health Check Monitoring** (UptimeRobot)
- **Automated Alerts** (Slack/Email on errors)
- **Daily Manual Checks** (Bash scripts)
- **Dashboard Visibility** (Vercel Analytics, Sentry, Health Endpoint)
- **SLA Compliance** (P95 < 800ms, error rate < 1%)
- **Incident Response** (Templates, escalation)

**Current Infrastructure Status**: ✅ Ready
- Health endpoint: `GET /api/v1/health`
- Structured logging: JSON format in place
- Sentry integration: Configured (awaiting DSN)
- Vercel Analytics: Available in dashboard
- Database monitoring: PostgreSQL + PostGIS ready
- Cache monitoring: Redis + BullMQ ready

**Actions Required Before Go-Live**: See [Implementation Checklist](#implementation-checklist)

---

## Current State Assessment

### 1. Health Endpoint (✅ Implemented)

**Location**: `services/api/src/common/health.controller.ts`  
**Endpoint**: `GET /api/v1/health`

**Current Response**:
```json
{
  "status": "ok" | "degraded" | "error",
  "timestamp": "2026-06-22T12:00:00.000Z",
  "redis": {
    "status": "connected" | "error",
    "host": "redis.example.com",
    "port": 6379,
    "error": "Optional error message"
  },
  "email": {
    "provider": "sendgrid" | "ses" | "smtp",
    "configured": true
  },
  "firebase": {
    "configured": true
  },
  "database": {
    "configured": true
  }
}
```

**Status Logic**:
- `ok` = Database connected AND Redis connected
- `degraded` = Database connected but Redis error
- `error` = Database not configured

**Monitoring Frequency**: Every 5 minutes (recommended minimum)

---

### 2. Logging Setup (✅ Implemented)

**Location**: `services/api/src/common/logger/structured-logger.ts`

**Log Format**: JSON with context
```json
{
  "timestamp": "2026-06-22T12:00:00Z",
  "level": "INFO|WARN|ERROR|DEBUG",
  "context": "ServiceName",
  "message": "User-friendly description",
  "userId": "usr_123",
  "duration": 150,
  "customField": "value"
}
```

**Log Levels (Production)**:
- ERROR: Application failures, critical issues
- WARN: Abnormal conditions (rate limits, connection issues)
- INFO: Key business events (logins, approvals, uploads)
- DEBUG/VERBOSE: Development only

**Output**: `/logs/{YYYY-MM-DD}.log` (production)

**Log Rotation**: Daily files recommended

---

### 3. Vercel Analytics (✅ Available)

**Access**: https://vercel.com/contatovinicaetano93-commits/imobi/analytics

**Metrics Tracked**:
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)
- Page load times by route
- Error rates and 5xx responses
- Deployment history

**Visibility**: Real-time dashboard with 1-minute granularity

---

### 4. Sentry Integration (🟡 Configured, Awaiting Activation)

**Location**: 
- API: `services/api/src/common/config/sentry.config.ts`
- Web: `apps/web/lib/sentry.ts`

**Status**: Ready to activate with DSN

**Configuration**:
- Error tracking: Enabled
- Performance monitoring: 10% sample rate (production)
- Replay integration: Enabled for web
- Slack integration: Available

**Required Actions**:
1. Create Sentry project at https://sentry.io
2. Obtain DSN for API and Web
3. Add `SENTRY_DSN` to Vercel environment variables
4. Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel environment variables
5. Configure alert rules in Sentry dashboard

---

### 5. Health Check Scripts (✅ Ready)

**Scripts Provided**:

| Script | Purpose | Frequency |
|--------|---------|-----------|
| `scripts/health-check.sh` | Basic health check every minute | Every 1 minute |
| `scripts/cutover-health-check.sh` | Comprehensive system check | Manual + cutover |
| `scripts/pre-deployment-health-check.sh` | Pre-deployment validation | Before deployment |

---

## Monitoring Stack Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMOBI MONITORING STACK                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     PRIMARY MONITORING LAYER                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  UptimeRobot    │  │   Sentry     │  │ Vercel Analytics│   │
│  │   (24/7)        │  │  (Errors)    │  │  (Web Vitals)   │   │
│  └────────┬────────┘  └──────┬───────┘  └────────┬────────┘   │
│           │                  │                   │              │
│           └──────────────────┼───────────────────┘              │
│                              │                                  │
│                    ┌─────────▼─────────┐                       │
│                    │  Alert Router     │                       │
│                    │  (Slack/Email)    │                       │
│                    └─────────┬─────────┘                       │
│                              │                                  │
│              ┌───────────────┼───────────────┐                 │
│              │               │               │                  │
│         ┌────▼────┐  ┌──────▼─────┐  ┌─────▼─────┐           │
│         │  Slack  │  │   Email    │  │   PagerD. │           │
│         │ Channels│  │ Alerts     │  │  (On-Call)│           │
│         └─────────┘  └────────────┘  └───────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   SECONDARY MONITORING LAYER                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Health Endpoint         Structured Logs        Database        │
│  (/api/v1/health)       (JSON format)           Metrics         │
│  ✅ Ready                ✅ Ready               ✅ Ready         │
│                                                                  │
│  Redis Status            BullMQ Queue           Web Vitals      │
│  ✅ Ready                ✅ Ready               ✅ Ready         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   MANUAL MONITORING LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Daily Health Check Script     Weekly Metrics Review           │
│  (Bash curl commands)          (Error trends, performance)     │
│  ✅ Provided                   ✅ Ready                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Pre-Launch Setup (Before Go-Live)

**Timeline**: 2-3 hours  
**Owner**: DevOps Lead

#### A. Health Endpoint Verification
- [ ] Test health endpoint locally: `curl http://localhost:4000/api/v1/health`
- [ ] Verify response includes all services (redis, email, firebase, database)
- [ ] Confirm response time < 100ms
- [ ] Test in production: `curl https://api.imobi.com.br/api/v1/health`
- [ ] Document baseline response for reference

#### B. Sentry Setup
- [ ] Create Sentry account/organization (if not already done)
- [ ] Create Sentry project for "imobi-api"
- [ ] Create Sentry project for "imobi-web"
- [ ] Copy API DSN from project settings
- [ ] Copy Web DSN from project settings
- [ ] Add `SENTRY_DSN` to Vercel environment variables (Production)
- [ ] Add `NEXT_PUBLIC_SENTRY_DSN` to Vercel environment variables (Production)
- [ ] Redeploy API and Web after adding DSN
- [ ] Verify Sentry receiving test events
- [ ] Configure Sentry alert rules (see section 6)

#### C. UptimeRobot Setup
- [ ] Create UptimeRobot account (https://uptimerobot.com)
- [ ] Create monitor for `/api/v1/health` endpoint
- [ ] Set monitoring interval to 5 minutes
- [ ] Configure alert contacts (Slack, Email)
- [ ] Document monitor ID and dashboard URL
- [ ] Enable Slack/Email notifications
- [ ] Perform test alert to confirm

#### D. Slack Workspace Configuration
- [ ] Verify `#imobi-incidents` channel exists
- [ ] Verify `#imobi-monitoring` channel exists
- [ ] Add UptimeRobot to Slack workspace
- [ ] Connect UptimeRobot to `#imobi-incidents`
- [ ] Add Sentry bot to Slack workspace
- [ ] Connect Sentry to `#imobi-incidents`
- [ ] Test alert routing (post test message)

#### E. Email Alert Setup
- [ ] Create distribution list: `imobi-oncall@company.com`
- [ ] Add team members to distribution list
- [ ] Configure UptimeRobot email alerts to distribution list
- [ ] Configure Sentry email alerts to distribution list
- [ ] Test email delivery (send test email)

#### F. Health Check Scripts Deployment
- [ ] Copy `scripts/health-check.sh` to monitoring server
- [ ] Make executable: `chmod +x scripts/health-check.sh`
- [ ] Copy `scripts/cutover-health-check.sh` to monitoring server
- [ ] Make executable: `chmod +x scripts/cutover-health-check.sh`
- [ ] Create cron job for daily health check (see section 7)
- [ ] Create cron job for hourly checks during first 7 days
- [ ] Document cron job configuration

#### G. Logging Setup Verification
- [ ] Verify logs are structured JSON format
- [ ] Confirm logs include timestamp, level, context
- [ ] Verify sensitive data is masked
- [ ] Check log rotation is configured (daily)
- [ ] Test log archival process
- [ ] Document log file locations

#### H. Dashboard Access
- [ ] Verify Vercel Analytics URL accessible
- [ ] Verify Sentry dashboard URL accessible
- [ ] Verify UptimeRobot dashboard URL accessible
- [ ] Create bookmarks for each dashboard
- [ ] Share dashboard URLs with team
- [ ] Brief team on dashboard metrics

#### I. Documentation & Training
- [ ] Create on-call runbook (email + Slack)
- [ ] Brief team on alert severity levels
- [ ] Brief team on escalation procedures
- [ ] Brief team on common incident scenarios
- [ ] Schedule monitoring training session
- [ ] Create quick reference guide (laminated for desk)

### Phase 2: Launch Day (Go-Live)

**Timeline**: 2-4 hours  
**Owner**: DevOps Lead + QA Team

#### A. Pre-Launch Checks (T-2 hours)
- [ ] Verify all dashboards are accessible
- [ ] Verify Sentry is receiving events
- [ ] Verify UptimeRobot monitoring is active
- [ ] Verify Slack/Email alerts are working
- [ ] Run health check script and verify output
- [ ] Confirm baseline metrics (latency, error rate)

#### B. Deployment Window (T-0)
- [ ] Deploy code to production
- [ ] Verify health endpoint returns `status: ok`
- [ ] Verify no pre-existing errors in Sentry
- [ ] Verify no pre-existing alerts
- [ ] Open all monitoring dashboards in team workspace
- [ ] Enable team notifications (Slack active)

#### C. Post-Launch Monitoring (T+0 to T+4 hours)
- [ ] Monitor every 15 minutes for first 2 hours
- [ ] Monitor every 30 minutes for hours 2-4
- [ ] Check error rate (target: < 0.1%)
- [ ] Check P95 latency (target: < 800ms)
- [ ] Verify database connectivity
- [ ] Verify Redis connectivity
- [ ] Verify no queue backlog
- [ ] Document baseline metrics

#### D. Incident Response Setup
- [ ] Designate incident commander
- [ ] Open incident tracking document
- [ ] Prepare escalation contact list
- [ ] Brief team on response procedures
- [ ] Standby for support calls

### Phase 3: Ongoing Monitoring (Days 2-7)

**Timeline**: 24/7  
**Owner**: DevOps Team (rotating on-call)

- [ ] Daily morning health check (8 AM)
- [ ] Review error logs (3 PM)
- [ ] Check performance trends
- [ ] Review queue depth
- [ ] Escalate if thresholds exceeded
- [ ] Document daily metrics
- [ ] Friday: Weekly review meeting

---

## UptimeRobot Health Check Setup

### Step 1: Create UptimeRobot Account

1. Go to https://uptimerobot.com
2. Sign up with email
3. Verify email address
4. Complete account setup

### Step 2: Add Monitor

**Monitor Configuration**:

```
Monitor Type:          HTTP(s)
Friendly Name:         Imobi API Health Check
URL:                   https://api.imobi.com.br/api/v1/health
Monitoring Interval:   5 minutes (standard)
HTTP Method:           GET
Timeout:               30 seconds
```

### Step 3: Configure Alert Contacts

#### Slack Alert Integration

```
1. In UptimeRobot: Settings → Alert Contacts
2. Click "Add Alert Contact"
3. Select "Slack"
4. Click "Connect Slack Workspace"
5. Authorize UptimeRobot bot
6. Select channel: #imobi-incidents
7. Save and test
```

**Expected Slack Message**:
```
[API] DOWN: Imobi API Health Check
URL: https://api.imobi.com.br/api/v1/health
Status: HTTP 503 (timeout)
Time: 2026-06-22 12:00:00 UTC
```

#### Email Alert Integration

```
1. In UptimeRobot: Settings → Alert Contacts
2. Click "Add Alert Contact"
3. Select "Email"
4. Enter: imobi-oncall@company.com
5. Save and test
```

**Expected Email**:
```
Subject: [ALERT] Imobi API Health Check is DOWN
From: UptimeRobot <noreply@uptimerobot.com>

Monitor: Imobi API Health Check
URL: https://api.imobi.com.br/api/v1/health
Status: DOWN
Response Time: N/A
Time Started: 2026-06-22 12:00:00 UTC
```

### Step 4: Configure Alert Rules

```
Alert Trigger:     Monitor Down
Alert Contact:     Slack (#imobi-incidents)
Action:            Notify immediately

Alert Trigger:     Monitor Back Up
Alert Contact:     Slack (#imobi-incidents)
Action:            Notify immediately
```

### Step 5: Dashboard Setup

**UptimeRobot Dashboard URL**: 
```
https://uptimerobot.com/dashboard
```

**Add to Bookmarks**:
- Bookmark for monitoring team
- Share with on-call rotation

---

## Slack/Email Alert Configuration

### Alert Routing Matrix

| Alert Source | Severity | Channel/Address | Response Time |
|--------------|----------|-----------------|----------------|
| UptimeRobot | DOWN | #imobi-incidents + Email | Immediate |
| Sentry | Error Rate > 5% | #imobi-incidents + Page On-Call | Immediate |
| Sentry | Error Rate > 1% | #imobi-incidents | 15 min |
| Sentry | P95 > 2s | #imobi-monitoring | 30 min |
| Health Script | Status Error | Email | Immediate |

### Sentry Alert Rules Configuration

**In Sentry Dashboard → Project Settings → Alert Rules**:

#### Rule 1: Critical Error Rate
```
Condition:
  When error rate > 5% for 5 minutes

Action:
  - Alert #imobi-incidents
  - Email imobi-oncall@company.com
  - Page on-call (if PagerDuty connected)

Severity: CRITICAL
```

#### Rule 2: Elevated Error Rate
```
Condition:
  When error rate > 1% for 10 minutes

Action:
  - Alert #imobi-incidents
  - Email #imobi-monitoring

Severity: WARNING
```

#### Rule 3: Slow Response Times
```
Condition:
  When p95 latency > 2000ms for 10 minutes

Action:
  - Alert #imobi-monitoring

Severity: WARNING
```

#### Rule 4: Database Errors
```
Condition:
  When error message contains "database"
  
Action:
  - Alert #imobi-incidents
  - Page on-call

Severity: CRITICAL
```

#### Rule 5: Authentication Failures
```
Condition:
  When error rate for auth endpoints > 0.1% for 5 min

Action:
  - Alert #imobi-incidents

Severity: ERROR
```

### Slack Message Templates

**Template 1: Health Check Down**
```
:red_circle: ALERT: API Health Check Down

Monitor: Imobi API Health Check
URL: https://api.imobi.com.br/api/v1/health
Status: DOWN (HTTP 503)
First Alert: [Timestamp]
Duration: [time]

:point_right: Action Required: Check API logs and restart if needed
Channel: #imobi-incidents
```

**Template 2: High Error Rate**
```
:warning: WARNING: High Error Rate Detected

Service: imobi-api
Error Rate: 2.5% (threshold: 1%)
Errors in last 5 min: 25
Top Error: [Error Type]
Sentry Link: [Link]

:point_right: Action: Investigate in Sentry
Channel: #imobi-incidents
```

**Template 3: Performance Degradation**
```
:yellow_circle: Performance Degradation

Metric: P95 Response Time
Current: 2500ms (threshold: 2000ms)
Baseline: 800ms
Affected Endpoint: [/api/endpoint]

:point_right: Action: Check database/cache performance
Channel: #imobi-monitoring
```

### Email Template

**Subject**: `[ALERT] Imobi Monitoring: {ALERT_TYPE}`

**Body**:
```
Alert Type: {ALERT_TYPE}
Severity: {SEVERITY}
Time: {TIMESTAMP}

Details:
{DETAILS}

Dashboard: https://uptimerobot.com/dashboard
Sentry: https://sentry.io

On-Call Contact: {ON_CALL_NAME}
On-Call Phone: {ON_CALL_PHONE}

---
This is an automated alert. Do not reply to this email.
```

---

## Daily Health Check Script

### Script 1: Simple Hourly Health Check

**File**: `scripts/health-check-hourly.sh` (Create new)

```bash
#!/bin/bash

# Imobi Hourly Health Check
# Usage: Run via crontab every hour during business hours

API_URL="${API_URL:-https://api.imobi.com.br}"
HEALTH_ENDPOINT="${API_URL}/api/v1/health"
LOG_FILE="/var/log/imobi/health-check.log"
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')

# Create log directory if needed
mkdir -p "$(dirname "$LOG_FILE")"

# Perform health check
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/health-response.json \
  --max-time 30 \
  "$HEALTH_ENDPOINT")

RESPONSE=$(cat /tmp/health-response.json 2>/dev/null || echo "{}")

# Parse response
STATUS=$(echo "$RESPONSE" | jq -r '.status // "unknown"' 2>/dev/null)
REDIS_STATUS=$(echo "$RESPONSE" | jq -r '.redis.status // "unknown"' 2>/dev/null)
DB_CONFIGURED=$(echo "$RESPONSE" | jq -r '.database.configured // false' 2>/dev/null)

# Log result
if [ "$HTTP_CODE" = "200" ] && [ "$STATUS" = "ok" ]; then
  LOG_ENTRY="$TIMESTAMP | SUCCESS | HTTP $HTTP_CODE | Status: $STATUS | Redis: $REDIS_STATUS | DB: $DB_CONFIGURED"
  echo "$LOG_ENTRY" >> "$LOG_FILE"
  exit 0
else
  LOG_ENTRY="$TIMESTAMP | FAILURE | HTTP $HTTP_CODE | Status: $STATUS | Response: $RESPONSE"
  echo "$LOG_ENTRY" >> "$LOG_FILE"
  exit 1
fi
```

**Cron Configuration** (run every hour during business hours):
```bash
# Add to crontab -e:
0 8-18 * * * /home/user/imobi/scripts/health-check-hourly.sh
```

### Script 2: Daily Health Check Report

**File**: `scripts/health-check-daily.sh` (Create new)

```bash
#!/bin/bash

# Imobi Daily Health Check Report
# Usage: Run once daily at 8 AM
# Output: Email report to team

set -euo pipefail

API_URL="${API_URL:-https://api.imobi.com.br}"
REPORT_FILE="/tmp/imobi-health-check-$(date +%Y%m%d).txt"
EMAIL_TO="${EMAIL_TO:-imobi-oncall@company.com}"

{
  echo "=========================================="
  echo "IMOBI DAILY HEALTH CHECK REPORT"
  echo "Date: $(date '+%Y-%m-%d %H:%M:%S UTC')"
  echo "=========================================="
  echo ""
  
  # 1. API Health
  echo "1. API HEALTH ENDPOINT"
  echo "---------------------------------------------"
  if RESPONSE=$(curl -s -m 30 "$API_URL/api/v1/health"); then
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    TIMESTAMP=$(echo "$RESPONSE" | jq -r '.timestamp')
    REDIS=$(echo "$RESPONSE" | jq -r '.redis.status')
    DB=$(echo "$RESPONSE" | jq -r '.database.configured')
    
    echo "Overall Status: $STATUS"
    echo "Timestamp: $TIMESTAMP"
    echo "Redis: $REDIS"
    echo "Database: $DB"
    
    if [ "$STATUS" != "ok" ]; then
      echo "⚠️  WARNING: API status not OK"
    else
      echo "✅ OK: API is healthy"
    fi
  else
    echo "❌ ERROR: Could not reach API health endpoint"
  fi
  echo ""
  
  # 2. Recent Errors (from logs)
  echo "2. RECENT ERRORS (Last 24 Hours)"
  echo "---------------------------------------------"
  if [ -f "/var/log/imobi/api.log" ]; then
    ERROR_COUNT=$(grep -c "ERROR" "/var/log/imobi/api.log" 2>/dev/null || echo "0")
    echo "Total errors in last 24h: $ERROR_COUNT"
    echo ""
    echo "Last 5 errors:"
    grep "ERROR" "/var/log/imobi/api.log" 2>/dev/null | tail -5 || echo "(No errors)"
  else
    echo "Log file not found"
  fi
  echo ""
  
  # 3. Database Connection Pool
  echo "3. DATABASE CONNECTION POOL"
  echo "---------------------------------------------"
  echo "Monitor via Vercel/Railway dashboard:"
  echo "- Connection pool usage"
  echo "- Active connections"
  echo "- Query performance"
  echo ""
  
  # 4. Redis Memory
  echo "4. REDIS CACHE STATUS"
  echo "---------------------------------------------"
  echo "Monitor via Redis dashboard:"
  echo "- Memory usage"
  echo "- Key count"
  echo "- Command latency"
  echo ""
  
  # 5. Monitoring Dashboards
  echo "5. MONITORING DASHBOARDS"
  echo "---------------------------------------------"
  echo "Vercel Analytics: https://vercel.com/contatovinicaetano93-commits/imobi/analytics"
  echo "Sentry: https://sentry.io"
  echo "UptimeRobot: https://uptimerobot.com/dashboard"
  echo ""
  
  # 6. Action Items
  echo "6. ACTION ITEMS FOR TODAY"
  echo "---------------------------------------------"
  echo "[ ] Review Sentry for new errors"
  echo "[ ] Check Vercel Analytics for performance trends"
  echo "[ ] Verify UptimeRobot monitoring is active"
  echo "[ ] Review any overnight incidents"
  echo ""
  
  echo "=========================================="
  echo "End of Report"
  echo "=========================================="
  
} > "$REPORT_FILE"

# Send email
mail -s "Imobi Daily Health Check Report - $(date +%Y-%m-%d)" "$EMAIL_TO" < "$REPORT_FILE"

echo "Health check report sent to $EMAIL_TO"
```

**Cron Configuration** (run daily at 8 AM):
```bash
# Add to crontab -e:
0 8 * * * /home/user/imobi/scripts/health-check-daily.sh
```

### Script 3: Production Status Summary

**File**: `scripts/health-check-summary.sh` (Create new)

```bash
#!/bin/bash

# Quick status check for terminal
# Usage: ./scripts/health-check-summary.sh

set -euo pipefail

API_URL="${API_URL:-https://api.imobi.com.br}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "IMOBI STATUS CHECK"
echo "Time: $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo "=========================================="
echo ""

# Health endpoint
echo -n "API Health:     "
if RESPONSE=$(curl -s -m 10 "$API_URL/api/v1/health" 2>/dev/null); then
  STATUS=$(echo "$RESPONSE" | jq -r '.status // "error"')
  case "$STATUS" in
    ok)
      echo -e "${GREEN}✅ OK${NC}"
      ;;
    degraded)
      echo -e "${YELLOW}⚠️  DEGRADED${NC}"
      ;;
    *)
      echo -e "${RED}❌ ERROR${NC}"
      ;;
  esac
else
  echo -e "${RED}❌ UNREACHABLE${NC}"
fi

# Redis
echo -n "Redis Cache:    "
if RESPONSE=$(curl -s -m 10 "$API_URL/api/v1/health" 2>/dev/null); then
  REDIS=$(echo "$RESPONSE" | jq -r '.redis.status // "unknown"')
  if [ "$REDIS" = "connected" ]; then
    echo -e "${GREEN}✅ Connected${NC}"
  else
    echo -e "${RED}❌ Error${NC}"
  fi
else
  echo "(checking...)"
fi

# Database
echo -n "Database:       "
if RESPONSE=$(curl -s -m 10 "$API_URL/api/v1/health" 2>/dev/null); then
  DB=$(echo "$RESPONSE" | jq -r '.database.configured // false')
  if [ "$DB" = "true" ]; then
    echo -e "${GREEN}✅ Configured${NC}"
  else
    echo -e "${RED}❌ Not configured${NC}"
  fi
else
  echo "(checking...)"
fi

echo ""
echo "Dashboards:"
echo "  Vercel: https://vercel.com/contatovinicaetano93-commits/imobi/analytics"
echo "  Sentry: https://sentry.io"
echo "  UptimeRobot: https://uptimerobot.com/dashboard"
echo ""
```

**Make executable and use**:
```bash
chmod +x scripts/health-check-summary.sh
./scripts/health-check-summary.sh
```

---

## Monitoring Dashboard Checklist

### Daily Monitoring Routine

#### Morning (8 AM - Start of Day)

```
☐ Open Vercel Analytics Dashboard
  - Check Web Vitals (LCP, FID, CLS)
  - Review overnight traffic
  - Verify no error rate spike
  - Note any performance degradation
  
☐ Open Sentry Dashboard
  - Review overnight errors
  - Check error rate trend
  - Identify any new error types
  - Review affected users count
  
☐ Open UptimeRobot Dashboard
  - Confirm API monitor is active
  - Verify no downtime events
  - Check alert history
  
☐ Run Health Check Script
  - ./scripts/health-check-summary.sh
  - Document baseline metrics
  
☐ Send Team Standup
  - Overnight status: Good/Issues
  - Current error rate
  - Current P95 latency
  - Any escalations needed
```

#### During Business Hours (Every 2 Hours)

```
☐ Check Error Rate in Sentry
  - Target: < 0.1% (soft launch), < 1% (acceptable)
  - If elevated: Investigate error details
  
☐ Check Response Times
  - Monitor Vercel Dashboard for Web Vitals
  - Target: P95 < 800ms
  - If elevated: Check API logs + database
  
☐ Monitor User Traffic
  - Verify traffic is as expected
  - Watch for unusual patterns
  
☐ Check Queue Status (if available)
  - BullMQ job depth
  - Job success/failure rates
  
☐ Monitor Test Accounts
  - Ensure beta testers can login
  - Spot-check functionality
```

#### Evening (4 PM - End of Day)

```
☐ Review Daily Metrics
  - Average error rate for day
  - Average response time
  - Any incidents?
  
☐ Update Status Document
  - Log metrics in tracking spreadsheet
  - Note any issues/escalations
  
☐ Handoff to On-Call Team
  - Send email with day summary
  - List any ongoing issues
  - Provide escalation contacts
  
☐ Verify Alerts Still Active
  - Test Slack notification (optional)
  - Verify email alerts enabled
```

#### Weekly (Friday 4 PM)

```
☐ Compile Metrics Report
  - 7-day average error rate
  - 7-day average response time
  - Any P0/P1 incidents?
  - Cost implications?
  
☐ Review Trends
  - Is error rate improving?
  - Is performance stable?
  - Any concerning patterns?
  
☐ Schedule Post-Mortems
  - If any P0/P1 incidents
  - Schedule within 24 hours
  
☐ Plan Optimizations
  - Any monitoring improvements?
  - Any alert threshold adjustments?
  
☐ Team Meeting
  - Share weekly report
  - Discuss next week priorities
```

### Dashboard URLs & Access

| Dashboard | URL | Purpose | Refresh Rate |
|-----------|-----|---------|---------------|
| **Vercel Analytics** | https://vercel.com/contatovinicaetano93-commits/imobi/analytics | Web Vitals, traffic, errors | Real-time |
| **Sentry** | https://sentry.io | Error tracking, performance | Real-time |
| **UptimeRobot** | https://uptimerobot.com/dashboard | Health check status | 5 min |
| **Health Endpoint** | https://api.imobi.com.br/api/v1/health | Service status | Manual query |

### Key Metrics to Monitor

#### Web Performance (Vercel)

| Metric | Soft Launch Target | Red Line | Frequency |
|--------|-------------------|----------|-----------|
| LCP (Largest Contentful Paint) | < 2.5s | > 4s | Every load |
| FID (First Input Delay) | < 100ms | > 300ms | Per interaction |
| CLS (Cumulative Layout Shift) | < 0.1 | > 0.25 | Every session |
| Error Rate | < 0.1% | > 1% | Rolling 5 min |
| Page Load (p95) | < 3s | > 5s | Every request |

#### API Performance (Sentry)

| Metric | Soft Launch Target | Red Line | Check Frequency |
|--------|-------------------|----------|-----------------|
| Error Rate | < 0.1% | > 1% | Every 15 min |
| P95 Latency | < 800ms | > 2s | Every 15 min |
| P99 Latency | < 2s | > 5s | Every 30 min |
| 5xx Errors | 0 | > 10 in 5 min | Continuous |
| Failed Requests | 0 | > 5 per min | Every 5 min |

#### Infrastructure Health (UptimeRobot)

| Component | Target Status | Alert If | Check Frequency |
|-----------|----------------|----------|-----------------|
| API Health | HTTP 200 OK | HTTP 503 | Every 5 min |
| Response Time | < 1s | > 10s | Every check |
| Uptime | 100% | Any downtime | Continuous |

---

## SLA Targets & Thresholds

### Soft Launch SLA (Weeks 1-2)

```
┌─────────────────────────────────────────────────────────────┐
│                SOFT LAUNCH SLA TARGETS                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ERROR RATE                                                  │
│ ├─ Target: < 0.1% (best effort)                             │
│ ├─ Warning: 0.1% - 1%                                       │
│ ├─ Critical: > 1%                                           │
│ └─ Measurement: Errors / Total Requests (5-min rolling)    │
│                                                             │
│ RESPONSE TIME (P95)                                         │
│ ├─ Target: < 800ms                                          │
│ ├─ Warning: 800ms - 2s                                      │
│ ├─ Critical: > 2s                                           │
│ └─ Measurement: 95th percentile of request times            │
│                                                             │
│ AVAILABILITY                                                │
│ ├─ Target: > 99%                                            │
│ ├─ Warning: 98% - 99%                                       │
│ ├─ Critical: < 98%                                          │
│ └─ Measurement: Uptime from health endpoint checks          │
│                                                             │
│ DATABASE RESPONSE                                           │
│ ├─ Target: < 500ms (p95)                                    │
│ ├─ Warning: 500ms - 1s                                      │
│ ├─ Critical: > 1s                                           │
│ └─ Measurement: Database query latency (p95)                │
│                                                             │
│ CACHE HIT RATE                                              │
│ ├─ Target: > 80%                                            │
│ ├─ Warning: 60% - 80%                                       │
│ ├─ Critical: < 60%                                          │
│ └─ Measurement: Redis cache hit ratio                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Alert Thresholds

#### Green Zone (Normal Operation)
```
✅ Error Rate < 0.1%
✅ P95 Latency < 800ms
✅ P99 Latency < 2s
✅ API Health: OK
✅ Database Connections: < 70%
✅ Redis Memory: < 60%
✅ Queue Depth: < 100
```

#### Yellow Zone (Monitor Closely)
```
🟡 Error Rate 0.1% - 1%
🟡 P95 Latency 800ms - 2s
🟡 P99 Latency 2s - 5s
🟡 Database Connections 70% - 80%
🟡 Redis Memory 60% - 70%
🟡 Queue Depth 100 - 1000
🟡 Web Vital (LCP): 2.5s - 4s

Action: Investigate root cause, but no immediate escalation required
```

#### Red Zone (Escalate Immediately)
```
🔴 Error Rate > 1% for 5 minutes
🔴 P95 Latency > 2s for 10 minutes
🔴 API Health: DOWN or DEGRADED
🔴 Database Connections > 80%
🔴 Redis Memory > 80%
🔴 Queue Depth > 1000
🔴 Web Vital (LCP): > 4s
🔴 5xx Errors > 10 in 5 minutes

Action: IMMEDIATE escalation to on-call engineer
```

---

## Log Aggregation Setup

### Current Log Infrastructure

**API Logging**:
- Location: `services/api/src/common/logger/structured-logger.ts`
- Format: JSON with timestamp, level, context
- Output: Console (development), File (production)
- Rotation: Daily recommended

**Web Logging**:
- Location: `apps/web/lib/sentry.ts`
- Format: Sentry events + structured messages
- Output: Sentry dashboard
- Retention: 90 days (Sentry default)

### Log Files to Monitor

**Production Logs**:
```
/var/log/imobi/api.log           ← Main API application log
/var/log/imobi/api-error.log     ← API error-only log
/var/log/imobi/health-check.log  ← Health check results
/var/log/imobi/worker.log        ← BullMQ worker logs
```

### Structured Log Examples

**Authentication Event**:
```json
{
  "timestamp": "2026-06-22T12:00:00Z",
  "level": "INFO",
  "context": "AuthService",
  "message": "User login successful",
  "userId": "usr_123",
  "provider": "google",
  "duration": 150,
  "ip": "192.168.1.1"
}
```

**Error Event**:
```json
{
  "timestamp": "2026-06-22T12:00:01Z",
  "level": "ERROR",
  "context": "EvidenceService",
  "message": "GPS validation failed",
  "userId": "usr_456",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "error": "Point outside allowed boundary",
  "trace": "ValidationError: ..."
}
```

**Business Event**:
```json
{
  "timestamp": "2026-06-22T12:00:02Z",
  "level": "INFO",
  "context": "CreditService",
  "message": "Credit approved",
  "userId": "usr_789",
  "creditAmount": 50000,
  "loanType": "construction",
  "duration": 2500,
  "approvalScore": 850
}
```

### Log Monitoring Queries

#### Elasticsearch/Kibana

```
# Recent errors
level:ERROR AND timestamp:[now-1h TO now]

# Failed logins
message:"login attempt failed" AND timestamp:[now-24h TO now]

# Slow requests
duration:>2000 AND timestamp:[now-1h TO now]

# User-specific logs
userId:"usr_123" AND timestamp:[now-24h TO now]

# Evidence upload errors
message:"evidence" AND level:ERROR
```

#### CloudWatch/Vercel

```bash
# View recent API logs
vercel logs imobi-api --limit=100

# Filter for errors
vercel logs imobi-api --limit=100 | grep ERROR

# Follow logs in real-time
vercel logs imobi-api --follow
```

### Setting Up Log Aggregation (Optional Post-Launch)

For advanced centralized logging, consider:

1. **Sentry** (Already integrated)
   - Captures errors and exceptions
   - Performance monitoring
   - Release tracking

2. **Vercel Analytics**
   - Web performance metrics
   - Error tracking
   - Real-time dashboards

3. **ELK Stack** (Self-hosted option)
   - Centralized log storage
   - Powerful search/analysis
   - Custom dashboards

4. **Grafana Loki** (Lightweight option)
   - Low-cost log aggregation
   - Docker-friendly
   - Label-based indexing

---

## Incident Response Template

### Incident Declaration Form

```
╔════════════════════════════════════════════════════════════════╗
║              IMOBI INCIDENT DECLARATION FORM                   ║
╚════════════════════════════════════════════════════════════════╝

INCIDENT ID:        INC-2026-06-22-001
TIMESTAMP:          2026-06-22 12:00:00 UTC
DECLARED BY:        [Your Name]
SEVERITY:           [ ] P0-CRITICAL [ ] P1-HIGH [ ] P2-MEDIUM [ ] P3-LOW

DESCRIPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title: [Brief description]
Impact: [What is broken? How many users affected?]
User Impact: [Can users login? Can they complete workflows?]

AFFECTED SYSTEMS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☐ API Backend
☐ Web Frontend
☐ Database
☐ Cache (Redis)
☐ Email Service
☐ File Storage (S3)
☐ Authentication
☐ Other: _______________

DETECTION & TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detected By:        [ ] UptimeRobot [ ] Sentry [ ] User Report [ ] Manual
First Notice:       [Timestamp]
Reported To Lead:   [Timestamp]
Team Mobilized:     [Timestamp]

INITIAL INVESTIGATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error Messages:     [Copy error from logs/Sentry]
Affected Endpoints: [Which API endpoints? Which pages?]
Error Rate:         [Percentage]
Status Code:        [HTTP status or error code]
Recent Changes:     [Any deployment or configuration change?]
Root Cause:         [Initial hypothesis]

ASSIGNED TEAM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Incident Commander: [Name]
Primary Engineer:   [Name]
Secondary Engineer: [Name]
DevOps Support:     [Name]

ESCALATION CONTACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
On-Call Lead:       [Name] [Phone]
Team Lead:          [Name] [Phone]
Engineering Lead:   [Name] [Phone]
CTO:                [Name] [Phone]

RESOLUTION TRACKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Status:             [ ] INVESTIGATING [ ] IN-PROGRESS [ ] RESOLVED [ ] MONITORING

Mitigation Steps:
  [X] Step 1: [Action taken at HH:MM]
  [X] Step 2: [Action taken at HH:MM]
  [ ] Step 3: [Next action]

ETA to Resolution:  [Time estimate]
Resolved Time:      [When status changed to normal]
Total Duration:     [HH:MM:SS]

ROOT CAUSE ANALYSIS (Post-Incident)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Root Cause:         [Detailed explanation]
Contributing Factors: [Any systemic issues?]
Why Not Caught:     [Why didn't monitoring catch this?]
Fix Applied:        [Code change / configuration change / restart]
Preventive Measures: [What to do to prevent recurrence?]

POST-MORTEM REQUIRED: [ ] YES [ ] NO
Post-Mortem Date:   [Within 24 hours]

NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Additional notes, links, references]

```

### Incident Response Workflow

```
PHASE 1: DETECT & ALERT (T+0)
├─ Alert triggered (UptimeRobot/Sentry/Manual)
├─ Notification sent to Slack/Email
├─ Alert includes: Severity, Service, Status
└─ Team checks notification

PHASE 2: TRIAGE (T+5 min)
├─ On-call engineer confirms incident
├─ Assess severity level
├─ Gather initial information
├─ Open incident tracking document
└─ Notify incident commander

PHASE 3: INVESTIGATION (T+10 min)
├─ Check health endpoint status
├─ Review Sentry for error patterns
├─ Check recent deployments
├─ Review infrastructure metrics
├─ Query database for anomalies
├─ Check Redis queue status
└─ Document findings

PHASE 4: MITIGATION (T+20 min)
├─ Identify potential fix
├─ Brief team on planned action
├─ Apply fix (hotfix / rollback / restart)
├─ Deploy to production
├─ Monitor for improvement
└─ Verify resolution

PHASE 5: MONITORING (T+30 min - T+2 hours)
├─ Check error rate trending down
├─ Verify latency normalized
├─ Confirm user reports resolve
├─ Monitor for recurrence
├─ Check all systems healthy
└─ Declare incident RESOLVED

PHASE 6: POST-MORTEM (T+24 hours)
├─ Schedule post-mortem meeting
├─ Collect timeline and details
├─ Identify root cause
├─ Document preventive measures
├─ Create follow-up tickets
└─ Update runbooks
```

### Common Incident Scenarios & Response

#### Scenario 1: API Health Check Failing

**Symptoms**:
- UptimeRobot alert: HTTP 503 or timeout
- API endpoint unreachable
- Web app shows error

**Investigation**:
1. Check if API container is running (Docker/Process logs)
2. Check database connectivity: `curl https://api.imobi.com.br/api/v1/health`
3. Review recent deployment changes
4. Check for resource exhaustion (CPU, Memory)
5. Check logs for errors

**Quick Fixes** (in order):
1. Restart API service: `docker restart imobi-api` or equivalent
2. Check database connectivity (reconnect if needed)
3. Clear cache: `redis-cli FLUSHALL`
4. Rollback last deployment if recent change
5. Escalate to DevOps if still failing

#### Scenario 2: High Error Rate (> 1%)

**Symptoms**:
- Sentry dashboard shows error spike
- Slack alert: "Error rate > 1%"
- Specific endpoint affected

**Investigation**:
1. Open Sentry to see error type distribution
2. Identify which endpoint(s) are failing
3. Check if it's a recent deployment
4. Review error message details
5. Check for related external service failures

**Quick Fixes** (in order):
1. Check if specific user/action is causing errors
2. Rollback recent deployment if suspected
3. Apply hotfix if root cause identified
4. Monitor error rate return to normal
5. Create follow-up ticket for analysis

#### Scenario 3: Response Time Degradation (P95 > 2s)

**Symptoms**:
- Vercel Analytics shows slow page loads
- Sentry shows slow transaction traces
- Users report slow app

**Investigation**:
1. Check database query performance (slow query log)
2. Check Redis cache hit rate
3. Check API response times per endpoint
4. Check database connection pool usage
5. Check if specific operation is slow

**Quick Fixes** (in order):
1. Check database connection pool saturation
2. Restart database service if connections stuck
3. Clear Redis cache to reset hit rates
4. Check for runaway queries (kill if needed)
5. Optimize slow query or add index (if identified)

#### Scenario 4: Database Connection Pool Exhausted

**Symptoms**:
- Sentry shows "connection timeout" errors
- Health check shows "database not configured"
- All database operations failing

**Investigation**:
1. Check current connection count: `SELECT count(*) FROM pg_stat_activity;`
2. Check max connections setting
3. Look for hanging connections
4. Check if there's a query causing blockage

**Quick Fixes** (in order):
1. Terminate idle connections (PostgreSQL)
2. Restart API service (clears connection pool)
3. Increase max connections (if possible)
4. Identify and kill runaway query
5. Escalate to database admin

#### Scenario 5: Redis Connection Failure

**Symptoms**:
- Health check: `redis.status: "error"`
- Cache operations failing
- Queue jobs not processing

**Investigation**:
1. Ping Redis: `redis-cli ping`
2. Check Redis availability
3. Review Redis logs for errors
4. Check network connectivity

**Quick Fixes** (in order):
1. Restart Redis service
2. Verify Redis credentials in .env
3. Check network/firewall rules
4. Reconnect to Redis
5. Verify cache operations resume

---

## Escalation Procedures

### Escalation Chain

```
┌─────────────────────────────────────────────────────────┐
│            ESCALATION CHAIN (Priority Order)            │
└─────────────────────────────────────────────────────────┘

LEVEL 1: On-Call Engineer (Primary)
├─ Available: 24/7 on-call rotation
├─ Response Time: < 5 minutes
├─ Action: Investigate, triage, apply fix
├─ Escalates to: Team Lead if > 15 minutes unresolved
└─ Contact: [Phone/Email/Pagerduty]

LEVEL 2: Team Lead (Secondary)
├─ Available: Business hours + on-call
├─ Response Time: < 10 minutes
├─ Action: Approve escalation, authorize rollback
├─ Escalates to: Engineering Lead if P0
└─ Contact: [Phone/Email]

LEVEL 3: Engineering Lead (Tertiary)
├─ Available: Business hours + on-call
├─ Response Time: < 15 minutes
├─ Action: Strategic decisions, mobilize resources
├─ Escalates to: CTO if production impact severe
└─ Contact: [Phone/Email]

LEVEL 4: CTO (Executive)
├─ Available: Business hours + on-call for P0
├─ Response Time: < 20 minutes
├─ Action: Executive decisions, public communication
├─ Escalates to: CEO if public/PR impact
└─ Contact: [Phone/Email]
```

### Escalation Triggers

**Escalate to Level 2 (Team Lead) if**:
- On-call engineer cannot reach/respond
- Incident unresolved > 15 minutes
- Uncertain about fix/rollback
- Need to approve emergency change

**Escalate to Level 3 (Engineering Lead) if**:
- P0 severity (complete outage)
- Multiple systems affected
- Potential data loss
- Need to mobilize additional resources

**Escalate to Level 4 (CTO) if**:
- P0 severity + > 30 minutes unresolved
- Public/customer-facing outage
- Potential security impact
- Need executive approval for major action

### Escalation Communication Template

**Initial Escalation Notification**:
```
Subject: [ESCALATION] Incident INC-2026-06-22-001

From: [Primary Engineer]
To: [Team Lead]
CC: [On-Call Lead]

Incident: [Brief Description]
Severity: [P0/P1/P2]
Duration: [HH:MM] minutes
Status: INVESTIGATING / IN-PROGRESS / BLOCKED

Issue: [Why escalating?]
- On-call response delayed
- Uncertainty about fix
- Need approval for rollback
- Request for additional resources

Current Actions:
1. [Action taken]
2. [Action in progress]
3. [Next action]

ETA: [Time estimate]
```

### On-Call Rotation Setup

**Create On-Call Schedule** (e.g., in Slack, Google Calendar, PagerDuty):

```
Week of June 22-28, 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PRIMARY:   John Doe
├─ Phone: +55 (11) 99999-0000
├─ Email: john.doe@company.com
├─ Slack: @john
└─ Response Time: < 5 min

SECONDARY: Jane Smith
├─ Phone: +55 (11) 99999-1111
├─ Email: jane.smith@company.com
├─ Slack: @jane
└─ Response Time: < 10 min (if primary unavailable)

ESCALATION: Team Lead
├─ Phone: +55 (11) 99999-2222
├─ Email: lead@company.com
└─ Escalate if: > 15 min unresolved
```

### After-Hours Escalation Checklist

```
When an alert comes in after hours:

☐ Check notification (Slack, Email, Phone)
☐ Log into UptimeRobot/Sentry dashboards
☐ Assess severity (P0/P1/P2/P3)
☐ Triage incident (is it real or false alarm?)
☐ If P0/P1: Page on-call immediately
☐ If P2: Send Slack message to team
☐ Open incident tracking document
☐ Begin investigation
☐ Update status every 15 minutes
☐ Escalate if no progress after 15 minutes
☐ If resolved: Document findings
☐ Close incident ticket
```

---

## Quick Reference Cards

### Troubleshooting Decision Tree

```
START: Alert Received
│
├─→ Alert Type? ─────────────────────────────────────────
│   │
│   ├─→ Health Check DOWN
│   │   └─→ Restart API service
│   │       └─→ If still down: Check database
│   │
│   ├─→ High Error Rate (> 1%)
│   │   └─→ Check Sentry for error type
│   │       ├─→ If recent deployment: Rollback
│   │       └─→ If not: Investigate in logs
│   │
│   ├─→ Slow Response Time (> 2s)
│   │   └─→ Check database performance
│   │       ├─→ Check connection pool
│   │       ├─→ Check slow queries
│   │       └─→ Restart services if needed
│   │
│   ├─→ Redis Connection Error
│   │   └─→ Restart Redis service
│   │       └─→ Verify credentials
│   │
│   └─→ Other Alert
│       └─→ Review alert details
│           └─→ Investigate root cause
│
└─→ If Unresolved After 15 minutes: ESCALATE
```

### One-Page Cheat Sheet

**Save this as laminated reference**:

```
╔═══════════════════════════════════════════════════════════╗
║         IMOBI INCIDENT RESPONSE QUICK REFERENCE           ║
╚═══════════════════════════════════════════════════════════╝

ALERT RECEIVED? Follow these steps:

1. ASSESS SEVERITY
   P0 (Critical): API down, auth broken, data loss
   P1 (High):    Error rate > 5%, latency > 2s
   P2 (Medium):  Error rate 1-5%, latency degraded
   P3 (Low):     Minor issues, UI glitches

2. GATHER INFO
   - Open Sentry: https://sentry.io
   - Open Vercel: https://vercel.com/[project]/analytics
   - Run: ./scripts/health-check-summary.sh
   - Check: curl https://api.imobi.com.br/api/v1/health

3. INVESTIGATE
   - What's broken? (API, Web, DB, Redis, Auth)
   - When did it start? (Deploy? Load spike?)
   - Who's affected? (All users? Specific action?)
   - Error message? (Check Sentry for details)

4. MITIGATE
   P0: Rollback immediately, restart services
   P1: Apply fix or rollback, monitor closely
   P2: Investigate, plan fix for next deployment
   P3: Log for later, continue monitoring

5. ESCALATE IF NEEDED
   > 15 min unresolved: Contact Team Lead
   P0 + > 10 min: Contact Engineering Lead
   P0 + > 30 min: Contact CTO

QUICK COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Health Check:
  curl -s https://api.imobi.com.br/api/v1/health | jq .

View Errors:
  https://sentry.io → Issues → Sort by Date

Check Latency:
  https://vercel.com/[project]/analytics → Web Vitals

Test Login:
  curl -X POST https://api.imobi.com.br/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","senha":"pass"}'

CONTACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
On-Call:      [Name] [Phone]
Team Lead:    [Name] [Phone]
Engineering:  [Name] [Phone]
CTO:          [Name] [Phone]

DASHBOARDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sentry:       https://sentry.io
Vercel:       https://vercel.com/[project]
UptimeRobot:  https://uptimerobot.com/dashboard

THRESHOLDS (Alert if exceeded)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Error Rate:   > 1% for 5 minutes
P95 Latency:  > 2000ms for 10 minutes
Availability: < 99% in 1 hour window
API Health:   Status != "ok"
DB Conn Pool: > 80% usage
Redis Memory: > 80% usage

Last Updated: June 22, 2026
```

---

## Implementation Timeline

### Pre-Launch (Before Go-Live)
- **T-7 days**: Set up UptimeRobot, Sentry DSN
- **T-3 days**: Configure Slack/Email alerts
- **T-2 days**: Deploy health check scripts
- **T-1 day**: Team training + runbook review
- **T-0**: Activate all monitoring, final tests

### Launch Window (Go-Live)
- **T+0 to T+4 hours**: Intensive monitoring (every 15 min)
- **T+4 to T+24 hours**: Regular monitoring (every 1-2 hours)
- **T+24 hours**: Daily morning checks begin

### Ongoing (Weeks 2+)
- **Daily**: Morning + end-of-day checks
- **Weekly**: Metrics review + team meeting
- **Monthly**: SLA review + optimization

---

## Metrics Dashboard Template

**Create a spreadsheet to track daily metrics** (Google Sheets example):

```
Date       | Error Rate | P95 Latency | Availability | Uptime Robot | Incidents | Notes
-----------|------------|-------------|--------------|--------------|-----------|-------
2026-06-22 | 0.02%      | 650ms       | 100%         | ✅ OK        | 0         | Launch day
2026-06-23 | 0.05%      | 720ms       | 100%         | ✅ OK        | 0         | Stable
2026-06-24 | 0.15%      | 850ms       | 99.9%        | ✅ OK        | 1 - DB    | DB restart
...
```

**Metrics to log daily**:
- Error rate (%)
- P95 response time (ms)
- Availability (%)
- UptimeRobot status
- Critical incidents (count)
- Notable events

---

## Sign-Off & Approval

**This document is approved by**:

- [ ] DevOps Lead: _________________________ Date: _______
- [ ] Engineering Lead: _________________________ Date: _______
- [ ] Team Lead: _________________________ Date: _______

**Implementation Status**:

- [ ] Phase 1 (Pre-Launch) Complete
- [ ] Phase 2 (Launch Day) Complete
- [ ] Phase 3 (Ongoing) Active

**Date Document Activated**: _______________

**Last Updated**: June 22, 2026

---

## Appendix: Resource Links

### External Tools & Dashboards
- UptimeRobot: https://uptimerobot.com
- Sentry: https://sentry.io
- Vercel: https://vercel.com
- PagerDuty (optional): https://pagerduty.com
- Slack: https://slack.com

### Internal Documentation
- Health Endpoint: `/services/api/src/common/health.controller.ts`
- Logger Setup: `/services/api/src/common/logger/structured-logger.ts`
- Health Check Scripts: `/scripts/health-check*.sh`
- Sentry Config (API): `/services/api/src/common/config/sentry.config.ts`
- Sentry Config (Web): `/apps/web/lib/sentry.ts`

### Related Documents
- PRODUCTION_SOFT_LAUNCH_STATUS.md
- BETA_MONITORING_GUIDE.md
- infrastructure/MONITORING.md
- services/api/MONITORING.md

---

**End of Document**

For questions or updates, contact: DevOps Lead  
Document Version: 1.0  
Status: READY FOR IMPLEMENTATION ✅
