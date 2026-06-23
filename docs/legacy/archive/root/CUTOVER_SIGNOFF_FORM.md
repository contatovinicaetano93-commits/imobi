# 📝 iMobi MVP — CUTOVER SIGN-OFF FORM

**Cutover Date**: 2026-05-30  
**Cutover Window**: 03:15 - 07:15 UTC (4 hours)  
**Document Status**: 🔴 AWAITING SIGN-OFFS

---

## SECTION 1: INFRASTRUCTURE & DEPLOYMENT (DevOps Lead)

**Sign-Off Time**: _____________ UTC (Target: T+30 min = 03:45 UTC)

### Deployment Verification

- [ ] **Vercel Build Successful**
  - Build time: _____________ seconds (target: < 60s)
  - Commit SHA: c2e70ac
  - Build output verified: YES / NO

- [ ] **Web Health Check Passing**
  - URL: https://app.imbobi.com.br/api/health
  - Status: ✅ 200 OK / ⚠️ 503 / ❌ Error
  - Response: ___________________________________________

- [ ] **API Health Check Passing**
  - URL: https://api.imbobi.com.br/health
  - Status: ✅ 200 OK / ⚠️ 503 / ❌ Error
  - Response: ___________________________________________

### Database Verification

- [ ] **PostgreSQL Connected**
  - Connection status: ✅ Connected / ❌ Failed
  - Migrations applied: _____________ (target: 50+)
  - Verification command: `bash VERIFY_INFRASTRUCTURE.sh`

- [ ] **PostGIS Extension Active**
  - GPS validation test: ✅ ST_IsValid working / ❌ Failed
  - Test query: `SELECT ST_IsValid(ST_GeomFromText('POINT(-46.6333 -23.5505)', 4326))`

- [ ] **Database Connection Pool Healthy**
  - Max connections: 100
  - Current connections: _____________ (target: < 50)
  - Percent utilized: _____________ % (target: < 50%)

### Redis Verification

- [ ] **Redis Connected**
  - Connection status: ✅ PONG / ❌ Failed
  - Memory available: _____________ MB / 512 MB
  - Percent utilized: _____________ % (target: < 50%)

- [ ] **BullMQ Queues Ready**
  - Queue count: _____________ (0 is OK initially)
  - Worker processes: ✅ Running / ⚠️ Pending

### Infrastructure Summary

**Overall Status**: 🟢 GREEN / 🟡 YELLOW / 🔴 RED

**Issues Identified** (if any):
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

**Recommendation**: 
- [ ] ✅ **READY TO PROCEED** — All checks passed, proceed to QA smoke tests
- [ ] 🟡 **CONDITIONAL** — Minor issues, monitoring required, can proceed with caution
- [ ] 🔴 **HALT** — Critical issues found, DO NOT PROCEED until resolved

---

### DevOps Lead Sign-Off

| Field | Value |
|-------|-------|
| **Name** | _______________________________ |
| **Title** | DevOps Lead / Infrastructure |
| **Email** | _______________________________ |
| **Sign-Off Time** | _____________ UTC |
| **Signature** | _______________________________ |

---

## SECTION 2: SMOKE TESTS & QA VERIFICATION (QA Lead)

**Sign-Off Time**: _____________ UTC (Target: T+50 min = 04:05 UTC)

### Test Case Execution

#### TC-020: Approve Etapa Without Evidence
- [ ] **Test Executed**: YES / NO
- [ ] **Expected Result**: 400 "Etapa precisa ter ao menos uma evidência validada"
- [ ] **Actual Result**: ✅ PASS / ⚠️ WARNING / ❌ FAIL
- [ ] **Details**: ___________________________________________

#### TC-033: GPS Validation (Invalid Coordinates)
- [ ] **Test Executed**: YES / NO
- [ ] **Expected Result**: 400 "GPS inválido"
- [ ] **Actual Result**: ✅ PASS / ⚠️ WARNING / ❌ FAIL
- [ ] **Details**: ___________________________________________

#### TC-028: KYC Approval Email
- [ ] **Test Executed**: YES / NO
- [ ] **Expected Result**: 200 OK + Email sent
- [ ] **Actual Result**: ✅ PASS / ⚠️ WARNING / ❌ FAIL
- [ ] **Email Verification**: SendGrid logs checked / Not checked
- [ ] **Details**: ___________________________________________

### Core Functionality Verification

- [ ] **Login Flow Working**
  - Status: ✅ Working / ⚠️ Slow / ❌ Broken
  - Load time: _____________ seconds (target: < 2s)

- [ ] **Dashboard Loading**
  - Status: ✅ Working / ⚠️ Slow / ❌ Broken
  - Load time: _____________ seconds (target: < 2s)
  - KYC Status Badge: ✅ Displaying correctly / ❌ Error

- [ ] **Works/Obras Display**
  - Status: ✅ Working / ⚠️ Slow / ❌ Broken
  - Data loading: < _____________ seconds

- [ ] **Mapa/GPS Features**
  - Status: ✅ Working / ⚠️ Slow / ❌ Broken
  - Markers displaying: YES / NO
  - Zoom/Pan: Responsive / Laggy

- [ ] **Audit Trail**
  - Status: ✅ Working / ⚠️ Slow / ❌ Broken
  - Recent logs visible: YES / NO

### Performance Observations

- [ ] **Error Console**: Clean (0 errors) / Minor warnings / Critical errors
- [ ] **Network Waterfall**: All resources loading normally
- [ ] **Page Response Time**: Average _____________ ms (target: < 2000ms)
- [ ] **No Major Regressions**: YES / NO

### Issues Found (if any)

```
Issue 1: ________________________________________________________________
  Severity: 🔴 CRITICAL / 🟡 MAJOR / 🟢 MINOR
  Blocker for go-live: YES / NO
  
Issue 2: ________________________________________________________________
  Severity: 🔴 CRITICAL / 🟡 MAJOR / 🟢 MINOR
  Blocker for go-live: YES / NO
```

### QA Summary

**Test Results**: 
- TC-020: ✅ / ⚠️ / ❌
- TC-033: ✅ / ⚠️ / ❌
- TC-028: ✅ / ⚠️ / ❌
- Core Features: ✅ / ⚠️ / ❌

**Overall Status**: 🟢 GREEN / 🟡 YELLOW / 🔴 RED

**Recommendation**:
- [ ] ✅ **READY TO PROCEED** — All smoke tests passed, no blockers
- [ ] 🟡 **CONDITIONAL** — Minor issues, monitoring required
- [ ] 🔴 **HALT** — Critical failures, DO NOT PROCEED

---

### QA Lead Sign-Off

| Field | Value |
|-------|-------|
| **Name** | _______________________________ |
| **Title** | QA Lead / Quality Assurance |
| **Email** | _______________________________ |
| **Sign-Off Time** | _____________ UTC |
| **Signature** | _______________________________ |

---

## SECTION 3: CODE QUALITY & SECURITY (CTO / Tech Lead)

**Sign-Off Time**: _____________ UTC (Target: T+1h = 04:15 UTC)

### Code Review Verification

- [ ] **Deployed Code Matches Review Approval**
  - Review commit: c2e70ac (embed buildCommand directly)
  - All reviewers approved: YES / NO
  - Outstanding comments resolved: YES / NO

- [ ] **Type-Check Passed**
  - Command: `pnpm type-check`
  - Result: ✅ PASS / ❌ FAIL
  - Status: All 5 packages passing

- [ ] **Security Audit Clean**
  - Command: `pnpm audit`
  - Result: ✅ CLEAN (0 vulnerabilities) / ⚠️ LOW issues / ❌ CRITICAL found
  - Details: ___________________________________________

- [ ] **No Hardcoded Secrets**
  - Command: `grep -r "AWS_SECRET\|PRIVATE_KEY" src/`
  - Result: ✅ CLEAN / ❌ Found hardcoded values
  - Details: ___________________________________________

### Environment Configuration

- [ ] **Production .env Verified**
  - DATABASE_URL: ✅ Set / ❌ Missing
  - REDIS_URL: ✅ Set / ❌ Missing
  - API_KEY_SENTRY: ✅ Set / ❌ Missing
  - AWS_ACCESS_KEY_ID: ✅ Set / ❌ Missing
  - All 20+ env vars: ✅ Configured / ❌ Missing critical vars

- [ ] **Critical Bug Verification**
  - Bug 1 (API validation): ✅ VERIFIED FIXED
  - Bug 2 (GPS validation): ✅ VERIFIED FIXED
  - Bug 3 (Rate limiting): ✅ VERIFIED FIXED

### Infrastructure & Compliance

- [ ] **Monitoring Configured**
  - Sentry enabled: YES / NO
  - CloudWatch alerts set: YES / NO
  - Database monitoring active: YES / NO
  - Redis monitoring active: YES / NO

- [ ] **Rollback Plan Understood**
  - Vercel rollback procedure: ✅ Confirmed
  - API rollback procedure: ✅ Confirmed
  - Database rollback procedure: ✅ Confirmed
  - Team trained: YES / NO

### Technical Issues & Concerns

```
Concern 1: ________________________________________________________________
  Resolution: ________________________________________________________________
  Blocker: YES / NO

Concern 2: ________________________________________________________________
  Resolution: ________________________________________________________________
  Blocker: YES / NO
```

### CTO Summary

**Technical Status**: 🟢 GREEN / 🟡 YELLOW / 🔴 RED

**Deployment Readiness**: 
- Code Quality: ✅ Excellent / ⚠️ Good / ❌ Issues
- Security Posture: ✅ Secure / ⚠️ Minor / ❌ Concerns
- Infrastructure: ✅ Ready / ⚠️ Monitor / ❌ Issues

**Known Risks** (if any):
```
Risk 1: _________________________________________________________________
  Mitigation: ___________________________________________________________
  
Risk 2: _________________________________________________________________
  Mitigation: ___________________________________________________________
```

**Recommendation**:
- [ ] ✅ **APPROVE CUTOVER** — Technical green light, no blockers
- [ ] 🟡 **CONDITIONAL APPROVAL** — Proceed with heightened monitoring
- [ ] 🔴 **DO NOT PROCEED** — Address critical issues first

---

### CTO / Tech Lead Sign-Off

| Field | Value |
|-------|-------|
| **Name** | contato.vinicaetano93@gmail.com |
| **Title** | CTO / Engineering Lead |
| **Email** | contato.vinicaetano93@gmail.com |
| **Sign-Off Time** | _____________ UTC |
| **Signature** | _______________________________ |

---

## SECTION 4: BUSINESS APPROVAL (CEO / Founder)

**Sign-Off Time**: _____________ UTC (Target: T+1.5h = 04:45 UTC)

### Business Readiness

- [ ] **Go-Live Window Confirmed**
  - Scheduled time: 2026-05-30 03:15 UTC ✅ Confirmed
  - Duration: 4 hours (03:15 - 07:15 UTC)
  - Business impact: ✅ Acceptable / ⚠️ Minor / ❌ Unacceptable

- [ ] **Stakeholder Communication**
  - Team notified: YES / NO
  - Customers informed: YES / NO (if applicable)
  - Support team briefed: YES / NO

- [ ] **Success Metrics Aligned**
  - Error rate target: < 1% ✅ Understood
  - Uptime target: 100% ✅ Understood
  - Performance target: P95 < 2s ✅ Understood

### Monitoring & Support

- [ ] **Support Team Ready**
  - On-call engineer confirmed: _______________________
  - Incident response plan: ✅ Reviewed / ❌ Not reviewed
  - Communication channels ready: ✅ Slack, Email / ❌ Not ready

- [ ] **Customer Communication Plan**
  - Status page ready: YES / NO
  - Support email template: YES / NO
  - Emergency contact list: YES / NO

### Rollback Authority

- [ ] **Rollback Triggers Understood**
  - Error rate > 5%: ✅ UNDERSTOOD = AUTO-ROLLBACK
  - Latency > 5s: ✅ UNDERSTOOD = AUTO-ROLLBACK
  - Service down: ✅ UNDERSTOOD = AUTO-ROLLBACK

- [ ] **Rollback Approval**
  - CTO has rollback authority: YES / NO
  - DevOps has rollback authority: YES / NO
  - CEO approval required for rollback: YES / NO

### Go/No-Go Decision

**Business Assessment**: 🟢 GREEN / 🟡 YELLOW / 🔴 RED

**Final Decision**:
- [ ] ✅ **GO** — Approved for production cutover
- [ ] 🟡 **GO WITH CAUTION** — Proceed with heightened monitoring
- [ ] 🔴 **NO-GO** — Recommend delaying to next window

**Rationale** (if not GO):
```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

### CEO / Founder Sign-Off

| Field | Value |
|-------|-------|
| **Name** | _______________________________ |
| **Title** | CEO / Founder |
| **Email** | _______________________________ |
| **Sign-Off Time** | _____________ UTC |
| **Signature** | _______________________________ |

---

## FINAL APPROVAL MATRIX

| Role | Status | Time | Sign-Off |
|------|--------|------|----------|
| **DevOps Lead** | 🔴 PENDING | _______ UTC | _________ |
| **QA Lead** | 🔴 PENDING | _______ UTC | _________ |
| **CTO / Tech Lead** | 🔴 PENDING | _______ UTC | _________ |
| **CEO / Founder** | 🔴 PENDING | _______ UTC | _________ |

---

## CUTOVER DECISION

**Current Status**: 🔴 AWAITING SIGN-OFFS

**Go/No-Go Decision Tree**:

```
DevOps ✅ 
  AND QA ✅ 
  AND CTO ✅ 
  AND CEO ✅ 
  → 🟢 UNANIMOUS GO

DevOps ✅ 
  AND QA ✅ 
  AND CTO ✅ 
  AND CEO 🟡 
  → 🟡 CONDITIONAL (requires CEO concurrence)

Any role = 🔴 HALT 
  → 🔴 DO NOT PROCEED (escalate issues first)
```

**Final Go/No-Go**: 🔴 PENDING ALL SIGN-OFFS

---

## INCIDENT CONTACTS (If Issues Arise During Cutover)

| Role | Name | Email | Phone |
|------|------|-------|-------|
| **CTO** | contato.vinicaetano93@gmail.com | contato.vinicaetano93@gmail.com | +55 (XX) XXXXX-XXXX |
| **DevOps** | _______________________ | _______________________ | +55 (XX) XXXXX-XXXX |
| **QA Lead** | _______________________ | _______________________ | +55 (XX) XXXXX-XXXX |
| **CEO** | _______________________ | _______________________ | +55 (XX) XXXXX-XXXX |

---

## NEXT STEPS

### If 🟢 ALL SIGN-OFFS COMPLETE:
1. Archive this form (store for compliance)
2. Begin 4-hour monitoring window
3. Monitor metrics every 30 minutes
4. Update MONITORING_QUICK_REFERENCE.md with real metrics
5. At T+4h: Document final results and declare success

### If 🔴 ANY BLOCKER:
1. Document issue in SECTION with RED status
2. Escalate to CTO immediately
3. Investigate and resolve
4. Re-run affected sign-off section
5. Decision: Retry cutover or reschedule

---

**Document Created**: 2026-05-30 03:15 UTC  
**Sign-Off Deadline**: 2026-05-30 05:00 UTC (T+1.75h)  
**Monitoring Window**: 2026-05-30 03:15 - 07:15 UTC  

**Status**: 🔴 AWAITING EXECUTION
