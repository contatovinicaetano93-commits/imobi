#!/bin/bash

##############################################################################
# Setup Automated Backups
# Configures cron jobs for daily PostgreSQL and Redis backups
#
# Usage: sudo ./setup-backup-cron.sh
# Requirements: Root or sudo access
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root or with sudo"
    exit 1
fi

# Configuration
IMOBI_HOME="/home/ubuntu/imobi"
SCRIPT_DIR="$IMOBI_HOME/infrastructure/scripts"
BACKUP_DIR="/var/backups/imobi"
LOG_DIR="/var/log/imobi"
ENV_FILE="${IMOBI_HOME}/.env.production"

# Create required directories
log "Creating backup and log directories..."
mkdir -p "$BACKUP_DIR/postgres"
mkdir -p "$BACKUP_DIR/redis"
mkdir -p "$LOG_DIR"

# Set permissions
chmod 755 "$BACKUP_DIR"
chmod 755 "$BACKUP_DIR/postgres"
chmod 755 "$BACKUP_DIR/redis"
chmod 755 "$LOG_DIR"
chmod 755 "$SCRIPT_DIR/backup-postgres.sh"
chmod 755 "$SCRIPT_DIR/backup-redis.sh"

log "Directories created with proper permissions"

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
    warn ".env.production not found at $ENV_FILE"
    warn "Backup scripts will use environment variables if set"
else
    log "Found $ENV_FILE"
fi

# Create cron jobs
log "Setting up cron jobs..."

POSTGRES_CRON="0 2 * * * export \$(cat $ENV_FILE | xargs) && $SCRIPT_DIR/backup-postgres.sh production >> $LOG_DIR/backup-postgres-cron.log 2>&1"
REDIS_CRON="30 2 * * * export \$(cat $ENV_FILE | xargs) && $SCRIPT_DIR/backup-redis.sh production >> $LOG_DIR/backup-redis-cron.log 2>&1"

# Create a temporary crontab file
CRON_TEMP="/tmp/imobi-backup-cron.txt"
crontab -l > "$CRON_TEMP" 2>/dev/null || true

# Check if cron jobs already exist
if grep -q "backup-postgres.sh" "$CRON_TEMP" 2>/dev/null; then
    warn "PostgreSQL backup cron job already exists"
    # Remove old entry
    grep -v "backup-postgres.sh" "$CRON_TEMP" > "${CRON_TEMP}.new"
    mv "${CRON_TEMP}.new" "$CRON_TEMP"
fi

if grep -q "backup-redis.sh" "$CRON_TEMP" 2>/dev/null; then
    warn "Redis backup cron job already exists"
    # Remove old entry
    grep -v "backup-redis.sh" "$CRON_TEMP" > "${CRON_TEMP}.new"
    mv "${CRON_TEMP}.new" "$CRON_TEMP"
fi

# Append new cron jobs
echo "$POSTGRES_CRON" >> "$CRON_TEMP"
echo "$REDIS_CRON" >> "$CRON_TEMP"

# Install new crontab
crontab "$CRON_TEMP"
rm -f "$CRON_TEMP"

log "Cron jobs installed"

# Verify cron jobs
log "Verifying cron jobs..."
if crontab -l | grep -q "backup-postgres.sh"; then
    log "PostgreSQL backup cron job is active (2:00 AM UTC)"
else
    error "Failed to install PostgreSQL backup cron job"
    exit 1
fi

if crontab -l | grep -q "backup-redis.sh"; then
    log "Redis backup cron job is active (2:30 AM UTC)"
else
    error "Failed to install Redis backup cron job"
    exit 1
fi

# Create log rotation config
log "Setting up log rotation..."
cat > /etc/logrotate.d/imobi-backups <<'EOF'
/var/log/imobi/backup-*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        systemctl reload-or-restart rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF
log "Log rotation configured (7 days retention)"

# Display summary
echo ""
echo "=========================================="
echo "Backup Setup Complete"
echo "=========================================="
echo ""
echo "Backup Schedule:"
echo "  - PostgreSQL: 2:00 AM UTC (daily)"
echo "  - Redis: 2:30 AM UTC (daily)"
echo ""
echo "Backup Locations:"
echo "  - PostgreSQL: $BACKUP_DIR/postgres/"
echo "  - Redis: $BACKUP_DIR/redis/"
echo "  - Logs: $LOG_DIR/"
echo ""
echo "Cron Jobs:"
crontab -l | grep -E "backup-(postgres|redis)" || true
echo ""
echo "Test Backup Now?"
echo ""
read -p "Run PostgreSQL backup now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    export $(cat "$ENV_FILE" | xargs 2>/dev/null || true)
    "$SCRIPT_DIR/backup-postgres.sh" production
fi

read -p "Run Redis backup now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    export $(cat "$ENV_FILE" | xargs 2>/dev/null || true)
    "$SCRIPT_DIR/backup-redis.sh" production
fi

echo ""
log "Setup complete! Backups are now automated"
echo ""
echo "Next Steps:"
echo "  1. Monitor /var/log/imobi/backup-*.log for backup success"
echo "  2. Verify backups in S3: aws s3 ls s3://imobi-backups-production/"
echo "  3. Test restore procedures monthly"
echo "  4. Set up Slack notifications in .env.production:"
echo "     SLACK_WEBHOOK_URL=https://hooks.slack.com/services/..."
echo ""
