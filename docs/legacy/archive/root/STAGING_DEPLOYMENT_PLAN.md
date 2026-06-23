# Staging Deployment Architecture & Plan

**Status**: Phase 7 - Staging Deployment & E2E Validation  
**Created**: 2026-05-30  
**Target Environment**: AWS-based staging  
**Deployment Timeline**: Design phase (no real deployment yet)

---

## Executive Summary

This document outlines the architecture, deployment strategy, and operational procedures for deploying the imobi MVP to a production-grade staging environment. The design prioritizes:

1. **Isolation**: Staging data completely separate from production
2. **Parity**: Infrastructure identical to production (minus scale)
3. **Observability**: Full monitoring, logging, and alerting
4. **Automation**: CI/CD pipeline with automated rollback
5. **Cost Control**: Right-sized resources to balance cost vs. performance

---

## Part 1: Infrastructure Architecture

### 1.1 Deployment Platform Options

We evaluated three platforms for staging:

| Platform | Pros | Cons | **Recommendation** |
|----------|------|------|---|
| **Railway.app** | ✅ Simple git deploy, managed PostgreSQL, Redis | ❌ Limited customization, vendor lock-in | ⭐ **Choose for MVP** |
| **Render.com** | ✅ Good PostgreSQL+Redis, reasonable pricing | ❌ Slower builds, less flexible | Alternative |
| **Fly.io** | ✅ Global edge network, Docker-native | ❌ Steeper learning curve | For future scaling |
| **AWS Directly** | ✅ Full control, ECS+RDS+ElastiCache | ❌ Operational overhead (provisioning, security) | Not for MVP stage |

**STAGING PLATFORM CHOICE**: Railway.app + AWS S3 (hybrid)

---

### 1.2 Staging Environment Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    STAGING ENVIRONMENT                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐          ┌─────────────────────────────┐  │
│  │   GitHub     │          │  CI/CD Pipeline (GitHub     │  │
│  │   Repository │─────────▶│  Actions)                   │  │
│  │              │          │                             │  │
│  │ claude/*     │          │ - Type-check                │  │
│  │ feat/*       │          │ - Build Docker images       │  │
│  └──────────────┘          │ - E2E tests (with DB)       │  │
│                            │ - Deploy to staging         │  │
│                            │ - Smoke tests               │  │
│                            └─────────────────────────────┘  │
│                                       │                       │
│        ┌──────────────────────────────┼──────────────────┐   │
│        ▼                              ▼                  ▼   │
│   ┌─────────────┐          ┌──────────────────┐   ┌────────┐│
│   │   Railway   │          │   AWS Services   │   │Vercel  ││
│   │   Platform  │          │                  │   │Preview ││
│   │             │          │ - S3 Bucket      │   │Branch  ││
│   │ - API       │          │ - CloudWatch     │   │        ││
│   │   (NestJS)  │          │ - Secrets Mgr    │   │Next.js ││
│   │ - Database  │          │ - SNS/SQS        │   │Web     ││
│   │   (PG 15)   │          │ - RDS Snapshots  │   └────────┘│
│   │ - Redis     │          │ - Lambda (opt)   │              │
│   │             │          └──────────────────┘              │
│   └─────────────┘                                            │
│        │                                                      │
│        └──────────────────┬───────────────────────────────┐  │
│                           ▼                               ▼  │
│                    ┌────────────────┐            ┌──────────┐│
│                    │ Monitoring &   │            │ Logging  ││
│                    │ Alerting       │            │          ││
│                    │                │            │ - Sentry ││
│                    │ - Sentry       │            │ - Railway││
│                    │ - CloudWatch   │            │ - Vercel ││
│                    │ - Slack        │            └──────────┘│
│                    │ - PagerDuty    │                        │
│                    │   (optional)   │                        │
│                    └────────────────┘                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘

External Services (Third-party APIs):
├─ SendGrid (Email)
├─ Firebase (Push Notifications)
├─ Unico + SERPRO (KYC)
└─ DataDog/CloudWatch (APM - optional)
```

---

## Part 2: Service Deployment Specifications

### 2.1 Database Tier

#### PostgreSQL 15 + PostGIS (Railway Managed)

**Specifications**:
- **Plan**: Railway Starter + $0.24/hour per instance
- **Size**: 1GB RAM, 10GB storage (auto-scale to 100GB)
- **Replication**: Read replicas disabled (staging only)
- **Backup**:
  - Railway automated: Every 24 hours
  - Cross-region: AWS S3 (imbobi-backups-staging)
  - Retention: 30 days
  - Restore test: Weekly from backup

**Configuration**:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: imbobi_staging
      POSTGRES_DB: imbobi_staging
      POSTGRES_INITDB_ARGS: "-c max_connections=100"
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U imbobi_staging"]
      interval: 10s
      timeout: 5s
      retries: 5
```

**PostGIS Extension**:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
-- Verify installation
SELECT PostGIS_version();
```

**Connection Pool** (PgBouncer):
- Pool size: 10-20 (auto-scale based on connections)
- Timeout: 30s idle connection
- Monitoring: CloudWatch metric for active connections

**Health Check**:
- Endpoint: `/health/db` returns DB latency
- Expected: < 100ms response time
- Alerting: Slack if latency > 500ms

---

### 2.2 Cache Tier

#### Redis 7 (Railway Managed)

**Specifications**:
- **Plan**: Railway Starter ($0.24/hour)
- **Size**: 512MB RAM (auto-scale to 10GB)
- **Persistence**: RDB snapshots every 5 minutes
- **Eviction Policy**: `allkeys-lru` (least recently used)

**Configuration**:
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

**BullMQ Queues**:
1. **excluir-usuario** (user deletion with 30-day grace)
   - Concurrency: 5 workers
   - Timeout: 30 minutes
   - Retries: 3 (exponential backoff)

2. **liberacao-parcela** (payment release)
   - Concurrency: 10 workers
   - Timeout: 5 minutes
   - Retries: 5 (critical path)

3. **notificacoes** (Firebase FCM dispatch)
   - Concurrency: 20 workers
   - Timeout: 10 seconds
   - Retries: 3

**Cache Keys**:
- TTL: 5 minutes (obras, users, scores)
- Key pattern: `imobi:staging:{module}:{id}`
- Purge on deployment: Run `redis-cli FLUSHDB` in staging-only script

**Health Check**:
- Endpoint: `/health/cache` returns memory usage %
- Expected: < 80% memory utilization
- Alerting: Slack if > 90%

---

### 2.3 API Service (NestJS + Fastify)

#### Railway Deployment

**Docker Configuration**:
```dockerfile
# services/api/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/services/api/package.json ./

EXPOSE 4000
CMD ["node", "dist/services/api/src/main.js"]
```

**Deployment**:
- **Platform**: Railway.app (Git-connected)
- **Branch**: `develop` (automatic deploys)
- **Memory**: 512MB (auto-scale to 2GB)
- **Timeout**: 120 seconds
- **Health Check**: `GET /health` → 200 OK

**Environment**:
```
NODE_ENV=staging
PORT=4000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
[... all 39 env vars from STAGING_ENV_CHECKLIST.md]
```

**Startup Script**:
```bash
#!/bin/bash
set -e

# Run migrations
NODE_ENV=staging npx prisma migrate deploy

# Start API
node dist/services/api/src/main.js
```

**API Endpoints**:
```
Health Check:     GET  https://api-staging.railway.app/health
Auth:             POST https://api-staging.railway.app/auth/login
Obras:            GET  https://api-staging.railway.app/obras
GPS Validation:   POST https://api-staging.railway.app/gps/validate
Parcelas:         GET  https://api-staging.railway.app/credito/parcelas
Notificacoes:     GET  https://api-staging.railway.app/notificacoes
Manager Portal:   GET  https://api-staging.railway.app/manager/dashboard
```

**Scaling**:
- Min replicas: 1
- Max replicas: 3 (auto-scale on CPU > 70%)
- Request timeout: 30s

**Logs**:
- Railway stdout → Sentry + CloudWatch
- Level: DEBUG (staging only)
- Rotation: Automatic (7-day retention)

---

### 2.4 Web Service (Next.js 14)

#### Vercel Preview Branch Deployment

**Configuration**:
```
Framework: Next.js 14
Build command: pnpm build
Output directory: .next
Environment: NEXT_PUBLIC_*
```

**Environment Variables**:
```
NEXT_PUBLIC_API_URL=https://api-staging.railway.app
NEXT_PUBLIC_SENTRY_DSN=https://...@staging.sentry.io/...
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0-staging
```

**Branch Strategy**:
- Branch: `develop`
- Preview URL: `https://staging-<pr-number>.vercel.app`
- Production URL: Staging only (use `staging.imbobi.com.br`)

**Deployment**:
- Trigger: Push to `develop` or `feat/*`
- Build time: ~2 minutes
- Automatic: Preview deployments on PRs

**Performance Optimizations**:
- Image optimization: Vercel Image API
- Caching: Aggressive (3600s for assets)
- ISR: 60s for dynamic pages

---

### 2.5 Mobile Service (Expo)

#### EAS Build + Staging Credentials

**Expo Configuration**:
```
eas.json:
{
  "build": {
    "staging": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api-staging.railway.app",
        "EAS_PROJECT_ID": "..."
      }
    }
  }
}
```

**Build Process**:
- Platform: EAS (Expo Application Services)
- Build type: APK (Android) + IPA (iOS)
- Signing: Staging certificates
- Distribution: Expo Go (test device only)

**Testing**:
- Install via Expo Go on physical devices
- Whitelist FCM tokens in Firebase staging project

---

## Part 3: Data Storage & Security

### 3.1 AWS S3 Configuration

**Bucket**: `imbobi-evidencias-staging`

**Settings**:
```
Versioning: ENABLED
Encryption: AES-256 (SSE-S3)
Public access: BLOCKED ✅
ACL: Private
CORS: Restricted to staging domain
Lifecycle: Delete old versions after 90 days
Replication: Cross-region to us-west-2
```

**Access**:
- IAM user: `imbobi-staging-s3` (staging-only credentials)
- Policy: S3 put/get/delete on staging bucket only
- Rotation: Every 90 days

**Testing**:
- Upload test image: `POST /evidencias/upload`
- Expected: 200 OK, CDN URL returned
- Verify: Image accessible via S3 presigned URL

### 3.2 Secrets Management

**Storage**: AWS Secrets Manager (staging vault)

**Secrets**:
```
imbobi/staging/db-password
imbobi/staging/jwt-secret
imbobi/staging/sendgrid-key
imbobi/staging/firebase-key
imbobi/staging/unico-key
imbobi/staging/serpro-token
... [all sensitive vars]
```

**Rotation Policy**:
- API keys: 90 days
- Passwords: 180 days
- Certificates: 1 year
- Automatic: AWS rotation Lambda (optional)

**Access**:
- Railway: IAM role with Secrets Manager read-only
- Developers: AWS Console (read-only, MFA required)
- Audit: CloudTrail logs all access

---

## Part 4: Monitoring, Logging & Alerting

### 4.1 Sentry (Error Tracking)

**Project**: imobi-staging

**Configuration**:
```
DSN: https://...@staging.sentry.io/...
Release: 1.0.0-staging (auto-tagged)
Environment: staging
Tracing: 10% sample rate
Error rate: 100% capture
```

**Alerts**:
- New issue appears → Slack #staging-alerts
- Error rate > 5% in 5min → Page on-call
- Crash-free sessions < 99% → Daily digest

**Dashboard**:
- Key metrics: Error rate, performance, user sessions
- Trends: Compare to previous week
- Integration: Slack + custom webhooks

### 4.2 CloudWatch (Infrastructure Monitoring)

**Metrics**:
```
Database:
- CPU utilization
- Connections (active vs max)
- Query latency (avg, p99)
- Backup success rate

Cache:
- Memory utilization
- Eviction rate
- Hit/miss ratio

API:
- Request count
- Response time (avg, p99)
- Error rate (4xx, 5xx)
- Worker health
```

**Alarms**:
```
PostgreSQL CPU > 80%         → Slack warn
Redis memory > 90%            → Slack critical
API response time p99 > 5s    → Slack warn
API error rate > 5%           → Slack critical
Database backup failure       → Slack critical
```

### 4.3 Logging

**Log Aggregation**:
- Railway logs: stdout/stderr
- Vercel logs: Build + runtime
- Sentry: Error traces with context
- CloudWatch: Infrastructure events

**Log Levels**:
- Staging: DEBUG (verbose)
- Sampling: 100% (capture all)
- Retention: 7 days

**Searchable Fields**:
```
userId
requestId
operation
duration
errorCode
statusCode
```

---

## Part 5: Health Checks & Monitoring Endpoints

### 5.1 API Health Checks

```bash
# Overall health
GET /health
Response: {
  "status": "ok",
  "timestamp": "2026-05-30T20:45:00Z",
  "version": "1.0.0",
  "environment": "staging"
}

# Database health
GET /health/db
Response: {
  "status": "ok",
  "latency": 12,  // ms
  "connections": 5,
  "max_connections": 100
}

# Cache health
GET /health/cache
Response: {
  "status": "ok",
  "memory_used": 256,  // MB
  "memory_available": 512,
  "uptime": 86400  // seconds
}

# Queue health
GET /health/queue
Response: {
  "jobs": {
    "excluir-usuario": { "active": 2, "waiting": 15, "completed": 1000 },
    "liberacao-parcela": { "active": 5, "waiting": 3, "completed": 500 },
    "notificacoes": { "active": 10, "waiting": 0, "completed": 10000 }
  }
}
```

### 5.2 Monitoring Dashboards

**Sentry Dashboard**:
- URL: https://sentry.io/organizations/imbobi/issues/?project=staging
- Key metrics: Errors, latency, release health
- Updates: Real-time

**CloudWatch Dashboard**:
- URL: AWS Console → CloudWatch → Dashboards
- Key metrics: CPU, memory, connections, throughput
- Updates: Real-time

---

## Part 6: Deployment Procedures

### 6.1 Deploy Staging (Automated via CI/CD)

**Trigger**: Push to `develop` branch

**Steps**:
1. GitHub Actions workflow triggered
2. Checkout code + install dependencies
3. Type check: `pnpm type-check`
4. Build Docker images (API)
5. Build Next.js app (Web)
6. Run E2E tests (with docker-compose)
7. Run smoke tests (happy path)
8. Deploy to Railway (API)
9. Deploy to Vercel (Web)
10. Run post-deployment health checks
11. Notify Slack on success/failure

**Duration**: ~10-15 minutes

**Rollback** (if health checks fail):
```bash
# Railway: Auto-rollback to previous deployment
# Vercel: Auto-rollback to previous commit
# Manual: git revert && git push
```

### 6.2 Deploy to Production (Manual Gate)

**Prerequisites**:
- Staging pass: E2E tests + smoke tests
- Approval: Tech lead + PM
- Change log: Document changes
- Backup: Create DB snapshot

**Steps**:
1. Tag release: `git tag v1.0.0-rc.1`
2. Create release branch: `release/v1.0.0`
3. Manual deployment trigger (GitHub Actions)
4. Deploy to production (same procedure as staging)
5. Smoke tests in production
6. Monitor for 30 minutes
7. Lock production: No further changes until stable

**Rollback**:
```bash
# If critical issue:
git revert <production-commit>
git push main
# Automatic redeploy via CI/CD
```

---

## Part 7: Database Migration Strategy

### 7.1 Schema Migrations (Prisma)

```bash
# Development
prisma migrate dev --name add_new_field

# Staging/Production
prisma migrate deploy

# Dry run (preview changes)
prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-url $DATABASE_URL
```

### 7.2 Data Migrations (Manual)

**For breaking changes**:
1. Deploy code with backwards compatibility
2. Run data migration script
3. Verify data integrity
4. Remove old code/columns (next release)

**Rollback**:
```sql
-- If migration fails in production:
-- 1. Identify failed migration
-- 2. Revert schema change
-- 3. Restore from backup if needed
```

---

## Part 8: Cost Estimation (Monthly)

| Service | Qty | Unit Cost | Total |
|---------|-----|-----------|-------|
| Railway Database | 1 | $0.24/hr × 730h | $175 |
| Railway Cache | 1 | $0.24/hr × 730h | $175 |
| Railway API | 1 | $0.24/hr × 730h | $175 |
| Vercel Web | 1 | $20 (Pro plan) | $20 |
| AWS S3 (staging) | 10GB | $0.023/GB | $0.23 |
| AWS S3 (backups) | 20GB | $0.023/GB | $0.46 |
| CloudWatch Logs | 1GB | $0.50/GB | $0.50 |
| Sentry | 1 | $29/month | $29 |
| SendGrid | 5K emails | Free (< 100/day) | $0 |
| Firebase | ~1M msgs | Free tier | $0 |
| **Total Monthly** | | | **~$575** |

---

## Part 9: Runbooks & Incident Response

### 9.1 Database Connection Pool Exhausted

**Symptom**: API returns "too many connections"

**Response**:
1. Check active connections: `SELECT count(*) FROM pg_stat_activity;`
2. Identify long-running queries: `SELECT * FROM pg_stat_activity WHERE state='active';`
3. Kill long queries: `SELECT pg_terminate_backend(pid) FROM ...;`
4. Increase pool size (if needed): PgBouncer config update
5. Monitor for recovery

**Prevention**: 
- Add connection pool monitoring
- Set statement timeout to 30s

### 9.2 Redis Out of Memory

**Symptom**: Redis rejected new keys

**Response**:
1. Check memory: `redis-cli INFO memory`
2. Identify large keys: `redis-cli --bigkeys`
3. Delete old cache: `redis-cli KEYS "imobi:staging:*" | xargs redis-cli DEL`
4. Increase memory (if persistent): Scale Railway plan
5. Review TTL settings

**Prevention**: 
- Set maxmemory-policy to allkeys-lru
- Monitor daily

### 9.3 API Deployment Failure

**Symptom**: Deployment fails, old version still running

**Response**:
1. Check logs: Railway dashboard or Sentry
2. Identify error: Type check? Build? Runtime?
3. Fix code: Rollback commit or hot-fix
4. Retry deployment: Push to develop
5. Monitor: Check health endpoints

**Prevention**: 
- Test locally first
- Review code (PR) before merge
- Run E2E tests in CI/CD

---

## Part 10: Success Criteria & Sign-Off

### Deployment Complete When:
- [ ] All 39 environment variables validated ✅
- [ ] Database migrations applied successfully
- [ ] API health check: GET /health returns 200
- [ ] Cache health check: Keys can be set/retrieved
- [ ] E2E tests: 100% pass rate
- [ ] Smoke tests: All 15 happy path flows pass
- [ ] Monitoring configured: Sentry + CloudWatch operational
- [ ] Backup working: Can restore from snapshot
- [ ] Performance baseline: < 500ms p99 latency
- [ ] Security verified: No secrets in logs/errors

### Go/No-Go Decision:
- **🟢 GO**: All criteria met, proceed to Smoke Tests
- **🔴 NO-GO**: Critical issue found, resolve before proceeding

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Infrastructure setup | 2-3 hours | Planning |
| Deploy base services | 1-2 hours | On-demand |
| Run E2E tests | 30-45 min | On-demand |
| Run smoke tests | 15-20 min | On-demand |
| Verify monitoring | 10-15 min | On-demand |
| **Total** | ~6-8 hours | **Ready** |

---

## Document Control

**Version**: 1.0  
**Status**: Design Phase (No Real Deployment Yet)  
**Last Updated**: 2026-05-30  
**Next Review**: Upon first actual staging deployment  
**Maintained By**: Phase 7 E2E Validation Harness
