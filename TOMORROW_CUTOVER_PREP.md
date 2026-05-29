# Tomorrow Cutover Prep — 2026-06-02
**Today**: 2026-06-01 (Preparation Day)  
**Target**: 2026-06-02 02:00 UTC cutover  
**Brazil Time**: 23:00 (10 PM) June 1st = 02:00 UTC June 2nd

---

## TODAY (2026-06-01) — Final 2-Hour Prep Before 23:00 Brazil Time

### PRE-CUTOVER CHECKLIST (Do these TODAY)

**By 18:00 Brazil** (21:00 UTC):

- [ ] Final backup of production database
  ```bash
  ./scripts/backup-prod.sh --tag cutover-2026-06-02
  ```
- [ ] Test backup restore in staging
  ```bash
  ./scripts/test-backup-restore.sh prod staging
  ```
- [ ] Verify git tags exist
  ```bash
  git tag -l v2.0.0      # Must exist
  git tag -l v1.x.x      # Rollback target
  ```
- [ ] Pull latest code
  ```bash
  git fetch origin
  git checkout v2.0.0
  ```
- [ ] Notify all stakeholders (see Communication section)
- [ ] Confirm on-call team available
- [ ] Brief all participants on rollback procedures

**By 20:00 Brazil** (23:00 UTC = 2 hours before cutover):

- [ ] Run final `pnpm type-check` on current branch
- [ ] Run final `pnpm build` to verify
- [ ] Verify all monitoring dashboards open and refreshing:
  - Grafana: https://monitoring.imobi.app
  - Sentry: https://sentry.io/organizations/imobi/
  - CloudWatch: AWS console ready
- [ ] Test rollback procedures in staging (simulate failure)
  ```bash
  # Test API rollback
  docker pull gcr.io/imobi/api:v1.x.x
  # Test Vercel rollback
  vercel rollback --help  # Verify command works
  ```
- [ ] Verify database migration scripts
  ```bash
  ls -la services/api/prisma/migrations/ | tail -5
  ```
- [ ] Confirm DNS propagation (if domain changes)
  ```bash
  dig www.imobi.app +short
  ```
- [ ] Lock down the codebase (no new merges)
- [ ] Send final "1 hour before cutover" notification

**By 22:30 Brazil** (01:30 UTC = 30 min before cutover):

- [ ] All team members in Slack #deployment-status
- [ ] Verify all systems operational (health checks passing)
- [ ] Confirm CTO + DevOps leads on call
- [ ] Final review of rollback runbook
- [ ] Database backup verified in archive
- [ ] Redis backup verified in archive

---

## CUTOVER TIMELINE — Minute by Minute
**Cutover Window**: 2026-06-02 02:00-04:00 UTC (23:00 Brazil June 1 - 01:00 Brazil June 2)

### PHASE 1: Preparation (02:00-02:05 UTC)

| Time | Task | Owner | Status | Rollback? |
|------|------|-------|--------|-----------|
| **01:50 UTC** | Send "cutover starting in 10 min" notification | Ops | ⏳ | N/A |
| **02:00 UTC** | ✅ **BEGIN MAINTENANCE WINDOW** | DevOps | START | N/A |
| **02:00** | All teams ready, monitoring dashboard open | All | ⏳ | N/A |
| **02:00** | Verify no current user traffic | Ops | ⏳ | N/A |
| **02:00** | Start timer for cutover window | Ops | ⏳ | N/A |

### PHASE 2: Service Stop & Backup (02:05-02:15 UTC)

| Time | Task | Owner | Status | Rollback? |
|------|------|-------|--------|-----------|
| **02:05** | Stop API service: `docker stop imobi-api` | DevOps | ⏳ | ✅ Restart |
| **02:05** | Stop web service (Vercel paused) | DevOps | ⏳ | ✅ Instant |
| **02:10** | ✅ **Create final backup** (DB + Redis) | DBA | ⏳ | ✅ Restore |
| **02:10** | Verify backup file created: `ls -lh /backups/` | DBA | ⏳ | N/A |
| **02:15** | Confirm: No incoming traffic | Ops | ⏳ | N/A |

### PHASE 3: Database Migration (02:15-02:25 UTC)

| Time | Task | Owner | Status | Rollback? |
|------|------|-------|--------|-----------|
| **02:15** | ✅ **Run Prisma migrations** | DBA | ⏳ | ✅ `migrate resolve` |
| **02:15** | Command: `pnpm db:migrate --prod` | DBA | ⏳ | ⏱️ ~5 min |
| **02:20** | Monitor migration progress (logs) | DBA | ⏳ | Stop if stuck |
| **02:25** | ✅ Verify migration success | DBA | ⏳ | ✅ Rollback ready |
| **02:25** | Check: `SELECT version FROM _prisma_migrations ORDER BY finishedAt DESC LIMIT 1;` | DBA | ⏳ | N/A |

**Migration Failure Action**: 
- If migration fails → `prisma migrate resolve --rolled-back <migration_name>`
- Restore from backup: `./scripts/disaster-recovery.sh postgres latest`
- Rollback and reschedule

### PHASE 4: Deployment (02:25-02:45 UTC)

| Time | Task | Owner | Status | Rollback? |
|------|------|-------|--------|-----------|
| **02:25** | ✅ **Deploy API** (v2.0.0) | DevOps | ⏳ | ✅ v1.x.x |
| **02:25** | Command: `docker pull gcr.io/imobi/api:v2.0.0 && docker run...` | DevOps | ⏳ | ⏱️ ~5 min |
| **02:30** | ✅ **Deploy Web** (v2.0.0) | DevOps | ⏳ | ✅ Vercel |
| **02:30** | Command: `vercel deploy --prod` | DevOps | ⏳ | ⏱️ ~3 min |
| **02:35** | ✅ **Verify API Health** | DevOps | ⏳ | Check logs |
| **02:35** | Curl: `http://localhost:3001/health` | DevOps | ⏳ | Must return 200 |
| **02:40** | ✅ **Verify Web Health** | DevOps | ⏳ | Check Vercel |
| **02:40** | Open: https://www.imobi.app/api/health | DevOps | ⏳ | Must return 200 |
| **02:45** | ⚠️ If health checks FAIL → ROLLBACK NOW | DevOps | ⏳ | Execute rollback |

**Deployment Failure Action**:
- API fails: `docker pull gcr.io/imobi/api:v1.x.x && docker run...`
- Web fails: `vercel rollback --prod` (automatic)
- Check logs: `docker logs imobi-api` for errors

### PHASE 5: Smoke Tests (02:45-03:15 UTC)

| Time | Task | Owner | Status | Rollback? |
|------|------|-------|--------|-----------|
| **02:45** | ✅ **START SMOKE TESTS** | QA | ⏳ | Check list below |
| **02:45** | Test: Login (manager@imobi.test) | QA | ⏳ | Stop if fails |
| **02:50** | Test: Manager dashboard loads | QA | ⏳ | Stop if fails |
| **02:55** | Test: Etapas list displays | QA | ⏳ | Stop if fails |
| **03:00** | Test: Approval workflow works | QA | ⏳ | Stop if fails |
| **03:05** | Test: Payment queue processing | QA | ⏳ | Stop if fails |
| **03:10** | Test: GPS validation enforced | QA | ⏳ | Stop if fails |
| **03:15** | ⚠️ If ANY test FAILS → STOP & ROLLBACK | QA | ⏳ | Execute rollback |

**Smoke Test Failure Action**:
- API: Rollback to v1.x.x (5 min)
- Web: `vercel rollback --prod` (instant)
- Database: Restore from backup (15-30 min)

### PHASE 6: GO-LIVE Decision (03:15-03:30 UTC)

| Time | Task | Owner | Status | Rollback? |
|------|------|-------|--------|-----------|
| **03:15** | ✅ **All smoke tests passed?** | QA | ⏳ | N/A |
| **03:15** | Review error logs (Sentry) | Ops | ⏳ | Must be clean |
| **03:20** | CTO reviews metrics (p95, error rate) | CTO | ⏳ | Must be nominal |
| **03:25** | ✅ **GO-LIVE DECISION** | CTO | ⏳ | ✅ Rollback ready |
| **03:30** | Decision: **GO** or **NO-GO** | CTO | ⏳ | N/A |

**If NO-GO** (Issues found):
- Execute rollback immediately (API + Web + DB)
- Notify all stakeholders
- Schedule post-mortem within 24h
- Estimated recovery: 15-30 minutes

### PHASE 7: Traffic Increase (03:30-04:00 UTC)

| Time | Task | Owner | Status | Rollback? |
|------|------|-------|--------|-----------|
| **03:30** | ✅ **Send GO-LIVE notification** | Ops | ⏳ | N/A |
| **03:30** | Enable 10% traffic to production | DevOps | ⏳ | ✅ Revert if issues |
| **03:35** | Monitor: Error rate, latency | Ops | ⏳ | Watch Grafana |
| **03:40** | Increase to 50% traffic | DevOps | ⏳ | ✅ Revert if spikes |
| **03:45** | Monitor for issues | Ops | ⏳ | Watch Grafana |
| **03:50** | Increase to 100% traffic (full) | DevOps | ⏳ | Rollback available |
| **04:00** | ✅ **END MAINTENANCE WINDOW** | Ops | DONE | ⏳ Monitor 24h |
| **04:00** | Send "all systems nominal" notification | Ops | DONE | N/A |

---

## CRITICAL CONTACTS & AVAILABILITY

**All these people MUST be available 2026-06-01 21:00 UTC through 2026-06-02 04:00 UTC**:

| Role | Name | Slack | Phone | Email | Available? |
|------|------|-------|-------|-------|------------|
| **CTO** | _________ | @cto | _________ | _________ | ☐ YES |
| **DevOps Lead** | _________ | @devops | _________ | _________ | ☐ YES |
| **Database Admin** | _________ | @dba | _________ | _________ | ☐ YES |
| **On-Call Engineer** | _________ | @on-call | _________ | _________ | ☐ YES |
| **QA Lead** | _________ | @qa | _________ | _________ | ☐ YES |

**Conference Bridge**: _________ (Zoom/Meet/Phone)  
**War Room Slack**: #deployment-status  
**Status Page**: https://status.imobi.app

---

## COMMUNICATION PLAN

### Timeline of Notifications

**2026-06-01 18:00 UTC** (15:00 Brazil):
```
Subject: Deployment Scheduled for Tomorrow 02:00 UTC

We will deploy imobi v2.0.0 to production tomorrow (June 2nd) at 02:00 UTC.

WINDOW: 02:00-04:00 UTC (23:00 June 1 - 01:00 June 2 Brazil time)
EXPECTED DOWNTIME: 15-20 minutes

All critical systems tested. Rollback ready. Follow #deployment-status for updates.
```

**2026-06-01 21:00 UTC** (18:00 Brazil):
```
Subject: Deployment in 1 hour — Teams on standby

Cutover begins at 02:00 UTC (23:00 Brazil). Join war room.
All critical personnel confirm availability.
```

**2026-06-02 01:50 UTC** (22:50 Brazil June 1):
```
Deployment starting in 10 minutes. Final status: ALL GO.
Services will pause for 15-20 min. Monitor Grafana.
```

**2026-06-02 02:05 UTC** (23:05 Brazil):
```
Services paused. Database migration in progress.
ETA: 3 minutes to deployment.
```

**2026-06-02 02:30 UTC** (23:30 Brazil):
```
API & Web deployed. Running smoke tests.
ETA: 45 minutes to GO-LIVE decision.
```

**2026-06-02 03:15 UTC** (00:15 Brazil):
```
All smoke tests PASSED. GO-LIVE decision: YES ✅
Increasing traffic to 100%.
ETA: 45 minutes to full operation.
```

**2026-06-02 04:00 UTC** (01:00 Brazil):
```
✅ DEPLOYMENT SUCCESS
All systems operational. Monitoring active for 24 hours.
Metrics nominal. Zero critical errors.
```

---

## ROLLBACK DECISION TREE

```
Is cutover failing?
│
├─ YES: Health checks failing?
│       ├─ YES → Rollback immediately (5 min)
│       └─ NO → Continue smoke tests
│
└─ NO: All smoke tests passing?
        ├─ NO → Rollback immediately (5 min)
        └─ YES → Proceed to GO-LIVE decision
                 ├─ CTO says GO → Traffic increase (safe)
                 └─ CTO says NO-GO → Rollback & reschedule
```

**Rollback Command Reference**:
```bash
# API Rollback (5 min)
docker pull gcr.io/imobi/api:v1.x.x
docker stop imobi-api
docker run -d --name imobi-api \
  -e DATABASE_URL=$DB_URL \
  -e REDIS_URL=$REDIS_URL \
  gcr.io/imobi/api:v1.x.x

# Web Rollback (instant)
vercel rollback --prod

# Database Rollback (15-30 min if needed)
./scripts/disaster-recovery.sh postgres 2026-06-02_020000
```

---

## SUCCESS CRITERIA (Post-Cutover)

✅ **Immediate (by 04:00 UTC)**:
- [ ] All services responding to health checks
- [ ] Error rate < 1%
- [ ] p95 response time < 500ms
- [ ] No critical Sentry errors
- [ ] Payment queue processing
- [ ] User logins succeeding
- [ ] Manager approvals working

✅ **Continuing (next 24 hours)**:
- [ ] No escalating error rate
- [ ] User engagement normal
- [ ] No database issues
- [ ] Backup creation succeeded
- [ ] Performance stable vs baseline

---

## CHECKLIST TO RUN NOW (2026-06-01)

```bash
# From /home/user/imobi directory

# 1. Run the automated health check script
./scripts/pre-deployment-health-check.sh

# 2. Verify builds work
pnpm type-check && echo "✅ Type check passed"
pnpm build && echo "✅ Build passed"

# 3. Verify git tags
git tag -l | grep v2.0.0
git tag -l | grep v1

# 4. Create backup
./scripts/backup-prod.sh --tag cutover-2026-06-02

# 5. Test backup restore (in staging, not prod!)
./scripts/test-backup-restore.sh
```

---

## DOCUMENT STATUS

- **Created**: 2026-06-01
- **Owner**: DevOps/QA Lead
- **Next Review**: 2026-06-02 01:00 UTC (1 hour before cutover)
- **Approval**: CTO sign-off required before 23:00 Brazil June 1st

**Signature**: _________________ Date: _________________ Time: _________________
