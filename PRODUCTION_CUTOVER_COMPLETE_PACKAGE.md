# PRODUCTION CUTOVER COMPLETE PACKAGE
**imobi MVP Phase 4 | 2026-06-02 Production Deployment**

---

## 📋 DOCUMENT OVERVIEW

This package contains **4 comprehensive documents** for executing a production cutover on 2026-06-02 from 02:00-04:00 BRT (04:00-06:00 UTC).

Each document serves a specific purpose and audience. **Print all 4 documents before cutover.**

---

## 📄 DOCUMENT #1: PRODUCTION_CUTOVER_PLAN.md

**Purpose**: Complete technical reference for cutover execution  
**Audience**: DevOps Lead, Tech Lead, CTO  
**Length**: 40+ pages  
**When to use**: Reference during cutover, read before 2026-06-01  

### What's Inside:
✅ Critical contacts & escalation paths  
✅ Infrastructure summary (Vercel, Render DB, AWS ElastiCache)  
✅ Pre-cutover checklist (2-day preparation)  
✅ Go/No-Go decision gate with all criteria  
✅ Minute-by-minute timeline (00:00-04:00 UTC with precise actions)  
✅ Cutover decision tree for every step  
✅ Performance monitoring thresholds & alerts  
✅ Hotfix procedure (15-min max)  
✅ Emergency rollback procedure (< 5 min)  
✅ Communication templates for all stakeholders  
✅ Vercel environment variables checklist  
✅ Post-mortem template  

### How to Print:
```bash
# Print double-sided, landscape for timeline visibility
lp -o sides=two-sided-long-edge PRODUCTION_CUTOVER_PLAN.md
```

**KEY SECTIONS TO MEMORIZE**:
- Cutover start time: 04:00 UTC / 02:00 BRT
- Decision tree at each 5-minute checkpoint
- Rollback triggers (any metric RED = escalate CTO)
- Hotfix limit: 2 max during window

---

## 📄 DOCUMENT #2: CUTOVER_DAY_QUICK_REFERENCE.md

**Purpose**: Single-page quick lookup during active cutover  
**Audience**: Anyone executing (DevOps, Tech Lead, CTO)  
**Length**: 4 pages  
**When to use**: Keep visible on monitor throughout 04:00-08:00 UTC window  

### What's Inside:
✅ Critical contacts (phone numbers, Slack handles)  
✅ Timeline summary (04:00-08:00 UTC compressed)  
✅ Smoke test commands (copy-paste ready)  
✅ Performance checkpoint table (quick reference)  
✅ Hotfix quick command (6 steps)  
✅ Emergency rollback (Option 1 & 2)  
✅ When to rollback triggers  
✅ Slack messages to post (pre-written)  
✅ Database & Redis commands  
✅ Browser console checklist  
✅ Incident report format  

### How to Print:
```bash
# Print 4 copies (one for each team member)
# Keep one on desk, one as backup
lp -n 4 CUTOVER_DAY_QUICK_REFERENCE.md
```

**CRITICAL TO KNOW**:
- All commands in this doc are tested & ready to copy-paste
- Timestamps have BRT and UTC (subtract 2 hours)
- Escalation: Any RED metric → Call CTO in 30 seconds

---

## 📄 DOCUMENT #3: CUTOVER_STAKEHOLDER_COMMS.md

**Purpose**: Pre-written communication for all audiences  
**Audience**: CTO (approval), PO (customer comms), Support (talking points)  
**Length**: 25 pages  
**When to use**: Before + during cutover for all external communication  

### What's Inside:
✅ Communication timeline (who gets what message when)  
✅ 9 pre-written message templates (copy-paste ready):
  - Code freeze notification
  - Go/No-Go decision email
  - Pre-cutover warning (6h before)
  - 1-hour warning
  - 5-minute warning
  - Cutover start announcement
  - Periodic updates (every 5 min)
  - Success announcement
  - If rollback occurs (crisis comm)

✅ Email templates for executives  
✅ Slack bot automation commands  
✅ Status page updates (before/during/after)  
✅ Customer support talking points (Q&A format)  
✅ Escalation communication template  
✅ Crisis communication (if rollback needed)  

### How to Use:
```
1. Print document
2. Review all templates pre-cutover
3. Get CTO approval on tone (2026-06-01)
4. Copy messages into Slack drafts 
5. Post at scheduled times
6. Do NOT ad-lib messages (consistency is critical)
```

**CRITICAL MESSAGES**:
- Pre-cutover: Post 6h before, 1h before, 5m before
- During: Post status every 5 minutes minimum
- Post-success: Announce immediately with metrics

---

## 📄 DOCUMENT #4: CUTOVER_EXECUTION_CHECKLIST.md

**Purpose**: Step-by-step execution log (printed + checked during cutover)  
**Audience**: Scribe (person documenting), DevOps Lead, CTO  
**Length**: 15 pages  
**When to use**: Print and check off items in real-time during 04:00-08:00 UTC  

### What's Inside:
✅ Pre-cutover day checklist (08:00-23:00 BRT on 2026-06-01)
  - Morning prep (code freeze, build, testing)
  - Testing window (QA execution)
  - Go/No-Go gate (CTO decision)
  - Pre-cutover prep (backups, monitoring, team)
  - Final checks (20:00-23:00 BRT)

✅ Cutover execution log (04:00-08:00 UTC)
  - Every 5-minute milestone with checkboxes
  - Command copy-paste ready
  - Expected values documented
  - Go/No-Go decision at each step

✅ Continuous monitoring table (every 5 minutes)
  - Error rate, response time, DB connections, Redis memory
  - Color-coded status (GREEN/YELLOW/RED)
  
✅ Incident tracking section
✅ Signature lines for sign-off
✅ Post-cutover sign-off

### How to Use:
```
1. Print checklist
2. Assign "Scribe" role to one team member
3. Scribe checks off items as completed
4. Scribe records actual values in blanks
5. Keep hardcopy for post-mortem review
6. Photograph completed checklist as evidence
```

**CRITICAL CHECKPOINTS**:
- Every 5 minutes: Record metrics
- 04:30 UTC: CTO decision (continue/hotfix/rollback)
- 08:00 UTC: Final sign-off & post-mortem scheduling

---

## 🎯 HOW TO USE THIS PACKAGE

### BEFORE CUTOVER (2026-06-01)

```
Morning (08:00-14:00 BRT):
  1. Print all 4 documents
  2. Distribute:
     - DevOps Lead: Docs #1 + #4
     - Tech Lead: Docs #1 + #2
     - CTO: All 4 docs
     - Support/PO: Doc #3
  3. Read through PRODUCTION_CUTOVER_PLAN.md completely
  4. Highlight sections relevant to your role

Afternoon (14:00-17:00 BRT):
  1. Execute testing (use CUTOVER_EXECUTION_CHECKLIST.md)
  2. Document all results
  3. Run final tests

Evening (17:00-23:00 BRT):
  1. Go/No-Go decision (CTO + checklist)
  2. If GO: Continue to standb prep
  3. If NO-GO: Reschedule cutover
  4. Review CUTOVER_DAY_QUICK_REFERENCE.md
  5. Bookmark all dashboard links
  6. Test phone bridge
  7. Get 1 hour of rest before cutover
```

### DURING CUTOVER (2026-06-02 04:00 UTC / 02:00 BRT)

```
Primary Documents:
  - Tech Lead: Keep CUTOVER_DAY_QUICK_REFERENCE.md visible on monitor
  - DevOps: Have PRODUCTION_CUTOVER_PLAN.md open for reference
  - Scribe: Fill out CUTOVER_EXECUTION_CHECKLIST.md in real-time
  - CTO: All docs for decision-making

Workflow:
  1. Scribe reads next action from checklist
  2. DevOps executes command (copy-paste from quick reference)
  3. Tech Lead verifies results match expected output
  4. CTO makes go/no-go decision at checkpoint
  5. Scribe documents time + result
  6. Repeat every 5 minutes

Communication:
  1. Tech Lead posts Slack update every 5 min (from Doc #3 templates)
  2. Keep #cutover-live channel open + visible
  3. All questions to CTO (final authority)
```

### AFTER CUTOVER (2026-06-02 06:00+ BRT / 04:00+ UTC)

```
Immediate (within 5 min):
  1. Post success message in #announcements (from Doc #3)
  2. Record final metrics in checklist
  3. CTO confirms on-call status (48 hours)

Within 1 hour:
  1. Scribe sign-off (CUTOVER_EXECUTION_CHECKLIST.md)
  2. Photograph completed checklist
  3. If issues: Start incident report

Within 24 hours:
  1. Schedule post-mortem meeting
  2. Compile all logs + screenshots
  3. Use post-mortem template (Doc #1) to document findings
  4. Assign action items for next cutover
```

---

## ⚡ QUICK START (TL;DR for CTO)

**If you only have 15 minutes to prepare:**

1. Read: `PRODUCTION_CUTOVER_PLAN.md` → "CRITICAL CONTACTS & ESCALATION" section
2. Read: `CUTOVER_DAY_QUICK_REFERENCE.md` → All 4 pages (entire doc)
3. Know: Your phone + everyone else's phone numbers from contacts table
4. Know: Timeline = 04:00 UTC start, major gates at 04:05/04:13/04:15/04:30
5. Know: Rollback is always option, < 5 minutes to previous version
6. Action: Review Go/No-Go decision gate in Doc #1 before 17:00 BRT on 2026-06-01

**If you only have 1 hour:**

1. Skim: `PRODUCTION_CUTOVER_PLAN.md` sections:
   - CRITICAL CONTACTS (5 min)
   - PRE-CUTOVER CHECKLIST (10 min)
   - CUTOVER TIMELINE (15 min)
   - HOTFIX/ROLLBACK procedures (10 min)
   - MONITORING THRESHOLDS (10 min)

2. Study: `CUTOVER_DAY_QUICK_REFERENCE.md` (20 min)

3. Action: Approve Go/No-Go decision with authority & sign checklist

---

## 📊 DOCUMENT RELATIONSHIP MAP

```
PRODUCTION_CUTOVER_PLAN.md (Master Reference)
    ├── CUTOVER_DAY_QUICK_REFERENCE.md (During cutover lookup)
    ├── CUTOVER_EXECUTION_CHECKLIST.md (Real-time tracking)
    └── CUTOVER_STAKEHOLDER_COMMS.md (All messaging)

Timeline flow:
    2026-06-01 14:00 BRT → Start pre-cutover from Plan
    2026-06-01 17:00 BRT → Go/No-Go decision (Plan + Checklist)
    2026-06-01 20:00 BRT → Send first message (Comms doc)
    2026-06-02 02:00 BRT → Begin execution (Quick Reference + Checklist)
    2026-06-02 06:00 BRT → Success (Comms + Checklist sign-off)
```

---

## 🚨 CRITICAL FACTS TO MEMORIZE

| Fact | Detail |
|------|--------|
| **Start Time** | 04:00 UTC / 02:00 BRT (2026-06-02) |
| **Duration** | 2 hours (04:00-06:00 UTC / 02:00-04:00 BRT) |
| **Rollback Time** | < 5 minutes (git revert + Vercel redeploy) |
| **Hotfix Time** | 15 minutes max (includes CTO review) |
| **Hotfix Limit** | 2 max during cutover window |
| **Error Rate Threshold** | > 1% triggers CTO escalation |
| **Response Time Threshold** | > 700ms (p95) triggers investigation |
| **DB Connection Threshold** | > 25 triggers investigation |
| **Checkpoint Frequency** | Every 5 minutes (continuous monitoring) |
| **Decision Gate** | 04:30 UTC (continue/hotfix/rollback) |
| **Go/No-Go Deadline** | 2026-06-01 17:00 BRT (before prep begins) |
| **CTO On-Call Duration** | 48 hours post-launch |
| **Key Principle** | If uncertain = escalate to CTO (no guessing) |

---

## 📋 FILE LOCATIONS

All documents are in root directory of imobi repository:

```
/home/user/imobi/
  ├── PRODUCTION_CUTOVER_PLAN.md .................. Master reference (40+ pages)
  ├── CUTOVER_DAY_QUICK_REFERENCE.md ............ Single-page lookup (4 pages)
  ├── CUTOVER_EXECUTION_CHECKLIST.md ........... Real-time tracking (15 pages)
  ├── CUTOVER_STAKEHOLDER_COMMS.md ............. Message templates (25 pages)
  └── PRODUCTION_CUTOVER_COMPLETE_PACKAGE.md ... This file (overview)
```

---

## ✅ PRE-CUTOVER SIGN-OFF

Before 2026-06-02 cutover, all signatories must approve:

```
CTO (Final Authority):
  [ ] Reviewed all 4 documents
  [ ] Approved Go/No-Go criteria (PRODUCTION_CUTOVER_PLAN.md)
  [ ] Confirmed on-call availability (48 hours post-launch)
  Name: ____________________________
  Signature: ________________________
  Date: ____________________________

DevOps Lead (Execution):
  [ ] Reviewed PRODUCTION_CUTOVER_PLAN.md
  [ ] Memorized CUTOVER_DAY_QUICK_REFERENCE.md
  [ ] Practiced all commands in local/staging
  [ ] Database backup verified & restorable
  Name: ____________________________
  Signature: ________________________
  Date: ____________________________

Tech Lead On-Call:
  [ ] Reviewed hotfix/rollback procedures
  [ ] Tested hotfix process in staging
  [ ] Prepared browser for user flow testing
  [ ] Confirmed monitoring dashboard access
  Name: ____________________________
  Signature: ________________________
  Date: ____________________________

QA Lead:
  [ ] Completed SIMPLIFIED_TEST_CHECKLIST.md (all PASS)
  [ ] Executed CUTOVER_EXECUTION_CHECKLIST.md pre-cutover section
  [ ] All test results documented
  Name: ____________________________
  Signature: ________________________
  Date: ____________________________

Product Lead:
  [ ] Reviewed customer communication (CUTOVER_STAKEHOLDER_COMMS.md)
  [ ] Approved message content & timing
  [ ] Briefed support team on new features
  Name: ____________________________
  Signature: ________________________
  Date: ____________________________
```

---

## 🎓 TRAINING CHECKLIST

Before cutover, all team members must:

```
TRAINING COMPLETION TRACKER
═════════════════════════════════════════════

By 2026-06-01 17:00 BRT, ALL team members must:

Team Member: _______________________
  [ ] Read PRODUCTION_CUTOVER_PLAN.md (relevant sections)
  [ ] Memorized critical phone numbers
  [ ] Practiced commands in staging environment
  [ ] Confirmed monitoring dashboard access
  [ ] Reviewed rollback procedure
  [ ] Tested communication (Slack + phone bridge)
  Signature: ________________________ Date: ________

Team Member: _______________________
  [ ] Read PRODUCTION_CUTOVER_PLAN.md (relevant sections)
  [ ] Memorized critical phone numbers
  [ ] Practiced commands in staging environment
  [ ] Confirmed monitoring dashboard access
  [ ] Reviewed rollback procedure
  [ ] Tested communication (Slack + phone bridge)
  Signature: ________________________ Date: ________

Team Member: _______________________
  [ ] Read PRODUCTION_CUTOVER_PLAN.md (relevant sections)
  [ ] Memorized critical phone numbers
  [ ] Practiced commands in staging environment
  [ ] Confirmed monitoring dashboard access
  [ ] Reviewed rollback procedure
  [ ] Tested communication (Slack + phone bridge)
  Signature: ________________________ Date: ________

Team Member: _______________________
  [ ] Read PRODUCTION_CUTOVER_PLAN.md (relevant sections)
  [ ] Memorized critical phone numbers
  [ ] Practiced commands in staging environment
  [ ] Confirmed monitoring dashboard access
  [ ] Reviewed rollback procedure
  [ ] Tested communication (Slack + phone bridge)
  Signature: ________________________ Date: ________
```

---

## 🚀 LAUNCH AUTHORITY

**NO cutover begins without these sign-offs:**

```
CTO (Go/No-Go Decision):
  Name: ____________________________
  Signature: ________________________
  Date: ____________________________
  Time (2026-06-01): 17:00 BRT / 19:00 UTC ✓

Decision: [ ] GO → Proceed [ ] NO-GO → Reschedule

If GO: This signature authorizes cutover to proceed.
If NO-GO: Blockers documented, reschedule requested.
```

---

## 📞 SUPPORT

**Questions before cutover?**
- Contact: CTO (primary decision-maker)
- Escalation: Schedule sync immediately
- Do NOT proceed if unclear

**Issues during cutover?**
- Call CTO phone (do not email, do not Slack thread)
- State issue clearly in 1 sentence
- CTO decides: Continue / Hotfix / Rollback
- Execute immediately per CTO decision

---

## 📅 NEXT STEPS

1. **Print all 4 documents** (before 2026-06-01)
2. **Distribute to team** (before 2026-06-01 14:00 BRT)
3. **Review relevant sections** (2026-06-01 14:00-17:00 BRT)
4. **Execute Go/No-Go** (2026-06-01 17:00 BRT)
5. **If GO: Standby preparation** (2026-06-01 17:00-23:00 BRT)
6. **If NO-GO: Reschedule** (document blockers, plan remediation)
7. **Cutover execution** (2026-06-02 02:00-06:00 BRT)
8. **Post-mortem** (2026-06-03 or later)

---

**Document prepared**: 2026-05-29  
**For cutover**: 2026-06-02 02:00 BRT / 04:00 UTC  
**Status**: READY FOR EXECUTION  
**Final approval required from**: CTO (name), Date: _______

---

**Print all 4 documents. Keep visible during cutover. Execute per plan. Success.**
