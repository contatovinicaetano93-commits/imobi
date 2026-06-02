#!/bin/bash
set -e

# Script to build and push imobi-api Docker image to ECR
# Usage: ./push-to-ecr.sh [image-tag] [region]

# Defaults
IMAGE_TAG="${1:-latest}"
AWS_REGION="${2:-us-east-1}"
DOCKERFILE="Dockerfile"
CONTEXT="."

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
  echo "Error: AWS credentials not configured"
  exit 1
fi

# ECR Registry
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_REPOSITORY="imobi-api"
IMAGE_NAME="${ECR_REGISTRY}/${ECR_REPOSITORY}"
IMAGE_URI="${IMAGE_NAME}:${IMAGE_TAG}"

echo "========================================"
echo "Building and Pushing imobi-api to ECR"
echo "========================================"
echo ""
echo "Configuration:"
echo "  AWS Account: $ACCOUNT_ID"
echo "  AWS Region: $AWS_REGION"
echo "  ECR Registry: $ECR_REGISTRY"
echo "  Repository: $ECR_REPOSITORY"
echo "  Image URI: $IMAGE_URI"
echo "  Dockerfile: $DOCKERFILE"
echo "  Context: $CONTEXT"
echo ""

# Step 1: Check if ECR repository exists
echo "[1/5] Checking ECR repository..."
if aws ecr describe-repositories \
  --repository-names "$ECR_REPOSITORY" \
  --region "$AWS_REGION" &> /dev/null; then
  echo "  ✓ Repository exists: $ECR_REPOSITORY"
else
  echo "  ✗ Repository not found: $ECR_REPOSITORY"
  echo "  Create it with: terraform apply"
  exit 1
fi

# Step 2: Log in to ECR
echo "[2/5] Logging in to ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$ECR_REGISTRY" > /dev/null
echo "  ✓ Logged in to ECR"

# Step 3: Build Docker image
echo "[3/5] Building Docker image..."
echo "  Command: docker build -f $DOCKERFILE -t $IMAGE_URI ."
docker build -f "$DOCKERFILE" -t "$IMAGE_URI" "$CONTEXT"
echo "  ✓ Build complete"

# Step 4: Tag as latest (if not already)
if [ "$IMAGE_TAG" != "latest" ]; then
  echo "[4/5] Tagging image as latest..."
  docker tag "$IMAGE_URI" "${IMAGE_NAME}:latest"
  echo "  ✓ Tagged as latest"
else
  echo "[4/5] Skipping latest tag (already tagged)"
fi

# Step 5: Push to ECR
echo "[5/5] Pushing to ECR..."
echo "  Pushing: $IMAGE_URI"
docker push "$IMAGE_URI"

if [ "$IMAGE_TAG" != "latest" ]; then
  echo "  Pushing: ${IMAGE_NAME}:latest"
  docker push "${IMAGE_NAME}:latest"
fi

echo ""
echo "========================================"
echo "Push Complete!"
echo "========================================"
echo ""
echo "Image pushed successfully:"
echo "  URI: $IMAGE_URI"
echo ""
echo "Next steps:"
echo "  1. Deploy with: terraform apply"
echo "  2. Verify with: aws ecs describe-services --cluster imobi-prod --services imobi-api-service"
echo ""
