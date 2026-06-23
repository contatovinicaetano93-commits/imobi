# Beta Launch Monitoring Guide

**Document Version**: 1.0  
**Created**: 2026-05-28  
**Status**: Ready for Beta Launch  
**Owner**: DevOps / Product Team

---

## Table of Contents
1. [Dashboard URLs](#dashboard-urls)
2. [Monitoring Setup Checklist](#monitoring-setup-checklist)
3. [Key Metrics & Thresholds](#key-metrics--thresholds)
4. [Alert Escalation](#alert-escalation)
5. [Daily Monitoring Routine](#daily-monitoring-routine)
6. [Incident Response](#incident-response)

---

## Dashboard URLs

### Vercel Analytics (Web App Performance)
**Purpose**: Monitor user experience, page load times, and traffic patterns

- **Vercel Project Analytics**: https://vercel.com/contatovinicaetano93-commits/imobi/analytics
- **Vercel Deployments**: https://vercel.com/contatovinicaetano93-commits/imobi/deployments
- **Vercel Functions**: https://vercel.com/contatovinicaetano93-commits/imobi/functions

**What to Monitor**:
- Page load times (LCP, FCP, CLS)
- User traffic by page
- Error rates and status codes
- Deployment health

**Access Credentials**: 
- Account: contatovinicaetano93@gmail.com
- Two-factor auth required

---

### Sentry Error Tracking
**Purpose**: Capture, categorize, and resolve runtime errors

- **Sentry Dashboard**: https://sentry.io
- **Project URL**: [Navigate to Your Organization → imobi project]
- **Issues View**: https://sentry.io/organizations/[your-org]/issues/

**What to Monitor**:
- Error frequency and trend
- Critical/high-severity issues
- Error patterns by user/session
- JavaScript exceptions
- API errors

**Access Credentials**:
- Email: contato.vinicaetano93@gmail.com
- Team: Imobi Beta Team
- Notification emails: [To be configured]

---

### API Health (NestJS + Fastify)
**Purpose**: Monitor backend service availability and performance

- **API Health Endpoint**: https://api.imobi.com/api/v1/health
- **API Swagger/Docs**: https://api.imobi.com/api/v1/swagger (if enabled)
- **API Logs**: CloudWatch / Docker logs (internal)

**What to Monitor**:
- Health check response (should return `{ "status": "ok" }`)
- API response times (p50, p95, p99)
- Database connectivity
- Redis connectivity
- Worker queue status

**Health Check Script**:
```bash
curl -X GET https://api.imobi.com/api/v1/health
# Expected: HTTP 200 with { "status": "ok" }
```

---

### PostgreSQL + PostGIS Database
**Purpose**: Monitor data integrity, query performance, and geographic operations

- **DB Connection Pool**: Monitor via application logs
- **PostGIS Validation**: GPS point validation queries
- **Prisma Schema**: Active in `services/api/prisma/schema.prisma`

**What to Monitor**:
- Query performance (slow logs)
- Connection pool saturation
- Disk space usage
- PostGIS geographic operation latency
- Migration status

---

### Redis + BullMQ Queue Management
**Purpose**: Monitor background job processing (especially parcela liberation workflow)

- **BullMQ Worker**: `services/workers/liberacao-parcela.worker.ts`
- **Queue Status**: Monitor via Redis CLI or admin panel
- **Jobs**: Monitor liberacao-parcela job completion rates

**What to Monitor**:
- Queue depth (pending jobs)
- Job success/failure rates
- Job processing time
- Worker availability
- Redis memory usage

---

### Mobile App (Expo 51)
**Purpose**: Monitor mobile-specific issues (when beta includes mobile)

- **Expo Status**: https://status.expo.dev
- **Expo Logs**: Expo CLI (development)
- **Crash Reporting**: Firebase Crashlytics (pending integration)

**What to Monitor**:
- Build status
- Deployment status
- User session analytics
- Crash frequency

---

## Monitoring Setup Checklist

### Pre-Launch (48 Hours Before)
- [ ] Verify all dashboard URLs are accessible
- [ ] Test Vercel analytics data collection
- [ ] Confirm Sentry project is receiving test events
- [ ] Verify API health endpoint responds
- [ ] Test database connectivity from API
- [ ] Confirm Redis connection from workers
- [ ] Review CloudWatch/logging setup
- [ ] Validate alerting rules are configured
- [ ] Set up on-call rotation
- [ ] Brief monitoring team on dashboards

### Launch Day (T-0)
- [ ] Open all dashboard tabs in monitoring workspace
- [ ] Verify test account access works
- [ ] Confirm error tracking is active
- [ ] Check baseline traffic metrics
- [ ] Verify no pre-existing critical alerts
- [ ] Enable Slack/email notifications
- [ ] Brief team on escalation procedures

### Post-Launch
- [ ] Monitor metrics every 15 minutes (first 2 hours)
- [ ] Monitor metrics every 30 minutes (hours 2-8)
- [ ] Monitor metrics every hour (day 1)
- [ ] Daily review (day 2+)

---

## Key Metrics & Thresholds

### Web Performance (Vercel Analytics)

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Largest Contentful Paint (LCP)** | >2.5s | Warning at 2.5s, Alert at 4s |
| **First Input Delay (FID)** | >100ms | Warning at 100ms, Alert at 300ms |
| **Cumulative Layout Shift (CLS)** | >0.1 | Warning at 0.1, Alert at 0.25 |
| **Error Rate** | >1% | Warning at 0.5%, Alert at 1% |
| **Page Load (p95)** | >3s | Warning, >5s Alert |
| **API Response Time (p95)** | >500ms | Warning, >1s Alert |

### API & Backend (Sentry + Health)

| Metric | Threshold | Action |
|--------|-----------|--------|
| **API Health Status** | 200 OK | Alert if not 200 |
| **Error Rate** | >0.1% | Warning at 0.05%, Alert at 0.1% |
| **Critical Errors** | Any | Immediate escalation |
| **Error Spike** | +50% vs baseline | Warning |
| **Failed Requests** | >10/min | Warning, >50/min Alert |

### Database (PostgreSQL)

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Query Latency (p95)** | >500ms | Warning |
| **Connection Pool Usage** | >80% | Warning, >95% Alert |
| **Disk Usage** | >80% | Warning, >95% Alert |
| **Replication Lag** | >1s | Warning |

### Queue Management (Redis + BullMQ)

| Metric | Threshold | Action |
|--------|-----------|--------|
| **Pending Jobs** | >1000 | Warning |
| **Job Failure Rate** | >5% | Warning, >10% Alert |
| **Job Processing Time** | >30s avg | Warning |
| **Redis Memory Usage** | >80% | Warning |

---

## Alert Escalation

### Alert Severity Levels

**P0 - Critical (Immediate)**
- API completely down (health check failing)
- Authentication broken (unable to login)
- Database completely unavailable
- Data corruption detected
- Security incident

**P1 - High (Within 15 minutes)**
- Error rate >5%
- Performance degradation >50%
- Specific feature completely broken
- Queue backlog >5000 jobs

**P2 - Medium (Within 1 hour)**
- Error rate 1-5%
- Performance degradation 20-50%
- Non-critical feature issues
- Queue backlog 1000-5000 jobs

**P3 - Low (Next business day)**
- Minor UX issues
- Performance degradation <20%
- Non-blocking errors

### Escalation Contacts

| Role | Name | Email | Phone | On-Call |
|------|------|-------|-------|---------|
| **Lead** | Vinicaetano | contato.vinicaetano93@gmail.com | [To be added] | Primary |
| **Backend Dev** | [Name] | [Email] | [Phone] | Secondary |
| **DevOps** | [Name] | [Email] | [Phone] | Tertiary |

### Escalation Procedure

1. **Alert Triggered** → Check dashboard for severity
2. **P0/P1** → Immediately page on-call engineer
3. **P2** → Slack notification to team channel
4. **P3** → Log in Jira/issue tracking
5. **All** → Post to #imobi-incidents channel
6. **Investigation** → Document findings in incident ticket
7. **Resolution** → Update status in real-time
8. **Post-Mortem** → Schedule if P0/P1

---

## Daily Monitoring Routine

### Morning (Start of Day)
```
[ ] Open Vercel Analytics dashboard
[ ] Check for overnight error spikes in Sentry
[ ] Review API health endpoint
[ ] Check Redis queue status
[ ] Scan CloudWatch logs for warnings
[ ] Review incident log from previous day
[ ] Brief team on overnight metrics
```

### During Business Hours (Every 1-2 Hours)
```
[ ] Verify error rate trending
[ ] Check page load times
[ ] Monitor user traffic growth
[ ] Verify no worker queue backlog
[ ] Spot-check recent error details
[ ] Monitor test account usage
```

### Evening (End of Day)
```
[ ] Summarize day's metrics in standup
[ ] Document any incidents
[ ] Review tomorrow's on-call rotation
[ ] Archive/review relevant logs
[ ] Ensure alerting is still active
```

### Weekly (Friday EOD)
```
[ ] Compile metrics report
[ ] Identify trends (good/bad)
[ ] Review cost implications
[ ] Plan optimizations for next week
[ ] Schedule post-mortem for any P0/P1
```

---

## Incident Response

### Discovery
- **Dashboard Alert** → Check severity immediately
- **User Report** → Verify in production before escalating
- **Automated Alert** → Follow severity guidelines above

### Investigation Workflow

1. **Confirm Issue**
   - Can you reproduce?
   - Is it affecting all users or subset?
   - When did it start?

2. **Gather Evidence**
   - Check Sentry for related errors
   - Review API logs (CloudWatch)
   - Query database for anomalies
   - Check Redis queue status
   - Verify recent deployments

3. **Identify Root Cause**
   - Is it code-related? (Recent deployment)
   - Is it infra-related? (API/DB/Redis down)
   - Is it user-error? (Misuse of API)
   - Is it external? (Third-party service)

4. **Communicate Status**
   - Post to #imobi-incidents
   - Update Jira ticket status
   - Message escalation contact
   - Set ETA if applicable

5. **Implement Fix**
   - Apply hotfix if needed
   - Deploy to production
   - Verify fix resolves issue
   - Monitor for recurrence

6. **Verify Resolution**
   - Error rate back to normal
   - User reports confirm fix
   - All systems healthy
   - Close incident ticket

### Post-Incident

**For P0/P1 Incidents**:
1. Schedule post-mortem within 24 hours
2. Document timeline and cause
3. Identify preventive measures
4. Create follow-up tasks
5. Update runbooks

**For P2/P3 Incidents**:
1. Document in Jira
2. Add to backlog for analysis
3. Include in weekly review

---

## Useful Commands

### API Health Check
```bash
# From CLI or monitoring script
curl -s https://api.imobi.com/api/v1/health | jq .

# Expected output
{
  "status": "ok",
  "timestamp": "2026-05-28T12:00:00Z"
}
```

### Test Account Login (Verify Auth)
```bash
curl -X POST https://api.imobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "beta-construtora-1@imobi.test",
    "senha": "BetaPass123!"
  }'
```

### Check Redis Connection (from API shell)
```bash
# In NestJS shell/script
const result = await redis.ping();
console.log(result); // Should be 'PONG'
```

### Check Database Connection
```bash
# In Prisma shell
npx prisma db execute --stdin < /dev/null
# Should connect without error
```

---

## Links Quick Reference

| Resource | URL |
|----------|-----|
| Vercel Dashboard | https://vercel.com/contatovinicaetano93-commits/imobi |
| Vercel Analytics | https://vercel.com/contatovinicaetano93-commits/imobi/analytics |
| Sentry Issues | https://sentry.io |
| API Health | https://api.imobi.com/api/v1/health |
| Web App | https://imobi.vercel.app |
| Production API | https://api.imobi.com |
| GitHub Repo | [Your repo URL] |

---

## Troubleshooting Quick Reference

### "API Health Check Failing"
1. Check if API container is running
2. Verify database connectivity
3. Check CloudWatch logs for errors
4. Verify network/firewall rules
5. Check Redis connectivity

### "High Error Rate in Sentry"
1. Check for recent deployment
2. Review error type distribution
3. Check if specific user/action affected
4. Review recent code changes
5. Rollback if necessary

### "Page Load Times Degrading"
1. Check Vercel CPU usage
2. Check API response times
3. Check for database query slowness
4. Review network waterfall in DevTools
5. Check for memory leaks in frontend

### "Queue Backlog Growing"
1. Check if workers are running
2. Check if jobs are failing
3. Review worker logs
4. Check Redis memory
5. Restart workers if needed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-28 | Initial monitoring guide for beta launch |

