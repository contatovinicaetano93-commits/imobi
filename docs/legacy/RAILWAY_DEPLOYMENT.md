# 🚂 Railway Deployment Guide

**Platform**: Railway.app  
**Service**: Imobi API (NestJS + Fastify)  
**Database**: PostgreSQL with PostGIS  
**Cache**: Redis  
**Monitoring**: Sentry + Prometheus + UptimeRobot

---

## 📋 PRE-DEPLOYMENT CHECKLIST

- [ ] Railway account created (railway.app)
- [ ] GitHub repository connected to Railway
- [ ] Secrets added to Railway project
- [ ] PostgreSQL plugin added
- [ ] Redis plugin added
- [ ] Domain configured (api.imobi.com)
- [ ] SSL certificate ready
- [ ] Sentry project created
- [ ] Monitoring configured

---

## 🚀 STEP-BY-STEP DEPLOYMENT

### Step 1: Create Railway Project

```bash
# Option A: Via Railway CLI
railway login
railway init

# Option B: Via Web Dashboard
# 1. Go to https://railway.app
# 2. Click "New Project"
# 3. Select "Deploy from GitHub"
# 4. Authorize GitHub & select repo: contatovinicaetano93-commits/imobi
# 5. Select branch: main
```

### Step 2: Add PostgreSQL Database

```bash
# Via Dashboard:
# 1. Project → New → Database → PostgreSQL
# 2. Configure:
#    - Username: imobi_user
#    - Password: (auto-generated, 32+ chars)
#    - Database: imobi
# 3. Wait for initialization (2-3 minutes)
# 4. Note DATABASE_URL from Variables
```

### Step 3: Add Redis Cache

```bash
# Via Dashboard:
# 1. Project → New → Cache → Redis
# 2. Configure:
#    - Version: Latest (7.x)
#    - Eviction: allkeys-lru
# 3. Wait for initialization
# 4. Note REDIS_HOST, REDIS_PORT, REDIS_PASSWORD from Variables
```

### Step 4: Configure Environment Variables

Create `.env.railway.local` (never commit):

```env
# Database
DATABASE_URL=postgresql://imobi_user:PASSWORD@PGHOST:5432/imobi

# Redis
REDIS_HOST=REDISHOST
REDIS_PORT=6379
REDIS_PASSWORD=PASSWORD

# JWT Secrets (Generate with: openssl rand -base64 32)
JWT_SECRET=GENERATED_SECRET_HERE
ENCRYPTION_KEY=GENERATED_KEY_HERE

# Sentry
SENTRY_DSN=https://...@sentry.io/...

# External APIs
SENDGRID_API_KEY=SG....
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# App Config
NODE_ENV=production
PORT=3000
API_VERSION=1.0.0
LOG_LEVEL=info
```

### Step 5: Add Variables to Railway

```bash
# Via Railway Dashboard:
# 1. Project → Settings → Variables
# 2. Add each variable from above
# 3. Variables tab shows which are needed for this service
```

### Step 6: Deploy Service

```bash
# Via Railway Dashboard:
# 1. Select "Services" tab
# 2. Create new service from repo (contatovinicaetano93-commits/imobi)
# 3. Configure build:
#    - Root Directory: services/api
#    - Build Command: pnpm install --frozen-lockfile && pnpm build --filter @imbobi/api
#    - Start Command: node dist/main.js
# 4. Click Deploy

# Via Railway CLI:
railway service add
# Select: Deploy from existing repo
# Enter service name: imobi-api
# Enter service root: services/api
# Enter build command: pnpm install && pnpm build --filter @imbobi/api
# Enter start command: node dist/main.js
# railway up
```

### Step 7: Run Migrations

```bash
# Once service is deployed and database is connected:
# 1. Open Railway shell for service
# 2. Run:
npx prisma migrate deploy --schema services/api/prisma/schema.prisma

# Or use database plugin directly:
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql $DATABASE_URL < services/api/prisma/migrations/*.sql
```

### Step 8: Seed Database (Optional)

```bash
# In Railway shell:
npx prisma db seed --schema services/api/prisma/schema.prisma
```

---

## 🔧 RAILWAY CONFIGURATION

### Service Settings

**Build Settings**:
- Root Directory: `services/api`
- Build Command: `pnpm install --frozen-lockfile && pnpm build --filter @imbobi/api`
- Start Command: `node dist/main.js`
- Node Version: 20.x

**Runtime Settings**:
- Memory: 512 MB (start), 2 GB (max)
- CPU: 0.5x (start)
- Scaling: 1-4 instances

**Health Check**:
- Endpoint: `/health`
- Interval: 10 seconds
- Timeout: 5 seconds
- Success Threshold: 2
- Failure Threshold: 3

### Database Settings

**PostgreSQL**:
- Version: 15.x
- Storage: 10 GB
- Backups: Daily (7-day retention)
- Extensions: `postgis`, `uuid-ossp`

**Redis**:
- Version: 7.x
- Memory: 256 MB
- Eviction: `allkeys-lru`
- Max Memory Policy: `allkeys-lru`

---

## 📊 MONITORING SETUP

### Sentry Integration

```bash
# 1. Create Sentry project:
#    - Go to sentry.io
#    - Create organization: imobi
#    - Create project: api
#    - Select platform: Node.js
#
# 2. Get DSN: https://...@sentry.io/PROJECT_ID
#
# 3. Add SENTRY_DSN to Railway Variables
#
# 4. Test:
curl -X POST https://api.railway.app/test-error \
  -H "Authorization: Bearer <api-key>" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
# Should appear in Sentry dashboard within 10 seconds
```

### Prometheus Metrics

```bash
# Metrics endpoint automatically available:
curl https://api.railway.app/metrics

# Expected output:
# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
# http_request_duration_seconds_bucket{le="0.1",...} 42
```

### UptimeRobot Monitoring

```bash
# 1. Create monitor at uptime.robot
# 2. Add monitor:
#    Type: HTTP(S)
#    URL: https://api.railway.app/health
#    Frequency: Every 5 minutes
#    Acceptable response time: 2 seconds
#    Alert emails: devops@imobi.com
# 3. Set up Slack integration (optional)
```

---

## 🔐 SECURITY CONFIGURATION

### Network Security

```bash
# Enable HTTPS (automatic on Railway)
# All traffic redirected HTTP → HTTPS

# CORS Configuration (in app.module.ts):
# Allowed origins: https://app.imobi.com, https://*.railway.app

# API Key Management:
# 1. Generate API keys for tiers:
curl -X POST https://api.railway.app/api/v1/admin/api-keys \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "free-tier-key",
    "tier": "FREE",
    "quotaPerMonth": 100000
  }'
```

### Database Security

```bash
# PostgreSQL security:
# - Only accessible from Railway services (not public)
# - Encrypted password
# - Regular backups
# - SSL connections enforced

# Secrets management:
# - All sensitive vars in Railway Variables (encrypted at rest)
# - Never commit .env files
# - Rotate secrets quarterly
```

---

## 📈 PERFORMANCE TUNING

### Database Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_obras_usuario_id ON obras(usuario_id);
CREATE INDEX idx_credito_obra_id ON credito(obra_id);
CREATE INDEX idx_etapas_obra_id ON etapas(obra_id);
CREATE INDEX idx_etapas_status ON etapas(status);

-- Enable query statistics
CREATE EXTENSION pg_stat_statements;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC 
LIMIT 10;
```

### Redis Optimization

```bash
# Monitor Redis memory usage
redis-cli --stat

# Check slow log
redis-cli slowlog get 10

# Configure max memory policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### API Server Tuning

```env
# In Railway Variables:
NODE_ENV=production
NODE_OPTIONS=--max-old-space-size=1024

# Connection pools
DATABASE_POOL_SIZE=20
REDIS_CONNECT_TIMEOUT=5000

# Timeouts
INTERNAL_API_TIMEOUT=30000
RATE_LIMIT_WINDOW_MS=60000
```

---

## 🚨 TROUBLESHOOTING

### Deployment Fails

```bash
# Check build logs
railway logs --service imobi-api --build

# Common issues:
# 1. Incorrect root directory
#    Fix: Verify "services/api" in build settings
#
# 2. Missing environment variables
#    Fix: Add all vars from .env.example to Railway Variables
#
# 3. Database not ready
#    Fix: Wait 2-3 min for PostgreSQL to initialize
#
# 4. Port conflicts
#    Fix: Ensure PORT=3000 in Railway Variables
```

### API Not Responding

```bash
# Check service health
curl https://api.railway.app/health

# Check logs
railway logs --service imobi-api --follow

# Check database connection
# In Railway shell:
psql $DATABASE_URL -c "SELECT 1;"

# Check Redis connection
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD ping
```

### High Memory Usage

```bash
# Check Node process
railway exec node -e "console.log(process.memoryUsage())"

# Reduce pool sizes:
DATABASE_POOL_SIZE=10  # was 25
REDIS_CONNECT_TIMEOUT=3000  # was 5000

# Restart service:
railway redeploy
```

### Database Connection Timeout

```bash
# Increase timeout:
DATABASE_CONNECT_TIMEOUT=20000  # was 10000
DATABASE_IDLE_TIMEOUT=60000  # was 30000

# Check PostgreSQL status:
psql $DATABASE_URL -c "SELECT pg_database.datname, pg_stat_activity.usename, pg_stat_activity.application_name, pg_stat_activity.state FROM pg_database JOIN pg_stat_activity ON pg_database.oid = pg_stat_activity.datid WHERE pg_database.datname = 'imobi';"
```

---

## 📅 MAINTENANCE SCHEDULE

### Daily
- Monitor error rate in Sentry (target: < 1%)
- Monitor API latency (target: p95 < 500ms)
- Check uptime in UptimeRobot (target: > 99.5%)

### Weekly
- Review slow query logs
- Check database size growth
- Verify backups completed
- Review rate limit violations

### Monthly
- Performance audit (Lighthouse)
- Security audit (dependencies, secrets)
- Cost review (Railway usage)
- Rotate API keys (if needed)

### Quarterly
- Full security audit
- Database optimization
- Infrastructure scaling review
- Disaster recovery test

---

## 🎯 SUCCESS METRICS

| Metric | Target | Alert at |
|--------|--------|----------|
| Uptime | > 99.5% | < 99% |
| API Latency (p95) | < 250ms | > 500ms |
| Error Rate | < 0.5% | > 1% |
| Database Pool Usage | < 50% | > 70% |
| Memory Usage | < 512MB | > 750MB |
| Disk Free | > 80% | < 20% |

---

## 📞 ROLLBACK PROCEDURE

If deployment fails in production:

```bash
# Option 1: Rollback to previous build
railway rollback

# Option 2: Redeploy known good commit
git checkout <working-commit-hash>
git push origin main
# Railway auto-deploys on push

# Option 3: Manual service restart
railway redeploy --service imobi-api
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

```bash
# 1. Health check
curl -I https://api.railway.app/health
# Expected: 200 OK

# 2. API docs
curl https://api.railway.app/docs | head -20
# Expected: Swagger UI HTML

# 3. Metrics
curl https://api.railway.app/metrics | head -10
# Expected: Prometheus format metrics

# 4. Database
curl -X GET https://api.railway.app/api/v1/obras \
  -H "Authorization: Bearer <test-jwt>"
# Expected: 200 with obras list

# 5. Rate limiting
for i in {1..101}; do
  curl -s -o /dev/null -w "%{http_code}" https://api.railway.app/api/v1/public/simulador
done
# Expected: 429 on 101st request

# 6. Monitoring
# Check Sentry dashboard for any errors
# Check UptimeRobot for uptime status
```

---

**Status**: Ready to deploy  
**Estimated Deployment Time**: 15-20 minutes  
**Rollback Time**: < 5 minutes  
**Team**: DevOps + Backend Lead
