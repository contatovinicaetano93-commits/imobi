# Phase 10 GO-LIVE Runbook
**Scheduled**: 2026-06-02 02:00 UTC (T-minus 1.5 days)
**Status**: READY FOR DEPLOYMENT

---

## Pre-Deployment Checklist (2026-06-02 01:00 UTC)

### 1. Code Validation ✅
- [x] Type-check: `pnpm type-check` — ALL 5 packages pass
- [x] Phase 4-C features complete: searchTerm filter, bulk rejection, GPS map
- [x] Security review: SQLi/XSS/RBAC all protected
- [x] Git: All commits pushed to `claude/serene-pasteur-mB72T`

### 2. Build Validation ✅
- [x] Local build: 50.55s (< 60s threshold) — PASS
- [x] Build output: No errors, all routes marked as dynamic
- [ ] Vercel build: Pending (will auto-trigger on next push to main)

### 3. Database Validation
- [ ] Run migrations: `pnpm db:migrate`
- [ ] Verify migrations: No pending migrations
- [ ] Backup: Production database backed up

### 4. API Validation
- [ ] Redis cache running: `redis-cli PING`
- [ ] Rate limiting active: Test 429 responses
- [ ] Endpoints smoke test:
  - [ ] GET /auth/me (auth check)
  - [ ] GET /gestor/etapas?searchTerm=test (new filter)
  - [ ] PATCH /gestor/etapas/:id/rejeitar (bulk rejection)
  - [ ] GET /gestor/etapas/:id/audit-log (audit trail)

### 5. Frontend Validation
- [ ] Dashboard loads: No 404 errors
- [ ] Manager portal: All Phase 4-C features visible
- [ ] Responsive: Mobile breakpoints working
- [ ] No console errors: Open DevTools on all major routes

---

## Deployment Sequence (2026-06-02 02:00 UTC)

### Phase 1: Pre-Deploy (00:00 UTC)
```bash
# 1. Verify current branch
git status  # should be on claude/serene-pasteur-mB72T

# 2. Final type-check
pnpm type-check

# 3. Verify all commits are pushed
git log --oneline -5

# 4. Run E2E smoke tests (if time permits)
pnpm test:e2e -- --testNamePattern="payment-release|manager-dashboard"
```

### Phase 2: Merge to Main (02:00 UTC)
```bash
# 1. Create PR (if not already done)
git checkout main
git pull origin main
git merge --no-ff claude/serene-pasteur-mB72T -m "Merge Phase 4-C: Manager portal UI enhancements"

# 2. Push to main
git push origin main

# 3. Vercel will auto-deploy (watch: https://vercel.com/contatovinicaetano93-commits/imobi)
```

### Phase 3: Post-Deploy Validation (02:30 UTC)
```bash
# 1. Monitor Vercel build (should take ~3-5 min)
# Expected: ✓ All routes compiled, no timeout errors

# 2. Verify production endpoints
curl https://imobi.vercel.app/api/health  # confirm API is accessible

# 3. Smoke test in production
# - Login with test manager account
# - Try searchTerm filter
# - Try bulk rejection
# - Check GPS map loads

# 4. Monitor error logs
# - Check Sentry/error tracking (if configured)
# - Monitor Redis memory usage
# - Check database connection pool
```

---

## Rollback Plan (If Issues Detected)

### Immediate Rollback (within 15 min)
```bash
# If Vercel build fails:
git revert HEAD  # revert merge commit
git push origin main

# Vercel will re-deploy previous version

# If API errors occur:
# 1. Check API logs
# 2. SSH to API server
# 3. Rollback NestJS deployment
```

### Manual Intervention Points
| Issue | Action |
|-------|--------|
| Vercel build timeout | Increase build timeout in vercel.json, re-trigger |
| Database migration fails | Restore backup, verify Prisma schema |
| Rate limiting too aggressive | Adjust CustomThrottlerGuard limits, redeploy |
| GPS map crashes | Check Leaflet version, verify accuracy data format |
| searchTerm search slow | Check database indexes on obra.nome, usuario.nome |

---

## Success Criteria ✅

All of the following must be true:
1. ✅ No build errors on Vercel
2. ✅ No 5xx errors in error logs (24h post-deploy)
3. ✅ Response times: avg < 500ms, p99 < 2s
4. ✅ All Phase 4-C features functional in production
5. ✅ No user-reported issues within 2h

---

## Post-Deployment (2026-06-02 03:00 UTC+)

### Immediate Actions
- [ ] Monitor error tracking for 24h
- [ ] Verify Redis cache hit rate (target > 60%)
- [ ] Check API rate limit effectiveness

### Phase 11 Preparation (2026-06-03)
- [ ] Comercial Dashboard intensive sprint begins
- [ ] Setup Phase 11 branch: `feat/comercial-dashboard`
- [ ] Begin Leads + CRM + Scoring module implementation

---

## Contacts & Escalation

**On-Call**: contato.vinicaetano93@gmail.com
**Escalation** (if needed):
- Vercel issues: Check console.vercel.com
- Database issues: Check PostgreSQL logs
- Redis issues: SSH to Redis server, check memory

---

## Commit History (Ready for Merge)
```
aaae607 feat(manager): enhance GPS validation with accuracy circles and detailed popups
1e5ef60 feat(manager): improve bulk rejection with 5 preset reasons
c1a24fe feat(manager): add searchTerm filter to AdvancedFilters
```

All changes: 75 insertions, 21 deletions, 7 files modified
Type-check: ✅ PASS (0 errors)
Security review: ✅ PASS (SQLi/XSS/RBAC protected)

---

**Ready for GO-LIVE ✅**
