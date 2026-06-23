# iMobi MVP — CUTOVER EXECUTION (LIVE)

**Date**: 2026-05-30 03:15 UTC  
**Status**: 🚀 **IN PROGRESS**  
**Duration**: ~2-4 hours  

---

## ✅ Pre-Deployment Checklist (COMPLETED)

- [x] Type-check passed (5/5 packages)
- [x] Security audit passed (20 env vars configured, 0 hardcoded secrets)
- [x] Git repo clean (all commits synced)
- [x] 3 CRITICAL bugs verified in code
- [x] Infrastructure ready (Vercel, PostgreSQL, Redis, S3, SES)

---

## 🚀 Deployment Steps

### STEP 1: Web Deployment (Vercel)
**Status**: ✅ IN PROGRESS  
**Time**: ~3-5 minutes

```bash
# 1. Push final code to Vercel-linked repo
git push origin claude/serene-pasteur-mB72T
# ✅ DONE (2026-05-30 03:40 UTC) - Latest: c2e70ac (embed buildCommand directly)

# 2. Vercel auto-deploys on push (watch: https://vercel.com/contatovinicaetano93-commits/imobi)
# Commit 6942214: Removed outputDirectory, relying on Vercel auto-detection
# Previous issues: Double pnpm install stripping devDependencies, wrong output path
# Fixes applied: .npmrc shamefully-hoist, separate install/build commands, removed outputDirectory
# Expected: Build succeeds in <60s, auto-detects .next output directory

# 3. Verify deployment
curl -s https://app.imbobi.com.br/api/health | jq .
```

**Success Criteria**:
- ⏳ Vercel build completes in <60s (watch dashboard)
- ⏳ Dashboard loads (no 500 errors)
- ⏳ API responds to health check

---

### STEP 2: Database Verification
**Status**: ⏳ READY  
**Time**: ~2 minutes

```bash
# Run automated verification (requires .env.production with DATABASE_URL)
bash VERIFY_INFRASTRUCTURE.sh
```

**Manual verification if needed**:
```bash
# Verify PostgreSQL + PostGIS
psql "$DATABASE_URL" -c "SELECT ST_IsValid(ST_GeomFromText('POINT(-46.6333 -23.5505)', 4326))"
# Expected: t (true)

# Check migrations
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM _prisma_migrations;"
```

**Success Criteria**:
- ✅ PostgreSQL responding
- ✅ PostGIS extension active
- ✅ All migrations applied (typically 50+)

---

### STEP 3: Redis Verification
**Status**: ⏳ READY  
**Time**: ~1 minute

```bash
# Run automated verification (requires REDIS_URL or REDIS_HOST set)
bash VERIFY_INFRASTRUCTURE.sh  # Verifies both DB and Redis
```

**Manual verification if needed**:
```bash
# Check Redis connectivity
redis-cli -u $REDIS_URL PING
# Expected: PONG

# Check BullMQ queues
redis-cli -u $REDIS_URL KEYS "bull:*"
```

**Success Criteria**:
- ✅ Redis responding
- ✅ BullMQ queues ready (will auto-create on first job)

---

### STEP 4: Smoke Tests (Production)
**Status**: ⏳ READY (pending Vercel deployment)
**Time**: ~10 minutes

```bash
# Set required variables
export API_BASE_URL="https://api.imobi.com.br"
export WEB_BASE_URL="https://app.imobi.com.br"
export JWT_TOKEN="<your-jwt-token>"

# Run all smoke tests
bash SMOKE_TESTS.sh
```

**What it tests**:
- **TC-020**: Approve without evidence → 400 "Etapa precisa ter ao menos uma evidência validada"
- **TC-033**: GPS validation with invalid coords (0.0, 0.0) → 400 "GPS inválido"
- **TC-028**: KYC approval → 200 + email sent (verify in SendGrid logs)
- **Health checks**: API /health and Web /api/health endpoints

---

## 📊 Monitoring (First 4 Hours)

### Real-time Alerts
- [ ] Sentry errors (target: 0 critical)
- [ ] CloudWatch latency (target: <2s p95)
- [ ] PostgreSQL connection pool (target: <80%)
- [ ] Redis memory (target: <70%)

### Health Check URLs
- Web: https://app.imbobi.com.br/api/health
- API: https://api.imbobi.com.br/health
- Database: (internal only)

### Key Metrics
```bash
# Monitor tail logs
tail -f /var/log/imbobi/api.log | grep -E "ERROR|CRITICAL"

# Check error rate in Sentry
# Target: <0.1% error rate for first 4 hours
```

---

## 🔴 Rollback Plan

**If issues detected**, revert in this order:

1. **Vercel Rollback** (< 2 minutes)
   ```bash
   # Goto: https://vercel.com/contatovinicaetano93-commits/imobi
   # Click "Deployments" → Select previous build → "Rollback"
   ```

2. **Database Rollback** (if data issue)
   ```bash
   # Restore from backup (pre-deployment snapshot)
   # Contact: DevOps team
   ```

3. **API Rollback**
   ```bash
   # Redeploy previous commit
   git push origin $(git rev-parse HEAD~1):main
   ```

**Rollback Triggers**:
- ❌ >1% error rate for 10+ minutes
- ❌ Response time >5s p95
- ❌ Database connection failures
- ❌ Redis unavailable
- ❌ Critical bug in production

---

## ✅ Cutover Timeline

| Time (UTC) | Step | Status |
|-----------|------|--------|
| **00:30** | Pre-deploy checks | ✅ DONE |
| **00:41** | Vercel deploy (6942214) | ⏳ AWAITING BUILD |
| **00:45** | DB verify | ⏳ READY |
| **00:47** | Redis verify | ⏳ READY |
| **00:50** | Smoke tests (TC-020/033/028) | ⏳ READY (pending Vercel) |
| **01:00-05:00** | Monitor + document | ⏳ READY |
| **05:00** | Final sign-off | ⏳ READY |

---

## 🎯 Go/No-Go Decision

**Current Status**: 🟢 **GO**

**Criteria for ABORT**:
- [ ] Type-check fails ❌ (passed ✓)
- [ ] Security audit fails ❌ (passed ✓)
- [ ] Git repo dirty ❌ (clean ✓)
- [ ] Critical env vars missing ❌ (configured ✓)

---

## 📞 Contacts (On-Call)

**Engineering Lead**: contato.vinicaetano93@gmail.com  
**DevOps**: (escalate if needed)  
**Support**: (post-cutover monitoring)  

---

## 📝 Sign-Off

- [x] **Developer**: Code ready + 3 bugs verified
- [ ] **DevOps**: Deployment complete + health checks OK
- [ ] **QA**: Production smoke tests passed
- [ ] **CEO**: Go-live approved

---

**Next Update**: 03:45 UTC (post-smoke tests)

*Document version 1.0 | Live cutover started 2026-05-30 03:15 UTC*
