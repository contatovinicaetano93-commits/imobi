# imobi Production Infrastructure — Technical Setup Guide

**Purpose**: Detailed technical reference for PostgreSQL + Redis setup  
**Date**: 2026-05-30  
**Audience**: DevOps / Infrastructure Engineers

---

## PostgreSQL Production Setup (Step 4 Detailed)

### Architecture Overview

```
┌─────────────────────────────────────┐
│  Vercel (Next.js Frontend + API)   │
└──────────┬──────────────────────────┘
           │ DATABASE_URL
           ↓
┌─────────────────────────────────────┐
│  PostgreSQL 15+ with PostGIS 3.x    │
│  ├─ Public schema (app tables)      │
│  ├─ auth schema (authentication)    │
│  ├─ spatial indices (GPS locations) │
│  └─ Automated backups (daily RDS)   │
└─────────────────────────────────────┘
```

### Provider Comparison

#### Railway (RECOMMENDED for MVP)
**Pros**:
- PostGIS pre-installed
- Automatic backups (7+ days)
- Simple connection string
- Scales with application
- $9/month base tier

**Setup**:
```bash
# 1. Sign up: https://railway.app (via GitHub)
# 2. New project → Add Service → PostgreSQL
# 3. Config:
#    - Database: imbobi_prod
#    - User: imbobi
#    - Password: [generate strong password]
#    - Region: us-east-1 (match Vercel)
# 4. Auto-created connection string:
#    postgresql://imbobi:PASSWORD@db.railway.app:5432/imbobi_prod
```

#### Supabase (All-in-one alternative)
**Pros**:
- PostgreSQL + PostGIS + Auth + Real-time
- Free tier 500MB storage
- Built-in UI for database management

**Setup**:
```bash
# 1. Sign up: https://supabase.io
# 2. New project → Select PostgreSQL 15
# 3. Enable PostGIS extension in SQL editor:
#    CREATE EXTENSION postgis;
# 4. Connection string in Settings → Database
```

#### AWS RDS (Enterprise option)
**Pros**:
- Enterprise SLA, Multi-AZ failover
- AWS ecosystem integration

**Cons**:
- Higher cost (~$50+/month)
- More complex setup

### Database Schema & Migrations

#### Migrations Location
```
services/api/prisma/migrations/
├── 0_init/
│   ├── migration.sql (PostGIS setup, base schema)
│   └── (created timestamp)
├── 1_auth/
│   └── migration.sql (authentication tables)
├── 2_properties/
│   └── migration.sql (property listings)
├── 3_work_orders/
│   └── migration.sql (work orders, payments)
├── 4_gps_validation/
│   └── migration.sql (PostGIS indices)
└── migration_lock.toml
```

#### Migration Execution Command

```bash
# Environment variable setup
export DATABASE_URL="postgresql://imbobi:PASSWORD@db.railway.app:5432/imbobi_prod"

# Option 1: From root (recommended)
cd /home/user/imobi
pnpm db:migrate -- --skip-generate

# Option 2: From API service
cd /home/user/imobi/services/api
npx prisma migrate deploy --skip-generate

# Option 3: With verbose logging
DATABASE_URL=$DATABASE_URL \
  npx prisma migrate deploy --skip-generate --verbose
```

#### Expected Migration Output
```
Environment variables loaded from .env.production
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL at "db.railway.app:5432"

✓ Migrations to apply:
  001_init
  002_auth
  003_properties
  004_work_orders
  005_gps_validation

✓ 5/5 migrations applied successfully
```

### PostGIS Configuration

#### Enable PostGIS Extension

```sql
-- Connect to database:
-- psql postgresql://imbobi:PASSWORD@db.railway.app:5432/imbobi_prod

-- Enable PostGIS:
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Verify installation:
SELECT postgis_version();
-- Expected: "3.4.0 USE GEOS 3.11.1 PROJ 9.1.1" (or similar 3.x version)

-- Check extension list:
SELECT * FROM pg_extension WHERE extname LIKE 'postgis%';
```

#### Spatial Index Setup (Critical for GPS queries)

```sql
-- Indices created by migration 005_gps_validation:

-- Index for property location queries
CREATE INDEX idx_properties_location_gist 
  ON properties USING GIST (location);

-- Index for work order geospatial queries
CREATE INDEX idx_work_orders_location_gist 
  ON work_orders USING GIST (location);

-- Index for address fuzzy search
CREATE INDEX idx_properties_address_trgm 
  ON properties USING GIN (address gin_trgm_ops);

-- Verify indices exist:
SELECT tablename, indexname FROM pg_indexes 
  WHERE indexname LIKE '%gist%' OR indexname LIKE '%location%';
```

### Connection String Formats

```bash
# Standard PostgreSQL
postgresql://user:password@host:port/database

# With SSL requirement
postgresql://user:password@host:port/database?sslmode=require

# With connection pooling (via Prisma)
postgresql://user:password@host:port/database?schema=public&sslmode=require

# Railway example
postgresql://imbobi:abc123def456@db.railway.app:5432/imbobi_prod

# Supabase example
postgresql://postgres:abc123def456@db.supabase.co:5432/postgres

# Using env var in .env.production
DATABASE_URL="postgresql://imbobi:${DB_PASSWORD}@${DB_HOST}:5432/imbobi_prod"
```

### Backup Strategy

#### Automatic Backups (Built-in)
- **Railway**: Daily automated backups, 7+ day retention
- **Supabase**: Daily automated backups, 30-day retention
- **AWS RDS**: Configurable (default: 7 days)

#### Manual Backup

```bash
# Create backup
pg_dump "$DATABASE_URL" \
  --format=custom \
  --file=imbobi_prod_backup_$(date +%Y%m%d_%H%M%S).dump

# Compress backup
gzip imbobi_prod_backup_*.dump

# Upload to S3
aws s3 cp imbobi_prod_backup_*.dump.gz \
  s3://imobi-backups-prod/database/ \
  --storage-class GLACIER
```

#### Restore from Backup

```bash
# From Railway console or local
pg_restore \
  --dbname="$DATABASE_URL" \
  --no-owner \
  --role=imbobi \
  imbobi_prod_backup_20260530.dump
```

### Monitoring & Maintenance

#### Health Check Query

```bash
# From API or local psql:
psql "$DATABASE_URL" -c "
  SELECT 
    'database' as component,
    'ok' as status,
    now() as checked_at,
    (SELECT count(*) FROM properties) as property_count,
    (SELECT count(*) FROM work_orders) as work_order_count,
    (SELECT count(*) FROM users) as user_count;
"
```

#### Connection Pooling (via Prisma)

```javascript
// In services/api/src/prisma.module.ts
const datasource = {
  // Connection pooling for 20 concurrent connections
  url: process.env.DATABASE_URL + '?schema=public',
  // Pool settings
  connection_limit: 20,
  pool_timeout: 10,
  // Query timeout
  statement_cache_size: 20,
};
```

#### Performance Monitoring

```sql
-- View active connections:
SELECT pid, usename, state, query 
FROM pg_stat_activity 
WHERE datname = 'imbobi_prod';

-- View long-running queries (> 5min):
SELECT pid, usename, state_change, query 
FROM pg_stat_activity 
WHERE state != 'idle' 
  AND state_change < now() - interval '5 minutes';

-- View table sizes:
SELECT 
  schemaname, 
  tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname != 'pg_catalog'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Redis Production Setup (Step 5 Detailed)

### Architecture Overview

```
┌──────────────────────────────────────┐
│  Vercel API (NestJS + BullMQ)       │
├──────────────────────────────────────┤
│  REDIS_HOST + REDIS_PORT             │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│  Redis 6.0+ (Serverless or Managed) │
│  ├─ Cache layer (TTL=5min)           │
│  ├─ BullMQ job queue                 │
│  │  └─ liberacao-parcela worker      │
│  ├─ Session storage (optional)       │
│  └─ Real-time data sync (optional)   │
└──────────────────────────────────────┘
```

### Provider Comparison

#### Upstash (RECOMMENDED for Vercel)
**Pros**:
- Serverless (auto-scaling)
- Perfect for Vercel integration
- 30MB free tier for testing
- Global redundancy
- REST API fallback

**Setup**:
```bash
# 1. Sign up: https://upstash.com (via GitHub)
# 2. New Redis database → Free tier
# 3. Config:
#    - Name: imbobi-prod
#    - Region: US-East (match Vercel)
#    - Eviction: LRU (least recently used)
#    - Persistence: RDB enabled
# 4. Connection string:
#    redis://:upstash-password@upstash-host:38571
```

#### Railway Redis
**Pros**:
- Same provider as PostgreSQL
- Simple unified management
- 512MB free tier

**Setup**:
```bash
# 1. Same Railway project as PostgreSQL
# 2. Add Service → Redis
# 3. Config:
#    - Version: Latest (7.x)
#    - Memory: 2GB+ for production
# 4. Auto-created connection:
#    redis://:PASSWORD@redis.railway.internal:6379
```

#### Redis Cloud (Enterprise)
**Pros**:
- Managed service with SLA
- Multi-region replication
- Built-in monitoring

**Cons**:
- Higher cost ($20+/month)
- Over-engineered for MVP

### Connection String Formats

```bash
# Basic (no authentication)
redis://host:6379

# With password
redis://:password@host:6379

# With username + password (Redis 6+)
redis://username:password@host:6379

# With database number
redis://:password@host:6379/0

# TLS/SSL secure
rediss://:password@host:6379

# Upstash example
redis://:eyjhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9@upstash.io:38571

# Railway example
redis://:abc123def456@prod-redis.railway.internal:6379
```

### BullMQ Configuration

#### Queue Initialization

```typescript
// File: services/api/src/workers/liberacao-parcela.worker.ts
import { Queue, QueueScheduler, Worker } from 'bullmq';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  // Connection pooling
  lazyConnect: true,
  reconnectOnError: (err) => {
    return err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND';
  },
});

const liberacaoPacelQueue = new Queue('liberacao-parcela', {
  connection: redis,
  // Concurrency settings
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const worker = new Worker('liberacao-parcela', async (job) => {
  // Process payment release
  const { parcelaId } = job.data;
  // ... implementation
}, {
  connection: redis,
  concurrency: 10, // Process 10 jobs in parallel
});
```

#### Job Monitoring

```javascript
// View queue stats
async function getQueueStats(queueName) {
  const redis = new Redis(process.env.REDIS_URL);
  const queue = new Queue(queueName, { connection: redis });
  
  return {
    waiting: await queue.getWaitingCount(),
    active: await queue.getActiveCount(),
    delayed: await queue.getDelayedCount(),
    failed: await queue.getFailedCount(),
    completed: await queue.getCompletedCount(),
  };
}

// Expected output during production:
// {
//   waiting: 0-100,     // Jobs waiting to be processed
//   active: 0-10,       // Currently processing (concurrency=10)
//   delayed: 0-50,      // Scheduled for later
//   failed: 0,          // Should be low/zero
//   completed: 1000+,   // Cumulative success count
// }
```

### Cache Configuration

#### TTL Strategy

```typescript
// File: services/api/src/cache.service.ts
export class CacheService {
  // Cache durations by data type
  private readonly TTL = {
    PROPERTY: 300,           // 5 minutes
    PROPERTY_SEARCH: 300,    // 5 minutes (short due to frequent updates)
    USER_PROFILE: 600,       // 10 minutes
    AUTH_TOKEN: 900,         // 15 minutes
    WORK_ORDER: 300,         // 5 minutes
    PAYMENT_STATUS: 60,      // 1 minute (critical for accuracy)
    LOCATION_CACHE: 1800,    // 30 minutes (GPS data changes less)
  };

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set<T>(
    key: string,
    value: T,
    type: keyof typeof this.TTL = 'PROPERTY',
  ): Promise<void> {
    await this.redis.setex(
      key,
      this.TTL[type],
      JSON.stringify(value),
    );
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

#### Cache Invalidation Strategy

```typescript
// Invalidate on data changes
async updateProperty(id: string, data: PropertyUpdateDTO) {
  const property = await this.prisma.property.update({
    where: { id },
    data,
  });

  // Invalidate related caches
  await this.cache.invalidate(`property:${id}:*`);
  await this.cache.invalidate(`properties:search:*`);
  await this.cache.invalidate(`user:${property.userId}:properties`);

  return property;
}
```

### Connection Testing

#### Redis CLI Commands

```bash
# Test connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS ping
# Expected: PONG

# Check memory usage
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS info memory
# Expected: used_memory, max_memory values

# View all keys (caution: huge datasets)
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS keys '*' | head -20

# Monitor queue stats
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS \
  LRANGE "bull:liberacao-parcela:wait" 0 10

# View cache hit ratio
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS info stats
```

#### From API (Health Check)

```bash
curl -X GET https://api.imbobi.com.br/health \
  -H "Accept: application/json"

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-05-30T16:00:00.000Z",
  "database": {
    "status": "connected",
    "latency_ms": 2
  },
  "redis": {
    "status": "connected",
    "latency_ms": 1,
    "memory_used_mb": 45,
    "queue_stats": {
      "liberacao-parcela": {
        "waiting": 5,
        "active": 3,
        "failed": 0
      }
    }
  },
  "s3": {
    "status": "reachable",
    "latency_ms": 150
  }
}
```

### Persistence Configuration

#### RDB (Snapshot-based)
```bash
# Redis configuration
save 900 1          # Save if 1 key changed in 900s
save 300 10         # Save if 10 keys changed in 300s
save 60 10000       # Save if 10000 keys changed in 60s
appendonly no       # Disable AOF for simplicity
```

#### AOF (Append-only file)
```bash
# Alternative: record every command
appendonly yes
appendfsync everysec    # Fsync every second (balance)
```

**Recommendation**: RDB for MVP (simpler, faster), migrate to AOF as volume grows.

### Monitoring & Alerts

#### Key Metrics to Monitor

```javascript
// Monitor these metrics in production
const RedisMetrics = {
  memory_used: '< 80% of max_memory',
  connected_clients: '< 50 for small deployments',
  rejected_connections: '= 0 (indicates capacity issue)',
  evicted_keys: '< 5 per minute (indicates memory pressure)',
  keyspace_hits: '> 80% (cache efficiency)',
  expired_keys: '< 10% of total (normal TTL cleanup)',
};
```

#### Setup Monitoring Alert

```bash
# Example: CloudWatch alarm (if using AWS)
# Alert when memory usage > 80%
aws cloudwatch put-metric-alarm \
  --alarm-name redis-memory-high \
  --metric-name DatabaseMemoryUsagePercentage \
  --namespace AWS/ElastiCache \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

---

## Final Integration Checklist

After PostgreSQL and Redis setup complete:

```bash
# 1. Verify both services accessible from API
curl https://api.imbobi.com.br/health

# 2. Run complete test suite
cd /home/user/imobi
pnpm test

# 3. Check database schema
psql $DATABASE_URL -c "\dt" | head -20

# 4. Check Redis queue
redis-cli -h $REDIS_HOST -p $REDIS_PORT \
  LLEN "bull:liberacao-parcela:wait"

# 5. Deploy to Vercel
git push origin main
# Monitor: https://vercel.com/dashboard
```

---

**Last Updated**: 2026-05-30  
**Version**: 1.0
