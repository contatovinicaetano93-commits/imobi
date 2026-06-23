#!/bin/bash

##############################################################################
# Redis Restore Script
# Restores Redis database from RDB backup
#
# Usage:
#   ./restore-redis.sh --local /path/to/dump.rdb
#   ./restore-redis.sh --s3 s3://bucket/path/dump.rdb
#   ./restore-redis.sh --latest production
##############################################################################

set -euo pipefail

# Configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
LOG_FILE="/var/log/imobi/restore-redis.log"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Show usage
usage() {
    cat <<EOF
Redis Restore Script

Usage:
  $0 --local /path/to/dump.rdb          Restore from local RDB file
  $0 --s3 s3://bucket/path/dump.rdb     Restore from S3
  $0 --latest environment               Restore latest backup from S3

Options:
  -h, --help              Show this help message
  --no-flush              Don't flush existing data (merge mode)
  --verify-only           Only verify backup, don't restore

Environment Variables:
  REDIS_HOST              Redis host (default: localhost)
  REDIS_PORT              Redis port (default: 6379)
  REDIS_PASSWORD          Redis password (optional)

Examples:
  ./restore-redis.sh --local backups/imobi_redis_prod_20240101_020000.rdb
  ./restore-redis.sh --latest production
  ./restore-redis.sh --local backup.rdb --no-flush
EOF
    exit 1
}

# Build redis-cli command
redis_cli() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" "$@"
    else
        redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" "$@"
    fi
}

# Download from S3
download_from_s3() {
    local s3_path="$1"
    local local_file="/tmp/$(basename "$s3_path")"

    log "Downloading from S3: $s3_path"
    aws s3 cp "$s3_path" "$local_file" --region "${AWS_REGION:-us-east-1}" || \
        error_exit "Failed to download from S3"

    echo "$local_file"
}

# Get latest backup from S3
get_latest_backup() {
    local environment="$1"
    local bucket="imobi-backups-${environment}"
    local prefix="redis/daily/"

    log "Finding latest Redis backup in S3..."
    local latest=$(aws s3 ls "s3://$bucket/$prefix" --recursive \
        --region "${AWS_REGION:-us-east-1}" | \
        sort | tail -1 | awk '{print $4}')

    if [ -z "$latest" ]; then
        error_exit "No Redis backups found in S3"
    fi

    echo "s3://$bucket/$latest"
}

# Verify RDB file
verify_rdb() {
    local rdb_file="$1"

    log "Verifying RDB file..."

    if [ ! -f "$rdb_file" ]; then
        error_exit "RDB file not found: $rdb_file"
    fi

    # Check RDB magic number (REDIS9 in hex: 524544493039)
    MAGIC=$(head -c 5 "$rdb_file" 2>/dev/null | od -A n -t x1 | tr -d ' ')
    if [ "$MAGIC" != "524544493039" ]; then
        error_exit "Invalid RDB file - magic number mismatch"
    fi

    log "✓ RDB file is valid (magic number verified)"

    # Check file size
    FILE_SIZE=$(du -h "$rdb_file" | cut -f1)
    log "  File size: $FILE_SIZE"
}

# Restore Redis
restore_redis() {
    local rdb_file="$1"
    local flush="${2:-true}"

    log "=== Starting Redis Restore ==="
    log "RDB file: $rdb_file"
    log "Target: $REDIS_HOST:$REDIS_PORT"

    # Verify file
    verify_rdb "$rdb_file"

    # Test connectivity
    log "Testing Redis connectivity..."
    if ! redis_cli ping > /dev/null; then
        error_exit "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
    fi
    log "✓ Redis connectivity verified"

    # Get current Redis info
    log "Getting current Redis info..."
    CURRENT_KEYS=$(redis_cli dbsize | grep keys | awk '{print $2}')
    CURRENT_MEMORY=$(redis_cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    log "Current keys: $CURRENT_KEYS, Memory: $CURRENT_MEMORY"

    # Flush if requested
    if [ "$flush" = "true" ]; then
        log "WARNING: Flushing all data from Redis..."
        read -p "Are you absolutely sure? Type 'yes' to continue: " confirm
        if [ "$confirm" != "yes" ]; then
            error_exit "Aborted"
        fi

        if redis_cli flushall > /dev/null; then
            log "✓ Redis data flushed"
        else
            error_exit "Failed to flush Redis"
        fi
    else
        log "⚠ Skipping flush - will merge with existing data"
    fi

    # Get Redis RDB directory
    log "Getting Redis RDB directory..."
    REDIS_RDB_DIR=$(redis_cli config get dir | tail -1)
    REDIS_RDB_FILE="${REDIS_RDB_DIR}/dump.rdb"

    # Backup current RDB if it exists
    if [ -f "$REDIS_RDB_FILE" ]; then
        BACKUP_RDB="${REDIS_RDB_FILE}.backup.$(date +%s)"
        log "Backing up current RDB to $BACKUP_RDB"
        cp "$REDIS_RDB_FILE" "$BACKUP_RDB"
    fi

    # Copy RDB file to Redis directory
    log "Copying RDB file to Redis directory..."
    if ! cp "$rdb_file" "$REDIS_RDB_FILE"; then
        error_exit "Failed to copy RDB file"
    fi

    # Wait a moment for Redis to detect the new file
    sleep 1

    # Stop and restart Redis to load new RDB
    log "Restarting Redis to load new RDB..."

    # First, try graceful shutdown
    timeout 10 redis_cli shutdown save 2>/dev/null || true
    sleep 2

    # Check if Redis is back up
    RETRY_COUNT=0
    MAX_RETRIES=30

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if redis_cli ping > /dev/null 2>&1; then
            log "✓ Redis is online"
            break
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $((RETRY_COUNT % 5)) -eq 0 ]; then
            log "Waiting for Redis to start... ($RETRY_COUNT seconds)"
        fi
        sleep 1
    done

    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        error_exit "Redis failed to come online after $MAX_RETRIES seconds"
    fi

    # Verify restore
    log "Verifying restore..."
    RESTORED_KEYS=$(redis_cli dbsize | grep keys | awk '{print $2}')
    RESTORED_MEMORY=$(redis_cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    log "Restored keys: $RESTORED_KEYS, Memory: $RESTORED_MEMORY"

    if [ "$RESTORED_KEYS" -gt 0 ]; then
        log "✓ Restore completed successfully"
    else
        log "⚠ Warning: No keys loaded (backup may have been empty)"
    fi

    log "=== Redis restore completed ==="
}

# Main
main() {
    mkdir -p "$(dirname "$LOG_FILE")"

    if [ $# -eq 0 ]; then
        usage
    fi

    local mode=""
    local rdb_file=""
    local environment=""
    local flush=true
    local verify_only=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --local)
                mode="local"
                rdb_file="$2"
                shift 2
                ;;
            --s3)
                mode="s3"
                rdb_file="$2"
                shift 2
                ;;
            --latest)
                mode="latest"
                environment="$2"
                shift 2
                ;;
            --no-flush)
                flush=false
                shift
                ;;
            --verify-only)
                verify_only=true
                rdb_file="$2"
                shift 2
                ;;
            -h|--help)
                usage
                ;;
            *)
                error_exit "Unknown option: $1"
                ;;
        esac
    done

    if [ "$verify_only" = "true" ]; then
        verify_rdb "$rdb_file"
        exit 0
    fi

    case "$mode" in
        local)
            restore_redis "$rdb_file" "$flush"
            ;;
        s3)
            local_file=$(download_from_s3 "$rdb_file")
            restore_redis "$local_file" "$flush"
            rm -f "$local_file"
            ;;
        latest)
            rdb_s3=$(get_latest_backup "$environment")
            local_file=$(download_from_s3 "$rdb_s3")
            restore_redis "$local_file" "$flush"
            rm -f "$local_file"
            ;;
        *)
            error_exit "No mode specified"
            ;;
    esac
}

main "$@"
