# 🎬 Deployment Playbook - Soft Launch

**Target**: Production deployment to Railway  
**Timeline**: Today (3 hours total)  
**Status**: Go/No-Go decision point

---

## Phase 1: Railway Setup (15 minutes)

### Prerequisites Checklist
- [ ] Railway account created (https://railway.app)
- [ ] GitHub account connected to Railway
- [ ] Access to imobi repository

### Execution Steps

1. **Create Railway Project** (2 min)
   ```
   Go to https://railway.app
   New Project → Deploy from GitHub
   Select: contatovinicaetano93-commits/imobi
   Branch: main
   ```

2. **Add PostgreSQL Database** (3 min)
   ```
   Project → New → Database → PostgreSQL
   Wait for "Connected" status (green checkmark)
   Copy DATABASE_URL from Variables tab
   ```

3. **Add Redis Cache** (3 min)
   ```
   Project → New → Cache → Redis
   Wait for "Connected" status
   Note: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
   ```

4. **Generate Secrets** (2 min)
   ```bash
   JWT_SECRET=$(openssl rand -base64 32)
   ENCRYPTION_KEY=$(openssl rand -base64 32)
   echo "JWT_SECRET=$JWT_SECRET"
   echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
   ```

5. **Configure Environment Variables** (5 min)
   ```
   In Railway → Variables tab, add:
   - NODE_ENV=production
   - PORT=3000
   - DATABASE_URL=(from step 2)
   - REDIS_HOST=(from step 3)
   - REDIS_PORT=(from step 3)
   - REDIS_PASSWORD=(from step 3)
   - JWT_SECRET=(from step 4)
   - ENCRYPTION_KEY=(from step 4)
   - LOG_LEVEL=info
   - STRUCTURED_LOGGING=true
   - PROMETHEUS_ENABLED=true
   - SWAGGER_ENABLED=true
   ```

**Success Criteria**:
- [ ] Railway project exists
- [ ] PostgreSQL shows "Connected"
- [ ] Redis shows "Connected"
- [ ] All variables configured

---

## Phase 2: API Deployment (10 minutes)

### 1. Deploy Service
```
In Railway → New → GitHub Repo
- Name: imobi-api
- Repo: contatovinicaetano93-commits/imobi
- Branch: main
- Root: services/api
- Build: pnpm install --frozen-lockfile && pnpm build --filter @imbobi/api
- Start: node dist/main.js
- Node: 20.x

Click "Deploy"
```

### 2. Monitor Build
```
Watch Railway dashboard:
- Build starts (yellow)
- Build completes (green checkmark)
- Container running (green)
- Takes 3-5 minutes
```

**Note the API URL**: `https://<subdomain>.railway.app`

**Success Criteria**:
- [ ] Build completes successfully
- [ ] Container is running (green)
- [ ] Logs show "App listening on port 3000"

---

## Phase 3: Database Setup (5 minutes)

### 1. Run Migrations
```
In Railway dashboard:
1. Open imobi-api service
2. Click "Shell" tab
3. Run commands:

cd services/api
npx prisma migrate deploy --schema prisma/schema.prisma
```

**Expected output**:
```
✓ Applied migration(s): (timestamp_migration_name)
```

**Success Criteria**:
- [ ] Migrations applied without errors
- [ ] Database is accessible

---

## Phase 4: Verification (10 minutes)

### 1. Run Post-Deploy Checks
```bash
bash scripts/post-deploy-verification.sh https://<your-railway-url>
```

Expected output:
```
🚀 Post-Deployment Verification
✓ API is reachable
✓ Database connected
✓ Redis connected
✓ Metrics endpoint accessible
✓ OpenAPI docs accessible
✓ User registration successful
✓ User login successful
✓ Protected endpoint accessible with JWT
✓ Rate limiting active
✓ Prometheus metrics available
```

### 2. Manual Verification
```bash
# Health check
curl https://<your-railway-url>/health

# API docs
curl https://<your-railway-url>/docs

# Public endpoint
curl -X POST https://<your-railway-url>/api/v1/public/simulador \
  -H 'Content-Type: application/json' \
  -d '{"valorSolicitado": 1000000, "prazoMeses": 24, "tipoObra": "CONSTRUCAO"}'
```

**Success Criteria**:
- [ ] Health check returns 200 OK with database/redis status
- [ ] Swagger docs accessible
- [ ] Public simulator endpoint works
- [ ] All post-deploy checks pass

---

## Phase 5: Frontend Integration (20 minutes)

### 1. Update Frontend API URL

**File**: `apps/web/.env.local`
```env
NEXT_PUBLIC_API_URL=https://<your-railway-url>
```

### 2. Test Auth Flow
```bash
cd apps/web
pnpm dev
# Open http://localhost:3001
```

**Manual Test Sequence**:
1. Click "Cadastro" (Register)
2. Fill form with test data
3. Submit registration
4. Should see success message
5. Go to Login page
6. Login with test credentials
7. Should redirect to dashboard
8. Verify session persists on page reload

### 3. Test API Calls
```bash
# In browser console, test API call
fetch('/api/v1/obras', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
}).then(r => r.json()).then(console.log)
```

**Success Criteria**:
- [ ] Registration works
- [ ] Login works
- [ ] Session persists on reload
- [ ] API calls work with JWT
- [ ] Dashboard loads

---

## Phase 6: Monitoring Setup (Optional, 10 minutes)

### 1. Sentry Integration
```
Not required for MVP
Can add post-launch:
1. Create Sentry project
2. Get DSN
3. Add SENTRY_DSN to Railway variables
4. Redeploy
```

### 2. UptimeRobot
```
Not required for MVP
Can add post-launch:
1. Go to uptime.robot
2. New Monitor
3. URL: https://<your-railway-url>/health
4. Frequency: 5 minutes
```

---

## Phase 7: Go/No-Go Decision

### Go Criteria ✅
- [ ] All phases 1-5 successful
- [ ] No critical errors in browser console
- [ ] API responding < 500ms
- [ ] Database connected
- [ ] Auth flow complete

### No-Go Criteria ❌
- [ ] Build failed
- [ ] Database migration failed
- [ ] API not responding
- [ ] Auth flow broken
- [ ] Rate limiting preventing operations

---

## Troubleshooting Guide

### Build Failed
```
Check Railway logs:
1. Go to imobi-api service
2. Click "Logs" tab
3. Look for error messages
4. Common issues:
   - Node version wrong (use 20.x)
   - pnpm not found (add to PATH)
   - Missing dependencies (check pnpm install)
```

### Database Not Connecting
```
1. Verify DATABASE_URL in Railway Variables
2. Check PostgreSQL service is running (green checkmark)
3. Try in Railway shell:
   psql $DATABASE_URL -c "SELECT 1;"
4. If fails, check database logs
```

### Migration Failed
```
1. Verify Prisma schema is correct
2. Check database permissions
3. Try migrating locally first:
   cd services/api
   DATABASE_URL=<test-db> npx prisma migrate deploy
```

### API Responding Slow (> 1 second)
```
1. Check database query performance
2. Check Redis is configured correctly
3. Reduce DATABASE_POOL_SIZE to 10 (if memory constrained)
4. Check logs for slow queries
```

### Frontend Can't Connect to API
```
1. Verify NEXT_PUBLIC_API_URL is correct
2. Check CORS is enabled (should be by default)
3. Verify JWT token is being sent in Authorization header
4. Check browser console for errors
5. Check API logs for 401/403 errors
```

---

## Post-Launch Checklist

### Immediate (Within 1 hour)
- [ ] Monitor API logs for errors
- [ ] Monitor error rate (target: < 1%)
- [ ] Verify database backups are running
- [ ] Check Redis memory usage
- [ ] Monitor API response time

### Within 24 hours
- [ ] Setup Sentry for error tracking
- [ ] Setup UptimeRobot monitoring
- [ ] Configure CloudFlare DNS (optional)
- [ ] Setup automated backups
- [ ] Document deployment status

### Within 1 week
- [ ] Performance audit (Lighthouse)
- [ ] Security audit (OWASP top 10)
- [ ] Load testing (100+ concurrent users)
- [ ] Disaster recovery test
- [ ] Capacity planning review

---

## Rollback Plan

If critical issues discovered:

### Option 1: Quick Fix (Recommended)
```bash
# Fix issue in code
git commit -m "hotfix: ..."
git push origin main
# Railway auto-redeploys
```

### Option 2: Rollback to Previous
```bash
# In Railway dashboard:
imobi-api → Deployments → Click previous build → "Redeploy"
```

### Option 3: Full Rollback
```bash
# Revert commit
git revert <commit-hash>
git push origin main
# Wait for redeploy
```

---

## Communication Checklist

### Before Launch
- [ ] Notify #imobi-dev: "Deploying to production in 30 min"
- [ ] Notify team to be on standby
- [ ] Have Slack channel ready for issues

### During Launch
- [ ] Post progress updates every 5 min
- [ ] If blocked, escalate immediately
- [ ] Document any issues

### After Launch
- [ ] Post success message
- [ ] Share API URL with frontend team
- [ ] Start monitoring logs
- [ ] Schedule post-launch retrospective

---

## Success Metrics

| Metric | Target | Alert at |
|--------|--------|----------|
| API Uptime | > 99% | < 99% |
| Response Time (p95) | < 500ms | > 1000ms |
| Error Rate | < 1% | > 2% |
| Database Connections | < 20 | > 22 |
| Memory Usage | < 512MB | > 700MB |

---

## Timeline Summary

```
Start: 0:00
  Phase 1 (Railway setup): 0:00 - 0:15 ✓
  Phase 2 (API deploy): 0:15 - 0:25 ✓
  Phase 3 (Database): 0:25 - 0:30 ✓
  Phase 4 (Verification): 0:30 - 0:40 ✓
  Phase 5 (Frontend): 0:40 - 1:00 ✓
  Phase 6 (Monitoring): 1:00 - 1:10 (optional)
  Phase 7 (Decision): 1:10 - 1:15 ✓
End: ~1:15 (75 minutes)
```

---

## Key Contacts

| Role | Name | Slack | Notes |
|------|------|-------|-------|
| DevOps Lead | Claude | @claude | Deployment, infrastructure |
| Frontend Lead | Cursor | @cursor | Frontend integration |
| Product Lead | User | @user | Go/No-go decisions |

---

**Status**: Ready to execute  
**Confidence**: HIGH (all systems tested locally)  
**Risk Level**: LOW (standard Railway deployment, no custom infrastructure)

🚀 **Ready to deploy?** Start with Phase 1: Railway Setup
