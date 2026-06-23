# PHASE 10: Rollback Procedures — Emergency Recovery Protocol

**Document Version:** 1.0  
**Created:** 2026-05-31  
**Launch Window:** 2026-06-02, 02:00-04:00 UTC  
**Owner:** DevOps Lead + Tech Lead  
**Status:** Emergency procedure ready (pray we don't use it)

---

## CRITICAL: This is your "eject button"

If production is burning, use this. Total rollback time: < 5 minutes. Decision tree below tells you WHEN to rollback.

---

## SECTION 1: ROLLBACK DECISION TREE

### When Do We Rollback?

```
CRITICAL DECISION TREE — Follow exactly
═══════════════════════════════════════════════════════════════════

Start: Error detected during/after DNS switch

├─ API won't start (500 errors, health check failing)
│  └─ → ROLLBACK IMMEDIATELY (no investigation)
│     Reason: Can't fix running code
│     Time limit: Within 1 minute of detection

├─ Database migration failed
│  └─ → ROLLBACK IMMEDIATELY (no investigation)
│     Reason: Data integrity at risk
│     Time limit: Within 1 minute of detection

├─ Payment processing broken (> 50% failures for > 1 min)
│  └─ → Investigate for 2 minutes
│     If Stripe status page shows UP → ROLLBACK
│     If Stripe status page shows DOWN → WAIT (not our issue)
│     Time limit: 3 minutes total before decision

├─ High error rate (> 1% for > 2 min)
│  ├─ Error rate drops back < 0.5%?
│  │  └─ → NO ROLLBACK (continue monitoring)
│  └─ Error rate stays > 1% for > 5 min?
│     └─ → INVESTIGATE (2-min timeout)
│        If fixable in < 2 min → Deploy hotfix
│        If not fixable → ROLLBACK

├─ Database connectivity lost
│  ├─ → Check connection pool
│  ├─ Is it exhausted?
│  │  ├─ YES → Kill idle connections (1-min attempt)
│  │  │        Still failing? → ROLLBACK
│  │  └─ NO → Check DB logs (2-min investigation)
│  │           Found issue? Fix or ROLLBACK
│  └─ Total time: < 3 minutes before ROLLBACK

├─ Latency spike > 1s (p95)
│  ├─ Is database responding?
│  │  ├─ NO → Investigate DB (2-min timeout) → ROLLBACK if unresolved
│  │  └─ YES → Check Redis (2-min investigation)
│  └─ Latency stays > 1s for > 5 min? → ROLLBACK

├─ Redis down
│  ├─ → Try restart (1 minute)
│  └─ Still down? → ROLLBACK (can't cache without Redis)

└─ All metrics GREEN → Continue to success declaration (T+120)

═══════════════════════════════════════════════════════════════════

ROLLBACK TRIGGERS SUMMARY:
✓ P1 = Immediate rollback (no wait):
   • API won't start
   • Database migration failed
   • Payment system completely broken
   
✓ P2 = Investigate then rollback (< 5 min decision):
   • Error rate > 1% persistent
   • Database connectivity lost
   • Latency > 1s persistent
   
✓ P3 = Monitor and alert (no rollback unless P1/P2):
   • Single failed request
   • Brief latency spike
   • Non-critical service errors
```

---

## SECTION 2: PRE-ROLLBACK VALIDATION

**Before executing rollback, answer these 3 questions:**

1. **Is the problem isolated to new code/config?**
   - YES → Rollback (quick fix)
   - NO → Investigate further (may not be launch issue)

2. **Will rollback actually fix the problem?**
   - YES → Rollback (confidence high)
   - NO → Contact Stripe/AWS support (external issue)

3. **Can we rollback without data loss?**
   - YES → Proceed with rollback
   - NO → Escalate to CEO (data integrity issue, may need manual recovery)

---

## SECTION 3: ROLLBACK COMMUNICATION

**Immediately upon deciding to rollback (BEFORE executing):**

### Step 1: Announce in #ops-critical (30 seconds)

```
🔴 ROLLBACK INITIATED

Issue: [Brief description]
Severity: P1 / P2 / P3
Error Rate: [X]%
Affected Users: [Estimate]

Action: Rolling back to staging environment
ETA to stable: 3-5 minutes
War room: Zoom stays open, continue monitoring

Next update: 3 minutes from now
```

**Copy-paste above, fill in brackets, post immediately.**

### Step 2: Notify Executive (if P1 severity)

**Phone call to CTO/CEO:**
```
"We're rolling back the launch due to [brief issue].
All systems returning to staging environment.
We'll investigate and retry in [X hours].
No data loss. No customers affected beyond outage notification."
```

**Keep call < 1 minute. Let DevOps execute while you talk.**

### Step 3: Continue communication every 1 minute

During rollback execution:
```
🔄 Rollback in progress...

DNS: Reverted ✅ (T+1 min)
API: Rolling back via Railway (T+1-3 min)
Web: Rolling back via Vercel (T+1-2 min)

Standing by for health check...
```

---

## SECTION 4: STEP-BY-STEP ROLLBACK EXECUTION

### PHASE A: DNS Rollback (< 1 minute)

**Executor:** DevOps Lead  
**Decision maker:** Tech Lead (verbal confirmation required)

**Step 1: Confirm decision with Tech Lead (30 seconds)**

```
Tech Lead: "Confirm rollback decision"
DevOps Lead: "Confirmed, initiating DNS rollback now"
```

**Step 2: Log into AWS Route 53 (15 seconds)**

```
URL: https://console.aws.amazon.com/route53/home
Region: us-east-1
Hosted Zone: imobi.app
```

**Step 3: Revert primary domain (20 seconds)**

```
Navigate to A record for: imobi.app

Current state:
  Name: imobi.app
  Type: A
  Value: [PROD_IP] ← This is what we switch

Change to:
  Name: imobi.app
  Type: A
  Value: [STAGING_IP] ← Back to staging

TTL: Keep at 60 seconds

Click: "Save changes"
Wait: 5 seconds for AWS to confirm
```

**Step 4: Revert API domain (20 seconds)**

```
Navigate to A record for: api.imobi.app

Current state:
  Name: api.imobi.app
  Type: A
  Value: [PROD_API_IP] ← This is what we switch

Change to:
  Name: api.imobi.app
  Type: A
  Value: [STAGING_API_IP] ← Back to staging

TTL: Keep at 60 seconds

Click: "Save changes"
Wait: 5 seconds for AWS to confirm
```

**Step 5: Verify DNS reverted (20 seconds)**

```bash
# Run immediately after DNS save
sleep 5
dig imobi.app +short
# Expected: [STAGING_IP] (usually within 10 seconds)

dig api.imobi.app +short
# Expected: [STAGING_API_IP]

# If still showing PROD IP:
# → Wait 10 more seconds and try again
# → DNS propagation takes time (up to 60s with TTL=60)
```

**Status:** DNS Rollback COMPLETE ✅

---

### PHASE B: API Rollback (Railway) — 2-3 minutes

**Executor:** DevOps Lead  
**Monitoring:** Tech Lead watches CloudWatch/Sentry

**Step 1: Log into Railway.app (30 seconds)**

```
URL: https://railway.app
Sign in with: [CONFIGURED ACCOUNT]
Navigate to: Projects → imobi
Click on: Services → api
```

**Step 2: Access deployment rollback (1 minute)**

```
Current state:
┌─────────────────────────────────────────┐
│ Service: api                            │
│ Status: Running (but unhealthy)         │
│ Current Version: v2.0.0 (problematic)   │
│ Previous Version: v1.9.5 (known good)   │
└─────────────────────────────────────────┘

Look for "Rollback" button or "Previous Deployments" section
```

**Step 3: OPTION A - Click Rollback Button (Recommended)**

```
1. Click "Rollback" (or similar button in Railway UI)
2. Select "Previous stable deployment"
3. Confirm rollback (may ask for confirmation)
4. Wait for deployment to start (1-2 minutes)

Status messages will appear:
  "Redeploying previous version..."
  "Building..."
  "Deploying..."
  "✅ Deployment successful"
```

**Step 4: OPTION B - Manual redeploy (If rollback button missing)**

```bash
# Have these credentials ready:
RAILWAY_API_TOKEN=xxx
RAILWAY_PROJECT_ID=xxx
SERVICE_NAME=api

# Get previous version tag
git tag | grep "v2.0.0-rc" | tail -1
# Example output: v2.0.0-rc.1

# Redeploy previous version
railway deploy --service $SERVICE_NAME --version v1.9.5

# Monitor deployment
railway logs --service $SERVICE_NAME --follow

# Expected: Service starts, no errors
```

**Step 5: Verify API health (1 minute)**

```bash
# Poll API health every 10 seconds
for i in {1..15}; do
  curl -s https://api.imobi.app/health | jq '.status'
  sleep 10
done

# Expected: "ok" (appears within 30-60 seconds)
# If still failing after 60 seconds: escalate to CTO
```

**Status:** API Rollback COMPLETE ✅

---

### PHASE C: Web Rollback (Vercel) — 1-2 minutes

**Executor:** DevOps Lead  
**Monitoring:** Tech Lead watches CloudWatch/browser

**Step 1: Log into Vercel.com (20 seconds)**

```
URL: https://vercel.com/dashboard
Sign in with: [CONFIGURED ACCOUNT]
Navigate to: imobi project
Click on: Deployments tab
```

**Step 2: Find previous successful deployment (30 seconds)**

```
Current state shows:
┌──────────────────────────────────────────┐
│ Latest Deployment (CURRENT - PROBLEMATIC)│
│ Status: Ready / Building / Failed         │
│ Version: v2.0.0                          │
│ Commit: abc123def...                     │
│ Created: 2 minutes ago                   │
├──────────────────────────────────────────┤
│ Previous Deployment (GOOD)                │
│ Status: Ready ✅                          │
│ Version: v1.9.5                          │
│ Commit: xyz789abc...                     │
│ Created: 1 hour ago                      │
└──────────────────────────────────────────┘

Click on the PREVIOUS (good) deployment
```

**Step 3: Redeploy previous version (1-2 minutes)**

```
After clicking previous deployment, look for:
  "Redeploy" button or "Actions" menu → "Redeploy"

Click "Redeploy"
Confirm the redeployment (if prompted)

Status:
  "Redeploying..."
  "Building..."
  "Promoting to Production..."
  "✅ Successfully promoted"

Wait for status to show "Ready"
```

**Step 4: Verify web health (1 minute)**

```bash
# Test website endpoint
for i in {1..10}; do
  curl -s https://imobi.app/api/health | jq '.status'
  curl -s https://imobi.app/ --head | grep "200\|301\|302"
  sleep 10
done

# Expected: 200 OK, no errors
# Open in browser to verify visually

# Check Sentry to confirm no new errors
# Expected: Error rate drops to 0
```

**Status:** Web Rollback COMPLETE ✅

---

### PHASE D: Database Verification (No action needed usually)

**Note:** Database typically doesn't need rollback since we don't run migrations during launch.

**If database MUST be rolled back:**

```bash
# This is a MAJOR operation. Requires DBA approval.

# Only if: Data corruption detected, migrations failed

# Step 1: Contact database admin (non-negotiable)
# "We need to restore database from pre-launch backup"

# Step 2: Verify backup exists
aws s3 ls s3://imobi-backups/postgres/pre-launch-2026-06-02.sql.gz

# Step 3: Restore to staging first (test)
gunzip /tmp/pre-launch.sql.gz
psql -U $PGUSER -h $PGREPLICA_HOST -d imbobi_staging < /tmp/pre-launch.sql

# Step 4: Only if staging restore succeeds, restore production
# (This is a high-risk operation, requires exec sign-off)

psql -U $PGUSER -h $PGHOST -d imbobi_prod < /tmp/pre-launch.sql

# Step 5: Verify production data is correct
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT COUNT(*) FROM usuarios; SELECT COUNT(*) FROM obras;"
```

**Database rollback:** Usually NOT needed (only in extreme cases)

---

## SECTION 5: POST-ROLLBACK HEALTH CHECK

**After all 3 phases complete (DNS + API + Web), run this:**

```bash
# 1. Verify staging environment is responding
curl -s https://imobi.app/api/health | jq .
curl -s https://api.imobi.app/health | jq .

# Expected: Both return 200 OK with "status": "ok"

# 2. Check error rate is back to 0
curl -s https://api.imobi.app/metrics | jq '.error_rate'
# Expected: 0%

# 3. Verify database is responsive
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c "SELECT 1;" -q
# Expected: Output "1"

# 4. Check Redis is responding
redis-cli -h $REDIS_HOST -p 6379 PING
# Expected: PONG

# 5. Verify traffic is routing to staging
dig imobi.app +short
# Expected: [STAGING_IP]
```

**All checks passed?** → Proceed to Post-Rollback Communication

---

## SECTION 6: POST-ROLLBACK COMMUNICATION

**Execute in this order (total time: 5 minutes after rollback initiation):**

### Message #1: Rollback Confirmation (T+1)

**Post to #ops-critical:**

```
🔄 ROLLBACK COMPLETE — Systems Stable

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We have successfully rolled back to staging environment.

Rollback Timeline:
├─ DNS: Reverted ✅
├─ API: Redeployed v1.9.5 ✅
├─ Web: Redeployed v1.9.5 ✅
└─ Services: Healthy ✅

Error Rate: 0% (all systems nominal)
Status: STAGING LIVE
```

**Post in #announcements:**

```
⚠️ Launch Status Update

We initiated a rollback of today's launch due to [brief reason].
Systems have been restored to our previous stable version.

All services are working normally.
No data loss occurred.

We will investigate the issue and retry the launch later.
More details will be shared within 1 hour.
```

---

### Message #2: Root Cause Summary (T+15)

**After investigation (sample):**

```
🔍 ROLLBACK ROOT CAUSE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What Happened:
• Database migration took longer than expected
• Connection pool was exhausted
• New code couldn't acquire database connections

Root Cause:
• Migration script had index creation without CONCURRENTLY flag
• This blocked all connections for 3+ minutes

Lesson Learned:
• All migrations MUST use CONCURRENTLY for indexes
• Must test migrations under production-like load

Fix Status:
• Fix applied: Rewrite migration with CONCURRENTLY
• Testing in staging: Complete ✅
• Ready for retry: 2026-06-03, 02:00 UTC

Next Launch:
• Same window, next day
• All systems validated
• Team notified and ready
```

---

### Message #3: Team Debrief Scheduled (T+30)

```
📅 DEBRIEF SCHEDULED

Team, thank you for the quick response.

Post-Mortem Meeting:
  Time: 2026-06-02 06:00 UTC (2 hours from now)
  Location: [Zoom link]
  Duration: 45 minutes

Agenda:
1. Timeline review
2. Root cause deep dive
3. Lessons learned
4. Fixes implemented
5. Confidence for retry

No blame. Focus on system improvements.
Attendance: All on-call members + tech leads
```

---

## SECTION 7: RECOVERY & RETRY PLANNING

**After rollback, the team MUST:**

1. **Within 1 hour:**
   - [ ] Root cause identified and documented
   - [ ] Fix implemented and tested in staging
   - [ ] All smoke tests passing in staging
   - [ ] Tech Lead approves fix

2. **Within 4 hours:**
   - [ ] New launch window proposed (next day, same time)
   - [ ] Stakeholders notified of new timeline
   - [ ] On-call team confirms availability
   - [ ] All Phase 10 validation re-done

3. **Next launch:**
   - [ ] Use UPDATED PHASE10_FINAL_VALIDATION_CHECKLIST
   - [ ] Focus testing on specific area that failed
   - [ ] Extra confidence in fix before green-lighting
   - [ ] Tighter monitoring during launch

---

## SECTION 8: ROLLBACK READINESS CHECKLIST

**Before launch, verify all rollback readiness items:**

```
[ ] DNS rollback procedure tested (in staging)
[ ] Railway rollback button accessible
[ ] Vercel previous deployment visible
[ ] Database backup accessible and tested
[ ] Slack webhook configured for rollback alerts
[ ] Team knows to escalate quickly (no "wait and see")
[ ] CTO/CEO phone numbers readily available
[ ] "Eject button" is understood and accepted

Rollback Response Time Target: < 5 minutes to stable
Confidence Level: HIGH (procedure is simple and well-tested)
```

---

## CRITICAL REMINDERS

**DO rollback if:**
- Error rate > 5% persistent (not transient)
- Payment system completely broken
- Database won't accept connections
- API won't start
- Data corruption detected

**DON'T rollback if:**
- Single failed request (blip)
- Brief latency spike (< 30 seconds)
- Stripe has an outage (wait for Stripe recovery)
- One slow query (investigate, don't panic)

**Remember:**
- Rollback is FASTER than debugging
- < 5 minutes to stable is acceptable
- False alarm rollback is better than burning production
- Post-mortem is where we learn, not during launch

---

**Document Status:** 🟢 READY (hope we don't need it)  
**Last Updated:** 2026-05-31  
**Next Document:** PHASE10_SUCCESS_CRITERIA.md
