#!/bin/bash
# Redis Backup Script for imbobi
# Automated daily backups to AWS S3 with RDB snapshots
# Usage: ./backup-redis.sh
# Schedule: Add to crontab: 0 3 * * * /path/to/backup-redis.sh

set -euo pipefail

# Configuration
BACKUP_DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/tmp/imbobi-redis-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
LOG_FILE="${LOG_FILE:-/var/log/imbobi-redis-backup.log}"
S3_BUCKET="${S3_BUCKET:-imbobi-database-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# Create directories
mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== Starting Redis Backup ==="

# Check if redis-cli is available
if ! command -v redis-cli &> /dev/null; then
  log "ERROR: redis-cli not found. Please install redis-tools"
  exit 1
fi

# Build redis-cli command with auth if password is set
REDIS_CLI_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
if [ -n "$REDIS_PASSWORD" ]; then
  REDIS_CLI_CMD="$REDIS_CLI_CMD -a $REDIS_PASSWORD"
fi

# Trigger RDB snapshot
if $REDIS_CLI_CMD BGSAVE > /dev/null 2>&1; then
  log "Redis BGSAVE triggered"
  
  # Wait for save to complete (with timeout)
  TIMEOUT=300
  ELAPSED=0
  while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$($REDIS_CLI_CMD LASTSAVE 2>/dev/null || echo "0")
    if [ -n "$STATUS" ]; then
      log "Waiting for Redis backup to complete..."
      sleep 5
      ((ELAPSED+=5))
    else
      break
    fi
  done
else
  log "ERROR: Failed to trigger Redis BGSAVE"
  exit 1
fi

# Get Redis data directory (default is /var/lib/redis)
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/var/lib/redis}"
RDB_FILE="${REDIS_DATA_DIR}/dump.rdb"

# Check if RDB file exists
if [ ! -f "$RDB_FILE" ]; then
  log "ERROR: RDB file not found at $RDB_FILE"
  exit 1
fi

# Copy RDB to backup directory
BACKUP_FILE="${BACKUP_DIR}/imbobi-redis-${BACKUP_DATE}.rdb"
if cp "$RDB_FILE" "$BACKUP_FILE"; then
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  log "SUCCESS: Redis backup created: $BACKUP_FILE (Size: $BACKUP_SIZE)"
  
  # Compress backup
  gzip "$BACKUP_FILE"
  BACKUP_FILE="${BACKUP_FILE}.gz"
  log "Backup compressed: $BACKUP_FILE"
  
  # Upload to S3
  if command -v aws &> /dev/null; then
    log "Uploading backup to S3: s3://${S3_BUCKET}/redis/${BACKUP_DATE}/"
    
    if aws s3 cp "$BACKUP_FILE" \
      "s3://${S3_BUCKET}/redis/imbobi-redis-${BACKUP_DATE}.rdb.gz" \
      --region "$S3_REGION" \
      --storage-class STANDARD_IA \
      --metadata "backup-date=${BACKUP_DATE},service=redis" 2>&1 | tee -a "$LOG_FILE"; then
      
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
  log "ERROR: Failed to copy RDB file to backup directory"
  exit 1
fi

# Cleanup old local backups (if not using S3)
if ! command -v aws &> /dev/null; then
  log "Removing backups older than $RETENTION_DAYS days"
  find "$BACKUP_DIR" -name "imbobi-redis-*.rdb.gz" -mtime "+$RETENTION_DAYS" -delete
fi

log "=== Redis Backup Completed ==="
exit 0
