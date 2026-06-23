# Backup Automation Scripts — imobi MVP Production Ready

**Last Updated:** 2026-05-31  
**Document Version:** 2.0  
**Status:** Production-Ready  
**Go-Live:** 2026-06-02 (02:00-04:00 UTC)

---

## Table of Contents

1. [Overview](#overview)
2. [PostgreSQL Backup Script](#postgresql-backup-script)
3. [Redis Backup Script](#redis-backup-script)
4. [Backup Health Check](#backup-health-check)
5. [Email Alerts](#email-alerts)
6. [GitHub Actions Workflow](#github-actions-workflow)
7. [Cron Configuration](#cron-configuration)
8. [Retention Policy Enforcement](#retention-policy-enforcement)

---

## Overview

### Backup Architecture

```
Daily Cron (2am, 3am, 5am UTC)
    ↓
PostgreSQL/Redis Backup Script
    ↓
Local file (gzip compressed)
    ↓
Upload to S3 + health check
    ↓
Email notification (success/failure)
    ↓
Retention policy cleanup
```

### File Locations

| Script | Location | Schedule |
|--------|----------|----------|
| PostgreSQL backup | `/scripts/backup-postgres.sh` | 02:00 UTC daily |
| Redis backup | `/scripts/backup-redis.sh` | 03:00 UTC daily |
| Health check | `/scripts/check-backup-health.sh` | 04:00 UTC daily |
| Retention cleanup | `/scripts/cleanup-old-backups.sh` | 05:00 UTC daily |
| Validation test | `/scripts/test-backup-restore.sh` | 04:00 UTC Sunday |

---

## PostgreSQL Backup Script

### `/scripts/backup-postgres.sh`

```bash
#!/bin/bash
# Automated PostgreSQL Backup to S3
# Schedule: 0 2 * * * (Daily at 02:00 UTC)
# Owner: DevOps/DBA Team

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-imbobi_prod}"
DB_USER="${DB_USER:-imbobi}"
S3_BUCKET="${S3_BUCKET:-imbobi-database-backups}"
S3_PREFIX="${S3_PREFIX:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/imbobi-backups}"
LOG_FILE="${LOG_FILE:-/var/log/imbobi-backup.log}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Metadata
BACKUP_DATE=$(date +%Y-%m-%d_%H%M%S)
HOSTNAME=$(hostname)
BACKUP_FILE="${BACKUP_DIR}/imbobi-pg-${BACKUP_DATE}.sql.gz"

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $@" >> "$LOG_FILE"
  echo "$@"
}

# Error handler
trap 'handle_error' ERR

handle_error() {
  log "ERROR: Backup failed with exit code $?"
  
  # Send error alert
  echo "PostgreSQL backup failed at $(date)" | \
    mail -s "ALERT: PostgreSQL Backup Failed" \
    "ops-alerts@imobi.app"
  
  exit 1
}

log "=== PostgreSQL Backup Started ==="
log "Host: $DB_HOST | Database: $DB_NAME | User: $DB_USER"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Backup database
log "STEP 1: Starting PostgreSQL backup..."
start_time=$(date +%s)

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F custom \
  --no-password \
  --verbose \
  2>&1 | gzip > "$BACKUP_FILE"

if [ $? -ne 0 ]; then
  log "ERROR: pg_dump failed"
  rm -f "$BACKUP_FILE"
  exit 1
fi

end_time=$(date +%s)
duration=$((end_time - start_time))
backup_size=$(du -h "$BACKUP_FILE" | awk '{print $1}')

log "✓ Backup created: $backup_size (Duration: ${duration}s)"

# Step 2: Verify file integrity
log ""
log "STEP 2: Verifying backup integrity..."

if ! gunzip -t "$BACKUP_FILE" > /dev/null 2>&1; then
  log "ERROR: Backup file is corrupted (gzip check failed)"
  rm -f "$BACKUP_FILE"
  exit 1
fi

log "✓ Backup file integrity verified"

# Step 3: Upload to S3
log ""
log "STEP 3: Uploading backup to S3..."

aws s3 cp "$BACKUP_FILE" \
  "s3://${S3_BUCKET}/${S3_PREFIX}/imbobi-pg-${BACKUP_DATE}.sql.gz" \
  --region us-east-1 \
  --storage-class STANDARD_IA \
  --metadata "backup-date=${BACKUP_DATE},database=${DB_NAME},hostname=${HOSTNAME}" \
  --sse AES256

if [ $? -ne 0 ]; then
  log "ERROR: S3 upload failed"
  exit 1
fi

log "✓ Backup uploaded to S3"

# Step 4: Verify S3 upload
log ""
log "STEP 4: Verifying S3 upload..."

if aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/imbobi-pg-${BACKUP_DATE}.sql.gz" \
  --region us-east-1 > /dev/null 2>&1; then
  log "✓ S3 upload verified"
else
  log "ERROR: S3 verification failed"
  exit 1
fi

# Step 5: Cleanup local backup
log ""
log "STEP 5: Cleaning up local backup..."
rm -f "$BACKUP_FILE"
log "✓ Local file removed"

# Step 6: CloudWatch metric
log ""
log "STEP 6: Publishing CloudWatch metric..."

aws cloudwatch put-metric-data \
  --namespace imbobi/backups \
  --metric-name PostgreSQLBackupSuccess \
  --value 1 \
  --unit Count \
  --timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --region us-east-1

log "✓ Metric published"

# Success notification
log ""
log "=== PostgreSQL Backup Complete ==="
log "Status: ✓ SUCCESS"
log "Backup: imbobi-pg-${BACKUP_DATE}.sql.gz"
log "Size: $backup_size"
log "S3 Path: s3://${S3_BUCKET}/${S3_PREFIX}/imbobi-pg-${BACKUP_DATE}.sql.gz"

# Send success notification (optional)
echo "PostgreSQL backup successful at $(date)
Size: $backup_size
S3: s3://${S3_BUCKET}/${S3_PREFIX}/imbobi-pg-${BACKUP_DATE}.sql.gz" | \
  mail -s "✓ PostgreSQL Backup Success" \
  "ops-alerts@imobi.app"

exit 0
```

**Permissions:**
```bash
chmod +x /scripts/backup-postgres.sh
chown root:root /scripts/backup-postgres.sh
```

---

## Redis Backup Script

### `/scripts/backup-redis.sh`

```bash
#!/bin/bash
# Automated Redis Backup to S3
# Schedule: 0 3 * * * (Daily at 03:00 UTC)
# Owner: DevOps/Backend Team

set -e

# Configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
S3_BUCKET="${S3_BUCKET:-imbobi-database-backups}"
S3_PREFIX="${S3_PREFIX:-redis}"
BACKUP_DIR="${BACKUP_DIR:-/tmp/imbobi-redis-backups}"
LOG_FILE="${LOG_FILE:-/var/log/imbobi-redis-backup.log}"
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/var/lib/redis}"

# Metadata
BACKUP_DATE=$(date +%Y-%m-%d_%H%M%S)
HOSTNAME=$(hostname)
BACKUP_FILE="${BACKUP_DIR}/imbobi-redis-${BACKUP_DATE}.rdb"

# Logging
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $@" >> "$LOG_FILE"
  echo "$@"
}

trap 'handle_error' ERR

handle_error() {
  log "ERROR: Redis backup failed"
  mail -s "ALERT: Redis Backup Failed" "ops-alerts@imobi.app" << EOF
Redis backup failed at $(date)
See logs: $LOG_FILE
EOF
  exit 1
}

log "=== Redis Backup Started ==="
log "Host: $REDIS_HOST:$REDIS_PORT"

mkdir -p "$BACKUP_DIR"

# Step 1: Trigger BGSAVE
log ""
log "STEP 1: Triggering Redis BGSAVE..."

if ! redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE > /dev/null 2>&1; then
  log "ERROR: Redis BGSAVE command failed"
  exit 1
fi

log "✓ BGSAVE triggered"

# Step 2: Wait for BGSAVE completion (max 5 minutes)
log ""
log "STEP 2: Waiting for BGSAVE to complete..."

timeout=300
elapsed=0

while [ $elapsed -lt $timeout ]; do
  # Check if save is in progress
  if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" LASTSAVE > /dev/null 2>&1; then
    # Check background save status
    status=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO persistence | grep rdb_bgsave_in_progress)
    
    if [[ "$status" == *"0"* ]]; then
      log "✓ BGSAVE completed"
      break
    fi
  fi
  
  echo -n "."
  sleep 2
  elapsed=$((elapsed + 2))
done

if [ $elapsed -ge $timeout ]; then
  log "ERROR: BGSAVE timeout (> 5 minutes)"
  exit 1
fi

# Step 3: Copy RDB file
log ""
log "STEP 3: Copying RDB file..."

cp "${REDIS_DATA_DIR}/dump.rdb" "$BACKUP_FILE"

if [ ! -f "$BACKUP_FILE" ]; then
  log "ERROR: Failed to copy RDB file"
  exit 1
fi

log "✓ RDB file copied"

# Step 4: Compress
log ""
log "STEP 4: Compressing backup..."

gzip "$BACKUP_FILE"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

backup_size=$(du -h "$BACKUP_FILE_GZ" | awk '{print $1}')
log "✓ Compressed size: $backup_size"

# Step 5: Upload to S3
log ""
log "STEP 5: Uploading to S3..."

aws s3 cp "$BACKUP_FILE_GZ" \
  "s3://${S3_BUCKET}/${S3_PREFIX}/imbobi-redis-${BACKUP_DATE}.rdb.gz" \
  --region us-east-1 \
  --storage-class STANDARD_IA \
  --metadata "backup-date=${BACKUP_DATE},hostname=${HOSTNAME}" \
  --sse AES256

if [ $? -ne 0 ]; then
  log "ERROR: S3 upload failed"
  exit 1
fi

log "✓ Uploaded to S3"

# Step 6: Verify upload
log ""
log "STEP 6: Verifying S3 upload..."

if aws s3 ls "s3://${S3_BUCKET}/${S3_PREFIX}/imbobi-redis-${BACKUP_DATE}.rdb.gz" \
  --region us-east-1 > /dev/null 2>&1; then
  log "✓ S3 verification passed"
else
  log "ERROR: S3 verification failed"
  exit 1
fi

# Step 7: Cleanup
log ""
log "STEP 7: Cleaning up..."

rm -f "$BACKUP_FILE_GZ"
log "✓ Local file removed"

# Step 8: CloudWatch metric
aws cloudwatch put-metric-data \
  --namespace imbobi/backups \
  --metric-name RedisBackupSuccess \
  --value 1 \
  --unit Count \
  --region us-east-1

log ""
log "=== Redis Backup Complete ==="
log "Status: ✓ SUCCESS"
log "Size: $backup_size"
log "S3: s3://${S3_BUCKET}/${S3_PREFIX}/imbobi-redis-${BACKUP_DATE}.rdb.gz"

exit 0
```

---

## Backup Health Check

### `/scripts/check-backup-health.sh`

```bash
#!/bin/bash
# Daily Backup Health Check
# Schedule: 0 4 * * * (Daily at 04:00 UTC)
# Verifies backups were created successfully

set -e

LOG_FILE="/var/log/imbobi-backup-health.log"
S3_BUCKET="imbobi-database-backups"
ALERT_EMAIL="ops-alerts@imobi.app"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $@" >> "$LOG_FILE"
  echo "$@"
}

log "=== Backup Health Check Started ==="

# Check PostgreSQL backup
log ""
log "Checking PostgreSQL backup..."

PG_LATEST=$(aws s3 ls "s3://${S3_BUCKET}/postgres/" \
  --recursive --sort=time --reverse | head -1)

if [ -z "$PG_LATEST" ]; then
  log "✗ FAIL: No PostgreSQL backup found"
  echo "No PostgreSQL backup found in S3" | \
    mail -s "ALERT: PostgreSQL Backup Missing" "$ALERT_EMAIL"
else
  # Extract file info
  pg_file=$(echo "$PG_LATEST" | awk '{print $NF}')
  pg_size=$(echo "$PG_LATEST" | awk '{print $(NF-1)}')
  pg_date=$(echo "$PG_LATEST" | awk '{print $1}')
  
  log "✓ Found: $pg_file ($pg_size bytes)"
  
  # Verify size is reasonable (> 50 MB for our database)
  if [ "$pg_size" -lt 52428800 ]; then
    log "⚠ WARNING: PostgreSQL backup smaller than expected"
    echo "PostgreSQL backup size: $pg_size (< 50 MB expected)" | \
      mail -s "WARNING: PostgreSQL Backup Size" "$ALERT_EMAIL"
  fi
fi

# Check Redis backup
log ""
log "Checking Redis backup..."

REDIS_LATEST=$(aws s3 ls "s3://${S3_BUCKET}/redis/" \
  --recursive --sort=time --reverse | head -1)

if [ -z "$REDIS_LATEST" ]; then
  log "✗ FAIL: No Redis backup found"
  echo "No Redis backup found in S3" | \
    mail -s "ALERT: Redis Backup Missing" "$ALERT_EMAIL"
else
  redis_file=$(echo "$REDIS_LATEST" | awk '{print $NF}')
  redis_size=$(echo "$REDIS_LATEST" | awk '{print $(NF-1)}')
  
  log "✓ Found: $redis_file ($redis_size bytes)"
fi

# Check backup age
log ""
log "Checking backup timestamps..."

# Both backups should be from today (within 24 hours)
BACKUP_HOUR=$(echo "$PG_LATEST" | awk '{print $1}')
CURRENT_DATE=$(date +%Y-%m-%d)

if [[ "$BACKUP_HOUR" == "$CURRENT_DATE"* ]]; then
  log "✓ PostgreSQL backup is recent (today)"
else
  log "✗ FAIL: PostgreSQL backup is older than 24 hours"
  echo "PostgreSQL backup is older than 24 hours: $BACKUP_HOUR" | \
    mail -s "ALERT: PostgreSQL Backup Age" "$ALERT_EMAIL"
fi

# Count total backups
log ""
log "Backup retention status..."

pg_count=$(aws s3 ls "s3://${S3_BUCKET}/postgres/" --recursive | wc -l)
redis_count=$(aws s3 ls "s3://${S3_BUCKET}/redis/" --recursive | wc -l)

log "PostgreSQL backups: $pg_count"
log "Redis backups: $redis_count"

log ""
log "=== Health Check Complete ==="

# Summary
if [ -n "$PG_LATEST" ] && [ -n "$REDIS_LATEST" ]; then
  log "Status: ✓ All backups healthy"
  exit 0
else
  log "Status: ✗ Backup issues detected"
  exit 1
fi
```

---

## Email Alerts

### Sentry Integration (Recommended)

```python
#!/usr/bin/env python3
# /scripts/backup-monitor.py
# Monitors backup success and sends alerts via Sentry

import os
import subprocess
import sentry_sdk
from datetime import datetime

sentry_sdk.init(os.getenv("SENTRY_DSN"))

def check_backup_status():
    """Check if today's backups completed successfully."""
    
    try:
        # Run health check script
        result = subprocess.run(
            ["/bin/bash", "/scripts/check-backup-health.sh"],
            capture_output=True,
            timeout=300
        )
        
        if result.returncode != 0:
            # Alert on failure
            sentry_sdk.capture_message(
                "Backup health check failed",
                level="error",
                extra={
                    "stdout": result.stdout.decode(),
                    "stderr": result.stderr.decode()
                }
            )
            return False
        
        return True
        
    except subprocess.TimeoutExpired:
        sentry_sdk.capture_exception(
            Exception("Backup health check timeout")
        )
        return False
    except Exception as e:
        sentry_sdk.capture_exception(e)
        return False

if __name__ == "__main__":
    success = check_backup_status()
    exit(0 if success else 1)
```

---

## GitHub Actions Workflow

### `.github/workflows/backup-check.yml`

```yaml
name: Backup Health Check

on:
  schedule:
    # Run daily at 04:00 UTC
    - cron: '0 4 * * *'
  workflow_dispatch:

jobs:
  backup-check:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
      
      - name: Check PostgreSQL backup
        run: |
          LATEST=$(aws s3 ls s3://imbobi-database-backups/postgres/ \
            --recursive --sort=time --reverse | head -1)
          
          if [ -z "$LATEST" ]; then
            echo "✗ No PostgreSQL backup found"
            exit 1
          fi
          
          SIZE=$(echo "$LATEST" | awk '{print $(NF-1)}')
          if [ "$SIZE" -lt 52428800 ]; then
            echo "⚠ PostgreSQL backup smaller than expected"
          fi
          
          echo "✓ PostgreSQL backup OK: $SIZE bytes"
      
      - name: Check Redis backup
        run: |
          LATEST=$(aws s3 ls s3://imbobi-database-backups/redis/ \
            --recursive --sort=time --reverse | head -1)
          
          if [ -z "$LATEST" ]; then
            echo "✗ No Redis backup found"
            exit 1
          fi
          
          echo "✓ Redis backup OK"
      
      - name: Send alert if failed
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "⚠ Backup health check failed",
              "channel": "#infrastructure"
            }
```

---

## Cron Configuration

### Root Crontab Setup

```bash
# View current crontab
sudo crontab -l

# Edit crontab
sudo crontab -e

# Add these lines:
# ========================================

# PostgreSQL backup (02:00 UTC daily)
0 2 * * * /scripts/backup-postgres.sh >> /var/log/imbobi-backup.log 2>&1

# Redis backup (03:00 UTC daily)
0 3 * * * /scripts/backup-redis.sh >> /var/log/imbobi-redis-backup.log 2>&1

# Backup health check (04:00 UTC daily)
0 4 * * * /scripts/check-backup-health.sh >> /var/log/imbobi-backup-health.log 2>&1

# Old backup cleanup (05:00 UTC daily)
0 5 * * * /scripts/cleanup-old-backups.sh >> /var/log/imbobi-cleanup.log 2>&1

# Weekly backup restore test (04:00 UTC Sunday)
0 4 * * 0 /scripts/test-backup-restore.sh >> /var/log/imbobi-backup-test.log 2>&1

# ========================================
```

### Verify Cron Jobs

```bash
# List all cron jobs
sudo crontab -l

# Monitor cron logs (systemd)
journalctl -u cron -f

# Check last execution
tail -20 /var/log/imbobi-backup.log
```

---

## Retention Policy Enforcement

### `/scripts/cleanup-old-backups.sh`

```bash
#!/bin/bash
# Clean up backups older than retention period
# Schedule: 0 5 * * * (Daily at 05:00 UTC)

set -e

LOG_FILE="/var/log/imbobi-cleanup.log"
S3_BUCKET="imbobi-database-backups"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $@" >> "$LOG_FILE"
  echo "$@"
}

log "=== Backup Cleanup Started ==="
log "Retention policy: Keep backups from last $RETENTION_DAYS days"

# Calculate cutoff date
CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" --iso-8601)
log "Cutoff date: $CUTOFF_DATE"

# Cleanup PostgreSQL backups
log ""
log "Cleaning PostgreSQL backups..."

deleted_count=0
aws s3api list-objects-v2 \
  --bucket "$S3_BUCKET" \
  --prefix "postgres/" \
  --query "Contents[?LastModified<'${CUTOFF_DATE}'].Key" \
  --output text | while read -r key; do
  
  if [ -n "$key" ]; then
    aws s3 rm "s3://${S3_BUCKET}/${key}"
    log "Deleted: $key"
    deleted_count=$((deleted_count + 1))
  fi
done

log "Deleted $deleted_count PostgreSQL backup(s)"

# Cleanup Redis backups
log ""
log "Cleaning Redis backups..."

deleted_count=0
aws s3api list-objects-v2 \
  --bucket "$S3_BUCKET" \
  --prefix "redis/" \
  --query "Contents[?LastModified<'${CUTOFF_DATE}'].Key" \
  --output text | while read -r key; do
  
  if [ -n "$key" ]; then
    aws s3 rm "s3://${S3_BUCKET}/${key}"
    log "Deleted: $key"
    deleted_count=$((deleted_count + 1))
  fi
done

log "Deleted $deleted_count Redis backup(s)"

log ""
log "=== Cleanup Complete ==="

exit 0
```

---

**Document Owner:** DevOps Team  
**Last Review:** 2026-05-31  
**Next Review:** 2026-08-31  
**Emergency Contact:** @on-call | #infrastructure Slack
