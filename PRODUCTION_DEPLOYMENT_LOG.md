# PRODUCTION DEPLOYMENT LOG — imbobi
## Execution Date: 2026-05-28

---

## DEPLOYMENT SUMMARY

**Deployment ID:** PROD-2026-05-28-001  
**Release Version:** v1.0.0-production  
**Deployment Window:** 2026-05-28 10:00 UTC - 12:00 UTC  
**Estimated Duration:** 120 minutes

### Team
- **Deployment Engineer:** Claude Code (Automated)
- **QA Engineer:** Validation System
- **On-call Engineer:** TBD
- **Product Owner:** TBD

---

## PHASE 1: PRE-DEPLOYMENT VALIDATION (10:00-10:30 UTC)

### 1.1 Code Quality Checks

✅ **Git Status Verification**
```
Branch: claude/nifty-davinci-ZyCGx
Status: clean (no uncommitted changes)
Last Commit: Deployment preparation
```

✅ **Project Structure Validated**
- Root: Turborepo + pnpm workspace
- Services:
  - `services/api` - NestJS API (Fastify)
  - `apps/web` - Next.js 14 (App Router)
  - `apps/mobile` - Expo 51 + Expo Router
- Packages:
  - `packages/schemas` - Zod validation
  - `packages/core` - Shared utilities
  - `packages/ui` - Component library

✅ **Version Management**
- No production version tags yet created
- Ready to create: v1.0.0

### 1.2 Environment Configuration Validation

**Configuration Status:**
```
✅ .env.example exists with safe placeholder values
✅ .env.staging deployed and validated
✅ Production env vars checklist prepared
❌ Production .env not yet created (pending AWS setup)
```

**Required Environment Variables for Production:**

API Service (`services/api`):
```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://[USER:PASS]@[RDS_HOST]:5432/imbobi_prod?sslmode=require
DATABASE_POOL_SIZE=20
JWT_SECRET=[64+ chars, cryptographically random]
JWT_REFRESH_SECRET=[64+ chars, cryptographically random]
JWT_EXPIRATION=900
JWT_REFRESH_EXPIRATION=604800
ENCRYPTION_SECRET=[32+ chars, cryptographically random]
REDIS_HOST=[ELASTICACHE_ENDPOINT]
REDIS_PORT=6379
REDIS_DB=0
CORS_ORIGIN=https://app.imbobi.com,https://www.imbobi.com
SENDGRID_API_KEY=SG.[YOUR_KEY]
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=[FROM_IAM]
AWS_SECRET_ACCESS_KEY=[FROM_IAM]
S3_BUCKET=imbobi-evidencias-prod
FIREBASE_PROJECT_ID=imbobi-production
FIREBASE_PRIVATE_KEY=[FROM_SERVICE_ACCOUNT]
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@imbobi-production.iam.gserviceaccount.com
SENTRY_DSN=https://[KEY]@sentry.io/[PROJECT_ID]
LOG_LEVEL=info
```

Web Application (`apps/web`):
```
NEXT_PUBLIC_API_URL=https://api.imbobi.com
NEXT_PUBLIC_ENVIRONMENT=production
```

### 1.3 Database Readiness

**Pre-Migration State:**
```
✅ Prisma schema validated (packages/core + services/api)
✅ Migration files present and reviewed
⏳ Production RDS instance: PENDING AWS SETUP
⏳ Database backup strategy: PENDING AWS SETUP
```

**Migration Strategy:**
1. Create RDS PostgreSQL instance with PostGIS extension
2. Run pre-migration backup
3. Execute: `DATABASE_URL="..." pnpm db:migrate:deploy`
4. Verify schema integrity
5. Create baseline backup post-migration

### 1.4 Infrastructure Readiness Checklist

#### AWS Infrastructure (PENDING SETUP)

**ECR Repository for API:**
- [ ] Repository created: `imbobi-api`
- [ ] Image scanning enabled
- [ ] Lifecycle policy: keep last 10 images
- Status: ⏳ NEEDS AWS SETUP

**RDS PostgreSQL (Production):**
- [ ] Instance class: db.r6i.large (recommended for production)
- [ ] Multi-AZ enabled: YES
- [ ] Engine: PostgreSQL 15
- [ ] Storage: 100GB (gp3), auto-scaling to 500GB
- [ ] Backup retention: 30 days
- [ ] Preferred backup window: 03:00-04:00 UTC
- [ ] Security group: Restricted to ECS cluster
- [ ] SSL/TLS enforced: YES (required in connection string)
- [ ] Parameter groups: utf8 collation, connection pooling optimized
- Status: ⏳ NEEDS AWS SETUP

**ElastiCache Redis:**
- [ ] Node type: cache.r6g.large
- [ ] Engine: Redis 7.x
- [ ] Cluster mode: Disabled (for BullMQ compatibility)
- [ ] Automatic failover: Enabled
- [ ] Multi-AZ: Enabled
- [ ] Encryption at rest: Enabled
- [ ] Encryption in transit: Enabled
- [ ] Subnet group: Production VPC
- [ ] Security group: Restricted to ECS cluster
- Status: ⏳ NEEDS AWS SETUP

**ECS Cluster & Task Definition:**
- [ ] Cluster name: `imbobi-production`
- [ ] Launch type: Fargate (serverless)
- [ ] Task definition family: `imbobi-api`
- [ ] CPU: 512, Memory: 1024 (adjustable)
- [ ] Container image: `[ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/imbobi-api:v1.0.0`
- [ ] Port mappings: Container 4000 → ALB 80/443
- [ ] Log group: `/ecs/imbobi-api`
- [ ] CloudWatch logs retention: 30 days
- Status: ⏳ NEEDS AWS SETUP

**Application Load Balancer:**
- [ ] ALB Name: `imbobi-api-alb`
- [ ] Scheme: Internet-facing
- [ ] Subnets: Multi-AZ (us-east-1a, us-east-1b)
- [ ] Security group: Allow 80 → 443, 443 → 4000
- [ ] Target group: `imbobi-api-tg`
- [ ] Health check path: `/api/v1/health`
- [ ] Health check interval: 30 seconds
- [ ] Healthy threshold: 2
- [ ] Unhealthy threshold: 3
- Status: ⏳ NEEDS AWS SETUP

**IAM Roles & Policies:**
- [ ] ECS Task Execution Role created
  - Permissions: ECR pull, CloudWatch Logs, Secrets Manager
- [ ] ECS Task Role created
  - Permissions: S3 put/get, SES send, Secrets Manager read
  - S3 policy restricted to: `arn:aws:s3:::imbobi-evidencias-prod/*`
- [ ] Access key rotation enabled
- Status: ⏳ NEEDS AWS SETUP

**Security Groups:**
- [ ] ALB SG: 80 (HTTP), 443 (HTTPS) from 0.0.0.0/0
- [ ] ECS SG: 4000 (App) from ALB SG, 443 (HTTPS out) to 0.0.0.0/0
- [ ] RDS SG: 5432 (PostgreSQL) from ECS SG only
- [ ] Redis SG: 6379 (Redis) from ECS SG only
- Status: ⏳ NEEDS AWS SETUP

#### Vercel Setup (Web Application)

**Vercel Project Configuration:**
- [ ] Project linked to GitHub: `https://github.com/[ORG]/alagami-site`
- [ ] Root directory: `apps/web`
- [ ] Build command: `pnpm build`
- [ ] Start command: `pnpm start`
- [ ] Node.js version: 20.x
- Status: ⏳ NEEDS VERCEL SETUP

**Environment Variables (Vercel):**
- [ ] `NEXT_PUBLIC_API_URL=https://api.imbobi.com`
- [ ] `NEXT_PUBLIC_ENVIRONMENT=production`
- Status: ⏳ NEEDS VERCEL SETUP

**Custom Domain:**
- [ ] Domain: `app.imbobi.com`
- [ ] DNS configured: CNAME → vercel-deployment
- [ ] SSL certificate: Auto-generated by Vercel (Let's Encrypt)
- Status: ⏳ NEEDS VERCEL SETUP

**Preview Deployments:**
- [ ] Enabled for: `main`, `staging`, release branches
- [ ] Preview URLs: `[branch]-alagami.vercel.app`
- Status: ⏳ NEEDS VERCEL SETUP

### 1.5 Monitoring & Observability

**Sentry Configuration:**
- [ ] Project created: `imbobi-production`
- [ ] DSN configured in API env vars
- [ ] Web SDK configured in Next.js
- [ ] Error tracking active
- [ ] Performance monitoring enabled (10% sampling)
- Status: ⏳ NEEDS SENTRY SETUP

**CloudWatch Monitoring:**
- [ ] Log group created: `/ecs/imbobi-api`
- [ ] Custom metrics configured
  - [ ] API request count
  - [ ] API latency (p50, p95, p99)
  - [ ] Database connection pool usage
  - [ ] Redis latency
  - [ ] Queue depth (BullMQ jobs)
- [ ] Alarms created:
  - [ ] High error rate (>5% for 5 min)
  - [ ] High latency (p95 > 2s for 5 min)
  - [ ] Database connection pool > 90%
  - [ ] Disk usage > 85%
  - [ ] Memory usage > 80%
- Status: ⏳ NEEDS CLOUDWATCH SETUP

**Prometheus & Grafana:**
- [ ] Prometheus scrape targets configured for ECS
- [ ] Grafana dashboards created:
  - [ ] API Performance
  - [ ] Database Health
  - [ ] Redis Cache
  - [ ] Queue Processing
- Status: ⏳ OPTIONAL FOR PHASE 1

**Log Aggregation:**
- [ ] CloudWatch Logs configured
- [ ] Log retention: 30 days
- [ ] Structured logging (JSON format) in API
- Status: ⏳ NEEDS CLOUDWATCH SETUP

### 1.6 DNS & SSL/TLS

**DNS Configuration:**
- [ ] Domain registrar: [TBD]
- [ ] API domain: `api.imbobi.com`
  - [ ] A record → ALB DNS: [ALB_ENDPOINT]
- [ ] Web domain: `app.imbobi.com`
  - [ ] CNAME record → Vercel: `cname.vercel-dns.com`
- [ ] www subdomain: `www.imbobi.com` → `app.imbobi.com`
- Status: ⏳ NEEDS DNS SETUP

**SSL/TLS Certificates:**
- [ ] ALB: Self-managed or AWS Certificate Manager
  - [ ] Certificate for: `api.imbobi.com`
  - [ ] Renewal: Auto (ACM) or manual (pre-expiry)
- [ ] Vercel: Auto-managed (Let's Encrypt)
  - [ ] Certificate for: `app.imbobi.com`, `www.imbobi.com`
- [ ] HSTS enabled: 31536000 seconds (1 year)
- Status: ⏳ NEEDS SSL SETUP

---

## PHASE 2: AWS INFRASTRUCTURE SETUP (10:30-11:15 UTC)

### 2.1 ECR Repository Creation

**Command:**
```bash
aws ecr create-repository \
  --repository-name imbobi-api \
  --region us-east-1 \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256
```

**Status:** ⏳ AWAITING EXECUTION

**Post-Creation Steps:**
1. Enable image scanning
2. Set lifecycle policy
3. Build and push Docker image

### 2.2 RDS PostgreSQL Instance

**Command:**
```bash
aws rds create-db-instance \
  --db-instance-identifier imbobi-prod-db \
  --db-instance-class db.r6i.large \
  --engine postgres \
  --engine-version 15.3 \
  --master-username imbobi_admin \
  --master-user-password '[STRONG_PASSWORD]' \
  --allocated-storage 100 \
  --storage-type gp3 \
  --iops 3000 \
  --multi-az \
  --storage-encrypted \
  --backup-retention-period 30 \
  --preferred-backup-window 03:00-04:00 \
  --publicly-accessible false \
  --enable-cloudwatch-logs-exports postgresql
```

**Status:** ⏳ AWAITING EXECUTION

**Post-Creation Steps:**
1. Wait for instance availability (10-15 min)
2. Create PostGIS extension
3. Configure security groups
4. Run migrations

### 2.3 ElastiCache Redis

**Command:**
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id imbobi-prod-redis \
  --cache-node-type cache.r6g.large \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token '[STRONG_TOKEN]'
```

**Status:** ⏳ AWAITING EXECUTION

### 2.4 ECS Cluster & Task Definition

**Create Cluster:**
```bash
aws ecs create-cluster \
  --cluster-name imbobi-production \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=100
```

**Register Task Definition:** (See `/services/api/docker/ecs-task-definition.json`)
```bash
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json
```

**Status:** ⏳ AWAITING EXECUTION

### 2.5 Application Load Balancer

**Create ALB:**
```bash
aws elbv2 create-load-balancer \
  --name imbobi-api-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx \
  --scheme internet-facing
```

**Create Target Group:**
```bash
aws elbv2 create-target-group \
  --name imbobi-api-tg \
  --protocol HTTP \
  --port 4000 \
  --vpc-id vpc-xxx \
  --health-check-enabled \
  --health-check-path /api/v1/health \
  --health-check-interval-seconds 30
```

**Status:** ⏳ AWAITING EXECUTION

### 2.6 IAM Roles & Policies

**ECS Task Execution Role:**
```bash
aws iam create-role \
  --role-name ecsTaskExecutionRole-imbobi \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Attach policies
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole-imbobi \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole-imbobi \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess
```

**ECS Task Role:**
```bash
aws iam create-role \
  --role-name ecsTaskRole-imbobi \
  --assume-role-policy-document '{...}'

# S3 Policy
aws iam put-role-policy \
  --role-name ecsTaskRole-imbobi \
  --policy-name S3Access \
  --policy-document '{...}'
```

**Status:** ⏳ AWAITING EXECUTION

---

## PHASE 3: DOCKER IMAGE BUILD & PUSH (11:15-11:30 UTC)

### 3.1 Build Docker Image

**From `/services/api` directory:**
```bash
docker build -t imbobi-api:v1.0.0 \
  --build-arg NODE_ENV=production \
  -f Dockerfile .
```

**Status:** ⏳ AWAITING EXECUTION

### 3.2 Push to ECR

```bash
# Authenticate
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com

# Tag
docker tag imbobi-api:v1.0.0 \
  [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/imbobi-api:v1.0.0

docker tag imbobi-api:v1.0.0 \
  [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/imbobi-api:latest

# Push
docker push [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/imbobi-api:v1.0.0
docker push [ACCOUNT_ID].dkr.ecr.us-east-1.amazonaws.com/imbobi-api:latest
```

**Status:** ⏳ AWAITING EXECUTION

---

## PHASE 4: DATABASE MIGRATIONS (11:30-11:45 UTC)

### 4.1 Pre-Migration Backup

```bash
# Create backup
pg_dump \
  --host=[RDS_ENDPOINT] \
  --username=imbobi_admin \
  --dbname=imbobi_prod \
  --verbose \
  > backup_prod_20260528_113000.sql

# Verify backup
ls -lh backup_prod_*.sql
file backup_prod_*.sql
```

**Status:** ⏳ AWAITING EXECUTION

### 4.2 Run Migrations

```bash
DATABASE_URL="postgresql://imbobi_admin:[PASS]@[RDS_ENDPOINT]:5432/imbobi_prod?sslmode=require" \
  pnpm db:migrate:deploy
```

**Expected Output:**
```
✓ Migrating: ...
✓ [N/N] Done in Xms
```

**Status:** ⏳ AWAITING EXECUTION

### 4.3 Post-Migration Validation

```bash
# Verify database connectivity
psql "postgresql://imbobi_admin:[PASS]@[RDS_ENDPOINT]:5432/imbobi_prod?sslmode=require" \
  -c "SELECT version();"

# Verify tables exist
psql "postgresql://imbobi_admin:[PASS]@[RDS_ENDPOINT]:5432/imbobi_prod?sslmode=require" \
  -c "\dt"

# Verify indexes exist
psql "postgresql://imbobi_admin:[PASS]@[RDS_ENDPOINT]:5432/imbobi_prod?sslmode=require" \
  -c "\di"

# Count users (should be empty for fresh prod)
psql "postgresql://imbobi_admin:[PASS]@[RDS_ENDPOINT]:5432/imbobi_prod?sslmode=require" \
  -c "SELECT COUNT(*) FROM usuario;"
```

**Status:** ⏳ AWAITING EXECUTION

---

## PHASE 5: API DEPLOYMENT (11:45-12:00 UTC)

### 5.1 Create ECS Service

```bash
aws ecs create-service \
  --cluster imbobi-production \
  --service-name imbobi-api \
  --task-definition imbobi-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:xxx:targetgroup/imbobi-api-tg/xxx,containerName=imbobi-api,containerPort=4000
```

**Status:** ⏳ AWAITING EXECUTION

### 5.2 Health Check

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster imbobi-production \
  --services imbobi-api

# Wait for desired count = running count
# Monitor CloudWatch logs
aws logs tail /ecs/imbobi-api --follow
```

**Expected Status:**
- Desired count: 2
- Running count: 2
- Health status: HEALTHY

**Status:** ⏳ AWAITING EXECUTION

### 5.3 ALB Health Verification

```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:xxx:targetgroup/imbobi-api-tg/xxx

# Test API endpoint
curl -I https://api.imbobi.com/api/v1/health
```

**Expected Response:**
```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "healthy",
  "timestamp": "2026-05-28T12:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

**Status:** ⏳ AWAITING EXECUTION

---

## PHASE 6: WEB APPLICATION DEPLOYMENT (Parallel with Phase 5)

### 6.1 Vercel Setup

**Link Repository:**
```bash
# In apps/web directory
vercel link
```

**Configure Environment:**
- Root directory: `apps/web`
- Build command: `pnpm build`
- Install command: `pnpm install`
- Framework: Next.js

**Status:** ⏳ AWAITING EXECUTION

### 6.2 Deploy to Vercel

```bash
vercel deploy --prod
```

**Expected Output:**
```
✅ Production URL: https://app.imbobi.com
```

**Status:** ⏳ AWAITING EXECUTION

### 6.3 Web App Verification

```bash
# Test landing page
curl -I https://app.imbobi.com

# Verify API connectivity (check browser console)
curl -I https://api.imbobi.com/api/v1/health
```

**Status:** ⏳ AWAITING EXECUTION

---

## PHASE 7: DNS & SSL CONFIGURATION (11:45-12:00 UTC)

### 7.1 Update DNS Records

**For API (`api.imbobi.com`):**
```
Type: A
Name: api
Value: [ALB_ELASTIC_IP or CNAME]
TTL: 300
```

**For Web (`app.imbobi.com`):**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
TTL: 3600
```

**For Root (`imbobi.com`):**
```
Type: A
Name: @
Value: [WWW_IP or redirect to app.imbobi.com]
TTL: 300
```

**Status:** ⏳ AWAITING EXECUTION

### 7.2 SSL Certificate Validation

```bash
# Check ALB certificate
aws elbv2 describe-listeners \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:xxx:loadbalancer/app/imbobi-api-alb/xxx

# Test HTTPS
curl -I https://api.imbobi.com/api/v1/health
curl -I https://app.imbobi.com
```

**Expected:**
```
HTTP/1.1 200 OK
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Status:** ⏳ AWAITING EXECUTION

---

## PHASE 8: SECRETS MANAGEMENT (11:00-11:30 UTC)

### 8.1 AWS Secrets Manager Setup

**Create Secret:**
```bash
aws secretsmanager create-secret \
  --name imbobi-api/production \
  --description "Production API secrets for imbobi" \
  --secret-string '{
    "DATABASE_URL": "postgresql://...",
    "JWT_SECRET": "...",
    "JWT_REFRESH_SECRET": "...",
    "ENCRYPTION_SECRET": "...",
    "REDIS_PASSWORD": "...",
    "SENDGRID_API_KEY": "...",
    "AWS_ACCESS_KEY_ID": "...",
    "AWS_SECRET_ACCESS_KEY": "...",
    "FIREBASE_PRIVATE_KEY": "..."
  }'
```

**Status:** ⏳ AWAITING EXECUTION

### 8.2 ECS Task Definition Secrets Integration

Update task definition to reference secrets:
```json
{
  "environment": [
    {"name": "LOG_LEVEL", "value": "info"}
  ],
  "secrets": [
    {"name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:..."},
    {"name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:..."}
  ]
}
```

**Status:** ⏳ AWAITING EXECUTION

### 8.3 Verify No Secrets in Logs

```bash
# Check CloudWatch logs for secrets
aws logs filter-log-events \
  --log-group-name /ecs/imbobi-api \
  --filter-pattern "DATABASE_URL OR JWT_SECRET OR ENCRYPTION_SECRET"

# Should return: No matches
```

**Status:** ⏳ AWAITING EXECUTION

---

## PHASE 9: MONITORING & ALERTING SETUP (11:15-11:45 UTC)

### 9.1 Sentry Configuration

**Project Setup:**
```bash
# Create project at https://sentry.io/organizations/[ORG]/projects/
# Project name: imbobi-production
# Platform: Node.js
# Release tracking: Enabled
```

**DSN Configuration:**
```
SENTRY_DSN=https://[KEY]@o[ORG].ingest.sentry.io/[PROJECT_ID]
```

**Status:** ⏳ AWAITING EXECUTION

### 9.2 CloudWatch Alarms

**High Error Rate Alarm:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name imbobi-api-high-error-rate \
  --alarm-description "Alert when API error rate > 5%" \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --statistic Sum \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:xxx:imbobi-alerts
```

**High Latency Alarm:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name imbobi-api-high-latency \
  --alarm-description "Alert when API p95 latency > 2s" \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --statistic Average \
  --period 300 \
  --threshold 2.0 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

**Database Connection Pool Alarm:**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name imbobi-db-connection-pool-high \
  --alarm-description "Alert when DB connection pool > 90%" \
  --namespace Custom/Database \
  --metric-name ConnectionPoolUtilization \
  --statistic Average \
  --period 300 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

**Status:** ⏳ AWAITING EXECUTION

### 9.3 SNS Topic for Alerts

```bash
aws sns create-topic --name imbobi-alerts

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:xxx:imbobi-alerts \
  --protocol email \
  --notification-endpoint ops-team@imbobi.com
```

**Status:** ⏳ AWAITING EXECUTION

---

## PHASE 10: SMOKE TESTS (Post-Deployment)

### 10.1 Critical User Flows

#### Flow 1: User Signup
```bash
# 1. Register user
curl -X POST https://api.imbobi.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePassword123!",
    "name": "Test User",
    "phone": "+5511999999999"
  }'

# Expected: 201 Created, email verification sent

# 2. Verify email (simulate clicking link)
curl -X POST https://api.imbobi.com/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "[FROM_EMAIL]"}'

# Expected: 200 OK

# 3. Login
curl -X POST https://api.imbobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePassword123!"
  }'

# Expected: 200 OK, JWT token in response
```

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

#### Flow 2: User Authentication & Dashboard Access
```bash
# 1. Login
TOKEN=$(curl -X POST https://api.imbobi.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.access_token')

# 2. Get user profile
curl -X GET https://api.imbobi.com/api/v1/usuario/me \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK, user data returned
```

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

#### Flow 3: File Upload to S3
```bash
# 1. Get CSRF token
CSRF=$(curl -X GET https://api.imbobi.com/api/v1/auth/csrf-token | jq -r '.token')

# 2. Upload file
curl -X POST https://api.imbobi.com/api/v1/evidencias/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF" \
  -F "file=@/path/to/test.jpg" \
  -F "type=photo"

# Expected: 200 OK, file URL returned
```

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

#### Flow 4: Redis Cache & BullMQ Queue
```bash
# 1. Test cache (internal)
# Verify repeated API calls are faster

# 2. Test queue (internal)
# Check BullMQ dashboard or logs for processed jobs
redis-cli -h [REDIS_HOST] INFO stats | grep total_commands_processed
```

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

#### Flow 5: CORS & CSRF Protection
```bash
# 1. Test CORS
curl -X OPTIONS https://api.imbobi.com/api/v1/health \
  -H "Origin: https://app.imbobi.com" \
  -v

# Expected: 200 OK with Access-Control-Allow-Origin header

# 2. Test CSRF (should reject POST without token)
curl -X POST https://api.imbobi.com/api/v1/auth/logout \
  -H "Content-Type: application/json"

# Expected: 403 Forbidden
```

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

### 10.2 Health Check Endpoints

```bash
# API Health
curl https://api.imbobi.com/api/v1/health
# Expected: 200 OK

# Database Status
curl https://api.imbobi.com/api/v1/health | jq '.services.database'
# Expected: "connected"

# Redis Status
curl https://api.imbobi.com/api/v1/health | jq '.services.redis'
# Expected: "connected"
```

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

### 10.3 API Endpoints Sample

```bash
# Public endpoint (no auth required)
curl https://api.imbobi.com/api/v1/public/info
# Expected: 200 OK

# Protected endpoint (requires JWT)
curl -H "Authorization: Bearer $TOKEN" https://api.imbobi.com/api/v1/usuario/me
# Expected: 200 OK

# Rate limiting test
for i in {1..20}; do curl https://api.imbobi.com/api/v1/public/info; sleep 0.1; done
# Expected: Some requests return 429 (rate limited)
```

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

---

## PHASE 11: PRODUCTION VALIDATION (Post-Deployment)

### 11.1 Error Rate Monitoring (First Hour)

**Expected Metrics:**
- Overall error rate: < 1%
- 5XX errors: < 0.1%
- Authentication errors: < 1%
- Validation errors: < 5%

**Monitoring Command:**
```bash
# Check Sentry dashboard
# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name HTTPCode_Target_5XX_Count \
  --start-time 2026-05-28T12:00:00Z \
  --end-time 2026-05-28T13:00:00Z \
  --period 300 \
  --statistics Sum

# Check logs
aws logs filter-log-events \
  --log-group-name /ecs/imbobi-api \
  --filter-pattern "ERROR" \
  --start-time 1716900000000
```

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

### 11.2 Performance Metrics (First Hour)

**Expected Baselines:**
- API response time (p95): < 500ms
- API response time (p99): < 1000ms
- Database query time: < 100ms
- Redis latency: < 10ms
- CPU usage: < 70%
- Memory usage: < 80%

**Monitoring Commands:**
```bash
# Get ALB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --start-time 2026-05-28T12:00:00Z \
  --end-time 2026-05-28T13:00:00Z \
  --period 60 \
  --statistics Average,Maximum

# Get ECS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=imbobi-api Name=ClusterName,Value=imbobi-production \
  --start-time 2026-05-28T12:00:00Z \
  --end-time 2026-05-28T13:00:00Z \
  --period 60 \
  --statistics Average
```

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

### 11.3 User Activity Monitoring

**Expected Activity:**
- New signups: Baseline activity
- Active users: Normal engagement
- No spike in support tickets
- Authentication success rate: > 99%

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

### 11.4 External Service Integration

**Verify All Services:**
- [ ] SendGrid: Email queue processing
- [ ] AWS S3: File uploads working
- [ ] Firebase Cloud Messaging: Push notifications
- [ ] DNS: All records resolving
- [ ] SSL: Certificates valid

**Commands:**
```bash
# Check SendGrid queue
curl -X GET https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY"

# Test S3 access
aws s3 ls s3://imbobi-evidencias-prod/

# Verify DNS
dig api.imbobi.com
dig app.imbobi.com
nslookup imbobi.com

# Check SSL
openssl s_client -connect api.imbobi.com:443 -showcerts
openssl s_client -connect app.imbobi.com:443 -showcerts
```

**Status:** ⏳ AWAITING EXECUTION
**Result:** PENDING

---

## PHASE 12: 24-HOUR POST-DEPLOYMENT VALIDATION

### 12.1 System Stability

**Checklist:**
- [ ] No memory leaks (memory usage stable)
- [ ] No cascading failures
- [ ] Database connection pool healthy
- [ ] Redis cache working efficiently
- [ ] Queue depth normalized
- [ ] Error rate trending toward baseline

**24-Hour Metrics:**
```
Error Rate: _____ % (expected: < 1%)
Avg Response Time: _____ ms (expected: < 500ms)
Database Queries: _____ ops/sec
Redis Hit Rate: _____ % (expected: > 50%)
User Signups: _____ (compare to baseline)
Active Users: _____ (compare to baseline)
```

**Status:** ⏳ AWAITING 24-HOUR CHECK

### 12.2 Data Integrity

**Verification:**
- [ ] No data corruption detected
- [ ] User records intact
- [ ] File references valid
- [ ] Transaction logs complete
- [ ] Backup created post-deployment

**Commands:**
```bash
# Verify data integrity
psql $DATABASE_URL -c "
  SELECT COUNT(*) as usuario_count FROM usuario;
  SELECT COUNT(*) as evidencia_count FROM evidencia;
  SELECT COUNT(*) as transacao_count FROM transacao;
"

# Verify no orphaned records
psql $DATABASE_URL -c "
  SELECT * FROM evidencia e
  WHERE NOT EXISTS (SELECT 1 FROM usuario u WHERE u.id = e.usuario_id);
"
```

**Status:** ⏳ AWAITING 24-HOUR CHECK

---

## ROLLBACK PLAN (If Needed)

### Rollback Criteria

Immediately rollback if:
- [ ] API health check failing for > 5 minutes
- [ ] Error rate > 10% sustained
- [ ] Database unavailable or corrupted
- [ ] Critical user flows failing (signup, login)
- [ ] Data loss detected

### Rollback Procedure

**Step 1: Stop Current Deployment**
```bash
# Scale down ECS service to 0
aws ecs update-service \
  --cluster imbobi-production \
  --service imbobi-api \
  --desired-count 0
```

**Step 2: Restore from Backup (if needed)**
```bash
# Stop application writes
# Restore database
pg_restore \
  --host=[RDS_ENDPOINT] \
  --username=imbobi_admin \
  --dbname=imbobi_prod \
  --clean \
  backup_prod_20260528_113000.sql

# Verify restore
psql "postgresql://..." -c "SELECT COUNT(*) FROM usuario;"
```

**Step 3: Revert to Previous Version**
```bash
# Update ECS service with previous image
aws ecs update-service \
  --cluster imbobi-production \
  --service imbobi-api \
  --force-new-deployment \
  --task-definition imbobi-api:0  # Previous version
```

**Step 4: Verify Health**
```bash
curl https://api.imbobi.com/api/v1/health
# Should return 200 OK
```

**Step 5: Notify Stakeholders**
- [ ] Incident channel notification
- [ ] Status page update
- [ ] Customer notification (if applicable)
- [ ] Postmortem scheduled

**Step 6: Web Rollback**
```bash
# Vercel automatic rollback
vercel rollback
```

**Status:** CONTINGENCY PLAN READY

---

## DEPLOYMENT SIGN-OFF

### Pre-Deployment Approval
- [ ] Code review complete
- [ ] Security audit passed
- [ ] All tests passing
- [ ] Infrastructure ready
- [ ] Monitoring configured
- [ ] Team briefed

**Approved By:** _____________________  
**Date/Time:** _____________________

### Deployment Execution
- [ ] All phases completed
- [ ] Smoke tests passed
- [ ] Health checks OK
- [ ] Monitoring active
- [ ] Team standing by

**Executed By:** Claude Code (Automated)  
**Start Time:** 2026-05-28 10:00 UTC  
**End Time:** _____ (PENDING)  
**Total Duration:** _____ minutes  
**Downtime:** _____ seconds

### Post-Deployment Sign-Off
- [ ] All services healthy
- [ ] Error rate normal
- [ ] Performance within baseline
- [ ] User activity normal
- [ ] On-call engineer accepting ownership

**Signed By:** _____________________  
**Date/Time:** _____________________

---

## NOTES & ISSUES

### Critical Issues
(None identified at this stage)

### Minor Issues
(None identified at this stage)

### Lessons Learned
(To be documented after 24-hour validation)

### Future Improvements
1. Implement blue-green deployment strategy
2. Add automated smoke test suite
3. Implement circuit breaker pattern
4. Add database query performance monitoring
5. Implement feature flags for safer rollouts

---

## APPENDIX: INFRASTRUCTURE DIAGRAMS

### Architecture Overview
```
┌─────────────────────────────────────────────────────┐
│                   USERS / INTERNET                   │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────┴────────────┐
          │                       │
    ┌─────▼──────┐        ┌──────▼─────┐
    │  Vercel    │        │   AWS ALB  │
    │ (app.io)   │        │ (api.io)   │
    └─────┬──────┘        └──────┬─────┘
          │                      │
    ┌─────▼──────────────────────▼────┐
    │   Next.js Web App               │
    │   (Vercel Serverless Functions) │
    └────────┬───────────────────────┘
             │
             └─────────────────────────────┐
                                           │
                                    ┌──────▼──────────┐
                                    │  ECS Cluster    │
                                    │  (2x Fargate)   │
                                    │  NestJS API     │
                                    └──────┬──────┬──┘
                      ┌────────────────────┘      │
                      │                           │
            ┌─────────▼──────────┐     ┌──────────▼────┐
            │  RDS PostgreSQL    │     │  ElastiCache  │
            │  + PostGIS         │     │  Redis        │
            │  (Multi-AZ)        │     │  (Multi-AZ)   │
            └────────────────────┘     └───────────────┘
```

### Network Topology
```
Public Subnets (AZ-A, AZ-B)
├── ALB (api.imbobi.com)
└── NAT Gateway

Private Subnets (AZ-A, AZ-B)
├── ECS Tasks (NestJS API)
├── RDS instance
└── ElastiCache node

Vercel (Globally Distributed CDN)
├── Edge locations worldwide
└── Serverless functions
```

### Data Flow
```
1. User Request → Vercel CDN → Next.js App
2. Browser → API Endpoint → AWS ALB
3. ALB → ECS Task (NestJS)
4. NestJS → PostgreSQL (RDS)
5. NestJS → Redis (ElastiCache)
6. NestJS → S3 (File uploads)
7. NestJS → SendGrid (Emails)
8. Metrics → CloudWatch/Sentry
```

---

## CONTACT & ESCALATION

**Deployment Engineer:**  
Name: Claude Code  
Role: Automated Deployment System  
Status: ACTIVE

**On-Call Engineer:**  
Name: TBD  
Phone: TBD  
Slack: @on-call

**Incident Channel:**  
Slack: #incidents

**Status Page:**  
https://status.imbobi.com

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-28  
**Next Review:** 2026-06-04
