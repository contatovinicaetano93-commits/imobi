#!/bin/bash
set -e

# AWS Phase 2 - ECS Fargate Deployment Validation Script
# This script validates prerequisites and infrastructure readiness

echo "========================================"
echo "AWS Phase 2 - Validation Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check AWS CLI
echo "[1/8] Checking AWS CLI..."
if command -v aws &> /dev/null; then
  AWS_VERSION=$(aws --version)
  echo -e "${GREEN}✓${NC} AWS CLI found: $AWS_VERSION"
else
  echo -e "${RED}✗${NC} AWS CLI not found. Install with: brew install awscli"
  exit 1
fi

# Check AWS Credentials
echo "[2/8] Checking AWS Credentials..."
if aws sts get-caller-identity &> /dev/null; then
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  ACCOUNT_USER=$(aws sts get-caller-identity --query Arn --output text)
  echo -e "${GREEN}✓${NC} AWS credentials valid"
  echo "  Account ID: $ACCOUNT_ID"
  echo "  User: $ACCOUNT_USER"
else
  echo -e "${RED}✗${NC} AWS credentials not configured"
  echo "  Run: aws configure"
  exit 1
fi

# Check Terraform
echo "[3/8] Checking Terraform..."
if command -v terraform &> /dev/null; then
  TF_VERSION=$(terraform version | head -1)
  echo -e "${GREEN}✓${NC} Terraform found: $TF_VERSION"
else
  echo -e "${RED}✗${NC} Terraform not found. Install from: https://www.terraform.io/downloads"
  exit 1
fi

# Check Phase 1 Resources
echo "[4/8] Checking Phase 1 Resources..."

# Check RDS
echo "  Checking RDS..."
if aws rds describe-db-instances --db-instance-identifier imobi-db --region us-east-1 &> /dev/null; then
  RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier imobi-db --region us-east-1 --query 'DBInstances[0].Endpoint.Address' --output text)
  echo -e "  ${GREEN}✓${NC} RDS instance found: $RDS_ENDPOINT"
else
  echo -e "  ${YELLOW}!${NC} RDS instance not found. Deploy Phase 1 first."
fi

# Check ElastiCache
echo "  Checking ElastiCache..."
if aws elasticache describe-cache-clusters --cache-cluster-id imobi-redis --region us-east-1 &> /dev/null; then
  REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters --cache-cluster-id imobi-redis --region us-east-1 --query 'CacheClusters[0].CacheNodes[0].Endpoint.Address' --output text)
  echo -e "  ${GREEN}✓${NC} ElastiCache cluster found: $REDIS_ENDPOINT"
else
  echo -e "  ${YELLOW}!${NC} ElastiCache cluster not found. Deploy Phase 1 first."
fi

# Check S3 Bucket
echo "  Checking S3..."
S3_BUCKET="imobi-storage-${ACCOUNT_ID}"
if aws s3 ls "$S3_BUCKET" --region us-east-1 &> /dev/null; then
  echo -e "  ${GREEN}✓${NC} S3 bucket found: $S3_BUCKET"
else
  echo -e "  ${YELLOW}!${NC} S3 bucket not found. Deploy Phase 1 first."
fi

# Check VPC
echo "  Checking VPC..."
if aws ec2 describe-vpcs --filters "Name=tag:Name,Values=imobi-vpc" --region us-east-1 --query 'Vpcs[0].VpcId' --output text &> /dev/null; then
  VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=imobi-vpc" --region us-east-1 --query 'Vpcs[0].VpcId' --output text)
  echo -e "  ${GREEN}✓${NC} VPC found: $VPC_ID"
else
  echo -e "  ${YELLOW}!${NC} VPC not found. Deploy Phase 1 first."
fi

# Check Terraform files
echo "[5/8] Checking Terraform Configuration..."
if [ -f "terraform.tfvars" ]; then
  echo -e "${GREEN}✓${NC} terraform.tfvars found"
else
  echo -e "${RED}✗${NC} terraform.tfvars not found"
  echo "  Create with: cp terraform.tfvars.example terraform.tfvars"
  exit 1
fi

# Validate Terraform syntax
echo "[6/8] Validating Terraform Syntax..."
if terraform validate &> /dev/null; then
  echo -e "${GREEN}✓${NC} Terraform configuration valid"
else
  echo -e "${RED}✗${NC} Terraform configuration has errors"
  terraform validate
  exit 1
fi

# Check Docker
echo "[7/8] Checking Docker..."
if command -v docker &> /dev/null; then
  DOCKER_VERSION=$(docker --version)
  echo -e "${GREEN}✓${NC} Docker found: $DOCKER_VERSION"

  # Check if docker daemon is running
  if docker ps &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker daemon is running"
  else
    echo -e "${YELLOW}!${NC} Docker daemon not running (required for building images)"
  fi
else
  echo -e "${YELLOW}!${NC} Docker not found (required to build and push images)"
fi

# Summary
echo "[8/8] Validation Summary..."
echo ""
echo "Validation Results:"
echo -e "  ${GREEN}✓${NC} AWS CLI configured"
echo -e "  ${GREEN}✓${NC} AWS Credentials valid"
echo -e "  ${GREEN}✓${NC} Terraform installed"
echo -e "  ${GREEN}✓${NC} Terraform configuration valid"
echo ""

echo "========================================"
echo "Next Steps:"
echo "========================================"
echo ""
echo "1. Build Docker image:"
echo "   docker build -f services/api/Dockerfile -t imobi-api:latest ."
echo ""
echo "2. Get ECR repository URL:"
echo "   terraform output ecr_repository_url"
echo ""
echo "3. Push image to ECR:"
echo "   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com"
echo "   docker tag imobi-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi-api:latest"
echo "   docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/imobi-api:latest"
echo ""
echo "4. Deploy infrastructure:"
echo "   terraform plan -out=phase2.tfplan"
echo "   terraform apply phase2.tfplan"
echo ""
echo "5. Verify deployment:"
echo "   aws ecs describe-services --cluster imobi-prod --services imobi-api-service --region us-east-1"
echo ""
echo "========================================"
echo -e "${GREEN}Validation Complete!${NC}"
echo "========================================"
