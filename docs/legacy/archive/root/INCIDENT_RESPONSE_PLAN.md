# Incident Response Plan
**Passo 100: Production Incident Management**  
**Created**: 2026-06-23  
**SLA**: Critical issues < 5 min resolution

---

## Incident Severity Matrix

### P1 — CRITICAL (Page on-call immediately)

**SLA**: Resolve within 30 minutes

| Symptom | Impact | Action |
|---------|--------|--------|
| API down (HTTP 500) | All users blocked | Immediate restart + escalate |
| Database unavailable | All features blocked | Failover or restore backup |
| Complete outage (> 5 min) | Full platform down | Page VP Engineering |
| Data corruption | Data loss risk | Restore from backup immediately |
| Security breach | Customer data at risk | Security lockdown protocol |

### P2 — HIGH (Alert within 1 hour)

| Symptom | Impact | Action |
|---------|--------|--------|
| Error rate > 1% | Some users impacted | Investigate root cause |
| P95 latency > 1500ms | Slowness noticed | Check database performance |
| External service down | Feature degraded | Switch to fallback |
| Memory leak detected | Potential crash | Investigate + plan restart |
| Rate limiting broken | Potential abuse | Verify + fix configuration |

### P3 — MEDIUM (Alert within 4 hours)

| Symptom | Impact | Action |
|---------|--------|--------|
| P95 latency > 1s | Minor slowness | Queue for optimization |
| Non-critical feature broken | Feature unavailable | Ticket + plan fix |
| Warning logs increasing | Potential issue brewing | Monitor + plan fix |
| Documentation unclear | Support burden | Update docs |

### P4 — LOW (Alert next business day)

| Symptom | Impact | Action |
|---------|--------|--------|
| Nice-to-have feature request | Not critical | Backlog for sprint |
| Minor UI glitch | Cosmetic issue | Log ticket |
| Documentation typo | Confusing | Fix on next PR |

---

## Emergency Response Procedures

### P1: Complete Outage

```bash
#!/bin/bash
# 0-2 minutes: INITIAL RESPONSE

# 1. Confirm outage (not local issue)
curl -s https://api.imbobi.com.br/api/v1/health | jq
# If no response or 500, confirmed outage

# 2. Alert team immediately
curl -X POST $SLACK_WEBHOOK_URL \
  -d '{
    "text": "🚨 CRITICAL: Complete API Outage",
    "blocks": [{
      "type": "section",
      "text": {"type": "mrkdwn", "text": "Paging: @on-call-devops\nTime: '$(date)'\n*Current Status*: Investigating root cause"}
    }]
  }'

# 3. Page on-call via PagerDuty
# pagerduty trigger-incident imobi-api-down

# 2-5 minutes: TRIAGE

# 1. Check if it's infrastructure issue
echo "Checking Railway/AWS status..."
# - Is the service running?
# - Are there recent deployments?
# - Check error logs

# 2. Check if it's database issue
psql $DATABASE_URL -c "SELECT 1;"
# If connection fails: DATABASE UNAVAILABLE

# 3. Check if it's external service
redis-cli -u $REDIS_URL PING
# If PONG not returned: REDIS UNAVAILABLE

# 5-15 minutes: RECOVERY

# Try recovery option 1: Restart service
echo "Attempting restart..."
railway redeploy
# Wait 2 minutes for health check

# If still down, try recovery option 2: Restore from backup
echo "Preparing restore from backup..."
# See disaster recovery procedures below

# 15-30 minutes: STABILIZATION

# Monitor error rate
watch -n 5 'curl -s https://api.imbobi.com.br/api/v1/health | jq'

# Once recovered:
echo "✅ Service restored"
curl -X POST $SLACK_WEBHOOK_URL \
  -d '{"text": "✅ RESOLVED: API is back online\nRecovery time: X minutes"}'

# Schedule postmortem
echo "Postmortem: Thursday 10 AM UTC"
```

### P2: Database Performance Degradation

```bash
# 0-5 minutes: ASSESS IMPACT

# 1. Check query performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;"

# 2. Check table sizes
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size DESC LIMIT 10;"

# 3. Check connection count
psql $DATABASE_URL -c "SELECT datname, numbackends FROM pg_stat_database WHERE datname='imbobi_production';"

# 5-15 minutes: REMEDIATION

# If idle connections consuming memory
psql $DATABASE_URL -c "SELECT pid, usename, state FROM pg_stat_activity WHERE state='idle' AND state_change < NOW() - INTERVAL '30 minutes';"
# Then terminate them
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle' AND state_change < NOW() - INTERVAL '30 minutes';"

# If specific table is huge
psql $DATABASE_URL -c "VACUUM ANALYZE obra;"

# If indexes degraded
psql $DATABASE_URL -c "REINDEX INDEX obra_user_id_idx;"

# 15-30 minutes: VERIFY RECOVERY

watch -n 5 'curl -s https://api.imbobi.com.br/api/v1/health | jq ".services.database"'
```

### P3: High Error Rate (< 2%)

```bash
# 0-5 minutes: IDENTIFY ERROR TYPE

# 1. Check recent errors
curl -s 'https://sentry.io/api/0/projects/[org]/[project]/events/' \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.data[0:5]'

# 2. Check common stack traces
# - Which endpoint is failing?
# - What's the error message?
# - How many users affected?

# 3. Group by endpoint
aws logs filter-log-events \
  --log-group-name /aws/ecs/imobi-api \
  --filter-pattern "ERROR" \
  --query 'events[*].message' \
  | grep -o "endpoint:[^}]*" | sort | uniq -c | sort -rn

# 5-30 minutes: FIX

# If it's a known issue:
# - Hotfix in code
# - Deploy to production
# - Verify error rate drops

# If it's external service issue:
# - Switch to fallback (if available)
# - Queue permanent fix
# - Monitor as P2

# Verify recovery
curl -s 'https://sentry.io/api/0/projects/[org]/[project]/stats/' \
  -H "Authorization: Bearer $SENTRY_TOKEN"
```

---

## Escalation Tree

```
Incident Triggered
  ↓
Automated Alert (Slack, PagerDuty)
  ↓
On-Call Engineer (5 min response target)
  ├─ P1: Immediate action
  ├─ P2: Root cause analysis
  └─ P3: Ticket + next sprint
  ↓ (If P1 unresolved after 10 min)
Engineering Lead
  ↓ (If P1 unresolved after 20 min)
VP Engineering / CTO
```

---

## Post-Incident Procedures

### Immediately After Recovery

1. **Document Timeline**
   ```
   14:32:00 - Error rate spike detected (Sentry alert)
   14:33:00 - On-call paged
   14:34:00 - Root cause identified (database connection leak)
   14:38:00 - Service restarted
   14:40:00 - Error rate returned to normal
   
   Total outage: 8 minutes
   Users affected: ~150 (estimated)
   Revenue impact: $0 (no transactions during outage)
   ```

2. **Send Status Update**
   ```
   Slack #imobi-incidents:
   ✅ INCIDENT RESOLVED
   
   Duration: 8 minutes
   Impact: API unavailable (recovered)
   Cause: Database connection pool exhaustion
   Resolution: Service restart
   
   Postmortem: Wednesday 10 AM UTC
   Follow-ups: Increase connection pool size
   ```

3. **Create Jira Ticket**
   - Title: "[INCIDENT] Database connection pool exhaustion"
   - Description: Full timeline + impact
   - Priority: High
   - Assign to: Database engineer

4. **Schedule Postmortem**
   - Internal: Engineering + DevOps (30 min)
   - Timeline: Within 24 hours
   - Invite: All stakeholders

### Postmortem Meeting

Agenda:
1. Incident timeline (what happened)
2. Root cause analysis (why it happened)
3. Detection methods (how we found it)
4. Resolution steps (what we did)
5. Prevention measures (how to avoid next time)
6. Action items (who owns what)

Output:
- Written postmortem document
- 3-5 action items
- Prevention plan

---

## Common Issues & Solutions

### Issue 1: API Returns 500 Errors

```bash
# Diagnosis
# 1. Check logs
aws logs tail /aws/ecs/imobi-api --follow | grep ERROR

# 2. Check Sentry for stack trace
# 3. Identify affected endpoint
# 4. Check if it's a code issue or infrastructure

# Solutions
# If code issue:
git log --oneline | head -5
git revert [bad-commit]
git push origin main
# Wait for redeploy

# If infrastructure:
# - Restart service
# - Check resource limits
# - Scale up if needed
```

### Issue 2: Database Connection Timeout

```bash
# Diagnosis
ERROR: Database connection timeout after 30s

# Root causes
# 1. Too many connections
psql $DATABASE_URL -c "SELECT datname, numbackends FROM pg_stat_database WHERE datname='imbobi_production';"

# 2. Slow queries blocking connections
psql $DATABASE_URL -c "SELECT pid, query, state FROM pg_stat_activity;"

# 3. Network issue
ping [db-host]
nc -zv [db-host] 5432

# Solutions
# Kill idle connections
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state='idle';"

# Increase pool size
# Edit connection string: max_connections=100

# Optimize slow queries
EXPLAIN ANALYZE SELECT * FROM obra WHERE user_id = 'xyz';
```

### Issue 3: Memory Leak

```bash
# Diagnosis
Memory usage increasing without bound

# Identify if it's:
# 1. Cache growing unbounded
redis-cli -u $REDIS_URL INFO memory

# 2. Application memory
ps aux | grep node
# Check RSS column (Resident Set Size)

# 3. Database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Solutions
# Clear cache
redis-cli -u $REDIS_URL FLUSHDB

# Restart service
railway redeploy

# Add memory monitoring alert
# Sentry: Alert if memory > 500MB

# Long-term: Code review + fix leak
```

### Issue 4: Rate Limiting Triggered

```bash
# If legitimate users getting 429 Too Many Requests

# Check if it's DDoS
grep "429" /var/log/app.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10

# If single IP: Probably DDoS
# - Check CloudFlare/WAF for block rules
# - Review recent deployments
# - Check if legitimate high-traffic event

# If distributed: Probably users
# - Increase rate limit temporarily
# - Identify user segment
# - Optimize their client code

# Temporarily increase limit
# RATE_LIMIT_PER_MINUTE=200 (was 100)
# Redeploy
```

---

## Communication Templates

### Slack: Initial Alert

```
🚨 INCIDENT: API Response Time Degradation

Severity: P2
Started: 2026-06-23 14:32 UTC
Impact: 5% of requests > 5s

On-call investigating...
Updates every 5 minutes.

#imobi-incidents for details.
```

### Slack: In Progress

```
⏳ INCIDENT UPDATE

Status: Root cause identified (slow database query)
Working on: Optimizing query (ETA 10 min)

#imobi-incidents
```

### Slack: Resolved

```
✅ INCIDENT RESOLVED

Duration: 18 minutes
Root cause: N+1 query in credit simulator
Resolution: Database query optimization

Postmortem: Wednesday 10 AM
Thank you for patience!
```

### Email: Major Incident

```
Subject: Incident Report - API Outage (2026-06-23 14:32-14:40 UTC)

Dear [Customer Name],

We experienced a brief outage today from 14:32-14:40 UTC 
(8 minutes total).

Impact: API was unavailable during this window
Affected users: ~150
Cause: Database connection pool exhaustion
Resolution: Service restart

Action taken:
- Increased connection pool size to 50 (was 20)
- Added monitoring alert for connection pool usage
- Schedule code review for optimizations

We apologize for the disruption and appreciate your patience.

Questions? Contact us at support@imbobi.com.br

Best regards,
Imobi Engineering Team
```

---

## Testing Incident Response

### Monthly Incident Response Drill

```bash
#!/bin/bash
# 1st Thursday of month, 3 PM UTC

echo "Starting incident response drill..."

# Scenario: Simulated database outage
# - Block database access
# - Observe alert triggers
# - Execute recovery steps
# - Verify monitoring detects recovery

# Don't actually disrupt service, just test procedures
```

---

## External Dependencies & Fallbacks

| Service | Outage Impact | Fallback | Recovery |
|---------|---------------|----------|----------|
| **SendGrid** | Email delays | Queue locally | Retry hourly |
| **Firebase** | No push notifications | In-app only | Wait for recovery |
| **AWS S3** | Evidence upload blocked | Queue locally | Async upload |
| **Redis** | Cache miss (slow) | Use DB directly | Restart service |
| **PostgreSQL** | All features down | Restore from backup | 15-30 min |

---

## Success Metrics

Post-incident:
- MTTR (Mean Time To Repair) < 30 minutes
- Detection time < 5 minutes
- User notification < 10 minutes
- Root cause identified < 1 day
- Prevention measures implemented < 1 week

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-23
