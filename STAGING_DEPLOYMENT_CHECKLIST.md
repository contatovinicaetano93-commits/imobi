# ✅ STAGING DEPLOYMENT CHECKLIST

**Project:** imbobi  
**Last Updated:** 2026-05-27  
**Version:** 1.0

---

## PRE-DEPLOYMENT (Before Running Any Scripts)

### Code & Build
- [ ] Pull latest from main: `git pull origin main`
- [ ] No uncommitted changes: `git status` (should be clean)
- [ ] Type check passes: `pnpm type-check`
- [ ] Build succeeds locally: `pnpm build`
- [ ] Tests pass: `pnpm test`
- [ ] No security issues: Check Dependabot alerts

### Environment & Credentials
- [ ] `.env.staging` file created (DO NOT COMMIT)
- [ ] All required env vars set (see template below)
- [ ] AWS credentials configured (`aws configure --profile staging`)
- [ ] Firebase credentials downloaded
- [ ] SendGrid API key obtained
- [ ] GitHub secrets configured (`gh secret list | grep STAGING`)

### Infrastructure Validation
- [ ] AWS S3 bucket exists: `aws s3 ls s3://imbobi-staging-evidencias`
- [ ] PostgreSQL accessible: `psql $DATABASE_URL -c "SELECT 1;"`
- [ ] Redis accessible: `redis-cli -h $REDIS_HOST ping`
- [ ] Firebase project exists: `firebase projects:list --json`
- [ ] SendGrid API key valid: `curl -s https://api.sendgrid.com/v3/api_keys -H "Authorization: Bearer $SENDGRID_API_KEY" | jq '.[0].name'`

### Team Communication
- [ ] Notified team in Slack #imbobi-deployments
- [ ] Scheduled maintenance window if needed
- [ ] On-call person assigned
- [ ] Rollback plan reviewed

---

## INITIALIZATION (First Time Only)

```bash
# Run setup validation script
bash scripts/staging-init.sh

# Expected output: ✅ Setup validado com sucesso!
```

**Validation checklist:**
- [ ] S3 bucket ready
- [ ] RDS PostgreSQL operational (with PostGIS)
- [ ] ElastiCache Redis running
- [ ] Firebase project active
- [ ] SendGrid API accessible
- [ ] All GitHub secrets present

---

## DEPLOYMENT (Every Release)

### Step 1: Deploy Infrastructure & Code

```bash
bash scripts/staging-deploy.sh
```

**Checks in this script:**
- [ ] .env.staging file validated
- [ ] Type checking passes
- [ ] Monorepo builds successfully
- [ ] Database schema backup created
- [ ] Prisma migrations applied (with rollback capability)
- [ ] Docker container deployed
- [ ] Container starts without errors

**Expected output:**
```
✅ Deployment concluído com sucesso!
📊 Log: staging-deploy-2026-05-27_15-30-45.log
```

### Step 2: Validate Services (Health Checks)

```bash
bash scripts/staging-health-check.sh https://staging-api.imbobi.com
```

**Validates:**
- [ ] API responds to requests
- [ ] Database connection OK
- [ ] Redis cache working
- [ ] Email service (SMTP) operational
- [ ] Firebase initialized
- [ ] S3 bucket accessible
- [ ] Encryption service working

**Expected output:**
```
✓ Passed: 9 / 9 (100%)
✅ All health checks passed!
```

### Step 3: Run E2E Tests

```bash
bash scripts/staging-e2e.sh https://staging-api.imbobi.com
```

**Tests:**
- [ ] User registration flow
- [ ] User login & JWT token generation
- [ ] User profile retrieval
- [ ] File upload to S3
- [ ] Credit simulation (with GPS validation)
- [ ] Rate limiting validation

**Expected output:**
```
✅ All E2E tests passed!
```

### Step 4: Manual Smoke Tests

Access https://staging-app.imbobi.com and verify:
- [ ] App loads without errors
- [ ] Can navigate between pages
- [ ] Login form displays correctly
- [ ] API calls succeed (check Network tab)
- [ ] No console errors (F12)

### Step 5: Monitor for Errors (30 minutes)

```bash
# Watch logs in real-time
docker logs -f imbobi-api-staging

# Or check periodically
docker logs imbobi-api-staging | tail -20
```

Monitor for:
- [ ] No error spikes in logs
- [ ] No database connection errors
- [ ] No Redis timeout errors
- [ ] Response times normal
- [ ] No 5xx HTTP errors

---

## POST-DEPLOYMENT (After Verified)

### Notifications & Documentation
- [ ] Post deployment confirmation to Slack #imbobi-deployments
  ```
  Format: ✅ Staging deployed - commit SHA xyz, app accessible at https://staging-app.imbobi.com
  ```
- [ ] Update deployment log with completion time
- [ ] Document any issues encountered

### Monitoring Setup (Ongoing)
- [ ] Health check cron enabled (every 5 minutes)
  ```bash
  # Verify crontab
  crontab -l | grep staging-health-check
  ```
- [ ] Error alerts configured in monitoring system
- [ ] Team aware of escalation procedures

### Archive & Cleanup
- [ ] Save deployment log from `staging-deploy-*.log`
- [ ] No sensitive data in logs/commits
- [ ] Previous deployment logs archived

---

## IF SOMETHING BREAKS

### Level 1: Soft Rollback (Just Code)

```bash
# Stop just the API container
docker stop imbobi-api-staging

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

- [ ] API recovered
- [ ] Health checks passing
- [ ] Team notified

### Level 2: Full Rollback (Code + Database)

```bash
# Run automated rollback script
bash scripts/staging-rollback.sh
```

This:
- [ ] Pauses traffic
- [ ] Reverts database migration
- [ ] Restores previous container version
- [ ] Validates health
- [ ] Notifies Slack

### Level 3: Emergency Stop (Nuclear Option)

```bash
# Stop ALL services
docker stop imbobi-api-staging imbobi-postgres-staging imbobi-redis-staging

# View error logs
docker logs imbobi-api-staging | tail -100

# Full investigation needed before restart
```

- [ ] Incident report created
- [ ] Root cause identified
- [ ] Escalated to incident commander
- [ ] Post-mortem scheduled

---

## .env.staging TEMPLATE

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
REDIS_DB=0

# ============================================================
# SECURITY KEYS (Generate with: openssl rand -base64 32)
# ============================================================
JWT_SECRET=<paste-64-chars-openssl-output>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<paste-64-chars-openssl-output>
JWT_REFRESH_EXPIRES_IN=7d
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
# FRONTEND URLS
# ============================================================
NEXT_PUBLIC_API_URL=https://staging-api.imbobi.com
EXPO_PUBLIC_API_URL=https://staging-api.imbobi.com
EAS_PROJECT_ID=<eas-staging-project-id>
```

⚠️ **NEVER COMMIT .env.staging**

---

## QUICK COMMAND REFERENCE

```bash
# Setup (first time)
bash scripts/staging-init.sh

# Deploy
bash scripts/staging-deploy.sh

# Health check
bash scripts/staging-health-check.sh https://staging-api.imbobi.com

# E2E tests
bash scripts/staging-e2e.sh https://staging-api.imbobi.com

# View logs
docker logs imbobi-api-staging
docker logs -f imbobi-api-staging

# Rollback
bash scripts/staging-rollback.sh

# Database status
cd services/api && DATABASE_URL="..." pnpm prisma migrate status

# Type check
pnpm type-check

# Build
pnpm build

# Tests
pnpm test
```

---

## CONTACTS & ESCALATION

| Role | Channel | Escalation Time |
|------|---------|-----------------|
| Backend/API Issues | Slack #imbobi-backend | Immediate |
| Database Issues | Slack #imbobi-dba | Immediate |
| AWS/Infrastructure | Slack #imbobi-cloud | 15 minutes |
| Deployment Stuck | Slack @devops-oncall | 30 minutes |
| Critical Outage | Slack @incident-commander | Immediate |

---

## STATUS

- **Date:** 2026-05-27
- **Version:** 1.0
- **Status:** ✅ Ready for Use
- **Tested:** Yes
- **Documentation:** Complete

---

**Print this checklist and use it for every deployment!**
