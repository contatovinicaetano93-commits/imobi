# UAT Framework — imobi
**Status**: Production Ready | **Version**: 1.0 | **Date**: 2026-05-29

## Quick Navigation

| Document | Purpose | Time |
|----------|---------|------|
| **UAT_RUNBOOK.md** | Step-by-step test procedures (Sections A-E) | 30 min read |
| **UAT_TEST_RESULTS.md** | Results capture template | As you test |
| **This document** | Framework overview & coordination | 5 min |

---

## Test Execution Overview

### 5 Test Suites (16 Total Test Cases)

| Suite | Focus | Tests | Est. Time |
|-------|-------|-------|-----------|
| **A** | Authentication & Access | 3 | 20 min |
| **B** | Manager Approvals | 3 | 25 min |
| **C** | Payment Processing | 3 | 30 min |
| **D** | Engineer Workflows | 4 | 25 min |
| **E** | Obra & GPS Validation | 3 | 20 min |

**Total**: 16 tests, ~2 hours execution time

---

## Prerequisites

✅ **Environment**:
- [ ] Staging API running (http://localhost:3001)
- [ ] Staging Web running (http://localhost:3000)
- [ ] PostgreSQL + Redis accessible
- [ ] Test database populated with fixture data

✅ **Test Accounts** (created in staging DB):
```
Manager Account:
  Email: manager@imobi.test
  Password: senha123!@#
  Role: MANAGER

Engineer Account:
  Email: engenheiro@imobi.test
  Password: senha123!@#
  Role: ENGINEER

Admin Account:
  Email: admin@imobi.test
  Password: senha123!@#
  Role: ADMIN
```

✅ **Test Data**:
- 5 sample Obras (building projects)
- 3 sample Etapas (construction stages) per Obra
- GPS coordinates validated (within São Paulo)
- 2 pending payment scenarios

---

## Test Execution Workflow

```
1. START: Read UAT_RUNBOOK.md
   ↓
2. SETUP: Verify all prerequisites
   ↓
3. EXECUTE: Run sections A-E in order
   - Document each result in UAT_TEST_RESULTS.md
   - Screenshot failures
   - Note timing
   ↓
4. SUMMARIZE: Calculate pass rate
   ↓
5. REPORT: Present results to QA lead
```

---

## Success Criteria

✅ **Pass Threshold**: 100% (no failures)  
⚠️ **Accept with Notes**: If < 2 failures are non-critical (UI/visual only)  
❌ **STOP**: If > 2 failures or any critical failure (auth, payment, GPS)

---

## Critical Test Paths

**MUST PASS** (blocking):
- A1: Manager login succeeds
- B1: Manager can approve etapa
- C1: Payment processes without error
- D1: Engineer can submit vistoria
- E1: GPS coordinates validate server-side

---

## Operator Instructions

**Role**: UAT Operator
**Time Commitment**: 2 hours continuous
**Skills**: Basic web testing, screenshot capability, problem documentation

### During Execution:
1. Open UAT_RUNBOOK.md side-by-side with staging environment
2. Follow step-by-step procedures exactly as written
3. For each test, record: ✅ PASS or ❌ FAIL
4. If FAIL: screenshot + note what went wrong
5. Continue to next test (don't debug failures)

### After Execution:
1. Fill in UAT_TEST_RESULTS.md summary section
2. Calculate: Total Passed / Total Tests = Pass Rate %
3. List critical failures (if any)
4. Note any usability issues for post-UAT refinement

---

## Sign-Off Path

After UAT completion:
1. **QA Lead** reviews results ✅
2. **Engineering** investigates any failures
3. **CTO** approves GO/NO-GO
4. **Proceed to production cutover** (if GO)

---

## Troubleshooting

**Login fails**: 
→ Verify test account exists in staging DB
→ Check staging API is running: `curl http://localhost:3001/health`

**API calls fail**:
→ Check network connectivity
→ Verify database migrations ran: `pnpm db:migrate`

**GPS validation fails**:
→ Confirm test coordinates are in São Paulo (lat: -23.55, lon: -46.63)
→ Check PostGIS installed: `psql -c "SELECT PostGIS_version()"`

---

## References

- Project: imobi (construction credit platform)
- Stack: Next.js 14 + NestJS + PostgreSQL + PostGIS
- Dependencies: Prisma ORM, Firebase Auth, AWS S3
- E2E Tests: See E2E_TEST_GUIDE.md for automated tests
