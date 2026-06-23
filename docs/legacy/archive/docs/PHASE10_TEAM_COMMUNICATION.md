# PHASE 10: Team Communication — Launch Day Messaging

**Document Version:** 1.0  
**Created:** 2026-05-31  
**Launch Window:** 2026-06-02, 02:00-04:00 UTC  
**Owner:** Tech Lead + Communications Officer  
**Status:** All templates pre-written, ready to copy-paste

---

## CRITICAL: Communication is action. These templates ARE the communication.

Every message below is pre-written, tested, and ready to copy-paste at exactly the right moment. No improvisation. No confusion. Just copy, fill in brackets, and post.

---

## TIMELINE OF COMMUNICATION

### T-24h (2026-06-01, 02:00 UTC) — Launch Confirmation

**Channel:** #announcements + #ops-critical  
**From:** Tech Lead

#### Message: Launch Window Confirmed

```
📅 LAUNCH WINDOW CONFIRMED

imobi v2.0.0 Production Launch

Date: 2026-06-02 (Tomorrow)
Time: 02:00-04:00 UTC
Status: GO (unless we find critical issues in validation)

Team readiness:
✅ Code frozen on main branch
✅ Staging validated
✅ Infrastructure tested
✅ On-call team confirmed available
✅ Monitoring prepared
✅ Rollback procedures ready

What happens next:
1. Final 24-hour validation checklist (today)
2. Team briefing (23 hours from now)
3. Pre-launch checks (1 hour before)
4. DNS switch (02:00 UTC)
5. Production smoke tests
6. Success declaration or rollback

Questions? Ask in #ops-critical

Let's ship this. 🚀
```

**Action:** Copy above, post to #announcements. Then cross-post to #ops-critical.

---

### T-12h (2026-06-01, 14:00 UTC) — Halfway Point Check-in

**Channel:** #ops-critical  
**From:** DevOps Lead

#### Message: Halfway to Launch - All Systems Green

```
✅ HALFWAY TO LAUNCH — ALL SYSTEMS GREEN

12 hours until GO-LIVE (2026-06-02, 02:00 UTC)

Status Update:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Staging environment: Stable (17 smoke tests passed)
✅ Production infrastructure: Ready
✅ Database backups: Current and verified
✅ SSL certificates: Valid (expires 2027)
✅ Monitoring dashboards: All prepared
✅ Team: Rested and ready

Next checkpoints:
• T-4h (18:00 UTC): Pre-launch validation begins
• T-2h (00:00 UTC): Code freeze + final checks
• T-30min (01:30 UTC): Team briefing + war room opens
• T-0 (02:00 UTC): DNS switch and launch

Confidence level: 🟢 HIGH (95%+)

See you at 02:00 UTC tomorrow. 🚀
```

**Action:** Copy, post to #ops-critical.

---

### T-2h (2026-06-02, 00:00 UTC) — Code Freeze Announced

**Channel:** #announcements + #ops-critical  
**From:** Tech Lead

#### Message: Code Freeze in Effect

```
🔴 CODE FREEZE ACTIVATED

Production launch in 2 hours.

All repositories are now locked:
❌ No commits to main branch
❌ No deployments to staging/production
❌ No configuration changes

Current version being deployed: v2.0.0
Commit: [LATEST_COMMIT_HASH]

Why code freeze?
• Ensure stability
• Reduce risk of unknown changes
• Focus team on launch execution

What can we do?
✅ Monitor systems
✅ Respond to issues (rollback-only)
✅ Communicate in #ops-critical

Code freeze lifts at: 04:00 UTC (after launch confirmation)
or earlier if we rollback

Thank you for your patience. 🚀
```

**Action:** Copy, post to both channels.

---

### T-30min (2026-06-02, 01:30 UTC) — Final Readiness Briefing

**Channel:** #ops-critical (CRITICAL - must post this)  
**From:** Tech Lead

#### Message: Final Briefing - 30 Minutes to Launch

```
🟢 FINAL READINESS BRIEFING — T-30 MINUTES

All systems are GO for launch.

What's about to happen (next 30 minutes):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
01:35 UTC: War room opens (Zoom link below)
01:45 UTC: Final production health check
01:55 UTC: Team stands by
02:00 UTC: DNS SWITCH (point of no return)
02:05 UTC: Monitor traffic shift
02:15 UTC: Production smoke tests
02:20 UTC: Status update + decision

The team:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tech Lead (You): Decision maker
DevOps Lead: Executing DNS switch + monitoring
QA Lead: Running smoke tests
Senior Devs: Standing by for emergencies
CTO: On standby (call if critical issue)

Zoom war room (opens at 01:35 UTC):
[ZOOM_LINK_HERE]

Key reminders:
• If something goes wrong, we rollback (< 5 minutes)
• Dashboards are your lifeline (keep them open)
• Communicate constantly in this channel
• When in doubt, escalate (don't guess)

Confidence: 🟢 HIGH
Status: READY TO SHIP

See you at 01:35 UTC in the war room. 🚀
```

**Action:** Copy, fill in ZOOM_LINK_HERE, post IMMEDIATELY when T-30 is confirmed.

---

### T-0 (2026-06-02, 02:00 UTC) — LAUNCH INITIATED

**Channel:** #ops-critical + #announcements  
**From:** Tech Lead

#### Message: Launch Window Open

```
🔴 CUTOVER INITIATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

imobi v2.0.0 Production Launch STARTED

Launch Window: 02:00 - 04:00 UTC
Status: IN PROGRESS
War Room: Zoom call active

Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
T+0 (02:00): Cutover initiated
T+2 (02:02): DNS switch execution
T+5 (02:05): Monitor traffic shift
T+15 (02:15): Production smoke tests
T+20 (02:20): Status update
T+120 (04:00): Launch complete or rollback decision

Dashboards open:
✅ CloudWatch (API metrics)
✅ Sentry (error tracking)
✅ Railway (API deployment)
✅ Vercel (Web deployment)
✅ Slack #ops-critical (war room)

All eyes on dashboards. Next update in 2 minutes.

🚀 We're going live.
```

**Post to #ops-critical FIRST, then #announcements.**

---

### T+2 (02:02 UTC) — DNS SWITCH EXECUTED

**Channel:** #ops-critical + #announcements  
**From:** DevOps Lead

#### Message: DNS Switch Complete

```
✅ DNS SWITCH EXECUTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Traffic is now routing to production servers.

What was switched:
• imobi.app: staging → PRODUCTION ✅
• api.imobi.app: staging-api → PRODUCTION ✅

Status:
• DNS TTL: 60 seconds
• Propagation: 1-5 minutes (in progress)
• First requests arriving: Monitoring...

Metrics to watch (next 5 minutes):
🔴 Error rate (should be < 1%)
🔴 API latency (should be 200-500ms)
🔴 Database connections (should rise slowly)
🔴 Redis memory (should be stable)

Next checkpoint: T+5 (02:05 UTC)
Status update in 3 minutes.

We're live. Monitoring... 📊
```

**Post to #ops-critical, then #announcements.**

---

### T+5 (02:05 UTC) — STATUS UPDATE #1

**Channel:** #ops-critical  
**From:** Tech Lead

#### Message: Traffic Shift - Status Update #1

```
🟡 STATUS UPDATE #1 — Traffic Shift (T+5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Metrics (last 5 minutes):
• Error rate: 0.2% ✅ (target: < 1%)
• API latency p95: 280ms ✅ (target: < 500ms)
• Database connections: 18 ✅ (target: < 50)
• Traffic: 15 req/sec ✅ (rising normally)
• Redis memory: 22% ✅ (target: < 60%)

Status: 🟢 NOMINAL
All metrics GREEN. Traffic shifting smoothly.

What's happening:
• Users are arriving
• Database is responding
• Cache is warming up
• Payments are processing

What's next:
T+10: Continue monitoring
T+15: Run production smoke tests
T+20: Declare status or investigate issues

Confidence: 🟢 HIGH
Continue monitoring. Next update at T+10.
```

**Post to #ops-critical only (status updates don't go to #announcements).**

---

### T+10 (02:10 UTC) — CONTINUOUS MONITORING

**No message posted (just monitoring).** Update dashboard widgets in Zoom. Check every metric.

---

### T+15 (02:15 UTC) — SMOKE TESTS COMPLETE

**Channel:** #ops-critical  
**From:** QA Lead

#### Message: Production Smoke Tests - All Passed

```
🟢 SMOKE TESTS COMPLETED — ALL PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5/5 Critical Tests Passed:

✅ Test 1: User Signup ................. PASSED
✅ Test 2: User Login .................. PASSED
✅ Test 3: Create Obra ................. PASSED
✅ Test 4: Payment Processing .......... PASSED
✅ Test 5: GPS Validation .............. PASSED

Production Metrics (15-min window):
• Error rate: 0.3% ✅ (target: < 0.5%)
• API latency p95: 250ms ✅ (target: < 500ms)
• Payment success: 100% ✅ (5 test transactions)
• Active users: 85 users ✅ (real traffic)

System Status: 🟢 PRODUCTION READY FOR USERS

Core features are working perfectly in production.
Users can now sign up, create projects, and process payments.

Real-world testing confirms:
• Authentication: ✅ Working
• Database: ✅ Responsive
• Payments: ✅ Processing
• GPS/Evidence: ✅ Validating
• File uploads: ✅ To S3

Next: Continue monitoring every 5 minutes.
Hourly status updates until T+120.
```

**Post to #ops-critical.**

---

### T+20 (02:20 UTC) — STATUS UPDATE #2

**Channel:** #ops-critical + #announcements  
**From:** Tech Lead

#### Message: Launch Status - All Systems Green

```
🟢 LAUNCH STATUS UPDATE #2 — ALL GREEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Excellent news: Production is stable and performing well.

20-Minute Metrics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Error rate: 0.25% (target: < 0.5%)
✅ API latency p95: 240ms (target: < 500ms)
✅ Payment success rate: 99.8% (target: > 99.5%)
✅ Evidence uploads: 100% success
✅ Database: Healthy, 20 connections
✅ Cache hit rate: 87% (warmed up)
✅ Real user signups: 120 so far

System Performance: 🟢 EXCELLENT

What's working perfectly:
• User registration and authentication
• Project (obra) creation and management
• Payment processing (Stripe integration)
• GPS validation and evidence uploads
• Real-time notifications
• File storage to S3

Production is ready. Users are arriving and succeeding.

Next milestone: T+120 (end of launch window)
We will declare success at 04:00 UTC if metrics remain green.

Status: LAUNCH PROCEEDING NOMINALLY 🚀
```

**Post to #ops-critical, then #announcements.**

---

### T+30, T+60, T+90 (02:30, 03:00, 03:30 UTC) — HOURLY STATUS UPDATES

**Channel:** #ops-critical  
**From:** Tech Lead

#### Template: Hourly Status Update

```
🟢 STATUS UPDATE (T+[30/60/90]) — Metrics Stable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[30/60/90]-Minute Metrics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Error rate: [X]% (avg, target: < 0.5%)
✅ API latency p95: [X]ms (avg, target: < 500ms)
✅ Active users: [X] (growing)
✅ Successful transactions: [X] total
✅ Payment success rate: [X]% (target: > 99.8%)

Database Performance:
• Connections: [X]/100 (max 80)
• Slow queries: [X] detected
• Replication lag: [X]ms

Redis Performance:
• Memory usage: [X]%
• Cache hit rate: [X]%
• No evictions: ✅

Status: 🟢 NOMINAL — All systems excellent

User Activity:
• New signups: [X]
• Active users: [X]
• Successful logins: [X]
• Evidence uploads: [X]

Continue monitoring. Next update in 30 minutes.
```

**Post only critical updates. Use this template at T+30, T+60, T+90.**

---

### T+120 (04:00 UTC) — LAUNCH SUCCESS DECLARATION

**Channel:** #ops-critical + #announcements  
**From:** Tech Lead + QA Lead + DevOps Lead (all three co-sign)

#### Message: GO-LIVE SUCCESSFUL 🎉

```
🚀 GO-LIVE SUCCESSFUL — IMOBI v2.0.0 LIVE 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

imobi v2.0.0 is now LIVE in production.

Execution Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Launch Date: 2026-06-02
Launch Time: 02:00-04:00 UTC
Duration: 2 hours 0 minutes
Status: PERFECT EXECUTION ✅

Final Metrics (2-hour window):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Error rate: 0.3% (target: < 0.5%)
✅ API latency p95: 240ms (target: < 500ms)
✅ Payment success rate: 99.9% (target: > 99.8%)
✅ Evidence upload success: 99.8% (target: > 99%)
✅ User signups: 280 (growing)
✅ Active users: 210+ (engaged)
✅ Successful transactions: [X] processed
✅ Database health: Excellent
✅ Cache efficiency: 88% hit rate
✅ All smoke tests: 5/5 PASSED

Team Achievement:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Zero critical issues
✅ Zero rollbacks
✅ Flawless execution
✅ On-time delivery
✅ User-facing features: All working

What You Can Now Do:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Sign up for imobi (https://imobi.app)
✅ Create your first construction project
✅ Upload progress photos and evidence
✅ Manage project timelines
✅ Process payments
✅ Track project milestones

System Status: 🟢 FULLY OPERATIONAL

Code Freeze: LIFTED ✅ (normal operations resume)
Deployments: Available again (in 30 minutes after stability check)
Monitoring: Continues 24/7 for 24 hours

Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Continue monitoring (24-hour protocol)
2. Celebrate! 🎉
3. Post-launch retrospective (tomorrow)
4. Transition to normal on-call rotation

Post-Launch Support:
• On-call team: Standing by
• Monitoring: Active 24/7
• Support team: Ready for user issues
• DevOps: Watching infrastructure

Thank you, team. This was a textbook launch.

imobi v2.0.0 is LIVE. We shipped it. 🎉

---
Confirmed by:
✅ Tech Lead: [Name]
✅ QA Lead: [Name]
✅ DevOps Lead: [Name]

Timestamp: 2026-06-02 04:00:00 UTC
```

**Post to #ops-critical first, then immediately to #announcements.**

---

## EXCEPTION MESSAGES

### If Things Go Wrong at T+5

**Channel:** #ops-critical  
**From:** Tech Lead

```
🟡 ISSUE DETECTED — Investigating (T+5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Error rate spiked to [X]% (threshold: 1%)

What we're doing:
• Checking Sentry for error patterns
• Investigating database connectivity
• Reviewing recent code changes
• Assessing severity

Current assessment: [P1 / P2 / P3]

Timeline:
• Issue detected: 02:05 UTC
• Investigation timeout: 2 minutes (02:07 UTC)
• Decision point: 02:09 UTC (rollback or continue)

Team is focused. Updates every minute.
Stand by.
```

---

### If We Need to Rollback

**Channel:** #ops-critical + #announcements  
**From:** Tech Lead

```
🔄 ROLLBACK INITIATED — Returning to Stable Version
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We have decided to rollback to the previous stable version.

Issue: [Root cause identified]
Error rate: [X]%
Decision: Rollback (< 5 minutes to stable)

What's happening:
• DNS reverting to staging
• API rolling back to v1.9.5
• Web rolling back to previous version
• All systems returning to known-good state

ETA to stable: 3-5 minutes
War room: Continues until confirmed stable

User impact: Brief outage, returning to previous version
Data safety: No data loss, databases unchanged

Next steps:
• Root cause analysis
• Fix implementation
• New launch window: [Propose date/time]
• Team debrief: [Schedule]

Thank you for your patience. We'll get this right.
```

---

## STAKEHOLDER COMMUNICATION (If Needed)

### Message to CEO (if rollback occurs)

**Channel:** Direct message or call  
**From:** Tech Lead

```
Subject: Launch Status - Rollback

We've rolled back the v2.0.0 launch due to [brief technical issue].
All systems are stable on v1.9.5.

Details:
• Time of incident: 02:0X UTC
• Duration: < 5 minutes
• User impact: Brief service interruption
• Data loss: None
• Root cause: [Identified - fix underway]

Next launch:
• Proposed date: [2026-06-03, 02:00 UTC]
• Confidence: High (fix validated)
• Timeline: 48 hours to retry

This is a learning experience. Team is debriefing now.
```

---

## COMMUNICATION CHECKLIST FOR LAUNCH DAY

```
T-24h: [ ] Launch confirmation posted
T-12h: [ ] Halfway check-in posted
T-2h:  [ ] Code freeze announcement posted
T-30m: [ ] Final briefing posted
T-0:   [ ] Launch initiation posted
T+2:   [ ] DNS switch confirmation posted
T+5:   [ ] Status update #1 posted
T+15:  [ ] Smoke tests results posted
T+20:  [ ] Status update #2 posted
T+30:  [ ] Hourly update posted
T+60:  [ ] Hourly update posted
T+90:  [ ] Hourly update posted
T+120: [ ] Success declaration posted (or rollback message)
```

---

**Document Status:** 🟢 ALL COMMUNICATION TEMPLATES READY  
**Last Updated:** 2026-05-31  
**Final Document:** GO-LIVE DAY CHECKLIST (one-pager)
