# PHASE 9: Launch Window Checklist — imobi Go-Live Execution

**Document Version:** 1.0  
**Created:** 2026-05-31  
**Launch Window:** 2026-06-02, 02:00-04:00 UTC  
**Owner:** DevOps Lead + Tech Lead  
**Critical Path Deadline:** 2026-06-01, 20:00 UTC (all sign-offs complete)  
**Status:** 🟡 Pending execution (targets updated hourly as checklist progresses)

---

## Overview

This document provides minute-by-minute execution guidance for the production go-live window. It is a living document that will be updated in real-time during the launch.

**Master Status Dashboard:**
- [ ] 24h before launch: All pre-flight checks GREEN
- [ ] 2h before launch: Final validation complete, team on standby
- [ ] 30min before launch: All systems verified, DNS ready for switch
- [ ] T+0 (02:00 UTC): Begin cutover, start monitoring
- [ ] T+2h (04:00 UTC): All smoke tests GREEN, declare go-live success

---

## PHASE 1: 24 HOURS BEFORE LAUNCH (2026-06-01, 02:00 UTC)

**Responsible:** DevOps Lead + Tech Lead + QA Lead  
**Duration:** 3 hours  
**Risk Level:** LOW (all work is non-blocking, can be paused if needed)

### Pre-Flight Validation Tasks

#### 1.1 Run Comprehensive Smoke Test (17 Happy Paths)

**Duration:** 30 minutes  
**Location:** Staging environment (exact replica of production)  
**Tool:** Postman / k6 / Custom test suite  
**Success Criteria:** 100% pass rate (all 17 tests GREEN)

**Test Cases:**
```
User Flow (4 tests):
  ✓ Test 1.1: User sign-up with email validation
  ✓ Test 1.2: User login and session creation
  ✓ Test 1.3: User profile update
  ✓ Test 1.4: User logout and session cleanup

Obra Flow (3 tests):
  ✓ Test 2.1: Create new obra
  ✓ Test 2.2: Upload evidence (foto + GPS)
  ✓ Test 2.3: List obras with filtering

Parcela Flow (5 tests):
  ✓ Test 3.1: Request parcela release
  ✓ Test 3.2: Parcela status tracking
  ✓ Test 3.3: Parcela payment processing
  ✓ Test 3.4: Validate receipt generation
  ✓ Test 3.5: Download receipt PDF

Payment Flow (3 tests):
  ✓ Test 4.1: Payment gateway integration
  ✓ Test 4.2: Transaction confirmation
  ✓ Test 4.3: Payment reversal (refund)

Admin Flow (2 tests):
  ✓ Test 5.1: Manager portal authentication
  ✓ Test 5.2: Transaction dashboard access
```

**Execution:**
```bash
# Run smoke test script
./scripts/smoke-test.sh --environment staging --exit-code-on-failure

# Expected output:
# ==========================================
# Smoke Test Results
# ==========================================
# Total: 17 tests
# Passed: 17 ✓
# Failed: 0
# Skipped: 0
# Duration: 28 minutes
# Status: READY FOR PRODUCTION
# ==========================================
```

**If any test fails:**
1. Log failure details in Slack #ops-critical
2. Investigate failure in staging (10 min)
3. If fixable: Apply hotfix, re-test (10 min)
4. If not fixable: ESCALATE to CTO → Possible schedule slip to 2026-06-09

**Sign-off:** QA Lead confirms in Slack: "✅ Smoke tests PASSED (17/17)"

---

#### 1.2 Database Backup Integrity Test

**Duration:** 20 minutes  
**Responsible:** DBA + DevOps Lead

**Steps:**

```bash
# 1. Take manual backup (in addition to automated backup)
pg_dump -U $PGUSER -h $PGHOST -d imbobi_prod \
  -Fc -f /backups/imbobi_prod_2026-06-01_02-00.dump

# 2. Verify backup integrity
pg_restore --list /backups/imbobi_prod_2026-06-01_02-00.dump | wc -l
# Expected: > 5000 (thousands of SQL objects)

# 3. Test restore to temporary database
createdb imbobi_test_restore
pg_restore -U $PGUSER -h $PGHOST \
  -d imbobi_test_restore \
  /backups/imbobi_prod_2026-06-01_02-00.dump

# 4. Verify restored data integrity
psql -U $PGUSER -h $PGHOST -d imbobi_test_restore -c \
  "SELECT COUNT(*) FROM usuarios; 
   SELECT COUNT(*) FROM obras; 
   SELECT COUNT(*) FROM parcelas;"
# Expected: All counts > 0

# 5. Run checksum validation
psql -U $PGUSER -h $PGHOST -d imbobi_test_restore -c \
  "SELECT md5(string_agg(id::text, '')) FROM usuarios;"
# Expected: Consistent hash (same after restore)

# 6. Clean up test database
dropdb imbobi_test_restore

# 7. Verify backup size
ls -lh /backups/imbobi_prod_2026-06-01_02-00.dump
# Expected: 2-5 GB (depending on data)

# 8. Verify backup location
aws s3 ls s3://imobi-backups/ | grep "2026-06-01"
# Expected: Backup visible in S3 for disaster recovery
```

**Success Criteria:**
- [ ] Backup size: 2-5 GB
- [ ] Restore time: < 30 minutes
- [ ] Data integrity: All tables restored correctly
- [ ] S3 backup: Present and verified

**Sign-off:** DBA confirms in Slack: "✅ Backup integrity VERIFIED (testable)"

---

#### 1.3 Redis Snapshot Created & Tested

**Duration:** 10 minutes  
**Responsible:** DevOps Lead

```bash
# 1. Create manual Redis snapshot
redis-cli -h $REDIS_HOST -p 6379 BGSAVE
# Wait for: "Background saving started"

# 2. Monitor snapshot progress
redis-cli -h $REDIS_HOST -p 6379 LASTSAVE
# Repeat every 10 seconds until save complete

# 3. Verify snapshot file
ls -lh /var/lib/redis/dump.rdb
# Expected: > 100 MB (contains queue jobs, cache)

# 4. Test snapshot restore (in staging only)
# Copy dump.rdb to staging Redis instance
cp /var/lib/redis/dump.rdb /staging/redis/dump.rdb
# Restart staging Redis to verify load

# 5. Confirm no data loss
redis-cli -h $REDIS_HOST -p 6379 DBSIZE
# Expected: > 10000 keys (jobs in queue, cached data)
```

**Success Criteria:**
- [ ] Snapshot created successfully
- [ ] Snapshot size: > 100 MB
- [ ] Restore verified in staging
- [ ] All queue jobs present after restore

**Sign-off:** DevOps Lead confirms: "✅ Redis snapshot TESTED (restorable)"

---

#### 1.4 Environment Variables Verified

**Duration:** 10 minutes  
**Responsible:** DevOps Lead

```bash
# 1. Compare staging vs. production configs
# (These should be identical except for database/API URLs)

# Staging env vars:
env | grep -E "DATABASE|REDIS|AWS|API" > /tmp/staging.env

# Production env vars:
env | grep -E "DATABASE|REDIS|AWS|API" > /tmp/prod.env

# 2. Verify critical variables exist
required_vars=(
  "DATABASE_URL"
  "REDIS_URL"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "SENTRY_DSN"
  "PAYMENT_API_KEY"
  "JWT_SECRET"
  "CORS_ORIGIN"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERROR: Missing required env var: $var"
    exit 1
  fi
done

# 3. Verify no plain-text secrets in code
git log -p --all -S "password=" | head -20
git log -p --all -S "api_key=" | head -20
# Expected: No matches (all secrets in env vars)

# 4. Verify database connection string
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c "SELECT version();"
# Expected: PostgreSQL version output

# 5. Verify Redis connection string
redis-cli -h $REDIS_HOST -p 6379 PING
# Expected: PONG
```

**Success Criteria:**
- [ ] All required env vars present
- [ ] Staging ≈ Production config (except endpoints)
- [ ] Database connection works
- [ ] Redis connection works
- [ ] No secrets in git history

**Sign-off:** DevOps Lead confirms: "✅ Environment variables VERIFIED"

---

#### 1.5 SSL Certificates Checked (>30 days validity)

**Duration:** 5 minutes  
**Responsible:** DevOps Lead

```bash
# 1. Check production certificate expiration
echo | openssl s_client -servername imobi.app -connect imobi.app:443 2>/dev/null \
  | openssl x509 -noout -dates

# Expected output:
# notBefore=Jun  1 00:00:00 2024 GMT
# notAfter=May 31 23:59:59 2027 GMT
# (>30 days remaining)

# 2. Check API certificate
echo | openssl s_client -servername api.imobi.app -connect api.imobi.app:443 2>/dev/null \
  | openssl x509 -noout -dates

# 3. Verify certificate chain
curl -I https://imobi.app 2>&1 | grep -i certificate
# Expected: No certificate warnings

# 4. Calculate days until expiration
expiry_date=$(echo | openssl s_client -servername imobi.app -connect imobi.app:443 2>/dev/null \
  | openssl x509 -noout -dates | grep notAfter | cut -d= -f2)
expiry_epoch=$(date -d "$expiry_date" +%s)
now_epoch=$(date +%s)
days_remaining=$(( ($expiry_epoch - $now_epoch) / 86400 ))
echo "Days remaining: $days_remaining"
# Expected: > 30 days
```

**Success Criteria:**
- [ ] Main domain (imobi.app): > 30 days
- [ ] API domain (api.imobi.app): > 30 days
- [ ] No certificate chain errors
- [ ] All certificates valid

**Sign-off:** DevOps Lead confirms: "✅ SSL certificates valid (> 30 days)"

---

#### 1.6 DNS Records Prepared & Staged

**Duration:** 5 minutes  
**Responsible:** DevOps Lead

```bash
# 1. Verify current DNS (still pointing to staging)
dig imobi.app +short
# Expected: Staging server IP

dig api.imobi.app +short
# Expected: Staging API IP

# 2. Prepare new production DNS records (not activated yet)
# In DNS provider (Route 53 / Cloudflare):
# ├─ imobi.app → production-server-ip (READY, NOT ACTIVE)
# ├─ api.imobi.app → production-api-ip (READY, NOT ACTIVE)
# ├─ www.imobi.app → redirect to imobi.app (READY, NOT ACTIVE)
# └─ mail.imobi.app → CNAME to mail service (READY, NOT ACTIVE)

# 3. Test DNS propagation (use nameservers)
dig imobi.app +short @8.8.8.8
# Expected: Still staging (DNS not yet switched)

# 4. Prepare rollback DNS (have it ready)
# If production fails, revert to staging:
# imobi.app → staging-server-ip (PREPARED)
```

**Success Criteria:**
- [ ] Production DNS records created (not activated)
- [ ] DNS switch can be done in < 1 minute
- [ ] Rollback DNS prepared
- [ ] TTL set to 60 seconds (for quick propagation)

**Sign-off:** DevOps Lead confirms: "✅ DNS records prepared (ready to switch)"

---

#### 1.7 Monitoring Dashboards Created & Tested

**Duration:** 15 minutes  
**Responsible:** DevOps Lead + Tech Lead

```bash
# 1. Create CloudWatch dashboard
# Dashboard name: imobi-production-launch-2026-06-02
# Widgets:
#   ├─ API Error Rate (chart, 5-min intervals)
#   ├─ API Latency p95 (chart, 5-min intervals)
#   ├─ Database Connections (gauge)
#   ├─ Redis Memory Usage (gauge)
#   ├─ Payment Processing Rate (chart)
#   └─ User Signups (chart)

# 2. Create Sentry dashboard
# Focus on:
#   ├─ Error rate trend
#   ├─ Top errors (by occurrence)
#   ├─ Affected transactions
#   ├─ Release version (v2.0.0)
#   └─ Deployment status

# 3. Test dashboard loading
curl -s https://us-west-2.console.aws.amazon.com/cloudwatch/...
# Expected: Dashboard loads in < 5 seconds

# 4. Add team bookmarks
# In browser: Bookmark all dashboards
# ├─ CloudWatch: https://console.aws.amazon.com/cloudwatch/...
# ├─ Sentry: https://sentry.io/organizations/imobi/...
# ├─ Railway: https://railway.app/project/...
# ├─ Vercel: https://vercel.com/dashboard/...
# └─ Custom: https://imobi.app/admin/monitoring

# 5. Test alert firing
# Trigger test alert in Sentry
# Expected: Slack notification arrives within 2 minutes
```

**Success Criteria:**
- [ ] CloudWatch dashboard created and loaded
- [ ] Sentry dashboard configured
- [ ] All dashboards load in < 5 seconds
- [ ] Test alerts fire correctly to Slack

**Sign-off:** DevOps Lead confirms: "✅ Monitoring dashboards READY"

---

#### 1.8 Team Availability Confirmed

**Duration:** 5 minutes  
**Responsible:** Tech Lead

**Checklist:**
- [ ] Tech Lead: Confirmed availability (24/7 starting 2026-06-02 02:00 UTC)
- [ ] DevOps Lead: Confirmed availability (24/7 for Week 1)
- [ ] QA Lead: Available for smoke tests (at launch window)
- [ ] Senior Dev A: Available for escalations
- [ ] Senior Dev B: Available for escalations
- [ ] CTO: Confirmed reachability (emergency contact)
- [ ] CEO: Confirmed reachability (executive decision authority)
- [ ] Customer Success: Team notified (support for users)

**Verification:**
- [ ] Slack status updated ("🔴 ON-CALL — Unavailable until after launch")
- [ ] Out-of-office replies disabled (or set to "active")
- [ ] Mobile phones charged (backup chargers available)
- [ ] Backup phones available (in case primary fails)
- [ ] Headsets/earbuds tested (for phone escalations)
- [ ] Conference room booked (launch war room, 02:00-04:00 UTC)

**Sign-off:** Tech Lead confirms: "✅ Team availability CONFIRMED (100% ready)"

---

### End of Phase 1 Checklist

**Sign-Off Required (Tech Lead):**

```
🟢 PHASE 1 COMPLETE — 24 HOURS BEFORE LAUNCH

All pre-flight checks: ✅ GREEN

✓ Smoke tests passed (17/17)
✓ Database backup tested and restorable
✓ Redis snapshot created and verified
✓ Environment variables verified
✓ SSL certificates valid (> 30 days)
✓ DNS records prepared and staged
✓ Monitoring dashboards ready
✓ Team availability confirmed

Status: READY TO PROCEED TO PHASE 2

Signature: _________________________ (Tech Lead)
Timestamp: 2026-06-01 05:00 UTC
```

---

## PHASE 2: 2 HOURS BEFORE LAUNCH (2026-06-02, 00:00 UTC)

**Responsible:** DevOps Lead + Tech Lead  
**Duration:** 2 hours  
**Risk Level:** MEDIUM (systems now in freeze, minimal changes allowed)

### Code Freeze & Final Validation

#### 2.1 Code Freeze Activated

```bash
# 1. Announce code freeze in Slack
# Message: "🛑 CODE FREEZE ACTIVATED — No new deployments until after launch (except critical hotfixes)"

# 2. Verify production version
git tag -l v2.0.0
# Expected: Tag exists and points to correct commit

# 3. Verify no uncommitted changes
git status
# Expected: "working tree clean"

# 4. Confirm all tests pass
pnpm type-check
# Expected: No errors, 100% checks passing

pnpm test -- --run
# Expected: All unit tests pass

pnpm run e2e
# Expected: All E2E tests pass (ideally, run in staging)
```

**Sign-off:** Tech Lead confirms in Slack: "🛑 Code freeze ACTIVATED"

---

#### 2.2 Final Health Check on Staging Environment

```bash
# 1. API health
curl -s https://staging-api.imobi.app/health | jq '.status'
# Expected: "ok"

# 2. Web health
curl -s https://staging.imobi.app/api/health | jq '.status'
# Expected: "ok"

# 3. Database connectivity
psql -U $PGUSER -h $PGHOST_STAGING -d imbobi_staging -c \
  "SELECT version(); SELECT COUNT(*) FROM usuarios;"
# Expected: PostgreSQL output + user count

# 4. Redis connectivity
redis-cli -h $REDIS_HOST_STAGING -p 6379 PING
# Expected: PONG

# 5. Queue status
redis-cli -h $REDIS_HOST_STAGING -p 6379 \
  LLEN bull:liberacao-parcela:wait
# Expected: 0-10 pending jobs (normal)

# 6. Error rate in staging
# Via Sentry API
curl -s "https://sentry.io/api/0/organizations/imobi/stats/" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.[] | select(.group=="errors") | .stats[0]'
# Expected: 0 errors (staging is clean)
```

**Success Criteria:**
- [ ] API responds: 200 OK
- [ ] Web responds: 200 OK
- [ ] Database: Connected and populated
- [ ] Redis: Responds to PING
- [ ] Queue: < 50 pending jobs
- [ ] Error rate: 0 (no errors in staging)

**Sign-off:** DevOps Lead confirms: "✅ Staging environment VALIDATED (production-ready)"

---

#### 2.3 Backup Systems Operational

```bash
# 1. Verify automated backups running
aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod \
  --query 'DBInstances[0].{PreferredBackupWindow,BackupRetentionPeriod}' \
  --output table
# Expected: Backup window set, retention > 7 days

# 2. Verify latest backup exists
aws rds describe-db-snapshots \
  --db-instance-identifier imbobi-prod \
  --query 'DBSnapshots[0].SnapshotCreateTime' \
  --output text
# Expected: Recent timestamp (within last 24 hours)

# 3. Verify S3 backup sync
aws s3 ls s3://imobi-backups/ --recursive | tail -5
# Expected: Multiple backup files, latest is recent

# 4. Verify Redis AOF (append-only file) enabled
redis-cli -h $REDIS_HOST -p 6379 \
  CONFIG GET appendonly
# Expected: "appendonly" → "yes"

# 5. Verify Redis backup frequency
redis-cli -h $REDIS_HOST -p 6379 \
  CONFIG GET save
# Expected: Save rules set (e.g., "900 1 300 10 60 10000")
```

**Success Criteria:**
- [ ] Database backups: Automated, recent, > 7 days retention
- [ ] Redis persistence: AOF enabled
- [ ] S3 sync: All backups replicated
- [ ] No backup errors in logs

**Sign-off:** DBA confirms: "✅ Backup systems OPERATIONAL"

---

#### 2.4 Incident Escalation Contacts Reviewed

```bash
# 1. Verify escalation contact list (1Password)
# Required: Phone numbers for all 7 roles
# ├─ Tech Lead: +55-XXXX-XXXX ✓
# ├─ DevOps Lead: +55-XXXX-XXXX ✓
# ├─ CTO: +55-XXXX-XXXX ✓
# ├─ CEO: +55-XXXX-XXXX ✓
# ├─ Customer Success Lead: +55-XXXX-XXXX ✓
# ├─ Payment Support: +55-XXXX-XXXX ✓
# └─ AWS Support: +55-XXXX-XXXX ✓

# 2. Test phone numbers (dry-run call)
# Option: Send SMS test to each number: "imobi Launch Test — (02:00 UTC)"
# Expected: Replies confirm receipt

# 3. Verify Slack channel access
# #ops-critical: All team members added
# #announcements: Customer Success added
# #incidents: Audit trail enabled

# 4. Verify PagerDuty/Opsgenie config (if using)
# On-call users verified, escalation policies confirmed
```

**Success Criteria:**
- [ ] All 7 contact numbers verified
- [ ] SMS test received by all contacts
- [ ] Slack channels verified
- [ ] Escalation policies confirmed

**Sign-off:** Tech Lead confirms: "✅ Escalation contacts VERIFIED"

---

### End of Phase 2 Checklist

**Sign-Off Required (Tech Lead):**

```
🟡 PHASE 2 COMPLETE — 2 HOURS BEFORE LAUNCH

Final validation: ✅ GREEN

✓ Code freeze activated
✓ Staging environment validated
✓ Backup systems operational
✓ Escalation contacts verified
✓ Team on standby

Status: READY FOR PHASE 3 (Final Pre-Launch)

Signature: _________________________ (Tech Lead)
Timestamp: 2026-06-02 00:00 UTC
```

---

## PHASE 3: 30 MINUTES BEFORE LAUNCH (2026-06-02, 01:30 UTC)

**Responsible:** DevOps Lead  
**Duration:** 30 minutes  
**Risk Level:** HIGH (production environment now under monitoring)

### Final Production Environment Check

```bash
# 1. Database health (production)
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT sum(numbackends) as active_connections FROM pg_stat_database WHERE datname = 'imbobi_prod';"
# Expected: < 20 connections (idle before launch)

# 2. API pod status (Railway)
curl -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  https://api.railway.app/graphql \
  -d '{"query": "{ services(input:{}) { edges { node { status } } } }"}'
# Expected: All services "deployed" or "running"

# 3. Web deployment status (Vercel)
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v1/projects/imobi \
  | jq '.deployments[0].state'
# Expected: "ready"

# 4. Redis memory (production)
redis-cli -h $REDIS_HOST -p 6379 \
  INFO memory | grep used_memory_human
# Expected: < 50% of max (plenty of room)

# 5. SSL certificate (production, final check)
echo | openssl s_client -servername imobi.app -connect imobi.app:443 2>/dev/null \
  | openssl x509 -noout -dates
# Expected: notAfter shows > 30 days

# 6. DNS status (still pointing to staging)
dig imobi.app +short
dig api.imobi.app +short
# Expected: Staging IPs (not yet switched)

# 7. Monitoring alerts test (Sentry)
curl -X POST https://sentry.io/api/0/organizations/imobi/events/ \
  -H "Authorization: Bearer $SENTRY_TOKEN" \
  -d '{"message": "Test alert for launch readiness", "level": "error"}'
# Expected: Test alert appears in Sentry

# 8. Slack #ops-critical connectivity
# Manual: Send test message in Slack, verify it appears
# Expected: Message posted successfully
```

**Success Criteria:**
- [ ] Database: < 20 idle connections
- [ ] API: Running and healthy
- [ ] Web: Deployed and ready
- [ ] Redis: < 50% memory
- [ ] SSL: Valid > 30 days
- [ ] DNS: Still pointing to staging (not yet switched)
- [ ] Alerts: Firing correctly
- [ ] Slack: Connected and responding

**Sign-off:** DevOps Lead confirms in Slack: "✅ Production environment CHECK GREEN"

---

### Team Readiness

```
🟢 TEAM STANDBY CONFIRMED

On-call Team Ready:
✓ Tech Lead: Available, mobile on
✓ DevOps Lead: Available, mobile on
✓ Senior Dev A: Standby
✓ Senior Dev B: Standby
✓ QA Lead: Ready for smoke tests

War Room:
✓ Conference room booked (Zoom link: [link])
✓ Monitors showing: CloudWatch, Sentry, Slack
✓ Incident tracker ready (GitHub Issues)
✓ Communication channels: Slack #ops-critical, #announcements

Escalation Path:
✓ CTO: Reachable via phone
✓ CEO: Reachable via phone
✓ Customer Success: Standing by
```

---

### End of Phase 3 Checklist

**Sign-Off Required (DevOps Lead):**

```
🔴 PHASE 3 COMPLETE — 30 MINUTES BEFORE LAUNCH

Final pre-launch validation: ✅ GREEN

✓ Production environment verified
✓ All systems healthy
✓ Team on standby
✓ Incident escalation ready

Status: READY FOR GO-LIVE

🔴 CAUTION: Production now live-monitored
🔴 DNS switch will occur at T+0 (02:00 UTC)

Signature: _________________________ (DevOps Lead)
Timestamp: 2026-06-02 01:30 UTC
```

---

## PHASE 4: GO-LIVE EXECUTION (2026-06-02, 02:00-04:00 UTC)

**Responsible:** DevOps Lead (primary), Tech Lead (oversight)  
**Duration:** 2 hours  
**Risk Level:** CRITICAL (production cutover in progress)

### Minute-by-Minute Execution

```
T+0 (02:00 UTC)
═════════════════════════════════════════
[ ] BEGIN CUTOVER
    Event: Production cutover window begins
    Action: Announce in Slack #ops-critical and #announcements
    Message: "🔴 CUTOVER STARTED - imobi v2.0.0 going live"
    
[ ] Monitor dashboard startup
    Open in browser tabs:
    1. CloudWatch dashboard
    2. Sentry error tracking
    3. Railway status
    4. Vercel deployments
    5. Slack #ops-critical

T+2 (02:02 UTC)
═════════════════════════════════════════
[ ] DNS SWITCH INITIATED
    Action: Switch DNS from staging to production
    Procedure: 
      1. Log into Route 53 / DNS provider
      2. Update A record: imobi.app → [PROD_IP]
      3. Update A record: api.imobi.app → [PROD_API_IP]
      4. Verify TTL set to 60 seconds (fast propagation)
      5. Document: "DNS switched at 02:02:30 UTC"
    
    Propagation: Will take 1-5 minutes for global DNS cache update
    Next action: Monitor for gradual traffic shift

T+5 (02:05 UTC)
═════════════════════════════════════════
[ ] MONITOR TRAFFIC SHIFT
    Expected behavior:
    ├─ First traffic arrives at production (1-2 min after DNS switch)
    ├─ CloudWatch shows incoming requests
    ├─ Error rate may spike briefly (normal, < 1%)
    ├─ Latency may increase briefly as caches warm
    └─ Should normalize within 5 minutes
    
    Watch metrics:
    ├─ Error rate (should stay < 1%)
    ├─ API latency p95 (should be < 500ms)
    ├─ Database connections (should be < 30)
    ├─ Redis memory (should be < 70%)
    └─ Payment processing (should be > 99%)

T+10 (02:10 UTC)
═════════════════════════════════════════
[ ] STATUS UPDATE #1
    Message to stakeholders:
    "Traffic shifting to production. Systems responding normally.
     Error rate: 0.2% (acceptable)
     API latency p95: 280ms (good)
     Payment processing: 100% success
     Status: 🟢 NOMINAL"

T+15 (02:15 UTC)
═════════════════════════════════════════
[ ] RUN SMOKE TESTS (Production)
    Execute critical path tests against production:
    
    Test 1: User signup
      curl -X POST https://api.imobi.app/auth/signup \
        -H "Content-Type: application/json" \
        -d '{"email":"test-@imobi.test","password":"Test123!","name":"QA Test"}'
      Expected: 200 OK, user created
    
    Test 2: Login
      curl -X POST https://api.imobi.app/auth/login \
        -d '{"email":"test-@imobi.test","password":"Test123!"}'
      Expected: 200 OK, JWT token returned
    
    Test 3: Create obra
      curl -X POST https://api.imobi.app/obras \
        -H "Authorization: Bearer $TOKEN" \
        -d '{"name":"Test Obra","location":"..."}'
      Expected: 200 OK, obra created
    
    Test 4: Payment processing (via test payment method)
      Initiate test payment: Expected success
    
    Test 5: GPS validation
      Submit work with GPS coordinates: Expected accepted
    
    Expected results: All 5 tests GREEN (pass rate 100%)

T+20 (02:20 UTC)
═════════════════════════════════════════
[ ] STATUS UPDATE #2
    Message to stakeholders:
    "Smoke tests completed: ✅ All 5 PASSED
     Payment processing: ✅ Working (test transaction successful)
     User signup: ✅ Working
     Status: 🟢 PRODUCTION GO CONFIRMED"

T+25-120 (02:25-04:00 UTC)
═════════════════════════════════════════
[ ] CONTINUOUS MONITORING
    Every 10 minutes:
    ├─ Check error rate (should stay < 0.5%)
    ├─ Check latency (p95 should stay < 500ms)
    ├─ Check payment success rate (should stay > 99.5%)
    ├─ Watch Sentry for new errors
    └─ Monitor database performance (no slow queries)
    
    Every 30 minutes:
    ├─ Run smoke tests again
    ├─ Spot-check user signups (in database)
    ├─ Verify customer support tickets (any issues?)
    └─ Update stakeholder status

[ ] ESCALATION DECISION TREE
    If error rate > 1%:
      → Page Tech Lead immediately
      → Investigate root cause (5 min timeout)
      → Decision: Continue monitoring or rollback?
    
    If error rate > 5% (P1):
      → ROLLBACK IMMEDIATELY (execute Phase 5)
      → Revert DNS to staging
      → Post-mortem on why this happened
    
    If payment failures > 5%:
      → Isolate payment service
      → Check payment gateway (external status)
      → If issue is external, wait for resolution
      → If issue is internal, ROLLBACK
    
    If data corruption detected:
      → IMMEDIATE ROLLBACK + DATABASE RESTORE
      → Page CTO and CEO
      → Incident severity: P1 Critical

T+120+ (04:00 UTC+)
═════════════════════════════════════════
[ ] GO-LIVE SUCCESS DECLARED
    If all metrics stay GREEN for 2 hours:
    
    Action: Announce go-live success
    Message: "🚀 GO-LIVE SUCCESSFUL
              imobi v2.0.0 in production
              
              Metrics (2-hour window):
              ✓ Error rate: 0.3% (target: < 0.5%)
              ✓ API latency p95: 320ms (target: < 500ms)
              ✓ Payment success: 99.9% (target: > 99.8%)
              ✓ User signups: 12 (initial users)
              
              Status: 🟢 PRODUCTION STABLE"
    
    Next: Transition to Week 1 Intensive Monitoring
```

---

### Rollback Procedure (If Needed)

**Execute only if P1 severity or unrecoverable error:**

```bash
# T+X (Immediate decision)
"🔴 ROLLBACK INITIATED"

# Step 1: Revert DNS immediately (< 1 min)
# Switch: imobi.app → [STAGING_IP]
# Switch: api.imobi.app → [STAGING_API_IP]

# Step 2: Rollback API (Railway)
# Dashboard: https://railway.app → imobi-api
# Click: "Rollback to v2.0.0-previous"
# Wait: 2-3 minutes

# Step 3: Rollback Web (Vercel)
# Dashboard: https://vercel.com → imobi
# Click: "Rollback to previous deployment"
# Wait: 1-2 minutes

# Step 4: Verify health
curl https://api.imobi.app/health
curl https://imobi.app/api/health
# Expected: Both return 200 OK

# Step 5: Announce rollback
Message: "Rollback completed to v2.0.0-previous.
          Investigating root cause.
          ETA for re-attempt: [DATE]"

# Step 6: Post-mortem
"Why did production fail?"
├─ Was the issue caught in staging? (Why not?)
├─ Can we fix it in < 1 hour? (Or defer to next attempt?)
└─ What process improvement prevents this next time?
```

---

### End of Phase 4 Checklist

**Sign-Off Required (Tech Lead):**

```
🟢 PHASE 4 COMPLETE — GO-LIVE EXECUTION SUCCESSFUL

Launch Window: 02:00 - 04:00 UTC ✅ COMPLETED

Final Metrics (2-hour window):
✓ Error rate: 0.3% (target: < 0.5%)
✓ API latency p95: 320ms (target: < 500ms)
✓ Payment success rate: 99.9% (target: > 99.8%)
✓ User signups: 12 (initial users)
✓ Smoke tests: 100% pass rate
✓ Database: Healthy, connections < 30
✓ Redis: Healthy, memory < 50%

DNS Status: ✅ PRODUCTION (imobi.app → Production Server)

Status: 🚀 GO-LIVE SUCCESSFUL — PRODUCTION STABLE

Signature: _________________________ (Tech Lead)
Signature: _________________________ (DevOps Lead)
Timestamp: 2026-06-02 04:00 UTC
```

---

## PHASE 5: POST-LAUNCH TRANSITION

**Duration:** Immediate (after Phase 4 completion)  
**Next Document:** PHASE9_POST_LAUNCH_MONITORING.md

```
[ ] Declare go-live successful in all channels
    Slack #announcements: "imobi v2.0.0 is LIVE 🚀"
    Email: Stakeholders
    Slack: All-hands announcement

[ ] Transition to Week 1 intensive monitoring
    See: PHASE9_POST_LAUNCH_MONITORING.md

[ ] Document lessons learned
    Internal: What went well? What could improve?

[ ] Schedule post-launch retrospective
    Date: 2026-06-03, 10:00 UTC (6 hours after launch window)
```

---

## Emergency Contact During Cutover

**Tech Lead:** +55-XXXX-XXXX (Primary decision-maker)  
**DevOps Lead:** +55-XXXX-XXXX (Infrastructure execution)  
**CTO:** +55-XXXX-XXXX (Executive escalation)  
**CEO:** +55-XXXX-XXXX (Business decision authority)

---

**Document Status:** 🟡 Ready for execution (pending launch date)  
**Last Updated:** 2026-05-31  
**Owner:** DevOps Lead + Tech Lead  
**Questions?** Contact #ops-critical on Slack
