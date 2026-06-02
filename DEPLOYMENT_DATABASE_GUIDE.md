# imobi Database & Cache Setup Guide for Render Staging

**Created:** 2026-06-02  
**Environment:** Render.com Staging Deployment  
**Tech Stack:** PostgreSQL 14+ | Redis 7+ | Prisma ORM

---

## Overview

This guide covers setting up PostgreSQL database and Redis cache infrastructure for imobi staging environment on Render.com. Both services are critical for the application:

- **PostgreSQL:** Application data store with PostGIS extension for location validation
- **Redis:** Caching layer and BullMQ job queue for asynchronous processes (especially `liberacao-parcela` worker)

---

## Part 1: PostgreSQL Database Setup on Render

### 1.1 Create PostgreSQL Instance on Render

**Steps:**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Database** → **PostgreSQL**
3. Configure:
   - **Name:** `imobi-staging-db`
   - **Database:** `imobi_staging`
   - **User:** `imobi_staging` (avoid root-level users)
   - **Region:** Same as API service (e.g., `us-east-1` or `sa-east-1` for latency)
   - **PostgreSQL Version:** 14 or higher (recommend 16)
   - **Plan:** Starter or Standard (depends on staging load)

4. Click **Create Database**

### 1.2 Retrieve PostgreSQL Connection Details

After creation, Render displays the connection string:

```
postgresql://imobi_staging:[password]@[host]:[port]/imobi_staging?sslmode=require
```

**Extract and save:**

| Component | Example | Purpose |
|-----------|---------|---------|
| **Host** | `dpg-abc123.render.com` | Database hostname |
| **Port** | `5432` | Default PostgreSQL port |
| **Database** | `imobi_staging` | Database name |
| **User** | `imobi_staging` | Database user |
| **Password** | `[auto-generated]` | Authentication password |

### 1.3 Configure DATABASE_URL Environment Variable

In Render dashboard, set the environment variable:

```bash
DATABASE_URL="postgresql://imobi_staging:[password]@[host]:5432/imobi_staging?sslmode=require"
```

**Why the parameters:**
- `sslmode=require`: Enforce SSL/TLS encryption (Render requirement for remote connections)
- Query parameters ensure Prisma compatibility with Render's managed PostgreSQL

### 1.4 PostgreSQL Configuration Best Practices

Render's managed PostgreSQL comes pre-configured, but verify:

```bash
# Available on Render dashboard under "Metrics" tab
Max Connections: 200+ (default usually sufficient)
Shared Buffers: 256MB (default OK for staging)
```

---

## Part 2: Redis Cache Setup on Render

### 2.1 Create Redis Instance on Render

**Steps:**

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Redis**
3. Configure:
   - **Name:** `imobi-staging-redis`
   - **Region:** Same as PostgreSQL/API (important for latency)
   - **Version:** 7 or higher
   - **Plan:** Starter or Standard

4. Click **Create**

### 2.2 Retrieve Redis Connection Details

Render provides:

```
redis://:password@host:port
```

**Extract and save:**

| Component | Example | Purpose |
|-----------|---------|---------|
| **Host** | `redis-abc123.render.com` | Redis hostname |
| **Port** | `6379` | Default Redis port |
| **Password** | `[auto-generated]` | Authentication |

### 2.3 Configure REDIS_URL Environment Variable

For imobi, Redis is accessed via two formats depending on the client:

**Option A: Single URL (Recommended)**

```bash
REDIS_URL="redis://:password@host:port"
```

**Option B: Separate variables (if API requires)**

```bash
REDIS_HOST="redis-abc123.render.com"
REDIS_PORT="6379"
REDIS_PASSWORD="[auto-generated-password]"
```

Check `services/api/.env.example` — imobi currently uses **Option B** (separate variables).

### 2.4 Redis Usage in imobi

Redis serves two critical functions:

1. **Caching** (5-minute TTL)
   - User authentication tokens
   - Obra/etapa metadata
   - Score calculations

2. **BullMQ Job Queue**
   - `liberacao-parcela` worker: Asynchronous credit release processing
   - Notification dispatching
   - Retry mechanism for failed jobs

---

## Part 3: Database Migrations

### 3.1 Pre-Migration Checklist

Before running migrations, ensure:

- [ ] PostgreSQL instance is healthy (check Render dashboard "Metrics")
- [ ] `DATABASE_URL` environment variable is set in Render
- [ ] API service can reach the database (test connection first)
- [ ] All migration files exist: `/services/api/prisma/migrations/`

### 3.2 Current Migration History

imobi has 6 migration steps:

```
0_init/                          → Core schema (users, credits, obras, etc.)
1_add_notifications/             → Notificacao table
2_add_kyc_documents/             → KycDocumento table + soft delete on Usuario
3_add_performance_indexes/       → Performance indexes on hot queries
20260529172221_add_analytics_event → AnalyticsEvent table
20260529224517_add_soft_delete_and_job_falha → JobFalha tracking
```

**Total tables created:** 13 core + 3 junction/tracking = 16 tables

### 3.3 Running Migrations on Render

**Option A: Via Render Deployment (Recommended)**

Add to your `render.yaml` or deployment script:

```yaml
# In render.yaml under 'api' service:
build:
  command: "pnpm install && pnpm db:generate && pnpm db:migrate"
```

**Option B: Manual Migration (if needed for troubleshooting)**

```bash
# SSH into Render deployment or run build command:
export DATABASE_URL="postgresql://imobi_staging:password@host:5432/imobi_staging?sslmode=require"

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Output should show:
# ✓ 0_init
# ✓ 1_add_notifications
# ✓ 2_add_kyc_documents
# ✓ 3_add_performance_indexes
# ✓ 20260529172221_add_analytics_event
# ✓ 20260529224517_add_soft_delete_and_job_falha
```

### 3.4 Verify Migration Success

Check database tables:

```bash
# List all tables (via Render console or psql)
\dt

# Expected output:
# Schema |         Name          | Type  |  Owner
# ┌──────┼───────────────────────┼───────┼─────────────┐
# │ public│ usuario               │ table │ imobi_staging
# │ public│ sessaotoken           │ table │ imobi_staging
# │ public│ credito               │ table │ imobi_staging
# │ public│ obra                  │ table │ imobi_staging
# │ public│ etapaobra             │ table │ imobi_staging
# │ public│ evidenciaetapa        │ table │ imobi_staging
# │ public│ liberacaoparcela      │ table │ imobi_staging
# │ public│ scorehistorico        │ table │ imobi_staging
# │ public│ kycdocumento          │ table │ imobi_staging
# │ public│ notificacao           │ table │ imobi_staging
# │ public│ jobfalha              │ table │ imobi_staging
# │ public│ analyticsevent        │ table │ imobi_staging
# │ public│ usuario_fcm_tokens    │ table │ imobi_staging
# └──────┴───────────────────────┴───────┴─────────────┘

# Check migration status
pnpm prisma migrate status
```

---

## Part 4: Testing Database Connections

### 4.1 Test PostgreSQL Connection from API

In your API service, verify connection:

```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection via Prisma
pnpm prisma db execute --stdin << 'EOF'
SELECT version();
EOF

# Expected: PostgreSQL version info
```

### 4.2 Test Redis Connection from API

Verify Redis is reachable:

```bash
# From API service directory
node -e "
  const redis = require('redis');
  const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  });
  client.on('connect', () => {
    console.log('✓ Redis connected');
    process.exit(0);
  });
  client.on('error', (err) => {
    console.error('✗ Redis error:', err);
    process.exit(1);
  });
"
```

### 4.3 Connect to Prisma Studio (for UI browsing)

Once deployed, access Prisma Studio:

```bash
# From local development or Render SSH:
DATABASE_URL="postgresql://imobi_staging:password@host:5432/imobi_staging" \
  pnpm prisma:studio

# Opens at http://localhost:5555
# Browse all tables, create/edit/delete records
```

---

## Part 5: Environment Variable Mapping

### 5.1 Complete Environment Variable Reference

Create this table in your Render dashboard environment settings:

| Service | Variable | Value | Source |
|---------|----------|-------|--------|
| **API** | `DATABASE_URL` | `postgresql://imobi_staging:...@host:5432/imobi_staging?sslmode=require` | PostgreSQL instance |
| **API** | `REDIS_HOST` | `redis-abc123.render.com` | Redis instance |
| **API** | `REDIS_PORT` | `6379` | Redis instance (default) |
| **API** | `REDIS_PASSWORD` | `[auto-generated]` | Redis instance |
| **API** | `JWT_SECRET` | Min 64 random chars | Generate below |
| **API** | `ENCRYPTION_KEY` | 32-byte base64 | Generate below |
| **API** | `NODE_ENV` | `staging` | Deployment config |
| **API** | `PORT` | `4000` | Standard port |
| **API** | `CORS_ORIGIN` | `https://[web-url].onrender.com` | Web service URL |
| **Web** | `NEXT_PUBLIC_API_URL` | `https://[api-url].onrender.com/api/v1` | API service URL |
| **Web** | `NODE_ENV` | `production` | Build optimization |

### 5.2 Generate Secure JWT_SECRET and ENCRYPTION_KEY

**JWT_SECRET (min 64 chars):**

```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Output example:
# rJ9k2L7mQ3xV5nW8pYaB1cD4eF6gH7iJ8kL9mN0oP1qR2sT3uV4wX5yZ6aB7cD8eF

# Option 2: OpenSSL
openssl rand -base64 48

# Verify length >= 64
```

**ENCRYPTION_KEY (32 bytes base64):**

```bash
# Option 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Output example (always 44 chars base64):
# D+Tq00RvRIfTL66ZbEnn7iAEryHRVyYLuCfUzY49pJM=

# Option 2: OpenSSL
openssl rand -base64 32

# Verify length is exactly 44 chars
```

---

## Part 6: Credentials Management

### 6.1 Database User Security

**Create a staging-specific user (NOT root):**

```sql
-- Via Render PostgreSQL console:
CREATE ROLE imobi_staging WITH LOGIN PASSWORD '[strong-password]';
ALTER ROLE imobi_staging CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE imobi_staging TO imobi_staging;
```

**Principle:** Limit staging user to staging database only.

### 6.2 Password Policies

| Credential | Policy | Rotation |
|-----------|--------|----------|
| Database password | Min 32 chars, mixed case + numbers + symbols | Every 90 days |
| Redis password | Auto-generated by Render (>= 32 chars) | Every 90 days |
| JWT_SECRET | Min 64 chars, cryptographically random | On key compromise |
| ENCRYPTION_KEY | Exactly 32 bytes base64 (44 chars) | On key compromise |

### 6.3 Secure Storage (NEVER in git)

**❌ DO NOT:**
```bash
# WRONG - credentials in git
DATABASE_URL="postgresql://user:password@host/db" → commit to .env
export REDIS_PASSWORD="..." → commit to .env.local
```

**✓ DO:**
```bash
# RIGHT - credentials in Render dashboard only
1. Go to Render Dashboard → Service → Environment
2. Add DATABASE_URL, REDIS_HOST, REDIS_PASSWORD, etc.
3. These are encrypted and never appear in logs/git
4. Rotate regularly via dashboard
```

**Verification:**
```bash
# In .gitignore:
.env
.env.local
.env.*.local
services/api/.env
apps/web/.env

# Check git history:
git log --all -- "*.env" # Should return nothing
```

---

## Part 7: Health Checks & Monitoring

### 7.1 API Health Endpoint

imobi includes health check endpoint (used by Render):

```bash
curl https://[api-url].onrender.com/api/v1/health

# Expected 200 response:
# {
#   "status": "ok",
#   "database": "connected",
#   "redis": "connected",
#   "timestamp": "2026-06-02T10:30:45.123Z"
# }
```

### 7.2 PostgreSQL Monitoring

In Render Dashboard → Database → Metrics:

| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| **Connections** | < 50% max | > 80% max connections |
| **CPU** | < 50% | > 80% sustained |
| **Memory** | < 70% | > 85% |
| **Disk** | < 70% | > 80% |
| **Query Performance** | < 500ms avg | > 1000ms avg |

**Set up alerts:**
1. Render Dashboard → Settings → Alerting
2. Add email for: CPU > 80%, Disk > 80%, Down

### 7.3 Redis Monitoring

In Render Dashboard → Redis → Metrics:

| Metric | Healthy Range | Alert Threshold |
|--------|---------------|-----------------|
| **Memory Usage** | < 70% | > 85% |
| **Connected Clients** | Stable | Sudden spikes |
| **Evictions** | 0 | Any |
| **Uptime** | Continuous | Unexpected restarts |

**Common issues:**
- **High memory:** Cached data not expiring (check TTL settings, default 5 min)
- **Connection failures:** Check REDIS_PASSWORD, firewall rules
- **Slow commands:** Monitor via `INFO commandstats`

### 7.4 Logs to Monitor

**PostgreSQL slow queries:**
```bash
# Render console
SELECT query, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 5;
```

**Redis memory issues:**
```bash
redis-cli INFO memory
# Look for: used_memory_peak, evicted_keys
```

---

## Part 8: Backup & Recovery

### 8.1 Enable PostgreSQL Automated Backups

In Render Dashboard → Database → Settings:

```
Automated Backups: ENABLED
Backup Frequency: Daily (minimum for staging)
Retention: 7 days (staging) or 30 days (recommended)
```

**Verify:**
```
Render Dashboard → Database → Backups tab
Shows daily backup snapshots
```

### 8.2 Manual PostgreSQL Backup

If needed before major migration:

```bash
# From Render PostgreSQL console:
pg_dump imobi_staging -U imobi_staging -h [host] > backup_2026-06-02.sql

# Restore (if needed):
psql -U imobi_staging -h [host] imobi_staging < backup_2026-06-02.sql
```

### 8.3 Point-in-Time Recovery (PITR)

Render PostgreSQL supports PITR:

```
1. Go to Database → Backups
2. Click "Restore from backup"
3. Select timestamp within 7-day window
4. Creates new database instance
5. Test, then promote if successful
```

### 8.4 Redis Data Persistence

Redis on Render has RDB (Redis Database) snapshots:

```bash
# Check persistence config
redis-cli CONFIG GET save

# Shows: "3600 1" = save if 1 change in 3600 seconds
# Sufficient for staging cache (non-critical data)
```

---

## Part 9: Deployment Checklist

Before going live with staging deployment:

### Pre-Deployment

- [ ] PostgreSQL instance created on Render
- [ ] Redis instance created on Render (same region as API)
- [ ] `DATABASE_URL` set in Render environment (copied from PostgreSQL instance)
- [ ] `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` set in Render environment
- [ ] `JWT_SECRET` generated (min 64 chars) and set
- [ ] `ENCRYPTION_KEY` generated (32-byte base64) and set
- [ ] Database user created (not root, staging-specific)
- [ ] Firewall rules allow API service to reach both instances
- [ ] SSL/TLS enabled for PostgreSQL (`sslmode=require`)

### Deployment

- [ ] API service deployed with environment variables
- [ ] Migrations run successfully (all 6 migrations applied)
- [ ] API health endpoint returns `"status": "ok"`
- [ ] Database tables exist: `\dt` shows 13 core tables
- [ ] Redis connection works: `redis-cli PING` returns PONG
- [ ] Web service deployed with `NEXT_PUBLIC_API_URL` set

### Post-Deployment

- [ ] Seed initial data (optional): `pnpm seed`
- [ ] Test API endpoints (create user, login, create obra)
- [ ] Test BullMQ job queue (trigger liberacao-parcela worker)
- [ ] Verify email notifications send correctly
- [ ] Monitor database connections and Redis memory
- [ ] Set up monitoring alerts in Render dashboard
- [ ] Enable automated PostgreSQL backups
- [ ] Document all credentials in secure location (password manager, not git)

---

## Part 10: Troubleshooting

### 10.1 PostgreSQL Connection Errors

**Error:** `ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:5432`

```bash
# Cause: DATABASE_URL pointing to localhost
# Fix: Use Render host (e.g., dpg-abc123.render.com)
# Verify:
echo $DATABASE_URL
# Should contain render.com hostname, not localhost
```

**Error:** `SSL error: CERTIFICATE_VERIFY_FAILED`

```bash
# Cause: sslmode not set to 'require'
# Fix: Append to DATABASE_URL:
# ?sslmode=require
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**Error:** `password authentication failed`

```bash
# Cause: Wrong password in DATABASE_URL
# Fix: 
# 1. Go to Render Dashboard → Database → Connection
# 2. Copy full connection string
# 3. Paste into DATABASE_URL environment variable
```

### 10.2 Redis Connection Errors

**Error:** `ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:6379`

```bash
# Cause: REDIS_HOST pointing to localhost
# Fix: Use Render Redis host
REDIS_HOST="redis-abc123.render.com"
REDIS_PORT="6379"
REDIS_PASSWORD="[from-render-dashboard]"
```

**Error:** `Redis error: NOAUTH Authentication required`

```bash
# Cause: REDIS_PASSWORD not set or incorrect
# Fix: Copy password from Render Redis instance details
```

### 10.3 Migration Errors

**Error:** `Error: P3005 - Database does not exist`

```bash
# Cause: DATABASE_URL points to wrong database
# Fix: Ensure database name is 'imobi_staging'
# Correct: postgresql://user:pass@host:5432/imobi_staging
# Wrong: postgresql://user:pass@host:5432/postgres
```

**Error:** `Error: P3006 - PostGIS extension not found`

```bash
# Cause: PostGIS not installed on Render PostgreSQL
# Fix: Create extension via SQL
psql -U imobi_staging -h [host] imobi_staging -c "CREATE EXTENSION postgis;"

# Check if installed:
SELECT extname FROM pg_extension WHERE extname = 'postgis';
```

### 10.4 BullMQ Job Queue Issues

**Issue:** Jobs not processing (stuck in PENDING)

```bash
# Check Redis connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
# Should return: PONG

# Check BullMQ queues
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD
  HGETALL bull:liberacao-parcela:...

# Check worker logs
tail -f [api-service-logs]
# Should show: "Worker: liberacao-parcela ready"
```

**Issue:** `liberacao-parcela` worker not starting

```bash
# Cause: REDIS_PASSWORD or host incorrect
# Fix: Verify Redis credentials in environment
# Test:
pnpm worker:start  # Should log "Connected to Redis"
```

---

## Part 11: Quick Reference

### Environment Variables Summary

```bash
# PostgreSQL
DATABASE_URL="postgresql://imobi_staging:password@dpg-abc123.render.com:5432/imobi_staging?sslmode=require"

# Redis
REDIS_HOST="redis-abc123.render.com"
REDIS_PORT="6379"
REDIS_PASSWORD="[auto-generated]"

# Security Keys
JWT_SECRET="[64+ random chars]"
ENCRYPTION_KEY="[32-byte base64, 44 chars]"

# URLs
NEXT_PUBLIC_API_URL="https://[api-url].onrender.com/api/v1"
CORS_ORIGIN="https://[web-url].onrender.com"
```

### Migration Commands

```bash
# Generate Prisma client
pnpm db:generate

# Run all pending migrations
pnpm db:migrate

# Check migration status
pnpm prisma migrate status

# Open Prisma Studio (UI browser)
pnpm db:studio

# Seed database (optional)
pnpm seed
```

### Monitoring Commands

```bash
# PostgreSQL connection count
SELECT count(*) FROM pg_stat_activity;

# Redis memory usage
redis-cli INFO memory | grep used_memory_human

# Slow PostgreSQL queries
SELECT query, calls, mean_exec_time FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

# Redis key count
redis-cli DBSIZE
```

---

## Support & Additional Resources

### Render Documentation

- [PostgreSQL on Render](https://render.com/docs/databases)
- [Redis on Render](https://render.com/docs/redis)
- [Environment Variables](https://render.com/docs/environment-variables)
- [Metrics & Monitoring](https://render.com/docs/metrics)

### imobi Project Files

- **Schema:** `/services/api/prisma/schema.prisma`
- **Migrations:** `/services/api/prisma/migrations/`
- **Seed Script:** `/services/api/src/seeds/seed.ts`
- **Environment Example:** `/services/api/.env.example`
- **Docker Staging:** `/docker-compose.staging.yml`

### Security Best Practices

- [OWASP Database Security](https://owasp.org/www-community/attacks/SQL_Injection)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-security.html)
- [Redis Security](https://redis.io/docs/latest/operate/oss_and_stack/management/security/)

---

**Last Updated:** 2026-06-02  
**Maintainer:** imobi DevOps  
**Status:** Production-Ready for Staging
