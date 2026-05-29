#!/bin/bash

##############################################################################
# Redis Backup Script
# Performs Redis RDB snapshots and AOF persistence
# Retention: 7+ days
#
# Usage: ./backup-redis.sh [environment]
# Example: ./backup-redis.sh production
##############################################################################

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-production}"
BACKUP_DIR="/var/backups/imobi/redis"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)
BACKUP_FILE="imobi_redis_${ENVIRONMENT}_${TIMESTAMP}.rdb"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
LOG_FILE="/var/log/imobi/backup-redis.log"

# Redis Configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_SOCKET_TIMEOUT=5

# AWS S3 Configuration
S3_BUCKET="imobi-backups-${ENVIRONMENT}"
S3_REGION="${AWS_REGION:-us-east-1}"
S3_BACKUP_PATH="redis/daily/${DATE_ONLY}/"

# Slack Notification Configuration (optional)
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    notify_slack "❌ Redis backup failed: $1"
    exit 1
}

# Slack notification
notify_slack() {
    if [ -z "$SLACK_WEBHOOK" ]; then
        return
    fi

    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"$1\"}" \
        2>/dev/null || true
}

# Build redis-cli command with optional password
redis_cli() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" "$@"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" "$@"
    fi
}

# Main backup process
main() {
    log "=== Starting Redis backup for $ENVIRONMENT ==="

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Test Redis connectivity
    log "Testing Redis connectivity..."
    if ! redis_cli ping > /dev/null; then
        error_exit "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
    fi
    log "✓ Redis connectivity verified"

    # Get Redis info before backup
    log "Getting Redis info..."
    REDIS_SIZE=$(redis_cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    REDIS_KEYS=$(redis_cli dbsize | grep keys | awk '{print $2}')
    log "Redis size: $REDIS_SIZE, Keys: $REDIS_KEYS"

    # Trigger RDB save
    log "Triggering Redis RDB snapshot..."
    if redis_cli bgsave > /dev/null; then
        log "RDB save initiated"
    else
        error_exit "Failed to initiate RDB save"
    fi

    # Wait for RDB save to complete
    log "Waiting for RDB save to complete..."
    WAIT_COUNT=0
    MAX_WAIT=300  # 5 minutes

    while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
        LAST_SAVE=$(redis_cli lastsave)
        CURRENT_TIME=$(date +%s)
        TIME_SINCE_SAVE=$((CURRENT_TIME - LAST_SAVE))

        if [ $TIME_SINCE_SAVE -lt 2 ]; then
            log "✓ RDB save completed"
            break
        fi

        WAIT_COUNT=$((WAIT_COUNT + 1))
        if [ $((WAIT_COUNT % 10)) -eq 0 ]; then
            log "Waiting for RDB save... ($WAIT_COUNT seconds elapsed)"
        fi
        sleep 1
    done

    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        error_exit "RDB save did not complete within $MAX_WAIT seconds"
    fi

    # Get Redis RDB file location
    log "Getting Redis RDB file location..."
    REDIS_RDB_DIR=$(redis_cli config get dir | tail -1)
    REDIS_RDB_FILE="${REDIS_RDB_DIR}/dump.rdb"

    if [ ! -f "$REDIS_RDB_FILE" ]; then
        error_exit "Redis RDB file not found at $REDIS_RDB_FILE"
    fi

    # Copy RDB file to backup location
    log "Copying RDB file to backup location..."
    if ! cp "$REDIS_RDB_FILE" "$BACKUP_PATH"; then
        error_exit "Failed to copy RDB file"
    fi

    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    log "Backup created successfully (Size: $BACKUP_SIZE)"

    # Upload to S3
    if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
        log "Uploading backup to S3..."
        if aws s3 cp "$BACKUP_PATH" "s3://$S3_BUCKET/$S3_BACKUP_PATH$BACKUP_FILE" \
            --region "$S3_REGION" \
            --storage-class STANDARD_IA \
            --metadata "environment=$ENVIRONMENT,backup-date=$TIMESTAMP" \
            --sse AES256; then
            log "✓ Successfully uploaded to S3"
        else
            log "WARNING: Failed to upload to S3, but local backup exists"
        fi
    else
        log "AWS credentials not configured, skipping S3 upload"
    fi

    # Create backup manifest
    log "Creating backup manifest..."
    MANIFEST_FILE="${BACKUP_DIR}/${DATE_ONLY}_manifest.txt"
    cat > "$MANIFEST_FILE" <<EOF
Redis Backup Information
========================
File: $BACKUP_FILE
Size: $BACKUP_SIZE
Environment: $ENVIRONMENT
Timestamp: $TIMESTAMP
Host: $REDIS_HOST:$REDIS_PORT
Memory Used: $REDIS_SIZE
Keys Count: $REDIS_KEYS
S3 Location: s3://$S3_BUCKET/$S3_BACKUP_PATH$BACKUP_FILE

Restore Command:
================
./restore-redis.sh --local $BACKUP_PATH

Verification:
=============
redis-cli --rdb $BACKUP_PATH
EOF
    log "Manifest saved to $MANIFEST_FILE"

    # Cleanup old backups
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "imobi_redis_${ENVIRONMENT}_*.rdb" -type f \
        -mtime "+${RETENTION_DAYS}" \
        -delete \
        -print | while read -r file; do
        log "Deleted old backup: $file"
    done

    # Cleanup old manifests
    find "$BACKUP_DIR" -name "*_manifest.txt" -type f \
        -mtime "+${RETENTION_DAYS}" \
        -delete

    # Verify backup by checking magic number
    log "Verifying backup integrity..."
    MAGIC=$(head -c 5 "$BACKUP_PATH" 2>/dev/null | od -A n -t x1 | tr -d ' ')
    if [ "$MAGIC" = "524544533039" ]; then  # "REDIS9" in hex
        log "✓ Backup integrity verified (valid RDB format)"
    else
        error_exit "Backup integrity check failed (invalid RDB magic number)"
    fi

    # Display AOF status
    log "Checking AOF configuration..."
    AOF_ENABLED=$(redis_cli config get appendonly | tail -1)
    if [ "$AOF_ENABLED" = "yes" ]; then
        log "✓ AOF persistence is enabled (append-only file)"
        AOF_FILE="${REDIS_RDB_DIR}/appendonly.aof"
        if [ -f "$AOF_FILE" ]; then
            AOF_SIZE=$(du -h "$AOF_FILE" | cut -f1)
            log "  AOF file size: $AOF_SIZE"
        fi
    else
        log "⚠ AOF persistence is disabled (only RDB snapshots available)"
    fi

    log "=== Redis backup completed successfully ==="
    notify_slack "✅ Redis backup successful\nSize: $BACKUP_SIZE\nFile: $BACKUP_FILE\nKeys: $REDIS_KEYS"
}

# Execute main
main "$@"
