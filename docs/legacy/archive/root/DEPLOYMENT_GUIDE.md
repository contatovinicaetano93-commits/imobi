# imobi — Deployment Guide
**Last Updated**: 2026-06-03  
**Audience**: DevOps, Backend Engineers, Release Managers

---

## Overview

This guide covers deployment for all imobi components across two environments:
- **Staging**: Render (free tier, currently live)
- **Production**: AWS (Phase 2, infrastructure ready)

---

## Current Stack (Staging - Render)

### Web Frontend
- **Platform**: Vercel
- **Auto-Deploy**: Yes (on `main` push)
- **Status**: ✅ Live at imobi.vercel.app
- **Build**: `pnpm build` in `apps/web`
- **Deployment Time**: 2-3 minutes
- **Health Check**: https://imobi.vercel.app

### Backend API
- **Platform**: Render
- **Service Type**: Web Service
- **Auto-Deploy**: Yes (on `main` push)
- **Status**: ✅ Live
- **Build**: `pnpm build` in `services/api`
- **Start Command**: `node dist/main.js`
- **Health Endpoint**: `GET /api/v1/health` (should return 200)
- **Deployment Time**: 5-7 minutes

### Database
- **Platform**: Render PostgreSQL
- **Status**: ✅ Live
- **Version**: PostgreSQL 14+
- **Extensions**: PostGIS enabled
- **Backups**: Daily automated
- **Connection**: Via `DATABASE_URL` environment variable
- **Scaling**: Read replicas available (Phase 2)

### Cache & Queues
- **Platform**: Render Redis
- **Status**: ✅ Live
- **Memory**: 256MB free tier
- **BullMQ**: Job processor active
- **Connection**: Via `REDIS_URL` environment variable
- **Persistence**: AOF enabled

### Storage
- **Platform**: AWS S3
- **Bucket**: `imobi-photos-prod`
- **Region**: `sa-east-1`
- **Status**: ✅ Live
- **Access**: Pre-signed URLs (secure)
- **Credentials**: In API `.env` file

---

## Staging Deployment (Current)

### Deploy Web Frontend (Vercel)

1. **Verify build locally**:
   ```bash
   cd /home/user/imobi/apps/web
   pnpm build
   pnpm start  # Test locally
   ```

2. **Commit & push to main**:
   ```bash
   git add .
   git commit -m "feat: deploy to staging"
   git push origin main
   ```

3. **Automatic deployment** (Vercel watches main):
   - Build triggers automatically
   - Runs `pnpm build` from workspace root
   - Deploys to imobi.vercel.app
   - Check status: https://vercel.com/dashboard

4. **Verify deployment**:
   ```bash
   curl https://imobi.vercel.app
   # Should return 200 with HTML content
   ```

### Deploy Backend API (Render)

1. **Verify build locally**:
   ```bash
   cd /home/user/imobi
   pnpm build
   node services/api/dist/main.js
   # Should start on port 4000 (or configured PORT)
   # Check: curl http://localhost:4000/api/v1/health
   ```

2. **Check environment variables** (Render Dashboard):
   ```
   DATABASE_URL=postgresql://user:pass@host:5432/imobi
   REDIS_URL=redis://default:pass@host:6379
   NODE_ENV=production
   JWT_SECRET=(generate random)
   API_URL=https://api.imobi.render.com
   CORS_ORIGIN=https://imobi.vercel.app
   SENTRY_DSN=(if configured)
   S3_ACCESS_KEY_ID=(AWS)
   S3_SECRET_ACCESS_KEY=(AWS)
   S3_BUCKET=imobi-photos-prod
   S3_REGION=sa-east-1
   ```

3. **Commit & push**:
   ```bash
   git add .
   git commit -m "feat: api update"
   git push origin main
   ```

4. **Automatic deployment** (Render watches main):
   - Build triggers automatically
   - Runs `npm run build` (configurable)
   - Deploys to Render
   - Check Render Dashboard for logs

5. **Verify API health**:
   ```bash
   curl https://api.imobi.render.com/api/v1/health
   # Should return: {"status":"ok"}
   ```

6. **Run migrations** (if needed):
   ```bash
   # SSH into Render and run:
   DATABASE_URL=$DATABASE_URL npx prisma migrate deploy
   ```

### Deploy Database (Render PostgreSQL)

Render PostgreSQL is managed—**no manual deployment needed**.

**If migrations pending**:
```bash
cd /home/user/imobi
DATABASE_URL="postgresql://user:pass@host/imobi" \
  npx prisma migrate deploy
```

**To reset staging (dev only)**:
```bash
cd /home/user/imobi
DATABASE_URL="postgresql://user:pass@host/imobi" \
  npx prisma migrate reset
```

### Deploy Cache (Render Redis)

Redis is managed—**no deployment needed**.

**If manual intervention needed**:
```bash
# Test connection
redis-cli -u $REDIS_URL PING
# Should return: PONG

# Check memory
redis-cli -u $REDIS_URL INFO memory
```

### Deploy Storage (AWS S3)

S3 bucket is pre-created—**no deployment needed**.

**If bucket doesn't exist**:
```bash
aws s3api create-bucket \
  --bucket imobi-photos-prod \
  --region sa-east-1 \
  --create-bucket-configuration LocationConstraint=sa-east-1
```

---

## Production Deployment (Phase 2 - AWS)

### Prerequisites

Before deploying to AWS production:

1. **AWS Account Setup**
   ```bash
   aws configure
   export AWS_REGION=sa-east-1
   aws sts get-caller-identity  # Verify credentials
   ```

2. **Terraform Initialized**
   ```bash
   cd /home/user/imobi/terraform
   terraform init
   terraform plan
   # Review changes before applying
   ```

3. **SSL Certificate (AWS Certificate Manager)**
   ```bash
   aws acm request-certificate \
     --domain-name imobi.com.br \
     --domain-name "*.imobi.com.br" \
     --region sa-east-1
   ```

4. **Health Endpoint Live**
   ```bash
   # Local test
   npm start  # services/api
   curl http://localhost:4000/api/v1/health
   # Should return: {"status":"ok"}
   ```

5. **Secrets in AWS Secrets Manager**
   ```bash
   aws secretsmanager create-secret \
     --name imobi/production \
     --secret-string '{
       "DATABASE_URL":"postgresql://...",
       "REDIS_URL":"redis://...",
       "JWT_SECRET":"...",
       "S3_ACCESS_KEY_ID":"...",
       "S3_SECRET_ACCESS_KEY":"..."
     }'
   ```

### Deploy RDS PostgreSQL

```bash
cd /home/user/imobi/terraform

# Review database config
cat main.tf | grep -A 10 "resource.*aws_db_instance"

# Deploy
terraform apply -target=aws_db_instance.imobi_postgres

# Verify
aws rds describe-db-instances \
  --db-instance-identifier imobi-postgres \
  --region sa-east-1

# Run migrations
DATABASE_URL="$(aws secretsmanager get-secret-value \
  --secret-id imobi/production \
  --query SecretString \
  --output text | jq -r .DATABASE_URL)" \
  npx prisma migrate deploy
```

### Deploy ElastiCache Redis

```bash
cd /home/user/imobi/terraform

# Deploy Redis
terraform apply -target=aws_elasticache_cluster.imobi_redis

# Verify
aws elasticache describe-cache-clusters \
  --cache-cluster-id imobi-redis \
  --region sa-east-1

# Test connection
redis-cli -h $(aws elasticache describe-cache-clusters \
  --cache-cluster-id imobi-redis \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Address' \
  --output text) PING
# Should return: PONG
```

### Deploy API (ECS Fargate or EC2)

```bash
cd /home/user/imobi

# 1. Build Docker image
docker build -f services/api/Dockerfile \
  -t imobi-api:latest .

# 2. Push to ECR
aws ecr get-login-password --region sa-east-1 | \
  docker login --username AWS --password-stdin \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.sa-east-1.amazonaws.com

docker tag imobi-api:latest \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.sa-east-1.amazonaws.com/imobi-api:latest

docker push \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.sa-east-1.amazonaws.com/imobi-api:latest

# 3. Deploy via Terraform
cd /home/user/imobi/terraform
terraform apply -target=aws_ecs_task_definition.api
terraform apply -target=aws_ecs_service.api

# 4. Verify
aws ecs describe-services \
  --cluster imobi-prod \
  --services api \
  --region sa-east-1

# 5. Test health endpoint
curl https://api.imobi.com/api/v1/health
# Should return: {"status":"ok"}
```

### Deploy Web Frontend (Vercel - No Change)

Vercel deployment remains unchanged:
```bash
# Auto-deploys on main push
# No AWS changes needed
```

---

## Rollback Procedure

### Rollback Vercel (Web)
```bash
# Via Vercel Dashboard:
# 1. Go to https://vercel.com/dashboard/imobi
# 2. Select "Deployments"
# 3. Click on previous successful deployment
# 4. Click "Promote to Production"
# Takes 1-2 minutes
```

### Rollback Render (API - Staging)
```bash
# Via Render Dashboard:
# 1. Go to https://dashboard.render.com
# 2. Select API service
# 3. Under "Deploys", select previous version
# 4. Click "Redeploy"
# Takes 5-7 minutes
```

### Rollback AWS (Production)
```bash
# Option 1: Re-deploy previous image
aws ecs update-service \
  --cluster imobi-prod \
  --service api \
  --force-new-deployment \
  --region sa-east-1

# Option 2: Use Terraform to rollback
cd /home/user/imobi/terraform
git checkout HEAD~1  # Go to previous version
terraform apply
```

---

## Monitoring & Health Checks

### Health Endpoints
```bash
# API
curl -s https://api.imobi.com/api/v1/health | jq

# Web (Vercel)
curl -s https://imobi.vercel.app -w "%{http_code}"
```

### View Logs

**Render (Staging)**:
- Dashboard: https://dashboard.render.com
- Click service → "Logs" tab
- Filter by date/severity

**AWS CloudWatch (Production)**:
```bash
aws logs tail /ecs/imobi-api --follow --region sa-east-1
```

**Vercel (Web)**:
- Dashboard: https://vercel.com/dashboard
- Click deployment → "Logs" tab

### Alerts & Notifications

**Set up CloudWatch alarm**:
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name imobi-api-health \
  --alarm-description "Alert if API unhealthy" \
  --metric-name HealthCheckStatus \
  --namespace AWS/ECS \
  --statistic Average \
  --period 60 \
  --threshold 0 \
  --comparison-operator LessThanOrEqualToThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:sa-east-1:ACCOUNT:alerts
```

---

## Scaling Strategy

### Web Frontend (Vercel)
- Auto-scales automatically
- No manual configuration needed
- Edge caching via Vercel CDN

### API Backend
- **Staging (Render)**: Single instance, no auto-scaling
- **Production (AWS)**:
  - ECS auto-scaling: Min 2, Max 10 instances
  - Scale based on CPU >70% or memory >80%
  - Target: <100ms response time (p99)

### Database
- **Staging (Render)**: Single shared instance
- **Production (AWS RDS)**:
  - Read replicas for scaling
  - Enhanced monitoring via CloudWatch
  - Automated backups to S3

### Cache
- **Staging (Render)**: 256MB free tier
- **Production (AWS)**:
  - cache.t3.small (1GB minimum)
  - Multi-AZ for high availability
  - AOF persistence enabled

---

## Environment Variables Checklist

### Web (Vercel)
```
NEXT_PUBLIC_API_URL=https://api.imobi.com
NEXT_PUBLIC_SENTRY_DSN=(if enabled)
```

### API (Render/AWS)
```
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=(random 32+ char string)
JWT_REFRESH_SECRET=(random 32+ char string)
CORS_ORIGIN=https://imobi.vercel.app,https://imobi.com.br
API_URL=https://api.imobi.com
S3_BUCKET=imobi-photos-prod
S3_REGION=sa-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
SENTRY_DSN=(optional)
```

### Database (Render/RDS)
```
Auto-configured via managed service
Or set DATABASE_URL environment variable
```

### Cache (Render/ElastiCache)
```
Auto-configured via managed service
Or set REDIS_URL environment variable
```

---

## Troubleshooting

### API Not Responding
```bash
# 1. Check health endpoint
curl https://api.imobi.com/api/v1/health -v

# 2. Check logs
aws logs tail /ecs/imobi-api --follow --region sa-east-1

# 3. Check resource usage
aws ecs describe-tasks \
  --cluster imobi-prod \
  --tasks $(aws ecs list-tasks --cluster imobi-prod --service-name api --query taskArns[0] --output text) \
  --region sa-east-1

# 4. Restart service
aws ecs update-service \
  --cluster imobi-prod \
  --service api \
  --force-new-deployment \
  --region sa-east-1
```

### Database Connection Failed
```bash
# 1. Verify security group
aws ec2 describe-security-groups --filter Name=group-name,Values=imobi-db-sg

# 2. Test RDS connectivity
psql -h imobi-postgres.c123.us-east-1.rds.amazonaws.com \
  -U postgres -d imobi -c "SELECT version();"

# 3. Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier imobi-postgres \
  --query 'DBInstances[0].DBInstanceStatus'
```

### Cache Not Working
```bash
# 1. Test Redis connection
redis-cli -u $REDIS_URL PING

# 2. Check memory usage
redis-cli -u $REDIS_URL INFO memory

# 3. Check BullMQ queue
redis-cli -u $REDIS_URL HGETALL bull:liberacao-parcela:*
```

---

## Phase 2 Migration Checklist

- [ ] AWS account configured & validated
- [ ] RDS PostgreSQL deployed & migrated
- [ ] ElastiCache Redis deployed & tested
- [ ] ECS cluster created & running
- [ ] API task definition updated
- [ ] Load balancer configured & health checks passing
- [ ] Route53 DNS pointing to ALB
- [ ] SSL certificate installed (ACM)
- [ ] CloudWatch alarms configured
- [ ] Backup strategy validated
- [ ] Performance baseline established
- [ ] 24-hour smoke tests passed
- [ ] Team trained on Phase 2 infrastructure

---

**Last Updated**: 2026-06-03  
**Maintained By**: contato.vinicaetano93@gmail.com
