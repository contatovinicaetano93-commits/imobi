#!/bin/bash
set -e

# Deploy NestJS API to AWS Lambda using serverless framework or SAM
# Usage: ./deploy-api-aws-lambda.sh [stage]

STAGE=${1:-"production"}
AWS_REGION=${AWS_REGION:-"sa-east-1"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_NAME="imbobi-api"
IMAGE_TAG="${STAGE}-$(date +%Y%m%d-%H%M%S)"

echo "🚀 Deploying NestJS API to AWS Lambda (Stage: $STAGE)..."

# 1. Build Docker image
echo "📦 Building Docker image..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} \
  -t ${IMAGE_NAME}:${STAGE}-latest \
  -f services/api/Dockerfile .

# 2. Tag and push to ECR
echo "🔐 Authenticating with ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_REGISTRY}

echo "📤 Pushing image to ECR..."
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
docker tag ${IMAGE_NAME}:${STAGE}-latest ${ECR_REGISTRY}/${IMAGE_NAME}:${STAGE}-latest
docker push ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
docker push ${ECR_REGISTRY}/${IMAGE_NAME}:${STAGE}-latest

# 3. Update ECS task definition and deploy
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster imbobi-${STAGE} \
  --service imbobi-api-${STAGE} \
  --force-new-deployment \
  --region ${AWS_REGION} || echo "Note: ECS service may not exist yet"

# 4. Verify deployment
echo "⏳ Waiting for service to stabilize..."
sleep 10

API_URL=${API_URL:-"https://api-${STAGE}.imbobi.com.br"}
echo "✅ Verifying deployment..."
max_retries=30
retry=0

while [ $retry -lt $max_retries ]; do
  response=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/api/v1/health" || echo "000")
  
  if [ "$response" == "200" ]; then
    echo "✨ API is healthy and running!"
    echo ""
    echo "📊 Deployment Summary:"
    echo "  Stage: $STAGE"
    echo "  Image: ${ECR_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
    echo "  URL: ${API_URL}"
    echo ""
    echo "📝 View logs:"
    echo "  aws logs tail /aws/ecs/imbobi-api-${STAGE} --follow"
    exit 0
  fi
  
  echo "  Waiting for API... (attempt $((retry+1))/$max_retries) - HTTP $response"
  sleep 2
  retry=$((retry+1))
done

echo "❌ Deployment verification timed out"
exit 1
