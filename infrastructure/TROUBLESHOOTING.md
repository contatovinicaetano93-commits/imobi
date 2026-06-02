# imobi Troubleshooting Guide

**Version:** 2.0  
**Last Updated:** 2026-06-02  
**Target Audience:** Operations, DevOps, On-Call Engineers  
**SLA:** Critical issues (P1) diagnosed within 15 minutes

---

## Quick Links

- [API Startup Failures](#api-startup-failures)
- [Database Connection Issues](#database-connection-issues)
- [Redis Connection Issues](#redis-connection-issues)
- [AWS Credential Errors](#aws-credential-errors)
- [High Error Rates](#high-error-rates)
- [Performance Degradation](#performance-degradation)
- [Memory Leaks](#memory-leaks)
- [Authentication Failures](#authentication-failures)
- [File Upload Issues](#file-upload-issues)
- [Escalation Checklist](#escalation-checklist)

---

## API Startup Failures

### Symptom
API service fails to start. `systemctl status imbobi-api` shows `failed` or `inactive`.

### Root Causes
1. Database connection string invalid
2. Redis connection failed
3. JWT_SECRET missing or invalid
4. AWS credentials not accessible
5. Port 4000 already in use
6. Insufficient memory/disk space

### Diagnostic Steps

**Step 1: Check service status**
```bash
systemctl status imbobi-api
# Look for: ExecStart failed with code

journalctl -u imbobi-api -n 100 --no-pager
# Look for: DATABASE connection error, ENOTFOUND, permission denied
```

**Step 2: Check environment variables loaded**
```bash
systemctl show-environment | grep -E "DATABASE_URL|JWT_SECRET|REDIS_HOST"
# If empty, environment not passed to service

# Verify /etc/systemd/system/imbobi-api.service has:
# EnvironmentFile=/path/to/.env.production
```

**Step 3: Test components individually**
```bash
# Test database connection
export DATABASE_URL="postgresql://imbobi:pass@host:5432/db"
psql $DATABASE_URL -c "SELECT 1;" 2>&1

# Test Redis connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING
# Expected: PONG

# Test JWT secret exists
echo $JWT_SECRET | wc -c
# Expected: >= 65 (64 chars + newline)

# Test port available
netstat -tlnp | grep 4000
# Expected: (empty - port available)
```

**Step 4: Check AWS credentials (if using Secrets Manager)**
```bash
# Verify IAM role or credentials
aws sts get-caller-identity 2>&1
# Should show: Account, UserId, Arn

# Verify secret exists
aws secretsmanager get-secret-value --secret-id imobi/production 2>&1 | head -5
# Should show: ARN, Name, (not error)
```

**Step 5: Manual startup with diagnostics**
```bash
# Stop service
systemctl stop imbobi-api

# Start with verbose output
cd /app && NODE_ENV=production npm start 2>&1 | head -200

# Look for first error:
# - "Cannot find module" -> npm install needed
# - "ECONNREFUSED" -> Database/Redis down
# - "jwt secret" -> JWT_SECRET not set
# - "EADDRINUSE" -> Port in use
```

### Resolution

**Database Connection Error:**
```bash
# Verify connection string format
echo $DATABASE_URL
# Expected: postgresql://user:password@host:port/dbname

# Test with psql
psql $DATABASE_URL -c "SELECT 1;"

# If failing:
# 1. Check RDS security group allows connection
aws ec2 describe-security-groups --group-ids {RDS_SG} | jq '.SecurityGroups[0].IpPermissions'

# 2. Check RDS instance status
aws rds describe-db-instances --db-instance-identifier imbobi-production \
  --query 'DBInstances[0].DBInstanceStatus'

# 3. Check network connectivity
ping -c 1 {RDS_ENDPOINT}
telnet {RDS_ENDPOINT} 5432

# 4. Update DATABASE_URL in secrets
aws secretsmanager update-secret --secret-id imobi/production \
  --secret-string '{"DATABASE_URL":"postgresql://...",...}'

# 5. Restart service
systemctl restart imbobi-api
```

**Redis Connection Error:**
```bash
# Verify connection
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING

# If failing:
# 1. Check ElastiCache cluster status
aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis \
  --query 'CacheClusters[0].CacheClusterStatus'

# 2. Check security group rules
aws ec2 describe-security-groups --group-ids {REDIS_SG} | jq '.SecurityGroups[0].IpPermissions'

# 3. If cluster down, reboot it
aws elasticache reboot-cache-cluster --cache-cluster-id imbobi-redis

# 4. Wait for cluster to come online (2-5 min)
aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis \
  --query 'CacheClusters[0].CacheClusterStatus' --poll

# 5. Verify connectivity
sleep 30 && redis-cli -h $REDIS_HOST PING
```

**JWT Secret Missing:**
```bash
# Verify secret exists
aws secretsmanager get-secret-value --secret-id imobi/production \
  | jq '.SecretString | fromjson | .JWT_SECRET'

# If null or missing:
# Generate new secret
NEW_SECRET=$(openssl rand -base64 48)

# Update secret
aws secretsmanager update-secret --secret-id imobi/production \
  --secret-string "{...\"JWT_SECRET\":\"$NEW_SECRET\",...}"

# Restart API
systemctl restart imbobi-api
```

**Port Already in Use:**
```bash
# Find process using port 4000
lsof -i :4000
# Kill process if stale
kill -9 {PID}

# Or change port (if allowed)
# Update PORT env var and restart

# Verify port free
netstat -tlnp | grep 4000
```

### Prevention

- Add startup health check to CI/CD
- Test environment variables before deployment
- Run pre-launch checklist from DEPLOYMENT.md
- Monitor application logs for startup errors

---

## Database Connection Issues

### Symptom
API running but `/api/v1/health` endpoint shows `database: disconnected`.

### Root Causes
1. RDS instance down or rebooting
2. Network/Security group blocking connection
3. Database user password changed
4. Connection pool exhausted
5. Network timeout (latency > 30s)

### Diagnostic Steps

**Step 1: Check RDS instance status**
```bash
aws rds describe-db-instances \
  --db-instance-identifier imbobi-production \
  --query 'DBInstances[0].[DBInstanceIdentifier,DBInstanceStatus,DBInstanceAvailabilityZone]'

# Expected status: available
# If status: backing-up, modifying, rebooting -> wait 5-10 minutes
# If status: failed, deleting, incompatible-params -> critical issue, escalate
```

**Step 2: Test database connectivity directly**
```bash
# From API server
psql $DATABASE_URL -c "SELECT 1;"

# Check connection response time
time psql $DATABASE_URL -c "SELECT 1;"
# Expected: < 1 second

# Check TCP connectivity
nc -zv {RDS_ENDPOINT} 5432
# Expected: succeeded
```

**Step 3: Check security group configuration**
```bash
# Get RDS security group
RDS_SG=$(aws rds describe-db-instances \
  --db-instance-identifier imbobi-production \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' --output text)

# Get API instance security group
API_SG=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=imbobi-api" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)

# Verify inbound rule on RDS SG
aws ec2 describe-security-groups --group-ids $RDS_SG \
  | jq '.SecurityGroups[0].IpPermissions[] | select(.FromPort==5432)'

# Should show: IpProtocol=tcp, FromPort=5432, UserIdGroupPairs[].GroupId contains $API_SG

# If missing, add rule
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-security-group-id $API_SG
```

**Step 4: Check connection pool status**
```bash
# Get current connections
psql $DATABASE_URL -c "SELECT count(*) as connection_count FROM pg_stat_activity;"
# Expected: < 20 (default pool size)

# Check for idle connections
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'idle' LIMIT 10;"

# If pool exhausted (> 20):
# 1. Identify long-running queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# 2. Kill idle connections
psql $DATABASE_URL -c "
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '1 hour';"

# 3. Increase connection pool size in DATABASE_URL
# Format: postgresql://user:pass@host/db?max_pool_size=30
```

**Step 5: Check database disk space**
```bash
# In RDS console, check Free Storage Space metric
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name FreeStorageSpace \
  --dimensions Name=DBInstanceIdentifier,Value=imbobi-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average | jq '.Datapoints[-1].Average'

# If < 1GB, increase allocated storage
aws rds modify-db-instance \
  --db-instance-identifier imbobi-production \
  --allocated-storage 200 \
  --apply-immediately
# Note: This may cause brief downtime
```

### Resolution

**RDS Instance Down:**
```bash
# Check reason
aws rds describe-db-events --source-identifier imbobi-production \
  --source-type db-instance | jq '.Events[0:5]'

# If just rebooting, wait
echo "Waiting for RDS to come online..."
until psql $DATABASE_URL -c "SELECT 1;" 2>/dev/null; do
  echo "Still waiting..."
  sleep 10
done

# If failed, restore from backup
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier imbobi-production-restored \
  --db-snapshot-identifier imbobi-snapshot-latest

# Update DATABASE_URL to new endpoint
# Restart API service
systemctl restart imbobi-api
```

**Connection Timeout:**
```bash
# Check RDS parameter group for connection timeout
aws rds describe-db-instances \
  --db-instance-identifier imbobi-production \
  --query 'DBInstances[0].DBParameterGroups[0]'

# List parameters
aws rds describe-db-parameters \
  --db-parameter-group-name {PARAM_GROUP} \
  --filters Name=IsModifiable,Values=true | grep -i timeout

# Increase idle_in_transaction_session_timeout
aws rds modify-db-parameter-group \
  --db-parameter-group-name {PARAM_GROUP} \
  --parameters ParameterName=idle_in_transaction_session_timeout,ParameterValue=900,ApplyMethod=immediate
```

### Prevention

- Monitor database connections in CloudWatch
- Set up alert for connections > 15
- Implement connection pooling (pgBouncer if needed)
- Test database backup/restore monthly

---

## Redis Connection Issues

### Symptom
API running but `/api/v1/health` endpoint shows `redis: disconnected`.

### Root Causes
1. ElastiCache cluster down
2. Network/Security group blocking connection
3. Redis password changed or not set
4. Connection timeout
5. Redis memory full (eviction)

### Diagnostic Steps

**Step 1: Check ElastiCache cluster status**
```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].[CacheClusterStatus,CacheNodes[0].CacheNodeStatus]'

# Expected: available, available
# If status: creating, deleting, modifying -> wait
# If status: failed -> critical
```

**Step 2: Test Redis connectivity**
```bash
# From API server
redis-cli -h $REDIS_HOST -p $REDIS_PORT PING
# Expected: PONG

# With auth (if password set)
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD PING

# Check response time
time redis-cli -h $REDIS_HOST PING
# Expected: < 100ms
```

**Step 3: Check security group configuration**
```bash
# Get ElastiCache security group
REDIS_SG=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id imbobi-redis \
  --query 'CacheClusters[0].SecurityGroups[0].GroupId' --output text)

# Get API security group
API_SG=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=imbobi-api" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)

# Verify inbound rule
aws ec2 describe-security-groups --group-ids $REDIS_SG \
  | jq '.SecurityGroups[0].IpPermissions[] | select(.FromPort==6379)'

# If missing, add rule
aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG \
  --protocol tcp \
  --port 6379 \
  --source-security-group-id $API_SG
```

**Step 4: Check Redis memory usage**
```bash
# Get memory stats
redis-cli -h $REDIS_HOST -p $REDIS_PORT INFO memory

# Look for:
# used_memory_human: Should be < max_memory_human
# evicted_keys: Should be 0 (if > 0, cache is evicting)

# If memory full, check eviction policy
redis-cli -h $REDIS_HOST CONFIG GET maxmemory-policy
# Expected: allkeys-lru or volatile-lru (evict oldest)
```

**Step 5: Check connection pool**
```bash
# Get connected clients
redis-cli -h $REDIS_HOST CLIENT LIST | wc -l
# Expected: < 100

# Get slowest commands
redis-cli -h $REDIS_HOST SLOWLOG GET 10
# Look for: commands taking > 1000ms
```

### Resolution

**ElastiCache Cluster Down:**
```bash
# Reboot cluster (causes ~30-60 second downtime)
aws elasticache reboot-cache-cluster \
  --cache-cluster-id imbobi-redis

# Wait for cluster to come online
echo "Waiting for Redis to come online..."
until redis-cli -h $REDIS_HOST PING 2>/dev/null | grep -q PONG; do
  echo "Still waiting..."
  sleep 10
done

# Verify connection
redis-cli -h $REDIS_HOST PING
redis-cli -h $REDIS_HOST INFO server | grep redis_version

# Restart API service
systemctl restart imbobi-api
```

**Memory Full:**
```bash
# Check current memory
redis-cli -h $REDIS_HOST INFO memory | grep used_memory_human

# If > 90% of max:
# Option 1: Increase cache size (requires downtime)
aws elasticache modify-cache-cluster \
  --cache-cluster-id imbobi-redis \
  --cache-node-type cache.t3.medium \
  --apply-immediately

# Option 2: Clear old cache entries
redis-cli -h $REDIS_HOST FLUSHDB  # WARNING: Clears all cache!

# Option 3: Set eviction policy to evict oldest
redis-cli -h $REDIS_HOST CONFIG SET maxmemory-policy "allkeys-lru"
```

**Connection Timeout:**
```bash
# Check timeout settings
redis-cli -h $REDIS_HOST CONFIG GET timeout
# Expected: 0 (no timeout)

# If not 0, set to 0
redis-cli -h $REDIS_HOST CONFIG SET timeout 0

# Check TCP timeout on API side
# In app.module.ts, increase Redis connection timeout
```

### Prevention

- Monitor Redis memory in CloudWatch
- Set up alert for memory > 80%
- Implement cache TTL (currently 5 minutes default)
- Regular cache clearing for test data

---

## AWS Credential Errors

### Symptom
Error messages like "NoCredentialsError", "ExpiredTokenException", or "Access Denied" when accessing AWS services.

### Root Causes
1. IAM credentials expired or rotated
2. IAM permissions missing
3. Environment variables not set
4. EC2 instance IAM role not attached
5. AWS region mismatch

### Diagnostic Steps

**Step 1: Check AWS credentials configured**
```bash
# Check environment variables
echo "AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID:-(not set)}"
echo "AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY:-(not set)}"
echo "AWS_REGION: ${AWS_REGION:-(not set)}"

# Or for EC2 instance role
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
# Should return role name

# Get credentials from role
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/{ROLE_NAME}
# Should show: AccessKeyId, SecretAccessKey, Token (temporary)
```

**Step 2: Verify AWS CLI connection**
```bash
aws sts get-caller-identity 2>&1
# Should show: Account, UserId, Arn
# Error: Unable to locate credentials, Check mfa_serial
```

**Step 3: Check IAM permissions**
```bash
# Get current user/role
aws sts get-caller-identity --query 'Arn' --output text
# Expected: arn:aws:iam::ACCOUNT:user/NAME or arn:aws:iam::ACCOUNT:role/NAME

# List attached policies
aws iam list-attached-user-policies --user-name {USERNAME}
# or
aws iam list-attached-role-policies --role-name {ROLE_NAME}

# Check specific permission (secrets manager)
aws iam get-user-policy --user-name {USERNAME} --policy-name {POLICY_NAME}
```

**Step 4: Check credentials age**
```bash
# For IAM user keys
aws iam list-access-keys --user-name {USERNAME}
# Look for: CreateDate, check if > 90 days old

# For temporary credentials (EC2 role)
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/{ROLE_NAME} \
  | jq '.Expiration'
# Should show: future timestamp
```

### Resolution

**Credentials Expired (EC2 Role):**
```bash
# Instance role credentials auto-renew, just restart application
systemctl restart imbobi-api

# If not working, check IAM role attached
INSTANCE_ID=$(ec2-metadata --instance-id | cut -d' ' -f2)
aws ec2 describe-instances --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].IamInstanceProfile'

# If not attached, attach role
ROLE_NAME="imbobi-api-role"
INSTANCE_PROFILE=$(aws iam get-instance-profile \
  --instance-profile-name {PROFILE_NAME} --query 'InstanceProfile.Arn' --output text)

aws ec2 associate-iam-instance-profile \
  --instance-id $INSTANCE_ID \
  --iam-instance-profile Arn=$INSTANCE_PROFILE
```

**Credentials Expired (IAM User Keys):**
```bash
# Generate new access key
aws iam create-access-key --user-name {USERNAME}
# This returns: AccessKeyId, SecretAccessKey

# Update in Secrets Manager
aws secretsmanager update-secret --secret-id imobi/production \
  --secret-string "{...\"AWS_ACCESS_KEY_ID\":\"NEW_KEY\",...}"

# Deactivate old key (after verifying new works)
aws iam update-access-key --user-name {USERNAME} \
  --access-key-id {OLD_KEY} --status Inactive

# After 24 hours, delete old key
aws iam delete-access-key --user-name {USERNAME} --access-key-id {OLD_KEY}

# Restart API
systemctl restart imbobi-api
```

**Missing IAM Permissions:**
```bash
# Check policy attached to role/user
aws iam list-attached-user-policies --user-name {USERNAME}

# Get policy document
aws iam get-user-policy --user-name {USERNAME} --policy-name {POLICY_NAME}

# If missing permission, add it
# Example: If missing s3:GetObject for S3 bucket
aws iam put-user-policy --user-name {USERNAME} \
  --policy-name s3-access \
  --policy-document file://policy.json

# Then restart API
systemctl restart imbobi-api
```

**AWS Region Mismatch:**
```bash
# Check region configuration
aws configure get region
# Expected: us-east-1 (or your configured region)

# Set region if not set
export AWS_REGION=us-east-1

# Update in Secrets Manager
aws secretsmanager update-secret --secret-id imobi/production \
  --secret-string "{...\"AWS_REGION\":\"us-east-1\",...}"

# Or in systemd service file
# /etc/systemd/system/imbobi-api.service:
# Environment="AWS_REGION=us-east-1"

systemctl daemon-reload
systemctl restart imbobi-api
```

### Prevention

- Use EC2 instance roles (auto-rotating credentials)
- Set up AWS credentials rotation schedule
- Test AWS permissions before deployment
- Monitor CloudTrail for failed API calls

---

## High Error Rates

### Symptom
Sentry dashboard shows error rate > 1% (elevated) or > 5% (critical).

### Root Causes
1. Recent deployment introduced bug
2. Database connection lost
3. Redis connection lost
4. AWS service unavailable
5. Rate limiting too strict
6. Memory exhaustion
7. Unhandled exception in new code

### Diagnostic Steps

**Step 1: Check error spike timeline**
```bash
# In Sentry dashboard:
# 1. Go to Issues tab
# 2. Sort by Recent Changes (errors increased)
# 3. Click on top error to see frequency

# Or via CLI
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum
```

**Step 2: Identify error types**
```bash
# Get top errors from application logs
tail -1000 /var/log/imbobi-api/production.log | jq '.error_type' | sort | uniq -c | sort -rn

# From Sentry API
curl -s -H "Authorization: Bearer {SENTRY_TOKEN}" \
  "https://sentry.io/api/0/projects/{ORG}/{PROJECT}/events/" \
  | jq '.[] | {error_type: .title, count: .stats}'
```

**Step 3: Check if it's a recent deployment**
```bash
# Get deployment history
git log --oneline -20 origin/main

# If last deployment < 15 min ago:
# 1. Check what changed
git diff origin/main~1 origin/main --stat

# 2. Review affected modules
git diff origin/main~1 origin/main services/api/src/
```

**Step 4: Check system health**
```bash
# Database status
curl http://localhost:4000/api/v1/health/ready | jq '.services'
# Expected: { "database": "connected", "redis": "connected" }

# Memory usage
free -h
# Check if > 80% used

# Disk space
df -h /
# Check if < 1GB free

# CPU usage
top -b -n 1 | head -20
# Check if > 80% used
```

**Step 5: Check recent code changes**
```bash
# If error increased after deployment, check diff
# 1. Compare current version to previous
git log --oneline origin/main -5

# 2. Identify new dependencies
npm list --depth=0 | grep updated

# 3. Check for breaking changes in auth, database, cache modules
git diff origin/main~1:services/api/src/modules/auth \
           origin/main:services/api/src/modules/auth

git diff origin/main~1:services/api/src/modules/prisma \
           origin/main:services/api/src/modules/prisma
```

### Resolution

**Database Connection Error (Recent Spike):**
```bash
# Verify database connected
curl http://localhost:4000/api/v1/health | jq '.services.database'

# If disconnected, resolve using [Database Connection Issues](#database-connection-issues)

# After resolving, check error rate dropping
# In Sentry, should see < 0.1% within 5 minutes
```

**Recent Deployment Bug:**
```bash
# Rollback to previous version
cd /app

# Get previous commit
PREV_COMMIT=$(git rev-parse origin/main~1)

# Revert
git reset --hard $PREV_COMMIT
pnpm install --production
pnpm build

# Restart service
systemctl restart imbobi-api

# Verify
curl http://localhost:4000/api/v1/health/ready

# Monitor error rate in Sentry
# Should drop within 2-5 minutes
```

**Rate Limiting Too Strict:**
```bash
# Check rate limit config
grep -A 20 "ThrottlerModule.forRoot" services/api/src/app.module.ts

# If rate limit hits > 100 per minute:
# 1. Identify which endpoints affected
tail -100 /var/log/imbobi-api/production.log | grep "ThrottlerException"

# 2. Adjust limits in app.module.ts
# { ttl: 60000, limit: 150 },  // Increase from 100 to 150

# 3. Rebuild and restart
pnpm build && systemctl restart imbobi-api
```

**Memory Exhaustion:**
```bash
# Check memory
free -h
# If < 500MB free

# Identify memory hog
ps aux --sort=-%mem | head -5

# Restart service (clears memory)
systemctl restart imbobi-api

# Monitor memory over time
watch 'free -h'

# If memory keeps growing, there's a memory leak
# See [Memory Leaks](#memory-leaks) section
```

### Prevention

- Run full test suite before deployment
- Deploy to staging first, monitor for 30 minutes
- Set up error rate alerts in Sentry (> 1% for 5 min)
- Keep rollback plan ready before deploying
- Review git diff before deployment

---

## Performance Degradation

### Symptom
API response times increase dramatically. p95 latency > 1s (expected < 500ms).

### Root Causes
1. Database slow queries
2. N+1 queries (Prisma eager loading missing)
3. Redis cache misses
4. Memory pressure (garbage collection pauses)
5. High CPU usage
6. Network latency
7. Inefficient code (loops, sorting in memory)

### Diagnostic Steps

**Step 1: Check current performance metrics**
```bash
# Query API response times
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average,Maximum | jq '.Datapoints | sort_by(.Timestamp) | .[-5:]'

# Or check Sentry Performance tab
# Dashboard: https://sentry.io/organizations/{org}/performance/
```

**Step 2: Identify slow endpoints**
```bash
# Check application logs for slow requests
tail -500 /var/log/imbobi-api/production.log | jq 'select(.duration > 1000)' | head -10

# Or from Sentry:
# Performance > Transactions > Sort by p95 Duration > Find slowest endpoints
```

**Step 3: Check database query performance**
```bash
# Enable slow query log
aws rds modify-db-parameter-group \
  --db-parameter-group-name {PARAM_GROUP} \
  --parameters ParameterName=log_min_duration_statement,ParameterValue=100,ApplyMethod=immediate

# Query slow logs
tail -50 /var/log/postgres/postgresql.log | grep "duration:"

# Or from RDS Enhanced Monitoring
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=imbobi-production \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average
```

**Step 4: Check for N+1 queries**
```bash
# Enable Prisma logging
export DEBUG=prisma:*

# Run slow endpoint with debug logging
curl http://localhost:4000/api/v1/obras?limit=100

# Look for: Multiple queries for same data (sign of N+1)
# Example: 1 query for obras, then 100 queries for each obra's etapas

# Fix: Use select() or include() in Prisma query
// BAD (N+1):
const obras = await prisma.obra.findMany();
for (const obra of obras) {
  const etapas = await prisma.etapa.findMany({ where: { obra_id: obra.id } });
}

// GOOD:
const obras = await prisma.obra.findMany({
  include: { etapas: true }  // Single query with JOIN
});
```

**Step 5: Check cache hit rate**
```bash
# Get Redis stats
redis-cli -h $REDIS_HOST INFO stats

# Look for:
# keyspace_hits / keyspace_misses
# Hit rate should be > 80%

# Calculate: hits / (hits + misses)
redis-cli -h $REDIS_HOST INFO stats | grep -E "hits|misses"

# If hit rate < 50%, cache TTL too short or not being used
```

**Step 6: Check resource utilization**
```bash
# CPU usage
top -b -n 1 | head -15
# Expected: < 50% per core

# Memory
free -h
# Expected: > 1GB available

# Disk I/O
iostat -x 1 5
# Look for: %iowait (should be < 10%)

# Network
netstat -s | grep -E "dropped|lost"
# Should be 0
```

### Resolution

**N+1 Queries:**
```bash
# Find where issue occurs
# In services/api/src/modules/{module}/{service}.ts

// Before (N+1):
const works = await this.prisma.obra.findMany({ skip, take });
const worksWithEtapas = await Promise.all(
  works.map(w => this.prisma.etapa.findMany({ where: { obra_id: w.id } }))
);

// After (1 query):
const works = await this.prisma.obra.findMany({
  skip, take,
  include: { etapas: true }  // or select for specific fields
});
```

**Slow Database Query:**
```bash
# Add index to frequently filtered columns
# In migration file:
CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_etapa_obra_id ON etapa(obra_id);
CREATE INDEX idx_evidencia_criacao ON evidencia(created_at DESC);

# Run migration
pnpm db:migrate

# Restart API
systemctl restart imbobi-api
```

**Cache Configuration:**
```bash
# Increase cache TTL in app.module.ts
CacheModule.register({
  ttl: 600,  // Increase from 300 (5 min) to 600 (10 min)
})

# Or use selective caching in decorators
@Cacheable()
@Get('/obras')
getObras() { ... }
```

**Memory Pressure:**
```bash
# If free memory < 20% of total
# Restart service (garbage collection)
systemctl restart imbobi-api

# Monitor memory after restart
watch 'free -h'

# If memory still growing, check for memory leaks
# See [Memory Leaks](#memory-leaks)
```

**Database Connection Pool:**
```bash
# Increase pool size for more concurrent queries
# Update DATABASE_URL:
DATABASE_URL="postgresql://...?max_pool_size=50"

# Restart API
systemctl restart imbobi-api

# Verify
psql $DATABASE_URL -c "SHOW max_connections;"
```

### Prevention

- Add performance benchmarks to CI/CD
- Monitor p95 latency with alerting (> 1s)
- Code review for N+1 queries before merge
- Test with realistic data volumes
- Regular database maintenance (VACUUM, ANALYZE)

---

## Memory Leaks

### Symptom
API memory usage grows over time and never decreases. Eventually crashes with out-of-memory error.

### Root Causes
1. Event listeners not cleaned up
2. Promises not resolved
3. Circular references in cache
4. Unbounded queue growth (BullMQ)
5. Global state accumulation

### Diagnostic Steps

**Step 1: Monitor memory trend**
```bash
# Check current memory
free -h

# Monitor over 30 minutes
watch -n 60 'free -h && date'
# If memory increases continuously, likely leak

# Or use CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name MemoryUtilization \
  --dimensions Name=InstanceId,Value={INSTANCE_ID} \
  --start-time $(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average | jq '.Datapoints | sort_by(.Timestamp)'
```

**Step 2: Enable heap profiling**
```bash
# Install profiler
cd /app && npm install --save-dev @clinic/clinic

# Run with profiling
clinic doctor -- npm start

# Generates flame graph showing memory usage
# Check: ./clinic.html
```

**Step 3: Identify source of leak**
```bash
# Check for unclosed event listeners
# In services/api/src/, search for:
# - addEventListener without removeEventListener
# - .on() without corresponding .off()
# - .subscribe() without unsubscribe()

grep -r "addEventListener\|\.on(" services/api/src/ | grep -v "\.off()"
grep -r "subscribe(" services/api/src/ | grep -v "unsubscribe()"

# Check cache growth
redis-cli -h $REDIS_HOST DBSIZE
# If keys keep growing, TTL not working

# Check BullMQ queue size
redis-cli -h $REDIS_HOST LLEN "bull:liberacao-parcela:wait"
# If > 10000 and growing, queue bottleneck
```

**Step 4: Check for circular references**
```bash
# In services/api/src/, look for:
class User {
  id: string;
  obra: Obra;  // Circular if Obra also references User
}

class Obra {
  id: string;
  owner: User;  // Circular reference!
}

// Fix: Use IDs instead
class Obra {
  id: string;
  owner_id: string;  // No circular reference
}
```

### Resolution

**Fix Event Listeners:**
```typescript
// BAD (leak):
constructor(private emitter: EventEmitter) {
  this.emitter.on('evento', this.handler);
}

// GOOD:
constructor(private emitter: EventEmitter) {
  this.emitter.on('evento', this.handler);
}

onModuleDestroy() {
  this.emitter.off('evento', this.handler);
}
```

**Fix Promises:**
```typescript
// BAD (leak):
async createObra(data) {
  const result = await prisma.obra.create({ data });
  // Missing return or await
  this.someAsyncOperation();  // Not awaited, promise hangs
  return result;
}

// GOOD:
async createObra(data) {
  const result = await prisma.obra.create({ data });
  await this.someAsyncOperation();  // Awaited
  return result;
}
```

**Fix Cache Accumulation:**
```typescript
// BAD (leak):
CacheModule.register({
  ttl: undefined,  // Never expires!
})

// GOOD:
CacheModule.register({
  ttl: 300,  // Expires after 5 minutes
})
```

**Fix BullMQ Queue:**
```bash
# Check queue backlog
redis-cli -h $REDIS_HOST LLEN "bull:liberacao-parcela:wait"

# If > 10000, likely bottleneck
# 1. Increase worker concurrency
# services/workers/liberacao-parcela.worker.ts:
@Process({ concurrency: 5 })  // Increase from 1

# 2. Restart service
systemctl restart imbobi-api

# 3. Monitor queue clearing
watch 'redis-cli -h $REDIS_HOST LLEN "bull:liberacao-parcela:wait"'
```

**After Fix:**
```bash
# Rebuild and deploy
pnpm build
systemctl restart imbobi-api

# Monitor memory trend
free -h && sleep 60 && free -h && sleep 60 && free -h
# Should stay constant, not grow

# Monitor in CloudWatch for 1 hour
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name MemoryUtilization \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average
```

### Prevention

- Enable memory profiling in staging environment
- Add memory usage alerts (> 85% utilization)
- Code review for common leak patterns
- Regular performance testing with realistic load

---

## Authentication Failures

### Symptom
Login errors, "Invalid token", or "Unauthorized" responses even with valid credentials.

### Root Causes
1. JWT_SECRET changed
2. Token expired
3. Database user record deleted
4. JWT signature validation failing
5. Bearer token format incorrect

### Diagnostic Steps

**Step 1: Test endpoint directly**
```bash
# Try login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPass123!"}'

# Should return: { access_token, refresh_token }
# If error: Check user exists, password correct
```

**Step 2: Check JWT token validity**
```bash
# Get token from login
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"TestPass123!"}' | jq -r '.access_token')

# Decode token (without verifying signature)
echo $TOKEN | cut -d'.' -f1 | base64 -d | jq  # Header
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq  # Payload
# Check: exp (expiration), sub (user ID)

# Try using token
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/api/v1/usuarios/me
# If success: Token valid
# If 401: Signature validation failed
```

**Step 3: Verify JWT secret**
```bash
# Check JWT_SECRET exists
echo $JWT_SECRET | wc -c
# Expected: >= 65

# Check it matches in Secrets Manager
aws secretsmanager get-secret-value --secret-id imobi/production \
  | jq '.SecretString | fromjson | .JWT_SECRET' | wc -c

# Compare
CURRENT_SECRET=$JWT_SECRET
SECRETS_MGR_SECRET=$(aws secretsmanager get-secret-value --secret-id imobi/production \
  | jq -r '.SecretString | fromjson | .JWT_SECRET')

if [ "$CURRENT_SECRET" != "$SECRETS_MGR_SECRET" ]; then
  echo "SECRET MISMATCH! Need to restart service"
  systemctl restart imbobi-api
fi
```

**Step 4: Check user record**
```bash
# Verify user exists in database
psql $DATABASE_URL -c "
  SELECT usuario_id, email, tipo, deleted_at 
  FROM usuario 
  WHERE email = 'test@test.com';"

# Expected: 1 row, deleted_at = NULL

# If missing, create test user
psql $DATABASE_URL -c "
  INSERT INTO usuario (email, password_hash, tipo) 
  VALUES ('test@test.com', '\$2b\$12\$...', 'PF');"
```

**Step 5: Check auth service logs**
```bash
# Look for auth errors
tail -100 /var/log/imbobi-api/production.log | grep -i "auth\|jwt\|unauthorized"

# From Sentry
# Issues > Filter: module:auth
# Look for: JwtError, UnauthorizedException
```

### Resolution

**JWT Secret Changed:**
```bash
# If using new JWT secret and old tokens still valid (shouldn't be):
# 1. Option A: Keep both secrets for 24 hours (rolling rotation)
# Store old secret in LEGACY_JWT_SECRET
# In jwt.strategy.ts:
const secrets = [process.env.JWT_SECRET, process.env.LEGACY_JWT_SECRET];
// Try verifying with both

# 2. Option B: Force re-login (invalidate all tokens)
# Increment RELEASE_VERSION in Secrets Manager
# This causes all clients to get 401 and re-login
aws secretsmanager update-secret --secret-id imobi/production \
  --secret-string "{...\"RELEASE_VERSION\":\"1.1.0\",...}"

# Restart API
systemctl restart imbobi-api
```

**Token Expired:**
```bash
# Check token expiration
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.exp'
# Convert to date
date -d @{EXP_TIMESTAMP}

# If expired, use refresh token
curl -X POST http://localhost:4000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}"

# Should return new access_token
```

**User Record Deleted:**
```bash
# Restore from backup or recreate user
psql $DATABASE_URL -c "
  INSERT INTO usuario (usuario_id, email, password_hash, tipo, created_at) 
  VALUES ('uuid', 'test@test.com', 'hash', 'PF', now());"

# Or restore from backup
# See [Database Connection Issues](#database-connection-issues)
```

### Prevention

- Add auth integration tests to CI/CD
- Monitor failed auth attempts in Sentry
- Alert on JWT errors (> 10 in 1 minute)
- Test token refresh flow before deployment

---

## File Upload Issues

### Symptom
Evidence upload fails with error messages like "Access Denied", "Request Timeout", or file not appearing in S3.

### Root Causes
1. S3 bucket permissions incorrect
2. IAM role missing S3 access
3. File size exceeds limit
4. Image format not supported
5. S3 bucket policy denies unencrypted uploads
6. Network timeout

### Diagnostic Steps

**Step 1: Check S3 permissions**
```bash
# List objects in S3 bucket
aws s3 ls s3://imbobi-evidencias/

# If error "Access Denied":
aws s3api get-object-acl --bucket imbobi-evidencias --key {FILENAME} 2>&1
# Check: Owner has full permissions

# Verify bucket policy
aws s3api get-bucket-policy --bucket imbobi-evidencias | jq '.Statement'
# Should allow: s3:GetObject, s3:PutObject
```

**Step 2: Check IAM role permissions**
```bash
# Get API instance role
ROLE_NAME=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=imbobi-api" \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' \
  --output text | cut -d'/' -f2)

# Check S3 permissions
aws iam list-attached-role-policies --role-name $ROLE_NAME | grep -i s3

# Get policy document
aws iam get-role-policy --role-name $ROLE_NAME --policy-name s3-policy

# Should include: s3:GetObject, s3:PutObject on imbobi-evidencias bucket
```

**Step 3: Check file constraints**
```bash
# Verify upload code
grep -r "maxFileSize\|UPLOAD_SIZE" services/api/src/ | head -5

# Expected in evidencias module:
# - Max size: 10MB (10485760 bytes)
# - Allowed types: image/jpeg, image/png
# - MIME type validation before upload
```

**Step 4: Test upload directly**
```bash
# Create test image
convert -size 100x100 xc:blue test.jpg

# Upload to S3 with presigned URL
# Get presigned URL from API
PRESIGNED_URL=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/v1/evidencias/upload-url | jq -r '.upload_url')

# Upload using presigned URL
curl -X PUT -F "file=@test.jpg" "$PRESIGNED_URL" -v

# Check if in S3
aws s3 ls s3://imbobi-evidencias/test.jpg
```

**Step 5: Check network connectivity to S3**
```bash
# Verify S3 endpoint reachable
curl -I https://imbobi-evidencias.s3.amazonaws.com
# Expected: HTTP 403 (Access Denied is OK, means S3 reachable)

# Check latency
time curl -s https://imbobi-evidencias.s3.amazonaws.com | head -1
# Expected: < 500ms

# Check DNS resolution
nslookup imbobi-evidencias.s3.amazonaws.com
# Should resolve to S3 IP
```

### Resolution

**S3 Bucket Policy Incorrect:**
```bash
# Check current policy
aws s3api get-bucket-policy --bucket imbobi-evidencias | jq '.'

# Fix policy to allow uploads
aws s3api put-bucket-policy --bucket imbobi-evidencias --policy file://policy.json

# policy.json:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:role/imbobi-api-role"
      },
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::imbobi-evidencias/*"
    }
  ]
}
```

**IAM Role Missing S3 Access:**
```bash
# Add S3 policy to role
aws iam put-role-policy --role-name imbobi-api-role \
  --policy-name s3-access \
  --policy-document file://s3-policy.json

# s3-policy.json:
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": "arn:aws:s3:::imbobi-evidencias/*"
    }
  ]
}

# Restart API
systemctl restart imbobi-api
```

**File Size Exceeds Limit:**
```bash
# Check upload code for limit
grep -A 5 "maxFileSize" services/api/src/modules/evidencias/

# If limit too small (< 10MB):
// In multer config:
upload: multer({ limits: { fileSize: 10485760 } }),  // 10MB

# Rebuild and restart
pnpm build && systemctl restart imbobi-api
```

**Image Format Not Supported:**
```bash
# Check upload validation
grep -B 5 "image/jpeg\|image/png" services/api/src/modules/evidencias/

// Expected:
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];
if (!ALLOWED_TYPES.includes(file.mimetype)) {
  throw new BadRequestException('Only JPEG and PNG allowed');
}

# If different formats needed, update list and rebuild
```

### Prevention

- Test file uploads in local development
- Add upload size limits to API documentation
- Alert on S3 access errors in Sentry
- Regular backup validation

---

## Escalation Checklist

If you cannot resolve an issue within 30 minutes:

### Level 1 → Level 2 Escalation

```
[ ] Issue reproduced and documented
[ ] All diagnostic steps completed
[ ] System health checked (CPU, memory, disk)
[ ] Recent changes identified (git log, deployments)
[ ] Relevant logs captured (last 100 lines, errors)
[ ] Screenshots of Sentry/CloudWatch dashboards
[ ] Time spent troubleshooting documented
```

### Notify

```bash
# Post to Slack #incidents
@channel ESCALATION REQUIRED
Issue: [brief description]
Diagnosis: [what we've found]
Time spent: [X minutes]
Next steps: [escalation contact]

# Contact Level 2 (On-call Backend Engineer)
On-call contact: [NAME] [PHONE]
```

### Information to Provide

1. **Timeline**: When did it start? (exact time)
2. **Symptoms**: What users are seeing
3. **Scope**: % of traffic affected
4. **Recent Changes**: Deployments, config changes
5. **Diagnostics**: All steps taken, results
6. **Logs**: Last 200 lines of errors
7. **Metrics**: CPU, memory, error rate graphs

---

**Last Updated:** 2026-06-02  
**Next Review:** 2026-09-02

For urgent issues, contact: on-call@imbobi.com.br
