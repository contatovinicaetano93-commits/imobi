# INCIDENT RESPONSE PLAYBOOK — imobi

**Versão:** 1.0  
**Última atualização:** 2026-05-29  
**Dono:** DevOps + Tech Lead  
**Slack channel:** `#ops-critical`

---

## 1. SEVERITY CLASSIFICATION (P1-P4)

### P1 — CRITICAL (Response SLA: < 5 minutes)

**Criteria:**
- Error rate > 5% for > 2 minutes
- Transaction system down (usuarios unable to transact, parcelas cannot be released)
- Database completely inaccessible (replication failure, connection pool exhausted)
- All endpoints returning 5xx errors
- Payment processing blocked
- Worker system (BullMQ) completely failed

**Impact:** High user impact, revenue at risk, SLA breach imminent

**Team Activation:**
- DevOps on-call (immediate investigation)
- Tech Lead (notified immediately, standby for approval of major changes)
- CTO + PO (immediate email + Slack notification)

**Actions:**
1. Immediate investigation (logs, metrics, recent deploys)
2. Decision: Investigate vs. Rollback
3. If rollback decided: Execute within 5 minutes
4. If investigating: Update stakeholders every 5 minutes
5. Post incident: Full RCA within 24 hours

**Escalation Chain:**
- L1 (DevOps): Detect + investigate (0-5 min)
- L2 (Tech Lead): Approve rollback/scaling (5-10 min if needed)
- L3 (CTO): Executive decision, vendor escalation (10+ min)

---

### P2 — HIGH (Response SLA: < 15 minutes)

**Criteria:**
- Error rate 2-5% for > 5 minutes
- Single critical feature degraded (e.g., foto upload, GPS validation)
- Latency p95 > 200ms for > 10 minutes
- One service down (API, Web, Redis)
- Worker queue backing up (> 1000 pending jobs)
- Database replication lag > 10 seconds

**Impact:** Feature unavailable but business continuity maintained, users have workaround

**Team Activation:**
- DevOps on-call (investigation)
- Team Lead (notified, monitor escalation)
- Tech Lead (standby if unresolved after 10 min)

**Actions:**
1. Acknowledge incident in Slack
2. Investigate root cause
3. Scale resources if needed (Render auto-scaling + manual)
4. Apply hotfix or rollback if appropriate
5. Post incident: Summary + action items within 48 hours

---

### P3 — MEDIUM (Response SLA: < 1 hour)

**Criteria:**
- Single non-critical feature degraded (e.g., analytics dashboard)
- Error rate < 2% but non-zero
- Latency p95 > 200ms for < 10 minutes (intermittent)
- Monitoring false positive (alert resolves itself)
- API warnings/deprecations appearing in logs

**Impact:** Limited user impact, workaround available, business continues normally

**Team Activation:**
- On-call team member (investigation)
- Tech Lead escalation if > 1 hour unresolved

**Actions:**
1. Document alert details
2. Investigate during working hours
3. Add to backlog if no urgency
4. Create ticket for tracking

---

### P4 — LOW (Response SLA: < 1 business day)

**Criteria:**
- Monitoring alert with no confirmed user impact
- Dev environment issues
- Documentation/process improvements
- Minor performance optimizations

**Impact:** None, potential future benefit

**Team Activation:**
- Regular team (no on-call activation)
- Review in next standup

**Actions:**
1. Log alert/issue
2. Add to backlog
3. Review for trends
4. Plan fix in next sprint

---

## 2. DETECTION & ALERTING

### Alert Channels & Routing

```
┌─────────────────────────────────────┐
│      Incident Detection Points       │
└─────────────────────────────────────┘
            ↓ ↓ ↓ ↓
    ┌───────┴────┬────┬─────────┐
    ↓            ↓    ↓         ↓
 Sentry      CloudWatch Manual  Health
 (errors)    (metrics)  report  checks
    │            │       │        │
    └────────┬───┴───┬──┴────┬──┘
             ↓       ↓       ↓
         P1/P2?   P2/P3?   P4?
          │        │        │
    🚨 Slack   ⚠️ Slack  📌 Backlog
  #ops-      #ops-    (review
  critical   general   later)
```

### Sentry P1 Triggers

```
Rules that auto-post to #ops-critical:
- Error rate > 5% in 5-min window
- Unhandled exceptions from:
  * services/api/src/modules/parceiros/ (transaction critical)
  * services/api/src/modules/obras/ (core business)
  * services/workers/liberacao-parcela.worker.ts (async payment)
- Sentry tag: severity:critical OR severity:error
```

**Setup (Sentry → Slack webhook):**
```
Sentry Project: imobi-production
Alert Rule: "High error rate detected"
Filter: 
  - environment:production
  - error.rate > 5%
  - timeframe: 5 minutes
Webhook: https://hooks.slack.com/services/YOUR/WEBHOOK/HERE
Channel: #ops-critical
Frequency: Once per 30 minutes
```

### CloudWatch Metrics Watched

```
Metric                    | Warning | Critical
--------------------------|---------|----------
API p95 Latency           | 150ms   | 300ms
API Error Rate            | 2%      | 5%
Database Connections      | 80/100  | 95/100
Database Replication Lag  | 5s      | 15s
Redis Memory Usage        | 80%     | 95%
Worker Queue Depth        | 500     | 2000
(BullMQ via Redis)        |         |
HTTP 5xx Count            | 10/min  | 50/min
```

### Health Checks (every 30 seconds)

```bash
GET /api/v1/health

Response (OK):
{
  "status": "ok",
  "timestamp": "2026-05-29T14:23:45Z",
  "database": "connected",
  "redis": "connected",
  "workers": "running"
}

Response (Degraded):
{
  "status": "degraded",
  "timestamp": "2026-05-29T14:23:45Z",
  "database": "connected",
  "redis": "timeout",  ← ALERT: P2
  "workers": "running"
}
```

---

## 3. INITIAL RESPONSE (First 5 Minutes)

### Checklist for On-Call

```
⏱ TIMESTAMP: [__:__] BRT

□ 1. ACKNOWLEDGE
  └─ Post in #ops-critical: "🚨 Incident started at [time]. Investigating..."
  └─ Record exact alert timestamp
  └─ Create Slack thread: /thread

□ 2. GATHER INITIAL CONTEXT (< 1 min)
  ├─ Check Sentry dashboard
  │  ├─ Top 3 errors (last 5 min)
  │  ├─ Affected service: API / Web / Workers / DB
  │  └─ Error count trend (spike vs. baseline)
  │
  ├─ Check CloudWatch dashboard
  │  ├─ API latency (p50/p95/p99)
  │  ├─ Error rate trend
  │  ├─ Memory/CPU usage
  │  └─ Database connections & lag
  │
  ├─ Check Vercel deployment history
  │  ├─ Latest deploy status
  │  ├─ Rollback available? (last 3 commits)
  │  └─ Build logs for errors
  │
  └─ Check Slack #releases channel
     └─ Any recent deploys? (last 15 min)

□ 3. CLASSIFY SEVERITY (< 2 min)
  ├─ Is this P1? (> 5% error rate, transaction down)
  │  └─ YES → Go to STEP 5
  │  └─ NO → Continue
  │
  ├─ Is this P2? (critical feature degraded)
  │  └─ YES → Go to STEP 4
  │  └─ NO → Continue
  │
  └─ This is P3/P4 → Log to backlog, continue monitoring

□ 4. NOTIFY STAKEHOLDERS (P1 only, < 2 min)
  ├─ Slack direct message to Tech Lead:
  │  "🚨 P1 INCIDENT: [Description]
  │   Error: [Top error from Sentry]
  │   Impact: [Users affected]
  │   Action: [Investigating/Rolling back]
  │   ETA: 5 minutes"
  │
  ├─ Slack direct message to CTO:
  │  Same as Tech Lead
  │
  └─ Email to PO (template in section 6)

□ 5. DECIDE: INVESTIGATE VS ROLLBACK (< 3 min)
  ├─ Recent deploy (< 5 min ago) + errors spike together?
  │  └─ YES → Recommend ROLLBACK
  │  └─ NO → Investigate
  │
  ├─ Database error? Infrastructure issue?
  │  └─ YES → Investigate (rollback won't help)
  │  └─ NO → Rollback preferred
  │
  └─ Unknown cause?
     └─ Deploy is safe? → Rollback to last known good
     └─ Unsure? → Ask Tech Lead

□ 6. CREATE INCIDENT RECORD
  ├─ Slack thread: #ops-critical
  └─ Incident doc (link to Google Doc or Confluence)

□ 7. KEEP STAKEHOLDERS UPDATED
  ├─ Every 5 minutes (P1) or 10 minutes (P2)
  ├─ Post in #ops-critical thread
  ├─ Update incident doc
  └─ If > 15 min unresolved: escalate to Tech Lead
```

---

## 4. INVESTIGATION FLOW

### Step-by-Step Diagnosis

```
1. CHECK SENTRY ERROR GROUPING
   ├─ Group by: Status (5xx, 4xx, etc)
   ├─ Filter: Last 5 minutes
   ├─ Top 5 errors by frequency
   ├─ Sample error stack trace
   └─ Affected endpoints/services

2. CHECK CLOUDWATCH METRICS
   ├─ API Latency (p50/p95/p99) — sustained spike?
   ├─ Error Rate — correlated with deploy?
   ├─ CPU/Memory — resource exhaustion?
   ├─ Database Connections — pool exhausted?
   ├─ Database Replication Lag — primary/replica mismatch?
   └─ Network — packet loss, bandwidth?

3. CHECK RECENT CHANGES
   ├─ Vercel Deployments (apps/web)
   │  ├─ Status: Success / Failed / Partially deployed
   │  ├─ Build logs for errors
   │  ├─ Environment variables changed?
   │  └─ Rollback available?
   │
   ├─ Render API Deployment (services/api)
   │  ├─ Recent restarts/redeployments
   │  ├─ Environment variable changes
   │  ├─ CPU/Memory usage during deploy
   │  └─ Graceful shutdown completed?
   │
   └─ Database Migrations
      ├─ Pending migrations?
      ├─ Migration rollback available?
      └─ Schema changes recently applied?

4. CHECK DATABASE HEALTH
   ├─ Connection pool status
   │  ├─ Current connections vs. max
   │  ├─ Idle vs. active connections
   │  └─ Connection wait time
   │
   ├─ Replication Status (if applicable)
   │  ├─ Primary ↔ Replica lag
   │  ├─ Replication process running?
   │  └─ Last successful sync time
   │
   ├─ Query Performance
   │  ├─ Slow query log (> 100ms)
   │  ├─ Full table scans?
   │  └─ Missing indexes?
   │
   └─ Disk Space
      ├─ Available space
      ├─ WAL (Write-Ahead Log) size
      └─ Cleanup needed?

5. CHECK REDIS HEALTH
   ├─ Memory Usage
   │  ├─ Current vs. max (evictions happening?)
   │  └─ Cleanup needed?
   │
   ├─ BullMQ Worker Status
   │  ├─ Active jobs: workers/liberacao-parcela.worker.ts
   │  ├─ Failed jobs: Check dead-letter queue
   │  ├─ Stuck jobs: Timeout or forever running?
   │  └─ Queue depth: > 1000 jobs?
   │
   ├─ Commands
   │  ├─ Slow log (top 10 slow commands)
   │  └─ Currently executing commands
   │
   └─ Connection Status
      ├─ Connected clients
      ├─ Blocked clients
      └─ Timeouts

6. CHECK S3 INTEGRATION
   ├─ AWS S3 Status Page (status.aws.amazon.com)
   │  └─ Any regional outages?
   │
   ├─ S3 Request Metrics
   │  ├─ 4xx errors (permissions, missing bucket)
   │  ├─ 5xx errors (throttling, service issues)
   │  └─ Request rate spike
   │
   ├─ CORS Configuration
   │  └─ Verify bucket CORS policy
   │
   └─ IAM Permissions
      └─ Verify IAM role permissions

7. CHECK EXTERNAL SERVICES
   ├─ SendGrid (email)
   │  └─ Status page + API errors
   │
   ├─ Firebase (auth/push)
   │  └─ Status page + API errors
   │
   └─ AWS (general)
      └─ Health Dashboard for your region
```

### Key Log Files to Check

```bash
# API Service (Render)
curl https://api.imobi.com/logs?lines=100 | grep -i error

# Web Service (Vercel)
Deployment logs in Vercel dashboard > Deployments > [latest]

# Database (CloudWatch)
Slow query log: SELECT * FROM pg_stat_statements WHERE mean_exec_time > 100

# Redis (CloudWatch)
SLOWLOG GET 10

# BullMQ (Redis)
redis-cli --json XRANGE imbobi:worker:queue-name - +
```

---

## 5. DECISION MATRIX

| Symptom | Likely Cause | First Check | Action |
|---------|--------------|-----------|--------|
| **Error rate spike (5%+) after deploy** | Bad deployment (bug introduced) | Sentry errors match code change? | Rollback immediately (Render/Vercel) |
| **Latency spike (p95 > 300ms)** | Resource exhaustion or slow query | CloudWatch CPU/Memory + Database slow log | Investigate query or scale (add replicas) |
| **`FATAL: too many connections`** | Database connection pool exhausted | Check `SELECT count(*) FROM pg_stat_activity` | Restart DB pool or increase pool size |
| **`READONLY` errors on DB writes** | Database in read-only mode (disaster recovery) | Check replication lag + disk space | Promote replica or restore from backup |
| **BullMQ jobs failing (queue backing up)** | Worker crashed or timeout | Check Redis memory + worker logs | Restart worker + clear dead-letter queue |
| **Redis memory exhausted (evictions)** | Cache not being cleaned | Check CloudWatch Redis memory + eviction rate | Flush non-critical cache or scale Redis |
| **S3 403 Forbidden** | IAM permissions or bucket policy | Check AWS IAM + bucket CORS | Fix permissions + deploy IAM fix |
| **All services down** | Network/DNS issue or provider outage | Check provider status page | Contact Render/Vercel/AWS support |
| **Memory leak (RAM grows over time)** | Unfreed references in Node.js | Check heap snapshots | Restart service + investigate code |
| **Intermittent timeouts** | Network partition or rate limiting | Check CloudWatch for spikes + AWS throttling alerts | Scale up or check rate limiter config |

---

## 6. COMMUNICATION TEMPLATES

### Template 1: #ops-critical (Immediate Alert)

```markdown
🚨 **P1 INCIDENT STARTED**
**Time:** 2026-05-29T14:23:45Z (BRT)
**Owner:** @devops-oncall
**Status:** INVESTIGATING

**What:** Transaction system error rate spike to 8%
**Affected Service:** API + Database
**User Impact:** ~500 users unable to complete checkout
**Top Error:** 
  `DatabaseError: FATAL: too many connections`
  (200 occurrences in last 5 minutes)

**Initial Actions:**
- [ ] Confirmed P1 severity
- [ ] Tech Lead notified
- [ ] Investigating database connection pool exhaustion
- [ ] Considering rollback to last stable deploy

**ETA:** 5 minutes for update

**Slack Reactions:**
🔍 = Investigating
🚨 = Critical alert
✅ = Resolved
```

**Post this immediately, then update every 5 minutes.**

---

### Template 2: #product (5-10 minutes)

```markdown
⚠️ **Service Status Update**

We are experiencing a service issue affecting checkout and payment processing.

**What's affected:**
- Transaction submission (last ~10 minutes)
- Parcel release processing

**Workaround:**
- None at the moment. We're investigating.

**What we're doing:**
- Investigating database resource exhaustion
- Evaluating rollback options

**ETA:** Update in 5 minutes

Thank you for your patience.
```

**Keep tone: Honest, transparent, action-oriented.**

---

### Template 3: Leadership Email (10 minutes if P1)

**Subject:** INCIDENT REPORT — imobi [14:23 BRT]

```
To: CTO, PO, Leadership

INCIDENT SUMMARY
───────────────
Start Time: 2026-05-29T14:23:45Z BRT
Severity: P1 (Critical)
Duration: 10 minutes
Current Status: INVESTIGATING


WHAT HAPPENED
─────────────
Error rate spike to 8% on API service. Root cause appears to be database 
connection pool exhaustion (FATAL: too many connections).

This impacts:
- Transaction/checkout completion: ~500 affected users
- Parcel release processing: Queue backing up
- Web & Mobile frontend (all API calls failing)


USER IMPACT
───────────
- ~500 concurrent users unable to transact
- ~2,000 pending transactions in queue
- Revenue impact: Estimated USD $5,000-10,000/min at peak


CURRENT ACTIONS
───────────────
1. ✅ Confirmed P1 severity (all teams notified)
2. 🔍 Investigating database replication lag + connection pool
3. ⏳ Evaluating rollback (safe, < 5 min deployment)
4. ⏳ Considering database restart if needed

Next update: 14:28 BRT (5 minutes)


ROOT CAUSE (Preliminary)
────────────────────────
Likely cause: Recent migration or deployment caused N+1 queries, 
exhausting 100-connection limit in 3 minutes.

Code affected: services/api/src/modules/parceiros/parceiros.service.ts
Deploy time: 14:10 BRT (13 minutes before incident)


NEXT STEPS
──────────
1. Rollback to last stable version (5 min)
2. Run RCA & fix code issue (24 hours)
3. Add connection pool monitoring (48 hours)
4. Implement slow query alerts (1 week)

Will update at 14:28 BRT.
```

**Send email immediately when P1 is confirmed. Keep it factual, include numbers.**

---

### Template 4: Resolution Message (#ops-critical)

```markdown
✅ **INCIDENT RESOLVED**

**Incident ID:** INC-20260529-1423
**Duration:** 17 minutes (14:23 - 14:40 BRT)
**Severity:** P1 (Critical)

**What we did:**
1. ✅ Identified: Database connection pool exhaustion (100/100 connections)
2. ✅ Cause: N+1 query bug in parceiros.service.ts introduced in 14:10 deploy
3. ✅ Action: Rolled back to previous version (14:00 BRT)
4. ✅ Recovery: Connections normalized within 2 minutes post-rollback
5. ✅ Verified: All transaction processing resumed

**Metrics:**
- Error rate: 8% → 0.2% (normal baseline)
- API latency p95: 450ms → 85ms
- Database connections: 98 → 45

**Impact Summary:**
- 500 users experienced checkout delays
- ~2,000 transactions completed after recovery
- Revenue impact: Estimated $85,000 lost
- SLA: 17 min recovery (target: < 15 min) — 2 min over SLA

**Post-Mortem:**
Incident post-mortem will be completed by 2026-05-30T14:00 BRT
RCA & action items → #engineering-general

**Questions?** Reply in this thread.
```

**Send when service is fully operational again.**

---

## 7. ESCALATION TREE

```
INCIDENT DETECTED
       │
       ├─ P4? (Low) ──→ Log + Review Later (No escalation)
       │
       ├─ P3? (Medium) ──→ On-call team
       │   └─ If > 1 hour: Escalate to Tech Lead
       │
       ├─ P2? (High) ──→ DevOps + Tech Lead (standby)
       │   ├─ 0-10 min: Investigate
       │   └─ 10+ min: Tech Lead takes lead
       │
       └─ P1? (Critical) ──→ IMMEDIATE ESCALATION
           │
           ├─ 0 min: All on-call notified (DevOps + Tech Lead + CTO)
           ├─ 5 min: Decision to rollback or escalate further
           ├─ 10 min: CTO engaged if still unresolved
           ├─ 15 min: CEO/PO notified (revenue impact)
           └─ 20+ min: Declare disaster, activate full team
```

**Escalation Contacts:**

```
Role              | Name          | Slack          | Email           | Phone
------------------|---------------|----------------|-----------------|----------
DevOps On-Call    | Rotating      | @devops-oncall | ops@imobi.com   | +55-11-xxxx
Tech Lead         | [Name]        | @tech-lead     | lead@imobi.com  | +55-11-xxxx
CTO               | [Name]        | @cto           | cto@imobi.com   | +55-11-xxxx
PO                | [Name]        | @po            | po@imobi.com    | +55-11-xxxx
CEO               | [Name]        | @ceo           | ceo@imobi.com   | +55-11-xxxx
```

**Escalation Triggers:**

```
Time Elapsed | P1 Escalation                    | P2 Escalation
─────────────|──────────────────────────────────|─────────────────────
0 min        | Alert DevOps + Tech Lead         | Alert DevOps
5 min        | Tech Lead takes lead             | Continue investigation
10 min       | Escalate to CTO (approval)       | Escalate to Tech Lead
15 min       | Declare disaster (full team)     | Continue investigating
20 min       | CEO + PO + Legal notified        | (no further escalation)
```

---

## 8. DECISION TREES

### A. Rollback Decision Tree

```
ROLLBACK OR INVESTIGATE?
       │
       ├─ Recent deploy (< 5 min ago)?
       │  ├─ YES: Error spike immediately after?
       │  │   ├─ YES → ROLLBACK (safe choice)
       │  │   └─ NO → Investigate other causes
       │  └─ NO: Continue investigation
       │
       ├─ Can rollback reach last stable state?
       │  ├─ YES: Database migration-safe?
       │  │   ├─ YES → ROLLBACK
       │  │   └─ NO → Investigate (rollback dangerous)
       │  └─ NO: Investigate
       │
       ├─ Is root cause clearly code/deployment?
       │  ├─ YES → ROLLBACK (fastest recovery)
       │  └─ NO (infrastructure/database) → Investigate
       │
       └─ Unknown?
          ├─ Time pressure (> 10 min, users impacted)?
          │  ├─ YES → ROLLBACK to safe state
          │  └─ NO → Investigate
          └─ Ask Tech Lead → Make decision
```

### B. Scaling Decision Tree

```
DO WE NEED TO SCALE UP?
       │
       ├─ API CPU usage > 80%?
       │  ├─ YES → Scale API (add replicas)
       │  └─ NO: Check other metrics
       │
       ├─ Database connections > 80/100?
       │  ├─ YES → Increase connection pool size
       │  │        (services/api/.env MAX_DB_CONNECTIONS)
       │  └─ NO: Check other metrics
       │
       ├─ Redis memory > 80%?
       │  ├─ YES → Scale Redis (larger instance)
       │  └─ NO: Check other metrics
       │
       ├─ Worker queue depth > 500?
       │  ├─ YES → Scale worker instances
       │  └─ NO: Check other metrics
       │
       └─ Nothing exceeded 80%?
          └─ Scaling won't help. Investigate cause.
```

### C. Database Troubleshooting Tree

```
DATABASE ERRORS DETECTED
       │
       ├─ "FATAL: too many connections"?
       │  ├─ Check: SELECT count(*) FROM pg_stat_activity
       │  ├─ Short-term: Restart API (reconnect pool)
       │  ├─ Medium-term: Increase pool size
       │  └─ Long-term: Fix N+1 queries (code review)
       │
       ├─ "READONLY: transaction cannot modify read-only database"?
       │  ├─ Check: SELECT pg_is_in_recovery()
       │  ├─ If TRUE: Replica promoted, but primary down
       │  ├─ Action: 
       │  │   1. Failover to replica
       │  │   2. Update connection string (DNS)
       │  │   3. Restart API
       │  └─ Contact: Render Support + DBA
       │
       ├─ Replication lag > 15 seconds?
       │  ├─ Check: SELECT extract(epoch from now() - pg_last_xact_replay_timestamp())
       │  ├─ Cause: Primary under heavy load
       │  ├─ Action: Scale primary + investigate slow queries
       │  └─ Check: EXPLAIN ANALYZE on slow queries
       │
       ├─ Disk space < 10%?
       │  ├─ Action: Delete old logs + WAL files
       │  ├─ Command: VACUUM FULL; ANALYZE;
       │  └─ Contact: Render support for disk resize
       │
       └─ Query timeout (> 30 sec)?
          ├─ Check: SELECT * FROM pg_stat_statements WHERE mean_exec_time > 30000
          ├─ Kill slow query: SELECT pg_terminate_backend(pid)
          ├─ Optimize: Add index or rewrite query
          └─ Monitor: Enable log_min_duration_statement = 5000
```

### D. Worker (BullMQ) Troubleshooting Tree

```
BULLMQ WORKER FAILURES
       │
       ├─ Worker process not running?
       │  ├─ Check: ps aux | grep liberacao-parcela
       │  ├─ Logs: docker logs imbobi_worker | tail -100
       │  ├─ Restart: docker restart imbobi_worker
       │  └─ If still failing: Check Redis connection
       │
       ├─ Queue backing up (> 1000 jobs)?
       │  ├─ Check: redis-cli XLEN imbobi:liberacao-parcela
       │  ├─ Reason: Worker slow or crashed
       │  ├─ Immediate: Restart worker
       │  ├─ Check: Job processing time in logs
       │  └─ Long-term: Optimize job handler or scale workers
       │
       ├─ Jobs stuck in processing (never complete)?
       │  ├─ Check: redis-cli --json XREAD STREAMS imbobi:liberacao-parcela 0
       │  ├─ Reason: Process timed out or infinite loop
       │  ├─ Kill: redis-cli XDEL imbobi:liberacao-parcela [job-id]
       │  ├─ Restart: docker restart imbobi_worker
       │  └─ Debug: Enable verbose logging in handler
       │
       ├─ Jobs in dead-letter queue (failed)?
       │  ├─ Check: redis-cli --json XLEN imbobi:liberacao-parcela:failed
       │  ├─ Reason: Permanent error in handler
       │  ├─ Review: Job payload + error message
       │  ├─ Fix: Code issue or upstream dependency
       │  └─ Retry: redis-cli XREAD STREAMS imbobi:liberacao-parcela:failed 0
       │
       └─ Redis memory exhausted (worker keys evicted)?
          ├─ Check: redis-cli INFO memory | grep used_memory_human
          ├─ Action: Scale Redis or reduce job retention
          ├─ Config: Set job expiry in BullMQ config
          └─ Clear: redis-cli FLUSHDB (DANGER: loses all queued jobs)
```

---

## 9. SPECIFIC INCIDENT RUNBOOKS

### Runbook A: Database Failover

**Trigger:** Primary database down, replication lag > 30s, or READONLY error

```bash
# Step 1: Confirm primary is down
psql -h PRIMARY_HOST -U imbobi -d imbobi_prod -c "SELECT 1"
# Expected: psql: error: could not connect to server

# Step 2: Check replica status
psql -h REPLICA_HOST -U imbobi -d imbobi_prod -c "SELECT pg_is_in_recovery();"
# Expected: t (in recovery mode, read-only)

# Step 3: Promote replica to primary
psql -h REPLICA_HOST -U imbobi -d imbobi_prod -c "SELECT pg_promote();"
# Expected: pg_promote
#           (1 row)

# Step 4: Verify promotion (wait 30 seconds)
sleep 30
psql -h REPLICA_HOST -U imbobi -d imbobi_prod -c "SELECT pg_is_in_recovery();"
# Expected: f (no longer in recovery, now primary)

# Step 5: Update Render environment variable
# In Render dashboard > imobi-api > Environment > DATABASE_URL
# Change from PRIMARY_HOST to REPLICA_HOST

# Step 6: Restart API service
# In Render dashboard > imobi-api > Manual Deploy
# Trigger new deployment to pick up new DATABASE_URL

# Step 7: Wait for API to reconnect
# Monitor Sentry errors — should drop to 0 within 2 minutes

# Step 8: Verify transactions resuming
curl https://api.imobi.com/api/v1/health
# Expected: "database": "connected"
```

**Time to recovery:** ~5 minutes

---

### Runbook B: Redis Recovery

**Trigger:** Redis memory exhausted, BullMQ queue failures, or eviction warnings

```bash
# Step 1: Check Redis memory usage
redis-cli INFO memory | grep -E "used_memory|maxmemory"
# Example output:
# used_memory_human:456M
# maxmemory:512M

# Step 2: Identify large keys (memory hogs)
redis-cli --bigkeys
# Top 3 keys with highest memory

# Step 3: Clear non-critical cache
redis-cli EVAL "
for i, key in ipairs(redis.call('keys', 'cache:*')) do
  redis.call('del', key)
end
return redis.call('dbsize')
" 0
# Recovers: ~100-200MB typically

# Step 4: Monitor key types
redis-cli SCAN 0 --match "*" --count 100 | sort | uniq -c | sort -rn

# Step 5: If still critical, scale Redis
# In Render dashboard > imobi-redis > Plan
# Upgrade from 512MB → 1GB
# Downtime: ~2 minutes during transition

# Step 6: Verify BullMQ queue recovering
redis-cli XLEN imbobi:liberacao-parcela
# Should be decreasing (jobs processing)

# Step 7: Check worker logs
docker logs imbobi_worker | tail -50
# Verify jobs resuming
```

**Time to recovery:** 2-10 minutes

---

### Runbook C: API Rollback (Render)

**Trigger:** Error rate spike after deploy, critical code bug

```bash
# Step 1: Identify last known good deploy
# In Render dashboard > imobi-api > Deployments
# List recent 5 deployments
# Find commit hash of last stable (no errors in Sentry)

# Step 2: Click deploy to rollback
# Dashboard > imobi-api > Deployments > [Previous Good Deploy] > Redeploy

# Step 3: Wait for deployment completion (2-3 min)
# Monitor: Render dashboard > imobi-api > Events

# Step 4: Verify health
curl https://api.imobi.com/api/v1/health
# Expected: All services "connected"

# Step 5: Check Sentry error rate drop
# Sentry dashboard > Events
# Should see 90% drop within 30 seconds

# Step 6: Test critical transaction flow
# Use test account, submit transaction
# Verify in: Database logs + Sentry (no errors)

# Step 7: Update team
# Post in #ops-critical: ✅ Rollback complete. Error rate: 0.1% (normal)
```

**Time to recovery:** 3-5 minutes

**Alternative (if Render dashboard unavailable):**
```bash
# Via Render CLI
render deploy --service=imobi-api --deployment-id=[GOOD_DEPLOYMENT_ID]

# Check status
render deployment-status --service=imobi-api --deployment-id=[NEW_DEPLOYMENT_ID]
```

---

### Runbook D: S3 Access Recovery

**Trigger:** S3 403 Forbidden, file upload failures, CORS errors

```bash
# Step 1: Check AWS S3 service status
# https://status.aws.amazon.com/

# Step 2: Verify bucket CORS configuration
aws s3api get-bucket-cors --bucket imobi-fotos-prod
# Expected output should include allowed origins

# Step 3: Fix CORS if missing
cat > /tmp/cors-config.json << 'EOF'
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": [
        "https://imobi.vercel.app",
        "https://imobi.com.br",
        "https://api.imobi.com"
      ],
      "ExposeHeaders": ["ETag", "x-amz-meta-*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
EOF

aws s3api put-bucket-cors --bucket imobi-fotos-prod --cors-configuration file:///tmp/cors-config.json

# Step 4: Verify IAM role permissions
# AWS Console > IAM > Roles > imobi-api
# Check policy includes:
# - s3:GetObject
# - s3:PutObject
# - s3:DeleteObject
# On resource: arn:aws:s3:::imobi-fotos-prod/*

# Step 5: Test S3 access from API
curl -X POST https://api.imobi.com/api/v1/uploads \
  -H "Authorization: Bearer [token]" \
  -F "file=@test.jpg"
# Expected: 200 OK with S3 URL

# Step 6: Monitor Sentry for S3 errors
# Should drop to 0 within 1 minute
```

**Time to recovery:** 3-5 minutes

---

## 10. POST-INCIDENT PROCEDURES

### Immediate (Within 1 hour)

- [ ] Update #incident-postmortems channel with summary
- [ ] Create incident ticket in Jira/GitHub Issues
- [ ] Link all related logs (Sentry, CloudWatch, Vercel)
- [ ] Document timeline (start → detection → action → resolution)

### Short-term (Within 24 hours)

- [ ] **Root Cause Analysis (RCA)**
  - What was the root cause?
  - Why wasn't it caught before production?
  - Could this have been prevented?

- [ ] **Action Items**
  - Short-term (< 1 week): Quick fixes, urgent improvements
  - Medium-term (1-4 weeks): Code changes, process improvements
  - Long-term (1-3 months): Architecture changes, new tooling

- [ ] **Post-mortem Meeting**
  - Team sync to discuss learnings
  - No blame — focus on system improvements
  - Assign owner to each action item

### Long-term (Within 1 week)

- [ ] Execute all short-term action items
- [ ] Implement monitoring improvements
- [ ] Update runbooks and playbooks
- [ ] Share learnings in engineering handbook

### Post-Mortem Template

```markdown
# Incident Post-Mortem: INC-20260529-1423

## Summary
- **Incident:** Database connection pool exhaustion
- **Duration:** 17 minutes
- **Severity:** P1 (Critical)
- **Detected:** Sentry alert (error rate > 5%)
- **Resolved:** Manual rollback + API restart

## Timeline
| Time | Event |
|------|-------|
| 14:10 | Deploy: parceiros.service.ts refactor |
| 14:23 | Error rate spike detected (Sentry alert) |
| 14:24 | DevOps on-call acknowledges incident |
| 14:27 | Root cause identified (N+1 queries) |
| 14:30 | Rollback initiated |
| 14:35 | Rollback complete, error rate → 0 |
| 14:40 | Service fully recovered |

## Root Cause
Refactor of `findParceiros()` in services/api/src/modules/parceiros/parceiros.service.ts
introduced N+1 query pattern:
```typescript
// BEFORE (bad):
const parceiros = await db.parceiros.findMany()
for (const p of parceiros) {
  p.obras = await db.obras.findMany({ where: { partnerId: p.id } })  // ← N queries!
}

// AFTER (good):
const parceiros = await db.parceiros.findMany({
  include: { obras: true }  // ← 1 query with JOIN
})
```

## Contributing Factors
1. Code review missed query optimization
2. No integration test for large dataset (1000+ parceiros)
3. No pre-production load test before deploy
4. Database connection pool limit (100) too low

## What Went Well
- ✅ Alert fired immediately (Sentry < 30 seconds)
- ✅ Team responded quickly (< 2 minutes)
- ✅ Rollback available and successful (< 10 minutes)
- ✅ Communication clear and timely

## What Could Be Better
- ❌ Load testing should be mandatory before deploy
- ❌ Code review process needs query efficiency check
- ❌ Database connection pool limit not monitored
- ❌ No integration test caught N+1 pattern

## Action Items
| Item | Owner | Deadline | Priority |
|------|-------|----------|----------|
| Add N+1 query detection in code review | Tech Lead | 2026-06-05 | P1 |
| Implement load testing (1000+ records) | QA | 2026-06-12 | P1 |
| Add DB connection pool monitoring alert | DevOps | 2026-06-02 | P1 |
| Fix parceiros.service.ts query | Dev | 2026-05-30 | P1 |
| Review all services for similar patterns | Dev Team | 2026-06-10 | P2 |
| Increase DB connection pool to 200 | DevOps | 2026-06-02 | P2 |

## Metrics
- **MTTD (Mean Time To Detect):** 7 min (target: < 5 min) ⚠️
- **MTTR (Mean Time To Resolve):** 17 min (target: < 15 min) ⚠️
- **User Impact:** ~500 users, ~$85K revenue impact
- **Cause:** Code bug (preventable with process)

## Follow-up
- [ ] RCA shared in #engineering-general
- [ ] Action items tracked in Jira
- [ ] Post-mortem meeting scheduled (2026-05-30 10:00 BRT)
```

---

## 11. MONITORING & METRICS

### Key Metrics to Track

```
METRIC                          | BASELINE    | WARNING | CRITICAL
───────────────────────────────|─────────────|─────────|──────────
Error Rate (5-min avg)          | 0.1%        | 2%      | 5%
API Latency p95                 | 100ms       | 150ms   | 300ms
API Latency p99                 | 150ms       | 200ms   | 500ms
Database Connections            | 20/100      | 80/100  | 95/100
Database Replication Lag        | < 1s        | 5s      | 15s
Redis Memory Usage              | 200MB/512MB | 400MB   | 480MB
Worker Queue Depth              | 0-50        | 500     | 2000
Worker Job Failure Rate         | 0%          | 5%      | 10%
HTTP 5xx Errors per minute      | 0-1         | 10      | 50
HTTP 4xx Errors per minute      | 0-10        | 50      | 200
Disk Space (Database)           | 50% used    | 80%     | 95%
S3 Error Rate                   | 0%          | 1%      | 5%
```

### SLA Targets

```
Severity | Response Time | Resolution Time | Monthly Uptime Goal
─────────|───────────────|─────────────────|─────────────────────
P1       | < 5 min       | < 15 min        | 99.99% (52 min/month)
P2       | < 15 min      | < 1 hour        | 99.9% (8.7 hours/month)
P3       | < 1 hour      | < 4 hours       | 99% (7.2 hours/month)
P4       | < 1 day       | < 1 week        | N/A
```

### Incident Frequency Tracking

```
Month    | P1 Count | P2 Count | P3 Count | MTTD  | MTTR  | Trend
─────────|----------|----------|----------|-------|-------|────────
May 26   | 1        | 3        | 8        | 12min | 22min | ↑ (needs improvement)
May 27   | 0        | 2        | 5        | 8min  | 18min | ↓ (better)
May 28   | 2        | 4        | 7        | 6min  | 16min | ↓ (improving)
May 29   | 1        | 3        | 6        | 7min  | 17min | ↔ (stable)
```

**Goal:** Reduce P1 incidents to < 1 per month, MTTR to < 10 minutes.

---

## 12. ON-CALL ROTATION & HANDOFF

### On-Call Responsibilities

**During shift (24 hours):**
- Monitor #ops-critical Slack channel
- Respond to P1/P2 incidents within SLA
- Answer on-call pager alerts
- Keep incident log updated
- No major deployments during nights (unless critical fix)

**Handoff meeting (every 24 hours):**
- Previous on-call → Incoming on-call
- Review incidents from past 24 hours
- Update runbooks if any gaps found
- Verify all tools working (pager, Slack, access)

### On-Call Checklist (At start of shift)

```
□ Verify pager is active (PagerDuty or equivalent)
□ Test Slack notifications (send test alert)
□ Verify access to:
  ├─ Sentry dashboard
  ├─ CloudWatch metrics
  ├─ Render deployment controls
  ├─ Vercel deployment controls
  ├─ AWS console (S3, RDS, CloudWatch)
  ├─ Redis CLI
  └─ Database CLI tools
□ Review incidents from past 24 hours (#incident-postmortems)
□ Check any open action items from previous incidents
□ Verify contact list is current (phone numbers, emails)
□ Brief: Ask previous on-call about any known issues
□ Confirm: "I'm ready to handle incidents"
```

---

## 13. QUICK REFERENCE CARD

**Print & keep at desk:**

```
╔════════════════════════════════════════════════════════════════════╗
║                    INCIDENT RESPONSE QUICK REF                    ║
╠════════════════════════════════════════════════════════════════════╣
║ ALERT RECEIVED?                                                    ║
║ ├─ Acknowledge in #ops-critical with timestamp                   ║
║ ├─ Check Sentry (top errors), CloudWatch (metrics), Vercel logs  ║
║ └─ Classify: P1/P2/P3/P4? Notify stakeholders if P1              ║
║                                                                    ║
║ P1 CRITICAL (< 5 min response):                                   ║
║ ├─ Notify: Tech Lead + CTO immediately (Slack DM)                ║
║ ├─ Decide: Rollback vs. Investigate                              ║
║ ├─ If rollback: Render dashboard > Deployments > Redeploy        ║
║ ├─ If investigate: Check: DB → Redis → S3 → Worker              ║
║ └─ Update stakeholders every 5 minutes                            ║
║                                                                    ║
║ P2 HIGH (< 15 min response):                                      ║
║ ├─ Notify: Tech Lead (standby)                                    ║
║ ├─ Investigate root cause                                         ║
║ ├─ Scale if needed (CPU/Memory/Connections > 80%)                ║
║ └─ Update every 10 minutes                                        ║
║                                                                    ║
║ MOST COMMON CAUSES:                                               ║
║ Error spike    → Rollback recent deploy                           ║
║ Latency spike  → Scale up or kill slow query                      ║
║ DB connection  → Restart connection pool or scale                 ║
║ Redis error    → Clear cache or scale Redis                       ║
║ S3 error       → Check CORS + IAM permissions                     ║
║ Worker stuck   → Restart worker + check queue                     ║
║                                                                    ║
║ CONTACTS:                                                         ║
║ Tech Lead: @tech-lead | CTO: @cto | DevOps: @devops-oncall      ║
║                                                                    ║
║ DASHBOARDS:                                                       ║
║ Sentry: https://sentry.io/organizations/imobi/                   ║
║ CloudWatch: https://console.aws.amazon.com/cloudwatch/           ║
║ Render: https://render.com/dashboard                             ║
║ Vercel: https://vercel.com/dashboard                             ║
║                                                                    ║
║ RUNBOOKS:                                                         ║
║ DB Failover  → /home/docs/runbook/db-failover.md                 ║
║ Redis Reset  → /home/docs/runbook/redis-recovery.md              ║
║ API Rollback → /home/docs/runbook/api-rollback.md                ║
║ S3 Recovery  → /home/docs/runbook/s3-recovery.md                 ║
╚════════════════════════════════════════════════════════════════════╝
```

---

## 14. GLOSSARY & DEFINITIONS

| Term | Definition |
|------|-----------|
| **P1-P4** | Severity classification (Critical to Low) |
| **MTTD** | Mean Time To Detect — how fast we notice issue |
| **MTTR** | Mean Time To Resolve — how fast we fix issue |
| **RCA** | Root Cause Analysis — investigation after incident |
| **SLA** | Service Level Agreement — uptime/response commitments |
| **Rollback** | Reverting to previous known-good code version |
| **Failover** | Switching from primary to replica database |
| **Graceful degradation** | Service partially working instead of full outage |
| **BullMQ** | Job queue system using Redis (async workers) |
| **PostGIS** | PostgreSQL extension for geographic data |
| **Replication lag** | Delay between primary DB write and replica sync |
| **Connection pool** | Pre-created DB connections ready for use |
| **Dead-letter queue** | Failed jobs stored for manual review |

---

## 15. APPENDIX: USEFUL COMMANDS

### Sentry API

```bash
# Get top errors (last 5 minutes)
curl -H "Authorization: Bearer [SENTRY_TOKEN]" \
  https://sentry.io/api/0/organizations/imobi/events/ \
  -d "query=is:error timestamp:>now-5m" | jq '.[] | {error, count, first_seen}'

# Get error rate for specific project
curl -H "Authorization: Bearer [SENTRY_TOKEN]" \
  https://sentry.io/api/0/organizations/imobi/releases/latest/ | jq '.stats'
```

### CloudWatch API

```bash
# Get API latency (p95) last 5 minutes
aws cloudwatch get-metric-statistics \
  --metric-name TargetResponseTime \
  --namespace AWS/ApplicationELB \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Maximum

# Get error rate (5xx)
aws cloudwatch get-metric-statistics \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum
```

### Database Commands

```bash
# Check connections
psql -h $DB_HOST -U imbobi -d imbobi_prod \
  -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Kill slow queries (> 30 sec)
psql -h $DB_HOST -U imbobi -d imbobi_prod \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
      WHERE query_start < now() - interval '30 seconds';"

# Check replication lag
psql -h $DB_HOST -U imbobi -d imbobi_prod \
  -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"

# Show slow queries
psql -h $DB_HOST -U imbobi -d imbobi_prod \
  -c "SELECT mean_exec_time, calls, query FROM pg_stat_statements 
      WHERE mean_exec_time > 100 ORDER BY mean_exec_time DESC LIMIT 10;"
```

### Redis Commands

```bash
# Check memory usage
redis-cli INFO memory | grep -E "used_memory|maxmemory"

# Find large keys
redis-cli --bigkeys

# Clear non-critical cache
redis-cli EVAL "
for i, key in ipairs(redis.call('keys', 'cache:*')) do
  redis.call('del', key)
end
return redis.call('dbsize')
" 0

# Monitor active commands
redis-cli MONITOR | head -100

# Check BullMQ queue depth
redis-cli XLEN imbobi:liberacao-parcela
redis-cli XLEN imbobi:liberacao-parcela:failed
```

### Worker Commands

```bash
# Check worker status
docker ps | grep worker

# View worker logs (last 100 lines)
docker logs imbobi_worker --tail 100 -f

# Restart worker
docker restart imbobi_worker

# Check active jobs
redis-cli XINFO STREAM imbobi:liberacao-parcela

# Clear stuck job from queue
redis-cli XDEL imbobi:liberacao-parcela [job-id]
```

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-05-29 | Initial playbook created | DevOps Team |

---

**Next Review:** 2026-08-29 (90 days)  
**Owner:** DevOps Lead + Tech Lead  
**Feedback:** #ops-general or incident-playbook@imobi.com
