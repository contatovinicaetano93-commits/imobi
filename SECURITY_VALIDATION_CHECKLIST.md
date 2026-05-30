# Security Validation Checklist — imbobi
**Date:** May 30, 2026  
**Status:** Ready for Execution  

---

## Pre-Testing Checklist

### Environment Setup
- [ ] Staging API is running and accessible at `http://staging.imbobi.local:4000`
- [ ] Health check passes: `curl http://staging.imbobi.local:4000/api/v1/health`
- [ ] Database is connected and migrations are run
- [ ] Redis is available for rate limiting
- [ ] All required environment variables are set (JWT_SECRET, ENCRYPTION_KEY, etc.)

### Tools Available
- [ ] `curl` command available
- [ ] `jq` installed (optional, for JSON parsing)
- [ ] Postman installed (if using interactive method)
- [ ] Bash shell available
- [ ] Write access to `/home/user/imobi/` directory

### Test Files Downloaded
- [ ] `test-security-validation.sh` (21 KB) ✅
- [ ] `security-tests.postman.json` (15 KB) ✅
- [ ] Documentation files (50+ KB total) ✅

---

## Execution Phase

### Choose Testing Method
- [ ] **Method A: Automated** (Recommended - 5-10 min)
  ```bash
  chmod +x test-security-validation.sh
  ./test-security-validation.sh http://staging.imbobi.local:4000
  ```

- [ ] **Method B: Interactive** (Visual - 10-15 min)
  - Import `security-tests.postman.json` into Postman
  - Set environment variable `base_url`
  - Run collection

- [ ] **Method C: Manual** (Detailed - 20-30 min)
  - Follow `SECURITY_STAGING_TEST_PLAN.md`
  - Execute each test individually

### Test Execution

#### Test 1: CSRF Protection (5 minutes)
- [ ] Test 1.1: CSRF token endpoint responds
- [ ] Test 1.2: POST without CSRF handled
- [ ] Test 1.3: PATCH/DELETE require CSRF

#### Test 2: Rate Limiting (3 minutes)
- [ ] Test 2.1: Login rate limit (10 req/min)
- [ ] Test 2.2: Registration rate limit (10 req/min)
- [ ] Test 2.3: Retry-After header present

#### Test 3: Encryption (5 minutes)
- [ ] Test 3.1: No plaintext password in response
- [ ] Test 3.2: Access token returned
- [ ] Test 3.3: HttpOnly cookie on refresh

#### Test 4: IDOR Prevention (5 minutes)
- [ ] Test 4.1: User cannot access other user's obra
- [ ] Test 4.2: Credit data ownership enforced

#### Test 5: Authorization (5 minutes)
- [ ] Test 5.1: Unauthenticated → 401
- [ ] Test 5.2: Invalid token → 401
- [ ] Test 5.3: Non-admin → 403 on admin endpoint

#### Test 6: Input Validation (5 minutes)
- [ ] Test 6.1: Invalid CPF → 400
- [ ] Test 6.2: Weak password → 400
- [ ] Test 6.3: XSS tags sanitized
- [ ] Test 6.4: SQL injection prevented

#### Test 7: Security Headers (3 minutes)
- [ ] Test 7.1: CSP header (no unsafe-inline)
- [ ] Test 7.2: X-Content-Type-Options: nosniff
- [ ] Test 7.3: X-Frame-Options: DENY
- [ ] Test 7.4: HSTS header

#### Test 8: Token Management (2 minutes)
- [ ] Test 8.1: Token invalid after logout

---

## Results Documentation

### Recording Results
- [ ] Open `SECURITY_STAGING_TEST_EXECUTION.md`
- [ ] Fill in Test 1 results
- [ ] Fill in Test 2 results
- [ ] Fill in Test 3 results
- [ ] Fill in Test 4 results
- [ ] Fill in Test 5 results
- [ ] Fill in Test 6 results
- [ ] Fill in Test 7 results
- [ ] Fill in Test 8 results

### Calculating Score
- [ ] Count total tests: **20**
- [ ] Count passed tests: **___**
- [ ] Count failed tests: **___**
- [ ] Calculate pass rate: **(passed/20) × 100 = ____%**

### Critical Tests Review
**MUST PASS for production:**
- [ ] Test 2.1: Rate limiting (429 at 11th request)
- [ ] Test 4.1: IDOR (403/404 on cross-user)
- [ ] Test 5.1: Authorization (401 unauthenticated)
- [ ] Test 6.1-6.2: Input validation (400 on invalid)
- [ ] Test 3.1: No plaintext passwords

---

## Results Interpretation

### Pass Rate Scoring
```
✅ 95-100%    PASS            Safe for production deployment
⚠️ 80-94%     CONDITIONAL     Fix issues, re-test before deploy
❌ <80%       FAIL            Do NOT deploy to production
```

### Results
- [ ] **PASS** (95-100%) → Proceed to production
- [ ] **CONDITIONAL** (80-94%) → Fix failures and re-test
- [ ] **FAIL** (<80%) → Critical issues, do NOT deploy

---

## Issue Documentation (If Failures Found)

### Failed Test #1
- [ ] Test name: _______________________________
- [ ] Severity: ✅ CRITICAL / ⚠️ ALTO / 🟡 MEDIO / 🟢 BAJO
- [ ] Expected: _______________________________
- [ ] Actual: _______________________________
- [ ] Root cause: _______________________________
- [ ] Fix required: _______________________________
- [ ] Status: [ ] FIXED [ ] PENDING [ ] INVESTIGATING

### Failed Test #2
[Repeat above for additional failures]

---

## Sign-Off

### Test Execution Summary
- **Total Tests:** 20
- **Passed:** ___
- **Failed:** ___
- **Pass Rate:** ____%
- **Overall Verdict:** [ ] PASS [ ] CONDITIONAL [ ] FAIL

### Critical Issues
- [ ] No critical issues found
- [ ] Critical issues found (see documentation above)

### Approval for Deployment
- [ ] All tests passed (95-100%)
- [ ] Results documented
- [ ] No critical vulnerabilities
- **Approved by:** ________________
- **Date:** ________________
- **Time:** ________________

### Next Steps After Approval
- [ ] Schedule production deployment
- [ ] Notify DevOps team
- [ ] Set up monitoring alerts
- [ ] Archive test results for compliance
- [ ] Schedule post-deployment validation

---

## Troubleshooting Steps

### If Tests Not Running
- [ ] Verify staging URL is correct
- [ ] Verify API is responding to health check
- [ ] Verify script has execute permissions: `chmod +x test-security-validation.sh`
- [ ] Check for network connectivity to staging

### If Tests Failing
- [ ] Check error message in test output
- [ ] See `SECURITY_TEST_SUMMARY.md` troubleshooting section
- [ ] See `SECURITY_STAGING_TEST_PLAN.md` test details
- [ ] Run test manually with curl for more details

### If Rate Limiting Not Working
- [ ] Verify Throttle decorator in auth.controller.ts
- [ ] Expected: `@Throttle({ default: { limit: 10, ttl: 60000 } })`
- [ ] Check Redis connection
- [ ] Check request count (should be 10/min not 10/sec)

### If IDOR Tests Failing
- [ ] Verify ownership checks in services
- [ ] Expected pattern: `if (resource.usuarioId !== userId) throw new ForbiddenException()`
- [ ] Check role validation (ADMIN/GESTOR_OBRA)

### If Authorization Tests Failing
- [ ] Verify JwtAuthGuard on protected routes
- [ ] Expected: `@UseGuards(JwtAuthGuard)` decorator
- [ ] Check JWT secret is set correctly

---

## Documentation Reference

### Quick Start
📖 `SECURITY_TESTS_README.md`
- File descriptions
- Quick start guide
- Common scenarios

### Detailed Procedures
📖 `SECURITY_STAGING_TEST_PLAN.md`
- Exact curl commands
- Expected responses (JSON)
- Pass/fail criteria
- Severity levels

### Results Template
📖 `SECURITY_STAGING_TEST_EXECUTION.md`
- Fill-in form for results
- Sign-off section
- Issue tracking

### Implementation Details
📖 `SECURITY_SUMMARY.md`
- What was fixed
- How it was implemented
- Deployment requirements

### Code Review Findings
📖 `SECURITY_VALIDATION_REPORT.md`
- Detailed analysis
- Known limitations
- Production checklist

---

## Timeline Estimate

| Phase | Time | Status |
|-------|------|--------|
| Preparation | 5 min | [ ] |
| Test Execution | 10-15 min | [ ] |
| Documentation | 5-10 min | [ ] |
| Review | 5-10 min | [ ] |
| **TOTAL** | **25-40 min** | **[ ]** |

---

## Compliance & Audit Trail

### Test Execution Log
- [ ] Keep terminal output for audit trail
- [ ] Save results file: `security-test-results-[timestamp].txt`
- [ ] Document any manual tests performed
- [ ] Record any issues found and resolutions

### Post-Test Actions
- [ ] Archive results for compliance
- [ ] Share with security team
- [ ] Update deployment checklist
- [ ] Schedule follow-up (if needed)

---

## Final Verification

### Before Declaring PASS
- [ ] All 20 tests have been executed
- [ ] Pass rate calculated correctly
- [ ] All critical tests passing
- [ ] Results documented
- [ ] Sign-off completed
- [ ] No unresolved critical issues

### Before Declaring CONDITIONAL
- [ ] Non-critical issues identified
- [ ] Fixes planned or in progress
- [ ] Re-test scheduled
- [ ] Conditional approval documented

### Before Declaring FAIL
- [ ] Critical issues identified
- [ ] Root causes documented
- [ ] No deployment scheduled
- [ ] Escalation to security team

---

## Approval Signatures

**Test Execution:**  
Name: ________________  
Date: ________________  
Time: ________________  

**Results Review:**  
Name: ________________  
Date: ________________  
Verdict: [ ] PASS [ ] CONDITIONAL [ ] FAIL

**Deployment Authorization:**  
Name (CTO/Lead): ________________  
Date: ________________  
Time: ________________

---

## Version History

| Date | Version | Changes | Status |
|------|---------|---------|--------|
| 2026-05-30 | 1.0 | Initial creation | ✅ ACTIVE |

---

**Checklist created:** May 30, 2026  
**Last updated:** May 30, 2026  
**Next review:** June 30, 2026

*This checklist ensures systematic execution and documentation of security validation tests.*
