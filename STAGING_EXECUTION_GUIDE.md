# 🚀 STAGING DEPLOYMENT EXECUTION GUIDE
**imbobi Platform | 2026-05-27**

---

## QUICK START - Copy & Paste Commands

### 1️⃣ FIRST TIME SETUP (Run Once)

```bash
# Navigate to project root
cd /home/user/alagami-site

# Run initialization script
bash scripts/staging-init.sh

# This will validate:
# ✓ AWS S3 bucket (imbobi-staging-evidencias)
# ✓ RDS PostgreSQL with PostGIS
# ✓ ElastiCache Redis
# ✓ Firebase project
# ✓ SendGrid API key
# ✓ GitHub secrets
```

**Expected Output:**
```
✅ Setup validado com sucesso!
Próximos passos:
  1. Adicionar secrets faltantes: gh secret set SECRET_NAME
  2. Rodar: scripts/staging-deploy.sh
```

---

### 2️⃣ DEPLOY & VALIDATE (Run Every Deployment)

```bash
# Full deployment pipeline
bash scripts/staging-deploy.sh

# This runs:
# 1. Type checking & build validation
# 2. Prisma database migrations with backup
# 3. Docker container orchestration
# 4. Health checks (API, DB, Redis, Email, Firebase, S3)
```

**Expected Output:**
```
✅ Deployment concluído com sucesso!
📊 Log: staging-deploy-2026-05-27_15-30-45.log
```

---

### 3️⃣ HEALTH CHECKS (Manual or Cron)

**Run manually:**
```bash
bash scripts/staging-health-check.sh https://staging-api.imbobi.com
```

**Setup automated (every 5 minutes):**
```bash
# Add to crontab (run once)
(crontab -l 2>/dev/null; echo "*/5 * * * * bash /home/user/alagami-site/scripts/health-check-cron.sh") | crontab -

# Or edit directly:
sudo nano /etc/cron.d/imbobi-staging
# Paste this line:
# */5 * * * * root bash /home/user/alagami-site/scripts/staging-health-check.sh
```

**Expected Output:**
```
========================================
    Staging Health Check Suite
========================================
▶ API Health ... OK (HTTP 200)
▶ Database Connection ... OK (HTTP 200)
▶ Redis Connection ... OK (HTTP 200)
▶ Email Service ... OK (HTTP 200)
▶ Firebase Initialization ... OK (HTTP 200)
▶ S3 Configuration ... OK (HTTP 200)

✅ All health checks passed! (6 / 6)
```

---

### 4️⃣ E2E TESTS (Validation Suite)

```bash
# Test complete user flow in staging
bash scripts/staging-e2e.sh https://staging-api.imbobi.com

# Or let GitHub Actions run it daily
# (Already configured: .github/workflows/e2e-staging.yml)
```

**Test Coverage:**
- ✓ Registration & Login
- ✓ User Profile Retrieval
- ✓ File Upload to S3
- ✓ Credit Simulation (with GPS validation)
- ✓ Rate Limiting Validation

**Expected Output:**
```
🧪 Starting E2E Tests against https://staging-api.imbobi.com
🔐 [Test 1/5] Authentication Flow...
✓ User registered: uuid-here
✓ Login successful
👤 [Test 2/5] User Profile...
✓ Profile retrieved: test-user@imbobi.com
📤 [Test 3/5] File Upload (S3)...
✓ File uploaded: https://imbobi-staging-evidencias.s3.amazonaws.com/...
💰 [Test 4/5] Credit Simulation...
✓ Credit simulated: R$ 4166.67/month (12x)
🔒 [Test 5/5] Rate Limiting Validation...
✓ Rate limiting working correctly

✅ All E2E tests passed!
```

---

## ENVIRONMENT SETUP

### Create `.env.staging` File

**Location:** `/home/user/alagami-site/.env.staging`

**Template:**
```bash
# ============================================================
# CORE API CONFIGURATION
# ============================================================
PORT=4000
NODE_ENV=staging
CORS_ORIGIN=https://staging-app.imbobi.com,https://staging.imbobi.com
LOG_LEVEL=debug

# ============================================================
# DATABASE (RDS PostgreSQL 15 + PostGIS)
# ============================================================
DATABASE_URL=postgresql://imbobi_staging:PASSWORD@staging-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/imbobi_staging

# ============================================================
# CACHE & QUEUE (Redis)
# ============================================================
REDIS_HOST=staging-redis.c9akciq32.us-east-1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=optional-password
REDIS_DB=0

# ============================================================
# SECURITY KEYS (Generate with: openssl rand -base64 32)
# ============================================================
JWT_SECRET=<paste-64-chars-openssl-output-here>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<paste-64-chars-openssl-output-here>
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_SECRET=<paste-32-chars-openssl-output-here>

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
SMTP_FROM=noreply-staging@imbobi.com
SMTP_FROM_NAME=imbobi Staging
APP_URL=https://staging-app.imbobi.com

# ============================================================
# PUSH NOTIFICATIONS (Firebase)
# ============================================================
FIREBASE_PROJECT_ID=imbobi-staging
FIREBASE_PRIVATE_KEY=<json-key-from-firebase-console>
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@imbobi-staging.iam.gserviceaccount.com

# ============================================================
# EXTERNAL INTEGRATIONS
# ============================================================
UNICO_API_KEY=<staging-unico-biometric-key>
SERPRO_TOKEN=<staging-serpro-token>

# ============================================================
# FRONTEND URLS (for CORS & OAuth redirects)
# ============================================================
NEXT_PUBLIC_API_URL=https://staging-api.imbobi.com
EXPO_PUBLIC_API_URL=https://staging-api.imbobi.com
EAS_PROJECT_ID=<eas-staging-project-id>

# ============================================================
# OPTIONAL: MONITORING
# ============================================================
SENTRY_DSN=<optional-sentry-dsn>
DD_AGENT_HOST=datadog-agent.internal  # Optional: Datadog
```

**Generate secure keys:**
```bash
# JWT_SECRET (64 chars)
openssl rand -base64 32

# ENCRYPTION_SECRET (32 chars)
openssl rand -base64 32
```

**⚠️ NEVER commit `.env.staging` — Add to `.gitignore`**

---

## ENVIRONMENT VALIDATION CHECKLIST

### Before Every Deployment

```bash
# 1. Verify AWS credentials
aws s3 ls s3://imbobi-staging-evidencias --profile staging

# 2. Verify PostgreSQL connection
psql "postgresql://imbobi_staging:PASSWORD@staging-db.c9akciq32.us-east-1.rds.amazonaws.com:5432/imbobi_staging" -c "SELECT version();"

# 3. Verify Redis connection
redis-cli -h staging-redis.c9akciq32.us-east-1.cache.amazonaws.com ping
# Expected output: PONG

# 4. Verify SendGrid API key
curl -s https://api.sendgrid.com/v3/mail/validate \
  -X POST \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@imbobi.com"}' | jq '.is_valid_email'
# Expected output: true

# 5. Verify Firebase credentials
firebase --version
firebase config:get --project imbobi-staging

# 6. Verify GitHub secrets are set
gh secret list | grep STAGING
```

---

## HEALTH CHECK ENDPOINTS

**API Health (Complete Status):**
```bash
curl -s https://staging-api.imbobi.com/api/v1/health | jq .
```

**Individual Service Checks:**
```bash
# Database
curl -s https://staging-api.imbobi.com/api/v1/health/database | jq .

# Redis Cache
curl -s https://staging-api.imbobi.com/api/v1/health/redis | jq .

# Email Service
curl -s https://staging-api.imbobi.com/api/v1/health/email | jq .

# Firebase Push Notifications
curl -s https://staging-api.imbobi.com/api/v1/health/firebase | jq .

# S3 Storage
curl -s https://staging-api.imbobi.com/api/v1/health/s3 | jq .

# Encryption Service
curl -s https://staging-api.imbobi.com/api/v1/health/encryption | jq .
```

---

## 🔄 ROLLBACK PROCEDURES

### Quick Rollback (Automated)

```bash
bash scripts/staging-rollback.sh
```

**What it does:**
1. Pauses incoming traffic
2. Reverts Prisma migrations
3. Restores previous Docker container
4. Validates API health
5. Notifies Slack

---

### Manual Rollback - Step by Step

**1. Stop current container:**
```bash
docker stop imbobi-api-staging
docker rm imbobi-api-staging
```

**2. View previous versions:**
```bash
docker images --filter "reference=imbobi-api:staging*" \
  --format "table {{.Tag}}\t{{.CreatedAt}}"
```

**3. Revert database (if migrations broke):**
```bash
cd /home/user/alagami-site/services/api

# List all migrations
DATABASE_URL="postgresql://..." pnpm prisma migrate status

# Rollback last migration
DATABASE_URL="postgresql://..." pnpm prisma migrate resolve --rolled-back <migration-name>
```

**4. Start previous version:**
```bash
docker run -d \
  --name imbobi-api-staging \
  --restart unless-stopped \
  -p 4000:4000 \
  --env-file .env.staging \
  --network imbobi_network \
  imbobi-api:staging-<previous-git-sha>
```

**5. Verify:**
```bash
curl -f https://staging-api.imbobi.com/api/v1/health
echo $?  # Should output 0 (success)
```

---

### Emergency Stop (Nuclear Option)

```bash
# Stop ALL services immediately
docker stop imbobi-api-staging imbobi-postgres-staging imbobi-redis-staging

# View last 100 lines of logs
docker logs imbobi-api-staging | tail -100

# Full rollback
bash scripts/staging-rollback.sh
```

---

## 📊 MONITORING & ALERTS

### View Live Logs

```bash
# API logs (follow mode)
docker logs -f imbobi-api-staging

# Last 50 lines
docker logs imbobi-api-staging | tail -50

# Search for errors
docker logs imbobi-api-staging 2>&1 | grep -i error
```

### Database Monitoring

```bash
# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql $DATABASE_URL -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Check table sizes
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Redis Monitoring

```bash
# Redis stats
redis-cli -h staging-redis.c9akciq32.us-east-1.cache.amazonaws.com INFO

# Check key count
redis-cli -h staging-redis.c9akciq32.us-east-1.cache.amazonaws.com DBSIZE

# Monitor in real-time
redis-cli -h staging-redis.c9akciq32.us-east-1.cache.amazonaws.com MONITOR
```

---

## PRE-DEPLOYMENT CHECKLIST

- [ ] Pull latest code: `git pull origin main`
- [ ] Type check: `pnpm type-check`
- [ ] Build locally: `pnpm build`
- [ ] Run tests: `pnpm test`
- [ ] `.env.staging` file exists (not committed)
- [ ] All secrets validated (AWS, Firebase, SendGrid)
- [ ] Database backup created
- [ ] Redis operational
- [ ] Team notified in Slack #imbobi-deployments

---

## DEPLOYMENT CHECKLIST

- [ ] Run: `bash scripts/staging-init.sh` (first time only)
- [ ] Run: `bash scripts/staging-deploy.sh`
- [ ] Verify logs: `docker logs imbobi-api-staging`
- [ ] Run: `bash scripts/staging-e2e.sh`
- [ ] Check: `curl -f https://staging-api.imbobi.com/api/v1/health`
- [ ] Manual testing: https://staging-app.imbobi.com
- [ ] Check Slack alerts/notifications
- [ ] Monitor health checks for 30 minutes

---

## POST-DEPLOYMENT CHECKLIST

- [ ] Web app accessible: https://staging-app.imbobi.com
- [ ] API endpoints responding: `curl -f https://staging-api.imbobi.com/api/v1/status`
- [ ] Database migrations applied: `pnpm db:status`
- [ ] Health check cron active: `crontab -l | grep health`
- [ ] Logs streaming properly: `docker logs imbobi-api-staging | head -20`
- [ ] No error spikes in monitoring dashboard
- [ ] Team notified: "Staging deployed - commit SHA xyz"

---

## INCIDENT RESPONSE

### API is Down

```bash
# 1. Check logs immediately
docker logs imbobi-api-staging | tail -100

# 2. Check database
psql $DATABASE_URL -c "SELECT 1;"

# 3. Check Redis
redis-cli -h staging-redis... ping

# 4. If nothing works, rollback
bash scripts/staging-rollback.sh

# 5. Investigate root cause
git log --oneline -n 10
```

### Database Migration Failed

```bash
# 1. Check migration status
cd services/api
DATABASE_URL="..." pnpm prisma migrate status

# 2. Check database disk space
# (On RDS: check AWS console)

# 3. Rollback migration
DATABASE_URL="..." pnpm prisma migrate resolve --rolled-back <migration-name>

# 4. Restore from backup if needed
pg_restore -h staging-db... -d imbobi_staging backup_20260527_120000.sql
```

### Email Service Not Working

```bash
# Verify SendGrid API key
curl -s https://api.sendgrid.com/v3/api_keys \
  -H "Authorization: Bearer $SENDGRID_API_KEY" | jq '.[0].name'

# Test sending email via API
curl -X POST "https://staging-api.imbobi.com/api/v1/health/email"
```

### Push Notifications Failing

```bash
# Check Firebase project status
firebase projects:list --json

# Verify Firebase credentials in .env.staging
echo "FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID"
echo "FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL"

# Test Firebase endpoint
curl -s https://staging-api.imbobi.com/api/v1/health/firebase | jq .
```

---

## 📁 IMPORTANT FILES & PATHS

| Item | Path |
|------|------|
| Deployment Plan (Detailed) | `/home/user/alagami-site/STAGING_DEPLOYMENT_PLAN.md` |
| Deploy Script | `/home/user/alagami-site/scripts/staging-deploy.sh` |
| Init Script | `/home/user/alagami-site/scripts/staging-init.sh` |
| Health Check Script | `/home/user/alagami-site/scripts/staging-health-check.sh` |
| E2E Test Script | `/home/user/alagami-site/scripts/staging-e2e.sh` |
| Rollback Script | `/home/user/alagami-site/scripts/staging-rollback.sh` |
| Environment File | `.env.staging` (create locally, DO NOT COMMIT) |
| Docker Compose | `docker-compose.staging.yml` (if exists) |
| Prisma Schema | `/home/user/alagami-site/services/api/prisma/schema.prisma` |

---

## 🔗 HELPFUL COMMANDS

```bash
# Jump to project root
cd /home/user/alagami-site

# View all available scripts
ls -lah scripts/staging-*

# Check git status
git status

# View recent commits
git log --oneline -n 10

# Check pnpm workspaces
pnpm ls -r --depth=0

# Build only API
pnpm -F @imbobi/api build

# Run API tests
pnpm -F @imbobi/api test

# Type check only
pnpm type-check
```

---

## 📞 ESCALATION

| Issue | Contact | Channel |
|-------|---------|---------|
| API/Backend Issues | Backend Team | Slack #imbobi-backend |
| Database Issues | DBA Team | Slack #imbobi-dba |
| AWS/Infrastructure | Cloud Ops | Slack #imbobi-cloud |
| Deployment Stuck | DevOps Lead | Slack @devops-oncall |
| Critical Outage | Incident Commander | Slack @incident-commander |

---

## 🎯 SUMMARY

This guide provides everything needed for staging deployments:

1. **Setup:** `bash scripts/staging-init.sh` (once)
2. **Deploy:** `bash scripts/staging-deploy.sh` (every time)
3. **Validate:** `bash scripts/staging-health-check.sh` (automated)
4. **Test:** `bash scripts/staging-e2e.sh` (automated)
5. **Rollback:** `bash scripts/staging-rollback.sh` (if needed)

All scripts include logging, error handling, and Slack notifications.

---

**Last Updated:** 2026-05-27  
**Document Version:** 1.0  
**Status:** ✅ Ready for Production Use
