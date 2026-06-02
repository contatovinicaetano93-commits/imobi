#!/bin/bash
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "           🚀 AWS STAGING INFRASTRUCTURE (Infra Only)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

AWS_REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo ""
echo "📋 Configuration:"
echo "   Account ID: $ACCOUNT_ID"
echo "   Region: $AWS_REGION"
echo ""

# ============================================================================
# STEP 1: Create RDS PostgreSQL Instance
# ============================================================================
echo "🗄️  STEP 1: Creating RDS PostgreSQL instance..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DB_INSTANCE="imobi-staging-db"
DB_USER="postgres"
DB_PASSWORD=$(openssl rand -base64 16)

if aws rds describe-db-instances --db-instance-identifier "$DB_INSTANCE" --region "$AWS_REGION" > /dev/null 2>&1; then
  echo "✅ RDS instance already exists"
  DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE" \
    --region "$AWS_REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)
else
  echo "   Creating RDS (this takes ~5-10 min)..."
  aws rds create-db-instance \
    --db-instance-identifier "$DB_INSTANCE" \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version "15" \
    --master-username "$DB_USER" \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --storage-type gp3 \
    --storage-encrypted \
    --backup-retention-period 1 \
    --no-publicly-accessible \
    --region "$AWS_REGION" > /dev/null

  echo "   Waiting for RDS..."
  aws rds wait db-instance-available \
    --db-instance-identifier "$DB_INSTANCE" \
    --region "$AWS_REGION"

  DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier "$DB_INSTANCE" \
    --region "$AWS_REGION" \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

  echo "✅ RDS created: $DB_ENDPOINT"
fi

# ============================================================================
# STEP 2: Create ElastiCache Redis Cluster
# ============================================================================
echo ""
echo "⚡ STEP 2: Creating ElastiCache Redis cluster..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REDIS_CLUSTER="imobi-staging-redis"

if aws elasticache describe-cache-clusters --cache-cluster-id "$REDIS_CLUSTER" --region "$AWS_REGION" > /dev/null 2>&1; then
  echo "✅ Redis cluster already exists"
  REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --region "$AWS_REGION" \
    --show-cache-node-info \
    --query 'CacheClusters[0].CacheNodes[0].Address' \
    --output text)
else
  echo "   Creating Redis (this takes ~3-5 min)..."
  aws elasticache create-cache-cluster \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --engine redis \
    --cache-node-type cache.t3.micro \
    --engine-version "7.0" \
    --num-cache-nodes 1 \
    --region "$AWS_REGION" > /dev/null

  echo "   Waiting for Redis..."
  aws elasticache wait cache-cluster-available \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --region "$AWS_REGION"

  REDIS_ENDPOINT=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id "$REDIS_CLUSTER" \
    --region "$AWS_REGION" \
    --show-cache-node-info \
    --query 'CacheClusters[0].CacheNodes[0].Address' \
    --output text)

  echo "✅ Redis created: $REDIS_ENDPOINT"
fi

# ============================================================================
# STEP 3: Create ECS Cluster
# ============================================================================
echo ""
echo "🚢 STEP 3: Creating ECS Cluster..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ECS_CLUSTER="imobi-staging-cluster"

if aws ecs describe-clusters --clusters "$ECS_CLUSTER" --region "$AWS_REGION" 2>/dev/null | grep -q "$ECS_CLUSTER"; then
  echo "✅ ECS cluster already exists"
else
  echo "   Creating ECS cluster..."
  aws ecs create-cluster \
    --cluster-name "$ECS_CLUSTER" \
    --capacity-providers FARGATE \
    --region "$AWS_REGION" > /dev/null
  echo "✅ ECS cluster created"
fi

# ============================================================================
# STEP 4: Create S3 Bucket for Application Storage
# ============================================================================
echo ""
echo "💾 STEP 4: Creating S3 bucket for application..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

APP_S3_BUCKET="imobi-staging-storage-${ACCOUNT_ID}"

if aws s3 ls "s3://$APP_S3_BUCKET" > /dev/null 2>&1; then
  echo "✅ S3 bucket already exists"
else
  echo "   Creating S3 bucket..."
  aws s3 mb "s3://$APP_S3_BUCKET" --region "$AWS_REGION"
  aws s3api put-bucket-versioning \
    --bucket "$APP_S3_BUCKET" \
    --versioning-configuration Status=Enabled
  echo "✅ S3 bucket created"
fi

# ============================================================================
# STEP 5: Update .env.staging
# ============================================================================
echo ""
echo "⚙️  STEP 5: Updating .env.staging with AWS endpoints..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

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

echo "✅ .env.staging updated"

# ============================================================================
# FINAL: Summary
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ AWS INFRASTRUCTURE READY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Resources Created:"
echo "   ✅ RDS PostgreSQL: ${DB_ENDPOINT}"
echo "   ✅ ElastiCache Redis: ${REDIS_ENDPOINT}"
echo "   ✅ ECS Cluster: ${ECS_CLUSTER}"
echo "   ✅ S3 Storage: ${APP_S3_BUCKET}"
echo "   ✅ Environment: .env.staging"
echo ""
echo "🚀 Next Steps:"
echo "   1. Push Docker images to ECR (locally or via CI/CD)"
echo "   2. Run: pnpm db:migrate"
echo "   3. Deploy: ./AWS_ECS_DEPLOY.sh deploy"
echo ""
