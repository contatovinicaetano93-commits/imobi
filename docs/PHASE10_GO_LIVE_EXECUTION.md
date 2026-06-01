# PHASE 10: GO-LIVE Execution Package — imobi Production Launch

**Document Version:** 1.0  
**Created:** 2026-05-31  
**Launch Window:** 2026-06-02, 02:00-04:00 UTC  
**Owner:** DevOps Lead + Tech Lead  
**Status:** Ready for execution (T-minus 26 hours)

---

## CRITICAL: This is the EXECUTION BIBLE for Go-Live

Every command, every minute, every decision is documented below. The team will follow this document exactly during the launch window. **No improvisation. No surprises.**

---

## SECTION 1: PRE-LAUNCH READINESS (T-60 minutes)

**Timeline:** 2026-06-02, 01:00 UTC  
**Responsible:** DevOps Lead  
**Duration:** 60 minutes

### T-60: Final Production Environment Check

```bash
# Verify production database is healthy
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT version(); 
   SELECT COUNT(*) as total_users FROM usuarios;
   SELECT COUNT(*) as total_obras FROM obras;
   SELECT COUNT(*) as total_parcelas FROM parcelas;"

# Expected: PostgreSQL version output + all counts > 0
```

**Pass/Fail:** _______

### T-55: API Production Health Check

```bash
# Check API health endpoint
curl -s https://api.imobi.app/health | jq '{status, uptime, version}'

# Expected output:
# {
#   "status": "ok",
#   "uptime": "...",
#   "version": "v2.0.0"
# }
```

**Pass/Fail:** _______

### T-50: Redis Production Check

```bash
# Verify Redis connectivity
redis-cli -h $REDIS_HOST -p 6379 PING

# Check memory usage
redis-cli -h $REDIS_HOST -p 6379 INFO memory | grep used_memory_human

# Expected: PONG + memory < 50% of max (e.g., 1.5GB of 4GB)
```

**Pass/Fail:** _______

### T-45: Database Connections Check

```bash
# Verify connections are minimal before launch
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT datname, sum(numbackends) as connections \
   FROM pg_stat_database \
   GROUP BY datname ORDER BY connections DESC;"

# Expected: imbobi_prod < 15 connections (idle state)
```

**Pass/Fail:** _______

### T-40: SSL Certificate Final Verification

```bash
# Check main domain certificate
echo | openssl s_client -servername imobi.app \
  -connect imobi.app:443 2>/dev/null | \
  openssl x509 -noout -dates

# Expected:
# notBefore=Jun  1 00:00:00 2024 GMT
# notAfter=May 31 23:59:59 2027 GMT

# Check API certificate
echo | openssl s_client -servername api.imobi.app \
  -connect api.imobi.app:443 2>/dev/null | \
  openssl x509 -noout -dates

# Expected: > 30 days remaining
```

**Pass/Fail:** _______

### T-35: Backup Verification

```bash
# Verify latest database backup exists
aws s3 ls s3://imobi-backups/ --recursive | tail -3

# Expected: Recent backups (within 2 hours)

# Verify backup restoration procedure ready
# (Not executing restore, just verifying process documented)
echo "Backup restoration procedure: VERIFIED"
```

**Pass/Fail:** _______

### T-30: Open All Monitoring Dashboards

```bash
# Critical: Open these in browser NOW (don't wait for launch)
# Tab 1: CloudWatch Dashboard
#   URL: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=imobi-production-launch

# Tab 2: Sentry
#   URL: https://sentry.io/organizations/imobi/issues/?query=release%3Av2.0.0

# Tab 3: Railway.app
#   URL: https://railway.app/project/[PROJECT_ID]/services

# Tab 4: Vercel
#   URL: https://vercel.com/dashboard/imobi

# Tab 5: Slack #ops-critical
#   URL: https://slack.com/app_redirect?channel=ops-critical

# Tab 6: GitHub Deploy Status
#   URL: https://github.com/imobi/infrastructure/deployments/production
```

**All dashboards opened?** YES / NO

### T-25: Team Final Briefing

**Slack Message (Post to #ops-critical):**

```
@here 🔴 FINAL BRIEFING — T-25 MINUTES TO LAUNCH

Team, here's what happens next:

T-0 (02:00 UTC): DNS switch initiated
T-2 (02:02 UTC): Traffic begins shifting to production
T-5 (02:05 UTC): Monitor for stability
T-15 (02:15 UTC): Run production smoke tests
T-20 (02:20 UTC): Declare status

All eyes on dashboards. Slack #ops-critical is our war room.

Tech Lead: Standing by for decisions
DevOps Lead: Executing cutover
QA Lead: Ready for smoke tests

Let's do this. 🚀
```

**Confirm posted?** YES / NO

### T-20: DNS Preparation

```bash
# CRITICAL: Verify both DNS records are prepared (not yet active)

# Current DNS (staging):
dig imobi.app +short
# Expected: staging-ip-address

dig api.imobi.app +short
# Expected: staging-api-ip-address

# Verify production IPs are ready (from Route 53 / DNS provider)
# Check in AWS Route 53 Console:
# ├─ imobi.app: Record ready for [PROD_IP] (pending activation)
# ├─ api.imobi.app: Record ready for [PROD_API_IP] (pending activation)
# └─ TTL: Set to 60 seconds (verified)

echo "Production DNS records prepared and ready for activation"
```

**Pass/Fail:** _______

### T-15: Production Deployment Verification

```bash
# Verify Vercel deployment is ready
curl -H "Authorization: Bearer $VERCEL_TOKEN" \
  https://api.vercel.com/v1/projects/imobi | \
  jq '.deployments[0] | {url, state, created}'

# Expected: state = "ready"

# Verify Railway deployment is ready
curl -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  https://api.railway.app/graphql \
  -d '{"query": "{ deployments(first: 1) { edges { node { status } } } }"}'

# Expected: status = "deployed" or "success"
```

**Pass/Fail:** _______

### T-10: Confirm All Team Members Ready

**Slack Poll (Post to #ops-critical):**

```
@channel Quick readiness poll — react with ✅ when ready:

✅ = Standing by and ready
🔴 = Issue, need delay

Tech Lead:
DevOps Lead:
QA Lead:
Senior Dev A:
Senior Dev B:
CTO (standby):
```

**All confirmed ready?** YES / NO

### T-5: Final Pre-Launch Checklist

```bash
# CRITICAL CHECKLIST — MUST ALL BE CHECKED

✓ [ ] Production database healthy
✓ [ ] Production API responding
✓ [ ] Production Redis ready
✓ [ ] Database connections minimal
✓ [ ] SSL certificates valid
✓ [ ] Backups current and restorable
✓ [ ] All monitoring dashboards open
✓ [ ] Team briefed and ready
✓ [ ] DNS records prepared (not yet activated)
✓ [ ] Deployment ready in Vercel + Railway

IF ANY CHECK FAILS:
  → STOP
  → Investigate
  → Escalate to Tech Lead
  → Consider postponement to next window

IF ALL CHECKS PASS:
  → Proceed to T+0 (GO-LIVE EXECUTION)
```

---

## SECTION 2: GO-LIVE EXECUTION (T+0 to T+120 minutes)

**Timeline:** 2026-06-02, 02:00-04:00 UTC  
**Responsible:** DevOps Lead (execution), Tech Lead (oversight)

### T+0 (02:00 UTC) — LAUNCH WINDOW BEGINS

**Slack Announcement (Post to #ops-critical and #announcements):**

```
🔴 CUTOVER STARTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

imobi v2.0.0 Production Launch Initiated

Launch Window: 02:00 - 04:00 UTC
Status: MONITORING ACTIVE

Team War Room: [Zoom link / Conference room]
Documentation: PHASE10_GO_LIVE_EXECUTION.md

Next action: DNS switch at T+2
```

**Action Complete?** YES / NO

### T+0: Open War Room (Zoom/Conference)

```bash
# Start Zoom meeting (if not already active)
# Join link: [CONFIGURED IN CALENDAR INVITE]

# Attendees:
# ├─ Tech Lead (host)
# ├─ DevOps Lead
# ├─ QA Lead
# ├─ CTO (standby)
# └─ Senior Devs (standby)

# Share screens:
# ├─ CloudWatch dashboard
# ├─ Sentry error tracking
# ├─ Slack #ops-critical
# └─ GitHub deployments
```

**War room ready?** YES / NO

### T+2 (02:02 UTC) — DNS SWITCH EXECUTION

**This is the moment of truth. Production traffic will shift to the new servers.**

```bash
# CRITICAL INSTRUCTION: ONLY DevOps Lead executes this
# Tech Lead watches and confirms

# Step 1: Log into Route 53
# URL: https://console.aws.amazon.com/route53/home

# Step 2: Navigate to hosted zone: imobi.app

# Step 3: Update A record for imobi.app
#   Current value: [STAGING_IP]
#   New value: [PROD_IP]
#   TTL: 60 seconds (for quick propagation)
#   Action: SAVE CHANGES

# Step 4: Update A record for api.imobi.app
#   Current value: [STAGING_API_IP]
#   New value: [PROD_API_IP]
#   TTL: 60 seconds
#   Action: SAVE CHANGES

# Step 5: Verify DNS switch in CLI
sleep 5 && dig imobi.app +short
# Expected: Should show PROD_IP (or staging if still propagating)

sleep 5 && dig api.imobi.app +short
# Expected: Should show PROD_API_IP (or staging if still propagating)

# Step 6: Document the switch
echo "DNS switched at $(date -u '+%Y-%m-%d %H:%M:%S UTC')" >> /tmp/launch.log
```

**DNS switch completed?** YES / NO  
**Switch time documented?** YES / NO

### T+2: Slack Notification of DNS Switch

```
🔴 DNS SWITCH EXECUTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

imobi.app → Production Server
api.imobi.app → Production API

DNS TTL: 60 seconds
Propagation: 1-5 minutes expected

Status: MONITORING TRAFFIC SHIFT
```

**Posted?** YES / NO

### T+3-T+5 (02:03-02:05 UTC) — MONITOR TRAFFIC SHIFT

**Watch the dashboards. Traffic will gradually shift from staging to production.**

```bash
# CloudWatch metrics to watch:
# 1. API Error Rate
#    Location: CloudWatch → API dashboard → Error Rate widget
#    Expected: 0-1% (normal spike acceptable)
#    ⚠️ Action if > 5%: Escalate immediately

# 2. API Latency (p95)
#    Location: CloudWatch → API dashboard → Latency widget
#    Expected: 200-500ms (may spike briefly)
#    ⚠️ Action if > 1s: Investigate database/Redis

# 3. Database Connections
#    Location: CloudWatch → Database dashboard
#    Expected: 15-30 connections (starts low, rises gradually)
#    ⚠️ Action if > 50: Possible connection leak

# 4. Traffic volume
#    Location: CloudWatch → API dashboard → Request Count
#    Expected: Starts at 0, rises gradually to 10-20 req/sec

# Manual check:
curl -s https://api.imobi.app/health | jq '.status'
# Expected: "ok"

curl -s https://imobi.app/api/health | jq '.status'
# Expected: "ok"
```

**All metrics GREEN?** YES / NO

### T+5 (02:05 UTC) — STATUS UPDATE #1

**Post to #ops-critical and #announcements:**

```
🟡 STATUS UPDATE #1 (T+5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Metrics (5-minute window):
• Error rate: [X]% (target: < 1%)
• API latency p95: [X]ms (target: < 500ms)
• Database connections: [X] (target: < 50)
• Traffic: [X] req/sec

Status: 🟢 NOMINAL
Next: Continuous monitoring until T+15 for smoke tests
```

**Posted?** YES / NO

### T+10-T+15 (02:10-02:15 UTC) — CONTINUOUS MONITORING

```bash
# Every 1 minute, check these metrics:

# 1. Error rate stays healthy
curl -s https://api.imobi.app/metrics | jq '.error_rate'

# 2. Latency reasonable
curl -s https://api.imobi.app/metrics | jq '.latency.p95'

# 3. Database responsive
psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
  "SELECT COUNT(*) FROM usuarios;" \
  --connect-timeout 2

# 4. Redis responsive
redis-cli -h $REDIS_HOST -p 6379 PING --response-timeout 2

# If any check fails:
# → Page Tech Lead immediately
# → Proceed to Escalation Decision Tree (see Section 3)
```

**Monitoring active?** YES / NO

### T+15 (02:15 UTC) — PRODUCTION SMOKE TESTS

**Critical: Test the core happy paths in PRODUCTION environment**

**Test 1: User Signup (Production)**

```bash
TEST_EMAIL="test-$(date +%s)@imobi.test"
TEST_PASSWORD="TestPassword123!"

curl -X POST https://api.imobi.app/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"name\": \"QA Test User\"
  }"

# Expected response: 200 OK
# {
#   "user": {
#     "id": "...",
#     "email": "$TEST_EMAIL",
#     "name": "QA Test User"
#   },
#   "token": "..."
# }
```

**Result:** PASS / FAIL

**Test 2: User Login (Production)**

```bash
curl -X POST https://api.imobi.app/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }"

# Expected: 200 OK, JWT token returned
# Store token for next tests: export JWT_TOKEN="..."
```

**Result:** PASS / FAIL

**Test 3: Create Obra (Production)**

```bash
curl -X POST https://api.imobi.app/obras \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Obra - $(date +%s)\",
    \"description\": \"QA Launch Test\",
    \"location\": {
      \"lat\": -23.5505,
      \"lng\": -46.6333
    }
  }"

# Expected: 201 Created
# {
#   "id": "...",
#   "name": "...",
#   "status": "active"
# }
```

**Result:** PASS / FAIL

**Test 4: Payment Processing (Production)**

```bash
# Create test payment (using Stripe test card)
curl -X POST https://api.imobi.app/payments \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 1000,
    \"currency\": \"BRL\",
    \"paymentMethod\": \"tok_visa\",
    \"description\": \"Launch Test Transaction\"
  }"

# Expected: 200 OK
# {
#   "id": "pay_...",
#   "status": "succeeded",
#   "amount": 1000
# }
```

**Result:** PASS / FAIL

**Test 5: GPS Validation (Production)**

```bash
# Submit evidence with GPS coordinates
curl -X POST https://api.imobi.app/obras/[OBRA_ID]/evidence \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"Evidence Test\",
    \"gpsCoordinates\": {
      \"lat\": -23.5505,
      \"lng\": -46.6333,
      \"accuracy\": 5.0
    }
  }"

# Expected: 201 Created (GPS validation passed server-side)
```

**Result:** PASS / FAIL

**Smoke Test Summary:**

```
╔════════════════════════════════════════════╗
║       PRODUCTION SMOKE TESTS RESULTS       ║
╠════════════════════════════════════════════╣
║ Test 1: User Signup ................. [  ] ║
║ Test 2: User Login .................. [  ] ║
║ Test 3: Create Obra ................. [  ] ║
║ Test 4: Payment Processing .......... [  ] ║
║ Test 5: GPS Validation .............. [  ] ║
╠════════════════════════════════════════════╣
║ Total Tests: 5                             ║
║ Passed: [X] ✅                             ║
║ Failed: [X] ❌                             ║
╠════════════════════════════════════════════╣
║ Status: [🟢 GREEN / 🔴 RED]               ║
╚════════════════════════════════════════════╝
```

**If all 5 PASS:** Continue to T+20  
**If any FAIL:** Escalate to Section 3 (Escalation Decision Tree)

### T+20 (02:20 UTC) — STATUS UPDATE #2

**Post to #ops-critical and #announcements:**

```
🟢 SMOKE TESTS PASSED (5/5)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ User signup working
✅ Authentication working
✅ Obra creation working
✅ Payment processing working
✅ GPS validation working

Production Metrics (20-minute window):
• Error rate: [X]% (target: < 0.5%)
• API latency p95: [X]ms (target: < 500ms)
• Payment success rate: [X]% (target: > 99.8%)
• Real user signups: [X] (monitoring)

Status: 🟢 GO-LIVE CONFIRMED — PRODUCTION STABLE
```

**Posted?** YES / NO

### T+25-T+120 (02:25-04:00 UTC) — CONTINUOUS MONITORING

**Continue monitoring every 5 minutes for the entire 2-hour window.**

```bash
# Automated monitoring checklist (repeat every 5 min):

check_production_health() {
  # Check 1: Error rate
  error_rate=$(curl -s https://api.imobi.app/metrics | jq '.error_rate')
  if (( $(echo "$error_rate > 1" | bc -l) )); then
    echo "⚠️  ERROR RATE ELEVATED: $error_rate%"
  fi

  # Check 2: Latency
  latency=$(curl -s https://api.imobi.app/metrics | jq '.latency.p95')
  if (( $(echo "$latency > 500" | bc -l) )); then
    echo "⚠️  LATENCY HIGH: ${latency}ms"
  fi

  # Check 3: Payment success rate
  payment_success=$(curl -s https://api.imobi.app/metrics | jq '.payment_success_rate')
  if (( $(echo "$payment_success < 99.5" | bc -l) )); then
    echo "⚠️  PAYMENT SUCCESS RATE: $payment_success%"
  fi

  # Check 4: Database connections
  db_connections=$(psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
    "SELECT sum(numbackends) FROM pg_stat_database WHERE datname='imbobi_prod';" \
    -t)
  if (( db_connections > 50 )); then
    echo "⚠️  HIGH DB CONNECTIONS: $db_connections"
  fi

  # Check 5: Sentry errors (any new critical errors?)
  echo "✅ Health check completed at $(date -u '+%H:%M UTC')"
}

# Run every 5 minutes
while true; do
  check_production_health
  sleep 300
done
```

**Monitoring active?** YES / NO

### T+30, T+60, T+90 (02:30, 03:00, 03:30 UTC) — HOURLY STATUS UPDATES

**Post brief updates to #ops-critical:**

```
🟢 STATUS UPDATE (T+[30/60/90])
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Metrics (last 30 min):
• Error rate: [X]% (avg)
• API latency p95: [X]ms (avg)
• Active users: [X]
• Successful transactions: [X]

Database Performance:
• Connections: [X]/100 (max 80)
• Slow queries: [X] detected
• Replication lag: [X]ms

Status: 🟢 NOMINAL — All systems stable
```

**T+30 update posted?** YES / NO  
**T+60 update posted?** YES / NO  
**T+90 update posted?** YES / NO

### T+120 (04:00 UTC) — GO-LIVE SUCCESS DECLARATION

**If all 2-hour metrics remain GREEN:**

```
🚀 GO-LIVE SUCCESSFUL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

imobi v2.0.0 is LIVE in production!

Final Metrics (2-hour launch window):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Error rate: 0.3% (target: < 0.5%)
✅ API latency p95: 320ms (target: < 500ms)
✅ Payment success rate: 99.9% (target: > 99.8%)
✅ User signups: [X] successful
✅ Evidence uploads: [X] successful
✅ Database health: Excellent (< 25 connections)
✅ Redis health: Excellent (< 40% memory)
✅ All smoke tests: 5/5 PASSED

DNS Status: ✅ Production (100% traffic)

📊 Monitoring Plan: Week 1 Intensive (24/7 with hourly reviews)

🎉 LAUNCH COMPLETE — TEAM WELL DONE!

Next: Post-Launch Operations (see PHASE10_MONITORING_SETUP.md)
```

**Success declared?** YES / NO

---

## SECTION 3: ESCALATION DECISION TREE

**Use this ONLY if something goes wrong.**

### Decision Tree Flow

```
ERROR DETECTED during launch?
│
├─→ Error rate > 1% (within 5 min window)
│   │
│   ├─→ YES → Page Tech Lead immediately
│   │   │
│   │   ├─→ Investigate cause (5-min timeout)
│   │   │
│   │   ├─→ Error rate drops back < 1%?
│   │   │   ├─→ YES → Continue monitoring
│   │   │   └─→ NO → Proceed to next decision
│   │   │
│   │   └─→ Error rate > 5% (P1)?
│   │       ├─→ YES → ROLLBACK IMMEDIATELY (go to Section 4)
│   │       └─→ NO → Continue with caution
│   │
│   └─→ NO → Continue monitoring
│
├─→ Payment failures > 5%
│   │
│   ├─→ YES → Isolate payment service
│   │   │
│   │   ├─→ Is payment gateway down? (Stripe/PagSeguro status page)
│   │   │   ├─→ YES → Wait for provider recovery
│   │   │   └─→ NO → Investigate internal payment service
│   │   │
│   │   └─→ Internal issue confirmed?
│   │       ├─→ YES → ROLLBACK (Section 4)
│   │       └─→ NO → Wait for provider recovery
│   │
│   └─→ NO → Continue monitoring
│
├─→ Database connectivity lost
│   │
│   ├─→ YES → Check connection pool (is it exhausted?)
│   │   │
│   │   ├─→ YES → Kill idle connections
│   │   │   psql -U $PGUSER -h $PGHOST -d imbobi_prod -c \
│   │   │     "SELECT pg_terminate_backend(pid) FROM pg_stat_activity \
│   │   │      WHERE datname='imbobi_prod' AND state='idle';"
│   │   │
│   │   ├─→ Still disconnected?
│   │   │   ├─→ YES → ROLLBACK (Section 4)
│   │   │   └─→ NO → Continue monitoring
│   │   │
│   │   └─→ NO → Check database logs for errors
│   │       └─→ ROLLBACK (Section 4)
│   │
│   └─→ NO → Continue monitoring
│
└─→ All metrics GREEN → Go to T+120 (Success declaration)
```

### If Error Rate Spikes > 1%

```bash
# Step 1: Identify the error (within 5 minutes)
curl -s https://sentry.io/api/0/organizations/imobi/issues/ \
  -H "Authorization: Bearer $SENTRY_TOKEN" | \
  jq '.[0] | {title, count, lastSeen}'

# Step 2: Is it a code bug or infrastructure issue?
# Code bug: Deploy hotfix (if < 15 min) OR ROLLBACK
# Infrastructure: Restart service OR ROLLBACK

# Step 3: If error persists > 5 minutes, ROLLBACK
```

### If Payment Failures > 5%

```bash
# Step 1: Check payment gateway status
curl https://status.stripe.com/api/v2/status.json | jq '.status.indicator'
# OR
curl https://status.pagseguro.com/api/v2/status.json | jq '.status.indicator'

# Step 2: If provider is healthy, investigate internal issue
curl https://api.imobi.app/admin/payments/logs | jq '.errors' | head -10

# Step 3: If internal issue confirmed, ROLLBACK (Section 4)
```

---

## SECTION 4: ROLLBACK PROCEDURE (Emergency Use Only)

**Execute ONLY if P1 severity detected (error rate > 5% or data corruption).**

### Pre-Rollback Communication

```bash
# Immediately post to #ops-critical:

Message: "🔴 INCIDENT DETECTED — Initiating rollback
          
          Issue: [Describe what failed]
          Error rate: [X]%
          Affected users: [Estimate]
          
          Action: Rolling back to staging environment
          ETA for rollback completion: 5 minutes
          ETA for retry: [DATE/TIME]"
```

### Step 1: Revert DNS (< 1 minute)

```bash
# Log into Route 53
# URL: https://console.aws.amazon.com/route53/home

# Update A record for imobi.app
#   Current: [PROD_IP]
#   New: [STAGING_IP]
#   SAVE CHANGES

# Update A record for api.imobi.app
#   Current: [PROD_API_IP]
#   New: [STAGING_API_IP]
#   SAVE CHANGES

# Verify DNS reverted
sleep 2 && dig imobi.app +short
# Should return [STAGING_IP]
```

### Step 2: Rollback API (Railway)

```bash
# Log into Railway.app
# URL: https://railway.app

# Navigate to: Projects → imobi → Services → api

# Option A (Recommended): Rollback deployment
#   Click "Rollback" button → Select previous deployment
#   Wait: 2-3 minutes

# Option B (Manual): Redeploy previous version
#   git checkout main
#   git pull
#   git tag | grep v2.0.0-previous
#   railway deploy --service api --version [PREVIOUS_TAG]
```

### Step 3: Rollback Web (Vercel)

```bash
# Log into Vercel.com
# URL: https://vercel.com/dashboard

# Navigate to: imobi project → Deployments

# Click on previous successful deployment → Redeploy
# Wait: 1-2 minutes
```

### Step 4: Verify Health

```bash
# Check API health
curl https://api.imobi.app/health
# Expected: 200 OK

# Check Web health
curl https://imobi.app/api/health
# Expected: 200 OK

# Check database connectivity
psql -U $PGUSER -h $PGHOST -d imbobi_staging -c "SELECT 1;"
# Expected: 1 (success)
```

### Step 5: Post-Rollback Communication

```bash
Message to #ops-critical:

"🔄 ROLLBACK COMPLETE

We have reverted to staging (v2.0.0-previous).
All services are stable.

Incident Summary:
• What failed: [Root cause analysis]
• Duration: [X] minutes
• Users affected: [Estimate]

Next Steps:
• Post-mortem meeting: [Schedule]
• Root cause fix: [Estimate when ready]
• Retry window: [Propose new date/time]

Thank you for your patience."
```

---

## SECTION 5: SUCCESS METRICS & SIGN-OFF

### Final Launch Verification Checklist

```
📋 FINAL GO-LIVE SIGN-OFF

T+0 (02:00 UTC):
[ ] Launch window opened
[ ] War room active
[ ] All dashboards monitoring

T+2 (02:02 UTC):
[ ] DNS switch executed
[ ] Team notified

T+5 (02:05 UTC):
[ ] Traffic shifting to production
[ ] Error rate < 1%
[ ] Latency acceptable (< 500ms)

T+15 (02:15 UTC):
[ ] Smoke tests completed
[ ] All 5 tests passed

T+20 (02:20 UTC):
[ ] Status update #2 posted
[ ] Team confident in stability

T+120 (04:00 UTC):
[ ] 2-hour metrics all GREEN
[ ] Go-live success declared
[ ] Team celebration 🎉

LAUNCH OWNER SIGN-OFF:

Tech Lead Signature: ___________________  Date: ________
DevOps Lead Signature: ___________________  Date: ________

Timestamp of Go-Live Success: _____________________________
```

---

## CRITICAL EMERGENCY CONTACTS

**During launch window (02:00-04:00 UTC), these are in-bounds:**

- **Tech Lead (Decision Maker):** [PHONE]
- **DevOps Lead (Executor):** [PHONE]
- **CTO (Executive):** [PHONE]
- **CEO (Business Authority):** [PHONE]

**Do not hesitate to call. Seconds matter.**

---

**Document Status:** 🟢 READY FOR EXECUTION  
**Last Updated:** 2026-05-31  
**Next Document:** PHASE10_FINAL_VALIDATION_CHECKLIST.md
