# Incident Response Guide — imobi

## Overview

This guide provides structured procedures for detecting, responding to, and recovering from common incidents in the imobi platform. All incidents are logged using our structured logging system with `requestId`, `traceId`, and error categorization for root cause analysis.

---

## 1. Common Error Scenarios

### 1.1 Database Connection Down

**Detection:**
- Status endpoint returns `SERVICE_UNAVAILABLE` (503)
- Health check shows `database: 'disconnected'`
- Error category: `DATABASE` with severity `HIGH`

**Example Log:**
```json
{
  "requestId": "req-12345",
  "traceId": "trace-67890",
  "category": "DATABASE",
  "severity": "high",
  "statusCode": 503,
  "error": "connect ECONNREFUSED 127.0.0.1:5432",
  "retryable": true,
  "duration": "5023ms"
}
```

**Root Causes:**
- PostgreSQL service stopped or crashed
- Network connectivity issue to DB host
- Connection pool exhausted
- Replica/failover issues with PostGIS

**Response Procedures:**
1. **Immediate:** Check PostgreSQL status:
   ```bash
   # Production: Contact DevOps
   # Local: systemctl status postgresql
   ```
2. **Verify health:** `GET /api/v1/health/ready` — should fail until DB recovers
3. **Check connection pool:**
   - Review `prisma:debug` logs for pool exhaustion
   - Check for long-running queries: `SELECT * FROM pg_stat_activity WHERE state != 'idle'`
4. **Failover strategy:**
   - If replica available, trigger failover via infrastructure
   - API continues accepting connections; readiness probe fails
   - Automatic retry via `retryable: true` flag
5. **Customer Communication:**
   - **~30 min downtime:** Internal status only
   - **>1 hr downtime:** Post to status page + email high-value customers

---

### 1.2 Authentication/Authorization Failures

**Detection:**
- 401 (Unauthorized) — invalid/expired JWT
- 403 (Forbidden) — insufficient permissions
- Severity: `MEDIUM`, non-retryable

**Example Logs:**

```json
{
  "requestId": "req-54321",
  "traceId": "trace-abc123",
  "category": "AUTHENTICATION",
  "severity": "medium",
  "statusCode": 401,
  "error": "Invalid JWT signature",
  "retryable": false
}
```

```json
{
  "requestId": "req-54322",
  "traceId": "trace-abc124",
  "category": "AUTHORIZATION",
  "severity": "medium",
  "statusCode": 403,
  "error": "User lacks ADMIN role for this operation",
  "retryable": false,
  "userId": "user-xyz"
}
```

**Root Causes:**
- JWT secret misconfigured (`JWT_SECRET` env var)
- Token expired (client not refreshing)
- Role/permission mismatch in database
- Malicious token or token tampering

**Response Procedures:**
1. **For 401 errors:**
   - No action needed for legitimate expired tokens (client refresh flow)
   - **If spiking suddenly:** Check if JWT secret was rotated; verify all instances use same secret
   - Verify JWT secret exists: `echo $JWT_SECRET | wc -c` (should be 32+ chars)

2. **For 403 errors:**
   - Review user role assignment in database:
     ```sql
     SELECT id, email, role FROM usuarios WHERE id = 'user-xyz';
     ```
   - Check role-based access control (RBAC) rules in `src/common/guards/roles.guard.ts`

3. **For spike in auth failures:**
   - Check Auth0 or external auth service status (if integrated)
   - Review recent code/config deployments
   - No customer communication needed (auth is user-level)

---

### 1.3 Rate Limiting

**Detection:**
- HTTP 429 (Too Many Requests)
- Category: `RATE_LIMIT`, severity `MEDIUM`, retryable

**Example Log:**
```json
{
  "requestId": "req-99999",
  "traceId": "trace-def456",
  "category": "RATE_LIMIT",
  "severity": "medium",
  "statusCode": 429,
  "error": "Rate limit exceeded",
  "retryable": true,
  "duration": "12ms"
}
```

**Root Causes:**
- Legitimate traffic spike (load test, traffic surge)
- Crawler/bot hitting API without rate limit key
- Client buggy retry logic (exponential backoff not implemented)

**Response Procedures:**
1. **Assess impact:**
   - Filter logs: `category:RATE_LIMIT AND severity:medium`
   - Count unique `userId` values — is it one user or many?
   - Check traffic rate: `GET /metrics/requests-per-second`

2. **If single user/bot:**
   - Identify source IP: Review logs for `ip` field
   - Add to blocklist: `POST /api/v1/admin/blocklist` (IP or API key)
   - No customer communication needed (spam user)

3. **If legitimate spike:**
   - Temporary rate limit increase via env var: `RATE_LIMIT_REQUESTS=1000` (default: 100/min per IP)
   - Redeploy: `pnpm deploy:api`
   - Notify affected customers with timeline
   - Root-cause the traffic: New feature? Campaign launch?

4. **Permanent fix:**
   - Increase infrastructure capacity or rate limits
   - Implement tiered rate limits by API key
   - Deploy changes and gradually roll back temporary limits

---

### 1.4 External Service Timeouts (S3, Email, SMS)

**Detection:**
- HTTP 502/503 (Bad Gateway/Service Unavailable)
- Category: `EXTERNAL_SERVICE`, severity `HIGH`, retryable
- Long `duration` values (>5000ms)

**Example Log:**
```json
{
  "requestId": "req-s3-001",
  "traceId": "trace-s3-aws",
  "category": "EXTERNAL_SERVICE",
  "severity": "high",
  "statusCode": 502,
  "error": "S3 upload timeout after 30000ms",
  "retryable": true,
  "duration": "30145ms"
}
```

**Services & Timeouts:**
- **AWS S3:** 30s (fotos de obra, documentos)
- **Email:** 10s (SendGrid/Mailgun)
- **SMS:** 5s (Twilio)
- **External APIs:** 10-15s (credit bureaus, payment gateways)

**Response Procedures:**

#### S3 Upload Failures:
1. Check AWS S3 status page: https://health.aws.amazon.com
2. Verify IAM credentials: `aws s3 ls --profile prod`
3. If regional issue, check `AWS_REGION` env var
4. **Retry:** Client auto-retries with exponential backoff (handled by SDK)
5. **If persistent:**
   - Switch to secondary bucket/region (if configured)
   - Queue uploads to BullMQ for delayed retry
   - Customer sees "Upload pending" UX

#### Email/SMS Failures:
1. Check provider status:
   - SendGrid: https://status.sendgrid.com
   - Twilio: https://status.twilio.com
2. Verify API keys in KMS/Secrets Manager (not in .env)
3. **BullMQ retry:** Emails/SMS auto-retry via `liberacao-parcela.worker.ts`:
   ```typescript
   this.email.parcelaLiberadaEmail(...)
     .catch((e) => this.logger.error(`Erro ao enviar email: ${e}`));
   ```
4. **If service down >1hr:**
   - Alert ops to failover to backup provider
   - Queue notifications (no customer data loss)
   - Post to status page: "Email delays expected"

---

### 1.5 Worker/Queue Failures

**Detection:**
- `liberacao-parcela.worker.ts` or `score-update.worker.ts` fails
- Job moves to failed queue
- `JobFalha` table row created with stack trace

**Example Log:**
```json
{
  "queueName": "liberacao-parcela",
  "jobId": "job-12345",
  "category": "DATABASE",
  "severity": "high",
  "error": "Prisma connection failed during transaction",
  "payload": { "creditoId": "cred-99", "valor": 5000 },
  "attempts": 3,
  "retryable": true
}
```

**Common Causes:**
- Database connection lost mid-transaction
- Prisma schema/table mismatch after migration
- Payment gateway timeout (async operation)
- Memory limit exceeded on worker process

**Response Procedures:**

1. **Check job status:**
   ```bash
   # List failed jobs in queue
   redis-cli -n 1 LLEN bull:liberacao-parcela:failed
   ```

2. **Root cause analysis:**
   - Query job failure log: `SELECT * FROM "JobFalha" WHERE queue = 'liberacao-parcela' ORDER BY createdAt DESC LIMIT 20`
   - Match `jobId` to logs using `requestId`
   - Check error pattern: Same error repeated = systemic issue

3. **Immediate mitigation:**
   - **Idempotent jobs:** Re-process safely (already checks for duplicates in worker)
   - **Restart worker:** `docker restart imobiapi-worker` (triggers retry)
   - **Scale workers:** If queue depth growing, add more worker instances

4. **Remediate:**
   - If database-related: Fix DB connectivity (see §1.1)
   - If migration issue: Run `pnpm db:migrate:prod` to apply pending migrations
   - If timeout: Increase timeout in BullMQ config

5. **Monitor recovery:**
   - Watch `bull:liberacao-parcela:failed` queue depth
   - Verify `liberacao-parcela.worker.ts` `@OnQueueCompleted()` events
   - Customer notifications auto-sent on success

---

## 2. Root Cause Analysis Using Structured Logs

### 2.1 Log Correlation with requestId & traceId

Every request carries two IDs for tracing:
- **`requestId`**: Unique per HTTP request (set by `RequestIdMiddleware`)
- **`traceId`**: Propagated across services for distributed tracing

**Example trace across components:**
```
1. Client HTTP request → requestId: "req-abc123"
2. API logs entry with requestId + traceId: "trace-xyz789"
3. Database query includes traceId in connection string
4. Worker job inherits traceId for background processing
5. External service call includes traceId in headers (X-Trace-ID)
```

### 2.2 Log Query Examples

**Find all errors for a user in a time window:**
```bash
# Grep pattern for logs (JSON format)
grep -E '"userId":"user-12345"' /var/log/imobi/api.log | \
  jq 'select(.timestamp >= "2024-05-30T14:00:00Z" and .timestamp <= "2024-05-30T15:00:00Z")'
```

**Find all high-severity errors in last 1 hour:**
```bash
grep -E '"severity":"(high|critical)"' /var/log/imobi/api.log | tail -100
```

**Trace a single request across all services:**
```bash
# Search API logs
grep "traceId:trace-xyz789" /var/log/imobi/api.log
# Search database logs
grep "traceId:trace-xyz789" /var/log/postgresql/trace.log
# Search worker logs
grep "traceId:trace-xyz789" /var/log/imobi/worker.log
```

### 2.3 Error Categories for Diagnosis

| Category | HTTP Status | Severity | Retryable | Action |
|----------|------------|----------|-----------|--------|
| VALIDATION | 400 | Low | ✗ | Client error; no backend action |
| AUTHENTICATION | 401 | Medium | ✗ | Check JWT secret, token rotation |
| AUTHORIZATION | 403 | Medium | ✗ | Review role assignment |
| NOT_FOUND | 404 | Low | ✗ | Resource deleted or wrong ID |
| CONFLICT | 409 | Medium | ✗ | Data race; retry with backoff |
| RATE_LIMIT | 429 | Medium | ✓ | Implement exponential backoff |
| EXTERNAL_SERVICE | 502/503 | High | ✓ | Check provider status + retry |
| DATABASE | 503 | High | ✓ | Failover + reconnect pool |
| UNKNOWN | 500 | Critical | ✗ | Investigate stack trace |

---

## 3. Response Procedures

### 3.1 Incident Severity Classification

| Level | Definition | Response Time | Escalation |
|-------|-----------|---------------|----|
| **P1 (Critical)** | Complete service down; >100 users affected | < 15 min | Page on-call immediately |
| **P2 (High)** | Major feature broken; 10-100 users affected | < 1 hour | Alert team lead |
| **P3 (Medium)** | Partial degradation; <10 users affected | < 4 hours | Log + monitor |
| **P4 (Low)** | Single user issue or UI glitch | < 24 hours | Backlog for next sprint |

### 3.2 Incident Response Checklist

#### Phase 1: **Assess & Triage** (0-5 min)

- [ ] **Impact:** How many users? What feature? Revenue impact?
  - Query: Count unique `userId` in error logs: `grep "category:DATABASE" /var/log/imobi/api.log | jq '.userId' | sort -u | wc -l`
  - Dashboard: https://monitoring.imobi.internal/dashboard (or equivalent)

- [ ] **Root Cause:** Which error category?
  - Review most recent error in `StructuredExceptionFilter` logs
  - Check health endpoints: `/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`
  - Correlate with recent deployments: `git log --oneline --since="2 hours ago"`

- [ ] **Scope:** Is it global or user-specific?
  - Global: All 429 errors from same IP? → Rate limit / DDoS
  - User-specific: Single `userId` with 401? → Auth issue for that user
  - Region-specific: Errors from Brazil region only? → Regional outage

- [ ] **Severity:** Assign P1-P4 level (see table above)

#### Phase 2: **Communicate** (Parallel with mitigation)

- [ ] **Internal:** Slack `#incidents` channel
  ```
  **P2 INCIDENT: Database connection errors**
  Duration: ~15 minutes (14:22-14:37 UTC)
  Impact: Obra photo uploads failing for all users
  Cause: [Under investigation]
  ETA fix: 14:45 UTC
  ```

- [ ] **Customers (if P1):**
  - Post to status page: "We're investigating increased error rates..."
  - Email if SLA is violated or downtime >30 min
  - Include ETA and status updates every 15 min

- [ ] **Stakeholders:** CC product/ops leads on Slack thread

#### Phase 3: **Mitigate** (Parallel with investigation)

**Quick fixes (try these first):**
- Restart affected service: `docker-compose restart api` (30s downtime)
- Clear Redis cache: `redis-cli FLUSHALL` (careful with this!)
- Rollback last deployment: `docker-compose up api:$PREVIOUS_TAG`

**For database issues (§1.1):**
- Failover to replica (if configured)
- Increase connection pool: `DATABASE_POOL_SIZE=50` → redeploy
- Kill long-running queries: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '5 minutes'`

**For external service timeouts (§1.4):**
- Increase timeout: `EXTERNAL_SERVICE_TIMEOUT=60000` → redeploy
- Circuit breaker: Fallback to cached data or queue for retry

**For worker failures (§1.5):**
- Restart worker: `docker restart imobiapi-worker`
- Redeploy: `docker-compose up -d worker`
- Monitor queue depth: `redis-cli -n 1 LLEN bull:liberacao-parcela:failed`

#### Phase 4: **Investigate** (Deeper root cause)

- [ ] **Correlate logs:**
  ```bash
  # Get a representative error's traceId
  TRACE_ID=$(grep '"severity":"high"' /var/log/imobi/api.log | head -1 | jq '.traceId' | tr -d '"')
  
  # Find all related logs
  grep "$TRACE_ID" /var/log/imobi/*.log
  ```

- [ ] **Check recent changes:**
  ```bash
  git log --since="30 minutes ago" --oneline
  # If recent code change → git diff HEAD~1 HEAD > /tmp/incident.diff
  ```

- [ ] **Review metrics:**
  - CPU/memory: Did a deployment spike resource usage?
  - Database connections: `SELECT count(*) FROM pg_stat_activity;`
  - Queue depth: Backlog building up?

- [ ] **Update incident ticket:**
  - Root cause: "Connection pool exhausted after deployment X"
  - Timeline: "14:22 spike in queries | 14:30 pool exhausted | 14:35 restart + pool increased"

#### Phase 5: **Resolve & Verify**

- [ ] **Fix deployed:** New code or config in production
- [ ] **Verify recovery:**
  - Error rate back to baseline: `grep "severity:high" /var/log/imobi/api.log | tail -10` (should be empty)
  - Health check passing: `curl https://api.imobi.com/api/v1/health/ready`
  - Sample transactions working end-to-end (manual test)

- [ ] **Revert communication:**
  - Close status page incident
  - Post resolution update: "Issue resolved at 14:45 UTC. Root cause: connection pool exhaustion. Fix: increased pool from 20→50 connections."

- [ ] **Escalate if needed:**
  - P1 incident → Post-incident review meeting within 24 hours
  - P2+ incident → Add to sprint backlog as tech debt

---

### 3.3 Rollback Procedures

**Scenario:** Bug introduced in recent deployment causing errors

**Rollback steps:**

1. **Identify last stable version:**
   ```bash
   git log --oneline -20
   # Find commit before the problematic one
   STABLE_COMMIT="abc1234"
   ```

2. **Create rollback branch:**
   ```bash
   git checkout -b rollback/$STABLE_COMMIT $STABLE_COMMIT
   ```

3. **Rebuild & deploy:**
   ```bash
   docker build -t imobi-api:rollback -f services/api/Dockerfile .
   docker tag imobi-api:rollback imobi-api:latest
   docker-compose up -d api
   ```

4. **Verify:**
   - `curl https://api.imobi.com/api/v1/health`
   - Spot-check error logs for the category of errors

5. **Root cause analysis:**
   - Once rolled back, compare code:
     ```bash
     git diff $STABLE_COMMIT HEAD services/api/src/
     ```
   - Fix the bug on main branch
   - Re-deploy only after testing

---

### 3.4 Failover Procedures

**Database failover (PostgreSQL + read replica):**

1. **Detect primary down:**
   - Health check returns `database: 'disconnected'`
   - Alerts: CloudWatch + PagerDuty

2. **Verify replica status:**
   ```bash
   # On replica server
   pg_controldata /var/lib/postgresql/data | grep Database
   psql -c "SELECT is_wal_replay_paused();"  # Should be false
   ```

3. **Promote replica:**
   ```bash
   pg_ctl promote -D /var/lib/postgresql/data
   ```

4. **Update connection string:**
   - Change `DATABASE_URL` to point to old replica (now primary)
   - Restart API: `docker-compose restart api`

5. **Restore streaming replication:**
   - Once primary recovers, demote it to replica
   - Resync WAL files
   - Resume replication

**API failover (Blue-Green Deployment):**

1. **Blue-Green setup (pre-configured):**
   - Blue (current): `api-prod-blue.internal`
   - Green (standby): `api-prod-green.internal`
   - Load balancer routes to Blue

2. **Switch to Green:**
   - Update load balancer: Point traffic to Green
   - Take Blue offline for debugging
   - Monitor error rate on Green (should drop to normal)

---

## 4. Escalation Policy & On-Call

### 4.1 On-Call Schedule

**Primary (API/Backend):**
- Week 1: Alice (alice@imobi.com)
- Week 2: Bob (bob@imobi.com)
- Week 3: Charlie (charlie@imobi.com)
- Rotation every Monday

**Secondary (Infrastructure):**
- Infrastructure team: Escalate P1 incidents after 30 min if unresolved

**Manager on-call:**
- VP Engineering: Escalate P1 >2 hrs downtime or customer impact
- Product Lead: Escalate P2 >1 hr if revenue-impacting

### 4.2 Escalation Triggers

| Condition | Action |
|-----------|--------|
| No response in 5 min | Page secondary on-call |
| P1 not resolved in 30 min | Escalate to infrastructure team + manager |
| P1 not resolved in 1 hr | Escalate to VP Engineering + C-level |
| Data loss detected | Immediately: VP Eng + Legal + Customer Success |

### 4.3 On-Call Handoff

**Before end of shift:**
1. Brief successor on any active incidents
2. Share dashboard credentials & playbook links
3. Confirm on-call status in PagerDuty
4. Add successor to Slack `#on-call` channel

**Post-incident:**
- If incident occurred during shift, send summary to successor:
  ```
  Active incident: [Category] - [Brief description]
  Status: [Resolved | Under investigation]
  Action items: [What's being worked on]
  Escalation: [If escalated, to whom]
  ```

---

## 5. Monitoring & Alerting

### 5.1 Key Metrics to Monitor

- **Error rate by category:**
  ```
  Rate of "severity:high" OR "severity:critical" errors
  Alert if: > 10 errors/min for > 5 min
  ```

- **Database connection health:**
  ```
  Percentage of successful `SELECT 1` queries to primary DB
  Alert if: < 95% success rate
  ```

- **External service latency:**
  ```
  P95 latency for S3, Email, SMS calls
  Alert if: > 10s for S3 | > 5s for Email/SMS
  ```

- **Worker queue depth:**
  ```
  Length of failed jobs queue
  Alert if: > 100 failed jobs pending
  ```

- **Authentication failures:**
  ```
  Rate of 401 + 403 errors
  Alert if: > 50 errors/min (potential attack)
  ```

### 5.2 Alert Configuration

Add to monitoring system (e.g., Prometheus + AlertManager):

```yaml
groups:
  - name: imobi_incidents
    rules:
      - alert: HighErrorRate
        expr: rate(http_errors_total{severity=~"high|critical"}[5m]) > 0.16
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: DatabaseDown
        expr: health_database_status == 0
        for: 1m
        annotations:
          summary: "Database unreachable"
          runbook: "https://internal.imobi.com/runbooks/database-down"
```

---

## 6. Quick Reference: Commands & Tools

### Debugging Commands

```bash
# View live logs (structured JSON)
docker-compose logs -f api | jq '.message, .meta'

# Search logs for error category
grep '"category":"DATABASE"' /var/log/imobi/api.log | jq '.error, .traceId'

# Check worker queue status
redis-cli -n 1
  > LLEN bull:liberacao-parcela:active
  > LLEN bull:liberacao-parcela:failed
  > LLEN bull:liberacao-parcela:delayed

# Health check
curl -s https://api.imobi.com/api/v1/health | jq '.services'

# Database connection status
psql -h postgres.imobi.internal -d imobi_prod -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Worker process status
docker ps | grep worker
```

### Dashboard URLs

- **Monitoring:** `https://monitoring.imobi.internal` (Datadog/NewRelic/etc.)
- **Logs:** `https://logs.imobi.internal` (ELK/Splunk/CloudWatch)
- **Status Page:** `https://status.imobi.com`
- **Runbooks:** `https://internal.imobi.com/runbooks`
- **Playbook:** This document

---

## 7. Post-Incident Review

**After any P1/P2 incident, schedule a 30-min retrospective within 24 hours:**

1. **Timeline:** When did users first notice? When was root cause identified?
2. **Root cause:** Why did it happen? Was it preventable?
3. **Detection:** How did we find it? How could we detect faster?
4. **Response:** Did runbook work? What was confusing?
5. **Prevention:** What permanent fix prevents recurrence?

**Action items:**
- [ ] Update this document if procedures were unclear
- [ ] File tech debt ticket for systemic issues (e.g., "Increase DB pool default to 50")
- [ ] Add metric/alert if detection was slow
- [ ] Code review for recent deployments if bug-related

---

## Contact Information

- **On-Call:** `#on-call` Slack channel or PagerDuty
- **Status Page:** https://status.imobi.com
- **Email:** support@imobi.com (customer-facing)
- **Internal Slack:** `#incidents` channel
- **Emergency:** Direct message VP Engineering

---

**Last updated:** 2026-05-30  
**Version:** 1.0  
**Next review:** 2026-06-30
