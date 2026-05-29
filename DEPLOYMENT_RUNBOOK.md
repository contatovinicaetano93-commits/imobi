# Deployment Runbook & Operational Procedures - imobi

**Date**: 2026-05-29  
**Version**: 1.0  
**Status**: Production-Ready

---

## Table of Contents

1. [Development Setup](#development-setup)
2. [Deployment Pipeline](#deployment-pipeline)
3. [Environment Variables](#environment-variables)
4. [Scaling Procedures](#scaling-procedures)
5. [Backup & Recovery](#backup--recovery)
6. [Incident Response](#incident-response)
7. [Monitoring & Alerting](#monitoring--alerting)

---

## Development Setup

### Prerequisites
- Node.js 18.x or later
- pnpm 8.x (package manager)
- PostgreSQL 14+ with PostGIS extension
- Redis 7.x
- Git

### Local Development Installation

```bash
# Clone repository
git clone https://github.com/imbobi/imobi.git
cd imobi

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Create .env from example
cp .env.example .env.local

# Edit environment variables
# Set DATABASE_URL, JWT_SECRET, AWS credentials, etc.
nano .env.local

# Run database migrations
pnpm db:migrate

# Start development servers (API + Web)
pnpm dev
```

**Expected Output**:
```
✓ API running on http://localhost:4000/api/v1
✓ Web running on http://localhost:3000
✓ Mobile ready for `expo start`
```

### Verify Setup
```bash
# Test API health
curl http://localhost:4000/api/v1/health

# Expected: { "status": "ok" }
```

---

## Deployment Pipeline

### Git-to-Production Flow

```
┌─────────────────┐
│ Developer Push  │ git push origin feature/xyz
│ (to feature)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │ Run:
│ (CI/CD)         │ - Lint & type-check
└────────┬────────┘ - Unit tests
         │          - Build Docker image
         ▼          - Push to registry
┌─────────────────┐
│ Create PR       │ Requires 1+ approval
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Merge to main   │ PR approved & merged
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ Deploy to Staging    │ Full integration tests
│ (on merge)           │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Deploy to Production │ Manual trigger
│ (after UAT pass)     │
└──────────────────────┘
```

### CI/CD Stages (GitHub Actions)

#### Stage 1: Lint & Type Check
```yaml
# .github/workflows/lint.yml
- name: Lint
  run: pnpm lint

- name: Type Check
  run: pnpm type-check
```

**Time**: ~2 minutes  
**Failure**: Blocks merge

#### Stage 2: Unit & E2E Tests
```yaml
# .github/workflows/test.yml
- name: Unit Tests
  run: pnpm test

- name: E2E Tests (API)
  run: pnpm test:e2e
```

**Time**: ~5-10 minutes  
**Failure**: Blocks merge

#### Stage 3: Build & Push to Registry
```yaml
# .github/workflows/docker.yml
- name: Build Docker Image
  run: docker build -t imbobi/api:${{ github.sha }} .

- name: Push to Registry
  run: docker push imbobi/api:${{ github.sha }}
```

**Time**: ~5 minutes  
**Failure**: Blocks deployment

#### Stage 4: Deploy to Staging (Auto)
```yaml
# Automatic deployment on merge to main
- name: Deploy to Staging
  run: ./scripts/deploy-staging.sh

# Run Staging E2E tests
- name: Staging E2E Tests
  run: pnpm test:e2e --env=staging
```

**Time**: ~10 minutes  
**Failure**: Alert team, manual intervention required

### Web (Next.js) Deployment

#### Vercel Deployment (Recommended)
1. **Setup**: Connect GitHub repo to Vercel project
2. **Auto-deploy**: Every push to main → production deploy
3. **Preview**: Every PR → preview URL
4. **Environment Variables**: Set in Vercel dashboard
   - NEXT_PUBLIC_API_URL
   - NEXT_PUBLIC_SENTRY_DSN

**Vercel CLI**:
```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# View deployment status
vercel inspect
```

#### Alternative: Manual Deployment
```bash
# Build
next build

# Start production server
next start

# Or use Node.js server
node .next/standalone/server.js
```

### API (NestJS) Deployment

#### Docker Build
```dockerfile
# services/api/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build
COPY . .
RUN pnpm build

# Run
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

**Build & Push**:
```bash
cd services/api
docker build -t imbobi/api:latest .
docker push imbobi/api:latest
```

#### Deploy to Railway/Heroku/ECS

**Railway (Recommended for Starter)**:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up

# View logs
railway logs
```

**Heroku**:
```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Create app
heroku create imbobi-api

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

**AWS ECS (Enterprise)**:
```bash
# Push image to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/imbobi-api:latest

# Update ECS service
aws ecs update-service \
  --cluster imbobi-prod \
  --service imbobi-api-service \
  --force-new-deployment
```

### Database Migrations

#### Before Deployment
```bash
# Run all pending migrations
pnpm db:migrate

# Check migration status
pnpm db:status

# Rollback if needed (last migration only)
pnpm db:migrate:rollback
```

**Important**: Always backup database before migrations in production.

#### Zero-Downtime Migrations Strategy
1. Deploy new version of code (backward-compatible with old schema)
2. Run migration
3. Verify data integrity
4. Deploy final code version (uses new schema features)

Example:
```prisma
// Step 1: Add new column (nullable)
model Obra {
  // ... existing fields
  novaColuna String? // nullable initially
}

// Step 2: Deploy code that populates novaColuna
// Step 3: Make non-nullable
model Obra {
  // ... existing fields
  novaColuna String // now required
}
```

---

## Environment Variables

### Required Variables (Production)

#### API Configuration
```bash
# Basic
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://imbobi.com.br

# Database (PostgreSQL + PostGIS)
DATABASE_URL=postgresql://user:pass@host:5432/imbobi_prod

# Redis
REDIS_HOST=redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=strong_password

# JWT
JWT_SECRET=<64+ character random string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=imbobi-evidencias-prod

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG...

# Firebase
FIREBASE_PROJECT_ID=imbobi-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-admin@imbobi-prod.iam.gserviceaccount.com

# Sentry (Error tracking)
SENTRY_DSN=https://key@o.ingest.sentry.io/id
```

#### Web Configuration
```bash
NEXT_PUBLIC_API_URL=https://api.imbobi.com.br
NEXT_PUBLIC_SENTRY_DSN=https://key@o.ingest.sentry.io/id
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0
```

### Secrets Management

#### Option 1: GitHub Secrets (Recommended for GitHub Actions)
```bash
# Set in repo Settings > Secrets and variables > Actions
# https://github.com/YOUR_ORG/imobi/settings/secrets/actions

DATABASE_URL          # Set encrypted value
JWT_SECRET            # Set encrypted value
AWS_ACCESS_KEY_ID     # Set encrypted value
# ... etc
```

#### Option 2: AWS Secrets Manager (Enterprise)
```bash
# Create secret
aws secretsmanager create-secret \
  --name imbobi/prod/database \
  --secret-string '{"username":"user","password":"pass"}'

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id imbobi/prod/database
```

#### Option 3: HashiCorp Vault (Complex Deployments)
```bash
# Store secrets in Vault
vault kv put secret/imbobi/prod \
  database_url="postgresql://..." \
  jwt_secret="..."

# Retrieve on startup (auto-refresh)
```

### Environment Validation

All required vars are validated at startup:

```typescript
// src/common/config.ts
export function validateEnvironmentOrThrow() {
  const required = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'REDIS_HOST',
    'AWS_REGION',
    'SENDGRID_API_KEY',
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}
```

**Result**: If any required var is missing, app will crash with clear error message.

---

## Scaling Procedures

### Horizontal Scaling (Multiple API Instances)

#### Current Architecture (Single Instance)
```
Client → Load Balancer → API (1 instance) → PostgreSQL → Redis
```

#### Scaled Architecture (Multiple Instances)
```
Client → Load Balancer → API (N instances) → PostgreSQL → Redis
                          ├─ Instance 1
                          ├─ Instance 2
                          └─ Instance N
```

#### Implementation Steps

1. **API Containerization** (already done)
   ```bash
   docker build -t imbobi/api:latest .
   ```

2. **Deploy to Container Orchestration**
   - **Kubernetes** (recommended):
     ```yaml
     apiVersion: apps/v1
     kind: Deployment
     metadata:
       name: imbobi-api
     spec:
       replicas: 3
       selector:
         matchLabels:
           app: imbobi-api
       template:
         metadata:
           labels:
             app: imbobi-api
         spec:
           containers:
           - name: api
             image: imbobi/api:latest
             ports:
             - containerPort: 4000
             env:
             - name: NODE_ENV
               value: "production"
             - name: DATABASE_URL
               valueFrom:
                 secretKeyRef:
                   name: imbobi-secrets
                   key: database-url
             resources:
               requests:
                 memory: "512Mi"
                 cpu: "250m"
               limits:
                 memory: "1Gi"
                 cpu: "500m"
     ```

   - **Docker Swarm**:
     ```bash
     docker service create \
       --name imbobi-api \
       --replicas 3 \
       --publish 80:4000 \
       --env NODE_ENV=production \
       imbobi/api:latest
     ```

   - **Railway/Heroku**: Enable auto-scaling in dashboard

3. **Load Balancer Configuration** (NGINX)
   ```nginx
   upstream imbobi_api {
     server api1.internal:4000;
     server api2.internal:4000;
     server api3.internal:4000;
   }

   server {
     listen 80;
     server_name api.imbobi.com.br;

     location / {
       proxy_pass http://imbobi_api;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_http_version 1.1;
       proxy_set_header Connection "";
     }
   }
   ```

4. **Health Checks**
   ```bash
   # API will be hit every 10 seconds
   GET /api/v1/health

   # Expected: 200 OK { "status": "ok" }
   ```

5. **Monitor Scaling**
   ```bash
   # Check service status
   docker service ls  # Swarm
   kubectl get deployments  # Kubernetes
   
   # Watch logs across instances
   docker service logs imbobi-api -f  # Swarm
   kubectl logs -l app=imbobi-api -f  # Kubernetes
   ```

### Vertical Scaling (Larger Instances)

```bash
# Update resource limits
kubectl set resources deployment imbobi-api \
  --limits=cpu=1000m,memory=2Gi \
  --requests=cpu=500m,memory=1Gi
```

### Database Scaling

#### Read Replicas (PostgreSQL)
```bash
# Create read replica in AWS RDS
aws rds create-db-instance-read-replica \
  --db-instance-identifier imbobi-prod-read-replica \
  --source-db-instance-identifier imbobi-prod

# Update connection pool to use read replica for SELECT queries
DATABASE_URL_READ=postgresql://...read-replica...
```

#### Connection Pool Tuning (Prisma)
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("DATABASE_URL_SHADOW") // for dev migrations
}
```

**Prisma Connection Pool Settings**:
- Default: 20 connections
- Max: 100 connections (increase if auto-scaling to many instances)
- Idle timeout: 30 minutes

### Redis Scaling

#### Redis Sentinel (High Availability)
```bash
# Master-Slave replication with automatic failover
redis-server --port 6379  # Master
redis-server --port 6380  # Slave (replicates master)
redis-sentinel /etc/sentinel.conf  # Monitors and failovers
```

**Update connection string**:
```bash
REDIS_HOST=sentinel.internal
REDIS_PORT=26379
REDIS_SENTINELS=sentinel1:26379,sentinel2:26379,sentinel3:26379
```

#### Redis Cluster (Distributed)
```bash
# For very large deployments (> 10GB cache)
redis-cli --cluster create \
  127.0.0.1:6379 127.0.0.1:6380 127.0.0.1:6381 \
  127.0.0.1:6382 127.0.0.1:6383 127.0.0.1:6384 \
  --cluster-replicas 1
```

---

## Backup & Recovery

### PostgreSQL Backups

#### Automated Daily Backup (AWS RDS)
```bash
# Enable automated backups in AWS RDS
aws rds modify-db-instance \
  --db-instance-identifier imbobi-prod \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00"
```

#### Manual Full Backup
```bash
# Use pg_dump for full backup
pg_dump --verbose --file=/backup/imbobi-prod-$(date +%Y%m%d).sql \
  postgresql://user:pass@host:5432/imbobi_prod

# Verify backup
file /backup/imbobi-prod-20260529.sql
```

#### Restore from Backup
```bash
# Create new database
createdb imbobi_prod_restored

# Restore from backup
psql imbobi_prod_restored < /backup/imbobi-prod-20260529.sql

# Verify
psql -d imbobi_prod_restored -c "SELECT COUNT(*) FROM usuario;"
```

### Redis Backups

#### Enable RDB Persistence
```bash
# redis.conf
save 900 1        # Save if 1 key changes in 900 seconds
save 300 10       # Save if 10 keys change in 300 seconds
save 60 10000     # Save if 10000 keys change in 60 seconds
```

#### Manual Snapshot
```bash
redis-cli BGSAVE  # Background snapshot to dump.rdb

# Copy dump.rdb to backup location
cp /var/lib/redis/dump.rdb /backup/redis-snapshot-$(date +%Y%m%d).rdb
```

#### Restore Redis
```bash
# Stop Redis
systemctl stop redis-server

# Replace dump.rdb
cp /backup/redis-snapshot-20260529.rdb /var/lib/redis/dump.rdb

# Start Redis
systemctl start redis-server

# Verify
redis-cli DBSIZE
```

### Application State Backup

#### Upload Evidence (S3)
- Already backed up in S3 bucket: `imbobi-evidencias-prod`
- S3 versioning enabled (automatic backup of all file versions)
- No action required; backups automated

#### Database Migrations
```bash
# Backup migration files
git clone https://github.com/imbobi/imobi.git backup/
cd backup && git checkout main
tar -czf migrations-backup-$(date +%Y%m%d).tar.gz prisma/migrations/
```

---

## Incident Response

### Incident: Database Down

**Symptoms**:
- API returns 500 errors
- Database connection errors in logs
- Sentry shows spike in "database connection failed"

**Recovery Steps**:

1. **Assess Impact**
   ```bash
   # Check database status
   pg_isready -h db.imbobi.com.br -p 5432
   
   # Check application logs
   # Expected: "connection error" or "timeout"
   ```

2. **Quick Fix (Restart)**
   ```bash
   # Restart PostgreSQL service
   systemctl restart postgresql
   
   # Or if using RDS, reboot via AWS console
   aws rds reboot-db-instance \
     --db-instance-identifier imbobi-prod \
     --force
   
   # Wait for database to come online (1-3 minutes)
   ```

3. **Restore from Backup (if corrupted)**
   ```bash
   # Create new instance from latest backup
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier imbobi-prod-restored \
     --db-snapshot-identifier imbobi-prod-20260529-snp
   
   # Update connection string
   # DATABASE_URL=postgresql://...imbobi-prod-restored...
   
   # Deploy with new connection string
   ```

4. **Verify Recovery**
   ```bash
   curl https://api.imbobi.com.br/api/v1/health
   # Expected: 200 { "status": "ok" }
   ```

### Incident: API Down / High Error Rate

**Symptoms**:
- API returns 5xx errors
- Request latency > 5 seconds
- CPU usage > 80%

**Recovery Steps**:

1. **Assess Impact**
   ```bash
   # Check API logs
   docker logs imbobi-api
   
   # Check Sentry for errors
   # https://sentry.io/organizations/imbobi/issues/
   ```

2. **Rollback (if recent deploy)**
   ```bash
   # Revert to previous stable version
   git revert HEAD
   docker build -t imbobi/api:rollback .
   docker push imbobi/api:rollback
   
   # Redeploy
   kubectl set image deployment/imbobi-api \
     api=imbobi/api:rollback
   
   # Wait for pods to restart (2-5 minutes)
   ```

3. **Scale Down & Restart**
   ```bash
   # If memory/CPU exhaustion
   kubectl scale deployment imbobi-api --replicas=1
   sleep 10
   kubectl scale deployment imbobi-api --replicas=3
   ```

4. **Check Logs for Root Cause**
   ```bash
   # Look for recent errors
   kubectl logs -l app=imbobi-api --tail=1000
   
   # Filter by error level
   grep -i error /var/log/imbobi-api.log | tail -50
   ```

### Incident: Redis/Cache Down

**Symptoms**:
- No increase in database load (cache is working)
- No API slowdown
- May see in logs: "redis connection refused"

**Recovery Steps**:

1. **Restart Redis**
   ```bash
   systemctl restart redis-server
   
   # Wait for startup (30 seconds)
   ```

2. **Verify**
   ```bash
   redis-cli PING
   # Expected: PONG
   ```

3. **If Corrupted**
   ```bash
   # Clear cache (will be rebuilt on first requests)
   redis-cli FLUSHALL
   
   # Or restore from backup
   redis-cli --rdb /var/lib/redis/dump.rdb.bak
   ```

### Incident: High Latency / Slow Queries

**Symptoms**:
- p95 latency > 1 second
- Database CPU > 70%
- Slow query log shows queries > 500ms

**Recovery Steps**:

1. **Identify Slow Queries**
   ```bash
   psql $DATABASE_URL -c "SELECT query, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
   ```

2. **Add Missing Index**
   ```sql
   -- If query uses Seq Scan on large table, add index
   CREATE INDEX CONCURRENTLY idx_etapa_status ON etapa_obra(status);
   
   -- CONCURRENTLY = doesn't block table writes
   ```

3. **Monitor Query Performance**
   ```bash
   # Watch slow queries in real-time
   watch "psql $DATABASE_URL -c \"SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 5;\""
   ```

4. **Scale Vertically if Needed**
   ```bash
   # Increase database instance size
   aws rds modify-db-instance \
     --db-instance-identifier imbobi-prod \
     --db-instance-class db.r5.2xlarge \
     --apply-immediately
   ```

---

## Monitoring & Alerting

### Health Checks

#### API Health Endpoint
```bash
# Check every 10 seconds
GET /api/v1/health

# Response:
{
  "status": "ok",
  "timestamp": "2026-05-29T10:30:00Z",
  "uptime": 86400
}
```

#### Synthetic Monitoring
```bash
# Set up external monitoring (Pingdom, UptimeRobot, etc.)
# - Check /api/v1/health every 1 minute
# - Alert if down > 5 minutes
# - Test from multiple regions
```

### Metrics to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Response Time (p95) | > 500ms | Investigate database / cache |
| Error Rate | > 1% | Check logs, rollback if recent deploy |
| Database CPU | > 80% | Add index or scale up |
| Redis Memory | > 80% | Increase TTL or size |
| API Instance Memory | > 800MB | Restart instance or scale |
| Disk Usage | > 85% | Cleanup logs, add storage |

### Monitoring Tools

#### Sentry (Error Tracking)
- Already integrated via `@sentry/node`
- Automatic error capture
- Performance monitoring
- Alert on error spike

**Setup Alerts**:
```
Settings > Alerts > New Alert Rule
├─ Alert when: error count > 10 in 5 minutes
├─ Send to: #incidents Slack channel
└─ Enabled: Yes
```

#### Prometheus + Grafana (Optional)
```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
  depends_on:
    - prometheus
```

#### CloudWatch (AWS)
```bash
# If using AWS infrastructure
aws cloudwatch put-metric-alarm \
  --alarm-name imbobi-api-errors \
  --alarm-description "Alert if API error rate > 1%" \
  --metric-name ErrorRate \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 --period 300
```

---

## Runbook Quick Reference

### Deploy New Version
```bash
git push origin main
# → CI/CD runs tests, builds Docker image
# → Auto-deploys to Staging
# → Run UAT tests
# → Manual trigger for Production
```

### Rollback Last Deploy
```bash
git revert HEAD
git push origin main
# → CI/CD runs tests
# → Auto-deploys rollback version to Staging & Production
```

### View Live Logs
```bash
# Staging
kubectl logs -f deployment/imbobi-api -n staging

# Production
kubectl logs -f deployment/imbobi-api -n production
```

### Scale API Instances
```bash
# Scale to 5 instances
kubectl scale deployment imbobi-api --replicas=5 -n production
```

### Backup Database (Manual)
```bash
pg_dump postgresql://user:pass@host:5432/imbobi_prod | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

### Restore Database from Backup
```bash
gunzip < backup-20260529-100000.sql.gz | psql postgresql://user:pass@host:5432/imbobi_prod
```

---

**Runbook Version**: 1.0  
**Last Updated**: 2026-05-29  
**Owner**: DevOps Team  
**Emergency Contact**: devops@imbobi.com.br
