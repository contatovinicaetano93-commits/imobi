# Pre-Launch Checklist — Imobi Fintech MVP

**Date**: June 23, 2026  
**Status**: Ready for Execution  
**Estimated Duration**: 4-6 hours

---

## Pre-Deployment Validation (1 hour)

### Code Quality

- [ ] All TypeScript types valid
  ```bash
  pnpm type-check
  # Expected: 0 errors in all packages
  ```

- [ ] No linting issues
  ```bash
  pnpm lint
  # Expected: 0 errors, 0 warnings
  ```

- [ ] Builds successfully
  ```bash
  pnpm build
  # Expected: Completes in <90 seconds, all packages build
  ```

- [ ] No uncommitted changes
  ```bash
  git status
  # Expected: "nothing to commit, working tree clean"
  ```

- [ ] Git branch is main/production
  ```bash
  git rev-parse --abbrev-ref HEAD
  # Expected: main (or your production branch)
  ```

### Environment Verification

- [ ] .env files are NOT in git
  ```bash
  git ls-files | grep ".env"
  # Expected: (empty - should show none)
  ```

- [ ] .env.example files exist and are complete
  ```bash
  find . -name ".env.example" | head -5
  # Expected: Multiple .env.example files present
  ```

- [ ] vercel.json configured correctly
  ```bash
  cat vercel.json | grep -i "NEXT_PUBLIC_API_URL"
  # Expected: Contains API URL pointing to production
  ```

- [ ] Dockerfile exists for API
  ```bash
  [ -f services/api/Dockerfile ] && echo "✓ Dockerfile found"
  ```

- [ ] Docker builds successfully
  ```bash
  docker build -f services/api/Dockerfile -t imobi-api:test .
  # Expected: Successfully built image
  ```

### Git History

- [ ] Latest commits are stable
  ```bash
  git log --oneline -5
  # Expected: Recent commits, all passing CI
  ```

- [ ] No "WIP" or "TODO" commits
  ```bash
  git log --oneline -20 | grep -i "wip\|todo"
  # Expected: (empty - no matches)
  ```

- [ ] Tag v1.0.0 exists for rollback
  ```bash
  git tag -l | grep v1.0.0
  # Expected: v1.0.0 exists
  ```

---

## Infrastructure Setup (1.5 hours)

### Frontend Infrastructure (Vercel)

- [ ] Vercel account created
  - Go to https://vercel.com and login

- [ ] GitHub repository connected
  - Vercel Settings → Integrations → GitHub
  - Authorize and select `contatovinicaetano93-commits/imobi`

- [ ] Project created
  ```
  https://vercel.com/new
  → Import Repository
  → Select imobi
  → Deploy
  ```

- [ ] Build succeeds in Vercel
  - Check: Deployments → View last deployment log
  - Expected: No errors, "Built successfully"

- [ ] Environment variables added to Vercel
  - Settings → Environment Variables
  - Add all variables from `apps/web/.env.production.example`
  - Scope: Production

- [ ] Custom domain configured (if applicable)
  - Settings → Domains
  - Add: `imobi.com.br`
  - Update DNS records
  - Wait for SSL certificate (5-30 minutes)

- [ ] Preview deployments working
  - Create PR and check preview URL
  - Should work without errors

### Backend Infrastructure (Railway/Render)

#### Database Setup

- [ ] PostgreSQL database created
  - Platform: Railway.app or Render.com
  - Database name: `imobi_prod`
  - Username: `imobi_user`
  - Version: PostgreSQL 15+

- [ ] DATABASE_URL obtained
  ```bash
  # Railway: Copy from Variables tab
  # Format: postgresql://user:password@host:5432/db
  ```

- [ ] PostGIS extension enabled
  ```bash
  psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"
  psql $DATABASE_URL -c "SELECT postgis_version();"
  ```

#### Redis Setup

- [ ] Redis cache created
  - Provider: Railway, Render, or Upstash
  - Version: Redis 7.x or latest

- [ ] REDIS_URL obtained
  ```bash
  # Format: redis://default:password@host:6379
  # Test: redis-cli -u $REDIS_URL PING
  # Expected: PONG
  ```

#### API Service Setup

- [ ] API service created in Railway/Render
  - Service name: `imobi-api-prod`
  - Root directory: `services/api`
  - Dockerfile path: `Dockerfile`

- [ ] All environment variables configured
  - Copy all from `.env.production.example`
  - Generate new secrets (see below)

- [ ] Health check endpoint configured
  - Path: `/api/v1/health`
  - Interval: 30 seconds
  - Timeout: 10 seconds

- [ ] Custom domain configured
  - Domain: `api.imobi.com.br`
  - SSL auto-configured
  - DNS records updated

---

## Secrets & Environment Setup (1 hour)

### Generate Required Secrets

**JWT Secret** (minimum 64 characters):
```bash
openssl rand -base64 64
# Store in: .env.production (JWT_SECRET)
# Also add to Vercel/Railway dashboard
```

**Encryption Key** (32-byte hex):
```bash
openssl rand -hex 32
# Store in: .env.production (ENCRYPTION_KEY)
```

**Database Password** (if using custom setup):
```bash
openssl rand -base64 32
```

### Create .env Files

**Backend** `.env.production` (DO NOT COMMIT):
```bash
cd /home/user/imobi
cp .env.production.example .env.production

# Edit with actual production values:
nano .env.production
```

**Required fields in `.env.production`**:
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL=postgresql://...`
- [ ] `REDIS_URL=redis://...` (or REDIS_HOST/PORT/PASSWORD)
- [ ] `JWT_SECRET=` (64+ char generated above)
- [ ] `ENCRYPTION_KEY=` (hex generated above)
- [ ] `CORS_ORIGIN=https://imobi.com.br,https://app.imobi.com.br`
- [ ] `SENDGRID_API_KEY=` (from SendGrid account)
- [ ] `FIREBASE_PROJECT_ID=` (from Firebase console)
- [ ] `AWS_S3_BUCKET=` (from AWS console)
- [ ] `SENTRY_DSN=` (from Sentry backend project)

**Frontend** `apps/web/.env.production` (DO NOT COMMIT):
```bash
cd apps/web
cp .env.local.example .env.production

# Edit with actual values:
nano .env.production
```

**Required fields**:
- [ ] `NEXT_PUBLIC_API_URL=https://api.imobi.com.br`
- [ ] `JWT_SECRET=` (same as backend)
- [ ] `NEXT_PUBLIC_SENTRY_DSN=` (from Sentry frontend project)
- [ ] `NEXT_PUBLIC_APP_NAME=IMOBI`
- [ ] `NODE_ENV=production`

### Verify Secrets

```bash
# Check .env files NOT in git
git status | grep ".env"
# Expected: (empty)

# Check secrets are safe
grep -E "AWS_KEY|JWT_SECRET|PASSWORD" .env.production | wc -l
# Should show matches (secrets present)

# Never expose in logs
grep -rE "JWT_SECRET|ENCRYPTION_KEY" docs/
# Expected: (empty in documentation)
```

---

## External Services Setup (1 hour)

### Sentry (Error Tracking)

- [ ] Sentry account created
  - Go to https://sentry.io/signup

- [ ] Organization created
  - Name: `imobi`

- [ ] Backend (API) project created
  - Platform: Node.js
  - Project name: `imobi-api`
  - SENTRY_DSN obtained

- [ ] Frontend (Web) project created
  - Platform: JavaScript/React
  - Project name: `imobi-web`
  - NEXT_PUBLIC_SENTRY_DSN obtained

- [ ] Slack integration enabled
  - Organization Settings → Integrations
  - Add Slack workspace
  - Select channels for alerts

### SendGrid (Email)

- [ ] Account created
  - Go to https://sendgrid.com

- [ ] API key generated
  - Settings → API Keys
  - Create key
  - SENDGRID_API_KEY obtained

- [ ] Sender email verified
  - Settings → Sender Authentication
  - Add and verify: `noreply@imobi.com.br`

### Firebase (Push Notifications)

- [ ] Firebase project created
  - Go to https://console.firebase.google.com

- [ ] Service account created
  - Settings → Service Accounts
  - Create new service account
  - Download JSON key file

- [ ] Credentials extracted
  - FIREBASE_PROJECT_ID
  - FIREBASE_PRIVATE_KEY
  - FIREBASE_CLIENT_EMAIL

### AWS S3 (Photo Storage)

- [ ] AWS account created
  - Go to https://console.aws.amazon.com

- [ ] S3 bucket created
  - Name: `imobi-prod-evidence`
  - Region: `us-east-1`
  - Block public access: ✓ Enabled

- [ ] IAM user created
  - Name: `imobi-api`
  - Permissions: S3 read/write only
  - Access keys downloaded

- [ ] CORS configured
  - Bucket Settings → CORS
  - Allow GET, PUT, POST from: `https://imobi.com.br`

### UptimeRobot (Monitoring)

- [ ] Account created
  - Go to https://uptimerobot.com

- [ ] API monitor created
  - Type: HTTPS
  - URL: `https://api.imobi.com.br/api/v1/health`
  - Check interval: 5 minutes
  - Alert on failure: Yes

- [ ] Frontend monitor created
  - Type: HTTPS
  - URL: `https://imobi.com.br`
  - Check interval: 5 minutes

- [ ] Slack notifications enabled
  - Add Slack webhook
  - Test notification sent

---

## Database Migration (30 minutes)

### Run Migrations on Production

**Step 1: Verify migration files**
```bash
ls services/api/prisma/migrations/
# Expected: Multiple migration files (migration_20240101_xxx/, etc.)
```

**Step 2: Run migrations**
```bash
# Migrations run automatically on API startup via:
# services/api/package.json: "start": "prisma migrate deploy && node dist/main.js"

# Or manually trigger:
DATABASE_URL=$DATABASE_URL \
  pnpm --filter @imbobi/api run prisma:migrate:deploy
```

**Step 3: Verify database schema**
```bash
psql $DATABASE_URL -c "
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
"
# Expected: usuarios, obras, creditos, etapas, etc. tables

psql $DATABASE_URL -c "\dx postgis"
# Expected: postgis extension listed
```

**Step 4: Seed initial data (if needed)**
```bash
# Optional: Add initial system data
DATABASE_URL=$DATABASE_URL \
  pnpm --filter @imbobi/api run seed:prod
```

---

## Pre-Launch Testing (1 hour)

### Build Verification

- [ ] Frontend builds without errors
  ```bash
  cd apps/web && pnpm build
  # Expected: Build completes, .next directory created
  ```

- [ ] Backend builds without errors
  ```bash
  cd services/api && pnpm build
  # Expected: dist/main.js exists and is executable
  ```

- [ ] Docker image builds successfully
  ```bash
  docker build -f services/api/Dockerfile -t imobi-api:prod .
  # Expected: Successfully built image
  ```

### Connectivity Tests

- [ ] Frontend loads
  ```bash
  curl -s https://imobi.com.br | grep "<html"
  # Expected: HTML content returned
  ```

- [ ] API responds
  ```bash
  curl -s https://api.imobi.com.br/api/v1/health | jq .
  # Expected: {"status":"ok","uptime":...}
  ```

- [ ] Database accessible
  ```bash
  psql $DATABASE_URL -c "SELECT 1;"
  # Expected: (1 row)
  ```

- [ ] Redis accessible
  ```bash
  redis-cli -u $REDIS_URL PING
  # Expected: PONG
  ```

### Authentication Tests

- [ ] User registration works
  ```bash
  curl -X POST https://api.imobi.com.br/api/v1/auth/signup \
    -H 'Content-Type: application/json' \
    -d '{
      "email":"testuser@example.com",
      "senha":"TestPass123!",
      "nome":"Test User"
    }'
  # Expected: HTTP 201, returns userId and token
  ```

- [ ] User login works
  ```bash
  curl -X POST https://api.imobi.com.br/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"testuser@example.com","senha":"TestPass123!"}'
  # Expected: HTTP 200, returns accessToken and refreshToken
  ```

- [ ] Protected endpoints work
  ```bash
  TOKEN="..."  # From login response
  curl -H "Authorization: Bearer $TOKEN" \
    https://api.imobi.com.br/api/v1/obras
  # Expected: HTTP 200, returns obras array
  ```

### Monitoring Tests

- [ ] Sentry receiving errors
  - Trigger test error: `curl -X POST https://api.imobi.com.br/api/v1/test-error`
  - Check Sentry dashboard: Should appear within 10 seconds

- [ ] Metrics being recorded
  ```bash
  curl -s https://api.imobi.com.br/metrics | head -20
  # Expected: Prometheus format metrics
  ```

- [ ] UptimeRobot monitoring active
  - Check: https://uptimerobot.com/dashboard
  - Expected: All monitors showing UP

- [ ] Rate limiting working
  ```bash
  # Send 101+ requests in 60 seconds
  for i in {1..105}; do
    curl -s -o /dev/null -w "%{http_code}\n" \
      https://api.imobi.com.br/api/v1/health
  done
  # Expected: Last requests return 429 (Too Many Requests)
  ```

---

## Security Verification (30 minutes)

### HTTPS & TLS

- [ ] Frontend served over HTTPS only
  ```bash
  curl -I https://imobi.com.br | grep "Strict-Transport-Security"
  # Expected: Should redirect HTTP → HTTPS
  ```

- [ ] API served over HTTPS only
  ```bash
  curl -I https://api.imobi.com.br/api/v1/health | grep "HTTP/1.1"
  # Expected: 200 OK, no insecure warnings
  ```

- [ ] SSL certificate valid
  ```bash
  openssl s_client -connect imobi.com.br:443 | grep "Verify return code"
  # Expected: "Verify return code: 0 (ok)"
  ```

### CORS Configuration

- [ ] CORS headers correct
  ```bash
  curl -H "Origin: https://imobi.com.br" \
    https://api.imobi.com.br/api/v1/health -v | grep "Access-Control"
  # Expected: Access-Control-Allow-Origin: https://imobi.com.br
  ```

- [ ] Cross-origin requests blocked from unknown origins
  ```bash
  curl -H "Origin: https://evil.com" \
    https://api.imobi.com.br/api/v1/health -v | grep "Access-Control"
  # Expected: No Access-Control-Allow-Origin header
  ```

### Input Validation

- [ ] API rejects invalid input
  ```bash
  curl -X POST https://api.imobi.com.br/api/v1/auth/signup \
    -H 'Content-Type: application/json' \
    -d '{"email":"invalid-email"}'
  # Expected: HTTP 400, validation error message
  ```

- [ ] No SQL injection vulnerability
  ```bash
  curl -X POST https://api.imobi.com.br/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@test.com\"; DROP TABLE users; --","senha":"x"}'
  # Expected: HTTP 400, validation error (not executed)
  ```

### Secrets Management

- [ ] No secrets in git history
  ```bash
  git log -S "JWT_SECRET" --all --oneline | wc -l
  # Expected: 0 results
  ```

- [ ] Environment files in .gitignore
  ```bash
  grep "\.env" .gitignore
  # Expected: Lines for .env, .env.production, etc.
  ```

- [ ] No hardcoded secrets in code
  ```bash
  grep -rE "password.*=.*\"[^\"]{8,}" src/ | grep -v "example" | head -3
  # Expected: (empty - no hardcoded passwords)
  ```

---

## Deployment Execution (1 hour)

### Frontend Deployment (Vercel)

**Option 1: Automatic via GitHub**
- [ ] Push to main branch
  ```bash
  git push origin main
  ```
- [ ] Wait for Vercel auto-deployment (2-3 minutes)
- [ ] Check Vercel dashboard for "Deployed" status

**Option 2: Manual via CLI**
```bash
npm install -g vercel
vercel --prod
```

**Verification**:
```bash
# Test frontend is live
curl -s https://imobi.com.br | grep "IMOBI" | head -1
# Expected: Page title or branding text found
```

### Backend Deployment (Railway/Render)

**Option 1: Automatic via GitHub**
- [ ] Push to main branch (if configured)
- [ ] Railway will trigger auto-deployment

**Option 2: Manual**
```bash
# Railway CLI
railway login
railway deploy --service imobi-api-prod
```

**Verification**:
```bash
# Wait for deployment (2-3 minutes)
# Check status
curl -s https://api.imobi.com.br/api/v1/health | jq .status
# Expected: "ok"
```

### Database Migration

- [ ] Migrations run automatically on API startup ✓
- [ ] Or manually trigger before API deployment

---

## Post-Deployment Verification (30 minutes)

### Health Checks (Every 5 minutes for first 30 minutes)

```bash
# 1. Frontend availability
curl -I https://imobi.com.br
# Expected: HTTP 200

# 2. API health
curl -s https://api.imobi.com.br/api/v1/health | jq .
# Expected: status=ok, all components connected

# 3. Database
curl -s https://api.imobi.com.br/api/v1/health | jq .database
# Expected: "connected"

# 4. Redis
curl -s https://api.imobi.com.br/api/v1/health | jq .redis
# Expected: "connected"

# 5. Error monitoring
# Check Sentry: https://sentry.io/organizations/imobi/
# Expected: No unexpected errors

# 6. Uptime monitoring
# Check UptimeRobot: https://uptimerobot.com/
# Expected: All monitors UP
```

### Error Rate Monitoring

```bash
# During first hour, expect ~0-2 errors from edge cases
# If error rate > 5%, investigate immediately

curl -s https://api.imobi.com.br/metrics | grep http_requests_total
```

### Performance Baseline

```bash
# Measure response time (target: <500ms)
time curl -s https://api.imobi.com.br/api/v1/health > /dev/null

# Check metrics
curl -s https://api.imobi.com.br/metrics | grep "http_request_duration_seconds"
```

---

## Sign-Off Checklist

### Technical Team

- [ ] Frontend available at https://imobi.com.br
- [ ] Backend available at https://api.imobi.com.br
- [ ] Database migrated and verified
- [ ] All monitoring active and receiving data
- [ ] Error rate < 1%
- [ ] Response latency < 500ms
- [ ] No blocking security issues
- [ ] Backup system operational

### Operations Team

- [ ] Runbooks created and shared
- [ ] On-call procedures established
- [ ] Escalation contacts defined
- [ ] Monitoring dashboards bookmarked
- [ ] Incident response trained

### Product Team

- [ ] Critical workflows tested end-to-end
- [ ] User registration works
- [ ] Authentication flows verified
- [ ] Payment processing ready
- [ ] Email notifications sending

### Security Team

- [ ] SSL certificates valid
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Input validation working
- [ ] Secrets safely stored
- [ ] Security audit completed

### Final Sign-Off

**All checklist items completed?**

- [ ] **YES** → Proceed to Production Launch ✅
- [ ] **NO** → Resolve blockers before proceeding ❌

**Launched by**: _________________  
**Date/Time**: ___________________  
**Verified by**: _________________

---

## Rollback Plan (If Needed)

**If critical issues after deployment**:

### Immediate Actions (< 5 minutes)

1. Page on-call engineer
2. Check Sentry for errors
3. If error rate > 10%: Execute rollback below

### Frontend Rollback
```bash
# Vercel auto-maintains previous deployments
# Dashboard → Deployments → Select previous → "Redeploy"
# Wait 2-3 minutes
```

### Backend Rollback
```bash
# Option 1: Previous Git commit
git revert HEAD -m 1
git push origin main
# CI/CD will trigger redeploy

# Option 2: Via Railway
# Dashboard → Select previous successful deployment → Redeploy
```

### Database Rollback
```bash
# Only if data corruption occurred
# Use automated backup from Railway
# Dashboard → Database → Backups → Restore
```

---

**Print this checklist and check off each item as completed**

**Total Estimated Time**: 4-6 hours  
**Go-Live Target**: [DATE/TIME]
