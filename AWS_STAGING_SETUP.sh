#!/bin/bash

# AWS STAGING DEPLOYMENT AUTOMATION
# Centralizes imbobi infrastructure on AWS
# Prerequisites: AWS account, awscli, docker, pnpm

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "           🚀 AWS STAGING INFRASTRUCTURE SETUP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="imobi"
ENVIRONMENT="staging"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "📋 Configuration:"
echo "   Account ID: $ACCOUNT_ID"
echo "   Region: $AWS_REGION"
echo "   Environment: $ENVIRONMENT"
echo ""

# Step 1: Validate AWS credentials
validate_aws() {
  echo "🔐 STEP 1: Validating AWS credentials..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if ! aws sts get-caller-identity &>/dev/null; then
    echo "❌ AWS credentials not configured"
    echo "   Run: aws configure"
    exit 1
  fi

  echo "✅ AWS credentials validated"
  echo ""
}

# Step 2: Create ECR repositories
setup_ecr() {
  echo "🐳 STEP 2: Setting up ECR (Elastic Container Registry)..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  for service in api web; do
    REPO_NAME="${PROJECT_NAME}-${service}-${ENVIRONMENT}"

    if aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$AWS_REGION" 2>/dev/null; then
      echo "✅ ECR repository '$REPO_NAME' exists"
    else
      echo "Creating ECR repository: $REPO_NAME"
      aws ecr create-repository \
        --repository-name "$REPO_NAME" \
        --region "$AWS_REGION" \
        --image-tag-mutability MUTABLE \
        --image-scanning-configuration scanOnPush=true
      echo "✅ Created ECR repository: $REPO_NAME"
    fi
  done
  echo ""
}

# Step 3: Build and push Docker images
build_and_push() {
  echo "🔨 STEP 3: Building and pushing Docker images..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Login to ECR
  echo "Logging into ECR..."
  aws ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

  # Build and push API
  echo "Building and pushing API Docker image..."
  REPO_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${PROJECT_NAME}-api-${ENVIRONMENT}:latest"
  docker build -t "${PROJECT_NAME}-api:latest" \
    --build-arg NODE_ENV=staging \
    -f services/api/Dockerfile \
    .
  docker tag "${PROJECT_NAME}-api:latest" "$REPO_URI"
  docker push "$REPO_URI"
  echo "✅ Pushed API: $REPO_URI"

  # Build and push Web
  echo "Building and pushing Web Docker image..."
  REPO_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/${PROJECT_NAME}-web-${ENVIRONMENT}:latest"
  docker build -t "${PROJECT_NAME}-web:latest" \
    --build-arg NEXT_PUBLIC_API_URL="https://api.staging.imbobi.com" \
    -f apps/web/Dockerfile \
    .
  docker tag "${PROJECT_NAME}-web:latest" "$REPO_URI"
  docker push "$REPO_URI"
  echo "✅ Pushed Web: $REPO_URI"

  echo ""
}

# Step 4: Create RDS PostgreSQL instance
setup_rds() {
  echo "💾 STEP 4: Setting up RDS PostgreSQL..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  DB_INSTANCE_ID="${PROJECT_NAME}-db-${ENVIRONMENT}"
  DB_USER="postgres"
  DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 32)}"

  # Check if instance exists
  if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE_ID" --region "$AWS_REGION" 2>/dev/null; then
    echo "✅ RDS instance '$DB_INSTANCE_ID' exists"

    # Get endpoint
    ENDPOINT=$(aws rds describe-db-instances \
      --db-instance-identifier "$DB_INSTANCE_ID" \
      --region "$AWS_REGION" \
      --query 'DBInstances[0].Endpoint.Address' \
      --output text)

    echo "   Endpoint: $ENDPOINT"
  else
    echo "Creating RDS instance (this takes 5-10 minutes)..."

    aws rds create-db-instance \
      --db-instance-identifier "$DB_INSTANCE_ID" \
      --db-instance-class db.t3.micro \
      --engine postgres \
      --engine-version 14.6 \
      --master-username "$DB_USER" \
      --master-user-password "$DB_PASSWORD" \
      --allocated-storage 20 \
      --storage-type gp3 \
      --backup-retention-period 7 \
      --multi-az false \
      --publicly-accessible false \
      --region "$AWS_REGION" \
      --db-name "${PROJECT_NAME}_staging" \
      --port 5432

    echo "⏳ Waiting for RDS instance to be available (this takes 5-10 minutes)..."
    aws rds wait db-instance-available \
      --db-instance-identifier "$DB_INSTANCE_ID" \
      --region "$AWS_REGION"

    ENDPOINT=$(aws rds describe-db-instances \
      --db-instance-identifier "$DB_INSTANCE_ID" \
      --region "$AWS_REGION" \
      --query 'DBInstances[0].Endpoint.Address' \
      --output text)

    echo "✅ RDS instance created"
    echo "   Endpoint: $ENDPOINT"
    echo "   Username: $DB_USER"
    echo "   Password: $DB_PASSWORD (save this!)"
  fi

  # Create DATABASE_URL
  export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${ENDPOINT}:5432/${PROJECT_NAME}_staging"
  echo "   DATABASE_URL configured"
  echo ""
}

# Step 5: Create ElastiCache Redis
setup_redis() {
  echo "⚡ STEP 5: Setting up ElastiCache Redis..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  REDIS_ID="${PROJECT_NAME}-redis-${ENVIRONMENT}"

  # Check if cache cluster exists
  if aws elasticache describe-cache-clusters --cache-cluster-id "$REDIS_ID" --region "$AWS_REGION" 2>/dev/null; then
    echo "✅ ElastiCache cluster '$REDIS_ID' exists"

    # Get endpoint
    REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
      --cache-cluster-id "$REDIS_ID" \
      --region "$AWS_REGION" \
      --show-cache-node-info \
      --query 'CacheClusters[0].CacheNodes[0].Address' \
      --output text)

    REDIS_PORT=$(aws elasticache describe-cache-clusters \
      --cache-cluster-id "$REDIS_ID" \
      --region "$AWS_REGION" \
      --show-cache-node-info \
      --query 'CacheClusters[0].CacheNodes[0].Port' \
      --output text)

    echo "   Endpoint: $REDIS_ENDPOINT:$REDIS_PORT"
  else
    echo "Creating ElastiCache Redis cluster..."

    aws elasticache create-cache-cluster \
      --cache-cluster-id "$REDIS_ID" \
      --cache-node-type cache.t3.micro \
      --engine redis \
      --engine-version 7.0 \
      --num-cache-nodes 1 \
      --region "$AWS_REGION" \
      --port 6379

    echo "⏳ Waiting for Redis to be available (this takes 5-10 minutes)..."
    aws elasticache wait cache-cluster-available \
      --cache-cluster-id "$REDIS_ID" \
      --region "$AWS_REGION"

    REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
      --cache-cluster-id "$REDIS_ID" \
      --region "$AWS_REGION" \
      --show-cache-node-info \
      --query 'CacheClusters[0].CacheNodes[0].Address' \
      --output text)

    REDIS_PORT=$(aws elasticache describe-cache-clusters \
      --cache-cluster-id "$REDIS_ID" \
      --region "$AWS_REGION" \
      --show-cache-node-info \
      --query 'CacheClusters[0].CacheNodes[0].Port' \
      --output text)

    echo "✅ ElastiCache cluster created"
    echo "   Endpoint: $REDIS_ENDPOINT:$REDIS_PORT"
  fi

  export REDIS_HOST="$REDIS_ENDPOINT"
  export REDIS_PORT="${REDIS_PORT:-6379}"
  echo ""
}

# Step 6: Create ECS Cluster
setup_ecs_cluster() {
  echo "🎯 STEP 6: Setting up ECS Cluster..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

  # Check if cluster exists
  if aws ecs describe-clusters --clusters "$CLUSTER_NAME" --region "$AWS_REGION" 2>/dev/null | grep -q '"status": "ACTIVE"'; then
    echo "✅ ECS cluster '$CLUSTER_NAME' exists"
  else
    echo "Creating ECS cluster..."

    aws ecs create-cluster \
      --cluster-name "$CLUSTER_NAME" \
      --region "$AWS_REGION" \
      --cluster-settings name=containerInsights,value=enabled

    echo "✅ ECS cluster created"
  fi
  echo ""
}

# Step 7: Create S3 bucket for assets
setup_s3() {
  echo "📦 STEP 7: Setting up S3 bucket..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  BUCKET_NAME="${PROJECT_NAME}-assets-${ENVIRONMENT}-${ACCOUNT_ID}"

  # Check if bucket exists
  if aws s3 ls "s3://${BUCKET_NAME}" --region "$AWS_REGION" 2>/dev/null; then
    echo "✅ S3 bucket '$BUCKET_NAME' exists"
  else
    echo "Creating S3 bucket..."

    aws s3 mb "s3://${BUCKET_NAME}" --region "$AWS_REGION"

    # Enable versioning
    aws s3api put-bucket-versioning \
      --bucket "$BUCKET_NAME" \
      --versioning-configuration Status=Enabled

    # Block public access
    aws s3api put-public-access-block \
      --bucket "$BUCKET_NAME" \
      --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

    echo "✅ S3 bucket created"
  fi

  export AWS_S3_BUCKET="$BUCKET_NAME"
  echo ""
}

# Step 8: Generate environment file
generate_env() {
  echo "🔧 STEP 8: Generating .env.staging..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  cat > .env.staging << EOF
NODE_ENV=staging
PORT=4000

# Database
DATABASE_URL="${DATABASE_URL}"

# Redis
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}

# JWT & Encryption
JWT_SECRET="$(openssl rand -base64 32)"
ENCRYPTION_KEY="$(openssl rand -base64 32)"

# CORS
CORS_ORIGIN="https://staging.imbobi.com,https://api.staging.imbobi.com"

# Sentry
SENTRY_DSN="${SENTRY_DSN:-}"
RELEASE_VERSION="staging-aws-$(date +%Y%m%d)"

# AWS S3
AWS_REGION=${AWS_REGION}
AWS_S3_BUCKET=${AWS_S3_BUCKET}
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# Email (AWS SES)
SMTP_HOST="email-smtp.${AWS_REGION}.amazonaws.com"
SMTP_PORT=587
SMTP_USER="${SMTP_USER:-}"
SMTP_PASS="${SMTP_PASS:-}"
SMTP_FROM="noreply@staging.imbobi.com"

# Expo
EXPO_PUBLIC_API_URL="https://api.staging.imbobi.com/api/v1"
EAS_PROJECT_ID="${EAS_PROJECT_ID:-}"
EOF

  echo "✅ .env.staging created"
  echo "⚠️  Update credentials in .env.staging before deploying:"
  echo "   - SENTRY_DSN"
  echo "   - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY"
  echo "   - SMTP credentials"
  echo "   - EAS_PROJECT_ID"
  echo ""
}

# Main execution
main() {
  validate_aws
  setup_ecr
  build_and_push
  setup_rds
  setup_redis
  setup_ecs_cluster
  setup_s3
  generate_env

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ AWS STAGING INFRASTRUCTURE READY"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📊 Infrastructure Summary:"
  echo "   Region: $AWS_REGION"
  echo "   ECS Cluster: ${PROJECT_NAME}-${ENVIRONMENT}"
  echo "   RDS Database: postgresql://..."
  echo "   Redis Endpoint: ${REDIS_HOST}:${REDIS_PORT}"
  echo "   S3 Bucket: ${AWS_S3_BUCKET}"
  echo ""
  echo "🚀 Next Steps:"
  echo "   1. Update .env.staging with credentials (AWS keys, Sentry, etc.)"
  echo "   2. Run: pnpm db:migrate"
  echo "   3. Deploy with: bash AWS_ECS_DEPLOY.sh"
  echo ""
}

main "$@"
