# Staging Deployment Guide

**Project:** imbobi  
**Last Updated:** 2026-05-28  
**Version:** 1.0  
**Status:** Ready for Production

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Deployment Process](#deployment-process)
4. [Health Checks & Validation](#health-checks--validation)
5. [E2E Testing](#e2e-testing)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Procedures](#rollback-procedures)

---

## Quick Start

For experienced operators:

```bash
# First time setup
bash scripts/setup-staging.sh

# Deploy changes
bash scripts/staging-deploy.sh

# Validate health
bash scripts/staging-health-check.sh https://staging-api.imbobi.com

# Run E2E tests
bash scripts/staging-e2e.sh https://staging-api.imbobi.com
```

---

## Environment Setup

### 1. Create `.env.staging` File

**CRITICAL:** This file contains secrets and should NEVER be committed to git.

Create `/home/user/alagami-site/.env.staging` with the following content:

```bash
# ============================================================
# CORE API CONFIGURATION
# ============================================================
PORT=4000
NODE_ENV=staging
CORS_ORIGIN=https://staging-app.imbobi.com,https://staging.imbobi.com
LOG_LEVEL=debug

# ============================================================
# DATABASE (PostgreSQL 15 + PostGIS)
# ============================================================
# For AWS RDS:
DATABASE_URL=postgresql://imbobi_staging:PASSWORD@staging-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/imbobi_staging

# For local development:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/imbobi_staging

# ============================================================
# CACHE & QUEUE (Redis)
# ============================================================
REDIS_HOST=staging-redis.c9akciq32.us-east-1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_DB=0

# For local: REDIS_HOST=localhost

# ============================================================
# SECURITY KEYS
# ============================================================
# Generate with: openssl rand -base64 64 (for 64 chars)
JWT_SECRET=<paste-64-chars-openssl-output>
JWT_EXPIRES_IN=15m

# Generate with: openssl rand -base64 64
JWT_REFRESH_SECRET=<paste-64-chars-openssl-output>
JWT_REFRESH_EXPIRES_IN=7d

# Generate with: openssl rand -base64 32 (for 32 chars)
ENCRYPTION_SECRET=<paste-32-chars-openssl-output>

# ============================================================
# AWS S3 (Evidence/Photo Storage)
# ============================================================
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<staging-iam-access-key>
AWS_SECRET_ACCESS_KEY=<staging-iam-secret-key>
S3_BUCKET=imbobi-staging-evidencias
S3_PUBLIC_URL=https://imbobi-staging-evidencias.s3.amazonaws.com

# ============================================================
# EMAIL SERVICE (SendGrid)
# ============================================================
SENDGRID_API_KEY=<staging-sendgrid-api-key>
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<staging-sendgrid-api-key>
SMTP_FROM=noreply-staging@imbobi.com
SMTP_FROM_NAME=imbobi Staging
APP_URL=https://staging-app.imbobi.com

# ============================================================
# PUSH NOTIFICATIONS (Firebase)
# ============================================================
FIREBASE_PROJECT_ID=imbobi-staging
FIREBASE_PRIVATE_KEY=<json-private-key-from-firebase-console>
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@imbobi-staging.iam.gserviceaccount.com

# ============================================================
# EXTERNAL INTEGRATIONS
# ============================================================
# KYC Verification
UNICO_API_KEY=<staging-unico-biometric-key>
SERPRO_TOKEN=<staging-serpro-government-token>

# ============================================================
# FRONTEND CONFIGURATION
# ============================================================
NEXT_PUBLIC_API_URL=https://staging-api.imbobi.com
EXPO_PUBLIC_API_URL=https://staging-api.imbobi.com
EAS_PROJECT_ID=<eas-staging-project-id>
```

### 2. Environment Variables Checklist

**Required (MUST have):**
- [ ] `NODE_ENV=staging`
- [ ] `DATABASE_URL` - PostgreSQL connection string with PostGIS
- [ ] `REDIS_HOST` and `REDIS_PORT` - Redis for BullMQ
- [ ] `JWT_SECRET` - 64+ characters, generated with `openssl rand -base64 64`
- [ ] `JWT_REFRESH_SECRET` - 64+ characters
- [ ] `ENCRYPTION_SECRET` - 32+ characters, generated with `openssl rand -base64 32`
- [ ] `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - S3 credentials
- [ ] `S3_BUCKET` - Staging bucket name
- [ ] `SENDGRID_API_KEY` - Email service API key
- [ ] `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` - Push notifications

**Recommended:**
- [ ] `UNICO_API_KEY` - KYC verification (biometric)
- [ ] `SERPRO_TOKEN` - Government API token (CPF validation)
- [ ] `EAS_PROJECT_ID` - Expo project for mobile builds

### 3. Generate Secure Credentials

Generate the minimum required security secrets:

```bash
# Generate JWT_SECRET (64 characters)
openssl rand -base64 64

# Generate ENCRYPTION_SECRET (32 characters)
openssl rand -base64 32
```

Copy the outputs and paste into `.env.staging`.

### 4. Configure AWS Credentials

For AWS services (S3, RDS, ElastiCache):

```bash
# Configure AWS profile
aws configure --profile staging

# Test S3 access
aws s3 ls s3://imbobi-staging-evidencias --profile staging
```

### 5. Verify .env.staging is Ignored by Git

```bash
# Verify .env.staging is in .gitignore
git check-ignore .env.staging

# Expected output: .env.staging (if properly ignored)
```

---

## Deployment Process

### Step 1: Initialize Staging Environment (First Time Only)

```bash
bash scripts/setup-staging.sh
```

This script:
- Validates all required commands are installed
- Installs pnpm dependencies
- Validates `.env.staging` exists with all required variables
- Tests database connection
- Generates Prisma client
- Runs database migrations
- Validates Redis connection
- Runs TypeScript type checks

**Expected output:**
```
✅ Staging environment setup complete!

Next steps:
  1. Start services: pnpm dev
  2. Test API: curl http://localhost:4000/api/v1/health
```

### Step 2: Build and Deploy Code

```bash
bash scripts/staging-deploy.sh
```

This script performs:
1. **Loads environment** - Sources `.env.staging`
2. **Type checking** - Runs `pnpm type-check` across all packages
3. **Builds artifacts** - Runs `pnpm build` for production artifacts
4. **Database backup** - Backs up Prisma schema before migrations
5. **Runs migrations** - Applies pending database migrations
6. **Builds Docker image** - Creates API container image
7. **Starts container** - Deploys and starts the API service
8. **Runs health checks** - Validates all services are responsive

**Expected output:**
```
✅ Deployment concluído com sucesso!
📊 Log: staging-deploy-2026-05-28_15-30-45.log
```

**Log file location:** The log file is created in the project root with a timestamp.

### Step 3: Validate Services

```bash
bash scripts/staging-health-check.sh https://staging-api.imbobi.com
```

Validates:
- [ ] API responds (GET `/api/v1/health`)
- [ ] Database connection is healthy
- [ ] Redis cache is operational
- [ ] Email service (SMTP) is configured
- [ ] Firebase is initialized
- [ ] S3 bucket is accessible
- [ ] Encryption service is working

**Expected output:**
```
✓ Passed: 9 / 9 (100%)
✅ All health checks passed!
```

### Step 4: Run E2E Tests

```bash
bash scripts/staging-e2e.sh https://staging-api.imbobi.com
```

Tests the following flows:
1. **Authentication** - Register user → Login → Get access token
2. **User Profile** - Retrieve authenticated user profile
3. **File Upload** - Upload image to S3 bucket
4. **Credit Simulation** - Test credit calculation with GPS validation
5. **Rate Limiting** - Verify rate limiting is enforced

**Expected output:**
```
✅ All E2E tests passed!
Timestamp: 2026-05-28 15:30:45 UTC
```

### Step 5: Manual Smoke Tests

Access the staging web application and verify:

**Application Access:**
- [ ] https://staging-app.imbobi.com loads without errors
- [ ] No JavaScript errors in console (F12)
- [ ] Can navigate between pages
- [ ] Forms render correctly

**API Integration:**
- [ ] Login form submits successfully
- [ ] API calls complete (check Network tab)
- [ ] No 4xx/5xx errors
- [ ] Response times are acceptable (<500ms)

**File Upload:**
- [ ] Can upload evidence photos
- [ ] Photos appear in S3 bucket
- [ ] S3 URLs are publicly accessible

---

## Health Checks & Validation

### Running Health Checks

#### Quick Health Check

```bash
# Check API is responding
curl -f https://staging-api.imbobi.com/api/v1/health | jq '.'
```

#### Comprehensive Health Check

```bash
# Run full health check suite with retries
bash scripts/staging-health-check.sh https://staging-api.imbobi.com
```

#### Continuous Health Monitoring

```bash
# Watch API logs in real-time
docker logs -f imbobi-api-staging

# Or tail the last 50 lines
docker logs imbobi-api-staging | tail -50
```

### Database Health

```bash
# Check database connection
cd services/api
DATABASE_URL="postgresql://..." pnpm prisma db execute --stdin

# Check migration status
DATABASE_URL="postgresql://..." pnpm prisma migrate status
```

### Redis Health

```bash
# Test Redis connection
redis-cli -h staging-redis.amazonaws.com ping

# Check BullMQ queue status
redis-cli -h staging-redis.amazonaws.com KEYS "bull:*"
```

### Endpoint Status

| Endpoint | Method | Purpose | Expected Response |
|----------|--------|---------|-------------------|
| `/api/v1/health` | GET | Overall health | 200 JSON object |
| `/api/v1/health/database` | GET | Database check | 200 with status |
| `/api/v1/health/redis` | GET | Cache/queue check | 200 with status |
| `/api/v1/health/email` | GET | Email service check | 200 with status |
| `/api/v1/health/firebase` | GET | Push notifications | 200 with status |
| `/api/v1/health/s3` | GET | File storage check | 200 with status |
| `/api/v1/health/encryption` | GET | Encryption service | 200 with status |

---

## E2E Testing

### Automated E2E Tests

```bash
# Run complete E2E test suite
bash scripts/staging-e2e.sh https://staging-api.imbobi.com
```

### Manual Testing Scenarios

#### 1. User Registration & Authentication

```bash
TEST_EMAIL="test-$(date +%s)@imbobi.com"
TEST_PASSWORD="TestPassword123!@#"

# Register
curl -X POST https://staging-api.imbobi.com/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d "{
    \"nome\": \"Test User\",
    \"email\": \"$TEST_EMAIL\",
    \"senha\": \"$TEST_PASSWORD\",
    \"confirmarSenha\": \"$TEST_PASSWORD\"
  }" | jq '.'

# Login
curl -X POST https://staging-api.imbobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"senha\": \"$TEST_PASSWORD\"
  }" | jq '.data.accessToken'
```

#### 2. Credit Simulation with GPS Validation

```bash
ACCESS_TOKEN="<paste-token-from-login>"

curl -X POST https://staging-api.imbobi.com/api/v1/credito/simular \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "valor": 50000,
    "parcelas": 12,
    "latitude": -23.5505,
    "longitude": -46.6333
  }' | jq '.'
```

#### 3. File Upload to S3

```bash
ACCESS_TOKEN="<paste-token-from-login>"

# Create test file
echo "test image data" > /tmp/test-image.jpg

# Upload
curl -X POST https://staging-api.imbobi.com/api/v1/evidencias/upload \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@/tmp/test-image.jpg" | jq '.'
```

### Test Results Documentation

After running E2E tests, document:
- [ ] Test execution timestamp
- [ ] All test results (pass/fail)
- [ ] Any failures with error messages
- [ ] Performance metrics (response times)
- [ ] Any warnings or anomalies

---

## Troubleshooting

### Common Issues

#### 1. `.env.staging` File Not Found

**Error:**
```
❌ Arquivo .env.staging não encontrado
```

**Solution:**
```bash
# Create .env.staging with required variables (see Environment Setup section)
cp .env.example .env.staging
# Then edit .env.staging and fill in all required values
```

#### 2. Database Migration Fails

**Error:**
```
❌ Migration failed - ROLLBACK NECESSÁRIO
```

**Solution:**
```bash
# Check migration status
cd services/api
DATABASE_URL="postgresql://..." pnpm prisma migrate status

# Rollback to previous migration (if needed)
DATABASE_URL="postgresql://..." pnpm prisma migrate resolve --rolled-back <migration-name>

# Check schema for conflicts
pnpm prisma db execute --stdin < /path/to/backup.sql
```

#### 3. Redis Connection Timeout

**Error:**
```
Redis connection failed
```

**Solution:**
```bash
# Test Redis connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# If local, ensure Redis is running
redis-server

# If AWS ElastiCache, check security group rules allow connection
aws elasticache describe-cache-clusters --cache-cluster-id staging-redis
```

#### 4. S3 Bucket Access Denied

**Error:**
```
AWS S3 access denied
```

**Solution:**
```bash
# Verify AWS credentials
aws s3 ls s3://imbobi-staging-evidencias --profile staging

# Check IAM permissions in AWS console
# Ensure staging IAM user has s3:GetObject, s3:PutObject permissions

# Test S3 configuration in API
curl https://staging-api.imbobi.com/api/v1/health/s3
```

#### 5. Email Service Not Working

**Error:**
```
Email service check failed
```

**Solution:**
```bash
# Verify SendGrid API key
curl -s https://api.sendgrid.com/v3/api_keys \
  -H "Authorization: Bearer $SENDGRID_API_KEY" | jq '.result[0].name'

# Test SMTP connection
telnet smtp.sendgrid.net 587

# Verify SMTP credentials in .env.staging
```

#### 6. Type Check Failures

**Error:**
```
❌ Type check failed
```

**Solution:**
```bash
# Run type check to see specific errors
pnpm type-check

# Fix TypeScript errors in affected files
# Common issues:
#   - Missing type imports
#   - Incompatible types in assignments
#   - Missing required properties

# Regenerate Prisma client if schema changed
cd services/api
pnpm prisma generate
```

#### 7. Docker Container Won't Start

**Error:**
```
Docker run failed / Container exits immediately
```

**Solution:**
```bash
# Check container logs
docker logs imbobi-api-staging

# Verify Docker image exists
docker images | grep imbobi-api:staging

# Check port availability
lsof -i :4000

# Try manual container start with debugging
docker run -it --env-file .env.staging imbobi-api:staging-<hash> bash
```

### Debug Commands

```bash
# View API logs
docker logs -f imbobi-api-staging

# Check environment variables in container
docker inspect imbobi-api-staging | grep -A 50 "Env"

# Execute command in container
docker exec imbobi-api-staging curl http://localhost:4000/api/v1/health

# Check Docker network
docker network inspect imbobi_network

# Verify mounted volumes
docker inspect imbobi-api-staging | grep -A 10 "Mounts"

# Check database from container
docker exec -it imbobi-api-staging psql $DATABASE_URL -c "SELECT 1;"
```

---

## Rollback Procedures

### Scenario 1: Minor Issue (Code Only)

If only the API code has issues:

```bash
# Stop current container
docker stop imbobi-api-staging

# Remove current container
docker rm imbobi-api-staging

# Start previous version
docker run -d \
  --name imbobi-api-staging \
  --restart unless-stopped \
  -p 4000:4000 \
  --env-file .env.staging \
  --network imbobi_network \
  imbobi-api:staging-<previous-git-sha>

# Verify
curl -f https://staging-api.imbobi.com/api/v1/health
```

### Scenario 2: Database Migration Issue

If database migration introduced errors:

```bash
# Pause new container
docker stop imbobi-api-staging

# Rollback migration
cd services/api
DATABASE_URL="postgresql://..." pnpm prisma migrate resolve --rolled-back <migration-name>

# Verify database
DATABASE_URL="postgresql://..." pnpm prisma migrate status

# Restart container
docker start imbobi-api-staging
```

### Scenario 3: Complete Rollback (Automated)

```bash
# Run automated rollback script
bash scripts/staging-rollback.sh
```

This script:
1. Pauses incoming traffic
2. Reverts database migration
3. Restores previous container version
4. Validates health checks
5. Notifies team via Slack

### Scenario 4: Emergency Stop

For critical failures:

```bash
# Stop ALL services
docker stop imbobi-api-staging imbobi-postgres-staging imbobi-redis-staging

# Check error logs
docker logs imbobi-api-staging | tail -100

# Do NOT restart until root cause is identified
```

### Post-Rollback Checklist

After rollback:
- [ ] Verify API is responding with health checks
- [ ] Confirm no data loss occurred
- [ ] Check database consistency
- [ ] Review logs for root cause
- [ ] Create incident report
- [ ] Notify team via Slack
- [ ] Schedule post-mortem meeting

---

## Monitoring & Alerts

### Health Check Cron Job

The staging API includes a periodic health check cron job that monitors services every 5 minutes:

```bash
# View configured cron jobs
crontab -l

# Expected entry:
# */5 * * * * bash /home/imbobi/scripts/staging-health-check.sh
```

### Log Files

All deployment and health check logs are stored in the project root:

```bash
# Deployment logs
ls -lh staging-deploy-*.log

# Health check logs (if running cron)
/var/log/imbobi-health-checks.log

# Docker container logs
docker logs imbobi-api-staging > api-logs.txt
```

### Slack Integration

Deployment and health check status are sent to Slack:

- **Channel:** `#imbobi-deployments`
- **Notifications:**
  - ✅ Deployment successful
  - ❌ Deployment failed
  - ⚠️ Health check failures
  - 🔄 Rollback executed

---

## Quick Reference

### Essential Commands

```bash
# Setup and deploy
bash scripts/setup-staging.sh          # First time only
bash scripts/staging-deploy.sh         # Deploy changes
bash scripts/staging-health-check.sh   # Validate health
bash scripts/staging-e2e.sh            # Run E2E tests

# Monitoring and logs
docker logs -f imbobi-api-staging      # Watch logs
docker ps -a | grep imbobi            # List containers
docker stop imbobi-api-staging         # Stop API

# Database operations
cd services/api
pnpm prisma migrate status             # Check pending migrations
pnpm prisma db execute --stdin         # Execute raw SQL
pnpm prisma studio                     # Open database GUI

# Environment
source .env.staging                    # Load env vars
grep -v '^#' .env.staging              # View all vars
```

### Environment Validation Checklist

```bash
# Check all required variables
for var in NODE_ENV DATABASE_URL REDIS_HOST JWT_SECRET ENCRYPTION_SECRET; do
  if grep -q "^$var=" .env.staging; then
    echo "✓ $var"
  else
    echo "✗ $var MISSING"
  fi
done
```

---

## Support & Escalation

| Issue | Channel | Response Time |
|-------|---------|----------------|
| Deployment questions | #imbobi-backend | < 1 hour |
| Database issues | #imbobi-dba | < 30 min |
| Infrastructure problems | #imbobi-cloud | < 30 min |
| Deployment stuck | @devops-oncall | Immediate |
| Critical outage | @incident-commander | Immediate |

---

## Related Documentation

- [STAGING_DEPLOYMENT_PLAN.md](./STAGING_DEPLOYMENT_PLAN.md) - Detailed deployment plan
- [STAGING_DEPLOYMENT_CHECKLIST.md](./STAGING_DEPLOYMENT_CHECKLIST.md) - Pre/post deployment checklist
- [CLAUDE.md](./CLAUDE.md) - Project architecture and stack overview
- [.env.example](./.env.example) - Environment variables template

---

**Last Updated:** 2026-05-28  
**Version:** 1.0  
**Status:** Ready for Production Use
