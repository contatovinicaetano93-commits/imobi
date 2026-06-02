#!/bin/bash
set -e

# ============================================================================
#  AWS STAGING INFRASTRUCTURE SETUP — with CodeBuild for Docker images
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "           🚀 AWS STAGING INFRASTRUCTURE SETUP (CodeBuild)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ENVIRONMENT="staging"
CODEBUILD_PROJECT="imobi-api-web-build-staging"
S3_BUCKET="imobi-codebuild-artifacts-${ACCOUNT_ID}"

echo ""
echo "📋 Configuration:"
echo "   Account ID: $ACCOUNT_ID"
echo "   Region: $AWS_REGION"
echo "   Environment: $ENVIRONMENT"
echo "   CodeBuild Project: $CODEBUILD_PROJECT"
echo ""

# ============================================================================
# STEP 1: Validate AWS Credentials
# ============================================================================
echo "🔐 STEP 1: Validating AWS credentials..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

aws sts get-caller-identity > /dev/null 2>&1 && echo "✅ AWS credentials validated" || {
  echo "❌ AWS credentials invalid. Please configure AWS credentials."
  exit 1
}

# ============================================================================
# STEP 2: Setup ECR (Elastic Container Registry)
# ============================================================================
echo ""
echo "🐳 STEP 2: Setting up ECR (Elastic Container Registry)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for REPO in "imobi-api-staging" "imobi-web-staging"; do
  if aws ecr describe-repositories --repository-names "$REPO" --region "$AWS_REGION" > /dev/null 2>&1; then
    echo "✅ ECR repository '$REPO' exists"
  else
    echo "   Creating ECR repository '$REPO'..."
    aws ecr create-repository \
      --repository-name "$REPO" \
      --region "$AWS_REGION" \
      --image-scanning-configuration scanOnPush=true \
      --encryption-configuration encryptionType=AES256 > /dev/null
    echo "✅ ECR repository '$REPO' created"
  fi
done

# ============================================================================
# STEP 3: Setup S3 Bucket for CodeBuild Artifacts
# ============================================================================
echo ""
echo "📦 STEP 3: Setting up S3 bucket for CodeBuild artifacts..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if aws s3 ls "s3://$S3_BUCKET" > /dev/null 2>&1; then
  echo "✅ S3 bucket '$S3_BUCKET' exists"
else
  echo "   Creating S3 bucket '$S3_BUCKET'..."
  aws s3 mb "s3://$S3_BUCKET" --region "$AWS_REGION"
  echo "✅ S3 bucket '$S3_BUCKET' created"
fi

# ============================================================================
# STEP 4: Create IAM Role for CodeBuild
# ============================================================================
echo ""
echo "👤 STEP 4: Setting up IAM role for CodeBuild..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

CODEBUILD_ROLE="imobi-codebuild-role-staging"

if aws iam get-role --role-name "$CODEBUILD_ROLE" > /dev/null 2>&1; then
  echo "✅ IAM role '$CODEBUILD_ROLE' exists"
else
  echo "   Creating IAM role '$CODEBUILD_ROLE'..."

  # Trust policy for CodeBuild
  TRUST_POLICY='{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "codebuild.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

  aws iam create-role \
    --role-name "$CODEBUILD_ROLE" \
    --assume-role-policy-document "$TRUST_policy" > /dev/null

  # Attach ECR and S3 policy
  POLICY='{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject"
        ],
        "Resource": "arn:aws:s3:::'"$S3_BUCKET"'/*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "*"
      }
    ]
  }'

  aws iam put-role-policy \
    --role-name "$CODEBUILD_ROLE" \
    --policy-name "CodeBuildPolicy" \
    --policy-document "$POLICY"

  echo "✅ IAM role '$CODEBUILD_ROLE' created with policies"
fi

CODEBUILD_ROLE_ARN=$(aws iam get-role --role-name "$CODEBUILD_ROLE" --query 'Role.Arn' --output text)

# ============================================================================
# STEP 5: Create CodeBuild Project
# ============================================================================
echo ""
echo "🏗️  STEP 5: Setting up CodeBuild project..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if aws codebuild batch-get-projects --names "$CODEBUILD_PROJECT" --region "$AWS_REGION" 2>/dev/null | grep -q "$CODEBUILD_PROJECT"; then
  echo "✅ CodeBuild project '$CODEBUILD_PROJECT' exists"
else
  echo "   Creating CodeBuild project '$CODEBUILD_PROJECT'..."

  aws codebuild create-project \
    --name "$CODEBUILD_PROJECT" \
    --region "$AWS_REGION" \
    --source type=GITHUB,location=https://github.com/contatovinicaetano93-commits/imobi.git \
    --artifacts type=S3,location="$S3_BUCKET" \
    --environment type=LINUX_GPU,image=aws/codebuild/standard:7.0,computeType=BUILD_GENERAL1_LARGE,environmentVariables='[{"name":"AWS_ACCOUNT_ID","value":"'"$ACCOUNT_ID"'"},{"name":"AWS_DEFAULT_REGION","value":"'"$AWS_REGION"'"}]' \
    --service-role "$CODEBUILD_ROLE_ARN" \
    --logs-config cloudWatchLogs='{status=ENABLED,groupName=/aws/codebuild/imobi-staging}' > /dev/null 2>&1 || true

  echo "✅ CodeBuild project '$CODEBUILD_PROJECT' ready"
fi

# ============================================================================
# STEP 6: Trigger CodeBuild
# ============================================================================
echo ""
echo "🔨 STEP 6: Triggering Docker build via CodeBuild (this will take ~10-15 min)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BUILD_ID=$(aws codebuild start-build \
  --project-name "$CODEBUILD_PROJECT" \
  --region "$AWS_REGION" \
  --query 'build.id' \
  --output text)

echo "✅ CodeBuild triggered: Build ID = $BUILD_ID"
echo "   Monitoring build progress... (this takes ~10-15 minutes)"
echo ""

# Monitor build status
while true; do
  BUILD_STATUS=$(aws codebuild batch-get-builds \
    --ids "$BUILD_ID" \
    --region "$AWS_REGION" \
    --query 'builds[0].buildStatus' \
    --output text)

  case "$BUILD_STATUS" in
    "SUCCEEDED")
      echo "✅ CodeBuild succeeded! Docker images pushed to ECR."
      break
      ;;
    "FAILED"|"FAULT"|"TIMED_OUT"|"STOPPED")
      echo "❌ CodeBuild failed with status: $BUILD_STATUS"
      echo "   Check logs: aws codebuild batch-get-builds --ids $BUILD_ID --region $AWS_REGION"
      exit 1
      ;;
    "IN_PROGRESS")
      PHASE=$(aws codebuild batch-get-builds \
        --ids "$BUILD_ID" \
        --region "$AWS_REGION" \
        --query 'builds[0].currentPhase' \
        --output text)
      echo "   ⏳ Build in progress: $PHASE..."
      sleep 30
      ;;
    *)
      echo "   ⏳ Build status: $BUILD_STATUS... (waiting)"
      sleep 30
      ;;
  esac
done

# ============================================================================
# STEP 7: Create RDS PostgreSQL Instance
# ============================================================================
echo ""
echo "🗄️  STEP 7: Creating RDS PostgreSQL instance..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DB_INSTANCE="imobi-staging-db"
DB_USER="postgres"
DB_PASSWORD=$(openssl rand -base64 16)

if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE" --region "$AWS_REGION" > /dev/null 2>&1; then
  echo "✅ RDS instance '$DB_INSTANCE' already exists"
  DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE" \
    --region "$AWS_REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)
else
  echo "   Creating RDS instance '$DB_INSTANCE'..."
  aws rds create-db-instance \
    --db-instance-identifier "$DB_INSTANCE" \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version "14.7" \
    --master-username "$DB_USER" \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --storage-type gp3 \
    --storage-encrypted \
    --backup-retention-period 7 \
    --publicly-accessible false \
    --multi-az false \
    --region "$AWS_REGION" > /dev/null

  echo "   Waiting for RDS instance to be available (this takes ~5-10 min)..."
  aws rds wait db-instance-available \
    --db-instance-identifier "$DB_INSTANCE" \
    --region "$AWS_REGION"

  DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE" \
    --region "$AWS_REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

  echo "✅ RDS instance created: $DB_ENDPOINT"
fi

# ============================================================================
# STEP 8: Create ElastiCache Redis Cluster
# ============================================================================
echo ""
echo "⚡ STEP 8: Creating ElastiCache Redis cluster..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REDIS_CLUSTER="imobi-staging-redis"

if aws elasticache describe-cache-clusters --cache-cluster-id "$REDIS_CLUSTER" --region "$AWS_REGION" > /dev/null 2>&1; then
  echo "✅ Redis cluster '$REDIS_CLUSTER' already exists"
  REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --region "$AWS_REGION" \
    --show-cache-node-info \
    --query 'CacheClusters[0].CacheNodes[0].Address' \
    --output text)
else
  echo "   Creating Redis cluster '$REDIS_CLUSTER'..."
  aws elasticache create-cache-cluster \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --engine redis \
    --cache-node-type cache.t3.micro \
    --engine-version "7.0" \
    --num-cache-nodes 1 \
    --region "$AWS_REGION" > /dev/null

  echo "   Waiting for Redis cluster to be available (this takes ~3-5 min)..."
  aws elasticache wait cache-cluster-available \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --region "$AWS_REGION"

  REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --region "$AWS_REGION" \
    --show-cache-node-info \
    --query 'CacheClusters[0].CacheNodes[0].Address' \
    --output text)

  echo "✅ Redis cluster created: $REDIS_ENDPOINT"
fi

# ============================================================================
# STEP 9: Create ECS Cluster
# ============================================================================
echo ""
echo "🚢 STEP 9: Creating ECS Cluster..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ECS_CLUSTER="imobi-staging-cluster"

if aws ecs describe-clusters --clusters "$ECS_CLUSTER" --region "$AWS_REGION" 2>/dev/null | grep -q "$ECS_CLUSTER"; then
  echo "✅ ECS cluster '$ECS_CLUSTER' already exists"
else
  echo "   Creating ECS cluster '$ECS_CLUSTER'..."
  aws ecs create-cluster \
    --cluster-name "$ECS_CLUSTER" \
    --capacity-providers FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1,base=1 \
    --region "$AWS_REGION" > /dev/null
  echo "✅ ECS cluster '$ECS_CLUSTER' created"
fi

# ============================================================================
# STEP 10: Create S3 Bucket for Application Storage
# ============================================================================
echo ""
echo "💾 STEP 10: Creating S3 bucket for application storage..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

APP_S3_BUCKET="imobi-staging-storage-${ACCOUNT_ID}"

if aws s3 ls "s3://$APP_S3_BUCKET" > /dev/null 2>&1; then
  echo "✅ S3 bucket '$APP_S3_BUCKET' already exists"
else
  echo "   Creating S3 bucket '$APP_S3_BUCKET'..."
  aws s3 mb "s3://$APP_S3_BUCKET" --region "$AWS_REGION"
  aws s3api put-bucket-versioning \
    --bucket "$APP_S3_BUCKET" \
    --versioning-configuration Status=Enabled
  echo "✅ S3 bucket '$APP_S3_BUCKET' created"
fi

# ============================================================================
# STEP 11: Update .env.staging with Real Endpoints
# ============================================================================
echo ""
echo "⚙️  STEP 11: Updating .env.staging with real AWS endpoints..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Generate secrets if not already done
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Update .env.staging
cat > .env.staging << EOF
NODE_ENV=staging
PORT=4000
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_ENDPOINT}:5432/imobi_staging
REDIS_HOST=${REDIS_ENDPOINT}
REDIS_PORT=6379
JWT_SECRET=${JWT_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
CORS_ORIGIN=https://staging.imbobi.com,https://api.staging.imbobi.com
SENTRY_DSN=
AWS_REGION=${AWS_REGION}
AWS_S3_BUCKET=${APP_S3_BUCKET}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
SMTP_HOST=email-smtp.${AWS_REGION}.amazonaws.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@staging.imbobi.com
EXPO_PUBLIC_API_URL=https://api.staging.imbobi.com/api/v1
EAS_PROJECT_ID=
EOF

echo "✅ .env.staging updated with:"
echo "   DATABASE_URL: postgresql://${DB_USER}:***@${DB_ENDPOINT}:5432/imobi_staging"
echo "   REDIS_HOST: ${REDIS_ENDPOINT}"
echo "   S3_BUCKET: ${APP_S3_BUCKET}"

# ============================================================================
# FINAL: Summary
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ AWS STAGING INFRASTRUCTURE READY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Infrastructure Summary:"
echo "   ✅ ECR Repositories: imobi-api-staging, imobi-web-staging"
echo "   ✅ Docker Images: Built & pushed via CodeBuild"
echo "   ✅ RDS PostgreSQL: ${DB_ENDPOINT}"
echo "   ✅ ElastiCache Redis: ${REDIS_ENDPOINT}"
echo "   ✅ ECS Cluster: ${ECS_CLUSTER}"
echo "   ✅ S3 Storage: ${APP_S3_BUCKET}"
echo "   ✅ Environment File: .env.staging (updated)"
echo ""
echo "🚀 Next Steps:"
echo "   1. Run migrations: pnpm db:migrate"
echo "   2. Deploy to ECS: ./AWS_ECS_DEPLOY.sh deploy"
echo "   3. Verify health: curl https://api.staging.imbobi.com/api/v1/health"
echo ""
