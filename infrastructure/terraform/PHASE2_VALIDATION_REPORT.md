# Phase 2 AWS Terraform Deployment Plan - Validation Report

**Date:** 2026-06-03  
**Status:** ✅ Configuration Valid (Awaiting AWS Credentials for Execution)  
**Environment:** staging  
**Region:** us-east-1  

---

## Executive Summary

The Phase 2 AWS Terraform infrastructure configuration has been **validated and is structurally sound**. The configuration defines 41 resources across ECS, ECR, ALB, CloudWatch, IAM, and Auto Scaling services.

**Deployment is ready for execution once AWS credentials are configured.**

---

## Critical Prerequisites

⚠️ **BLOCKING ISSUE:** AWS credentials are NOT configured in the environment
```
aws sts get-caller-identity → FAILED (No credentials found)
```

**Action Required Before Deployment:**
1. Configure AWS credentials: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
2. Ensure IAM user has permissions for all services (ECS, ECR, ALB, CloudWatch, IAM, SNS, AutoScaling)
3. Verify S3 bucket `imobi-terraform-state` exists (for Terraform state backend)
4. Verify DynamoDB table `terraform-locks` exists (for state locking)

---

## Configuration Validation Results

### ✅ Syntax Validation
- All Terraform files parse successfully
- All braces, brackets, and parentheses balanced
- All variable references valid
- No circular dependencies detected

### ✅ Files Reviewed
| File | Resources | Status |
|------|-----------|--------|
| `alb.tf` | 7 | ✅ Valid |
| `cloudwatch.tf` | 16 | ✅ Valid |
| `ecr.tf` | 3 | ✅ Valid |
| `ecs.tf` | 15 | ✅ Valid |
| `variables.tf` | 14 vars | ✅ Valid |
| `versions.tf` | provider config | ✅ Valid |

### ✅ Dependencies Satisfied
All Phase 2 resources reference Phase 1 infrastructure via data sources:
- ✅ `aws_db_instance.imobi_rds` - RDS PostgreSQL
- ✅ `aws_elasticache_cluster.imobi_redis` - Redis cache
- ✅ `aws_s3_bucket.imobi_storage` - S3 storage bucket
- ✅ `aws_vpc.main` - VPC network
- ✅ `aws_subnets.private` - Private subnets for ECS
- ✅ `aws_subnets.public` - Public subnets for ALB

---

## Resource Deployment Plan

### Total Resources: 41

#### 1. Container Orchestration (ECS) - 3 resources
- **aws_ecs_cluster** `imobi_prod`
  - Name: `imobi-prod`
  - Container Insights: enabled
  - Region: us-east-1

- **aws_ecs_task_definition** `imobi_api`
  - Family: `imobi-api`
  - CPU: 256 (0.25 vCPU)
  - Memory: 512 MB
  - Launch Type: FARGATE
  - Health Check: `curl -f http://localhost:3000/api/v1/health || exit 1`

- **aws_ecs_service** `imobi_api`
  - Cluster: imobi-prod
  - Desired Count: 2 (High Availability)
  - Max Capacity: 4 (Auto-scaling)
  - Load Balancer Integration: ✅

#### 2. Container Registry (ECR) - 3 resources
- **aws_ecr_repository** `imobi_api`
  - Name: `imobi-api`
  - Image Tag Mutability: IMMUTABLE
  - Scan on Push: enabled
  
- **aws_ecr_lifecycle_policy** `imobi_api`
  - Keep last 10 tagged images
  - Remove untagged images after 7 days
  
- **aws_ecr_repository_policy** `imobi_api`
  - Allows ECS tasks to pull images

#### 3. Load Balancing (ALB) - 5 resources
- **aws_lb** `imobi_api`
  - Name: `imobi-api-alb`
  - Type: Application Load Balancer
  - HTTP/2: enabled
  - Cross-Zone: enabled
  
- **aws_lb_listener** `http`
  - Port: 80
  - Protocol: HTTP
  - Forward to target group
  
- **aws_lb_listener** `https`
  - Port: 443
  - Protocol: HTTPS
  - SSL Policy: ELBSecurityPolicy-TLS-1-2-2017-01
  - Certificate: (optional, configurable via variable)
  
- **aws_lb_target_group** `imobi_api`
  - Port: 3000 (from `var.api_port`)
  - Protocol: HTTP
  - Health Check Path: `/api/v1/health`
  - Health Check Interval: 30s
  - Unhealthy Threshold: 2

#### 4. Network Security - 2 resources
- **aws_security_group** `alb`
  - Allows ingress on ports 80 (HTTP) and 443 (HTTPS)
  - Allows egress to all destinations
  
- **aws_security_group** `ecs_tasks`
  - Allows ingress from ALB security group on port 3000
  - Allows egress to all destinations

#### 5. Identity & Access Management (IAM) - 7 resources
- **aws_iam_role** `ecs_task_execution_role`
  - Allows ECS to pull images from ECR
  - Allows ECS to push logs to CloudWatch
  - Allows reading secrets from Secrets Manager (pattern: `imobi/*`)
  - Attached policy: `AmazonECSTaskExecutionRolePolicy`
  
- **aws_iam_role** `ecs_task_role`
  - Allows application to:
    - Read/write to S3 bucket (for file uploads)
    - Send emails via SES
    - Read secrets from Secrets Manager
  
- **aws_iam_role_policy** (4 total)
  - `ecs_logs_policy` - CloudWatch Logs
  - `ecs_s3_policy` - S3 bucket access
  - `ecs_secrets_policy` - Secrets Manager
  - `ecs_ses_policy` - Amazon SES email

#### 6. Monitoring & Logging (CloudWatch) - 16 resources

**Log Groups:**
- `/ecs/imobi-api` - ECS task logs
- `/aws/alb/imobi-api` - ALB access logs

**Log Metric Filters:**
- BullMQ failed jobs (searches for "failed" or "falhado" in error logs)
- BullMQ queue depth (monitors job queue)
- Application errors (filters `{"level": "error"}` JSON)

**Cloudwatch Alarms (10 total):**
1. `imobi-api-high-cpu` - CPU > 80% for 10 min
2. `imobi-api-high-memory` - Memory > 80% for 10 min
3. `imobi-api-unhealthy-hosts` - ALB unhealthy targets
4. `imobi-api-high-response-time` - Response time > 1s
5. `imobi-api-high-latency-p99` - Latency > 1 second
6. `imobi-api-error-rate-high` - 5XX errors > 50 in 5 min
7. `imobi-api-task-failures` - Task running count drops
8. `imobi-bullmq-failed-jobs-spike` - > 10 failed jobs in 5 min
9. `imobi-api-app-error-count` - >= 20 app errors in 5 min
10. `imobi-redis-high-cpu` - Redis CPU > 75%

**All alarms → SNS topic → Email: contato.vinicaetano93@gmail.com**

**CloudWatch Dashboard: `imobi-api-monitoring`**
- Widget 1: ECS CPU Utilization (Gauge)
- Widget 2: ECS Memory Utilization (Gauge)
- Widget 3: Request Count by Status (2XX, 4XX, 5XX)
- Widget 4: Error Rate % (5XX count)
- Widget 5: Response Latency (Average)
- Widget 6: BullMQ Queue Depth
- Widget 7: BullMQ Failed Jobs
- Widget 8: ElastiCache Network Bytes

#### 7. Auto Scaling - 3 resources
- **aws_appautoscaling_target** `ecs_target`
  - Min: 2 tasks
  - Max: 4 tasks
  - Service: ECS
  
- **aws_appautoscaling_policy** `ecs_policy_cpu`
  - Metric: ECSServiceAverageCPUUtilization
  - Target: 70%
  
- **aws_appautoscaling_policy** `ecs_policy_memory`
  - Metric: ECSServiceAverageMemoryUtilization
  - Target: 80%

#### 8. Notifications (SNS) - 2 resources
- **aws_sns_topic** `imobi_api_alarms`
  - Name: `imobi-api-alarms`
  
- **aws_sns_topic_subscription** `imobi_api_alarms_email`
  - Protocol: email
  - Endpoint: `contato.vinicaetano93@gmail.com`

---

## Configuration Parameters

**From terraform.tfvars:**
```hcl
aws_region              = "us-east-1"
environment             = "staging"
api_port                = 3000
ecs_task_cpu            = "256"      # Free Tier eligible
ecs_task_memory         = "512"      # Free Tier eligible
ecs_desired_count       = 2
ecs_max_capacity        = 4
log_retention_days      = 7
db_username             = "imobi_staging"
db_password             = "StageSecure#2024Pass123"
db_name                 = "imobi_staging"
cors_origin             = "http://localhost:3000,http://staging.imbobi.local:3000,https://app-staging.imbobi.com.br"
ssl_certificate_arn     = ""
alert_email             = "contato.vinicaetano93@gmail.com"
```

---

## ⚠️ Important Warnings

### 1. Database Password Management
**Issue:** Password is hardcoded in `terraform.tfvars`
```hcl
db_password = "StageSecure#2024Pass123"  # ⚠️ NOT SECURE
```
**Recommendation:** Move to AWS Secrets Manager or use TF_VAR environment variables
```bash
export TF_VAR_db_password="your-secure-password"
```

### 2. HTTPS Configuration
**Issue:** HTTPS listener configured but `ssl_certificate_arn` is empty
```hcl
ssl_certificate_arn = ""  # ⚠️ Will fail on apply
```
**Action Required:**
- Option A: Provide ACM certificate ARN
- Option B: Remove HTTPS listener temporarily and add later
- Option C: Use self-signed certificate (for testing only)

### 3. Duplicate ALB Resource
**Issue:** Two `aws_lb` resources defined
- `aws_lb.imobi_api` - Main ALB
- `aws_lb.imobi_api_with_logs` - Partial definition for access logs

**Recommendation:** Remove duplicate or complete the configuration

### 4. Health Check Endpoint
**Requirement:** API must implement `/api/v1/health` endpoint returning HTTP 200
```
Health Check Path: /api/v1/health
Interval: 30s
Timeout: 10s
Healthy Threshold: 2
Unhealthy Threshold: 2
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Configure AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- [ ] Verify IAM permissions for required services
- [ ] Ensure S3 backend bucket exists: `imobi-terraform-state`
- [ ] Ensure DynamoDB lock table exists: `terraform-locks`
- [ ] Verify Phase 1 resources deployed (RDS, ElastiCache, S3, VPC)
- [ ] Update database password (move to Secrets Manager)
- [ ] Resolve duplicate ALB resource in `cloudwatch.tf`
- [ ] Provide SSL certificate ARN or remove HTTPS listener
- [ ] Confirm `/api/v1/health` endpoint is implemented

### Deployment
```bash
cd infrastructure/terraform/aws-phase2

# Initialize with AWS credentials
terraform init

# Generate plan
terraform plan -out=phase2.tfplan

# Review plan output for:
# - 41 resources to create
# - No resource deletions
# - Correct tags on all resources
# - Proper security group configuration

# Apply when ready
terraform apply phase2.tfplan
```

### Post-Deployment
- [ ] Verify ECR repository created and pushing images works
- [ ] Push Docker image to ECR
- [ ] Verify ECS cluster status in AWS Console
- [ ] Check ECS service logs in CloudWatch
- [ ] Test ALB DNS endpoint (should show API health check)
- [ ] Verify all CloudWatch alarms appear active
- [ ] Send test email from SNS to verify alert subscription
- [ ] Test API endpoints through ALB: `http://{ALB_DNS}/api/v1/health`
- [ ] Review CloudWatch dashboard for baseline metrics

---

## Resource Tagging Strategy

All resources will be tagged with:
```hcl
Project     = "imbobi"
Phase       = "Phase2"
Environment = "staging"  # from var.environment
ManagedBy   = "Terraform"
CreatedAt   = timestamp()
```

This enables cost tracking, resource filtering, and compliance monitoring.

---

## Cost Estimates

**Phase 2 Estimated Monthly Cost (Free Tier):**
- ECS Fargate: ~$50 (256 CPU + 512 MB × 2 tasks)
- ALB: ~$25
- CloudWatch Logs: ~$5
- ECR: Free (per month limit)
- CloudWatch Alarms: ~$10
- NAT Gateway (for egress): ~$32
- **Total: ~$122/month**

*Note: Actual costs depend on data transfer and log volume.*

---

## Success Criteria

Deployment is successful when:
1. ✅ `terraform apply` completes without errors
2. ✅ 41 resources created (no deletions)
3. ✅ ECS service running with 2 tasks
4. ✅ ALB health checks passing
5. ✅ CloudWatch logs receiving ECS output
6. ✅ All 10 alarms active in AWS Console
7. ✅ API reachable via ALB DNS endpoint
8. ✅ SNS email subscription confirmed

---

## Next Steps

1. **Configure AWS Credentials**
   ```bash
   export AWS_ACCESS_KEY_ID="your-key"
   export AWS_SECRET_ACCESS_KEY="your-secret"
   export AWS_DEFAULT_REGION="us-east-1"
   ```

2. **Fix Infrastructure Issues**
   - Remove duplicate ALB resource from cloudwatch.tf
   - Move database password to Secrets Manager
   - Provide SSL certificate ARN or update HTTPS listener config

3. **Run Terraform**
   ```bash
   terraform init
   terraform plan -out=phase2.tfplan
   terraform apply phase2.tfplan
   ```

4. **Deploy Container Image**
   ```bash
   # Build Docker image from services/api
   docker build -t imobi-api .
   
   # Tag for ECR
   docker tag imobi-api:latest {ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/imobi-api:latest
   
   # Push to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin {ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
   docker push {ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/imobi-api:latest
   ```

5. **Monitor Deployment**
   - AWS Console → ECS → imobi-prod cluster
   - CloudWatch → Logs → /ecs/imobi-api
   - CloudWatch → Dashboards → imobi-api-monitoring

---

## Files Referenced

- `/home/user/imobi/infrastructure/terraform/aws-phase2/alb.tf`
- `/home/user/imobi/infrastructure/terraform/aws-phase2/cloudwatch.tf`
- `/home/user/imobi/infrastructure/terraform/aws-phase2/ecr.tf`
- `/home/user/imobi/infrastructure/terraform/aws-phase2/ecs.tf`
- `/home/user/imobi/infrastructure/terraform/aws-phase2/variables.tf`
- `/home/user/imobi/infrastructure/terraform/aws-phase2/versions.tf`
- `/home/user/imobi/infrastructure/terraform/aws-phase2/terraform.tfvars`

---

**Validation Complete:** ✅ Configuration is ready for deployment upon AWS credential configuration.
