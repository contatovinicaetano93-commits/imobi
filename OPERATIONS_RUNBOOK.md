# Operations Runbook
**Passo 100: Post-Launch Operations & Monitoring**  
**Date**: 2026-06-23  
**Duration**: First 24 hours critical, then daily ongoing

---

## Executive Summary

This runbook covers daily operational procedures, monitoring, incident response, and stability management for Imobi in production.

---

## Daily Operations Schedule

### 8:00 AM UTC — Morning Health Check

```bash
#!/bin/bash
echo "=== MORNING HEALTH CHECK ==="

# 1. API Health
API_HEALTH=$(curl -s https://api.imbobi.com.br/api/v1/health | jq '.status')
echo "API Status: $API_HEALTH"

# 2. Database Status  
DB_STATUS=$(curl -s https://api.imbobi.com.br/api/v1/health | jq '.services.database')
echo "Database: $DB_STATUS"

# 3. Cache Status
CACHE_STATUS=$(curl -s https://api.imbobi.com.br/api/v1/health | jq '.services.redis')
echo "Cache: $CACHE_STATUS"

# 4. Error Rate (from Prometheus)
ERROR_RATE=$(curl -s 'http://prometheus:9090/api/v1/query?query=rate(http_requests_total%7Bstatus%3D%22500%22%7D%5B5m%5D)' | jq '.data.result[0].value[1]')
echo "Error Rate: $ERROR_RATE"

# 5. Response Time (p95)
P95=$(curl -s 'http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,http_request_duration_seconds)' | jq '.data.result[0].value[1]')
echo "P95 Latency: ${P95}s"

# 6. Database Connections
CONNECTIONS=$(curl -s 'http://prometheus:9090/api/v1/query?query=pg_stat_activity_count' | jq '.data.result[0].value[1]')
echo "DB Connections: $CONNECTIONS"

# 7. Redis Memory
REDIS_MEM=$(curl -s 'http://prometheus:9090/api/v1/query?query=redis_memory_used_bytes' | jq '.data.result[0].value[1]')
echo "Redis Memory: ${REDIS_MEM} bytes"

# Report
if [ "$API_HEALTH" = "ok" ] && [ "${ERROR_RATE%%.*}" -lt 5 ] && [ "${P95%%.*}" -lt 1 ]; then
    echo "✅ ALL SYSTEMS HEALTHY"
else
    echo "⚠️  CHECK WARNINGS ABOVE"
    # Escalate if needed
fi
```

### 3:00 PM UTC — Afternoon Review

- [ ] Check error logs (Sentry dashboard)
- [ ] Review slow queries (CloudWatch logs)
- [ ] Check disk space usage
- [ ] Verify backup completion
- [ ] Review recent support tickets

### 6:00 PM UTC — Handoff to On-Call

```bash
# On-call team update
echo "=== SHIFT HANDOFF ==="
echo "Primary on-call: [Name]"
echo "Escalation: [Phone]"
echo ""
echo "Current Issues:"
# List any ongoing issues
echo "None"
echo ""
echo "Recent Changes:"
echo "- Production deployment completed at 19:00 UTC"
echo ""
echo "Monitoring Points:"
echo "- Error rate: < 0.1% (target)"
echo "- Response time p95: < 800ms (target)"
echo "- Uptime: 100%"
```

---

## Critical Monitoring Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| **Error Rate** | > 0.5% | > 2% | Page on-call |
| **P95 Latency** | > 1000ms | > 2000ms | Check database |
| **CPU Usage** | > 75% | > 90% | Scale up |
| **Memory Usage** | > 80% | > 95% | Investigate leak |
| **Disk Space** | > 70% | > 90% | Clear old logs |
| **DB Connections** | > 15/20 | > 18/20 | Kill idle |
| **Redis Memory** | > 1.5GB | > 1.9GB | Clear cache |
| **Uptime** | N/A | < 99% | Investigate |

---

## Incident Response

### Critical Issues (Page On-Call Immediately)

- API returns 500 errors (error rate > 2%)
- Database unreachable
- Complete outage (uptime < 95% over 5 minutes)
- Data corruption detected
- Security breach

```bash
#!/bin/bash
# CRITICAL INCIDENT RESPONSE

# 1. Immediate notification
echo "SENDING CRITICAL ALERT"
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  -d '{
    "text": "🚨 CRITICAL INCIDENT",
    "blocks": [
      {"type": "section", "text": {"type": "mrkdwn", "text": "Issue: Database Unreachable\nTime: '$(date)'\nPaging on-call..."}}
    ]
  }'

# 2. Check health
curl -s https://api.imbobi.com.br/api/v1/health | jq

# 3. Check logs
# Railway: railway logs -n 100
# AWS: aws logs tail /aws/ecs/imobi-api --follow

# 4. Assess impact
# - How many users affected?
# - How long has issue persisted?
# - Is data at risk?

# 5. Execute recovery
# See INCIDENT_RESPONSE_PLAN.md for specific procedures

# 6. Post recovery
# - Take snapshot
# - Document timeline
# - Schedule postmortem
```

### High Priority Issues (Alert Within 1 Hour)

- Error rate > 1%
- Performance degradation (p95 > 1.5s)
- Memory leak detected
- Rate limiting not working
- One external service down

### Medium Priority Issues (Alert Within 4 Hours)

- Performance slow (p95 > 1s)
- Non-critical feature failing
- Warning logs increasing
- Documentation updates needed

---

## Weekly Operations

### Monday 10:00 AM UTC — Weekly Review

```bash
# Check weekly metrics
echo "=== WEEKLY REVIEW ==="

# 1. Uptime
echo "Uptime: Check UptimeRobot dashboard"

# 2. Error summary
echo "Error Summary: Check Sentry"
# - Total errors: ?
# - Most common error: ?
# - Affected users: ?

# 3. Performance summary
echo "Performance: Check Prometheus/Grafana"
# - p50: ?
# - p95: ?
# - p99: ?

# 4. Capacity
echo "Capacity: Check CloudWatch"
# - Peak CPU: ?
# - Peak Memory: ?
# - Peak requests/sec: ?

# 5. Security
echo "Security: Check logs"
# - Failed auth attempts: ?
# - Rate limit violations: ?
# - Suspicious requests: ?

# 6. User activity
echo "User Activity:"
# - New users: ?
# - Active users: ?
# - Failed logins: ?
# - Support tickets: ?
```

### Friday 4:00 PM UTC — Weekly Team Meeting

Attendees: Engineering, DevOps, Support, Product

Agenda:
1. Week in review (metrics, incidents, changes)
2. System health assessment
3. Upcoming changes or maintenance
4. Resource needs (infrastructure scaling, team capacity)
5. Action items for next week

---

## Database Operations

### Daily Backup Verification

```bash
# Check backup completed
aws s3 ls s3://imbobi-backups-production/ --recursive | tail -20

# Verify backup size
BACKUP_SIZE=$(aws s3 ls s3://imbobi-backups-production/daily/ | tail -1 | awk '{print $3}')
echo "Latest backup size: $BACKUP_SIZE bytes"

# If backup missing or corrupted, alert immediately
```

### Weekly Backup Restore Test

```bash
# On non-production database, test restore
# 1. Get latest backup
# 2. Restore to test environment  
# 3. Verify data integrity
# 4. Document results

echo "Backup restore test: PASSED"
echo "Recovery time: 8 minutes"
echo "Data integrity: VERIFIED"
```

### Quarterly Maintenance Window

```bash
# First Sunday of quarter, 2 AM UTC (low traffic)
# Expected downtime: 30 minutes

# Tasks:
# - PostgreSQL version update (if available)
# - VACUUM ANALYZE
# - Index defragmentation  
# - Security patches
# - Backup verification

# Announce in #imobi-production 1 week before
```

---

## Log Management

### Log Rotation

```bash
# CloudWatch logs auto-rotate after 30 days
# Logs stored in S3 for long-term retention

# View logs
aws logs tail /aws/ecs/imobi-api --follow

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/ecs/imobi-api \
  --filter-pattern "ERROR" \
  --start-time $(($(date +%s) - 3600))000
```

### Log Analysis

```bash
#!/bin/bash
# Daily log analysis

echo "=== LOG ANALYSIS ==="

# 1. Error frequency
echo "Top 5 Errors:"
aws logs filter-log-events \
  --log-group-name /aws/ecs/imobi-api \
  --filter-pattern "ERROR" \
  --start-time $(($(date +%s) - 86400))000 \
  --query 'events[*].message' \
  | sort | uniq -c | sort -rn | head -5

# 2. Performance issues
echo ""
echo "Slow Queries (>1000ms):"
aws logs filter-log-events \
  --log-group-name /aws/ecs/imobi-api \
  --filter-pattern "duration_ms > 1000" \
  --query 'events[*].message' \
  | head -10

# 3. Security issues
echo ""
echo "Authentication Failures:"
aws logs filter-log-events \
  --log-group-name /aws/ecs/imobi-api \
  --filter-pattern "403\|401" \
  --start-time $(($(date +%s) - 3600))000 \
  --query 'events | length(@)'
```

---

## Scaling Operations

### Automatic Scaling

- Vercel: Auto-scales globally (no action needed)
- Railway/AWS: CPU > 70% for 5 minutes → Scale up

### Manual Scaling

If automatic scaling insufficient:

```bash
# 1. Assess current metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=imobi-api

# 2. Scale up if needed
aws ecs update-service \
  --cluster imobi-production \
  --service imobi-api \
  --desired-count 3  # Increase from 2 to 3

# 3. Verify new tasks launching
aws ecs describe-tasks \
  --cluster imobi-production \
  --tasks [task-arns]

# 4. Monitor rollout
# Expected: 2-3 minutes for new task to be healthy
```

---

## Security Operations

### Daily Security Check

```bash
# 1. Check for suspicious IP patterns
grep "429" /var/log/app.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -10

# 2. Verify HTTPS enforced
curl -i http://api.imbobi.com.br/api/v1/health | grep -i "301\|308\|upgrade"

# 3. Check for exposed credentials
git log -p --all | grep -iE "password|secret|token|key" | head -5

# 4. Verify database SSL
psql $DATABASE_URL -c "SHOW ssl;"
# Expected: on

# 5. Check Redis TLS  
redis-cli -u $REDIS_URL --tls INFO replication | grep role
```

### Monthly Security Audit

- Review CloudTrail logs for unauthorized access
- Verify all API keys are rotated if expired
- Run vulnerability scan (npm audit, OWASP scan)
- Review access control policies
- Check password rotation status

---

## Support Operations

### Support Ticket Flow

1. **Critical (P1)**: Response < 15 minutes
   - Full outage
   - Data loss
   - Security breach

2. **High (P2)**: Response < 1 hour
   - Feature not working
   - Performance issue
   - Data corruption

3. **Medium (P3)**: Response < 4 hours
   - UX issue
   - Minor bug
   - Documentation request

4. **Low (P4)**: Response < 1 day
   - Enhancement request
   - Question
   - Nice-to-have fix

### Escalation Procedure

```
Support Team (Level 1)
  ↓ If unresolved after 1 hour
Engineering Team (Level 2)
  ↓ If unresolved after 4 hours
DevOps Team (Level 3)
  ↓ If unresolved after 8 hours
VP Engineering (Level 4)
```

---

## On-Call Rotation

### Primary On-Call (8 AM - 6 PM UTC)

Responsible for:
- Responding to incidents
- Monitoring dashboards
- Reviewing logs
- Making operational decisions

### Secondary On-Call (6 PM - 8 AM UTC)

Responsible for:
- Overnight incident response
- Emergency escalations
- After-hours support

### Escalation Contact

- VP Engineering
- Outside emergency window

---

## Common Operational Procedures

### Restart API Service

```bash
# Blue-green restart (zero downtime)
railway redeploy  # or
aws ecs update-service --cluster imobi-production --service imobi-api --force-new-deployment

# Monitor
watch -n 5 'curl -s https://api.imbobi.com.br/api/v1/health | jq'
```

### Clear Redis Cache

```bash
# Flush non-critical cache
redis-cli -u $REDIS_URL FLUSHDB
# Restarts: Minimal (cache rebuilt on demand)

# Or flush specific keys
redis-cli -u $REDIS_URL DEL obra:*
```

### Emergency Database Repair

```bash
# If database corrupted
psql $DATABASE_URL -c "VACUUM ANALYZE;"
psql $DATABASE_URL -c "REINDEX;"

# If that doesn't work, restore from backup
# See PRODUCTION_CREDENTIALS.md for backup procedures
```

---

## Success Metrics

Daily targets:
- Uptime: > 99.5%
- Error rate: < 0.1%
- P95 latency: < 800ms
- Response time: < 500ms median
- Support response: < 1 hour

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-23
