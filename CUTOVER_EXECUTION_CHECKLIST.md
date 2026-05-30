# PRODUCTION CUTOVER EXECUTION CHECKLIST
**imobi Phase 4 | 2026-06-02**

**Print this page → Check off items as completed → Keep record for post-mortem**

---

## PRE-CUTOVER DAY (2026-06-01)

### Morning (08:00-14:00 BRT)

**Owner**: Engineering Lead

```
PRE-CUTOVER DAY CHECKLIST
═════════════════════════════════════════════

[ ] Code Freeze Notification
    Posted to #announcements at: ________ (time)
    
[ ] No New Commits
    Verified main branch stable
    Last commit: ________________
    Tag v2.0.0 exists: [ ] YES [ ] NO
    
[ ] Dependency Audit
    npm audit clean: [ ] YES [ ] NO
    Security vulnerabilities: [ ] NONE [ ] [count] (BLOCKER if > 0)
    
[ ] Build Test
    pnpm build completes: [ ] YES [ ] NO
    Build time: ________ seconds (must be < 90)
    
[ ] TypeScript Check
    pnpm type-check: [ ] 0 ERRORS [ ] [count] ERRORS (BLOCKER if > 0)
    
[ ] Test Suite
    pnpm test: [ ] ALL PASS [ ] [count] FAIL
    Failed tests: ______________________ (if any)
```

---

### Afternoon (14:00-17:00 BRT)

**Owner**: QA Lead

```
TESTING WINDOW CHECKLIST
═════════════════════════════════════════════

[ ] SIMPLIFIED_TEST_CHECKLIST.md Completion
    Started at: ________ (time)
    Total test cases: 50+
    Passed: ________ Failed: ________ Blocked: ________
    
[ ] Critical User Flows
    [ ] Manager login → Dashboard → Approve etapa
    [ ] Engineer GPS submission → Validation → Photo upload
    [ ] Payment pipeline end-to-end
    [ ] Each flow tested: [ ] 1x [ ] 2x [ ] 3x
    
[ ] Browser Compatibility
    [ ] Chrome (desktop): ________ version | Status: [ ] PASS [ ] FAIL
    [ ] Firefox (desktop): ________ version | Status: [ ] PASS [ ] FAIL
    [ ] Safari (desktop): ________ version | Status: [ ] PASS [ ] FAIL
    [ ] Chrome Mobile: Status: [ ] PASS [ ] FAIL
    
[ ] Performance Profile
    API response time p95: ________ ms (target: < 500ms)
    API response time p99: ________ ms (target: < 1000ms)
    Database query slowest: ________ ms
    Frontend load time: ________ seconds
    
[ ] Any Issues Found?
    [ ] NO ISSUES
    [ ] YES — Document below:
        Issue 1: _______________________________
        Issue 2: _______________________________
        Issue 3: _______________________________
        Resolution plan: _____________________
```

---

### Go/No-Go Gate (17:00 BRT)

**Owner**: CTO (Final Decision Authority)

```
GO/NO-GO DECISION GATE
═════════════════════════════════════════════

Date: ________________
Time: 17:00 BRT ________ UTC
Tester Name: _____________________________

BUILD & TYPE CHECKS
[ ] pnpm type-check: 0 errors
[ ] pnpm build: < 90 seconds
[ ] npm audit: Clean (0 vulnerabilities)
[ ] Vercel preview: Tested manually

TESTING RESULTS  
[ ] 50+ test cases: ALL PASS
[ ] Critical flows: ALL PASS (3x)
[ ] No blocking bugs found
[ ] Browser compatibility: OK

DATABASE & INFRASTRUCTURE
[ ] PostgreSQL: Connected ✓
[ ] Redis: Connected ✓
[ ] PostGIS: Functions working ✓
[ ] Migrations: Ready to deploy
[ ] Backup: Complete & tested [ ] Size: ________ MB

MONITORING
[ ] Sentry: Configured & active
[ ] CloudWatch: Connected & showing data
[ ] Grafana: [if applicable] [ ] Setup [ ] N/A
[ ] Alerts: Configured (error rate > 1%)

SECURITY
[ ] CORS headers: Present
[ ] JWT expiry: 15 minutes
[ ] SQL injection prevention: Verified
[ ] XSS protection: Verified
[ ] Rate limiting: Active

APPROVAL SIGNATURES
[ ] QA Lead Sign-off: _____________________ Date: ________
[ ] Engineering Lead: _____________________ Date: ________
[ ] CTO Final Approval: ___________________ Date: ________

═════════════════════════════════════════════

DECISION (check one):

[ ] ✅ GO
    Proceeding to cutover 2026-06-02 02:00 BRT
    All criteria met. Proceed to pre-cutover prep.
    
[ ] ❌ NO-GO  
    STOP. Do not schedule cutover.
    Blockers must be documented below.

═════════════════════════════════════════════

IF NO-GO: Document blockers here:

Blocker #1: _______________________________
Root cause: _______________________________
Fix owner: _______ Est. time to fix: _____

Blocker #2: _______________________________
Root cause: _______________________________
Fix owner: _______ Est. time to fix: _____

Proposed reschedule date: __________________

═════════════════════════════════════════════

CTO: Print name: ___________________________
     Signature: ________________________
     Time: ____________________________
```

---

### Pre-Cutover Prep (17:00-23:00 BRT)

**Owner**: DevOps Lead

```
DATABASE BACKUP VERIFICATION
═════════════════════════════════════════════

[ ] Full PostgreSQL Dump
    Command: pnpm --filter @imbobi/api prisma db backup
    Output file: ________________
    File size: ________ MB (verify > 50MB)
    Location: S3://imobi-backups/2026-06-02/
    Upload status: [ ] COMPLETE [ ] IN PROGRESS [ ] FAILED
    Date/Time backed up: __________________
    
[ ] Backup Restore Test (in staging)
    Restore command executed: [ ] YES [ ] NO
    Restore completed successfully: [ ] YES [ ] NO
    Data integrity check: [ ] PASS [ ] FAIL
    Restore time: ________ minutes
    
[ ] Cold Storage Copy
    AWS Glacier copy initiated: [ ] YES [ ] NO
    Copy status: [ ] COMPLETE [ ] IN PROGRESS [ ] FAILED

REDIS SNAPSHOT
═════════════════════════════════════════════

[ ] RDB Dump Exported
    Command: redis-cli BGSAVE
    File: redis-snapshot-2026-06-02.rdb
    File size: ________ MB
    Location: S3://imobi-backups/2026-06-02/
    Export time: __________________
    
[ ] Queue System State Captured
    BullMQ job queue count: ________
    Queue system: [ ] EMPTY [ ] [count] jobs
    If not empty, decision: [ ] Wait [ ] Force clear
    
[ ] Test Restore (dev Redis)
    Restore command executed: [ ] YES [ ] NO
    Restore successful: [ ] YES [ ] NO
    Keys accessible: [ ] YES [ ] NO

MONITORING SETUP
═════════════════════════════════════════════

[ ] Sentry Projects
    [ ] API project (Node.js): Configured
        DSN: ___________________________
        Release tag: ___________________
        [ ] Alerts enabled
    [ ] Web project (JavaScript): Configured
        DSN: ___________________________
        Release tag: ___________________
        [ ] Alerts enabled
    [ ] Error rate alert: Configured (threshold: > 1%)
    
[ ] CloudWatch Dashboards
    [ ] Custom dashboard created
    [ ] Metrics visible: [ ] YES [ ] NO
    Metrics configured:
        [ ] Error rate
        [ ] Response time (p95, p99)
        [ ] Database connections
        [ ] Redis memory
        [ ] CPU usage
        
[ ] Grafana [if applicable]
    [ ] Connected to data source
    [ ] Dashboards created
    [ ] Alerts configured
    
[ ] PagerDuty [if applicable]
    [ ] On-call schedule verified
    [ ] Escalation policy active: [ ] YES [ ] NO
    Primary on-call: ________________
    Backup on-call: ________________

VERCEL CONFIGURATION
═════════════════════════════════════════════

[ ] Environment Variables Set
    [ ] NODE_ENV = production
    [ ] NEXT_PUBLIC_API_URL = https://api.imobi.com
    [ ] DATABASE_URL = [set]
    [ ] REDIS_URL = [set]
    [ ] All email config = [set]
    [ ] Firebase credentials = [set]
    [ ] AWS S3 credentials = [set]
    [ ] Sentry DSN (2 projects) = [set]
    
[ ] Build Configuration
    Build command: ____________________________
    Output directory: ___________________________
    [ ] Framework: Next.js 14 detected
    [ ] Build cache: [ ] Cleared [ ] OK
    
[ ] Deployment Settings
    [ ] Auto-deploy on main: ENABLED
    [ ] Preview deployments: [setting]
    [ ] Production branch: main
    
[ ] Preview Build Tested
    [ ] Preview URL created: _________________
    [ ] Manual test: [ ] PASS [ ] FAIL
    [ ] Login works: [ ] YES [ ] NO
    [ ] Dashboard loads: [ ] YES [ ] NO
    
[ ] Rollback Version Available
    [ ] Previous stable version: [commit SHA/version]
    [ ] Can be rolled back via: [ ] Vercel UI [ ] CLI [ ] Git revert

TEAM COORDINATION
═════════════════════════════════════════════

[ ] On-Call Rotation Confirmed
    CTO: ________________________ Status: [ ] CONFIRMED [ ] NOT AVAILABLE
    DevOps Lead: ____________________ Status: [ ] CONFIRMED [ ] NOT AVAILABLE
    Tech Lead: ______________________ Status: [ ] CONFIRMED [ ] NOT AVAILABLE
    Support Lead: ____________________ Status: [ ] CONFIRMED [ ] NOT AVAILABLE
    
[ ] Availability Windows
    CTO available: 02:00-06:00 BRT + 48h post: [ ] YES [ ] NO
    DevOps: Active during cutover: [ ] YES [ ] NO
    Tech Lead: Active during cutover: [ ] YES [ ] NO
    
[ ] Phone Bridge Setup
    Bridge number: ________________
    PIN/password: ________________
    [ ] Bridge tested & working
    [ ] All participants can access
    
[ ] Slack Channels Ready
    [ ] #cutover-live created (private, ops only)
    [ ] #announcements ready for public updates
    [ ] #critical-issues ready for escalations
    [ ] All team members in channels: [ ] YES [ ] NO

RUNBOOK REVIEWS
═════════════════════════════════════════════

[ ] Rollback Procedure Reviewed
    [ ] By: _____________ [ ] By: _____________
    Expected time: 5 minutes
    
[ ] Hotfix Process Reviewed
    [ ] By: _____________ [ ] By: _____________
    Expected time: 15 minutes
    
[ ] Database Recovery Steps
    [ ] Reviewed [ ] Tested in staging
    
[ ] Redis Restart Procedure
    [ ] Documented [ ] Tested
    
[ ] Emergency Escalation Path
    [ ] Chain documented [ ] Contact verified
```

---

### Final Checks (20:00-23:00 BRT)

**Owner**: DevOps + Tech Lead

```
FINAL PRE-CUTOVER CHECKLIST
═════════════════════════════════════════════

[ ] Pre-deployment Health Check
    Command: scripts/pre-deployment-health-check.sh
    Executed at: ________ (time)
    All checks: [ ] PASS [ ] FAIL
    Issues: _______________________________

[ ] Git Status Final
    Current branch: ___________________________
    Latest tag: ________________________________
    No uncommitted changes: [ ] YES [ ] NO
    
[ ] Database Health
    Connect test: [ ] OK
    Query test (SELECT 1): [ ] OK
    Migration status: All applied: [ ] YES [ ] NO
    
[ ] Redis Health
    PING command: [ ] PONG
    DBSIZE: __________ keys
    Memory usage: __________ MB
    
[ ] Build Pipeline Ready
    [ ] Vercel dashboard accessible
    [ ] Deploy button visible
    [ ] No pending builds
    [ ] Deployment history visible

TEAM READY CHECK
═════════════════════════════════════════════

Team member checklist (20:00 BRT):

CTO
  [ ] Online in Slack (#cutover-live)
  [ ] Ready (not tired): [ ] YES [ ] NO
  [ ] Phone charged: [ ] YES [ ] NO
  [ ] Internet stable: [ ] YES [ ] NO

DevOps Lead
  [ ] Online in Slack
  [ ] All commands tested: [ ] YES [ ] NO
  [ ] Terminal ready with access: [ ] YES [ ] NO
  [ ] Backup laptop ready: [ ] YES [ ] NO

Tech Lead
  [ ] Online in Slack
  [ ] Browser ready for testing: [ ] YES [ ] NO
  [ ] Database tools ready: [ ] YES [ ] NO
  [ ] Ready to create hotfixes: [ ] YES [ ] NO

Support Lead
  [ ] Online in Slack
  [ ] Customer communication drafted: [ ] YES [ ] NO
  [ ] Support team briefed: [ ] YES [ ] NO

Scribe (assigned to: ___________________)
  [ ] Online in Slack
  [ ] Google Doc created for logging: [ ] YES
  [ ] Access verified: [ ] YES
  [ ] Ready to record every action: [ ] YES

MATERIAL READINESS
═════════════════════════════════════════════

[ ] PRODUCTION_CUTOVER_PLAN.md printed
[ ] CUTOVER_DAY_QUICK_REFERENCE.md printed
[ ] This checklist printed
[ ] Monitoring dashboard links bookmarked
[ ] Sentry projects bookmarked
[ ] CloudWatch bookmarked
[ ] Vercel dashboard bookmarked

FINAL STANDBY (21:00 BRT)
═════════════════════════════════════════════

[ ] All team in #cutover-live by 21:00 BRT
[ ] Phone bridge open & tested
[ ] Monitoring dashboards live
[ ] Backup communication channel (Signal/WhatsApp) active
[ ] VPN/network stable for all team members
[ ] Battery + internet contingency plan ready
[ ] 1-hour rest period taken (power naps okay)

FINAL SIGN-OFF (22:00 BRT)
═════════════════════════════════════════════

CTO Final Sign-Off:
  Ready to proceed with cutover: [ ] YES [ ] NO
  Name: ____________________________
  Signature: ________________________
  Time: ____________________________

All checklist items completed: [ ] YES [ ] NO
Any blockers? [ ] NONE [ ] [describe]:
_____________________________________________

Proceed to CUTOVER EXECUTION: [ ] YES [ ] NO
```

---

## CUTOVER EXECUTION (2026-06-02 02:00-06:00 BRT / 04:00-08:00 UTC)

**Keep this section visible throughout cutover. Check off each milestone.**

```
═══════════════════════════════════════════════════════════════
   CUTOVER EXECUTION LOG — 2026-06-02
═══════════════════════════════════════════════════════════════

TIME ZONE REFERENCE:
  BRT (Brazil): Local time
  UTC: Universal time
  Cutover starts: 02:00 BRT / 04:00 UTC

Cutover Start Time (actual): ________ BRT / ________ UTC
```

### 04:00 UTC / 02:00 BRT — CUTOVER START

```
[ ] CTO posted "CUTOVER START" in #cutover-live
    Timestamp: ________
    
[ ] DevOps Lead confirmed all team online
    Team members present: ______________
    
[ ] Monitoring dashboards live
    [ ] Sentry: ✓
    [ ] CloudWatch: ✓
    [ ] Grafana: ✓ (if applicable)
    
[ ] Baseline metrics captured
    Sentry error count: ________
    Error rate: ________%
    Response time p95: ________ms
    
Decision: [ ] PROCEED to migration [ ] ABORT
```

### 04:01 UTC / 02:01 BRT — DATABASE MIGRATION

```
[ ] Migration command executed
    Command: pnpm --filter @imbobi/api prisma migrate deploy --prod
    Executed at: ________ UTC
    Status: [ ] STARTED [ ] IN PROGRESS [ ] COMPLETE [ ] FAILED
    
[ ] Migration completed
    Completion time: ________ UTC
    Duration: ________ seconds
    Exit code: ________
    
[ ] Seed data applied (if applicable)
    [ ] YES [ ] NO [ ] N/A
    
[ ] Health checks post-migration
    [ ] SELECT COUNT(*) FROM etapas: ________
    [ ] SELECT COUNT(*) FROM users: ________
    [ ] PostGIS validation: [ ] OK [ ] FAILED
    [ ] Table structure: [ ] OK [ ] ISSUE
    
[ ] Lock status
    Waiting locks: [ ] NONE [ ] [count]
    
[ ] Backup taken
    [ ] Database state backed up post-migration
    
Decision: [ ] PROCEED to deploy [ ] ROLLBACK migration
```

### 04:03 UTC / 02:03 BRT — CODE DEPLOYMENT

```
[ ] Latest commit verified
    Commit SHA: _______________________________
    Tag: ____________________________________
    Branch: _________________________________
    
[ ] Deploy initiated
    Method: [ ] Vercel auto [ ] Vercel CLI [ ] Dashboard click
    Initiated at: ________ UTC
    
[ ] Build started
    Build log accessible: [ ] YES [ ] NO
    
[ ] Build in progress — Monitoring
    [ ] 0-30 sec: Dependencies installed ✓
    [ ] 30-60 sec: TypeScript compiled ✓
    [ ] 60-90 sec: Optimization complete ✓
    Current build time: ________ seconds
    
[ ] Build completed
    Completion time: ________ UTC
    Status: [ ] SUCCESS [ ] FAILED
    Total duration: ________ seconds (must be < 90)
    
[ ] Build output
    Output size: _________ bytes
    Next.js optimization: ✓
    
Decision: [ ] PROCEED to smoke test [ ] ROLLBACK
```

### 04:05 UTC / 02:05 BRT — HEALTH CHECK

```
[ ] API Health Check
    curl https://api.imobi.com/api/v1/health
    Response code: ________
    Response: {"status":"________", "database":"________", "redis":"________"}
    Status: [ ] ✓ HEALTHY [ ] ✗ FAILED
    
[ ] Web App Check
    curl https://imobi.vercel.app/
    Response code: ________
    Contains HTML: [ ] YES [ ] NO
    Status: [ ] ✓ OK [ ] ✗ FAILED
    
[ ] Database health (post-deployment)
    Connections: ________
    Replication lag: ________ seconds
    Status: [ ] ✓ OK [ ] ✗ ISSUE
    
[ ] Sentry baseline
    Error count: ________ (record for comparison)
    
Decision: [ ] PROCEED to cache warming [ ] ROLLBACK
```

### 04:07 UTC / 02:07 BRT — CACHE WARMING

```
[ ] Warm cache script executed
    Command: scripts/warm-cache.sh
    Started at: ________ UTC
    Status: [ ] SUCCESS [ ] TIMEOUT [ ] SKIPPED
    Duration: ________ seconds
    
[ ] Redis connectivity verified
    PING: [ ] PONG [ ] FAILED
    DBSIZE: __________ keys
    
[ ] Queue system ready
    Queue status: [ ] EMPTY [ ] READY
    
Decision: [ ] PROCEED (cache warming optional, non-blocking)
```

### 04:09 UTC / 02:09 BRT — EDGE CACHE INVALIDATION

```
[ ] Vercel edge cache cleared
    Method: [ ] Dashboard [ ] CLI [ ] Auto
    Status: [ ] CLEARED [ ] N/A
    
[ ] Cloudflare cleared (if applicable)
    [ ] YES [ ] NO [ ] N/A
    
Decision: [ ] PROCEED to canary check
```

### 04:11 UTC / 02:11 BRT — CANARY HEALTH CHECK

```
[ ] Deep system health check
    [ ] API endpoints: ✓
    [ ] Database: ✓
    [ ] Redis: ✓
    [ ] Authentication: ✓
    [ ] Dashboard: ✓
    [ ] Engineer portal: ✓
    
[ ] Database replication
    Replication lag: ________ seconds (must be < 1s)
    
[ ] Memory & connections
    DB connections: ________ (must be < 25)
    Redis memory: ________ MB (must be < 500MB)
    API CPU: ________% (must be < 60%)
    
[ ] Sentry check
    New errors since baseline: [ ] NONE [ ] [count]
    
Decision: [ ] PROCEED to traffic [ ] STOP and investigate
```

### 04:13 UTC / 02:13 BRT — TRAFFIC ENABLED

```
[ ] Vercel deployment live
    Status: [ ] LIVE [ ] PENDING [ ] FAILED
    Traffic routed: [ ] 100% [ ] [%]
    
[ ] DNS verified
    nslookup imobi.com.br: ✓
    
[ ] First production request
    Response time: ________ ms
    HTTP code: ________
    Status: [ ] ✓ OK [ ] ✗ FAILED
    
[ ] Slack announcement posted
    Message: "🟢 PRODUCTION LIVE"
    Time posted: ________ UTC
    
Decision: [ ] PROCEED to validation [ ] ROLLBACK
```

### 04:15 UTC / 02:15 BRT — FIRST CRITICAL VALIDATION

```
[ ] Manager Login Flow
    [ ] Login successful
    [ ] Redirect to dashboard: [ ] YES [ ] NO
    [ ] Browser console: [ ] NO ERRORS [ ] [error count]
    Time to complete: ________ seconds
    
[ ] Manager Dashboard
    [ ] Etapas load: [ ] YES [ ] NO
    [ ] Data visible: [ ] YES [ ] NO
    [ ] No console errors: [ ] YES [ ] [errors]
    Load time: ________ seconds
    
[ ] Etapa Approval Flow
    [ ] Detail modal opens: [ ] YES [ ] NO
    [ ] Approve button clickable: [ ] YES [ ] NO
    [ ] No errors: [ ] YES [ ] [errors]
    
[ ] Engineer Portal
    [ ] Loads on mobile: [ ] YES [ ] NO
    [ ] GPS form works: [ ] YES [ ] NO
    [ ] No crashes: [ ] YES [ ] [crashes]
    
[ ] API Response Times
    Sample API call time: ________ ms
    
Status: [ ] ✓ ALL FLOWS PASS [ ] ✗ ISSUES FOUND
Issues (if any): _______________________________

Decision: [ ] CONTINUE to monitoring [ ] ESCALATE
```

### 04:20-07:55 UTC — CONTINUOUS MONITORING (Every 5 minutes)

**Create table below, fill one row every 5 minutes**

```
TIME   | ERROR% | p95ms | p99ms | DB-Conn | Redis-MB | Status | Notes
-------|--------|-------|-------|---------|----------|--------|--------
04:20  |  0.02  |  245  |  680  |   14    |   198    |   ✅   | GREEN
04:25  |        |       |       |         |          |        |
04:30  |        |       |       |         |          |        |
04:35  |        |       |       |         |          |        |
04:40  |        |       |       |         |          |        |
04:45  |        |       |       |         |          |        |
04:50  |        |       |       |         |          |        |
04:55  |        |       |       |         |          |        |
05:00  |        |       |       |         |          |        |
...    |        |       |       |         |          |        |
07:55  |        |       |       |         |          |        |

Legend: ✅ GREEN (all metrics OK) | ⚠️ YELLOW (1-2 metrics elevated) | 🔴 RED (critical)

Incidents during monitoring:
[Document any issues, escalations, hotfixes here]
_________________________________________________
_________________________________________________
```

### 04:30 UTC / 02:30 BRT — CHECKPOINT DECISION

```
[ ] All metrics GREEN: [ ] YES [ ] NO
[ ] No critical errors: [ ] YES [ ] NO
[ ] User flows valid: [ ] YES [ ] NO

Decision (check one):
[ ] ✅ CONTINUE — All metrics GREEN, proceed to next monitoring cycle
[ ] ⚠️  YELLOW FLAG — 1-2 metrics elevated, monitor closely (non-blocking)
[ ] 🔴 RED ALERT — Critical issue, escalate to CTO immediately

CTO Decision (if escalated):
[ ] Hotfix — Issue is fixable, start hotfix process
[ ] Rollback — Issue is critical, initiate rollback
[ ] Continue — Issue is minor, acceptable for now

Decision documented: [ ] YES
Time: ________ UTC
```

---

## POST-CUTOVER (08:00 UTC / 06:00 BRT onward)

```
═══════════════════════════════════════════════════════════════
   CUTOVER COMPLETE
═══════════════════════════════════════════════════════════════

[ ] Active monitoring ended
    End time: ________ UTC
    
[ ] Final metrics recorded
    Final error rate: ________%
    Final p95: ________ ms
    Final p99: ________ ms
    DB health: [ ] OK [ ] ISSUE
    
[ ] Success announcement posted
    Posted to #announcements at: ________ UTC
    Message: "✅ DEPLOYMENT COMPLETE"
    
[ ] CTO on-call status confirmed
    CTO: Will remain on-call for 48 hours ✓
    Contact info: ___________________________
    
[ ] Support team briefed on new features
    [ ] YES [ ] NO
    
[ ] Post-mortem scheduled
    Date/time: ________________________________
    
[ ] Incident report (if issues occurred)
    [ ] NO ISSUES
    [ ] Issues documented in: ________________

FINAL STATUS: 
  [ ] ✅ COMPLETE SUCCESS
  [ ] ⚠️  SUCCESS WITH MINOR ISSUES (document)
  [ ] ❌ ROLLBACK EXECUTED (schedule post-mortem)

Summary for leadership:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## SIGNATURE & SIGN-OFF

```
Scribe (person recording this log):
  Name: ____________________________
  Signature: ________________________
  Date: ____________________________

DevOps Lead (deployment execution):
  Name: ____________________________
  Signature: ________________________
  Date: ____________________________

CTO (final authority):
  Name: ____________________________
  Signature: ________________________
  Date: ____________________________

Post-cutover photos/evidence:
  [ ] Sentry dashboard screenshot: [file name]
  [ ] CloudWatch screenshot: [file name]
  [ ] Slack #cutover-live transcript: [file name]
  
Notes for post-mortem:
  What went well: _____________________
  What could improve: _________________
  Action items for next cutover: _______
```

---

**End of Execution Checklist**

**Store this completed checklist in secure location for post-mortem review.**
