# DISASTER RECOVERY RUNBOOKS - imobi

**Document Version**: 1.0  
**Last Updated**: 2026-05-29  
**Owner**: Engineering Team  
**Severity Levels**: CRITICAL (all runbooks)  

---

## Table of Contents

1. [Database Failover (RDS Standby)](#1-database-failover-rds-standby)
2. [Redis Recovery (ElastiCache Node Failure)](#2-redis-recovery-elasticache-node-failure)
3. [API Rollback (Vercel Deployment)](#3-api-rollback-vercel-deployment)
4. [S3 Bucket Recovery (Data Corruption/Deletion)](#4-s3-bucket-recovery-data-corruptiondeletion)
5. [Full Infrastructure Restart](#5-full-infrastructure-restart-multi-service-outage)
6. [Certificate/TLS Renewal (SSL Expiry)](#6-certificatetls-renewal-ssl-expiry)

---

## CRITICAL CONTACTS & ESCALATION

**Always notify before executing:**
- **Tech Lead**: [Slack #incident-response]
- **DevOps**: aws-devops@imbobi.internal
- **On-Call**: Check PagerDuty
- **Client Notification**: Only after assessment (do not alarm immediately)

**Severity Escalation**:
- Level 1 (< 5 min): Follow runbook solo
- Level 2 (5-15 min): Notify tech lead
- Level 3 (> 15 min): War room + client notification

---

# 1. DATABASE FAILOVER (RDS Standby)

## Decision Tree

```
Is database responding to queries?
├─ NO: Is READ replicas still working?
│  ├─ YES: Keep app in READ-ONLY mode → Initiate failover
│  └─ NO: CRITICAL → Execute failover immediately
└─ YES: Continue normal operations
```

**Trigger Conditions** (ANY of these):
- Primary DB timeout > 30 seconds (3 consecutive failures)
- Connection pool exhaustion (all connections hung)
- Replication lag > 1 minute
- AWS RDS dashboard shows "failed over" status
- Application logs: `ECONNREFUSED database` or `ETIMEDOUT`

**Expected Duration**: < 5 minutes (failover + DNS propagation)  
**Severity**: CRITICAL

---

## Pre-requisites

- [ ] AWS CLI v2 installed: `aws --version`
- [ ] PostgreSQL client installed: `psql --version`
- [ ] Access to AWS RDS console
- [ ] Access to application database connection string
- [ ] Slack #incident-response channel open
- [ ] Verify you have `db:password` from secrets manager

**Setup (Run once per shift)**:
```bash
# Configure AWS CLI credentials
export AWS_REGION=us-east-1
export AWS_PROFILE=imbobi-prod

# Test credentials
aws sts get-caller-identity
```

---

## Step-by-Step Runbook

### Phase 1: DETECTION (1-2 min)

**1.1 Confirm Primary is Down**
```bash
# Check application logs for connection errors
# In Sentry: Search for DatabaseConnectionError, last 5 minutes

# From application server:
psql -h imbobi-prod.c9akciq32.us-east-1.rds.amazonaws.com \
     -U imbobi_admin \
     -d imbobi_prod \
     -c "SELECT 1 AS health_check;"

# Expected: Connection refused OR timeout (< 5 seconds)
```

**Expected Output**: `psql: could not translate host name` or `FATAL: remaining connection slots reserved`

**1.2 Check RDS Instance Status**
```bash
aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod \
  --region us-east-1 \
  --query 'DBInstances[0].[DBInstanceStatus, PendingModifiedValues, DBInstanceArn]' \
  --output text
```

**Expected Output**:
```
available         None    arn:aws:rds:us-east-1:123456789:db/imbobi-prod
failed            None    arn:aws:rds:us-east-1:123456789:db/imbobi-prod
```

**1.3 Check Standby Replica Readiness**
```bash
aws rds describe-db-instances \
  --region us-east-1 \
  --query 'DBInstances[?contains(DBInstanceIdentifier, `imbobi`) && DBInstanceIdentifier != `imbobi-prod`].[DBInstanceIdentifier, DBInstanceStatus, ReadReplicaSourceDBInstanceIdentifier]' \
  --output table
```

**Expected**: Standby should show status `available` with standby replica relationship

**Action if no standby exists**:
- STOP here. This is a **manual failover scenario**.
- Escalate to **AWS Support P1** immediately.
- Proceed to **Phase 4: Emergency Recovery**.

---

### Phase 2: INITIATE FAILOVER (1-2 min)

**CAUTION**: This operation causes < 2 min of downtime. Database will be unavailable during promotion.

**2.1 Initiate RDS Failover**
```bash
# Trigger automatic failover to standby
aws rds reboot-db-instance \
  --db-instance-identifier imbobi-prod \
  --force-failover \
  --region us-east-1

# Output should be:
# {
#   "DBInstance": {
#     "DBInstanceIdentifier": "imbobi-prod",
#     "PendingModifiedValues": {
#       "PendingCloudwatchLogsExports": [],
#       "DBInstanceClass": "db.m6i.xlarge"
#     },
#     "DBInstanceStatus": "rebooting"
#   }
# }
```

**2.2 Monitor Failover Progress**
```bash
# Watch status change from "rebooting" → "available" (takes 2-3 min)
watch -n 5 'aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod \
  --region us-east-1 \
  --query "DBInstances[0].[DBInstanceStatus, AvailabilityZone]" \
  --output text'

# Press Ctrl+C when status is "available"
```

**Expected output progression**:
```
rebooting             us-east-1b          (during failover)
available             us-east-1c          (after failover - different AZ)
```

**Action if status stuck at "rebooting" for > 5 min**:
- Go to **Phase 4: Emergency Recovery**

---

### Phase 3: VALIDATE & RECONNECT (1-2 min)

**3.1 Test Database Connection**
```bash
# Connect to new primary (should auto-resolve to new endpoint)
RETRY_COUNT=0
MAX_RETRIES=10

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  psql -h imbobi-prod.c9akciq32.us-east-1.rds.amazonaws.com \
       -U imbobi_admin \
       -d imbobi_prod \
       -c "SELECT 1 AS health_check;" && break || {
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying in 3s..."
    sleep 3
  }
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "FAILED: Database did not recover after failover"
  exit 1
fi
```

**Expected**: `health_check | 1` (psql prompt may show warning about unknown host, ignore it)

**3.2 Verify Replication Lag**
```bash
# Check that standby is ready (if new standby was promoted)
aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod \
  --region us-east-1 \
  --query 'DBInstances[0].[DBInstanceStatus, StatusInfos]' \
  --output json | jq '.
```

**Expected**: Status `available`, no pending modifiedValues

**3.3 Validate Data Integrity**
```bash
# Check row counts on critical tables
psql -h imbobi-prod.c9akciq32.us-east-1.rds.amazonaws.com \
     -U imbobi_admin \
     -d imbobi_prod \
     -c "
     SELECT 
       schemaname,
       tablename,
       (SELECT COUNT(*) FROM pg_class WHERE relname = tablename) as row_count
     FROM pg_tables 
     WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
     LIMIT 10;
     "
```

**Action if data integrity issue found**:
- Go to **Rollback: Re-promote Original Primary**

**3.4 Restart Application Servers**
```bash
# SSH to app server (or use deployment platform)
# If using Vercel:
# Simply re-deploy latest version (it will use new DB endpoint via DNS)

# If using traditional servers:
# Restart application:
systemctl restart imbobi-api

# Verify health endpoint
curl -s https://api.imbobi.com.br/health | jq '.database.configured'
# Expected: true
```

**3.5 Monitor Application Metrics**
```bash
# Check Sentry for new errors (last 5 minutes)
# Check CloudWatch: DatabaseConnections metric should rise

aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=imbobi-prod \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average \
  --region us-east-1
```

**Expected**: Connections should stabilize at normal baseline (typically 20-50 active connections)

---

### Phase 4: ROLLBACK (If Failover Failed)

**Scenario**: Primary is recovered and we need to failback to original primary

**4.1 Wait for Original Primary Recovery**
```bash
# Monitor original primary status
aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod-replica \
  --region us-east-1 \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text

# Wait for status: "available"
```

**4.2 Promote Original Primary (Manual Failback)**
```bash
# Only do this if original primary is confirmed healthy
# Verify via AWS console first - check CPU, memory, replication lag

# Trigger promote from standby:
aws rds promote-read-replica \
  --db-instance-identifier imbobi-prod-replica \
  --region us-east-1

# This will make the old standby the new primary (2-5 min downtime)
```

**4.3 Verify Failback Success**
```bash
# Check new primary status
psql -h imbobi-prod.c9akciq32.us-east-1.rds.amazonaws.com \
     -U imbobi_admin \
     -d imbobi_prod \
     -c "SELECT version();"
```

---

## Post-Failover Checklist

- [ ] Database responding to queries
- [ ] Replication lag < 1 second
- [ ] Application servers restarted
- [ ] Health endpoint returns `status: ok`
- [ ] No Sentry errors (last 10 min)
- [ ] CloudWatch shows normal connections
- [ ] User-facing monitoring shows green
- [ ] Notify team in Slack #incident-response
- [ ] Document incident in post-mortem template

---

## Troubleshooting

| Issue | Diagnosis | Resolution |
|-------|-----------|-----------|
| **Failover hangs > 5 min** | Primary too large or corrupted | Contact AWS Support P1, check CloudTrail for errors |
| **Connection still refused after failover** | Security group or parameter group issue | Check RDS SG allows EC2 instances, verify port 5432 |
| **Replication lag > 1 min** | Standby under-provisioned | Scale up standby instance class, check wal_level = replica |
| **Data loss detected** | Failover occurred with uncommitted transactions | Restore from backup (Phase 4) |

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Detection | 1-2 min | Confirm primary is down |
| Failover initiation | < 1 min | AWS API call |
| Failover execution | 2-3 min | Primary → standby transition |
| Validation | 1-2 min | Test connections, verify data |
| **Total** | **5-8 min** | Less if detection is fast |

---

# 2. REDIS RECOVERY (ElastiCache Node Failure)

## Decision Tree

```
Is Redis responding to PING?
├─ NO: Is it in failover state?
│  ├─ YES: Wait for automatic recovery (usually < 30s)
│  └─ NO: Manual failover required
└─ YES: Check memory/CPU, continue operations
```

**Trigger Conditions** (ANY of these):
- Redis PING timeout (> 5 seconds, 3 consecutive failures)
- Memory error: `OOM command not allowed when used memory > maxmemory`
- Connection pool errors: `ECONNREFUSED redis`
- CloudWatch: `EngineCPUUtilization` > 90% for > 2 min
- Queue processing stuck (no new liberacao-parcela workers)

**Expected Duration**: < 3 minutes (automatic failover + reconnect)  
**Severity**: CRITICAL (queues blocked, cache unavailable)

---

## Pre-requisites

- [ ] Redis CLI installed: `redis-cli --version`
- [ ] AWS CLI v2 installed: `aws --version`
- [ ] Access to ElastiCache console
- [ ] Access to application Redis connection string
- [ ] SSH/terminal access to API server for service restart

**Setup (Run once per shift)**:
```bash
# Configure AWS CLI
export AWS_REGION=us-east-1
export AWS_PROFILE=imbobi-prod

# Get Redis endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis-prod \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' \
  --output text)

echo "Redis endpoint: $REDIS_ENDPOINT"
```

---

## Step-by-Step Runbook

### Phase 1: DETECTION (1-2 min)

**1.1 Test Redis Connection**
```bash
# From application server or local machine
redis-cli -h $REDIS_ENDPOINT -p 6379 PING

# Expected: PONG
```

**Expected Output**: `PONG` or error message like `ECONNREFUSED` or `timeout`

**1.2 Check ElastiCache Cluster Status**
```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis-prod \
  --show-cache-node-info \
  --region us-east-1 \
  --query 'CacheClusters[0].[CacheClusterStatus, Engine, CacheNodeType, CacheNodes[0].CacheNodeStatus]' \
  --output text
```

**Expected statuses**:
- `available` - Healthy
- `creating` - Being created (wait 5-10 min)
- `deleting` - Being terminated (bad)
- `rebooting` - Automatic recovery in progress (wait 2-3 min)
- `snapshotting` - Taking backup (wait)

**1.3 Check Memory Usage**
```bash
redis-cli -h $REDIS_ENDPOINT -p 6379 INFO memory | grep -E 'used_memory|maxmemory'

# Expected output:
# used_memory_human:250.5M
# maxmemory:1024M
```

**Action if memory > 95% of maxmemory**:
- Proceed to **Phase 3: Emergency Cache Flush**

**1.4 Check Queue Status (BullMQ)**
```bash
redis-cli -h $REDIS_ENDPOINT -p 6379 KEYS 'bull:liberacao-parcela:*' | wc -l

# If 0 or very low: queues are blocked
```

---

### Phase 2: AUTOMATIC RECOVERY (Wait & Monitor)

**2.1 Monitor Automatic Failover (if multi-AZ)**
```bash
# ElastiCache with Multi-AZ failover automatically promotes replica
watch -n 5 'aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis-prod \
  --show-cache-node-info \
  --region us-east-1 \
  --query "CacheClusters[0].[CacheClusterStatus, CacheNodes[0].CacheNodeStatus]" \
  --output text'

# Press Ctrl+C when status is "available"
```

**If status changes to "available" within 2 min**:
- Go to **Phase 4: Validate Recovery**
- Automatic failover succeeded

**If status stuck at "rebooting" for > 3 min**:
- Proceed to **Phase 3: Manual Intervention**

---

### Phase 3: MANUAL INTERVENTION (If Automatic Recovery Fails)

**3.1 Force Reboot ElastiCache Node**
```bash
# WARNING: This causes 1-3 min of complete Redis downtime

aws elasticache reboot-cache-cluster \
  --cache-cluster-id imbobi-redis-prod \
  --region us-east-1

# Expected output:
# {
#   "CacheCluster": {
#     "CacheClusterStatus": "rebooting",
#     ...
#   }
# }
```

**3.2 Monitor Reboot Progress**
```bash
# Wait for status to become "available" (3-5 min)
watch -n 5 'aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis-prod \
  --region us-east-1 \
  --query "CacheClusters[0].CacheClusterStatus" \
  --output text'
```

**If reboot hangs > 10 min**:
- Contact **AWS Support P1**
- Proceed to **Phase 3b: Emergency Cache Flush**

**3b. EMERGENCY CACHE FLUSH (If Redis Unrecoverable)**
```bash
# Only if Redis completely down and reboot failed
# This will:
# 1. Clear all cached data (users may re-query)
# 2. Reset queue (in-flight jobs will retry)
# 3. Allow application to continue

# Create snapshot for later analysis
aws elasticache create-cache-cluster-snapshot \
  --cache-cluster-id imbobi-redis-prod \
  --snapshot-name imbobi-redis-emergency-$(date +%s) \
  --region us-east-1

# Delete and recreate Redis cluster (5-10 min downtime)
aws elasticache delete-cache-cluster \
  --cache-cluster-id imbobi-redis-prod \
  --skip-final-snapshot \
  --region us-east-1

# Recreate with same parameters
aws elasticache create-cache-cluster \
  --cache-cluster-id imbobi-redis-prod \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --port 6379 \
  --cache-parameter-group-name default.redis7 \
  --region us-east-1

# Wait for "available" status
watch -n 5 'aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis-prod \
  --region us-east-1 \
  --query "CacheClusters[0].CacheClusterStatus" \
  --output text'
```

---

### Phase 4: VALIDATE RECOVERY (1-2 min)

**4.1 Test Redis Connection**
```bash
redis-cli -h $REDIS_ENDPOINT -p 6379 PING
# Expected: PONG

redis-cli -h $REDIS_ENDPOINT -p 6379 INFO server | grep redis_version
# Expected: redis_version:7.0.x
```

**4.2 Check Memory & Stats**
```bash
redis-cli -h $REDIS_ENDPOINT -p 6379 INFO stats

# Look for:
# total_commands_processed:10000+
# total_connections_received:50+
# rejected_connections:0
```

**4.3 Verify Cache Hit Ratio**
```bash
redis-cli -h $REDIS_ENDPOINT -p 6379 INFO stats | grep -E 'keyspace_hits|keyspace_misses'

# Calculate ratio: hits / (hits + misses)
# Expected: > 50% (means cache is working)
```

**4.4 Check Queue Recovery**
```bash
# Count jobs in liberacao-parcela queue
redis-cli -h $REDIS_ENDPOINT -p 6379 LLEN bull:liberacao-parcela:jobs

# Expected: > 0 (queued jobs exist)

# Check for stuck jobs (state = "active" with old timestamp)
redis-cli -h $REDIS_ENDPOINT -p 6379 KEYS 'bull:liberacao-parcela:*:active' | wc -l
```

**4.5 Restart Application Services**
```bash
# Force reconnection to Redis
# If using containerized deployment:
kubectl rollout restart deployment/imbobi-api -n production

# If using traditional servers:
systemctl restart imbobi-api

# Verify health endpoint
sleep 5
curl -s https://api.imbobi.com.br/health | jq '.redis.status'
# Expected: "connected"
```

**4.6 Monitor Error Rate (Sentry)**
```bash
# Check that error rate drops back to baseline
# In Sentry: Filter by tag:redis-error, expect 0 new errors (last 5 min)
```

---

## Post-Recovery Checklist

- [ ] Redis responds to PING
- [ ] Memory usage < 80% of maxmemory
- [ ] Cache hit ratio > 50%
- [ ] Queue has jobs (not empty)
- [ ] Application health endpoint shows redis: "connected"
- [ ] No Sentry errors related to Redis
- [ ] CloudWatch metrics show normal
- [ ] Worker processes restarted and pulling jobs
- [ ] Notify team in Slack #incident-response

---

## Troubleshooting

| Issue | Diagnosis | Resolution |
|-------|-----------|-----------|
| **PING timeout after reboot** | Network connectivity issue | Check security group allows app → ElastiCache, verify subnet/AZ |
| **Memory still > 95% after reboot** | Cache data not cleared | Manual flush: `redis-cli FLUSHALL` (careful: loses all cache) |
| **Queues still empty** | Jobs were lost in OOM | Re-trigger liberacao-parcela workers, check app logs for dropped jobs |
| **Reboot stuck > 10 min** | AWS infrastructure issue | Delete cluster and recreate (see Phase 3b) |

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Detection | 1-2 min | Confirm Redis down |
| Wait for auto-recovery | 2-3 min | If it works |
| Manual reboot (fallback) | 3-5 min | If auto-recovery fails |
| Validation | 1-2 min | Test connections, check queues |
| **Total** | **3-7 min** | Depends on recovery method |

---

# 3. API ROLLBACK (Vercel Deployment)

## Decision Tree

```
Is error rate spiking or latency degraded?
├─ YES: Is it a new deployment (< 10 min)?
│  ├─ YES: Rollback to previous deployment
│  └─ NO: Investigate root cause first, then decide rollback
└─ NO: Continue normal operations
```

**Trigger Conditions** (ANY of these):
- Error rate > 5% (measured over 5 min)
- P95 latency > 200ms (sustained for 5 min)
- Specific error in Sentry: `[5xx] Internal Server Error` spike
- Deployment shows status "failed" or "error"
- Application unable to connect to database/Redis
- Cascading failures in dependent services (web, mobile)

**Expected Duration**: < 2 minutes (revert + re-deploy if needed)  
**Severity**: CRITICAL (API unavailable to clients)

---

## Pre-requisites

- [ ] Access to Vercel dashboard (vercel.com/dashboard)
- [ ] Access to git repository (GitHub)
- [ ] Access to Sentry dashboard (sentry.io)
- [ ] SSH key configured for git deployment (if rolling back manually)
- [ ] Slack #incident-response channel open
- [ ] Know latest 3 commit SHAs (from `git log --oneline -5`)

**Setup (Run once per shift)**:
```bash
cd /home/user/imobi

# Verify git is ready
git status
git log --oneline -3

# Get current Vercel deployment info
# (Requires Vercel CLI: npm i -g vercel)
vercel ls
```

---

## Step-by-Step Runbook

### Phase 1: DETECTION & ASSESSMENT (1-2 min)

**1.1 Confirm Error Rate Spike**
```bash
# Check Sentry for error rate (last 10 min)
# Dashboard → Releases → <latest> → Events

# Calculate error rate:
# ERROR_COUNT / (ERROR_COUNT + SUCCESS_COUNT) > 5%

# Or use curl to test API
curl -i https://api.imbobi.com.br/health
# Should return: 200 OK with JSON body
# If: 500, 503, or timeout → API is down
```

**Expected output**:
```json
{
  "status": "ok",
  "timestamp": "2026-05-29T15:30:00Z",
  "redis": {"status": "connected"},
  "database": {"configured": true}
}
```

**1.2 Check Deployment Status in Vercel**
```bash
# Visit: https://vercel.com/imbobi/api/deployments
# Or use CLI:
vercel ls --limit 10

# Look for status: "Ready" (good), "Error" (bad), "Building" (in progress)
```

**Expected**:
```
Production  ✓ Ready   2 minutes ago    main@a1b2c3d
Staging     ✗ Error   5 minutes ago    feature/xyz@x9y8z7
```

**1.3 Identify When Deployment Started**
```bash
# In Vercel dashboard, note:
# - When deployment started
# - Which commit (SHA)
# - Which branch

# If < 10 min ago AND error rate spiked AFTER deployment:
# → Likely the deployment caused the issue

# If > 30 min AND error rate started earlier:
# → Likely not the deployment, investigate infrastructure
```

**1.4 Check Application Logs**
```bash
# SSH to Vercel function logs (or use Vercel CLI):
vercel logs --limit 50 2>&1 | tail -30

# Look for:
# - "Error: Cannot find module" → Build issue
# - "ECONNREFUSED" → Database/Redis issue
# - "SyntaxError" → Code issue
```

**Decision**:
- **If error within 5 min of deployment**: Proceed to Phase 2 (Rollback)
- **If error from infrastructure**: Skip to Phase 3 (Infrastructure Check)
- **If error from application code**: Proceed to Phase 2 (Rollback)

---

### Phase 2: ROLLBACK TO PREVIOUS DEPLOYMENT (1-2 min)

**2.1 Identify Previous Good Deployment**
```bash
# In Vercel dashboard, find the most recent "Ready" status before current
# Usually the 2nd or 3rd deployment in the list

# Or via CLI:
vercel ls --limit 20 | grep "Ready"

# Copy the COMMIT SHA of the last stable deployment
# Example: a1b2c3d

PREVIOUS_COMMIT="a1b2c3d"  # Replace with actual SHA from Vercel
```

**2.2 Revert to Previous Deployment (Option A: Vercel Auto-Rollback)**
```bash
# Visit: https://vercel.com/imbobi/api/deployments
# Click on the last "Ready" deployment
# Click "Promote to Production"
# Confirm action

# Wait for redeployment to complete (1-2 min)
```

**2.3 Revert via Git (Option B: Manual Rollback)**
```bash
# Only if Vercel UI not responding

cd /home/user/imobi

# Get previous commit SHA
git log --oneline -5
# Output:
# x1y2z3 fix: error handling
# a1b2c3 chore: dependencies
# p1q2r3 feat: new feature
#
# If x1y2z3 is bad, revert to a1b2c3

git revert --no-edit x1y2c3
# OR
git reset --hard a1b2c3

# Push to main branch
git push origin main

# Vercel auto-deploys on main push (wait 2-3 min)
```

**WARNING**: `git reset --hard` will lose the bad commit. Use `git revert` for safer history.

**2.4 Monitor Deployment Progress**
```bash
# Watch Vercel deployment status
watch -n 5 'vercel ls --limit 5'

# Or check Vercel dashboard for status animation
# Status should show: "Building..." → "Ready" or "Error"

# If deployment takes > 5 min, it may be hanging:
# - Check Vercel function logs for errors
# - May need to cancel and retry
```

**Expected progression**:
```
Building   1 minute ago
Building   2 minutes ago
Ready      3 minutes ago   ✓ (deployment complete)
```

**2.5 Verify Rollback Success**
```bash
# Test API health endpoint again
curl -i https://api.imbobi.com.br/health

# Expected: 200 OK (if infrastructure is fine)
```

**Action if still returning 5xx**:
- Proceed to Phase 3 (Infrastructure Check)

---

### Phase 3: INFRASTRUCTURE CHECK (If Rollback Didn't Work)

**3.1 Verify Database Connection**
```bash
# From application logs:
curl -s https://api.imbobi.com.br/health | jq '.database.configured'
# Expected: true

# If false, database is not reachable
# Execute: [Database Failover Runbook](#1-database-failover-rds-standby)
```

**3.2 Verify Redis Connection**
```bash
curl -s https://api.imbobi.com.br/health | jq '.redis.status'
# Expected: "connected"

# If "error", Redis is down
# Execute: [Redis Recovery Runbook](#2-redis-recovery-elasticache-node-failure)
```

**3.3 Check Vercel Build Logs**
```bash
# In Vercel dashboard: Click deployment → "Build Logs"
# Look for errors like:
# - "Error: ENOENT: no such file or directory"
# - "TypeError: Cannot read property"
# - "Module not found"

# If build failed, deployment is broken
# Action: Review code changes, fix issue, re-deploy
```

**3.4 Check Environment Variables**
```bash
# In Vercel dashboard: Settings → Environment Variables
# Verify all required vars are present:
# - DATABASE_URL
# - REDIS_HOST, REDIS_PORT
# - AWS credentials
# - API keys (Firebase, SendGrid, etc.)

# If any missing, add them and re-deploy
vercel env pull .env.local
vercel redeploy
```

---

### Phase 4: ROLLBACK VALIDATION & MONITORING

**4.1 Error Rate Verification**
```bash
# Wait 2 minutes for new deployment to stabilize
# Then check Sentry:
# - Error rate should drop below 1%
# - No 5xx spikes in last 5 min

# Check CloudWatch (if available):
aws cloudwatch get-metric-statistics \
  --namespace Vercel \
  --metric-name HTTPErrorRate \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average
```

**Expected**: Error rate < 1%, recent errors should be from before rollback

**4.2 Latency Check**
```bash
# Measure API response time
time curl -s https://api.imbobi.com.br/health > /dev/null
# Expected: real < 100ms

# If P95 latency still > 200ms:
# - Check database query performance
# - Check if Redis is under load
# - Scale up infrastructure if needed
```

**4.3 Application Logging**
```bash
# Check application logs for any warnings/errors
vercel logs --limit 100 2>&1 | grep -i "error\|warn"

# Should see no errors related to the rollback
```

**4.4 User-Facing Tests**
```bash
# Test key user flows:
# 1. Web app login: https://imbobi.com.br
# 2. Mobile app: Open app and login
# 3. API directly: curl -X GET https://api.imbobi.com.br/obras

# All should work without errors
```

---

## Post-Rollback Checklist

- [ ] Error rate < 1%
- [ ] API /health endpoint returns 200 OK
- [ ] P95 latency < 200ms
- [ ] No Sentry errors from API code
- [ ] Database connected (health check)
- [ ] Redis connected (health check)
- [ ] Web app functioning
- [ ] Mobile app functioning
- [ ] Vercel deployment status: "Ready"
- [ ] Notify team in Slack #incident-response
- [ ] Schedule post-mortem for failed deployment

---

## Troubleshooting

| Issue | Diagnosis | Resolution |
|-------|-----------|-----------|
| **Rollback succeeded but still 5xx** | Infrastructure issue, not code | Check database/Redis health, see Phase 3 |
| **Deployment takes > 5 min** | Vercel infrastructure slow or stuck | Cancel deployment, try again, or contact Vercel support |
| **Can't connect to Vercel** | Network/auth issue | Use git push instead (Phase 2.3) |
| **Multiple rollbacks needed** | Series of bad deployments | Investigate root cause, notify team, consider reverting further back |

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Detection | 1-2 min | Confirm error rate spike |
| Identify issue | 1-2 min | Check Vercel, recent deployments |
| Rollback | 1-2 min | Revert in Vercel or git |
| Redeployment | 2-3 min | Vercel rebuilds and redeploys |
| Validation | 1-2 min | Test health, check errors |
| **Total** | **< 2 min** | If auto-rollback works quickly |

---

# 4. S3 BUCKET RECOVERY (Data Corruption/Deletion)

## Decision Tree

```
Are S3 operations failing?
├─ YES: 404 on GET /evidencias?
│  ├─ YES: File deleted or never uploaded
│  └─ NO: Bucket access denied or corrupted
├─ List bucket working?
│  ├─ YES: Check versioning enabled
│  └─ NO: Bucket policy or IAM issue
└─ NO: Continue normal operations
```

**Trigger Conditions** (ANY of these):
- HTTP 4xx errors on GET /evidencias/:id (construction photos)
- ListBucket operation fails
- S3 bucket inaccessible via AWS console
- User reports missing photos
- Versioning shows recent deletions
- Replication lag detected (cross-region)

**Expected Duration**: < 10 minutes (if versioning enabled)  
**Severity**: CRITICAL (users can't access evidence photos)

---

## Pre-requisites

- [ ] AWS CLI v2 installed: `aws --version`
- [ ] Access to S3 bucket console
- [ ] Access to CloudTrail (for delete tracking)
- [ ] Versioning must be enabled on bucket (verify now)
- [ ] Cross-region replication enabled (optional but recommended)
- [ ] IAM permissions: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucketVersions`

**Setup (Run once per shift)**:
```bash
export AWS_REGION=us-east-1
export AWS_PROFILE=imbobi-prod
export S3_BUCKET=imbobi-evidencias-prod

# Verify bucket exists and is accessible
aws s3 ls s3://$S3_BUCKET --max-items 5

# Check versioning status
aws s3api get-bucket-versioning \
  --bucket $S3_BUCKET \
  --region $AWS_REGION

# Expected:
# {
#   "Status": "Enabled",
#   "MFADelete": "Enabled"  (ideally)
# }
```

---

## Step-by-Step Runbook

### Phase 1: DETECTION & ASSESSMENT (1-2 min)

**1.1 Confirm S3 Bucket Accessibility**
```bash
# Test basic bucket operations
aws s3 ls s3://$S3_BUCKET --max-items 10

# Should return list of objects or "No objects" (not error)
```

**Expected output**:
```
2026-05-29 10:30:00          0 (empty bucket)
2026-05-28 15:45:00    1234567 obra-123/evidencia-001.jpg
2026-05-28 14:20:00     987654 obra-456/evidencia-002.jpg
```

**Expected errors (and actions)**:
- `NoSuchBucket` → Bucket deleted, needs restore from backup
- `AccessDenied` → IAM/bucket policy issue, fix permissions
- `InvalidBucketName` → Wrong bucket name, verify

**1.2 Identify Missing Objects**
```bash
# From application logs or user report, identify the object key
MISSING_KEY="obra-123/evidencia-001.jpg"

# Try to retrieve it
aws s3 cp s3://$S3_BUCKET/$MISSING_KEY /tmp/test.jpg
# OR
aws s3api get-object \
  --bucket $S3_BUCKET \
  --key $MISSING_KEY \
  /tmp/test.jpg

# Expected error:
# An error occurred (NoSuchKey) when calling the GetObject operation: The specified key does not exist.
```

**1.3 Check If Versioning is Enabled**
```bash
# CRITICAL: Versioning must be enabled for recovery
aws s3api get-bucket-versioning \
  --bucket $S3_BUCKET \
  --region $AWS_REGION \
  --output json | jq '.Status'

# Expected: "Enabled"
```

**Action if versioning NOT enabled**:
- Bucket cannot be recovered from deletion
- Only option: restore from backup or ask user to re-upload
- **Proceed to Phase 3: Backup Restore**

**1.4 Check for Recent Deletions**
```bash
# List all versions (including deleted)
aws s3api list-object-versions \
  --bucket $S3_BUCKET \
  --region $AWS_REGION \
  --max-items 50 \
  --output json | jq '.Versions[] | select(.IsLatest==false) | {Key, LastModified, VersionId, Size}'

# Look for objects with Size: null (indicates deletion marker)
```

**Example output**:
```json
{
  "Key": "obra-123/evidencia-001.jpg",
  "LastModified": "2026-05-29T15:00:00+00:00",
  "VersionId": "delete-marker-xyz",
  "Size": null
}
```

**1.5 Track Who Deleted the Object**
```bash
# Check CloudTrail for deletion events (if enabled)
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceName,AttributeValue=$S3_BUCKET \
  --max-items 50 \
  --region us-east-1 \
  --output json | jq '.Events[] | select(.EventName=="DeleteObject") | {EventTime, Username, CloudTrailEvent}'

# Look for:
# - EventTime (when it was deleted)
# - Username (who deleted it)
# - Whether it was accidental or intentional
```

**Decision**:
- **If recent deletion (< 1 hour)**: Proceed to Phase 2 (Restore from Versioning)
- **If old deletion (> 24 hours)**: Backup may be outdated, check Phase 3
- **If data corruption detected**: Proceed to Phase 4 (Advanced Recovery)

---

### Phase 2: RESTORE FROM S3 VERSIONING (1-3 min)

**2.1 List All Versions of Object**
```bash
aws s3api list-object-versions \
  --bucket $S3_BUCKET \
  --prefix $MISSING_KEY \
  --region $AWS_REGION \
  --output json | jq '.Versions[] | {VersionId, LastModified, Size, IsLatest}'

# Expected output:
# [
#   {
#     "VersionId": "version-123",
#     "LastModified": "2026-05-29T14:00:00+00:00",
#     "Size": 1234567,
#     "IsLatest": false
#   },
#   {
#     "VersionId": "delete-marker-456",
#     "LastModified": "2026-05-29T15:00:00+00:00",
#     "Size": null,
#     "IsLatest": true  ← This is the current deletion marker
#   }
# ]
```

**2.2 Restore Previous Version (Option A: Copy Older Version)**
```bash
# Copy the old version to the current location
# This makes the old version the latest again (without deletion marker)

OLD_VERSION_ID="version-123"  # From output above

aws s3api copy-object \
  --bucket $S3_BUCKET \
  --copy-source $S3_BUCKET/$MISSING_KEY?versionId=$OLD_VERSION_ID \
  --key $MISSING_KEY \
  --region $AWS_REGION

# Verify restore
aws s3api get-object \
  --bucket $S3_BUCKET \
  --key $MISSING_KEY \
  /tmp/restored.jpg

ls -lh /tmp/restored.jpg
# Should show file size > 0
```

**2.3 Restore Previous Version (Option B: Delete the Deletion Marker)**
```bash
# More elegant approach: remove the deletion marker
# This exposes the previous version as current

DELETE_MARKER_VERSION_ID="delete-marker-456"  # The current one with Size: null

aws s3api delete-object \
  --bucket $S3_BUCKET \
  --key $MISSING_KEY \
  --version-id $DELETE_MARKER_VERSION_ID \
  --region $AWS_REGION

# Verify: The previous version should now be accessible
aws s3api get-object \
  --bucket $S3_BUCKET \
  --key $MISSING_KEY \
  /tmp/restored.jpg
```

**2.4 Verify Restore Success**
```bash
# Check file exists and has content
aws s3api head-object \
  --bucket $S3_BUCKET \
  --key $MISSING_KEY \
  --region $AWS_REGION \
  --output json | jq '{LastModified, ContentLength, ETag}'

# Expected:
# {
#   "LastModified": "2026-05-29T14:00:00+00:00",
#   "ContentLength": 1234567,
#   "ETag": "\"abc123def456\""
# }
```

**2.5 Restore Multiple Objects (Batch Recovery)**
```bash
# If multiple objects were deleted, restore them all

# Get list of deleted objects
aws s3api list-object-versions \
  --bucket $S3_BUCKET \
  --region $AWS_REGION \
  --output json | jq '.DeleteMarkers[] | .Key' > /tmp/deleted-keys.txt

# For each deleted key, restore the previous version
while IFS= read -r KEY; do
  # Get the most recent non-deleted version
  OLD_VERSION=$(aws s3api list-object-versions \
    --bucket $S3_BUCKET \
    --prefix "$KEY" \
    --region $AWS_REGION \
    --output json | jq -r '.Versions[0].VersionId')
  
  # Restore it
  aws s3api copy-object \
    --bucket $S3_BUCKET \
    --copy-source $S3_BUCKET/$KEY?versionId=$OLD_VERSION \
    --key "$KEY" \
    --region $AWS_REGION
  
  echo "Restored: $KEY"
done < /tmp/deleted-keys.txt
```

---

### Phase 3: RESTORE FROM BACKUP (If Versioning Disabled)

**3.1 Check Backup Strategy**
```bash
# Verify if backup bucket exists (cross-region replication)
aws s3 ls s3://imbobi-evidencias-backup/

# Or check for snapshot/point-in-time recovery
aws s3api list-buckets | grep -i backup
```

**Expected**: Backup bucket with recent objects

**3.2 Copy from Backup Bucket**
```bash
BACKUP_BUCKET="imbobi-evidencias-backup"

# Copy missing object from backup
aws s3 cp s3://$BACKUP_BUCKET/$MISSING_KEY s3://$S3_BUCKET/$MISSING_KEY

# Verify
aws s3api head-object \
  --bucket $S3_BUCKET \
  --key $MISSING_KEY
```

**3.3 If No Backup Exists**
```bash
# Only option: Ask user to re-upload the photo
# Send notification to affected users
# Log incident for post-mortem

echo "CRITICAL: Data loss occurred. User action required."
# Notify in Slack #incident-response with affected user IDs
```

---

### Phase 4: DATA INTEGRITY CHECK (If Corruption Suspected)

**4.1 Identify Corrupted Objects**
```bash
# Randomly sample 10 objects and validate them
aws s3api list-objects-v2 \
  --bucket $S3_BUCKET \
  --max-keys 1000 \
  --region $AWS_REGION \
  --output json | jq '.Contents | shuffle | .[0:10] | .[] | .Key' > /tmp/sample-keys.txt

# Download and check each object
while IFS= read -r KEY; do
  aws s3api get-object \
    --bucket $S3_BUCKET \
    --key "$KEY" \
    /tmp/$KEY
  
  # Check file integrity (e.g., image headers for JPEG)
  file /tmp/$KEY
  
  # Expected: "image/jpeg" or similar (not "data")
done < /tmp/sample-keys.txt
```

**4.2 Check ETag Consistency**
```bash
# For each object, compare ETag with original upload
# This detects silent corruption

aws s3api list-objects-v2 \
  --bucket $S3_BUCKET \
  --region $AWS_REGION \
  --output json | jq '.Contents[] | {Key, ETag}' > /tmp/s3-etags.txt

# Compare with application database (if stored)
# SELECT file_key, expected_etag FROM evidencia WHERE bucket = 'imbobi-evidencias-prod'

# Mismatches indicate corruption
```

**4.3 Recover Corrupted Objects**
```bash
# If corruption found in current version, try restoring previous version

CORRUPTED_KEY="obra-123/corrupted.jpg"

# List versions
aws s3api list-object-versions \
  --bucket $S3_BUCKET \
  --prefix $CORRUPTED_KEY \
  --region $AWS_REGION \
  --output json | jq '.Versions[0:5]'

# Restore the oldest (presumably uncorrupted) version
OLDEST_VERSION=$(aws s3api list-object-versions \
  --bucket $S3_BUCKET \
  --prefix $CORRUPTED_KEY \
  --region $AWS_REGION \
  --output json | jq -r '.Versions[-1].VersionId')

aws s3api copy-object \
  --bucket $S3_BUCKET \
  --copy-source $S3_BUCKET/$CORRUPTED_KEY?versionId=$OLDEST_VERSION \
  --key $CORRUPTED_KEY
```

---

### Phase 5: PREVENTIVE MEASURES & MONITORING

**5.1 Enable Versioning (If Not Already)**
```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket $S3_BUCKET \
  --versioning-configuration Status=Enabled \
  --region $AWS_REGION

# Enable MFA Delete (extra protection)
aws s3api put-bucket-versioning \
  --bucket $S3_BUCKET \
  --versioning-configuration Status=Enabled,MFADelete=Enabled \
  --region $AWS_REGION \
  --mfa-serial-number arn:aws:iam::ACCOUNT:mfa/USERNAME \
  --mfa-authentication-status-code MFA_CODE

# Check status
aws s3api get-bucket-versioning --bucket $S3_BUCKET
```

**5.2 Enable Cross-Region Replication**
```bash
# Create backup bucket in different region
aws s3api create-bucket \
  --bucket imbobi-evidencias-backup \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

# Enable replication rule
cat > /tmp/replication.json << 'EOF'
{
  "Role": "arn:aws:iam::ACCOUNT:role/s3-replication-role",
  "Rules": [
    {
      "Status": "Enabled",
      "Priority": 1,
      "Filter": {"Prefix": ""},
      "Destination": {
        "Bucket": "arn:aws:s3:::imbobi-evidencias-backup",
        "ReplicationTime": {"Status": "Enabled", "Time": {"Minutes": 15}}
      }
    }
  ]
}
EOF

aws s3api put-bucket-replication \
  --bucket imbobi-evidencias-prod \
  --replication-configuration file:///tmp/replication.json
```

**5.3 Enable S3 Object Lock (Compliance)**
```bash
# Prevent deletion for X days (WORM compliance)
# NOTE: Must be enabled at bucket creation time
# If not already enabled, requires new bucket

aws s3api put-object-legal-hold \
  --bucket $S3_BUCKET \
  --key $MISSING_KEY \
  --legal-hold Status=ON

# Set retention period
aws s3api put-object-retention \
  --bucket $S3_BUCKET \
  --key $MISSING_KEY \
  --retention "Mode=GOVERNANCE,RetainUntilDate=2026-08-29T00:00:00Z"
```

---

## Post-Recovery Checklist

- [ ] Missing objects restored (spot-check 5 random files)
- [ ] Object sizes match expected (not corrupted)
- [ ] ETags verified if stored in database
- [ ] User reports confirm photos are accessible
- [ ] S3 bucket versioning enabled
- [ ] Cross-region replication verified
- [ ] CloudTrail logs reviewed for deletion cause
- [ ] Backup strategy documented and tested
- [ ] Notify team in Slack #incident-response
- [ ] Update runbook with any new findings

---

## Troubleshooting

| Issue | Diagnosis | Resolution |
|-------|-----------|-----------|
| **Versioning not enabled** | Bucket doesn't have versioning | Enable it now, but past deletions are unrecoverable |
| **All versions deleted** | Attacker or accidental `delete-object` with version ID | Check backup bucket, restore from tape backup |
| **Backup bucket also deleted** | Multi-region deletion or compromised credentials | Escalate to AWS incident response, file support case |
| **Object corrupted in all versions** | Corruption happened during upload or storage failure | Attempt to download from backup, validate application checksum |

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Detection | 1-2 min | Identify missing object |
| Check versioning | 1 min | Verify recovery is possible |
| Restore from version | 1-2 min | Copy old version |
| Verify restore | 1 min | Head object, check size |
| **Total** | **< 10 min** | If versioning enabled |

---

# 5. FULL INFRASTRUCTURE RESTART (Multi-service Outage)

## Decision Tree

```
Are 3+ services down simultaneously?
├─ YES (database, redis, api): Execute full restart
├─ Partial outage (1-2 services): Use specific runbooks
└─ NO: Continue normal operations
```

**Trigger Conditions** (ALL of these):
- Database unresponsive (timeout > 30s)
- Redis unresponsive (PING timeout)
- API returning 5xx (all endpoints)
- Web/Mobile unable to connect

**OR**: Region-wide outage, major network failure, or cascading failures

**Expected Duration**: < 15 minutes (dependencies restart in order)  
**Severity**: CRITICAL (complete platform outage)

---

## Pre-requisites

- [ ] AWS CLI v2 installed and configured
- [ ] PostgreSQL client installed
- [ ] Redis CLI installed
- [ ] Vercel CLI installed (or dashboard access)
- [ ] kubectl installed (if using Kubernetes)
- [ ] SSH access to all servers
- [ ] Slack #incident-response channel open
- [ ] Full checklist of dependencies

**Setup (Run once per shift)**:
```bash
# Verify all tools installed
aws --version
psql --version
redis-cli --version
vercel --version

# Test AWS access
aws sts get-caller-identity

# Test Vercel access
vercel ls --limit 1
```

---

## Step-by-Step Runbook

### Phase 1: ASSESSMENT (2-3 min)

**1.1 Confirm Multi-Service Outage**
```bash
# Test all critical services sequentially
echo "Testing Database..."
psql -h imbobi-prod.c9akciq32.us-east-1.rds.amazonaws.com \
     -U imbobi_admin \
     -d imbobi_prod \
     -c "SELECT 1;" &
PID_DB=$!

echo "Testing Redis..."
redis-cli -h redis.imbobi.internal -p 6379 PING &
PID_REDIS=$!

echo "Testing API..."
timeout 5 curl -s https://api.imbobi.com.br/health &
PID_API=$!

# Wait for all (max 10 seconds each)
wait $PID_DB 2>/dev/null || echo "Database: FAILED"
wait $PID_REDIS 2>/dev/null || echo "Redis: FAILED"
wait $PID_API 2>/dev/null || echo "API: FAILED"

# If all 3+ failed: Proceed with full restart
```

**1.2 Document Outage Start Time**
```bash
OUTAGE_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "Outage started: $OUTAGE_START"

# Notify team immediately
# In Slack #incident-response:
# ⚠️ CRITICAL: Multi-service outage detected at 2026-05-29 15:30 UTC
# Executing full infrastructure restart per DISASTER_RECOVERY_RUNBOOKS.md
```

**1.3 Check AWS Health Status**
```bash
# Verify no regional outage (CloudWatch/AWS Status Page)
curl -s https://status.aws.amazon.com/feed.json | jq '.incidents | length'
# If > 0, AWS may be having issues (contact AWS support)

# Check application monitoring dashboards
# CloudWatch → Dashboards → imbobi-prod-dashboard
# Look for correlated failures across all services
```

---

### Phase 2: STAGED RESTART (11-13 min)

**CRITICAL ORDER**: Database → Redis → API → Web → Mobile

Restarting in wrong order causes cascading failures.

#### Step 2a: Restart Database (2-3 min)

```bash
# Use Database Failover runbook
# Or if single-instance (no failover):

aws rds reboot-db-instance \
  --db-instance-identifier imbobi-prod \
  --region us-east-1

# Wait for status to be "available"
watch -n 5 'aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod \
  --region us-east-1 \
  --query "DBInstances[0].DBInstanceStatus" \
  --output text'

# MUST see "available" before proceeding to Redis
echo "✓ Database restarted: $(date -u +%H:%M:%SZ)"
```

**Validation**:
```bash
psql -h imbobi-prod.c9akciq32.us-east-1.rds.amazonaws.com \
     -U imbobi_admin \
     -d imbobi_prod \
     -c "SELECT 1;" 
# Expected: Response within 5 seconds
```

**If fails**: Return to Database Failover Runbook, do not proceed

---

#### Step 2b: Restart Redis (1-2 min)

```bash
# Use Redis Recovery runbook
# Or manual restart:

aws elasticache reboot-cache-cluster \
  --cache-cluster-id imbobi-redis-prod \
  --region us-east-1

# Wait for status "available"
watch -n 5 'aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis-prod \
  --region us-east-1 \
  --query "CacheClusters[0].CacheClusterStatus" \
  --output text'

echo "✓ Redis restarted: $(date -u +%H:%M:%SZ)"
```

**Validation**:
```bash
redis-cli -h redis.imbobi.internal -p 6379 PING
# Expected: PONG
```

**If fails**: Return to Redis Recovery Runbook, do not proceed

---

#### Step 2c: Restart API (1-2 min)

```bash
# If using Vercel (recommended):
# Re-deploy latest version to force function restart

vercel redeploy
# OR select latest deployment and promote to production

# If using Kubernetes:
kubectl rollout restart deployment/imbobi-api -n production

# If using traditional servers:
# SSH to each API server:
ssh api-server-1.imbobi.internal
  systemctl restart imbobi-api
  systemctl restart imbobi-worker
exit

# Wait for API to be ready
sleep 10
curl -s https://api.imbobi.com.br/health | jq '.status'

echo "✓ API restarted: $(date -u +%H:%M:%SZ)"
```

**Validation**:
```bash
# Check API health with all dependencies
curl -s https://api.imbobi.com.br/health | jq '.'
# Expected:
# {
#   "status": "ok",
#   "database": {"configured": true},
#   "redis": {"status": "connected"}
# }
```

**If fails**: Check Application Logs
```bash
vercel logs --limit 50 2>&1 | tail -20
# Look for database or Redis connection errors
# If found, go back to relevant runbook (DB or Redis)
```

---

#### Step 2d: Restart Web App (30 seconds)

```bash
# Web app uses Vercel (Next.js)
# Already redeployed as part of API restart

# Verify web app is serving
curl -s https://imbobi.com.br | grep -q "<html>" && echo "✓ Web app online"

# Clear browser cache (users may need to refresh)
# In Vercel: Settings → Deployments → {latest} → Advanced → Purge CDN
vercel env pull
# This revalidates ISR (incremental static regeneration)

echo "✓ Web app restarted: $(date -u +%H:%M:%SZ)"
```

**Validation**:
```bash
# Visit https://imbobi.com.br in browser
# Should load without errors
# Check Console for no JavaScript errors
```

---

#### Step 2e: Restart Mobile App (Manual User Action)

```bash
# Mobile app connects to API
# No server-side restart needed, but users may need to:
# 1. Close app completely (kill process)
# 2. Reopen app
# 3. Re-login if session expired

# Send push notification to users:
# "imobi is back online! Please restart the app if you encounter issues."

# Firebase Cloud Messaging notification
# Via API or Firebase console:
# Title: "imobi is online"
# Body: "Service restored. Restart the app if needed."
# Deep link: none (home page)

echo "✓ Mobile users notified: $(date -u +%H:%M:%SZ)"
```

---

### Phase 3: FULL HEALTH CHECK (1-2 min)

**3.1 Database Health**
```bash
psql -h imbobi-prod.c9akciq32.us-east-1.rds.amazonaws.com \
     -U imbobi_admin \
     -d imbobi_prod \
     << 'EOF'
SELECT 
  schemaname,
  COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
GROUP BY schemaname;

-- Check replication lag (if replica exists)
SELECT 
  slot_name,
  slot_type,
  active
FROM pg_replication_slots;
EOF
```

**Expected**:
- All tables accessible
- Replication slots active
- No errors

**3.2 Redis Health**
```bash
redis-cli -h redis.imbobi.internal -p 6379 << 'EOF'
PING
INFO server
INFO memory
INFO stats
EOF
```

**Expected**:
- PONG response
- Memory < 80%
- Commands processed > 0

**3.3 API Health (Comprehensive)**
```bash
# Health endpoint
curl -s https://api.imbobi.com.br/health | jq '.'

# Check all dependencies
curl -s https://api.imbobi.com.br/health | jq '.
  | to_entries
  | map(select(.value.status == "error" or .value.configured == false))
  | length'

# Should be 0 (no errors)
```

**3.4 Web App Health**
```bash
# Check Next.js health
curl -s -I https://imbobi.com.br | grep -E "HTTP|Content-Type"
# Expected: HTTP/1.1 200 OK

# Check API routes
curl -s https://api.imbobi.com.br/api/health | jq '.'
```

**3.5 Sentry Error Monitoring**
```bash
# Wait 1 minute for stabilization
sleep 60

# Check Sentry dashboard: Recent errors (last 5 min)
# Should show no errors or only pre-outage errors

# Query via API if available:
# GET /api/0/organizations/{org}/projects/{project}/stats/
# Look for error count = 0 or dropping
```

**3.6 User Monitoring**
```bash
# Check real user monitoring (RUM) metrics
# CloudWatch → Dashboards → imbobi-rum
# Expect:
# - Page load time < 2s
# - Error rate < 1%
# - No new JavaScript errors

# Or check with actual user test:
# 1. Visit https://imbobi.com.br
# 2. Login with test account
# 3. Navigate to key page (obras, parcelas)
# 4. Verify data loads
```

---

### Phase 4: INCIDENT COMMUNICATION (1-2 min)

**4.1 Notify All Channels**
```bash
# Slack #incident-response
echo "
✓ INFRASTRUCTURE RESTORED
Outage Duration: $(date -u +%H:%M:%SZ) to now
- Database: ✓ Online
- Redis: ✓ Online  
- API: ✓ Online (health check passing)
- Web: ✓ Online
- Mobile: ✓ Connecting

Post-incident review scheduled for [date/time]
"

# Customer Status Page (if available)
# Update incident: "Resolved at [time]"

# Send email to support team
# "imobi platform fully restored. No data loss. Users may need to refresh browsers."
```

**4.2 Document Outage Timeline**
```bash
cat > /tmp/outage-report.txt << EOF
OUTAGE REPORT
=============
Start Time: $OUTAGE_START
End Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Duration: [calculated in minutes]

Services Affected:
- Database (RDS)
- Cache (Redis)
- API (NestJS)
- Web (Next.js)
- Mobile (Expo)

Root Cause: [To be determined in post-mortem]

Recovery Actions Taken:
1. Restarted RDS instance
2. Restarted ElastiCache cluster
3. Redeployed API via Vercel
4. Revalidated web app
5. Notified mobile users

Impact:
- Data Loss: None
- Transactions Lost: [check transaction logs]
- User Sessions Lost: [estimate based on duration]

Post-Mortem: [schedule for 2-4 hours later]
EOF

cat /tmp/outage-report.txt
# Save to shared incident tracking (Jira, Notion, etc.)
```

---

## Post-Outage Checklist

- [ ] All 5 services responding normally
- [ ] Database connections healthy
- [ ] Redis memory < 80%
- [ ] API error rate < 1%
- [ ] Web app loads without JS errors
- [ ] Mobile users notified
- [ ] Sentry shows no new critical errors
- [ ] CloudWatch metrics normal
- [ ] No data loss (verify row counts)
- [ ] Outage timeline documented
- [ ] Post-mortem meeting scheduled
- [ ] Incident #incident-response closed

---

## Troubleshooting

| Failure Point | Diagnosis | Resolution |
|---------------|-----------|-----------|
| **Database won't restart** | Corrupted state, hardware failure | Use Database Failover runbook, escalate to AWS |
| **Redis won't restart** | Memory corruption, disk full | Use Redis Recovery runbook (recreate cluster if needed) |
| **API won't connect to DB** | Network, security group, credentials | Check RDS security group allows API subnet, verify CONNECTION_STRING |
| **API won't connect to Redis** | Similar to above | Check ElastiCache security group, verify REDIS_HOST/PORT |
| **Some services up but not all** | Partial recovery success | Don't consider recovery complete, continue troubleshooting |

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Assessment | 2-3 min | Confirm all services down |
| Database restart | 2-3 min | Usually takes longest |
| Redis restart | 1-2 min | Should be quick |
| API restart | 1-2 min | Vercel redeploy |
| Web restart | 30 sec | Usually instant |
| Health checks | 1-2 min | Comprehensive validation |
| Communication | 1-2 min | Update all channels |
| **Total** | **< 15 min** | Per SLA target |

---

# 6. CERTIFICATE/TLS RENEWAL (SSL Expiry)

## Decision Tree

```
Is SSL certificate expiring or expired?
├─ Expired: CRITICAL, users see security warning
├─ Expiring in < 7 days: Urgent, schedule renewal
├─ Expiring in > 30 days: Normal, plan renewal
└─ Valid: Continue normal operations
```

**Trigger Conditions** (ANY of these):
- Browser shows `NET::ERR_CERT_AUTHORITY_INVALID`
- SSL Labs shows "A" → "F" rating drop
- Sentry alert: Certificate expiry warning
- Let's Encrypt expiry reminder email
- Manual check: `openssl s_client -connect imbobi.com.br:443` shows expiry date < 30 days

**Expected Duration**: < 1 hour (Vercel auto-renews, but validation needed)  
**Severity**: CRITICAL (all users blocked until fixed)

---

## Pre-requisites

- [ ] Access to domain registrar (if domain delegation needed)
- [ ] Access to Vercel project settings
- [ ] OpenSSL installed: `openssl version`
- [ ] Access to Let's Encrypt account (if manual renewal)
- [ ] Email access to certificate notifications
- [ ] Slack #incident-response channel open

**Setup (Run once per shift)**:
```bash
# Check current certificate
openssl s_client -connect imbobi.com.br:443 -showcerts | grep -A 5 "Issuer\|Not After"

# Expected output:
# Issuer: C = US, O = Let's Encrypt, CN = R3
# Not After : Jun 27 10:30:00 2026 GMT
```

---

## Step-by-Step Runbook

### Phase 1: DETECTION (1-2 min)

**1.1 Check Certificate Status**
```bash
# Get certificate expiry date
openssl s_client -connect imbobi.com.br:443 -showcerts 2>/dev/null | \
  grep -oP '(?<=Not After : ).*' | \
  head -1

# Expected output (example):
# Jun 27 10:30:00 2026 GMT

# Convert to days until expiry
EXPIRY_DATE=$(openssl s_client -connect imbobi.com.br:443 -showcerts 2>/dev/null | \
  grep "Not After" | head -1 | awk '{print $4, $5, $6}')

EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

echo "Certificate expires in $DAYS_LEFT days"

# Decision tree:
if [ $DAYS_LEFT -lt 0 ]; then
  echo "⚠️ CRITICAL: Certificate EXPIRED"
  # Proceed to Phase 2 (Emergency Renewal)
elif [ $DAYS_LEFT -lt 7 ]; then
  echo "⚠️ URGENT: Certificate expires in < 7 days"
  # Proceed to Phase 2 (Immediate Renewal)
elif [ $DAYS_LEFT -lt 30 ]; then
  echo "⚠️ WARNING: Certificate expires in < 30 days"
  # Schedule renewal (Phase 2), not emergency
else
  echo "✓ Certificate valid for $DAYS_LEFT days"
  # No action needed
fi
```

**1.2 Check Certificate Issuer**
```bash
openssl s_client -connect imbobi.com.br:443 -showcerts 2>/dev/null | \
  grep "Issuer:"

# Expected:
# Issuer: C = US, O = Let's Encrypt, CN = R3  (automatic renewal)
# OR
# Issuer: C = US, O = DigiCert, CN = DigiCert Global... (manual renewal)
```

**1.3 Check Certificate Chain**
```bash
openssl s_client -connect imbobi.com.br:443 -showcerts 2>/dev/null | \
  grep -A 20 "Certificate chain"

# Expected: 3 certificates (leaf, intermediate, root)
# If only 1 or 2: chain may be incomplete
```

**1.4 Check for Browser Warnings**
```bash
# Visit https://imbobi.com.br in browser
# Look for:
# ✓ Green lock (good)
# ⚠️ Yellow warning (expiring soon)
# ✗ Red error (expired or invalid)

# If red error:
curl -v https://imbobi.com.br 2>&1 | grep -i "certificate\|error"
```

---

### Phase 2: AUTOMATIC RENEWAL (Vercel, < 1 hour)

**2.1 Verify Automatic Renewal is Configured**
```bash
# Visit Vercel dashboard: Project → Settings → Domains
# For imbobi.com.br:
# - Type should be "External"
# - SSL/TLS should show "Automatic" (Let's Encrypt)
# - Status should be "Valid"

# Or check via CLI
vercel domains list
```

**Expected output**:
```
Domains in imbobi:
  imbobi.com.br                (External)                                 [Valid]
```

**2.2 If Not Auto-Renewing**
```bash
# Certificate may be manually managed
# Check where it's hosted:

# 1. Vercel managed (most likely)
# Visit: Vercel → Project → Settings → Domains → imbobi.com.br
# If "Automatic" is disabled, enable it:
#   - Click "Edit Domain"
#   - Enable "Automatic SSL/TLS Provisioning"
#   - Save

# 2. External Certificate (less likely)
# If using external cert (Cloudflare, nginx, etc):
# Proceed to Phase 3 (Manual Renewal)
```

**2.3 Trigger Manual Renewal (If Auto-Renewal Disabled)**
```bash
# For Vercel managed domains, force renewal via Vercel CLI
# (Vercel automatically renews 30 days before expiry, but we can force it)

# Option 1: Remove and re-add domain
vercel domains remove imbobi.com.br --yes
sleep 10
vercel domains add imbobi.com.br

# Option 2: Use Vercel API to trigger renewal
# (Requires API token and is not directly supported)

# Option 3: Contact Vercel support for immediate renewal
# Support → Domains → Request immediate certificate renewal

# Wait 5-10 minutes for Vercel to issue new certificate
sleep 300

# Verify new certificate
openssl s_client -connect imbobi.com.br:443 -showcerts 2>/dev/null | \
  grep "Not After"
```

**2.4 Monitor Renewal Progress**
```bash
# Check Vercel dashboard for certificate status
# Should show "Valid" with new expiry date

# Or use OpenSSL to monitor:
watch -n 30 'openssl s_client -connect imbobi.com.br:443 -showcerts 2>/dev/null | grep "Not After"'

# Wait until new expiry date appears (max 30 min)
# If it doesn't change after 30 min, proceed to Phase 3
```

**2.5 Validate New Certificate**
```bash
# Check certificate details
openssl s_client -connect imbobi.com.br:443 -showcerts 2>/dev/null | \
  grep -E "Issuer|Not After|Subject"

# Expected:
# Subject: CN = imbobi.com.br
# Issuer: C = US, O = Let's Encrypt, CN = R3
# Not After : Jul 27 10:30:00 2026 GMT (or ~90 days from now)

# Check certificate chain is complete (3 certificates)
openssl s_client -connect imbobi.com.br:443 -showcerts 2>/dev/null | \
  grep -c "BEGIN CERTIFICATE"
# Expected: 3
```

**2.6 Verify HTTPS Connectivity**
```bash
# Test HTTPS endpoint
curl -I https://imbobi.com.br
# Expected: HTTP/1.1 200 OK (or 3xx redirect)

# Test API endpoint
curl -I https://api.imbobi.com.br/health
# Expected: HTTP/1.1 200 OK
```

---

### Phase 3: MANUAL RENEWAL (If Auto-Renewal Failed)

**3.1 Check Let's Encrypt Account**
```bash
# If using Let's Encrypt (Vercel does this automatically)
# But if manually managed, check renewal status:

# 1. Visit: https://letsencrypt.org/ → Certificates
# 2. Search for imbobi.com.br
# 3. Look for renewal status

# Or via certbot (if installed on server)
sudo certbot renew --dry-run
```

**3.2 Request Renewal from Registrar**
```bash
# If domain registered with external registrar (GoDaddy, Namecheap, etc.)
# and certificate not auto-renewing via Vercel:

# 1. Login to registrar dashboard
# 2. Find SSL/TLS section
# 3. Renew certificate or reissue
# 4. Download new certificate files
# 5. Upload to application/CDN
```

**3.3 Manual Certificate Installation (Advanced)**
```bash
# If Vercel not managing certificate, install manually on server:

# Obtain certificate files from registrar:
# - server.crt (public certificate)
# - ca.crt (intermediate certificate)
# - server.key (private key - KEEP SECRET)

# Combine intermediate certificate with server cert
cat server.crt ca.crt > combined.crt

# Install on web server (e.g., nginx)
sudo cp combined.crt /etc/nginx/ssl/imbobi.crt
sudo cp server.key /etc/nginx/ssl/imbobi.key
sudo chmod 600 /etc/nginx/ssl/imbobi.key

# Reload nginx
sudo systemctl reload nginx

# Verify
openssl s_client -connect imbobi.com.br:443 -showcerts | grep "Not After"
```

**3.4 Contact Vercel Support (If Stuck)**
```bash
# If renewal still fails after 30 min:
# 1. Visit vercel.com → Help → Support
# 2. Create ticket: "SSL certificate renewal failed for imbobi.com.br"
# 3. Include:
#    - Current certificate expiry date
#    - Renewal attempts made
#    - Domain verification status
# 4. Provide estimated urgency
#    - "Critical: Certificate expired" (P1)
#    - "Urgent: Expires in < 7 days" (P2)
#    - "Scheduled: Expires in > 7 days" (P3)
```

---

### Phase 4: VALIDATION & MONITORING (1-2 min)

**4.1 Browser Certificate Validation**
```bash
# Open browser and visit:
# https://imbobi.com.br
# https://api.imbobi.com.br/health

# Expected:
# - Green lock icon
# - No security warnings
# - No "insecure" or "expired" messages

# If warning appears: Check browser console for details
# F12 → Console → look for mixed content or SSL errors
```

**4.2 SSL Labs Test**
```bash
# Get immediate rating from SSL Labs
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=imbobi.com.br

# Expected: Rating "A" or better
# Rating shows:
# - Certificate validity
# - Chain completeness
# - Expiry date
# - Key strength (2048-bit RSA or 256-bit EC)

# If "F": Immediate action required, proceed to Phase 3
```

**4.3 Application Health Check**
```bash
# Verify application still running after certificate change
curl -s https://api.imbobi.com.br/health | jq '.status'
# Expected: "ok"

# Check web app
curl -s https://imbobi.com.br | grep -q "<html>" && echo "✓ Web app online"
```

**4.4 Mobile App Connectivity**
```bash
# Mobile app may cache certificate pins
# If certificate changed, test mobile connectivity:

# Option 1: Test API endpoint from mobile app
# Open app → Navigate to any page that requires API call
# Should work without SSL errors

# Option 2: Monitor Sentry for SSL errors
# Sentry → Events → Filter: "SSL", "certificate", "TLS"
# Should see 0 new SSL-related errors

# Option 3: Manual test via mobile
# Connect to API with curl from mobile device
# (requires adb or terminal on device)
```

**4.5 Monitor Certificate Expiry**
```bash
# Set calendar reminder for ~30 days before next expiry
# E.g., if renewed to Jul 27, 2026, set reminder for Jun 27, 2026

# Also, set up automated monitoring:
# Sentry → Alerts → Create Alert for "Certificate Expiry"
# OR
# CloudWatch → Create Alarm for certificate expiry metric

# Email alerts should be sent to ops@imbobi.internal
```

---

## Post-Renewal Checklist

- [ ] Certificate not expired (check expiry date)
- [ ] Certificate chain complete (3 certificates)
- [ ] Browser shows green lock (no warnings)
- [ ] SSL Labs rating: A or better
- [ ] API health endpoint responds via HTTPS
- [ ] Web app loads via HTTPS without mixed content
- [ ] Mobile app connects without SSL errors
- [ ] Sentry shows no TLS/SSL errors
- [ ] Next renewal reminder set (~30 days before expiry)
- [ ] Notify team in Slack #incident-response
- [ ] Document renewal process (update runbook if needed)

---

## Troubleshooting

| Issue | Diagnosis | Resolution |
|-------|-----------|-----------|
| **Browser shows "insecure" warning** | Chain incomplete or self-signed | Ensure intermediate cert is served, check chain completeness |
| **SSL Labs shows "F" rating** | Certificate revoked or key compromised | Contact Vercel/registrar, may need immediate revocation |
| **Mobile app shows SSL error** | App pinning certificate or old cert cached | App may need reinstall, contact mobile dev team |
| **Multiple subdomains failing** | Wildcard cert not renewed | Renew wildcard certificate (*.imbobi.com.br) |
| **Certificate renewal stuck** | ACME/validation failure | Check domain DNS records, contact Let's Encrypt support |

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Detection | 1-2 min | Check certificate expiry |
| Auto-renewal | < 1 hour | Vercel handles automatically |
| Validation | 1-2 min | Browser, SSL Labs, API test |
| **Total** | **< 1 hour** | Automatic in most cases |

---

---

## APPENDICES

### Appendix A: Critical Contact Information

```
EMERGENCY CONTACTS
==================
Tech Lead: Slack @tech-lead or on-call
DevOps: aws-devops@imbobi.internal or Slack #devops
AWS Support: https://console.aws.amazon.com/support
Vercel Support: https://vercel.com/help or support@vercel.com

ESCALATION LEVELS
=================
Level 1 (< 5 min downtime): Execute runbook solo, notify team after
Level 2 (5-15 min downtime): Notify tech lead before/during
Level 3 (> 15 min downtime): War room + client notification required
```

### Appendix B: Monitoring & Alerting

**Critical Metrics to Monitor**:
- Database connection pool usage (alert if > 80%)
- Redis memory usage (alert if > 85%)
- API error rate (alert if > 5%)
- API latency P95 (alert if > 200ms)
- Certificate expiry (alert if < 30 days)

**Tools**:
- Sentry: Error tracking and performance monitoring
- CloudWatch: AWS infrastructure metrics
- StatusPage: User-facing status updates
- PagerDuty: On-call alerting and escalation

### Appendix C: Quick Reference Commands

```bash
# Database Health
psql -h imbobi-prod.c9akciq32.us-east-1.rds.amazonaws.com -U imbobi_admin -d imbobi_prod -c "SELECT 1;"

# Redis Health
redis-cli -h redis.imbobi.internal PING

# API Health
curl https://api.imbobi.com.br/health

# Check Certificate
openssl s_client -connect imbobi.com.br:443 -showcerts | grep "Not After"

# View Logs (Vercel)
vercel logs

# Check Deployments (Vercel)
vercel ls

# RDS Status (AWS)
aws rds describe-db-instances --db-instance-identifier imbobi-prod --region us-east-1 --query 'DBInstances[0].DBInstanceStatus'

# ElastiCache Status (AWS)
aws elasticache describe-cache-clusters --cache-cluster-id imbobi-redis-prod --region us-east-1 --query 'CacheClusters[0].CacheClusterStatus'
```

### Appendix D: Post-Incident Review Template

```markdown
INCIDENT REPORT
===============
Incident ID: [JIRA ticket or incident number]
Start Time: [UTC timestamp]
End Time: [UTC timestamp]
Duration: [minutes]

AFFECTED SERVICES
=================
- [ ] Database
- [ ] Redis
- [ ] API
- [ ] Web
- [ ] Mobile

ROOT CAUSE
==========
[Brief description of what went wrong]

IMPACT
======
- Users affected: [estimate]
- Data loss: [yes/no, details if yes]
- Transactions lost: [count]
- Revenue impact: [if applicable]

TIMELINE
========
15:30 - Alerts triggered
15:32 - Investigation started
15:35 - Cause identified
15:37 - Mitigation started
15:42 - Service restored
15:45 - All systems validated

LESSONS LEARNED
===============
1. [What went well]
2. [What could be improved]
3. [Action items for prevention]

ACTION ITEMS
============
- [ ] [Owner] - Implement [preventive measure] by [date]
- [ ] [Owner] - Add monitoring for [metric] by [date]
- [ ] [Owner] - Update runbook with [findings] by [date]
```

---

**Document Revision History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-29 | Engineering Team | Initial version |

**Approval & Distribution**

- [ ] Tech Lead Approved
- [ ] DevOps Approved
- [ ] Operations Notified
- [ ] Distributed to on-call team

---

**KEEP THIS DOCUMENT ACCESSIBLE IN EMERGENCY**

1. **Bookmark URL** (if digital): Save in browser favorites
2. **Print version**: Keep printed copy in incident binder
3. **Team knowledge**: Share with all on-call engineers
4. **Regular reviews**: Update quarterly or after incidents

---

**END OF DISASTER RECOVERY RUNBOOKS**
