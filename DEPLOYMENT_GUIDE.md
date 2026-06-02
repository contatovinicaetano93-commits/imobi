# AWS Staging Deployment Guide

## Current Status

### ✅ Infrastructure Created
- **RDS PostgreSQL**: `imobi-staging-db.cwt648skaa2x.us-east-1.rds.amazonaws.com:5432`
- **ElastiCache Redis**: `imobi-staging-redis.a942pl.0001.use1.cache.amazonaws.com:6379`
- **ECS Cluster**: `imobi-staging-cluster` (FARGATE)
- **S3 Bucket**: `imobi-staging-storage-047556738507`
- **ECR Repositories**: 
  - `047556738507.dkr.ecr.us-east-1.amazonaws.com/imobi-api-staging`
  - `047556738507.dkr.ecr.us-east-1.amazonaws.com/imobi-web-staging`

### 📋 Configuration
Environment variables file: `.env.staging` (ready)

---

## Phase 1: Local Database Migrations

### Prerequisites
- Local Docker (for database connectivity during migrations)
- Node.js/pnpm
- AWS credentials configured (already done)

### Steps

1. **Copy environment to API folder:**
   ```bash
   cp .env.staging services/api/.env
   ```

2. **Run database migrations:**
   ```bash
   pnpm db:migrate
   ```
   
   This will:
   - Create database schema
   - Run all Prisma migrations (5 existing migrations)
   - Verify database connectivity
   
3. **Verify migrations:**
   ```bash
   pnpm db:verify  # If script exists
   # Or check manually in AWS RDS Console
   ```

---

## Phase 2: Push Docker Images to ECR

### Option A: From Your Local Machine (Recommended)

1. **Configure AWS credentials:**
   ```bash
   aws configure
   # Access Key: [See .env.staging or vini_notes.txt]
   # Secret Key: [See .env.staging or vini_notes.txt]
   # Region: us-east-1
   ```

2. **Login to ECR:**
   ```bash
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin \
     047556738507.dkr.ecr.us-east-1.amazonaws.com
   ```

3. **Build and push API:**
   ```bash
   docker build -t imobi-api-staging:latest -f services/api/Dockerfile .
   docker tag imobi-api-staging:latest \
     047556738507.dkr.ecr.us-east-1.amazonaws.com/imobi-api-staging:latest
   docker push 047556738507.dkr.ecr.us-east-1.amazonaws.com/imobi-api-staging:latest
   ```

4. **Build and push Web:**
   ```bash
   docker build \
     -t imobi-web-staging:latest \
     --build-arg NEXT_PUBLIC_API_URL=https://api.staging.imbobi.com/api/v1 \
     -f apps/web/Dockerfile .
   docker tag imobi-web-staging:latest \
     047556738507.dkr.ecr.us-east-1.amazonaws.com/imobi-web-staging:latest
   docker push 047556738507.dkr.ecr.us-east-1.amazonaws.com/imobi-web-staging:latest
   ```

### Option B: Via AWS CodeBuild (Cloud-based)
- Use `buildspec.yml` already created
- Requires GitHub source connection
- Takes longer but no local Docker needed

---

## Phase 3: Deploy to ECS

### Create ECS Task Definition

```bash
# Create task definition for API
aws ecs register-task-definition \
  --family imobi-api-staging \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 256 \
  --memory 512 \
  --container-definitions file://task-def-api.json
```

### Create ECS Service

```bash
aws ecs create-service \
  --cluster imobi-staging-cluster \
  --service-name imobi-api-staging \
  --task-definition imobi-api-staging:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --load-balancers targetGroupArn=arn:...,containerName=imobi-api,containerPort=4000
```

### Deploy Web

Similar process for web application

---

## Environment Variables

All credentials and endpoints are in `.env.staging`:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@imobi-staging-db.cwt648skaa2x.us-east-1.rds.amazonaws.com:5432/imobi_staging
REDIS_HOST=imobi-staging-redis.a942pl.0001.use1.cache.amazonaws.com
AWS_S3_BUCKET=imobi-staging-storage-047556738507
JWT_SECRET=[GENERATED]
ENCRYPTION_KEY=[GENERATED]
```

---

## Monitoring & Health Checks

After deployment:

1. **Check ECS service:**
   ```bash
   aws ecs describe-services \
     --cluster imobi-staging-cluster \
     --services imobi-api-staging
   ```

2. **Check CloudWatch logs:**
   ```bash
   aws logs tail /ecs/imobi-api-staging --follow
   ```

3. **Health endpoint:**
   ```bash
   curl https://api.staging.imbobi.com/api/v1/health
   ```

---

## Rollback

If deployment fails:

1. **Update service with previous task definition:**
   ```bash
   aws ecs update-service \
     --cluster imobi-staging-cluster \
     --service imobi-api-staging \
     --task-definition imobi-api-staging:PREVIOUS_REVISION
   ```

2. **Check service events:**
   ```bash
   aws ecs describe-services \
     --cluster imobi-staging-cluster \
     --services imobi-api-staging \
     --query 'services[0].events'
   ```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| RDS connection failed | Check security groups allow ECS subnet |
| Redis timeout | Verify ElastiCache security group |
| Image not found in ECR | Verify docker push completed successfully |
| ECS task failing to start | Check CloudWatch logs for error details |
| API returning 503 | Ensure database migrations completed |

---

## Next Steps

1. ✅ AWS Infrastructure: **DONE**
2. ⏳ Run local migrations: **YOU HERE** (run on your machine)
3. ⏳ Push Docker images: **Local or CodeBuild**
4. ⏳ Deploy to ECS: **Use AWS_ECS_DEPLOY.sh**
5. ⏳ Verify health: **Monitor CloudWatch**
