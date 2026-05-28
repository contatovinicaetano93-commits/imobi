# Production Deployment Execution Guide

**Status:** Ready for Execution  
**Last Updated:** 2026-05-28  
**Version:** 1.0.0  

---

## Executive Summary

The imbobi platform is now fully configured for production deployment. This guide provides a clear roadmap for executing the multi-component deployment across AWS (API backend) and Vercel (web frontend).

**Deployment Components:**
- AWS Infrastructure (RDS, ElastiCache, ECS, ALB)
- API Service (NestJS + Fastify on ECS Fargate)
- Web Application (Next.js 14 on Vercel)
- Database Migrations
- Monitoring & Observability

**Timeline:** 2-3 hours (dependent on infrastructure provisioning)  
**Effort:** High initial setup, then automated  
**Risk Level:** Medium (can be rolled back if needed)

---

## Pre-Execution Requirements

### 1. AWS Account Setup

**Minimum Requirements:**
- AWS account with billing enabled
- IAM user with AdministratorAccess (or equivalent)
- AWS CLI v2 installed and configured
- AWS credentials in ~/.aws/credentials or environment variables

**Verification:**
```bash
aws sts get-caller-identity
# Should return your AWS account ID
```

### 2. Vercel Account Setup

**Requirements:**
- Vercel account created
- Organization created for imbobi
- GitHub repository connected to Vercel
- Vercel CLI installed (optional but recommended)

**Verification:**
```bash
vercel login
vercel list
```

### 3. Local Environment

**Required Tools:**
- Node.js 20.x (or compatible)
- pnpm 9.x
- Docker Desktop
- PostgreSQL client tools (psql, pg_dump)
- Redis CLI (optional but useful)
- curl/httpie for API testing

**Verification:**
```bash
node --version      # Should be >= 20.0.0
pnpm --version      # Should be >= 9.0.0
docker --version    # Should be >= 20.10.0
```

### 4. DNS & Domain Setup

**Requirements Before Deployment:**
- Domain(s) registered and accessible
  - `imbobi.com` (root domain)
  - `app.imbobi.com` (web app)
  - `api.imbobi.com` (API)
- Route53 hosted zone created (or equivalent)
- Domain registrar configured to use Route53 nameservers

**Verification:**
```bash
nslookup imbobi.com
# Should resolve to your name servers
```

### 5. Secrets & Credentials

**Must Be Prepared:**
- SendGrid API key
- Firebase service account JSON
- AWS S3 bucket credentials
- SSL certificates (or use ACM)
- JWT signing keys
- Encryption keys

**Generate Random Secrets:**
```bash
# JWT Secret (64+ characters)
openssl rand -base64 48

# Encryption Secret (32+ characters)
openssl rand -base64 24

# Database password (32 characters)
openssl rand -base64 32

# Redis password (32 characters)
openssl rand -base64 32
```

---

## Deployment Execution Timeline

### Phase 1: AWS Infrastructure Setup (45-60 minutes)

**Timing:** Should be done first, dependencies follow

**Steps:**

1. **Set Environment Variables** (5 min)
   ```bash
   source scripts/env-setup.sh
   # Or manually set AWS_REGION, AWS_ACCOUNT_ID, etc.
   ```

2. **Create IAM Roles** (5 min)
   - ECS Task Execution Role
   - ECS Task Role
   - S3, SES, Secrets Manager permissions

3. **Create Security Groups** (10 min)
   - ALB Security Group (80, 443)
   - ECS Security Group (4000 from ALB)
   - RDS Security Group (5432 from ECS)
   - Redis Security Group (6379 from ECS)

4. **Create S3 Bucket** (5 min)
   - Enable versioning
   - Block public access
   - Enable encryption
   - Set lifecycle policies

5. **Create RDS Instance** (15 min launch + 10 min for availability)
   - PostgreSQL 15
   - Multi-AZ
   - Automated backups
   - Wait for instance to be available

6. **Create ElastiCache Redis** (15 min launch + 10 min for availability)
   - Redis 7.x
   - Multi-AZ
   - Encryption enabled
   - Wait for cluster to be available

7. **Create Secrets Manager Secret** (5 min)
   - Store database credentials
   - Store API keys
   - Store JWT secrets
   - Store encryption keys

**Success Criteria:**
- ✅ All resources created without errors
- ✅ RDS endpoint accessible
- ✅ Redis endpoint accessible
- ✅ Secrets stored and accessible

**Monitoring:**
```bash
# Check RDS
aws rds describe-db-instances --db-instance-identifier imbobi-prod-db

# Check Redis
aws elasticache describe-cache-clusters --cache-cluster-id imbobi-prod-redis

# Check Secrets
aws secretsmanager get-secret-value --secret-id imbobi-api/production
```

---

### Phase 2: Database Setup (30-40 minutes)

**Prerequisites:** RDS instance available

**Steps:**

1. **Verify Database Connectivity** (5 min)
   ```bash
   psql "postgresql://user:pass@rds-endpoint:5432/postgres"
   ```

2. **Create Application Database** (5 min)
   ```bash
   psql "postgresql://..." -c "CREATE DATABASE imbobi_prod;"
   ```

3. **Create PostGIS Extension** (5 min)
   ```bash
   psql "postgresql://..." -d imbobi_prod -c "CREATE EXTENSION postgis;"
   ```

4. **Create Database Backup** (5 min)
   ```bash
   pg_dump -h rds-endpoint -U imbobi_admin -d imbobi_prod \
     > backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql
   ```

5. **Run Migrations** (5-10 min)
   ```bash
   DATABASE_URL="..." pnpm db:migrate:deploy
   ```

6. **Verify Schema** (5 min)
   ```bash
   psql "..." -d imbobi_prod -c "\dt"  # List tables
   psql "..." -d imbobi_prod -c "\di"  # List indexes
   ```

**Success Criteria:**
- ✅ Database created and accessible
- ✅ PostGIS extension active
- ✅ All migrations applied successfully
- ✅ Schema integrity verified

---

### Phase 3: Docker Image Build & Push (20-30 minutes)

**Prerequisites:** Docker installed, ECR repository created

**Steps:**

1. **Authenticate with ECR** (2 min)
   ```bash
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com
   ```

2. **Build Docker Image** (10-15 min)
   ```bash
   docker build -t imbobi-api:v1.0.0 \
     -f services/api/Dockerfile \
     --build-arg NODE_ENV=production .
   ```

3. **Tag Image** (1 min)
   ```bash
   docker tag imbobi-api:v1.0.0 \
     [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/imbobi-api:v1.0.0
   docker tag imbobi-api:v1.0.0 \
     [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/imbobi-api:latest
   ```

4. **Push to ECR** (5-10 min)
   ```bash
   docker push [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/imbobi-api:v1.0.0
   docker push [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/imbobi-api:latest
   ```

**Success Criteria:**
- ✅ Image built without errors
- ✅ Image pushed to ECR successfully
- ✅ Image scannable in ECR (if enabled)

---

### Phase 4: ECS Cluster & Services (20-30 minutes)

**Prerequisites:** Docker image in ECR

**Steps:**

1. **Create ECS Cluster** (5 min)
   ```bash
   aws ecs create-cluster --cluster-name imbobi-production
   ```

2. **Create CloudWatch Log Group** (2 min)
   ```bash
   aws logs create-log-group --log-group-name /ecs/imbobi-api
   aws logs put-retention-policy --log-group-name /ecs/imbobi-api \
     --retention-in-days 30
   ```

3. **Register Task Definition** (5 min)
   ```bash
   aws ecs register-task-definition \
     --cli-input-json file://services/api/ecs-task-definition.json
   ```

4. **Create ALB & Target Group** (5 min)
   ```bash
   aws elbv2 create-load-balancer \
     --name imbobi-api-alb \
     --subnets subnet-1 subnet-2 \
     --security-groups sg-alb

   aws elbv2 create-target-group \
     --name imbobi-api-tg \
     --protocol HTTP --port 4000 --vpc-id vpc-xxx
   ```

5. **Create ALB Listener** (2 min)
   ```bash
   aws elbv2 create-listener \
     --load-balancer-arn arn:aws:elasticloadbalancing:... \
     --protocol HTTP --port 80 \
     --default-actions Type=forward,TargetGroupArn=arn:...
   ```

6. **Create ECS Service** (10-15 min)
   ```bash
   aws ecs create-service \
     --cluster imbobi-production \
     --service-name imbobi-api \
     --task-definition imbobi-api:1 \
     --desired-count 2 \
     --launch-type FARGATE \
     --network-configuration awsvpcConfiguration={...} \
     --load-balancers targetGroupArn=arn:...
   ```

7. **Monitor Service Stabilization** (5-10 min)
   ```bash
   aws ecs wait services-stable \
     --cluster imbobi-production \
     --services imbobi-api
   ```

**Success Criteria:**
- ✅ ECS cluster running
- ✅ Task definition registered
- ✅ ALB created and healthy
- ✅ 2 ECS tasks running
- ✅ Service stable

---

### Phase 5: Health Checks & Verification (10 minutes)

**Prerequisites:** ECS service running

**Steps:**

1. **Check ECS Task Status** (2 min)
   ```bash
   aws ecs describe-services \
     --cluster imbobi-production \
     --services imbobi-api \
     --query 'services[0].[runningCount,desiredCount,deployments[0].status]'
   ```

2. **Check ALB Target Health** (2 min)
   ```bash
   aws elbv2 describe-target-health \
     --target-group-arn arn:...
   ```

3. **Test Health Endpoint** (3 min)
   ```bash
   ALB_DNS=$(aws elbv2 describe-load-balancers \
     --names imbobi-api-alb --query 'LoadBalancers[0].DNSName' -o text)

   curl http://$ALB_DNS:4000/api/v1/health
   # Expected: 200 OK with service status
   ```

4. **Check CloudWatch Logs** (2 min)
   ```bash
   aws logs tail /ecs/imbobi-api --follow
   # Look for successful startup messages
   ```

5. **Run Smoke Tests** (5 min)
   ```bash
   # Test health endpoint
   curl -I http://$ALB_DNS:4000/api/v1/health

   # Test CSRF endpoint
   curl -I http://$ALB_DNS:4000/api/v1/auth/csrf-token

   # Test public endpoint
   curl -I http://$ALB_DNS:4000/api/v1/public/info
   ```

**Success Criteria:**
- ✅ All 2 tasks running
- ✅ Target health: Healthy
- ✅ Health endpoint returning 200
- ✅ No error spikes in logs

---

### Phase 6: DNS Configuration (10 minutes)

**Prerequisites:** ALB created and stable

**Steps:**

1. **Get ALB DNS Name** (2 min)
   ```bash
   ALB_DNS=$(aws elbv2 describe-load-balancers \
     --names imbobi-api-alb \
     --query 'LoadBalancers[0].DNSName' -o text)
   echo $ALB_DNS
   ```

2. **Create Route53 Records** (5 min)
   ```bash
   # Create A record for api.imbobi.com pointing to ALB
   aws route53 change-resource-record-sets \
     --hosted-zone-id $ZONE_ID \
     --change-batch '{...}'
   ```

3. **Verify DNS Resolution** (3 min)
   ```bash
   nslookup api.imbobi.com
   # Should resolve to ALB IP
   ```

**Success Criteria:**
- ✅ DNS records created
- ✅ api.imbobi.com resolves correctly

---

### Phase 7: Vercel Web Deployment (15-20 minutes)

**Can be done in parallel with AWS setup**

**Steps:**

1. **Create Vercel Project** (5 min)
   - Go to https://vercel.com/dashboard
   - Create new project
   - Select GitHub repository: `alagami-site`
   - Set root directory: `apps/web`

2. **Configure Environment Variables** (2 min)
   ```
   NEXT_PUBLIC_API_URL=https://api.imbobi.com
   NEXT_PUBLIC_ENVIRONMENT=production
   ```

3. **Set Custom Domain** (5 min)
   - Add domain: `app.imbobi.com`
   - Update DNS records at registrar (if not Route53)

4. **Deploy** (5-10 min)
   - Push to `main` branch
   - Vercel automatically deploys
   - Monitor deployment in dashboard

5. **Verify Deployment** (3 min)
   ```bash
   curl -I https://app.imbobi.com
   # Should return 200 with web content
   ```

**Success Criteria:**
- ✅ Vercel project created
- ✅ Environment variables set
- ✅ Web app deployed successfully
- ✅ https://app.imbobi.com loads

---

### Phase 8: Monitoring & Alerts Setup (15-20 minutes)

**Steps:**

1. **Setup Sentry** (5 min)
   - Create project at https://sentry.io
   - Get DSN
   - Add to Secrets Manager

2. **Setup CloudWatch Alarms** (10 min)
   ```bash
   # High error rate alarm
   # High latency alarm
   # Database connection pool alarm
   # Disk usage alarm
   ```

3. **Setup SNS Notifications** (5 min)
   ```bash
   # Create SNS topic
   # Subscribe email addresses
   # Link to CloudWatch alarms
   ```

**Success Criteria:**
- ✅ Sentry project created
- ✅ Alarms configured
- ✅ Notifications tested

---

### Phase 9: Post-Deployment Smoke Tests (20-30 minutes)

**Run these tests to verify everything works:**

#### Test 1: API Health
```bash
curl https://api.imbobi.com/api/v1/health
# Expected: 200, with service status
```

#### Test 2: Web App Load
```bash
curl -I https://app.imbobi.com
# Expected: 200
```

#### Test 3: User Registration
```bash
curl -X POST https://api.imbobi.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
# Expected: 201 or 400 (if validation fails)
```

#### Test 4: CSRF Token
```bash
curl -X GET https://api.imbobi.com/api/v1/auth/csrf-token
# Expected: 200 with token
```

#### Test 5: Database
```bash
curl -X POST https://api.imbobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "..."}'
# Expected: 200 with JWT token
```

#### Test 6: Verify HTTPS
```bash
curl -I http://api.imbobi.com
# Expected: 301 redirect to HTTPS

curl -I https://api.imbobi.com
# Expected: 200 with HSTS header
```

**Success Criteria:**
- ✅ All smoke tests pass
- ✅ No unhandled errors
- ✅ HTTPS working
- ✅ Database accessible

---

## Deployment Rollback Plan

### If Critical Issues Occur

**Rollback Decision Criteria:**
- API completely down (health check failing for > 5 min)
- Error rate > 10% sustained
- Database corruption detected
- Critical user flows broken

**Rollback Steps (15-20 min):**

```bash
# 1. Stop API deployments
aws ecs update-service \
  --cluster imbobi-production \
  --service imbobi-api \
  --desired-count 0

# 2. Restore database from backup (if needed)
pg_restore -h $RDS_ENDPOINT -U $DB_USER -d imbobi_prod \
  backup_pre_migration_TIMESTAMP.sql

# 3. Rollback ECS to previous image
aws ecs update-service \
  --cluster imbobi-production \
  --service imbobi-api \
  --task-definition imbobi-api:0  # Previous version
  --desired-count 2

# 4. Verify health
curl https://api.imbobi.com/api/v1/health

# 5. Rollback Vercel
vercel rollback
```

---

## Post-Deployment Checklist

### Immediate (First Hour)

- [ ] API responds to health checks
- [ ] Web app loads without errors
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] No critical errors in Sentry
- [ ] CloudWatch logs monitored
- [ ] Team notified
- [ ] Status page updated

### 4-Hour Check

- [ ] Error rate stable
- [ ] Performance metrics normal
- [ ] User activity normal
- [ ] No memory leaks detected
- [ ] Queue processing working

### 24-Hour Check

- [ ] All systems stable
- [ ] No cascading failures
- [ ] Database backups verified
- [ ] Performance baseline established
- [ ] User feedback collected

---

## Estimated Timeline Summary

| Phase | Duration | Critical? |
|-------|----------|-----------|
| AWS Account Setup | 10 min | Yes |
| IAM & Security Groups | 15 min | Yes |
| RDS Setup | 20 min | Yes |
| ElastiCache Setup | 20 min | Yes |
| S3 & Secrets | 10 min | Yes |
| Docker Build & Push | 25 min | Yes |
| ECS Cluster & Services | 25 min | Yes |
| Health Checks | 10 min | Yes |
| DNS Configuration | 10 min | Yes |
| Vercel Deployment | 15 min | Yes |
| Monitoring Setup | 15 min | Yes |
| Smoke Tests | 20 min | Yes |
| **TOTAL** | **200-220 min** | ⏱️ |

**With parallelization (AWS + Vercel simultaneously):** 120-140 minutes

---

## Success Criteria

### Deployment is Successful if:

✅ **API Tier**
- ECS service running 2 tasks
- Health endpoint responding 200
- Database connected
- Redis cache working
- Error rate < 1%
- Response time p95 < 500ms

✅ **Web Tier**
- Next.js app deployed to Vercel
- All pages load without errors
- API connectivity working
- HTTPS enforced
- Performance acceptable

✅ **Database**
- All migrations applied
- Schema integrity verified
- Backup created
- Replication working (if applicable)

✅ **Monitoring**
- Sentry collecting errors
- CloudWatch logging active
- Alarms configured
- Notifications working

✅ **Security**
- HTTPS enforced
- CORS headers correct
- CSRF protection active
- No secrets in logs
- Rate limiting active

---

## Communication Plan

### Pre-Deployment (1 day before)
- [ ] Notify product team
- [ ] Alert customer support
- [ ] Update status page (if scheduled downtime)

### During Deployment
- [ ] Deployment engineer monitors continuously
- [ ] Updates shared in #deployments Slack channel
- [ ] Escalation contact on standby

### Post-Deployment
- [ ] Success announcement
- [ ] Health metrics shared
- [ ] Postmortem (if issues)

---

## Key Contacts & Resources

**Documentation:**
- PRODUCTION_DEPLOYMENT_LOG.md - Detailed execution log
- DEPLOYMENT_COMMANDS_REFERENCE.md - Ready-to-use AWS commands
- VERCEL_DEPLOYMENT_CHECKLIST.md - Vercel-specific steps
- scripts/deploy-production.sh - Automated deployment script

**Support:**
- AWS Support: https://console.aws.amazon.com/support
- Vercel Support: https://vercel.com/support
- Sentry: https://sentry.io

**Monitoring Dashboards:**
- AWS: https://console.aws.amazon.com/cloudwatch
- Vercel: https://vercel.com/dashboard
- Sentry: https://sentry.io/organizations/imbobi

---

## Next Steps After Deployment

1. **Setup Monitoring Dashboards**
   - CloudWatch custom dashboards
   - Grafana (optional)
   - Status page

2. **Establish On-Call Schedule**
   - Assign on-call engineer
   - Setup escalation procedures

3. **Document Runbooks**
   - API troubleshooting
   - Database recovery
   - Incident response

4. **Schedule Reviews**
   - 1-week deployment review
   - 1-month operational review
   - Quarterly infrastructure review

---

**Ready to Deploy!** ✅

All prerequisites met and documentation complete. Proceed with Phase 1 when ready.

For questions or issues, refer to the detailed logs and references above.

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-05-28  
**Status:** READY FOR EXECUTION
