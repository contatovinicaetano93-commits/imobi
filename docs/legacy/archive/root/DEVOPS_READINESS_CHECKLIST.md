# iMobi MVP DevOps Readiness Checklist

**Cutover Date**: 02/06/2026 02:00 BRT  
**Status**: Pre-deployment validation  
**Owner**: DevOps Team  
**Last Updated**: 2026-05-29

---

## Overview

This checklist ensures the iMobi infrastructure is production-ready with zero downtime, zero data loss, and acceptable performance metrics. Each item must be verified and marked ✅ before cutover. Items marked ❌ block deployment. Items marked ⚠️ require attention but may allow conditional deployment.

---

## 1. VERCEL WEB DEPLOYMENT

### ✅ Item 1.1: Vercel Project Linked
**Why**: Web application requires proper Git integration and deployment configuration.  
**How to verify**:
```bash
# Check vercel.json exists and is properly configured
cat vercel.json | jq '.framework, .buildCommand'

# Verify CLI login
vercel whoami

# List deployed projects
vercel projects list | grep imbobi
```
**Expected**: `framework: nextjs`, `buildCommand` includes `pnpm build`, user authenticated.

---

### ✅ Item 1.2: Environment Variables Configured (15 required)
**Why**: Application fails to start without critical environment variables.  
**Required Variables**:
1. `NODE_ENV=production`
2. `NEXT_PUBLIC_API_URL=https://api.imbobi.com.br`
3. `NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/123456`
4. `NEXT_PUBLIC_SENTRY_RELEASE=1.0.0` (matches API version)
5. `CORS_ORIGIN=https://app.imbobi.com.br,https://imbobi.com.br`
6. `EMAIL_PROVIDER=sendgrid`
7. `SENDGRID_API_KEY=SG.xxxxx...` (or equivalent)
8. `FIREBASE_PROJECT_ID=imbobi-prod`
9. `FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...`
10. `FIREBASE_CLIENT_EMAIL=firebase-admin@imbobi-prod.iam.gserviceaccount.com`
11. `AWS_S3_BUCKET=imbobi-evidencias-prod`
12. `AWS_S3_REGION=us-east-1`
13. `AWS_ACCESS_KEY_ID=AKIA...` (S3 credentials)
14. `AWS_SECRET_ACCESS_KEY=...` (S3 secret)
15. `SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/789012` (optional but recommended)

**How to verify**:
```bash
# List all production environment variables
vercel env ls --prod

# Verify critical vars are set (non-empty)
vercel env pull --prod .env.vercel.prod
cat .env.vercel.prod | grep -E "NODE_ENV|NEXT_PUBLIC_API_URL|SENTRY_DSN"
```
**Expected**: All 15 variables present, none empty or placeholder values.

---

### ✅ Item 1.3: Build & Deployment Success
**Why**: Verifies build pipeline can complete and deploy within acceptable time.  
**How to verify**:
```bash
# Trigger a test deployment to staging environment
vercel deploy --prod --skip-build=false

# Monitor build logs
vercel logs --prod --follow
```
**Expected**: Build completes in < 5 minutes, no errors, deployment succeeds.

---

## 2. DATABASE - POSTGRESQL & POSTGIS

### ✅ Item 2.1: PostgreSQL Connection String Valid
**Why**: API cannot function without database connectivity.  
**How to verify**:
```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection using psql
psql "$DATABASE_URL" -c "SELECT version();"

# Verify PostGIS extension is installed
psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis; SELECT PostGIS_Version();"
```
**Expected**: Connection successful, PostgreSQL 14+, PostGIS 3.3+ installed.

---

### ✅ Item 2.2: Database Migrations Applied
**Why**: Schema mismatch causes runtime errors and data corruption.  
**How to verify**:
```bash
# Check migration status
pnpm db:generate
pnpm --filter @imbobi/api prisma migrate status

# Verify Prisma client is up-to-date
ls -la services/api/node_modules/.prisma/client/
```
**Expected**: All pending migrations applied, "Database is up to date" message.

---

### ✅ Item 2.3: Connection Pooling Configured
**Why**: Prevents connection exhaustion under load; Render's Postgres requires pooling.  
**How to verify**:
```bash
# Check Prisma connection pooling in schema.prisma
grep -A 5 "datasource db" services/api/prisma/schema.prisma

# Verify connection pool settings in services/api/src/common/config.ts
grep -i "pool\|connection" services/api/src/common/config.ts
```
**Expected**: Connection pool size set to 5-20 for production (Render Postgres recommend 5-10).

---

### ✅ Item 2.4: Database Backups Enabled
**Why**: Disaster recovery and point-in-time restore capability.  
**How to verify** (Render console):
1. Login to Render: https://dashboard.render.com
2. Select PostgreSQL instance
3. Check **Backups** tab: ✅ Daily automated backups enabled
4. Verify backup retention: ≥ 7 days
5. Take manual backup now as pre-cutover snapshot

**Expected**: Daily backups enabled, retention ≥ 7 days, last backup < 24h old.

---

## 3. CACHE - REDIS

### ✅ Item 3.1: Redis Connection Valid
**Why**: Job queue (liberacao-parcela) and caching depend on Redis; missing Redis = no notifications.  
**How to verify**:
```bash
# Set REDIS_URL or REDIS_HOST environment variables
export REDIS_URL="redis://default:password@host:6379"
# OR
export REDIS_HOST="host"
export REDIS_PORT="6379"
export REDIS_PASSWORD="password"

# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD PING
# Expected: PONG

# Check via API health endpoint
curl http://localhost:4000/api/v1/health | jq '.redis'
```
**Expected**: Redis responds with PONG, health endpoint shows `"status": "connected"`.

---

### ✅ Item 3.2: Redis Persistence Enabled (RDB Snapshots)
**Why**: Job queue data persists across Redis restarts; prevents job loss.  
**How to verify** (AWS ElastiCache console):
1. Login to AWS Console → ElastiCache → Redis
2. Select production cluster
3. Check **Parameter Groups** → Verify:
   - `save`: "900 1 300 10 60 10000" (RDB snapshots enabled)
   - `appendonly`: "no" (disable AOF, use RDB)
4. Check **Backup & Recovery**: ✅ Automated backups enabled

**Expected**: Snapshots configured, backup window defined (e.g., 03:00-04:00 UTC).

---

### ✅ Item 3.3: Redis Memory Monitoring & Limits
**Why**: Prevents OOM crashes; identifies memory leaks in production.  
**How to verify**:
```bash
# Check max memory setting
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD CONFIG GET maxmemory

# Check current usage
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD INFO memory | grep "used_memory_human"

# For AWS ElastiCache: use CloudWatch metric
# Metric: EngineCPUUtilization, SwapUsage (should be 0)
```
**Expected**: `maxmemory` set (≥ 256MB), current usage < 50%, no swap usage.

---

### ✅ Item 3.4: Redis Failover Tested
**Why**: Verifies disaster recovery; ensures automatic failover works.  
**How to verify** (for production cluster):
```bash
# For AWS ElastiCache Multi-AZ:
# 1. Go to ElastiCache console
# 2. Select cluster → Actions → Test failover
# 3. Monitor logs during failover
# 4. Verify automatic reconnection within 2 minutes

# Check failover behavior in application logs
tail -f /var/log/imbobi-api.log | grep -i redis
```
**Expected**: Failover completes in < 2 minutes, no data loss, app reconnects automatically.

---

## 4. STORAGE - AWS S3

### ✅ Item 4.1: S3 Bucket Exists & Is Accessible
**Why**: Evidence photos storage; missing bucket = no file uploads.  
**How to verify**:
```bash
# List all S3 buckets
aws s3 ls --profile imbobi-prod | grep evidencias

# Check bucket exists specifically
aws s3 ls s3://imbobi-evidencias-prod --profile imbobi-prod

# Test write permission
echo "test" | aws s3 cp - s3://imbobi-evidencias-prod/test.txt --profile imbobi-prod

# Clean up test file
aws s3 rm s3://imbobi-evidencias-prod/test.txt --profile imbobi-prod
```
**Expected**: Bucket listed, read/write operations succeed.

---

### ✅ Item 4.2: S3 Bucket Versioning Enabled
**Why**: Accidental deletions recoverable; audit trail for compliance.  
**How to verify**:
```bash
# Check versioning status
aws s3api get-bucket-versioning \
  --bucket imbobi-evidencias-prod \
  --profile imbobi-prod | jq '.Status'

# If not enabled, enable it
aws s3api put-bucket-versioning \
  --bucket imbobi-evidencias-prod \
  --versioning-configuration Status=Enabled \
  --profile imbobi-prod
```
**Expected**: Status = "Enabled".

---

### ✅ Item 4.3: S3 Lifecycle Policy (Cleanup)
**Why**: Controls storage costs; removes old/incomplete uploads.  
**How to verify**:
```bash
# Check lifecycle rules
aws s3api get-bucket-lifecycle-configuration \
  --bucket imbobi-evidencias-prod \
  --profile imbobi-prod

# Recommended: Delete incomplete multipart uploads after 7 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket imbobi-evidencias-prod \
  --lifecycle-configuration file://s3-lifecycle.json \
  --profile imbobi-prod
```
**Expected**: Lifecycle rules configured (delete incomplete uploads, archive old versions).

---

### ✅ Item 4.4: S3 IAM Credentials Valid
**Why**: Application cannot upload without valid AWS credentials.  
**How to verify**:
```bash
# Check AWS credentials are set
echo "AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:0:10}..."
echo "AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:0:10}..."

# Test IAM permissions
aws sts get-caller-identity --profile imbobi-prod

# Verify S3 permissions in IAM policy
aws iam get-user-policy \
  --user-name imbobi-s3-user \
  --policy-name imbobi-s3-policy \
  --profile imbobi-prod | jq '.UserPolicy.PolicyDocument'
```
**Expected**: Credentials valid, IAM user has S3 permissions (s3:GetObject, s3:PutObject, s3:ListBucket).

---

## 5. EMAIL & NOTIFICATIONS

### ✅ Item 5.1: Email Provider Configured
**Why**: Transactional emails (password reset, confirmations) required for app functionality.  
**How to verify**:
```bash
# Check configured provider
echo $EMAIL_PROVIDER

# For SendGrid:
curl https://api.sendgrid.com/v3/mail/validate \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json"

# For AWS SES:
aws ses verify-email-identity \
  --email-address noreply@imbobi.com.br \
  --region us-east-1 \
  --profile imbobi-prod

# For SMTP: Test via telnet (manual)
telnet $SMTP_HOST $SMTP_PORT
```
**Expected**: Provider responds successfully (SendGrid HTTP 200, SES verified email, SMTP connects).

---

### ✅ Item 5.2: Firebase Cloud Messaging (FCM) Configured
**Why**: Push notifications to mobile app users; required for engagement.  
**How to verify**:
```bash
# Check Firebase credentials are set
echo "FIREBASE_PROJECT_ID: $FIREBASE_PROJECT_ID"
echo "FIREBASE_CLIENT_EMAIL: $FIREBASE_CLIENT_EMAIL"
echo "FIREBASE_PRIVATE_KEY present: $([ -n '$FIREBASE_PRIVATE_KEY' ] && echo 'YES' || echo 'NO')"

# Test via API health endpoint
curl http://localhost:4000/api/v1/health | jq '.firebase'

# Verify service account JSON in Firebase Console:
# https://console.firebase.google.com → Project Settings → Service Accounts
```
**Expected**: All three credentials present, Firebase console shows active project.

---

## 6. MONITORING & ERROR TRACKING

### ✅ Item 6.1: Sentry Projects Created & DSNs Configured
**Why**: Real-time error tracking; essential for post-deployment debugging.  
**How to verify**:
```bash
# Verify Sentry DSN is set (API)
echo "SENTRY_DSN: $SENTRY_DSN"

# Verify Sentry DSN is set (Web)
echo "NEXT_PUBLIC_SENTRY_DSN: $NEXT_PUBLIC_SENTRY_DSN"

# Test Sentry connectivity
curl -X POST https://o123456.ingest.sentry.io/123456 \
  -H "Content-Type: application/json" \
  -d '{"dsn":"'"$SENTRY_DSN"'","exception":{"values":[]}}'

# Verify projects in Sentry dashboard
# https://sentry.io/organizations/imbobi/projects/
```
**Expected**: Two separate Sentry projects (API + Web), DSNs in environment, connectivity confirmed.

---

### ✅ Item 6.2: Sentry Release Tags Match
**Why**: Correlates errors to specific code versions; enables pinpointing bug introductions.  
**How to verify**:
```bash
# Check version consistency
echo "SENTRY_RELEASE: $SENTRY_RELEASE"
echo "NEXT_PUBLIC_SENTRY_RELEASE: $NEXT_PUBLIC_SENTRY_RELEASE"

# Both must be identical (e.g., "1.0.0")
[ "$SENTRY_RELEASE" = "$NEXT_PUBLIC_SENTRY_RELEASE" ] && echo "✅ Releases match" || echo "❌ Releases mismatch"
```
**Expected**: Release tags identical across API and Web (e.g., "1.0.0").

---

## 7. SSL/TLS & SECURITY

### ✅ Item 7.1: SSL Certificates Valid
**Why**: HTTPS connections fail if certificates are expired or self-signed in production.  
**How to verify**:
```bash
# Check Vercel certificate (auto-managed by Vercel, no action needed)
# Verify via browser
curl -I https://imbobi.com.br | grep "HTTP"

# Check certificate expiry
openssl s_client -connect imbobi.com.br:443 < /dev/null | \
  openssl x509 -noout -dates

# Expected expiry: > 30 days in the future
```
**Expected**: Certificate valid, expiry > 30 days, no warnings.

---

### ✅ Item 7.2: JWT Secret Configured & Rotated
**Why**: Weak secrets compromise authentication; unrotated secrets are security risk.  
**How to verify**:
```bash
# Check JWT secret is set (non-empty)
[ -n "$JWT_SECRET" ] && echo "✅ JWT_SECRET set" || echo "❌ JWT_SECRET missing"

# Verify secret length (min 64 chars)
echo -n "$JWT_SECRET" | wc -c
# Expected: ≥ 64 characters

# Verify secret is random (not hardcoded default)
grep -r "gerar_uma_chave" . 2>/dev/null && echo "❌ Default secret detected" || echo "✅ Secret is unique"
```
**Expected**: Secret set, ≥ 64 characters, not default value.

---

### ✅ Item 7.3: CORS Origins Whitelisted
**Why**: Prevents unauthorized cross-origin requests; mitigates CSRF attacks.  
**How to verify**:
```bash
# Check CORS_ORIGIN is set
echo $CORS_ORIGIN

# Test with curl (should return 200 if origin is whitelisted)
curl -H "Origin: https://imbobi.com.br" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS https://api.imbobi.com.br/api/v1/health -v | grep "Access-Control-Allow-Origin"

# Verify no wildcard (*) is used in production
echo $CORS_ORIGIN | grep -q "\*" && echo "⚠️ Wildcard CORS detected" || echo "✅ Specific origins only"
```
**Expected**: Only production domains whitelisted, no wildcards.

---

## 8. RATE LIMITING & DDoS PROTECTION

### ✅ Item 8.1: Rate Limiting Enabled on All Public Endpoints
**Why**: Prevents brute force attacks, protects against DoS/DDoS.  
**How to verify**:
```bash
# Check ThrottlerGuard is registered in API
grep -r "ThrottlerGuard\|@Throttle" services/api/src/ | head -5

# Test rate limiting
for i in {1..50}; do
  curl -s -o /dev/null -w "%{http_code}\n" https://api.imbobi.com.br/api/v1/health
done | sort | uniq -c
# Expected: After ~30 requests, see 429 (Too Many Requests)
```
**Expected**: Rate limiting returns 429 after threshold exceeded.

---

### ✅ Item 8.2: DDoS Protection (Vercel Edge)
**Why**: Vercel provides built-in DDoS mitigation; no additional configuration needed.  
**How to verify**:
```bash
# Verify deployment is on Vercel Edge (automatic)
vercel info --prod | grep -i "edge"

# Check CloudFlare integration (optional, if enabled)
# https://vercel.com/docs/concepts/edge-network/edge-middleware
```
**Expected**: Application served from Vercel Edge Network globally.

---

## 9. PERFORMANCE & LOAD TESTING

### ✅ Item 9.1: Health Endpoints Respond < 500ms (p95)
**Why**: Verifies API responsiveness under load; identifies performance bottlenecks pre-cutover.  
**How to verify**:
```bash
# Run load test with Apache Bench
ab -n 1000 -c 50 https://api.imbobi.com.br/api/v1/health

# Check response time percentiles
# Expected output: "Time per request" < 500ms (mean), < 1000ms (max)

# Or use wrk for advanced metrics
wrk -t12 -c400 -d30s https://api.imbobi.com.br/api/v1/health
```
**Expected**: p95 response time < 500ms, p99 < 1000ms.

---

### ✅ Item 9.2: Database Query Performance (< 100ms average)
**Why**: Slow queries cascade into API timeouts; must be optimized pre-production.  
**How to verify**:
```bash
# Enable query logging in PostgreSQL
psql "$DATABASE_URL" -c "SET log_min_duration_statement = 100;"

# Run integration tests
pnpm test --filter @imbobi/api

# Check slow query logs
grep "duration:" /var/log/postgresql/postgresql.log | \
  awk '{print $NF}' | sort -n | tail -10
```
**Expected**: Most queries complete in < 100ms, no queries > 1000ms.

---

## 10. DEPLOYMENT & MONITORING INTEGRATION

### ✅ Item 10.1: Monitoring Dashboards Accessible
**Why**: On-call team needs real-time visibility during cutover.  
**How to verify**:
```bash
# Sentry Dashboard
# https://sentry.io/organizations/imbobi/issues/?project=...

# Vercel Analytics
# https://vercel.com/dashboard?...

# AWS CloudWatch (Redis, RDS)
# https://console.aws.amazon.com/cloudwatch/

# Test access with team credentials
curl -H "Authorization: Bearer $SENTRY_TOKEN" \
  https://sentry.io/api/0/organizations/imbobi/stats/
```
**Expected**: All dashboards accessible, metrics populated with data.

---

### ✅ Item 10.2: Alerting Rules Configured
**Why**: Ensures critical issues trigger notifications to on-call team.  
**How to verify**:
```bash
# Sentry Alerts
# https://sentry.io/organizations/imbobi/alerts/

# CloudWatch Alarms
aws cloudwatch describe-alarms --region us-east-1 --profile imbobi-prod

# Verify alert channels (Slack, PagerDuty, Email)
# Expected: ≥ 5 alert rules configured
```
**Expected**: Error rate, response time, database, Redis, and deployment alerts active.

---

### ✅ Item 10.3: On-Call Escalation Defined
**Why**: Ensures 24/7 incident response capability.  
**How to verify**:
1. Document on-call schedule (see MONITORING_SETUP.md)
2. Verify phone numbers are correct and reachable
3. Test Slack notifications via test alert
4. Confirm PagerDuty/Opsgenie integration (if used)

**Expected**: On-call team confirmed, phone numbers verified, escalation tree documented.

---

## SIGN-OFF

### Pre-Cutover Validation

- [ ] All 22 checklist items reviewed
- [ ] ❌ Items resolved or escalated
- [ ] ⚠️ Items have documented mitigations
- [ ] Backups verified (Database + Redis)
- [ ] Failover tested (Database + Redis)
- [ ] Load testing completed
- [ ] Team briefing completed (cutover runbook distributed)
- [ ] On-call schedule confirmed
- [ ] Rollback plan documented and tested

### Deployment Sign-Off

**DevOps Lead**: _________________ Date: _________  
**Engineering Lead**: _________________ Date: _________  
**Product Owner**: _________________ Date: _________

---

## Post-Cutover Checklist (First 4 Hours)

### Every 15 minutes during cutover window (02:00-06:00 BRT):
- [ ] Check Sentry error rate (target: < 1%)
- [ ] Monitor API response times (target: p95 < 500ms)
- [ ] Verify database connection pool (target: active < 10)
- [ ] Check Redis memory usage (target: < 70%)
- [ ] Monitor S3 upload success rate (target: 100%)
- [ ] Verify email delivery (check logs for errors)
- [ ] Monitor Vercel deployment (check analytics)

### Every hour:
- [ ] Spot-check critical user flows (login, create obra, upload evidence)
- [ ] Review CloudWatch logs for errors
- [ ] Check database backup completion
- [ ] Verify Redis persistence is working

### If any issue detected:
- [ ] Gather logs immediately
- [ ] Notify on-call team via Slack + phone
- [ ] Initiate incident response procedure
- [ ] Document root cause for post-mortem

---

**Document Version**: 1.0  
**Last Review**: 2026-05-29  
**Next Review**: Post-cutover (2026-06-03)
