# AWS Production Deployment Commands Reference

## Quick Setup Guide

This document contains ready-to-use AWS CLI commands for setting up the imbobi production infrastructure.

**Prerequisites:**
- AWS CLI v2 installed
- AWS credentials configured with AdministratorAccess
- Docker installed
- pnpm installed

---

## Step 1: Set Variables

```bash
#!/bin/bash

# Set these values
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REPOSITORY="imbobi-api"
export RDS_INSTANCE="imbobi-prod-db"
export REDIS_CLUSTER="imbobi-prod-redis"
export ECS_CLUSTER="imbobi-production"
export ALB_NAME="imbobi-api-alb"
export VPC_ID="vpc-xxxxx"  # Replace with your VPC ID
export SUBNET_1="subnet-xxxxx"  # Public subnet AZ-A
export SUBNET_2="subnet-xxxxx"  # Public subnet AZ-B
export PRIVATE_SUBNET_1="subnet-xxxxx"  # Private subnet AZ-A
export PRIVATE_SUBNET_2="subnet-xxxxx"  # Private subnet AZ-B

# Database credentials (CHANGE THESE)
export DB_USER="imbobi_admin"
export DB_PASSWORD="$(openssl rand -base64 32)"  # Generate strong password
export REDIS_PASSWORD="$(openssl rand -base64 32)"

# JWT secrets (CHANGE THESE)
export JWT_SECRET="$(openssl rand -base64 48)"
export JWT_REFRESH_SECRET="$(openssl rand -base64 48)"
export ENCRYPTION_SECRET="$(openssl rand -base64 24)"

echo "Configuration ready"
echo "AWS Account: $AWS_ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"
```

---

## Step 2: Create IAM Roles & Policies

### 2.1 Create ECS Task Execution Role

```bash
# Create role
aws iam create-role \
  --role-name ecsTaskExecutionRole-imbobi \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach policy for pulling images from ECR
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole-imbobi \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Attach policy for CloudWatch Logs
aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole-imbobi \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

# Attach policy for Secrets Manager
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole-imbobi \
  --policy-name SecretsManagerAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ],
        "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:imbobi-api/*"
      }
    ]
  }'
```

### 2.2 Create ECS Task Role

```bash
# Create role
aws iam create-role \
  --role-name ecsTaskRole-imbobi \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach S3 policy
aws iam put-role-policy \
  --role-name ecsTaskRole-imbobi \
  --policy-name S3Access \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::imbobi-evidencias-prod",
          "arn:aws:s3:::imbobi-evidencias-prod/*"
        ]
      }
    ]
  }'

# Attach SES policy for emails
aws iam put-role-policy \
  --role-name ecsTaskRole-imbobi \
  --policy-name SESAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ],
        "Resource": "*"
      }
    ]
  }'
```

---

## Step 3: Create Security Groups

### 3.1 ALB Security Group

```bash
ALB_SG=$(aws ec2 create-security-group \
  --group-name imbobi-alb-sg \
  --description "Security group for imbobi ALB" \
  --vpc-id $VPC_ID \
  --output text)

# Allow HTTP
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

# Allow HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

echo "ALB Security Group: $ALB_SG"
```

### 3.2 ECS Security Group

```bash
ECS_SG=$(aws ec2 create-security-group \
  --group-name imbobi-ecs-sg \
  --description "Security group for imbobi ECS tasks" \
  --vpc-id $VPC_ID \
  --output text)

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 4000 \
  --source-group $ALB_SG

# Allow outbound HTTPS
aws ec2 authorize-security-group-egress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

echo "ECS Security Group: $ECS_SG"
```

### 3.3 RDS Security Group

```bash
RDS_SG=$(aws ec2 create-security-group \
  --group-name imbobi-rds-sg \
  --description "Security group for imbobi RDS" \
  --vpc-id $VPC_ID \
  --output text)

# Allow PostgreSQL from ECS
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG

echo "RDS Security Group: $RDS_SG"
```

### 3.4 Redis Security Group

```bash
REDIS_SG=$(aws ec2 create-security-group \
  --group-name imbobi-redis-sg \
  --description "Security group for imbobi Redis" \
  --vpc-id $VPC_ID \
  --output text)

# Allow Redis from ECS
aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG \
  --protocol tcp \
  --port 6379 \
  --source-group $ECS_SG

echo "Redis Security Group: $REDIS_SG"
```

---

## Step 4: Create S3 Bucket for File Storage

```bash
# Create bucket
aws s3 mb s3://imbobi-evidencias-prod --region $AWS_REGION

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket imbobi-evidencias-prod \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket imbobi-evidencias-prod \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Enable server-side encryption
aws s3api put-bucket-encryption \
  --bucket imbobi-evidencias-prod \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'

# Set lifecycle policy (delete old files after 90 days)
aws s3api put-bucket-lifecycle-configuration \
  --bucket imbobi-evidencias-prod \
  --lifecycle-configuration '{
    "Rules": [
      {
        "Id": "DeleteOldFiles",
        "Status": "Enabled",
        "Expiration": {
          "Days": 90
        }
      }
    ]
  }'

echo "S3 bucket created: imbobi-evidencias-prod"
```

---

## Step 5: Create RDS PostgreSQL Instance

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier $RDS_INSTANCE \
  --db-instance-class db.r6i.large \
  --engine postgres \
  --engine-version 15.3 \
  --master-username $DB_USER \
  --master-user-password $DB_PASSWORD \
  --allocated-storage 100 \
  --storage-type gp3 \
  --iops 3000 \
  --storage-encrypted \
  --multi-az \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --preferred-maintenance-window "sun:04:00-sun:05:00" \
  --db-subnet-group-name "default" \
  --publicly-accessible false \
  --enable-cloudwatch-logs-exports postgresql \
  --deletion-protection \
  --enable-iam-database-authentication

echo "RDS instance creation initiated: $RDS_INSTANCE"
echo "This will take 10-15 minutes..."

# Wait for instance to be available
aws rds wait db-instance-available --db-instance-identifier $RDS_INSTANCE

# Get endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier $RDS_INSTANCE \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "RDS Endpoint: $RDS_ENDPOINT"
```

### 5.1 Modify RDS Security Group

```bash
# Get RDS security group
RDS_SG=$(aws rds describe-db-instances \
  --db-instance-identifier $RDS_INSTANCE \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text)

# Allow connections from ECS
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG

echo "RDS security group configured"
```

---

## Step 6: Create ElastiCache Redis Instance

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id $REDIS_CLUSTER \
  --cache-node-type cache.r6g.large \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1 \
  --parameter-group-name default.redis7 \
  --port 6379 \
  --cache-subnet-group-name "default" \
  --security-group-ids $REDIS_SG \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token $REDIS_PASSWORD \
  --preferred-maintenance-window "sun:05:00-sun:06:00"

echo "Redis cluster creation initiated: $REDIS_CLUSTER"
echo "This will take 10-15 minutes..."

# Wait for cluster to be available
aws elasticache wait cache-cluster-available --cache-cluster-id $REDIS_CLUSTER

# Get endpoint
REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
  --cache-cluster-id $REDIS_CLUSTER \
  --show-cache-node-info \
  --query 'CacheClusters[0].CacheNodes[0].Address' \
  --output text)

echo "Redis Endpoint: $REDIS_ENDPOINT"
```

---

## Step 7: Create Secrets Manager Secret

```bash
# Create comprehensive secret
aws secretsmanager create-secret \
  --name imbobi-api/production \
  --description "Production secrets for imbobi API" \
  --secret-string '{
    "DATABASE_URL": "postgresql://'"$DB_USER"':'"$DB_PASSWORD"'@'"$RDS_ENDPOINT"':5432/imbobi_prod?sslmode=require",
    "JWT_SECRET": "'"$JWT_SECRET"'",
    "JWT_REFRESH_SECRET": "'"$JWT_REFRESH_SECRET"'",
    "ENCRYPTION_SECRET": "'"$ENCRYPTION_SECRET"'",
    "REDIS_HOST": "'"$REDIS_ENDPOINT"'",
    "REDIS_PORT": "6379",
    "REDIS_PASSWORD": "'"$REDIS_PASSWORD"'",
    "SENDGRID_API_KEY": "SG.YOUR_SENDGRID_KEY_HERE",
    "AWS_ACCESS_KEY_ID": "YOUR_AWS_ACCESS_KEY",
    "AWS_SECRET_ACCESS_KEY": "YOUR_AWS_SECRET_KEY",
    "AWS_REGION": "us-east-1",
    "FIREBASE_PROJECT_ID": "imbobi-production",
    "FIREBASE_PRIVATE_KEY": "YOUR_FIREBASE_PRIVATE_KEY",
    "FIREBASE_CLIENT_EMAIL": "firebase-adminsdk@imbobi-production.iam.gserviceaccount.com",
    "SENTRY_DSN": "https://YOUR_SENTRY_DSN@sentry.io/YOUR_PROJECT_ID"
  }' \
  --tags Key=Environment,Value=production Key=Application,Value=imbobi-api

echo "Secret created in AWS Secrets Manager"

# Retrieve secret (verify it was created)
aws secretsmanager get-secret-value \
  --secret-id imbobi-api/production \
  --query 'SecretString' \
  --output text | jq . | head -20
```

---

## Step 8: Create ECR Repository

```bash
# Create repository
aws ecr create-repository \
  --repository-name $ECR_REPOSITORY \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# Enable image lifecycle policy
aws ecr put-lifecycle-policy \
  --repository-name $ECR_REPOSITORY \
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Keep last 10 images",
        "selection": {
          "tagStatus": "any",
          "countType": "imageCountMoreThan",
          "countNumber": 10
        },
        "action": {
          "type": "expire"
        }
      }
    ]
  }' \
  --region $AWS_REGION

echo "ECR repository created: $ECR_REPOSITORY"
```

---

## Step 9: Build and Push Docker Image

```bash
# Authenticate with ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build image
docker build -t imbobi-api:v1.0.0 \
  -f services/api/Dockerfile \
  --build-arg NODE_ENV=production \
  .

# Tag for ECR
docker tag imbobi-api:v1.0.0 \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/imbobi-api:v1.0.0
docker tag imbobi-api:v1.0.0 \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/imbobi-api:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/imbobi-api:v1.0.0
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/imbobi-api:latest

echo "Docker image pushed to ECR"
```

---

## Step 10: Create ECS Cluster

```bash
# Create cluster
aws ecs create-cluster \
  --cluster-name $ECS_CLUSTER \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=100

# Create CloudWatch log group
aws logs create-log-group \
  --log-group-name /ecs/imbobi-api \
  --region $AWS_REGION

# Set retention to 30 days
aws logs put-retention-policy \
  --log-group-name /ecs/imbobi-api \
  --retention-in-days 30

echo "ECS cluster created: $ECS_CLUSTER"
```

---

## Step 11: Register ECS Task Definition

```bash
# Update task definition template with actual values
sed -e "s|{{ACCOUNT_ID}}|$AWS_ACCOUNT_ID|g" \
    services/api/ecs-task-definition.json > /tmp/task-def.json

# Register task definition
TASK_DEF=$(aws ecs register-task-definition \
  --cli-input-json file:///tmp/task-def.json \
  --query 'taskDefinition.taskDefinitionArn' \
  --output text)

echo "Task definition registered: $TASK_DEF"
```

---

## Step 12: Create Application Load Balancer

```bash
# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name $ALB_NAME \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

echo "ALB created: $ALB_ARN"

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"
```

### 12.1 Create Target Group

```bash
# Create target group
TG_ARN=$(aws elbv2 create-target-group \
  --name imbobi-api-tg \
  --protocol HTTP \
  --port 4000 \
  --vpc-id $VPC_ID \
  --health-check-enabled \
  --health-check-protocol HTTP \
  --health-check-path /api/v1/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --target-type ip \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target Group created: $TG_ARN"
```

### 12.2 Create Listener

```bash
# Create HTTP listener (redirect to HTTPS)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'

# Note: Create listener rule for HTTPS after SSL certificate is set up
# For now, create HTTP listener to target group
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 4000 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

echo "Listeners configured"
```

---

## Step 13: Create ECS Service

```bash
# Create service
aws ecs create-service \
  --cluster $ECS_CLUSTER \
  --service-name imbobi-api \
  --task-definition imbobi-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$PRIVATE_SUBNET_1,$PRIVATE_SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=DISABLED}" \
  --load-balancers targetGroupArn=$TG_ARN,containerName=imbobi-api,containerPort=4000 \
  --deployment-configuration maximumPercent=200,minimumHealthyPercent=100 \
  --enable-ecs-managed-tags \
  --tags key=Environment,value=production key=Application,value=imbobi-api

echo "ECS service created"

# Wait for service to stabilize
aws ecs wait services-stable \
  --cluster $ECS_CLUSTER \
  --services imbobi-api

echo "ECS service is stable"
```

---

## Step 14: Run Database Migrations

```bash
# Get RDS endpoint and credentials from Secrets Manager
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id imbobi-api/production \
  --query 'SecretString' \
  --output text)

export DATABASE_URL=$(echo $SECRET | jq -r '.DATABASE_URL')

# Create backup
pg_dump \
  --host=$(echo $RDS_ENDPOINT | cut -d. -f1) \
  --username=$DB_USER \
  --dbname=imbobi_prod \
  > backup_prod_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
pnpm db:migrate:deploy

echo "Database migrations completed"
```

---

## Step 15: Verify Health Checks

```bash
# Check ECS tasks
aws ecs describe-services \
  --cluster $ECS_CLUSTER \
  --services imbobi-api \
  --query 'services[0].[runningCount,desiredCount,deployments[0].status]' \
  --output text

# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN \
  --query 'TargetHealthDescriptions[*].[Target.Id,TargetHealth.State]' \
  --output table

# Test health endpoint
curl -I http://$ALB_DNS:4000/api/v1/health

echo "Health checks completed"
```

---

## Step 16: Setup DNS Records

```bash
# Update Route53 DNS records
# Replace ZONE_ID with your Route53 hosted zone ID

ZONE_ID="YOUR_ROUTE53_ZONE_ID"

# Create A record for api.imbobi.com
aws route53 change-resource-record-sets \
  --hosted-zone-id $ZONE_ID \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.imbobi.com",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z35SXDOTRQ7X7K",
            "DNSName": "'"$ALB_DNS"'",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'

echo "DNS records updated"
```

---

## Step 17: Configure CloudWatch Alarms

```bash
# Create SNS topic for alerts
SNS_TOPIC=$(aws sns create-topic \
  --name imbobi-alerts \
  --query 'TopicArn' \
  --output text)

# Subscribe email
aws sns subscribe \
  --topic-arn $SNS_TOPIC \
  --protocol email \
  --notification-endpoint your-email@example.com

# High error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name imbobi-api-high-error-rate \
  --alarm-description "Alert when API returns > 5% errors" \
  --metric-name HTTPCode_Target_5XX_Count \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 300 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions $SNS_TOPIC

echo "CloudWatch alarms configured"
```

---

## Step 18: Smoke Tests

```bash
# Wait for service to respond
sleep 30

# Test health endpoint
echo "Testing health endpoint..."
curl -v http://$ALB_DNS:4000/api/v1/health

# Test signup flow (requires authentication)
echo "Testing signup flow..."
curl -X POST http://$ALB_DNS:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User",
    "phone": "+5511999999999"
  }'

echo "Smoke tests completed"
```

---

## Complete Deployment Script

To run all steps at once, save this as `deploy-complete.sh`:

```bash
#!/bin/bash
set -e

# Source the configuration
source .env.production

# Run each step
./step-1-variables.sh
./step-2-iam-roles.sh
./step-3-security-groups.sh
./step-4-s3.sh
./step-5-rds.sh
./step-6-redis.sh
./step-7-secrets.sh
./step-8-ecr.sh
./step-9-docker.sh
./step-10-ecs-cluster.sh
./step-11-task-definition.sh
./step-12-alb.sh
./step-13-ecs-service.sh
./step-14-migrations.sh
./step-15-health-checks.sh
./step-16-dns.sh
./step-17-alarms.sh
./step-18-smoke-tests.sh

echo "Complete deployment successful!"
```

---

## Troubleshooting

### RDS Connection Issues

```bash
# Test RDS connectivity
psql postgresql://$DB_USER:$DB_PASSWORD@$RDS_ENDPOINT:5432/imbobi_prod

# Check security group rules
aws ec2 describe-security-groups --group-ids $RDS_SG
```

### ECS Task Failures

```bash
# Check task logs
aws logs tail /ecs/imbobi-api --follow

# Describe failed tasks
aws ecs describe-tasks \
  --cluster $ECS_CLUSTER \
  --tasks [TASK_ARN] \
  --query 'tasks[0].{Status: lastStatus, Error: stoppedReason}'
```

### Redis Connection Issues

```bash
# Test Redis connectivity
redis-cli -h $REDIS_ENDPOINT -p 6379 -a $REDIS_PASSWORD ping
```

---

**Last Updated:** 2026-05-28  
**AWS Region:** us-east-1  
**Version:** 1.0.0
