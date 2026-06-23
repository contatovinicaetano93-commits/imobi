# CUTOVER EXECUTIVE SUMMARY — imobi 2026-06-02

**Documento executivo para CTO/PO — Leia antes do cutover**

---

## THE PLAN

**Data**: 2026-06-02 00:00 UTC  
**Duração esperada**: 4 horas até "Mission Accomplished"  
**Risco**: Baixo (infra validada, procedures testadas)  
**Rollback**: 5 minutos se necessário  

---

## WHAT'S CHANGING

- [ ] Next.js 14 web app → Vercel production
- [ ] NestJS API + Fastify → AWS production
- [ ] PostgreSQL + PostGIS → RDS production
- [ ] Redis cache → ElastiCache production
- [ ] Evidence storage → S3 production

**Zero data migration** (database clean/new for this environment)

---

## SUCCESS CRITERIA

| Metric | Target | Status |
|--------|--------|--------|
| Error Rate (first 60 min) | < 1% | Will monitor |
| Latency p95 | < 150ms | Will monitor |
| Cache Hit Ratio | > 80% | Will monitor |
| 5xx Errors | 0 | Will monitor |
| Health Checks | 200 OK | Will monitor |
| CPU Utilization | < 70% | Will monitor |
| Memory Utilization | < 80% | Will monitor |

**Success = All green for 60+ minutes**

---

## WHO'S DOING WHAT

```
DEVOPS LEAD
├─ Initiates deploy
├─ Monitors Vercel build
├─ Watches CloudWatch infrastructure
└─ Makes scale decisions

SRE / MONITORING
├─ Watches Sentry for errors
├─ Runs health check script
├─ Monitors latency & performance
└─ Detects anomalies early

TECH LEAD / BACKEND
├─ Reviews error patterns
├─ Investigates issues
├─ Executes fixes if needed
└─ Validates smoke tests

CTO / DECISION MAKER
├─ Final go/no-go decision
├─ Escalation authority
├─ Rollback decision authority
└─ Team communication lead
```

---

## MONITORING SETUP

### 5 Dashboards Open During Cutover

1. **Sentry Dashboard** (errors in real-time)
   - Error rate, latency, top errors
   - 1-hour time window
   - Alert threshold: 5% error rate

2. **Vercel Deployment** (build progress)
   - Build status, function execution time
   - Auto-refresh logs
   - Rollback link ready

3. **CloudWatch Metrics** (infrastructure health)
   - RDS: CPU, Memory, Connections
   - ElastiCache: Memory, Evictions, Hit Ratio
   - 1-minute refresh

4. **Custom Health Check** (liveness checks)
   - API, Database, Redis, S3, DNS, Web
   - Every 5 seconds
   - Terminal output

5. **Slack #ops-critical** (real-time alerts)
   - All critical notifications
   - Status updates every 15 min
   - Escalation channel

---

## TIMELINE AT A GLANCE

```
23:00 UTC    Standby — All dashboards on, team ready
00:00 UTC 🚀 CUTOVER START — Deploy initiated
00:15 UTC    Canary check (1% traffic) — Error rate OK?
00:30 UTC    Health check sweep — All 6 checks pass?
01:00 UTC    Ramp to 50% traffic — Infrastructure OK?
01:30 UTC    Ramp to 100% traffic — Full load OK?
02:00 UTC    Post-deploy validation — Smoke tests pass?
03:00 UTC    DECLARE SUCCESS — All metrics green for 60+ min
03:30 UTC    Handoff to on-call team
04:00 UTC    Team can step away
```

---

## DECISION POINTS

### At T+15 min (Canary)

**Decision**: Proceed to 50% or investigate?
- **GO**: Error rate < 1%, latency < 150ms, no 5xx errors
- **INVESTIGATE**: Yellow metrics, but fixable
- **ROLLBACK**: Error rate > 5%, multiple issues, or 5xx errors

### At T+45 min (Load Test)

**Decision**: Proceed to 100% or scale up?
- **GO**: RDS CPU < 70%, Memory < 80%, connections < 80
- **SCALE UP**: Resources trending high but not critical
- **ROLLBACK**: Resources exhausted or errors spiking

### At T+120 min (Validation)

**Decision**: Declare success or continue investigating?
- **SUCCESS**: All metrics green for 60+ minutes
- **MONITOR**: Yellow metrics but stable
- **INVESTIGATE**: Red metric or trend is wrong direction

---

## ESCALATION TRIGGERS

```
IF error_rate > 5% FOR 5 minutes
  → Immediate Slack alert @cto
  → Investigate: Fix or ROLLBACK (5 min decision window)
  → If still high: ROLLBACK automatically

IF latency_p95 > 200ms FOR 10 minutes
  → Check RDS: Scale up if CPU > 80%
  → If no improvement: ROLLBACK

IF health_check_fails
  → Determine which check and why
  → If not fixable in 2 min: ROLLBACK

IF multiple_red_metrics
  → ROLLBACK immediately
  → No time to troubleshoot during cutover
```

---

## ROLLBACK PROCEDURE (IF NEEDED)

**Time required**: 5 minutes max  
**Complexity**: Low (one-click in Vercel)  
**Data impact**: None (no data changes in DB)

```
1. Decision: @cto "ROLLBACK: [reason]"
2. Execute: Click "Promote to Production" on previous deployment
3. Wait: ~2 min for redeploy
4. Validate: Health checks pass? Error rate drops?
5. Announce: "Rollback complete. Investigating issue."
6. Next steps: Postmortem + re-plan
```

---

## SUCCESS INDICATORS

### Green Light = All Of These

- [ ] Error rate stays < 1% for first 60 minutes
- [ ] Latency p95 < 150ms (consistent)
- [ ] Cache hit ratio > 80%
- [ ] Zero 5xx errors (or < 5 acceptable)
- [ ] All 6 health checks pass (API, DB, Redis, S3, DNS, Web)
- [ ] RDS CPU < 70%, Memory < 80%
- [ ] Database connections stable
- [ ] User feedback: No complaints in first 30 minutes
- [ ] Team confidence: Everyone relaxed

### Red Light = Any Of These

- [ ] Error rate > 5% for > 5 minutes
- [ ] Latency p95 > 500ms
- [ ] Multiple health checks failing
- [ ] RDS CPU > 85%
- [ ] Database connection exhausted (> 95)
- [ ] Cascading failures (multiple systems down)
- [ ] User reports mass outage
- [ ] Unresolvable in < 5 minutes

---

## WHAT'S ALREADY VALIDATED

✅ **Infrastructure tested**:
  - Load test: 1000 concurrent users, 10 minutes → PASSED
  - All components individually tested
  - RDS connection pool validated
  - Redis eviction policy set correctly
  - S3 bucket access verified

✅ **Code ready**:
  - All tests passing (unit, integration)
  - Sentry error tracking configured
  - Health endpoints working
  - Database migrations applied
  - Environment variables set

✅ **Team ready**:
  - All operators trained on procedures
  - Runbooks written and reviewed
  - Escalation matrix defined
  - Communication channels set up
  - Rollback procedure tested (dry-run)

✅ **Monitoring ready**:
  - All 5 dashboards created and tested
  - Slack integrations active
  - Alerts configured and tested
  - Health check scripts functional
  - Load test script ready

---

## RISKS & MITIGATIONS

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| RDS CPU spikes | Medium | High | Pre-sized instance, auto-scaling ready |
| Connection leak | Low | High | Connection pool validated, scripts ready to kill stuck |
| Cache ineffective | Low | Medium | Cache strategy tested, TTL values validated |
| DNS issue | Very low | Medium | DNS records verified, fallback IP noted |
| Vercel build fails | Low | High | Rollback link ready, previous deploy validated |
| API crash | Low | High | Health checks will detect, rollback ready |
| Data corruption | Very low | Critical | Read-only during first 60 min if possible |

**Overall Risk Level**: 🟡 **MEDIUM** (standard for production cutover)

---

## COMMUNICATION PLAN

### During Cutover

**Every 15 minutes** → Post status in `#cutover-logs`:
```
✅ T+45 min: Canary metrics
   Error rate: X.X% (target < 1%)
   Latency p95: XXms (target < 150ms)
   Health checks: Y/6 passing
   Assessment: [PROCEED/INVESTIGATE/ROLLBACK]
```

**On any RED metric** → Immediate Slack alert:
```
🔴 CRITICAL: [Metric] exceeded threshold
   Current: XXX
   Threshold: YYY
   Action: Investigating / Scaling up / ROLLBACK pending
```

### After Cutover

**Postmortem meeting**: 2026-06-03 10:00 UTC
- What went well
- What could be better
- Lessons learned
- Update procedures

---

## STAKEHOLDER COMMS

**Before cutover (2026-06-01)**:
- Email team: "Go/no-go decision after final checks"

**During cutover (2026-06-02)**:
- Real-time updates in Slack #cutover-logs
- Status updates in #general every 30 min (high level)
- CTO can manually update CEO/investors if needed

**After cutover**:
- Success announcement (if successful)
- Postmortem summary (lessons learned)
- Root cause analysis (if issues occurred)

---

## FALLBACK OPTIONS

### Option A: Rollback (5 min)

If unresolvable issue detected:
```
→ Revert to previous Vercel deployment
→ No data changes (safe)
→ Schedule new cutover for 24h later
```

### Option B: Keep at Reduced Capacity (15 min)

If performance issue but not critical:
```
→ Reduce traffic percentage to 50% or 25%
→ Increase resources (scale up RDS, ElastiCache)
→ Monitor for 30 min
→ Gradually ramp back up
```

### Option C: Continue with Monitoring (1h+)

If all metrics look good:
```
→ Continue full rollout
→ Reduce dashboard refresh frequency
→ Hand off to on-call team
→ CTO available for critical issues
```

---

## KEY NUMBERS

```
🎯 Success Threshold: 60 minutes all-green
⏱️  Maximum troubleshooting window: 5 minutes
🔄 Rollback time: ~5 minutes
💻 Team size: 4 people (DevOps, SRE, Tech Lead, CTO)
📊 Dashboards: 5 (Sentry, Vercel, CloudWatch, Health, Slack)
🚨 Alert rules: 4 (Error rate, Latency, Health check, CPU)
📱 Mobile cutover: Staggered/Beta (not in this window)
💾 Data at risk: None (fresh environment)
```

---

## APPROVAL & SIGN-OFF

**CTO Sign-Off Required**:

By signing below, CTO confirms:
- ✅ Infrastructure properly sized
- ✅ Team fully trained
- ✅ Monitoring completely set up
- ✅ Rollback procedure validated
- ✅ Go/no-go decision authority delegated
- ✅ Ready to execute cutover 2026-06-02 00:00 UTC

```
CTO Name: ________________________
Signature: ________________________
Date: 2026-05-29
Time: __________ UTC
```

**DevOps Lead Sign-Off**:

```
DevOps Name: ________________________
Signature: ________________________
Date: 2026-05-29
Time: __________ UTC
```

---

## FINAL CHECKLIST

- [ ] This document reviewed by CTO
- [ ] Team briefed on timeline and roles
- [ ] All dashboards tested and working
- [ ] Slack channels created and tested
- [ ] Health check scripts tested
- [ ] Rollback procedure validated (dry-run)
- [ ] Emergency contacts listed and confirmed
- [ ] Load test passed (validated 1000 concurrent users)
- [ ] Database backups verified
- [ ] Disaster recovery plan accessible
- [ ] Support team notified (will be inactive during cutover)
- [ ] CTO authorized to make go/no-go decision

---

## GOOD TO GO? 🚀

```
If ALL checkboxes above are checked:
→ We are ready for cutover
→ Confidence level: HIGH
→ Risk level: MANAGED

Go-live date: 2026-06-02 00:00 UTC
Next status update: 2026-06-02 00:15 UTC
Postmortem: 2026-06-03 10:00 UTC

Good luck! 🍀
```

---

**Document prepared**: 2026-05-29  
**Valid until**: 2026-06-02 04:00 UTC (post-cutover)  
**Questions?** Slack @cto or email cto@imobi.com.br
