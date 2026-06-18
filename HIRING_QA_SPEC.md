# iMobi MVP — QA Engineer Job Posting

**Status**: Open for hire (30-31/05/2026)  
**Urgency**: CRITICAL — Pre-production cutover  
**Budget**: R$150–250/h | 4–6 hours  
**Deadline**: Complete testing by 01/06/2026 EOD

---

## THE ROLE

We're hiring a **Contract QA Engineer** to validate iMobi's MVP before production launch on **June 2, 2026 @ 02:00 BRT**.

You'll execute a comprehensive QA test plan covering 53 test cases across dashboard filtering, bulk operations, KYC approvals, GPS validation, audit trails, and performance. **This is a hands-on testing role—not documentation.**

---

## PROJECT CONTEXT

**iMobi**: Construction credit fintech MVP  
**Stack**: NestJS + Next.js 14, PostgreSQL + Redis, AWS S3  
**Scope**: Manager portal (etapa approvals, KYC verification), tomador dashboard (credit tracking)  
**Users**: Construtores (borrowers) + Gestores (loan managers)

---

## REQUIRED SKILLS

### Must Have
- **3+ years** QA/manual testing experience
- **Playwright** or Selenium + ability to write simple test scripts
- **Mobile testing**: iOS + Android (Testflight/internal APK)
- **API testing**: cURL, Postman, or similar
- **SQL basics**: Can query PostgreSQL, verify audit logs
- **Portuguese (pt-BR)**: Native or fluent (app is 100% Portuguese)
- **Attention to detail**: Catch UI typos, broken workflows, UX friction
- **Time zone**: BRT compatible (must overlap 02:00-06:00 BRT on June 2)

### Nice to Have
- Figma/UI design knowledge (can spot design inconsistencies)
- Performance testing (load testing tools)
- Security testing (XSS, SQL injection, CSRF checks)
- Fintech/lending domain experience

---

## WHAT YOU'LL DO

1. **Execute 53 test cases** from QA_TEST_PLAN_DETAILED.md across:
   - Dashboard stats & navigation (4 tests)
   - Advanced filtering (8 tests)
   - Bulk reject operations (6 tests)
   - Approval flows (7 tests)
   - KYC verification (6 tests)
   - GPS validation (4 tests)
   - Audit trail integrity (4 tests)
   - Rate limiting & performance (5 tests)
   - Cross-browser/mobile (4 tests)
   - Error handling (5 tests)

2. **Report bugs daily** with:
   - Exact reproduction steps
   - Screenshots/videos
   - Impact (blocker/major/minor)
   - Expected vs. actual behavior

3. **Validate critical flows**:
   - User login (JWT auth)
   - Obra creation with GPS validation
   - Etapa approval → payment release (BullMQ job)
   - KYC document review & approval
   - Audit trail completeness

4. **Performance benchmarking**:
   - Dashboard load time < 2s
   - Filter response < 3s
   - Mobile app load < 3s on 4G

---

## SUCCESS CRITERIA

**PASS** (Go to production):
- ≥95% test cases pass (≤3 failures out of 53)
- Zero blockers (no approval fails, auth broken, data loss)
- ≤1 major issue (pagination, filters broken)
- ≤5 minor issues (typos, missing labels, slow cache)
- All critical flows validated (login, approval, GPS, KYC)
- No XSS/injection vulnerabilities found

**CONDITIONAL PASS** (Deploy with monitoring):
- 90–95% pass rate
- Issues documented, tracked for post-launch fixes
- Requires sign-off from engineering lead

**FAIL** (Block deployment):
- <90% pass rate
- Any blocker issue found
- Critical flow broken (approval, auth, GPS)

---

## TESTING ENVIRONMENT

| Component | URL | Credentials |
|-----------|-----|-------------|
| **Web App** | https://app.imbobi.com.br (or staging) | See below |
| **API** | https://api.imbobi.com.br/api/docs | Same as web |
| **Mobile** | Testflight (iOS) / APK (Android) | TBD by team |

### Test Accounts (3 required roles)
```
TOMADOR (Borrower):
  Email: tomador@test.local
  Senha: Senha123
  Access: Dashboard, create obra, upload evidence

ENGENHEIRO (Stage Approver):
  Email: gestor@test.local
  Senha: Senha123
  Access: Etapa approval, reject, KYC review

ADMIN (Full access):
  Email: admin@test.local
  Senha: Senha123
  Access: All features + debug info
```

### Tools Provided
- Chrome DevTools (network, performance)
- Postman collection (API calls)
- Test database with 50+ mock obras/etapas
- Redis admin (queue inspection)

---

## TIMELINE & DELIVERABLES

### Phase 1: Prep (30/05, 2 hours)
- [ ] Environment setup (credentials, tools)
- [ ] Review QA_TEST_PLAN_DETAILED.md
- [ ] Identify any blockers (network, credentials, unclear tests)
- **Deliverable**: Readiness confirmation (email or Slack)

### Phase 2: Execution (30/05-01/06, 4 hours)
- [ ] Execute 53 test cases
- [ ] Document pass/fail for each
- [ ] Capture screenshots for failures
- [ ] Report bugs to engineering lead (daily)
- **Deliverable**: QA_TEST_RESULTS.xlsx (test by test)

### Phase 3: Reporting (01/06, 1 hour)
- [ ] Summarize findings in BUGLIST_WITH_FIXES.md
- [ ] Provide Go/No-Go recommendation
- [ ] Sign-off report
- **Deliverable**: FINAL_QUALITY_REPORT.md

**Total: 4–6 hours over 2 days**

---

## BUG REPORTING FORMAT

**Template** (use for each issue):

```
Title: [One-line summary]
Status: [BLOCKER/MAJOR/MINOR]
Test Case: TC-###
Environment: [Chrome/Safari/iOS/Android]

Steps to Reproduce:
1. 
2. 
3. 

Expected Result:


Actual Result:


Impact: [Describe user impact]
Screenshot/Video: [Attached]
Reproducible: [Always/Sometimes/Once]
```

**Submit to**: vinicaetano93@gmail.com or project Slack channel

---

## PAYMENT & LOGISTICS

**Rate**: R$150–250/h (based on experience)  
**Duration**: 4–6 hours (flexible)  
**Dates**: 30/05 or 01/06/2026 (both available)  
**Timezone**: BRT (must align with 02:00-06:00 BRT cutover window)  
**Payment**: Invoice → bank transfer (5 business days)

### To Apply
1. Send CV + 2-3 QA testing samples (bug reports, test plans)
2. Confirm availability: 30/05 or 01/06 (time slots)
3. Portuguese fluency confirmation

**Contact**: vinicaetano93@gmail.com  
**Response SLA**: Within 4 hours

---

## NICE-TO-HAVES

- Prior fintech testing experience (payments, auth, compliance)
- Familiarity with Turborepo/monorepo structures
- Load testing (understanding of rate limits, caching)
- Mobile device farm access (can test on real iOS/Android devices)

---

## FAQ

**Q: Do I need to know NestJS/Next.js?**  
A: No. You're testing the user interface and API behavior, not writing code.

**Q: Can I test from Windows/Mac/Linux?**  
A: Yes, all environments supported (Chrome/Safari, iOS/Android).

**Q: What if I find a bug? Do I fix it?**  
A: No. You report it with clear reproduction steps. The engineering team fixes it.

**Q: What if tests are unclear?**  
A: Ask immediately. DM or email for clarification—don't guess.

**Q: Is there a cutover bonus?**  
A: If critical issues are caught and fixed, discuss bonus with founder.

---

## KEY RESPONSIBILITIES SUMMARY

✅ Execute comprehensive QA plan  
✅ Document findings rigorously  
✅ Validate critical business flows (approvals, KYC, GPS)  
✅ Report blockers immediately  
✅ Provide Go/No-Go recommendation for production  

---

**Hiring Manager**: Vinícius Caetano (vinicaetano93@gmail.com)  
**Posted**: 2026-05-29  
**Closes**: 2026-05-30 EOD (or when hired)  
**Start Date**: 2026-05-30 or 2026-06-01

---

*iMobi is building the future of construction financing. Help us ship MVP with confidence.*

