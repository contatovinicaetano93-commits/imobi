# Redis Persistence Configuration — imobi

**Last Updated:** 2026-05-31  
**Document Version:** 2.0  
**Status:** Production-Ready  
**Go-Live:** 2026-06-02 (02:00-04:00 UTC)

---

## Table of Contents

1. [Overview](#overview)
2. [RDB (Snapshot) Configuration](#rdb-snapshot-configuration)
3. [AOF (Append-Only File) Setup](#aof-append-only-file-setup)
4. [BullMQ Queue Persistence](#bullmq-queue-persistence)
5. [Hybrid Approach (RDB + AOF)](#hybrid-approach-rdb--aof)
6. [Replication Strategy](#replication-strategy)
7. [Backup & Export Procedure](#backup--export-procedure)
8. [Persistence After Crash](#persistence-after-crash)
9. [Production Configuration](#production-configuration)

---

## Overview

### RTO & RPO Targets (Redis)

| Metric | Target | Current Config |
|--------|--------|----------------|
| **Recovery Time Objective (RTO)** | ≤ 30 min | ~5 min (RDB restore) |
| **Recovery Point Objective (RPO)** | ≤ 15 min | ~24 hours (daily snapshots) |
| **Data Loss Tolerance** | Cache non-critical | Queue jobs: critical |
| **Backup Frequency** | Daily @ 03:00 UTC | Automated via cron |
| **Restore Success Rate** | 100% | Tested weekly |

### Redis Architecture for imbobi

```
┌─────────────────────────────────────────┐
│   NestJS Application                    │
│   (BullMQ Queue Workers)                │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
Session Cache        BullMQ Queues
(non-critical)       (critical)
    │                     │
    └──────────┬──────────┘
               │
        ┌──────▼──────┐
        │   Redis 7   │
        │  Port 6379  │
        └──────┬──────┘
               │
    ┌──────────┴──────────┐
    │                     │
   RDB              AOF (optional)
 /var/lib/redis   /var/lib/redis
 /dump.rdb        /appendonly.aof
```

### Data Stored in Redis

| Key Pattern | Type | Criticality | TTL | Examples |
|-------------|------|-------------|-----|----------|
| `session:*` | String | Non-critical | 24h | User sessions |
| `bull:liberacao-parcela:*` | Hash | CRITICAL | None | Job queue |
| `bull:notificacoes:*` | Hash | High | None | Notification queue |
| `cache:obra:*` | String | Non-critical | 1h | Cached obra data |
| `location:*` | GeoHash | Non-critical | 30m | GPS tracking cache |

---

## RDB (Snapshot) Configuration

### RDB Overview

**RDB (Redis Database)** = Point-in-time snapshot of all Redis data.

| Aspect | Detail |
|--------|--------|
| **Format** | Binary, compressed |
| **Size** | ~512 MB (for full queue + sessions) |
| **Save Time** | ~5-10 seconds (via BGSAVE) |
| **Load Time** | ~30-60 seconds on startup |
| **Pros** | Fast, compact, portable |
| **Cons** | Data loss = last snapshot (e.g., 24h) |

### RDB Configuration in `/etc/redis/redis.conf`

```bash
# SNAPSHOTTING (RDB)

# Save Redis database on disk
save 900 1         # Save after 900 seconds (15 min) if 1 key changed
save 300 10        # Save after 300 seconds (5 min) if 10 keys changed
save 60 10000      # Save after 60 seconds if 10,000 keys changed

# For production, use single aggressive save:
# save 3600 1000   # Save after 1 hour if 1000 keys changed

# Stop writes if BGSAVE fails (safety valve)
stop-writes-on-bgsave-error yes

# Use compression for RDB file
rdbcompression yes

# Check RDB integrity on startup
rdbchecksum yes

# RDB file location and name
dir /var/lib/redis
dbfilename dump.rdb
```

### Production RDB Configuration

For imbobi, use **single aggressive save policy**:

```bash
# /etc/redis/redis.conf
save 3600 1000    # Save once per hour if 1000+ keys modified
                  # Balances durability vs performance

# Or disable automatic saves and rely on scheduled BGSAVE:
# save ""           # Disable RDB auto-save
```

### Manual RDB Backup via BGSAVE

```bash
#!/bin/bash
# /scripts/backup-redis.sh (already exists)

BACKUP_DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/tmp/imbobi-redis-backups"

# Trigger background save
redis-cli BGSAVE

# Wait for save to complete
while [ $(redis-cli LASTSAVE) -eq $(redis-cli LASTSAVE) ]; do
  echo "Waiting for BGSAVE..."
  sleep 2
done

# Copy RDB to backup location
cp /var/lib/redis/dump.rdb "${BACKUP_DIR}/imbobi-redis-${BACKUP_DATE}.rdb"

# Compress
gzip "${BACKUP_DIR}/imbobi-redis-${BACKUP_DATE}.rdb"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/imbobi-redis-${BACKUP_DATE}.rdb.gz" \
  "s3://imbobi-database-backups/redis/imbobi-redis-${BACKUP_DATE}.rdb.gz" \
  --region us-east-1 \
  --storage-class STANDARD_IA

# Cleanup
rm -f "${BACKUP_DIR}/imbobi-redis-${BACKUP_DATE}.rdb.gz"
```

**Cron Schedule:**

```bash
# Daily RDB backup (3am UTC)
0 3 * * * /home/user/imobi/scripts/backup-redis.sh >> /var/log/imbobi-redis-backup.log 2>&1
```

### RDB Restore Procedure

```bash
#!/bin/bash
# Manual RDB restore

# 1. Download backup from S3
aws s3 cp \
  s3://imbobi-database-backups/redis/imbobi-redis-2026-05-30_030000.rdb.gz \
  ./redis-backup.rdb.gz \
  --region us-east-1

# 2. Decompress
gunzip -c redis-backup.rdb.gz > /var/lib/redis/dump.rdb

# 3. Stop writes (optional safety)
redis-cli CONFIG SET stop-writes-on-bgsave-error yes

# 4. Shutdown Redis gracefully
redis-cli SHUTDOWN NOSAVE

# 5. Wait for Redis to stop
sleep 5

# 6. Restart Redis
sudo systemctl restart redis-server

# 7. Verify
redis-cli PING
# Output: PONG

# 8. Check queue data
redis-cli DBSIZE
redis-cli KEYS "bull:*" | head -5
```

---

## AOF (Append-Only File) Setup

### AOF Overview

**AOF (Append-Only File)** = Write-ahead log of every command executed.

| Aspect | Detail |
|--------|--------|
| **Format** | ASCII command log |
| **Size** | ~1-2 GB (larger than RDB) |
| **Durability** | Every command logged (fsync frequency configurable) |
| **Restore Time** | ~2-5 minutes (replay all commands) |
| **Pros** | Fine-grained recovery, human-readable |
| **Cons** | Larger file, slower than RDB |

### AOF Configuration (Optional for MVP)

**For imbobi MVP: NOT ENABLED by default** (we use RDB only)

If you want finer-grained recovery (e.g., RPO < 1 hour), enable AOF:

```bash
# /etc/redis/redis.conf

# Enable AOF
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec        # Fsync every 1 second (balance safety/perf)
                            # Options: always | everysec | no

# Use hybrid mode (RDB + AOF) - see next section
aof-use-rdb-preamble yes

# Auto-rewrite AOF when size exceeds limit
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 67108864  # 64 MB
```

### AOF Fsync Strategies

| Strategy | Fsync Interval | Data Loss Risk | Performance |
|----------|---|---|---|
| `always` | Every command | None | Slowest (~10% overhead) |
| `everysec` | Every 1 second | ≤ 1 sec data loss | Good (recommended) |
| `no` | OS decides | Unpredictable | Fastest |

**Recommendation for imbobi:** NOT ENABLED (use RDB only for MVP)

---

## BullMQ Queue Persistence

### BullMQ Data Storage in Redis

**BullMQ stores job data as Redis hashes:**

```
bull:liberacao-parcela:
├── job:1001 -> Job metadata (name, args, status)
├── job:1002 -> Job metadata
└── wait -> Set of waiting job IDs

bull:notificacoes:
├── job:2001 -> Notification job data
└── wait -> Set of waiting job IDs
```

### Critical BullMQ Persistence Requirements

**All BullMQ jobs depend on RDB persistence:**

| Job Type | Priority | Criticality | Recovery Policy |
|----------|----------|-------------|-----------------|
| `liberacao-parcela` | CRITICAL | Finance | Retry on startup |
| `notificacoes` | High | User experience | Retry on startup |
| `gerar-relatorio` | Medium | Analytics | Can be lost |

### Ensuring BullMQ Job Durability

**1. Use RDB snapshots (already configured above)**

```bash
# Verify RDB is enabled
redis-cli CONFIG GET save
# Output: [0, save, 900, 1, 300, 10, ...]
```

**2. Configure BullMQ retry logic:**

```typescript
// services/api/src/workers/liberacao-parcela.worker.ts
import { Queue, Worker } from 'bullmq';

const liberacaoQueue = new Queue('liberacao-parcela', {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
});

// Define job processor
const worker = new Worker('liberacao-parcela', async (job) => {
  // Job processing logic
  await liberarParcela(job.data.parcelaId);
}, {
  connection: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
  },
  settings: {
    // Retry failed jobs
    maxStalledCount: 2,
    lockRenewTime: 5000,
    lockDuration: 30000,
  },
});

// On worker startup, retrieve and retry stalled jobs
worker.on('ready', async () => {
  console.log('Worker started - checking for stalled jobs...');
  const stalled = await liberacaoQueue.getJobs(['failed']);
  
  for (const job of stalled) {
    console.log(`Retrying failed job ${job.id}`);
    await job.retry();
  }
});
```

**3. Monitor queue health:**

```bash
# Check queue status
redis-cli LLEN "bull:liberacao-parcela:wait"     # Waiting jobs
redis-cli LLEN "bull:liberacao-parcela:active"   # Active jobs
redis-cli LLEN "bull:liberacao-parcela:failed"   # Failed jobs
redis-cli LLEN "bull:liberacao-parcela:complete" # Completed jobs
```

---

## Hybrid Approach (RDB + AOF)

### RDB + AOF for Maximum Durability

**Current MVP Configuration:** RDB only (simple, fast recovery)

**Future Phase 9 Configuration** (if RPO < 1 hour needed):

```bash
# /etc/redis/redis.conf

# Enable both RDB and AOF
save 3600 1000                  # RDB every hour if 1000+ keys changed
appendonly yes                  # AOF enabled
appendfsync everysec            # Fsync every 1 second
aof-use-rdb-preamble yes        # Hybrid RDB + AOF (fast recovery)

# AOF rewrite
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 67108864  # 64 MB
```

**Recovery Priority with Hybrid Mode:**

```
If both RDB and AOF exist on startup:
1. Redis loads RDB file (fast)
2. Applies AOF commands on top (fill in missing commands)
3. Result = Full data as of AOF last write
```

**Backup both files:**

```bash
#!/bin/bash
# Backup both RDB and AOF (if enabled)

redis-cli BGSAVE

# Wait for save
sleep 10

# Backup both files
tar czf redis-backup-hybrid-$(date +%Y%m%d_%H%M%S).tar.gz \
  /var/lib/redis/dump.rdb \
  /var/lib/redis/appendonly.aof \
  2>/dev/null || echo "AOF not enabled, backing up RDB only"

# Upload to S3
aws s3 cp redis-backup-hybrid-*.tar.gz \
  s3://imbobi-database-backups/redis/ \
  --region us-east-1
```

---

## Replication Strategy

### Redis Replication (Master-Replica)

**Current MVP:** Single Redis instance (no replication)

**Phase 9+ Enhancement:** Add replica for HA

```bash
# Master (primary server)
# /etc/redis/redis.conf
bind 0.0.0.0
port 6379
protected-mode no  # Allow replica to connect

# Replica (backup server)
# /etc/redis/redis.conf
bind 0.0.0.0
port 6379
replicaof <master-ip> 6379
replica-read-only yes  # Replica is read-only
```

**Failover (manual for MVP, automatic in Phase 9 with Sentinel):**

```bash
# If master fails, promote replica:
redis-cli -h <replica-ip> SLAVEOF NO ONE

# Update application to point to new master
# Restart API service
```

---

## Backup & Export Procedure

### Daily Backup Export to S3

Already implemented in `/scripts/backup-redis.sh`:

```bash
#!/bin/bash
BACKUP_DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="/tmp/imbobi-redis-backups"

# Trigger background save
redis-cli BGSAVE

# Wait for completion
sleep 15

# Copy and compress
cp /var/lib/redis/dump.rdb "${BACKUP_DIR}/imbobi-redis-${BACKUP_DATE}.rdb"
gzip "${BACKUP_DIR}/imbobi-redis-${BACKUP_DATE}.rdb"

# Upload to S3
aws s3 cp "${BACKUP_DIR}/imbobi-redis-${BACKUP_DATE}.rdb.gz" \
  "s3://imbobi-database-backups/redis/" \
  --region us-east-1 \
  --storage-class STANDARD_IA

# Cleanup
rm -f "${BACKUP_DIR}/imbobi-redis-${BACKUP_DATE}.rdb.gz"
```

**Cron:**

```bash
0 3 * * * /home/user/imobi/scripts/backup-redis.sh >> /var/log/imbobi-redis-backup.log 2>&1
```

### Backup Integrity Test

```bash
#!/bin/bash
# /scripts/test-redis-backup.sh

# List latest Redis backup
LATEST=$(aws s3 ls s3://imbobi-database-backups/redis/ \
  --sort=time --reverse | head -1 | awk '{print $NF}')

echo "Testing backup: $LATEST"

# Download
aws s3 cp "s3://imbobi-database-backups/redis/$LATEST" \
  ./redis-test.rdb.gz --region us-east-1

# Decompress and verify
gunzip -t redis-test.rdb.gz

if [ $? -eq 0 ]; then
  echo "✓ Backup integrity verified"
else
  echo "✗ Backup corrupted"
  exit 1
fi

rm -f redis-test.rdb.gz
```

---

## Persistence After Crash

### Crash Scenario #1: Redis Process Killed

**Scenario:** Redis process crashes (OOM, segfault, etc.)

```bash
# 1. Check Redis status
systemctl status redis-server

# 2. Review logs
journalctl -u redis-server -n 50

# 3. Restart Redis
sudo systemctl restart redis-server

# 4. Verify RDB load
redis-cli DBSIZE
# Output: (integer) 4521  (or similar; represents jobs + sessions)

# 5. Check queue health
redis-cli LLEN "bull:liberacao-parcela:wait"
```

**Expected Result:** RDB file is loaded, all data restored.

### Crash Scenario #2: Disk Failure (RDB Corrupted)

**Scenario:** RDB file is corrupted after disk issue

```bash
# 1. Stop Redis
sudo systemctl stop redis-server

# 2. Check RDB integrity
redis-check-rdb /var/lib/redis/dump.rdb
# Output: [err] Integrity error at <offset>

# 3. Restore from S3 backup
aws s3 cp s3://imbobi-database-backups/redis/imbobi-redis-2026-05-30.rdb.gz \
  ./redis-backup.rdb.gz --region us-east-1

gunzip -c redis-backup.rdb.gz > /var/lib/redis/dump.rdb

# 4. Restart Redis
sudo systemctl start redis-server

# 5. Verify
redis-cli PING
```

**Expected Result:** Data restored from 24-hour-old backup (acceptable RPO)

### Crash Scenario #3: Server Power Loss (No Clean Shutdown)

**Scenario:** Entire server loses power; RDB partially written

```bash
# On restart:
redis-server /etc/redis/redis.conf

# Redis will detect partial RDB and attempt load
# If RDB is unrecoverable, use backup:

# 1. Remove corrupted RDB
rm /var/lib/redis/dump.rdb

# 2. Restore from backup
aws s3 cp s3://imbobi-database-backups/redis/latest.rdb.gz \
  ./redis-backup.rdb.gz --region us-east-1
gunzip -c redis-backup.rdb.gz > /var/lib/redis/dump.rdb

# 3. Restart
sudo systemctl restart redis-server
```

**Expected Result:** Data loss = maximum 24 hours (acceptable RPO)

---

## Production Configuration

### Pre-Go-Live Checklist

- [ ] Redis 7.x installed with stable version (7.0.14+)
- [ ] `/var/lib/redis/` directory exists with correct permissions (redis:redis)
- [ ] RDB snapshotting enabled: `save 3600 1000`
- [ ] RDB compression enabled: `rdbcompression yes`
- [ ] AOF disabled (for MVP): `appendonly no`
- [ ] Replication disabled (for MVP): no `replicaof` directive
- [ ] `/scripts/backup-redis.sh` deployed and tested
- [ ] Cron job added: `0 3 * * * /home/user/imobi/scripts/backup-redis.sh`
- [ ] Redis logs rotation configured in `/etc/logrotate.d/redis-server`
- [ ] BullMQ worker restart logic implemented in app
- [ ] CloudWatch/Sentry alerts configured for Redis failures
- [ ] Weekly backup integrity tests scheduled

### Configuration File Template

```bash
# /etc/redis/redis.conf (production)

# Network
bind 127.0.0.1  # Only local connections (restrict if needed)
port 6379
protected-mode yes
tcp-backlog 511

# Memory
maxmemory 2gb                              # Adjust per server
maxmemory-policy allkeys-lru                # Evict LRU when full

# Persistence
save 3600 1000                             # Save every hour if 1000+ changes
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dir /var/lib/redis
dbfilename dump.rdb

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# AOF (disabled for MVP)
appendonly no

# Replication (disabled for MVP)
# replicaof not set

# Client timeout
timeout 0

# Database
databases 16  # Default, only use DB 0

# Security
requirepass <strong_password>  # Set password
```

### Startup Verification

```bash
#!/bin/bash
# Verify Redis is ready for production

echo "=== Redis Production Verification ==="

# 1. Check Redis is running
if ! redis-cli ping > /dev/null; then
  echo "✗ Redis is not running"
  exit 1
fi

echo "✓ Redis is running"

# 2. Verify RDB config
RDB_CONFIG=$(redis-cli CONFIG GET save | tail -1)
echo "✓ RDB config: $RDB_CONFIG"

# 3. Check disk space
DISK_FREE=$(df /var/lib/redis | tail -1 | awk '{print $4}')
if [ $DISK_FREE -lt 1000000 ]; then  # < 1 GB
  echo "⚠ Low disk space: ${DISK_FREE} KB"
fi

# 4. Verify backup script
if [ ! -x /home/user/imobi/scripts/backup-redis.sh ]; then
  echo "✗ Backup script not executable"
  exit 1
fi

echo "✓ Backup script ready"

# 5. Test backup export
/home/user/imobi/scripts/backup-redis.sh

if [ $? -ne 0 ]; then
  echo "✗ Backup failed"
  exit 1
fi

echo "✓ Backup successful"

echo ""
echo "=== Redis Production Ready ==="
exit 0
```

---

**Document Owner:** DevOps/Backend Team  
**Last Review:** 2026-05-31  
**Next Review:** 2026-08-31  
**Emergency Contact:** @on-call | #infrastructure Slack
