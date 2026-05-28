# PRODUCTION MONITORING GUIDE — imbobi

**Last Updated:** May 28, 2026  
**Maintained By:** _______________  
**On-Call Rotation:** _______________

---

## Overview

This guide configures monitoring, alerting, and observability for the imbobi production environment. All critical systems must be monitored with automated alerts for immediate incident response.

**Monitoring Stack:**
- **Error Tracking:** Sentry
- **Metrics:** Prometheus (optional) + CloudWatch
- **Log Aggregation:** CloudWatch Logs (AWS) or ELK
- **APM:** Optional (New Relic / Datadog)
- **Alerting:** SNS/Slack + PagerDuty
- **Dashboards:** Grafana (optional) + CloudWatch

---

## 1. Sentry Setup (Error Tracking)

### Configuration

- [ ] **Sentry Project Created**
  - [ ] Organization: imbobi
  - [ ] Project: imbobi-api
  - [ ] Project URL: https://sentry.io/organizations/imbobi/projects/imbobi-api/
  - [ ] DSN: `https://<key>@sentry.io/PROJECT_ID`
  - [ ] Stored in production env: `SENTRY_DSN`

- [ ] **Sentry Initialization** (Code already in place)
  - [ ] Location: `services/api/src/main.ts`
  - [ ] Verified in code: [ ] Yes [ ] No
  - [ ] Environment: `process.env.NODE_ENV` (should be 'production')
  - [ ] Tracing sample rate: 0.1 (10% for production)
  - [ ] Release version: Git commit SHA auto-detected

### Sentry Configuration Details

```typescript
// services/api/src/main.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ 
      request: true,
      response: true,
    }),
  ],
});
```

### Error Tracking

- [ ] **Error Monitoring Active**
  - [ ] Sentry receiving errors: Check dashboard
  - [ ] Error rate < 1%: [ ] Yes [ ] No
  - [ ] Error rate threshold: Trigger alert if > 5%
  - [ ] Response time monitored: p95, p99

- [ ] **Critical Event Categories**
  - [ ] Authentication failures (login, token refresh)
  - [ ] Authorization failures (insufficient permissions)
  - [ ] Database connection errors
  - [ ] Redis connection errors
  - [ ] Rate limit violations (excessive attempts)
  - [ ] File upload failures
  - [ ] External API failures (SendGrid, Firebase, AWS S3)
  - [ ] Payment/transaction processing errors

### Alert Configuration

- [ ] **Sentry Alerts**
  - [ ] Alert name: "High Error Rate"
  - [ ] Condition: Error count > 100 in 10 minutes
  - [ ] Environment: production
  - [ ] Notification: [Slack] [Email] [PagerDuty]
  - [ ] Slack channel: #incidents
  - [ ] Escalation: None (auto-resolve after 1 hour stable)

- [ ] **Sensitive Error Filtering**
  - [ ] Hide PII (passwords, emails) in error messages
  - [ ] Configured in Sentry: Data Scrubbing
  - [ ] Before send hook in Sentry SDK (optional)

### Dashboard & Investigation

- [ ] **Sentry Dashboard Setup**
  - [ ] Dashboard URL: https://sentry.io/organizations/imbobi/projects/imbobi-api/
  - [ ] Favorite this dashboard
  - [ ] Pin widgets: [Error trends] [Error rate] [Top errors]
  - [ ] Custom query: `environment:production`

- [ ] **Error Investigation Workflow**
  - [ ] Filter by environment: production
  - [ ] Group by: error type, URL, user
  - [ ] Trace through: stack trace → code location
  - [ ] Related issues: links to GitHub PRs if auto-linked
  - [ ] Replay (if Session Replay enabled): watch user interaction

---

## 2. CloudWatch Logs (Log Aggregation)

### Log Stream Configuration

- [ ] **API Container Logs**
  - [ ] Log group: `/aws/ecs/imbobi-api` or `/aws/lambda/imbobi-api`
  - [ ] Retention: 30 days
  - [ ] Format: JSON (structured logging)
  - [ ] Log level: `info` in production (not `debug`)

- [ ] **Log Streams (by service)**
  - [ ] API service: `/imbobi-api/prod`
  - [ ] Database logs: `/rds/imbobi-prod/error` (if available)
  - [ ] Redis logs: `/elasticache/imbobi-redis`
  - [ ] Load balancer logs: `/alb/imbobi-api`

- [ ] **Log Retention Policy**
  - [ ] CloudWatch retention: 30 days minimum
  - [ ] Archive to S3: After 30 days
  - [ ] S3 location: `s3://imbobi-logs-archive/cloudwatch/`
  - [ ] S3 retention: 1 year (for compliance/audit)

### Log Queries & Metrics

- [ ] **Critical Log Queries**
  ```
  # Authentication failures
  fields @timestamp, @message, user_id
  | filter @message like /authentication.*failed/
  | stats count() as failed_logins by user_id

  # Rate limit violations
  fields @timestamp, client_ip, endpoint
  | filter status = 429
  | stats count() as violations by client_ip

  # Database errors
  fields @timestamp, @message
  | filter @message like /error.*database|connection.*failed/
  | stats count()

  # API errors (5XX)
  fields @timestamp, status, endpoint, response_time
  | filter status >= 500
  | stats count() as errors, avg(response_time) as avg_latency by endpoint
  ```

- [ ] **Log Metrics to Create**
  - [ ] Metric: Authentication failures per minute
  - [ ] Metric: HTTP 5XX errors per minute
  - [ ] Metric: Database connection errors per minute
  - [ ] Metric: Average response time (ms)

### Log-Based Alarms

- [ ] **CloudWatch Alarm: High Error Rate**
  - [ ] Metric: HTTP 5XX error count
  - [ ] Threshold: > 50 in 5 minutes
  - [ ] Action: SNS → Slack → #incidents
  - [ ] OK action: Delete incident message (optional)

- [ ] **CloudWatch Alarm: Authentication Attacks**
  - [ ] Metric: Failed login attempts
  - [ ] Threshold: > 20 from single IP in 5 minutes
  - [ ] Action: SNS → Slack → #security
  - [ ] Optional: Auto-block IP with WAF

- [ ] **CloudWatch Alarm: Database Connection Pool**
  - [ ] Metric: DB connection errors
  - [ ] Threshold: > 5 in 1 minute
  - [ ] Action: SNS → PagerDuty (critical)

---

## 3. CloudWatch Metrics & Dashboards

### Standard Metrics (Auto-Collected)

| Metric | Source | Threshold | Action |
|--------|--------|-----------|--------|
| CPU Utilization | ECS/EC2 | > 70% for 5 min | Scale up / Alert |
| Memory Utilization | ECS/EC2 | > 80% for 5 min | Scale up / Alert |
| Network In/Out | EC2/Load Balancer | Normal baseline | Monitor trends |
| Requests Count | Load Balancer | Monitor baseline | Alert if abnormal |
| Request Duration | Load Balancer | p99 < 2s | Alert if > 3s |
| HTTP 2XX | Load Balancer | > 95% | Alert if < 90% |
| HTTP 4XX | Load Balancer | < 5% | Alert if > 10% |
| HTTP 5XX | Load Balancer | < 1% | Alert if > 5% |

### Custom Metrics (API Application)

- [ ] **Application Metrics to Publish**
  - [ ] API response time (ms): Histogram
  - [ ] Database query latency (ms): Histogram
  - [ ] Redis latency (ms): Histogram
  - [ ] JWT token refresh rate: Counter
  - [ ] Cache hit rate: Gauge
  - [ ] Queue depth (pending jobs): Gauge
  - [ ] Queue processing time: Histogram
  - [ ] File upload count: Counter
  - [ ] File upload size (bytes): Summary

- [ ] **Metric Publishing Code**
  ```typescript
  // services/api/src/utils/metrics.ts
  import { CloudWatch } from 'aws-sdk';
  
  const cloudwatch = new CloudWatch();
  
  export async function publishMetric(
    metricName: string,
    value: number,
    unit: string = 'None'
  ) {
    try {
      await cloudwatch.putMetricData({
        Namespace: 'imbobi/api',
        MetricData: [{
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Environment', Value: 'production' },
            { Name: 'Service', Value: 'api' },
          ],
        }],
      }).promise();
    } catch (error) {
      console.error('Failed to publish metric:', error);
    }
  }
  ```

### CloudWatch Dashboard

- [ ] **Create Dashboard: imbobi-production**
  - [ ] Widgets:
    - [ ] Error rate (line chart): Last 24 hours
    - [ ] Request count (bar chart): Last 24 hours
    - [ ] Response time p95/p99: Last 24 hours
    - [ ] CPU/Memory utilization: Last 24 hours
    - [ ] Database connection count: Real-time
    - [ ] Redis memory usage: Real-time
    - [ ] Queue depth: Real-time
  - [ ] Refresh rate: 1 minute
  - [ ] Favorite: Yes
  - [ ] Team access: [DevOps] [Developers] [On-call]

---

## 4. Database Monitoring

### PostgreSQL Monitoring

- [ ] **Database Metrics**
  - [ ] Connection count: Monitor < 50 active
  - [ ] Slow queries: Monitor queries > 500ms
  - [ ] Replication lag (if replicated): Monitor < 100ms
  - [ ] Disk usage: Monitor < 80% full
  - [ ] Table bloat: Monitor and VACUUM if > 20%

- [ ] **Queries to Monitor**
  ```sql
  -- Active connections
  SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
  
  -- Slow queries (requires pg_stat_statements extension)
  SELECT query, calls, mean_exec_time, max_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 500
  ORDER BY mean_exec_time DESC
  LIMIT 10;
  
  -- Table sizes
  SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
  
  -- Replication lag (on standby)
  SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) AS replication_lag_seconds;
  ```

- [ ] **Database Backup Monitoring**
  - [ ] Daily backup runs at: 02:00 UTC
  - [ ] Backup location: AWS RDS snapshots
  - [ ] Backup size: _____ GB
  - [ ] Backup retention: 30 days
  - [ ] Last backup completed: _______________
  - [ ] Backup restore test: Monthly

- [ ] **Database Alerts**
  - [ ] Alert: Disk space > 80%
  - [ ] Alert: Replication lag > 500ms
  - [ ] Alert: Connection pool > 80%
  - [ ] Alert: Slow query detected (> 1s)

### RDS Enhanced Monitoring (AWS)

- [ ] **RDS Enhanced Monitoring Enabled**
  - [ ] Granularity: 60 seconds
  - [ ] Metrics available in CloudWatch: [ ] Yes [ ] No
  - [ ] Monitoring metrics:
    - [ ] CPU utilization
    - [ ] Database connections
    - [ ] Network throughput
    - [ ] Disk I/O activity
    - [ ] Memory usage

---

## 5. Redis Monitoring

### Redis Health Check

- [ ] **Redis Monitoring Command**
  ```bash
  redis-cli -h $REDIS_HOST -p $REDIS_PORT --password $REDIS_PASSWORD INFO
  # Check: connected_clients, used_memory, evicted_keys, total_commands_processed
  ```

- [ ] **Redis Metrics to Monitor**
  - [ ] Connected clients: Monitor for connection leaks
  - [ ] Used memory: Alert if > 80% of max memory
  - [ ] Evicted keys: Alert if > 0 (keys being dropped!)
  - [ ] Hit rate: Monitor (goal: > 50%)
  - [ ] Command latency: Monitor slow commands

- [ ] **Redis Alerts**
  - [ ] Alert: Memory usage > 90%
  - [ ] Alert: Evicted keys > 0 (memory pressure)
  - [ ] Alert: Connection count > 100
  - [ ] Alert: Persistence (AOF) not working

### ElastiCache Monitoring (AWS)

- [ ] **ElastiCache Metrics**
  - [ ] CPU utilization: Alert if > 75%
  - [ ] Network bytes in/out: Monitor baseline
  - [ ] Evictions: Alert if > 0
  - [ ] Replication lag: Alert if > 100ms
  - [ ] Connection count: Alert if > 100

---

## 6. BullMQ Queue Monitoring

### Queue Health

- [ ] **Queue Metrics**
  - [ ] Queue depth (pending jobs): Monitor < 1000
  - [ ] Processing time per job: Monitor < 5 seconds
  - [ ] Failed jobs rate: Alert if > 1%
  - [ ] Stalled jobs: Alert if > 0
  - [ ] Worker count: Verify active workers

- [ ] **Monitoring Queries**
  ```javascript
  // services/workers/queue-monitor.ts
  const queue = new Queue('liberacao-parcela', {
    connection: redis,
  });
  
  async function monitorQueue() {
    const counts = await queue.getJobCounts();
    console.log('Queue status:', {
      pending: counts.waiting,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
    });
  }
  ```

- [ ] **BullMQ Alerts**
  - [ ] Alert: Queue depth > 5000
  - [ ] Alert: Failed jobs > 10 in 1 hour
  - [ ] Alert: Job processing time > 30 seconds
  - [ ] Alert: No active workers (queue stalled)

---

## 7. Load Balancer Monitoring

### Health Check Configuration

- [ ] **Load Balancer Health Check**
  - [ ] Path: `/api/v1/health`
  - [ ] Protocol: HTTPS
  - [ ] Port: 443
  - [ ] Interval: 30 seconds
  - [ ] Timeout: 5 seconds
  - [ ] Healthy threshold: 2 checks
  - [ ] Unhealthy threshold: 3 checks

- [ ] **Load Balancer Metrics**
  - [ ] Request count: Sum of all requests
  - [ ] HTTP 2XX: Target success rate (goal: > 99%)
  - [ ] HTTP 4XX: Client errors (goal: < 5%)
  - [ ] HTTP 5XX: Server errors (goal: < 1%)
  - [ ] Target response time: p99 < 2s

- [ ] **Load Balancer Alerts**
  - [ ] Alert: Unhealthy targets > 0
  - [ ] Alert: HTTP 5XX rate > 5%
  - [ ] Alert: Response time p99 > 3s

---

## 8. Application Performance Monitoring (APM)

### Optional: Datadog / New Relic / Elastic APM

- [ ] **APM Setup** (if using)
  - [ ] Service: imbobi-api
  - [ ] Environment: production
  - [ ] Sampling rate: 10% (for high-traffic apps)
  - [ ] Span collection: [Database queries] [External calls] [Cache] [Job queue]

- [ ] **APM Dashboards**
  - [ ] Service overview: Status, throughput, latency
  - [ ] Database performance: Slow queries, connection pool
  - [ ] External integrations: AWS S3, SendGrid, Firebase
  - [ ] Traces: Detailed request tracing

- [ ] **APM Alerts** (if enabled)
  - [ ] Alert: Service error rate > 5%
  - [ ] Alert: Database query time > 500ms (p95)
  - [ ] Alert: External service latency > 2s

---

## 9. Security Monitoring

### Security Events to Monitor

- [ ] **Authentication & Authorization**
  - [ ] Failed login attempts per IP: Alert if > 10 in 15 min
  - [ ] Failed token refresh: Alert if > 5 in 1 min
  - [ ] Unauthorized access attempts: Alert on any
  - [ ] Permission escalation attempts: Alert on any

- [ ] **API Security**
  - [ ] Rate limit violations: Alert if > 50 per hour
  - [ ] CSRF token validation failures: Alert if > 10
  - [ ] SQL injection attempts (blocked): Alert on any
  - [ ] XSS attempts (blocked): Alert on any

- [ ] **Data Access**
  - [ ] Unusual query patterns: Monitor for data exfiltration
  - [ ] Mass deletion attempts: Alert on any
  - [ ] Permission changes: Log all
  - [ ] API key/secret access: Log all

### Security Dashboards

- [ ] **Create Dashboard: imbobi-security**
  - [ ] Widget: Failed login attempts (by IP)
  - [ ] Widget: Rate limit violations
  - [ ] Widget: CSRF failures
  - [ ] Widget: Unauthorized access attempts
  - [ ] Update frequency: Real-time
  - [ ] On-call access: Critical

---

## 10. Custom Alerts Configuration

### Alert Routing

| Alert | Severity | Notification | Response Time |
|-------|----------|--------------|----------------|
| API down (health check failing) | CRITICAL | PagerDuty → SMS | < 5 min |
| Error rate > 10% | CRITICAL | PagerDuty → Slack | < 5 min |
| Database down | CRITICAL | PagerDuty → SMS | < 5 min |
| Data breach/security event | CRITICAL | PagerDuty + Email | < 5 min |
| Error rate > 5% | HIGH | Slack → #incidents | < 15 min |
| Response time p99 > 3s | HIGH | Slack → #incidents | < 15 min |
| Disk space > 85% | HIGH | Slack → #ops | < 30 min |
| Memory usage > 85% | MEDIUM | Slack → #ops | < 1 hour |
| Rate limit violations > 100/hour | MEDIUM | Slack → #security | < 1 hour |
| Failed jobs > 50 | MEDIUM | Slack → #ops | < 1 hour |
| Cache hit rate < 30% | LOW | Email daily report | N/A |

### Alert Escalation

- [ ] **Level 1 (Auto-resolve after 30 min)**
  - [ ] Send to Slack #incidents channel
  - [ ] Create incident ticket auto-linking
  - [ ] Assign to on-call engineer (if still active)

- [ ] **Level 2 (After 10 minutes, still active)**
  - [ ] Escalate to PagerDuty
  - [ ] SMS to on-call engineer
  - [ ] Escalation policy: On-call → Manager → Director

- [ ] **Level 3 (Critical only, immediate)**
  - [ ] Page on-call engineer immediately
  - [ ] SMS + Phone call
  - [ ] Incident bridge conference call
  - [ ] CEO/Product manager notification

---

## 11. On-Call Rotation & Escalation

### On-Call Team

- [ ] **Primary On-Call**
  - [ ] Engineer: _______________
  - [ ] Contact: _______________
  - [ ] Availability: _______________
  - [ ] Handover date: _______________

- [ ] **Secondary On-Call** (escalation)
  - [ ] Engineer: _______________
  - [ ] Contact: _______________
  - [ ] Availability: _______________
  - [ ] Handover date: _______________

- [ ] **On-Call Manager**
  - [ ] Manager: _______________
  - [ ] Contact: _______________
  - [ ] Escalation criteria: Multiple critical alerts

### Runbooks

- [ ] **Create Runbooks**
  - [ ] API Down: `docs/runbooks/api-down.md`
  - [ ] Database Connection Error: `docs/runbooks/db-connection-error.md`
  - [ ] High Error Rate: `docs/runbooks/high-error-rate.md`
  - [ ] DDoS/Rate Limit Attack: `docs/runbooks/ddos-attack.md`
  - [ ] Data Corruption: `docs/runbooks/data-corruption.md`

- [ ] **Runbook Contents**
  - [ ] Detection: What to look for
  - [ ] Root cause analysis: Common causes
  - [ ] Immediate actions: First 5 minutes
  - [ ] Mitigation: Stop the bleeding
  - [ ] Resolution: Fix the root cause
  - [ ] Rollback: If needed
  - [ ] Post-mortem: Follow-up items

---

## 12. Monitoring Checklist

### Pre-Deployment Verification

- [ ] **All Monitoring Active**
  - [ ] Sentry configured and receiving errors
  - [ ] CloudWatch logs being collected
  - [ ] CloudWatch alarms created and tested
  - [ ] PagerDuty integration working
  - [ ] Slack integration working
  - [ ] On-call schedule in place
  - [ ] Runbooks accessible to on-call team

- [ ] **Alert Testing**
  - [ ] Test CRITICAL alert: Manual trigger → PagerDuty page
  - [ ] Test HIGH alert: Manual trigger → Slack notification
  - [ ] Test MEDIUM alert: Manual trigger → Slack DM
  - [ ] Verify alert deduplication (no duplicate notifications)
  - [ ] Verify alert auto-resolve works

- [ ] **Dashboard Verification**
  - [ ] All dashboards load without errors
  - [ ] Metrics populated (not showing "no data")
  - [ ] Refresh working (not stale data)
  - [ ] Team members can access (permissions correct)

---

## 13. Incident Response Workflow

### When Alert Fires

**Step 1: Acknowledge Alert** (< 1 min)
- [ ] On-call engineer receives alert
- [ ] Read alert context (metric, threshold, affected service)
- [ ] Acknowledge in PagerDuty (starts 30-min response window)
- [ ] Join incident bridge (Slack Huddle or Zoom link)

**Step 2: Triage** (< 5 min)
- [ ] Open CloudWatch dashboard and Sentry
- [ ] Check health endpoint: `curl https://api.imbobi.com/api/v1/health`
- [ ] Check error rates and recent deployments
- [ ] Determine severity: Critical / High / Medium / Low

**Step 3: Mitigation** (< 10 min)
- [ ] If critical: Trigger runbook steps
- [ ] If data-related: Verify data integrity
- [ ] If deployment-caused: Prepare rollback
- [ ] Update incident ticket with findings

**Step 4: Resolution** (depends on issue)
- [ ] Apply fix (hotfix, config change, restart, etc.)
- [ ] Verify monitoring shows recovery
- [ ] Verify user-impacting metrics return to normal
- [ ] Close incident in PagerDuty

**Step 5: Post-Incident** (next business day)
- [ ] Schedule postmortem meeting
- [ ] Document root cause and fix
- [ ] Create follow-up tickets (monitoring gaps, etc.)
- [ ] Update runbooks with new learnings

---

## 14. Monthly Monitoring Review

- [ ] **Alert Effectiveness Review** (1st of month)
  - [ ] Review all incidents from past month
  - [ ] Analyze: Were alerts triggered? Were they actionable?
  - [ ] Adjust thresholds if: Too noisy OR too many missed alerts
  - [ ] Update runbooks with any new patterns

- [ ] **Metrics Accuracy Review**
  - [ ] Verify all custom metrics are still accurate
  - [ ] Check for any missing metrics that should be monitored
  - [ ] Review metric retention policies (30-day minimum)

- [ ] **Capacity Planning Review**
  - [ ] Are we approaching any resource limits?
  - [ ] CPU utilization trend: _____ (increasing/stable/decreasing)
  - [ ] Memory trend: _____ (increasing/stable/decreasing)
  - [ ] Database size trend: _____ (increasing/stable)
  - [ ] If increasing: Plan scaling before reaching 80%

---

## 15. Monitoring Tools Quick Reference

### Sentry
- **URL:** https://sentry.io/organizations/imbobi/
- **Login:** _______________
- **DSN:** `https://<key>@sentry.io/PROJECT_ID`

### CloudWatch
- **URL:** https://console.aws.amazon.com/cloudwatch/
- **Login:** IAM user
- **Dashboards:** `/aws/dashboards/imbobi-production`

### PagerDuty
- **URL:** https://imbobi.pagerduty.com/
- **On-Call Schedule:** https://imbobi.pagerduty.com/schedules/
- **Escalation Policies:** https://imbobi.pagerduty.com/escalation_policies/

### Slack
- **Incident Channel:** #incidents
- **Ops Channel:** #ops
- **Security Channel:** #security
- **Bot:** @incident-bot (auto-create tickets)

---

## Sign-Off

**Monitoring Setup Completed By:**  
Name: _______________  
Title: _______________  
Date: _______________  

**Approved By:**  
Name: _______________  
Title: _______________  
Date: _______________  

---

**Last Audit:** _______________  
**Next Audit Due:** _______________
