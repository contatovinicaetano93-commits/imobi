# AWS Phase 2 - ECS Fargate Deployment

## Quick Summary

Phase 2 automates deployment of imobi-api to AWS using **ECS Fargate**, eliminating the need for EC2 instance management. The setup includes:

- **Container Registry:** ECR for Docker images
- **Orchestration:** ECS Fargate (serverless containers)
- **Load Balancing:** Application Load Balancer (ALB)
- **Monitoring:** CloudWatch Logs + Alarms + Dashboard
- **Auto-Scaling:** CPU/Memory-based scaling (2-4 replicas)

## Architecture Diagram

```
Internet (HTTP/HTTPS)
    ↓
Application Load Balancer (imobi-api-alb)
    ↓
Target Group (Port 4000)
    ↓
ECS Service (imobi-api-service)
    ├─ Task 1 (imobi-api)
    ├─ Task 2 (imobi-api)
    └─ Task 3+ (auto-scaling)
    ↓
RDS PostgreSQL (Phase 1)
ElastiCache Redis (Phase 1)
S3 Storage (Phase 1)
```

## Files in This Directory

| File | Purpose |
|------|---------|
| `ecr.tf` | ECR repository, lifecycle policy, security |
| `ecs.tf` | ECS cluster, service, task definition, auto-scaling |
| `alb.tf` | Application Load Balancer, target groups, listeners |
| `cloudwatch.tf` | Logging, metrics, alarms, dashboard, SNS |
| `variables.tf` | Variable declarations with defaults |
| `versions.tf` | Terraform and provider requirements |
| `terraform.tfvars.example` | Example variable values |
| `DEPLOYMENT_GUIDE.md` | Step-by-step deployment instructions |
| `README.md` | This file |

## Key Features

### ECR (Elastic Container Registry)
- Stores Docker images for imobi-api
- Image scanning enabled (CVE detection)
- Lifecycle policy keeps 10 latest images
- Immutable tags prevent accidental overwrites

### ECS Fargate
- Serverless container platform (no EC2 management)
- 2 tasks minimum (high availability)
- Auto-scales to 4 tasks based on CPU/Memory
- Health checks every 30 seconds
- Automatic recovery of failed tasks

### Application Load Balancer
- Distributes traffic to ECS tasks
- Health checks on `/api/v1/health`
- Supports both HTTP (80) and HTTPS (443)
- Connection draining (30s graceful shutdown)

### CloudWatch Monitoring
- Centralized logging from all ECS tasks
- Pre-configured alarms for:
  - High CPU (> 80%)
  - High Memory (> 85%)
  - High error count (> 10/5min)
  - Unhealthy targets
  - High response time (> 1s)
- Email alerts via SNS
- Interactive dashboard

### Auto-Scaling
- Scales up when CPU > 70% or Memory > 80%
- Scales down when utilization drops
- Minimum 2 tasks, maximum 4 tasks
- Cooldown periods prevent thrashing

## Quick Start

### 1. Prerequisites
```bash
# Ensure Phase 1 is deployed
aws rds describe-db-instances --db-instance-identifier imobi-db
aws elasticache describe-cache-clusters --cache-cluster-id imobi-redis
```

### 2. Configure Variables
```bash
cp terraform.tfvars.example terraform.tfvars
# Edit with your RDS credentials and alert email
nano terraform.tfvars
```

### 3. Deploy
```bash
terraform init
terraform plan -out=phase2.tfplan
terraform apply phase2.tfplan
```

### 4. Verify
```bash
# Get ALB DNS name
terraform output alb_dns_name

# Test API
curl http://$(terraform output -raw alb_dns_name)/api/v1/health
```

## Environment Variables

ECS tasks receive these environment variables:

| Variable | Source | Example |
|----------|--------|---------|
| `NODE_ENV` | Terraform | `staging` |
| `PORT` | Terraform | `4000` |
| `AWS_REGION` | Terraform | `us-east-1` |
| `DATABASE_URL` | Terraform + RDS | From Phase 1 |
| `REDIS_URL` | Terraform + ElastiCache | From Phase 1 |
| `AWS_SECRETS_NAME` | Terraform | `imobi/staging` |
| `CORS_ORIGIN` | Terraform | From tfvars |

Sensitive variables (DB password) are in `terraform.tfvars` (git-ignored).

## Networking

### VPC Setup (from Phase 1)
- VPC CIDR: `10.0.0.0/16`
- Private subnets for ECS tasks
- Public subnets for ALB
- NAT Gateway for outbound internet access

### Security Groups
- **ALB:** Allows 80/443 from anywhere (0.0.0.0/0)
- **ECS Tasks:** Allows 4000 from ALB only
- **RDS:** Allows 5432 from ECS only
- **ElastiCache:** Allows 6379 from ECS only

## Health Checks

The API exposes a health endpoint:

```
GET /api/v1/health
HTTP/1.1 200 OK
{
  "status": "ok",
  "timestamp": "2026-06-02T12:00:00Z"
}
```

ECS checks this every 30 seconds. If 3 consecutive checks fail, the task is marked unhealthy and replaced.

## Scaling Behavior

### Automatic Scaling Rules

**Scale Up When:**
- CPU Utilization > 70% for 2 minutes
- Memory Utilization > 80% for 2 minutes

**Scale Down When:**
- Both CPU < 40% and Memory < 40% for 5 minutes
- Cooldown period of 300 seconds

**Limits:**
- Minimum: 2 tasks
- Maximum: 4 tasks

### Manual Scaling

```bash
aws ecs update-service \
  --cluster imobi-prod \
  --service imobi-api-service \
  --desired-count 3
```

## Cost Breakdown

| Service | Monthly Cost | Notes |
|---------|------------|-------|
| ECS Fargate (2 tasks, 256 CPU, 512 MB) | ~$20-25 | Hourly billing |
| ALB | ~$16 | Fixed cost + per LCU |
| CloudWatch Logs | ~$5-8 | 7-day retention, 2 tasks |
| Data Transfer | ~$2-4 | Minimal egress |
| **Total** | **~$45-60** | Scales with task count |

To reduce costs:
- Use 1 task instead of 2 (lower HA)
- Reduce log retention (default 7 days)
- Smaller task size (256 CPU, 256 MB memory)

## Logs Access

### CloudWatch Console
1. AWS Console → CloudWatch → Logs → Log Groups
2. Select `/ecs/imobi-api`
3. View streams from each task

### AWS CLI
```bash
# View logs (last 100 lines)
aws logs tail /ecs/imobi-api --follow

# View specific time range
aws logs filter-log-events \
  --log-group-name /ecs/imobi-api \
  --start-time $(date -d "1 hour ago" +%s)000 \
  --end-time $(date +%s)000
```

## Troubleshooting

### Tasks Not Starting

**Check task definition:**
```bash
aws ecs describe-task-definition --task-definition imobi-api
```

**Check service events:**
```bash
aws ecs describe-services \
  --cluster imobi-prod \
  --services imobi-api-service | jq '.services[0].events'
```

**View logs:**
```bash
aws logs tail /ecs/imobi-api --follow
```

### Health Check Failures

**Check target health:**
```bash
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw target_group_arn)
```

**Test health endpoint directly:**
```bash
# SSH into ECS task and test
curl http://localhost:4000/api/v1/health
```

### High Memory Usage

**Check logs for errors:**
```bash
aws logs filter-log-events \
  --log-group-name /ecs/imobi-api \
  --filter-pattern "ERROR|error|Exception"
```

**Increase task memory:**
```bash
terraform apply -var="ecs_task_memory=1024"
```

## Deployment Checklist

- [ ] Phase 1 infrastructure deployed
- [ ] Docker image built locally: `docker build -f services/api/Dockerfile .`
- [ ] ECR repository exists
- [ ] Docker image pushed to ECR
- [ ] `terraform.tfvars` configured with secrets
- [ ] `terraform plan` shows expected resources
- [ ] `terraform apply` completes without errors
- [ ] ECS tasks reach RUNNING status
- [ ] ALB reports 2/2 healthy targets
- [ ] Health endpoint returns 200: `curl http://ALB_DNS/api/v1/health`
- [ ] CloudWatch logs show startup messages
- [ ] SNS email subscription confirmed
- [ ] Alarms created (check CloudWatch console)
- [ ] Dashboard accessible with metrics

## Next Steps (Phase 3)

- [ ] Configure SSL/TLS certificate for HTTPS
- [ ] Set up Route53 DNS records
- [ ] Enable WAF for DDoS protection
- [ ] Implement API rate limiting
- [ ] Configure CloudWatch X-Ray for tracing
- [ ] Set up CI/CD pipeline (GitHub Actions, CodePipeline)
- [ ] Migrate to EventBridge for async jobs
- [ ] Implement log aggregation for all services
- [ ] Set up multi-region failover

## Support Resources

- **AWS ECS Documentation:** https://docs.aws.amazon.com/ecs/
- **AWS Fargate Pricing:** https://aws.amazon.com/fargate/pricing/
- **NestJS Docker Guide:** https://docs.nestjs.com/deployment
- **Project Documentation:** `/home/user/imobi/CLAUDE.md`

## Git & Version Control

This infrastructure is managed via Terraform and checked into git:

```bash
# Commit infrastructure changes
git add infrastructure/terraform/aws-phase2/
git commit -m "feat(infrastructure): add ECS Fargate deployment (Phase 2)"

# Tag release
git tag -a phase2-initial -m "Phase 2: ECS Fargate with ALB and monitoring"
git push origin phase2-initial
```

**Important:** Never commit `terraform.tfvars` (contains secrets). Keep it in `.gitignore`.

---

**Status:** Phase 2 - ECS Fargate Ready  
**Created:** 2026-06-02  
**Branch:** claude/gifted-hawking-ULZTB  
**Effort:** 6 hours  
**Cost:** ~$45-60/month
