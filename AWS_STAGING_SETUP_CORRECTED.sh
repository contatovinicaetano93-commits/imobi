#!/bin/bash

###############################################################################
# AWS STAGING INFRASTRUCTURE SETUP - CORRECTED (us-east-2)
#
# Purpose: Set up staging environment in CORRECT region (us-east-2)
# Aligns with: ElastiCache Redis + RDS PostgreSQL already deployed
# Cost: Free tier eligible (12 months)
# Duration: ~30 minutes
###############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_ACCOUNT_ID="047556738507"
AWS_REGION="us-east-2"  # ✅ CORRECTED: Same region as ElastiCache + RDS
ENVIRONMENT="staging"
APP_NAME="imobi"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}        🚀 AWS STAGING INFRASTRUCTURE SETUP (CORRECTED)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   Account ID: ${AWS_ACCOUNT_ID}"
echo "   Region: ${AWS_REGION} ✅ CORRECTED (was us-east-1)"
echo "   Environment: ${ENVIRONMENT}"
echo "   App Name: ${APP_NAME}"
echo ""

# STEP 1: Validate AWS credentials
echo -e "${BLUE}🔐 STEP 1: Validating AWS credentials...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! aws sts get-caller-identity --region ${AWS_REGION} > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials not found or invalid${NC}"
    echo "Run: aws configure --profile imobi"
    exit 1
fi

CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
if [ "$CURRENT_ACCOUNT" != "$AWS_ACCOUNT_ID" ]; then
    echo -e "${RED}❌ Wrong AWS account: ${CURRENT_ACCOUNT} (expected ${AWS_ACCOUNT_ID})${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS credentials validated (Account: ${CURRENT_ACCOUNT})${NC}"
echo ""

# STEP 2: Set up ECR (Elastic Container Registry)
echo -e "${BLUE}🐳 STEP 2: Setting up ECR (Elastic Container Registry)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ECR_REPO_NAME="${APP_NAME}-api-${ENVIRONMENT}"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}"

# Check if ECR repo exists
if aws ecr describe-repositories --repository-names ${ECR_REPO_NAME} --region ${AWS_REGION} > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  ECR repository already exists: ${ECR_REPO_NAME}${NC}"
else
    echo "Creating ECR repository: ${ECR_REPO_NAME}..."
    aws ecr create-repository \
        --repository-name ${ECR_REPO_NAME} \
        --region ${AWS_REGION} \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 \
        > /dev/null
    echo -e "${GREEN}✅ ECR repository created${NC}"
fi

echo "ECR URI: ${ECR_URI}"
echo ""

# STEP 3: Create RDS instance (if not exists)
echo -e "${BLUE}📦 STEP 3: Verifying RDS PostgreSQL instance...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

RDS_INSTANCE="imobi-database"
if aws rds describe-db-instances --db-instance-identifier ${RDS_INSTANCE} --region ${AWS_REGION} > /dev/null 2>&1; then
    RDS_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier ${RDS_INSTANCE} \
        --region ${AWS_REGION} \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    echo -e "${GREEN}✅ RDS instance found: ${RDS_ENDPOINT}${NC}"
else
    echo -e "${RED}❌ RDS instance not found: ${RDS_INSTANCE}${NC}"
    echo "Please create RDS instance using AWS_RDS_SETUP.md"
    exit 1
fi
echo ""

# STEP 4: Verify ElastiCache instance
echo -e "${BLUE}🔴 STEP 4: Verifying ElastiCache Redis...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

REDIS_CLUSTER="imobi-redis"
if aws elasticache describe-cache-clusters --cache-cluster-id ${REDIS_CLUSTER} --region ${AWS_REGION} > /dev/null 2>&1; then
    REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
        --cache-cluster-id ${REDIS_CLUSTER} \
        --region ${AWS_REGION} \
        --show-cache-node-info \
        --query 'CacheClusters[0].CacheNodes[0].Address' \
        --output text)
    REDIS_PORT=$(aws elasticache describe-cache-clusters \
        --cache-cluster-id ${REDIS_CLUSTER} \
        --region ${AWS_REGION} \
        --show-cache-node-info \
        --query 'CacheClusters[0].CacheNodes[0].Port' \
        --output text)
    echo -e "${GREEN}✅ ElastiCache Redis found: ${REDIS_ENDPOINT}:${REDIS_PORT}${NC}"
else
    echo -e "${YELLOW}⚠️  ElastiCache Redis not found (optional for staging)${NC}"
fi
echo ""

# STEP 5: Create S3 bucket for staging uploads
echo -e "${BLUE}📁 STEP 5: Setting up S3 bucket for uploads...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

S3_BUCKET="${APP_NAME}-uploads-${ENVIRONMENT}-${AWS_ACCOUNT_ID}"
if aws s3 ls "s3://${S3_BUCKET}" --region ${AWS_REGION} > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  S3 bucket already exists: ${S3_BUCKET}${NC}"
else
    echo "Creating S3 bucket: ${S3_BUCKET}..."
    aws s3api create-bucket \
        --bucket ${S3_BUCKET} \
        --region ${AWS_REGION} \
        --create-bucket-configuration LocationConstraint=${AWS_REGION} \
        > /dev/null

    # Enable versioning
    aws s3api put-bucket-versioning \
        --bucket ${S3_BUCKET} \
        --region ${AWS_REGION} \
        --versioning-configuration Status=Enabled \
        > /dev/null

    # Enable encryption
    aws s3api put-bucket-encryption \
        --bucket ${S3_BUCKET} \
        --region ${AWS_REGION} \
        --server-side-encryption-configuration '{
            "Rules": [{
                "ApplyServerSideEncryptionByDefault": {
                    "SSEAlgorithm": "AES256"
                }
            }]
        }' \
        > /dev/null

    echo -e "${GREEN}✅ S3 bucket created and configured${NC}"
fi
echo ""

# STEP 6: Create CloudWatch Log Group
echo -e "${BLUE}📊 STEP 6: Setting up CloudWatch Log Group...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

LOG_GROUP="/aws/ecs/${APP_NAME}-api-${ENVIRONMENT}"
if aws logs describe-log-groups --log-group-name-prefix ${LOG_GROUP} --region ${AWS_REGION} | grep -q ${LOG_GROUP}; then
    echo -e "${YELLOW}⚠️  Log group already exists: ${LOG_GROUP}${NC}"
else
    echo "Creating CloudWatch log group: ${LOG_GROUP}..."
    aws logs create-log-group \
        --log-group-name ${LOG_GROUP} \
        --region ${AWS_REGION} \
        > /dev/null

    # Set retention to 7 days (free tier)
    aws logs put-retention-policy \
        --log-group-name ${LOG_GROUP} \
        --retention-in-days 7 \
        --region ${AWS_REGION} \
        > /dev/null

    echo -e "${GREEN}✅ CloudWatch log group created (7-day retention)${NC}"
fi
echo ""

# STEP 7: Create IAM role for ECS task execution
echo -e "${BLUE}👤 STEP 7: Setting up IAM role for ECS...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

ECS_TASK_ROLE="${APP_NAME}-ecs-task-role-${ENVIRONMENT}"
if aws iam get-role --role-name ${ECS_TASK_ROLE} > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  IAM role already exists: ${ECS_TASK_ROLE}${NC}"
else
    echo "Creating IAM role: ${ECS_TASK_ROLE}..."

    # Create trust policy
    cat > /tmp/trust-policy.json << 'EOF'
{
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
}
EOF

    aws iam create-role \
        --role-name ${ECS_TASK_ROLE} \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        > /dev/null

    # Attach policies
    aws iam attach-role-policy \
        --role-name ${ECS_TASK_ROLE} \
        --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly \
        > /dev/null

    aws iam attach-role-policy \
        --role-name ${ECS_TASK_ROLE} \
        --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess \
        > /dev/null

    # Create inline policy for S3 and SES
    cat > /tmp/task-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::imobi-uploads-staging-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
EOF

    aws iam put-role-policy \
        --role-name ${ECS_TASK_ROLE} \
        --policy-name ${APP_NAME}-task-policy \
        --policy-document file:///tmp/task-policy.json \
        > /dev/null

    echo -e "${GREEN}✅ IAM role created with necessary permissions${NC}"
fi
echo ""

# STEP 8: Create VPC and Security Groups (if needed)
echo -e "${BLUE}🔒 STEP 8: Verifying VPC security groups...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Get default VPC
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --region ${AWS_REGION} --query 'Vpcs[0].VpcId' --output text)

if [ "$DEFAULT_VPC" = "None" ] || [ -z "$DEFAULT_VPC" ]; then
    echo -e "${YELLOW}⚠️  No default VPC found. Using EC2-Classic or creating new VPC...${NC}"
else
    echo -e "${GREEN}✅ Using default VPC: ${DEFAULT_VPC}${NC}"
fi
echo ""

# STEP 9: Summary and next steps
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ STAGING INFRASTRUCTURE SETUP COMPLETE${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${YELLOW}📌 NEXT STEPS:${NC}"
echo ""
echo "1. Build Docker image:"
echo "   docker build -t ${APP_NAME}-api:latest -f services/api/Dockerfile ."
echo ""
echo "2. Tag image for ECR:"
echo "   docker tag ${APP_NAME}-api:latest ${ECR_URI}:latest"
echo ""
echo "3. Login to ECR:"
echo "   aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo ""
echo "4. Push to ECR:"
echo "   docker push ${ECR_URI}:latest"
echo ""
echo "5. Update environment variables for staging:"
echo "   export DATABASE_URL=postgresql://imobi_admin:\$RDS_PASSWORD@${RDS_ENDPOINT}:5432/imobi_production"
echo "   export REDIS_URL=redis://${REDIS_ENDPOINT}:${REDIS_PORT}"
echo "   export AWS_S3_BUCKET=${S3_BUCKET}"
echo "   export AWS_REGION=${AWS_REGION}"
echo ""
echo "6. Deploy to ECS/Lambda (see AWS_STAGING_DEPLOY.md)"
echo ""

echo -e "${YELLOW}💰 COST ESTIMATE (Free Tier):${NC}"
echo "   - ECR: \$0/month (first 50GB/month free)"
echo "   - RDS: \$0/month (db.t2.micro, 750h/month)"
echo "   - ElastiCache: \$0/month (cache.t2.micro serverless)"
echo "   - CloudWatch Logs: \$0/month (5GB free)"
echo "   - S3: \$0/month (5GB storage free)"
echo ""
echo -e "${YELLOW}Total: \$0/month during free tier (expires in ~11 months)${NC}"
echo ""

exit 0
