# Incident Response Documentation — imobi

**Welcome to the Incident Response Handbook!**

This directory contains everything you need to detect, respond to, and resolve production incidents safely and efficiently.

---

## Quick Start (For On-Call)

You're on-call for the first time? Start here:

1. **Read this in 5 minutes:**
   - [INCIDENT_RESPONSE_PLAYBOOK.md](./INCIDENT_RESPONSE_PLAYBOOK.md) — sections 1-3 (Classification, Detection, Initial Response)

2. **Keep these bookmarked:**
   - **Dashboards:**
     - Sentry: https://sentry.io/organizations/imobi/
     - CloudWatch: https://console.aws.amazon.com/cloudwatch/
     - Render: https://render.com/dashboard
   
   - **Communication:**
     - Slack #ops-critical (for alerting and response)
     - Slack #product (for customer updates)
   
   - **Contacts (in INCIDENT_RESPONSE_PLAYBOOK.md, section 7):**
     - Tech Lead phone/Slack
     - CTO phone/Slack
     - PO email

3. **When alert fires:**
   - Open #ops-critical thread
   - Follow the checklist in [INCIDENT_RESPONSE_PLAYBOOK.md](./INCIDENT_RESPONSE_PLAYBOOK.md#3-initial-response-first-5-minutes)
   - Reference [Decision Matrix](./INCIDENT_RESPONSE_PLAYBOOK.md#5-decision-matrix) if unsure

4. **If you get stuck:**
   - Check [Runbooks/](./RUNBOOKS/) for your specific issue
   - Ask in Slack thread (Tech Lead + team available)
   - Call escalation contact from section 7

---

## Documentation Structure

```
docs/
├── README_INCIDENT_RESPONSE.md (you are here)
├── INCIDENT_RESPONSE_PLAYBOOK.md (main guide — read this!)
├── INCIDENT_RESPONSE_SETUP.md (how to configure monitoring)
├── INCIDENT_COMMUNICATION_TEMPLATES.md (copy-paste ready)
│
└── RUNBOOKS/
    ├── DATABASE_FAILOVER.md (primary DB down)
    ├── REDIS_RECOVERY.md (cache unavailable)
    ├── API_ROLLBACK.md (code deployment issue)
    ├── S3_RECOVERY.md (file upload failures)
    └── WORKER_RECOVERY.md (async job queue stuck)
```

---

## Main Documents

### 1. INCIDENT_RESPONSE_PLAYBOOK.md (15 min read)

**The Core Guide** — everything you need to know about handling incidents at imobi.

**Key Sections:**
- Severity classification (P1-P4) with SLAs
- Detection & alerting setup
- Initial response checklist
- Investigation flow (debug trees for each service)
- Decision matrix (common symptoms → actions)
- Communication templates (ready to use)
- Escalation tree (who to call)
- Post-incident procedures

**Use When:**
- Alert fires and you need quick reference
- Unsure about severity classification
- Don't know next step in investigation
- Need to communicate with stakeholders

**Key Links Within Document:**
- [Section 1: Severity Classification](#1-severity-classification-p1-p4)
- [Section 3: Initial Response Checklist](#3-initial-response-first-5-minutes)
- [Section 5: Decision Matrix](#5-decision-matrix)
- [Section 6: Communication Templates](#6-communication-templates)

---

### 2. INCIDENT_RESPONSE_SETUP.md (30 min read)

**Configuration Guide** — how to enable monitoring, alerting, and automation.

**Key Sections:**
- Sentry configuration (error tracking)
- CloudWatch setup (performance metrics)
- Slack integration (alerting)
- Health check endpoint (liveness probes)
- On-call rotation (PagerDuty/calendar)
- Logging aggregation (centralized logs)
- Runbook creation & validation
- Post-setup testing & gameday

**Use When:**
- Setting up incident response for first time
- Onboarding new team member
- Configuring monitoring in new environment
- Validating alert rules are working

**Quick Reference:**
- [Phase 1: Sentry Configuration](#phase-1-sentry-configuration-45-minutes)
- [Phase 2: CloudWatch Monitoring](#phase-2-cloudwatch-monitoring-1-hour)
- [Phase 3: Slack Integration](#phase-3-slack-integration-30-minutes)
- [Testing & Validation](#phase-8-testing--validation-1-hour)

---

### 3. INCIDENT_COMMUNICATION_TEMPLATES.md (5 min scan)

**Copy-Paste Ready** — communication for every incident scenario.

**Templates Included:**
- Initial alert (#ops-critical)
- Status updates (investigating, taking action, resolved)
- User communications (#product channel)
- Engineering updates (postmortem)
- Leadership emails (exec summary)
- Partner communications (high-value customers)
- Escalation notifications

**Use When:**
- Need to post update to team
- Writing user-facing message
- Notifying leadership/partners
- Creating postmortem summary

**Pro Tip:** Customize template variables (timestamps, error messages) and paste directly into Slack/Email.

---

## Runbooks (Step-by-Step Recovery)

Located in `/docs/RUNBOOKS/`

### DATABASE_FAILOVER.md
**When:** Primary database unreachable, READONLY error, replication lag > 30s  
**Time:** ~5 minutes  
**Difficulty:** Medium

Steps:
1. Verify primary is truly down
2. Promote replica to primary
3. Update application connection string
4. Restart API service
5. Verify health & data integrity

**Key Commands:**
```bash
psql -h REPLICA_HOST -c "SELECT pg_promote();"  # Promote replica
render deploy --service=imobi-api  # Redeploy API
curl https://api.imobi.com/api/v1/health  # Verify
```

---

### REDIS_RECOVERY.md (Coming Soon)
**When:** Redis memory exhausted, BullMQ queue failing, cache errors  
**Time:** 2-10 minutes  
**Difficulty:** Low

Steps:
1. Check memory usage
2. Identify large keys
3. Clear non-critical cache
4. Monitor queue recovery
5. Scale Redis if needed

---

### API_ROLLBACK.md (Coming Soon)
**When:** Error rate spike after deploy, critical code bug  
**Time:** 3-5 minutes  
**Difficulty:** Low

Steps:
1. Identify last stable deployment
2. Click redeploy in Render
3. Monitor deployment progress
4. Verify health & error rate drop
5. Test critical transaction flow

---

### S3_RECOVERY.md (Coming Soon)
**When:** S3 403 Forbidden, file upload failures, CORS errors  
**Time:** 3-5 minutes  
**Difficulty:** Low

Steps:
1. Check AWS service status
2. Verify bucket CORS configuration
3. Check IAM role permissions
4. Test S3 access from API
5. Monitor Sentry errors

---

### WORKER_RECOVERY.md (Coming Soon)
**When:** BullMQ jobs failing, queue backing up, worker stuck  
**Time:** 5-15 minutes  
**Difficulty:** Medium

Steps:
1. Check worker process status
2. Identify queue bottleneck
3. Review failed jobs
4. Restart worker or clear queue
5. Monitor recovery

---

## Common Incident Scenarios

### Scenario: API Error Rate Spike (Most Common)

**Detection:** Sentry alert or CloudWatch alarm

**60-Second Response:**
1. Check recent deployments (Render dashboard)
2. Check Sentry top errors (last 5 min)
3. Decide: Rollback vs. Investigate
4. If rollback: Use [API_ROLLBACK.md](./RUNBOOKS/API_ROLLBACK.md)
5. If investigate: Use [Investigation Flow](./INCIDENT_RESPONSE_PLAYBOOK.md#4-investigation-flow)

**Decision Tree:**
- Error spike immediately after deploy? → **Rollback** (safer)
- Error trending up over 5 min? → **Investigate** (might help diagnose)
- Unsure? → **Ask Tech Lead** (no penalty for asking)

---

### Scenario: Database Connection Timeout

**Detection:** API logs show "FATAL: too many connections"

**Response:**
1. Check `SELECT count(*) FROM pg_stat_activity` on database
2. If connections > 95/100:
   - Short-term: Restart API (reconnect pool)
   - Medium-term: Scale database or increase pool
   - Long-term: Fix N+1 queries in code
3. If connections normal:
   - Check database latency
   - May need [Database Failover](./RUNBOOKS/DATABASE_FAILOVER.md)

---

### Scenario: Redis Memory Exhausted

**Detection:** CloudWatch alarm, BullMQ queue failing

**Response:**
1. Check Redis memory: `redis-cli INFO memory`
2. Clear cache: `redis-cli EVAL "for i, key in..." 0`
3. Monitor queue recovering
4. If still critical: Scale Redis instance
5. Reference: [REDIS_RECOVERY.md](./RUNBOOKS/REDIS_RECOVERY.md) (coming soon)

---

### Scenario: Worker Jobs Stuck

**Detection:** Queue depth > 1000, failed jobs not processing

**Response:**
1. Check worker process: `docker ps | grep worker`
2. Check queue depth: `redis-cli XLEN imbobi:liberacao-parcela`
3. Review error: `docker logs imbobi_worker | tail -100`
4. Restart if needed: `docker restart imbobi_worker`
5. Monitor: Queue should decrease
6. Reference: [WORKER_RECOVERY.md](./RUNBOOKS/WORKER_RECOVERY.md) (coming soon)

---

## Key Metrics & Alerting

### Response Time SLAs

```
Severity | Response | Resolution | Monthly Uptime
─────────|──────────|────────────|────────────────
P1       | < 5 min  | < 15 min   | 99.99% (52 min)
P2       | < 15 min | < 1 hour   | 99.9% (8.7 hrs)
P3       | < 1 hour | < 4 hours  | 99% (7.2 hrs)
P4       | < 1 day  | < 1 week   | N/A
```

### Key Metrics Watched

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Error Rate | < 0.1% | > 2% | > 5% |
| API Latency p95 | 100ms | 150ms | 300ms |
| DB Connections | 20/100 | 80/100 | 95/100 |
| Redis Memory | 200MB | 400MB | 480MB |
| Worker Queue | 0-50 jobs | 500 | 2000 |
| DB Replication Lag | < 1s | 5s | 15s+ |

---

## On-Call Responsibilities

### During Shift (24 hours)
- Monitor Slack #ops-critical for alerts
- Respond to P1/P2 incidents within SLA
- Answer pager (if enabled)
- Keep incident log updated
- Don't deploy during nights (unless critical)

### At Shift Start
```
□ Verify pager is active
□ Test Slack notifications
□ Verify access to all dashboards
□ Review incidents from past 24 hours
□ Check open action items
□ Confirm contact list current
□ Sign off: "Ready for on-call shift"
```

### At Shift End
- Brief incoming on-call about:
  - Active incidents (if any)
  - Recent issues to watch for
  - Known problems/workarounds
- Confirm they have access to all tools
- Pass off responsibility

---

## Escalation Chain

```
ALERT FIRES
    ↓
DevOps On-Call (0-5 min)
    ├─ P1 → Immediately notify Tech Lead + CTO
    ├─ P2 → Notify Tech Lead if unresolved after 10 min
    └─ P3 → Monitor, escalate if > 1 hour
    ↓
Tech Lead (5-15 min if P1)
    ├─ Approve major changes (rollback, scaling)
    ├─ Assist with diagnosis if stuck
    └─ Escalate to CTO if unresolved after 15 min
    ↓
CTO (15+ min if P1)
    ├─ Executive decision on options
    ├─ Approve emergency measures
    └─ Call vendors/support if needed
    ↓
CEO/PO (20+ min if P1 + revenue impact)
    └─ Executive notification (revenue impact, customers affected)
```

---

## Pre-Incident Setup Checklist

Before first incident:

- [ ] Read INCIDENT_RESPONSE_PLAYBOOK.md (sections 1-3)
- [ ] Set up Slack #ops-critical channel
- [ ] Configure Sentry alerts → Slack
- [ ] Configure CloudWatch alarms → SNS
- [ ] Verify health check endpoint (`/api/v1/health`)
- [ ] Test rollback process (practice on staging)
- [ ] Schedule gameday exercise
- [ ] All team members trained
- [ ] Contact list verified and current

---

## Useful Commands (Keep Handy)

### Sentry
```bash
# Test error reporting
curl -X POST https://api.imobi.com/api/v1/test-error

# View errors: https://sentry.io/organizations/imobi/
```

### Database
```bash
# Check connections
psql -h $DB_HOST -U imbobi -d imbobi_prod -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Kill slow queries
psql -h $DB_HOST -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query_start < now() - interval '30 seconds';"
```

### Redis
```bash
# Check memory
redis-cli INFO memory | grep used_memory

# Find large keys
redis-cli --bigkeys

# Clear cache
redis-cli EVAL "for i, key in ipairs(redis.call('keys', 'cache:*')) do redis.call('del', key) end return redis.call('dbsize')" 0
```

### Render
```bash
# List deployments
render deployment-status --service=imobi-api --limit=5

# Deploy
render deploy --service=imobi-api --commit=HEAD
```

---

## Frequently Asked Questions

**Q: I got paged but I'm not on-call today. What do I do?**  
A: You may be covering for someone or it's an escalation. Check Slack #ops-critical for context. If truly wrong person, escalate to whoever is on-call.

**Q: Should I rollback or investigate?**  
A: Rule of thumb: Recent deploy + error spike together? **Rollback** (safer, faster). Unknown cause? **Ask Tech Lead** (no penalty).

**Q: How long should investigation take?**  
A: P1: < 10 min. P2: < 30 min. If stuck longer, escalate to Tech Lead for second opinion.

**Q: Can I run commands on production database?**  
A: Only read-only commands (SELECT). For write operations (DELETE, UPDATE), ask Tech Lead. For emergencies, check Runbooks for approved commands.

**Q: Incident resolved but metrics still show issues. Normal?**  
A: Give it 5 minutes (latency metrics are 5-min aggregates). If still abnormal after 5 min, might not be truly resolved.

**Q: What if I break something during recovery?**  
A: It's OK. Incident response is high-pressure. Ask for help, document what happened, and learn. No blame culture.

**Q: How do I practice incident response?**  
A: Gameday exercises (quarterly). Or shadow current on-call (informal). Or review past postmortems to see what worked.

---

## Getting Help

**During Incident:**
- Slack #ops-critical (real-time, get fast answers)
- Call Tech Lead (if Slack too slow)
- Page CTO (if Tech Lead unavailable)

**After Incident:**
- Post in #incident-postmortems
- Review postmortem doc (link in resolution message)
- Discuss in team sync (ask questions!)

**For Updates:**
- Subscribe to #ops-updates
- Review postmortems quarterly

---

## Document Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-29 | Initial playbook created |

**Next Review:** 2026-08-29 (90 days)

---

## Related Documentation

- **Code Quality:** `docs/CONTRIBUTING.md` (code review standards)
- **Deployment:** `docs/DEPLOYMENT.md` (safe deploys)
- **Database:** `docs/DATABASE.md` (migrations, backups)
- **Monitoring:** `docs/MONITORING.md` (dashboard setup)

---

## Quick Links

```
📊 Dashboards
├─ Sentry: https://sentry.io/organizations/imobi/
├─ CloudWatch: https://console.aws.amazon.com/cloudwatch/
├─ Render: https://render.com/dashboard
├─ Vercel: https://vercel.com/dashboard
└─ Slack: https://imobi.slack.com/messages/ops-critical

📚 Documentation
├─ INCIDENT_RESPONSE_PLAYBOOK.md (main guide)
├─ INCIDENT_RESPONSE_SETUP.md (setup & config)
├─ INCIDENT_COMMUNICATION_TEMPLATES.md (copy-paste)
└─ RUNBOOKS/ (step-by-step recovery)

👥 Team
├─ Tech Lead: @tech-lead (Slack)
├─ DevOps: @devops-oncall (Slack)
├─ CTO: @cto (Slack)
└─ On-call schedule: [Google Calendar link]
```

---

**Welcome to the team! You've got this. 💪**

Questions? Ask in #ops-general or contact the DevOps team.

Good luck! 🚀
