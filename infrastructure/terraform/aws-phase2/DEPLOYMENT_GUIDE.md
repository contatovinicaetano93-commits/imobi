# AWS Phase 2 - ECS Fargate Deployment Guide

## Overview

Phase 2 automates the deployment of imobi-api using AWS ECS Fargate, providing scalable, serverless container orchestration with an Application Load Balancer (ALB) and comprehensive CloudWatch monitoring.

**Estimated Deployment Time:** 30-45 minutes  
**Cost Estimate:** ~$45-60/month (scaling, auto-recovery, CloudWatch logs)

## Prerequisites

- Phase 1 infrastructure deployed (RDS, ElastiCache, VPC, S3)
- AWS credentials configured with sufficient permissions
- Docker image pushed to ECR
- Terraform >= 1.0

## Architecture Components

### 1. ECR (Elastic Container Registry)
- **Repository:** `imobi-api`
- **Image Scanning:** Enabled (detects vulnerabilities)
- **Lifecycle Policy:** Keeps 10 latest images
- **Immutable Tags:** Enabled (prevents accidental overwrites)

### 2. ECS Cluster & Service
- **Cluster:** `imobi-prod` (Fargate launch type)
- **Service:** `imobi-api-service`
- **Tasks:** 2 (minimum), up to 4 (auto-scaling)
- **CPU:** 256 units (0.25 vCPU)
- **Memory:** 512 MB
- **Network:** Awsvpc (uses ENI directly)
- **Health Checks:** Every 30s, path: `/api/v1/health`

### 3. Application Load Balancer (ALB)
- **Name:** `imobi-api-alb`
- **Listener:** HTTP (80) → ECS tasks (port 4000)
- **HTTPS:** 443 (ready for SSL certificate)
- **Health Check:** `/api/v1/health` (timeout: 10s, interval: 30s)
- **Deregistration Delay:** 30s (connection draining)

### 4. CloudWatch Monitoring
- **Log Group:** `/ecs/imobi-api` (7-day retention)
- **Metrics:** CPU, Memory, Response Time
- **Alarms:** 
  - High CPU (> 80%)
  - High Memory (> 85%)
  - High Error Count (> 10 in 5 min)
  - Unhealthy Targets
  - High Response Time (> 1s)
- **Dashboard:** `imobi-api-dashboard`
- **SNS Alerts:** Email notifications

## Deployment Steps

### Step 1: Prepare Terraform Variables

```bash
cd infrastructure/terraform/aws-phase2

# Copy example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
nano terraform.tfvars
```

**Required variables:**
- `db_username` - RDS master username
- `db_password` - RDS master password
- `alert_email` - Email for CloudWatch alarms

### Step 2: Validate Terraform Configuration

```bash
# Initialize Terraform
terraform init

# Validate syntax
terraform validate

# Format check
terraform fmt -check .

# Plan deployment
terraform plan -out=phase2.tfplan
```

### Step 3: Build and Push Docker Image

```bash
# From project root
docker build -f services/api/Dockerfile -t imobi-api:latest .

# Tag for ECR (replace with your account ID)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker tag imobi-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi-api:latest

# Push to ECR
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi-api:latest
```

### Step 4: Deploy Infrastructure

```bash
terraform apply phase2.tfplan
```

This will create:
- ECR repository
- ECS cluster
- ECS service with task definition
- Application Load Balancer
- Target groups and listeners
- Security groups
- CloudWatch log group and alarms
- SNS topic for alerts

**Deployment time:** ~10-15 minutes

### Step 5: Verify Deployment

```bash
# Get ALB DNS name
terraform output alb_dns_name

# Check ECS service status
aws ecs describe-services \
  --cluster imobi-prod \
  --services imobi-api-service \
  --region us-east-1

# View CloudWatch logs
aws logs tail /ecs/imobi-api --follow --region us-east-1

# Test health endpoint
curl http://LOAD_BALANCER_DNS/api/v1/health
```

### Step 6: Configure DNS (Optional)

```bash
# Get ALB DNS
ALB_DNS=$(terraform output -raw alb_dns_name)

# Create Route53 record (if using Route53)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.imbobi.com.br",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$ALB_DNS'"}]
      }
    }]
  }'
```

## Auto-Scaling Configuration

The service includes auto-scaling policies:

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Utilization | > 70% | Scale Up |
| Memory Utilization | > 80% | Scale Up |
| Either Metric | < 40% | Scale Down |
| Max Tasks | 4 | Hard limit |
| Min Tasks | 2 | HA baseline |

Scale-up happens within 1-2 minutes. Scale-down takes 5-10 minutes (cooldown period).

## Monitoring & Alerts

### CloudWatch Dashboard

Access via AWS Console → CloudWatch → Dashboards → `imobi-api-dashboard`

Shows:
- ECS CPU/Memory utilization
- ALB request count and response times
- HTTP status code distribution
- Recent error logs

### Email Alerts

Configured for:
- High CPU utilization (> 80%)
- High memory (> 85%)
- Errors in logs (> 10/5min)
- Unhealthy targets
- High response time (> 1s)

**To manage alerts:**
```bash
# View SNS topic
aws sns get-topic-attributes \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:imobi-api-alarms

# Subscribe additional emails
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:imobi-api-alarms \
  --protocol email \
  --notification-endpoint ops@example.com
```

### CloudWatch Logs Insights

Query examples:

```
# Recent errors
fields @timestamp, @message
| filter @message like /ERROR|error|Exception/
| sort @timestamp desc
| limit 100

# P95 response time
fields @duration
| filter @duration > 0
| stats pct(@duration, 95) as p95, pct(@duration, 99) as p99

# Request rate
fields @timestamp
| stats count() as request_count by bin(5m)
```

## Troubleshooting

### Tasks Not Starting

```bash
# Check task definition
aws ecs describe-task-definition \
  --task-definition imobi-api \
  --region us-east-1

# Check service events
aws ecs describe-services \
  --cluster imobi-prod \
  --services imobi-api-service \
  --region us-east-1 | jq '.services[0].events'

# View ECS logs
aws logs tail /ecs/imobi-api --region us-east-1 --follow
```

### Health Check Failures

```bash
# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT_ID:targetgroup/imobi-api-tg/* \
  --region us-east-1

# Verify API endpoint
curl http://ALB_DNS/api/v1/health -v
```

### High CPU/Memory

- Check application logs for errors
- Review database query performance
- Consider increasing task CPU/memory
- Check for memory leaks

```bash
# Update task definition
terraform apply -var="ecs_task_cpu=512" -var="ecs_task_memory=1024"
```

### Database Connection Issues

```bash
# Verify RDS endpoint
aws rds describe-db-instances \
  --db-instance-identifier imobi-db \
  --region us-east-1

# Check security groups allow access from ECS
aws ec2 describe-security-groups \
  --region us-east-1 | grep imobi
```

## Scaling Configuration

### Manual Scaling

```bash
# Scale to 3 tasks
aws ecs update-service \
  --cluster imobi-prod \
  --service imobi-api-service \
  --desired-count 3 \
  --region us-east-1
```

### Update Task Definition

```bash
# Increase CPU/memory
terraform apply \
  -var="ecs_task_cpu=512" \
  -var="ecs_task_memory=1024"

# Force new deployment
aws ecs update-service \
  --cluster imobi-prod \
  --service imobi-api-service \
  --force-new-deployment \
  --region us-east-1
```

## Cost Optimization

Current estimate: **$45-60/month**

Ways to reduce:
1. Reduce log retention (default 7 days)
2. Reduce replica count (minimum 1)
3. Use smaller task size during low traffic
4. Enable CloudWatch Logs data filtering

## Rollback Plan

If deployment fails:

```bash
terraform destroy
```

This will safely remove:
- ECS service and tasks
- ECS cluster
- ALB and target groups
- ECR repository (optional - requires `force_delete = true`)
- Security groups
- CloudWatch resources
- SNS topics

RDS and ElastiCache (Phase 1) are NOT affected.

## Next Steps (Phase 3)

- Configure SSL/TLS certificate for HTTPS
- Set up Route53 DNS records
- Enable WAF (Web Application Firewall)
- Configure EventBridge for async jobs
- Migrate from Sentry to CloudWatch X-Ray
- Set up CI/CD pipeline for automated deployments

## Support & Documentation

- **Dockerfile:** `services/api/Dockerfile`
- **Task Definition:** `services/api/ecs-task-definition.json`
- **Health Endpoint:** `GET /api/v1/health` (returns 200 when ready)
- **API Port:** 4000
- **Database:** RDS PostgreSQL (Phase 1)
- **Cache:** ElastiCache Redis (Phase 1)

## Security Considerations

- ✓ Secrets loaded from AWS Secrets Manager
- ✓ Tasks run in private subnets
- ✓ Security groups restrict inbound traffic
- ✓ ALB is internet-facing (only 80/443)
- ✓ ECS tasks can only receive traffic from ALB
- ✓ IAM roles follow least-privilege principle
- ✓ CloudWatch Logs encryption enabled
- ✓ ECR image scanning enabled

## Success Criteria

Deployment is successful when:

- [ ] ECS tasks are healthy (Running, Task Status = RUNNING)
- [ ] ALB target group shows 2/2 healthy targets
- [ ] Health check passes: `curl http://ALB_DNS/api/v1/health`
- [ ] CloudWatch logs show no errors
- [ ] Dashboard loads with metrics
- [ ] SNS subscription confirmed via email
- [ ] Auto-scaling policies active
- [ ] Alarms created and functional

---

**Phase 2 Deployment Status:** Ready  
**Created:** 2026-06-02  
**Branch:** claude/gifted-hawking-ULZTB
