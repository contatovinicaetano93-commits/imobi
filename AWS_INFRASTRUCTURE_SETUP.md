# AWS Production Infrastructure Setup — imobi
## Step 2 Execution: Infrastructure Preparation

**Status:** 🔄 IN PROGRESS  
**Start Time:** 2026-05-30 14:30 UTC  
**Expected Completion:** 2026-05-30 21:00 UTC  

---

## PREREQUISITES

Before executing this step, ensure:

### 1. AWS Account Setup
```bash
# Required IAM permissions:
# - AmazonVPCFullAccess
# - AmazonEC2FullAccess
# - AmazonRDSFullAccess
# - AmazonElastiCacheFullAccess
# - AmazonS3FullAccess
# - IAMFullAccess
# - AWSSecretsManagerFullAccess
# - CloudWatchFullAccess
# - CloudTrailFullAccess
# - AWSConfigFullAccess

# Configure AWS CLI
aws configure
# Region: us-east-1
# Output format: json
```

### 2. Service Quota Checks
```bash
# Check and increase quotas if needed
aws service-quotas list-service-quotas --service-code ec2 --region us-east-1 | \
  jq '.ServiceQuotas[] | select(.QuotaName | contains("Running")) | {QuotaName, Value}'

# Required quotas:
# - vCPU (Standard): >= 32 vCPUs (for ECS Fargate)
# - NAT Gateway: >= 2
# - VPC: >= 2
# - RDS instances: >= 2
```

### 3. Terraform Installation
```bash
# Install Terraform v1.5+
terraform --version

# Install required providers
terraform providers
```

---

## 1. VPC & NETWORKING SETUP

### 1.1 Create VPC

```bash
# Create custom VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=imbobi-vpc},{Key=Environment,Value=production}]' \
  --region us-east-1

# Output: VPC ID (e.g., vpc-0123456789abcdef0)
# Save as: VPC_ID="vpc-0123456789abcdef0"
```

### 1.2 Create Public & Private Subnets

```bash
# Public Subnet 1 (us-east-1a)
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=imbobi-public-1a}]'

# Public Subnet 2 (us-east-1b)
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=imbobi-public-1b}]'

# Private Subnet 1 (us-east-1a)
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.10.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=imbobi-private-1a}]'

# Private Subnet 2 (us-east-1b)
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=imbobi-private-1b}]'

# Save subnet IDs:
# PUBLIC_SUBNET_1A="subnet-..."
# PUBLIC_SUBNET_1B="subnet-..."
# PRIVATE_SUBNET_1A="subnet-..."
# PRIVATE_SUBNET_1B="subnet-..."
```

### 1.3 Internet Gateway

```bash
# Create Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=imbobi-igw}]'

# Attach to VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID

# Save: IGW_ID="igw-..."
```

### 1.4 NAT Gateways (for private subnets)

```bash
# Allocate Elastic IPs for NAT Gateways
aws ec2 allocate-address --domain vpc
aws ec2 allocate-address --domain vpc
# Save: EIP_1, EIP_2

# Create NAT Gateway 1 (in public subnet 1a)
aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_1A \
  --allocation-id $EIP_1 \
  --tag-specifications 'ResourceType=nat-gateway,Tags=[{Key=Name,Value=imbobi-nat-1a}]'

# Create NAT Gateway 2 (in public subnet 1b)
aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_1B \
  --allocation-id $EIP_2 \
  --tag-specifications 'ResourceType=nat-gateway,Tags=[{Key=Name,Value=imbobi-nat-1b}]'

# Wait for NAT gateways to be available (may take 2-5 minutes)
aws ec2 describe-nat-gateways --filter Name=tag:Name,Values=imbobi-nat-1a
# Status should be: available
```

### 1.5 Route Tables

```bash
# Create public route table
aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=imbobi-public-rt}]'

# Add route to Internet Gateway
aws ec2 create-route \
  --route-table-id $PUBLIC_RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID

# Associate with public subnets
aws ec2 associate-route-table \
  --route-table-id $PUBLIC_RT_ID \
  --subnet-id $PUBLIC_SUBNET_1A

aws ec2 associate-route-table \
  --route-table-id $PUBLIC_RT_ID \
  --subnet-id $PUBLIC_SUBNET_1B

# Create private route tables (one per AZ for isolation)
aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=imbobi-private-rt-1a}]'

aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=imbobi-private-rt-1b}]'

# Add routes through respective NAT Gateways
aws ec2 create-route \
  --route-table-id $PRIVATE_RT_1A_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GATEWAY_1A_ID

aws ec2 create-route \
  --route-table-id $PRIVATE_RT_1B_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GATEWAY_1B_ID

# Associate private subnets
aws ec2 associate-route-table \
  --route-table-id $PRIVATE_RT_1A_ID \
  --subnet-id $PRIVATE_SUBNET_1A

aws ec2 associate-route-table \
  --route-table-id $PRIVATE_RT_1B_ID \
  --subnet-id $PRIVATE_SUBNET_1B
```

---

## 2. SECURITY GROUPS

### 2.1 ALB Security Group

```bash
aws ec2 create-security-group \
  --group-name imbobi-alb-sg \
  --description "Security group for imobi ALB" \
  --vpc-id $VPC_ID

# ALB_SG_ID="sg-..."

# Allow HTTP/HTTPS inbound from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow all outbound
aws ec2 authorize-security-group-egress \
  --group-id $ALB_SG_ID \
  --protocol -1 \
  --cidr 0.0.0.0/0
```

### 2.2 ECS Security Group

```bash
aws ec2 create-security-group \
  --group-name imbobi-ecs-sg \
  --description "Security group for imobi ECS tasks" \
  --vpc-id $VPC_ID

# ECS_SG_ID="sg-..."

# Allow inbound from ALB (port 4000 for API, 3000 for Web)
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG_ID

aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG_ID \
  --protocol tcp \
  --port 4000 \
  --source-group $ALB_SG_ID

# Allow all outbound
aws ec2 authorize-security-group-egress \
  --group-id $ECS_SG_ID \
  --protocol -1 \
  --cidr 0.0.0.0/0
```

### 2.3 RDS Security Group

```bash
aws ec2 create-security-group \
  --group-name imbobi-rds-sg \
  --description "Security group for imobi RDS" \
  --vpc-id $VPC_ID

# RDS_SG_ID="sg-..."

# Allow PostgreSQL inbound only from ECS security group
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG_ID

# Optionally allow from your IP for management
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --cidr YOUR_IP/32
```

### 2.4 ElastiCache Security Group

```bash
aws ec2 create-security-group \
  --group-name imbobi-redis-sg \
  --description "Security group for imobi Redis" \
  --vpc-id $VPC_ID

# REDIS_SG_ID="sg-..."

# Allow Redis inbound only from ECS security group
aws ec2 authorize-security-group-ingress \
  --group-id $REDIS_SG_ID \
  --protocol tcp \
  --port 6379 \
  --source-group $ECS_SG_ID
```

---

## 3. RDS POSTGRESQL DATABASE

### 3.1 Create RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier imbobi-prod-db \
  --db-instance-class db.r6i.xlarge \
  --engine postgres \
  --engine-version 16.2 \
  --master-username imbobi_admin \
  --master-user-password "$(openssl rand -base64 32)" \
  --allocated-storage 100 \
  --storage-type gp3 \
  --storage-encrypted \
  --kms-key-id arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID \
  --multi-az \
  --db-subnet-group-name imbobi-db-subnet-group \
  --vpc-security-group-ids $RDS_SG_ID \
  --db-name imbobi \
  --port 5432 \
  --backup-retention-period 30 \
  --backup-window "03:00-04:00" \
  --maintenance-window "sun:04:00-sun:05:00" \
  --enable-clouwatch-logs-exports postgresql \
  --enable-iam-database-authentication \
  --copy-tags-to-snapshot \
  --deletion-protection \
  --tags Key=Name,Value=imbobi-prod-db Key=Environment,Value=production

# Save the master password securely in AWS Secrets Manager!
aws secretsmanager create-secret \
  --name imbobi/db/master-password \
  --secret-string "PASSWORD_FROM_ABOVE"

# Wait for DB to be available (5-10 minutes)
# Check status: aws rds describe-db-instances --db-instance-identifier imbobi-prod-db
```

### 3.2 Create DB Subnet Group

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name imbobi-db-subnet-group \
  --db-subnet-group-description "Subnet group for imobi RDS" \
  --subnet-ids $PRIVATE_SUBNET_1A $PRIVATE_SUBNET_1B \
  --tags Key=Name,Value=imbobi-db-subnet-group
```

### 3.3 Run Database Migrations

Once RDS instance is available:

```bash
# Get RDS endpoint
RDS_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier imbobi-prod-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

# Create .env.production with RDS connection string
echo "DATABASE_URL=postgresql://imbobi_admin:PASSWORD@${RDS_ENDPOINT}:5432/imbobi?schema=public" >> .env.production

# Run Prisma migrations
pnpm db:migrate --env production

# Seed initial data if needed
pnpm db:seed
```

---

## 4. ELASTICACHE REDIS

### 4.1 Create Redis Cluster

```bash
# Create cache subnet group
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name imbobi-redis-subnet-group \
  --cache-subnet-group-description "Subnet group for imobi Redis" \
  --subnet-ids $PRIVATE_SUBNET_1A $PRIVATE_SUBNET_1B \
  --tags Key=Name,Value=imbobi-redis-subnet-group

# Create replication group (Redis cluster with Multi-AZ)
aws elasticache create-replication-group \
  --replication-group-description "Redis cluster for imobi" \
  --replication-group-id imbobi-prod-redis \
  --engine redis \
  --engine-version 7.0 \
  --cache-node-type cache.r6g.xlarge \
  --num-cache-clusters 2 \
  --automatic-failover-enabled \
  --multi-az-enabled \
  --cache-subnet-group-name imbobi-redis-subnet-group \
  --security-group-ids $REDIS_SG_ID \
  --at-rest-encryption-enabled \
  --transit-encryption-enabled \
  --auth-token "$(openssl rand -base64 32)" \
  --auto-minor-version-upgrade \
  --notification-topic-arn "arn:aws:sns:us-east-1:ACCOUNT_ID:imbobi-alerts" \
  --tags Key=Name,Value=imbobi-prod-redis Key=Environment,Value=production

# Save auth token in Secrets Manager
aws secretsmanager create-secret \
  --name imbobi/redis/auth-token \
  --secret-string "TOKEN_FROM_ABOVE"

# Wait for cluster to be available (5-10 minutes)
```

### 4.2 Configure Parameter Group

```bash
# Create custom parameter group
aws elasticache create-cache-parameter-group \
  --cache-parameter-group-name imbobi-redis-params \
  --cache-parameter-group-family redis7.0 \
  --description "Custom parameters for imobi Redis"

# Configure parameters
aws elasticache modify-cache-parameter-group \
  --cache-parameter-group-name imbobi-redis-params \
  --parameter-name-values \
    ParameterName=maxmemory-policy,ParameterValue=allkeys-lru \
    ParameterName=appendonly,ParameterValue=yes \
    ParameterName=appendfsync,ParameterValue=everysec
```

---

## 5. S3 BUCKET & CLOUDFRONT

### 5.1 Create S3 Bucket

```bash
# Create S3 bucket (bucket names must be globally unique)
aws s3api create-bucket \
  --bucket imbobi-prod-media-us-east-1 \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket imbobi-prod-media-us-east-1 \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket imbobi-prod-media-us-east-1 \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket imbobi-prod-media-us-east-1 \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }'

# Set lifecycle policy (delete old versions after 30 days)
aws s3api put-bucket-lifecycle-configuration \
  --bucket imbobi-prod-media-us-east-1 \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "DeleteOldVersions",
        "Status": "Enabled",
        "NoncurrentVersionExpirationInDays": 30
      }
    ]
  }'
```

### 5.2 Create CloudFront Distribution

```bash
# Create OAI (Origin Access Identity) for S3
aws cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config CallerReference=imbobi-oai-$(date +%s),Comment="OAI for imobi S3"

# Save OAI_ID from response

# Create CloudFront distribution configuration
cat > /tmp/cf-config.json << 'CFEOF'
{
  "CallerReference": "imbobi-cf-$(date +%s)",
  "Comment": "CloudFront distribution for imobi media",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3Origin",
        "DomainName": "imbobi-prod-media-us-east-1.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/OAI_ID"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3Origin",
    "ViewerProtocolPolicy": "https-only",
    "AllowedMethods": {
      "Quantity": 3,
      "Items": ["GET", "HEAD", "OPTIONS"]
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
    "Compress": true
  },
  "CacheBehaviors": [
    {
      "PathPattern": "/uploads/*",
      "TargetOriginId": "S3Origin",
      "ViewerProtocolPolicy": "https-only",
      "AllowedMethods": {
        "Quantity": 7,
        "Items": ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      },
      "CachePolicyId": "4135ea3d-c35d-46eb-81d7-reeSodSJRFQ"
    }
  ]
}
CFEOF

# Deploy distribution
aws cloudfront create-distribution --distribution-config file:///tmp/cf-config.json
```

---

## 6. ECR (ELASTIC CONTAINER REGISTRY)

### 6.1 Create ECR Repositories

```bash
# Create API repository
aws ecr create-repository \
  --repository-name imbobi/api \
  --image-tag-mutability IMMUTABLE \
  --encryption-configuration encryptionType=AES \
  --tags Key=Environment,Value=production

# Create Web repository
aws ecr create-repository \
  --repository-name imbobi/web \
  --image-tag-mutability IMMUTABLE \
  --encryption-configuration encryptionType=AES \
  --tags Key=Environment,Value=production

# Create Worker repository
aws ecr create-repository \
  --repository-name imbobi/worker \
  --image-tag-mutability IMMUTABLE \
  --encryption-configuration encryptionType=AES \
  --tags Key=Environment,Value=production

# Set lifecycle policy (keep last 10 images)
aws ecr put-lifecycle-policy \
  --repository-name imbobi/api \
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
  }'
```

---

## 7. ECS FARGATE CLUSTER

### 7.1 Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name imbobi-prod \
  --settings name=containerInsights,value=enabled \
  --tags key=Environment,value=production key=Name,value=imbobi-prod-cluster

# Create capacity providers
aws ecs create-capacity-provider \
  --name FARGATE \
  --auto-scaling-group-provider autoScalingGroupArn=arn:aws:autoscaling:us-east-1:ACCOUNT_ID:autoScalingGroup:*:autoScalingGroupName/imbobi-*

aws ecs put-cluster-capacity-providers \
  --cluster imbobi-prod \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1,base=2
```

### 7.2 Create IAM Roles for ECS

```bash
# Task execution role (allows pulling images, writing logs)
aws iam create-role \
  --role-name imbobi-ecs-task-execution-role \
  --assume-role-policy-document file:///tmp/trust-policy.json

aws iam attach-role-policy \
  --role-name imbobi-ecs-task-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Task role (allows app to access AWS services)
aws iam create-role \
  --role-name imbobi-ecs-task-role \
  --assume-role-policy-document file:///tmp/trust-policy.json

# Grant access to S3
aws iam put-role-policy \
  --role-name imbobi-ecs-task-role \
  --policy-name s3-access \
  --policy-document file:///tmp/s3-policy.json

# Grant access to Secrets Manager
aws iam put-role-policy \
  --role-name imbobi-ecs-task-role \
  --policy-name secrets-access \
  --policy-document file:///tmp/secrets-policy.json

# Grant access to CloudWatch Logs
aws iam put-role-policy \
  --role-name imbobi-ecs-task-role \
  --policy-name logs-access \
  --policy-document file:///tmp/logs-policy.json
```

---

## 8. APPLICATION LOAD BALANCER

### 8.1 Create ALB

```bash
aws elbv2 create-load-balancer \
  --name imbobi-prod-alb \
  --subnets $PUBLIC_SUBNET_1A $PUBLIC_SUBNET_1B \
  --security-groups $ALB_SG_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --tags Key=Name,Value=imbobi-prod-alb Key=Environment,Value=production

# Save ALB_ARN and ALB_DNS_NAME

# Enable deletion protection
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn $ALB_ARN \
  --attributes Key=deletion_protection.enabled,Value=true
```

### 8.2 Create Target Groups

```bash
# API target group
aws elbv2 create-target-group \
  --name imbobi-api-tg \
  --protocol HTTP \
  --port 4000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-protocol HTTP \
  --health-check-path /api/v1/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --tags Key=Name,Value=imbobi-api-tg

# Web target group
aws elbv2 create-target-group \
  --name imbobi-web-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --matcher HttpCode=200 \
  --tags Key=Name,Value=imbobi-web-tg

# Save API_TG_ARN and WEB_TG_ARN
```

### 8.3 Create Listeners

```bash
# HTTP listener (redirect to HTTPS)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'

# HTTPS listener (with SSL certificate)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID \
  --ssl-policy ELBSecurityPolicy-TLS-1-2-2017-01 \
  --default-actions Type=forward,TargetGroupArn=$API_TG_ARN

# Create rules for path-based routing
aws elbv2 create-rule \
  --listener-arn $HTTPS_LISTENER_ARN \
  --priority 1 \
  --conditions Field=path-pattern,Values=/api/* \
  --actions Type=forward,TargetGroupArn=$API_TG_ARN

aws elbv2 create-rule \
  --listener-arn $HTTPS_LISTENER_ARN \
  --priority 2 \
  --conditions Field=path-pattern,Values="/*" \
  --actions Type=forward,TargetGroupArn=$WEB_TG_ARN
```

---

## 9. AWS SECRETS MANAGER

### 9.1 Create Secrets

```bash
# Database credentials
aws secretsmanager create-secret \
  --name imbobi/db/prod \
  --description "PostgreSQL production credentials" \
  --secret-string '{
    "username": "imbobi_admin",
    "password": "SECURE_PASSWORD",
    "host": "RDS_ENDPOINT",
    "port": 5432,
    "dbname": "imbobi"
  }' \
  --tags Key=Environment,Value=production

# Redis credentials
aws secretsmanager create-secret \
  --name imbobi/redis/prod \
  --description "Redis production credentials" \
  --secret-string '{
    "host": "REDIS_ENDPOINT",
    "port": 6379,
    "auth_token": "REDIS_AUTH_TOKEN"
  }' \
  --tags Key=Environment,Value=production

# JWT Secret
aws secretsmanager create-secret \
  --name imbobi/jwt/secret \
  --description "JWT signing secret" \
  --secret-string "JWT_SECRET_64_CHARS_OR_MORE" \
  --tags Key=Environment,Value=production

# Encryption Key
aws secretsmanager create-secret \
  --name imbobi/encryption/key \
  --description "AES-256-GCM encryption key" \
  --secret-string "BASE64_ENCODED_32_BYTE_KEY" \
  --tags Key=Environment,Value=production
```

---

## 10. ROUTE 53 DNS

### 10.1 Create DNS Records

```bash
# Get hosted zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --query 'HostedZones[?Name==`imbobi.com.br.`].Id' \
  --output text)

# Create A record for API
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.imbobi.com.br",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z35SXDOTRQ7X7K",
            "DNSName": "ALB_DNS_NAME",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'

# Create A record for Web
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "imbobi.com.br",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z35SXDOTRQ7X7K",
            "DNSName": "ALB_DNS_NAME",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'
```

---

## 11. CLOUDWATCH & MONITORING

### 11.1 Create Log Groups

```bash
# API logs
aws logs create-log-group --log-group-name /imbobi/prod/api

# Web logs
aws logs create-log-group --log-group-name /imbobi/prod/web

# Worker logs
aws logs create-log-group --log-group-name /imbobi/prod/worker

# Set retention (30 days)
aws logs put-retention-policy \
  --log-group-name /imbobi/prod/api \
  --retention-in-days 30
```

### 11.2 Create CloudWatch Dashboards

(See separate CloudWatch setup document)

---

## 12. CLOUDTRAIL & COMPLIANCE

### 12.1 Enable CloudTrail

```bash
# Create S3 bucket for CloudTrail logs
aws s3api create-bucket \
  --bucket imbobi-cloudtrail-logs

# Enable CloudTrail
aws cloudtrail create-trail \
  --name imbobi-prod-trail \
  --s3-bucket-name imbobi-cloudtrail-logs \
  --region us-east-1 \
  --enable-log-file-validation \
  --is-multi-region-trail

# Start logging
aws cloudtrail start-logging \
  --trail-name arn:aws:cloudtrail:us-east-1:ACCOUNT_ID:trail/imbobi-prod-trail
```

---

## VERIFICATION CHECKLIST

After deploying all resources, verify:

- [ ] VPC created with correct CIDR blocks
- [ ] Public & private subnets in 2 AZs
- [ ] NAT Gateways available
- [ ] Security Groups created and rules configured
- [ ] RDS instance multi-az, encrypted, backup enabled
- [ ] ElastiCache Redis multi-az, auth enabled
- [ ] S3 bucket versioned, encrypted, public access blocked
- [ ] CloudFront distribution deployed
- [ ] ECR repositories created
- [ ] ECS cluster created with Fargate capacity
- [ ] ALB created with target groups and listeners
- [ ] Route 53 DNS records pointing to ALB
- [ ] Secrets Manager secrets created
- [ ] CloudWatch log groups created
- [ ] CloudTrail enabled and logging

---

## NEXT STEPS

Once all infrastructure is verified:
1. Proceed to Step 3: Security & Compliance Hardening
2. Build and push Docker images to ECR
3. Create ECS task definitions
4. Deploy services to ECS Fargate

---

**Status:** Infrastructure provisioning documentation ready  
**Next Update:** After AWS resources are created (estimated 2026-05-30 21:00 UTC)
