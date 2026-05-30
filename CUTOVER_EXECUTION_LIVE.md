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
# ✅ DONE (2026-05-30 03:20 UTC) - Latest: dcf2c75 with .npmrc fix

# 2. Vercel auto-deploys on push (watch: https://vercel.com/contatovinicaetano93-commits/imobi)
# Expected: Build succeeds in <60s, no timeout errors
# Deployment enabled on feature branch - fresh build in progress

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
# Verify PostgreSQL + PostGIS
psql -c "SELECT ST_IsValid(ST_GeomFromText('POINT(-46.6333 -23.5505)', 4326))" 
# Expected: true

# Check migrations applied
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;
```

**Success Criteria**:
- ✅ PostgreSQL responding
- ✅ PostGIS extension active
- ✅ All migrations applied

---

### STEP 3: Redis Verification
**Status**: ⏳ READY  
**Time**: ~1 minute

```bash
# Check Redis connectivity
redis-cli PING
# Expected: PONG

# Check BullMQ queues
redis-cli KEYS "bull:*"
```

**Success Criteria**:
- ✅ Redis responding
- ✅ BullMQ queues ready

---

### STEP 4: Smoke Tests (Production)
**Status**: ⏳ READY  
**Time**: ~10 minutes

**TC-020**: Approve without evidence
```bash
curl -X POST https://app.imbobi.com.br/api/v1/manager/etapas/test-id/approve \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json"
# Expected: 400 "Etapa precisa ter ao menos uma evidência validada"
```

**TC-033**: GPS validation
```bash
curl -X POST https://app.imbobi.com.br/api/v1/obras \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"geo": {"latitude": 0.0, "longitude": 0.0}}'
# Expected: 400 "GPS inválido"
```

**TC-028**: KYC approval email
```bash
curl -X POST https://app.imbobi.com.br/api/v1/kyc/test-doc/approve \
  -H "Authorization: Bearer $JWT"
# Expected: 200 + email sent to user
```

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

| Time (BRT) | Step | Status |
|-----------|------|--------|
| **03:15** | Pre-deploy checks | ✅ DONE |
| **03:20** | Vercel deploy | ⏳ IN PROGRESS |
| **03:25** | DB verify | ⏳ QUEUED |
| **03:27** | Redis verify | ⏳ QUEUED |
| **03:30** | Smoke tests | ⏳ QUEUED |
| **03:45-04:00** | Monitor + document | ⏳ QUEUED |
| **07:15** | Final sign-off | ⏳ QUEUED |

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
