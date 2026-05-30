# PRODUCTION CUTOVER DOCUMENTS — COMPLETE INDEX
**imobi MVP Phase 4 | Cutover Date: 2026-06-02 02:00 BRT / 04:00 UTC**

---

## 📚 DOCUMENT LIBRARY (6 Files)

All files are in root directory: `/home/user/imobi/`

### File 1: CUTOVER_README.md (11 KB)
**START HERE** — Navigation guide to all documents
- Document overview
- Quick decision matrix (which doc do I need?)
- Critical facts to memorize
- Key commands
- Slack channels
- FAQ
- Sign-off checklist
- Training timeline

**Read time**: 15 minutes  
**Print?**: YES (1-2 pages)

---

### File 2: PRODUCTION_CUTOVER_PLAN.md (42 KB)
**THE MASTER DOCUMENT** — Complete technical reference
- Critical contacts & escalation
- Infrastructure summary
- Pre-cutover checklist (2-day preparation)
- Go/No-Go decision gate
- Minute-by-minute timeline (04:00-08:00 UTC)
- Cutover decision tree
- Performance monitoring thresholds
- Hotfix procedure
- Rollback procedure
- Communication templates
- Appendices (env vars, quick rollback, post-mortem template)

**Read time**: 60 minutes (skim), 2 hours (full)  
**Print?**: YES (40+ pages) — Landscape preferred for timeline section  
**Access during cutover?**: YES (reference for decision trees)

---

### File 3: CUTOVER_DAY_QUICK_REFERENCE.md (9.3 KB)
**QUICK LOOKUP** — Copy-paste commands & quick decisions
- Critical contacts (phone, Slack)
- Compressed timeline (04:00-08:00 UTC summary)
- All shell commands (ready to copy-paste)
- Performance thresholds table (GREEN/YELLOW/RED)
- Hotfix quick steps (6 commands)
- Emergency rollback (2 options)
- Slack messages (pre-written)
- Database/Redis commands
- Incident report format
- Mental checklist

**Read time**: 20 minutes  
**Print?**: YES (4 pages) — Multiple copies (one per team member)  
**Access during cutover?**: KEEP VISIBLE ON MONITOR (essential)

---

### File 4: CUTOVER_EXECUTION_CHECKLIST.md (25 KB)
**REAL-TIME TRACKING** — Check-off list + execution log
- Pre-cutover day checklist (2026-06-01 08:00-23:00 BRT)
  - Morning prep (code freeze, build test, type check)
  - Testing window (QA execution)
  - Go/No-Go gate (CTO decision)
  - Pre-cutover prep (backups, monitoring, team coordination)
  - Final checks (20:00-23:00 BRT)

- Cutover execution log (2026-06-02 04:00-08:00 UTC)
  - Every 5-minute milestone with checkboxes
  - Command execution tracker
  - Expected value placeholders
  - Go/No-Go decision at each checkpoint

- Continuous monitoring table (fill every 5 minutes)
  - Metrics: Error%, p95, p99, DB-Conn, Redis-MB, Status
  - Color-coded status (GREEN/YELLOW/RED)
  - Incident tracking space

- Signature & sign-off page

**Read time**: 15 minutes (skim), 30 minutes (full review)  
**Print?**: YES (15 pages) — Print fresh copy morning of 2026-06-02  
**Access during cutover?**: CRITICAL (Scribe fills this in real-time)

---

### File 5: CUTOVER_STAKEHOLDER_COMMS.md (16 KB)
**MESSAGING GUIDE** — All communications pre-written
- Communication timeline (who gets what message when)
- 9 Slack message templates (ready to copy-paste):
  1. Code freeze notification
  2. Go/No-Go decision
  3. Pre-cutover warning (6h before)
  4. 1-hour warning
  5. 5-minute warning
  6. Cutover start
  7. Periodic updates (every 5 min)
  8. Success announcement
  9. Rollback/crisis communication

- Email templates for executives
- Slack channel guidelines (#cutover-live, #announcements, #critical-issues)
- Status page updates
- Customer support talking points (Q&A format)
- Escalation communication template
- Crisis communication (if rollback)
- Slack bot automation commands

**Read time**: 30 minutes  
**Print?**: Optional (reference, not needed during cutover)  
**Access during cutover?**: YES (copy-paste messages every 5 minutes)

---

### File 6: PRODUCTION_CUTOVER_COMPLETE_PACKAGE.md (16 KB)
**NAVIGATION & OVERVIEW** — How to use all documents
- Document overview (what each doc contains)
- How to use each document (audience, purpose, when)
- Quick start for CTO (15-minute version)
- Document relationship map
- Critical facts to memorize (table)
- File locations
- Pre-cutover sign-off page
- Training checklist
- Next steps timeline

**Read time**: 20 minutes  
**Print?**: YES (10 pages)  
**Access during cutover?**: Reference only (read before cutover)

---

## 🗂️ FILE ORGANIZATION

```
/home/user/imobi/
├── CUTOVER_README.md ..................... START HERE (read first)
├── PRODUCTION_CUTOVER_PLAN.md .......... Master reference (complete)
├── CUTOVER_DAY_QUICK_REFERENCE.md ..... Quick lookup (on monitor)
├── CUTOVER_EXECUTION_CHECKLIST.md ...... Real-time tracking (printed)
├── CUTOVER_STAKEHOLDER_COMMS.md ....... Message templates (reference)
├── PRODUCTION_CUTOVER_COMPLETE_PACKAGE.md Navigation (read early)
└── CUTOVER_DOCUMENTS_INDEX.md .......... This file (directory)
```

---

## 📖 READING PATH BY ROLE

### CTO (Decision Authority)
**Order**: README → Plan (full) → Quick Ref → Checklist → Comms (review)  
**Time**: 3 hours total  
**Print**: All 6 documents  
**Key sections**: Timeline, go/no-go gates, thresholds, rollback, escalation  

### DevOps Lead (Execution)
**Order**: README → Plan → Quick Ref → Checklist  
**Time**: 2.5 hours total  
**Print**: Plan, Quick Ref (2 copies), Checklist (fresh copy day-of)  
**Key sections**: Commands, timeline, checkpoints, incident response  

### Tech Lead (Validation)
**Order**: README → Plan (hotfix/rollback) → Quick Ref → Checklist  
**Time**: 1.5 hours total  
**Print**: Quick Ref, Checklist  
**Key sections**: Hotfix procedure, rollback, monitoring, validation  

### Support/PO (Communications)
**Order**: README → Comms → Plan (section only)  
**Time**: 45 minutes total  
**Print**: Comms, Quick Ref (for when/why)  
**Key sections**: Message templates, customer talking points, timeline  

### QA/Tester (Pre-flight)
**Order**: README → Plan (testing section) → Checklist  
**Time**: 1 hour total  
**Print**: Checklist  
**Key sections**: Testing procedures, validation steps  

### Scribe (Recording)
**Order**: README → Checklist → Plan (reference)  
**Time**: 30 minutes total  
**Print**: Checklist (fresh copy morning-of)  
**Key sections**: Execution log, monitoring table, sign-off  

---

## ⏰ READING SCHEDULE

### 2026-06-01 Morning (Before 14:00 BRT)
```
Recommended reading timeline:

14:00-14:15 | Everyone | CUTOVER_README.md (navigation)
14:15-15:15 | CTO | PRODUCTION_CUTOVER_PLAN.md (full read)
14:15-14:45 | DevOps | PRODUCTION_CUTOVER_PLAN.md (sections)
14:15-14:45 | Tech Lead | PRODUCTION_CUTOVER_PLAN.md (sections)
15:15-15:30 | All | CUTOVER_DAY_QUICK_REFERENCE.md (memorize)
15:30-16:00 | Support | CUTOVER_STAKEHOLDER_COMMS.md (review)
```

### 2026-06-01 Afternoon (14:00-17:00 BRT)
```
Execute testing using CUTOVER_EXECUTION_CHECKLIST.md
Reference PRODUCTION_CUTOVER_PLAN.md as needed for decisions
```

### 2026-06-01 Evening (17:00-23:00 BRT)
```
17:00 | CTO | Final Go/No-Go decision (use PLAN section)
17:00-23:00 | All | CUTOVER_DAY_QUICK_REFERENCE.md (review 2x)
20:00-23:00 | Support | Final message prep (COMMS doc)
22:00 | Scribe | Print fresh CHECKLIST copy for morning
```

### 2026-06-02 Early Morning (01:00-02:00 BRT)
```
01:00 | DevOps | Open PRODUCTION_CUTOVER_PLAN.md (reference ready)
01:00 | Tech Lead | Verify CUTOVER_DAY_QUICK_REFERENCE.md visible
01:00 | Scribe | Have printed CHECKLIST + pen ready
01:00 | Support | Have COMMS doc messages ready in Slack drafts
```

---

## 🎯 QUICK ACCESS: "I NEED TO..."

| Need | Document | Section |
|------|----------|---------|
| Know start time | README | "Critical to Know" |
| Make a decision | PLAN | "Cutover Timeline" section |
| Find a contact | Quick Ref | "Critical Contacts" |
| Execute command | Quick Ref | "Quick Start" or "Commands" |
| Track progress | Checklist | "Execution Log" |
| Post update | Comms | "Message Templates" |
| Find threshold | Quick Ref | "Performance Checkpoints" |
| Rollback | Quick Ref | "Emergency Rollback" |
| Create hotfix | Quick Ref | "Hotfix Quick Command" |
| Report incident | Quick Ref | "Incident Report Format" |
| Understand metrics | Quick Ref | Performance table |
| Know next step | PLAN | Decision tree section |

---

## 🔍 CONTENT MATRIX

| Content | README | PLAN | Quick Ref | Checklist | Comms | Overview |
|---------|--------|------|-----------|-----------|-------|----------|
| Timeline | Summary | Full | Summary | Log space | Triggers | Summary |
| Contacts | List | List | List + Phone | — | — | List |
| Commands | 5 key | Full | All copy-paste | Execute | — | — |
| Messaging | — | Templates | Quick posts | — | All templates | — |
| Thresholds | Table | Table | Table | Log space | — | — |
| Procedures | Summaries | Full | Quick steps | Checkboxes | — | — |
| Rollback | Rule | Full | 2 options | Checkbox | Crisis version | — |
| Go/No-Go | Rule | Criteria | — | Template | — | Criteria |
| Sign-offs | Template | Template | — | Signature space | — | Template |

---

## 🏥 IF SOMETHING GOES WRONG

**Use this document selector**:

1. **"I don't know what to do"**
   → Read: CUTOVER_DAY_QUICK_REFERENCE.md (decision rules section)
   → Call: CTO

2. **"Is this metric bad?"**
   → Read: CUTOVER_DAY_QUICK_REFERENCE.md (performance table)
   → Action: Escalate if RED

3. **"User flow broken"**
   → Read: PRODUCTION_CUTOVER_PLAN.md (hotfix section)
   → Call: CTO → Execute hotfix or rollback

4. **"Need to rollback"**
   → Read: CUTOVER_DAY_QUICK_REFERENCE.md (rollback section)
   → Verify: CTO approval
   → Execute: Copy-paste command

5. **"What do I post in Slack?"**
   → Read: CUTOVER_STAKEHOLDER_COMMS.md (templates)
   → Copy: Pre-written message
   → Paste: Adjusted for current time/status

6. **"Didn't document something"**
   → Read: CUTOVER_EXECUTION_CHECKLIST.md (fill in blanks)
   → Scribe: Note timestamp + value

---

## ✅ VERIFICATION CHECKLIST

Before 2026-06-02 cutover starts, verify:

```
Documents Prepared:
  [ ] All 6 markdown files exist in /home/user/imobi/
  [ ] Total size: ~140 KB (approximately)
  [ ] All files readable

Documents Printed:
  [ ] README (2 pages)
  [ ] PRODUCTION_CUTOVER_PLAN.md (40 pages, landscape)
  [ ] CUTOVER_DAY_QUICK_REFERENCE.md (4 pages, 2-4 copies)
  [ ] CUTOVER_EXECUTION_CHECKLIST.md (15 pages, fresh copy morning-of)
  [ ] All stapled/bound and ready

Documents Reviewed:
  [ ] CTO: Read PLAN completely
  [ ] DevOps: Read PLAN + Quick Ref
  [ ] Tech Lead: Read PLAN hotfix section + Quick Ref
  [ ] Support: Read COMMS doc
  [ ] All: Read README

Documents Memorized:
  [ ] Start time: 04:00 UTC / 02:00 BRT
  [ ] Duration: 2 hours
  [ ] Key contacts: CTO + DevOps + Tech Lead
  [ ] Rollback time: < 5 minutes
  [ ] Hotfix limit: 2 max
  [ ] Key checkpoints: 04:05, 04:13, 04:15, 04:30 UTC

Documents Ready:
  [ ] Sentry dashboard bookmarked
  [ ] CloudWatch dashboard bookmarked
  [ ] Vercel dashboard bookmarked
  [ ] All Slack channels ready
  [ ] All team members trained
```

---

## 📞 SUPPORT

**Questions about documents?**
- Contact: CTO (documents approved by CTO)
- Do NOT make changes to documents (frozen for consistency)
- If clarification needed: Escalate to CTO

**Found an error in a document?**
- Note it down
- After cutover completes, submit feedback for next deployment
- Do NOT correct during cutover (consistency critical)

---

## 🔐 DOCUMENT SECURITY

**IMPORTANT**: These documents contain:
- Production infrastructure details
- Critical contact information
- Exact timing of deployment windows
- Escalation procedures

**DO NOT**:
- Share with unauthorized personnel
- Post in public Slack channels
- Email to external recipients
- Store in unsecured locations

**DO**:
- Keep hardcopies locked in office
- Restrict digital access to core team
- Destroy hardcopies after 30 days post-cutover
- Archive electronically in secure location

---

## 📊 DOCUMENT STATISTICS

| Document | Pages | Size | Format | Audience | Prints |
|----------|-------|------|--------|----------|--------|
| README | 3 | 11K | MD | All | 1 |
| PLAN | 40 | 42K | MD | Tech | 1 |
| Quick Ref | 4 | 9.3K | MD | Tech | 4 |
| Checklist | 15 | 25K | MD | Ops | 2 |
| Comms | 10 | 16K | MD | Comms | 1 |
| Overview | 10 | 16K | MD | All | 1 |
| **TOTAL** | **82** | **140K** | **—** | **—** | **10** |

**Estimated printing cost**: ~$50-75 (color, double-sided)  
**Recommended printer**: High-volume, color capable, collating feature

---

## 🏁 FINAL CHECKLIST

Print this and check off:

```
Before 2026-06-02 cutover:

Planning Phase:
  [ ] All 6 documents reviewed
  [ ] Go/No-Go decision made (CTO approval)
  [ ] All documents printed
  [ ] Documents distributed to team
  [ ] All team members trained

Pre-Cutover Day (2026-06-01):
  [ ] Testing completed (CHECKLIST section)
  [ ] Go/No-Go confirmed (PLAN section)
  [ ] Backups verified (CHECKLIST section)
  [ ] Monitoring ready (CHECKLIST section)
  [ ] Team standby prepared (CHECKLIST section)

Cutover Day (2026-06-02):
  [ ] All documents accessible (digital + printed)
  [ ] Team online in #cutover-live (Slack)
  [ ] Monitoring dashboards open
  [ ] Phone bridge tested
  [ ] Scribe has fresh checklist + pen
  [ ] DevOps has commands ready
  [ ] Tech Lead has validation list ready
  [ ] Support has messages staged in Slack drafts

Post-Cutover:
  [ ] Completed checklist signed off
  [ ] Post-mortem scheduled (use PLAN template)
  [ ] Feedback collected for next deployment
```

---

**Document prepared**: 2026-05-29  
**For cutover**: 2026-06-02 02:00 BRT / 04:00 UTC  
**Status**: READY  
**Requires**: CTO sign-off before 2026-06-01 17:00 BRT

---

**START WITH CUTOVER_README.md**
