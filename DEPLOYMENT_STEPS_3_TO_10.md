# Steps 3-10: Production Deployment Execution Guide

**Timeline:** May 31 - June 12, 2026 (8-10 days total)  
**Status:** Documented for execution after Step 2 completion  

---

## STEP 3: Security & Compliance Hardening

**Expected Duration:** 6-8 hours (May 31, 08:00-16:00)  
**Parallel with:** Step 4 (Initial Deployment)

### 3.1 AWS Shield & DDoS Protection

```bash
# AWS Shield Standard is automatically enabled (no cost)
aws shield list-protections --region us-east-1

# Optional: Enable AWS Shield Advanced ($3k/month)
# aws shield subscribe --subscription

# Verify DDoS protection active
aws wafv2 list-web-acls --scope REGIONAL --region us-east-1
```

### 3.2 RDS Security Hardening

```bash
# Verify encryption at rest
aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod-db \
  --query 'DBInstances[0].[StorageEncrypted,KmsKeyId]'

# Verify backup retention
aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod-db \
  --query 'DBInstances[0].BackupRetentionPeriod'
# Expected: 30

# Enable automated backup
aws rds modify-db-instance \
  --db-instance-identifier imbobi-prod-db \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately
```

### 3.3 S3 Security Configuration

```bash
# Verify encryption
aws s3api get-bucket-encryption \
  --bucket imbobi-prod-media-us-east-1

# Verify versioning
aws s3api get-bucket-versioning \
  --bucket imbobi-prod-media-us-east-1

# Verify public access block
aws s3api get-public-access-block \
  --bucket imbobi-prod-media-us-east-1
```

### 3.4 CloudTrail & Audit Logging

```bash
# Create CloudTrail for audit trail
aws cloudtrail create-trail \
  --name imbobi-prod-trail \
  --s3-bucket-name imbobi-cloudtrail-logs \
  --region us-east-1 \
  --enable-log-file-validation \
  --is-multi-region-trail

# Start logging
aws cloudtrail start-logging \
  --trail-name imbobi-prod-trail

# Verify CloudTrail is logging
aws cloudtrail get-trail-status \
  --name imbobi-prod-trail
```

### 3.5 VPC Flow Logs

```bash
# Create CloudWatch Log Group
aws logs create-log-group \
  --log-group-name /aws/vpc/flow-logs/imbobi-prod

# Create IAM role for VPC Flow Logs
aws iam create-role \
  --role-name vpc-flow-logs-role \
  --assume-role-policy-document file:///tmp/vpc-flow-logs-trust.json

# Create VPC Flow Log
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids $VPC_ID \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flow-logs/imbobi-prod \
  --deliver-logs-permission-iam-role-arn arn:aws:iam::ACCOUNT_ID:role/vpc-flow-logs-role

# Verify VPC Flow Logs
aws ec2 describe-flow-logs \
  --filter Name=resource-id,Values=$VPC_ID
```

### 3.6 AWS Config for Compliance

```bash
# Enable AWS Config
aws configservice put-config-recorder \
  --config-recorder name=imbobi-recorder,roleARN=arn:aws:iam::ACCOUNT_ID:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig

# Start recorder
aws configservice start-config-recorder \
  --config-recorder-names imbobi-recorder

# Create delivery channel
aws configservice put-delivery-channel \
  --delivery-channel name=imbobi-delivery,s3BucketName=imbobi-config-logs

# Subscribe to Config notifications
aws sns create-topic --name imbobi-config-alerts
```

### 3.7 Secrets Manager Password Rotation

```bash
# Enable automatic password rotation for RDS
aws secretsmanager rotate-secret \
  --secret-id imbobi/db/prod \
  --rotation-rules AutomaticallyAfterDays=30

# Create Lambda function for rotation (optional)
# This handles automatic password changes every 30 days
```

### 3.8 LGPD & Data Residency Compliance

```bash
# Verify data residency (all data in us-east-1)
aws ec2 describe-regions --region-names us-east-1

# Document data retention policy (30 days for logs, 1 year for backups)
# Update LGPD_COMPLIANCE.md with verification details

# Configure S3 lifecycle policy for data deletion
aws s3api put-bucket-lifecycle-configuration \
  --bucket imbobi-prod-media-us-east-1 \
  --lifecycle-configuration file:///tmp/lifecycle-policy.json
```

### 3.9 SSL/TLS Certificate Management

```bash
# List ACM certificates
aws acm list-certificates --region us-east-1

# Enable auto-renewal (enabled by default in ACM)
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID
```

### 3.10 Verification

```bash
# Create security verification checklist
cat > SECURITY_HARDENING_VERIFICATION.md << 'VERIFYEOF'
# Security Hardening Verification Checklist

- [ ] AWS Shield Standard active
- [ ] RDS encryption at rest enabled
- [ ] RDS encryption in transit enabled
- [ ] S3 encryption enabled
- [ ] S3 public access blocked
- [ ] RDS backup retention: 30 days
- [ ] CloudTrail logging enabled
- [ ] VPC Flow Logs enabled
- [ ] AWS Config enabled
- [ ] Secrets Manager password rotation enabled
- [ ] LGPD compliance verified
- [ ] SSL/TLS certificates valid
- [ ] All resources tagged for cost tracking

VERIFYEOF
```

---

## STEP 4: Initial Production Deployment

**Expected Duration:** 4-6 hours (May 31, 16:00-22:00)  
**Parallel with:** Step 3

### 4.1 Build Docker Images

```bash
# Ensure Docker is installed and running
docker --version

# Set up AWS ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build API image
cd services/api
docker build -f Dockerfile -t imbobi/api:1.0.0 .
docker tag imbobi/api:1.0.0 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/api:1.0.0
docker tag imbobi/api:1.0.0 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/api:latest

# Build Web image
cd apps/web
docker build -f Dockerfile -t imbobi/web:1.0.0 .
docker tag imbobi/web:1.0.0 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/web:1.0.0
docker tag imbobi/web:1.0.0 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/web:latest

# Build Worker image
cd services/workers
docker build -f Dockerfile -t imbobi/worker:1.0.0 .
docker tag imbobi/worker:1.0.0 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/worker:1.0.0
docker tag imbobi/worker:1.0.0 ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/worker:latest
```

### 4.2 Push Images to ECR

```bash
# Push API image
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/api:1.0.0
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/api:latest

# Push Web image
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/web:1.0.0
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/web:latest

# Push Worker image
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/worker:1.0.0
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/worker:latest

# Verify images in ECR
aws ecr describe-images \
  --repository-name imbobi/api \
  --region us-east-1
```

### 4.3 Database Initialization

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

# Create .env.production
cat > .env.production << 'ENVEOF'
NODE_ENV=production
DATABASE_URL=postgresql://imbobi_admin:PASSWORD@${RDS_ENDPOINT}:5432/imbobi?schema=public
REDIS_URL=redis://:AUTH_TOKEN@REDIS_ENDPOINT:6379
JWT_SECRET=JWT_SECRET_64_CHARS
ENCRYPTION_KEY=BASE64_ENCRYPTED_KEY
AWS_S3_BUCKET=imbobi-prod-media-us-east-1
AWS_REGION=us-east-1
API_PORT=4000
WEB_PORT=3000
ENVEOF

# Run Prisma migrations
pnpm db:migrate -- --name="prod-initial-migration"

# Verify database
PGPASSWORD=PASSWORD psql -h $RDS_ENDPOINT -U imbobi_admin -d imbobi -c "SELECT version();"
```

### 4.4 Create ECS Task Definitions

```bash
# API Task Definition
cat > api-task-definition.json << 'APIEOF'
{
  "family": "imbobi-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "4096",
  "memory": "8192",
  "containerDefinitions": [
    {
      "name": "imbobi-api",
      "image": "ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imbobi/api:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 4000,
          "hostPort": 4000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "API_PORT", "value": "4000"}
      ],
      "secrets": [
        {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:imbobi/db/prod"},
        {"name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:imbobi/redis/prod"},
        {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:imbobi/jwt/secret"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/imbobi/prod/api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "imbobi-api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:4000/api/v1/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/imbobi-ecs-task-execution-role",
  "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/imbobi-ecs-task-role"
}
APIEOF

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://api-task-definition.json \
  --region us-east-1
```

### 4.5 Deploy Services to ECS

```bash
# Create service for API
aws ecs create-service \
  --cluster imbobi-prod \
  --service-name imbobi-api-service \
  --task-definition imbobi-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[${PRIVATE_SUBNET_1A},${PRIVATE_SUBNET_1B}],securityGroups=[${ECS_SG_ID}],assignPublicIp=DISABLED}" \
  --load-balancers targetGroupArn=${API_TG_ARN},containerName=imbobi-api,containerPort=4000 \
  --enable-ecs-managed-tags

# Monitor service deployment
aws ecs describe-services \
  --cluster imbobi-prod \
  --services imbobi-api-service \
  --region us-east-1

# Wait for services to reach RUNNING status
# Expected: "desiredCount": 2, "runningCount": 2
```

### 4.6 Verification

```bash
# List running tasks
aws ecs list-tasks \
  --cluster imbobi-prod \
  --launch-type FARGATE \
  --region us-east-1

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn ${API_TG_ARN}
# Expected: HealthState: healthy
```

---

## STEP 5: Comprehensive Production Validation

**Expected Duration:** 8-12 hours (June 1, 08:00-20:00)

### 5.1 API Health Checks

```bash
# Test API health endpoint
curl -X GET https://api.imbobi.com.br/api/v1/health

# Expected response:
# {"status":"ok","timestamp":"2026-06-01T08:00:00Z","environment":"production"}
```

### 5.2 Database Validation

```bash
# Check database connectivity
psql -h $RDS_ENDPOINT -U imbobi_admin -d imbobi -c "SELECT NOW(), version();"

# Verify migrations applied
psql -h $RDS_ENDPOINT -U imbobi_admin -d imbobi -c "SELECT * FROM \"_prisma_migrations\";"

# Check data integrity
psql -h $RDS_ENDPOINT -U imbobi_admin -d imbobi -c "\dt"
```

### 5.3 Redis Cache Validation

```bash
# Test Redis connectivity
redis-cli -h REDIS_ENDPOINT -p 6379 -a AUTH_TOKEN ping
# Expected: PONG

# Check memory usage
redis-cli -h REDIS_ENDPOINT -p 6379 -a AUTH_TOKEN info memory
```

### 5.4 S3 & CloudFront Validation

```bash
# Upload test file to S3
aws s3 cp test-image.jpg s3://imbobi-prod-media-us-east-1/test/

# Verify CloudFront can access
curl -I https://cdn.imbobi.com.br/test/test-image.jpg

# Check cache hit
# Expected: X-Cache: Hit from cloudfront
```

### 5.5 Complete User Journey Test

```bash
# Signup → KYC → Credit Simulator flow
# 1. POST /api/v1/auth/register
#    Create test user account
# 2. POST /api/v1/kyc/submit
#    Submit KYC documents
# 3. GET /api/v1/credit/simulate
#    Calculate credit offer
# 4. POST /api/v1/credit/apply
#    Submit credit application

# Document results in VALIDATION_TEST_RESULTS.md
```

### 5.6 Logging & Monitoring

```bash
# Verify CloudWatch logs
aws logs tail /imbobi/prod/api --follow

# Check error rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --dimensions Name=LoadBalancer,Value=app/imbobi-prod-alb/* \
  --start-time 2026-06-01T08:00:00Z \
  --end-time 2026-06-01T12:00:00Z \
  --period 300 \
  --statistics Sum
```

---

## STEP 6: Load Testing & Performance Validation

**Expected Duration:** 6-8 hours (June 1-2, 20:00-04:00)

### 6.1 Load Test Setup

```bash
# Install Apache JMeter
# Create JMeter test plan with 6 scenarios:
# - Light: 50 concurrent users, 5 min
# - Medium: 200 concurrent users, 10 min
# - Heavy: 500 concurrent users, 15 min
# - Spike: 1000 concurrent users, 2 min
# - Soak: 100 concurrent users, 1 hour
# - Ramp-up: 0-500 users over 30 min

# Monitor metrics during testing:
# - API response time (P50, P95, P99)
# - Database CPU/memory
# - Redis hit rate
# - Auto-scaling policy triggers
```

### 6.2 Performance Baseline

```bash
# After load tests, document metrics:
# - API response time: < 500ms (P95)
# - Database CPU: < 70% under load
# - Redis hit rate: > 90%
# - Error rate: < 1%

# Create LOAD_TEST_REPORT.md with results
```

---

## STEP 7: Monitoring, Alerting & Observability Setup

**Expected Duration:** 4-6 hours (June 2, 04:00-10:00)

### 7.1 CloudWatch Dashboards

```bash
# Create comprehensive dashboards showing:
# - API error rate, latency, request count
# - Web page load times, error rate
# - Worker job success/failure rate
# - Database CPU, connections, query latency
# - Redis memory, hit rate, connected clients
# - ALB target health, request count
```

### 7.2 CloudWatch Alarms

```bash
# Create alarms for critical metrics:
# - API error rate > 1%
# - API latency > 500ms (P95)
# - Database CPU > 70%
# - Database memory > 80%
# - Redis memory > 80%
# - ALB target unhealthy

# Configure SNS notifications to Slack/PagerDuty
```

### 7.3 X-Ray Tracing

```bash
# Enable X-Ray on NestJS API
# Document trace sampling rate: 10% of requests

# Create X-Ray service map showing:
# - API → Database
# - API → Redis
# - API → S3
# - API → External APIs (Unico, SERPRO)
```

### 7.4 On-Call Setup

```bash
# Create on-call runbook
# Document:
# - Incident response procedures
# - Escalation path
# - Database failover procedure
# - Service restart procedure
# - Rollback procedure

# Establish on-call rotation
```

---

## STEP 8: Marketing & Launch Planning

**Expected Duration:** Variable (parallel with Steps 5-7)

### 8.1 Launch Materials

```bash
# Create and distribute:
# - Product changelog (major features, security fixes)
# - Feature highlights document
# - API documentation (OpenAPI/Swagger)
# - Support team training guide
# - Common troubleshooting guide
# - FAQ document
# - Customer success materials
```

### 8.2 Support Team Training

```bash
# Train support team on:
# - How to reset user passwords
# - How to check payment status
# - How to escalate database issues
# - How to handle account lockouts
# - How to check API status
```

---

## STEP 9: Go-Live Execution

**Expected Duration:** 4-8 hours (June 5, 18:00 - June 6, 02:00)

### 9.1 Pre-Launch (2h before)

```bash
# 1. War room opens
# 2. Final system health check
#    - All ECS services healthy
#    - Database responsive
#    - Redis available
#    - CloudFront working
# 3. Monitoring dashboards refreshed
# 4. Rollback plan reviewed
# 5. Incident response team briefed
```

### 9.2 Launch Execution

```bash
# Traffic shift strategy:
# Option A: Gradual (recommended)
#   - 0-18:00: 10% production traffic
#   - 18:30-19:00: 50% production traffic
#   - 19:00+: 100% production traffic
#
# Option B: Full cutover
#   - Switch all traffic to production at scheduled time

# Continuous monitoring during cutover:
# - Watch error rate (target: < 0.1%)
# - Watch latency (target: < 500ms P95)
# - Monitor database load
# - Check CloudWatch alarms
```

### 9.3 Post-Launch

```bash
# 1. Customer notification sent
# 2. Monitor for 2 hours continuously
# 3. Check for customer reports (support channel)
# 4. Verify all critical flows working
# 5. Get stakeholder sign-off
# 6. Document any incidents
# 7. Update status page
```

---

## STEP 10: Post-Launch Optimization

**Expected Duration:** 5-7 days (June 6-12)

### 10.1 24-Hour Monitoring

```bash
# Continue intensive monitoring for 24 hours:
# - Check error logs every 30 minutes
# - Monitor database performance
# - Watch for customer issues
# - Verify auto-scaling triggers correctly
# - Check cost metrics
```

### 10.2 Bug Fixes & Hotfixes

```bash
# If issues found:
# 1. Reproduce in staging
# 2. Fix and test
# 3. Build new Docker image
# 4. Push to ECR
# 5. Deploy to ECS (rolling update)
# 6. Verify fix in production
```

### 10.3 Capacity Planning

```bash
# Analyze actual usage:
# - Concurrent user count
# - API requests per second
# - Database connections needed
# - Cache hit rate
# - S3 storage usage

# Right-size instances if needed:
# - May scale down if load less than expected
# - May need larger instances if under-provisioned
```

### 10.4 Cost Optimization

```bash
# Analyze AWS spending:
# - EC2/Fargate costs
# - RDS database costs
# - ElastiCache costs
# - S3 and CloudFront costs
# - Data transfer costs

# Optimize if needed:
# - Use Reserved Instances for steady workload
# - Use Savings Plans for compute
# - Optimize CloudFront cache TTLs
# - Review CloudTrail/CloudWatch log retention
```

### 10.5 Documentation & Retrospective

```bash
# Update documentation:
# - Deployment guide (actual vs. planned)
# - Troubleshooting guide (real issues faced)
# - Runbook (actual procedures)

# Schedule retrospective meeting:
# - What went well
# - What could be improved
# - Action items for next release
```

---

## ROLLBACK PROCEDURE

If production deployment fails, follow this procedure:

### Rollback Steps

```bash
# 1. Alert stakeholders (incident declared)

# 2. Stop traffic to new environment
#    (via ALB target group deregistration)

# 3. Revert to previous ECS task definition
aws ecs update-service \
  --cluster imbobi-prod \
  --service imbobi-api-service \
  --task-definition imbobi-api:PREVIOUS_REVISION \
  --force-new-deployment

# 4. Wait for previous version to be running
#    (monitor ECS service deployment)

# 5. Verify services healthy
#    (check ALB target health, API responses)

# 6. Notify stakeholders (rollback complete)

# 7. Document incident and root cause

# 8. Fix issue and re-test in staging

# 9. Plan for next deployment attempt
```

### Rollback Success Criteria

```bash
# Rollback is successful when:
# - Previous version running (100% of tasks)
# - ALB targets all healthy
# - API health check passing
# - Error rate < 0.1%
# - Database responding normally
# - No customer-facing issues
```

---

## DEPLOYMENT TIMELINE SUMMARY

```
May 30 (Thu)
├─ Step 1: Final Stakeholder Approval ✅ (13:00-14:30)
├─ Step 2: Infrastructure Preparation 🔄 (14:30-21:00)

May 31 (Fri)
├─ Step 3: Security Hardening 🔄 (08:00-16:00)
├─ Step 4: Initial Deployment 🔄 (16:00-22:00)

Jun 1 (Sat)
├─ Step 5: Production Validation 🔄 (08:00-20:00)
├─ Step 6: Load Testing 🔄 (20:00 - Jun 2 04:00)

Jun 2 (Sun)
├─ Step 7: Monitoring Setup 🔄 (04:00-10:00)

Jun 3-4 (Mon-Tue)
├─ Step 8: Marketing & Launch Planning 🔄 (parallel)

Jun 5 (Wed)
├─ Step 9: Go-Live Execution 🔄 (18:00 - Jun 6 02:00)

Jun 6-12 (Thu-Wed)
└─ Step 10: Post-Launch Optimization 🔄 (continuous)
```

---

## CRITICAL CONTACTS & ESCALATION

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Infrastructure Lead | Vini | TBD | @vini |
| API Lead | TBD | TBD | TBD |
| Database Admin | TBD | TBD | TBD |
| Security Lead | TBD | TBD | TBD |
| CTO/Tech Lead | TBD | TBD | TBD |

---

## DEPLOYMENT SUCCESS CRITERIA

✅ **Step 9 Complete When:**
- All services running and healthy
- ALB targets all passing health checks
- Error rate < 1% for 1 hour continuous
- API latency P95 < 500ms
- No critical customer issues reported
- All stakeholders sign-off on go-live

✅ **Step 10 Complete When:**
- 24+ hours of stable operation
- All bugs and issues fixed or documented
- Capacity planning completed
- Cost analysis completed
- Retrospective meeting scheduled
- Documentation updated
- Go-live declared successful

---

**Status:** Complete documentation for Steps 3-10  
**Prepared By:** Claude Code Agent 8 (Execution Agent)  
**Approval Required:** Infrastructure Lead, CTO, Business (Sócios)
