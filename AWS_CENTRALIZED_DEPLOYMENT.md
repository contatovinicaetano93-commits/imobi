# AWS Centralized Deployment Guide — imbobi

**Status:** ✅ Ready for AWS Infrastructure  
**Date:** 31 de Maio de 2026  
**Architecture:** ECS + RDS + ElastiCache + S3  
**Estimated Setup Time:** 2-3 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Verification](#verification)
6. [Production Migration](#production-migration)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

---

## Overview

This guide provides **centralized AWS infrastructure** for imbobi, replacing Vercel + Railway with:

- **Compute:** AWS ECS Fargate (containerized services)
- **Database:** AWS RDS PostgreSQL (managed database)
- **Cache:** AWS ElastiCache Redis (managed cache)
- **Storage:** AWS S3 (file storage)
- **Monitoring:** CloudWatch (logging) + Sentry (error tracking)

### Why AWS Centralization?

✅ **Unified billing** — Single AWS account, no vendor fragmentation  
✅ **Complete control** — Infrastructure as code, reproducible deployments  
✅ **Company governance** — IAM roles, compliance controls, cost optimization  
✅ **Advanced monitoring** — CloudWatch, X-Ray, cost analysis  
✅ **Integration ecosystem** — SES (email), SNS (SMS), Lambda (serverless)

### Cost Estimate

```
ECS Fargate (API + Web):  $50-100/month
RDS PostgreSQL (db.t3.micro):  $30-50/month
ElastiCache Redis (cache.t3.micro):  $20-40/month
S3 + CloudFront:  $10-20/month
CloudWatch + misc:  $10-20/month
────────────────────────────
Total: ~$120-230/month (optimizable with Reserved Instances)
```

---

## Architecture

### AWS Infrastructure Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Route 53 DNS                              │
│              (staging.imbobi.com → ALB)                     │
└─────────────────┬────────────────────────────────────────────┘
                  │
┌─────────────────▼────────────────────────────────────────────┐
│      Application Load Balancer (ALB)                         │
│      ├─ api.staging.imbobi.com:443 → API Service (4000)     │
│      └─ staging.imbobi.com:443 → Web Service (3000)         │
└─────────────────┬────────────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼──────┐      ┌──────▼────────┐
│  ECS Cluster │      │  ECS Cluster   │
│  ├─ API      │      │  ├─ Web       │
│  │ (2 tasks) │      │  │ (2 tasks)  │
│  └─ Port     │      │  └─ Port      │
│    4000      │      │    3000       │
└───────┬──────┘      └──────┬────────┘
        │                    │
        └────────┬───────────┘
                 │
        ┌────────┼───────────┐
        │        │           │
┌───────▼────┐  │   ┌────────▼───────┐
│    RDS     │  │   │ ElastiCache    │
│ PostgreSQL │  │   │ Redis          │
│ db.t3.micro│  │   │ cache.t3.micro │
└────────────┘  │   └────────────────┘
                │
        ┌───────▼────────┐
        │   S3 Bucket    │
        │  (File store)  │
        └────────────────┘
```

### Service Communication

```
Client
  ↓
Route 53 (DNS routing)
  ↓
ALB (Load Balancer)
  ├─→ ECS API Service (NestJS)
  │    ├─→ RDS (PostgreSQL)
  │    ├─→ ElastiCache (Redis)
  │    └─→ S3 (File storage)
  │
  └─→ ECS Web Service (Next.js)
       ├─→ ECS API Service (API calls)
       └─→ S3 (Assets)
```

---

## Prerequisites

### Local Machine Setup

```bash
# Install required tools
brew install awscli terraform docker docker-compose  # macOS

# Or on Ubuntu/Debian:
# apt-get install awscli terraform docker.io docker-compose

# Verify installations
aws --version
terraform -version
docker --version
```

### AWS Account Setup

1. **Create AWS Account** (if you don't have one)
   - Visit https://aws.amazon.com
   - Create account with company email
   - Enable billing

2. **Configure AWS CLI**
   ```bash
   aws configure
   # Enter:
   #   AWS Access Key ID: [get from IAM]
   #   AWS Secret Access Key: [get from IAM]
   #   Default region: us-east-1
   #   Default output format: json
   ```

3. **Create IAM User** (recommended, not root account)
   - Go to IAM Console
   - Create user with programmatic access
   - Attach policy: `AdministratorAccess`
   - Save access keys
   - Run `aws configure` with those keys

4. **Required AWS Services** (verify enabled)
   - ✅ ECS (Elastic Container Service)
   - ✅ RDS (Relational Database Service)
   - ✅ ElastiCache
   - ✅ S3
   - ✅ EC2 (VPC, Security Groups)
   - ✅ CloudWatch
   - ✅ Route 53 (for DNS)

### Environment Variables

Create `.env.staging` from template:

```bash
cp .env.example .env.staging

# Edit with actual values:
NODE_ENV=staging
DATABASE_URL=postgresql://...  # Will be set by AWS_STAGING_SETUP.sh
REDIS_HOST=...                  # Will be set by AWS_STAGING_SETUP.sh
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
SENTRY_DSN=https://...          # Get from Sentry dashboard
AWS_REGION=us-east-1
AWS_S3_BUCKET=...              # Will be created
```

---

## Step-by-Step Deployment

### Phase 1: Infrastructure Setup (1-1.5 hours)

#### Step 1.1: Verify AWS Credentials

```bash
# Verify you're logged in
aws sts get-caller-identity

# Output should show your Account ID and ARN
```

#### Step 1.2: Run Infrastructure Setup Script

```bash
# Make script executable
chmod +x AWS_STAGING_SETUP.sh

# Run infrastructure setup
./AWS_STAGING_SETUP.sh

# This will:
# ✅ Create ECR repositories for API and Web
# ✅ Build and push Docker images
# ✅ Create RDS PostgreSQL instance (5-10 min)
# ✅ Create ElastiCache Redis cluster (5-10 min)
# ✅ Create ECS cluster
# ✅ Create S3 bucket
# ✅ Generate .env.staging with endpoints
```

**Expected Output:**
```
✅ AWS STAGING INFRASTRUCTURE READY

📊 Infrastructure Summary:
   ECS Cluster: imobi-staging
   RDS Database: postgresql://...
   Redis Endpoint: ...
   S3 Bucket: imobi-assets-staging-...

🚀 Next Steps:
   1. Update .env.staging with credentials
   2. Run: pnpm db:migrate
   3. Deploy with: bash AWS_ECS_DEPLOY.sh
```

#### Step 1.3: Update Environment Variables

```bash
# Edit .env.staging and add:

# AWS Credentials (required for S3 access)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Sentry (optional but recommended for monitoring)
SENTRY_DSN=https://key@org.ingest.sentry.io/project

# SMTP/Email (optional initially)
SMTP_USER=...
SMTP_PASS=...

# Save the file
```

### Phase 2: Database Setup (10-15 minutes)

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations (creates tables, indexes, etc.)
pnpm db:migrate

# Seed data (if available)
# pnpm db:seed
```

**Expected Output:**
```
Prisma schema loaded from ./services/api/prisma/schema.prisma
Datasource "db": PostgreSQL database "imobi_staging" at "..."

Applying migration: 001_init
Applying migration: 002_user_kyc_flow
...

✅ Migrations completed successfully!
```

### Phase 3: Build & Deploy Services (15-20 minutes)

#### Step 3.1: Build Production Images

```bash
# Build API and Web services
pnpm build

# Verify builds
ls -la services/api/dist/main.js
ls -la apps/web/.next/
```

#### Step 3.2: Push to ECR

The `AWS_STAGING_SETUP.sh` script already pushed images, but if you made changes:

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t imobi-api:latest -f services/api/Dockerfile .
docker tag imobi-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi-api-staging:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi-api-staging:latest
```

#### Step 3.3: Deploy to ECS

```bash
# Make script executable
chmod +x AWS_ECS_DEPLOY.sh

# Deploy services
./AWS_ECS_DEPLOY.sh deploy

# Or just verify:
./AWS_ECS_DEPLOY.sh verify

# Or run migrations:
./AWS_ECS_DEPLOY.sh migrate
```

**Expected Output:**
```
✅ AWS ECS DEPLOYMENT — imbobi

✅ Environment verified
✅ Migrations complete
✅ Task definitions registered
✅ Updated service: imobi-api-staging
✅ Tasks are running (count: 2)
✅ API responding

✅ Deployment complete!
```

### Phase 4: Verify Deployment (10-15 minutes)

```bash
# Get service details
aws ecs describe-services \
  --cluster imobi-staging \
  --services imobi-api-staging \
  --region us-east-1 \
  --query 'services[0].[serviceName,status,runningCount,desiredCount]' \
  --output table

# Get task details
aws ecs list-tasks \
  --cluster imobi-staging \
  --service-name imobi-api-staging \
  --desired-status RUNNING \
  --region us-east-1

# Check logs
aws logs tail /ecs/imobi-api-staging --follow --region us-east-1
```

---

## Verification

### Health Checks

```bash
# 1. API Health
curl -i https://api.staging.imbobi.com/api/v1/health

# Expected: HTTP 200 + {"status":"ok"}

# 2. Web App
curl -i https://staging.imbobi.com

# Expected: HTTP 200 + HTML

# 3. Database
pnpm --filter @imbobi/api prisma db execute \
  --stdin <<< "SELECT NOW();"

# Expected: Current timestamp

# 4. Redis
aws elasticache describe-cache-clusters \
  --cache-cluster-id imobi-redis-staging \
  --show-cache-node-info \
  --region us-east-1 | grep CacheNodeStatus
```

### Performance Validation

Run load tests to verify performance:

```bash
# Start dev servers locally
pnpm dev

# In another terminal, run load tests
npx tsx scripts/load-test.ts

# Expected results (from LOAD_TESTING_REPORT.md):
# Health Check P99: <10ms
# Auth Endpoints P99: <200ms
# API Endpoints P99: <200ms
```

### Security Validation

Run security test suite:

```bash
# 1. Check HTTPS is enforced
curl -i http://staging.imbobi.com
# Expected: Redirect to https://

# 2. Check security headers
curl -i https://api.staging.imbobi.com/api/v1/health | grep -i security

# 3. Test rate limiting
for i in {1..100}; do
  curl -s https://api.staging.imbobi.com/api/v1/health
done
# Expected: Some requests return 429 (Too Many Requests)

# 4. Test authorization (IDOR prevention)
# See STAGING_DEPLOYMENT.md for detailed security tests
```

---

## Production Migration

### When Ready for Production

1. **Create production AWS environment** (separate AWS account or different VPC)

```bash
ENVIRONMENT=production ./AWS_STAGING_SETUP.sh
ENVIRONMENT=production ./AWS_ECS_DEPLOY.sh deploy
```

2. **Setup CloudFront CDN** (for web assets)

```bash
# See AWS_INFRASTRUCTURE_STRATEGY.md for CloudFront setup
```

3. **Configure custom domain** via Route 53

```bash
# Point domain to ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch file://dns-changes.json
```

4. **Enable multi-AZ** for RDS

```bash
aws rds modify-db-instance \
  --db-instance-identifier imobi-db-production \
  --multi-az \
  --apply-immediately \
  --region us-east-1
```

5. **Enable auto-scaling** for ECS

```bash
# Setup target tracking scaling
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/imobi-production/imobi-api-production \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10
```

---

## Troubleshooting

### Task Fails to Start

**Symptom:** `aws ecs list-tasks` shows no running tasks

**Debug:**
```bash
# Get task details
aws ecs describe-task-definition \
  --task-definition imobi-api-staging:latest \
  --region us-east-1

# Check task logs
aws logs tail /ecs/imobi-api-staging --since 5m --region us-east-1

# Common causes:
# 1. ECR image not found → verify image exists in ECR
# 2. Memory/CPU exceeded → increase task definition resources
# 3. Environment variables missing → verify .env.staging
# 4. Database unavailable → check RDS status
```

### API Not Responding

**Symptom:** `curl: (7) Failed to connect`

**Debug:**
```bash
# 1. Check service status
aws ecs describe-services \
  --cluster imobi-staging \
  --services imobi-api-staging \
  --region us-east-1

# 2. Check ELB health check
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --region us-east-1

# 3. Check security group rules
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=imobi-staging-sg" \
  --region us-east-1

# 4. Check ALB listener rules
aws elbv2 describe-listeners \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --region us-east-1
```

### Database Connection Issues

**Symptom:** `psql: FATAL: remaining connection slots are reserved`

**Debug:**
```bash
# Check connection count
psql -h RDS_ENDPOINT -U postgres -d imobi_staging \
  -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Increase connection pool
# Edit services/api/prisma/.env:
DATABASE_URL="postgresql://...&max_pool_size=20"

# Reconnect and clear old connections
pnpm db:generate
```

### High Memory Usage

**Symptom:** ECS task OOMKilled (out of memory)

**Solution:**
```bash
# Increase task definition memory
aws ecs register-task-definition \
  --family imobi-api-staging \
  --memory 1024 \
  ... (copy other settings from current definition)

# Update service to use new task definition
aws ecs update-service \
  --cluster imobi-staging \
  --service imobi-api-staging \
  --task-definition imobi-api-staging:2 \
  --region us-east-1
```

---

## Rollback Procedures

### Rollback to Previous Deployment

```bash
# 1. Get previous task definition
aws ecs describe-services \
  --cluster imobi-staging \
  --services imobi-api-staging \
  --region us-east-1 \
  --query 'services[0].taskDefinition'

# 2. Get previous version
aws ecs list-task-definitions \
  --family-prefix imobi-api-staging \
  --sort DESC \
  --region us-east-1 \
  --query 'taskDefinitionArns[:2]'

# 3. Rollback to previous task definition
PREV_TASK="imobi-api-staging:1"  # Replace with actual previous version

aws ecs update-service \
  --cluster imobi-staging \
  --service imobi-api-staging \
  --task-definition $PREV_TASK \
  --region us-east-1

# 4. Verify rollback
aws ecs describe-services \
  --cluster imobi-staging \
  --services imobi-api-staging \
  --region us-east-1 \
  --query 'services[0].taskDefinition'
```

### Rollback Database Migrations

```bash
# 1. Check migration history
pnpm prisma migrate status

# 2. Rollback to previous migration
pnpm prisma migrate resolve --rolled-back 002_latest_migration

# 3. Re-run to correct state
pnpm db:migrate
```

### Disaster Recovery

```bash
# 1. Restore RDS from snapshot
aws rds describe-db-snapshots \
  --db-instance-identifier imobi-db-staging \
  --region us-east-1

# 2. Restore to point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier imobi-db-staging \
  --db-instance-identifier imobi-db-staging-restored \
  --restore-time 2026-05-31T12:00:00 \
  --region us-east-1

# 3. Update environment and redeploy
# (Follow deployment steps with restored database)
```

---

## Monitoring & Maintenance

### CloudWatch Dashboard

```bash
# Create custom dashboard
aws cloudwatch put-dashboard \
  --dashboard-name imobi-staging \
  --dashboard-body file://dashboard.json
```

### Set Alerts

```bash
# High CPU alarm
aws cloudwatch put-metric-alarm \
  --alarm-name imobi-api-cpu-high \
  --alarm-description "Alert if API CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT:AlertTopic
```

### Backup Strategy

```bash
# RDS: Automatic daily backups (7 days retention)
# ElastiCache: Daily snapshots
# S3: Versioning enabled + lifecycle policies

# Verify backups
aws rds describe-db-instances \
  --db-instance-identifier imobi-db-staging \
  --query 'DBInstances[0].[BackupRetentionPeriod,PreferredBackupWindow]'
```

---

## Cost Optimization

### Estimated Monthly Costs (Staging)

```
ECS Fargate (2 tasks, 24/7):      $40-60
RDS PostgreSQL (db.t3.micro):     $30
ElastiCache (cache.t3.micro):     $20
S3 + Data transfer:               $10-15
CloudWatch + misc:                $5-10
────────────────────────────────
Total: ~$105-135/month
```

### Cost Reduction Strategies

1. **Reduce task count** during off-peak hours
2. **Use spot instances** for non-critical workloads
3. **Reserve instances** (40% discount on 1-year commitment)
4. **S3 lifecycle policies** (move old data to Glacier)
5. **CloudWatch log retention** (limit to 30 days)

---

## Next Steps

- ✅ Infrastructure setup complete
- ✅ Database migrations running
- ✅ Services deployed to ECS
- ✅ Health checks passing
- ⏳ **Configure custom domain** (Route 53)
- ⏳ **Setup monitoring dashboards** (CloudWatch + Sentry)
- ⏳ **Run security audit** (OWASP compliance tests)
- ⏳ **Performance testing** (under realistic load)
- ⏳ **Production migration** (when ready)

---

**Status:** ✅ READY FOR AWS STAGING DEPLOYMENT

All automation scripts provided. Follow the steps above to deploy to AWS infrastructure.

For questions: See [AWS_INFRASTRUCTURE_STRATEGY.md](./AWS_INFRASTRUCTURE_STRATEGY.md) for architectural decisions and cost analysis.
