# Cutover Preparation & Day-of Timeline
**Cutover Date: 2026-06-02 | Window: 02:00-04:00 UTC (23:00 Jun 01 - 01:00 Jun 02 Brazil)**

---

## TODAY: 2026-06-01 (Day Before Cutover)

### Before 14:00 UTC (11:00 Brazil)
- [ ] Complete SIMPLIFIED_TEST_CHECKLIST.md (2 hours)
- [ ] Verify all test infrastructure ready (staging DB, Redis, API)
- [ ] Ensure internet/VPN stable for on-call team

### 14:00-17:00 UTC (11:00-14:00 Brazil) — Testing Window
- [ ] Run full test suite from SIMPLIFIED_TEST_CHECKLIST.md
- [ ] Document all results (PASS/FAIL for each test)
- [ ] Fix any failures found (max 1 hour remediation)

### 17:00 UTC (14:00 Brazil) — Go/No-Go Decision
- [ ] Fill out GO_NO_GO_DECISION.md decision template
- [ ] CTO reviews and signs off
- [ ] If NO-GO: Escalate and reschedule immediately
- [ ] If GO: Proceed to pre-cutover prep (next section)

### 17:00-21:00 UTC (14:00-18:00 Brazil) — Pre-Cutover Prep
- [ ] **Backup verification**
  - Full DB backup complete
  - Backup restored successfully in staging
  - Backup stored in AWS S3 + cold storage
- [ ] **Notification sent to stakeholders**
  - Engineering team
  - Operations team
  - Product managers
  - External customers (if applicable)
- [ ] **Review runbooks**
  - Rollback procedure
  - Hotfix deployment
  - Communication escalation
- [ ] **Verify on-call schedule**
  - CTO on-call 24-48h post-launch
  - Support team notified
  - Customer contact info compiled

### 21:00-23:00 UTC (18:00-20:00 Brazil) — Final Checks
- [ ] Run `scripts/pre-deployment-health-check.sh` again (5 min)
- [ ] Verify Vercel build pipeline (deploy button works)
- [ ] Test rollback procedure in staging (10 min)
- [ ] Confirm database backup integrity (5 min)
- [ ] Brief on-call team on known issues/hotfixes (15 min)

### 23:00 UTC (20:00 Brazil) — Standby Mode
- [ ] All team members in Slack #cutover-live channel
- [ ] Monitoring dashboards (Grafana, Sentry) open
- [ ] Backup communication channel open (phone lines clear)
- [ ] Sleep or rest before cutover (1 hour)

---

## CUTOVER DAY: 2026-06-02

### 01:00 UTC (22:00 Jun 01 Brazil) — Final Warning
- [ ] Post "T-1 hour to cutover" in #cutover-live
- [ ] Confirm all team members awake and online
- [ ] Verify no ongoing deployments in Vercel
- [ ] Last database backup running

### 02:00 UTC (23:00 Jun 01 Brazil) — CUTOVER STARTS

```
CUTOVER TIMELINE (all times UTC)
═══════════════════════════════════════════════════════════════

02:00:00  START: Production traffic paused
          ACTION: Vercel edge cache cleared
          VERIFY: No active requests in logs

02:01:00  DATABASE: Run final migration
          COMMAND: pnpm db:migrate --prod
          VERIFY: All migrations complete, 0 errors
          ROLLBACK: `pnpm db:migrate:rollback` if needed

02:03:00  DEPLOY: Push to production branch
          COMMAND: git push origin main (if not auto-deployed)
          VERIFY: Vercel build starts, monitor logs
          EXPECTED: Build completes in 45-60 seconds

02:05:00  BUILD: Vercel build in progress
          MONITOR: Deployment logs on Vercel dashboard
          IF FAILS: Rollback immediately (see ROLLBACK below)

02:10:00  SMOKE TEST: Health check API
          COMMAND: curl https://api.imobi.com/health
          EXPECTED: Returns 200 { status: "healthy" }
          IF FAILS: Rollback immediately

02:11:00  WARM UP: Trigger cache warming
          COMMAND: scripts/warm-cache.sh
          VERIFY: Redis keys populated
          TIMEOUT: Kill after 2 min if stalled

02:13:00  REDIS: Verify queue system ready
          COMMAND: redis-cli PING
          EXPECTED: PONG
          IF FAILS: Investigate, max 5 min delay tolerance

02:15:00  FINAL: Enable traffic
          ACTION: Vercel production domain redirects to new version
          MONITOR: Error rates, response times
          DURATION: Watch for 5 minutes solid

02:20:00  CHECKPOINT 1: Monitor for errors
          CHECK: Sentry (should be 0 errors)
          CHECK: Grafana (error rate < 0.1%)
          CHECK: Customer reports in Slack
          DECISION: All good? Continue. Issues? See HOTFIX path

02:25:00  CHECKPOINT 2: Test critical flows
          TEST: Manager login at https://app.imobi.com/login
          TEST: Dashboard loads /dashboard/gestor/etapas
          TEST: Sample etapa approval
          EXPECTED: All succeed with no console errors
          DECISION: All good? Proceed. Issue? See HOTFIX path

02:30:00  CHECKPOINT 3: Database verification
          QUERY: SELECT COUNT(*) FROM etapas WHERE status='APROVADA'
          VERIFY: Recent approval records exist
          DECISION: All good? Proceed. Issue? See HOTFIX path

02:35:00  PUBLISH: Go-live announcement
          ACTION: Post "#cutover-complete Success!" in #announcements
          ACTION: Notify customer success team (if applicable)
          ACTION: Update status page to "operational"

02:40:00  ONGOING MONITORING (next 3h 20min = until 06:00 UTC)
          FREQUENCY: Check every 5 minutes
          WATCH FOR: Error spikes, timeouts, database locks
          DECISION RULES: See MONITORING THRESHOLDS below

═══════════════════════════════════════════════════════════════
```

---

## ROLLBACK PROCEDURE (If needed during cutover)

**Trigger Rollback IF**:
- Vercel build fails (> 90 seconds)
- Health check returns non-200
- Login/dashboard broken on first test
- Database migration fails
- Error rate > 5% for 30 seconds
- Manual CTO decision

**Rollback Steps** (5 min max):
1. Revert to previous commit on `main` branch
   ```bash
   git revert HEAD --no-edit
   git push origin main
   ```
2. Trigger Vercel redeploy (automatic)
3. Run database rollback if needed
   ```bash
   pnpm db:migrate:rollback
   ```
4. Verify health check again
   ```bash
   curl https://api.imobi.com/health
   ```
5. Post "ROLLBACK COMPLETE" in #cutover-live
6. Schedule post-mortem within 1 hour

**Expected Rollback Time**: 5 minutes to return to previous stable state

---

## HOTFIX PROCEDURE (If minor issues found post-go-live)

**For non-critical issues** (e.g., UI alignment, missing text):

1. Create hotfix branch from `main`
   ```bash
   git checkout -b hotfix/cutover-2026-06-02
   ```
2. Apply fix (< 10 lines code change)
3. Commit with message: `hotfix: [brief description]`
4. Create PR, request CTO approval (5 min)
5. Merge to `main`
6. Vercel deploys automatically (3-4 min)
7. Verify fix with curl/browser test (2 min)
8. Post result in #cutover-live

**Total Hotfix Time**: 15 minutes max
**Limit**: Max 2 hotfixes during 02:00-06:00 window

---

## MONITORING THRESHOLDS (02:00-06:00 UTC)

Check every 5 minutes. If ANY threshold breached, escalate:

| Metric | Green | Yellow | Red | Action |
|--------|-------|--------|-----|--------|
| Error Rate | < 0.1% | 0.1-1% | > 1% | Alert CTO |
| Response Time (p95) | < 300ms | 300-700ms | > 700ms | Investigate |
| Response Time (p99) | < 800ms | 800-1500ms | > 1500ms | Investigate |
| Database Connections | < 20 | 20-30 | > 30 | Investigate |
| Redis Memory | < 500MB | 500-800MB | > 800MB | Clear cache/Hotfix |
| CPU Usage | < 40% | 40-70% | > 70% | Scale/Investigate |
| Failed Logins | 0 | 1-5 | > 5 | Hotfix/Rollback |

**Escalation Path**:
- Yellow (2+ metrics) → CTO reviews within 5 min
- Red (any metric) → CTO decides Hotfix vs Rollback immediately

---

## COMMUNICATION PLAN

### Pre-Cutover (Before 02:00 UTC)
- [ ] Post countdown in #cutover-live channel
  - "T-4 hours" at 22:00 UTC
  - "T-2 hours" at 00:00 UTC
  - "T-30 min" at 01:30 UTC
  - "T-5 min" at 01:55 UTC

### During Cutover (02:00-04:00 UTC)
- [ ] Live status updates every 5 minutes in #cutover-live
  - "02:00 STARTED"
  - "02:10 Build complete"
  - "02:15 Health check passed"
  - "02:25 Critical flows OK"
  - "02:35 CUTOVER SUCCESS" or "ROLLBACK IN PROGRESS"

### Post-Cutover (After 04:00 UTC)
- [ ] Post final status in #announcements + #cutover-live
- [ ] Announce on-call team will monitor until 06:00 UTC
- [ ] Document any issues encountered
- [ ] Schedule post-mortem for next business day

**Slack Channels**:
- `#cutover-live` — Real-time status (private: eng + ops only)
- `#announcements` — Customer-facing updates
- `#critical-issues` — If problems require escalation

---

## WHO NEEDS TO BE AVAILABLE

| Role | 2026-06-01 | 2026-06-02 01:00 UTC | 2026-06-02 02:00 UTC | 2026-06-02 04:00+ UTC |
|------|-----------|-------------------|-------------------|----------------------|
| **CTO** | Testing + approval | Standby | **Active (required)** | On-call 48h |
| **Eng Lead** | Testing | Standby | **Active (required)** | On-call 24h |
| **DevOps Lead** | Pre-checks | Standby | **Active (required)** | Available if issue |
| **QA Lead** | Testing | Standby | Monitoring | Available if issue |
| **Support Lead** | Briefing | Standby | Monitor for bugs | **Active (required)** |

**Contact During Cutover**:
- CTO: +55 _________ / Slack @cto
- Eng Lead: +55 _________ / Slack @engLead
- DevOps: +55 _________ / Slack @devops

---

## CHECKLIST: Ready for 2026-06-02?

- [ ] SIMPLIFIED_TEST_CHECKLIST.md completed with all PASS
- [ ] GO_NO_GO_DECISION.md signed by CTO
- [ ] Database backup verified and tested
- [ ] Grafana and Sentry dashboards open and monitored
- [ ] Vercel deployment button ready (no pending builds)
- [ ] Team members confirmed available in #cutover-live
- [ ] Rollback plan reviewed by at least 2 engineers
- [ ] Phone lines clear, Slack active, backup comms ready
- [ ] Runbooks printed/accessible offline
- [ ] Customer communication drafted (if needed)

---

## FILES TO HAVE READY

- [ ] `scripts/pre-deployment-health-check.sh` (automated checks)
- [ ] `scripts/warm-cache.sh` (cache warming after deploy)
- [ ] Database migration scripts (in Prisma migrations folder)
- [ ] Rollback script (git revert procedure documented)
- [ ] Hotfix process documented above
- [ ] Monitoring dashboard links bookmarked
- [ ] Support runbook for common cutover issues

---

**FINAL NOTE**: This cutover is **designed to complete in under 2 hours** with minimal customer impact. If you deviate significantly from the timeline above, escalate to CTO immediately. No cutover feature is worth extended downtime — it's better to slow down and get it right than to rush and break things.

**Next**: Share this timeline with full team 24 hours before cutover.
