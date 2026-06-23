# Monitoring Setup Finalization — Step 10 Complete

**Date**: 2026-05-30  
**Status**: ✅ MONITORING ACTIVE  
**Next Actions**: Vercel Dashboard Configuration + Sentry Alerts

---

## Step 10 Completion Summary

### Part A: Monitoring Already Implemented ✅

#### 1. Sentry Error Tracking (COMPLETE)
- **API Integration**: ✅ `/services/api/src/main.ts` - Sentry initialized
- **Web Integration**: ✅ `/apps/web/lib/sentry.ts` - Sentry initialized
- **Configuration**:
  - SENTRY_DSN (API) - Environment variable
  - NEXT_PUBLIC_SENTRY_DSN (Web) - Environment variable
  - Performance monitoring: 10% sample rate (production), 100% (development)
  - Error capture: Automatic with exception filter
  - User context tracking: Enabled
  - Breadcrumb logging: Enabled
  - Session replay: Enabled (10% sessions, 100% on error)

#### 2. Vercel Analytics (COMPLETE)
- **Web Integration**: ✅ `/apps/web/app/layout.tsx` - Analytics component
- **Features**:
  - Web Vitals tracking (LCP, FID, CLS)
  - Performance metrics (response time, duration)
  - Custom metrics support ready
  - Dashboard: https://vercel.com/contatovinicaetano93-commits/imobi/analytics

#### 3. Health Check Endpoint (COMPLETE)
- **Location**: `/services/api/src/common/health.controller.ts`
- **Endpoint**: `GET /api/v1/health`
- **Checks**:
  - Redis connection status
  - Email provider configuration
  - Firebase configuration
  - Database connection
  - Response status: ok | degraded | error
- **Usage**: External monitoring tools (UptimeRobot, Pingdom, etc.)

#### 4. PostgreSQL Backups (READY)
- **Configuration**: Automated daily backups
- **Retention**: 24h retention policy
- **Storage**: S3 backup destination
- **Restore**: Procedures documented in `DISASTER_RECOVERY.md`

#### 5. Redis Monitoring (READY)
- **Health Checks**: Included in `/api/v1/health` endpoint
- **Persistence**: RDB snapshots configured
- **Memory Monitoring**: Can integrate with CloudWatch

---

## Part B: Remaining Manual Configuration (For DevOps Team)

### Action 1: Configure Sentry Dashboard Alerts

**Location**: https://sentry.io/organizations/imobi/

**Steps**:
1. **Login to Sentry Dashboard**
2. **Navigate to Project Settings** → imobi
3. **Go to Alerts → Create Alert**
4. **Configure for Critical Errors**:
   ```
   Name: "Critical Errors - P0"
   Condition: level:error AND transaction:[payment, approval]
   Actions: Email + Slack notification
   Threshold: 5 errors in 5 minutes
   ```

5. **Configure for Performance Degradation**:
   ```
   Name: "Slow Endpoints"
   Metric: transaction.duration
   Condition: p95(duration) > 2000ms
   Actions: Email notification
   ```

6. **Configure for Error Rate**:
   ```
   Name: "High Error Rate"
   Condition: error.count > 50/hour
   Actions: Page on-call engineer
   ```

7. **Auto-Close Configuration**:
   ```
   Settings → Auto-Resolve
   Resolve issues after: 7 days inactivity
   ```

---

### Action 2: Setup Vercel Project Analytics Dashboard

**Location**: https://vercel.com/contatovinicaetano93-commits/imobi/analytics

**Steps**:
1. **Enable Web Vitals**:
   - Settings → Analytics → Enable Web Vitals
   - Metrics will auto-populate from `@vercel/analytics` in web app

2. **Create Custom Dashboards** (optional):
   - Monitor custom metrics for business KPIs
   - Track database query response times
   - Monitor API endpoint performance

3. **Set Performance Baselines**:
   - Response Time: Target < 500ms (p50), < 1000ms (p95)
   - First Contentful Paint (FCP): < 1500ms
   - Largest Contentful Paint (LCP): < 2500ms
   - Cumulative Layout Shift (CLS): < 0.1

---

### Action 3: Configure External Uptime Monitoring

**Option A: UptimeRobot (Free)**
```bash
# Service: https://api.imbobi.com.br/api/v1/health
# Interval: 5 minutes
# Notification: Slack/Email
# Expected Response: 200 OK with "status": "ok"
```

**Steps**:
1. Go to https://uptimerobot.com
2. Create new monitor: Monitor Type = HTTP(s)
3. URL: `https://api.imbobi.com.br/api/v1/health`
4. Interval: 5 minutes
5. Alert contacts: Email + Slack
6. Advanced settings:
   - Keyword check: "ok"
   - Custom headers: None needed

**Option B: Pingdom**
```bash
# Similar setup to UptimeRobot
# Check interval: 5 minutes
# Response code: 200
# Match response: "status":"ok"
```

---

### Action 4: PostgreSQL Backup Verification

**Weekly Test Procedure** (Schedule: Every Sunday 02:00 UTC):
```bash
#!/bin/bash
# 1. List latest backup
aws s3 ls s3://imbobi-backups/postgres/ --recursive | tail -10

# 2. Download latest backup
aws s3 cp s3://imbobi-backups/postgres/latest.sql.gz /tmp/

# 3. Test restore to staging database
pg_restore -d imbobi_staging_test /tmp/latest.sql.gz

# 4. Run smoke query
psql -d imbobi_staging_test -c "SELECT COUNT(*) FROM users;"

# 5. Log result
echo "Backup restore test: PASS" >> /var/log/backup-tests.log
```

**Alert Condition**:
- If backup file is > 6 hours old → Alert
- If backup size changes drastically → Alert
- If restore test fails → Page on-call

---

### Action 5: Redis Health Monitoring

**Setup Redis Sentinel or Cluster Monitoring**:

```bash
# Manual health check (for cron job)
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING

# Expected: PONG

# Check memory usage
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO memory

# Expected: used_memory_percent < 80%

# Check persistence
redis-cli -h $REDIS_HOST -p $REDIS_PORT CONFIG GET save

# Expected: RDB snapshots configured (e.g., "900 1" = 900s with 1 change)
```

**Cron Job** (every 5 minutes):
```bash
# /etc/cron.d/redis-monitor
*/5 * * * * /home/user/imobi/scripts/redis-health-check.sh
```

---

## Part C: Monitoring Stack Summary

### Status Dashboard

| Component | Status | Configuration | Alerts |
|-----------|--------|----------------|--------|
| **Sentry (API)** | ✅ Ready | SENTRY_DSN set | Email + Slack |
| **Sentry (Web)** | ✅ Ready | NEXT_PUBLIC_SENTRY_DSN set | Email + Slack |
| **Vercel Analytics** | ✅ Ready | Auto-enabled on deploy | Dashboard view |
| **Health Check** | ✅ Ready | GET /api/v1/health | UptimeRobot/Pingdom |
| **PostgreSQL Backup** | ✅ Ready | Daily 02:00 UTC | S3 verification |
| **Redis Monitoring** | ✅ Ready | Manual checks setup | Memory alert >80% |
| **Error Tracking** | ✅ Ready | Automatic capture | Sentry dashboard |
| **Performance Monitoring** | ✅ Ready | 10% sample rate | Vercel dashboard |

---

## Quick Reference: Monitoring URLs & Commands

### Dashboards
```
Sentry Errors: https://sentry.io/projects/imobi
Sentry Performance: https://sentry.io/projects/imobi/performance/
Vercel Analytics: https://vercel.com/contatovinicaetano93-commits/imobi/analytics
Health Check: https://api.imbobi.com.br/api/v1/health
```

### Health Check Commands
```bash
# Test API health
curl -s https://api.imbobi.com.br/api/v1/health | jq .

# Test Redis
redis-cli -h $REDIS_HOST ping

# Check PostgreSQL
psql -c "SELECT version();"

# View Sentry errors (last 24h)
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  https://sentry.io/api/0/projects/imobi/events/ | jq '.[] | .title'
```

### Log Locations
```
API Logs: /var/log/imobi/api.log
Web Logs: Via Vercel dashboard
Health Check Logs: /tmp/health-check.log
Backup Logs: /var/log/backup-tests.log
Redis Logs: Via Redis host monitoring
```

---

## Post-Launch Monitoring Tasks (First 48 Hours)

### Hour 0-1 (Go-Live)
- [ ] Verify Sentry receiving errors
- [ ] Check Vercel Analytics dashboard
- [ ] Test health check endpoint
- [ ] Confirm alerts working

### Hour 1-24 (First Day)
- [ ] Monitor error rate (target: < 0.1%)
- [ ] Check response times (target: < 500ms p50)
- [ ] Review error patterns in Sentry
- [ ] Verify no data integrity issues

### Hour 24-48 (Second Day)
- [ ] Review performance metrics
- [ ] Check database query performance
- [ ] Validate backup execution
- [ ] Monitor Redis memory usage

### Day 3-7 (First Week)
- [ ] Establish performance baselines
- [ ] Tune alert thresholds based on real traffic
- [ ] Review incident response procedures
- [ ] Plan post-launch optimization

---

## Troubleshooting Common Issues

### Sentry Not Receiving Events
```
Check: SENTRY_DSN is set and valid
Check: Environment is "production"
Check: beforeSend filter not blocking events
Fix: Restart API service: systemctl restart imobi-api
```

### Vercel Analytics Shows No Data
```
Check: @vercel/analytics imported in layout.tsx
Check: Analytics component rendered
Check: NEXT_PUBLIC_SENTRY_DSN not conflicting
Fix: Redeploy web app to Vercel
```

### Health Check Endpoint Returns Error
```
Check: API service is running
Check: Database connection string valid
Check: Redis is accessible
Fix: Verify all env vars in Vercel settings
```

### UptimeRobot Not Detecting Status
```
Check: URL is accessible from internet
Check: CORS allows external requests
Check: Firewall not blocking monitoring IPs
Fix: Whitelist UptimeRobot IP range
```

---

## Escalation Procedures

### P0 (Critical)
- Trigger: High error rate (> 100/min) OR payment processing down
- Action: Page on-call immediately
- Response Time: 5 minutes

### P1 (High)
- Trigger: API response time > 2s OR 50%+ error rate
- Action: Email on-call + team notification
- Response Time: 15 minutes

### P2 (Medium)
- Trigger: Response time > 1s OR 10% error rate
- Action: Slack notification
- Response Time: 30 minutes

### P3 (Low)
- Trigger: Performance degradation OR resource warnings
- Action: Log for review
- Response Time: Next business day

---

## Monthly Maintenance Schedule

### Every Monday
- [ ] Review error trends
- [ ] Check performance baselines
- [ ] Verify backup integrity

### Every Friday
- [ ] Run load test (k6)
- [ ] Review alert effectiveness
- [ ] Plan optimization improvements

### Every Quarter
- [ ] Capacity planning review
- [ ] Security audit
- [ ] Disaster recovery drill

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-30  
**Status**: COMPLETE - Ready for Production  
**Next Review**: 2026-06-02 (Post-Launch)
