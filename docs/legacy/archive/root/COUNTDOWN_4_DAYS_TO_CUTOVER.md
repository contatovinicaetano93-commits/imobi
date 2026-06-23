# COUNTDOWN: 4 Days to Production Launch
**2026-05-29 → 2026-06-02 | imobi MVP Phase 4**

---

## TODAY: Thursday 2026-05-29 (4 days before)

### Morning (before 12:00 UTC)
- [ ] All team members review CUTOVER_README.md (roles: 45 min - 3 hours each)
- [ ] CTO reviews PRODUCTION_CUTOVER_PLAN.md (full document, ~2 hours)
- [ ] DevOps reviews MONITORING_DASHBOARD_SETUP.md (full document)
- [ ] Distribute all documents to team Slack with reading timeline

### Afternoon (12:00-18:00 UTC)
- [ ] Engineering: Complete final code review on main branch
- [ ] DevOps: Test current production infrastructure
  - [ ] Database connection working? `psql -h $DB_HOST ...`
  - [ ] Redis accessible? `redis-cli PING`
  - [ ] Vercel deployment working?
  - [ ] Sentry capturing errors?
- [ ] Product: Finalize communication templates in CUTOVER_STAKEHOLDER_COMMS.md

### Evening (18:00+ UTC)
- [ ] Soft freeze: No new feature code to main (hotfixes only, with CTO approval)
- [ ] Team members rest - get 8+ hours sleep before Friday

---

## TOMORROW: Friday 2026-05-30 (3 days before)

### Morning (08:00-12:00 UTC)
- [ ] Engineering lead: Create test account credentials for smoke tests
  - `manager.test@imobi.com` / `[password]`
  - `engineer.test@imobi.com` / `[password]`
- [ ] DevOps: Test database backup procedure
  - Run full backup to S3
  - Verify backup size > 50MB
  - Test restore in staging
  - Document time taken
- [ ] DevOps: Test Redis snapshot export
  - Verify RDB file exists in S3
  - Test restore on dev Redis

### Afternoon (12:00-18:00 UTC)
- [ ] QA: Run SIMPLIFIED_TEST_CHECKLIST.md on staging environment
  - Manager login flow
  - Engineer GPS submission
  - Approval workflow
  - Payment pipeline
  - Document all results (PASS/FAIL)
- [ ] Tech Lead: Verify health check endpoints
  - `curl https://api.imobi.com/api/v1/health`
  - `curl https://imobi.vercel.app/health`
  - Expect HTTP 200, all systems operational
- [ ] Product: Prepare customer support talking points

### Late Afternoon (18:00-20:00 UTC)
- [ ] Security: Run final security audit
  - `npm audit` on all packages (expect 0 vulnerabilities)
  - Check CORS configuration
  - Verify JWT settings (15-min expiry)
- [ ] Team sync: 30-min standup, confirm all tasks done, answer questions

---

## SATURDAY: 2026-05-31 (2 days before)

### Morning (08:00-12:00 UTC)
- [ ] Engineering: Code freeze begins (no new features, only hotfixes)
  - [ ] Create release tag: `release/phase4-2026-06-02`
  - [ ] Verify all tests pass: `pnpm type-check && pnpm build && pnpm test`
  - [ ] Build time recorded (expect < 90 seconds)
- [ ] DevOps: Create CloudWatch dashboard (MONITORING_DASHBOARD_SETUP.md)
  - [ ] Add RDS metrics (CPU, connections, memory)
  - [ ] Add ElastiCache metrics (memory, evictions, hit ratio)
  - [ ] Add application logs
  - [ ] Set auto-refresh to 1 minute
  - [ ] Pin dashboard in AWS console
- [ ] DevOps: Create Sentry custom dashboard
  - [ ] Error rate time series
  - [ ] Top 5 errors table
  - [ ] Latency percentiles (p50, p95, p99)
  - [ ] Browser errors
  - [ ] Enable alerts (error rate > 1% = Slack notification)

### Afternoon (12:00-18:00 UTC)
- [ ] QA: Browser compatibility testing
  - [ ] Chrome (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)
  - [ ] Mobile Chrome (Android)
  - [ ] Mobile Safari (iOS)
- [ ] Scribe: Prepare Google Doc template for cutover log
  - Title: "Cutover Log 2026-06-02"
  - Pre-fill timestamps for expected milestones (04:00 UTC, 04:05, 04:15, etc.)
  - Share document with all ops team
- [ ] All: Get required phone numbers from CTO, fill in CUTOVER_DAY_QUICK_REFERENCE.md

### Evening (18:00+ UTC)
- [ ] Everyone: Final read-through of YOUR ROLE section in PRODUCTION_CUTOVER_PLAN.md
- [ ] CTO: Confirm team is ready (Slack: ✅ READY FOR CUTOVER)
- [ ] Team: Rest well - early night Friday before cutover

---

## SUNDAY: 2026-06-01 (1 day before - CUTOVER DAY PREP)

### Early Morning (08:00-10:00 UTC / 05:00-07:00 BRT)
- [ ] DevOps: Final infrastructure verification
  - [ ] Database backup created: `s3://imobi-backups/2026-06-02/postgres-snapshot.sql.gz`
  - [ ] Redis snapshot created: `s3://imobi-backups/2026-06-02/redis-snapshot.rdb`
  - [ ] Vercel dashboard accessible, build logs visible
  - [ ] Can reach AWS console, CloudWatch, Sentry
- [ ] Engineering: Verify release tag is pushed
  - `git tag -l | grep 'release/phase4'`
  - `git log --oneline | head -1` → Should show recent commits
- [ ] CTO: Send notification to all ops team
  - Slack: "Cutover in ~10 hours. Final prep begins 17:00 UTC"

### Late Morning (10:00-14:00 UTC / 07:00-11:00 BRT)
- [ ] QA: Final critical path testing
  - Manager login → Dashboard → Approve etapa (must work)
  - Engineer location submit → Photo upload (must work)
  - Verify no console errors (Ctrl+Shift+J)
  - Record baseline metrics (page load time, etc.)
- [ ] Tech Lead: Prepare hotfix branch
  - `git checkout -b hotfix/cutover-prepped`
  - Have editor open and ready
  - Know exactly where critical UI code lives
- [ ] All: Print these documents:
  - CUTOVER_DAY_QUICK_REFERENCE.md (1 page, keep visible entire cutover)
  - CUTOVER_EXECUTION_CHECKLIST.md (print checklist section)
  - Performance threshold table

### Afternoon (14:00-17:00 UTC / 11:00-14:00 BRT) — TESTING WINDOW
- [ ] Run SIMPLIFIED_TEST_CHECKLIST.md on production mirrors
  - [ ] All critical flows must PASS
  - [ ] Document any failures
  - [ ] Fix failures if time permits (max 1 hour remediation)
- [ ] DevOps: Final deployment dry-run on staging
  - Build from release tag
  - Deploy to staging
  - Run health checks
  - Record timing

### 17:00 UTC (14:00 BRT) — GO/NO-GO DECISION
- [ ] All leads fill out checklist in PRODUCTION_CUTOVER_PLAN.md (GO section)
- [ ] CTO reviews: TypeScript ✓, Build ✓, Tests ✓, Backups ✓, Monitoring ✓
- [ ] CTO final decision: GO or NO-GO
  - **GO** → Proceed to pre-cutover prep
  - **NO-GO** → Document blocker, reschedule immediately

### 17:00-19:00 UTC (14:00-16:00 BRT) — PRE-CUTOVER PREP
- [ ] Notifications sent (email + Slack) per CUTOVER_STAKEHOLDER_COMMS.md
- [ ] All team members online in Slack #cutover-live
- [ ] Monitoring dashboards opened and visible
  - Sentry: https://sentry.io/organizations/[ORG]/issues/
  - CloudWatch: https://console.aws.amazon.com/cloudwatch
  - Vercel: https://vercel.com/[TEAM]/imobi/deployments
- [ ] Phone bridge connected and tested
- [ ] On-call rotation confirmed (who's on-call after cutover?)
- [ ] 48-hour on-call availability confirmed with team

### 19:00-23:00 UTC (16:00-20:00 BRT) — FINAL CHECKS
- [ ] Vercel: Check if any pending deployments (should be none)
- [ ] Database: Confirm no active long-running queries
- [ ] Redis: Confirm queue is empty (or documented)
- [ ] Security: Confirm CORS, JWT, auth secrets all correct
- [ ] Runbooks: All team members review final runbooks
- [ ] CTO: Send Slack confirmation "Everything is GO. See you at 04:00 UTC (02:00 BRT)"

### 23:00 UTC (20:00 BRT) — FINAL REST
- [ ] All operations team offline/rest until cutover
- [ ] DevOps on-call: Stay available, get rest (important!)
- [ ] CTO: Available for emergency only
- [ ] Do NOT deploy, commit, or change anything between now and cutover

---

## CUTOVER WINDOW: 2026-06-02 02:00-04:00 BRT / 04:00-08:00 UTC

**Reference**: CUTOVER_DAY_QUICK_REFERENCE.md  
**Execution**: CUTOVER_EXECUTION_CHECKLIST.md  
**Monitoring**: MONITORING_DASHBOARD_SETUP.md

All team online in #cutover-live. Follow the minute-by-minute plan exactly.

---

## SUCCESS CRITERIA

Cutover is **SUCCESSFUL** if ALL of these are true by 08:00 UTC (06:00 BRT):
- [ ] Code deployed (release tag visible in Vercel)
- [ ] API health check returns 200 OK
- [ ] Web app loads without errors
- [ ] Manager login works
- [ ] Engineer GPS submission works
- [ ] Error rate < 0.1% for first 60 minutes
- [ ] Response time p95 < 300ms
- [ ] Database connections < 15
- [ ] Redis memory < 300MB
- [ ] Zero critical security errors
- [ ] All team members report "stable"

---

## TROUBLESHOOTING QUICK LINKS

| Problem | Solution | Time |
|---------|----------|------|
| Build fails | Check logs in Vercel, fix code, rebuild | 10-15 min |
| API won't start | Check env vars, database connection | 10 min |
| GPS validation broken | Check PostGIS functions in database | 5 min |
| Login page blank | Check CORS in .env, rebuild | 10 min |
| High error rate | Check Sentry, find top error, hotfix | 15 min |
| Database locked | Contact support, check pg_locks | 10 min |
| Redis memory full | Flush old keys, clear cache | 5 min |
| Performance degraded | Check CloudWatch, scale if needed | 10 min |

---

## CONTACTS & ESCALATION

**If ANY problem occurs**:
1. **Is it critical?** (users can't use system) → Call CTO immediately
2. **Is it major?** (features broken, 0.1-1% errors) → Escalate to CTO, attempt fix
3. **Is it minor?** (slow, some warnings) → Document, continue monitoring, escalate if worsens

---

## PRINT THIS

Before Sunday 23:00 UTC, **PRINT these documents**:
1. CUTOVER_DAY_QUICK_REFERENCE.md (keep visible entire cutover)
2. CUTOVER_EXECUTION_CHECKLIST.md (mark off checkpoints)
3. Performance threshold table (check every 5 min)

Keep printed copies nearby during entire cutover window. Do NOT rely on screens.

---

**Ready? Let's launch Phase 4. 4 days to go! 🚀**
