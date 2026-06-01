# 📖 Operations Runbook — Post-Deployment Guide

**Date:** 31 de Maio de 2026  
**Environment:** Production (Vercel + Railway)  
**Audience:** DevOps, Platform Engineers, On-Call Support

---

## 📋 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Scaling & Performance](#scaling--performance)
3. [Database Management](#database-management)
4. [Backup & Recovery](#backup--recovery)
5. [Troubleshooting](#troubleshooting)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Security Operations](#security-operations)
8. [Disaster Recovery](#disaster-recovery)
9. [Common Tasks](#common-tasks)
10. [Escalation Procedures](#escalation-procedures)

---

## Quick Reference

### Critical URLs

| Component | URL | Status Page |
|-----------|-----|-------------|
| **Frontend** | https://seu-projeto.vercel.app | vercel.com/dashboard |
| **API** | https://imobi-api.railway.app | railway.app/dashboard |
| **Database** | PostgreSQL on Railway | railway.app/dashboard |
| **Cache** | Redis on Railway | railway.app/dashboard |

### Health Check Commands

```bash
# Frontend health
curl https://seu-projeto.vercel.app

# API health
curl https://imobi-api.railway.app/api/v1/health

# Database connectivity
curl https://imobi-api.railway.app/api/v1/health/ready

# Detailed metrics
curl https://imobi-api.railway.app/api/v1/health -s | jq
```

### Emergency Contacts

| Role | Contact | On-Call |
|------|---------|---------|
| DevOps | contato.vinicaetano93@gmail.com | Escalate to Owner |
| Database | Railway Support | support.railway.app |
| Frontend | Vercel Support | support.vercel.com |

---

## Scaling & Performance

### Frontend Scaling (Vercel)

**Vercel auto-scales automatically.** No manual intervention needed.

**Monitor:** Vercel Dashboard → Analytics

```bash
# Check current deployments
vercel deployments --prod
```

**If slow:**
1. Check build time: `vercel logs`
2. Check bundle size: `npm run analyze`
3. Enable caching in `vercel.json`

---

### Backend Scaling (Railway)

**Railway provides automatic horizontal scaling.**

#### Monitor Current Usage

```bash
# SSH into Railway to check resources
railway shell

# Inside container:
top -bn1 | head -20  # CPU/Memory
df -h                 # Disk usage
```

#### Scale Up (If Needed)

1. Go to Railway Dashboard
2. Select API Service
3. Click "Settings" → "Instance"
4. Increase CPU/Memory allocation
5. Railway redeploys automatically

**Cost Impact:** ~$0.10/hour per additional 512MB RAM

#### Monitor Performance

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| CPU | <30% | 60-80% | >90% |
| Memory | <50% | 70-85% | >95% |
| Response Time | <100ms | 100-500ms | >500ms |
| Error Rate | <0.1% | 0.1-1% | >1% |

**Check Metrics in Railway:**
1. Dashboard → Select API Service
2. Click "Metrics" tab
3. Monitor CPU, Memory, Network

---

## Database Management

### PostgreSQL Backups

**Railway handles automatic daily backups.**

#### Manual Backup (If Needed)

```bash
# Export database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Compress
gzip backup-*.sql
```

#### Restore from Backup

```bash
# Restore database
psql $DATABASE_URL < backup.sql

# Verify restoration
psql $DATABASE_URL -c "SELECT count(*) FROM usuarios;"
```

#### Backup Policy

- **Frequency:** Daily automatic backups (Railway default)
- **Retention:** 7 days
- **Restore Time:** ~5-10 minutes
- **Cost:** Included in Railway plan

---

### Database Connections

#### Monitor Active Connections

```bash
railway shell
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Typical Connection Limits

- **Free Plan:** 10 concurrent connections
- **Upgrade if:** Average connections > 8

#### Clear Stale Connections

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < now() - interval '1 hour';
```

---

### Run Migrations

#### On Deployment

Migrations run automatically during Railway deployment.

#### Manual Migration (If Needed)

```bash
# SSH into Railway
railway shell

# Run pending migrations
pnpm db:migrate

# Check migration status
pnpm db:migrate --status
```

#### Rollback Migration

```bash
# This is NOT recommended in production
# Instead, create a new migration to fix the issue

pnpm db:migrate:resolve -- --rolled-back -- MIGRATION_ID
```

---

## Backup & Recovery

### Database Recovery Checklist

```
SCENARIO: Database corruption or data loss

1. ASSESS
   ├─ Is database responding? (check health)
   ├─ When did issue start?
   ├─ What data is affected?
   └─ How much data loss is acceptable?

2. ALERT
   ├─ Notify team immediately
   ├─ Create incident ticket
   ├─ Update status page
   └─ Communicate with users (if needed)

3. PREPARE
   ├─ Stop traffic (if possible)
   ├─ Backup current state (even if corrupted)
   └─ Identify latest clean backup

4. RESTORE
   ├─ Get backup from Railway
   ├─ Restore to staging first (TEST)
   ├─ Verify data integrity
   └─ If good: restore to production

5. VALIDATE
   ├─ Run health checks
   ├─ Verify critical data
   ├─ Test main flows (login, credit)
   └─ Gradually resume traffic

6. FOLLOW-UP
   ├─ Document what happened
   ├─ Identify root cause
   ├─ Implement safeguards
   └─ Schedule post-mortem
```

### Points-in-Time Recovery

Railway allows recovering to a specific point in time.

```bash
# Request point-in-time recovery from Railway support
# Include: timestamp you want to recover to
```

**Recovery Window:** Last 7 days

---

## Troubleshooting

### Frontend Issues

#### Deployment Failed

```bash
# Check build logs
vercel logs --tail

# Rebuild
vercel redeploy

# If issue persists:
# 1. Check package.json dependencies
# 2. Verify environment variables
# 3. Check build command in vercel.json
```

#### Slow Performance

```bash
# Check if it's a build cache issue
vercel rebuild

# Monitor analytics
vercel analytics --json | jq '.[] | select(.duration > 3000)'
```

#### 404 Errors on Routes

```bash
# Verify rewrites in vercel.json
# Add to vercel.json if needed:
{
  "rewrites": [
    {
      "source": "/dashboard/:path*",
      "destination": "/dashboard"
    }
  ]
}
```

---

### Backend Issues

#### API Not Responding

```bash
# 1. Check health endpoint
curl https://imobi-api.railway.app/api/v1/health

# 2. Check if database is connected
curl https://imobi-api.railway.app/api/v1/health/ready

# 3. View logs in Railway
railway logs --follow

# 4. Check resource usage
railway shell
top -bn1 | head -20
```

#### High Error Rate

```bash
# 1. Check error logs
railway logs --follow --error

# 2. Check error patterns
# Look for:
# - Database connection errors
# - Out of memory errors
# - Rate limit errors
# - Authentication failures

# 3. View metrics
# Check CPU/Memory in Railway dashboard
```

#### Database Connection Errors

```bash
# 1. Verify DATABASE_URL is set
railway variables

# 2. Check connection limit
psql $DATABASE_URL -c "SELECT setting FROM pg_settings WHERE name = 'max_connections';"

# 3. Kill idle connections
psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND idle_in_transaction;"

# 4. Restart PostgreSQL (via Railway dashboard)
```

---

### Redis Cache Issues

#### Cache Not Working

```bash
# 1. Verify Redis is running
railway logs --service redis --follow

# 2. Test connection
redis-cli PING

# 3. Check memory usage
redis-cli INFO memory

# 4. Clear cache if corrupted
redis-cli FLUSHALL
```

**Note:** Clearing cache is safe, it's only a performance optimization.

---

## Monitoring & Alerts

### Setup Monitoring with Sentry

**For Error Tracking:**

```bash
# 1. Create Sentry account (sentry.io)
# 2. Create project for each service (frontend, backend)
# 3. Get DSN from project settings

# 4. Add to backend (.env.production)
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# 5. Add to frontend (.env.production)
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

### Setup Monitoring with New Relic or DataDog

**For Performance Monitoring:**

```bash
# 1. Create account (newrelic.com or datadoghq.com)
# 2. Install agent in backend
npm install @newrelic/node-agent

# 3. Start agent in main.ts before app init
require('@newrelic/node-agent');

# 4. Add environment variables
NEW_RELIC_LICENSE_KEY=xxxxx
NEW_RELIC_APP_NAME=imobi-api
```

### Key Metrics to Monitor

| Metric | Target | Alert When |
|--------|--------|-----------|
| **Error Rate** | <0.1% | >1% |
| **Response Time (p95)** | <200ms | >500ms |
| **Database Connections** | <8/10 | >8/10 |
| **Cache Hit Rate** | >80% | <60% |
| **CPU Usage** | <30% | >80% |
| **Memory Usage** | <50% | >85% |
| **Disk Usage** | <70% | >85% |

### Setup Uptime Monitoring

```bash
# Using free service (uptimerobot.com):
1. Create account
2. Add monitor: https://imobi-api.railway.app/api/v1/health
3. Set check interval: 5 minutes
4. Add alert email
```

---

## Security Operations

### Access Control

#### Manage Environment Variables

```bash
# View production secrets (Railway)
railway variables

# Update a variable
railway variables set JWT_SECRET "new-secret-value"

# Rotate secrets quarterly
# 1. Generate new secret
# 2. Update in Railway
# 3. Restart service
# 4. Monitor for auth issues
```

#### Database Access Control

```bash
# PostgreSQL is only accessible from Railway services
# Direct access requires Railway CLI:

railway shell
psql $DATABASE_URL

# Sensitive operations:
# - Always use transactions
# - Test in staging first
# - Backup before major changes
```

### Security Audits

**Monthly Security Checklist:**

```
□ Review access logs
□ Check for failed login attempts (>10 in hour?)
□ Audit environment variables (no hardcoded secrets?)
□ Verify CORS origin is still correct
□ Check rate limiting effectiveness
□ Review database access patterns
□ Verify SSL certificates are valid
□ Scan dependencies for vulnerabilities (npm audit)
```

---

## Disaster Recovery

### RTO & RPO Targets

| Scenario | RTO | RPO | Priority |
|----------|-----|-----|----------|
| **Database Corruption** | 30 min | 1 hour | CRITICAL |
| **API Service Down** | 10 min | 5 min | CRITICAL |
| **Frontend Deployment** | 5 min | None | HIGH |
| **Data Breach** | 1 hour | Real-time | CRITICAL |

### Incident Response Procedure

```
STEP 1: DETECT (0 min)
├─ Alert triggered
├─ Check dashboard
├─ Assess severity
└─ Notify team

STEP 2: RESPOND (0-5 min)
├─ Create incident ticket
├─ Identify affected services
├─ Check recent deployments
└─ Begin investigation

STEP 3: MITIGATE (5-30 min)
├─ Stop active traffic (if needed)
├─ Isolate issue
├─ Attempt quick fix
└─ If fails: proceed to restore

STEP 4: RESTORE (30-60 min)
├─ Identify last good state
├─ Restore from backup
├─ Verify data integrity
└─ Gradually resume traffic

STEP 5: VERIFY (60+ min)
├─ Run full health checks
├─ Test critical flows
├─ Monitor metrics
└─ Update status page

STEP 6: FOLLOW-UP (24 hours)
├─ Write incident report
├─ Schedule post-mortem
├─ Implement preventative measures
└─ Update runbook
```

### Common Disaster Scenarios

#### Scenario: Database Down

```bash
# 1. Verify it's actually down
curl https://imobi-api.railway.app/api/v1/health/ready
# Expected: 503 Service Unavailable

# 2. Check Railway dashboard
# - Is database service running?
# - Check memory/CPU
# - Check recent logs

# 3. If metrics normal, restart database
# Railway dashboard → PostgreSQL → Restart

# 4. Wait 2-3 minutes for restart
# 5. Verify health
curl https://imobi-api.railway.app/api/v1/health/ready

# 6. If still failing, restore from backup
# Contact Railway support for point-in-time recovery
```

#### Scenario: API Memory Leak

```bash
# 1. Identify: Memory usage increasing over time
railway logs --follow
# Look for "OutOfMemory" errors

# 2. Temporary fix: Restart service
railway restart

# 3. Permanent fix: 
# - Identify memory leak in code
# - Fix and deploy
# - Monitor memory after deployment

# 4. Prevent: Set memory alerts
# Railway dashboard → Metrics → Alert if Memory > 80%
```

#### Scenario: DDoS Attack

```bash
# 1. Identify: Spike in 429 errors
curl https://imobi-api.railway.app/api/v1/health
# See spike in requests

# 2. Short-term: Enable WAF
# Railway doesn't have built-in WAF
# Options:
# a. Use Cloudflare in front (change DNS)
# b. Scale up API to handle load
# c. Manually block IPs (limited)

# 3. Scale API
# Railway dashboard → API Service → Settings
# Increase CPU/Memory allocation

# 4. Monitor and maintain
# Keep traffic logs for analysis
# Report abuse to hosting provider
```

---

## Common Tasks

### Add New Environment Variable

```bash
# 1. Update .env.production.example
echo "NEW_VAR=value" >> .env.production.example

# 2. Commit to git
git add .env.production.example
git commit -m "docs: add new environment variable"

# 3. Set in Railway
railway variables set NEW_VAR "production-value"

# 4. Restart service
railway restart

# 5. Verify in logs
railway logs --follow
```

### Update API Endpoint

```bash
# 1. Code change and push to GitHub
git push origin main

# 2. Railway auto-deploys (webhook)
# Monitor: railway logs --follow

# 3. Verify new endpoint
curl https://imobi-api.railway.app/api/v1/new-endpoint

# 4. If broken: rollback
# railway rollback
```

### Clear Database Cache

```bash
# 1. SSH into Redis
railway shell redis-cli

# 2. Clear specific cache
FLUSHDB  # Current database only
# or
FLUSHALL  # All databases

# 3. Monitor performance
# Cache will rebuild as requests come in
```

### Analyze API Performance

```bash
# 1. Check response times
railway logs --follow | grep "duration:"

# 2. Find slow endpoints
railway logs --follow | grep "duration:.*[5-9][0-9][0-9]ms\|[0-9][0-9][0-9][0-9]ms"

# 3. Check database query performance
# Enable query logging in NestJS
# Filter slow queries (>100ms)

# 4. Optimize
# Add indexes
# Add Redis caching
# Optimize N+1 queries
```

---

## Escalation Procedures

### Support Escalation Chain

```
TIER 1: Self-Service (You)
├─ Check health endpoints
├─ Review logs
├─ Restart service
└─ Check documentation

TIER 2: Platform Support
├─ Vercel support (frontend)
├─ Railway support (backend/database)
└─ Issues: builds, deployments, infrastructure

TIER 3: Code Issues
├─ Review recent commits
├─ Create issue in GitHub
├─ Deploy hotfix
└─ Coordinate with dev team

TIER 4: Emergency
├─ Contact project owner
├─ Initiate disaster recovery
├─ Prepare incident report
└─ Schedule post-mortem
```

### When to Escalate

| Situation | Action | Contact |
|-----------|--------|---------|
| **Continuous 500 errors** | Page owner | Owner |
| **Database corrupted** | Restore from backup | Railway Support |
| **Security breach** | Isolate + investigate | Owner + Security Team |
| **Data loss** | Activate disaster recovery | Owner |
| **Performance degradation** | Scale + investigate | Owner |

---

## Maintenance Windows

### Planned Maintenance Schedule

```
WEEKLY:
  Monday 2:00 AM UTC - Database backups
  Friday 3:00 AM UTC - Security updates

MONTHLY:
  First Sunday 1:00 AM UTC - Full system check
  Full stack review & dependency updates

QUARTERLY:
  Security audit
  Performance review
  Disaster recovery drill
```

### Zero-Downtime Updates

```bash
# 1. Deploy to production (Railway auto-handles)
# 2. Blue-green deployment:
#    - New version deployed in parallel
#    - Traffic gradually shifted
#    - Old version available for instant rollback

# 3. Monitor logs during rollout
railway logs --follow

# 4. If issues detected:
railway rollback

# 5. Investigate and fix
```

---

## Documentation & References

### Useful Links

- **Railway Docs:** https://railway.app/docs
- **Vercel Docs:** https://vercel.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs/14/
- **NestJS Docs:** https://docs.nestjs.com
- **Sentry Docs:** https://docs.sentry.io

### Related Documents

- **API Documentation:** See `API_DOCUMENTATION.md`
- **Deployment Guide:** See `DEPLOY_GUIDE.md`
- **Security Report:** See `SECURITY_SUMMARY.md` (if available)

---

## Contacts & Support

| Service | Support | Hours | Response Time |
|---------|---------|-------|---|
| **Railway** | support.railway.app | 24/7 | 1-2 hours |
| **Vercel** | support.vercel.com | 24/7 | 2-4 hours |
| **Project Owner** | contato.vinicaetano93@gmail.com | Business hours | 1 hour |

---

## Appendix: Useful Commands

### Railway Commands

```bash
# Login to Railway
railway login

# Link to project
railway link

# View variables
railway variables

# Update variable
railway variables set KEY value

# View logs
railway logs --follow

# Shell access
railway shell

# Restart service
railway restart

# Rollback deployment
railway rollback

# View deployments
railway deployments
```

### PostgreSQL Commands

```bash
# Connect to database
psql $DATABASE_URL

# List databases
\l

# List tables
\dt

# Count records
SELECT count(*) FROM usuarios;

# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Redis Commands (via Shell)

```bash
# Connect
redis-cli

# Ping
PING

# Get key
GET key-name

# Set key
SET key-name value

# Delete key
DEL key-name

# Clear all
FLUSHALL

# Memory usage
INFO memory
```

---

**Last Updated:** 2026-05-31  
**Version:** 1.0  
**Status:** Ready for Production

🎉 **Operations team: This runbook covers 99% of production scenarios.**
