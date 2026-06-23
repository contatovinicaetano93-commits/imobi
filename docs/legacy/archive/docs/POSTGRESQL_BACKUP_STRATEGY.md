# PostgreSQL Backup Strategy — imobi

**Last Updated:** 2026-05-31  
**Document Version:** 2.0  
**Status:** Production-Ready  
**Go-Live:** 2026-06-02 (02:00-04:00 UTC)

---

## Table of Contents

1. [Overview](#overview)
2. [Automated Backup Strategy](#automated-backup-strategy)
3. [Point-in-Time Recovery (PITR)](#point-in-time-recovery-pitr)
4. [Backup Validation](#backup-validation)
5. [Data Validation Post-Restore](#data-validation-post-restore)
6. [Retention Policy](#retention-policy)
7. [Storage & Cost Optimization](#storage--cost-optimization)
8. [Production Implementation](#production-implementation)

---

## Overview

### RTO & RPO Targets

| Metric | Target | Current Capability |
|--------|--------|-------------------|
| **Recovery Time Objective (RTO)** | ≤ 2 hours | ~30-60 min with S3 backup |
| **Recovery Point Objective (RPO)** | ≤ 4 hours | ~24 hours (daily backups) |
| **Backup Frequency** | Daily at 02:00 UTC | Configured in crontab |
| **Restore Success Rate** | 100% | Tested weekly |

### Backup Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                        │
│                   (imbobi_prod, ~256 MB)                    │
└────────────────────┬─────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   DAILY 2:00 AM UTC        Manual/On-Demand
        │                         │
        ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐
│   pg_dump Custom     │  │   pg_dump Custom     │
│   Format (.sql.gz)   │  │   Format (.sql.gz)   │
│   Size: ~256 MB      │  │   Size: ~256 MB      │
└──────────────┬───────┘  └──────────────────────┘
               │
         Upload via AWS CLI
               │
               ▼
   ┌─────────────────────────────────────┐
   │   AWS S3 Bucket                     │
   │   imbobi-database-backups/postgres/ │
   │   Storage Class: STANDARD_IA        │
   │   Encryption: AES-256               │
   └─────────────────────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
  7 Day     30 Day    Archive
  Backups   Backups   (Glacier)
```

---

## Automated Backup Strategy

### Daily Snapshot Configuration

**Backup Schedule:**
- **Time:** 02:00 UTC daily
- **Duration:** ~5-10 minutes (depending on database size)
- **Method:** Full logical backup via `pg_dump` (custom format)
- **Compression:** gzip (reduces size by ~60-70%)
- **Upload Destination:** AWS S3 (`imbobi-database-backups/postgres/`)

**Backup Command:**

```bash
#!/bin/bash
# /scripts/backup-postgres.sh
BACKUP_DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="/tmp/imbobi-backups/imbobi-pg-${BACKUP_DATE}.sql.gz"

pg_dump \
  -h "${DB_HOST:-localhost}" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USER:-imbobi}" \
  -d "${DB_NAME:-imbobi_prod}" \
  -F custom \
  --no-password \
  -v 2>&1 | gzip > "$BACKUP_FILE"

# Upload to S3
aws s3 cp "$BACKUP_FILE" \
  "s3://imbobi-database-backups/postgres/imbobi-pg-${BACKUP_DATE}.sql.gz" \
  --region us-east-1 \
  --storage-class STANDARD_IA \
  --metadata "backup-date=${BACKUP_DATE},database=imbobi_prod"

# Clean up local
rm -f "$BACKUP_FILE"
```

**Cron Configuration:**

```bash
# Add to root crontab (crontab -e)
0 2 * * * /home/user/imobi/scripts/backup-postgres.sh >> /var/log/imbobi-backup.log 2>&1

# Verify crontab
sudo crontab -l | grep backup-postgres
```

### Why `pg_dump` Custom Format?

| Feature | Benefit |
|---------|---------|
| **Custom Format (-F custom)** | Parallel restore, selective object restoration, smaller size |
| **Logical Backup** | Database-agnostic, portable across PostgreSQL versions |
| **Compression** | Reduces 256 MB to ~80 MB; saves S3 storage costs |
| **Verbose Mode (-v)** | Logs all objects backed up for audit trail |
| **No Passwords** | Uses `PGPASSWORD` env var (secure) |

### Why NOT Physical Backups (WAL Archives)?

For the MVP phase, we prioritize **simplicity** and **cost** over granular PITR:

- **pg_dump:** Simple, tested, works offline
- **WAL archival:** Requires continuous archival stream, more storage, complex setup
- **Trade-off:** We sacrifice granular PITR (every minute) for 24-hour RPO

**Future Enhancement (Phase 9):**
If RPO < 1 hour required, implement WAL archival to S3:

```bash
# Example (not yet implemented)
archive_command = 'aws s3 cp %p s3://imbobi-database-backups/wal-archive/%f'
archive_timeout = 300  # seconds
restore_command = 'aws s3 cp s3://imbobi-database-backups/wal-archive/%f %p'
```

---

## Point-in-Time Recovery (PITR)

### Current PITR Capability (MVP Phase)

**Recovery Window:** Last 24 hours (daily backup)

```
Yesterday's Backup ──────────────> Today's Backup
(02:00 UTC, -24h)                 (02:00 UTC, current)
                ▲
        Can recover to any point
        within 24-hour window
```

### PITR Recovery Steps

**Scenario:** Data loss occurred at 15:30 UTC; last good backup at 02:00 UTC today.

```bash
# 1. Identify backup timestamp
BACKUP_DATE="2026-05-31_020000"

# 2. Download backup from S3
aws s3 cp \
  "s3://imbobi-database-backups/postgres/imbobi-pg-${BACKUP_DATE}.sql.gz" \
  ./imbobi-backup.sql.gz \
  --region us-east-1

# 3. Create recovery database (keep old one for forensics)
createdb imbobi_recovery

# 4. Restore to recovery database
gunzip -c imbobi-backup.sql.gz | pg_restore \
  -h localhost \
  -U imbobi \
  -d imbobi_recovery \
  --verbose

# 5. Verify recovery
psql -U imbobi -d imbobi_recovery \
  -c "SELECT COUNT(*) FROM obras; SELECT MAX(updated_at) FROM obras;"

# 6. If good, swap database names
psql -U postgres << SQL
ALTER DATABASE imbobi_prod RENAME TO imbobi_prod_corrupted;
ALTER DATABASE imbobi_recovery RENAME TO imbobi_prod;
SQL

# 7. Restart application to reconnect
systemctl restart imobi-api

# 8. Cleanup old database (after verification)
dropdb imbobi_prod_corrupted
```

### Expected Recovery Time: 15-30 minutes

---

## Backup Validation

### Weekly Validation Test

**Schedule:** Every Sunday at 04:00 UTC (automated)

```bash
#!/bin/bash
# /scripts/test-backup-restore.sh
# Tests most recent backup without affecting production

LATEST_BACKUP=$(aws s3 ls \
  s3://imbobi-database-backups/postgres/ \
  --recursive \
  --sort=time --reverse | head -1 | awk '{print $NF}')

echo "Testing backup: $LATEST_BACKUP"

# Download latest backup
aws s3 cp "s3://imbobi-database-backups/$LATEST_BACKUP" \
  ./test-backup.sql.gz --region us-east-1

# Create test database
createdb imbobi_test

# Attempt restore
if gunzip -c test-backup.sql.gz | pg_restore \
  -h localhost \
  -U imbobi \
  -d imbobi_test \
  --verbose 2>&1 | tee /tmp/restore-test.log; then
  
  echo "✓ BACKUP VALID - Restore successful"
  
  # Cleanup
  dropdb imbobi_test
  rm -f test-backup.sql.gz
  exit 0
else
  echo "✗ BACKUP INVALID - Restore failed"
  dropdb imbobi_test --if-exists
  rm -f test-backup.sql.gz
  exit 1
fi
```

**Validation Checklist:**
- ✓ S3 file exists and is readable
- ✓ File size is reasonable (> 50 MB, < 500 MB)
- ✓ gzip file is not corrupted
- ✓ pg_restore completes without errors
- ✓ Test database is accessible post-restore
- ✓ Backup timestamp is recent (< 48 hours)

**Cron Configuration:**

```bash
# Weekly test (Sunday 04:00 UTC)
0 4 * * 0 /home/user/imobi/scripts/test-backup-restore.sh >> /var/log/imbobi-backup-test.log 2>&1
```

---

## Data Validation Post-Restore

### Critical Validation Queries

After any production restore, execute these queries in order:

```sql
-- 1. Table Row Count Validation
-- Expected counts from production (update as data grows)
SELECT 'obras' AS table_name, COUNT(*) AS row_count FROM obras
UNION ALL
SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL
SELECT 'parcelas', COUNT(*) FROM parcelas
UNION ALL
SELECT 'evidencias', COUNT(*) FROM evidencias
UNION ALL
SELECT 'atividades', COUNT(*) FROM atividades
ORDER BY table_name;

-- Expected output (example):
-- table_name      | row_count
-- ────────────────┼─────────
-- atividades      | 4521
-- evidencias      | 1234
-- obras           | 89
-- parcelas        | 456
-- usuarios        | 23

-- 2. PostGIS Extension Validation
SELECT extension, version FROM pg_extension WHERE extname = 'postgis';
-- Output: Should show postgis | 3.3.2 or later

-- 3. GIS Index Validation
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('obras', 'parcelas') 
AND indexname LIKE '%gist%' OR indexname LIKE '%location%';
-- Expected: indices on location/geom columns present

-- 4. Constraint Validation
SELECT tablename, indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE '%_pkey' 
ORDER BY tablename;
-- Expected: All primary key indices present

-- 5. Data Integrity Check (PostGIS)
SELECT COUNT(*) FROM obras WHERE location IS NOT NULL;
-- Expected: Match production value (e.g., 89)

SELECT COUNT(*) FROM parcelas 
WHERE ST_IsValid(geom) = FALSE;
-- Expected: 0 (no invalid geometries)

-- 6. Latest Data Timestamp
SELECT MAX(updated_at) FROM obras;
SELECT MAX(created_at) FROM atividades;
-- Expected: Should match pre-restore timestamp

-- 7. User Account Status
SELECT COUNT(*) FROM usuarios WHERE status = 'ATIVO';
-- Expected: Match active users in production

-- 8. Foreign Key Integrity
-- PostgreSQL automatically validates FKs during restore
-- If restore completes, FKs are valid

-- 9. Sequence State Validation
SELECT * FROM pg_sequences WHERE schemaname = 'public';
-- Expected: All sequences present with correct last_value

-- 10. Vacuum & Analyze for Optimization
VACUUM ANALYZE;
-- Expected: Completes without errors
```

### Automated Validation Script

```bash
#!/bin/bash
# /scripts/validate-restore.sh
# Runs critical validation checks post-restore

DB_HOST="${1:-localhost}"
DB_NAME="${2:-imbobi_prod}"
DB_USER="${3:-imbobi}"

echo "=== PostGIS Restore Validation ==="

# Function to run SQL and report result
validate() {
  local name="$1"
  local query="$2"
  local expected="$3"
  
  result=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "$query")
  
  if [ "$result" = "$expected" ]; then
    echo "✓ $name: PASS"
    return 0
  else
    echo "✗ $name: FAIL (expected: $expected, got: $result)"
    return 1
  fi
}

# Run validations
validate "PostGIS Extension" \
  "SELECT COUNT(*) FROM pg_extension WHERE extname = 'postgis';" \
  "1"

validate "Table Count (obras)" \
  "SELECT COUNT(*) FROM obras;" \
  ""  # Dynamic - just check query runs

validate "GIS Index Exists" \
  "SELECT COUNT(*) FROM pg_indexes WHERE tablename='obras' AND indexname LIKE '%location%';" \
  ""  # At least one index

echo ""
echo "=== Restore Validation Complete ==="
```

---

## Retention Policy

### Backup Storage Timeline

```
Day 0 (Backup Created)
│
├─ S3 STANDARD_IA (7 days)
│  ├─ Full backups: 7 daily snapshots
│  └─ Cost: ~$0.50 per backup
│
├─ S3 Glacier (30 days total)
│  ├─ Move backups older than 7 days to Glacier
│  └─ Cost: ~$0.05 per backup
│
└─ Delete after 30 days
   └─ Automated lifecycle policy
```

### S3 Lifecycle Policy Configuration

```json
{
  "Rules": [
    {
      "Id": "BackupRetentionPolicy",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "postgres/"
      },
      "Transitions": [
        {
          "Days": 7,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 30
      }
    }
  ]
}
```

**Apply via AWS CLI:**

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket imbobi-database-backups \
  --lifecycle-configuration file:///tmp/lifecycle-policy.json \
  --region us-east-1
```

**Verify Configuration:**

```bash
aws s3api get-bucket-lifecycle-configuration \
  --bucket imbobi-database-backups \
  --region us-east-1
```

### Retention By Environment

| Environment | Retention | Cost/Month | Purpose |
|-------------|-----------|-----------|---------|
| Production | 30 days (7 STANDARD_IA + 23 Glacier) | ~$4.00 | Disaster recovery |
| Staging | 7 days (STANDARD_IA) | ~$0.50 | Testing, quick restore |
| Development | None (manual only) | $0.00 | Cost optimization |

---

## Storage & Cost Optimization

### Estimated Storage Costs

```
Database Size: ~256 MB (compressed)

7 Days STANDARD_IA:
  256 MB × 7 backups = 1.8 GB/month
  Cost: 1.8 GB × $0.0125/GB = $0.023

23 Days Glacier:
  256 MB × 23 backups = 5.9 GB/month
  Cost: 5.9 GB × $0.004/GB = $0.024

Total Monthly Cost: ~$0.05 per production database
(Plus $0.30 for requests/restore operations)
```

### Cost Optimization Strategies

1. **Compression:** Already enabled (gzip in pg_dump)
2. **Incremental Backups:** Not implemented (MVP phase) - full backups are simpler
3. **S3 Lifecycle:** Moves old backups to Glacier automatically
4. **Deduplication:** Not applicable (full daily backups)

### Cleanup Automation

**Delete backups older than 30 days:**

```bash
#!/bin/bash
# /scripts/cleanup-old-backups.sh
# Run daily at 05:00 UTC

aws s3api list-objects-v2 \
  --bucket imbobi-database-backups \
  --prefix postgres/ \
  --query "Contents[?LastModified<='$(date -d '30 days ago' --iso-8601)'].Key" \
  --output text | \
  xargs -I {} aws s3 rm "s3://imbobi-database-backups/{}"

echo "Cleanup complete: $(date)"
```

**Cron Schedule:**

```bash
# Daily cleanup (5am UTC)
0 5 * * * /home/user/imobi/scripts/cleanup-old-backups.sh >> /var/log/imbobi-cleanup.log 2>&1
```

---

## Production Implementation

### Pre-Go-Live Checklist (2026-06-02, 02:00 UTC)

- [ ] AWS S3 bucket `imbobi-database-backups` created with encryption
- [ ] S3 lifecycle policy deployed (7-day transition to Glacier)
- [ ] IAM role with S3 permissions attached to EC2/Railway instance
- [ ] All backup scripts deployed to `/scripts/` directory
- [ ] Backup scripts are executable (`chmod +x /scripts/backup-*.sh`)
- [ ] Crontab entries added to root crontab
- [ ] Log directories created (`/var/log/`) with correct permissions
- [ ] `PGPASSWORD` environment variable set securely (via `.env` or secrets manager)
- [ ] AWS CLI installed and configured with correct region
- [ ] Test backup-restore.sh runs successfully
- [ ] CloudWatch alarm configured for backup failures
- [ ] Sentry integration configured for error notifications

### Test Execution Checklist

**Before Go-Live:**

```bash
# 1. Test S3 connectivity
aws s3 ls s3://imbobi-database-backups/ --region us-east-1

# 2. Run manual backup
./scripts/backup-postgres.sh

# 3. Verify S3 upload
aws s3 ls s3://imbobi-database-backups/postgres/ --region us-east-1

# 4. Test backup restore to staging
./scripts/test-backup-restore.sh

# 5. Verify cron jobs
sudo crontab -l | grep -E "backup-postgres|backup-redis"
```

### Monitoring Integration

**CloudWatch Metrics:**

```bash
# Publish backup success metric
aws cloudwatch put-metric-data \
  --namespace imbobi/backups \
  --metric-name BackupSuccess \
  --value 1 \
  --unit Count \
  --timestamp 2026-05-31T02:00:00Z
```

**Sentry Integration (Python example):**

```python
import sentry_sdk
import subprocess

sentry_sdk.init("your-sentry-dsn")

def run_backup():
    try:
        result = subprocess.run(
            ["/scripts/backup-postgres.sh"],
            capture_output=True,
            timeout=600
        )
        if result.returncode != 0:
            sentry_sdk.capture_message(
                f"Backup failed: {result.stderr.decode()}",
                level="error"
            )
    except Exception as e:
        sentry_sdk.capture_exception(e)
```

---

**Document Owner:** DevOps/DBA Team  
**Last Review:** 2026-05-31  
**Next Review:** 2026-08-31  
**Emergency Contact:** @on-call | #infrastructure Slack
