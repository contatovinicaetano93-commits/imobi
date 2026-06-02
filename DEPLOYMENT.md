# Deployment & Infrastructure Guide — imbobi

**Last Updated:** 2026-06-02  
**Status:** Production Ready  
**Contact:** contato.vinicaetano93@gmail.com

---

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Staging Deployment](#staging-deployment)
3. [Production Deployment](#production-deployment)
4. [Rollback Procedures](#rollback-procedures)
5. [Infrastructure Checklist](#infrastructure-checklist)

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- pnpm (global: `npm install -g pnpm`)
- Docker & Docker Compose (for PostgreSQL + Redis)
- Git

### Quick Start (5 minutes)

```bash
# 1. Clone and install dependencies
git clone <repo-url>
cd imobi
pnpm install

# 2. Setup environment
cp .env.example .env

# 3. Start PostgreSQL and Redis (Docker)
docker-compose -f docker-compose.dev.yml up -d

# 4. Setup database
pnpm db:generate    # Regenerate Prisma client
pnpm db:migrate     # Run migrations
pnpm seed          # (Optional) Load test data

# 5. Start development servers
pnpm dev
```

**Access Points:**
- Web App: http://localhost:3000
- API Docs: http://localhost:4000/docs
- API Health: http://localhost:4000/api/v1/health

### Docker Compose (Dev Environment)

Create `docker-compose.dev.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: imobi-postgres
    environment:
      POSTGRES_USER: imobi
      POSTGRES_PASSWORD: imobi_dev
      POSTGRES_DB: imobi_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: imobi-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Database Commands

```bash
# Regenerate Prisma Client
pnpm db:generate

# Run pending migrations
pnpm db:migrate

# Create new migration
pnpm db:migrate:create --name feature_name

# Reset database (⚠️ DESTRUCTIVE)
pnpm db:reset

# View database via Prisma Studio
pnpm db:studio
```

### Environment Variables

Create `.env` from `.env.example`:

```env
# Database
DATABASE_URL="postgresql://imobi:imobi_dev@localhost:5432/imobi_dev"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=dev_secret_key_change_in_production
ENCRYPTION_KEY=dev_encryption_key_32_bytes_base64

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
S3_BUCKET=imobi-evidencias-dev

# CORS
CORS_ORIGIN=http://localhost:3000

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-key>

# KYC/Validations
UNICO_API_KEY=<your-key>
SERPRO_TOKEN=<your-token>
```

---

## Staging Deployment

### Infrastructure (AWS)

**Target:** Render (Easy) or AWS ECS (Scalable)

#### PostgreSQL Setup (Render)

1. Go to https://dashboard.render.com
2. Create PostgreSQL database:
   - **Name:** `imbobi-postgres-staging`
   - **Version:** PostgreSQL 15
   - **Region:** São Paulo (sa-east-1)
   - **Backup:** Enabled
3. Enable PostGIS:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS postgis_topology;
   ```

#### Redis Setup (Upstash or Render)

1. Go to https://console.upstash.com (FREE tier)
2. Create Redis database:
   - **Name:** `imbobi-redis-staging`
   - **Region:** São Paulo
   - **Type:** Redis
   - **Tier:** FREE (if available)

#### NestJS API (Render Web Service)

1. Create New > Web Service
2. Connect GitHub repo
3. Configure:
   - **Root Directory:** `services/api`
   - **Build Command:**
     ```bash
     pnpm install && pnpm db:generate && pnpm db:migrate && pnpm build
     ```
   - **Start Command:** `node dist/main.js`
   - **Port:** 4000

4. Set Environment Variables:
   ```
   NODE_ENV=staging
   PORT=4000
   DATABASE_URL=<postgres-url-from-render>
   REDIS_URL=<redis-url-from-upstash>
   JWT_SECRET=<generate-64-char-random>
   ENCRYPTION_KEY=<generate-32-byte-base64>
   CORS_ORIGIN=https://<staging-web-url>
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=<staging-key>
   AWS_SECRET_ACCESS_KEY=<staging-secret>
   S3_BUCKET=imobi-evidencias-staging
   ```

#### Next.js Web (Vercel)

1. Go to https://vercel.com/new
2. Import GitHub repo
3. Configure:
   - **Framework:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `pnpm build`
   - **Install Command:** `pnpm install`

4. Set Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://<staging-api-url>
   ```

### Verification

```bash
# Health check
curl https://<staging-api>.onrender.com/api/v1/health

# API docs
https://<staging-api>.onrender.com/docs

# Database connection (from local)
psql "postgresql://user:pass@hostname.render.com:5432/imobi_staging"

# Test PostGIS
SELECT ST_AsText(ST_Point(-46.6756, -23.5505));
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All tests passing: `pnpm test`
- [ ] TypeScript compile check: `pnpm type-check`
- [ ] No secrets in code: `pnpm run security:check`
- [ ] Security validation passes: See `SECURITY.md`
- [ ] Environment variables reviewed
- [ ] Database backup strategy confirmed
- [ ] Monitoring & alerts configured
- [ ] Rollback plan documented

### Infrastructure (AWS Phase 1 — Free Tier)

#### PostgreSQL RDS

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier imbobi-postgres-prod \
  --db-instance-class db.t2.micro \
  --engine postgres \
  --engine-version 15.3 \
  --master-username imobi \
  --master-user-password <strong-password> \
  --allocated-storage 20 \
  --storage-type gp2 \
  --publicly-accessible false \
  --backup-retention-period 30 \
  --multi-az false \
  --region sa-east-1

# Wait for database creation (~5 mins)
# Then enable PostGIS:
psql postgresql://imobi:password@endpoint:5432/imobi << EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
EOF
```

#### ElastiCache Redis

```bash
# Create ElastiCache cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id imbobi-redis-prod \
  --cache-node-type cache.t2.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --automatic-failover-enabled false \
  --region sa-east-1
```

#### ECS API Service

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name imbobi-prod

# Register task definition (from services/api/ecs-task-definition.json)
aws ecs register-task-definition \
  --cli-input-json file://services/api/ecs-task-definition.json

# Create service
aws ecs create-service \
  --cluster imbobi-prod \
  --service-name imbobi-api \
  --task-definition imbobi-api:1 \
  --desired-count 2 \
  --launch-type EC2
```

#### Vercel Web (Production)

```bash
# Deploy to production
git push origin main

# Vercel auto-deploys on push to main
# Verify at https://vercel.com/deployments
```

### Environment Variables (Production)

```env
# Core
NODE_ENV=production
PORT=4000
RELEASE_VERSION=1.0.0

# Database & Cache
DATABASE_URL=postgresql://imobi:password@rds.amazonaws.com:5432/imobi
REDIS_URL=redis://password@elasticache.amazonaws.com:6379

# Security (MUST be 64+ chars and cryptographically random)
JWT_SECRET=<openssl rand -base64 48>
ENCRYPTION_KEY=<openssl rand -base64 32>

# CORS (explicit whitelist only)
CORS_ORIGIN=https://imobi.com.br,https://app.imobi.com.br

# AWS
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=<production-iam-key>
AWS_SECRET_ACCESS_KEY=<production-iam-secret>
S3_BUCKET=imobi-evidencias-prod

# Email
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<production-key>
SMTP_FROM=noreply@imobi.com.br

# KYC & Validation
UNICO_API_KEY=<production-key>
SERPRO_TOKEN=<production-token>

# Monitoring
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/123456
LOG_LEVEL=info

# Firebase (optional for push notifications)
FIREBASE_PROJECT_ID=<project-id>
FIREBASE_PRIVATE_KEY=<private-key>
FIREBASE_CLIENT_EMAIL=<service-account>
```

### Deployment Steps

```bash
# 1. Trigger deployment (automatic via GitHub)
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0

# 2. GitHub Actions runs:
#    - Tests
#    - Build
#    - Security scan
#    - Deploy to ECS/Vercel

# 3. Monitor deployment
aws ecs describe-services --cluster imbobi-prod --services imbobi-api

# 4. Health check
curl https://api.imobi.com.br/api/v1/health

# 5. Smoke tests
./scripts/smoke-test-production.sh
```

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

#### ECS API Service

```bash
# Force previous task definition
aws ecs update-service \
  --cluster imbobi-prod \
  --service imbobi-api \
  --force-new-deployment

# Monitor rollback
aws ecs describe-services \
  --cluster imbobi-prod \
  --services imbobi-api \
  --query 'services[0].deployments'
```

#### Vercel Web

```bash
# Via dashboard: Deployments > Previous version > Promote
# Or via CLI:
vercel --prod --target previous
```

### Database Rollback

```bash
# Restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier imbobi-postgres-rollback \
  --db-snapshot-identifier imbobi-postgres-prod-snapshot-2026-06-02

# Switch database URL (after DNS update)
# Update DATABASE_URL in ECS task definition
```

### Prisma Migration Rollback

```bash
# If migration fails during deployment
# Step 1: Identify failed migration
npx prisma migrate status

# Step 2: Resolve migration
npx prisma migrate resolve --rolled-back migration_name

# Step 3: Re-deploy after fix
git push origin main
```

---

## Infrastructure Checklist

### Pre-Launch
- [ ] Databases created and accessible
- [ ] Redis cluster running
- [ ] SSL certificates valid (auto-renewed)
- [ ] DNS records pointing to API
- [ ] IAM keys configured with minimal permissions
- [ ] Backup strategy tested
- [ ] Disaster recovery plan documented

### Monitoring & Alerts
- [ ] CloudWatch dashboards created
- [ ] Log groups configured
- [ ] Alarms for:
  - [ ] CPU > 80%
  - [ ] Memory > 80%
  - [ ] Database connection pool exhaustion
  - [ ] API error rate > 5%
  - [ ] Response time > 1s (p99)
- [ ] Sentry project configured
- [ ] Email alerts tested

### Security
- [ ] HTTPS enforced (HSTS headers)
- [ ] CORS properly configured (whitelist only)
- [ ] Rate limiting enabled
- [ ] SQL injection prevention (Prisma)
- [ ] XSS protection (sanitization)
- [ ] CSRF tokens implemented
- [ ] JWT secrets rotated
- [ ] Database encryption at rest
- [ ] S3 bucket policies reviewed (private)
- [ ] IAM least-privilege verified

### Operational
- [ ] Run books created for incidents
- [ ] On-call rotation established
- [ ] Escalation procedures defined
- [ ] Communication templates prepared
- [ ] Load testing completed
- [ ] Capacity planning reviewed
- [ ] Cost monitoring enabled

---

## Related Documentation

- **README.md** — Project overview and quick start
- **SECURITY.md** — Security hardening and OWASP checklist
- **API_DOCS.md** — API endpoints and error codes
- **docs/DEPLOYMENT.md** — Detailed infrastructure setup (Render/Vercel specific)
- **docs/DISASTER_RECOVERY_PLAN.md** — Full DR procedures
- **CLAUDE.md** — Project architecture and AWS migration roadmap

---

## Support & Contact

- **Lead:** contato.vinicaetano93@gmail.com
- **Issues:** Create GitHub issue with `[deployment]` tag
- **Security:** Report to security@imobi.com.br
