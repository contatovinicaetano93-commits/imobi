#!/bin/bash

##############################################################################
# PostgreSQL Restore Script
# Restores database from backup file or S3
#
# Usage:
#   ./restore-postgres.sh --local /path/to/backup.sql.gz
#   ./restore-postgres.sh --s3 s3://bucket/path/backup.sql.gz
#   ./restore-postgres.sh --latest production
##############################################################################

set -euo pipefail

# Configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USER:-imbobi}"
DB_PASSWORD="${DATABASE_PASSWORD:-}"
DB_NAME="${DATABASE_NAME:-imbobi_prod}"

# Logging
LOG_FILE="/var/log/imobi/restore-postgres.log"

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
PostgreSQL Restore Script

Usage:
  $0 --local /path/to/backup.sql.gz          Restore from local file
  $0 --s3 s3://bucket/path/backup.sql.gz     Restore from S3
  $0 --latest environment                    Restore latest backup from S3
  $0 --dry-run /path/to/backup.sql.gz        Test restore without actual restoration

Options:
  -h, --help              Show this help message
  --drop-db               Drop existing database before restore
  --no-verify             Skip integrity verification

Environment Variables:
  DATABASE_HOST           PostgreSQL host (default: localhost)
  DATABASE_PORT           PostgreSQL port (default: 5432)
  DATABASE_USER           PostgreSQL user (default: imbobi)
  DATABASE_PASSWORD       PostgreSQL password
  DATABASE_NAME           Database name (default: imbobi_prod)
  AWS_REGION              AWS region for S3 (default: us-east-1)

Examples:
  # Restore from local backup
  ./restore-postgres.sh --local backups/imobi_prod_20240101_020000.sql.gz

  # Restore latest backup from S3
  ./restore-postgres.sh --latest production

  # Drop and restore (useful for clean slate)
  ./restore-postgres.sh --local backup.sql.gz --drop-db

  # Dry run to check backup contents
  ./restore-postgres.sh --dry-run backup.sql.gz
EOF
    exit 1
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
    local prefix="postgres/daily/"

    log "Finding latest backup in S3: s3://$bucket/$prefix"

    local latest=$(aws s3 ls "s3://$bucket/$prefix" --recursive \
        --region "${AWS_REGION:-us-east-1}" | \
        sort | tail -1 | awk '{print $4}')

    if [ -z "$latest" ]; then
        error_exit "No backups found in S3"
    fi

    echo "s3://$bucket/$latest"
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"

    log "Verifying backup integrity..."
    if gunzip -t "$backup_file" 2>/dev/null; then
        log "✓ Backup integrity verified"
        return 0
    else
        error_exit "Backup integrity check failed"
    fi
}

# Dry run - show first 50 lines of SQL
dry_run() {
    local backup_file="$1"

    log "=== DRY RUN: Showing first 50 lines of SQL dump ==="
    gunzip -c "$backup_file" | head -50
    log "=== End of sample ==="
}

# Drop database
drop_database() {
    local db="$1"

    log "WARNING: Dropping database $db..."
    read -p "Are you absolutely sure? Type 'yes' to continue: " confirm
    if [ "$confirm" != "yes" ]; then
        error_exit "Aborted"
    fi

    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "DROP DATABASE IF EXISTS \"$db\";" || \
        error_exit "Failed to drop database"

    log "Database dropped"
}

# Restore from backup
restore_from_backup() {
    local backup_file="$1"
    local drop_db="${2:-false}"

    log "=== Starting PostgreSQL Restore ==="
    log "Backup file: $backup_file"
    log "Target database: $DB_NAME"
    log "Target host: $DB_HOST:$DB_PORT"

    # Verify backup exists
    if [ ! -f "$backup_file" ]; then
        error_exit "Backup file not found: $backup_file"
    fi

    # Verify backup integrity
    verify_backup "$backup_file"

    # Drop existing database if requested
    if [ "$drop_db" = "true" ]; then
        drop_database "$DB_NAME"
    fi

    # Create database if it doesn't exist
    log "Ensuring database exists..."
    PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d postgres \
        -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";" 2>/dev/null || true

    # Wait for database to be ready
    log "Waiting for database to be ready..."
    for i in {1..30}; do
        if PGPASSWORD="$DB_PASSWORD" pg_isready \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" 2>/dev/null; then
            break
        fi
        if [ $i -eq 30 ]; then
            error_exit "Database failed to become ready"
        fi
        sleep 2
    done

    # Restore from backup
    log "Restoring database from backup..."
    if ! gunzip < "$backup_file" | \
        PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -v ON_ERROR_STOP=1; then
        error_exit "Failed to restore database"
    fi

    # Verify restore
    log "Verifying restore..."
    TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | tr -d ' ')

    if [ "$TABLE_COUNT" -gt 0 ]; then
        log "✓ Restore completed successfully ($TABLE_COUNT tables)"
    else
        error_exit "Restore verification failed - no tables found"
    fi

    log "=== Restore completed successfully ==="
}

# Main
main() {
    mkdir -p "$(dirname "$LOG_FILE")"

    if [ $# -eq 0 ]; then
        usage
    fi

    local mode=""
    local backup_file=""
    local environment=""
    local drop_db=false
    local dry_run=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --local)
                mode="local"
                backup_file="$2"
                shift 2
                ;;
            --s3)
                mode="s3"
                backup_file="$2"
                shift 2
                ;;
            --latest)
                mode="latest"
                environment="$2"
                shift 2
                ;;
            --drop-db)
                drop_db=true
                shift
                ;;
            --dry-run)
                dry_run=true
                backup_file="$2"
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

    case "$mode" in
        local)
            if [ "$dry_run" = "true" ]; then
                dry_run "$backup_file"
            else
                restore_from_backup "$backup_file" "$drop_db"
            fi
            ;;
        s3)
            local_file=$(download_from_s3 "$backup_file")
            restore_from_backup "$local_file" "$drop_db"
            rm -f "$local_file"
            ;;
        latest)
            backup_s3=$(get_latest_backup "$environment")
            local_file=$(download_from_s3 "$backup_s3")
            restore_from_backup "$local_file" "$drop_db"
            rm -f "$local_file"
            ;;
        *)
            error_exit "No mode specified"
            ;;
    esac
}

main "$@"
