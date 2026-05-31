# Monitoring & Alerting Configuration

**Environment:** Staging → Production  
**Generated:** 2026-05-31  
**Updated by:** Pre-Deployment Validation Suite

---

## CloudWatch Metrics & Alarms

### API (NestJS + Fastify)

#### Application Metrics
```
Namespace: imbobi/api

Metrics:
  - http.requests.total (Counter)
    Labels: method, route, status_code
    Alarm: > 100 errors/min → Page oncall

  - http.request.duration (Histogram)
    Labels: method, route
    p50, p95, p99 latency
    Alarm: p95 > 500ms → Warn
           p95 > 1s → Critical

  - jwt.validation.failures (Counter)
    Labels: reason (expired, invalid, missing)
    Alarm: > 10/min → Investigate

  - rate_limit.exceeded (Counter)
    Labels: endpoint
    Alarm: > 50/min → DDoS possible

  - authentication.failures (Counter)
    Labels: reason (invalid_creds, locked)
    Alarm: > 20/min per IP → Block IP
```

#### Business Metrics
```
  - kyc.uploads (Counter)
    Labels: status (pending, approved, rejected)
    
  - credit.simulations (Counter)
    
  - evidencia.uploads (Counter)
    Labels: location_validation (valid, invalid)
    
  - parcela.releases (Counter)
    Labels: status (pending, released, failed)
```

### Database (RDS PostgreSQL)

#### Performance Metrics
```
Namespace: AWS/RDS

Metrics (1-minute intervals):
  - DatabaseConnections
    Alarm: > 80% of max_connections → Scale
    
  - CPUUtilization
    Alarm: > 80% → Investigate query plan
           > 95% → Immediate scaling
    
  - DatabaseLatency (Read/Write)
    Alarm: > 100ms → Slow query log review
           > 500ms → Critical, investigate
    
  - DiskQueueDepth
    Alarm: > 5 → I/O bottleneck
    
  - ReplicaLag
    Alarm: > 1s → Failover risk
```

#### Storage & Backups
```
  - FreeStorageSpace
    Alarm: < 10GB remaining → Increase storage
    
  - FailedSQLServerAgentJobsCount
    Alarm: > 0 → Review backup job logs
```

### Redis (ElastiCache)

#### Performance Metrics
```
Namespace: AWS/ElastiCache

Metrics:
  - CPUUtilization
    Alarm: > 75% → Evict old keys
           > 90% → Scale up node type
    
  - Evictions
    Alarm: > 100/min → Cache size too small
    
  - CacheHitRate
    Alarm: < 50% → Verify cache strategy
    
  - NetworkBytesIn/Out
    Alarm: > 1GB/s → Bandwidth saturation
    
  - ReplicationLag
    Alarm: > 100ms → Failover risk
```

### Application Load Balancer (ALB)

```
Namespace: AWS/ApplicationELB

Metrics:
  - TargetResponseTime
    Alarm: p95 > 1s → Scale API instances
    
  - HTTPCode_Target_5XX_Count
    Alarm: > 5/min → Check API logs
    
  - HTTPCode_Target_4XX_Count
    Monitoring: Baseline to detect client errors
    
  - HealthyHostCount
    Alarm: < desired_count → Investigate instance health
    
  - RequestCount
    Trending: For capacity planning
```

---

## CloudWatch Dashboards

### Main Operations Dashboard
```
4x4 Grid:

Row 1:
  - API Error Rate (timeseries, 5min intervals)
  - API Response Time p95 (gauge)
  - Database CPU (gauge)
  - Redis Eviction Rate (timeseries)

Row 2:
  - Active Database Connections (gauge)
  - Cache Hit Rate (gauge)
  - ALB Target Health (status)
  - Error Log Tail (logs)

Row 3:
  - Authentication Failures (timeseries)
  - KYC Uploads (counter)
  - Credit Simulations (counter)
  - Evidence Uploads (counter)

Row 4:
  - Disk Space (gauge)
  - Network I/O (timeseries)
  - Failed Backups (status)
  - Last Backup Time (text)
```

### Security Dashboard
```
4x2 Grid:

Row 1:
  - CSRF Token Validation Failures (timeseries)
  - JWT Validation Failures (timeseries)
  - Rate Limit Exceeded (timeseries)
  - CORS Rejections (timeseries)

Row 2:
  - Failed Login Attempts (timeseries)
  - Suspicious IP Activity (logs)
  - Authorization Failures (timeseries)
  - SQL Injection Attempts (logs)
```

---

## SNS Topics & Email Alerts

### Critical Alerts (Page Oncall)
```
SNS Topic: imbobi-critical-alerts

Subscribers:
  - PagerDuty (critical incidents)
  - Slack #alerts-critical

Conditions:
  - API error rate > 10/min
  - Database response time > 1s
  - Database CPU > 95%
  - Redis node down
  - ALB unhealthy targets > 0
  - Disk space < 5GB
```

### Warning Alerts (Slack #alerts-warnings)
```
SNS Topic: imbobi-warnings

Subscribers:
  - Slack #alerts-warnings
  - Email: ops-team@imbobi.com.br

Conditions:
  - API response time p95 > 500ms
  - Database CPU > 80%
  - Redis eviction rate > 100/min
  - Cache hit rate < 50%
  - JWT validation failures > 10/min
  - Rate limit exceeded > 50/min
```

### Informational (Email)
```
SNS Topic: imbobi-info

Subscribers:
  - Email: ops-team@imbobi.com.br

Conditions:
  - Daily metrics summary
  - Backup completion
  - Scaling events
  - Certificate expiry warnings (60 days)
```

---

## Log Groups & Retention

### Application Logs
```
/aws/ecs/imobi
  Retention: 30 days
  Filters:
    - ERROR: All error messages
    - WARN: Warning threshold
    - SECURITY: Authentication/Authorization events

/aws/ecs/imobi/api-requests
  Retention: 7 days (high volume)
  Format: JSON with metadata
  Fields: timestamp, method, path, status_code, duration_ms, user_id
```

### Database Logs
```
/aws/rds/imobi
  Retention: 30 days
  Types:
    - Error log: Database errors
    - Slow query log: Queries > 2s
    - General log: All connections (dev only)

/aws/rds/imobi/backup
  Retention: 90 days
  Events: Backup start, completion, failures
```

### Cache Logs
```
/aws/elasticache/imobi/slow-log
  Retention: 30 days
  Filter: Commands > 100ms
```

---

## Performance Baselines

### API Response Times
```
GET /api/v1/obras (cached):
  p50: 50ms
  p95: 150ms
  p99: 300ms

POST /api/v1/auth/login:
  p50: 200ms
  p95: 500ms
  p99: 1000ms

GET /api/v1/usuarios/profil (DB query):
  p50: 150ms
  p95: 400ms
  p99: 800ms
```

### Database Metrics
```
Average CPU: 20-30%
Peak CPU: < 60% under normal load
Connections: 50-100 typical, < 200 max
Query time: < 100ms (p95)
Replication lag: < 10ms
```

### Cache Metrics
```
Hit Rate: 70-85%
Eviction Rate: < 10/min
Memory Usage: 60-75% of allocated
Commands/sec: 1000-5000 typical
```

---

## Anomaly Detection

### Automated Anomaly Detection (CloudWatch Anomaly Detector)

```
API Error Rate:
  - Baseline: 0.1-1%
  - Anomaly threshold: > 5%
  - Detection window: 2-hour bands

API Response Time:
  - Baseline p95: 200-300ms
  - Anomaly threshold: > 1s
  - Detection window: 1-hour bands

Database CPU:
  - Baseline: 20-40%
  - Anomaly threshold: > 75%
  - Detection window: 5-minute bands

Cache Evictions:
  - Baseline: 0-5/min
  - Anomaly threshold: > 50/min
  - Detection window: 5-minute bands
```

---

## Health Checks

### API Health Endpoints
```
GET /health
  Status: 200 OK
  Response: { "status": "healthy", "timestamp": "..." }

GET /health/deep
  Checks:
    - Database connectivity
    - Redis connectivity
    - AWS S3 access
    - External APIs (Unico, Serpro)
  Response: { "status": "healthy", "checks": {...} }

Monitoring:
  - Health check every 30 seconds
  - Alarm if 2 consecutive failures
  - Page oncall if 3+ failures in 5min window
```

### Database Health
```
Query: SELECT 1
Interval: Every 60 seconds
Alarm: No response > 5 seconds → Critical

Replication check:
Query: SHOW SLAVE STATUS
Interval: Every 5 minutes
Alarm: Lag > 5 seconds → Warning
       No slave running → Critical
```

### Redis Health
```
Command: PING
Interval: Every 30 seconds
Alarm: No response > 5 seconds → Critical

Memory check:
Command: INFO memory
Interval: Every 60 seconds
Alarm: used_memory > 90% → Warning
       Memory pressure detected → Critical
```

---

## Custom Metrics Publishing

### Application Code Integration
```typescript
// metrics.ts
import { cloudwatch } from 'aws-sdk';

const cloudwatch = new CloudWatch();

export async function recordMetric(
  namespace: string,
  metricName: string,
  value: number,
  unit: string,
  dimensions?: Record<string, string>
) {
  await cloudwatch.putMetricData({
    Namespace: namespace,
    MetricData: [{
      MetricName: metricName,
      Value: value,
      Unit: unit,
      Dimensions: Object.entries(dimensions || {}).map(([k, v]) => ({
        Name: k,
        Value: v,
      })),
      Timestamp: new Date(),
    }],
  }).promise();
}

// Usage in controllers
recordMetric('imbobi/api', 'kyc.uploads', 1, 'Count', {
  status: 'approved',
});
```

---

## Incident Response Runbooks

### API Error Rate > 10/min
1. ✅ PagerDuty alert → Page oncall
2. 🔍 Check CloudWatch logs for error patterns
3. 🔍 Check API metrics: CPU, memory, connections
4. 🔍 Check database metrics: connections, CPU, slow queries
5. 🔄 If database issue: Run ANALYZE, review slow queries
6. 🔄 If API issue: Check for resource leaks, restart if needed
7. 📝 Document root cause in incident ticket

### Database Response Time > 1s
1. ✅ Warning → Slack #alerts-warnings
2. 🔍 Check CloudWatch slow query log
3. 🔍 Analyze query execution plan
4. 🔄 Add index if needed (Terraform + migrate)
5. 🔄 Increase RDS instance if CPU > 80%
6. 📝 Update query optimization docs

### Cache Hit Rate < 50%
1. 🔍 Review cache strategy in code
2. 🔍 Check if working set > available memory
3. 🔄 Increase ElastiCache node size
4. 🔄 Adjust TTLs if cache invalidation too aggressive
5. 🔍 Verify cache keys are correct

### Redis Evictions > 100/min
1. ✅ Alert → Slack #alerts-warnings
2. 🔍 Check memory utilization
3. 🔄 Increase node type immediately (scale up)
4. 🔍 Review cache strategy (what's being evicted?)
5. 📝 Plan for larger instance in next deployment

---

## On-Call Responsibilities

### Tier 1 (First Response)
- Monitor PagerDuty for critical alerts
- Investigate CloudWatch dashboards
- Check application logs
- Restart services if needed
- Escalate to Tier 2 if unsure

### Tier 2 (Engineering)
- Deep dive into system metrics
- Query analysis and optimization
- Deploy hotfixes if needed
- Conduct post-incident review
- Update runbooks

### Tier 3 (SRE/Infrastructure)
- Manage infrastructure scaling
- Handle AWS-level issues
- Coordinate with AWS support
- Update Terraform code
- Plan capacity improvements

---

## Weekly Review

Every Monday 10:00 AM:
- [ ] Review past week's alerts
- [ ] Check error logs for patterns
- [ ] Review performance trends
- [ ] Identify optimization opportunities
- [ ] Update on-call runbooks if needed
- [ ] Plan scaling if approaching limits

---

## Monthly Review

End of each month:
- [ ] Review all metrics baseline
- [ ] Analyze cost trends
- [ ] Plan capacity for next month
- [ ] Security audit (failed logins, auth errors)
- [ ] Database maintenance (VACUUM, ANALYZE)
- [ ] Backup verification (recovery test)
- [ ] Certificate expiry check (90-day warning)
- [ ] Update incident report summary

---

**Last Updated:** 2026-05-31  
**Version:** 1.0  
**Status:** Ready for Implementation
