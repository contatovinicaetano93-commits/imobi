# Infrastructure & Disaster Recovery

This directory contains production infrastructure configurations, backup scripts, and disaster recovery procedures for the Imobi platform.

## Quick Start

### Setup Automated Backups

```bash
# Make backup scripts executable
chmod +x scripts/*.sh

# Install cron jobs for daily backups
sudo ./scripts/setup-backup-cron.sh
```

This will:
- Create backup directories (`/var/backups/imobi/`)
- Install cron jobs (PostgreSQL @ 2:00 AM UTC, Redis @ 2:30 AM UTC)
- Configure log rotation (7-day retention)
- Test backup connectivity

### Manual Backup

```bash
# PostgreSQL
./scripts/backup-postgres.sh production

# Redis
./scripts/backup-redis.sh production
```

## Directory Structure

```
infrastructure/
├── README.md                          # This file
├── DISASTER_RECOVERY.md               # Complete DR procedures & runbook
├── scripts/
│   ├── backup-postgres.sh             # PostgreSQL daily backup
│   ├── restore-postgres.sh            # PostgreSQL restore (local/S3/latest)
│   ├── backup-redis.sh                # Redis RDB snapshot
│   ├── restore-redis.sh               # Redis restore (local/S3)
│   └── setup-backup-cron.sh           # Automated cron setup
├── docker/
│   ├── docker-compose.prod.yml        # Production Docker Compose
│   ├── postgres.conf                  # PostgreSQL production config
│   └── redis.conf                     # Redis production config (persistence)
└── terraform/                         # (Future) Infrastructure as Code
```

## Backup Strategy

### PostgreSQL

| Aspect | Configuration |
|--------|----------------|
| **Frequency** | Daily at 2:00 AM UTC |
| **Retention** | 7+ days (configurable) |
| **Storage** | AWS S3 + Local filesystem |
| **Compression** | gzip (level 9) |
| **Size** | ~500MB-2GB (depends on data) |
| **Restore Time** | 10-20 minutes |

**Location:**
- Local: `/var/backups/imobi/postgres/`
- S3: `s3://imobi-backups-production/postgres/daily/YYYYMMDD/`

**Excluded Tables:**
- `sessions` (temporary)
- `logs` (can be archived separately)

### Redis

| Aspect | Configuration |
|--------|----------------|
| **Frequency** | Daily at 2:30 AM UTC |
| **Retention** | 7+ days (configurable) |
| **Storage** | AWS S3 + Local filesystem |
| **Method** | RDB snapshot (point-in-time) |
| **Persistence** | RDB + AOF (both available) |
| **Size** | ~10-100MB |
| **Restore Time** | 1-5 minutes |

**Location:**
- Local: `/var/backups/imobi/redis/`
- S3: `s3://imobi-backups-production/redis/daily/YYYYMMDD/`

## Configuration

### Environment Variables

Create or update `.env.production` with:

```env
# Database
DATABASE_HOST=<rds-endpoint>
DATABASE_PORT=5432
DATABASE_USER=imbobi
DATABASE_PASSWORD=<secure-password>
DATABASE_NAME=imbobi_production

# Redis
REDIS_HOST=<redis-endpoint>
REDIS_PORT=6379
REDIS_PASSWORD=<optional>

# AWS (for S3 backups)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>

# Optional: Slack notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### S3 Bucket Setup

Create backup buckets:

```bash
# PostgreSQL backups
aws s3api create-bucket \
  --bucket imobi-backups-production \
  --region us-east-1

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket imobi-backups-production \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Enable versioning (for recovery)
aws s3api put-bucket-versioning \
  --bucket imobi-backups-production \
  --versioning-configuration Status=Enabled
```

## Common Tasks

### List Available Backups

```bash
# Local PostgreSQL backups
ls -lh /var/backups/imobi/postgres/

# Local Redis backups
ls -lh /var/backups/imobi/redis/

# S3 PostgreSQL backups
aws s3 ls s3://imobi-backups-production/postgres/daily/

# S3 Redis backups
aws s3 ls s3://imobi-backups-production/redis/daily/
```

### Restore from Local Backup

```bash
# PostgreSQL from local file
./scripts/restore-postgres.sh --local /var/backups/imobi/postgres/imobi_production_20240101_020000.sql.gz

# Redis from local file
./scripts/restore-redis.sh --local /var/backups/imobi/redis/imobi_redis_production_20240101_020000.rdb
```

### Restore Latest from S3

```bash
# PostgreSQL latest
./scripts/restore-postgres.sh --latest production

# Redis latest
./scripts/restore-redis.sh --latest production
```

### Test Backup Integrity

```bash
# Verify PostgreSQL backup
gunzip -t /var/backups/imobi/postgres/backup.sql.gz

# Verify Redis backup
./scripts/restore-redis.sh --verify-only /var/backups/imobi/redis/backup.rdb

# Dry run (show SQL content)
./scripts/restore-postgres.sh --dry-run /var/backups/imobi/postgres/backup.sql.gz
```

### Dry Run Restore

```bash
# PostgreSQL (shows first 50 lines)
./scripts/restore-postgres.sh --dry-run backup.sql.gz

# Redis (verifies RDB magic number only)
./scripts/restore-redis.sh --verify-only backup.rdb
```

## Docker Production Setup

Run production services with persistence:

```bash
# Copy configuration files
cp docker/docker-compose.prod.yml docker-compose.yml
cp docker/postgres.conf /etc/postgresql/postgresql.conf
cp docker/redis.conf /etc/redis/redis.conf

# Start services
docker-compose up -d

# Verify persistence
docker exec imbobi_postgres_prod pg_isready
docker exec imbobi_redis_prod redis-cli ping
```

## Monitoring & Alerts

### Backup Success Checks

Logs are written to: `/var/log/imobi/backup-*.log`

Check recent backups:

```bash
tail -50 /var/log/imobi/backup-postgres.log
tail -50 /var/log/imobi/backup-redis.log
```

### Health Endpoint

```bash
# Check backup status
curl http://localhost:4000/api/v1/health/backups

# Expected response
{
  "lastPostgresBackup": "2024-01-01T02:30:00Z",
  "lastRedisBackup": "2024-01-01T02:35:00Z",
  "backupStatus": "healthy"
}
```

### Slack Notifications

Backups send Slack messages on success/failure (if configured):

- ✅ Backup successful (size, file name)
- ⚠️ Upload warning (local backup OK, S3 failed)
- ❌ Backup failed (immediate alert)

## Disaster Recovery Procedures

See [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) for:

- Complete backup/restore workflows
- Failure scenario recovery steps
- Point-in-time recovery (PITR)
- Database corruption fixes
- Data loss recovery
- On-call runbook
- Compliance & audit logging

## Performance Tuning

### PostgreSQL Optimization

The `postgres.conf` includes optimizations for:

- **Memory:** 256MB shared buffers (adjust for your instance)
- **Checkpoints:** Optimized for 5-10GB databases
- **Autovacuum:** Tuned for construction project data
- **WAL:** Configured for replication and archiving
- **Slow Query Log:** Queries > 1 second logged

Adjust `shared_buffers` for your system:

```conf
# For 4GB RAM
shared_buffers = 1GB
effective_cache_size = 2GB

# For 8GB RAM
shared_buffers = 2GB
effective_cache_size = 4GB

# For 16GB RAM
shared_buffers = 4GB
effective_cache_size = 8GB
```

### Redis Optimization

The `redis.conf` includes:

- **RDB Snapshots:** Automatic at 900s, 300s, and 60s intervals
- **AOF:** Optional for better durability
- **Memory Eviction:** LRU policy (512MB limit configurable)
- **Slow Log:** Commands > 10ms logged

Adjust `maxmemory` based on workload:

```conf
maxmemory 256mb    # Small instance
maxmemory 512mb    # Medium instance
maxmemory 1gb      # Large instance
maxmemory 2gb      # Very large instance
```

## Security Best Practices

1. **Encryption in Transit**
   - Use TLS for Redis (`rediss://` protocol)
   - Use SSL for PostgreSQL connections

2. **Encryption at Rest**
   - S3 backups encrypted with AES-256
   - Enable EBS encryption for volumes
   - PostgreSQL SSL certificates

3. **Access Control**
   - Strong PostgreSQL password (auto-generated)
   - Redis password required (set in config)
   - S3 bucket policy restricts access
   - IAM roles limit credential exposure

4. **Audit Logging**
   - All restore operations logged
   - Backup manifests document source & target
   - CloudTrail tracks S3 access

## Troubleshooting

### Backup Fails with "Cannot Connect to Redis"

```bash
# Check Redis is running
redis-cli ping

# Check connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# Verify password
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD ping
```

### PostgreSQL Backup Too Large

```bash
# Check database size
psql -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database WHERE datname='imbobi_production';"

# Identify large tables
psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"

# Consider archiving old logs
psql -c "DELETE FROM logs WHERE created_at < NOW() - INTERVAL '90 days';"
```

### S3 Upload Fails

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check bucket access
aws s3 ls s3://imobi-backups-production/

# Check encryption policy
aws s3api get-bucket-encryption --bucket imobi-backups-production

# Check versioning
aws s3api get-bucket-versioning --bucket imobi-backups-production
```

### Restore Fails with "Database Connection Lost"

```bash
# Check PostgreSQL is running
pg_isready -h $DATABASE_HOST -p $DATABASE_PORT

# Check network connectivity
telnet $DATABASE_HOST 5432

# Verify credentials
PGPASSWORD="$PASSWORD" psql -h $HOST -U $USER -d postgres -c "SELECT 1;"
```

## Related Documentation

- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) — Complete DR runbook
- [services/api/MONITORING.md](../services/api/MONITORING.md) — Monitoring & health checks
- [services/api/PRODUCTION_VALIDATION.md](../services/api/PRODUCTION_VALIDATION.md) — Environment setup
- [CLAUDE.md](../CLAUDE.md) — Project overview

## Support

For disaster recovery questions:
1. Check [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) for specific scenarios
2. Review backup logs: `/var/log/imobi/backup-*.log`
3. Test restore procedures monthly
4. Document any custom configurations

## Maintenance Schedule

| Task | Frequency | Owner |
|------|-----------|-------|
| Monitor backup logs | Daily | On-call |
| Test restore procedure | Monthly | Infrastructure team |
| Review backup retention | Quarterly | Infrastructure team |
| Update disaster recovery runbook | Annually | Infrastructure team |
| Full system DR test | Annually | Full team |

---

**Last Updated:** 2026-05-29
**Version:** 1.0.0
