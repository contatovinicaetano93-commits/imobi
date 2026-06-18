# UAT Quick Reference Checklist - imobi

**Quick Link to Execute Tests**: Run commands below in the order listed  
**Estimated Total Time**: 2-3 hours (manual tests + load test + sign-off)

---

## Pre-UAT Setup (15 minutes)

```bash
# 1. Start the full stack
cd /home/user/imobi
docker-compose up -d

# Wait for services
sleep 10

# 2. Verify all services healthy
curl -s http://localhost:4000/api/v1/health | jq '.'
redis-cli ping
psql $DATABASE_URL -c "SELECT 1;" 2>&1 | head -1

# 3. Run database migrations (if needed)
cd /home/user/imobi/services/api
npm run db:migrate
```

**Status**: [ ] Ready to start manual tests

---

## Manual Tests Execution (90 minutes)

### Quick Test Guide

| # | Test Case | Location | Time |
|---|-----------|----------|------|
| 1 | User Registration & Login | https://localhost:3000 | 5m |
| 2 | JWT Token Refresh | Browser DevTools | 10m |
| 3 | Invalid Credentials | Browser Console | 5m |
| 4 | Session Persistence | New Browser Tab | 5m |
| 5 | Rate Limiting | Browser Console Script | 5m |
| 6 | Works List Load Time | Dashboard | 10m |
| 7 | Create Obra | UI Form | 10m |
| 8 | Credit Status | Credit Dashboard | 5m |
| 9 | Mobile Responsive | DevTools Mobile | 10m |
| 10 | Manager Login | Manager Portal | 5m |
| 11 | Approve Evidence | Evidence Review | 10m |
| 12 | Reject Evidence | Evidence Review | 10m |
| 13 | GPS Validation (Valid) | Mobile App | 10m |
| 14 | GPS Validation (Invalid) | Mobile App | 10m |
| 15 | Request Credit | Credit Form | 5m |
| 16 | Async Payment Release | Manager Dashboard | 10m |

**Total Manual Tests**: 90-120 minutes

---

## Load Test Execution (30 minutes)

```bash
cd /home/user/imobi/services/api

# Run all load test scenarios (5 scenarios in one command)
npm run test -- --testPathPattern=load.spec.ts

# Expected output will show:
# ✓ Scenario 1: Authentication Bottleneck
# ✓ Scenario 2: Manager Dashboard Load
# ✓ Scenario 3: List Obras
# ✓ Scenario 4: Etapa Approval Workflow
# ✓ Scenario 5: Rate Limit Validation

# Capture performance report from console output
```

**Performance Targets to Verify**:
- p95 latency < 500ms ✅
- Cache hit rate > 80% ✅
- Error rate < 0.1% ✅

---

## Security Spot Checks (15 minutes)

```bash
# 1. Verify JWT configuration
grep -r "expiresIn\|refreshTokenTtl" services/api/src/modules/auth/

# 2. Check security headers
curl -I http://localhost:4000/api/v1/health

# Should include:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000

# 3. Test rate limiting
curl -i -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Verify 429 response after 10 requests in 60 seconds

# 4. Verify CORS
curl -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: GET" \
  -I http://localhost:4000/api/v1/health
```

**Expected Results**:
- [ ] JWT tokens expire correctly (15m access, 7d refresh)
- [ ] Security headers present
- [ ] Rate limiting enforced
- [ ] CORS restricted (no wildcard)

---

## Test Data Creation (10 minutes)

### Create Test Users Quickly

```bash
# Engineer user (for general testing)
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "engineer.uat@imbobi.com.br",
    "nome": "Engineer UAT",
    "cpf": "12345678901",
    "telefone": "11999999999",
    "senha": "TestPass123!"
  }'

# Manager user (for approval testing)
curl -X POST http://localhost:4000/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager.uat@imbobi.com.br",
    "nome": "Manager UAT",
    "cpf": "98765432101",
    "telefone": "1133334444",
    "senha": "ManagerPass123!"
  }'

# Promote manager in database
psql $DATABASE_URL -c "UPDATE usuario SET tipo='ENGENHEIRO' WHERE email='manager.uat@imbobi.com.br';"
```

---

## Test Result Capture (30 minutes)

### Fields to Document

**For Each Test Case**:
1. [ ] Pass/Fail status
2. [ ] Actual response time
3. [ ] Error message (if failed)
4. [ ] Screenshot evidence
5. [ ] Notes/observations

### File to Update

**Primary Document**: `/home/user/imobi/UAT_TEST_RESULTS.md`

Fill in sections:
- [ ] Test Execution Summary (top)
- [ ] Each test suite results
- [ ] Performance metrics
- [ ] Security validation
- [ ] Issues found
- [ ] Sign-offs

---

## Performance Baseline Summary

Copy these metrics from load test output to UAT_TEST_RESULTS.md:

```
Endpoint Performance:
├─ POST /auth/login
│  ├─ p50: ___ ms
│  ├─ p95: ___ ms (target: < 200ms)
│  └─ Error rate: ___%
├─ GET /manager/etapas-pendentes
│  ├─ p50: ___ ms
│  ├─ p95: ___ ms (target: < 400ms)
│  └─ Cache hit: ___%
├─ GET /obras
│  ├─ p50: ___ ms
│  ├─ p95: ___ ms (target: < 300ms)
│  └─ Error rate: ___%
└─ PATCH /etapas/:id/aprovar
   ├─ p50: ___ ms
   ├─ p95: ___ ms (target: < 500ms)
   └─ Error rate: ___%
```

---

## Critical Pass/Fail Criteria

### PASS Criteria (All Must Be True)

- [ ] >= 14 out of 16 test cases pass (87.5% pass rate)
- [ ] Load test p95 latency < 500ms
- [ ] Load test error rate < 0.1%
- [ ] Cache hit rate > 80%
- [ ] No unresolved critical/blocking issues
- [ ] All security checks passed
- [ ] Monitoring (Sentry, CloudWatch) functional
- [ ] QA + Engineering + CTO all sign off

### FAIL Criteria (If Any True = NO-GO)

- [ ] > 2 critical issues found
- [ ] Load test p95 > 500ms
- [ ] GPS server-side validation not enforced
- [ ] Rate limiting not working
- [ ] Security headers missing
- [ ] Data integrity issues
- [ ] Key stakeholder refuses sign-off

---

## Sign-Off Process (Quick)

After all tests complete:

1. **QA Lead**: Review UAT_TEST_RESULTS.md → Sign off
2. **Engineering Lead**: Review test results + code quality → Sign off
3. **CTO**: Final technical review → GO/NO-GO decision
4. **Product Owner**: Confirm feature completeness → Final approval

### Sign-Off Template (Copy-Paste to Slack or Email)

```
UAT STATUS REPORT - imobi [DATE]

Test Execution: [X/16 tests passed]
Pass Rate: ___%
Load Test P95: ___ ms
Issues: [ ] 0 Critical [ ] 1+ Critical

Recommendations:
[ ] GO TO PRODUCTION
[ ] HOLD FOR FIXES - blockers listed below

Blockers (if NO-GO):
1. [Issue]
2. [Issue]

Signed:
- QA: _____________ Date: ___
- Eng: ____________ Date: ___
- CTO: ___________ Date: ___
```

---

## Common Issues & Quick Fixes

### Issue: Services won't start

```bash
# Kill orphaned processes
lsof -i :4000 | grep -v PID | awk '{print $2}' | xargs kill -9
lsof -i :5432 | grep -v PID | awk '{print $2}' | xargs kill -9

# Clean Docker
docker-compose down -v && docker-compose up -d
```

### Issue: Database won't connect

```bash
# Check PostgreSQL
psql $DATABASE_URL -c "SELECT 1;"

# If fails, check container
docker-compose logs postgres

# Reset database
docker-compose down -v postgres
docker-compose up -d postgres
sleep 5
npm run db:migrate
```

### Issue: Redis not responding

```bash
# Check Redis
redis-cli ping

# If fails, restart
docker-compose down -v redis
docker-compose up -d redis
sleep 2
redis-cli ping
```

### Issue: Load test timeouts

```bash
# Reduce load if system struggling
# Edit: services/api/src/test/load.spec.ts
# Line 183-186: Reduce concurrentUsers from 100 to 50

# Rerun load test
npm run test -- --testPathPattern=load.spec.ts
```

### Issue: JWT token errors

```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET | wc -c  # Should be > 64

# If missing, set it
export JWT_SECRET=$(openssl rand -base64 64)

# Restart API
npm run dev
```

---

## Useful Debug Commands

```bash
# Monitor API logs in real-time
tail -f logs/api.log

# Check active database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor Redis cache
redis-cli monitor

# Check rate limit state (in-memory)
redis-cli KEYS "*throttle*"

# Verify JWT expiry in token
# Copy JWT token and decode at: https://jwt.io/

# Check all test user email addresses created
psql $DATABASE_URL -c "SELECT email FROM usuario WHERE email LIKE '%uat%';"

# Cleanup test data after UAT
psql $DATABASE_URL -c "DELETE FROM usuario WHERE email LIKE '%uat%' OR email LIKE '%load-test%';"
```

---

## Test Execution Timeline

| Phase | Estimated Time | Status |
|-------|-----------------|--------|
| Pre-UAT Setup | 15 min | [ ] |
| Manual Tests (16 cases) | 90 min | [ ] |
| Load Test (5 scenarios) | 30 min | [ ] |
| Security Spot Checks | 15 min | [ ] |
| Result Documentation | 30 min | [ ] |
| Sign-Off Review | 15 min | [ ] |
| **TOTAL** | **195 min (3.25h)** | |

**Execution Start Time**: _______________  
**Expected Completion**: _______________

---

## Key Documents Reference

| Document | Purpose | Location |
|----------|---------|----------|
| UAT Execution Report | Full test procedures + criteria | `/home/user/imobi/UAT_EXECUTION_REPORT.md` |
| Test Results Template | Fill-in results sheet | `/home/user/imobi/UAT_TEST_RESULTS.md` |
| Security Audit | Security baseline (already PASS) | `/home/user/imobi/SECURITY_AUDIT_REPORT.md` |
| Load Testing Guide | Performance targets | `/home/user/imobi/LOAD_TESTING_RESULTS.md` |
| Staging UAT Cases | Original test specifications | `/home/user/imobi/STAGING_UAT_VALIDATION.md` |
| Load Test Script | Automated performance testing | `/home/user/imobi/services/api/src/test/load.spec.ts` |

---

## Quick Test URLs

```
Staging Environment:
- Web App: https://staging.imbobi.com.br (or http://localhost:3000)
- API: http://localhost:4000/api/v1
- API Health: http://localhost:4000/api/v1/health

Test Accounts (create during pre-UAT):
- Engineer: engineer.uat@imbobi.com.br / TestPass123!
- Manager: manager.uat@imbobi.com.br / ManagerPass123!

Key Endpoints:
- POST /auth/registrar (create account)
- POST /auth/login (authenticate)
- GET /obras (list works)
- POST /obras (create work)
- GET /manager/etapas-pendentes (manager dashboard)
- POST /evidencias/upload (upload evidence)
- PATCH /etapas/:id/aprovar (approve etapa)
```

---

## Success Criteria at a Glance

✅ **You're DONE when**:

```
UAT COMPLETION CHECKLIST:

[ ] All 16 test cases executed (at least once)
[ ] Pass rate >= 87.5% (14/16 tests passing)
[ ] Load test: p95 < 500ms
[ ] Load test: error rate < 0.1%
[ ] Load test: cache hit > 80%
[ ] All critical issues resolved
[ ] Security checks: PASS
[ ] Monitoring functional
[ ] QA sign-off obtained
[ ] Engineering sign-off obtained
[ ] CTO GO decision received
[ ] Test results documented in UAT_TEST_RESULTS.md
[ ] UAT_TEST_RESULTS.md committed to git
```

---

## Next Steps After UAT

**If PASS (GO)**:
1. Create production deployment ticket
2. Schedule cutover window
3. Prepare rollback plan
4. Execute production deployment
5. Monitor for 24-48 hours
6. Issue go-live confirmation

**If FAIL (NO-GO)**:
1. Document all blockers in JIRA
2. Create fix tickets with priority
3. Schedule engineering review
4. Fix issues
5. Re-run failed test cases
6. Reattempt UAT

---

**Last Updated**: 2026-05-29  
**Status**: READY FOR EXECUTION

---
