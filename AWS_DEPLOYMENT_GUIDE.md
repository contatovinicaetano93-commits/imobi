# AWS Deployment Guide — imobi

## Overview

This guide provides step-by-step instructions for deploying imobi staging and production infrastructure on AWS using automated scripts and Terraform.

**Timeline:** 2-4 hours for staging, 4-6 hours for production

---

## Prerequisites

### Local Setup
```bash
# Install required tools
brew install awscli terraform docker docker-compose  # macOS
apt-get install awscli terraform docker.io docker-compose  # Ubuntu/Debian

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Default region, Output format
```

### AWS Account Requirements
- ✅ AWS Account with billing enabled
- ✅ IAM user with AdministratorAccess policy
- ✅ VPC already created (default VPC is fine)
- ✅ Availability zones in chosen region (default: us-east-1)
- ⚠️ Estimated cost: $165/month staging, $800/month production

---

## Architecture

### Staging (Low-Cost)
```
┌─────────────────────────────────────────────────────┐
│                    Route 53 DNS                      │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│         AWS Application Load Balancer (ALB)          │
│              HTTP/HTTPS, Auto-scale                  │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────┐ ┌────────▼────┐ ┌─────▼──────┐
│  API Task  │ │  Web Task   │ │ Worker Job │
│  (ECS)     │ │  (ECS)      │ │  (ECS)     │
└────────────┘ └─────────────┘ └────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼────┐ ┌────────▼────┐ ┌─────▼──────┐
│  RDS       │ │ ElastiCache │ │ S3 Bucket  │
│  PostgreSQL│ │ Redis       │ │ for files  │
└────────────┘ └─────────────┘ └────────────┘
```

### Production (High-Availability)
```
Adds: CloudFront CDN, RDS Multi-AZ, Auto Scaling Groups,
      VPC with subnets, NAT Gateway, Route 53 health checks
```

---

## Phase 1: Local Staging Verification

### 1.1 Start Local Services
```bash
cd /home/user/imobi

# Start Docker services
docker-compose -f docker-compose.staging.yml up -d

# Verify services
docker-compose -f docker-compose.staging.yml ps
```

### 1.2 Initialize Database
```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate
```

### 1.3 Start Development Servers
```bash
# In separate terminal
pnpm dev

# Verify services running
curl -s http://localhost:4000/api/v1/health | jq '.'
curl -s http://localhost:3000
```

### 1.4 Run Validation Tests
```bash
# Security validation
bash scripts/STAGING_VALIDATION_TESTS.sh

# Load testing
bash run-load-tests.sh http://localhost:4000
```

---

## Phase 2: AWS Infrastructure Setup

### 2.1 Prepare Terraform Variables
```bash
# Create terraform variables file
cat > terraform/staging.tfvars << 'EOF'
# AWS Configuration
aws_region              = "us-east-1"
environment             = "staging"
project_name            = "imobi"

# Network
vpc_cidr               = "10.0.0.0/16"
private_subnet_cidrs   = ["10.0.1.0/24", "10.0.2.0/24"]
public_subnet_cidrs    = ["10.0.10.0/24", "10.0.11.0/24"]

# Database
rds_instance_class     = "db.t3.micro"      # upgrade to t3.small for medium load
rds_allocated_storage  = 20                  # GB
rds_backup_retention   = 7                   # days
postgres_version       = "14"

# ElastiCache
elasticache_node_type  = "cache.t3.micro"
elasticache_num_cache_nodes = 1

# ECS
ecs_api_task_cpu       = 256
ecs_api_task_memory    = 512
ecs_api_desired_count  = 2
ecs_web_task_cpu       = 256
ecs_web_task_memory    = 512
ecs_web_desired_count  = 2

# Domain (set your domain)
domain_name            = "staging.imobi.com"  # Change to your domain
certificate_email      = "admin@imobi.com"

# Tags
tags = {
  Project     = "imobi"
  Environment = "staging"
  ManagedBy   = "terraform"
  CostCenter  = "engineering"
}
EOF
```

### 2.2 Initialize Terraform
```bash
cd terraform

# Initialize Terraform working directory
terraform init

# Plan infrastructure changes
terraform plan -var-file=staging.tfvars -out=tfplan

# Review the plan
cat tfplan  # Review resources to be created
```

### 2.3 Deploy Infrastructure
```bash
# Apply Terraform configuration
terraform apply tfplan

# Save outputs
terraform output > staging-outputs.txt

# Extract important values
API_ALB_DNS=$(terraform output -raw api_alb_dns_name)
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
REDIS_ENDPOINT=$(terraform output -raw elasticache_endpoint)
S3_BUCKET=$(terraform output -raw s3_bucket_name)

echo "API ALB: $API_ALB_DNS"
echo "RDS: $RDS_ENDPOINT"
echo "Redis: $REDIS_ENDPOINT"
echo "S3 Bucket: $S3_BUCKET"
```

**Expected deployment time:** 15-20 minutes

---

## Phase 3: Database Migration

### 3.1 Create Database
```bash
# Get RDS endpoint from Terraform output
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)

# Connect to RDS
PGPASSWORD=$DB_PASSWORD psql -h $RDS_ENDPOINT -U postgres -d postgres << EOF
CREATE DATABASE imobi_staging;
CREATE USER imobi WITH PASSWORD '$DB_PASSWORD';
ALTER ROLE imobi SET search_path = public;
GRANT ALL PRIVILEGES ON DATABASE imobi_staging TO imobi;
EOF
```

### 3.2 Enable PostGIS
```bash
# Enable PostGIS extension
PGPASSWORD=$DB_PASSWORD psql -h $RDS_ENDPOINT -U imobi -d imobi_staging << EOF
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT PostGIS_version();
EOF
```

### 3.3 Run Prisma Migrations
```bash
# Update environment variables
export DATABASE_URL="postgresql://imobi:$DB_PASSWORD@$RDS_ENDPOINT:5432/imobi_staging"

# Run migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate
```

---

## Phase 4: Build and Push Container Images

### 4.1 Create ECR Repositories
```bash
# Create repositories for API and Web
aws ecr create-repository \
  --repository-name imobi/api \
  --region us-east-1

aws ecr create-repository \
  --repository-name imobi/web \
  --region us-east-1
```

### 4.2 Build Container Images
```bash
# Authenticate with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push API image
docker build -f services/api/Dockerfile.staging \
  -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi/api:latest .
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi/api:latest

# Build and push Web image
docker build -f apps/web/Dockerfile.staging \
  -t $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi/web:latest .
docker push $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi/web:latest
```

### 4.3 Update ECS Task Definitions
```bash
# Update task definitions with new image URIs
aws ecs update-service \
  --cluster imobi-staging-cluster \
  --service imobi-staging-api \
  --force-new-deployment \
  --region us-east-1

aws ecs update-service \
  --cluster imobi-staging-cluster \
  --service imobi-staging-web \
  --force-new-deployment \
  --region us-east-1
```

---

## Phase 5: Configure Secrets and Environment Variables

### 5.1 Store Secrets in AWS Secrets Manager
```bash
# Create secret for application credentials
aws secretsmanager create-secret \
  --name imobi/staging/app-config \
  --secret-string '{
    "JWT_SECRET": "'$JWT_SECRET'",
    "ENCRYPTION_KEY": "'$ENCRYPTION_KEY'",
    "CORS_ORIGIN": "https://staging.imobi.com",
    "AWS_S3_BUCKET": "'$S3_BUCKET'"
  }' \
  --region us-east-1
```

### 5.2 Update ECS Task Definitions
```bash
# Create/update task definition JSON with secrets reference
# See: terraform/ecs-task-definition.json
```

---

## Phase 6: Verify Deployment

### 6.1 Check ECS Tasks
```bash
# List running tasks
aws ecs list-tasks \
  --cluster imobi-staging-cluster \
  --region us-east-1

# Describe task status
aws ecs describe-tasks \
  --cluster imobi-staging-cluster \
  --tasks <task-arn> \
  --region us-east-1 | jq '.tasks[0].lastStatus'
```

### 6.2 Test API Health
```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw api_alb_dns_name)

# Test health endpoint
curl -s http://$ALB_DNS/api/v1/health | jq '.'

# Expected response:
# {
#   "status": "ok",
#   "database": "connected",
#   "redis": "connected",
#   "timestamp": "2024-05-30T13:45:00Z"
# }
```

### 6.3 Check CloudWatch Logs
```bash
# View API logs
aws logs tail /ecs/imobi-staging-api --follow --region us-east-1

# View Web logs
aws logs tail /ecs/imobi-staging-web --follow --region us-east-1
```

### 6.4 Run Smoke Tests
```bash
# Run security validation against staging
bash scripts/STAGING_VALIDATION_TESTS.sh staging

# Run load tests
bash run-load-tests.sh https://staging.imobi.com
```

---

## Phase 7: Configure Domain and SSL

### 7.1 Point Domain to ALB
```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw api_alb_dns_name)

# Create CNAME record in Route 53
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "staging.imobi.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$ALB_DNS'"}]
      }
    }]
  }' \
  --region us-east-1
```

### 7.2 Request SSL Certificate
```bash
# Request certificate in ACM
aws acm request-certificate \
  --domain-name staging.imobi.com \
  --validation-method DNS \
  --region us-east-1
```

### 7.3 Update ALB Listener
```bash
# Update listener to use HTTPS
aws elbv2 modify-listener \
  --listener-arn <listener-arn> \
  --protocol HTTPS \
  --certificates CertificateArn=<certificate-arn> \
  --region us-east-1
```

---

## Phase 8: Monitoring and Alerts

### 8.1 Create CloudWatch Alarms
```bash
# API Task CPU > 80%
aws cloudwatch put-metric-alarm \
  --alarm-name imobi-staging-api-cpu-high \
  --alarm-description "Alert when API CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=imobi-staging-api Name=ClusterName,Value=imobi-staging-cluster \
  --region us-east-1

# API Task Memory > 90%
aws cloudwatch put-metric-alarm \
  --alarm-name imobi-staging-api-memory-high \
  --alarm-description "Alert when API Memory exceeds 90%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=imobi-staging-api Name=ClusterName,Value=imobi-staging-cluster \
  --region us-east-1

# RDS CPU > 75%
aws cloudwatch put-metric-alarm \
  --alarm-name imobi-staging-rds-cpu-high \
  --alarm-description "Alert when RDS CPU exceeds 75%" \
  --metric-name CPUUtilization \
  --namespace AWS/RDS \
  --statistic Average \
  --period 300 \
  --threshold 75 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DBInstanceIdentifier,Value=imobi-staging-postgres \
  --region us-east-1
```

### 8.2 Enable Enhanced Monitoring
```bash
# Enable RDS Enhanced Monitoring
aws rds modify-db-instance \
  --db-instance-identifier imobi-staging-postgres \
  --monitoring-interval 60 \
  --monitoring-role-arn <iam-role-arn> \
  --apply-immediately \
  --region us-east-1
```

---

## Phase 9: Production Deployment

**When ready for production:**

### 9.1 Run Production Checklist
```bash
# See: INFRASTRUCTURE_PROVISIONING.md (Production checklist section)
```

### 9.2 Provision Production Infrastructure
```bash
# Create production Terraform variables
cp terraform/staging.tfvars terraform/production.tfvars

# Edit production variables
nano terraform/production.tfvars
# Update: environment, instance sizes, backup retention, etc.

# Plan and apply
terraform plan -var-file=production.tfvars -out=tfplan-prod
terraform apply tfplan-prod
```

### 9.3 Production Configuration
```bash
# Enable Multi-AZ for RDS
# Enable S3 versioning
# Enable CloudFront CDN
# Configure Route 53 health checks
# Set up CloudWatch dashboards
```

---

## Cleanup and Cost Management

### Remove Staging Infrastructure
```bash
# Destroy staging resources
terraform destroy -var-file=staging.tfvars

# Confirm deletion
aws s3 rm s3://imobi-staging-bucket --recursive
aws rds delete-db-instance --db-instance-identifier imobi-staging-postgres --skip-final-snapshot
```

### Cost Monitoring
```bash
# View estimated monthly cost
terraform plan -var-file=staging.tfvars | grep -i cost

# Set up billing alerts
aws budgets create-budget \
  --account-id $AWS_ACCOUNT_ID \
  --budget file://budget-config.json
```

---

## Troubleshooting

### Task Failed to Start
```bash
# Check ECS task logs
aws logs tail /ecs/imobi-staging-api --follow

# Check task definition
aws ecs describe-task-definition --task-definition imobi-staging-api | jq '.taskDefinition'
```

### Database Connection Error
```bash
# Check RDS security group
aws ec2 describe-security-groups --group-ids $RDS_SECURITY_GROUP

# Check database connectivity
nc -zv $RDS_ENDPOINT 5432
```

### ALB Health Check Failures
```bash
# Check ALB target health
aws elbv2 describe-target-health --target-group-arn $TARGET_GROUP_ARN

# Check ECS task logs
aws logs tail /ecs/imobi-staging-api --follow

# Check application health endpoint
curl -s http://localhost:4000/api/v1/health
```

---

## References

- AWS RDS Documentation: https://docs.aws.amazon.com/rds/
- AWS ECS Documentation: https://docs.aws.amazon.com/ecs/
- Terraform AWS Provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- imobi Infrastructure Provisioning: `INFRASTRUCTURE_PROVISIONING.md`
- imobi Staging Deployment: `STAGING_DEPLOYMENT.md`
