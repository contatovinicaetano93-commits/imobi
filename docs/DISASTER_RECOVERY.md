# Disaster Recovery Procedures - imbobi

**Last Updated:** 2026-05-29
**Document Version:** 1.0
**Status:** Production-Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [PostgreSQL Backup & Restore](#postgresql-backup--restore)
4. [Redis Backup & Restore](#redis-backup--restore)
5. [Disaster Recovery Scenarios](#disaster-recovery-scenarios)
6. [Testing & Verification](#testing--verification)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Runbooks](#runbooks)

---

## Overview

### RTO & RPO Targets

| Service | RTO (Recovery Time) | RPO (Recovery Point) | Backup Frequency |
|---------|-------------------|-------------------|------------------|
| PostgreSQL | 2-4 hours | 24 hours | Daily @ 2:00 AM UTC |
| Redis | 30 minutes | 24 hours | Daily @ 3:00 AM UTC |
| Application | 15 minutes | N/A | Rolling restart |

### Backup Infrastructure

- **Primary Storage:** AWS S3 (`imbobi-database-backups` bucket)
- **Redundancy:** Cross-region replication enabled
- **Retention:** 7+ days for daily backups, 30 days for weekly
- **Encryption:** AES-256 at rest; TLS in transit
- **Format:** Compressed (gzip) for space efficiency

---

## Backup Strategy

### Architecture

```
Local Server
    ↓
PostgreSQL (daily 2am UTC)
    ├→ pg_dump → compress → S3 (STANDARD_IA)
    └→ Local retention (7 days)

Redis (daily 3am UTC)
    ├→ RDB snapshot → compress → S3 (STANDARD_IA)
    └→ Local retention (7 days)
```

### Backup Scripts

| Script | Purpose | Location | Schedule |
|--------|---------|----------|----------|
| `backup-postgres.sh` | PostgreSQL daily backup | `/scripts/` | 0 2 * * * (2am UTC) |
| `backup-redis.sh` | Redis daily backup | `/scripts/` | 0 3 * * * (3am UTC) |
| `test-backup-restore.sh` | Verify backup integrity | `/scripts/` | Manual or weekly |
| `disaster-recovery.sh` | Restore from backups | `/scripts/` | On-demand |

### Environment Variables

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=imbobi_prod
DB_USER=imbobi
PGPASSWORD=<secure_password>
DB_PASSWORD=<secure_password>

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<optional_password>
REDIS_DATA_DIR=/var/lib/redis

# AWS S3 Configuration
S3_BUCKET=imbobi-database-backups
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<aws_key>
AWS_SECRET_ACCESS_KEY=<aws_secret>

# Backup Configuration
BACKUP_DIR=/tmp/imbobi-backups
REDIS_BACKUP_DIR=/tmp/imbobi-redis-backups
RETENTION_DAYS=7
LOG_FILE=/var/log/imbobi-backup.log
```

---

## PostgreSQL Backup & Restore

### Backup Process

**Automated daily backup at 2:00 AM UTC:**

```bash
# Manual trigger
./scripts/backup-postgres.sh

# Expected output
# [2026-05-29 02:00:00] === Starting PostgreSQL Backup ===
# [2026-05-29 02:00:15] SUCCESS: Database backup created: ... (Size: 256 MB)
# [2026-05-29 02:00:45] SUCCESS: Backup uploaded to S3
```

### Restore from Backup

#### Option 1: Latest Local Backup (Fastest)

```bash
./scripts/disaster-recovery.sh postgres latest
```

**Execution Time:** ~5-10 minutes (depends on backup size)

#### Option 2: Specific Backup Date

```bash
# List available backups in S3
aws s3 ls s3://imbobi-database-backups/postgres/

# Restore specific backup
./scripts/disaster-recovery.sh postgres 2026-05-28_020000
```

#### Option 3: Manual Restore

```bash
# Set password
export PGPASSWORD="your_secure_password"

# Download backup from S3
aws s3 cp \
  s3://imbobi-database-backups/postgres/imbobi-pg-2026-05-28_020000.sql.gz \
  ./backup.sql.gz \
  --region us-east-1

# Restore to database
gunzip -c backup.sql.gz | pg_restore \
  -h localhost \
  -p 5432 \
  -U imbobi \
  -d imbobi_prod \
  --verbose

# Verify
psql -U imbobi -d imbobi_prod -c "SELECT COUNT(*) FROM obras;"
```

### Verification Steps

After restoration:

```bash
# Connect to restored database
psql -U imbobi -d imbobi_prod

# Verify critical tables
SELECT COUNT(*) FROM obras;
SELECT COUNT(*) FROM usuarios;
SELECT COUNT(*) FROM parcelas;
SELECT MAX(updated_at) FROM obras;

# Check table integrity
VACUUM ANALYZE;
```

---

## Redis Backup & Restore

### Backup Process

**Automated daily backup at 3:00 AM UTC:**

```bash
# Manual trigger
./scripts/backup-redis.sh

# Expected output
# [2026-05-29 03:00:00] === Starting Redis Backup ===
# [2026-05-29 03:00:05] Redis BGSAVE triggered
# [2026-05-29 03:00:10] SUCCESS: Redis backup created: ... (Size: 512 MB)
# [2026-05-29 03:00:30] SUCCESS: Backup uploaded to S3
```

### Restore from Backup

#### Option 1: Automated Restore (Recommended)

```bash
./scripts/disaster-recovery.sh redis latest
```

**Execution Time:** ~2-3 minutes (includes Redis restart)

#### Option 2: Manual Restore

```bash
# Download backup from S3
aws s3 cp \
  s3://imbobi-database-backups/redis/imbobi-redis-2026-05-28_030000.rdb.gz \
  ./redis-backup.rdb.gz \
  --region us-east-1

# Decompress
gunzip -c redis-backup.rdb.gz > /var/lib/redis/dump.rdb

# Stop Redis writes (optional)
redis-cli CONFIG SET stop-writes-on-bgsave-error yes

# Shutdown Redis gracefully
redis-cli SHUTDOWN NOSAVE

# Wait for Redis to stop
sleep 5

# Restart Redis (systemd)
sudo systemctl restart redis-server

# Verify connection
redis-cli PING
# Output: PONG
```

### Verification Steps

```bash
# Check Redis connection
redis-cli PING
# Output: PONG

# Verify data presence
redis-cli DBSIZE
# Output: (integer) 1234

# Check specific keys (queue jobs)
redis-cli KEYS "bull:liberacao-parcela:*"

# Check memory usage
redis-cli INFO memory
```

---

## Disaster Recovery Scenarios

### Scenario 1: Database Corruption or Data Loss

**Trigger:** 
- Accidental DELETE without WHERE clause
- Table corruption detected
- Data integrity check failure

**Recovery Steps:**

```bash
# 1. Immediately notify on-call team via Slack
# 2. Stop application traffic (optional maintenance mode)
# 3. Verify backup integrity
./scripts/test-backup-restore.sh

# 4. Restore from latest known good backup
./scripts/disaster-recovery.sh postgres latest

# 5. Verify restored data
psql -U imbobi -d imbobi_prod -c "SELECT COUNT(*) FROM obras;"

# 6. Run integrity checks
VACUUM ANALYZE;

# 7. Resume traffic and monitor
```

**Estimated Recovery Time:** 30-60 minutes

### Scenario 2: Complete Server Failure

**Trigger:**
- Hardware failure
- Network partition
- Severe OS corruption

**Recovery Steps:**

```bash
# 1. On new/restored server, install PostgreSQL & Redis
apt-get install postgresql-15 postgresql-15-postgis redis-server

# 2. Set environment variables
export DB_HOST=new-server
export DB_PORT=5432
export PGPASSWORD="secure_password"
export S3_BUCKET=imbobi-database-backups

# 3. Create database
createdb -h new-server imbobi_prod

# 4. Restore all data
./scripts/disaster-recovery.sh all latest

# 5. Verify services
pg_isready -h new-server
redis-cli PING

# 6. Update DNS/Load balancer to point to new server
# 7. Monitor logs for 1 hour
```

**Estimated Recovery Time:** 2-4 hours

### Scenario 3: Redis Cache Invalidation (Non-Critical)

**Trigger:**
- Redis corrupted data
- Session data loss
- Queue job corruption

**Recovery Steps:**

```bash
# Redis cache is non-critical (can rebuild on-the-fly)
# Option A: Just restart Redis (if recent backup exists)
redis-cli FLUSHALL
systemctl restart redis-server

# Option B: Restore from backup if needed
./scripts/disaster-recovery.sh redis latest

# Application will automatically repopulate cache
```

**Estimated Recovery Time:** 5-10 minutes

### Scenario 4: Ransomware / Malicious Data Deletion

**Trigger:**
- Suspicious activity detected
- Files encrypted
- Backup immutability verified

**Recovery Steps:**

```bash
# 1. Isolate affected systems immediately
# 2. Investigate logs (send to security team)
# 3. Verify backup integrity (immutable copy check)
aws s3api head-object \
  --bucket imbobi-database-backups \
  --key postgres/imbobi-pg-2026-05-28_020000.sql.gz \
  --region us-east-1

# 4. Restore from clean backup (before encryption occurred)
./scripts/disaster-recovery.sh all 2026-05-27_020000

# 5. Forensic analysis on compromised systems
# 6. Deploy patched application version
```

**Estimated Recovery Time:** 4-8 hours (including forensics)

---

## Testing & Verification

### Weekly Backup Test

Run every Sunday at 4:00 AM UTC:

```bash
./scripts/test-backup-restore.sh
```

**Checklist:**
- ✓ PostgreSQL backup creation
- ✓ PostgreSQL restore verification
- ✓ Redis backup creation
- ✓ Redis restore verification
- ✓ S3 connectivity check
- ✓ Backup file integrity

### Monthly Full Disaster Recovery Drill

**Schedule:** First Sunday of each month

**Procedure:**

1. Notify team: "Disaster Recovery Drill - Do Not Interfere"
2. Create test environment (isolated VM/container)
3. Restore latest backups
4. Run full application smoke tests
5. Document any issues
6. Cleanup test environment

**Success Criteria:**
- Database restored with zero data loss
- Redis restored with all queued jobs intact
- Application startup successful
- Health checks passing

---

## Monitoring & Alerts

### Backup Success Monitoring

**CloudWatch Metrics:**

```json
{
  "Namespace": "imbobi/backups",
  "MetricName": "BackupSuccess",
  "Dimensions": [
    {"Name": "Service", "Value": "PostgreSQL"},
    {"Name": "Timestamp", "Value": "2026-05-29T02:00:00Z"}
  ]
}
```

### Alert Configuration

**Sentry Integration (Recommended):**

```
Alert Rule: Backup Failed
Condition: backup-postgres.sh or backup-redis.sh exit code = 1
Notify: #ops-alerts on Slack
Severity: Critical
```

**Log Monitoring:**

```bash
# Monitor backup logs
tail -f /var/log/imbobi-backup.log | grep ERROR

# Set up log rotation
cat > /etc/logrotate.d/imbobi-backup << EOF
/var/log/imbobi-*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
}
EOF
```

### Cron Configuration

```bash
# Add to root crontab
# PostgreSQL backup (2am UTC)
0 2 * * * /path/to/backup-postgres.sh

# Redis backup (3am UTC)
0 3 * * * /path/to/backup-redis.sh

# Weekly test (4am UTC, every Sunday)
0 4 * * 0 /path/to/test-backup-restore.sh

# Cleanup old backups (daily at 5am UTC)
0 5 * * * find /tmp/imbobi-backups -mtime +7 -delete
```

---

## Runbooks

### Quick Reference Guide

| Situation | Command | Time |
|-----------|---------|------|
| **Test Backups** | `./scripts/test-backup-restore.sh` | 10 min |
| **Restore PostgreSQL (Latest)** | `./scripts/disaster-recovery.sh postgres latest` | 15 min |
| **Restore Redis (Latest)** | `./scripts/disaster-recovery.sh redis latest` | 5 min |
| **Restore Everything** | `./scripts/disaster-recovery.sh all latest` | 20 min |
| **List Available Backups** | `aws s3 ls s3://imbobi-database-backups/` | 1 min |

### Emergency Contacts

| Role | Contact | Slack |
|------|---------|-------|
| On-Call Engineer | TBD | @on-call |
| Database Admin | TBD | @dba-team |
| Infrastructure Team | TBD | #infrastructure |
| Security Team | TBD | #security |

### Post-Incident Checklist

After any disaster recovery activation:

- [ ] Document incident timeline
- [ ] Measure actual RTO vs target
- [ ] Identify root cause
- [ ] Update runbooks if needed
- [ ] Schedule post-mortem meeting
- [ ] Notify stakeholders
- [ ] Update incident log

---

## Appendix: Troubleshooting

### PostgreSQL Restore Hangs

```bash
# Check active connections
psql -U imbobi -d imbobi_prod -c "SELECT * FROM pg_stat_activity;"

# Terminate blocking connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'imbobi_prod';
```

### Redis Restore Fails

```bash
# Check Redis logs
journalctl -u redis-server -n 100

# Verify RDB file integrity
redis-check-rdb /var/lib/redis/dump.rdb

# Clear corrupted RDB and restart
rm /var/lib/redis/dump.rdb
systemctl restart redis-server
```

### S3 Upload Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://imbobi-database-backups/ --region us-east-1

# Check bucket policy
aws s3api get-bucket-policy --bucket imbobi-database-backups
```

---

**Document Owner:** Infrastructure Team  
**Last Review:** 2026-05-29  
**Next Review:** 2026-08-29
