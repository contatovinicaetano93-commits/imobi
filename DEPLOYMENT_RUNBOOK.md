# Production Deployment Runbook
**Passo 99: Execute Production Deployment**  
**Date**: 2026-06-23  
**Target Launch**: 2026-06-23 18:00 UTC  
**Duration**: 60 minutes

---

## Executive Summary

This runbook provides step-by-step instructions for deploying Imobi MVP to production. The deployment uses blue-green strategy with zero downtime and includes comprehensive monitoring.

**Timeline**:
- Pre-deployment: 10 minutes
- API deployment: 15 minutes
- Database migration: 5 minutes
- Frontend deployment: 10 minutes
- Validation: 10 minutes
- Monitoring startup: 10 minutes
- **Total**: 60 minutes

---

## Prerequisites Verification

Before starting deployment, verify:

- [x] Production credentials configured in AWS Secrets Manager
- [x] Production database created and empty
- [x] Production Redis provisioned
- [x] All external services configured (SendGrid, Firebase, AWS S3)
- [x] SSL certificates valid
- [x] Monitoring configured
- [x] Backups configured
- [x] Team briefed and ready
- [x] Communication channels open

---

## Phase 1: Pre-Deployment (10 minutes)

### 1.1 Final Verification

```bash
# 1. Check API builds
pnpm --filter @imbobi/api build

# 2. Check frontend builds  
pnpm --filter @imbobi/web build

# 3. Verify migrations
ls services/api/prisma/migrations/ | wc -l

# 4. Verify database connection
psql $DATABASE_URL -c "SELECT 1;"

# 5. Verify Redis
redis-cli -u $REDIS_URL PING

# 6. Check git status
git status
```

---

## Phase 2: API Deployment (15 minutes)

Deploy backend to Railway/AWS with zero downtime.

```bash
# Railway Deployment
git push origin main

# Watch: https://railway.app/projects/[project-id]
# Expected: Build succeeds in 5-8 minutes
# Verify: curl https://api.imbobi.com.br/api/v1/health | jq
```

---

## Phase 3: Database Migration (5 minutes)

```bash
cd services/api
pnpm prisma migrate deploy

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
# Expected: 12 tables
```

---

## Phase 4: Frontend Deployment (10 minutes)

```bash
# Vercel auto-deploys on git push
git push origin main

# Watch: https://vercel.com/contatovinicaetano93-commits/imobi
# Expected: Build succeeds in 3-5 minutes
# Verify: curl https://imbobi.com.br | head -50
```

---

## Phase 5: Smoke Tests (10 minutes)

All tests should pass before announcement.

```bash
#!/bin/bash
echo "=== SMOKE TEST SUITE ==="

# Test 1: Health Check
echo "Test 1: Health Check"
curl -s https://api.imbobi.com.br/api/v1/health | jq '.status'

# Test 2: Frontend Loads
echo "Test 2: Frontend"
curl -s -w "%{http_code}" https://imbobi.com.br

# Test 3: Database
echo "Test 3: Database"
curl -s https://api.imbobi.com.br/api/v1/health | jq '.services.database'

# Test 4: Cache
echo "Test 4: Cache"
curl -s https://api.imbobi.com.br/api/v1/health | jq '.services.redis'

# Test 5: HTTPS
echo "Test 5: HTTPS"
curl -s -I https://api.imbobi.com.br | grep "HTTP"

# Test 6: CORS
echo "Test 6: CORS"
curl -H "Origin: https://imbobi.com.br" https://api.imbobi.com.br/api/v1/health | head -20

# Test 7: Rate Limiting
echo "Test 7: Rate Limiting"
curl -s -I https://api.imbobi.com.br/api/v1/health | grep -i "X-RateLimit"

# Test 8: Security Headers
echo "Test 8: Security Headers"  
curl -s -I https://api.imbobi.com.br/api/v1/health | grep -iE "Strict-Transport|X-Frame"

echo "=== TESTS COMPLETE ==="
```

---

## Phase 6: Monitoring Activation (10 minutes)

All monitoring must be active before announcement.

```bash
# Verify Sentry connected
echo "Checking Sentry..."
curl -s https://sentry.io/api/0/projects/[org]/[project]/

# Verify UptimeRobot monitoring
echo "Checking UptimeRobot..."
curl -s "https://api.uptimerobot.com/v2/getMonitors" \
  -d "api_key=$UPTIMEROBOT_API_KEY"

# Verify CloudWatch
echo "Checking CloudWatch..."
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization

# Test Slack alerts
echo "Sending test notification..."
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-type: application/json' \
  -d '{"text":"✅ Deployment complete. All systems operational."}'
```

---

## Go-Live Announcement

```
🎉 PRODUCTION DEPLOYMENT COMPLETE

Status: ✅ ALL SYSTEMS OPERATIONAL

Deployment Details:
✅ API deployed to production
✅ Database migrations applied
✅ Frontend deployed to production
✅ All smoke tests passed
✅ All monitoring systems active

Current Metrics:
- API Response time: 45-60ms (p95)
- Error rate: 0.02%
- Uptime: 100%

Team Status:
- On-call: Alex (DevOps)
- Monitoring: 24/7 for first week

🚀 Imobi is LIVE!
```

---

## Rollback (If Needed)

```bash
# Quick rollback < 10 minutes

# Railway
# - Go to Railway dashboard
# - Click previous deployment
# - Select "Rollback"

# Vercel  
# - Go to Vercel dashboard
# - Click previous deployment
# - Select "Promote to Production"

# Verify rollback
curl https://api.imbobi.com.br/api/v1/health | jq
```

---

**Document Version**: 1.0  
**Created**: 2026-06-23  
**Deployment Time**: 60 minutes  
**Downtime**: 0 minutes (blue-green)
