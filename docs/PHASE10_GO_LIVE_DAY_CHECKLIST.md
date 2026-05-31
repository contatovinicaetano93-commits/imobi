# PHASE 10: GO-LIVE DAY CHECKLIST — One-Pager for Team

**Launch Date:** 2026-06-02  
**Launch Time:** 02:00-04:00 UTC  
**Print this. Tape to monitor. Check off items.**

---

## BEFORE LAUNCH (T-24h to T-0)

- [ ] **T-24h (June 1, 02:00 UTC):** Run all 17 smoke tests
  - Location: `services/api/tests/smoke-tests/`
  - Command: `npm run test:smoke:production`
  - Expected: 17/17 PASSED

- [ ] **T-24h:** Verify backup integrity
  - PostgreSQL: `aws s3 ls s3://imobi-backups/postgres/`
  - Redis: `redis-cli BGSAVE`
  - Expected: Recent backups present

- [ ] **T-24h:** Validate staging environment
  - URL: https://staging.imobi.app
  - Expected: All pages load, no 500 errors

- [ ] **T-24h:** Confirm on-call team availability
  - React with ✅ to Slack poll in #ops-critical
  - Team members: Tech Lead, DevOps Lead, QA Lead, CTO (standby)

- [ ] **T-12h (June 1, 14:00 UTC):** Halfway check-in
  - Post status: "All systems green" to #ops-critical
  - Confidence level: HIGH

- [ ] **T-2h (June 2, 00:00 UTC):** Code freeze activated
  - Verify: No new commits to main branch
  - Verify: No pending deployments in Vercel/Railway

- [ ] **T-30min (June 2, 01:30 UTC):** Final readiness briefing
  - Post briefing message to #ops-critical
  - Expected: Team confirms ready in chat

- [ ] **T-15min (June 2, 01:45 UTC):** War room opens
  - Zoom link active and all 5+ team members online
  - All screens sharing: CloudWatch, Sentry, Slack, GitHub

- [ ] **T-5min (June 2, 01:55 UTC):** Final production health checks
  - Database: `psql -U $PGUSER -h $PGHOST -d imbobi_prod -c "SELECT 1;"`
  - API: `curl https://api.imobi.app/health`
  - Redis: `redis-cli PING`
  - Expected: All return healthy responses

---

## LAUNCH WINDOW (T-0 to T+120)

### T+0 to T+2 (02:00-02:02 UTC): INITIATE

- [ ] **T+0:** Post "Cutover initiated" to #ops-critical
- [ ] **T+0:** War room is active, all team present
- [ ] **T+0:** All dashboards open and monitoring
- [ ] **T+2:** Execute DNS switch in Route 53
  - [ ] Update imobi.app A record: [STAGING_IP] → [PROD_IP]
  - [ ] Update api.imobi.app A record: [STAGING_API_IP] → [PROD_API_IP]
  - [ ] Verify: `dig imobi.app +short` (may show staging briefly, that's OK)
- [ ] **T+2:** Post "DNS switch executed" to #ops-critical

### T+3 to T+15 (02:03-02:15 UTC): MONITOR & TEST

- [ ] **T+5:** Check metrics every 1 minute
  - Error rate: < 1% ✅
  - Latency p95: < 500ms ✅
  - DB connections: < 50 ✅
  - Redis memory: < 60% ✅
- [ ] **T+5:** Post "Status update #1" to #ops-critical
- [ ] **T+10-15:** Run production smoke tests
  - Test 1: User Signup ................ [ ] PASS / [ ] FAIL
  - Test 2: User Login ................ [ ] PASS / [ ] FAIL
  - Test 3: Create Obra ............... [ ] PASS / [ ] FAIL
  - Test 4: Payment Processing ........ [ ] PASS / [ ] FAIL
  - Test 5: GPS Validation ............ [ ] PASS / [ ] FAIL
- [ ] **T+15:** Verify all 5 smoke tests PASSED
  - If any FAIL: Escalate to Tech Lead immediately
  - If all PASS: Continue to T+20

### T+20 to T+120 (02:20-04:00 UTC): MAINTAIN & MONITOR

- [ ] **T+20:** Post "Status update #2 - All green" to #ops-critical + #announcements
- [ ] **T+25-T+120:** Monitor every 5 minutes
  - [ ] Error rate still < 1% (check CloudWatch)
  - [ ] Latency stable < 300ms (check CloudWatch)
  - [ ] Database connections healthy < 50 (check CloudWatch)
  - [ ] Payment success > 99% (check custom metrics)
  - [ ] Evidence uploads success > 99% (check custom metrics)
  - [ ] No critical Sentry errors (check Sentry dashboard)
  - [ ] Active user count rising (check metrics)
- [ ] **T+30, T+60, T+90:** Post hourly status updates to #ops-critical
  - Include: Current error rate, latency, active users, success rate
- [ ] **T+120 (04:00 UTC):** Declare success or escalate
  - If all metrics GREEN: Post success declaration to #ops-critical + #announcements
  - If any RED/YELLOW not resolved: Escalate to rollback decision

---

## IF SOMETHING GOES WRONG

**Error rate spikes > 1%?**
- [ ] Check Sentry immediately: https://sentry.io/organizations/imobi/issues/
- [ ] Identify root cause (2-minute timeout)
- [ ] If fixable: Deploy hotfix
- [ ] If not fixable: Escalate to rollback discussion

**Payment processing breaks (> 50% failures)?**
- [ ] Check Stripe status: https://status.stripe.com/
- [ ] If Stripe is DOWN: Wait for Stripe recovery
- [ ] If Stripe is UP and ours is broken: Escalate to rollback

**Database won't connect?**
- [ ] Check connection pool: `psql ... SELECT sum(numbackends) ...`
- [ ] Try killing idle connections: `pg_terminate_backend(...)`
- [ ] If still broken: Escalate to rollback

**API won't start (health check failing)?**
- [ ] Check Railway deployment: https://railway.app
- [ ] ROLLBACK immediately (no investigation needed)

**Any rollback decision?**
- [ ] Post rollback message to #ops-critical immediately
- [ ] Call CTO/CEO (brief conversation)
- [ ] Execute rollback procedure (DNS → Railway → Vercel)
- [ ] Post rollback confirmation when stable
- [ ] Plan root cause analysis and retry

---

## CRITICAL NUMBERS

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Error Rate | < 0.5% | 1% | > 5% |
| Latency p95 | < 300ms | 500ms | > 1s |
| Payment Success | > 99.8% | < 99% | < 95% |
| DB Connections | < 30 | 50 | 80 |
| Redis Memory | < 40% | 60% | 80% |
| Auth Failures | 0-1/min | 5/min | 10/min |

---

## QUICK REFERENCE LINKS

**During launch, keep these tabs open:**

1. CloudWatch Dashboard: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=imobi-production-launch
2. Sentry: https://sentry.io/organizations/imobi/issues/?query=release%3Av2.0.0
3. Railway: https://railway.app/project/[PROJECT_ID]/services
4. Vercel: https://vercel.com/dashboard/imobi
5. Slack #ops-critical: https://imobi.slack.com/channels/ops-critical

---

## TEAM ROLES DURING LAUNCH

**Tech Lead (Decision Maker)**
- [ ] Monitoring metrics
- [ ] Making escalation decisions
- [ ] Calling rollback if needed
- [ ] Communicating status to executives

**DevOps Lead (Executor)**
- [ ] Executing DNS switch
- [ ] Monitoring infrastructure
- [ ] Managing deployments
- [ ] Executing rollback if called

**QA Lead (Tester)**
- [ ] Running smoke tests at T+15
- [ ] Verifying test results
- [ ] Reporting status to team

**Senior Devs (Support)**
- [ ] On standby for emergency fixes
- [ ] Monitoring code/system health
- [ ] Ready to debug if needed

**CTO (Executive Standby)**
- [ ] On standby (offline until needed)
- [ ] Available for escalation calls
- [ ] Final authority if critical decisions needed

---

## SUCCESS DECLARATION CRITERIA

All of these must be GREEN at T+120 to declare victory:

- [ ] Error rate < 0.5% (2-hour average)
- [ ] API latency p95 < 500ms (2-hour average)
- [ ] Payment success > 99.8%
- [ ] Evidence upload success > 99%
- [ ] Database health excellent (< 30 connections, 0 slow queries)
- [ ] All 5 smoke tests PASSED
- [ ] Real users arriving (> 100 signups)
- [ ] No rollback triggered
- [ ] Team confidence: HIGH

**If all are GREEN:** Post success declaration, celebrate! 🎉

---

## POST-LAUNCH (After Success Declared)

- [ ] Continue monitoring for 24 hours (hourly checks minimum)
- [ ] No code deployments until 24h has passed
- [ ] Slack channel stays active for any issues
- [ ] Post-mortem meeting scheduled for next day
- [ ] On-call team transitions to normal rotation

---

## EMERGENCY CONTACTS (Call if critical issue)

- **Tech Lead:** [PHONE]
- **DevOps Lead:** [PHONE]
- **CTO:** [PHONE]
- **CEO:** [PHONE] (only if extremely critical)

---

## PRINT THIS PAGE & POST TO MONITOR

This is your launch day bible. Check items off. Follow the sequence. Trust the process. 

**Estimated Launch Success:** 95%+  
**Confidence Level:** HIGH  
**Status:** READY FOR LAUNCH 🚀

---

**Launch Date:** 2026-06-02, 02:00 UTC  
**Time until launch:** Check countdown clock at https://www.timeanddate.com/countdown/launch?iso=20260602T02&p0=1440

Good luck, team. We've got this. 🚀
