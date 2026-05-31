# Production Deployment Guide

**Environment:** Production  
**Generated:** 2026-05-31  
**Audience:** DevOps / Infrastructure Team

---

## Overview

This guide covers deploying to **production** after successful staging validation. Production uses the same infrastructure architecture as staging but with:
- Larger instance types for higher capacity
- Multi-AZ deployment for high availability
- Enhanced monitoring and alerting
- Stricter security configurations
- Automated failover and recovery

---

## Infrastructure Differences: Staging vs Production

| Component | Staging | Production |
|-----------|---------|-----------|
| **RDS** | db.r6i.xlarge (100GB) | db.r6i.2xlarge (500GB) |
| **RDS Backup** | 30 days | 35 days |
| **RDS Multi-AZ** | No | Yes |
| **ElastiCache** | cache.r6g.xlarge | cache.r6g.2xlarge |
| **ElastiCache Nodes** | 1 | 2 (automatic failover) |
| **ECS API** | t3.medium (2 tasks) | c5.2xlarge (4 tasks) |
| **ECS Web** | t3.small (2 tasks) | c5.xlarge (3 tasks) |
| **ALB** | Single AZ | Multi-AZ |
| **CloudFront** | Standard | With WAF + Shield Advanced |
| **NAT Gateway** | 1 per AZ | 1 per AZ (HA) |
| **Database Encryption** | Optional | Mandatory |
| **S3 Encryption** | SSE-S3 | SSE-KMS (customer key) |
| **VPC Flow Logs** | Optional | Enabled |
| **Config Rules** | Optional | Enabled (20+ rules) |

---

## Pre-Production Checklist (After Staging Validation)

### Security Audit
- [ ] Security scanning: `npm audit` (0 vulnerabilities)
- [ ] OWASP testing: All 20 issues documented as resolved
- [ ] Secrets scanning: No credentials in code/config
- [ ] SSL/TLS: Certificate ready (valid domain)
- [ ] WAF rules: Configured for production threats
- [ ] DDoS protection: AWS Shield Standard (Advanced optional)

### Performance Validation
- [ ] Load test: 500+ concurrent users for 30 minutes
- [ ] Latency baseline: API p95 < 200ms, p99 < 500ms
- [ ] Database: Handles 100k+ queries/min
- [ ] Cache hit rate: > 80% (Redis optimized)
- [ ] CDN: CloudFront cache configured

### Operational Readiness
- [ ] Monitoring: All CloudWatch dashboards created
- [ ] Alerts: SNS topics, email, PagerDuty integration
- [ ] On-call: Team assigned, runbooks reviewed
- [ ] Backups: Tested restore procedures
- [ ] Disaster recovery: Failover plan documented
- [ ] Capacity: Projected growth for 12 months

### Compliance
- [ ] GDPR: Data residency in EU (if required)
- [ ] PCI-DSS: Payment data isolation (if handling cards)
- [ ] SOC 2: Audit logging enabled
- [ ] Data retention: Policies documented
- [ ] Privacy: Terms updated, consent forms ready

---

## Production Terraform Configuration

### Update terraform.tfvars

```hcl
# Production variables
aws_region             = "us-east-1"
environment            = "production"
project_name           = "imobi-prod"

# Network
vpc_cidr               = "10.1.0.0/16"  # Different from staging

# RDS Production Sizing
rds_instance_class     = "db.r6i.2xlarge"    # Larger than staging
rds_allocated_storage  = 500                 # 5x staging
rds_backup_retention_days = 35               # Longer retention
rds_multi_az           = true                # HA setup

# ElastiCache Production Sizing
elasticache_instance_type = "cache.r6g.2xlarge"
elasticache_num_nodes     = 2                # Primary + replica

# ECS Scaling (Production)
ecs_api_cpu            = 4096
ecs_api_memory         = 8192
ecs_api_desired_count  = 4                  # 2x staging

ecs_web_cpu            = 2048               # Larger
ecs_web_memory         = 4096
ecs_web_desired_count  = 3                  # 1.5x staging

ecs_worker_cpu         = 2048
ecs_worker_memory      = 4096
ecs_worker_desired_count = 2                # 2x staging

# Storage
s3_bucket_name         = "imobi-obras-production"

# Security
enable_cloudfront      = true
enable_waf             = true               # Production WAF
enable_shield_advanced = true               # DDoS protection
enable_config_rules    = true               # Compliance monitoring
enable_vpc_flow_logs   = true               # Network monitoring

# Encryption
enable_s3_kms_encryption = true             # Customer-managed key
enable_rds_kms_encryption = true
enable_ebs_encryption    = true
```

### Create Production Module

```bash
# Copy staging infrastructure code
cp -r infrastructure/terraform/modules infrastructure/terraform-prod/modules

# Update module outputs for prod
sed -i 's/staging/production/g' infrastructure/terraform-prod/*.tf

# Initialize for production
cd infrastructure/terraform-prod
terraform init -backend-config=bucket=imobi-terraform-state-prod
terraform plan -var-file=terraform-prod.tfvars
```

---

## Production Deployment Steps

### Phase 1: Infrastructure (1-2 hours)

#### Step 1: Backend Configuration
```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket imobi-terraform-state-prod \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket imobi-terraform-state-prod \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket imobi-terraform-state-prod \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms"
      }
    }]
  }'

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name imobi-terraform-locks-prod \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

#### Step 2: Provision Infrastructure
```bash
cd infrastructure/terraform-prod

# Initialize with production backend
terraform init \
  -backend-config="bucket=imobi-terraform-state-prod" \
  -backend-config="key=production/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=imobi-terraform-locks-prod"

# Plan
terraform plan -var-file=terraform-prod.tfvars -out=tfplan-prod

# Review carefully
cat tfplan-prod | grep "will be created" | wc -l
# Should show: ~50-60 resources

# Apply
terraform apply tfplan-prod

# Save outputs
terraform output -json > prod-outputs.json
```

#### Step 3: Extract Credentials
```bash
# RDS
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
RDS_PASSWORD=$(terraform output -raw rds_master_password)

# Redis
REDIS_ENDPOINT=$(terraform output -raw redis_endpoint)

# Outputs file
cat > /tmp/prod-credentials.env << EOF
RDS_ENDPOINT=$RDS_ENDPOINT
RDS_PASSWORD=$RDS_PASSWORD
REDIS_ENDPOINT=$REDIS_ENDPOINT
EOF

# Store securely (AWS Secrets Manager)
aws secretsmanager create-secret \
  --name imbobi/prod/database \
  --secret-string "{\"endpoint\":\"$RDS_ENDPOINT\",\"password\":\"$RDS_PASSWORD\"}"
```

### Phase 2: Application Deployment (1-2 hours)

#### Step 1: Build Production Artifacts
```bash
cd /home/user/imobi

# Clean previous builds
rm -rf dist .next out

# Build with production optimizations
NODE_ENV=production pnpm build

# Verify build
ls -lh dist/services/api/src/main.js      # Should be ~896KB
ls -lh apps/web/.next/BUILD_ID            # Should exist
```

#### Step 2: API Deployment

```bash
# Create ECR repository
aws ecr create-repository \
  --repository-name imobi-api \
  --region us-east-1

# Build Docker image
docker build \
  -t imobi-api:latest \
  -t imobi-api:v1.0.0 \
  -t 123456789.dkr.ecr.us-east-1.amazonaws.com/imobi-api:latest \
  .

# Push to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/imobi-api:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/imobi-api:v1.0.0

# Update ECS service with new image
aws ecs update-service \
  --cluster imobi-prod \
  --service api \
  --force-new-deployment \
  --region us-east-1

# Wait for deployment
aws ecs wait services-stable \
  --cluster imobi-prod \
  --services api \
  --region us-east-1

# Verify
curl https://api.imbobi.com.br/health
```

#### Step 3: Web Deployment

```bash
# Create S3 bucket for Next.js static files
aws s3api create-bucket \
  --bucket imbobi-web-prod \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket imbobi-web-prod \
  --versioning-configuration Status=Enabled

# Upload build artifacts
aws s3 sync \
  apps/web/.next/static/ \
  s3://imbobi-web-prod/_next/static/ \
  --delete \
  --cache-control "public, max-age=31536000, immutable"

# Upload pages
aws s3 sync \
  apps/web/.next/ \
  s3://imbobi-web-prod/ \
  --delete \
  --exclude "_next/*" \
  --cache-control "public, max-age=3600"

# Create CloudFront distribution (or update existing)
# Point origin to: imbobi-web-prod.s3.us-east-1.amazonaws.com
# Cache behaviors:
#   _next/* → 31536000 (1 year)
#   other → 3600 (1 hour)

# Verify
curl https://imbobi.com.br
```

#### Step 4: Database Initialization

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier imobi-prod \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

# Create .env.production
cat > .env.production << EOF
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://imobi:${RDS_PASSWORD}@${RDS_ENDPOINT}:5432/imbobi_prod
REDIS_HOST=${REDIS_ENDPOINT}
REDIS_PORT=6379
JWT_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -base64 32)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=[prod-user-key]
AWS_SECRET_ACCESS_KEY=[prod-user-secret]
S3_BUCKET=imbobi-obras-production
EOF

# Generate Prisma client
pnpm --filter @imbobi/api db:generate

# Run migrations
DATABASE_URL=postgresql://... pnpm --filter @imbobi/api db:migrate

# Seed initial data (if needed)
DATABASE_URL=postgresql://... pnpm --filter @imbobi/api db:seed
```

### Phase 3: Validation (2-3 hours)

#### Step 1: Health Checks
```bash
# API health
for i in {1..5}; do
  curl -s https://api.imbobi.com.br/health | jq .
  sleep 2
done

# Database connectivity
psql -h $RDS_ENDPOINT -U imobi -d imbobi_prod -c "SELECT 1"

# Redis connectivity
redis-cli -h $REDIS_ENDPOINT PING

# Web frontend
curl -I https://imbobi.com.br | head -1
```

#### Step 2: Security Validation
```bash
# Test HTTPS enforcement
curl -I http://imbobi.com.br   # Should redirect to HTTPS

# Test security headers
curl -I https://api.imbobi.com.br | grep -E "Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options"

# Test CORS
curl -H "Origin: https://evil.com" https://api.imbobi.com.br/api/v1/obras | grep -i "access-control"

# Test rate limiting
for i in {1..150}; do
  curl -s https://api.imbobi.com.br/api/v1/auth/login -X POST > /dev/null
done
# Should see 429 Too Many Requests after ~100 requests
```

#### Step 3: Load Testing
```bash
# Using k6
cat > k6-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 200 },   // Peak load
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<200'],  // 95th percentile < 200ms
    'http_req_failed': ['<1%'],
  },
};

export default function() {
  let response = http.get('https://api.imbobi.com.br/api/v1/obras');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'duration < 200ms': (r) => r.timings.duration < 200,
  });
  sleep(1);
}
EOF

# Run test
k6 run k6-test.js
```

#### Step 4: Monitoring Verification
```bash
# Check CloudWatch metrics
aws cloudwatch list-metrics \
  --namespace "AWS/RDS" \
  --metric-name CPUUtilization

aws cloudwatch list-metrics \
  --namespace "AWS/ElastiCache" \
  --metric-name CPUUtilization

# Verify alarms
aws cloudwatch describe-alarms \
  --alarm-names "imobi-prod-api-errors" "imobi-prod-db-cpu"

# Check log groups
aws logs describe-log-groups --log-group-name-prefix "/ecs/imobi"
```

---

## Post-Deployment Operations

### Day 1: Monitoring
- Monitor error rates: Target < 0.1%
- Monitor latency: p95 < 200ms
- Monitor database: CPU < 60%, connections < 100
- Monitor cache: Hit rate > 80%
- Check CloudWatch logs for warnings

### Week 1: Stability
- Weekly performance review
- Weekly security audit of logs
- Capacity monitoring
- Customer feedback collection

### Monthly: Optimization
- Analyze slow queries
- Review cache effectiveness
- Plan capacity scaling
- Security updates

---

## Rollback Procedures (Production)

### Scenario: Critical Bug Post-Deployment

**Immediate Actions:**
```bash
# Step 1: Revert to previous API version
PREVIOUS_VERSION=$(aws ecr describe-images \
  --repository-name imobi-api \
  --sort-by=date \
  --query 'reverse(sort_by(imageDetails, &imagePushedAt))[1].imageTags' \
  --output text)

# Step 2: Update ECS service
aws ecs update-service \
  --cluster imobi-prod \
  --service api \
  --force-new-deployment \
  --task-definition imobi-api:$(echo $PREVIOUS_VERSION | grep -oP '\d+')

# Step 3: Verify rollback
aws ecs wait services-stable \
  --cluster imobi-prod \
  --services api

# Step 4: Validate health
curl https://api.imbobi.com.br/health
```

**Database Rollback:**
```bash
# If schema change required rollback
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier imobi-prod \
  --db-instance-identifier imobi-prod-recovery \
  --restore-time 2026-05-31T14:00:00Z

# Wait and verify
aws rds wait db-instance-available \
  --db-instance-identifier imobi-prod-recovery

# Swap endpoints
# Update connection string to point to recovery instance
# Delete old corrupted instance
```

---

## Disaster Recovery (Production)

### RTO/RPO Targets
- **RTO (Recovery Time Objective):** < 15 minutes
- **RPO (Recovery Point Objective):** < 5 minutes

### Backup Strategy
- **Database:** Every 6 hours, 35-day retention
- **S3:** Versioning enabled, cross-region replication
- **Logs:** CloudWatch 30-day retention, archive to S3

### Failover Testing
- Monthly: Restore from backup to test recovery
- Monthly: Failover to read replica to test AZ failure
- Quarterly: Full disaster recovery drill

---

## Cost Management

### Expected Monthly Costs (Rough Estimates)

| Service | Staging | Production |
|---------|---------|-----------|
| RDS | $400 | $800 |
| ElastiCache | $200 | $400 |
| ECS (Fargate) | $300 | $600 |
| ALB | $20 | $20 |
| S3 | $50 | $100 |
| CloudFront | $100 | $300 |
| CloudWatch | $50 | $100 |
| Data Transfer | $100 | $300 |
| **Total** | **$1,220** | **$2,620** |

### Cost Optimization
- Use Savings Plans for RDS/ElastiCache
- Use CloudFront for static asset caching
- Archive old logs to S3 Glacier
- Right-size instances based on metrics

---

## Sign-Off Checklist

Before promoting staging to production:

### Technical
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Security audit completed (20/20 OWASP)
- [ ] Performance validated (p95 < 200ms)
- [ ] Capacity planning completed
- [ ] Monitoring configured
- [ ] Backups tested

### Operational
- [ ] On-call team trained
- [ ] Runbooks reviewed
- [ ] Escalation procedures documented
- [ ] Communication channels ready
- [ ] Incident response plan ready

### Business
- [ ] Stakeholder approval
- [ ] Launch window confirmed
- [ ] Rollback plan approved
- [ ] SLA/uptime targets agreed
- [ ] Success metrics defined

**Sign-off Date:** _________________  
**By:** _________________  
**Title:** _________________

---

## Post-Launch Review (Week 1)

Schedule review meeting to discuss:
- [ ] Error rates and incidents
- [ ] Performance metrics
- [ ] Customer feedback
- [ ] Operational issues
- [ ] Optimization opportunities

---

**Last Updated:** 2026-05-31  
**Version:** 1.0  
**Status:** Ready for Production Deployment
