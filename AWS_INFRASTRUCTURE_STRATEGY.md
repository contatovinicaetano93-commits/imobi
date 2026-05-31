# ☁️ AWS Infrastructure Strategy

**Date:** 31 de Maio de 2026  
**Status:** Recommended Alternative to Vercel/Railway  
**Cost Estimate:** ~$50-150/month vs ~$7-10/month on Railway

---

## Executive Summary

Your current deployment (Vercel + Railway) is **optimized for speed and simplicity**. However, for **enterprise centralization**, AWS provides:

✅ **Unified billing** — Single AWS account  
✅ **Company governance** — IAM roles, compliance controls  
✅ **Cost optimization** — Reserved instances, spot pricing  
✅ **Advanced monitoring** — CloudWatch, X-Ray  
✅ **Better integration** — AWS services ecosystem  

**Trade-off:** Slightly more complex setup, more maintenance overhead

---

## AWS Architecture (vs Current)

### Current Setup (Vercel + Railway)
```
┌─────────────────────────────────────┐
│  Frontend (Vercel)                  │
│  - Next.js hosting                  │
│  - Auto-scaling                     │
│  - $0/month                         │
└──────────────┬──────────────────────┘
               │ API calls
┌──────────────▼──────────────────────┐
│  Backend (Railway)                  │
│  - NestJS API                       │
│  - PostgreSQL                       │
│  - Redis cache                      │
│  - $7-10/month                      │
└─────────────────────────────────────┘
```

### Recommended AWS Setup
```
┌─────────────────────────────────────┐
│  Frontend (AWS)                     │
│  - S3 bucket                        │
│  - CloudFront CDN                   │
│  - Route 53 DNS                     │
│  - ~$10-20/month                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Backend (AWS ECS/EC2)              │
│  - Container service                │
│  - Auto-scaling                     │
│  - ~$40-100/month                   │
├──────────────┬──────────────────────┤
│  RDS PostgreSQL                     │
│  - Managed database                 │
│  - Automated backups                │
│  - ~$30-50/month                    │
├──────────────┬──────────────────────┤
│  ElastiCache (Redis)                │
│  - Managed cache                    │
│  - High availability                │
│  - ~$20-40/month                    │
├──────────────┬──────────────────────┤
│  CloudWatch                         │
│  - Monitoring & logs                │
│  - ~$5-10/month                     │
└─────────────────────────────────────┘
```

---

## Complete AWS Migration Guide

### Phase 1: Frontend (S3 + CloudFront)

**Replace:** Vercel  
**AWS Services:** S3, CloudFront, Route 53

#### Step 1: Create S3 Bucket

```bash
# Create bucket for frontend
aws s3 mb s3://seu-projeto-frontend-prod

# Enable static website hosting
aws s3 website s3://seu-projeto-frontend-prod \
  --index-document index.html \
  --error-document 404.html
```

#### Step 2: Build & Deploy

```bash
# Build Next.js
pnpm build --filter @imbobi/web

# Deploy to S3
aws s3 sync apps/web/.next/static s3://seu-projeto-frontend-prod/static --delete

# Deploy public files
aws s3 sync apps/web/public s3://seu-projeto-frontend-prod/ --delete
```

#### Step 3: Create CloudFront Distribution

```bash
# Via AWS Console:
1. CloudFront → Create Distribution
2. Origin domain: seu-projeto-frontend-prod.s3.amazonaws.com
3. Default cache behavior: Allow all HTTP methods
4. Cache policy: Managed-CachingOptimized
5. Viewer protocol: Redirect HTTP to HTTPS
6. Custom domain: seu-dominio.com
```

#### Step 4: Setup Route 53 DNS

```bash
# Create hosted zone (if not exists)
aws route53 create-hosted-zone \
  --name seu-dominio.com \
  --caller-reference $(date +%s)

# Add alias record to CloudFront
aws route53 change-resource-record-sets \
  --hosted-zone-id ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "seu-dominio.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z2FDTNDATAQYW2",
          "DNSName": "distribution.cloudfront.net",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

**Cost:** ~$10-20/month

---

### Phase 2: Backend (ECS or EC2)

**Replace:** Railway NestJS  
**Options:** AWS ECS (recommended) or EC2

#### Option A: ECS (Elastic Container Service) - Recommended

**Advantages:**
- Auto-scaling
- Load balancing
- Managed service (less ops)
- Pay per usage

```bash
# 1. Create ECR (Elastic Container Registry)
aws ecr create-repository --repository-name imobi-api

# 2. Build Docker image
docker build -t imobi-api:latest .

# 3. Tag for ECR
docker tag imobi-api:latest \
  ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/imobi-api:latest

# 4. Push to ECR
aws ecr get-login-password --region REGION | \
  docker login --username AWS --password-stdin \
  ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com

docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/imobi-api:latest

# 5. Create ECS Cluster
aws ecs create-cluster --cluster-name imobi-production

# 6. Create Task Definition
# (Use AWS Console for easier setup)
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json

# 7. Create Service
aws ecs create-service \
  --cluster imobi-production \
  --service-name imobi-api \
  --task-definition imobi-api:1 \
  --desired-count 2 \
  --launch-type FARGATE
```

**Cost:** ~$40-100/month

#### Option B: EC2 (If you need more control)

```bash
# 1. Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c94855ba95c574c8 \
  --instance-type t3.medium \
  --key-name seu-key \
  --security-groups imobi-api

# 2. Connect & deploy
ssh -i seu-key.pem ec2-user@instance-ip
git clone repo
pnpm install && pnpm build
pm2 start dist/main.js --name imobi-api
```

**Cost:** ~$30-60/month (t3.medium)

---

### Phase 3: Database (RDS PostgreSQL)

**Replace:** Railway PostgreSQL  
**AWS Service:** RDS

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier imobi-db-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.6 \
  --master-username postgres \
  --master-user-password 'YOUR_SECURE_PASSWORD' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --backup-retention-period 30 \
  --multi-az \
  --publicly-accessible false

# Wait ~10 minutes for creation
# Get endpoint
aws rds describe-db-instances \
  --db-instance-identifier imobi-db-prod \
  --query 'DBInstances[0].Endpoint'

# Update .env with new DATABASE_URL
DATABASE_URL=postgresql://postgres:PASSWORD@endpoint:5432/imobi

# Run migrations
pnpm db:migrate
```

**Features:**
- ✅ Automated daily backups (30-day retention)
- ✅ Multi-AZ for high availability
- ✅ Automated patching
- ✅ Performance insights
- ✅ Point-in-time recovery

**Cost:** ~$30-50/month

---

### Phase 4: Cache (ElastiCache Redis)

**Replace:** Railway Redis  
**AWS Service:** ElastiCache

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id imobi-redis-prod \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --automatic-failover-enabled

# For high availability (recommended):
aws elasticache create-replication-group \
  --replication-group-id imobi-redis-prod \
  --replication-group-description "imobi Redis cache" \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-clusters 2 \
  --automatic-failover-enabled true

# Get endpoint
aws elasticache describe-replication-groups \
  --replication-group-id imobi-redis-prod \
  --query 'ReplicationGroups[0].PrimaryEndpoint'

# Update REDIS_HOST and REDIS_PORT in .env
```

**Cost:** ~$20-40/month

---

### Phase 5: Monitoring & Logging (CloudWatch)

**Replace:** Sentry + New Relic  
**AWS Services:** CloudWatch, CloudWatch Logs, X-Ray

```bash
# 1. Setup CloudWatch agent on EC2/ECS
# (Automatic with ECS + CloudWatch Container Insights)

# 2. Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name imobi-production \
  --dashboard-body file://dashboard.json

# 3. Setup alarms
aws cloudwatch put-metric-alarm \
  --alarm-name imobi-api-cpu-high \
  --alarm-description "Alert if API CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:region:account:topic

# 4. Setup log groups
aws logs create-log-group --log-group-name /imobi/api
aws logs create-log-stream \
  --log-group-name /imobi/api \
  --log-stream-name production
```

**Cost:** ~$5-10/month

---

## Tools You're Missing (AWS Alternatives)

| Service | Current | AWS Alternative | Cost Impact |
|---------|---------|------------------|-------------|
| **Email** | None | AWS SES | Free for first 62K/mo |
| **SMS** | None | AWS SNS | $0.00645 per SMS |
| **File Storage** | None | AWS S3 | $0.023 per GB |
| **Async Jobs** | BullMQ on Redis | AWS SQS | $0.40 per M requests |
| **Scheduled Tasks** | Node cron | AWS EventBridge | $0.10 per rule |
| **Secrets Manager** | .env files | AWS Secrets Manager | $0.40 per secret |
| **VPN/Networking** | None | AWS VPC | Included |

---

## Migration Checklist

```
PREPARATION:
├─ [ ] Create AWS account with company email
├─ [ ] Setup IAM roles (dev, prod, readonly)
├─ [ ] Enable billing alerts
├─ [ ] Request AWS credits (startup program)
└─ [ ] Review AWS pricing calculator

MIGRATION:
├─ [ ] Phase 1: Frontend (S3 + CloudFront)
├─ [ ] Phase 2: Backend (ECS or EC2)
├─ [ ] Phase 3: Database (RDS)
├─ [ ] Phase 4: Cache (ElastiCache)
├─ [ ] Phase 5: Monitoring (CloudWatch)
├─ [ ] Phase 6: Networking (VPC setup)
└─ [ ] Phase 7: CI/CD (GitHub Actions → CodePipeline)

CUTOVER:
├─ [ ] Test all flows in staging
├─ [ ] Plan downtime window
├─ [ ] Update DNS records
├─ [ ] Monitor for errors
└─ [ ] Decommission old infrastructure

POST-MIGRATION:
├─ [ ] Verify backups working
├─ [ ] Test disaster recovery
├─ [ ] Optimize costs (Reserved Instances)
├─ [ ] Setup additional monitoring
└─ [ ] Update runbooks
```

---

## Cost Comparison

### Current Setup (Vercel + Railway)
```
Vercel Frontend:  $0/month (free tier)
Railway API:      $7/month
Railway Postgres: Included
Railway Redis:    Included
─────────────────
Total:            ~$7-10/month
```

### AWS Setup
```
S3 + CloudFront:  $10-20/month
ECS Fargate:      $40-100/month
RDS PostgreSQL:   $30-50/month
ElastiCache:      $20-40/month
CloudWatch:       $5-10/month
Miscellaneous:    $10-20/month
─────────────────
Total:            ~$115-240/month
```

**But with:**
- ✅ Unified billing & governance
- ✅ Reserved Instances (40-50% discount)
- ✅ Spot instances for non-critical
- ✅ Free tier coverage for first 12 months

**Could reduce to:** ~$60-100/month

---

## Recommendation

### Current Strategy is CORRECT for:
- ✅ **Speed to market** (30 min deployment)
- ✅ **Minimal ops overhead** (auto-scaling out of box)
- ✅ **Cost efficiency** (only pay for what you use)
- ✅ **Startup mentality** (focus on product, not infrastructure)

### Switch to AWS When:
- 🔄 Company wants centralized infrastructure
- 🔄 Scale exceeds simple solutions
- 🔄 Need advanced compliance (HIPAA, SOC2)
- 🔄 Want cost optimization at scale
- 🔄 Have dedicated DevOps team

---

## Hybrid Approach (Recommended for Your Situation)

**Best of both worlds:**

```
Production:   AWS (governance + performance)
Staging:      Railway (test changes safely)
Development:  Local + GitHub Actions (CI)

Benefits:
✅ Test AWS changes safely in staging
✅ Company controls production
✅ Fast dev cycle
✅ Minimal migration risk
```

---

## Next Steps

1. **If keeping Vercel + Railway:** Continue with current deployment (optimal now)
2. **If moving to AWS:** Start with frontend (S3 + CloudFront) as least-risky change
3. **If hybrid:** Setup Railway staging + AWS production

---

**Status:** Ready for AWS migration when company is ready  
**Estimated effort:** 40-80 hours (one engineer, 1-2 weeks)  
**Risk level:** Medium (proper staging can mitigate)

