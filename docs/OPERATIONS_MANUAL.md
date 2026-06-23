# Operations Manual — Imobi Fintech Production System

**Document Type**: Day-2 Operations Guide  
**Audience**: DevOps, SRE, On-Call Engineers  
**Last Updated**: June 23, 2026

---

## Quick Reference

### Emergency Contacts

| Role | Contact | Channel |
|------|---------|---------|
| On-Call Eng | TBD | Slack: @oncall |
| DevOps Lead | TBD | Slack: #imobi-ops |
| Database Admin | TBD | Slack: #database |
| Security Team | TBD | Email: security@... |
| CEO/Stakeholders | TBD | Slack: #executive |

### Critical Dashboards

| System | URL | Alert Method |
|--------|-----|--------------|
| Sentry (Errors) | https://sentry.io/organizations/imobi/ | Slack + Email |
| Railway (Infra) | https://railway.app | Dashboard |
| Vercel (Frontend) | https://vercel.com/dashboard | Email |
| UptimeRobot | https://uptimerobot.com | Email + Slack |
| New Relic (APM) | https://one.newrelic.com | Dashboard |

### Critical URLs

| Service | URL | Status Check |
|---------|-----|--------------|
| Frontend | https://imobi.com.br | Should return HTML |
| API | https://api.imobi.com.br/api/v1/health | Should return 200 OK |
| Swagger Docs | https://api.imobi.com.br/docs | Should show API spec |
| Metrics | https://api.imobi.com.br/metrics | Prometheus format |

---

## Incident Response Procedures

### Severity Levels

| Level | Definition | Response Time | Example |
|-------|-----------|----------------|---------|
| **P1** | Service Down | 5 minutes | API not responding, Database unreachable |
| **P2** | Degraded | 15 minutes | High latency (>1s), Errors >5% |
| **P3** | Minor Issue | 1 hour | Warnings in logs, Performance issue |
| **P4** | Enhancement | Next day | Feature request, Documentation |

### P1 Incident: API Service Down

**Goal**: Restore service within 5 minutes

**Step 1: Verify the issue (30 seconds)**
```bash
# Check health endpoint
curl -s -I https://api.imobi.com.br/api/v1/health

# Expected: HTTP 200
# If not: proceed to Step 2
```

**Step 2: Check service status (1 minute)**
```bash
# Option A: Via Railway Dashboard
# 1. Go to https://railway.app
# 2. Select imobi-api-prod
# 3. Check Status tab
# 4. Look for error messages

# Option B: Via CLI
railway logs --service imobi-api-prod --tail 50
```

**Step 3: Identify root cause (2 minutes)**

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Connection refused` | Port not listening | Restart service |
| `Error: ECONNREFUSED database` | Database down | Check DB in Railway |
| `Error: Redis timeout` | Redis unavailable | Check Redis service |
| `OutOfMemory` | Memory leak | Increase memory, restart |
| `TypeError in middleware` | Deployment issue | Check latest logs |

**Step 4: Take action (2 minutes)**

```bash
# Option 1: Restart service (80% of issues resolved)
railway redeploy --service imobi-api-prod
# Wait 2-3 minutes for restart

# Option 2: Scale up (if memory issue)
# Via Railway Dashboard:
# 1. imobi-api-prod → Settings
# 2. Update Memory: 512MB → 1GB
# 3. Save and redeploy

# Option 3: Rollback to previous version
git checkout v1.0.0
git push origin v1.0.0
# CI/CD will trigger automatic redeploy

# Option 4: Restore database (if data corruption)
gunzip -c s3://imobi-backups/imobi_TIMESTAMP.sql.gz | \
  psql $DATABASE_URL
```

**Step 5: Verify recovery (1 minute)**
```bash
# Health check every 30 seconds
while true; do
  curl -s -I https://api.imobi.com.br/api/v1/health
  sleep 30
done

# Once 200 OK: continue
```

**Step 6: Post-incident (within 30 minutes)**
1. Notify team in Slack: "API recovered, incident over"
2. Document in incident log
3. Schedule post-mortem within 24 hours
4. Create follow-up tasks

### P2 Incident: High Error Rate

**Goal**: Reduce error rate below 1% within 15 minutes

**Step 1: Check Sentry dashboard**
```
https://sentry.io/organizations/imobi/issues/
```

**Step 2: Identify error pattern**
- All endpoints affected or just one?
- Database or application error?
- Specific user or all users?

**Step 3: Common fixes**

| Error | Fix |
|-------|-----|
| `Database connection pool exhausted` | Increase pool size: `DATABASE_POOL_SIZE=20` |
| `Rate limit exceeded` | Check if legitimate spike, increase limit if needed |
| `OutOfMemory in workers` | Restart BullMQ workers |
| `Redis timeout` | Check Redis memory, clear cache |
| `Sentry integration errors` | Disable temporarily: `SENTRY_ENABLED=false` |

**Step 4: Monitor improvement**
```
Sentry → Stats
Expected: Error rate drops to <1% within 5 minutes
```

---

## Common Operations

### Daily Operations (5 minutes)

**Every morning**:

```bash
# 1. Check uptime
curl -s https://api.imobi.com.br/api/v1/health | jq .status

# 2. Check error rate (should be <0.5%)
curl -s https://api.imobi.com.br/metrics | grep http_requests_total

# 3. Check recent errors in Sentry
# Dashboard: https://sentry.io → Releases

# 4. Check database backups completed
aws s3 ls s3://imobi-backups/ --recursive | tail -5
```

### Weekly Operations (15 minutes)

**Every Monday morning**:

```bash
# 1. Review performance metrics
# New Relic: https://one.newrelic.com/all-capabilities

# 2. Check slow query logs
psql $DATABASE_URL -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 3. Review logs for warnings
railway logs --service imobi-api-prod --level warn | tail -20

# 4. Verify backups are restorable
# Test restore to staging database

# 5. Review security audit logs
# Check for unauthorized access attempts
```

### Monthly Operations (1 hour)

**First day of month**:

1. **Security patching**
   ```bash
   pnpm outdated
   pnpm update
   npm audit fix
   git commit -m "chore: security updates"
   git push origin main
   ```

2. **Database maintenance**
   ```bash
   # Analyze query performance
   psql $DATABASE_URL -c "ANALYZE;"
   
   # Vacuum to reclaim space
   psql $DATABASE_URL -c "VACUUM ANALYZE;"
   
   # Check index usage
   psql $DATABASE_URL -c "SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan;"
   ```

3. **Capacity planning**
   ```bash
   # Check disk usage
   psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('imobi_prod'));"
   
   # Check Redis memory
   redis-cli -u $REDIS_URL INFO memory
   
   # Check API server resources
   # Railway Dashboard: Metrics tab
   ```

4. **Disaster recovery drill**
   - Practice database restore
   - Test API rollback procedure
   - Document recovery times
   - Update runbooks

---

## Service Management

### Restart API Service

**Via Railway Dashboard**:
```
1. https://railway.app
2. Select imobi-api-prod
3. Click "..." menu → "Redeploy"
4. Wait for status: "Deployed"
```

**Via CLI**:
```bash
railway redeploy --service imobi-api-prod
```

**Verify**:
```bash
# Poll health endpoint until 200 OK
for i in {1..30}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.imobi.com.br/api/v1/health)
  echo "Attempt $i: $STATUS"
  if [ "$STATUS" = "200" ]; then
    echo "✅ Service recovered"
    break
  fi
  sleep 10
done
```

### Scale API Horizontally

**Goal**: Handle increased traffic

**Step 1: Monitor current load**
```bash
# Check metrics
curl -s https://api.imobi.com.br/metrics | grep http_requests_total

# Check response time
curl -s https://api.imobi.com.br/metrics | grep http_request_duration_seconds_sum

# If p95 latency > 500ms: scale up
```

**Step 2: Increase replicas**

Via Railway Dashboard:
```
1. imobi-api-prod → Deploy
2. Replicas: 1 → 2 (or higher)
3. Save
4. Wait for both instances to show "Deployed"
```

**Step 3: Verify load distribution**
```bash
# Monitor metrics over next 5 minutes
watch -n 5 'curl -s https://api.imobi.com.br/metrics | grep http_request_duration_seconds'
```

### Scale Database

**Goal**: Handle increased data volume

**Step 1: Monitor database size**
```bash
# Current size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('imobi_prod'));"

# Expected growth: ~100MB/month
```

**Step 2: If approaching limit**

Via Railway Dashboard:
```
1. imobi-postgres → Settings
2. Storage: Upgrade plan
3. Save (requires ~5 minute downtime)
```

**Step 3: Add read replica (for queries)**

Via Railway:
```
1. imobi-postgres → Settings
2. Click "Add Replica"
3. Configure as read-only
4. Update API connection pooling
```

---

## Database Operations

### Regular Maintenance

**Monthly maintenance window** (Sunday 2 AM, 30-min downtime):

```bash
# 1. Vacuum
psql $DATABASE_URL -c "VACUUM FULL;"

# 2. Analyze
psql $DATABASE_URL -c "ANALYZE;"

# 3. Reindex (if needed)
psql $DATABASE_URL -c "REINDEX DATABASE imobi_prod;"
```

### Backup & Restore

#### Backup Procedure

**Daily automatic backup** (Railway/Render):
- ✅ Configured automatically
- ✅ Retains 7-30 days
- ✅ Stored in provider's region

**Manual backup** (for important changes):
```bash
# Create backup
pg_dump $DATABASE_URL | gzip > imobi_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Verify backup
gzip -t imobi_backup_*.sql.gz && echo "✅ Backup valid"

# Upload to S3 (optional)
aws s3 cp imobi_backup_*.sql.gz s3://imobi-backups/
```

#### Restore Procedure

**From Railway automatic backup**:
```
1. Railway Dashboard → imobi-postgres → Backups
2. Select date/time to restore to
3. Click "Restore"
4. Wait 5-10 minutes
5. Verify connection
```

**From manual backup**:
```bash
# Restore compressed backup
gunzip -c imobi_backup_TIMESTAMP.sql.gz | psql $DATABASE_URL

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM usuarios;"
```

### Query Performance

**Find slow queries**:
```bash
# Enable slow query logging
psql $DATABASE_URL -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
psql $DATABASE_URL -c "SELECT pg_reload_conf();"

# View slow queries
psql $DATABASE_URL -c "
SELECT query, calls, mean_time
FROM pg_stat_statements
WHERE query NOT LIKE 'autovacuum%'
ORDER BY mean_time DESC
LIMIT 10;
"
```

**Add index for slow query**:
```bash
# Example: Add index on frequently filtered field
psql $DATABASE_URL -c "
CREATE INDEX idx_obras_usuario_id ON obras(usuario_id)
WHERE status = 'ativa';
"

# Verify index is used
psql $DATABASE_URL -c "ANALYZE; EXPLAIN SELECT * FROM obras WHERE usuario_id = 123;"
```

---

## Cache & Queue Management

### Redis Operations

**Check memory usage**:
```bash
redis-cli -u $REDIS_URL INFO memory | grep used_memory_human
```

**Clear all cache**:
```bash
# ⚠️ Warning: Clears all sessions and queued jobs!
redis-cli -u $REDIS_URL FLUSHALL
```

**Clear specific pattern**:
```bash
# Clear all sessions
redis-cli -u $REDIS_URL --scan | grep "session:" | xargs redis-cli DEL

# Clear all cache
redis-cli -u $REDIS_URL --scan | grep "cache:" | xargs redis-cli DEL
```

### BullMQ Queue Management

**Monitor queue status**:
```bash
# Via API health endpoint
curl -s https://api.imobi.com.br/api/v1/admin/queues | jq .

# Expected output:
# {
#   "queues": {
#     "liberacao-parcela": { "pending": 5, "active": 2, "failed": 0 },
#     "envio-notificacao": { "pending": 15, "active": 1, "failed": 3 }
#   }
# }
```

**Clear failed jobs**:
```bash
# Via API (requires admin token)
curl -X POST https://api.imobi.com.br/api/v1/admin/queues/clear-failed \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Restart stalled jobs**:
```bash
# Via Redis directly
redis-cli -u $REDIS_URL --scan | grep "stalled" | xargs redis-cli DEL
```

---

## Monitoring & Alerts

### Setup Monitoring

#### Sentry (Error Tracking)

1. **Already configured** in deployed API
2. Check dashboard: https://sentry.io/organizations/imobi/
3. Set alert rules:
   - Alert on any error
   - Digest: every 10 minutes
   - Channels: Slack + Email

#### UptimeRobot (Uptime Monitoring)

1. Go to https://uptimerobot.com
2. Monitors configured:
   - API health: `https://api.imobi.com.br/api/v1/health`
   - Frontend: `https://imobi.com.br`
3. Alert if down >1 minute
4. Channels: Slack + Email

#### New Relic (APM - Optional)

1. Already configured (see .env.production)
2. Dashboard: https://one.newrelic.com
3. Key metrics:
   - Response time (target: <500ms p95)
   - Error rate (target: <1%)
   - Throughput (requests/minute)

### Reading Dashboards

**Sentry Errors**:
- **Red**: Critical errors (app crashes)
- **Yellow**: Warnings (degradation)
- **Blue**: Info (tracking events)

**Prometheus Metrics**:
- `http_requests_total` - Request count
- `http_request_duration_seconds` - Latency
- `database_query_duration_seconds` - Query time
- `cache_hit_ratio` - Cache efficiency

**New Relic**:
- Apdex score (target: >0.95)
- Golden signals: Latency, Traffic, Errors, Saturation

---

## Troubleshooting

### Symptom: High Error Rate

**Diagnosis**:
```bash
# 1. Check Sentry
# https://sentry.io → Releases

# 2. Check logs
railway logs --service imobi-api-prod --tail 100 | grep ERROR

# 3. Check metrics
curl -s https://api.imobi.com.br/metrics | grep http_requests_total
```

**Common causes**:
- Database connection issue
- Redis timeout
- External API failure
- Memory leak

**Solutions**:
1. Check database status
2. Restart API service
3. Scale up resources
4. Check circuit breaker status

### Symptom: High Latency

**Diagnosis**:
```bash
# Check response time
curl -w "@curl-format.txt" -o /dev/null -s https://api.imobi.com.br/api/v1/health

# Check database
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check Redis
redis-cli -u $REDIS_URL INFO stats
```

**Solutions**:
1. Run database VACUUM ANALYZE
2. Add indexes for slow queries
3. Increase API replicas
4. Clear Redis cache

### Symptom: Database Connection Errors

**Diagnosis**:
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pooling
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Check max connections
psql $DATABASE_URL -c "SHOW max_connections;"
```

**Solutions**:
1. Increase `max_connections` in Railway/Render
2. Reduce API replicas if overloading DB
3. Implement connection pooling (PgBouncer)
4. Restart database service

### Symptom: Redis Timeout

**Diagnosis**:
```bash
# Test Redis
redis-cli -u $REDIS_URL PING

# Check memory
redis-cli -u $REDIS_URL INFO memory

# Check slowlog
redis-cli -u $REDIS_URL SLOWLOG GET 10
```

**Solutions**:
1. Increase memory allocation
2. Clear old cache: `FLUSHALL`
3. Restart Redis service
4. Check if using too much for queuing

---

## Security Operations

### Access Control

**SSH Access** (if direct server access needed):
```bash
# Add team member's public key
echo "ssh-rsa AAAA..." >> ~/.ssh/authorized_keys

# Revoke access
ssh-keygen -R api.imobi.com.br
```

**Database Access** (production):
- Restricted to DevOps team only
- All access logged
- SSL required

**API Key Management**:
- Rotate JWT_SECRET quarterly
- Rotate AWS access keys quarterly
- Audit all generated tokens monthly

### Security Audit

**Monthly security checklist**:

```bash
# 1. Check for exposed secrets in git
git log -S "password" --all --oneline | head -5

# 2. Review IAM permissions
aws iam list-users
aws iam list-access-keys --user-name imobi-api

# 3. Check SSL certificates
echo | openssl s_client -servername api.imobi.com.br -connect api.imobi.com.br:443 | \
  openssl x509 -noout -dates

# 4. Review database user permissions
psql $DATABASE_URL -c "SELECT usename, usesuper, usecreatedb FROM pg_user;"

# 5. Check for failed login attempts
# Check logs: railway logs --service imobi-api-prod | grep "authentication failed"
```

### Incident Response

**Security Incident** (Data breach, unauthorized access):

1. **Immediate** (within 1 hour):
   - Isolate affected systems
   - Preserve logs (don't delete)
   - Notify security team
   - Activate incident response team

2. **Short-term** (within 24 hours):
   - Complete forensic analysis
   - Identify scope of breach
   - Reset compromised credentials
   - Notify affected users

3. **Follow-up** (within 1 week):
   - Post-mortem meeting
   - Document lessons learned
   - Implement fixes
   - Update security procedures

---

## Documentation & Runbooks

### Key Documents Location

| Document | Location | Purpose |
|----------|----------|---------|
| Architecture | `docs/ARCHITECTURE_RESILIENCE_API_FIRST.md` | System design |
| Deployment | `docs/PRODUCTION_DEPLOYMENT_COMPLETE.md` | Deploy procedures |
| API Endpoints | `docs/API_ENDPOINTS.md` | API reference |
| Incident Response | `docs/INCIDENT_RESPONSE_INDEX.md` | Incident procedures |
| Runbooks | `docs/RUNBOOKS/` | Step-by-step guides |

### Creating Runbooks

**Template for new runbook** (`docs/RUNBOOKS/my-runbook.md`):

```markdown
# [Issue Name] Runbook

## Symptoms
- [What the user sees]
- [What appears in logs]

## Diagnosis
```bash
# Commands to verify the issue
```

## Resolution
1. Step 1
2. Step 2
3. Verify

## Prevention
- What to monitor
- Alert thresholds
```

---

## Change Management

### Deploying Changes

**Safe deployment process**:

1. **Develop** on feature branch
2. **Test** locally and in staging
3. **Review** (code review + QA)
4. **Merge** to main branch
5. **CI/CD** automatically deploys to production
6. **Monitor** for errors (first 30 minutes)
7. **Rollback** if critical errors

**Rollback procedure**:

```bash
# If deployment causes issues within 1 hour:

# 1. Revert the problematic commit
git revert HEAD -m 1

# 2. Push to main (triggers auto-deploy)
git push origin main

# 3. Wait for deployment (2-3 minutes)

# 4. Verify service recovered
curl -s https://api.imobi.com.br/api/v1/health

# 5. Create incident report
# Document what went wrong and why
```

### Feature Flags

**For safer deployments**:

```typescript
// Enable feature only for internal users
if (process.env.FEATURE_NEW_APPROVAL_FLOW === 'true' && 
    user.email.endsWith('@imobi.com.br')) {
  // New feature
} else {
  // Old behavior
}
```

**Toggle via environment variable**:
```bash
# Disable broken feature immediately
FEATURE_NEW_APPROVAL_FLOW=false railway redeploy --service imobi-api-prod
```

---

## Training & Handoff

### Onboarding New Team Member

1. **Day 1**: Access setup
   - GitHub access
   - Railway/Render account
   - Sentry account
   - Database credentials

2. **Day 2**: Shadowing
   - Follow senior engineer's shifts
   - Learn dashboards
   - Learn alert procedures

3. **Day 3**: Hands-on
   - Handle minor incidents
   - Practice rollback
   - Practice deployment

4. **Day 5**: Full responsibility
   - Ready for on-call

### Knowledge Base

**Required reading**:
- [ ] PRODUCTION_DEPLOYMENT_COMPLETE.md (2 hours)
- [ ] ARCHITECTURE_RESILIENCE_API_FIRST.md (1 hour)
- [ ] INCIDENT_RESPONSE_INDEX.md (30 min)
- [ ] OPERATIONS_MANUAL.md (this document)

**Hands-on practice**:
- [ ] Deploy change to production
- [ ] Restart API service
- [ ] Restore database from backup
- [ ] Handle mock P1 incident

---

## Appendix: Quick Commands

```bash
# === HEALTH CHECKS ===
curl -s https://api.imobi.com.br/api/v1/health | jq .
curl -s https://api.imobi.com.br/metrics | head -20

# === SERVICE MANAGEMENT ===
railway logs --service imobi-api-prod --tail 100
railway redeploy --service imobi-api-prod

# === DATABASE ===
psql $DATABASE_URL -c "SELECT 1;"
pg_dump $DATABASE_URL | gzip > backup.sql.gz

# === REDIS ===
redis-cli -u $REDIS_URL PING
redis-cli -u $REDIS_URL INFO memory

# === MONITORING ===
curl -s https://sentry.io/api/0/organizations/imobi/stats/ \
  -H "Authorization: Bearer $SENTRY_TOKEN"

# === DEPLOYMENT ===
git log --oneline -5
git push origin main  # Triggers CI/CD
```

---

**For urgent issues**: Page on-call engineer  
**For questions**: Check PRODUCTION_DEPLOYMENT_COMPLETE.md  
**For incidents**: See INCIDENT_RESPONSE_INDEX.md

**Last Updated**: June 23, 2026  
**Next Review**: August 23, 2026
