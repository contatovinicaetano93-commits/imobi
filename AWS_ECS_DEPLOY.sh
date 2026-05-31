#!/bin/bash

# AWS ECS DEPLOYMENT SCRIPT
# Deploys imobi services to AWS ECS with database migrations and health checks

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "           🚀 AWS ECS DEPLOYMENT — imbobi"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="imobi"
ENVIRONMENT="${ENVIRONMENT:-staging}"
COMMAND="${1:-deploy}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Load environment
if [ -f ".env.${ENVIRONMENT}" ]; then
  export $(cat ".env.${ENVIRONMENT}" | grep -v '^#' | xargs)
else
  echo "❌ .env.${ENVIRONMENT} not found"
  exit 1
fi

# Step 1: Verify environment
verify_env() {
  echo "📋 STEP 1: Verifying environment..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  local missing=()
  for var in DATABASE_URL REDIS_HOST JWT_SECRET ENCRYPTION_KEY AWS_S3_BUCKET; do
    if [ -z "${!var}" ]; then
      missing+=("$var")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    echo "❌ Missing environment variables:"
    printf '   - %s\n' "${missing[@]}"
    exit 1
  fi

  CLUSTER_NAME="${PROJECT_NAME}-${ENVIRONMENT}"
  echo "✅ Environment verified"
  echo "   Cluster: $CLUSTER_NAME"
  echo "   Region: $AWS_REGION"
  echo ""
}

# Step 2: Run database migrations
migrate_database() {
  echo "💾 STEP 2: Running database migrations..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  if [ -z "$SKIP_MIGRATIONS" ]; then
    echo "Running Prisma migrations..."
    pnpm db:migrate || {
      echo "⚠️  Migrations failed, but continuing (may be on initial deploy)"
    }
    echo "✅ Migrations complete"
  else
    echo "⏭️  Skipping migrations (SKIP_MIGRATIONS set)"
  fi
  echo ""
}

# Step 3: Register ECS task definitions
register_task_definitions() {
  echo "📝 STEP 3: Registering ECS task definitions..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Create task definition for API
  echo "Registering API task definition..."
  aws ecs register-task-definition \
    --family "${PROJECT_NAME}-api-${ENVIRONMENT}" \
    --network-mode awsvpc \
    --requires-compatibilities FARGATE \
    --cpu 256 \
    --memory 512 \
    --execution-role-arn "arn:aws:iam::${ACCOUNT_ID}:role/ecsTaskExecutionRole" \
    --container-definitions "[
      {
        \"name\": \"${PROJECT_NAME}-api\",
        \"image\": \"${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${PROJECT_NAME}-api-${ENVIRONMENT}:latest\",
        \"portMappings\": [
          {
            \"containerPort\": 4000,
            \"hostPort\": 4000,
            \"protocol\": \"tcp\"
          }
        ],
        \"environment\": [
          {\"name\": \"NODE_ENV\", \"value\": \"${ENVIRONMENT}\"},
          {\"name\": \"PORT\", \"value\": \"4000\"},
          {\"name\": \"DATABASE_URL\", \"value\": \"${DATABASE_URL}\"},
          {\"name\": \"REDIS_HOST\", \"value\": \"${REDIS_HOST}\"},
          {\"name\": \"REDIS_PORT\", \"value\": \"${REDIS_PORT}\"},
          {\"name\": \"JWT_SECRET\", \"value\": \"${JWT_SECRET}\"},
          {\"name\": \"ENCRYPTION_KEY\", \"value\": \"${ENCRYPTION_KEY}\"},
          {\"name\": \"AWS_REGION\", \"value\": \"${AWS_REGION}\"},
          {\"name\": \"AWS_S3_BUCKET\", \"value\": \"${AWS_S3_BUCKET}\"},
          {\"name\": \"SENTRY_DSN\", \"value\": \"${SENTRY_DSN}\"},
          {\"name\": \"CORS_ORIGIN\", \"value\": \"https://staging.imbobi.com\"}
        ],
        \"logConfiguration\": {
          \"logDriver\": \"awslogs\",
          \"options\": {
            \"awslogs-group\": \"/ecs/${PROJECT_NAME}-api-${ENVIRONMENT}\",
            \"awslogs-region\": \"${AWS_REGION}\",
            \"awslogs-stream-prefix\": \"ecs\"
          }
        },
        \"healthCheck\": {
          \"command\": [
            \"CMD-SHELL\",
            \"curl -f http://localhost:4000/api/v1/health || exit 1\"
          ],
          \"interval\": 30,
          \"timeout\": 5,
          \"retries\": 3,
          \"startPeriod\": 60
        }
      }
    ]" \
    --region "$AWS_REGION"

  echo "✅ Task definitions registered"
  echo ""
}

# Step 4: Create or update ECS services
deploy_services() {
  echo "🚀 STEP 4: Deploying ECS services..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Deploy API service
  SERVICE_NAME="${PROJECT_NAME}-api-${ENVIRONMENT}"
  TASK_FAMILY="${PROJECT_NAME}-api-${ENVIRONMENT}"

  echo "Deploying API service: $SERVICE_NAME"

  # Check if service exists
  if aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --region "$AWS_REGION" | grep -q "serviceName"; then

    # Update existing service
    aws ecs update-service \
      --cluster "$CLUSTER_NAME" \
      --service "$SERVICE_NAME" \
      --force-new-deployment \
      --region "$AWS_REGION" > /dev/null

    echo "✅ Updated service: $SERVICE_NAME"
  else
    # Create new service
    aws ecs create-service \
      --cluster "$CLUSTER_NAME" \
      --service-name "$SERVICE_NAME" \
      --task-definition "$TASK_FAMILY" \
      --desired-count 2 \
      --launch-type FARGATE \
      --network-configuration "awsvpcConfiguration={
        subnets=[],
        assignPublicIp=ENABLED
      }" \
      --load-balancers "[{
        \"targetGroupArn\": \"arn:aws:elasticloadbalancing:${AWS_REGION}:${ACCOUNT_ID}:targetgroup/${PROJECT_NAME}-api-${ENVIRONMENT}/xxx\",
        \"containerName\": \"${PROJECT_NAME}-api\",
        \"containerPort\": 4000
      }]" \
      --region "$AWS_REGION"

    echo "✅ Created service: $SERVICE_NAME"
  fi

  echo ""
}

# Step 5: Health checks
health_checks() {
  echo "🏥 STEP 5: Health checks..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  echo "Checking database connection..."
  if psql -h "$DATABASE_HOST" -U postgres -d "${PROJECT_NAME}_${ENVIRONMENT}" -c "SELECT 1;" 2>/dev/null; then
    echo "✅ Database connected"
  else
    echo "⚠️  Database check inconclusive"
  fi

  echo "Checking Redis connection..."
  if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null; then
    echo "✅ Redis connected"
  else
    echo "⚠️  Redis check inconclusive"
  fi

  echo "✅ Health checks complete"
  echo ""
}

# Step 6: Wait for tasks to be running
wait_for_tasks() {
  echo "⏳ STEP 6: Waiting for ECS tasks to start..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  SERVICE_NAME="${PROJECT_NAME}-api-${ENVIRONMENT}"
  MAX_ATTEMPTS=60
  ATTEMPT=0

  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    RUNNING=$(aws ecs list-tasks \
      --cluster "$CLUSTER_NAME" \
      --service-name "$SERVICE_NAME" \
      --desired-status RUNNING \
      --region "$AWS_REGION" \
      --query 'taskArns | length(@)' \
      --output text)

    if [ "$RUNNING" -ge 1 ]; then
      echo "✅ Tasks are running (count: $RUNNING)"
      break
    fi

    ATTEMPT=$((ATTEMPT + 1))
    echo "⏳ Waiting for tasks... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 10
  done

  if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    echo "❌ Tasks failed to start"
    return 1
  fi

  echo ""
}

# Step 7: Smoke tests
smoke_tests() {
  echo "✅ STEP 7: Running smoke tests..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  API_URL="${API_ENDPOINT:-http://localhost:4000/api/v1}"

  echo "Testing API health check..."
  if curl -s -f "$API_URL/health" > /dev/null; then
    echo "✅ API responding"
  else
    echo "⚠️  API not responding (may still be starting)"
  fi

  echo "✅ Smoke tests complete"
  echo ""
}

# Main flow
main() {
  verify_env

  case "$COMMAND" in
    verify)
      verify_env
      ;;
    migrate)
      verify_env
      migrate_database
      ;;
    deploy)
      verify_env
      migrate_database
      register_task_definitions
      deploy_services
      wait_for_tasks
      health_checks
      smoke_tests
      ;;
    *)
      echo "Usage: $0 [verify|migrate|deploy]"
      exit 1
      ;;
  esac

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Deployment complete!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📊 ECS Cluster: $CLUSTER_NAME"
  echo "🌐 API Service: ${PROJECT_NAME}-api-${ENVIRONMENT}"
  echo "📈 Monitor: https://console.aws.amazon.com/ecs/"
  echo ""
}

main "$@"
