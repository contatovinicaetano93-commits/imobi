# CUTOVER QUICK REFERENCE — imobi 2026-06-02

**Mantenha este documento sempre à vista durante o cutover**

---

## CRITICAL URLS

| Serviço | URL | Shortcut |
|---------|-----|----------|
| Sentry Issues | https://sentry.io/organizations/imobi/issues/ | Ctrl+B → Search |
| Vercel Deployments | https://vercel.com/[TEAM]/imobi/deployments | Go/Deploy |
| CloudWatch Dashboard | https://console.aws.amazon.com/cloudwatch/ | AWS Console |
| API Health | https://api.imobi.com.br/health | jq '.status' |
| Slack #ops-critical | https://imbobi.slack.com/messages/ops-critical | Primary |
| GitHub Main Branch | https://github.com/imobi/imobi/tree/main | Last deployed SHA |

---

## METRICS REFERENCE

### GREEN (Everything is OK)

```
✅ Error rate:      < 0.5%
✅ Latency p95:     < 100ms
✅ Latency p99:     < 300ms
✅ Cache hit:       > 85%
✅ RDS CPU:         < 60%
✅ RDS Memory:      < 75%
✅ DB Connections:  < 80/100
✅ 5xx errors:      0-1
```

### YELLOW (Watch Closely)

```
⚠️  Error rate:      1-5%
⚠️  Latency p95:     100-200ms
⚠️  Latency p99:     300-500ms
⚠️  Cache hit:       70-85%
⚠️  RDS CPU:         60-80%
⚠️  RDS Memory:      75-85%
⚠️  DB Connections:  80-95/100
⚠️  5xx errors:      2-5
⚠️  Action: SCALE UP or INVESTIGATE
```

### RED (Escalate Immediately)

```
🔴 Error rate:      > 5%        → INVESTIGATE (5 min) or ROLLBACK
🔴 Latency p95:     > 200ms     → SCALE UP (immediately)
🔴 Latency p99:     > 500ms     → SCALE UP or ROLLBACK
🔴 Cache hit:       < 70%       → Review cache strategy
🔴 RDS CPU:         > 80%       → SCALE UP (immediately)
🔴 RDS Memory:      > 85%       → SCALE UP or clear cache
🔴 DB Connections:  > 95/100    → Kill stuck connections
🔴 5xx errors:      > 5         → INVESTIGATE (2 min) or ROLLBACK
🔴 Health checks:   Any fail    → INVESTIGATE (2 min) or ROLLBACK
```

---

## ESCALATION MATRIX

### Error Rate > 5%

```
→ Slack @devops: "Error rate critical!"
→ Check Sentry top errors (1 min)
→ Decision: Fix or ROLLBACK (5 min max)
→ If unresolved: Escalate to @cto
```

### Latency > 200ms

```
→ Check CloudWatch RDS (CPU, Memory, Connections)
→ If CPU > 80%: SCALE UP (immediately)
→ If Memory > 85%: SCALE UP or clear cache
→ If connections > 95: Kill stuck connections
→ Monitor for 5 min
→ If still > 200ms: INVESTIGATE or SCALE UP more
```

### Health Check Failure

```
→ Check which endpoint failed
→ Verify service is responding (curl, ping, etc)
→ Check logs for errors
→ Restart if needed (or ROLLBACK if no obvious fix)
→ If > 2 min to fix: ROLLBACK
```

### CRITICAL (Multiple Issues)

```
→ Slack @cto: "CRITICAL ISSUES DETECTED"
→ Phone call immediately
→ Decision: ROLLBACK or continue investigating?
→ Execute rollback (5 min procedure)
```

---

## QUICK COMMANDS

### Check API Health (Terminal)

```bash
# Simple check
curl https://api.imobi.com.br/health | jq .

# Pretty print
curl https://api.imobi.com.br/health | jq '.'

# Check status only
curl https://api.imobi.com.br/health | jq '.status'

# Continuous check (every 5 sec)
watch -n5 'curl -s https://api.imobi.com.br/health | jq .'
```

### Check Database (RDS)

```bash
# Via psql (if you have access)
psql $DATABASE_URL -c "SELECT 1;"

# Via curl to API health
curl https://api.imobi.com.br/health | jq '.database'

# Check from CloudWatch
# AWS Console → RDS → Databases → [instance] → Monitoring
```

### Check Redis (ElastiCache)

```bash
# Via curl to API health
curl https://api.imobi.com.br/health | jq '.redis'

# Via redis-cli (if accessible)
redis-cli -h [REDIS_HOST] -p 6379 PING

# Check from CloudWatch
# AWS Console → ElastiCache → Redis → [instance] → Monitoring
```

### Check S3 Access

```bash
# Test bucket access
aws s3api head-bucket --bucket imbobi-evidencias-prod

# List recent objects
aws s3 ls s3://imbobi-evidencias-prod --human-readable --summarize

# Check IAM policy
aws iam get-role-policy --role-name [app-role] --policy-name [policy-name]
```

### Deploy to Vercel (If Redeploying)

```bash
# Option 1: Via Vercel CLI
vercel deploy --prod --token $VERCEL_TOKEN

# Option 2: Via GitHub
git push origin main  # Auto-deploys if CI/CD configured

# Option 3: Via Vercel UI
# https://vercel.com/[TEAM]/imobi/deployments → Click "Deploy"
```

### Rollback (CRITICAL)

```
1. Open https://vercel.com/[TEAM]/imobi/deployments
2. Click on previous deployment (green checkmark)
3. Click "..." menu → "Promote to Production"
4. Confirm
5. Wait ~2 min for redeploy
6. Check health: curl https://api.imobi.com.br/health
```

---

## SENTRY QUICK NAVIGATION

### Find Top Errors

```
https://sentry.io/organizations/imobi/issues/
Sort: Frequency (highest first)
Filter: is:unresolved environment:production
```

### Check Performance

```
https://sentry.io/organizations/imobi/performance/
Filter: environment:production
Break down by: Endpoint
Show: p50, p95, p99 latency
```

### Setup Custom Dashboard

```
https://sentry.io/organizations/imobi/dashboards/new/
Name: "Cutover Live"
Add widgets:
  - Error count (time series)
  - Top 5 errors
  - Transaction duration (histogram)
  - Browser performance
```

---

## CLOUDWATCH QUICK NAVIGATION

### RDS Metrics

```
AWS Console → RDS → Databases → [instance] → Monitoring
Or: https://console.aws.amazon.com/rds/
Watch:
  - CPU Utilization (target < 70%)
  - Database Connections (target < 95)
  - Memory (target < 80%)
```

### ElastiCache Metrics

```
AWS Console → ElastiCache → Redis → [instance] → Monitoring
Or: https://console.aws.amazon.com/elasticache/
Watch:
  - CPU Utilization (target < 70%)
  - Evictions (target 0, alert > 100/sec)
  - Cache hits vs misses (target hit% > 80%)
```

### CloudWatch Dashboard

```
AWS Console → CloudWatch → Dashboards → imobi-production-cutover
Or: https://console.aws.amazon.com/cloudwatch/
Set refresh to 1 minute (not 5 min!)
```

---

## SLACK CHANNELS

| Channel | Purpose | Watch |
|---------|---------|-------|
| #ops-critical | CRITICAL alerts | ALWAYS |
| #ops-monitoring | General monitoring | Every 15 min |
| #cutover-logs | Cutover timeline | Continuous |
| #incident-response | Issues & fixes | As needed |

### Quick Slack Commands

```
# Find Sentry errors
/search "sentry error rate"

# See CloudWatch alarms
/aws cloudwatch describe-alarms

# Ping on-call
@on-call "Status check: Error rate OK?"
```

---

## DECISION TREE

### Error Rate Spiking

```
Is it > 5%?
├─ YES → Slack @cto "ERROR RATE CRITICAL"
│  └─ Check Sentry for error type
│     ├─ Can fix in 5 min?
│     │  ├─ YES → Fix it, monitor
│     │  └─ NO → ROLLBACK
│     └─ Still > 5% after 5 min?
│        └─ ROLLBACK immediately
└─ NO (1-5%) → Monitor, no action yet
```

### Latency Spiking

```
Is p95 > 200ms?
├─ YES → Check RDS CPU
│  ├─ CPU > 80%?
│  │  └─ SCALE UP immediately
│  ├─ Connections > 95?
│  │  └─ Investigate connection leak
│  └─ Still > 200ms after 5 min?
│     └─ ROLLBACK or continue investigation
└─ NO (100-200ms) → Monitor, no action
```

### Health Check Fails

```
Which check?
├─ API /health → App not running (restart?)
├─ Database → RDS issue (check status)
├─ Redis → ElastiCache issue (check status)
├─ S3 → IAM permissions (check policy)
├─ DNS → Route53 issue (check records)
└─ Web → Vercel issue (check deployment)

Can fix in 2 min?
├─ YES → Fix it
└─ NO → ROLLBACK
```

### All Metrics Green

```
Error rate < 1%?
├─ YES ✅
Latency p95 < 150ms?
├─ YES ✅
Cache hit > 80%?
├─ YES ✅
CPU < 70%, Memory < 80%, Connections < 80?
├─ YES ✅
No 5xx errors?
├─ YES ✅

ALL YES → DECLARE SUCCESS 🎉
```

---

## EMERGENCY CONTACTS

```
CTO:              [Name] — [Phone] — [Email]
DevOps Lead:      [Name] — [Phone] — [Email]
SRE On-Call:      [Name] — [Phone] — [Email]
Backend Lead:     [Name] — [Phone] — [Email]
Ops Manager:      [Name] — [Phone] — [Email]

Escalation Path:
1. Slack #ops-critical (everyone)
2. Call DevOps Lead (+XX XXXXX)
3. Call CTO if DevOps doesn't respond
4. Page on-call via PagerDuty
```

---

## TIME STAMPS (UTC)

| Time | Activity | Check |
|------|----------|-------|
| 00:00 | CUTOVER START | Deploy initiated? |
| 00:05 | Build in progress | No build errors? |
| 00:15 | Canary (1% traffic) | Errors < 1%? |
| 00:30 | Health check sweep | All 6 checks pass? |
| 00:45 | Load validation | Infra OK? |
| 01:00 | Ramp to 50% | Metrics still good? |
| 01:30 | Ramp to 100% | Full traffic OK? |
| 01:45 | Stability check | 10 min stable? |
| 02:00 | Post-deploy validation | Smoke tests pass? |
| 02:30 | Infra health | Trends OK? |
| 03:00 | DECLARE SUCCESS | Mission accomplished? |
| 03:30 | Handoff | On-call ready? |

---

## REMEMBER

```
🎯 GOAL: Get 100% of users to new version safely

🟢 GREEN = All metrics normal → No action
🟡 YELLOW = Something off → Investigate (max 5 min)
🔴 RED = Critical problem → Fix fast or ROLLBACK

⏱️ TIME IS CRITICAL:
   - Can't fix in 5 min? ROLLBACK
   - Uncertain what to do? Ask @cto
   - Multiple red lights? ROLLBACK immediately

📞 COMMUNICATION:
   - Every action → Post in Slack #cutover-logs
   - Every decision → @ mention relevant people
   - Every alert → Confirm someone saw it

🚀 YOU'VE GOT THIS!
   - Team is prepared
   - Runbooks are ready
   - Rollback procedure tested
   - Everyone knows their role

Good luck! 🍀
```

---

**Print this page and keep at your desk during cutover**

Last updated: 2026-05-29  
Next update: After cutover postmortem
