#!/bin/bash
# Disaster Recovery Script for imbobi
# Restores PostgreSQL and Redis from backups
# Usage: ./disaster-recovery.sh [postgres|redis|all] [backup-date]
# Example: ./disaster-recovery.sh postgres 2026-05-29_020000
#          ./disaster-recovery.sh all latest

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/tmp/imbobi-backups}"
REDIS_BACKUP_DIR="${REDIS_BACKUP_DIR:-/tmp/imbobi-redis-backups}"
LOG_FILE="${LOG_FILE:-/var/log/imbobi-disaster-recovery.log}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-imbobi_prod}"
DB_USER="${DB_USER:-imbobi}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
S3_BUCKET="${S3_BUCKET:-imbobi-database-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# Log function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Validate inputs
if [ $# -lt 1 ]; then
  echo "Usage: $0 [postgres|redis|all] [backup-date|latest]"
  echo "Example: $0 postgres 2026-05-29_020000"
  echo "         $0 all latest"
  exit 1
fi

RECOVERY_TYPE="$1"
BACKUP_DATE="${2:-latest}"

log "=== Starting Disaster Recovery: $RECOVERY_TYPE (Backup: $BACKUP_DATE) ==="

# Function to restore PostgreSQL
restore_postgres() {
  local backup_date="$1"
  
  log "Restoring PostgreSQL from backup: $backup_date"
  
  # Download from S3 if backup_date provided and AWS CLI available
  if [ "$backup_date" != "latest" ] && command -v aws &> /dev/null; then
    log "Downloading backup from S3..."
    aws s3 cp \
      "s3://${S3_BUCKET}/postgres/imbobi-pg-${backup_date}.sql.gz" \
      "${BACKUP_DIR}/imbobi-pg-${backup_date}.sql.gz" \
      --region "$S3_REGION"
  fi
  
  # Find backup file
  if [ "$backup_date" = "latest" ]; then
    BACKUP_FILE=$(ls -t "${BACKUP_DIR}"/imbobi-pg-*.sql.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
      log "ERROR: No PostgreSQL backups found in $BACKUP_DIR"
      return 1
    fi
  else
    BACKUP_FILE="${BACKUP_DIR}/imbobi-pg-${backup_date}.sql.gz"
    if [ ! -f "$BACKUP_FILE" ]; then
      log "ERROR: Backup file not found: $BACKUP_FILE"
      return 1
    fi
  fi
  
  log "Using backup file: $BACKUP_FILE"
  
  # Validate environment
  if [ -z "${PGPASSWORD:-}" ] && [ -z "${DB_PASSWORD:-}" ]; then
    log "ERROR: PGPASSWORD or DB_PASSWORD environment variable not set"
    return 1
  fi
  
  export PGPASSWORD="${PGPASSWORD:-$DB_PASSWORD}"
  
  # Restore database
  if gunzip -c "$BACKUP_FILE" | pg_restore \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -v 2>&1 | tee -a "$LOG_FILE"; then
    
    log "SUCCESS: PostgreSQL restored from $BACKUP_FILE"
    return 0
  else
    log "ERROR: PostgreSQL restore failed"
    return 1
  fi
}

# Function to restore Redis
restore_redis() {
  local backup_date="$1"
  
  log "Restoring Redis from backup: $backup_date"
  
  # Check if redis-cli is available
  if ! command -v redis-cli &> /dev/null; then
    log "ERROR: redis-cli not found. Please install redis-tools"
    return 1
  fi
  
  # Download from S3 if backup_date provided and AWS CLI available
  if [ "$backup_date" != "latest" ] && command -v aws &> /dev/null; then
    log "Downloading backup from S3..."
    aws s3 cp \
      "s3://${S3_BUCKET}/redis/imbobi-redis-${backup_date}.rdb.gz" \
      "${REDIS_BACKUP_DIR}/imbobi-redis-${backup_date}.rdb.gz" \
      --region "$S3_REGION"
  fi
  
  # Find backup file
  if [ "$backup_date" = "latest" ]; then
    BACKUP_FILE=$(ls -t "${REDIS_BACKUP_DIR}"/imbobi-redis-*.rdb.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
      log "ERROR: No Redis backups found in $REDIS_BACKUP_DIR"
      return 1
    fi
  else
    BACKUP_FILE="${REDIS_BACKUP_DIR}/imbobi-redis-${backup_date}.rdb.gz"
    if [ ! -f "$BACKUP_FILE" ]; then
      log "ERROR: Backup file not found: $BACKUP_FILE"
      return 1
    fi
  fi
  
  log "Using backup file: $BACKUP_FILE"
  
  # Build redis-cli command
  REDIS_CLI_CMD="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
  if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_CLI_CMD="$REDIS_CLI_CMD -a $REDIS_PASSWORD"
  fi
  
  # Stop writes before restore
  log "Stopping Redis writes..."
  $REDIS_CLI_CMD CONFIG SET stop-writes-on-bgsave-error yes
  
  # Extract RDB file
  RDB_FILE="${REDIS_BACKUP_DIR}/imbobi-redis-${backup_date}.rdb"
  if ! gunzip -c "$BACKUP_FILE" > "$RDB_FILE"; then
    log "ERROR: Failed to extract RDB file"
    return 1
  fi
  
  # Shutdown Redis to replace dump.rdb
  log "Shutting down Redis for data restore..."
  $REDIS_CLI_CMD SHUTDOWN NOSAVE || true
  
  sleep 5
  
  # Replace RDB file
  REDIS_DATA_DIR="${REDIS_DATA_DIR:-/var/lib/redis}"
  if ! cp "$RDB_FILE" "${REDIS_DATA_DIR}/dump.rdb"; then
    log "ERROR: Failed to copy RDB to Redis data directory"
    return 1
  fi
  
  # Restart Redis (assumes systemd or supervisor)
  log "Restarting Redis..."
  if systemctl restart redis-server 2>/dev/null || service redis-server restart 2>/dev/null; then
    log "SUCCESS: Redis restarted and restored"
    sleep 5
    
    # Verify Redis is running
    if $REDIS_CLI_CMD PING > /dev/null 2>&1; then
      log "SUCCESS: Redis restore verified"
      return 0
    else
      log "ERROR: Redis restore verification failed"
      return 1
    fi
  else
    log "ERROR: Failed to restart Redis service"
    return 1
  fi
}

# Execute recovery based on type
case "$RECOVERY_TYPE" in
  postgres)
    if restore_postgres "$BACKUP_DATE"; then
      log "=== PostgreSQL Disaster Recovery Completed Successfully ==="
      exit 0
    else
      log "=== PostgreSQL Disaster Recovery Failed ==="
      exit 1
    fi
    ;;
  redis)
    if restore_redis "$BACKUP_DATE"; then
      log "=== Redis Disaster Recovery Completed Successfully ==="
      exit 0
    else
      log "=== Redis Disaster Recovery Failed ==="
      exit 1
    fi
    ;;
  all)
    POSTGRES_OK=true
    REDIS_OK=true
    
    restore_postgres "$BACKUP_DATE" || POSTGRES_OK=false
    restore_redis "$BACKUP_DATE" || REDIS_OK=false
    
    if $POSTGRES_OK && $REDIS_OK; then
      log "=== Full Disaster Recovery Completed Successfully ==="
      exit 0
    else
      log "=== Full Disaster Recovery Completed with Errors ==="
      exit 1
    fi
    ;;
  *)
    echo "ERROR: Invalid recovery type: $RECOVERY_TYPE"
    echo "Valid options: postgres, redis, all"
    exit 1
    ;;
esac
