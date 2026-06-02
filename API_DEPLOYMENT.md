# API Deployment Guide

## Overview
The imbobi API (NestJS + Fastify) can be deployed via multiple strategies:
1. **Docker + ECS** (Recommended for AWS)
2. **Local development** (Testing)
3. **EC2 + SSH** (Legacy - requires SSH key)

## Prerequisites
- Docker installed
- AWS CLI configured
- pnpm package manager
- Node.js 20+

## Deployment Options

### Option 1: AWS ECS/ECR Deployment (Recommended)

#### Setup
```bash
# Configure AWS credentials
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=sa-east-1

# Create ECR repository (if not exists)
aws ecr create-repository \
  --repository-name imbobi-api \
  --region ${AWS_REGION}
```

#### Deploy
```bash
# Deploy to production
./scripts/deploy-api-aws-lambda.sh production

# Deploy to staging
./scripts/deploy-api-aws-lambda.sh staging

# Custom environment
API_URL=https://api.custom.com ./scripts/deploy-api-aws-lambda.sh production
```

#### Verify Deployment
```bash
# Check health
curl https://api-production.imbobi.com.br/api/v1/health

# View logs
aws logs tail /aws/ecs/imbobi-api-production --follow
```

### Option 2: Local Development Deployment

#### Build & Start
```bash
# Quick start
./scripts/deploy-api-local.sh

# With custom port
./scripts/deploy-api-local.sh 3001

# With custom environment
ENVIRONMENT=staging ./scripts/deploy-api-local.sh
```

#### Available Endpoints
- Health check: `http://localhost:4000/api/v1/health`
- Liveness: `http://localhost:4000/api/v1/health/live`
- Readiness: `http://localhost:4000/api/v1/health/ready`
- Docs (dev only): `http://localhost:4000/docs`

### Option 3: Docker Build (Manual)

```bash
# Build production image
docker build -t imbobi-api:latest -f services/api/Dockerfile .

# Test locally
docker run -p 4000:4000 \
  -e NODE_ENV=development \
  -e JWT_SECRET=your-secret-key \
  -e DATABASE_URL=postgresql://... \
  imbobi-api:latest

# Tag and push to ECR
docker tag imbobi-api:latest $AWS_ACCOUNT_ID.dkr.ecr.sa-east-1.amazonaws.com/imbobi-api:latest
aws ecr get-login-password --region sa-east-1 | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.sa-east-1.amazonaws.com
docker push $AWS_ACCOUNT_ID.dkr.ecr.sa-east-1.amazonaws.com/imbobi-api:latest
```

## Environment Configuration

### Required Variables
```env
NODE_ENV=production
PORT=4000
JWT_SECRET=<64-char-random-string>
DATABASE_URL=postgresql://user:pass@host:5432/imobi
REDIS_URL=redis://host:6379
CORS_ORIGIN=https://web.imbobi.com.br,https://app.imbobi.com.br
```

### Optional Variables
```env
RELEASE_VERSION=1.0.0
LOG_LEVEL=info
SENTRY_DSN=https://...
AWS_REGION=sa-east-1
```

## Health Checks

The API implements K8s-style health checks:

### GET `/api/v1/health`
General health status
```json
{
  "status": "ok",
  "uptime": 1234.56
}
```

### GET `/api/v1/health/live`
Liveness probe (process alive?)
```json
{ "status": "ok" }
```

### GET `/api/v1/health/ready`
Readiness probe (ready to serve traffic?)
```json
{
  "status": "ready",
  "database": "connected",
  "redis": "connected"
}
```

## Monitoring

### CloudWatch Logs
```bash
# Follow logs
aws logs tail /aws/ecs/imbobi-api-production --follow

# Filter errors
aws logs filter-log-events \
  --log-group-name /aws/ecs/imbobi-api-production \
  --filter-pattern "ERROR"
```

### Container Health
```bash
# Check running tasks
aws ecs list-tasks --cluster imbobi-production --service-name imbobi-api-production

# View task details
aws ecs describe-tasks --cluster imbobi-production --tasks <task-arn>
```

## Rollback

```bash
# List service updates
aws ecs describe-services --cluster imbobi-production --services imbobi-api-production

# Force previous image
aws ecs update-service \
  --cluster imbobi-production \
  --service imbobi-api-production \
  --force-new-deployment

# Check status
aws ecs describe-services --cluster imbobi-production --services imbobi-api-production
```

## Database Migrations

Migrations run automatically on container startup via `CMD` in Dockerfile:

```bash
# Manual migration (if needed)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Create new migration
npx prisma migrate dev --name feature_name
```

## Troubleshooting

### API not responding
```bash
# Check container logs
aws logs tail /aws/ecs/imbobi-api-production --follow

# Check health status
curl -v https://api-production.imbobi.com.br/api/v1/health/ready

# Check task status
aws ecs describe-tasks --cluster imbobi-production --tasks <task-arn>
```

### Database connection issues
```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
npx prisma db execute --stdin < check-connection.sql

# Check RDS security group
aws ec2 describe-security-groups --group-ids sg-xxx
```

### Redis connection issues
```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Check ElastiCache cluster
aws elasticache describe-cache-clusters
```

## Performance Tuning

### Container Limits
```bash
# Current configuration in ECS task definition
{
  "memory": 512,          # MB
  "cpu": 256,             # CPU units (256 = 0.25 vCPU)
  "essential": true
}
```

### Auto Scaling
```bash
# Setup auto-scaling (if needed)
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/imbobi-production/imbobi-api-production \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10
```

## References
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [NestJS Deployment Guide](https://docs.nestjs.com/deployment)
- [Prisma Migrations](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate)
