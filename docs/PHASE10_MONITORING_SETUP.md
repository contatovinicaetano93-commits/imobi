# PHASE 10: Monitoring Setup — Production Launch Dashboards & Alerts

**Document Version:** 1.0  
**Created:** 2026-05-31  
**Launch Window:** 2026-06-02, 02:00-04:00 UTC  
**Owner:** DevOps Lead + Monitoring Engineer  
**Status:** Production monitoring ready

---

## CRITICAL: Monitoring is your lifeline during launch

Every metric, every alert, every dashboard is pre-configured and tested. During launch, these dashboards are constantly watched. This document is the monitoring bible.

---

## SECTION 1: DASHBOARD SETUP

### 1.1 CloudWatch Dashboard (AWS)

**Name:** `imobi-production-launch`  
**Region:** `us-east-1`  
**Access URL:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=imobi-production-launch

#### Dashboard Widgets (Create in this order)

**Widget 1: API Error Rate (%) - Real-time**

```
Metric: AWS/ApplicationELB
Statistic: Sum(HTTPCode_Target_5XX) / Sum(RequestCount) * 100
Period: 1 minute
Namespace: AWS/ApplicationELB
Dimensions:
  - LoadBalancer: arn:aws:elasticloadbalancing:us-east-1:XXX:loadbalancer/app/imobi-prod-alb/XXX
  - TargetGroup: arn:aws:elasticloadbalancing:us-east-1:XXX:targetgroup/imobi-api-prod/XXX

Display: Line graph
Threshold alarm: RED if > 1%, YELLOW if > 0.5%
```

**Widget 2: API Response Time (p95 Latency)**

```
Metric: AWS/ApplicationELB
Statistic: p95
Metric Name: TargetResponseTime
Period: 1 minute
Namespace: AWS/ApplicationELB

Display: Line graph
Threshold: RED if > 500ms, YELLOW if > 300ms
```

**Widget 3: API Request Count (req/sec)**

```
Metric: AWS/ApplicationELB
Statistic: Sum (requests per second)
Metric Name: RequestCount
Period: 1 minute
Dimensions: LoadBalancer ARN (same as Widget 1)

Display: Area chart
Expected spike: Should rise from 0 to 20-50 req/sec over first 5 min
```

**Widget 4: Database Connections (Active)**

```
Metric: AWS/RDS
Statistic: Average
Metric Name: DatabaseConnections
Period: 1 minute
Dimensions:
  - DBInstanceIdentifier: imbobi-prod

Display: Line graph
Threshold: RED if > 80, YELLOW if > 50
Expected: Starts ~5, rises to 15-30, stabilizes
```

**Widget 5: Database CPU Utilization (%)**

```
Metric: AWS/RDS
Statistic: Average
Metric Name: CPUUtilization
Period: 1 minute
Dimensions: DBInstanceIdentifier: imbobi-prod

Display: Line graph
Threshold: RED if > 80%, YELLOW if > 60%
Expected: Stays < 30% during normal operation
```

**Widget 6: Database Query Performance (Slow Queries)**

```
Custom Metric: Custom/Database
Metric Name: SlowQueries
Period: 1 minute
Statistic: Sum

Display: Number widget
Threshold: RED if > 5, YELLOW if > 2
Expected: 0 during stable operation
```

**Widget 7: Redis Memory Usage (%)**

```
Metric: AWS/ElastiCache
Statistic: Average
Metric Name: DatabaseMemoryUsagePercentage
Period: 1 minute
Dimensions:
  - CacheClusterId: imobi-prod-redis

Display: Gauge
Threshold: RED if > 80%, YELLOW if > 60%
Expected: Stays 20-40% under normal load
```

**Widget 8: Redis Hit Rate (%)**

```
Metric: AWS/ElastiCache
Statistic: Average
Metric Name: CacheHits / (CacheHits + CacheMisses) * 100
Period: 5 minutes
Dimensions: CacheClusterId: imobi-prod-redis

Display: Line graph
Expected: > 85% (good cache performance)
```

**Widget 9: Payment Success Rate (%)**

```
Custom Metric: Custom/Payments
Metric Name: SuccessRate
Period: 5 minutes
Statistic: Average

Display: Line graph
Threshold: RED if < 99%, YELLOW if < 99.5%
Expected: > 99.8% (Stripe reliability)
```

**Widget 10: Evidence Upload Success Rate (%)**

```
Custom Metric: Custom/Evidence
Metric Name: UploadSuccessRate
Period: 5 minutes
Statistic: Average

Display: Line graph
Threshold: RED if < 98%, YELLOW if < 99%
Expected: > 99% (S3 uploads)
```

**Widget 11: Auth Failures (count)**

```
Custom Metric: Custom/Auth
Metric Name: FailureCount
Period: 1 minute
Statistic: Sum

Display: Number widget
Threshold: RED if > 10, YELLOW if > 5
Expected: 0 for successful logins
```

**Widget 12: Active Users (count)**

```
Custom Metric: Custom/Application
Metric Name: ActiveUserCount
Period: 1 minute
Statistic: Average

Display: Number widget
Expected: Rises from 0 to 100+ over first hour
```

#### Setup Command (Create dashboard via AWS CLI):

```bash
aws cloudwatch put-dashboard \
  --dashboard-name imobi-production-launch \
  --dashboard-body file://dashboards/cloudwatch-launch.json \
  --region us-east-1

# File location: /home/user/imobi/infrastructure/dashboards/cloudwatch-launch.json
# (Included in infrastructure repo)
```

---

### 1.2 Sentry Dashboard (Error Tracking)

**Project:** imobi  
**Environment:** production  
**Release:** v2.0.0  
**Access URL:** https://sentry.io/organizations/imobi/issues/?query=release%3Av2.0.0

#### Configured Alerts

**Alert 1: High Error Rate**
- Trigger: Error rate > 1% over 5 minutes
- Action: Send to #ops-critical in Slack + page on-call

**Alert 2: Spike in 5XX Errors**
- Trigger: 5XX errors increase by 50% in 5 minutes
- Action: Send to #ops-critical + page Tech Lead

**Alert 3: Payment Service Errors**
- Trigger: Payment-related errors > 5 in 5 minutes
- Action: Send to #ops-critical + page DevOps Lead

**Alert 4: Database Connection Errors**
- Trigger: > 3 database errors in 5 minutes
- Action: Send to #ops-critical + page DevOps Lead

**Alert 5: Authentication Failures**
- Trigger: Auth errors > 10 in 5 minutes
- Action: Send to #ops-critical (warning only)

#### Sentry Setup

```bash
# Verify Sentry DSN is set in production
echo $SENTRY_DSN

# Expected format:
# https://[KEY]@[ORG].ingest.sentry.io/[PROJECT_ID]

# Set release version for this launch
curl -X POST https://sentry.io/api/0/organizations/imobi/releases/ \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "v2.0.0",
    "dateReleased": "2026-06-02T02:00:00Z",
    "projects": ["imobi"]
  }'
```

---

### 1.3 Custom Application Metrics (CloudWatch)

**Publish custom metrics to CloudWatch from the API:**

```typescript
// Location: services/api/src/monitoring/metrics.ts

interface ProductionMetrics {
  paymentSuccessRate: number;      // %
  evidenceUploadSuccessRate: number; // %
  authFailureCount: number;         // count
  activeUserCount: number;          // count
  slowQueryCount: number;           // count
  cacheHitRate: number;             // %
}

// Publish every 1 minute during launch window
setInterval(() => {
  publishMetrics({
    paymentSuccessRate: 99.8,
    evidenceUploadSuccessRate: 99.5,
    authFailureCount: 0,
    activeUserCount: 250,
    slowQueryCount: 0,
    cacheHitRate: 87
  });
}, 60000);
```

**Setup CloudWatch Metric Namespace:**

```bash
# Verify metrics are being published
aws cloudwatch list-metrics \
  --namespace "Custom/Application" \
  --region us-east-1

# Expected: Shows all 6 metrics listed above
```

---

## SECTION 2: ALERT CONFIGURATION

### 2.1 Alert Thresholds

| Metric | Yellow (Warning) | Red (Critical) | Action |
|--------|-----------------|----------------|--------|
| Error Rate | > 0.5% | > 1% | Investigate / Page on-call |
| p95 Latency | > 300ms | > 500ms | Check database / Investigate |
| Payment Failures | > 2% | > 5% | Isolate payment service |
| DB Connections | > 50 | > 80 | Kill idle connections / Investigate |
| Redis Memory | > 60% | > 80% | Clear cache / Restart Redis |
| Auth Failures | > 5 | > 10 | Check auth service |
| Evidence Upload | > 1% failures | > 2% failures | Check S3 / Investigate |
| Active Users | < 10% expected | 0 for 5+ min | Check API / Investigate |

### 2.2 Slack Integration

**Channel:** #ops-critical  
**Mentions:**
- Yellow (warning): Regular notification
- Red (critical): @here
- P1 severity: @here + Zoom alert

#### Slack Webhook Setup

```bash
# Verify Slack webhook is configured for CloudWatch
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  -d '{
    "text": "🧪 Test alert from CloudWatch - Go-Live monitoring ready",
    "channel": "#ops-critical"
  }'

# Expected: Message appears in #ops-critical
```

#### Sample Slack Alert Message

```
🔴 CRITICAL ALERT: API Error Rate Spike

Metric: API Error Rate
Current: 5.2%
Threshold: > 1%
Duration: Last 5 minutes

Impact: ~10% of requests failing
Last Error: [Link to Sentry]

Action Required:
1. Check CloudWatch dashboard
2. Review Sentry issues
3. Page Tech Lead if persistent

⚠️ Escalation in 5 minutes if not resolved
```

---

### 2.3 PagerDuty Integration (if using)

**Service:** imobi-production-api  
**Escalation Policy:** Tech Lead → CTO → CEO  
**Integration Key:** [CONFIGURED IN INFRASTRUCTURE]

#### Escalation Rules

- **Level 1 (5 min):** Page on-call engineer
- **Level 2 (10 min):** Escalate to Tech Lead
- **Level 3 (15 min):** Escalate to CTO

---

## SECTION 3: CUSTOM DASHBOARDS FOR CRITICAL METRICS

### 3.1 API Response Times (p50, p95, p99)

**Data Source:** CloudWatch (TargetResponseTime percentiles)

```
Dashboard Title: "API Performance - Launch Window"
Widgets:
  1. p50 latency (green, target: < 100ms)
  2. p95 latency (yellow, target: < 300ms, warning: > 300ms)
  3. p99 latency (red, target: < 500ms, warning: > 500ms)
  
Update Frequency: 1 minute
Auto-refresh: Every 30 seconds
```

**Expected behavior during launch:**
- T+0-5: Spikes to 200-400ms as traffic arrives
- T+5-30: Stabilizes to 150-250ms
- T+30+: Stays consistently < 150ms

---

### 3.2 Database Query Performance

**Data Source:** CloudWatch RDS metrics + PostgreSQL logs

```
Dashboard Title: "Database Health - Launch Window"
Widgets:
  1. Query latency histogram (p50, p95, p99)
  2. Slow query count (threshold: > 2 = warning)
  3. Connection pool usage (target: < 30, warning: > 50)
  4. Replication lag (target: < 10ms)
  5. CPU utilization (target: < 30%, warning: > 60%)
  
Update Frequency: 1 minute
```

**Expected behavior:**
- Connections: 5 → 20 → stabilize at 15-25
- Slow queries: 0 (all well-indexed)
- CPU: 10-20% (normal)

---

### 3.3 Redis Memory Usage & Hit Rate

**Data Source:** CloudWatch ElastiCache metrics

```
Dashboard Title: "Redis Performance - Launch Window"
Widgets:
  1. Memory usage % (target: < 40%, warning: > 60%)
  2. Cache hit rate % (target: > 85%)
  3. Evictions (target: 0)
  4. CPU utilization (target: < 30%)
  5. Network bytes in/out
  
Update Frequency: 1 minute
```

**Expected behavior:**
- Memory: Rises from 10% to 35-40% as cache fills
- Hit rate: > 90% after 5 minutes (warm cache)
- Evictions: 0 (no cache pressure)

---

### 3.4 Payment Processing Success Rate

**Data Source:** Custom metrics from payment service

```
Dashboard Title: "Payment Processing - Launch Window"
Widgets:
  1. Success rate % (target: > 99.8%, warning: < 99%)
  2. Failed transaction count (target: 0-1, warning: > 5)
  3. Average processing time (target: < 2s)
  4. Stripe API latency (should be < 1s)
  5. Retry count (target: < 5% of total)
  
Update Frequency: 1 minute
```

**Expected behavior:**
- Success rate: > 99.8% (Stripe is reliable)
- Failures: Usually 0, max 1-2 per hour
- Processing time: 800ms-1200ms (normal)

---

### 3.5 Authentication & Security

**Data Source:** Application logs + custom metrics

```
Dashboard Title: "Auth & Security - Launch Window"
Widgets:
  1. Login success rate % (target: > 99%)
  2. Failed login count (target: < 10 per min)
  3. JWT token refresh success % (target: > 99%)
  4. Password reset requests (normal: 0-2 per hour)
  5. Account lockouts (warning if > 3)
  
Update Frequency: 1 minute
```

**Expected behavior:**
- Login success: > 99% (normal user behavior)
- Failed logins: Small percentage (normal)
- Token refresh: > 99% (should always work)

---

### 3.6 Evidence File Upload Success Rate

**Data Source:** Application logs + S3 metrics

```
Dashboard Title: "Evidence Upload - Launch Window"
Widgets:
  1. Upload success rate % (target: > 99%)
  2. Failed uploads (target: 0-1, warning: > 2)
  3. Average upload time (target: < 5s)
  4. S3 API latency (target: < 1s)
  5. File size stats (histogram)
  
Update Frequency: 1 minute
```

**Expected behavior:**
- Success rate: > 99% (S3 is reliable)
- Average upload: 2-3s for typical photos
- Failures: 0 (unless user issues)

---

## SECTION 4: REAL-TIME MONITORING CHECKLIST

### During Launch Window (T+0 to T+120)

**Every 1 minute:**
- [ ] Error rate < 1% (check CloudWatch)
- [ ] p95 latency < 500ms (check CloudWatch)
- [ ] No new Sentry errors > threshold (check Sentry)
- [ ] Redis memory < 60% (check CloudWatch)
- [ ] DB connections < 50 (check CloudWatch)

**Every 5 minutes:**
- [ ] Payment success rate > 99% (check custom metrics)
- [ ] Evidence upload success > 99% (check custom metrics)
- [ ] No stuck jobs in BullMQ (check Redis)
- [ ] All health endpoints returning 200 (curl endpoints)

**Every 15 minutes:**
- [ ] Review Sentry issues (any new patterns?)
- [ ] Check CloudWatch alarms (any yellow/red?)
- [ ] Verify no database slow queries
- [ ] Confirm active user count is rising

**Every 30 minutes (or hourly):**
- [ ] Post status update to #ops-critical
- [ ] Review Slack logs for any issues
- [ ] Verify team is still monitoring
- [ ] Check for any escalations

---

## SECTION 5: DASHBOARD ACCESS & SHARING

### Links to Open (T-30 to Launch)

1. **CloudWatch:** https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=imobi-production-launch

2. **Sentry:** https://sentry.io/organizations/imobi/issues/?query=release%3Av2.0.0

3. **Railway.app:** https://railway.app/project/[PROJECT_ID]/services

4. **Vercel:** https://vercel.com/dashboard/imobi

5. **GitHub Deployments:** https://github.com/imobi/infrastructure/deployments/production

6. **Slack #ops-critical:** https://imobi.slack.com/archives/C0123456789

### Screen Share Setup

During launch, establish these screen shares in Zoom:
- Screen 1: CloudWatch dashboard (DevOps Lead)
- Screen 2: Sentry dashboard (QA/monitoring)
- Screen 3: Slack #ops-critical (Tech Lead)
- Screen 4: GitHub deployments / Railway (as backup)

---

## SECTION 6: POST-LAUNCH MONITORING (24 HOURS)

### Hour 1-4 (Intensive)
- Continuous monitoring, every 1 minute check
- Status updates every 15 minutes
- Team stays in Zoom war room

### Hour 4-24 (Active)
- Health checks every 5 minutes (automated)
- Manual review every 30 minutes
- Status updates every 1 hour
- On-call team on standby

### Hour 24+ (Steady-state)
- Standard monitoring (5-minute intervals)
- Transition to normal on-call rotation
- Performance baseline established
- Post-launch retrospective scheduled

---

## SECTION 7: MONITORING TROUBLESHOOTING

### If dashboards aren't updating:

```bash
# Verify CloudWatch is receiving metrics
aws cloudwatch list-metrics --namespace "AWS/ApplicationELB" --region us-east-1

# Verify API is publishing custom metrics
curl https://api.imobi.app/metrics | jq '.error_rate'

# Verify Sentry DSN is working
curl -X POST https://[DSN]@[ORG].ingest.sentry.io/[PROJECT_ID] \
  -H "Content-Type: application/json" \
  -d '{"message": "Test event"}'
```

### If alerts aren't triggering:

```bash
# Test CloudWatch alarm
aws cloudwatch set-alarm-state \
  --alarm-name "imobi-api-error-rate-high" \
  --state-value ALARM \
  --state-reason "Testing alert"

# Test Slack webhook
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  -d '{"text": "🧪 Alert test successful"}'
```

---

**Document Status:** 🟢 READY FOR LAUNCH  
**Last Updated:** 2026-05-31  
**Next Document:** PHASE10_ROLLBACK_PROCEDURES.md
