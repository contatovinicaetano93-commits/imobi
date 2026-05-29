# DATABASE FAILOVER RUNBOOK - RDS PostgreSQL

**Version:** 1.0  
**Last Updated:** 2026-05-29  
**Severity:** Critical  
**RTO:** 2-3 minutes  
**RPO:** < 1 minute (RDS Multi-AZ)

---

## WHEN TO USE THIS RUNBOOK

### Primary Triggers
- RDS primary node unavailable (health check fails)
- Connection pooling errors: `FATAL: remaining connection slots are reserved`
- Application logs show: `ERROR: could not connect to server: Connection refused`
- AWS RDS Console shows: **Status = Failing Over** or **Unavailable**
- Sentry alerts: `DB_CONNECTION_FAILED` with > 50% error rate

### Quick Diagnosis
```bash
# From Vercel deployment terminal
psql -h prod-db.xxx.us-east-1.rds.amazonaws.com -U imbobi_prod -d imbobi_prod -c "SELECT 1;"

# Expected: ERROR (before failover complete)
# Expected after 1-2 min: (1 row)
```

---

## PREREQUISITES

### Tools & Access Required
- [ ] AWS Management Console access (IAM user with RDS permissions)
- [ ] `psql` CLI (PostgreSQL client): `brew install postgresql` or `apt install postgresql-client`
- [ ] `aws-cli` v2: `aws --version` should show 2.x+
- [ ] Vercel Console access (for health check validation)
- [ ] Slack access to `#ops-critical` channel
- [ ] SSH access to bastion host (if direct RDS access restricted)

### Environment Variables Ready
```bash
# Verify these are set in your shell
echo $AWS_PROFILE        # Should be "imbobi-prod"
echo $ENVIRONMENT        # Should be "production"
echo $RDS_ENDPOINT       # Should be prod-db.xxx.us-east-1.rds.amazonaws.com
```

---

## STEP-BY-STEP RECOVERY PROCEDURE

### Phase 1: DETECTION & CONFIRMATION (< 1 minute)

#### Step 1.1 - Confirm Database Down
```bash
# Check if RDS is responding
psql \
  -h prod-db.xxx.us-east-1.rds.amazonaws.com \
  -U imbobi_prod \
  -d imbobi_prod \
  -c "SELECT 1;" \
  -v ON_ERROR_STOP=on

# Expected result:
# - SUCCESS: (1 row)
# - FAILURE: psql: error: FATAL: could not connect to server: Connection refused
```

#### Step 1.2 - Check AWS RDS Dashboard
```bash
# Navigate to: https://console.aws.amazon.com/rds/
# 1. Select "Databases" → "prod-imbobi" instance
# 2. Check Status indicator:
#    - 🟢 Available = Normal (go to Step 1.3)
#    - 🟠 Backing up / Modifying = Wait (failover in progress)
#    - 🔴 Failing over = RDS auto-failover active (wait 1-2 min, then retry Step 1.1)
#    - 🔴 Unavailable = CRITICAL (skip to Phase 2)

# Alternative: AWS CLI
aws rds describe-db-instances \
  --db-instance-identifier prod-imbobi \
  --region us-east-1 \
  --query 'DBInstances[0].[DBInstanceStatus,DBInstanceIdentifier]' \
  --output text

# Expected: available prod-imbobi
```

#### Step 1.3 - Check Multi-AZ Status
```bash
# Verify failover target is ready
aws rds describe-db-instances \
  --db-instance-identifier prod-imbobi \
  --region us-east-1 \
  --query 'DBInstances[0].[MultiAZ,DBInstanceIdentifier]' \
  --output text

# Expected: True prod-imbobi (Multi-AZ enabled = automatic failover possible)
```

#### Step 1.4 - Timestamp Incident Start
```bash
# Log the incident time for RTO tracking
echo "[$(date -u +'%Y-%m-%d %H:%M:%S UTC')] DB Failover detected" > /tmp/db-failover-incident.log

# Post to Slack
curl -X POST -H 'Content-type: application/json' \
  --data "{
    \"channel\": \"#ops-critical\",
    \"text\": \"🔴 [INCIDENT] RDS Failover Triggered\",
    \"attachments\": [{
      \"color\": \"danger\",
      \"fields\": [
        {\"title\": \"Instance\", \"value\": \"prod-imbobi\", \"short\": true},
        {\"title\": \"Time\", \"value\": \"$(date -u +'%Y-%m-%d %H:%M:%S UTC')\", \"short\": true},
        {\"title\": \"Status\", \"value\": \"Failover in progress\", \"short\": false}
      ]
    }]
  }" \
  $SLACK_WEBHOOK_OPS_CRITICAL
```

---

### Phase 2: AUTOMATIC FAILOVER HANDLING (1-2 minutes)

#### Step 2.1 - Monitor Failover Progress
```bash
# RDS Multi-AZ failover is AUTOMATIC (no action needed)
# Typical sequence:
# 1. Primary node fails (detected by AWS health check ~10 seconds)
# 2. AWS initiates standby promotion (~30 seconds)
# 3. DNS updated to point to new primary (~20 seconds)
# 4. Connections resume (may need reconnect from app)

# Monitor failover in real-time
watch -n 5 'aws rds describe-db-instances \
  --db-instance-identifier prod-imbobi \
  --region us-east-1 \
  --query "DBInstances[0].[DBInstanceStatus,LatestRestorableTime]" \
  --output text'

# Press Ctrl+C when status changes to "available"
```

#### Step 2.2 - Wait for DNS Propagation
```bash
# DNS may take up to 60 seconds to fully propagate
# Test connectivity loop (max 2 min wait)
for i in {1..24}; do
  echo "[$(date -u +'%H:%M:%S')] Attempt $i/24..."
  psql \
    -h prod-db.xxx.us-east-1.rds.amazonaws.com \
    -U imbobi_prod \
    -d imbobi_prod \
    -c "SELECT 1 as connection_ok;" \
    -v ON_ERROR_STOP=on && {
      echo "✓ Database connection restored!"
      break
    }
  sleep 5
done
```

#### Step 2.3 - Verify Replication Lag
```bash
# After failover, check if any data was lost
# In RDS Multi-AZ, lag should be ~0 (synchronous replication)
psql \
  -h prod-db.xxx.us-east-1.rds.amazonaws.com \
  -U imbobi_prod \
  -d imbobi_prod \
  -c "SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) as replication_lag_seconds;"

# Expected result: replication_lag_seconds < 0.1
# If > 10 seconds: Data loss may have occurred → escalate to DBA
```

---

### Phase 3: APPLICATION RECONNECTION (0-1 minute)

#### Step 3.1 - Check Connection Pool Status
```bash
# Verify Vercel API is reconnecting to new primary
# Check application logs in Sentry
# Navigate to: https://sentry.io/organizations/imbobi/issues/

# Expected in logs after failover:
# ✓ "Database connection restored"
# ✓ No new DB_CONNECTION_FAILED errors after 2 min mark

# Alternative: Check via health endpoint
curl -s https://api.imbobi.prod/health | jq '.database.status'
# Expected: "connected" or "healthy"
```

#### Step 3.2 - Verify Query Execution
```bash
# Run sample query through application
psql \
  -h prod-db.xxx.us-east-1.rds.amazonaws.com \
  -U imbobi_prod \
  -d imbobi_prod \
  -c "SELECT COUNT(*) as obra_count FROM obras;"

# Expected: obra_count > 0 (at least one obra exists)
```

#### Step 3.3 - Check for Connection Leaks
```bash
# If failover caused many connection resets, connections might pile up
# Check active connections
psql \
  -h prod-db.xxx.us-east-1.rds.amazonaws.com \
  -U imbobi_prod \
  -d imbobi_prod \
  -c "SELECT datname, count(*) as connections FROM pg_stat_activity GROUP BY datname;"

# If > 40 idle connections with state='idle in transaction':
# Application may have transaction deadlock → escalate to backend team

# Terminate idle connections (CAREFUL!)
psql \
  -h prod-db.xxx.us-east-1.rds.amazonaws.com \
  -U imbobi_prod \
  -d imbobi_prod \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle in transaction' AND query_start < NOW() - INTERVAL '5 minutes';"
```

---

### Phase 4: DASHBOARD VALIDATION (1-2 minutes)

#### Step 4.1 - Verify Web Dashboard Loads
```bash
# Open browser and navigate to:
# https://app.imbobi.prod/

# Checklist:
# ✓ Page loads within 3 seconds
# ✓ No "Database connection" error modal
# ✓ Obras list visible (at least 5 items)
# ✓ Can click on one obra (detail page loads)
# ✓ No 500 errors in browser console (F12)
```

#### Step 4.2 - Verify API Endpoints
```bash
# Test critical API routes
curl -s -H "Authorization: Bearer $TEST_TOKEN" \
  https://api.imbobi.prod/obras | jq '.data | length'
# Expected: > 0 (at least one obra returned)

curl -s -H "Authorization: Bearer $TEST_TOKEN" \
  https://api.imbobi.prod/health | jq '.database'
# Expected: {"status": "connected"}
```

#### Step 4.3 - Verify S3 Attachment Serving
```bash
# Check if evidence photo URLs work
# Open browser DevTools → Network tab
# Navigate to obra detail page
# Find any <img> tag with src="https://s3.amazonaws.com/..."
# Verify image loads (status 200)

# Or via CLI:
curl -s -o /dev/null -w "%{http_code}" \
  "https://imbobi-evidence.s3.us-east-1.amazonaws.com/sample-image.jpg"
# Expected: 200 (OK)
```

---

### Phase 5: BACKUP & MONITORING VERIFICATION (2-3 minutes)

#### Step 5.1 - Confirm Backups Still Scheduled
```bash
# Failover may interrupt scheduled backup
# Check backup window configuration
aws rds describe-db-instances \
  --db-instance-identifier prod-imbobi \
  --region us-east-1 \
  --query 'DBInstances[0].[PreferredBackupWindow,BackupRetentionPeriod]' \
  --output text

# Expected: 02:00-03:00 7 (2am-3am UTC, 7-day retention)

# Verify last backup timestamp
aws rds describe-db-instances \
  --db-instance-identifier prod-imbobi \
  --region us-east-1 \
  --query 'DBInstances[0].LatestRestorableTime' \
  --output text

# If "LatestRestorableTime" is older than 24 hours → backup may have failed
# → Manual backup recommended: aws rds create-db-snapshot ...
```

#### Step 5.2 - Check CloudWatch Alarms
```bash
# Verify database performance metrics after failover
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=prod-imbobi \
  --start-time $(date -u -d '5 minutes ago' +'%Y-%m-%dT%H:%M:%S') \
  --end-time $(date -u +'%Y-%m-%dT%H:%M:%S') \
  --period 60 \
  --statistics Average \
  --region us-east-1

# Expected: CPU < 20% (normal after failover)
# If CPU > 50% and rising → queries may be stuck, check connections
```

#### Step 5.3 - Enable Enhanced Monitoring (if not already)
```bash
# Ensure detailed monitoring is enabled for future failovers
aws rds modify-db-instance \
  --db-instance-identifier prod-imbobi \
  --enable-cloudwatch-logs-exports postgresql \
  --region us-east-1 \
  --apply-immediately

# Verify
aws rds describe-db-instances \
  --db-instance-identifier prod-imbobi \
  --region us-east-1 \
  --query 'DBInstances[0].EnabledCloudwatchLogsExports' \
  --output text
# Expected: postgresql (or similar)
```

---

## VALIDATION CHECKLIST

Use this to confirm failover is complete:

```
[ ] Step 1: Database responds to psql SELECT 1
[ ] Step 2: RDS console shows "available" status
[ ] Step 3: Multi-AZ is enabled (True)
[ ] Step 4: Replication lag < 0.1 seconds
[ ] Step 5: Health endpoint returns /health 200 OK
[ ] Step 6: Obras list query returns > 0 rows
[ ] Step 7: Web app loads without errors
[ ] Step 8: Can view obra detail page
[ ] Step 9: S3 images load (200 OK)
[ ] Step 10: Backups still scheduled for tomorrow

✓ FAILOVER COMPLETE when all 10 checks pass
```

---

## ESTIMATED TIMELINE

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| 1. Detection | 30 seconds | 0:30 |
| 2. Auto-failover | 1-2 minutes | 2:00 |
| 3. App reconnect | 1 minute | 3:00 |
| 4. Dashboard check | 2 minutes | 5:00 |
| 5. Backup verify | 2 minutes | 7:00 |
| **TOTAL RTO** | **~7 minutes** | |

**Target:** < 3 minutes for automatic failover + health check

---

## ESCALATION PROTOCOL

### If Database Still Down After 5 Minutes

```
1. **Immediate Action:**
   - Check RDS console for any visible errors
   - Verify you have correct DB endpoint (not cached old endpoint)
   - Restart Vercel deployment: Vercel Dashboard → Redeploy

2. **5-10 minutes:**
   - Escalate to AWS Support (P1 - Production)
   - Contact DBA on-call
   - Check if multi-AZ is actually enabled (should be)

3. **10+ minutes:**
   - Activate FULL_SYSTEM_RESTART runbook
   - Contact CTO / Infrastructure Lead
   - Prepare for emergency database restore
```

### Escalation Contacts

| Tier | Contact | Slack | Phone |
|------|---------|-------|-------|
| L1 | On-Call Engineer | @on-call-l1 | 📞 See Slack |
| L2 | DBA Lead | @dba-lead | 📞 See Slack |
| L3 | CTO | @cto | 📞 See Slack |
| External | AWS Support | N/A | Depends on plan |

---

## ROLLBACK / RECOVERY OPTIONS

### If New Primary is Corrupted
```bash
# RDS Multi-AZ failover is not reversible instantly
# But you can:

# Option 1: Promote read replica (if exists)
# - Requires read replica already created (not typical)
# - Take ~5 minutes to promote

# Option 2: Restore from backup
# - Use 02-db-restore.md runbook
# - Point-in-time restore to 5 minutes before failover
# - Takes ~30 minutes

# Option 3: Manual failback (not recommended)
# - Reboot with failover to force standby (now old primary) to become primary
# - Only if you're confident old primary is healthy
aws rds reboot-db-instance \
  --db-instance-identifier prod-imbobi \
  --region us-east-1 \
  --force-failover
```

### Preventing Future Failovers
```bash
# 1. Increase RDS instance size
aws rds modify-db-instance \
  --db-instance-identifier prod-imbobi \
  --db-instance-class db.t3.large \
  --apply-immediately

# 2. Enable Performance Insights
aws rds modify-db-instance \
  --db-instance-identifier prod-imbobi \
  --enable-performance-insights \
  --apply-immediately

# 3. Review database metrics weekly
# Look for: high CPU, memory pressure, connection count spikes
```

---

## ALERTING & MONITORING SETUP

### CloudWatch Alarms to Monitor
```bash
# Alarm 1: RDS Failover Occurred
# Trigger: RDS status changes to "failing-over"
# Action: SNS → Slack #ops-critical

# Alarm 2: High Database CPU
# Trigger: CPU > 80% for 2 minutes
# Action: Auto-scale (if enabled) or manual review

# Alarm 3: Database Replication Lag
# Trigger: Lag > 1 second
# Action: SNS → Slack #ops

# Alarm 4: Connection Count High
# Trigger: > 40 connections
# Action: Alert on-call engineer
```

### Sentry Alerts to Monitor
```
Alert Rule: DB_CONNECTION_FAILED
Level: Error
Frequency: Alert if > 10 errors in 1 minute
Notify: #ops-critical + on-call engineer
```

---

## POST-INCIDENT CHECKLIST

After failover is resolved:

- [ ] Document incident start time: `_______`
- [ ] Document incident end time: `_______`
- [ ] Calculate actual RTO: `_______` (target: < 3 min)
- [ ] Check if data loss occurred (replication lag was 0?)
- [ ] Identify root cause of primary failure
- [ ] Update RDS maintenance window if needed
- [ ] Schedule post-mortem with team (within 48 hours)
- [ ] Post incident summary to #ops channel
- [ ] Update this runbook if procedures changed

---

## RELATED RUNBOOKS

- **02-db-restore.md** — If manual restore from backup needed
- **05-full-system-restart.md** — If failover + other services affected
- **DISASTER_RECOVERY.md** — Long-form backup/restore procedures

---

**Document Owner:** Infrastructure Team  
**Last Tested:** 2026-05-28  
**Next Test Date:** 2026-06-04 (monthly drill)  
**Approved By:** CTO
