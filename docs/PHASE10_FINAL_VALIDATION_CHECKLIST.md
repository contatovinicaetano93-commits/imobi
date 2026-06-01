# PHASE 10: Final Validation Checklist — 24 Hours to GO-LIVE

**Document Version:** 1.0  
**Created:** 2026-05-31  
**Launch Window:** 2026-06-02, 02:00-04:00 UTC  
**Owner:** QA Lead + DevOps Lead  
**Status:** Master checklist for production readiness

---

## CRITICAL: This checklist MUST be completed before launch is greenlit

No exceptions. If any item fails, escalate to Tech Lead for decision on proceed/postpone.

---

## TIMELINE BREAKDOWN

### 24 HOURS BEFORE LAUNCH (2026-06-01, 02:00 UTC)

**Duration:** 4-5 hours  
**Responsible:** QA Lead + DevOps Lead + Tech Lead

#### 1. Run All 17 Smoke Tests ✅

**Location:** `apps/api/tests/smoke-tests/`

```bash
# Run complete smoke test suite
cd /home/user/imobi/services/api
npm run test:smoke:production

# Expected output:
# ✓ Test 1: User registration flow ............ PASS
# ✓ Test 2: User login flow .................. PASS
# ✓ Test 3: Obra creation ................... PASS
# ✓ Test 4: Obra retrieval .................. PASS
# ✓ Test 5: Parcela management .............. PASS
# ✓ Test 6: Payment processing .............. PASS
# ✓ Test 7: Payment refund .................. PASS
# ✓ Test 8: Evidence upload (image) ......... PASS
# ✓ Test 9: Evidence upload (video) ......... PASS
# ✓ Test 10: GPS validation ................. PASS
# ✓ Test 11: Role-based access control ...... PASS
# ✓ Test 12: Authentication token refresh ... PASS
# ✓ Test 13: Database connection pool ....... PASS
# ✓ Test 14: Redis cache operations ......... PASS
# ✓ Test 15: Email notifications ............ PASS
# ✓ Test 16: File storage (S3) .............. PASS
# ✓ Test 17: API rate limiting .............. PASS

# All 17 MUST pass. If any fail, fix before proceeding.
```

**Result:** [ ] ALL 17 PASSED / [ ] FAILURES DETECTED

**If failures detected:**
- [ ] Root cause identified
- [ ] Fix deployed to staging
- [ ] All 17 re-run and passed
- [ ] Tech Lead approved proceed

---

#### 2. Verify Backup Integrity ✅

**PostgreSQL Backup:**

```bash
# List latest backups
aws s3 ls s3://imobi-backups/postgres/ --recursive | tail -5

# Expected: Backups from last 2 hours

# Verify backup size (should be > 50MB for data)
aws s3 ls s3://imobi-backups/postgres/latest.sql.gz

# Test restore procedure (on staging, NOT production):
# 1. Download latest backup
aws s3 cp s3://imobi-backups/postgres/latest.sql.gz /tmp/backup.sql.gz

# 2. Decompress
gunzip /tmp/backup.sql.gz

# 3. Try restore to a test database (create first)
psql -U $PGUSER -h $PGHOST -d imbobi_backup_test < /tmp/backup.sql

# Expected: No errors, database populated with tables + data
psql -U $PGUSER -h $PGHOST -d imbobi_backup_test -c "SELECT COUNT(*) FROM usuarios;"
# Should return: > 0
```

**PostgreSQL backup status:** [ ] VERIFIED / [ ] FAILED

**Redis Backup:**

```bash
# Check Redis dump file
redis-cli -h $REDIS_HOST -p 6379 BGSAVE

# Expected: Background save started
# Wait 30 seconds for completion

# Verify dump.rdb exists
aws s3 ls s3://imobi-backups/redis/ | grep dump.rdb

# Test restore (manual process documented)
redis-cli -h $REDIS_HOST -p 6379 SHUTDOWN SAVE
# (Wait for Redis to restart)
# Data should be restored from dump.rdb
```

**Redis backup status:** [ ] VERIFIED / [ ] FAILED

---

#### 3. Validate Staging Environment One Last Time ✅

```bash
# URL: https://staging.imobi.app

# Checklist:
[ ] Home page loads (no 500 errors)
[ ] Sign-up form works (create test user)
[ ] Login works (test user logs in)
[ ] Dashboard renders (no console errors)
[ ] Map displays correctly (GPS functionality)
[ ] Evidence upload works (test upload image)
[ ] Payment form renders (Stripe test cards ready)
[ ] Notifications work (test email sent)
[ ] All navigation links work
[ ] Mobile responsive design working
[ ] No console errors (F12 → Console tab)
[ ] Performance is acceptable (< 2s load time)
```

**Staging validation:** [ ] ALL GREEN / [ ] ISSUES FOUND

**If issues found:**
- [ ] Documented
- [ ] Escalated to Tech Lead
- [ ] Decided: Fix before launch or accept risk

---

#### 4. Confirm On-Call Team Availability ✅

**Create Slack poll in #ops-critical:**

```
📋 On-Call Team Availability Confirmation

Launch: 2026-06-02, 02:00-04:00 UTC (+ 24h monitoring after)

Please confirm:
- [ ] Tech Lead
- [ ] DevOps Lead
- [ ] QA Lead
- [ ] Senior Dev A
- [ ] Senior Dev B
- [ ] CTO (standby)

React with ✅ to confirm availability for full launch window.

Deadline: 2026-06-01 18:00 UTC
```

**Team availability confirmed:** [ ] YES / [ ] ISSUES

**If unavailable:**
- [ ] Escalate immediately
- [ ] Postpone launch to next window
- [ ] Notify stakeholders

---

#### 5. Check SSL Certificates (Expiry > 30 Days) ✅

```bash
# Main domain
echo | openssl s_client -servername imobi.app -connect imobi.app:443 2>/dev/null | \
  openssl x509 -noout -dates

# Expected output:
# notBefore=Jun  1 00:00:00 2024 GMT
# notAfter=May 31 23:59:59 2027 GMT
# ✅ (> 30 days remaining)

# API domain
echo | openssl s_client -servername api.imobi.app -connect api.imobi.app:443 2>/dev/null | \
  openssl x509 -noout -dates

# Expected output:
# notBefore=Jun  1 00:00:00 2024 GMT
# notAfter=May 31 23:59:59 2027 GMT
# ✅ (> 30 days remaining)

# Calculate days remaining
openssl s_client -servername imobi.app -connect imobi.app:443 2>/dev/null | \
  openssl x509 -noout -enddate | cut -d= -f2 | \
  while read date; do \
    expiry=$(date -d "$date" +%s); \
    now=$(date +%s); \
    days=$(( (expiry - now) / 86400 )); \
    echo "Days until expiry: $days"; \
  done
```

**Main domain SSL:** [ ] VALID (> 30 days) / [ ] EXPIRING SOON

**API domain SSL:** [ ] VALID (> 30 days) / [ ] EXPIRING SOON

**If expiring soon (< 30 days):**
- [ ] Request urgent renewal
- [ ] Escalate to CTO
- [ ] Consider launch postponement

---

#### 6. Verify All 39 Environment Variables in Production ✅

```bash
# Production environment variables checklist
# (All MUST be set before launch)

# 1. Database
[ ] PGHOST (PostgreSQL host)
[ ] PGPORT (default: 5432)
[ ] PGUSER (PostgreSQL user)
[ ] PGPASSWORD (PostgreSQL password)
[ ] PGDATABASE (default: imbobi_prod)

# 2. Redis
[ ] REDIS_HOST (Redis host)
[ ] REDIS_PORT (default: 6379)
[ ] REDIS_PASSWORD (if required)

# 3. JWT / Authentication
[ ] JWT_SECRET (signing key)
[ ] JWT_EXPIRATION (default: 7d)
[ ] REFRESH_TOKEN_SECRET
[ ] REFRESH_TOKEN_EXPIRATION

# 4. Payment Processing
[ ] STRIPE_SECRET_KEY (Stripe API key)
[ ] STRIPE_PUBLISHABLE_KEY
[ ] STRIPE_WEBHOOK_SECRET (for webhooks)
[ ] PAGSEGURO_EMAIL (if using)
[ ] PAGSEGURO_TOKEN (if using)

# 5. AWS
[ ] AWS_REGION (us-east-1)
[ ] AWS_ACCESS_KEY_ID
[ ] AWS_SECRET_ACCESS_KEY
[ ] AWS_S3_BUCKET (imobi-evidence-prod)
[ ] AWS_CLOUDWATCH_REGION

# 6. Email / Notifications
[ ] SENDGRID_API_KEY (email service)
[ ] SENDGRID_FROM_EMAIL (noreply@imobi.app)
[ ] SLACK_WEBHOOK_URL (for alerts)

# 7. Monitoring / Logging
[ ] SENTRY_DSN (error tracking)
[ ] SENTRY_ENVIRONMENT (production)
[ ] SENTRY_RELEASE (v2.0.0)
[ ] DATADOG_API_KEY (optional, if using)

# 8. GPS / Maps
[ ] GOOGLE_MAPS_API_KEY (for geocoding)
[ ] MAPBOX_TOKEN (if using)

# 9. Feature Flags
[ ] FEATURE_EVIDENCE_UPLOAD (enabled)
[ ] FEATURE_PAYMENT_PROCESSING (enabled)
[ ] FEATURE_GPS_VALIDATION (enabled)
[ ] FEATURE_NOTIFICATIONS (enabled)

# 10. Application
[ ] NODE_ENV (production)
[ ] LOG_LEVEL (info)
[ ] API_PORT (3000)
[ ] API_BASE_URL (https://api.imobi.app)
[ ] WEB_BASE_URL (https://imobi.app)
[ ] CORS_ORIGIN (https://imobi.app)

# Verification command:
# (This will NOT print values, just confirm keys exist)
for var in PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE \
            REDIS_HOST REDIS_PORT \
            JWT_SECRET JWT_EXPIRATION REFRESH_TOKEN_SECRET \
            STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY \
            AWS_REGION AWS_ACCESS_KEY_ID AWS_S3_BUCKET \
            SENDGRID_API_KEY SENTRY_DSN \
            NODE_ENV API_BASE_URL WEB_BASE_URL; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
  else
    echo "✅ Set: $var"
  fi
done
```

**Environment variables verified:** [ ] ALL 39 SET / [ ] MISSING VARIABLES

**Missing variables:**
- [ ] List: ____________________
- [ ] Escalate to DevOps Lead
- [ ] Set before proceeding

---

#### 7. Test Database Failover Procedures ✅

```bash
# Step 1: Identify primary and replica
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT slot_name, slot_type, active FROM pg_replication_slots;"

# Expected: Primary has at least 1 active replica slot

# Step 2: Test read replica
psql -U $PGUSER -h $PGREPLICA_HOST -d imbobi_prod -c \
  "SELECT * FROM pg_stat_replication;"

# Expected: Connection established, replication lag < 10ms

# Step 3: Document failover procedure (not executing)
# If primary fails, promotion command:
# pg_ctl promote -D /var/lib/postgresql/replica_data

# Step 4: Verify backups are on different AZ/region
aws rds describe-db-instances --db-instance-identifier imbobi-prod | \
  jq '.DBInstances[0] | {AvailabilityZone, BackupRetentionPeriod}'

# Expected: Backup retention >= 7 days, different AZ if multi-AZ
```

**Database failover procedure:** [ ] TESTED / [ ] FAILED

---

#### 8. Confirm AWS S3 Permissions (Evidence Storage) ✅

```bash
# Test S3 upload permission
TEST_FILE="/tmp/test-evidence-$(date +%s).jpg"
echo "Test evidence" > $TEST_FILE

aws s3 cp $TEST_FILE s3://imobi-evidence-prod/test/ \
  --region us-east-1

# Expected: Upload successful

# Verify file uploaded
aws s3 ls s3://imobi-evidence-prod/test/ | tail -1

# Expected: Shows test file

# Clean up
aws s3 rm s3://imobi-evidence-prod/test/test-evidence-*.jpg
rm $TEST_FILE

# Check bucket policy (should allow CloudFront access)
aws s3api get-bucket-policy --bucket imobi-evidence-prod | \
  jq '.Policy | fromjson'

# Expected: CloudFront distribution has read access
```

**S3 permissions verified:** [ ] WORKING / [ ] ISSUES

---

### 2 HOURS BEFORE LAUNCH (2026-06-02, 00:00 UTC)

**Duration:** 30 minutes  
**Responsible:** Tech Lead + DevOps Lead

#### Code Freeze Confirmed

```bash
# No commits to main branch after this point
# Verify latest commit matches production deployment

git log --oneline main | head -1
# Expected: Matches deployed version v2.0.0

# Confirm no pending PRs for main
gh pr list --base main --state open

# Expected: Empty (no open PRs)
```

**Code freeze status:** [ ] CONFIRMED / [ ] ISSUES

---

#### No Pending Deployments

```bash
# Verify no deployments in progress

# Vercel
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v1/deployments?state=BUILDING | jq '.deployments'

# Expected: Empty array []

# Railway
curl -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  https://api.railway.app/graphql \
  -d '{"query": "{ deployments(first: 10, filters: {status: BUILDING}) { edges { node { id } } } }"}'

# Expected: Empty edges
```

**Pending deployments:** [ ] NONE / [ ] FOUND

---

#### Monitoring Dashboards Created

```bash
# Verify all dashboards exist and are accessible

[ ] CloudWatch Dashboard (imobi-production-launch)
[ ] Sentry Project (imobi, release v2.0.0)
[ ] Datadog Dashboard (if using)
[ ] New Relic Dashboard (if using)
[ ] Slack integration ready
[ ] PagerDuty escalation ready

# Test CloudWatch dashboard access
aws cloudwatch get-dashboard --dashboard-name imobi-production-launch | \
  jq '.DashboardBody | fromjson | .widgets | length'

# Expected: > 0 (at least one widget)
```

**Monitoring dashboards:** [ ] ALL READY / [ ] MISSING

---

#### Team Briefing Completed

```bash
# Slack message sent to #ops-critical

Message template:
"
🚀 TEAM BRIEFING COMPLETE

Launch in 2 hours (2026-06-02, 02:00 UTC)

Key reminders:
• Launch window: 02:00-04:00 UTC
• War room: [Zoom link]
• Monitoring: All dashboards open
• Rollback ready: < 5 minutes

Everyone in #ops-critical for updates.
"
```

**Briefing status:** [ ] COMPLETED / [ ] PENDING

---

### 30 MINUTES BEFORE LAUNCH (2026-06-02, 01:30 UTC)

**Duration:** 20 minutes  
**Responsible:** DevOps Lead + Tech Lead

#### Final Production Environment Check

```bash
# Execute ALL checks from PHASE10_GO_LIVE_EXECUTION.md Section 1
# (Database, API, Redis, SSL, connections, backups)

# Summary checklist:
[ ] Database: 200 OK, > 0 rows
[ ] API: Health endpoint responding
[ ] Redis: PONG + memory < 50%
[ ] DB Connections: < 15 in idle state
[ ] SSL: Valid for > 30 days
[ ] Backups: Recent and restorable
[ ] Monitoring: All dashboards open + green
[ ] DNS: Prepared but NOT activated yet
[ ] Vercel: Deployment ready
[ ] Railway: Deployment ready
```

**Final environment check:** [ ] ALL GREEN / [ ] ISSUES FOUND

---

#### On-Call Team Stands By

```bash
# Confirmation in Slack #ops-critical

"
🟢 FINAL READINESS CHECK PASSED

All systems green. Standing by for launch in 30 minutes.

On-call team:
✅ Tech Lead: Ready
✅ DevOps Lead: Ready
✅ QA Lead: Ready
✅ CTO: Standby
✅ Senior Devs: Standby

War room opens at 01:50 UTC.
Cutover at 02:00 UTC.

This is it. Let's ship. 🚀
"
```

**Team standing by:** [ ] CONFIRMED / [ ] ISSUES

---

#### DNS Switch Staged and Ready (NOT Activated)

```bash
# Verify in Route 53 console:
# ├─ imobi.app: Current [STAGING_IP] → Ready to switch to [PROD_IP]
# ├─ api.imobi.app: Current [STAGING_API_IP] → Ready to switch to [PROD_API_IP]
# └─ TTL: 60 seconds (for quick propagation)

# Double-check IPs are correct:
dig staging.imobi.app +short
# Should show: [STAGING_IP]

dig production.imobi.app +short  # (or your prod verification method)
# Should show: [PROD_IP]

# NOTE: DO NOT CLICK SAVE YET. This is staged only.
```

**DNS switch staged:** [ ] VERIFIED / [ ] ISSUES

---

#### Rollback Plan Reviewed

```bash
# Tech Lead + DevOps Lead review together:

[ ] DNS rollback procedure understood
[ ] API rollback procedure (Railway) understood
[ ] Web rollback procedure (Vercel) understood
[ ] Database rollback procedure understood
[ ] Communication plan for rollback understood
[ ] Decision tree for escalation reviewed

# Key rollback times:
• DNS switch: < 1 min
• Railway rollback: 2-3 min
• Vercel rollback: 1-2 min
• Total time to stable: < 5 min
```

**Rollback plan reviewed:** [ ] CONFIRMED / [ ] ISSUES

---

## MASTER SIGN-OFF

### Tech Lead Approval

```
I confirm that all production systems are ready for launch.
All 24-hour validation checks have passed.
I am ready to authorize go-live at 02:00 UTC on 2026-06-02.

Name: _________________________
Signature: _____________________
Date/Time: _____________________
```

---

### DevOps Lead Approval

```
I confirm that all infrastructure is ready for launch.
All backups, monitoring, and failover procedures are in place.
I am ready to execute DNS switch and deployment at 02:00 UTC.

Name: _________________________
Signature: _____________________
Date/Time: _____________________
```

---

### QA Lead Approval

```
I confirm that all 17 smoke tests have passed.
Staging environment is stable and production-ready.
I am ready to execute production smoke tests post-launch.

Name: _________________________
Signature: _____________________
Date/Time: _____________________
```

---

## FINAL GO/NO-GO DECISION

**All checklist items completed?** [ ] GO / [ ] NO-GO

**If NO-GO:**
- [ ] Root cause documented: ____________________
- [ ] Escalated to CTO
- [ ] New launch window proposed: ____________________

**If GO:**
- [ ] All sign-offs obtained
- [ ] Team notified
- [ ] Proceed to PHASE10_GO_LIVE_EXECUTION.md

---

**Document Status:** 🟢 READY FOR USE  
**Last Updated:** 2026-05-31  
**Next Phase:** PHASE10_GO_LIVE_EXECUTION.md (T-60 to T+120)
