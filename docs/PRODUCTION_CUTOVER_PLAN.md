# Production Cutover Plan — imobi
**Date**: 2026-05-29  
**Target Deployment**: 2026-06-02 (Saturday, low-traffic window)  
**Version**: 1.0

---

## Table of Contents

1. [Deployment Timeline](#deployment-timeline)
2. [Pre-Cutover Validation](#pre-cutover-validation)
3. [Rollback Procedures](#rollback-procedures)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Go/No-Go Criteria](#gono-go-criteria)
6. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Deployment Timeline

### Phase 1: Pre-Deployment (2026-06-01, Friday)

| Time | Task | Owner | Status |
|------|------|-------|--------|
| 09:00 | Verify backup integrity | DevOps | ☐ |
| 09:30 | Database migration dry-run | DBA | ☐ |
| 10:00 | Run load test suite (k6) | QA | ☐ |
| 11:00 | Final security scan | Security | ☐ |
| 12:00 | Deploy to staging (for final smoke test) | DevOps | ☐ |
| 14:00 | Staging validation (all systems) | QA + Eng | ☐ |
| 15:00 | **GO/NO-GO DECISION** | CTO | ⏳ |

### Phase 2: Cutover (2026-06-02, Saturday 02:00 UTC - Maintenance Window)

| Time (UTC) | Task | Owner | Rollback? |
|-------|------|-------|-----------|
| 02:00 | Begin maintenance window | Ops | N/A |
| 02:05 | Stop web + API services | DevOps | ✓ Simple restart |
| 02:10 | Create final backup (DB + Redis) | DBA | ✓ Fast restore |
| 02:15 | Run Prisma migrations | DBA | ✓ `prisma migrate resolve` |
| 02:25 | Deploy API (v2.0.0 tag) | DevOps | ✓ Roll back to v1.x |
| 02:35 | Deploy web (v2.0.0 tag) | DevOps | ✓ Vercel instant rollback |
| 02:45 | Verify health checks | DevOps | ⚠️ Skip if failing, rollback |
| 03:00 | Smoke tests (critical paths) | QA | ⚠️ STOP if failures |
| 03:15 | **GO-LIVE DECISION** | CTO | ✓ Rollback available |
| 03:30 | Enable traffic (gradual 10% → 100%) | DevOps | ✓ Revert load balancer |
| 04:00 | Monitor (real traffic) | Ops | ✓ Rollback if issues |

**Estimated Duration**: 2 hours (02:00-04:00 UTC)  
**Communication Window**: 01:50 UTC notification sent to all teams

---

## Pre-Cutover Validation

### 48 Hours Before (2026-05-31)

```bash
# Run load test suite against staging
k6 run tests/load-tests.js \
  --vus 100 \
  --duration 5m \
  --ramp-up 30s \
  --env STAGING

# Expected Results:
# - p95 response time < 500ms
# - Error rate < 0.1%
# - All rate limits enforced
# - Payment queue processing < 2s
```

### 24 Hours Before (2026-06-01)

```bash
# Verify backup integrity
./scripts/test-backup-restore.sh

# Dry-run database migrations
psql -U imbobi -d imbobi_prod_staging \
  -c "BEGIN; ROLLBACK;"

# Verify DNS + CDN readiness
dig www.imobi.app +short
aws cloudfront list-distributions --query 'DistributionList.Items[0].DomainName'
```

### Deployment Day (2026-06-02)

```bash
# Final security scan
npm audit --production
npm run type-check

# Verify git tags
git tag -l v2.0.0  # Must exist
git tag -l v1.x.x  # Rollback target exists
```

---

## Rollback Procedures

### Quick Rollback (< 5 min recovery)

**If API deployment fails**:
```bash
# Revert API to previous image
docker pull gcr.io/imobi/api:v1.x.x
docker stop imobi-api
docker run -d --name imobi-api \
  -e DATABASE_URL=$DB_URL \
  -e REDIS_URL=$REDIS_URL \
  gcr.io/imobi/api:v1.x.x
```

**If web deployment fails**:
```bash
# Revert Vercel deployment instantly
vercel rollback --prod
# (Automatic revert to previous deployment)
```

**If database migration fails**:
```bash
# Resolve pending migration
prisma migrate resolve --rolled-back <migration_name>

# Rollback database to backup (if needed)
./scripts/disaster-recovery.sh postgres latest
```

### Full Rollback (Complete cutover reversal)

**Trigger**: CTO approval if multiple systems fail or data corruption detected

```bash
# 1. Stop all services
docker-compose -f docker-compose.prod.yml down

# 2. Restore database from pre-cutover backup
./scripts/disaster-recovery.sh postgres 2026-06-02_020000

# 3. Restore Redis from backup
./scripts/disaster-recovery.sh redis 2026-06-02_020000

# 4. Restart with previous image tags
export API_VERSION=v1.x.x
export WEB_VERSION=v1.x.x
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify all systems
curl http://localhost:3001/health
curl http://localhost:3000/api/health
redis-cli PING
```

**Expected Recovery Time**: 15-30 minutes

---

## Monitoring & Alerts

### Real-Time Monitoring (During Cutover)

**Dashboard**: Open Grafana at `https://monitoring.imobi.app`

**Key Metrics to Watch**:

| Metric | Threshold | Action |
|--------|-----------|--------|
| API Response Time (p95) | > 1000ms | Investigate query performance |
| Error Rate | > 1% | Check logs, may trigger rollback |
| Payment Queue Depth | > 100 | Check BullMQ worker health |
| Redis Memory | > 80% | Check for cache bloat |
| Database Connections | > 50 | Check for connection leaks |
| CPU Usage | > 80% | Scale up or investigate bottleneck |

**Alert Rules**:
- Error rate spike (> 5% for 2 min) → Slack #ops-alerts
- Database connectivity loss → Critical, page on-call
- Payment processing failure → Critical, notify team lead
- Memory/CPU critical → Automatic scaling if enabled

### Sentry Integration

```javascript
// All errors logged with context
Sentry.captureException(error, {
  tags: {
    deployment_version: 'v2.0.0',
    environment: 'production',
    cutover_date: '2026-06-02'
  }
});
```

**Review Issues Dashboard**: `https://sentry.io/organizations/imobi/issues/`

---

## Go/No-Go Criteria

### Mandatory GO Criteria (ALL must pass)

- ✓ Staging UAT: 14/14 critical tests passed
- ✓ Type-check: Clean (0 errors, 5/5 packages)
- ✓ Security audit: 8/8 OWASP checks passed
- ✓ E2E coverage: ≥ 85% critical paths
- ✓ Load test: p95 < 500ms, error rate < 0.1%
- ✓ Backups: Verified within 24h
- ✓ Rollback plan: Documented + tested

### Acceptable Minor Issues (May proceed with mitigation)

- ⚠️ Non-critical UI polish (UX not impacted)
- ⚠️ Optional feature delay (core workflows unaffected)
- ⚠️ Warning-level linter findings (no runtime impact)

### NO-GO Triggers (Automatic rollback/reschedule)

- ✗ Any critical test failure
- ✗ Security vulnerability found
- ✗ Database migration failure
- ✗ Payment processing broken
- ✗ Authentication/authorization issues
- ✗ GPS validation bypass discovered

---

## Post-Deployment Checklist

### Immediate (0-30 min)

- [ ] All services responding to health checks
- [ ] Error rate < 1%
- [ ] API response times normal (p95 < 500ms)
- [ ] Database reachable, queries executing
- [ ] Redis cache populated
- [ ] Payment queue processing jobs
- [ ] Notifications sending successfully

### Short-Term (1-4 hours)

- [ ] Monitor error trends (no spikes)
- [ ] Verify user logins succeeding
- [ ] Spot-check manager approval workflows
- [ ] Test engineer vistoria submission
- [ ] Verify payment processing batch
- [ ] Check GPS validation is enforced
- [ ] Review CloudWatch metrics for anomalies

### Post-Cutover (24 hours)

- [ ] Document deployment in incident log
- [ ] Send status report to stakeholders
- [ ] Review any minor errors/warnings
- [ ] Verify backup creation (scheduled job)
- [ ] Check performance against baseline
- [ ] Plan post-mortem if issues occurred

### Sign-Off Completion (48 hours)

- [ ] All metrics normal
- [ ] No critical issues in 48h window
- [ ] Team confidence high
- [ ] Document lessons learned
- [ ] Update runbooks if needed

---

## Stakeholder Communication

### Pre-Cutover Notification (24h before)

**Email Subject**: "Production Deployment: imobi v2.0.0 — 2026-06-02 02:00 UTC"

```
Stakeholders,

We will be deploying imobi v2.0.0 to production on Saturday, June 2nd, 2026.

DEPLOYMENT WINDOW: 02:00-04:00 UTC
EXPECTED DOWNTIME: 15-20 minutes

The update includes:
• Manager portal UI improvements (filters, bulk rejection)
• GPS validation visualization
• Approval audit trail
• Enhanced security and rate limiting
• 85% E2E test coverage

All systems have been thoroughly tested. Rollback procedures are in place.

Questions? Contact: ops@imobi.app
```

### During Cutover (Real-time updates)

- 01:50 UTC: "Cutover beginning in 10 minutes"
- 02:05 UTC: "Services paused for migration"
- 02:45 UTC: "Smoke tests in progress"
- 03:15 UTC: "GO-LIVE - gradual traffic increase"
- 04:00 UTC: "All systems nominal - monitoring active"

### Post-Cutover Summary (within 24h)

- Deployment status (success/rollback)
- Performance metrics
- Any issues encountered
- Timeline vs plan
- Learnings for next deployment

---

## Contact List

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| **On-Call Engineer** | TBD | @on-call | TBD |
| **Database Admin** | TBD | @dba-team | TBD |
| **DevOps Lead** | TBD | @devops | TBD |
| **CTO** | TBD | @cto | TBD |

---

## Appendix: Key Version Tags

```bash
# Production release tags
API v2.0.0      - NestJS API with E2E tests, rate limiting, GPS validation
Web v2.0.0      - Next.js 14 with filters, bulk rejection, GPS map, audit trail
Migrations      - Prisma migrations applied (idempotent)
Rollback v1.x.x - Previous stable version (always available)

# Deployment command (DevOps)
git checkout v2.0.0
docker build -t gcr.io/imobi/api:v2.0.0 services/api
docker push gcr.io/imobi/api:v2.0.0
vercel deploy --prod
```

---

**Document Owner**: Infrastructure Team  
**Last Review**: 2026-05-29  
**Next Review**: Post-deployment (within 48h)  
**Approval Chain**: QA → Engineering → CTO
