# AWS Deployment Checklist — imbobi

**Status:** ✅ All Automation Scripts Ready  
**Date:** 31 de Maio de 2026  
**Branch:** `claude/happy-goldberg-AFQPj`  
**Architecture:** AWS ECS + RDS + ElastiCache + S3 (Centralized)

---

## Executive Summary

**Objective:** Centralize imbobi infrastructure on AWS with complete automation  
**Current State:** All deployment scripts and documentation prepared  
**Time to Deploy:** ~2-3 hours (infrastructure + migrations)

### What's Included

✅ **Automated Infrastructure Setup** — One-command AWS resource creation  
✅ **Containerized Services** — Docker images pushed to ECR  
✅ **Database Management** — RDS PostgreSQL with migrations  
✅ **Caching Layer** — ElastiCache Redis for performance  
✅ **Monitoring** — Sentry + CloudWatch integration  
✅ **Load Testing** — Performance validation framework  
✅ **Security** — 20/20 OWASP vulnerabilities resolved  

---

## Deployment Scripts Overview

### 1. `AWS_STAGING_SETUP.sh` — Infrastructure Automation

**Purpose:** Create all AWS resources in one command  
**Time:** 15-20 minutes (infrastructure creation)

**Creates:**
- ✅ ECR (Elastic Container Registry) repositories
- ✅ Docker images (API + Web) pushed to ECR
- ✅ RDS PostgreSQL instance (db.t3.micro)
- ✅ ElastiCache Redis cluster (cache.t3.micro)
- ✅ ECS Cluster for container orchestration
- ✅ S3 bucket for file storage
- ✅ `.env.staging` with all endpoints

**Usage:**
```bash
chmod +x AWS_STAGING_SETUP.sh
./AWS_STAGING_SETUP.sh
```

**Output:**
```
✅ AWS STAGING INFRASTRUCTURE READY
   ECS Cluster: imobi-staging
   RDS Endpoint: ...
   Redis Endpoint: ...
   S3 Bucket: ...
```

---

### 2. `AWS_ECS_DEPLOY.sh` — Service Deployment

**Purpose:** Deploy containerized services to ECS  
**Time:** 10-15 minutes (includes migrations + health checks)

**Functions:**
- ✅ Verify environment configuration
- ✅ Run database migrations (Prisma)
- ✅ Register ECS task definitions
- ✅ Deploy API and Web services
- ✅ Wait for tasks to become running
- ✅ Run health checks
- ✅ Execute smoke tests

**Usage:**
```bash
chmod +x AWS_ECS_DEPLOY.sh

# Verify only
./AWS_ECS_DEPLOY.sh verify

# Run migrations only
./AWS_ECS_DEPLOY.sh migrate

# Full deployment
./AWS_ECS_DEPLOY.sh deploy
```

**Output:**
```
✅ Environment verified
✅ Migrations complete
✅ Task definitions registered
✅ Tasks are running (count: 2)
✅ API responding

Deployment complete!
```

---

### 3. `AWS_CENTRALIZED_DEPLOYMENT.md` — Step-by-Step Guide

**Purpose:** Complete documentation for AWS deployment  
**Contents:**
- Architecture diagrams
- Prerequisites and setup
- Phase-by-phase deployment steps
- Health checks and verification
- Production migration procedures
- Troubleshooting guide
- Rollback procedures
- Monitoring and maintenance
- Cost optimization

---

## Pre-Deployment Checklist

### Local Environment

- [ ] AWS CLI installed: `aws --version`
- [ ] Docker installed: `docker --version`
- [ ] AWS credentials configured: `aws configure`
- [ ] Repository cloned: `/home/user/imobi`
- [ ] Branch checked out: `claude/happy-goldberg-AFQPj`

### AWS Account

- [ ] AWS account created and active
- [ ] Billing enabled (required to create RDS/ElastiCache)
- [ ] IAM user created with `AdministratorAccess`
- [ ] AWS CLI credentials configured
- [ ] AWS region selected: `us-east-1` (or your preferred region)

### Code Preparation

- [ ] All code committed to branch
- [ ] Type checking passed: `pnpm type-check`
- [ ] Build successful: `pnpm build`
- [ ] `.env.example` up to date

---

## Deployment Steps (Quick Reference)

### Step 1: Prepare Environment

```bash
# Navigate to project directory
cd /home/user/imobi

# Ensure you're on the correct branch
git checkout claude/happy-goldberg-AFQPj

# Create .env.staging from example
cp .env.example .env.staging

# Generate secure keys
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Edit .env.staging and add above keys
# Also add: SENTRY_DSN, AWS credentials if available
```

### Step 2: Create AWS Infrastructure (20 min)

```bash
# Run infrastructure setup
chmod +x AWS_STAGING_SETUP.sh
./AWS_STAGING_SETUP.sh

# Expected output:
# ✅ ECR repositories created
# ✅ Docker images pushed
# ✅ RDS instance created
# ✅ Redis cluster created
# ✅ ECS cluster created
# ✅ S3 bucket created
# ✅ .env.staging updated with endpoints
```

### Step 3: Setup Database (10 min)

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Expected output:
# ✅ All migrations applied successfully
```

### Step 4: Deploy Services to ECS (15 min)

```bash
# Deploy API and Web services
chmod +x AWS_ECS_DEPLOY.sh
./AWS_ECS_DEPLOY.sh deploy

# Expected output:
# ✅ Task definitions registered
# ✅ Services deployed
# ✅ Tasks running (count: 2)
# ✅ Health checks passing
```

### Step 5: Verify Deployment (5-10 min)

```bash
# Check API is responding
curl -i http://localhost:4000/api/v1/health

# Check logs
aws logs tail /ecs/imobi-api-staging --follow --region us-east-1

# Verify services are running
aws ecs list-tasks \
  --cluster imobi-staging \
  --service-name imobi-api-staging \
  --region us-east-1
```

---

## Expected Cost (Monthly)

| Component | Instance Type | Monthly Cost |
|-----------|---------------|--------------|
| ECS Fargate (2 tasks) | 256 CPU, 512 RAM | $40-60 |
| RDS PostgreSQL | db.t3.micro | $30 |
| ElastiCache Redis | cache.t3.micro | $20 |
| S3 + Data Transfer | Standard | $10-15 |
| CloudWatch + Misc | Monitoring | $5-10 |
| **Total** | | **~$105-135/month** |

**Optimization Options:**
- Reserve instances (40% discount): ~$60-80/month
- Use spot for non-critical: ~$40-50/month
- Combine strategies: ~$70-90/month

---

## Post-Deployment Tasks

### Immediate (Day 1)

- [ ] Verify all services running: `aws ecs describe-services`
- [ ] Check health endpoints: `/api/v1/health`, `/`
- [ ] Run load tests: `npx tsx scripts/load-test.ts`
- [ ] Monitor logs: CloudWatch
- [ ] Update Sentry dashboard (if configured)

### Next Week

- [ ] Setup custom domain (Route 53)
- [ ] Configure CloudFront CDN for static assets
- [ ] Enable multi-AZ for RDS (production)
- [ ] Setup auto-scaling policies
- [ ] Create CloudWatch alarms
- [ ] Document any custom settings

### Before Production

- [ ] Run full security audit
- [ ] Validate backup/restore procedures
- [ ] Setup disaster recovery plan
- [ ] Configure encryption for RDS
- [ ] Enable VPC security groups
- [ ] Plan capacity for expected load

---

## Documentation Structure

| Document | Purpose | Audience |
|----------|---------|----------|
| **AWS_CENTRALIZED_DEPLOYMENT.md** | Step-by-step deployment guide | DevOps/Developers |
| **AWS_INFRASTRUCTURE_STRATEGY.md** | Architecture and cost analysis | Decision makers |
| **AWS_STAGING_SETUP.sh** | Infrastructure automation script | DevOps |
| **AWS_ECS_DEPLOY.sh** | Service deployment script | DevOps |
| **MONITORING_ALERTING_SETUP.md** | Sentry + CloudWatch setup | DevOps/SRE |
| **LOAD_TESTING_REPORT.md** | Performance testing framework | QA/Performance |
| **SECURITY_SUMMARY.md** | OWASP vulnerability fixes | Security |
| **STAGING_DEPLOYMENT.md** | Generic staging procedures | Developers |

---

## Architecture Decision: Why AWS?

### Centralization Benefits

✅ **Unified billing** — Single AWS account vs. Vercel + Railway fragmentation  
✅ **Infrastructure as code** — Reproducible, version-controlled deployments  
✅ **Company governance** — IAM roles, cost controls, compliance tracking  
✅ **Complete integration** — SES (email), SNS (SMS), Lambda (serverless), etc.  
✅ **Advanced monitoring** — CloudWatch, X-Ray, cost analysis  
✅ **Cost optimization** — Reserved instances, spot pricing, free tier

### Trade-offs vs. Vercel + Railway

| Aspect | Vercel + Railway | AWS |
|--------|------------------|-----|
| **Cost** | $7-10/month | $105-135/month |
| **Setup time** | 30 minutes | 2-3 hours |
| **Ops overhead** | Minimal | Moderate |
| **Flexibility** | Limited | Complete |
| **Compliance** | Standard | Enterprise (SOC2, HIPAA capable) |
| **Vendor lock-in** | High | Moderate |

### When to Use AWS vs. Vercel + Railway

**Use Vercel + Railway (Current):**
- ✅ Startup stage (minimize overhead)
- ✅ Low operational budget
- ✅ Fast iteration cycle
- ✅ Minimal compliance needs

**Use AWS (This Guide):**
- ✅ Enterprise deployment
- ✅ Company wants centralized infra
- ✅ Need advanced compliance
- ✅ Have dedicated DevOps team
- ✅ Scaling to high load

---

## What's NOT Included (Optional Upgrades)

### Multi-Region Failover
- Setup RDS read replicas in secondary region
- Configure Route 53 health checks + failover routing
- Cost: +$50-100/month per region

### Advanced Networking
- VPC with public/private subnets
- NAT Gateway for private DB access
- AWS WAF for DDoS protection
- Cost: +$20-40/month

### CI/CD Pipeline
- GitHub Actions → CodePipeline
- Automated testing on push
- Automatic deployments on merge
- Cost: Included in free tier (~$0)

### Enhanced Monitoring
- AWS X-Ray distributed tracing
- CloudWatch anomaly detection
- Third-party tools (DataDog, New Relic)
- Cost: +$20-50/month

---

## Support & Troubleshooting

### Quick Troubleshooting

```bash
# Task not starting?
aws ecs describe-task-definition --task-definition imobi-api-staging

# Check logs
aws logs tail /ecs/imobi-api-staging --since 5m

# Service unhealthy?
aws elbv2 describe-target-health --target-group-arn ...

# RDS connection issue?
psql -h ENDPOINT -U postgres -d imobi_staging -c "SELECT 1;"
```

### Common Issues

| Issue | Solution |
|-------|----------|
| ECR image not found | Verify image was pushed: `aws ecr describe-images` |
| RDS takes 10 minutes | Normal behavior, use `aws rds wait` command |
| Tasks OOMKilled | Increase task memory: `register-task-definition --memory 1024` |
| High costs | Scale down `desired-count`, use spot instances |

---

## Next Steps

### Immediate
1. ✅ AWS infrastructure scripts ready
2. ✅ All documentation prepared
3. ⏳ **Run `AWS_STAGING_SETUP.sh`** (your next step)

### This Week
4. Verify services are running and healthy
5. Configure custom domain (Route 53)
6. Monitor performance and costs
7. Run security audit

### Next Week
8. Setup production environment (separate AWS account)
9. Configure automated deployments (GitHub Actions)
10. Plan scaling strategy for production load

---

## Git Branch Status

**Branch:** `claude/happy-goldberg-AFQPj`  
**Latest Commits:**
- `2bbb99b` — AWS centralized deployment automation ✅
- `92b8321` — Staging deployment scripts ✅
- `2a8dc51` — Load testing framework ✅
- `8fae91e` — Sentry monitoring ✅

**Files Added This Session:**
- `AWS_STAGING_SETUP.sh` (infrastructure automation)
- `AWS_ECS_DEPLOY.sh` (service deployment)
- `AWS_CENTRALIZED_DEPLOYMENT.md` (detailed guide)
- `AWS_DEPLOYMENT_CHECKLIST.md` (this file)

**Ready to:** Execute `bash AWS_STAGING_SETUP.sh` when AWS account is configured

---

## Success Criteria

After deployment, you should have:

✅ All infrastructure resources created in AWS  
✅ Docker images built and pushed to ECR  
✅ RDS PostgreSQL instance running with migrations applied  
✅ ElastiCache Redis cluster running  
✅ ECS services deployed with healthy task status  
✅ API responding at health endpoint  
✅ Web app accessible  
✅ Logs flowing to CloudWatch  
✅ Error tracking via Sentry (if configured)  
✅ Load tests passing performance targets  
✅ Security audit passing (20/20 OWASP fixes)  

---

**Status:** ✅ ALL SYSTEMS READY FOR AWS DEPLOYMENT

You now have complete automation to deploy imbobi to AWS infrastructure. Execute the scripts above to stand up staging environment.

For architectural decisions and cost analysis, see **AWS_INFRASTRUCTURE_STRATEGY.md**  
For step-by-step guide, see **AWS_CENTRALIZED_DEPLOYMENT.md**  
For troubleshooting, see **AWS_CENTRALIZED_DEPLOYMENT.md** (Troubleshooting section)
