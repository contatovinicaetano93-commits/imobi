# Imobi Incident Response — Templates & Procedures

**Version**: 1.0  
**Date**: June 22, 2026  
**Owner**: DevOps / Operations

---

## Table of Contents

1. [Incident Declaration Template](#incident-declaration-template)
2. [Slack Alert Templates](#slack-alert-templates)
3. [Email Alert Templates](#email-alert-templates)
4. [Incident Tracking Spreadsheet](#incident-tracking-spreadsheet)
5. [Post-Mortem Template](#post-mortem-template)
6. [Common Scenarios & Fixes](#common-scenarios--fixes)
7. [Escalation Notification Templates](#escalation-notification-templates)

---

## Incident Declaration Template

Use this template to formally declare and track incidents in your incident tracking system (Jira, GitHub Issues, or dedicated document).

### Incident Declaration Form

```
╔══════════════════════════════════════════════════════════════════╗
║              IMOBI INCIDENT DECLARATION FORM                     ║
╚══════════════════════════════════════════════════════════════════╝

INCIDENT ID:            INC-YYYY-MM-DD-NNN
TIMESTAMP:              YYYY-MM-DD HH:MM:SS UTC
DECLARED BY:            [Your Name]
SEVERITY:               ☐ P0-CRITICAL  ☐ P1-HIGH  ☐ P2-MEDIUM  ☐ P3-LOW

═══════════════════════════════════════════════════════════════════
INCIDENT DESCRIPTION
═══════════════════════════════════════════════════════════════════

Title:
  [One-line summary]

Impact:
  [What is broken? How many users affected?]
  [Example: "API health check returning 503. All new user signups blocked."]

User-Visible Effect:
  ☐ Cannot login
  ☐ Cannot upload evidence
  ☐ Cannot view credit terms
  ☐ Cannot complete workflow
  ☐ Slow performance
  ☐ Data missing
  ☐ Other: _______________

═══════════════════════════════════════════════════════════════════
AFFECTED SYSTEMS
═══════════════════════════════════════════════════════════════════

☐ API Backend (NestJS)
☐ Web Frontend (Next.js)
☐ Database (PostgreSQL)
☐ Cache (Redis)
☐ Email Service (SendGrid/SES)
☐ File Storage (AWS S3)
☐ Authentication (JWT)
☐ Background Workers (BullMQ)
☐ Vercel Deployment
☐ Other: _______________

═══════════════════════════════════════════════════════════════════
DETECTION & TIMELINE
═══════════════════════════════════════════════════════════════════

Detected By:
  ☐ UptimeRobot health check
  ☐ Sentry error alert
  ☐ User report
  ☐ Manual monitoring
  ☐ Other: _______________

Detection Time:         YYYY-MM-DD HH:MM:SS UTC
Report Time:            YYYY-MM-DD HH:MM:SS UTC (if different)
Investigation Started:  YYYY-MM-DD HH:MM:SS UTC
Team Alerted:           YYYY-MM-DD HH:MM:SS UTC

═══════════════════════════════════════════════════════════════════
INITIAL INVESTIGATION
═══════════════════════════════════════════════════════════════════

Error Message:
  [Copy exact error from logs or Sentry]

Affected Endpoints:
  [Which API endpoints? Example: POST /api/v1/evidence/upload]

Affected Pages:
  [Which web pages? Example: /dashboard]

Error Rate:
  [Percentage] errors out of [Total] requests

HTTP Status Code:
  [Example: 503 Service Unavailable]

Recent Changes:
  ☐ Recent deployment
  ☐ Configuration change
  ☐ Database migration
  ☐ Dependency update
  ☐ Infrastructure change
  ☐ No known changes

Deployment Hash:        [Git commit if applicable]
Changed At:             [Deployment timestamp]

Initial Root Cause Hypothesis:
  [Best guess at what happened]

═══════════════════════════════════════════════════════════════════
ASSIGNED TEAM
═══════════════════════════════════════════════════════════════════

Incident Commander:     [Name] - [Phone]
Primary Engineer:       [Name] - [Phone]
Secondary Engineer:     [Name] - [Phone]
DevOps Support:         [Name] - [Phone]

═══════════════════════════════════════════════════════════════════
MITIGATION & RESOLUTION
═══════════════════════════════════════════════════════════════════

Mitigation Steps:
  ☐ [Time HH:MM] Step 1: [Action taken]
  ☐ [Time HH:MM] Step 2: [Action taken]
  ☐ [Time HH:MM] Step 3: [Action taken]

Resolution Type:
  ☐ Hotfix deployed
  ☐ Rollback performed
  ☐ Service restarted
  ☐ Configuration fixed
  ☐ Manual intervention
  ☐ Waiting for external service

ETA to Resolution:      [Time estimate]
Resolved At:            [When status returned to normal]
Total Duration:         [HH:MM:SS]

═══════════════════════════════════════════════════════════════════
ROOT CAUSE ANALYSIS (Post-Incident)
═══════════════════════════════════════════════════════════════════

Root Cause:
  [Detailed technical explanation of what happened]

Contributing Factors:
  [Any systemic issues? Lack of monitoring? Poor error handling?]

Why Not Caught Earlier:
  [Why didn't monitoring catch this before users noticed?]

Fix Applied:
  [Code change, configuration change, restart, rollback, etc.]

Preventive Measures:
  [What to do to prevent this from happening again?]
  1. [Measure 1]
  2. [Measure 2]
  3. [Measure 3]

═══════════════════════════════════════════════════════════════════
POST-INCIDENT ACTIONS
═══════════════════════════════════════════════════════════════════

Post-Mortem Required:   ☐ YES  ☐ NO
Post-Mortem Date:       [Within 24 hours if P0/P1]
Post-Mortem Owner:      [Name]

Follow-up Tickets Created:
  [Link to ticket 1]
  [Link to ticket 2]
  [Link to ticket 3]

Monitoring Improvements:
  [Any new alerts to create?]

═══════════════════════════════════════════════════════════════════
NOTES & REFERENCES
═══════════════════════════════════════════════════════════════════

[Additional context, logs, external references, etc.]

Sentry Link:            [https://sentry.io/...]
Vercel Deployment:      [https://vercel.com/...]
Database Logs:          [Relevant query or error]
Slack Thread:           [Link to incident discussion]

╚══════════════════════════════════════════════════════════════════╝
```

---

## Slack Alert Templates

### Template 1: Health Check Down (P0)

```
:red_circle: **ALERT: API Health Check Down**

:warning: **SEVERITY**: P0 - CRITICAL

**Service**: imobi-api
**URL**: https://api.imobi.com.br/api/v1/health
**Status**: DOWN (HTTP 503 / Timeout)
**First Alert**: [HH:MM UTC]
**Duration**: [Time elapsed]

**Action Required**: Check API immediately
• API container running?
• Database connected?
• Restart if needed

**Escalation**: Page on-call engineer @[name]
**Tracking**: INC-YYYY-MM-DD-NNN

:point_right: [View Sentry](https://sentry.io) | [View Logs](https://vercel.com)
```

### Template 2: High Error Rate (P1)

```
:warning: **WARNING: High Error Rate Detected**

**SEVERITY**: P1 - HIGH

**Service**: imobi-api
**Error Rate**: 5.2% (threshold: 1%)
**Errors in last 5 min**: 52 errors out of 1000 requests
**Top Error**: [Error type]
**Affected Endpoint**: [/api/v1/endpoint]

**Key Metrics**:
• Error Rate: 5.2% :red_circle:
• P95 Latency: 1200ms :yellow_circle:
• Failed Requests: 52

**Potential Causes**:
☐ Recent deployment
☐ Database performance issue
☐ External service failure
☐ Traffic spike

**Sentry Details**: [https://sentry.io/organizations/.../issues/...]
**Action**: Investigate in Sentry, check for recent deploy

:point_right: [View Sentry](https://sentry.io) | Respond in thread
```

### Template 3: Performance Degradation (P2)

```
:yellow_circle: **Performance Degradation Detected**

**SEVERITY**: P2 - MEDIUM

**Metric**: API Response Time
**Current P95**: 2500ms (threshold: 2000ms)
**Baseline**: 800ms
**Delta**: +1700ms (212% increase)

**Affected Endpoints**:
• POST /api/v1/evidence/upload - 3000ms
• GET /api/v1/obras - 2200ms
• GET /api/v1/credits - 2100ms

**Likely Causes**:
• Database query slowness
• Connection pool saturation
• Redis timeout
• Load spike

**Action**: Investigate database performance, check connection pool

:point_right: [View Vercel](https://vercel.com) | [Check Logs](https://logs...)
```

### Template 4: Status Resolved (Green)

```
:green_circle: **Incident Resolved**

**Incident**: INC-YYYY-MM-DD-NNN
**Service**: imobi-api
**Duration**: 45 minutes
**Root Cause**: Database connection pool exhausted

**Status**: ✅ RESOLVED
**Error Rate**: Returned to 0.1% (normal)
**Latency**: Returned to 800ms (normal)
**Availability**: 100% (from resolution time)

**Resolution Actions Taken**:
1. Identified stuck database connections
2. Terminated idle connections
3. Restarted API service
4. Verified health check passing

**Follow-up**: Post-mortem scheduled for Friday 2 PM

Thanks to: @engineer1 @devops-lead
```

### Template 5: Daily Status Report (Info)

```
:clipboard: **Daily Monitoring Report**

**Date**: YYYY-MM-DD
**Period**: 00:00 - 23:59 UTC

**Health Summary**: ✅ All Systems Operational

**Metrics** (24-hour averages):
• Error Rate: 0.08% (target: < 0.1%) :green_circle:
• P95 Latency: 750ms (target: < 800ms) :green_circle:
• Availability: 100% (target: 100%) :green_circle:
• API Health: OK (target: OK) :green_circle:

**Resource Utilization**:
• Database Connections: 45/100 (45%) :green_circle:
• Redis Memory: 2.5/5 GB (50%) :green_circle:
• Queue Depth: 5 pending jobs :green_circle:

**Incidents**: 0 critical, 0 high, 0 medium
**Alerts**: 0 false positives

**Recommendations**: Continue monitoring, no action needed

See full report: [link to detailed report]
```

---

## Email Alert Templates

### Template 1: Critical Alert Email

```
Subject: [ALERT] CRITICAL: Imobi API Health Check DOWN

From: UptimeRobot <alerts@uptimerobot.com>
To: imobi-oncall@company.com
Cc: imobi-eng-leads@company.com

────────────────────────────────────────────────────

🔴 CRITICAL ALERT

Monitor: Imobi API Health Check
URL: https://api.imobi.com.br/api/v1/health
Status: DOWN

First Alert: 2026-06-22 12:00:00 UTC
Duration: 15 minutes
Incidents: This is incident #1 in the last 7 days

────────────────────────────────────────────────────

ACTION REQUIRED:
1. Check API logs immediately
2. Verify database connectivity
3. Restart API service if needed
4. Escalate to on-call engineer

Escalation Contacts:
• On-Call: [Name] - [Phone]
• Team Lead: [Name] - [Phone]

────────────────────────────────────────────────────

Dashboard: https://uptimerobot.com/dashboard
Sentry: https://sentry.io
Vercel: https://vercel.com/contatovinicaetano93-commits/imobi

This is an automated alert. Reply to: [support-email]
```

### Template 2: Daily Health Report Email

```
Subject: Imobi Daily Health Check Report - 2026-06-22

From: DevOps <devops@company.com>
To: imobi-oncall@company.com

────────────────────────────────────────────────────

IMOBI DAILY HEALTH CHECK REPORT
Date: 2026-06-22
Time: 08:00 UTC

────────────────────────────────────────────────────

HEALTH STATUS: ✅ GOOD

API Health Endpoint: OK
Redis Connection: Connected
Database: Configured
Email Service: Configured

────────────────────────────────────────────────────

24-HOUR METRICS:

Error Rate:         0.08% (Target: < 0.1%)  ✅
P95 Response Time:  750ms (Target: < 800ms) ✅
Availability:       100%   (Target: 100%)   ✅
Incidents:          0      (Target: 0)      ✅

────────────────────────────────────────────────────

DASHBOARDS TO REVIEW:

Sentry: https://sentry.io
Vercel: https://vercel.com/contatovinicaetano93-commits/imobi/analytics
UptimeRobot: https://uptimerobot.com/dashboard

────────────────────────────────────────────────────

ACTIONS FOR TODAY:

☐ Review Sentry for new errors
☐ Check Vercel Analytics for performance
☐ Monitor UptimeRobot dashboard
☐ Brief team on overnight status

────────────────────────────────────────────────────

On-Call for Today:
Primary: [Name] [Phone]
Secondary: [Name] [Phone]

```

---

## Incident Tracking Spreadsheet

Create a Google Sheet with these columns to track all incidents:

```
| Date | Incident ID | Service | Severity | Duration (min) | Root Cause | Resolution | Post-Mortem? | Created By |
|------|-------------|---------|----------|----------------|-----------|------------|-------------|-----------|
| 2026-06-22 | INC-001 | API | P1 | 45 | DB pool exhaustion | Restart API | Yes | @engineer1 |
| 2026-06-22 | INC-002 | Web | P2 | 20 | Cache miss spike | Clear cache | No | @engineer2 |
| 2026-06-23 | INC-003 | Auth | P0 | 5 | Redis down | Restart | Yes | @devops |
```

**Columns Explained**:
- **Date**: When incident occurred
- **Incident ID**: Reference number (INC-YYYY-MM-DD-NNN)
- **Service**: Which component (API, Web, Database, etc.)
- **Severity**: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- **Duration**: Minutes from first alert to resolution
- **Root Cause**: What actually happened
- **Resolution**: How it was fixed
- **Post-Mortem**: Whether post-mortem was held
- **Created By**: Who reported it

**Weekly Review**:
- Total incidents
- Trend (increasing/decreasing)
- Root cause categories
- Time-to-resolution average
- Post-mortem completion rate

---

## Post-Mortem Template

Use this template 24 hours after any P0 or P1 incident. Recommended time: 1-2 hours, all team members.

```
╔══════════════════════════════════════════════════════════════════╗
║              INCIDENT POST-MORTEM REPORT                         ║
╚══════════════════════════════════════════════════════════════════╝

INCIDENT: INC-YYYY-MM-DD-NNN
DATE: YYYY-MM-DD (post-mortem date, not incident date)
ATTENDEES: [Names]
FACILITATOR: [Name]

═══════════════════════════════════════════════════════════════════
INCIDENT SUMMARY
═══════════════════════════════════════════════════════════════════

Title: [One-line description]
Duration: [Hours:Minutes]
Severity: [P0/P1]
Impact: [Number of users affected, business impact]

Example: "Database connection pool exhausted, blocking all new signups
for 45 minutes. Affected 8 beta test users."

═══════════════════════════════════════════════════════════════════
TIMELINE (What happened, minute by minute)
═══════════════════════════════════════════════════════════════════

12:00 - UptimeRobot health check started failing
12:05 - Slack alert posted in #imobi-incidents
12:07 - On-call engineer @name started investigation
12:15 - Root cause identified: DB connection pool at 100%
12:20 - Idle connections terminated
12:25 - API service restarted
12:30 - Health check returned to OK
12:35 - Error rate normalized

Total Duration: 35 minutes from first alert to resolution

═══════════════════════════════════════════════════════════════════
ROOT CAUSE ANALYSIS
═══════════════════════════════════════════════════════════════════

Root Cause: Database connection pool saturation

Technical Details:
[Explain what actually caused the incident]

Why It Happened:
[Why was this condition allowed to occur?]

Contributing Factors:
[Other things that made it worse]

═══════════════════════════════════════════════════════════════════
HOW WE DETECTED IT
═══════════════════════════════════════════════════════════════════

Detection Method:
✅ UptimeRobot health check
☐ Sentry error alert
☐ User report
☐ Manual monitoring

Detection Time: 12:00 UTC
Time to Alert: 5 minutes
Time to Investigation Start: 7 minutes

═══════════════════════════════════════════════════════════════════
WHAT WE COULD HAVE DONE BETTER
═══════════════════════════════════════════════════════════════════

Detection:
- [ ] Earlier detection with more proactive monitoring
- [ ] Set connection pool alerting at 70% (not 100%)
- [ ] Monitor connection churn rate

Prevention:
- [ ] Connection pool size should have been larger
- [ ] Query timeout was too long
- [ ] Missing connection leak detection

Response:
- [ ] Runbook was incomplete
- [ ] Response time could have been faster
- [ ] Needed better communication to beta users

Monitoring:
- [ ] No alert for connection pool usage
- [ ] No alert for idle connections
- [ ] Missing performance baseline tracking

═══════════════════════════════════════════════════════════════════
ACTION ITEMS (PREVENTIVE MEASURES)
═══════════════════════════════════════════════════════════════════

IMMEDIATE (This week):
☐ Increase connection pool size from 50 to 100
☐ Add database connection pool alert at 70% usage
☐ Test connection pool restart procedure
[ ] Owner: @devops-lead    Due: 2026-06-24

SHORT-TERM (Next 2 weeks):
☐ Implement connection leak detection
☐ Add query timeout monitoring
☐ Create database performance dashboard
☐ Update runbook with debugging steps
[ ] Owner: @backend-lead    Due: 2026-07-06

LONG-TERM (Next month):
☐ Implement database query profiling
☐ Add APM (Application Performance Monitoring)
☐ Create automated capacity planning alerts
☐ Schedule database optimization review
[ ] Owner: @devops-lead    Due: 2026-07-20

═══════════════════════════════════════════════════════════════════
IMPACT ASSESSMENT
═══════════════════════════════════════════════════════════════════

Business Impact:
- 8 beta users unable to complete signups
- 35 minutes of unavailability
- Estimated $X impact
- [User satisfaction notes]

Learning:
- Team learned about connection pool exhaustion symptoms
- Improved runbook for database issues
- Better understanding of infrastructure limits

═══════════════════════════════════════════════════════════════════
FEEDBACK & CLOSING THOUGHTS
═══════════════════════════════════════════════════════════════════

What Went Well:
- Fast detection via UptimeRobot
- Quick team mobilization
- Clear communication in Slack

What Could Be Better:
- Preventive monitoring earlier
- More detailed runbook
- Better documentation of pool settings

Questions for Next Review:
- Are action items being tracked?
- Was this type of incident preventable?
- What's our long-term database strategy?

═══════════════════════════════════════════════════════════════════

Post-Mortem Date: 2026-06-23
Facilitator: @name
Notes Taken By: @name
Action Items Owner: @name

Distribution: Sent to #imobi-incidents, @engineering-team, @leadership
```

---

## Common Scenarios & Fixes

### Scenario 1: API Health Check Failing

**Alert**: UptimeRobot - HTTP 503 or timeout

**Investigation Checklist**:
```
☐ curl https://api.imobi.com.br/api/v1/health
  → If timeout, API container is down or hung
  → If 503, database/Redis unavailable

☐ Check recent deployments
  → git log --oneline -5
  → Any recent changes?

☐ Check container status
  → docker ps | grep imobi-api
  → Is it running? Restarting?

☐ Check database connectivity
  → psql $DATABASE_URL -c "SELECT 1"
  → Can API reach database?

☐ Check logs
  → docker logs imobi-api
  → Recent errors?
```

**Quick Fixes** (in order):
1. Restart API container: `docker restart imobi-api`
2. Check database: `psql $DATABASE_URL -c "SELECT 1"`
3. Restart database if needed
4. Check Redis: `redis-cli ping`
5. Rollback last deployment if recent change

**Escalate if**: Still failing after 10 minutes

---

### Scenario 2: High Error Rate (> 1%)

**Alert**: Sentry - Error rate spike

**Investigation Checklist**:
```
☐ Open Sentry dashboard
  → What error type?
  → Which endpoint?
  → When did it start?

☐ Check recent deployment
  → git log --oneline -1
  → What changed?

☐ Check error frequency
  → Is it constant or spiky?
  → Affecting all users or specific action?

☐ Review error stack trace
  → Database error?
  → Validation error?
  → External service error?

☐ Check user impact
  → How many affected users?
  → Which specific workflows fail?
```

**Quick Fixes** (in order):
1. If recent deployment: `git revert HEAD && git push` (rollback)
2. If validation error: Fix validation logic and redeploy
3. If database error: Check database status and restart
4. If external service: Check service status page
5. Monitor error rate return to normal

**Escalate if**: Error rate still > 1% after 15 minutes

---

### Scenario 3: Response Time Degradation (P95 > 2s)

**Alert**: Vercel Analytics or Sentry performance alert

**Investigation Checklist**:
```
☐ Check database performance
  → SELECT query_time, query FROM slowlog
  → Are there slow queries?

☐ Check connection pool
  → SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname
  → Pool at capacity?

☐ Check Redis performance
  → redis-cli --stat
  → High latency?

☐ Check traffic volume
  → Is there a traffic spike?
  → More requests than normal?

☐ Review Vercel logs
  → Function duration trending up?
  → Memory usage high?
```

**Quick Fixes** (in order):
1. Increase database connection pool
2. Restart Redis: `redis-cli FLUSHALL`
3. Optimize slow queries
4. Scale up (more API instances)
5. Temporary: Clear cache to reset hit rates

**Escalate if**: Latency stays > 2s for > 10 minutes

---

### Scenario 4: Database Connection Pool Exhausted

**Alert**: Database error logs showing "connection timeout"

**Investigation Checklist**:
```
☐ Check connection count
  → SELECT count(*) FROM pg_stat_activity;
  → SELECT max_conn FROM pg_settings;

☐ Find idle connections
  → SELECT * FROM pg_stat_activity
    WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 min'

☐ Find long-running queries
  → SELECT * FROM pg_stat_activity
    WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 min'

☐ Check application logs
  → Are connections being leaked?
```

**Quick Fixes** (in order):
1. Terminate idle connections:
   ```
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE idle_in_transaction AND state = 'idle';
   ```
2. Restart API: `docker restart imobi-api`
3. Increase max_conn in PostgreSQL config
4. Redeploy with connection pool optimization

**Escalate if**: Connections still exhausted after restart

---

### Scenario 5: Redis Connection Failure

**Alert**: Health check shows `redis.status: "error"`

**Investigation Checklist**:
```
☐ Test Redis connection
  → redis-cli ping
  → PONG or error?

☐ Check Redis logs
  → docker logs imobi-redis
  → Any errors?

☐ Verify credentials
  → echo $REDIS_URL
  → Correct host/port/password?

☐ Check network
  → nc -zv redis.host 6379
  → Can reach from API container?

☐ Check Redis memory
  → redis-cli info memory
  → Memory full? Evicting keys?
```

**Quick Fixes** (in order):
1. Restart Redis: `docker restart imobi-redis`
2. Verify credentials in .env
3. Check network/firewall rules
4. Clear old keys: `redis-cli FLUSHDB`
5. Reconnect application

**Escalate if**: Redis still down after restart

---

## Escalation Notification Templates

### Escalation to Team Lead (15 minutes unresolved)

```
Subject: [ESCALATION] Incident INC-YYYY-MM-DD-NNN Unresolved

To: @team-lead
Cc: @incident-commander

Hi [Team Lead Name],

An incident has been unresolved for 15+ minutes and requires escalation.

**Incident**: INC-YYYY-MM-DD-NNN
**Service**: [Service Name]
**Severity**: P1-HIGH
**Duration**: 15+ minutes
**Status**: INVESTIGATING / IN-PROGRESS

**What's Happening**:
[Brief description of issue]

**Investigation So Far**:
1. [Finding 1]
2. [Finding 2]
3. [Still investigating...]

**What We Need From You**:
- Approval to rollback? (Last deployment 20 minutes ago)
- Authorization for emergency maintenance?
- Additional resources?

**Current Team**:
- Primary: [Name] - Investigating
- Secondary: [Name] - Monitoring

**Next Steps**:
- Continue investigation
- Prepare rollback plan
- Escalate further if needed

Slack Thread: [Link]

Thanks,
[Primary Engineer]
```

### Escalation to Engineering Lead (P0 + 10 minutes)

```
Subject: [P0 ESCALATION] Critical Incident INC-YYYY-MM-DD-NNN

To: @engineering-lead, @cto
Cc: @incident-commander, @team-lead

🔴 CRITICAL INCIDENT ESCALATION

**Incident**: INC-YYYY-MM-DD-NNN
**Severity**: P0 - CRITICAL
**Duration**: 10+ minutes
**Status**: INVESTIGATING

**Impact**: [Number] users cannot [critical action]

**Root Cause (Suspected)**: [Theory]

**Actions Taken**:
1. Declared incident
2. Mobilized team
3. Investigation in progress
4. Prepared rollback plan

**Request**:
- Strategic decision needed
- Approval for major action (rollback/restart)
- Additional resources

**Team Response Time**:
- On-call: 2 minutes
- Incident commander: 3 minutes
- Primary engineer: 5 minutes

**Current Status**:
- Monitoring: Active
- Communications: Ongoing
- Resolution ETA: [Time]

Sentry: [Link]
Slack: [Link]

Standing by for direction.

[Incident Commander Name]
```

---

## Quick Reference: Alert Severity Mapping

```
┌─────────────┬──────────────────┬────────────────┬───────────────────┐
│  Severity   │ Trigger           │ Escalation Time│ Required Action   │
├─────────────┼──────────────────┼────────────────┼───────────────────┤
│ P0 Critical │ • API down        │ Immediately    │ Page on-call      │
│             │ • Auth broken     │ (< 5 min)      │ Emergency action  │
│             │ • Data loss       │                │ Mobilize team     │
│             │ • 100% errors     │                │                   │
├─────────────┼──────────────────┼────────────────┼───────────────────┤
│ P1 High     │ • Error > 5%      │ Within 15 min  │ Immediate invest. │
│             │ • Latency > 2s    │                │ Fix or rollback   │
│             │ • 50%+ features   │                │ Alert team        │
│             │   broken          │                │                   │
├─────────────┼──────────────────┼────────────────┼───────────────────┤
│ P2 Medium   │ • Error 1-5%      │ Within 1 hour  │ Investigate       │
│             │ • Latency slow    │                │ Non-critical fix  │
│             │ • Single feature  │                │ Monitor closely   │
│             │   issue           │                │                   │
├─────────────┼──────────────────┼────────────────┼───────────────────┤
│ P3 Low      │ • Minor UI issue  │ Next business  │ Log for later     │
│             │ • Warnings        │ day            │ Can wait for      │
│             │ • Performance tip │                │ normal deploy     │
└─────────────┴──────────────────┴────────────────┴───────────────────┘
```

---

## Approval & Sign-Off

These templates are ready for use. Print the cheat sheets and laminate for desk reference.

**Reviewed By**: _________________ **Date**: _______

**Implemented By**: _________________ **Date**: _______

---

**Document Status**: ✅ READY FOR USE

**Last Updated**: June 22, 2026  
**Version**: 1.0
