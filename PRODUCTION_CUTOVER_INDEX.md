# iMobi MVP — PRODUCTION CUTOVER INDEX

**Cutover Date**: 2026-05-30  
**Window**: 03:15 - 07:15 UTC (4 hours)  
**Document Version**: 1.0  
**Status**: 🔴 AWAITING EXECUTION

---

## 📚 DOCUMENT GUIDE

### 1. Master Cutover Document (EXISTING)
**File**: `/home/user/imobi/CUTOVER_EXECUTION_LIVE.md`  
**Purpose**: Master cutover checklist with deployment timeline  
**Use When**: Need to see overall cutover progress and status  
**Key Sections**:
- Pre-deployment checklist (COMPLETED)
- Deployment steps (IN PROGRESS)
- Infrastructure verification (READY)
- Smoke tests (READY)
- Go/No-Go decision criteria

---

### 2. Production Monitoring & Sign-Off (PRIMARY)
**File**: `/home/user/imobi/PRODUCTION_MONITORING_AND_SIGNOFF.md`  
**Purpose**: Comprehensive 4-hour monitoring & sign-off procedures  
**Use When**: Setting up monitoring, understanding thresholds, reviewing sign-off requirements  
**Key Sections**:
- Monitoring checklist (4 phases: Sentry, CloudWatch, DB, Redis)
- Alert thresholds by severity (GREEN/YELLOW/ORANGE/RED)
- Rollback triggers (CRITICAL vs WARNING)
- Rollback procedures (Vercel/API/Database/Full)
- Sign-off requirements (DevOps/QA/CTO/CEO)
- Real-time monitoring commands
- Post-cutover actions

**When to Read**: Start of monitoring window (T+0) and before each phase

---

### 3. Quick Reference Guide (OPERATIONAL)
**File**: `/home/user/imobi/MONITORING_QUICK_REFERENCE.md`  
**Purpose**: One-page lookup during incident response  
**Use When**: Need quick answers during monitoring, metrics logging, escalation  
**Key Sections**:
- Healthy indicator table (quick glance)
- Metrics logging template (fill every 30 min)
- One-liner monitoring commands (copy & paste)
- Immediate actions by alert type
- Escalation flowchart
- Success criteria checklist

**When to Use**: Every 30 minutes during monitoring window + during any alert

---

### 4. Sign-Off Form (APPROVAL)
**File**: `/home/user/imobi/CUTOVER_SIGNOFF_FORM.md`  
**Purpose**: Formal approval matrix with 4 stakeholder sign-offs  
**Use When**: Collecting approvals before monitoring window, tracking sign-off status  
**Key Sections**:
- DevOps Lead (T+30 min): Infrastructure checklist
- QA Lead (T+50 min): Smoke test results
- CTO/Tech Lead (T+1h): Code quality & security
- CEO/Founder (T+1.5h): Business approval
- Final approval matrix
- Incident contacts

**When to Use**: T+0 to T+90 min for collecting sign-offs

---

### 5. Execution Summary (REFERENCE)
**File**: `/home/user/imobi/MONITORING_EXECUTION_SUMMARY.txt`  
**Purpose**: Consolidated summary of all monitoring requirements & procedures  
**Use When**: Need overview, sharing with stakeholders, documentation  
**Key Sections**:
- Executive summary
- Alert thresholds (all 4 metrics)
- Rollback triggers (critical vs warning)
- Sign-off matrix
- Monitoring checklist
- Commands reference
- Document locations
- Next steps

**When to Use**: Before cutover for briefing, after cutover for documentation

---

## ⚡ QUICK START (4-HOUR WINDOW)

### T+0 (03:15 UTC): Preparation
1. Read: PRODUCTION_MONITORING_AND_SIGNOFF.md (20 min)
2. Assign: On-duty monitor
3. Prepare: Sentry, CloudWatch, database connections dashboards
4. Test: bash scripts/cutover-health-check.sh

### T+30 (03:45 UTC): DevOps Sign-Off
1. Use: PRODUCTION_MONITORING_AND_SIGNOFF.md **"DevOps Sign-Off" section**
2. Check: All infrastructure (Vercel, API, Web, DB, Redis)
3. Sign: CUTOVER_SIGNOFF_FORM.md **"SECTION 1: Infrastructure"**

### T+50 (04:05 UTC): QA Sign-Off
1. Use: PRODUCTION_MONITORING_AND_SIGNOFF.md **"Smoke Tests" section**
2. Run: bash SMOKE_TESTS.sh (TC-020, TC-033, TC-028)
3. Sign: CUTOVER_SIGNOFF_FORM.md **"SECTION 2: QA Verification"**

### T+60 (04:15 UTC): CTO Sign-Off
1. Use: PRODUCTION_MONITORING_AND_SIGNOFF.md **"CTO Sign-Off" section**
2. Verify: Code, security, monitoring setup
3. Sign: CUTOVER_SIGNOFF_FORM.md **"SECTION 3: Code Quality"**

### T+90 (04:45 UTC): CEO Sign-Off
1. Use: CUTOVER_SIGNOFF_FORM.md **"SECTION 4: Business Approval"**
2. Review: Risk, rollback plan, go-live window
3. Decision: 🟢 GO or 🔴 NO-GO

### T+120 to T+240 (04:45 - 07:15 UTC): Monitoring Phase
1. Every 30 min: Update MONITORING_QUICK_REFERENCE.md metrics
2. Every alert: Check escalation flowchart in MONITORING_QUICK_REFERENCE.md
3. Commands: Use one-liners section for health checks
4. Decision: If RED alert, follow rollback procedure in PRODUCTION_MONITORING_AND_SIGNOFF.md

### T+240 (07:15 UTC): Final Sign-Off
1. Gather: Final metrics
2. Document: Success or escalation
3. Decision: Declare success or initiate post-incident review
4. Transition: Move to standard on-call monitoring

---

## 🎯 SIGN-OFF WORKFLOW

```
┌─────────────────────────────────────────────────────────┐
│ CUTOVER_SIGNOFF_FORM.md (Master Approval Document)     │
└─────────────────────────────────────────────────────────┘
           │
           ├─ SECTION 1: DevOps Sign-Off (T+30)
           │   └─ Review PRODUCTION_MONITORING_AND_SIGNOFF.md
           │      for infrastructure checklist
           │
           ├─ SECTION 2: QA Sign-Off (T+50)
           │   └─ Run SMOKE_TESTS.sh
           │   └─ Review PRODUCTION_MONITORING_AND_SIGNOFF.md
           │      for test verification
           │
           ├─ SECTION 3: CTO Sign-Off (T+1h)
           │   └─ Review PRODUCTION_MONITORING_AND_SIGNOFF.md
           │      for code & security checklist
           │
           └─ SECTION 4: CEO Sign-Off (T+1.5h)
               └─ Review CUTOVER_SIGNOFF_FORM.md
               └─ Final decision: GO or NO-GO
```

---

## 📊 ALERT THRESHOLDS (QUICK REFERENCE)

From PRODUCTION_MONITORING_AND_SIGNOFF.md:

| Metric | YELLOW | RED | Action |
|--------|--------|-----|--------|
| **Error Rate** | > 0.5% / 10 min | > 2% / 5 min | Investigate / Rollback |
| **P95 Latency** | > 2s / 5 min | > 5s / 2 min | Investigate / Rollback |
| **DB Pool** | > 80% / 5 min | > 90% / 2 min | Scale / Rollback |
| **Redis Memory** | > 70% / 5 min | > 85% / 2 min | Flush / Rollback |

---

## 🔴 CRITICAL ROLLBACK TRIGGERS (NO CTO APPROVAL)

From PRODUCTION_MONITORING_AND_SIGNOFF.md:

- Error rate > 5% for 5+ minutes
- P95 latency > 5s for 2+ minutes continuous
- Database unavailable (0 connections available)
- Multiple endpoints returning 500 errors
- Data corruption detected

**Rollback Procedures**: See PRODUCTION_MONITORING_AND_SIGNOFF.md "Rollback Procedures"

---

## 📋 FILE LOCATIONS

```
/home/user/imobi/
├── CUTOVER_EXECUTION_LIVE.md (Master cutover checklist)
├── PRODUCTION_MONITORING_AND_SIGNOFF.md (Detailed guide)
├── MONITORING_QUICK_REFERENCE.md (Operational reference)
├── CUTOVER_SIGNOFF_FORM.md (Approval matrix)
├── MONITORING_EXECUTION_SUMMARY.txt (Consolidated summary)
├── PRODUCTION_CUTOVER_INDEX.md (This file)
├── VERIFY_INFRASTRUCTURE.sh (Infrastructure verification)
├── SMOKE_TESTS.sh (QA smoke tests)
├── scripts/cutover-health-check.sh (Health monitoring)
└── SMOKE_TEST_CHECKLIST.md (Full QA scenarios)
```

---

## 📞 CONTACTS

| Role | Name | Email | Phone |
|------|------|-------|-------|
| **CTO** | [Your Name] | contato.vinicaetano93@gmail.com | +55 (XX) XXXXX-XXXX |
| **DevOps Lead** | ________________ | ________________ | ________________ |
| **QA Lead** | ________________ | ________________ | ________________ |
| **CEO** | ________________ | ________________ | ________________ |

**Slack Channel**: #cutover-alerts

---

## ✅ SUCCESS CRITERIA

From MONITORING_QUICK_REFERENCE.md:

- [ ] Error Rate: < 0.5% entire window (avg < 0.1%)
- [ ] Latency: P95 < 2s (no spikes > 3s)
- [ ] Database: Connections < 70%
- [ ] Redis: Memory < 60%
- [ ] Uptime: 100% (no interruptions)
- [ ] Smoke Tests: 100% passing
- [ ] No Rollbacks: Required
- [ ] All Sign-Offs: Complete ✓ ✓ ✓ ✓

---

## 🚀 DOCUMENT CREATION SUMMARY

**Created**: 2026-05-30 04:08 UTC  
**Documents**: 4 comprehensive guides + 1 index  
**Total Size**: ~44 KB  
**Purpose**: Production cutover execution, monitoring, and sign-off  

**Key Achievements**:
1. ✅ Extracted 4-hour monitoring requirements from CUTOVER_EXECUTION_LIVE.md
2. ✅ Documented 4 alert thresholds (error rate, latency, DB pool, Redis memory)
3. ✅ Created 4 rollback procedures (Vercel, API, Database, Full System)
4. ✅ Defined 4-tier sign-off matrix (DevOps, QA, CTO, CEO)
5. ✅ Provided real-time monitoring commands and escalation flowchart
6. ✅ Documented success criteria and post-cutover actions

---

## 📖 HOW TO USE THIS INDEX

1. **Before Cutover**: Read this index + PRODUCTION_MONITORING_AND_SIGNOFF.md
2. **During Cutover**: Keep MONITORING_QUICK_REFERENCE.md open
3. **For Sign-Offs**: Use CUTOVER_SIGNOFF_FORM.md
4. **For Reference**: Check MONITORING_EXECUTION_SUMMARY.txt
5. **For Status**: Update CUTOVER_EXECUTION_LIVE.md

---

**Status**: 🔴 READY FOR EXECUTION  
**Next Step**: Begin cutover at 2026-05-30 03:15 UTC
