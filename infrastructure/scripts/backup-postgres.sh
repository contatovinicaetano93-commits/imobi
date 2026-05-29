#!/bin/bash

##############################################################################
# PostgreSQL Automated Backup Script
# Performs daily backups to local storage and AWS S3
# Retention: 7+ days
# Schedule: 2:00 AM UTC (configure via cron)
#
# Usage: ./backup-postgres.sh [environment]
# Example: ./backup-postgres.sh production
##############################################################################

set -euo pipefail

# Configuration
ENVIRONMENT="${1:-production}"
BACKUP_DIR="/var/backups/imobi/postgres"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)
BACKUP_FILE="imobi_${ENVIRONMENT}_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
LOG_FILE="/var/log/imobi/backup-postgres.log"

# AWS S3 Configuration
S3_BUCKET="imobi-backups-${ENVIRONMENT}"
S3_REGION="${AWS_REGION:-us-east-1}"
S3_BACKUP_PATH="postgres/daily/${DATE_ONLY}/"

# Database Configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_USER="${DATABASE_USER:-imbobi}"
DB_NAME="${DATABASE_NAME:-imbobi_${ENVIRONMENT}}"

# Slack Notification Configuration (optional)
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    notify_slack "❌ PostgreSQL backup failed: $1"
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

# Main backup process
main() {
    log "=== Starting PostgreSQL backup for $ENVIRONMENT ==="
    log "Backup file: $BACKUP_FILE"

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"

    # Create backup with compression
    log "Creating database dump..."
    if ! PGPASSWORD="$DATABASE_PASSWORD" pg_dump \
        --host="$DB_HOST" \
        --port="$DB_PORT" \
        --username="$DB_USER" \
        --database="$DB_NAME" \
        --format=plain \
        --compress=9 \
        --verbose \
        --exclude-table-data='sessions' \
        --exclude-table-data='logs' \
        > "$BACKUP_PATH"; then
        error_exit "Failed to create database dump"
    fi

    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    log "Database dump created successfully (Size: $BACKUP_SIZE)"

    # Upload to S3 if AWS credentials are configured
    if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_SECRET_ACCESS_KEY:-}" ]; then
        log "Uploading backup to S3 (s3://$S3_BUCKET/$S3_BACKUP_PATH)..."

        if aws s3 cp "$BACKUP_PATH" "s3://$S3_BUCKET/$S3_BACKUP_PATH$BACKUP_FILE" \
            --region "$S3_REGION" \
            --storage-class STANDARD_IA \
            --metadata "environment=$ENVIRONMENT,backup-date=$TIMESTAMP" \
            --sse AES256; then
            log "Successfully uploaded to S3"
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
Backup Information
==================
File: $BACKUP_FILE
Size: $BACKUP_SIZE
Environment: $ENVIRONMENT
Database: $DB_NAME
Timestamp: $TIMESTAMP
Host: $DB_HOST:$DB_PORT
S3 Location: s3://$S3_BUCKET/$S3_BACKUP_PATH$BACKUP_FILE

Restore Command:
================
gunzip < $BACKUP_PATH | psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME

Verification:
=============
gunzip < $BACKUP_PATH | head -20
EOF
    log "Manifest saved to $MANIFEST_FILE"

    # Cleanup old backups (keep RETENTION_DAYS + 1 day)
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    find "$BACKUP_DIR" -name "imobi_${ENVIRONMENT}_*.sql.gz" -type f \
        -mtime "+${RETENTION_DAYS}" \
        -delete \
        -print | while read -r file; do
        log "Deleted old backup: $file"
    done

    # Cleanup old manifests
    find "$BACKUP_DIR" -name "*_manifest.txt" -type f \
        -mtime "+${RETENTION_DAYS}" \
        -delete

    # Verify backup integrity
    log "Verifying backup integrity..."
    if gunzip -t "$BACKUP_PATH" 2>/dev/null; then
        log "✓ Backup integrity verified"
    else
        error_exit "Backup integrity check failed"
    fi

    log "=== Backup completed successfully ==="
    notify_slack "✅ PostgreSQL backup successful\nSize: $BACKUP_SIZE\nFile: $BACKUP_FILE"
}

# Execute main function
main "$@"
