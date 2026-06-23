# 🚀 PRODUCTION CUTOVER DOCUMENTATION PACKAGE

**imobi MVP Phase 4 | 2026-06-02 Production Deployment**

---

## ⚡ START HERE

**If you're doing this cutover, READ THIS FIRST:**

1. **Print all documents** (see list below)
2. **Review PRODUCTION_CUTOVER_COMPLETE_PACKAGE.md** (overview of all docs)
3. **Read PRODUCTION_CUTOVER_PLAN.md** (complete technical reference)
4. **Have CUTOVER_DAY_QUICK_REFERENCE.md visible during cutover**
5. **Use CUTOVER_EXECUTION_CHECKLIST.md to track progress in real-time**

---

## 📄 COMPLETE DOCUMENT SET (4 Files)

### 1. PRODUCTION_CUTOVER_PLAN.md
**The Master Document** (40+ pages, technical reference)
- Complete timeline: 04:00-08:00 UTC / 02:00-06:00 BRT
- Pre-cutover checklist (2-day preparation)
- Go/No-Go decision gates
- Minute-by-minute timeline with exact commands
- Hotfix procedure
- Rollback procedure
- Communication templates
- Monitoring thresholds
- Appendices with detailed specs

**Who needs it**: DevOps Lead, Tech Lead, CTO (everyone during cutover)  
**How to use**: Read before cutover, reference during execution

---

### 2. CUTOVER_DAY_QUICK_REFERENCE.md
**Quick Lookup Reference** (4 pages, copy-paste commands)
- Critical contacts (phone numbers, Slack)
- Timeline summary (compressed)
- All shell commands (ready to copy-paste)
- Performance thresholds table
- Hotfix quick steps
- Rollback quick steps
- Slack messages (pre-written)
- Decision rules (when to escalate)

**Who needs it**: Anyone executing (DevOps, Tech Lead, CTO)  
**How to use**: Keep visible on monitor throughout cutover window

---

### 3. CUTOVER_EXECUTION_CHECKLIST.md
**Real-Time Tracking Document** (15 pages, fill in as you go)
- Pre-cutover day checklist (14:00-23:00 BRT on 2026-06-01)
- Go/No-Go decision template
- Cutover execution log (every 5-minute milestone)
- Continuous monitoring table (fill in values every 5 min)
- Incident tracking
- Sign-off page

**Who needs it**: Scribe (person recording), DevOps Lead, CTO  
**How to use**: Print, check off items in real-time, photograph when complete

---

### 4. CUTOVER_STAKEHOLDER_COMMS.md
**Communication & Messaging Guide** (25 pages, pre-written messages)
- Communication timeline (who gets what message when)
- 9 pre-written Slack message templates
- Email templates for executives
- Status page updates
- Customer support talking points (Q&A)
- Crisis communication (if rollback needed)
- Slack bot automation commands

**Who needs it**: CTO, PO, Support Lead  
**How to use**: Review all messages pre-cutover, copy-paste during execution

---

### 5. PRODUCTION_CUTOVER_COMPLETE_PACKAGE.md
**Navigation & Overview** (this explains all 4 docs)
- Document overview
- How to use each document
- Quick start for CTO (15-minute version)
- Critical facts to memorize
- Sign-off section
- Training checklist

**Who needs it**: Everyone on the team  
**How to use**: Read first, then go to specific documents as needed

---

## 🎯 QUICK DECISION: WHICH DOCUMENT DO I NEED?

| Your Role | Read This | Keep Visible During | Check Off |
|-----------|-----------|-------------------|-----------|
| **CTO** | Plan (all) | Quick Ref + Checklist | Sign checklist |
| **DevOps Lead** | Plan + Quick Ref | Quick Ref + Checklist | Execute items |
| **Tech Lead** | Plan (hotfix/rollback) | Quick Ref | Validate results |
| **Support Lead** | Comms doc | Comms doc | Post messages |
| **QA/Tester** | Plan (testing section) | Checklist | Check off tests |
| **Scribe** | Checklist | Checklist | Fill in all values |

---

## 📅 TIMELINE FOR READING

### 2026-06-01 Morning (Before 14:00 BRT)
- [ ] Print all 5 documents (or save PDFs if no printer)
- [ ] Read: PRODUCTION_CUTOVER_COMPLETE_PACKAGE.md (10 min)
- [ ] Read: PRODUCTION_CUTOVER_PLAN.md → "Critical Contacts" section (5 min)

### 2026-06-01 Afternoon (14:00-17:00 BRT)
- [ ] Execute testing (use CUTOVER_EXECUTION_CHECKLIST.md)
- [ ] Reference PRODUCTION_CUTOVER_PLAN.md as needed

### 2026-06-01 Evening (17:00-23:00 BRT)
- [ ] Go/No-Go decision (use PRODUCTION_CUTOVER_PLAN.md section)
- [ ] If GO: Read CUTOVER_DAY_QUICK_REFERENCE.md completely
- [ ] If GO: Memorize critical contacts + phone numbers
- [ ] If GO: Get 1 hour of rest

### 2026-06-02 Early Morning (01:00-02:00 BRT)
- [ ] Tech Lead: Verify CUTOVER_DAY_QUICK_REFERENCE.md bookmarked & visible
- [ ] DevOps: Open PRODUCTION_CUTOVER_PLAN.md for reference
- [ ] Scribe: Print CUTOVER_EXECUTION_CHECKLIST.md (fresh copy)
- [ ] Support: Have CUTOVER_STAKEHOLDER_COMMS.md ready with Slack drafts

### 2026-06-02 Cutover (02:00-06:00 BRT / 04:00-08:00 UTC)
- [ ] Follow CUTOVER_EXECUTION_CHECKLIST.md exactly
- [ ] Reference CUTOVER_DAY_QUICK_REFERENCE.md for commands
- [ ] Check PRODUCTION_CUTOVER_PLAN.md for decision trees
- [ ] Post messages from CUTOVER_STAKEHOLDER_COMMS.md

---

## ⚠️ CRITICAL TO KNOW

```
START TIME:     2026-06-02 02:00 BRT = 04:00 UTC
DURATION:       2 hours (02:00-04:00 BRT / 04:00-06:00 UTC)
ROLLBACK TIME:  < 5 minutes (git revert + Vercel redeploy)
HOTFIX TIME:    15 minutes max (includes CTO review)

KEY CHECKPOINTS:
  04:05 UTC - Health check (must be 200 OK)
  04:13 UTC - Traffic enabled (production live)
  04:15 UTC - Critical user flow test (must pass)
  04:30 UTC - CTO decision gate (continue/hotfix/rollback)

ESCALATION:
  Any metric RED     → Call CTO immediately (no Slack, no email)
  User flow broken   → Escalate to CTO
  Database down      → Escalate to CTO
  > 2 YELLOW metrics → CTO reviews within 5 min

GO/NO-GO:
  Decision deadline: 2026-06-01 17:00 BRT
  Must be CTO-approved before cutover begins
```

---

## 🔑 KEY COMMANDS (Copy-Paste Ready)

All commands are in CUTOVER_DAY_QUICK_REFERENCE.md, but here are the most critical:

```bash
# Database migration (04:01 UTC)
pnpm --filter @imbobi/api prisma migrate deploy --prod

# Vercel deploy (04:03 UTC)
vercel --prod

# Health check (04:05 UTC)
curl -s https://api.imobi.com/api/v1/health | jq .

# Database check (04:25 UTC)
SELECT COUNT(*) FROM pg_stat_activity;

# EMERGENCY ROLLBACK (if needed)
git revert HEAD --no-edit
git push origin main
```

---

## 💬 SLACK CHANNELS DURING CUTOVER

| Channel | Purpose | Who | Frequency |
|---------|---------|-----|-----------|
| **#cutover-live** | Real-time ops updates (engineering only) | DevOps/Tech Lead | Every 5 min |
| **#announcements** | Public status + user messaging | Support/PO | Every 5 min |
| **#critical-issues** | Escalations + incidents | CTO | As needed |

**Message frequency rule**: If nothing bad happened, still post status update. Silence = anxiety.

---

## 📊 MONITORING DASHBOARDS (Bookmark These)

Must have access during cutover:
- [ ] Sentry: https://sentry.io/dashboard
- [ ] CloudWatch: https://console.aws.amazon.com/cloudwatch
- [ ] Vercel: https://vercel.com/dashboard
- [ ] Status page: [your status page]

Test access NOW before 2026-06-02.

---

## ❓ FAQ

**Q: What if I don't understand something?**
A: Call CTO immediately. Do not guess. Do not proceed if unsure.

**Q: What if something goes wrong?**
A: Follow the decision tree in PRODUCTION_CUTOVER_PLAN.md → rollback is always an option (< 5 min).

**Q: How long does rollback take?**
A: < 5 minutes to previous version. Service back online in ~10 minutes total.

**Q: Can I skip parts of the plan?**
A: No. This plan was written because skipping steps caused problems before.

**Q: What if someone calls in sick?**
A: Escalate to CTO immediately. Do NOT proceed without full team.

**Q: How do I know if a metric is bad?**
A: Use the threshold table in CUTOVER_DAY_QUICK_REFERENCE.md (GREEN/YELLOW/RED).

---

## ✅ SIGN-OFF CHECKLIST (Before Cutover)

All team members must check these boxes:

```
CTO (Final Authority):
  [ ] Read all 5 documents
  [ ] Reviewed Go/No-Go criteria
  [ ] Confirmed 48-hour on-call availability
  [ ] Approved final team & backup plan
  Signature: ________________________ Date: _____

DevOps Lead:
  [ ] Reviewed PRODUCTION_CUTOVER_PLAN.md
  [ ] Memorized CUTOVER_DAY_QUICK_REFERENCE.md
  [ ] Tested all commands in staging
  [ ] Backup verified & restorable
  Signature: ________________________ Date: _____

Tech Lead On-Call:
  [ ] Reviewed hotfix & rollback procedures
  [ ] Practiced hotfix in staging
  [ ] Monitoring dashboards bookmarked
  [ ] Ready for user flow testing
  Signature: ________________________ Date: _____

Support/PO:
  [ ] Reviewed CUTOVER_STAKEHOLDER_COMMS.md
  [ ] All messages approved by CTO
  [ ] Support team briefed on new features
  [ ] Q&A talking points memorized
  Signature: ________________________ Date: _____

Scribe:
  [ ] Will fill out CUTOVER_EXECUTION_CHECKLIST.md
  [ ] Fresh checklist printed
  [ ] Camera ready to photograph completed checklist
  Signature: ________________________ Date: _____
```

---

## 🚀 SUCCESS CRITERIA

Cutover is successful if:

```
✅ Build completes in < 90 seconds
✅ All health checks return 200 OK
✅ Critical user flows pass (manager login → dashboard → approve)
✅ Error rate stays < 0.5% during active window
✅ Response time p95 < 500ms
✅ Database integrity verified (no orphaned data)
✅ No critical errors in Sentry
✅ All team members present & engaged
✅ Go-live announcement posted
✅ CTO confirms 48-hour on-call status
```

---

## 📞 EMERGENCY CONTACTS

```
During cutover, escalate ONLY to:

CTO (Primary Decision Maker)
  Phone: +55 _______ | Slack: @cto
  Available: 02:00-06:00 BRT + 48h post

DevOps Lead (Infrastructure)
  Phone: +55 _______ | Slack: @devops
  Available: 02:00-06:00 BRT

Tech Lead (Hotfixes)
  Phone: +55 _______ | Slack: @tech-lead
  Available: 02:00-06:00 BRT

Support Lead (Customer Comms)
  Phone: +55 _______ | Slack: @support
  Available: 02:00-06:00 BRT
```

**RULE**: If unsure → Call CTO (not Slack, not email, phone call)

---

## 🎓 TRAINING RESOURCES

Before 2026-06-01 17:00 BRT, all team must:

1. **Watch/read**: PRODUCTION_CUTOVER_PLAN.md → Timeline section (30 min)
2. **Practice**: Copy-paste all commands from CUTOVER_DAY_QUICK_REFERENCE.md in staging (30 min)
3. **Memorize**: Critical contacts + phone numbers (5 min)
4. **Test**: Monitoring dashboard access (5 min)
5. **Simulate**: Walk through rollback procedure in staging (15 min)

**Total training time**: ~90 minutes per person (do this 2026-06-01 before 14:00 BRT)

---

## 📁 FILE LOCATIONS

All documents are in root of imobi repository:

```
/home/user/imobi/
  ├── CUTOVER_README.md (this file)
  ├── PRODUCTION_CUTOVER_PLAN.md (master reference)
  ├── CUTOVER_DAY_QUICK_REFERENCE.md (quick lookup)
  ├── CUTOVER_EXECUTION_CHECKLIST.md (real-time tracking)
  ├── CUTOVER_STAKEHOLDER_COMMS.md (messages)
  └── PRODUCTION_CUTOVER_COMPLETE_PACKAGE.md (overview)
```

---

## 🏁 FINAL WORD

This is not a test. This is production. People depend on imobi. Execute the plan exactly as written.

**When in doubt → Ask CTO**

**You've got this. 2 hours. Execute. Success.**

---

**Prepared**: 2026-05-29  
**Cutover Date**: 2026-06-02  
**Status**: READY FOR EXECUTION  
**Requires**: CTO final approval before 2026-06-01 17:00 BRT

