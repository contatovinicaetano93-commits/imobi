#!/bin/bash
# PostgreSQL Backup Script for imbobi
# Automated daily backups to AWS S3 with 7+ days retention
# Usage: ./backup-postgres.sh
# Schedule: Add to crontab: 0 2 * * * /path/to/backup-postgres.sh

set -euo pipefail

# Configuration
BACKUP_DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/tmp/imbobi-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-imbobi_prod}"
DB_USER="${DB_USER:-imbobi}"
LOG_FILE="${LOG_FILE:-/var/log/imbobi-backup.log}"
S3_BUCKET="${S3_BUCKET:-imbobi-database-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# Create directories
mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Starting PostgreSQL Backup ==="

# Validate environment variables
if [ -z "${PGPASSWORD:-}" ] && [ -z "${DB_PASSWORD:-}" ]; then
  log "ERROR: PGPASSWORD or DB_PASSWORD environment variable not set"
  exit 1
fi

export PGPASSWORD="${PGPASSWORD:-$DB_PASSWORD}"

# Create backup file
BACKUP_FILE="${BACKUP_DIR}/imbobi-pg-${BACKUP_DATE}.sql.gz"

# Perform backup using pg_dump
if pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F custom \
  --no-password \
  -v 2>&1 | gzip > "$BACKUP_FILE"; then
  
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  log "SUCCESS: Database backup created: $BACKUP_FILE (Size: $BACKUP_SIZE)"
  
  # Upload to S3
  if command -v aws &> /dev/null; then
    log "Uploading backup to S3: s3://${S3_BUCKET}/postgres/${BACKUP_DATE}/"
    
    if aws s3 cp "$BACKUP_FILE" \
      "s3://${S3_BUCKET}/postgres/imbobi-pg-${BACKUP_DATE}.sql.gz" \
      --region "$S3_REGION" \
      --storage-class STANDARD_IA \
      --metadata "backup-date=${BACKUP_DATE},database=${DB_NAME}" 2>&1 | tee -a "$LOG_FILE"; then
      
      log "SUCCESS: Backup uploaded to S3"
      
      # Clean up local backup after successful upload
      rm -f "$BACKUP_FILE"
      log "Local backup file removed"
    else
      log "ERROR: Failed to upload backup to S3"
      exit 1
    fi
  else
    log "WARNING: AWS CLI not installed. Keeping backup locally at $BACKUP_FILE"
  fi
else
  log "ERROR: Database backup failed"
  exit 1
fi

# Cleanup old local backups (if not using S3)
if ! command -v aws &> /dev/null; then
  log "Removing backups older than $RETENTION_DAYS days"
  find "$BACKUP_DIR" -name "imbobi-pg-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
fi

log "=== PostgreSQL Backup Completed ==="
exit 0
