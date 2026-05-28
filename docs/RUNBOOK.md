# Production Runbook

## Quick Reference

**On-Call**: Check [PagerDuty On-Call Schedule](https://imbobi.pagerduty.com)  
**Incident Channel**: #critical-errors (Slack)  
**Status Page**: https://status.imbobi.dev  
**Dashboards**: [Operations Dashboard](https://dashboards.imbobi.dev)

---

## Incident Response Procedures

### 1. Initial Triage (First 5 minutes)

When an alert fires:

```
1. Open the alert in Slack
   ├─ Is this a real incident or noise?
   ├─ Check: Dashboard, logs, error tracking
   └─ React with :eyes: to acknowledge

2. Create incident thread in #critical-errors
   ├─ Post: "Investigating: [Issue description]"
   ├─ Include: Severity (Critical/High/Medium)
   └─ Link: Relevant dashboard/logs

3. Gather facts (5 min max)
   ├─ What service is affected?
   ├─ When did it start?
   ├─ How many users impacted?
   ├─ Is it degradation or outage?
   └─ Did something change recently?
```

### 2. Diagnosis Tools

#### Check Vercel Logs

```bash
# 1. Go to Vercel Dashboard
https://vercel.com/dashboard

# 2. Select affected project
# 3. Navigate to Deployments tab
# 4. Click on active deployment
# 5. Scroll to Build Logs

# Key indicators:
# - Build failed? Check "Build & Development Logs"
# - Runtime error? Check "Runtime Logs"
# - 5xx errors? Check "Server Logs"
```

**Common Vercel Issues**:
- **Build failures**: Usually dependency conflicts or missing env vars
  - Check: `.env.example` matches required variables
  - Check: pnpm lockfile is up to date
  
- **Runtime errors**: Code issues in production
  - Check: Recent commits to main branch
  - Check: Sentry for error details
  
- **Deployments timing out**: Large build artifact
  - Check: Next.js build size (`.next/`)
  - Consider: Code splitting, image optimization

#### Check Sentry Errors

```bash
# 1. Go to Sentry Dashboard
https://sentry.imbobi.dev

# 2. Filter by recent errors
# 3. Click on most impactful error
# 4. Review:
#    - Stack trace
#    - Affected users
#    - Browser/OS info
#    - Release version

# Search by:
# - Error type (TypeError, NetworkError, etc.)
# - Release (latest, v1.2.3, etc.)
# - Severity (error, critical, etc.)
```

**Interpreting Sentry Data**:
- **Error Type**: Indicates root cause (network, database, logic)
- **Release**: Which version introduced the bug
- **Users Affected**: Severity multiplier
- **Breadcrumbs**: User actions before error
- **Stack Trace**: Pinpoint exact line of code

#### Check APM Metrics (if configured)

```bash
# 1. Open APM Dashboard
# e.g., Datadog, New Relic, depending on setup

# Check key metrics:
# - Response latency (p95, p99)
# - Error rate (% of requests)
# - Database query time
# - External API latency
# - CPU/Memory usage

# Create timeline:
# When did metrics degrade?
# What matches alert thresholds?
```

**Latency Diagnosis**:
- High API latency → Check database performance
- High web latency → Check Next.js server load
- High mobile latency → Check network conditions

---

## Rollback Procedures

### Scenario: Bad Deployment to Production

**Decision Point**: Rollback vs. hotfix?
- **Rollback if**: Complex issue, unclear root cause, high user impact
- **Hotfix if**: Simple fix (config, single line), low user impact

### Step 1: Revert Commit on Main

```bash
# Get the failing commit hash
git log --oneline main | head -5

# Example output:
# abc1234 feat: new feature (BROKEN)
# def5678 fix: previous fix
# ghi9012 refactor: cleanup

# Revert the commit
git revert abc1234 --no-edit

# This creates a new commit that undoes the changes
# Commit message: "Revert 'feat: new feature'"
```

**Important**: Use `git revert`, not `git reset`
- Preserves history
- Creates audit trail
- Safe for shared branches

### Step 2: Trigger Vercel Redeploy

```
1. Go to Vercel Dashboard
2. Select affected project
3. Navigate to Deployments
4. Find the revert commit
5. Click "..." → "Redeploy"
   OR
   Push the revert commit:
   git push origin main
   (Vercel auto-deploys on push to main)
```

**Expected time**: 5-15 minutes for revert deployment

### Step 3: Verify Rollback in Smoke Tests

```bash
# Run smoke test suite
npm run smoke-test:prod

# Key checks:
# 1. Web app loads (200 status)
# 2. API responds to health check
# 3. Core user flows work:
#    - Login
#    - Create work item
#    - Submit estimate
#    - Logout
```

**Dashboard verification**:
- Vercel: Check new deployment is green
- Sentry: Check error rate drops
- APM: Check latency normalizes
- Status page: Update status to "Investigating" → "Resolved"

**Communication**:
```
Post in #critical-errors:
"✅ Rollback complete. Deployment 'abc1234' reverted to 'def5678'
Error rate normalized. Monitoring for 30 min.
Post-mortem scheduled for [time]"
```

---

## Common Issues & Fixes

### 503 Service Unavailable

**Symptoms**:
- Users see blank page or error
- Vercel shows 503 errors
- API is down or very slow

**Root Cause Analysis**:

```
Step 1: Check API health endpoint
curl https://api.imbobi.dev/health
├─ Timeout? → API is down
├─ 500? → API crashed
└─ 200 + healthy: true? → API is healthy

Step 2: If API down, check logs
Vercel Dashboard → API service logs
Look for:
- Database connection errors
- Redis connection errors
- Unhandled exceptions
- Memory/CPU exhaustion

Step 3: Check dependencies
Database:
  SELECT 1; -- quick test
Redis:
  redis-cli ping
External APIs:
  Check status pages (payment processor, etc.)
```

**Common Causes & Fixes**:

| Cause | Evidence | Fix |
|-------|----------|-----|
| **DB connection pool exhausted** | "FATAL: remaining connection slots reserved for non-replication superuser connections" | Restart API instances (redeploy) or scale connections in Prisma config |
| **Redis unavailable** | "ConnectionError: redis://..." | Check Redis health, restart if needed, check memory usage |
| **OOM (Out of Memory)** | "JavaScript heap out of memory" | Identify memory leak, check for infinite loops, redeploy |
| **Unhandled error in critical path** | Stack trace in logs | Check Sentry, identify commit, rollback if necessary |
| **External API down** | Timeout waiting for payment/storage API | Check their status page, retry, or gracefully degrade feature |

**Remediation**:
```bash
# Option 1: Redeploy (fastest)
# Vercel Dashboard → Deployments → Redeploy last commit

# Option 2: Restart services
# Depends on your hosting (VPS, containers, etc.)

# Option 3: Rollback (if recent bad deploy)
# See "Rollback Procedures" above

# Option 4: Graceful degradation
# Disable non-critical features temporarily
# e.g., disable notifications while storage is down
```

---

### 404 Errors on Assets

**Symptoms**:
- Images not loading
- CSS/JS files return 404
- Vercel shows 404 in logs
- User sees broken page layout

**Root Cause Analysis**:

```
Step 1: Check CDN/asset serving
Open browser DevTools → Network tab
Look for failed requests:
- .next/static/... (Next.js assets)
- images/... (app images)
- public/... (static files)

Step 2: Check which assets fail
All static files? → Build problem
Only images? → Storage problem (S3)
Only CSS? → Next.js build problem

Step 3: Verify Vercel has latest build
Vercel Dashboard → Deployments
Check timestamp of active deployment
Should match recent push to main
```

**Common Causes & Fixes**:

| Cause | Evidence | Fix |
|-------|----------|-----|
| **Build incomplete** | `.next/static/` missing | Redeploy from Vercel dashboard |
| **S3 misconfiguration** | image files return 404 | Check AWS_S3_BUCKET env var, S3 CORS settings |
| **CDN cache stale** | Works on new build, fails on old | Clear Vercel CDN cache, redeploy |
| **File paths wrong** | Only images affected | Check image paths in code, use relative paths not absolute |

**Remediation**:
```bash
# Option 1: Redeploy (clears CDN cache)
Vercel Dashboard → Redeploy last commit

# Option 2: Clear cache manually
Vercel Dashboard → Settings → Caching
Click "Purge Everything"

# Option 3: Check S3
# S3 Console → Check bucket exists and is public
# Check CORS configuration
# Verify images are actually uploaded

# Option 4: Rollback if recent change broke images
See "Rollback Procedures"
```

---

### High Latency (Slow Response Times)

**Symptoms**:
- User reports slow page loads
- APM shows p95 > 1000ms
- API response time > 500ms
- Vercel shows > 3s TTFB

**Root Cause Analysis**:

```
Step 1: Check database performance
# Most common cause of latency
Check slow query log:
SELECT query, mean_time FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

Identify slow queries:
- N+1 queries? (loading related data repeatedly)
- Missing indexes? (full table scans)
- Bad query plan? (wrong join order)

Step 2: Check caching
Redis status: redis-cli info
Cache hit rate in APM
Check if cache is full or evicting

Step 3: Check resource utilization
CPU: Is it > 80%?
Memory: Is it > 80%?
Connection pool: How many active?

Step 4: Check external dependencies
Payment API latency: Check their status
Storage API latency: Check S3 performance
Map API latency: Check PostGIS performance
```

**Common Causes & Fixes**:

| Cause | Evidence | Fix |
|-------|----------|-----|
| **Slow database query** | Query mean_time > 1000ms | Add index, optimize query, cache result |
| **N+1 queries** | Many similar queries in logs | Use SELECT ... WHERE IN (...) or JOIN |
| **Missing cache** | Same data fetched repeatedly | Add Redis caching, increase TTL |
| **High connection wait** | "waiting for available connection" | Increase pool size in Prisma, reduce connections per request |
| **External API slow** | Calling 3rd party service | Add timeout, retry logic, or fallback |
| **Database under load** | CPU/Memory high, connections maxed | Scale database, optimize queries, or reduce load |

**Remediation**:
```bash
# Step 1: Immediate (buy time)
# Scale up: Add more API instances
# Cache aggressively: Increase TTL for frequently accessed data
# Gracefully degrade: Disable non-critical features

# Step 2: Investigation (root cause)
# Run slow query log
# Check APM traces for bottlenecks
# Profile code with flame graphs

# Step 3: Fix (permanent)
# Add database index
# Optimize query (joins, WHERE clauses)
# Implement caching
# Batch requests (GraphQL batching, SQL IN clauses)

# Step 4: Verify
# Re-run slow query log
# Check APM latency improves
# Monitor for 30 min
```

---

### Database Connection Issues

**Symptoms**:
- "too many connections" error
- Connection timeout
- Database appears unresponsive
- Spikes in connection count

**Diagnosis**:
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check per-user/database
SELECT usename, datname, count(*)
FROM pg_stat_activity
GROUP BY usename, datname;

-- Identify idle connections
SELECT pid, usename, application_name, state, query_start
FROM pg_stat_activity
WHERE state != 'active'
ORDER BY query_start ASC;
```

**Quick Fixes**:
1. **Redeploy API**: Terminates old connections
2. **Restart database**: Last resort, brief downtime
3. **Increase max_connections**: Requires DB restart

**Long-term**:
- Lower connection pool size in Prisma
- Add connection pooling (PgBouncer)
- Monitor connection usage

---

## Escalation Contacts

### On-Call Rotation
Check [PagerDuty Schedule](https://imbobi.pagerduty.com) for current on-call

### Team Contacts
- **Engineering Lead**: @lead (Slack)
- **Operations**: @ops (Slack)
- **DevOps**: @devops (Slack)
- **Product**: @product-lead (Slack)

### External Contacts
- **Vercel Support**: https://vercel.com/support
- **AWS Support**: https://aws.amazon.com/support
- **Database Hosting**: [Depends on provider]

### Escalation Path
```
1. On-call engineer (notified by PagerDuty)
2. Engineering lead (if on-call doesn't respond in 15 min)
3. VP Engineering (if lead doesn't respond in 15 min)
```

---

## Post-Incident Review Checklist

After every incident, complete within 24 hours:

```
□ Incident Summary
  ├─ Title: [Describe what happened]
  ├─ Duration: [Start time] to [End time]
  ├─ Impact: [Users affected, business impact]
  └─ Severity: Critical/High/Medium

□ Timeline
  ├─ Alert fired: [time]
  ├─ Triage completed: [time]
  ├─ Root cause identified: [time]
  ├─ Fix deployed: [time]
  └─ Verified resolved: [time]

□ Root Cause
  ├─ What happened?
  ├─ Why did it happen?
  ├─ Was it preventable?
  └─ Could automation have caught it?

□ Impact Assessment
  ├─ How many users affected?
  ├─ Revenue impact (if applicable)
  ├─ How long until resolved?
  └─ Reputation impact?

□ Action Items
  ├─ Code fix (if needed)
  ├─ Alert improvement (if alert was flaky)
  ├─ Documentation update (if runbook was incomplete)
  ├─ Test coverage (if automated test would have caught it)
  └─ Training (if team knowledge gap)

□ Communication
  ├─ Status page updated?
  ├─ Post-mortem shared with team?
  ├─ Slack thread documented?
  └─ Customers informed (if applicable)?
```

### Example Post-Incident Action Items

1. **Add test case**: E2E test for [flow that broke]
2. **Improve alert**: Lower threshold on [metric]
3. **Update runbook**: Add section on [issue type]
4. **Code review**: Add reviewer requirement on [file type]
5. **Monitoring**: Add alerting on [new metric]

---

## Key Dashboards & Links

| Dashboard | URL | Refresh | Alerts |
|-----------|-----|---------|--------|
| Vercel Deployments | https://vercel.com/dashboard | Real-time | Build failures |
| Sentry Errors | https://sentry.imbobi.dev | Real-time | New errors |
| API Logs | https://vercel.com → api → logs | Real-time | Errors in logs |
| APM (if configured) | [Your APM URL] | 1 min | Latency, errors |
| Status Page | https://status.imbobi.dev | Manual | Public incidents |

---

## Quick Commands Reference

```bash
# Check deployment status
curl https://api.imbobi.dev/health

# Test web app load
curl -I https://imbobi.dev

# Check database (if you have access)
psql postgresql://user:password@host/dbname -c "SELECT 1;"

# Check Redis (if you have access)
redis-cli -h HOST ping

# View recent commits
git log --oneline main | head -10

# Get current version
cat package.json | grep '"version"'
```

---

## Incident Communication Templates

### Incident Starts
```
Slack #critical-errors:
:warning: Incident Declared: [Issue]
Services affected: [List]
Users impacted: ~[number]
Status: Investigating
ETA: [estimated fix time]
Will update every [interval]
```

### Investigating
```
Slack #critical-errors:
Update: Identified probable cause - [description]
Current status: [percentage of users affected]
Next steps: [what we're doing]
ETA: [when to expect fix]
```

### Resolved
```
Slack #critical-errors:
:white_check_mark: Incident Resolved
Root cause: [description]
Fix deployed: [commit hash]
Duration: [total incident time]
Post-mortem: Will be scheduled at [time]
Thank you for your patience!
```

---

## References

- [Production Checklist](./DEPLOYMENT.md)
- [Monitoring Setup](./MONITORING_SETUP.md)
- [APM Configuration](./APM_SETUP.md)
- [Sentry Integration](./SENTRY_SETUP.md)
- [GitHub Actions Guide](./GITHUB_ACTIONS_GUIDE.md)
- [Alerts Configuration](./ALERTS_SETUP.md)
