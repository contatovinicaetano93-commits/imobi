# Disaster Recovery Plan - Imobi

## Overview

This document outlines the disaster recovery procedures for the Imobi platform, including backup strategies, restore workflows, and failover procedures.

**Last Updated:** 2026-05-29
**Maintenance Window:** Daily 2:00 AM UTC

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Production Environment                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │   Web App    │  │   API    │  │   Mobile App     │ │
│  │  (Vercel)    │  │(Railway) │  │    (Expo)        │ │
│  └──────────────┘  └──────────┘  └──────────────────┘ │
│         │                │                │            │
└─────────┼────────────────┼────────────────┼────────────┘
          │                │                │
          │                │                │
┌─────────▼────────────────▼────────────────▼────────────┐
│                 AWS Infrastructure                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  PostgreSQL  │  │  Redis   │  │  S3 Storage      │ │
│  │   (RDS)      │  │ (Cache)  │  │  (Evidence)      │ │
│  │  PostGIS     │  │ BullMQ   │  │                  │ │
│  └──────────────┘  └──────────┘  └──────────────────┘ │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          │                             │
│                   ┌──────▼──────┐                      │
│                   │ S3 Backups  │                      │
│                   │ (7+ days)   │                      │
│                   └─────────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 1. Backup Strategy

### 1.1 PostgreSQL Backup

**Frequency:** Daily at 2:00 AM UTC
**Retention:** 7+ days
**Location:** AWS S3 + Local storage
**Method:** Full compressed dump (pg_dump with gzip compression)

#### Configuration

```bash
# Setup
mkdir -p /var/backups/imobi/postgres
mkdir -p /var/log/imobi

# Automated schedule (cron)
0 2 * * * /home/ubuntu/imobi/infrastructure/scripts/backup-postgres.sh production
```

#### Environment Variables

```env
DATABASE_HOST=<rds-endpoint>
DATABASE_PORT=5432
DATABASE_USER=imbobi
DATABASE_PASSWORD=<secure-password>
DATABASE_NAME=imbobi_production

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>

SLACK_WEBHOOK_URL=<optional-slack-webhook>
```

#### Backup Output

- **Local:** `/var/backups/imobi/postgres/imobi_production_YYYYMMDD_HHMMSS.sql.gz`
- **S3:** `s3://imobi-backups-production/postgres/daily/YYYYMMDD/`
- **Manifest:** `/var/backups/imobi/postgres/YYYYMMDD_manifest.txt`

#### What's Excluded from Backup

- `sessions` table (temporary, recreated on login)
- `logs` table (can be archived separately)
- Cache tables (regenerated)

### 1.2 Redis Backup

**Frequency:** Daily at 2:30 AM UTC
**Retention:** 7+ days
**Location:** AWS S3 + Local storage
**Method:** RDB snapshot (point-in-time)

#### Configuration

```bash
# Automated schedule (cron)
30 2 * * * /home/ubuntu/imobi/infrastructure/scripts/backup-redis.sh production
```

#### Environment Variables

```env
REDIS_HOST=<redis-endpoint>
REDIS_PORT=6379
REDIS_PASSWORD=<optional-password>

AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>

SLACK_WEBHOOK_URL=<optional-slack-webhook>
```

#### Redis Persistence Configuration

Add to Redis configuration (`redis.conf`):

```conf
# RDB Snapshots (default)
save 900 1        # Save if 1 key changed in 900 seconds
save 300 10       # Save if 10 keys changed in 300 seconds
save 60 10000     # Save if 10000 keys changed in 60 seconds

# AOF (Append-Only File) - optional for durability
appendonly yes
appendfsync everysec
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

#### Backup Output

- **Local:** `/var/backups/imobi/redis/imobi_redis_production_YYYYMMDD_HHMMSS.rdb`
- **S3:** `s3://imobi-backups-production/redis/daily/YYYYMMDD/`
- **AOF:** `/data/appendonly.aof` (if enabled)

### 1.3 S3 Evidence Storage

**Backup Strategy:** AWS S3 Cross-Region Replication or versioning
**Retention:** Per compliance (typically 7+ years for construction evidence)

#### S3 Configuration

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket imobi-evidencias-production \
  --versioning-configuration Status=Enabled

# Enable cross-region replication
aws s3api put-bucket-replication \
  --bucket imobi-evidencias-production \
  --replication-configuration role=arn:aws:iam::ACCOUNT_ID:role/s3-replication,Rules=[...]
```

## 2. Restore Procedures

### 2.1 PostgreSQL Restore

#### From Local Backup

```bash
# List available backups
ls -lh /var/backups/imobi/postgres/

# Restore from specific backup
./infrastructure/scripts/restore-postgres.sh \
  --local /var/backups/imobi/postgres/imobi_production_20240101_020000.sql.gz

# Restore with database drop (clean slate)
./infrastructure/scripts/restore-postgres.sh \
  --local backup.sql.gz \
  --drop-db

# Dry run to verify backup contents
./infrastructure/scripts/restore-postgres.sh \
  --dry-run backup.sql.gz
```

#### From S3 Backup

```bash
# Restore latest backup
./infrastructure/scripts/restore-postgres.sh \
  --latest production

# Restore specific S3 backup
./infrastructure/scripts/restore-postgres.sh \
  --s3 s3://imobi-backups-production/postgres/daily/20240101/imobi_production_20240101_020000.sql.gz
```

#### Restore Time Estimates

- **Full Database:** 5-15 minutes (depending on size)
- **Verification:** 2-5 minutes
- **Total RTO:** ~20 minutes

#### Post-Restore Validation

```bash
# 1. Check table count
psql -U imbobi -d imbobi_production -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 2. Verify key tables
psql -U imbobi -d imbobi_production -c "\dt"

# 3. Check row counts
psql -U imbobi -d imbobi_production -c \
  "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC;"

# 4. Run health check
curl http://localhost:4000/api/v1/health | jq '.database'

# 5. Test API endpoint
curl -H "Authorization: Bearer $TEST_TOKEN" \
  http://localhost:4000/api/v1/users/me | jq '.id'
```

### 2.2 Redis Restore

#### From Local RDB

```bash
# List available backups
ls -lh /var/backups/imobi/redis/

# Restore from specific backup
./infrastructure/scripts/restore-redis.sh \
  --local /var/backups/imobi/redis/imobi_redis_production_20240101_020000.rdb

# Restore without flushing existing data (merge mode)
./infrastructure/scripts/restore-redis.sh \
  --local backup.rdb \
  --no-flush

# Verify backup without restoring
./infrastructure/scripts/restore-redis.sh \
  --verify-only backup.rdb
```

#### From S3 Backup

```bash
# Restore latest backup
./infrastructure/scripts/restore-redis.sh \
  --latest production

# Restore specific S3 backup
./infrastructure/scripts/restore-redis.sh \
  --s3 s3://imobi-backups-production/redis/daily/20240101/imobi_redis_production_20240101_020000.rdb
```

#### Restore Time Estimates

- **RDB Load:** 1-5 minutes
- **Redis Restart:** 30-60 seconds
- **Total RTO:** ~5 minutes

#### Post-Restore Validation

```bash
# 1. Check key count
redis-cli dbsize

# 2. Check memory usage
redis-cli info memory

# 3. Check specific keys
redis-cli keys "bullmq:*" | wc -l
redis-cli keys "cache:*" | wc -l

# 4. Verify queue status
redis-cli llen "bull:liberacao-parcela:delayed"
redis-cli llen "bull:liberacao-parcela:active"

# 5. Run health check
curl http://localhost:4000/api/v1/health | jq '.redis'
```

## 3. Disaster Recovery Scenarios

### Scenario 1: Database Corruption

**Symptoms:** Query errors, corrupted indexes, constraint violations

**Recovery Steps:**

1. **Verify Issue**
   ```bash
   curl http://localhost:4000/api/v1/health
   # Check "database.status" = "error" or "degraded"
   ```

2. **Create Pre-Recovery Backup** (if possible)
   ```bash
   ./infrastructure/scripts/backup-postgres.sh production
   ```

3. **Attempt Repair** (if minor corruption)
   ```bash
   psql -U imbobi -d imbobi_production -c "REINDEX DATABASE imbobi_production;"
   psql -U imbobi -d imbobi_production -c "ANALYZE;"
   ```

4. **If Repair Fails - Restore from Backup**
   ```bash
   # Determine latest known-good backup
   ls -lrt /var/backups/imobi/postgres/
   
   # Stop API to release DB connections
   systemctl stop imobi-api
   
   # Restore
   ./infrastructure/scripts/restore-postgres.sh --latest production
   
   # Restart API
   systemctl start imobi-api
   
   # Verify
   curl http://localhost:4000/api/v1/health
   ```

**Recovery Time:** 20-30 minutes (including verification)

### Scenario 2: Data Loss / Accidental Deletion

**Symptoms:** Missing data, user reports lost records

**Recovery Steps:**

1. **Determine Loss Scope**
   ```bash
   # Check logs for DELETE statements
   tail -1000 /var/log/imobi/api.log | grep -i delete
   
   # Estimate timestamp of deletion
   ```

2. **Identify Backup Window**
   - Find backup BEFORE deletion occurred
   - Verify using manifest timestamp

3. **Restore to Point-in-Time** (if PITR available)
   ```bash
   # PostgreSQL PITR with WAL archives
   # See section 4.2 below
   ```

4. **Full Restore if PITR Unavailable**
   ```bash
   ./infrastructure/scripts/restore-postgres.sh --latest production
   ```

5. **Apply Changes After Restore**
   - Document what was lost
   - Manually re-enter or reprocess transactions
   - Notify affected users

**Recovery Time:** 30-60 minutes (including data reconciliation)

### Scenario 3: Complete Service Outage

**Symptoms:** All services down, unable to reach application

**Recovery Checklist:**

- [ ] Check infrastructure status (AWS console)
- [ ] Verify DNS resolution
- [ ] Check API logs for crash reasons
- [ ] Verify database connectivity
- [ ] Verify Redis connectivity
- [ ] Check S3 bucket access
- [ ] Restart services in correct order:
  1. PostgreSQL
  2. Redis
  3. API
  4. Web/Mobile frontends

```bash
# Restart sequence
systemctl restart postgresql
systemctl restart redis-server
systemctl restart imobi-api

# Verify each step
sleep 5 && curl http://localhost:4000/api/v1/health | jq
```

**Recovery Time:** 5-15 minutes (depends on failure root cause)

### Scenario 4: Redis Queue Failure

**Symptoms:** Jobs not processing (parcela liberation delays)

**Recovery Steps:**

1. **Check Queue Status**
   ```bash
   redis-cli LLEN "bull:liberacao-parcela:delayed"
   redis-cli LLEN "bull:liberacao-parcela:active"
   redis-cli LLEN "bull:liberacao-parcela:wait"
   ```

2. **Clear Stuck Jobs**
   ```bash
   # Only if jobs are confirmed stuck
   redis-cli DEL "bull:liberacao-parcela:active"
   ```

3. **Restore from Backup**
   ```bash
   ./infrastructure/scripts/restore-redis.sh --latest production
   ```

4. **Requeue Lost Jobs** (from database)
   ```bash
   # Database has original records in `liberacao-parcela` table
   # API will recreate jobs on next poll or manual trigger
   ```

**Recovery Time:** 5-10 minutes

### Scenario 5: S3 Evidence Storage Loss

**Symptoms:** Evidence photos inaccessible or deleted

**Recovery Steps:**

1. **Check S3 Versioning** (if enabled)
   ```bash
   aws s3api list-object-versions \
     --bucket imobi-evidencias-production \
     --prefix "evidence/"
   ```

2. **Restore from Version History**
   ```bash
   aws s3api get-object \
     --bucket imobi-evidencias-production \
     --key "evidence/user_123/photo.jpg" \
     --version-id "VERSION_ID" \
     photo-restored.jpg
   ```

3. **If No Versioning - Check Replication Target**
   ```bash
   # If cross-region replication configured
   aws s3 ls s3://imobi-evidencias-production-backup/
   ```

4. **Notify Users** if photos cannot be recovered

**Recovery Time:** Variable (depends on storage configuration)

## 4. Advanced Recovery Procedures

### 4.1 Point-in-Time Recovery (PITR)

Enable PostgreSQL WAL archiving to S3:

```conf
# postgres.conf
wal_level = replica
max_wal_senders = 10
wal_keep_segments = 64

# Setup WAL archiving
archive_mode = on
archive_command = 'aws s3 cp %p s3://imobi-backups-production/postgres/wal/%f'
archive_timeout = 300
```

Restore to specific time:

```bash
# 1. Get latest full backup
BACKUP_DIR=$(ls -d /var/backups/imobi/postgres/*/  | tail -1)

# 2. Restore base backup
./infrastructure/scripts/restore-postgres.sh --local $BACKUP_DIR/*.sql.gz

# 3. Create recovery target
cat > /var/lib/postgresql/recovery.conf <<EOF
restore_command = 'aws s3 cp s3://imobi-backups-production/postgres/wal/%f %p'
recovery_target_timeline = 'latest'
recovery_target_time = '2024-01-01 12:00:00'  # Target time
recovery_target_inclusive = true
EOF

# 4. Restart PostgreSQL
systemctl restart postgresql

# 5. Verify recovery complete
psql -U imbobi -d imbobi_production -c "SELECT now();"
```

### 4.2 Database Replication Failover

For High Availability setup with standby:

```bash
# On standby server, promote to primary
sudo -u postgres pg_ctl promote -D /var/lib/postgresql/data

# Update API connection strings
# POINT ALL API INSTANCES TO NEW PRIMARY

# Verify promotion
psql -U imbobi -c "SELECT pg_is_in_recovery();"  # Should return false
```

## 5. Backup Testing & Validation

### 5.1 Monthly Full Restore Test

**Schedule:** First Friday of each month, 10:00 AM UTC

```bash
#!/bin/bash
# test-backup-restore.sh

# Test PostgreSQL restore
echo "Testing PostgreSQL restore..."
./infrastructure/scripts/restore-postgres.sh --latest production --test

# Test Redis restore
echo "Testing Redis restore..."
./infrastructure/scripts/restore-redis.sh --latest production --verify-only

# Run integration tests
echo "Running integration tests..."
cd /home/ubuntu/imobi
pnpm test:e2e

echo "Backup restore test completed"
```

### 5.2 Backup Integrity Checks

Automated daily verification:

```bash
#!/bin/bash
# Daily backup verification

# Verify PostgreSQL backup
gunzip -t /var/backups/imobi/postgres/latest.sql.gz || \
  echo "PostgreSQL backup is corrupted!"

# Verify Redis backup
MAGIC=$(head -c 5 /var/backups/imobi/redis/latest.rdb | od -A n -t x1)
if [ "$MAGIC" != " 52 45 44 49 53" ]; then
  echo "Redis backup has invalid magic number!"
fi

# Check S3 backups
aws s3 ls s3://imobi-backups-production/postgres/daily/ | tail -5
aws s3 ls s3://imobi-backups-production/redis/daily/ | tail -5
```

## 6. Rollback Procedures

### 6.1 API Deployment Rollback

```bash
# View deployment history
railway deployments --service api

# Rollback to previous version
railway rollback --service api

# Verify rollback
curl http://localhost:4000/api/v1/health

# Check API logs for errors
railway logs --service api --tail
```

### 6.2 Database Schema Rollback

For accidental schema changes:

```bash
# 1. Identify last good backup before schema change
ls -lt /var/backups/imobi/postgres/ | head -5

# 2. Extract schema-only from backup
gunzip -c backup.sql.gz | grep -E "^CREATE|^ALTER" > schema-change.sql

# 3. Review and apply inverse commands
# Manually create rollback script

# 4. Apply rollback
PGPASSWORD="..." psql ... < rollback.sql

# 5. Test application
curl http://localhost:4000/api/v1/health
```

## 7. Monitoring & Alerting

### 7.1 Backup Success Monitoring

Slack notifications configured:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

Messages include:
- ✅ Backup completed successfully
- ⚠️ Backup warning (upload failed, but local exists)
- ❌ Backup failed (investigation required)

### 7.2 Alert Thresholds

Configure alerts for:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| No backup in 48 hours | 48h | Page on-call |
| Backup size exceeds 5GB | +50% growth | Investigate |
| S3 upload failure | 2 failures | Alert ops |
| Database replication lag | > 10 minutes | Check network |

### 7.3 Health Check Endpoint

```bash
# Check backup status
curl http://localhost:4000/api/v1/health/backups

# Expected response
{
  "lastPostgresBackup": "2024-01-01T02:30:00Z",
  "lastRedisBackup": "2024-01-01T02:35:00Z",
  "backupStatus": "healthy",
  "backupLocation": "s3://imobi-backups-production/"
}
```

## 8. On-Call Runbook

### Quick Reference

| Issue | Diagnosis | Fix | Time |
|-------|-----------|-----|------|
| DB Down | `curl health` → database: error | `restore-postgres --latest` | 20m |
| Redis Down | `redis-cli ping` → fail | `restore-redis --latest` | 5m |
| Data Corruption | Query errors | `REINDEX DATABASE` | 10m |
| Evidence Missing | S3 access error | Check versioning/replicas | 5m |
| Job Queue Stuck | No movement in queue | `FLUSHDB`, restart, requeue | 5m |

### Escalation Procedure

1. **Alert Received**
   - Slack notification received
   - On-call engineer acknowledges

2. **Initial Investigation** (5 minutes)
   - Check health endpoint
   - Check logs
   - Identify root cause

3. **Mitigation** (15 minutes)
   - Execute recovery procedure
   - Verify service restoration
   - Run integration tests

4. **Post-Incident**
   - Document issue and fix
   - Update runbook
   - Schedule blameless postmortem

## 9. Compliance & Retention

### Backup Retention Policy

| Type | Retention | Location | Encryption |
|------|-----------|----------|-----------|
| PostgreSQL | 7+ days | S3 + Local | AES-256 |
| Redis | 7+ days | S3 + Local | AES-256 |
| WAL Files | 30 days | S3 | AES-256 |
| Evidence (S3) | 7+ years | S3 Versioning | AES-256 |

### Audit Logging

Track all restore operations:

```bash
# Log all restore operations
/var/log/imobi/restore-postgres.log
/var/log/imobi/restore-redis.log

# Include:
# - Timestamp
# - Operator
# - Source backup
# - Restore target
# - Verification results
# - Post-restore validation
```

## 10. Disaster Recovery Contacts

**On-Call Rotation:** [Link to calendar]
**Team Lead:** [Email]
**Infrastructure Lead:** [Email]
**Database Admin:** [Email]
**Slack Channel:** #imobi-incidents

## 11. Related Documentation

- [MONITORING.md](./services/api/MONITORING.md) — Health checks
- [PRODUCTION_VALIDATION.md](./services/api/PRODUCTION_VALIDATION.md) — Service setup
- [Backup Scripts](./infrastructure/scripts/) — Automation

---

**Next Review Date:** 2026-08-29
**Last Review:** 2026-05-29
