# PHASE 9: Runbook Finalization — imobi Operations Handbook

**Document Version:** 1.0  
**Created:** 2026-05-31  
**Last Updated:** 2026-05-31  
**Owner:** DevOps Lead + Tech Lead  
**Scope:** Production operations (Week 1 post-launch + ongoing)  
**Audience:** On-call engineers, DevOps team, Tech leads, SREs

---

## Table of Contents

1. [Normal Operations Runbook](#normal-operations-runbook)
2. [Incident Response Runbook](#incident-response-runbook)
3. [Deployment Runbook](#deployment-runbook)
4. [Maintenance Runbook](#maintenance-runbook)

---

## NORMAL OPERATIONS RUNBOOK

### Daily Health Checks (Execute at 08:00 UTC daily)

**Time Required:** 10 minutes  
**Responsible:** On-call DevOps  
**Escalation:** If any check fails, page Tech Lead immediately

#### 1. Database Health

```bash
# 1.1 Connection Pool Status
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT sum(numbackends) as active_connections FROM pg_stat_database WHERE datname = 'imbobi_prod';"
# Expected: < 50 (max pool size)
# Action: If > 50, check for leaked connections, restart API pods

# 1.2 Replication Lag (if multi-region)
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT EXTRACT(EPOCH FROM (now() - pg_last_wal_receive_lsn())) as replication_lag_seconds;"
# Expected: < 1 second
# Action: If > 5s, investigate network latency, contact AWS support

# 1.3 Disk Space
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT pg_database_size('imbobi_prod') / 1024 / 1024 / 1024 as size_gb;"
# Expected: < 50 GB (sufficient headroom for 200 GB RDS instance)
# Action: If > 150 GB, trigger emergency cleanup

# 1.4 Slow Queries (p95)
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;"
# Expected: All < 100ms (p95)
# Action: If top query > 200ms, investigate index usage
```

#### 2. Redis Health

```bash
# 2.1 Connection Status
redis-cli -h $REDIS_HOST -p 6379 ping
# Expected: PONG
# Action: If timeout, check network connectivity, verify Redis pod running

# 2.2 Memory Usage
redis-cli -h $REDIS_HOST -p 6379 info memory | grep used_memory_percent
# Expected: < 70%
# Action: If > 80%, trigger cache eviction, review memory leaks

# 2.3 Persistence (AOF + Snapshots)
redis-cli -h $REDIS_HOST -p 6379 info persistence
# Check: last_save_time recent (< 1 hour)
# Action: If no recent save, manually trigger: BGSAVE

# 2.4 Connected Clients
redis-cli -h $REDIS_HOST -p 6379 info clients | grep connected_clients
# Expected: < 500
# Action: If > 1000, check for connection pool leaks
```

#### 3. API Service Health

```bash
# 3.1 Endpoint Availability
curl -s https://api.imobi.app/health \
  -H "Content-Type: application/json" | jq '.status'
# Expected: "ok" or "healthy"
# Response time: < 100ms

# 3.2 Pod Status (Railway)
curl -s https://railway.app/project/$PROJECT_ID/services \
  -H "Authorization: Bearer $RAILWAY_API_TOKEN" | jq '.[] | select(.name=="api") | .status'
# Expected: "running" or "deployed"

# 3.3 Database Connection from API
curl -s https://api.imobi.app/health/db \
  -H "Content-Type: application/json" | jq '.database'
# Expected: "connected"

# 3.4 Error Rate (last 5 minutes)
curl -s https://sentry.io/api/0/organizations/$ORG_SLUG/stats/ \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.[] | select(.interval | startswith("5m")) | .value[0]'
# Expected: < 0.5%
```

#### 4. Web Service Health

```bash
# 4.1 Endpoint Availability
curl -s https://imobi.app/api/health | jq '.status'
# Expected: "ok"
# Response time: < 200ms

# 4.2 Page Load Time (via Vercel Analytics)
# Dashboard: https://vercel.com/dashboard/project/imobi/analytics
# Check: LCP (Largest Contentful Paint)
# Expected: < 2.5s (p75)

# 4.3 Static Asset Delivery (CDN)
curl -I https://imobi.app/_next/static/chunks/main.js
# Expected: HTTP 200, Cache-Control headers present
```

#### 5. Queue Health (BullMQ)

```bash
# 5.1 Pending Jobs Count
redis-cli -h $REDIS_HOST -p 6379 \
  LLEN bull:liberacao-parcela:wait
# Expected: < 100 (depends on transaction volume)

# 5.2 Active Worker Processes
ps aux | grep "liberacao-parcela.worker" | grep -v grep | wc -l
# Expected: >= 1 (typically 2-4 for redundancy)

# 5.3 Failed Jobs
redis-cli -h $REDIS_HOST -p 6379 \
  LLEN bull:liberacao-parcela:failed
# Expected: 0 (no failed jobs)
```

---

### Monitoring Dashboards

#### Sentry Dashboard (https://sentry.io/organizations/imobi)

**Daily Review Process:**
1. Open dashboard → Issues tab
2. Filter: `is:unresolved level:[error,fatal]`
3. For each issue: Check timeline, identify affected users, review stack trace
4. Action: Create ticket or resolve if false positive

**Key Metrics:**
- **Error Rate:** Target < 0.5%, Alert if > 1%
- **Event Count:** Monitor trend over time
- **Affected Users:** If > 10, escalate to P2

#### CloudWatch Dashboard (AWS Console)

**Metrics to Monitor Every 8 Hours:**

| Metric | Target | Warning | Alert |
|--------|--------|---------|-------|
| API Latency (p95) | < 300ms | > 500ms | > 2s |
| API Error Rate | < 0.5% | > 1% | > 5% |
| Database Connections | < 30 | > 40 | > 50 |
| Database Query Latency (p95) | < 100ms | > 150ms | > 300ms |
| Redis Memory Usage | < 70% | > 80% | > 90% |
| Payment Processing (success rate) | > 99.8% | > 99.5% | < 99% |

---

### Common Issues & Quick Fixes

#### Issue 1: API Response Time Slow (> 2 seconds)

**Diagnosis:**
```bash
# Check if it's database or API code
curl -w "\nTime connect: %{time_connect}s\nTime total: %{time_total}s\n" \
  -o /dev/null -s https://api.imobi.app/health

# Check database query times
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 1;"

# Check API pod resource usage
kubectl top pods -n default | grep imobi-api
```

**Quick Fix:**
- If database is slow: Run `ANALYZE` on tables, check for missing indexes
- If API is slow: Check memory usage, restart pod if > 1GB
- If network is slow: Check CloudWatch network metrics

---

#### Issue 2: Redis Memory Full (> 90%)

**Diagnosis:**
```bash
redis-cli -h $REDIS_HOST -p 6379 \
  info memory | grep -E "used_memory_percent|used_memory"
```

**Quick Fix:**
```bash
# Option 1: Evict old cache entries
redis-cli -h $REDIS_HOST -p 6379 CONFIG SET maxmemory-policy allkeys-lru

# Option 2: Manual cleanup (cache keys)
redis-cli -h $REDIS_HOST -p 6379 FLUSHDB ASYNC

# Option 3: Scale Redis instance (contact DevOps)
```

---

#### Issue 3: Payment Processing Stuck (> 100 pending jobs)

**Diagnosis:**
```bash
redis-cli -h $REDIS_HOST -p 6379 \
  LLEN bull:liberacao-parcela:wait

# View pending job details
redis-cli -h $REDIS_HOST -p 6379 \
  LRANGE bull:liberacao-parcela:wait 0 10

# Check worker logs
kubectl logs -l app=liberacao-parcela-worker --tail=100
```

**Quick Fix:**
```bash
# Option 1: Restart worker (if crashed)
kubectl delete pod -l app=liberacao-parcela-worker

# Option 2: Scale workers (if overloaded)
kubectl scale deployment liberacao-parcela-worker --replicas=4

# Option 3: Check database transaction limits
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT COUNT(*) FROM parcelas WHERE status = 'pending_release';"
```

---

#### Issue 4: Database Connection Pool Exhausted

**Diagnosis:**
```bash
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT sum(numbackends) FROM pg_stat_database WHERE datname = 'imbobi_prod';"

# Check for idle connections
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

**Quick Fix:**
```bash
# Option 1: Kill idle connections
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
   WHERE state = 'idle' AND query_start < now() - interval '10 minutes';"

# Option 2: Restart API (clears connection pool)
kubectl delete pod -l app=imobi-api
```

---

## INCIDENT RESPONSE RUNBOOK

### Severity Classification

#### P1 — CRITICAL (Response SLA: < 5 minutes)

**Criteria:**
- Error rate > 5% for 2 consecutive minutes
- API completely down (all endpoints 5xx)
- Database unreachable
- Payment system completely blocked
- Data corruption detected

**Response Actions:**
```
Minute 0-1:   Declare incident, page team
Minute 1-3:   Gather data (logs, metrics, recent changes)
Minute 3-5:   Decision: Investigate vs. Rollback
Minute 5-10:  Execute decision (rollback or fix)
Minute 10+:   Every 5 min update stakeholders
```

---

#### P2 — HIGH (Response SLA: < 15 minutes)

**Criteria:**
- Error rate 2-5% for > 5 minutes
- Single feature unavailable
- API latency p95 > 2s for > 10 minutes
- Database replication lag > 10 seconds
- BullMQ queue > 1000 pending jobs

**Response Actions:**
```
Minute 0-2:   Acknowledge incident
Minute 2-8:   Investigate root cause
Minute 8-15:  Fix or escalate
Minute 15+:   Page Tech Lead if unresolved
```

---

#### P3 — MEDIUM (Response SLA: < 1 hour)

**Criteria:**
- Error rate < 2% but non-zero
- Non-critical feature degraded
- Intermittent issues

#### P4 — LOW (Response SLA: < 1 business day)

**Criteria:**
- No active impact on users
- Monitoring false positives

---

## DEPLOYMENT RUNBOOK

### Hotfix Deployment (Post-Launch)

**Timeline:** 15-30 minutes

**Prerequisites:**
- [ ] Bug confirmed with reproduction steps
- [ ] Fix implemented and unit tested
- [ ] Code reviewed by senior engineer
- [ ] Does NOT require database migration

**Steps:**

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug-description

# 2. Implement fix (minimal change)
# - One feature: fix only that feature
# - No refactoring: save for next release

# 3. Type-check and test
pnpm type-check
pnpm test -- --grep "critical bug description"

# 4. Commit and tag
git add .
git commit -m "hotfix: critical bug description (P1)"
git tag v2.0.1-hotfix-$(date +%s)

# 5. Push to Git
git push origin hotfix/critical-bug-description

# 6. Deploy to staging first
# Via Railway/Vercel dashboard: Trigger deployment from branch

# 7. Smoke test on staging
curl https://staging-api.imobi.app/health

# 8. Deploy to production
# Dashboard: Promote staging deployment to production

# 9. Verify production
curl https://api.imobi.app/health

# 10. Monitor for 30 minutes
```

---

### Rollback Procedures

**Full Rollback (All Services):**

```bash
# 1. Declare rollback decision
# Slack: @team "Rolling back to v2.0.0 due to P1 issue"

# 2. API Rollback (Railway)
# Dashboard: https://railway.app → imobi-api → Deployments
# Find previous stable tag (e.g., v2.0.0-previous)
# Click "Rollback" button
# Wait 2-3 minutes

# 3. Web Rollback (Vercel)
# Dashboard: https://vercel.com → imobi → Deployments
# Find previous stable deployment → Click "Rollback"
# Wait 1-2 minutes

# 4. Verify health
curl https://api.imobi.app/health
curl https://imobi.app/api/health
# Both should return status: "ok"

# 5. Monitor error rate
# Should drop to baseline within 5 minutes
```

---

## MAINTENANCE RUNBOOK

### Daily Database Cleanup

**Schedule:** 02:00 UTC daily  
**Duration:** 5-10 minutes

```bash
# 1. Remove soft-deleted users (deleted > 30 days ago)
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c "
DELETE FROM usuarios
WHERE deleted_at IS NOT NULL
  AND deleted_at < now() - interval '30 days';"

# 2. Clean expired sessions (>7 days old)
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c "
DELETE FROM sessions
WHERE expires_at < now();"

# 3. Archive old activity logs (> 90 days)
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c "
DELETE FROM activity_logs
WHERE created_at < now() - interval '90 days';"

# 4. Analyze statistics (daily)
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c "
ANALYZE;"
```

---

### Weekly Redis Cleanup

**Schedule:** Sunday 03:00 UTC  
**Duration:** 2-5 minutes

```bash
# 1. Check memory fragmentation
redis-cli -h $REDIS_HOST -p 6379 \
  info memory | grep mem_fragmentation_ratio

# If > 1.5, enable defragmentation:
redis-cli -h $REDIS_HOST -p 6379 CONFIG SET activedefrag yes

# 2. Clear old cache entries (if memory high)
redis-cli -h $REDIS_HOST -p 6379 \
  CONFIG SET maxmemory-policy allkeys-lru

# 3. Verify persistence
redis-cli -h $REDIS_HOST -p 6379 BGSAVE
```

---

### Monthly AWS S3 Lifecycle Management

**Schedule:** First day of month, 04:00 UTC

**Goal:** Reduce storage costs by archiving old evidence files

```bash
# 1. Create lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket imbobi-evidence \
  --lifecycle-configuration '{
    "Rules": [{
      "Id": "Archive old files",
      "Status": "Enabled",
      "Transitions": [{
        "Days": 90,
        "StorageClass": "GLACIER"
      }],
      "Expiration": {
        "Days": 2555
      }
    }]
  }'

# 2. Monitor costs
# CloudWatch: Check S3 storage costs week over week
```

---

### Log Retention & Cleanup

**CloudWatch Logs (API logs):**

```bash
# Set retention to 30 days
aws logs put-retention-policy \
  --log-group-name '/ecs/imobi-api' \
  --retention-in-days 30
```

---

## RUNBOOK TESTING & MAINTENANCE

### Quarterly Runbook Review

**Schedule:** Every 3 months

**Checklist:**
- [ ] Verify all tools/URLs still active
- [ ] Update team contact information
- [ ] Review incident response times
- [ ] Update escalation contacts
- [ ] Test rollback procedures in staging
- [ ] Update monitoring thresholds

### Dry-Run Incident Simulation

**Schedule:** Monthly (first Wednesday)  
**Duration:** 30 minutes

**Success Criteria:**
- All team members respond within SLA
- Incident declared and escalated properly
- Root cause identified within 10 minutes
- Communication sent to stakeholders

---

**Last Updated:** 2026-05-31  
**Next Review:** 2026-06-15 (post-launch review)  
**Owner:** DevOps Lead + Tech Lead  
**Questions?** Contact #ops-general on Slack
