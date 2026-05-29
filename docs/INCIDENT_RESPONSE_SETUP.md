# Incident Response Setup & Configuration

**Objective:** Enable complete incident detection, alerting, and response infrastructure  
**Owner:** DevOps + Tech Lead  
**Timeline:** 4-6 hours (can be phased)

---

## Checklist: Setup Steps

### Phase 1: Sentry Configuration (45 minutes)

- [ ] **Create Sentry Project** (if not exists)
  ```
  Organization: imobi
  Project: imobi-production
  Platform: Node.js
  Release: Enable version tracking
  ```

- [ ] **Configure Sentry in API (`services/api/.env.production`)**
  ```bash
  SENTRY_DSN=https://[key]@sentry.io/[project-id]
  SENTRY_RELEASE=v1.0.0-$(git rev-parse --short HEAD)
  NODE_ENV=production
  ```

- [ ] **Verify Sentry Integration**
  ```bash
  # In services/api/src/main.ts, Sentry is already initialized
  # Test: curl -X POST https://api.imobi.com/api/v1/test-error
  # Should appear in Sentry dashboard within 30 seconds
  ```

- [ ] **Create Alert Rules in Sentry**
  
  **Alert 1: High Error Rate (P1)**
  ```
  Name: Critical Error Rate Spike
  Condition: error.rate > 5% in 5 minutes
  Environment: production
  Action: Post to Slack #ops-critical
  Frequency: Once per 10 minutes
  ```
  
  **Alert 2: Transaction Errors (P1)**
  ```
  Name: Transaction System Error
  Filter: tags:module:parceiros OR tags:module:obras
  Condition: error.count > 50 in 5 minutes
  Action: Post to Slack #ops-critical with @channel mention
  Frequency: Once per 5 minutes
  ```
  
  **Alert 3: Worker Errors (P2)**
  ```
  Name: BullMQ Worker Failure
  Filter: tags:service:worker OR message:"liberacao-parcela"
  Condition: error.count > 10 in 10 minutes
  Action: Post to Slack #ops-critical
  Frequency: Once per 15 minutes
  ```

- [ ] **Set up Slack Webhook for Sentry**
  ```
  1. Create incoming webhook: api.slack.com/apps
  2. In Sentry > Settings > Integrations > Slack
  3. Authorize and link to #ops-critical
  4. Test: Trigger test error in Sentry dashboard
  ```

---

### Phase 2: CloudWatch Monitoring (1 hour)

- [ ] **Create CloudWatch Dashboard**
  
  **Dashboard Name:** imobi-production-metrics
  
  **Widgets to add:**
  ```
  Row 1: API Performance
  ├─ API Latency p95 (target: < 150ms)
  ├─ API Latency p99 (target: < 200ms)
  ├─ Request count (trend)
  └─ Error rate % (target: < 0.5%)
  
  Row 2: Database Health
  ├─ Database connections (max 100)
  ├─ Replication lag (seconds)
  ├─ Database latency (read/write)
  └─ Disk space used (%)
  
  Row 3: Cache & Queue
  ├─ Redis memory usage (max 512MB)
  ├─ BullMQ queue depth (target: < 100)
  ├─ Worker job failures (trend)
  └─ Cache hit rate (%)
  
  Row 4: Infrastructure
  ├─ API CPU usage (target: < 70%)
  ├─ API memory usage (target: < 80%)
  ├─ Network in/out (GB)
  └─ S3 request errors
  ```

- [ ] **Create CloudWatch Alarms**
  
  **Alarm 1: High Error Rate (P1)**
  ```
  Metric: HTTPCode_Target_5XX_Count
  Threshold: > 50 per minute for 2 minutes
  Action: SNS → DevOps pager + Slack #ops-critical
  ```
  
  **Alarm 2: Database Connection Pool (P1)**
  ```
  Metric: DatabaseConnections
  Threshold: > 95 for 1 minute
  Action: SNS → Slack #ops-critical
  ```
  
  **Alarm 3: API Latency (P2)**
  ```
  Metric: TargetResponseTime (p95)
  Threshold: > 300ms for 5 minutes
  Action: SNS → Slack #ops-general
  ```
  
  **Alarm 4: Redis Memory (P2)**
  ```
  Metric: DatabaseMemoryUsagePercentage
  Threshold: > 90% for 2 minutes
  Action: SNS → Slack #ops-critical
  ```

- [ ] **Set up SNS Topics**
  ```
  Topic 1: ops-critical (for P1 alarms)
  Subscribers:
  - Slack webhook #ops-critical
  - Email: ops@imobi.com
  - PagerDuty (if active)
  
  Topic 2: ops-general (for P2/P3 alarms)
  Subscribers:
  - Slack webhook #ops-general
  ```

---

### Phase 3: Slack Integration (30 minutes)

- [ ] **Create Slack Channels**
  ```
  #ops-critical — Real-time incident alerts (P1/P2)
  #ops-general — Regular monitoring (P3/P4)
  #incident-postmortems — Post-incident analysis
  #releases — Deployment notifications
  ```

- [ ] **Configure Slack Workflows**
  
  **Workflow 1: Incident Thread**
  ```
  Trigger: Message in #ops-critical matching "P1 INCIDENT"
  Action: Create threaded post with incident template
  Tags: @devops-oncall @tech-lead
  ```
  
  **Workflow 2: Auto-Reminder**
  ```
  Trigger: Every 5 minutes (P1 incident active)
  Action: Post reminder to update stakeholders
  Message: "Status update needed in incident thread"
  ```

- [ ] **Create Slash Commands**
  ```
  /incident-start
  - Prompts: Severity (P1-P4), Description, Owner
  - Creates incident thread in #ops-critical
  - Adds to incident tracking
  
  /incident-update
  - Updates current incident status
  - Notifies stakeholders
  
  /incident-resolve
  - Closes incident
  - Links to post-mortem
  ```

---

### Phase 4: Health Check Endpoint (30 minutes)

- [ ] **Implement /health endpoint** (already in codebase, verify)
  
  **File:** `services/api/src/modules/health/health.controller.ts`
  
  ```typescript
  @Get()
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: await this.prisma.$queryRaw`SELECT 1` ? 'connected' : 'error',
      redis: await this.redis.ping() === 'PONG' ? 'connected' : 'error',
      workers: await this.checkWorkers() ? 'running' : 'error',
    };
  }
  ```

- [ ] **Configure External Health Checks**
  
  **In Render Dashboard:**
  ```
  Service: imobi-api
  Health Check Path: /api/v1/health
  Interval: 30 seconds
  Timeout: 10 seconds
  Unhealthy threshold: 3 failures
  ```

- [ ] **Test Health Endpoint**
  ```bash
  curl https://api.imobi.com/api/v1/health
  # Should return 200 OK with all statuses "connected"
  ```

---

### Phase 5: On-Call Rotation (45 minutes)

- [ ] **Set up PagerDuty** (if using)
  ```
  1. Create PagerDuty account
  2. Create service: imobi-production
  3. Create escalation policy
     ├─ Level 1: DevOps on-call (5 min timeout)
     ├─ Level 2: Tech Lead (5 min timeout)
     └─ Level 3: CTO (escalate if unresolved)
  4. Create on-call schedule (weekly rotation)
  5. Add to CloudWatch SNS topics
  ```

- [ ] **Create Google Calendar On-Call Schedule**
  ```
  Calendar: imobi-on-call-rotation
  Event format: "[ON-CALL] [Name]"
  Duration: Mon 00:00 - Sun 23:59 (weekly)
  Invite: DevOps team
  Description includes:
    - Slack #ops-critical link
    - Runbook links
    - Escalation contacts
  ```

- [ ] **Distribute On-Call Guide**
  ```
  Email to all on-call team:
  Subject: You're on-call [dates]
  Content:
  - Link to INCIDENT_RESPONSE_PLAYBOOK.md
  - Runbook links
  - Escalation tree
  - Test checklist (page 1)
  - Emergency contacts
  ```

---

### Phase 6: Logging & Log Aggregation (1 hour)

- [ ] **Configure Render Log Streaming**
  ```
  1. Render dashboard > imobi-api > Settings
  2. Enable: Log streaming to syslog
  3. Configure: Datadog/Sumo Logic/ELK (if using)
  
  Minimum logs to capture:
  - All errors (level: ERROR, FATAL)
  - Database queries > 100ms
  - Worker job completion/failure
  - API request/response (sampling 10%)
  ```

- [ ] **Create Log Search Queries**
  
  **Query 1: API 5xx Errors (last 5 min)**
  ```
  source:api level:ERROR status:5xx | stats count by error_type
  ```
  
  **Query 2: Slow Database Queries**
  ```
  source:database duration_ms > 100 | stats count, avg(duration_ms) by query
  ```
  
  **Query 3: Worker Job Failures**
  ```
  source:worker status:FAILED | stats count by job_type, error
  ```

---

### Phase 7: Documentation & Runbooks (1 hour)

- [ ] **Create Runbook Index**
  ```
  docs/RUNBOOKS/
  ├── DATABASE_FAILOVER.md ✅
  ├── REDIS_RECOVERY.md
  ├── API_ROLLBACK.md
  ├── S3_RECOVERY.md
  ├── WORKER_RECOVERY.md
  └── NETWORK_TROUBLESHOOTING.md
  ```

- [ ] **Create Decision Trees as Flowcharts** (Optional)
  ```
  For common scenarios:
  - "API Error Spike" decision tree (Mermaid diagram)
  - "Database Down" decision tree
  - "Worker Queue Backup" decision tree
  ```

- [ ] **Update Team Handbook**
  ```
  docs/SRE_HANDBOOK.md
  Section: Incident Response
  Links to:
  - INCIDENT_RESPONSE_PLAYBOOK.md
  - RUNBOOKS/
  - Escalation tree
  - On-call guide
  ```

---

### Phase 8: Testing & Validation (1 hour)

- [ ] **Conduct Incident Simulation (Gameday)**
  
  **Scenario 1: API Error Spike**
  ```
  Time: 2h duration
  Actors: DevOps, Tech Lead, PO
  
  1. Trigger: Sentry alert (error rate 8%)
  2. Initial response: (target < 5 min)
  3. Investigation: (target < 10 min)
  4. Recovery: Rollback (target < 15 min)
  5. Debrief: What went well, what to improve
  ```
  
  **Scenario 2: Database Connection Pool Exhaustion**
  ```
  1. Trigger: CloudWatch alarm (95+ connections)
  2. Investigation: Check connection pool
  3. Recovery: Scale database or restart connection pool
  4. Validation: Verify transactions resume
  ```

- [ ] **Validate Alert Routing**
  ```
  Test each alert:
  □ Sentry P1 → Slack #ops-critical within 30s
  □ CloudWatch alarm → Email + Slack within 1m
  □ Health check failure → PagerDuty (if enabled)
  
  Confirm escalation paths work
  ```

- [ ] **Test Runbooks**
  ```
  Each team member executes one runbook end-to-end:
  □ DATABASE_FAILOVER.md
  □ REDIS_RECOVERY.md
  □ API_ROLLBACK.md
  
  Record: Time to completion, blockers, improvements
  ```

---

## Environment Variables Required

Add to `services/api/.env.production`:

```bash
# Sentry Error Tracking
SENTRY_DSN=https://[key]@sentry.io/[project-id]
SENTRY_RELEASE=v1.0.0-${GIT_COMMIT_SHA}

# Monitoring
DATADOG_API_KEY=xxx (optional)
NEW_RELIC_LICENSE_KEY=xxx (optional)

# Health Check
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_TIMEOUT_MS=5000

# Database
MAX_DB_CONNECTIONS=100
DB_QUERY_TIMEOUT_MS=30000

# Redis
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY_MS=1000

# Worker
WORKER_CONCURRENCY=5
WORKER_TIMEOUT_MS=300000
```

---

## Monitoring Dashboard Bookmarks

Save these URLs for quick access:

```
Sentry: https://sentry.io/organizations/imobi/
CloudWatch: https://console.aws.amazon.com/cloudwatch/
Render: https://render.com/dashboard
Vercel: https://vercel.com/dashboard
PagerDuty: https://pagerduty.com/incidents (if using)
Slack: https://imobi.slack.com/messages/ops-critical
```

---

## Post-Setup Validation Checklist

- [ ] Sentry receives errors and posts to #ops-critical
- [ ] CloudWatch alarms trigger on test conditions
- [ ] Health check returns 200 OK with all services connected
- [ ] On-call team can access all runbooks
- [ ] PagerDuty (if enabled) pages on-call on P1 alerts
- [ ] Slack workflows work (incident thread creation)
- [ ] Gameday exercise completed successfully
- [ ] All team members trained on playbook

---

## Maintenance Schedule

**Weekly:**
- Review recent alerts (false positives?)
- Check on-call rotation status
- Verify health check endpoint

**Monthly:**
- Review incident metrics (MTTD, MTTR, frequency)
- Update runbooks based on recent changes
- Conduct alarm threshold review

**Quarterly:**
- Full gameday exercise
- Audit alert rules and remove stale ones
- Update escalation contacts
- Review and update incident playbook

---

## Helpful Commands for Setup

```bash
# Test Sentry connectivity
curl -X POST https://api.imobi.com/api/v1/test-error

# Verify CloudWatch metrics
aws cloudwatch list-metrics --namespace AWS/ApplicationELB | jq '.Metrics[] | .MetricName' | sort | uniq

# List PagerDuty services
curl https://api.pagerduty.com/services \
  -H "Authorization: Token token=$PAGERDUTY_TOKEN"

# List Slack channels
curl https://slack.com/api/conversations.list \
  -H "Authorization: Bearer $SLACK_TOKEN" | jq '.channels[] | .name'
```

---

## References

- **INCIDENT_RESPONSE_PLAYBOOK.md** — Main incident response guide
- **RUNBOOKS/** — Step-by-step recovery procedures
- **Sentry Docs:** https://docs.sentry.io/
- **CloudWatch Docs:** https://docs.aws.amazon.com/cloudwatch/
- **Render Docs:** https://render.com/docs
- **PagerDuty Setup:** https://support.pagerduty.com/docs

---

**Setup Owner:** [Name]  
**Completion Date:** [Date]  
**Next Review:** 2026-08-29 (90 days)
