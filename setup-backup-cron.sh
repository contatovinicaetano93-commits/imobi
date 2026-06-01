#!/bin/bash

# Setup automated daily backups via cron

CRON_JOB="0 2 * * * ./backup-restore.sh backup >> /var/log/imbobi-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-restore.sh"; then
  echo "Backup cron job already exists"
  exit 0
fi

# Add cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Backup cron job installed (daily at 2 AM)"
echo "Log location: /var/log/imbobi-backup.log"
