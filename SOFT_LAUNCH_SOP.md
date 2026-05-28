# Soft Launch Standard Operating Procedure (SOP)

**Project**: Imobi - Construction Credit Platform  
**Document Date**: May 28, 2026  
**Target Audience**: DevOps, Platform Engineers, Product Managers  
**Version**: 1.0

---

## Overview

This SOP guides the first production deployment and soft launch of Imobi with 10-20 beta testers. The procedure minimizes risk through staged validation, automated health checks, and clear escalation paths.

**Timeline**: 2-3 hours total (1h preparation + 1h deployment + 30m validation)

---

## Phase 1: Pre-Flight Checklist (30 minutes)

### 1.1 Code & Configuration Readiness

**✓ Checklist**:
- [ ] All code pushed to `main` branch
- [ ] Latest commit passes all CI/CD checks (if configured)
- [ ] Type-check passes: `pnpm type-check` ✅ (VERIFIED)
- [ ] No uncommitted changes in working directory
- [ ] `.env`, `.env.production` NOT in git (verified in .gitignore)
- [ ] `.env.production.example` documented and current ✅ (VERIFIED)

**Action**: Run pre-flight verification
```bash
cd /home/user/imobi
git status  # Should be clean
pnpm type-check  # Should pass with "5 successful"
```

### 1.2 Environment Variables Prepared

**Critical Variables** (must be set in Vercel Dashboard):
- [ ] `DATABASE_URL` — PostgreSQL connection string (sslmode=require)
- [ ] `REDIS_URL` — Redis cache/queue connection
- [ ] `JWT_SECRET` — Strong random secret (32+ chars)
- [ ] `JWT_EXPIRES_IN` — Token lifetime (recommended: 900 = 15 min)
- [ ] `SENDGRID_API_KEY` — Email service API key
- [ ] `FIREBASE_PROJECT_ID` — Firebase project identifier
- [ ] `FIREBASE_PRIVATE_KEY` — Firebase service account key (with escaped newlines)
- [ ] `FIREBASE_CLIENT_EMAIL` — Firebase service account email
- [ ] `AWS_S3_BUCKET` — S3 bucket name for evidence
- [ ] `AWS_S3_REGION` — AWS region (e.g., us-east-1)
- [ ] `AWS_ACCESS_KEY_ID` — AWS access key for S3
- [ ] `AWS_SECRET_ACCESS_KEY` — AWS secret key for S3
- [ ] `CORS_ORIGIN` — Allowed frontend domain

**How to Verify** (Vercel Dashboard):
1. Go to Project Settings → Environment Variables
2. Filter by "Production" environment
3. Verify all 13+ variables are present
4. Verify no variables show as "incomplete" (missing values)

**✓ Verification Command**:
```bash
# After deployment, check health endpoint
curl https://api.imobi.com/api/v1/health

# Should return:
{
  "status": "ok",
  "redis": { "status": "connected" },
  "database": { "configured": true },
  "firebase": { "configured": true },
  "email": { "provider": "sendgrid", "configured": true }
}
```

### 1.3 Database Readiness

**✓ Prerequisites**:
- [ ] PostgreSQL 14+ instance provisioned and accessible
- [ ] PostGIS extension installed: `CREATE EXTENSION IF NOT EXISTS postgis;`
- [ ] Database user created with minimal privileges
- [ ] Connection string tested from API server
- [ ] Backups configured (automated daily snapshots)
- [ ] All migrations applied: `pnpm db:migrate:deploy`

**Verification**:
```bash
# Test connection from local machine (if accessible)
psql $DATABASE_URL -c "SELECT PostGIS_Version();"
# Should return PostGIS version (e.g., 3.2.0)

# Or check via Prisma
pnpm db:generate
pnpm db:migrate:status
# Should show "All migrations have been successfully applied"
```

### 1.4 External Services Health Check

**Redis**:
- [ ] Connection tested and working
- [ ] Persistence enabled (RDB or AOF)
- [ ] Eviction policy set to `allkeys-lru`
- [ ] Password configured

**SendGrid**:
- [ ] API key generated and stored in Vercel
- [ ] Sender email verified in SendGrid console
- [ ] Bounce/complaint handling configured
- [ ] Test email sent successfully

**Firebase**:
- [ ] Service account created
- [ ] Private key downloaded and (securely) stored
- [ ] Cloud Messaging enabled
- [ ] Test notification sent to test device

**AWS S3**:
- [ ] Bucket created with correct name
- [ ] CORS configured for frontend domain
- [ ] IAM user created with S3 permissions only
- [ ] Access key and secret stored in Vercel
- [ ] Test upload/download successful

---

## Phase 2: Deployment (45 minutes)

### 2.1 Deployment Method

**Recommended**: Vercel (automatic from git push)

```bash
# 1. Ensure all changes committed
git status  # Should be clean

# 2. Push to main branch
git push origin main

# 3. Vercel automatically deploys
# Monitor: https://vercel.com/contatovinicaetano93-commits/imobi/deployments

# 4. Wait for "Ready" status
# Expected time: 3-5 minutes
```

**Alternative** (if not using Vercel auto-deploy):
```bash
# Via Vercel CLI
vercel deploy --prod

# Or via Railway/other platform
railway deploy --service api
```

### 2.2 Deployment Status Monitoring

While deployment runs, monitor:

**Vercel Dashboard**:
- Build logs: Check for errors
- Function logs: Check /api/v1/health endpoint
- Environment: Verify variables loaded

**Expected Build Output**:
```
✓ Built successfully
✓ Analyzed 250 files
✓ Created 15 lambda functions
✓ API ready at https://api.imobi.com
```

**Common Build Failures**:
| Issue | Solution |
|-------|----------|
| "DATABASE_URL is not set" | Add to Vercel Environment Variables |
| "Jest tests fail" | Tests require JWT_SECRET (set as dummy if needed) |
| "PostGIS extension not found" | Database doesn't have PostGIS, install it |
| "Redis connection timeout" | REDIS_URL not accessible from Vercel |

### 2.3 Post-Deployment Health Check (5 minutes)

```bash
# 1. Test health endpoint
curl https://api.imobi.com/api/v1/health

# Expected: All services report "configured: true"

# 2. Test user registration
curl -X POST https://api.imobi.com/api/v1/auth/registrar \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test User",
    "email": "test-'$(date +%s)'@imobi.test",
    "cpf": "12345678901",
    "telefone": "+5511999999999",
    "senha": "TempPassword123!"
  }'

# Expected: Status 201, returns usuarioId and accessToken

# 3. Test login
curl -X POST https://api.imobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-user@imobi.test",
    "senha": "TempPassword123!"
  }'

# Expected: Status 200, returns accessToken

# 4. Monitor logs for errors
# Vercel: Project Settings → Logs
# Check for 500 errors, connection timeouts, etc.
```

---

## Phase 3: Validation (30 minutes)

Follow the **5-phase validation guide** in `PRODUCTION_VALIDATION.md`:

### Phase 1: API Health Check (5 min)
```bash
curl https://api.imobi.com/api/v1/health
# Expected: status = "ok", all services connected
```

### Phase 2: Authentication Flow (10 min)
- [ ] User registration works
- [ ] Login generates valid JWT
- [ ] Token verification succeeds
- [ ] Profile retrieval works

### Phase 3: Core Features (15 min)
- [ ] List works returns data
- [ ] Obra details complete
- [ ] Score retrieval works
- [ ] Notifications working
- [ ] Notifications mark as read

### Phase 4: Manager Portal (10 min)
- [ ] Dashboard shows KPIs
- [ ] Pending etapas list works
- [ ] Etapa approval flow complete
- [ ] KYC approval flow complete

### Phase 5: Performance (5 min)
- [ ] p95 response time < 800ms
- [ ] Cache hit ratio > 50%
- [ ] Rate limiting enforced
- [ ] Error responses descriptive

**Record Results**:
- Create file: `PRODUCTION_VALIDATION_RESULTS.md`
- Document timestamp, tester, status of each check
- Save for post-launch review

---

## Phase 4: Beta User Onboarding (30 minutes)

### 4.1 Create Beta Test Accounts

**Target Beta Testers**: 10-20 users across roles

```bash
# Script to create test accounts
# services/api/scripts/create-beta-testers.ts

# Types needed:
# - 3-5 CONSTRUTORA (construction company owners)
# - 3-5 GESTOR_OBRA (job site managers)
# - 2-3 ENGENHEIRO (engineers who upload evidence)
# - 1-2 PARCEIRO (partner/manager reviewers)

# Create via API or database seeding
```

**Test Account Template**:
```json
{
  "email": "construtor-beta-1@imobi.test",
  "senha": "BetaTest2026!",
  "nome": "Beta Construtor 1",
  "cpf": "11144477735",
  "telefone": "+5511987654321",
  "tipoUsuario": "CONSTRUTORA"
}
```

### 4.2 Distribute Access

**Via Email**:
1. Subject: "Welcome to Imobi Beta — Access Credentials"
2. Include:
   - App URL: https://app.imobi.com.br (web) or mobile app link
   - Test email and temporary password
   - Onboarding checklist (see 4.3)
   - Support email: support@imobi.com.br

**Password Reset Link**:
- Provide /auth/reset-password URL if implemented
- Testers must set own password on first login

### 4.3 Beta Testing Checklist

**Email to Testers**:
```
Welcome to Imobi Beta!

Please test the following workflows and report any issues:

ACCOUNT & PROFILE
- [ ] Create account / receive confirmation email
- [ ] Login with credentials
- [ ] Update profile information
- [ ] Upload KYC documents (ID, CPF)

CONSTRUCTION WORKS
- [ ] Create a new work
- [ ] View work details
- [ ] Add stages (should auto-generate 9)
- [ ] See progress calculation

EVIDENCE & GPS
- [ ] Upload construction evidence photo
- [ ] GPS location validated correctly
- [ ] Photo geofence validated
- [ ] Evidence appears in stage

CREDIT & SCORING
- [ ] View credit simulator
- [ ] Request credit
- [ ] Check approval status
- [ ] View score and history

DASHBOARD
- [ ] All pages load
- [ ] Notifications appear
- [ ] No errors in browser console

ISSUES FOUND
- Please report via: [support form URL]
- Include: Browser, Device, Steps to Reproduce, Screenshot
```

### 4.4 Support Hotline

**Escalation Path**:
1. **Level 1** (Automated): Health check + error logs
   - Monitor: `https://api.imobi.com/api/v1/health`
   
2. **Level 2** (Product Team): Test triage
   - Contact: @product-manager
   - Response: Within 1 hour during business hours
   
3. **Level 3** (DevOps/Engineering): Critical issues
   - Contact: @devops-team
   - Response: Within 15 minutes (critical) or 1 hour (high)

**Incident Severity**:
| Severity | Impact | Response Time |
|----------|--------|---|
| Critical | Service down, data loss | 15 min |
| High | Feature broken, many users affected | 1 hour |
| Medium | Feature partially broken | 4 hours |
| Low | Minor UX issue, workaround exists | Next business day |

---

## Phase 5: Ongoing Monitoring (First 7 Days)

### 5.1 Daily Health Checks

**Morning Checklist** (8 AM):
```bash
# 1. API Health
curl https://api.imobi.com/api/v1/health

# 2. Database connections
# Vercel Logs: Check for "Connection refused" or "timeout"

# 3. Redis availability
# Check Upstash dashboard if applicable

# 4. Error rate
# Sentry dashboard: Should be < 1% (< 1 error per 100 requests)

# 5. Response times
# Vercel Analytics: p95 should be < 800ms
```

**Afternoon Review** (3 PM):
- Check error logs from past 4 hours
- Review user feedback from support
- Monitor resource usage (CPU, memory, connections)

**Evening Handoff** (6 PM):
- Document any incidents
- Plan next day actions
- Ensure on-call team has context

### 5.2 Monitoring Dashboards

**Vercel**:
- Deployments: https://vercel.com/contatovinicaetano93-commits/imobi/deployments
- Functions: Real-time function metrics
- Analytics: Traffic, error rate, response time

**Error Tracking** (if configured):
- Sentry/Datadog dashboard for exceptions
- Alert threshold: Error rate > 5%

**Database**:
- Connection pool health (target: 0 timeouts/hour)
- Slow queries (alert on > 5s queries)
- Disk usage (alert at > 80%)

**Redis** (Upstash):
- Upstash dashboard: Connection count, memory usage
- Cache hit ratio: Target > 70%

### 5.3 Alert Thresholds (24/7 Monitoring)

| Metric | Threshold | Action |
|--------|-----------|--------|
| Error rate | > 5% | Page on-call engineer immediately |
| p95 latency | > 2000ms | Investigate database/Redis |
| Database connections | > 80% of pool | Check for connection leaks |
| Redis memory | > 90% | Manual cache clear or expand |
| Failed registrations | > 10 in 1 hour | Check email service |
| Failed logins | > 20 in 1 hour | Check JWT service or DB |

### 5.4 Weekly Review Meeting

**When**: Every Friday 4 PM  
**Duration**: 30 minutes  
**Attendees**: Product, Engineering, DevOps

**Agenda**:
1. Incident review (any production issues)
2. Performance trends (latency, error rate)
3. User feedback from beta testers
4. Scaling needs (approaching limits?)
5. Go/No-Go for next phase (public launch)

---

## Phase 6: Transition to Public Launch

**Criteria for Public Launch**:
- [ ] Zero critical issues for 3 consecutive days
- [ ] Error rate consistently < 1%
- [ ] p95 response time < 500ms
- [ ] All 10-20 beta testers report positive experience
- [ ] Support team trained on common issues
- [ ] Documentation complete (API, user guides)
- [ ] Monitoring and alerts configured

**Action Items** (1 week before public launch):
1. Increase beta user capacity to 100 users
2. Load test with 100 concurrent users
3. Finalize marketing materials
4. Schedule public launch date
5. Notify users: "Coming to public beta on [date]"

---

## Rollback Plan

**If Critical Issues Occur** (cannot be resolved in 1 hour):

### Option 1: Revert Deployment (Vercel)
```bash
# Vercel auto-keeps previous 10 deployments
# In Vercel Dashboard:
1. Go to Deployments tab
2. Find previous stable deployment
3. Click "Promote to Production"
4. Deployment reverts within 2 minutes
```

### Option 2: Disable Feature Flags
```bash
# If specific features are broken:
1. Update FEATURE_FLAGS in environment
2. Redeploy (only takes 2 minutes)
3. Affects users with cached old behavior
```

### Option 3: Database Rollback
```bash
# If migration corrupted data:
1. Stop API (disable in Vercel)
2. Restore database from last backup
3. Restart API
4. Re-apply migrations
# Total time: 15-30 minutes
```

**Communication**:
- Post status update: "We're investigating an issue. ETA for fix: XX minutes"
- After fix: "Issue resolved. Thank you for your patience"
- Post-mortem: Document root cause and prevention

---

## Incident Response Runbook

### Scenario 1: Database Connection Failures

**Symptoms**: 500 errors, "Connection refused"

**Immediate Actions** (< 5 min):
```bash
1. Check DATABASE_URL in Vercel dashboard
2. Verify database is running (AWS RDS console)
3. Check connection pool exhaustion:
   - SELECT count(*) FROM pg_stat_activity;
4. If pool full: Restart API (Vercel → Deployments → Redeploy)
```

**Root Cause**: Usually means API has too many open connections

**Fix**: 
- Increase connection pool in `services/api/src/main.ts`
- Or increase database machine size

### Scenario 2: Redis/Cache Unavailable

**Symptoms**: Cache misses, high response times, "ECONNREFUSED"

**Immediate Actions**:
```bash
1. Check REDIS_URL in Vercel dashboard
2. Check Upstash dashboard for connectivity
3. Restart Redis (if on Render/Railway)
4. Clear environment cache and redeploy
```

**Fallback**: API continues without caching (slower but functional)

### Scenario 3: Email Service Down

**Symptoms**: "Email not sent" errors, notifications not delivered

**Immediate Actions**:
```bash
1. Check SendGrid dashboard (Status page)
2. Verify SENDGRID_API_KEY is correct
3. Switch to alternative provider if needed:
   - EMAIL_PROVIDER=ses (AWS SES)
   - Or SMTP fallback
```

**Fallback**: Emails queue in BullMQ and retry later

### Scenario 4: High Error Rate (> 5%)

**Diagnosis**:
```bash
1. Check Sentry/error logs
2. Identify error pattern (same endpoint? same user?)
3. Check recent deployments (was anything changed?)
4. Check external service status (Firebase, AWS)
```

**Common Causes**:
- Invalid JWT_SECRET → Users can't login
- Missing environment variable → Specific feature fails
- Database migration incompleteness → Data access errors
- Rate limiting too strict → 429 errors

**Fix**: Depends on cause, see specific scenarios above

---

## Checklist Summary

### Pre-Launch
- [ ] Type-check passes: `pnpm type-check`
- [ ] All environment variables set in Vercel dashboard
- [ ] Database backups configured
- [ ] Health endpoint returns status: ok
- [ ] User registration test succeeds
- [ ] Login test succeeds

### Day of Launch
- [ ] Git push to main
- [ ] Vercel build completes successfully
- [ ] Health check passes (all services connected)
- [ ] Run 5-phase validation (PRODUCTION_VALIDATION.md)
- [ ] Document results in PRODUCTION_VALIDATION_RESULTS.md
- [ ] Create beta test accounts
- [ ] Distribute to 10-20 beta testers
- [ ] Stand up support hotline

### First 7 Days
- [ ] Daily morning health check
- [ ] Review error logs every 4 hours
- [ ] Weekly Friday review meeting
- [ ] Monitor error rate < 1%
- [ ] Monitor p95 latency < 800ms
- [ ] Respond to user feedback

### Before Public Launch
- [ ] Zero critical issues for 3 days
- [ ] All success criteria met
- [ ] Support team trained
- [ ] Marketing ready
- [ ] Schedule public beta date

---

## Contacts & Escalation

**On-Call Schedule**:
- Weekdays 8 AM - 6 PM: @devops-team + @product-manager
- Evenings/Weekends: @devops-oncall (pagerduty)

**Slack Channels**:
- #imobi-launch — General updates
- #imobi-incidents — Real-time incident tracking
- #imobi-beta-feedback — User feedback from testers

**Email Escalation**:
- devops@imobi.com.br — Infrastructure issues
- support@imobi.com.br — User support
- product@imobi.com.br — Product decisions

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-05-28 | Claude Code | Initial SOP for soft launch |

---

**Status**: Ready for soft launch on May 28, 2026  
**Next Review**: June 4, 2026 (post-launch retrospective)
