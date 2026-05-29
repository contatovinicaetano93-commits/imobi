# CUTOVER DAY QUICK REFERENCE
**2026-06-02 | 04:00 UTC / 02:00 BRT**

Print this page + keep visible during entire cutover window (04:00-08:00 UTC)

---

## CRITICAL CONTACTS (Save these numbers in your phone)

| Role | Phone | Slack |
|------|-------|-------|
| CTO | +55 _______ | @cto |
| DevOps Lead | +55 _______ | @devops |
| Tech Lead | +55 _______ | @tech-lead |

**If uncertain about ANY decision → Call CTO immediately**

---

## CUTOVER TIMELINE (All times UTC, subtract 2 hours for BRT)

```
04:00  START → Database migration
04:03  Deploy to production
04:05  Build verification
04:07  Cache warming
04:09  Edge cache clear
04:11  Canary health check
04:13  TRAFFIC ENABLED ← Production live!
04:15  First validation (critical flows)
04:20  Performance check
04:25  Database validation
04:30  CHECKPOINT DECISION
04:35-08:00  Continuous monitoring (every 5 min)
08:00  END OF ACTIVE WINDOW
```

---

## IMMEDIATE ACTIONS (04:00 UTC)

### DevOps Lead:
1. `git log --oneline -3` → Verify v2.0.0 tag visible
2. `pnpm --filter @imbobi/api prisma migrate deploy --prod` → Run migration
3. Open Vercel dashboard → Click "Deploy" (if manual)
4. Watch build logs for "Ready" status
5. Post in #cutover-live: "BUILD STARTED"

### Tech Lead:
1. Open Sentry dashboard → Note baseline errors
2. Open CloudWatch metrics → Record current values
3. Prepare browser for login test
4. Keep Slack #cutover-live visible

### Scribe:
1. Create Google Doc: "Cutover Log 2026-06-02"
2. Record timestamp of every action
3. Note any errors or warnings
4. Post summary every 15 minutes

---

## SMOKE TESTS (04:05 UTC)

Run in this order. MUST all return 200.

```bash
# Test 1: API Health
curl -s https://api.imobi.com/api/v1/health | jq .
# Expected: status: "healthy", database: "connected", redis: "connected"

# Test 2: Web App
curl -s -w "\nHTTP %{http_code}\n" https://imobi.vercel.app/ | head -5
# Expected: HTTP 200

# Test 3: Sentry Baseline
# Visit: https://sentry.io/dashboard
# Record: Error count at T+5 min
```

**If ANY fails**: Stop and escalate to CTO immediately. Do not proceed.

---

## CRITICAL USER FLOW TEST (04:15 UTC)

**Tester**: Open browser to https://imobi.vercel.app/login

### Manager Flow:
```
1. Login: manager.test@imobi.com / password
2. Verify: Dashboard loads in < 2 seconds
3. Click: One etapa row
4. Check: Browser console (Ctrl+Shift+J) → Should be NO red errors
5. Click: "Approve" button → Should enable (not grayed out)
```

**If ANY step fails**: Document issue + escalate to Tech Lead

### Engineer Flow (mobile or responsive):
```
1. Login: engineer.test@imobi.com / password
2. Verify: GPS form loads
3. Check: Geolocation permission prompt appears
4. Submit: Test location (even invalid, just test form)
5. Verify: No JavaScript errors in console
```

---

## PERFORMANCE CHECKPOINTS (Check every 5 minutes)

### Metrics to monitor:
| Metric | Green | Yellow | Red | Your Value |
|--------|-------|--------|-----|-----------|
| Error Rate | < 0.1% | 0.1-1% | > 1% | _____% |
| Response p95 | < 300ms | 300-700ms | > 700ms | _____ms |
| Response p99 | < 800ms | 800-1500ms | > 1500ms | _____ms |
| DB Connections | < 15 | 15-25 | > 25 | _____ |
| Redis Memory | < 300MB | 300-500MB | > 500MB | _____MB |

### Where to find these:
- **Sentry**: https://sentry.io/dashboard
- **CloudWatch**: https://console.aws.amazon.com/cloudwatch
- **Database**: `SELECT count(*) FROM pg_stat_activity;`

### Decision Rule:
```
All GREEN → Continue
1-2 YELLOW → Investigate (non-blocking)
ANY RED → Escalate to CTO immediately
```

---

## HOTFIX QUICK COMMAND (If minor bug found)

```bash
# 1. Create branch
git checkout -b hotfix/cutover-$(date +%s)

# 2. Make fix (< 10 lines)
vim apps/web/src/components/...

# 3. Test build
pnpm build  # Must complete < 30 seconds

# 4. Commit
git commit -m "hotfix: [brief description]"

# 5. PR for CTO review (2 min)
# 6. Merge after approval
git checkout main && git merge hotfix/... --ff && git push

# 7. Vercel auto-deploys (3-4 min)
# 8. Test fix works
```

**Total time**: 15 minutes max  
**Limit**: 2 hotfixes only during cutover window

---

## EMERGENCY ROLLBACK (Do not use without CTO approval)

```bash
# Option 1: Via Git (Recommended)
git revert HEAD --no-edit
git push origin main
# Vercel auto-redeploys in ~30 seconds

# Option 2: Via Vercel Dashboard
# Deployments → Click previous version → "Promote"

# Then verify:
curl https://api.imobi.com/api/v1/health
```

**Expected time**: < 5 minutes to previous working state

---

## WHEN TO ROLLBACK (Triggers)

✋ **STOP AND ROLLBACK if ANY of these occur**:

- [ ] Build fails (> 90 seconds)
- [ ] API health check returns non-200
- [ ] Login completely broken
- [ ] Dashboard won't load
- [ ] Error rate > 1% for 2 minutes straight
- [ ] Database locked or unreachable
- [ ] CTO says "rollback"

**Action**: Call CTO, execute rollback, document issue

---

## SLACK MESSAGES TO POST

### Start (04:00 UTC):
```
🔴 CUTOVER START | Phase 4 Production Deployment
   → Database migration in progress
   → Expected duration: 2 hours
   → Next update: 04:05 UTC
```

### Build Complete (04:05 UTC):
```
✅ BUILD COMPLETE
   ✓ API health: 200 OK
   ✓ Web app: 200 OK
   → Traffic enabled at 04:13 UTC
```

### Traffic Live (04:13 UTC):
```
🟢 PRODUCTION LIVE
   ✓ Traffic enabled
   ✓ Error rate: 0.02%
   ✓ Response time: 245ms
   → Monitoring active, updates every 5 min
```

### Every 5 minutes:
```
📊 04:20 | Error: 0.1% | P95: 267ms | DB: 12 conn | Status: ✅ GREEN
```

### Success (08:00 UTC):
```
✅ CUTOVER COMPLETE SUCCESS
   ✓ All metrics GREEN
   ✓ Zero critical errors
   ✓ Phase 4 features LIVE
   
CTO on-call 48 hours. Normal ops resume.
```

---

## DATABASE COMMANDS (If needed)

```bash
# Check connection count
psql -h $DB_HOST -U $DB_USER -d imobi_prod -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check recent approvals
psql -h $DB_HOST -U $DB_USER -d imobi_prod -c \
  "SELECT COUNT(*) FROM etapas WHERE status='APROVADA' 
   AND updated_at > NOW() - INTERVAL '10 minutes';"

# Check for locks
psql -h $DB_HOST -U $DB_USER -d imobi_prod -c \
  "SELECT * FROM pg_locks WHERE NOT granted;"

# Replication lag (if replica)
psql -h $DB_HOST -U $DB_USER -d imobi_prod -c \
  "SELECT EXTRACT(EPOCH FROM (NOW() - 
   pg_last_xact_replay_timestamp())) AS replication_lag_seconds;"
```

---

## REDIS COMMANDS (If needed)

```bash
# Test connection
redis-cli -h $REDIS_HOST -p 6379 PING
# Expected: PONG

# Check memory usage
redis-cli -h $REDIS_HOST -p 6379 INFO memory | grep used_memory_human

# Check queue status
redis-cli -h $REDIS_HOST -p 6379 DBSIZE

# Clear cache (emergency only)
redis-cli -h $REDIS_HOST -p 6379 FLUSHALL
```

---

## VERCEL COMMANDS

```bash
# Check deployment status
vercel ls --prod

# View build logs
vercel logs --prod

# Promote previous deployment
vercel promote [deployment-url]

# Deploy manually
vercel --prod
```

---

## BROWSER CONSOLE CHECKLIST

When testing user flows, check browser console (F12 or Ctrl+Shift+J):

```
Expected: 
  ✅ No RED error messages
  ✅ No infinite loops of XHR errors
  ✅ Warnings OK (yellow is fine)

If you see:
  ❌ Red errors → Screenshot + escalate
  ❌ Network errors (failed XHR) → Check API health
  ❌ CORS errors → Check CORS_ORIGIN env var
```

---

## INCIDENT REPORT FORMAT (If issue occurs)

Fill this out immediately:

```
TIME: [HH:MM UTC]
ISSUE: [brief description]
SEVERITY: [ ] Critical [ ] Major [ ] Minor
AFFECTED: [# users or %]
ROOT CAUSE: [if known]
ACTION TAKEN: [what did you do]
RESOLUTION: [hotfix or rollback]
TIME TO RESOLVE: [X minutes]
```

---

## CHECKLIST: Ready for Cutover?

**Print this, check off during prep:**

- [ ] All team online in #cutover-live
- [ ] Monitoring dashboards open (Sentry, CloudWatch)
- [ ] Phone bridge tested + working
- [ ] Database backup verified (size > 50MB)
- [ ] Redis snapshot verified (exists in S3)
- [ ] Vercel preview URL tested manually
- [ ] Rollback procedure reviewed
- [ ] CTO confirmed ready
- [ ] Scribe assigned + ready
- [ ] This reference card printed

---

## POST-CUTOVER (After 08:00 UTC)

### Immediate (within 5 min):
- [ ] Post success message in #announcements
- [ ] Thank the team
- [ ] CTO confirms on-call status (48 hours)

### Within 1 hour:
- [ ] If issues occurred → Schedule post-mortem
- [ ] Document lessons learned
- [ ] Update runbooks

### Within 24 hours:
- [ ] Full post-mortem with team
- [ ] Action items assigned
- [ ] PR for fixes merged

---

## EMERGENCY CONTACTS

```
CTO: [Phone] [Email]
   Primary decision maker
   Available 24/7 during cutover

DevOps: [Phone] [Email]
   Infrastructure execution
   Backup: CTO if unreachable

Tech Lead: [Phone] [Email]
   Hotfix authority
   Backup: CTO if unreachable

Support: [Phone] [Email]
   Customer communication
   Incident updates
```

---

## MENTAL CHECKLIST (Before you start)

- [ ] Rested? (If tired, speak up — safety first)
- [ ] Hydrated? (Get water, keep nearby)
- [ ] Bathroom? (Use before 04:00 UTC)
- [ ] Phone charged? (100% battery)
- [ ] Internet stable? (Check Speedtest before)
- [ ] Comfortable? (Good chair, room temperature)
- [ ] Focused? (Close Slack except #cutover-live)
- [ ] Calm? (Remember: rollback always available if needed)

**You got this. 2 hours. Execute the plan. Ask CTO if uncertain.**

---

**Print → Keep visible → Follow exactly → Success**
