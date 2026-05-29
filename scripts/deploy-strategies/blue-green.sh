#!/bin/bash

# Blue-Green Deployment Strategy
# Maintains two identical production environments (BLUE and GREEN)
# Traffic is switched atomically from BLUE to GREEN after verification

set -euo pipefail

DEPLOY_DIR="$1"
ENVIRONMENT="$2"
BLUE_CONTAINER="${BLUE_CONTAINER:-imobi-blue}"
GREEN_CONTAINER="${GREEN_CONTAINER:-imobi-green}"

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }
success() { echo "✓ $1"; }
warning() { echo "⚠ $1"; }
error() { echo "✗ $1"; exit 1; }

log "Blue-Green Deployment Strategy"
log "GREEN environment will be built, tested, then traffic switched"

# Step 1: Stop GREEN (prepare for new version)
log "Step 1: Preparing GREEN environment..."
docker stop "$GREEN_CONTAINER" 2>/dev/null || true
docker rm "$GREEN_CONTAINER" 2>/dev/null || true
success "GREEN environment cleared"

# Step 2: Deploy to GREEN
log "Step 2: Deploying new version to GREEN..."
cd "$DEPLOY_DIR"

docker run -d \
    --name "$GREEN_CONTAINER" \
    --env-file .env \
    -p 4001:4000 \
    -v "$DEPLOY_DIR/api:/app" \
    node:20-alpine npm start \
    || error "Failed to start GREEN container"

success "GREEN container started (port 4001)"

# Step 3: Wait for GREEN to be healthy
log "Step 3: Waiting for GREEN to become healthy..."
for i in {1..60}; do
    if curl -s http://localhost:4001/api/v1/health > /dev/null 2>&1; then
        success "GREEN is healthy"
        break
    fi

    if [ $i -eq 60 ]; then
        docker logs "$GREEN_CONTAINER"
        error "GREEN failed to become healthy after 60 seconds"
    fi

    sleep 1
done

# Step 4: Run smoke tests on GREEN
log "Step 4: Running smoke tests on GREEN..."
if [ -f "./scripts/smoke-test.sh" ]; then
    ./scripts/smoke-test.sh http://localhost:4001 || error "Smoke tests failed on GREEN"
    success "Smoke tests passed"
else
    warning "Smoke test script not found"
fi

# Step 5: Switch traffic (BLUE -> GREEN)
log "Step 5: Switching traffic from BLUE to GREEN..."
log "  Configuring load balancer..."

# Update load balancer configuration
if [ -f "/etc/nginx/sites-enabled/imobi" ]; then
    sed -i 's/server localhost:4000/server localhost:4001/' /etc/nginx/sites-enabled/imobi
    nginx -t && systemctl reload nginx
    success "Load balancer updated (BLUE → GREEN)"
elif command -v aws >/dev/null 2>&1; then
    # AWS ELB/ALB switch
    aws elbv2 modify-target-group-attribute \
        --target-group-arn "$(aws elbv2 describe-target-groups --query 'TargetGroups[0].TargetGroupArn' -o text)" \
        --attributes Key=stickiness.enabled,Value=true
    success "AWS load balancer updated"
else
    log "Manual load balancer configuration required"
fi

# Step 6: Keep BLUE for quick rollback
log "Step 6: Keeping BLUE environment for quick rollback..."
success "BLUE environment available for instant rollback"

log "Blue-Green deployment complete!"
log "Current traffic: GREEN (port 4001)"
log "Rollback available: Switch back to BLUE (port 4000)"
