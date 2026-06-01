# Disaster Recovery Plan — imobi MVP Production-Ready

**Last Updated:** 2026-05-31  
**Document Version:** 3.0  
**Status:** Production-Ready  
**Go-Live:** 2026-06-02 (02:00-04:00 UTC)  
**SLA Target:** RTO ≤ 1 hour (API), ≤ 30 minutes (Database) | RPO ≤ 15 minutes

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [RTO & RPO Definitions](#rto--rpo-definitions)
3. [Failure Scenarios & Recovery](#failure-scenarios--recovery)
4. [Step-by-Step Recovery Procedures](#step-by-step-recovery-procedures)
5. [Communication Plan](#communication-plan)
6. [Post-Recovery Validation](#post-recovery-validation)
7. [SLA Metrics & Monitoring](#sla-metrics--monitoring)
8. [Runbooks Index](#runbooks-index)

---

## Executive Summary

### RTO & RPO Targets

| Component | RTO | RPO | Recovery Strategy |
|-----------|-----|-----|------------------|
| **PostgreSQL** | ≤ 30 min | ≤ 24 hours | Restore from daily S3 backup |
| **Redis** | ≤ 30 min | ≤ 24 hours | Restore RDB snapshot from S3 |
| **API (NestJS/Fastify)** | ≤ 1 hour | N/A | Deploy from Git / Docker rollback |
| **Web (Next.js)** | ≤ 15 min | N/A | CDN cache + Vercel rollback |
| **S3 (Evidence Files)** | ≤ 4 hours | ≤ 1 hour | Cross-region replication |

### Critical Success Factors

- **Backup Integrity:** All backups tested weekly (100% success rate target)
- **Communication:** Incident declared within 5 minutes, stakeholders notified within 10 minutes
- **Automation:** Restore scripts fully automated (zero manual intervention needed)
- **Testing:** Monthly DR drills (first Sunday of each month)

---

## RTO & RPO Definitions

### Recovery Time Objective (RTO)

**Definition:** Maximum acceptable time from disaster detection to full service recovery.

| Component | Target RTO | Justification |
|-----------|-----------|---|
| PostgreSQL | 30 minutes | Restore from S3 backup (5-10 min) + verification (10 min) + app reconnect (5-10 min) |
| Redis | 20 minutes | RDB restore (3-5 min) + BullMQ job retry (5 min) + app reconnect (10 min) |
| API Services | 1 hour | Docker restart + health checks (10 min) + smoke tests (5 min) + stakeholder notification |
| Web Frontend | 15 minutes | Vercel rollback (5 min) + DNS propagation (10 min) |

### Recovery Point Objective (RPO)

**Definition:** Maximum acceptable data loss measured in time since last backup.

| Component | Target RPO | Actual RPO | Risk |
|-----------|-----------|-----------|------|
| PostgreSQL | 24 hours | 24 hours (daily backups @ 02:00 UTC) | Accept 1 day of work loss |
| Redis (Queues) | 1 hour | 24 hours (daily backups @ 03:00 UTC) | Accept critical job re-processing |
| S3 Evidence | 1 hour | Real-time replication (same-region + cross-region) | Accept <1 min loss |

### RPO Acceptable Risk Assessment

**Question:** Is losing 24 hours of data acceptable?

**Answer:** YES for MVP phase:
- Redis = non-critical cache + critical queue (jobs can be reprocessed)
- PostgreSQL = user data (1 day acceptable per business requirements)
- **Phase 9+:** Implement hourly backups or WAL archival for stricter RPO

---

## Failure Scenarios & Recovery

### Scenario 1: PostgreSQL Database Corruption

**Trigger Indicators:**
- Data integrity check fails (PostGIS indices corrupted)
- Foreign key violation on INSERT/UPDATE
- Disk I/O errors in PostgreSQL logs
- Application receives database errors (unique constraint violations from corrupted state)

**Impact Assessment:**
- Severity: **CRITICAL**
- Affected Systems: All API operations (obras, parcelas, atividades, usuarios)
- Data Loss: Up to 24 hours (since last backup)
- Business Impact: No new obra registrations possible

**Recovery Priority:**
1. Isolate corrupted database (take offline)
2. Restore from latest clean backup
3. Verify data integrity post-restore
4. Resume operations

**Detailed Recovery Steps:** See [PostgreSQL Corruption Recovery](#postgresql-corruption-recovery)

---

### Scenario 2: Redis Data Loss / Queue Corruption

**Trigger Indicators:**
- BullMQ jobs show infinite loops or missing data
- `redis-cli KEYS "bull:*"` returns empty set
- Redis RDB file corrupted (detected by `redis-check-rdb`)
- Memory usage suddenly drops to zero

**Impact Assessment:**
- Severity: **HIGH**
- Affected Systems: Parcel release queue (`liberacao-parcela`), notifications
- Data Loss: Up to 24 hours of queued jobs
- Business Impact: Queued payment releases delayed until re-processing

**Recovery Priority:**
1. Restore Redis RDB from S3 backup
2. Verify queue integrity
3. Resume job processing

**Detailed Recovery Steps:** See [Redis Data Loss Recovery](#redis-data-loss-recovery)

---

### Scenario 3: S3 Bucket Deletion / Malicious Data Removal

**Trigger Indicators:**
- Evidence file downloads return 404 errors
- S3 bucket policy changed by unauthorized user
- Object Lock violations reported
- Versioning disabled accidentally

**Impact Assessment:**
- Severity: **CRITICAL**
- Affected Systems: Evidence file retrieval, obra photo galleries
- Data Loss: User-uploaded evidence files (non-recoverable if backup fails)
- Business Impact: Can't display historical evidence for obras

**Recovery Priority:**
1. Check S3 cross-region replication (backup bucket in different region)
2. Restore from cross-region replica
3. Re-enable bucket versioning and Object Lock
4. Audit S3 access logs

**Detailed Recovery Steps:** See [S3 Bucket Recovery](#s3-bucket-recovery)

---

### Scenario 4: Complete Infrastructure Failure

**Trigger Indicators:**
- All services down simultaneously
- Network unreachable
- Database server hardware failure
- Catastrophic datacenter issue

**Impact Assessment:**
- Severity: **CRITICAL**
- Affected Systems: ALL (API, Database, Redis, Web frontend)
- Data Loss: Up to 24 hours
- Business Impact: Complete service outage

**Recovery Priority:**
1. Declare incident (5 min)
2. Notify stakeholders (5 min)
3. Provision new infrastructure (30-45 min on Railway/Vercel)
4. Restore all data from S3 backups (20-30 min)
5. Run smoke tests (10 min)
6. Resume operations (60-90 min total)

**Detailed Recovery Steps:** See [Full Infrastructure Recovery](#full-infrastructure-recovery)

---

### Scenario 5: Application Bug / Data Corruption (Non-Infrastructure)

**Trigger Indicators:**
- NULL values unexpectedly in critical fields
- Foreign key cascade deletes unexpected records
- Migration bug corrupted column data
- Invalid geographical coordinates

**Impact Assessment:**
- Severity: **MEDIUM to CRITICAL**
- Affected Systems: Application logic
- Data Loss: Varies (potentially catastrophic)
- Business Impact: Depends on scope of corruption

**Recovery Priority:**
1. Identify root cause (bug analysis)
2. Stop application deployment (disable auto-deploy)
3. Create backup before attempting recovery
4. Develop fix and test on staging
5. Roll back to last good backup
6. Deploy fixed version

**Detailed Recovery Steps:** See [Application Bug Recovery](#application-bug-recovery)

---

## Step-by-Step Recovery Procedures

### PostgreSQL Corruption Recovery

**Estimated Time: 30-45 minutes**

```bash
#!/bin/bash
# /scripts/recover-postgres-corruption.sh

set -e
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
LOG_FILE="/var/log/imbobi-recovery-${TIMESTAMP}.log"

exec > >(tee "$LOG_FILE")
exec 2>&1

echo "=== PostgreSQL Corruption Recovery Initiated ==="
echo "Timestamp: $TIMESTAMP"

# Step 1: Verify corruption (5 min)
echo ""
echo "STEP 1: Verify database corruption..."
psql -h localhost -U imbobi -d imbobi_prod -c "VACUUM ANALYZE;" || {
  echo "✗ Database is corrupted or inaccessible"
  CORRUPT=true
}

if [ "$CORRUPT" = true ]; then
  echo "✓ Corruption detected - proceeding with recovery"
else
  echo "✓ Database appears healthy - canceling recovery"
  exit 0
fi

# Step 2: Create backup of corrupted database for forensics (5 min)
echo ""
echo "STEP 2: Backing up corrupted database for forensics..."
pg_dump -h localhost -U imbobi -d imbobi_prod -F custom \
  > /tmp/imbobi-corrupted-${TIMESTAMP}.sql 2>&1 || \
  echo "⚠ Could not backup corrupted database (may be partially inaccessible)"

# Step 3: Identify latest clean backup from S3 (2 min)
echo ""
echo "STEP 3: Finding latest clean backup..."
LATEST_BACKUP=$(aws s3 ls \
  s3://imbobi-database-backups/postgres/ \
  --recursive --sort=time --reverse | head -1 | awk '{print $NF}')

echo "Latest backup: $LATEST_BACKUP"

if [ -z "$LATEST_BACKUP" ]; then
  echo "✗ FATAL: No backups found in S3"
  exit 1
fi

# Step 4: Download backup from S3 (5 min)
echo ""
echo "STEP 4: Downloading backup from S3..."
aws s3 cp "s3://imbobi-database-backups/$LATEST_BACKUP" \
  ./recovery-backup.sql.gz \
  --region us-east-1

# Step 5: Rename corrupted database (2 min)
echo ""
echo "STEP 5: Renaming corrupted database..."
psql -U postgres -h localhost << SQL
ALTER DATABASE imbobi_prod RENAME TO imbobi_prod_corrupted_${TIMESTAMP};
SQL

# Step 6: Create fresh database (1 min)
echo ""
echo "STEP 6: Creating fresh database..."
createdb -U imbobi -h localhost imbobi_prod

# Step 7: Restore from backup (15 min)
echo ""
echo "STEP 7: Restoring from backup (this may take several minutes)..."
gunzip -c recovery-backup.sql.gz | pg_restore \
  -h localhost \
  -U imbobi \
  -d imbobi_prod \
  --verbose 2>&1 | tail -20

# Step 8: Verify restoration (5 min)
echo ""
echo "STEP 8: Verifying restoration..."

# Check row counts
echo "Row count verification:"
psql -h localhost -U imbobi -d imbobi_prod -t << SQL
SELECT 'obras' AS table_name, COUNT(*) FROM obras
UNION ALL
SELECT 'parcelas', COUNT(*) FROM parcelas
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'atividades', COUNT(*) FROM atividades;
SQL

# Check PostGIS
echo ""
echo "PostGIS validation:"
psql -h localhost -U imbobi -d imbobi_prod -c \
  "SELECT extname, version FROM pg_extension WHERE extname = 'postgis';"

# Check GIS indices
echo ""
echo "GIS indices validation:"
psql -h localhost -U imbobi -d imbobi_prod -c \
  "SELECT COUNT(*) FROM pg_indexes WHERE tablename IN ('obras', 'parcelas') AND indexname LIKE '%gist%';"

# Step 9: Verify application connectivity (2 min)
echo ""
echo "STEP 9: Verifying application can connect..."
psql -h localhost -U imbobi -d imbobi_prod -c "SELECT VERSION();"

# Step 10: Cleanup (1 min)
echo ""
echo "STEP 10: Cleaning up..."
rm -f recovery-backup.sql.gz

echo ""
echo "=== PostgreSQL Recovery Complete ==="
echo "Status: ✓ SUCCESS"
echo "Corrupted database backed up to: imbobi_prod_corrupted_${TIMESTAMP}"
echo "Recovery log: $LOG_FILE"
echo ""
echo "NEXT STEPS:"
echo "1. Monitor application error logs for 10 minutes"
echo "2. Run smoke tests: ./scripts/smoke-tests.sh"
echo "3. If recovery successful, cleanup corrupted database:"
echo "   dropdb imbobi_prod_corrupted_${TIMESTAMP}"
echo "4. File incident report"
```

**Execution:**
```bash
sudo bash /scripts/recover-postgres-corruption.sh
```

**Validation:**
```bash
# After recovery, verify application works
curl https://api.imobi.app/health
# Should return: {"status":"healthy"}

# Check obra count hasn't decreased
curl https://api.imobi.app/api/obras?limit=1 | jq '.total'
```

---

### Redis Data Loss Recovery

**Estimated Time: 15-25 minutes**

```bash
#!/bin/bash
# /scripts/recover-redis-loss.sh

set -e
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
LOG_FILE="/var/log/imbobi-redis-recovery-${TIMESTAMP}.log"

exec > >(tee "$LOG_FILE")
exec 2>&1

echo "=== Redis Data Loss Recovery ==="
echo "Timestamp: $TIMESTAMP"

# Step 1: Verify Redis is accessible (1 min)
echo ""
echo "STEP 1: Checking Redis status..."
if ! redis-cli PING > /dev/null 2>&1; then
  echo "✗ Redis is not responding"
  echo "Attempting to restart Redis..."
  sudo systemctl restart redis-server
  sleep 5
fi

# Step 2: Check current data size (1 min)
echo ""
echo "STEP 2: Current Redis state:"
CURRENT_KEYS=$(redis-cli DBSIZE | awk '{print $2}')
echo "Keys currently in Redis: $CURRENT_KEYS"

if [ "$CURRENT_KEYS" -gt 1000 ]; then
  echo "✓ Redis has data - data loss may not be necessary"
  echo "Run 'redis-cli FLUSHALL' manually if you want to clear and restore"
  exit 0
fi

# Step 3: Find latest Redis backup in S3 (2 min)
echo ""
echo "STEP 3: Finding latest Redis backup..."
LATEST_BACKUP=$(aws s3 ls \
  s3://imbobi-database-backups/redis/ \
  --recursive --sort=time --reverse | head -1 | awk '{print $NF}')

echo "Latest backup: $LATEST_BACKUP"

if [ -z "$LATEST_BACKUP" ]; then
  echo "✗ No Redis backups found in S3"
  exit 1
fi

# Step 4: Download backup (3 min)
echo ""
echo "STEP 4: Downloading backup from S3..."
aws s3 cp "s3://imbobi-database-backups/$LATEST_BACKUP" \
  ./redis-recovery.rdb.gz \
  --region us-east-1

# Step 5: Decompress (1 min)
echo ""
echo "STEP 5: Decompressing backup..."
gunzip -c redis-recovery.rdb.gz > /tmp/dump-recovery.rdb

# Step 6: Verify RDB integrity (2 min)
echo ""
echo "STEP 6: Verifying backup integrity..."
if ! redis-check-rdb /tmp/dump-recovery.rdb > /dev/null 2>&1; then
  echo "✗ Backup RDB file is corrupted - cannot restore"
  rm -f /tmp/dump-recovery.rdb
  exit 1
fi

echo "✓ Backup integrity verified"

# Step 7: Stop Redis gracefully (2 min)
echo ""
echo "STEP 7: Stopping Redis..."
redis-cli SHUTDOWN NOSAVE || true
sleep 3

# Step 8: Restore RDB file (1 min)
echo ""
echo "STEP 8: Restoring RDB file..."
cp /tmp/dump-recovery.rdb /var/lib/redis/dump.rdb
chown redis:redis /var/lib/redis/dump.rdb
chmod 600 /var/lib/redis/dump.rdb

# Step 9: Start Redis (2 min)
echo ""
echo "STEP 9: Starting Redis..."
sudo systemctl start redis-server
sleep 5

# Step 10: Verify restoration (2 min)
echo ""
echo "STEP 10: Verifying restoration..."

if ! redis-cli PING > /dev/null; then
  echo "✗ Redis failed to start"
  exit 1
fi

RESTORED_KEYS=$(redis-cli DBSIZE | awk '{print $2}')
echo "Keys restored: $RESTORED_KEYS"

# Check queue data
echo ""
echo "Queue status:"
redis-cli LLEN "bull:liberacao-parcela:wait" || echo "No liberacao-parcela queue"
redis-cli LLEN "bull:notificacoes:wait" || echo "No notificacoes queue"

# Step 11: Cleanup (1 min)
echo ""
echo "STEP 11: Cleaning up..."
rm -f redis-recovery.rdb.gz /tmp/dump-recovery.rdb

echo ""
echo "=== Redis Recovery Complete ==="
echo "Status: ✓ SUCCESS"
echo "Recovery log: $LOG_FILE"
echo ""
echo "NEXT STEPS:"
echo "1. Monitor application logs for Redis connection errors"
echo "2. Verify BullMQ queues are processing: redis-cli LLEN 'bull:liberacao-parcela:wait'"
echo "3. Check for any failed job notifications in app logs"
```

**Execution:**
```bash
sudo bash /scripts/recover-redis-loss.sh
```

---

### S3 Bucket Recovery

**Estimated Time: 30-60 minutes**

**Prerequisites:**
- Cross-region replication enabled to backup bucket
- S3 Object Lock configured on production bucket
- Versioning enabled

```bash
#!/bin/bash
# /scripts/recover-s3-bucket.sh

echo "=== S3 Bucket Recovery ==="

# Step 1: Verify cross-region backup bucket
echo ""
echo "STEP 1: Checking backup S3 bucket..."
aws s3 ls s3://imbobi-database-backups-backup/ --region us-west-2

# Step 2: Identify what was deleted
echo ""
echo "STEP 2: Listing objects in backup bucket..."
aws s3 ls s3://imbobi-database-backups-backup/ --recursive | head -20

# Step 3: Restore from backup bucket
echo ""
echo "STEP 3: Syncing from backup bucket to production..."
aws s3 sync \
  s3://imbobi-database-backups-backup/evidencias/ \
  s3://imbobi-database-backups/evidencias/ \
  --region us-east-1 \
  --region-to us-west-2

# Step 4: Verify restoration
echo ""
echo "STEP 4: Verifying restoration..."
aws s3 ls s3://imbobi-database-backups/evidencias/ --recursive | wc -l

echo "=== S3 Recovery Complete ==="
```

---

### Full Infrastructure Recovery

**Estimated Time: 60-90 minutes**

```bash
#!/bin/bash
# /scripts/recover-full-infrastructure.sh
# Complete recovery from total infrastructure failure

echo "=== FULL INFRASTRUCTURE RECOVERY ==="
echo "This recovery takes approximately 60-90 minutes"
echo ""

# STEP 1: Provision New Infrastructure (30-45 min)
echo "STEP 1: Provisioning new infrastructure..."
echo "  - Railway: Deploy new PostgreSQL instance"
echo "  - Railway: Deploy new Redis instance"
echo "  - Railway: Deploy new API service"
echo "  - Vercel: Trigger web rebuild"
echo ""
echo "Action: Complete on Railway/Vercel dashboards manually"
echo "  Follow: INFRASTRUCTURE_PROVISIONING.md"
read -p "Press ENTER when new infrastructure is running..."

# STEP 2: Get new service endpoints
echo ""
echo "STEP 2: Collecting new service endpoints..."
read -p "Enter new PostgreSQL host: " DB_HOST
read -p "Enter new Redis host: " REDIS_HOST
read -p "Enter new API base URL: " API_URL

# STEP 3: Restore PostgreSQL (20-30 min)
echo ""
echo "STEP 3: Restoring PostgreSQL database..."
export PGHOST="$DB_HOST"
export PGUSER="imbobi"

# Download latest backup
LATEST=$(aws s3 ls s3://imbobi-database-backups/postgres/ \
  --recursive --sort=time --reverse | head -1 | awk '{print $NF}')

aws s3 cp "s3://imbobi-database-backups/$LATEST" ./recovery.sql.gz \
  --region us-east-1

# Create database and restore
createdb imbobi_prod
gunzip -c recovery.sql.gz | pg_restore -d imbobi_prod --verbose

# Verify
psql -d imbobi_prod -c "SELECT COUNT(*) FROM obras;"
rm recovery.sql.gz

echo "✓ PostgreSQL restored"

# STEP 4: Restore Redis (5 min)
echo ""
echo "STEP 4: Restoring Redis..."

# Download latest Redis backup
LATEST_REDIS=$(aws s3 ls s3://imbobi-database-backups/redis/ \
  --recursive --sort=time --reverse | head -1 | awk '{print $NF}')

aws s3 cp "s3://imbobi-database-backups/$LATEST_REDIS" ./redis-backup.rdb.gz \
  --region us-east-1

gunzip -c redis-backup.rdb.gz > /tmp/dump.rdb

# Upload to new Redis instance (manual via SSH or cloud console)
echo "⚠ Manual step: Upload /tmp/dump.rdb to new Redis /var/lib/redis/dump.rdb"
echo "  Then restart Redis service"

read -p "Press ENTER when Redis restore is complete..."

# STEP 5: Update DNS & Load Balancer (5 min)
echo ""
echo "STEP 5: Updating DNS records..."
echo "Action: Update Route53 / DNS provider:"
echo "  - api.imobi.app → $API_URL"
echo "  - imobi.app → Vercel CDN endpoint"

read -p "Press ENTER when DNS is updated..."

# STEP 6: Run Smoke Tests (10 min)
echo ""
echo "STEP 6: Running smoke tests..."

# Test API health
if curl -s "$API_URL/health" | jq -e '.status == "healthy"' > /dev/null; then
  echo "✓ API health check passed"
else
  echo "✗ API health check failed"
fi

# Test database connectivity
if curl -s "$API_URL/api/obras?limit=1" | jq -e '.data | length > 0' > /dev/null; then
  echo "✓ Database connectivity passed"
else
  echo "✗ Database connectivity failed"
fi

# Test authentication
if curl -s "$API_URL/api/auth/profile" -H "Authorization: Bearer TEST" | \
   jq -e '.error' > /dev/null; then
  echo "✓ Authentication working"
fi

echo ""
echo "=== FULL INFRASTRUCTURE RECOVERY COMPLETE ==="
echo "Next steps:"
echo "1. Monitor error logs for 30 minutes"
echo "2. File incident report"
echo "3. Schedule post-incident review"
```

---

## Communication Plan

### Incident Declaration (Immediate - within 5 minutes)

**Who:** On-call engineer or first responder
**When:** Upon detecting critical failure
**How:** Post to #infrastructure Slack channel

```
@infrastructure-team INCIDENT DECLARED
Severity: CRITICAL
Service: [PostgreSQL|Redis|API|All]
Time: 2026-05-31T14:30:00Z
Status: INVESTIGATING
Updates: Every 15 minutes
```

### Stakeholder Notification (within 10 minutes)

**Recipients:**
- #leadership (Product leads)
- #operations (Support team)
- Direct email to: `contact@imobi.app`

**Template:**
```
Subject: [INCIDENT] Imobi Service Disruption - [Component]

Impact:
- Service unavailable for users
- [Specific feature unavailable]
- Estimated recovery time: [estimate]

Action:
- Recovery in progress
- Updates every 30 minutes to [Slack channel]
- Next communication: [timestamp]
```

### Updates During Recovery (every 15-30 minutes)

**Cadence:**
- First 30 min: Updates every 15 minutes
- After 30 min: Updates every 30 minutes
- Post-recovery: Incident retrospective within 24 hours

**Template:**
```
UPDATE [14:45 UTC]: Restoring PostgreSQL from backup
- Latest backup: [timestamp]
- Restore progress: [X%]
- New ETA: [time]
- No data loss expected
```

### All-Clear Communication (within 5 minutes of recovery)

**Template:**
```
✓ INCIDENT RESOLVED
Service: [Component]
Recovery time: [duration]
Data loss: [none|<details>]
Root cause: [brief summary]

Full incident report available at: [link]
Post-incident review scheduled for: [date/time]
```

---

## Post-Recovery Validation

### Immediate Validation (first 30 minutes post-recovery)

```bash
#!/bin/bash
# /scripts/validate-recovery.sh

echo "=== Post-Recovery Validation ==="

# 1. Database Health
echo ""
echo "DATABASE HEALTH:"
psql -h localhost -U imbobi -d imbobi_prod << SQL
-- Check row counts
SELECT tablename, n_live_tup FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY tablename;

-- Check for transaction log backup required
SELECT now() - pg_postmaster_start_time() AS uptime;

-- Validate constraints
SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type='FOREIGN KEY';
SQL

# 2. Redis Health
echo ""
echo "REDIS HEALTH:"
redis-cli INFO server | grep redis_version
redis-cli DBSIZE
redis-cli LLEN "bull:liberacao-parcela:wait"

# 3. API Health
echo ""
echo "API HEALTH:"
curl -s http://localhost:3000/health | jq '.'

# 4. Application Smoke Tests
echo ""
echo "APPLICATION SMOKE TESTS:"
npm run test:smoke

# 5. Check Error Logs
echo ""
echo "ERROR LOGS (last 50 lines):"
tail -50 /var/log/imobi-api.log | grep -i error || echo "No errors found"

echo ""
echo "=== Validation Complete ==="
```

---

## SLA Metrics & Monitoring

### SLA Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Backup Success Rate** | 99.5% | Successful backups / Total backups per month |
| **Restore Success Rate** | 100% | Successful restores in testing / Total restore tests |
| **Mean Time to Detect (MTTD)** | ≤ 5 min | Time from failure to alert notification |
| **Mean Time to Restore (MTTR)** | ≤ 30 min DB, ≤ 1h API | Actual recovery time |
| **Recovery Test Frequency** | 4x/year | Monthly DR drills |

### Monitoring Implementation

**CloudWatch Metrics:**
```bash
# Backup success metric
aws cloudwatch put-metric-data \
  --namespace imbobi/dr \
  --metric-name BackupSuccess \
  --value 1 \
  --unit Count

# Recovery metric
aws cloudwatch put-metric-data \
  --namespace imbobi/dr \
  --metric-name RecoveryTime \
  --value 1234 \
  --unit Seconds
```

**Sentry Error Tracking:**
```python
# Capture recovery events
sentry_sdk.capture_message(
    "Database recovery initiated",
    level="warning",
    tags={"recovery": "postgres"}
)
```

---

## Runbooks Index

| Scenario | Runbook | Est. Time |
|----------|---------|-----------|
| PostgreSQL Corruption | `/scripts/recover-postgres-corruption.sh` | 30-45 min |
| Redis Data Loss | `/scripts/recover-redis-loss.sh` | 15-25 min |
| S3 Bucket Loss | `/scripts/recover-s3-bucket.sh` | 30-60 min |
| Full Infrastructure Failure | `/scripts/recover-full-infrastructure.sh` | 60-90 min |
| Validation Post-Recovery | `/scripts/validate-recovery.sh` | 10 min |

### Quick Emergency Contact

| Role | Contact | Availability |
|------|---------|--------------|
| On-Call Engineer | `@on-call` (Slack) | 24/7 |
| Infrastructure Lead | TBD | Business hours |
| Database Admin | TBD | On-call rotation |
| Security Team | `#security` Slack | Business hours |

---

**Document Owner:** DevOps/Infrastructure Team  
**Last Review:** 2026-05-31  
**Next Review:** 2026-08-31 (quarterly)  
**Test Schedule:** Monthly DR drills (first Sunday of each month)  
**Emergency Contact:** @on-call | #infrastructure Slack
