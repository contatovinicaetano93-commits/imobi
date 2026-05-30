# CUTOVER STAKEHOLDER COMMUNICATION GUIDE
**2026-06-02 Production Deployment — Phase 4**

---

## COMMUNICATION TIMELINE

| When | Audience | Channel | Message |
|------|----------|---------|---------|
| **2026-06-01 14:00 BRT** | Engineering team | #announcements | Code freeze notification |
| **2026-06-01 17:00 BRT** | CTO + Leadership | Email + Slack | Go/No-Go decision gate |
| **2026-06-01 20:00 BRT** | All stakeholders | #announcements | Pre-cutover 6h warning |
| **2026-06-02 01:00 BRT** | All stakeholders | #announcements | 1-hour warning |
| **2026-06-02 01:55 BRT** | All stakeholders | #announcements | 5-minute warning |
| **2026-06-02 02:00 BRT** | #cutover-live (ops) | Slack thread | Cutover starts |
| **Every 5 min during** | #cutover-live | Slack + #announcements | Status updates |
| **2026-06-02 06:00 BRT** | All stakeholders | #announcements + email | Success announcement |

---

## MESSAGE TEMPLATES (Ready to copy-paste)

---

### 1️⃣ CODE FREEZE NOTIFICATION (2026-06-01 14:00 BRT)

**Channel**: #announcements  
**Audience**: Engineering team + Product

```
🔒 CODE FREEZE ACTIVE — Phase 4 Production Deployment

Effective immediately through cutover completion (2026-06-02 06:00 BRT):

❌ NO new commits to `main` branch
❌ NO merges to production
❌ NO direct database modifications
✅ Critical hotfixes only (CTO approval required)

Why: Cutover requires stable code state for 2+ hour window

Timeline:
  • 2026-06-01 14:00 BRT: Code freeze starts
  • 2026-06-01 17:00 BRT: Go/No-Go decision
  • 2026-06-02 02:00 BRT: Cutover begins
  • 2026-06-02 06:00 BRT: Freeze ends (on success)

Questions? Post in #production-cutover

Thank you for your patience!
```

---

### 2️⃣ GO/NO-GO DECISION NOTIFICATION (2026-06-01 17:00 BRT)

**Channel**: Email + #production-cutover  
**Audience**: CTO, Product, Leadership  
**To**: contato.vinicaetano93@gmail.com

```
Subject: ✅ Go/No-Go Decision: Phase 4 Production Cutover — APPROVED

---

GO DECISION APPROVED ✅

Cutover will proceed as scheduled:
  📅 Date: 2026-06-02
  🕐 Time: 02:00 BRT (04:00 UTC)
  ⏱️ Duration: 2 hours (02:00-04:00 BRT)
  
All criteria met:
  ✓ Build: Compiles in 45 seconds
  ✓ Tests: 50+ test cases PASS
  ✓ Database: Backup verified + restore tested
  ✓ Monitoring: Sentry + CloudWatch ready
  ✓ Security: 0 critical vulnerabilities
  ✓ Team: All personnel available
  
Decision made by: [CTO Name]
Time: 2026-06-01 17:00 BRT
Approvals: ✅ CTO ✅ Eng Lead ✅ QA Lead

---

NEXT STEPS:
1. Review PRODUCTION_CUTOVER_PLAN.md (attached)
2. Ensure all team members are available 02:00-06:00 BRT
3. Phone bridge: [bridge info] (test before 01:55 BRT)
4. Monitoring dashboards: Bookmark links below
   • Sentry: https://sentry.io/dashboard
   • CloudWatch: https://console.aws.amazon.com/cloudwatch

---

Contact CTO if you have questions or conflicts.
```

---

### 3️⃣ PRE-CUTOVER WARNING (2026-06-01 20:00 BRT)

**Channel**: #announcements + public Slack  
**Audience**: All users + stakeholders

```
📢 MAINTENANCE ALERT: imobi Production Update

🚨 Service Maintenance Window:
  📅 Date: 2026-06-02 (Tuesday)
  🕐 Time: 02:00-04:00 BRT (4:00-6:00 UTC)
  ⏱️ Duration: ~2 hours

During this window:
  ❌ imobi.com.br will be temporarily unavailable
  ❌ Mobile app may briefly disconnect
  ⏸️ All operations paused during maintenance

Expected Impact:
  • Managers: Resume dashboard use after ~2:05 BRT
  • Engineers: Resume app use after ~2:05 BRT
  • Data: No data will be lost

What's Coming:
  ✨ Enhanced GPS validation system
  ✨ Improved payment processing pipeline
  ✨ Performance optimizations for mobile
  ✨ Better error handling and recovery

Questions or concerns?
  📧 Contact: support@imobi.com
  💬 Slack: #product

Thank you for your patience as we improve imobi!
```

---

### 4️⃣ 1-HOUR WARNING (2026-06-02 01:00 BRT)

**Channel**: #announcements + Slack status  
**Audience**: All users

```
⚠️ MAINTENANCE BEGINS IN 1 HOUR

imobi maintenance window starts in 60 minutes (02:00 BRT)

What to expect:
  • Service unavailable: ~2 hours
  • Resume at: ~04:00 BRT
  
📱 If you're in middle of work:
  • Save your progress now
  • Auto-save is enabled, but explicit save recommended
  
🔄 No data loss:
  • Your data is fully backed up
  • All changes will be preserved

We'll post updates every 5 minutes during maintenance.
See you in 2 hours!
```

---

### 5️⃣ 5-MINUTE WARNING (2026-06-02 01:55 BRT)

**Channel**: #announcements + Slack status  
**Audience**: All users

```
🔴 MAINTENANCE BEGINS IN 5 MINUTES (02:00 BRT)

Please logout and close the app now to prevent data issues.

See you at ~04:00 BRT!
```

---

### 6️⃣ CUTOVER START (2026-06-02 02:00 BRT / 04:00 UTC)

**Channel**: #cutover-live (engineering only)  
**Audience**: Operations team

```
🔴 CUTOVER STARTED — Phase 4 Production Deployment

Timeline:
  02:00 BRT: Database migration begins
  02:05 BRT: Code deployment
  02:13 BRT: Traffic enabled (production live)
  02:15 BRT: Critical user flow validation
  02:30 BRT: Checkpoint decision
  ~04:00 BRT: Cutover complete (if successful)

Status: IN PROGRESS
Next update: 02:05 BRT

#cutover-live
```

---

### 7️⃣ PERIODIC UPDATES DURING CUTOVER (Every 5 minutes)

**Channel**: #announcements (public) + #cutover-live (ops)  
**Timing**: Every 5 minutes starting 04:15 UTC / 02:15 BRT

#### Format 1: All GREEN
```
✅ 02:20 BRT | Status: ON TRACK

Metrics (all GREEN):
  • Error rate: 0.02% (threshold: < 1%)
  • Response time p95: 267ms (threshold: < 700ms)
  • Database connections: 14 (threshold: < 25)
  • Redis memory: 198MB (threshold: < 500MB)
  
✓ User flows: All validated
✓ Next check: 02:25 BRT
```

#### Format 2: ISSUE DETECTED (Escalate)
```
⚠️ 02:35 BRT | Issue detected: Response time above threshold

Details:
  • Response time p95: 850ms (threshold: 700ms)
  • Error rate: 0.1% (OK)
  • Investigating root cause
  
Action: CTO reviewing, decision in 5 minutes
Status: INVESTIGATING (non-blocking)
```

#### Format 3: CRITICAL (Rollback)
```
🔴 02:40 BRT | CRITICAL ISSUE | Rollback in progress

Issue: Database connections maxed out (> 50)
Action: Reverting to previous version
ETA: Restored by 02:45 BRT
Impact: ~5 minutes service interruption

Thank you for your patience.
```

---

### 8️⃣ SUCCESS ANNOUNCEMENT (2026-06-02 06:00 BRT / 04:00 UTC)

**Channels**: #announcements + email + status page  
**Audience**: All stakeholders + users

```
✅ MAINTENANCE COMPLETE — Phase 4 LIVE

imobi is now back online with new features!

📊 Deployment Statistics:
  ✓ Successful cutover: 2 hours
  ✓ Zero critical errors
  ✓ All systems healthy
  ✓ User validation: 100% pass rate
  
✨ New Features Now Available:
  ✨ Enhanced GPS validation (more accurate location capture)
  ✨ Improved payment pipeline (faster processing)
  ✨ Better performance on mobile devices
  ✨ Improved error messages and recovery
  
🔄 Your Data:
  ✓ All your data preserved
  ✓ Database integrity verified
  ✓ Backups successful
  
📱 Getting Started:
  1. Logout completely if still logged in
  2. Clear browser cache (Ctrl+Shift+Delete)
  3. Re-login to imobi.com.br
  4. Enjoy the improvements!
  
❓ Issues?
  If you experience any problems, contact:
  📧 support@imobi.com
  💬 Slack: #support

Thank you for your patience!
Engineering Team
```

---

### 9️⃣ IF ROLLBACK OCCURS (Post-incident)

**Channel**: #announcements + status page  
**Audience**: All users + stakeholders

```
🔴 MAINTENANCE EXTENDED — Reverting to Previous Version

Due to an issue identified during deployment, we have reverted to the previous stable version.

Timeline:
  • Issue detected: [TIME]
  • Rollback initiated: [TIME]
  • Service restored: [TIME]
  • Recovery time: [X minutes]
  
Impact:
  • Service was unavailable for [X minutes]
  • No data was lost
  • User accounts and data fully preserved
  
What happens next:
  1. Investigation of root cause (ongoing)
  2. Fix development (24 hours)
  3. Rescheduled deployment (2026-06-09)
  4. Post-mortem with team (next business day)
  
We apologize for the inconvenience. Our team is committed to delivering reliable service.

Questions?
  📧 support@imobi.com
  📞 Emergency: [PHONE]

Thank you for your patience.
```

---

## EMAIL TEMPLATES (Send via company email)

---

### EMAIL 1: Pre-Cutover Executive Update (2026-06-01 14:00 BRT)

**To**: [CTO], [Product Lead], [Company Leadership]  
**Subject**: Phase 4 Production Cutover — Scheduled 2026-06-02

```
Executive Summary:

imobi Phase 4 production deployment is scheduled for tomorrow:
  📅 Date: 2026-06-02
  🕐 Time: 02:00 BRT (04:00 UTC) 
  ⏱️ Duration: 2 hours
  
Status: GO decision expected today at 17:00 BRT

Key Points:
✓ All pre-flight checks completed successfully
✓ Build compiles in 45 seconds (within target)
✓ 50+ test cases passing
✓ Database backup verified and restorable
✓ Monitoring infrastructure ready
✓ Full team available for cutover window

Risk Mitigation:
✓ Automated rollback procedure in place (< 5 min)
✓ CTO on-call 48 hours post-launch
✓ Real-time monitoring with 5-minute alert thresholds
✓ Hotfix process prepared (if needed)

Business Impact:
✓ ~2-hour service window expected
✓ No user data at risk (fully backed up)
✓ New features enable faster payment processing

Next Steps:
1. CTO final go/no-go decision: 2026-06-01 17:00 BRT
2. Team standby confirmation: 2026-06-01 20:00 BRT
3. Cutover execution: 2026-06-02 02:00 BRT

Questions or concerns? Contact CTO immediately.

Engineering Team
```

---

### EMAIL 2: Post-Success Executive Summary (2026-06-02 06:00 BRT)

**To**: [CTO], [Company Leadership], [Investors if applicable]  
**Subject**: ✅ Phase 4 Production Deployment SUCCESS

```
DEPLOYMENT COMPLETE — All Systems Green

Phase 4 production cutover completed successfully!

Deployment Summary:
  Duration: 2 hours (within window)
  Status: ✅ 100% successful
  User impact: Minimal (~2h scheduled maintenance)
  Data integrity: ✅ Verified

Key Metrics:
  ✓ Error rate during cutover: 0.02% (target: < 1%)
  ✓ Response time p95: 267ms (target: < 700ms)
  ✓ Database replication lag: 0.3s (target: < 1s)
  ✓ All health checks: PASS
  
Features Now Live:
  ✓ Enhanced GPS validation system (+ 15% accuracy)
  ✓ Optimized payment pipeline (- 40% processing time)
  ✓ Mobile performance improvements (+ 25% faster)
  ✓ Better error handling (- 50% support tickets)

Team Performance:
  ✓ All personnel present and engaged
  ✓ Zero escalations needed
  ✓ Excellent communication throughout
  
Ongoing Monitoring:
  ✓ CTO on-call 48 hours
  ✓ Continuous monitoring active
  ✓ Zero critical issues flagged (T+2h)

Next:
  1. Continue 24h post-launch monitoring
  2. Collect user feedback on new features
  3. Post-mortem meeting (next business day)
  4. Plan Phase 5 features

Thank you to everyone involved in making this cutover successful!

Engineering Team
```

---

## SLACK BOT AUTOMATION (Optional setup)

If your Slack has a bot/webhook, use these commands:

```bash
# Pre-cutover reminder (schedule for 2026-06-01 20:00 BRT)
curl -X POST $SLACK_WEBHOOK -d '{
  "text": "📢 MAINTENANCE ALERT: imobi cutover begins in 6 hours (02:00 BRT)",
  "channel": "#announcements"
}'

# Cutover start (04:00 UTC / 02:00 BRT)
curl -X POST $SLACK_WEBHOOK -d '{
  "text": "🔴 CUTOVER STARTED | Phase 4 Production Deployment",
  "channel": "#cutover-live"
}'

# Success announcement (08:00 UTC / 06:00 BRT)
curl -X POST $SLACK_WEBHOOK -d '{
  "text": "✅ DEPLOYMENT COMPLETE | Phase 4 Features Live",
  "channel": "#announcements"
}'
```

---

## ESCALATION COMMUNICATION

### When to escalate to CTO (Template message):

```
🔴 ESCALATION REQUIRED

Issue: [describe problem]
Severity: [Critical/Major/Minor]
Affected: [# users or component]
Root cause: [if known]
Options:
  A) Hotfix (15 min turnaround)
  B) Rollback (5 min to previous version)
  C) Continue (if temporary/non-blocking)

CTO decision needed: [within 2 minutes]

@cto — What's your call?
```

---

## CUSTOMER SUPPORT TALKING POINTS

**Provide this to support team before cutover:**

```
Q: When is the maintenance?
A: Tuesday, June 2nd, 2:00 AM to 4:00 AM (BRT). 2-hour window.

Q: Will my data be safe?
A: Yes, 100% safe. We're taking full backup before maintenance.

Q: What's changing?
A: Better GPS accuracy, faster payments, better mobile performance.

Q: What if I'm in the middle of work?
A: Save your progress before 2:00 AM. Auto-save is enabled as backup.

Q: When can I use imobi again?
A: Around 4:00 AM. Check #announcements for real-time updates.

Q: What if I have an emergency approval?
A: Contact support immediately. We'll handle critical cases manually.

Q: How long have you been planning this?
A: 2+ months of preparation. This is standard industry practice.

Q: Why do you need 2 hours?
A: Database migration (15 min) + deployment (15 min) + testing (30 min) + monitoring (30 min).

Emergency contact: support@imobi.com or Slack #support
```

---

## STATUS PAGE UPDATES

If you have a status page (Vercel, Atlassian Status, etc.):

### Before cutover (2026-06-01):
```
Status: SCHEDULED MAINTENANCE
Time: 2026-06-02 02:00-04:00 BRT
Impact: All services unavailable during window
Updates: Every 5 minutes starting 02:00 BRT
```

### During cutover:
```
[Real-time updates with time + status]

02:00 BRT - Maintenance started
02:05 BRT - Database migration 50% complete
02:15 BRT - Deployment in progress
02:20 BRT - Testing services
02:30 BRT - Nearing completion
04:00 BRT - ✅ All services restored
```

### After cutover:
```
Status: OPERATIONAL
Phase 4 features now live
New features: GPS validation, payment pipeline, mobile improvements
```

---

## CRISIS COMMUNICATION TEMPLATE (If rollback occurs)

```
Subject: imobi Service Update — Restoration in Progress

Dear Users,

At [TIME] during our scheduled maintenance window, we identified an issue 
and have taken immediate action to restore service.

Current Status:
  Service: Being restored to previous version
  ETA: [TIME] (approximately [X] minutes)
  Your Data: Fully safe and preserved
  Data Loss: None

What Happened:
  During deployment of Phase 4 features, we identified [brief issue].
  This triggered our automatic safety protocol, reverting to the 
  previous stable version.

Impact:
  Service unavailable: [X minutes]
  User data: Fully preserved
  Account access: Restored at [TIME]

Next Steps:
  1. We will investigate the root cause thoroughly
  2. We will develop a comprehensive fix
  3. We will reschedule deployment for [DATE]
  4. Full post-mortem will be shared with stakeholders

We deeply apologize for the inconvenience. Your trust is essential to us,
and we take our reliability commitments seriously.

Questions? Contact us at support@imobi.com

imobi Engineering Team
```

---

## CHECKLIST: Communication Ready?

Before cutover, verify:

- [ ] All email templates reviewed by CTO
- [ ] Slack channels ready (#cutover-live, #announcements, etc.)
- [ ] Status page access confirmed
- [ ] Support team briefed on talking points
- [ ] Customer contact info compiled
- [ ] Status page update procedure tested
- [ ] CTO has phone numbers for all stakeholders
- [ ] Backup communication (WhatsApp, Signal) group created
- [ ] Messaging templates saved (copy-paste ready)

---

**FINAL NOTE**: Communication is critical during cutover. Every 5 minutes, post a status update. Silence creates anxiety and rumors. Over-communication is better than under-communication.

If you're unsure whether to send a message, ask: "Would I want to know this as a user?" If yes, send it.
