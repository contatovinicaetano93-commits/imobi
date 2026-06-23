# Imobi API Monitoring Runbook

**Version**: 1.0.0  
**Last Updated**: June 2026  
**Owner**: DevOps / Platform Team

---

## Table of Contents

1. [Quick Links](#quick-links)
2. [System Health Overview](#system-health-overview)
3. [Dashboard Navigation](#dashboard-navigation)
4. [Common Alerts & Resolution](#common-alerts--resolution)
5. [Escalation Procedures](#escalation-procedures)
6. [Performance Metrics](#performance-metrics)
7. [Debugging Guide](#debugging-guide)
8. [On-Call Handoff](#on-call-handoff)

---

## Quick Links

### Production Dashboards
- **Grafana Dashboard**: https://grafana.imobi.com/d/imobi-api-prod
- **Sentry Error Tracking**: https://sentry.io/organizations/imobi/issues/
- **PagerDuty On-Call**: https://imobi.pagerduty.com/schedules
- **Railway API Logs**: https://railway.app/project/imobi-api

### Useful URLs
- **API Health**: https://api.imobi.com/api/v1/health
- **Prometheus Metrics**: https://prometheus.imobi.com/graph
- **Documentation**: https://wiki.imobi.com/monitoring
- **Runbooks**: https://wiki.imobi.com/runbooks

---

## System Health Overview

### Current Status Check (First Action)

```bash
# Check if API is responding
curl https://api.imobi.com/api/v1/health | jq

# Expected response:
{
  "status": "ok",                  # ok | degraded | error
  "timestamp": "2024-01-15T...",
  "redis": {
    "status": "connected",         # connected | error
    "host": "redis.example.com",
    "port": 6379
  },
  "email": {
    "provider": "sendgrid",
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

### Status Interpretation

| Status | Meaning | Action |
|--------|---------|--------|
| **ok** | All systems healthy | Monitor normally |
| **degraded** | Optional services down, core functions work | Investigate missing service |
| **error** | Critical service (DB/Redis) unavailable | IMMEDIATE ACTION - escalate to P1 |

---

## Dashboard Navigation

### Grafana Dashboard

**URL**: https://grafana.imobi.com/d/imobi-api-prod

#### Key Metrics Panel Layout

```
┌─────────────────────────────────────────────────────────┐
│ System Health Overview                                  │
├─────────────────────────────────────────────────────────┤
│ Status: OK/Degraded/Error  |  Uptime: 99.95%           │
│ Active Errors: 5           |  P95 Latency: 120ms        │
└─────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────────────────┬──────────────────────┐
│ Request Rate         │ Error Rate (%)       │ Response Time (ms)   │
│ 450 req/sec          │ 0.3%                 │ P50: 80ms            │
│ ↑ +50 req/sec        │ ↑ +0.1%              │ P95: 120ms           │
│ (Last 5m vs 1h)      │                      │ P99: 250ms           │
└──────────────────────┴──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┬──────────────────────┐
│ Database             │ Redis Cache          │ Active Jobs          │
│ Connections: 42/100  │ Memory: 2.1GB/8GB    │ Pending: 234         │
│ Query Latency: 45ms  │ Hit Rate: 82%        │ Processing: 15       │
│ Slow Queries: 0      │ Connected: ✓         │ Failed: 2            │
└──────────────────────┴──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┬──────────────────────┐
│ CPU Usage            │ Memory Usage         │ Disk Space           │
│ 35%                  │ 4.2GB / 8GB (52%)    │ 125GB / 200GB (62%)  │
│ ↓ -5% (Trending)     │ ↑ Stable             │ ↓ Stable             │
└──────────────────────┴──────────────────────┴──────────────────────┘
```

#### How to Read Each Panel

**Request Rate Graph**
- Y-axis: Requests per second
- X-axis: Time (last 6 hours, 1 day, 7 days)
- Look for: Spikes, drops, or unusual patterns
- Action: Sharp drop = possible outage, sharp spike = load issue

**Error Rate Graph**
- Shown as percentage (0-100%)
- Red zone: > 1% is warning, > 5% is critical
- Color coding: Green (good) → Yellow (warning) → Red (critical)
- Breakdown: 4xx vs 5xx errors shown separately

**Response Time (Latency)**
- Shows P50, P95, P99 percentiles
- P50: Median response time
- P95: 95th percentile (95% of requests faster than this)
- P99: 99th percentile (performance tail)
- Red zone: P95 > 2000ms is concerning

---

## Common Alerts & Resolution

### P1 Alerts (Critical - Immediate Action)

#### Alert: API Down

**Severity**: CRITICAL  
**PagerDuty**: Page on-call engineer immediately

**Symptoms**:
- Health check returns status: error
- Cannot reach https://api.imobi.com/api/v1/health
- Grafana shows red status

**Resolution Steps**:

```bash
# 1. Verify API connectivity
curl https://api.imobi.com/api/v1/health

# 2. Check Railway deployment status
railway logs --follow

# 3. Check recent deployments
# Go to: https://railway.app/project/imobi-api

# 4. Verify database is running
# Check DATABASE_URL configuration

# 5. Check if service restarted unexpectedly
railway logs | grep -i "startup\|error\|exception"

# 6. If recent deployment, rollback
# Go to Railway → Deployments → Click previous version → Redeploy

# 7. Check logs for startup errors
# Go to Railway → Logs → Filter by "ERROR"
```

**Escalation**:
- If not resolved in 5 min → Escalate to Backend Lead
- If not resolved in 15 min → Escalate to VP Engineering

#### Alert: Database Connection Failed

**Severity**: CRITICAL  
**PagerDuty**: Page on-call DBA

**Symptoms**:
- Health check shows `redis.status: error` or `database.configured: false`
- Errors in logs: "connect ECONNREFUSED" or "FATAL: remaining connection slots reserved"
- All database operations timeout

**Resolution Steps**:

```bash
# 1. Check database connectivity from Railway shell
railway shell
psql $DATABASE_URL -c "SELECT 1;"

# 2. Check if database is running
# Go to Railway → PostgreSQL service → Overview

# 3. Check connection pool status
# Query active connections:
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 4. If connection pool full, restart API
# This will reset all connections
railway restart

# 5. Check for stuck queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# 6. If query is stuck, kill it
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid <> pg_backend_pid();"
```

**Prevention**:
- Monitor connection pool usage regularly
- Scale connection limits if approaching 80% usage
- Review slow queries in dashboard

#### Alert: Redis Connection Failed

**Severity**: CRITICAL  
**PagerDuty**: Page on-call DBA

**Symptoms**:
- Health check shows `redis.status: error`
- Cache misses on every request
- Errors: "connect ECONNREFUSED" or "NOAUTH Authentication required"

**Resolution Steps**:

```bash
# 1. Check Redis connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# 2. If password protected, check password
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# 3. Check Redis service status
# Go to Railway → Redis service → Overview

# 4. Verify REDIS_URL configuration is correct
echo $REDIS_URL

# 5. Check for memory pressure
# If Redis memory > 90%, flush old keys
redis-cli FLUSHDB ASYNC

# 6. Restart API to reconnect
railway restart
```

**Prevention**:
- Monitor Redis memory usage
- Set appropriate key TTL values
- Configure eviction policy (allkeys-lru)

#### Alert: High Error Rate (> 5% for 5 minutes)

**Severity**: CRITICAL  
**PagerDuty**: Page on-call engineer

**Symptoms**:
- Grafana shows error rate spiking above red threshold
- Sentry collects many new errors
- Users report API failures

**Resolution Steps**:

```bash
# 1. Identify which endpoints are failing
# Go to Sentry → Issues → Filter by recent

# 2. Check recent deployments
railway logs | grep -i "deployed\|restarted"

# 3. Review error types
# Most common:
# - 500: Server errors
# - 502/503: Gateway/Service unavailable
# - 429: Rate limiting
# - 401/403: Authentication/Authorization

# 4. Check database and cache health
curl https://api.imobi.com/api/v1/health

# 5. Check for resource exhaustion
# CPU > 80% or Memory > 90%?
# Scale up dyno/instance if needed

# 6. Look for error patterns in logs
railway logs --service api | tail -100 | grep ERROR

# 7. If recent deployment caused it, rollback
# Go to Railway → Deployments → Redeploy previous version
```

**Prevention**:
- Review error logs daily
- Set up error tracking alerts
- Test deployments in staging first

---

### P2 Alerts (High - Action Required Within 30 minutes)

#### Alert: High Response Time (P95 > 2 seconds)

**Symptoms**:
- Users report slow API response
- Grafana P95 latency > 2000ms
- Database query time spiking

**Resolution Steps**:

```bash
# 1. Check which endpoints are slow
# Go to Grafana → Drilling down on slow requests

# 2. Identify slow database queries
# Query slow log:
psql $DATABASE_URL -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# 3. Check if indexes are missing
# Examine query plan:
EXPLAIN ANALYZE SELECT ...;

# 4. Check database connection pool usage
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# 5. Review recent code changes
# Check if new queries were added

# 6. Consider caching the slow query
# Update cache TTL in application
```

**Prevention**:
- Regular query optimization reviews
- Monitor query execution times
- Add indexes for commonly filtered fields

#### Alert: Queue Depth Growing (> 100 jobs)

**Symptoms**:
- Job queue backing up
- Delayed notifications
- Background tasks failing

**Resolution Steps**:

```bash
# 1. Check queue status
# Go to Grafana → Job Queues panel

# 2. Check for stuck/failing jobs
# Query BullMQ dashboard if available

# 3. Check job processor status
railway logs --service api | grep -i "job\|queue"

# 4. If jobs are failing, review logs for error details
# Fix the underlying job error

# 5. If queue is just backlogged, monitor
# Queue will eventually clear as jobs process

# 6. Temporarily increase job processing speed
# Increase worker concurrency if safe to do
```

#### Alert: Rate Limiting Active

**Symptoms**:
- Users getting 429 (Too Many Requests) errors
- Spike in requests
- Possible DDoS or legitimate traffic spike

**Resolution Steps**:

```bash
# 1. Check request sources
# Go to Sentry → 429 errors → Check IPs

# 2. Identify if legitimate or attack
# Check if traffic from known clients
# Check geographic distribution

# 3. If DDoS:
# - Enable Vercel/Railway DDoS protection
# - Add rate limiting rules in CDN

# 4. If legitimate traffic spike:
# - Increase rate limits temporarily
# - Scale API to handle more traffic
# - Contact affected users

# 5. Monitor for continued spike
# Set up rate limiting alerts with lower threshold
```

---

## Escalation Procedures

### Escalation Chain

```
Alert Triggered
    ↓
On-Call Engineer Paged (PagerDuty)
    ├─ If resolved in 15 min → Done
    └─ If not resolved → Escalate
         ↓
    Backend Team Lead Paged
    ├─ If resolved in 30 min → Done
    └─ If not resolved → Escalate
         ↓
    VP Engineering Paged
```

### Who to Escalate To

| Issue Type | Owner | Contact |
|------------|-------|---------|
| Database | DBA Team | #database-on-call |
| API Code | Backend Lead | @backend-lead |
| Infrastructure | DevOps | #devops-on-call |
| Security | Security Team | #security-on-call |

### Escalation Template (PagerDuty)

When escalating, provide:

```
Issue: [Brief description]
Severity: P1 | P2
Duration: [How long it's been happening]
Impact: [Number of users affected]
Steps Taken: [What you've already tried]
Diagnosis: [What you've found so far]
```

---

## Performance Metrics

### Key Metrics to Monitor

#### Request Metrics
```
metric: http_requests_total
labels: method, path, status_code

Healthy ranges:
- P50 (median) latency: < 100ms
- P95 latency: < 500ms
- P99 latency: < 2000ms
- Error rate: < 0.5%
```

#### Database Metrics
```
metric: database_connections_total
metric: database_query_duration_seconds

Healthy ranges:
- Connection pool usage: < 80%
- Query latency: < 100ms
- Slow queries (> 1s): 0-2 per hour
```

#### Cache Metrics
```
metric: cache_hits_total
metric: cache_misses_total

Healthy ranges:
- Cache hit rate: > 75%
- Redis memory: < 80% of allocated
- Connection errors: 0
```

#### Background Jobs
```
metric: bullmq_queue_size
metric: bullmq_processed_total

Healthy ranges:
- Queue depth: < 100 jobs
- Processing rate: > 10 jobs/sec
- Failed jobs: < 1% of processed
```

#### System Resources
```
metric: node_cpu_usage_percent
metric: node_memory_usage_bytes

Healthy ranges:
- CPU: < 70%
- Memory: < 75%
- Disk: > 15% free
```

---

## Debugging Guide

### 1. Enable Debug Logging

```bash
# In Railway environment variables, set:
DEBUG=imobi:*
LOG_LEVEL=debug

# Restart API
railway restart

# View logs
railway logs --follow
```

### 2. Check Sentry for Error Details

```
1. Go to https://sentry.io/organizations/imobi/issues/
2. Click on the error
3. Review:
   - Stack trace
   - User information
   - Request details
   - Release version
   - Browser/environment info
```

### 3. Query Prometheus Directly

```bash
# Access Prometheus UI
# https://prometheus.imobi.com/graph

# Common queries:
rate(http_requests_total[5m])           # Requests per second
rate(http_requests_total{status=~"5.."}[5m])  # Error rate
histogram_quantile(0.95, http_request_duration_seconds_bucket[5m])  # P95 latency
redis_memory_usage_bytes / 1024 / 1024  # Redis memory in MB
```

### 4. Check Application Logs

```bash
# Real-time logs
railway logs --follow

# Filter by log level
railway logs --follow | grep ERROR

# Search for specific string
railway logs | grep "userId_123"

# Search by date range
railway logs --from 2024-01-15T10:00:00Z --to 2024-01-15T11:00:00Z
```

### 5. SSH into Container

```bash
# Get shell access to running container
railway shell

# Check environment variables
env | grep -E "DATABASE_URL|REDIS"

# Check file system
ls -la /app

# Monitor processes
top

# Check network connectivity
curl https://api.imobi.com/api/v1/health
```

---

## On-Call Handoff

### Before Handing Off

Run this checklist:

```bash
# 1. Check system health
curl https://api.imobi.com/api/v1/health | jq .status

# 2. Review recent alerts
# Go to PagerDuty → Recent incidents

# 3. Check error trends
# Go to Sentry → Issues (last 24h)

# 4. Verify all services operational
# Go to Grafana → Health panel

# 5. Note any ongoing investigations
# Comment in Slack #incident-response

# 6. Hand off to next on-call
# Include:
# - Current status
# - Any known issues
# - Recent changes or deployments
# - Upcoming maintenance windows
```

### Handoff Notes Template

```
On-Call Handoff - [Date]

✓ System Status: [OK/Degraded/Issues]

Recent Activity:
- [Alert/incident and resolution]
- [Deployment and status]
- [Performance observations]

Known Issues:
- [Issue description]
- [Expected resolution time]

Upcoming:
- [Planned maintenance]
- [Deployments scheduled]

Contact Info:
- Previous on-call: [Name] [Slack]
- DBA on-call: [Name] [Phone]
- Backend lead: [Name] [Phone]

Dashboard Links:
- Grafana: https://grafana.imobi.com/d/imobi-api-prod
- Sentry: https://sentry.io/organizations/imobi/issues/
```

---

## Troubleshooting Decision Tree

```
Alert Received
│
├─ Is API responding? (curl health endpoint)
│  ├─ NO → API Down (see resolution)
│  └─ YES → Continue
│
├─ Is database connected?
│  ├─ NO → Database Error (see resolution)
│  └─ YES → Continue
│
├─ Is Redis connected?
│  ├─ NO → Redis Error (see resolution)
│  └─ YES → Continue
│
├─ Is error rate high?
│  ├─ YES → High Error Rate (see resolution)
│  └─ NO → Continue
│
├─ Is response time high?
│  ├─ YES → High Latency (see resolution)
│  └─ NO → Continue
│
└─ Check resource usage
   ├─ CPU > 80%? → Scale up
   ├─ Memory > 80%? → Restart or scale
   └─ Disk < 10%? → Cleanup logs
```

---

## Contact Information

### On-Call Schedule
- **PagerDuty**: https://imobi.pagerduty.com/schedules

### Team Leads
- **Backend**: Slack @backend-lead
- **DevOps**: Slack @devops-lead
- **Database**: Slack @dba-on-call

### Escalation
- **VP Engineering**: @vp-engineering
- **CTO**: @cto

### Communication Channels
- **Incidents**: #incident-response (Slack)
- **Monitoring**: #monitoring (Slack)
- **On-Call**: #on-call-schedule (Slack)

---

## Quick Reference Card

Keep this handy during on-call:

```
QUICK REFERENCE - Imobi API Monitoring

Health Check:     curl https://api.imobi.com/api/v1/health
Grafana:          https://grafana.imobi.com/d/imobi-api-prod
Sentry Errors:    https://sentry.io/organizations/imobi/issues/
Logs:             railway logs --follow
View Deployments: railway logs | grep -i deployed

P1 - Immediate action:
  □ API Down          → Check health, restart if needed
  □ DB Connection     → Verify DATABASE_URL, check pg_stat_activity
  □ Redis Down        → Verify REDIS_URL, restart API
  □ High Errors       → Check Sentry, identify error pattern

P2 - Within 30 min:
  □ High Latency      → Check database query plans
  □ Queue Backing Up  → Check job processor
  □ Rate Limiting     → Check for DDoS or traffic spike

Escalate if unsure → #incident-response channel or PagerDuty
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jun 2026 | Initial monitoring runbook |
| | | - 12 common alerts documented |
| | | - Escalation procedures defined |
| | | - Debugging guide added |

---

**Last Updated**: June 23, 2026  
**Next Review**: September 23, 2026  
**Owner**: Platform Engineering Team
