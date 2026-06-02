# imobi Deployment Playbook

**Version:** 3.0  
**Last Updated:** 2026-06-02  
**Target Audience:** DevOps Engineers, Release Managers  
**Status:** Production-Ready

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedures](#deployment-procedures)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Monitoring After Deployment](#monitoring-after-deployment)

---

## Pre-Deployment Checklist

### 48 Hours Before Deployment

#### AWS & Infrastructure Verification

- [ ] AWS credentials configured and valid
  - Verify: `aws sts get-caller-identity`
  - Expected output: Valid account ID, user ARN
- [ ] AWS Secrets Manager secret exists: `imobi/{environment}` (staging/production)
  - Verify: `aws secretsmanager get-secret-value --secret-id imobi/production`
- [ ] RDS PostgreSQL instance healthy
  - Verify: Instance status = available
  - Check security group allows API connection (port 5432)
- [ ] ElastiCache Redis instance healthy
  - Verify: Node status = available
  - Check security group allows API connection (port 6379)
- [ ] S3 bucket exists with proper permissions
  - Verify: `aws s3 ls s3://imbobi-evidencias/`
  - Check bucket policy allows PutObject, GetObject operations
- [ ] IAM role exists with required permissions
  - Verify: `aws iam list-attached-role-policies --role-name imbobi-{environment}`
  - Required: SecretsManager, RDS, ElastiCache, S3 access

#### Database Migration Preparation

- [ ] Latest Prisma migration applied locally
  - Run: `pnpm db:migrate`
- [ ] Database schema matches code expectations
  - Run: `pnpm db:generate` (regenerate Prisma client)
- [ ] Backup taken of current production database
  - AWS RDS automated backup enabled with retention > 7 days
- [ ] PostGIS extension verified in database
  - Run: `psql -c "SELECT postgis_version();" on target DB`
- [ ] Seed data (if needed) prepared in migration
  - Check: `/services/api/src/seeds/` directory

#### Code & Artifact Preparation

- [ ] All tests passing locally
  - Run: `pnpm test`
- [ ] TypeScript type-check passing
  - Run: `pnpm type-check`
- [ ] Production build successful
  - Run: `pnpm build`
- [ ] Docker images built (if using containers)
  - Web: `docker build -t imbobi-web:latest ./apps/web`
  - API: `docker build -t imbobi-api:latest ./services/api`
- [ ] Artifacts ready (JAR/binary/bundle)
  - API bundle: `/services/api/dist/`
  - Web bundle: `/apps/web/.next/`
  - Mobile bundle: Expo build uploaded to EAS

#### Secrets & Configuration Verification

- [ ] AWS Secrets Manager values validated
  - All 26 environment variables present
  - No null/undefined values
  - Sensitive data (keys, passwords) current
- [ ] JWT_SECRET strong (64+ characters)
  - Verify: `echo $JWT_SECRET | wc -c` >= 65
- [ ] Database connection string correct
  - Format: `postgresql://user:password@host:port/database`
  - Can connect: `psql {DATABASE_URL}`
- [ ] Redis connection string correct
  - Format: `redis://host:port` (or with auth)
  - Can connect: `redis-cli -h {REDIS_HOST} -p {REDIS_PORT} PING`
- [ ] CORS_ORIGIN set for production domain
  - Format: `https://app.imbobi.com.br`

#### Team & Communication

- [ ] Incident response team on standby
  - On-call engineer available
  - Slack channel #incidents ready
  - Communications prepared for users (if needed)
- [ ] Monitoring dashboards prepared
  - Sentry alerts configured
  - CloudWatch dashboards open
  - Health check URLs accessible
- [ ] Rollback procedure reviewed with team
  - Everyone knows rollback triggers
  - Rollback contact identified

---

## Deployment Procedures

### 1. API Service Deployment

#### 1.1 Pre-Deployment API Verification (Staging First)

```bash
# SSH into staging API server
ssh -i your-key.pem ec2-user@api-staging.imbobi.com.br

# Verify current API status
curl -s http://localhost:4000/api/v1/health | jq

# Expected output:
# {
#   "status": "ok",
#   "services": {
#     "database": "connected",
#     "redis": "connected"
#   }
# }
```

#### 1.2 Database Migration (Run Before API Deployment)

```bash
# On API server, perform migration
cd /app && npm run db:migrate

# Verify migration completed without errors
# Output should show: "✓ Applied N migrations"

# Verify schema: Check table creation in database
psql $DATABASE_URL -c "\dt"
```

#### 1.3 Deploy API Service

**Option A: Using Docker (Recommended)**

```bash
# Build image locally
docker build -t imbobi-api:v1.0.0 ./services/api

# Push to registry
docker tag imbobi-api:v1.0.0 {AWS_ACCOUNT}.dkr.ecr.{AWS_REGION}.amazonaws.com/imbobi-api:v1.0.0
docker push {AWS_ACCOUNT}.dkr.ecr.{AWS_REGION}.amazonaws.com/imbobi-api:v1.0.0

# Update ECS task definition with new image
aws ecs update-service \
  --cluster imbobi-{environment} \
  --service imbobi-api \
  --force-new-deployment
```

**Option B: Direct Node.js Deployment**

```bash
# On API server
cd /app

# Stop current API
systemctl stop imbobi-api

# Deploy new code
git pull origin main
pnpm install --production
pnpm build

# Run migration
NODE_ENV=production pnpm db:migrate

# Start new API
systemctl start imbobi-api

# Verify it's running
sleep 5 && curl http://localhost:4000/api/v1/health
```

#### 1.4 API Health Verification

```bash
# Check liveness endpoint (pod/container alive)
curl -i http://api.imbobi.com.br/api/v1/health/live
# Expected: HTTP 200 with { "status": "alive" }

# Check readiness endpoint (all dependencies available)
curl -i http://api.imbobi.com.br/api/v1/health/ready
# Expected: HTTP 200 with { "status": "ready" }

# Check full health status
curl http://api.imbobi.com.br/api/v1/health | jq
# Expected: status=ok, database=connected, redis=connected

# Verify specific endpoints work
curl -X POST http://api.imbobi.com.br/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'
# Expected: HTTP 201 or validation error (not 500)
```

#### 1.5 API Deployment Verification Checklist

- [ ] Health endpoint returns `status: ok`
- [ ] Database service shows `connected`
- [ ] Redis service shows `connected`
- [ ] No errors in application logs
  - Check: `tail -100f /app/logs/production.log`
- [ ] Memory usage stable (not growing)
  - Check: `free -h` on server
- [ ] Response times acceptable
  - Check: `curl -w "@curl-format.txt" http://localhost:4000/api/v1/health`

---

### 2. Web App Deployment (Next.js)

#### 2.1 Pre-Deployment Web Verification

```bash
# Build locally to verify no errors
pnpm --filter @imbobi/web build

# Expected output:
# ✓ Built successfully
# ✓ Size optimizations applied
```

#### 2.2 Deploy to Vercel (Recommended for Next.js)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod

# Or configure git-based deployment:
# Push to main branch -> Vercel auto-deploys
git push origin main

# Verify deployment in Vercel dashboard
# https://vercel.com/dashboard/imbobi
```

#### 2.3 Deploy to Self-Hosted (if not using Vercel)

```bash
# On web server
cd /app/web

# Stop current web server
systemctl stop imbobi-web

# Deploy new code
git pull origin main
pnpm install --production
pnpm build

# Start new web server
systemctl start imbobi-web

# Verify running on port 3000
curl -i http://localhost:3000
# Expected: HTTP 200 with HTML
```

#### 2.4 Web App Health Verification

```bash
# Check homepage loads
curl -I https://app.imbobi.com.br
# Expected: HTTP 200

# Check API connectivity from web
curl https://app.imbobi.com.br/api/health
# Expected: Health status response

# Load page in browser and verify:
# - No console errors (F12 Developer Tools)
# - All images load
# - Forms are interactive
# - No hard-coded localhost URLs in production

# Verify Core Web Vitals (Next.js Analytics)
# Check Vercel dashboard or Google PageSpeed Insights
```

#### 2.5 Web Deployment Verification Checklist

- [ ] Homepage loads in < 3 seconds (LCP)
- [ ] No layout shifts during load (CLS < 0.1)
- [ ] All images load correctly
- [ ] Navigation works between pages
- [ ] Sign-up form works end-to-end
- [ ] API calls succeed (check Network tab in F12)
- [ ] No errors in Sentry dashboard

---

### 3. Mobile App Deployment (Expo)

#### 3.1 Build for Production

```bash
# Ensure latest code pushed to git
git push origin main

# Build for iOS (if submitting to App Store)
eas build --platform ios --auto-submit

# Build for Android (if submitting to Play Store)
eas build --platform android --auto-submit

# Or build for internal testing
eas build --platform all
```

#### 3.2 Submit to App Stores

```bash
# iOS - Requires Apple Developer account
# Manual submission or use Xcode from build artifact
# Expected: Upload to TestFlight, then to App Store

# Android - Requires Google Play Developer account
# Build automatically submits if --auto-submit used
# Expected: Upload to Play Store beta, then production
```

#### 3.3 Mobile Deployment Verification

- [ ] App installs from store without errors
- [ ] App launches successfully
- [ ] Can create account and login
- [ ] Can view dashboard with data
- [ ] Can upload evidence photos
- [ ] Push notifications work
- [ ] Offline mode functions correctly
- [ ] No console errors (check Sentry)

---

## Post-Deployment Verification

### Immediate Post-Deployment (First 5 Minutes)

```bash
# 1. Health endpoints all green
curl http://api.imbobi.com.br/api/v1/health/live
curl http://api.imbobi.com.br/api/v1/health/ready

# 2. Check Sentry dashboard
# https://sentry.io/organizations/{org}/issues/
# Expected: No increase in errors

# 3. Database operations working
# Create a test user via API and verify in database
curl -X POST http://api.imbobi.com.br/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test-deploy-'$(date +%s)'@test.com",
    "password":"TestPass123!",
    "nome":"Test User"
  }'

# 4. Check Redis connectivity
# API health endpoint should show redis: connected
curl http://api.imbobi.com.br/api/v1/health | jq '.services.redis'

# 5. Verify log output
tail -50 /var/log/imbobi-api/production.log | grep -i error
# Expected: No critical errors
```

### First Hour Post-Deployment

- [ ] Error rate < 0.1% (check Sentry/CloudWatch)
- [ ] API response times normal
  - p50 < 200ms
  - p95 < 500ms
  - p99 < 1000ms
- [ ] No database connection errors
- [ ] Cache hit rate building up (Redis working)
- [ ] User sign-ups processing normally
- [ ] No memory leaks (memory usage stable)
- [ ] Logs review: no unexpected error patterns

### First 24 Hours Post-Deployment

- [ ] Daily health check passed
  - Run: `curl http://api.imbobi.com.br/api/v1/health/ready`
- [ ] No error spikes in Sentry
- [ ] User feedback positive
- [ ] Backup completed successfully
  - RDS automated backup timestamp updated
- [ ] All feature flows working:
  - [ ] User sign-up
  - [ ] User login
  - [ ] Evidence upload
  - [ ] Credit application
  - [ ] Payment flow

---

## Rollback Procedures

### When to Rollback

Trigger rollback immediately if ANY of these occur:

1. **Critical Error Rate** (> 5% for 2 minutes)
   - Check: Sentry dashboard error count
2. **API Completely Unavailable** (health endpoint fails)
   - Check: `curl http://api.imbobi.com.br/api/v1/health`
3. **Database Connection Lost** (ReadinessProbe fails)
   - Check: Database service status in health endpoint
4. **Data Corruption Detected**
   - Check: Database logs, Prisma migration validation
5. **Security Breach**
   - Decision: Security team determines rollback needed

### Rollback Steps (Perform Within 15 Minutes)

#### Step 1: Notify Team

```bash
# Post to #incidents immediately
@channel DEPLOYMENT ROLLBACK IN PROGRESS - [deployment-version]
- Issue: [brief description]
- Rollback to: [previous-version]
- ETA: 5 minutes
```

#### Step 2: Immediate API Rollback

**Option A: Docker/ECS Rollback**

```bash
# Get previous task definition
aws ecs describe-task-definition \
  --task-definition imbobi-api \
  --query 'taskDefinition.revision'
# Take note of previous revision number

# Update service to use previous revision
aws ecs update-service \
  --cluster imbobi-production \
  --service imbobi-api \
  --task-definition imbobi-api:PREVIOUS_REVISION \
  --force-new-deployment

# Verify rollback
sleep 10 && curl http://api.imbobi.com.br/api/v1/health
```

**Option B: Git-based Rollback**

```bash
# On API server
cd /app

# Revert to previous commit
git revert HEAD --no-edit  # or git reset --hard HEAD~1
git push origin main

# Reinstall and rebuild
pnpm install --production
pnpm build

# Restart service
systemctl restart imbobi-api

# Verify
curl http://localhost:4000/api/v1/health
```

#### Step 3: Database Rollback (if migration is the issue)

```bash
# WARNING: Only use if migration caused the issue

# List previous migrations
psql $DATABASE_URL -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"

# Rollback last migration
pnpm db:migrate reset --force

# Re-apply safe migrations
pnpm db:migrate
```

#### Step 4: Web/Mobile Rollback

**Web (Vercel):**

```bash
# In Vercel dashboard:
# Settings > Deployments > Previous Deployment > Promote to Production
```

**Mobile (Expo):**

```bash
# In EAS dashboard or use CLI:
eas update --branch production --message "Rollback"
# This requires an update channel configured
```

#### Step 5: Verify System Healthy

```bash
# All health checks green
curl http://api.imbobi.com.br/api/v1/health/ready | jq '.status'
# Expected: "ready"

# Error rate back to normal
# Check Sentry: Should see error rate dropping to < 0.1%

# User operations working
curl -X POST http://api.imbobi.com.br/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test-rollback@test.com","password":"TestPass123!"}'
# Expected: HTTP 201 (created) or validation error
```

#### Step 6: Post-Rollback Communication

```bash
# Post to #incidents when stable
✓ ROLLBACK COMPLETE
- Rolled back to: [version]
- Issue identified: [description]
- System status: All health checks green
- Error rate: < 0.1%
- Next steps: Post-mortem scheduled for [time]
```

---

## Troubleshooting

### API Won't Start

**Symptom:** `systemctl status imbobi-api` shows failed

**Diagnosis:**

```bash
# Check logs for startup errors
journalctl -u imbobi-api -n 50 --no-pager

# Common errors:
# 1. DATABASE_URL invalid -> psql won't connect
# 2. REDIS_HOST unreachable -> Redis connection timeout
# 3. JWT_SECRET missing -> JWT initialization fails
```

**Solution:**

```bash
# Verify environment variables loaded
systemctl show-environment | grep -E "DATABASE_URL|JWT_SECRET|REDIS"

# Test database connectivity
psql $DATABASE_URL -c "SELECT 1;"

# Test Redis connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING

# If all pass, check application logs
NODE_ENV=production npm start --verbose
```

### High Error Rate After Deployment

**Symptom:** Sentry shows error rate > 1%

**Diagnosis:**

```bash
# Check Sentry dashboard for error types
# https://sentry.io/organizations/{org}/issues/

# Common patterns:
# 1. Database errors -> Migration not applied
# 2. Auth errors -> JWT_SECRET changed
# 3. Connection errors -> Redis/DB unreachable
```

**Solution:**

```bash
# Check if migration applied
psql $DATABASE_URL -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;"

# Verify Secrets Manager has correct values
aws secretsmanager get-secret-value --secret-id imobi/production | jq '.SecretString'

# Force restart with diagnostics
systemctl stop imbobi-api
NODE_ENV=production npm start 2>&1 | head -100
```

### Database Connection Timeout

**Symptom:** Health endpoint shows `database: disconnected`

**Diagnosis:**

```bash
# Check RDS instance status
aws rds describe-db-instances --query 'DBInstances[?DBInstanceIdentifier==`imbobi-production`].DBInstanceStatus'

# Test connection directly
psql -h {RDS_ENDPOINT} -U imbobi -d imbobi_production -c "SELECT 1;"
# If timeout, check security groups
aws ec2 describe-security-groups --group-ids {RDS_SG_ID}
```

**Solution:**

```bash
# Verify inbound rule allows API server
aws ec2 authorize-security-group-ingress \
  --group-id {RDS_SG_ID} \
  --protocol tcp \
  --port 5432 \
  --source-security-group-id {API_SG_ID}

# If RDS down, restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier imbobi-production-restored \
  --db-snapshot-identifier imbobi-snapshot-latest
```

### Redis Connection Lost

**Symptom:** Health endpoint shows `redis: disconnected`

**Diagnosis:**

```bash
# Check ElastiCache cluster status
aws elasticache describe-cache-clusters \
  --query 'CacheClusters[?CacheClusterId==`imbobi-redis`].CacheClusterStatus'

# Test connection
redis-cli -h {ELASTICACHE_ENDPOINT} ping
# If timeout, check security groups
aws ec2 describe-security-groups --group-ids {REDIS_SG_ID}
```

**Solution:**

```bash
# Verify inbound rule
aws ec2 authorize-security-group-ingress \
  --group-id {REDIS_SG_ID} \
  --protocol tcp \
  --port 6379 \
  --source-security-group-id {API_SG_ID}

# If Redis cluster down, restart it
aws elasticache reboot-cache-cluster \
  --cache-cluster-id imbobi-redis
```

---

## Monitoring After Deployment

### Key Health Metrics

Monitor these metrics for 24 hours post-deployment:

#### 1. API Performance

```bash
# p50, p95, p99 latency (target: < 500ms p95)
# Check: CloudWatch metrics or Sentry Performance tab

# Error rate (target: < 0.1%)
# Check: Sentry dashboard

# Request rate (should match expected load)
# Check: CloudWatch RequestCount metric
```

#### 2. Database Health

```bash
# Connection pool usage
# AWS RDS: Check DatabaseConnections metric

# Slow query log
# Query taking > 1s should be rare
# SQL monitoring: Enable Enhanced Monitoring on RDS

# Replica lag (if using read replicas)
# Should be < 1 second
```

#### 3. Redis/Cache Health

```bash
# Connection count
# aws elasticache describe-cache-nodes --query 'CacheNodes[*].CacheNodeCreateTime'

# Eviction rate
# Should be 0 (unless cache is full intentionally)
# aws elasticache describe-cache-nodes --query 'CacheNodes[*].Stats'

# Hit rate (target: > 80%)
# aws elasticache describe-cache-clusters --query 'CacheClusters[*].CacheNodes[*].CachePerformanceMetrics'
```

### Alert Configuration

Ensure these alerts are active:

```yaml
Alerts:
  - Error Rate > 1% for 5 min  -> Slack #incidents (warning)
  - Error Rate > 5% for 2 min  -> Page on-call (critical)
  - API Down (health/ready = 503) -> Page on-call (critical)
  - DB Connection Lost -> Slack #incidents (critical)
  - Redis Down -> Slack #incidents (warning)
  - Memory > 80% -> Slack #incidents (warning)
  - Disk > 80% -> Slack #incidents (warning)
```

### Health Check Script

Run every 5 minutes (use cron or Datadog):

```bash
#!/bin/bash
API_URL="https://api.imbobi.com.br"

# Liveness
if ! curl -s "$API_URL/api/v1/health/live" | jq -e '.status == "alive"' > /dev/null; then
  echo "ERROR: API liveness check failed"
  exit 1
fi

# Readiness
if ! curl -s "$API_URL/api/v1/health/ready" | jq -e '.status == "ready"' > /dev/null; then
  echo "ERROR: API readiness check failed"
  exit 1
fi

# Full health
HEALTH=$(curl -s "$API_URL/api/v1/health")
if ! echo "$HEALTH" | jq -e '.services.database == "connected"' > /dev/null; then
  echo "ERROR: Database not connected"
  exit 1
fi

if ! echo "$HEALTH" | jq -e '.services.redis == "connected"' > /dev/null; then
  echo "ERROR: Redis not connected"
  exit 1
fi

echo "OK: All health checks passed"
exit 0
```

---

## Sign-Off Template

Use this template to document deployment completion:

```markdown
## Deployment Completed

**Date:** [YYYY-MM-DD HH:MM UTC]
**Version:** [v1.0.0]
**Components Deployed:**
- [ ] API (v1.0.0)
- [ ] Web (v1.0.0)
- [ ] Mobile (v1.0.0)

**Deployed By:** [Your Name]
**Reviewed By:** [Reviewer Name]

**Pre-Deployment Checklist:** ✓ All items checked
**Post-Deployment Verification:** ✓ All checks passed
**Health Status:** ✓ All systems green

**Metrics:**
- Error Rate: 0.02%
- API p95 Latency: 245ms
- Database Connected: ✓
- Redis Connected: ✓
- Backup Completed: ✓

**Known Issues:** None

**Rollback Plan:** Documented in ROLLBACK_PLAN.md (if needed)
```

---

**Last Updated:** 2026-06-02  
**Next Review:** 2026-07-02
