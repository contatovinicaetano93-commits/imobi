# Rollback & Disaster Recovery Procedures

**Environment:** Staging → Production  
**Generated:** 2026-05-31  
**Critical Document:** Keep accessible during operations

---

## Deployment Rollback (< 10 minutes)

### Scenario 1: Critical Bug Discovered Post-Deployment

**Symptoms:**
- API returning 500 errors on all requests
- Database queries timing out
- Users unable to login

**Steps:**

#### Step 1: Declare Incident (Immediate)
```bash
# Notify team
# 1. Slack: @here INCIDENT - API is down
# 2. PagerDuty: Create incident "API Critical - Rollback in progress"
# 3. Start war room call
```

#### Step 2: Verify Issue (< 2 min)
```bash
# Check CloudWatch logs
aws logs tail /ecs/imobi --follow

# Check API health
curl https://api.staging.imbobi.com.br/health

# Check database
aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod \
  --query 'DBInstances[0].DBInstanceStatus'

# Check ECS service
aws ecs describe-services \
  --cluster imbobi-prod \
  --services api \
  --query 'services[0].runningCount'
```

#### Step 3: Identify Change (< 2 min)
```bash
# Compare current version with previous
git log --oneline -5

# Check what changed
git diff HEAD~1..HEAD --stat

# Review most recent deployment
aws ecs describe-task-definition \
  --task-definition imbobi-api:123 \
  | jq '.taskDefinition.revision'
```

#### Step 4: Rollback (< 5 min)

**Option A: ECS Service Rollback (Recommended - Fastest)**
```bash
# Get previous task definition revision
PREVIOUS_REVISION=$(aws ecs list-task-definitions \
  --family-prefix imbobi-api \
  --sort DESC \
  --query 'taskDefinitionArns[1]')

# Update service to use previous revision
aws ecs update-service \
  --cluster imbobi-prod \
  --service api \
  --task-definition $PREVIOUS_REVISION

# Wait for rollback
aws ecs wait services-stable \
  --cluster imbobi-prod \
  --services api

echo "✅ Rollback complete - Service running previous version"

# Verify
curl https://api.staging.imbobi.com.br/health
```

**Option B: Git Rollback (If ECS fails)**
```bash
# Revert to previous commit
git revert HEAD --no-edit
git push origin claude/happy-goldberg-AFQPj

# Rebuild and redeploy
pnpm build
docker build -t imbobi-api:rollback .
docker push imbobi-api:rollback

# Update ECS to new image
aws ecs update-service \
  --cluster imbobi-prod \
  --service api \
  --force-new-deployment
```

**Option C: Database Rollback (If schema changed)**
```bash
# Check current Prisma schema version
pnpm db:status

# Rollback to previous migration
pnpm db:migrate resolve --rolled-back 001_latest

# Verify migration applied
pnpm db:status

echo "✅ Database rolled back to previous schema"
```

#### Step 5: Validate (< 2 min)
```bash
# Health checks
curl -s https://api.staging.imbobi.com.br/health | jq .

# Smoke tests
curl -s https://api.staging.imbobi.com.br/api/v1/obras \
  -H "Authorization: Bearer $TEST_TOKEN" | jq '.length'

# Database connectivity
psql -h $RDS_ENDPOINT -d imbobi_prod \
  -U postgres -c "SELECT COUNT(*) FROM usuarios;"

# Redis connectivity
redis-cli -h $REDIS_ENDPOINT PING
```

#### Step 6: Communicate (Immediate)
```
Slack post:
"🔄 INCIDENT RESOLVED: API rolled back to previous version.
- Previous version: [commit hash]
- Current version: [commit hash]  
- Status: Monitoring for issues
- ETA for fix: [time]"

Update PagerDuty with resolution

Email stakeholders if customer-facing
```

---

### Scenario 2: Partial Failure (Some Endpoints Down)

**Symptoms:**
- POST /api/v1/auth/login returns 500
- GET /api/v1/obras works fine
- Database is healthy

**Quick Diagnostics:**
```bash
# Check CloudWatch for specific endpoint errors
aws logs filter-log-events \
  --log-group-name /ecs/imobi \
  --filter-pattern 'ERROR' | grep login

# Review recent changes to auth controller
git diff HEAD~3..HEAD -- services/api/src/modules/auth/

# Check auth module tests
pnpm --filter @imbobi/api test auth
```

**Targeted Fix:**
```bash
# If simple bug fix (< 50 lines):
# 1. Fix code locally
# 2. Run tests: pnpm test
# 3. Rebuild: docker build
# 4. Deploy: docker push + ECS update
# Total time: < 10 min

# If complex issue:
# Proceed with full rollback (Section 1)
```

---

## Database Disaster Recovery

### Scenario: Data Corruption or Accidental Deletion

**Prevention:**
- ✅ Automated backups every 4 hours (30-day retention)
- ✅ Read replica in different AZ
- ✅ Point-in-time recovery enabled (35 days)
- ✅ Transaction logs archived to S3

**Recovery Steps (< 1 hour):**

#### Step 1: Stop the Bleeding (Immediate)
```bash
# Revoke all write permissions
aws rds modify-db-instance \
  --db-instance-identifier imbobi-prod \
  --apply-immediately \
  --db-security-group-ingress-rules "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=NONE"

# Notify all services: "Database read-only mode enabled"
```

#### Step 2: Assess Damage (< 5 min)
```bash
# Check transaction logs
aws logs tail /aws/rds/imbobi --follow

# Find point of corruption
# "Deleted 10000 rows from usuarios" timestamp: 2026-05-31 14:23:45Z

# Determine safe restore point
RESTORE_TIME="2026-05-31T14:23:00Z"
```

#### Step 3: Restore from Backup (< 30 min)

**Option A: Point-in-Time Recovery (Recommended)**
```bash
# Create new DB instance from backup
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier imbobi-prod \
  --db-instance-identifier imbobi-prod-recovery \
  --restore-time $RESTORE_TIME \
  --use-latest-restorable-time

# Wait for restore
aws rds wait db-instance-available \
  --db-instance-identifier imbobi-prod-recovery

# Verify data is correct
psql -h imbobi-prod-recovery.xxx.rds.amazonaws.com \
  -d imbobi_prod -U postgres \
  -c "SELECT COUNT(*) FROM usuarios;"

# Once verified, swap endpoints
# 1. Update DNS/CNAME to point to recovery instance
# 2. Update application connection strings
# 3. Delete old corrupted instance
```

**Option B: Snapshot Restore**
```bash
# List recent snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier imbobi-prod \
  --query 'DBSnapshots[?SnapshotCreateTime>=`2026-05-31T10:00:00`]'

# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier imbobi-prod-recovery \
  --db-snapshot-identifier rds:imbobi-prod-2026-05-31-14-00

# Follow same verification as Option A
```

#### Step 4: Restore Connectivity (< 5 min)
```bash
# Update application connection string
# Update .env in ECS task definition
aws ecs update-service \
  --cluster imbobi-prod \
  --service api \
  --force-new-deployment

# Monitor connection establishment
aws logs tail /ecs/imobi --follow | grep 'Database'

# Re-enable write permissions
aws rds modify-db-instance \
  --db-instance-identifier imbobi-prod-recovery \
  --db-security-group-ingress-rules "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=10.0.0.0/16}]"
```

#### Step 5: Validate (< 10 min)
```bash
# Test connectivity
psql -h $(aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod-recovery \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text) \
  -d imbobi_prod -U postgres -c "SELECT 1"

# Run application health checks
curl https://api.staging.imbobi.com.br/health/deep

# Check data integrity
pnpm --filter @imbobi/api run test:integration:recovery

# Verify application logs
aws logs tail /ecs/imobi --follow
```

---

## Redis Cache Disaster Recovery

### Scenario: Cache Corrupted or Lost

**Recovery (< 5 minutes):**

#### Step 1: Clear Corrupted Cache
```bash
# Connect to Redis
redis-cli -h $REDIS_ENDPOINT -p 6379

# Flush all keys (CAREFUL!)
> FLUSHALL
> EXIT

# Verify empty
redis-cli -h $REDIS_ENDPOINT DBSIZE
# Should return: (integer) 0
```

#### Step 2: Allow Cache Rebuild
```bash
# Application will automatically rebuild cache on next request
# Monitor rebuilding process
aws logs tail /aws/elasticache/imobi/slow-log --follow

# Expected: Commands like SET becoming more frequent

# Wait for cache warming (2-5 minutes)
# Monitor hit rate
redis-cli -h $REDIS_ENDPOINT INFO stats | grep hits
```

#### Step 3: Verify Performance
```bash
# Check cache hit rate returned to normal
redis-cli -h $REDIS_ENDPOINT INFO stats | grep hit_rate

# Expected: > 70% after 5 minutes

# Monitor API latency
aws cloudwatch get-metric-statistics \
  --namespace imbobi/api \
  --metric-name http.request.duration \
  --dimensions Name=route,Value=/api/v1/obras \
  --start-time 2026-05-31T14:30:00Z \
  --end-time 2026-05-31T14:35:00Z \
  --period 60 \
  --statistics Average
```

---

## S3 Disaster Recovery (Lost Evidence Photos)

### Scenario: Evidence Photos Corrupted or Deleted

**Prevention:**
- ✅ Versioning enabled on S3 bucket
- ✅ Cross-region replication to us-west-2
- ✅ MFA delete protection on production
- ✅ 30-day retention policy

**Recovery:**

#### Step 1: Assess Scope
```bash
# List deleted objects
aws s3api list-object-versions \
  --bucket imbobi-obras-prod \
  --prefix "evidencias/" \
  --query 'Versions[?IsLatest==`false`]' > deleted_objects.json

# Count deletions
cat deleted_objects.json | jq '. | length'
```

#### Step 2: Restore from Version History
```bash
# If deleted recently (< 30 days):
aws s3api copy-object \
  --copy-source imbobi-obras-prod/evidencias/file.jpg?versionId=abc123 \
  --bucket imbobi-obras-prod \
  --key evidencias/file.jpg

# For bulk restore (scripts in s3-recovery-tools/):
./restore_s3_objects.sh --prefix evidencias/ --version-id abc123
```

#### Step 3: Restore from Replica
```bash
# If primary bucket beyond recovery window:
aws s3 sync \
  s3://imbobi-obras-prod-replica/evidencias/ \
  s3://imbobi-obras-prod/evidencias/

# Verify sync complete
aws s3 ls s3://imbobi-obras-prod/evidencias/ --recursive | wc -l
```

---

## Elasticsearch/OpenSearch Disaster Recovery

### Scenario: Search Index Corrupted

**Recovery (< 20 minutes):**

```bash
# 1. Delete corrupted index
curl -X DELETE https://opensearch-endpoint/imbobi-obras

# 2. Recreate index from database
# This script reads from Postgres and rebuilds index
pnpm --filter @imbobi/api run rebuild:search-index

# 3. Monitor reindexing progress
curl -s https://opensearch-endpoint/imbobi-obras/_stats \
  | jq '.indices."imbobi-obras".primaries.docs'

# 4. Verify search functionality
curl -s https://opensearch-endpoint/imbobi-obras/_search \
  -H "Content-Type: application/json" \
  -d '{"query": {"match_all": {}}}' | jq '.hits.total'
```

---

## Full System Disaster Recovery

### Scenario: Region Down (AWS Region Unavailable)

**Prevention:**
- ✅ Database read replica in different AZ
- ✅ Terraform IaC for rapid redeploy
- ✅ CloudFront + S3 for static assets (multi-region)
- ✅ Application logs to CloudWatch (regional)

**Recovery Steps (1-2 hours):**

#### Step 1: Declare Disaster (Immediate)
```
- Page all oncall engineers
- Activate war room
- Post status page update
```

#### Step 2: Provision New Infrastructure (< 30 min)
```bash
# Switch to us-west-2 region
export AWS_REGION=us-west-2

# Validate Terraform can provision in new region
terraform plan -out=dr.tfplan

# Provision infrastructure
terraform apply dr.tfplan

# Wait for resources
aws ec2 wait instance-running \
  --instance-ids $(terraform output instance_ids)
```

#### Step 3: Restore Data (< 20 min)
```bash
# Restore database from cross-region snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier imbobi-dr \
  --db-snapshot-identifier arn:aws:rds:us-west-2:...

# Restore S3 objects from replica bucket
aws s3 sync \
  s3://imbobi-obras-prod-replica \
  s3://imbobi-obras-prod-dr \
  --region us-west-2
```

#### Step 4: Deploy Application (< 10 min)
```bash
# Deploy API to new region
aws ecs update-service \
  --cluster imbobi-prod-dr \
  --service api \
  --desired-count 2

# Deploy web to CloudFront (automatically served from edge)
# Update DNS to point to us-west-2 load balancer

# Monitor health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:...
```

#### Step 5: Validate (< 5 min)
```bash
# Test application in DR region
curl https://api-dr.staging.imbobi.com.br/health

# Verify data consistency
# Compare record counts between prod and DR

# Run smoke tests against new region
```

---

## Backup Verification (Run Monthly)

```bash
#!/bin/bash
# backup-verification.sh

echo "🔍 Verifying backups..."

# 1. RDS snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier imbobi-prod \
  --query 'DBSnapshots[0]' | jq '.SnapshotCreateTime, .SnapshotType'

# 2. S3 bucket versioning
aws s3api get-bucket-versioning \
  --bucket imbobi-obras-prod \
  | jq '.Status'

# 3. Most recent backup age
LAST_BACKUP=$(aws rds describe-db-snapshots \
  --db-instance-identifier imbobi-prod \
  --query 'DBSnapshots[0].SnapshotCreateTime' \
  --output text)

HOURS_AGO=$(( ($(date +%s) - $(date -d "$LAST_BACKUP" +%s)) / 3600 ))
echo "Last backup: $HOURS_AGO hours ago"

if [ $HOURS_AGO -gt 24 ]; then
  echo "⚠️  WARNING: Backup older than 24 hours"
  exit 1
fi

echo "✅ All backups verified"
```

---

## Incident Documentation

After any incident/rollback, complete:

```markdown
# Incident Report: [Description]

**Date:** YYYY-MM-DD  
**Duration:** HH:MM  
**Severity:** P1 (Critical) / P2 (High) / P3 (Medium)

## Summary
[Brief description of what happened]

## Timeline
- 14:23 UTC - Issue detected
- 14:25 UTC - Incident declared
- 14:30 UTC - Root cause identified
- 14:35 UTC - Rollback initiated
- 14:38 UTC - Service restored
- 14:40 UTC - Monitoring verified

## Root Cause
[What caused the issue]

## Resolution
[What was done to fix it]

## Prevention
[What we'll do to prevent recurrence]

## Action Items
- [ ] Update code review process
- [ ] Add test coverage
- [ ] Update runbooks
- [ ] Team training on X

**Authored by:** [Engineer]  
**Reviewed by:** [Engineering Lead]  
**Date:** YYYY-MM-DD
```

---

**Critical Numbers:**
- 🚨 Incident Hotline: [+55-11-xxxx-xxxx]
- 📞 On-Call Page: [PagerDuty]
- 💬 War Room: [Slack + Zoom]
- 📊 Status Page: [Statuspage.io]

**Last Updated:** 2026-05-31  
**Next Review:** 2026-06-30  
**Status:** ✅ READY
