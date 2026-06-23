# Runbook: Database Failover Recovery

**Trigger Conditions:**
- Primary PostgreSQL database unreachable (connection timeout)
- Database in READONLY mode (`FATAL: cannot execute INSERT in read-only transaction`)
- Replication lag > 30 seconds for > 2 minutes
- Primary disk full or corrupted

**Time to Recovery:** ~5 minutes  
**Difficulty:** Medium (requires DB/Render knowledge)

---

## Pre-Flight Checks

Before executing this runbook, verify:

```bash
# 1. Confirm primary is unreachable
psql -h $PRIMARY_DB_HOST -U imbobi -d imbobi_prod -c "SELECT 1"
# Should timeout or error

# 2. Confirm replica exists and is accessible
psql -h $REPLICA_DB_HOST -U imbobi -d imbobi_prod -c "SELECT 1"
# Should return: (1 row)

# 3. Get replica recovery status
psql -h $REPLICA_DB_HOST -U imbobi -d imbobi_prod -c "SELECT pg_is_in_recovery();"
# Should return: t (replica, read-only)
```

---

## Step 1: Determine Current State

```bash
# SSH into Render database instance (if accessible)
# OR use Render dashboard > Databases > imobi-postgres > Logs

# Check if primary is truly down or just slow
# If ping times are very high but connections work:
#   → Problem: Network latency, not failure
#   → Solution: Scale database or optimize queries
#
# If connections fail immediately:
#   → Problem: Primary crashed or lost network
#   → Solution: Proceed with failover

# Estimate data loss from replication lag
psql -h $REPLICA_DB_HOST -U imbobi -d imbobi_prod \
  -c "SELECT extract(epoch from now() - pg_last_xact_replay_timestamp()) AS lag_seconds;"
```

---

## Step 2: Promote Replica to Primary

**⚠️ WARNING:** This operation is irreversible. Once promoted, the replica becomes primary and the old primary (if it comes back online) will be out of sync.

```bash
# Connect to replica
psql -h $REPLICA_DB_HOST -U imbobi -d imbobi_prod

# Execute promotion
SELECT pg_promote();
# Expected output:
#  pg_promote
# ───────────
#
# (1 row)

# Wait for promotion to complete (typically 10-30 seconds)
# Monitor with:
SELECT pg_is_in_recovery();
# Expected: f (no longer in recovery)

# Verify promotion succeeded
SELECT version();
# Should show PostgreSQL (not in standby)
```

---

## Step 3: Update Application Connection String

**In Render Dashboard:**

1. Navigate to: Dashboard > imobi-api > Environment
2. Find variable: `DATABASE_URL`
3. Current value: `postgresql://imbobi:password@primary-host:5432/imbobi_prod`
4. Change to: `postgresql://imbobi:password@REPLICA_HOST:5432/imbobi_prod`
5. Save and redeploy

**If using .env file:**

```bash
# services/api/.env
DATABASE_URL="postgresql://imbobi:password@[REPLICA_HOST]:5432/imbobi_prod"
```

---

## Step 4: Restart API Service

**In Render Dashboard:**

1. Navigate to: Dashboard > imobi-api
2. Click: Manual Deploy
3. Select: Latest commit
4. Wait for deployment to complete (~2 minutes)
5. Monitor: Logs tab for connection status

**Or via CLI:**

```bash
render deploy --service=imobi-api --commit=HEAD
```

---

## Step 5: Verify Connection & Health

```bash
# Check API health
curl https://api.imobi.com/api/v1/health -v

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-05-29T14:35:00Z",
#   "database": "connected",
#   "redis": "connected",
#   "workers": "running"
# }

# Check Sentry for connection errors
# Dashboard: sentry.io/organizations/imobi/
# Filter: is:error database [last 5 minutes]
# Expected: 0 errors

# Monitor database connections
psql -h $NEW_PRIMARY_HOST -U imbobi -d imbobi_prod \
  -c "SELECT sum(numbackends) FROM pg_stat_database WHERE datname = 'imbobi_prod';"
# Should be ~20-30 connections (normal)
```

---

## Step 6: Verify Data Integrity

```bash
# Check transaction count (should continue incrementing)
psql -h $NEW_PRIMARY_HOST -U imbobi -d imbobi_prod \
  -c "SELECT count(*) FROM parceiros;" 

# Test write operation
psql -h $NEW_PRIMARY_HOST -U imbobi -d imbobi_prod \
  -c "UPDATE parceiros SET updated_at = now() WHERE id = 1;"
# Should return: UPDATE 1

# Verify transactions in application
# Test account: Complete a transaction in UI/API
# Expected: Success, no readonly errors
```

---

## Step 7: Recovery of Old Primary (Optional)

Once old primary comes back online:

```bash
# Option A: Keep as warm standby
# Modify recovery.conf on old primary to stream from new primary
# This gives you a replica again for future failovers

# Option B: Decommission old primary
# If hardware is damaged, remove from infrastructure

# Either way, DO NOT connect app to old primary
# It's out of sync and will cause data loss
```

---

## Post-Failover: Restore Replication (Optional)

To restore high availability:

```bash
# Bring up new replica (from old primary or backup)
# 1. Provision new database instance
# 2. Restore backup of data
# 3. Configure streaming replication
# 4. Verify replication status

# This requires coordination with Render support
# Timeline: ~30-60 minutes
```

---

## Rollback (If Primary Comes Back Online & Is OK)

Only proceed if:
1. Original primary is back online
2. No data corruption detected
3. Replication was working before failover

```bash
# Verify old primary is healthy
psql -h $ORIGINAL_PRIMARY_HOST -U imbobi -d imbobi_prod \
  -c "SELECT version(); SELECT datname, numbackends FROM pg_stat_database WHERE datname = 'imbobi_prod';"

# Manually sync any missing data if needed
# WARNING: Complex operation, consult DBA

# Once confident:
# Update CONNECTION_STRING to point back to original primary
# Restart API
# Monitor Sentry for issues
```

---

## Rollback Verification

```bash
# Confirm read/write working on original primary
psql -h $ORIGINAL_PRIMARY_HOST -U imbobi -d imbobi_prod \
  -c "INSERT INTO logs (event, created_at) VALUES ('test rollback', now());"

# Confirm replica is again replicating
psql -h $NEW_REPLICA_HOST -U imbobi -d imbobi_prod \
  -c "SELECT pg_is_in_recovery();" # Should return: t

# Check replication lag (should be < 1 second)
psql -h $ORIGINAL_PRIMARY_HOST -U imbobi -d imbobi_prod \
  -c "SELECT now() - pg_last_xact_replay_timestamp();"
```

---

## Common Issues & Troubleshooting

### Issue: Promotion stuck (pg_promote() hangs)

```bash
# Check for active connections blocking promotion
psql -h $REPLICA_HOST -U imbobi -d imbobi_prod \
  -c "SELECT pid, usename, query FROM pg_stat_activity WHERE state != 'idle';"

# Kill blocking queries
psql -h $REPLICA_HOST -U imbobi -d imbobi_prod \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active';"

# Try promotion again
SELECT pg_promote();
```

### Issue: API still showing "database: error" after failover

```bash
# 1. Verify connection string was updated
# Render dashboard > Environment > DATABASE_URL
# Should point to replica host

# 2. Verify replica is accepting connections
psql -h $REPLICA_HOST -U imbobi -d imbobi_prod -c "SELECT 1;"

# 3. Check API logs for connection errors
docker logs imbobi_api | grep -i database | tail -20

# 4. Restart API deployment
render deploy --service=imobi-api
```

### Issue: Data inconsistency after failover

```bash
# Check transaction count vs expected
psql -h $NEW_PRIMARY_HOST -U imbobi -d imbobi_prod \
  -c "SELECT count(*) FROM transactions WHERE created_at > now() - interval '5 minutes';"

# Compare with backup logs to identify missing transactions
# If data loss is unacceptable:
#   → Rollback to original primary (if possible)
#   → Restore from backup
#   → Execute failover again from cleaner state
```

---

## Communication Template

Post in `#ops-critical`:

```
🔄 DATABASE FAILOVER COMPLETED

Primary instance: [ORIGINAL_HOST] — DOWN
New Primary: [REPLICA_HOST] — PROMOTED ✅

Status:
- API reconnected ✅
- Transaction processing resumed ✅
- Data integrity verified ✅
- Replication status: Pending (will restore)

Next steps:
- Restore replica (30-60 min)
- Investigate original primary failure (parallel)
- RCA post-incident

ETA restoration of HA: 2026-05-29 15:30 BRT
```

---

## Time Tracker

```
Start: 14:23 BRT
Detection: 14:23 BRT (0 min)
Promotion decision: 14:25 BRT (2 min)
Replica promotion: 14:26-14:28 BRT (3-5 min)
Connection string update: 14:28 BRT (5 min)
API redeploy: 14:28-14:31 BRT (5-8 min)
Health verification: 14:31 BRT (8 min)
Total: ~8 minutes
SLA: < 15 min ✅
```

---

## Appendix: Database Health Monitoring

Add these queries to monitoring dashboard:

```sql
-- Replication lag (critical)
SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) AS lag_seconds;

-- Connection count
SELECT count(*) FROM pg_stat_activity WHERE datname = 'imbobi_prod';

-- Disk space
SELECT pg_size_pretty(pg_database_size('imbobi_prod'));

-- Slow queries
SELECT mean_exec_time, calls, query FROM pg_stat_statements 
WHERE mean_exec_time > 100 ORDER BY mean_exec_time DESC LIMIT 5;

-- WAL archiving status
SELECT slot_name, restart_lsn, confirmed_flush_lsn FROM pg_replication_slots;
```
