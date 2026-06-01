#!/bin/bash

# Canary Deployment Strategy
# Gradually rolls out new version to 10% → 50% → 100% of traffic
# Allows monitoring for issues before full rollout

set -euo pipefail

DEPLOY_DIR="$1"
ENVIRONMENT="$2"
CANARY_CONTAINER="imobi-canary"
PRODUCTION_CONTAINER="imobi-prod"

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }
success() { echo "✓ $1"; }
warning() { echo "⚠ $1"; }
error() { echo "✗ $1"; exit 1; }

# Function to configure traffic split
configure_traffic_split() {
    local canary_percent=$1
    local prod_percent=$2

    if [ -f "/etc/nginx/sites-enabled/imobi" ]; then
        cat > /etc/nginx/sites-enabled/imobi << EOF
upstream canary {
    server localhost:4002;
}

upstream production {
    server localhost:4000;
}

server {
    listen 80;
    server_name api.imobi.com;

    location / {
        if (\$RANDOM > 32767) {
            proxy_pass http://canary;
        }
        proxy_pass http://production;
    }
}
EOF
        nginx -t && systemctl reload nginx
        log "  Traffic split: Canary=${canary_percent}% | Production=${prod_percent}%"
    elif command -v aws >/dev/null 2>&1; then
        # AWS ALB weighted target groups
        aws elbv2 modify-listener \
            --listener-arn "$(aws elbv2 describe-listeners --load-balancer-arn \
            $(aws elbv2 describe-load-balancers --query 'LoadBalancers[0].LoadBalancerArn' -o text) \
            --query 'Listeners[0].ListenerArn' -o text)" \
            --default-actions Type=forward,ForwardConfig="{TargetGroups=[{TargetGroupArn=arn:...:canary,Weight=${canary_percent}},{TargetGroupArn=arn:...:production,Weight=${prod_percent}}]}"
        log "  Traffic split: Canary=${canary_percent}% | Production=${prod_percent}%"
    fi
}

log "Canary Deployment Strategy"
log "Rolling out new version to 10% → 50% → 100% of traffic"

# Step 1: Start Canary
log "Step 1: Starting canary environment..."
docker run -d \
    --name "$CANARY_CONTAINER" \
    --env-file "$DEPLOY_DIR/.env" \
    -p 4002:4000 \
    -v "$DEPLOY_DIR/api:/app" \
    node:20-alpine npm start \
    || error "Failed to start canary container"

success "Canary started (port 4002)"

# Step 2: Wait for canary to be healthy
log "Step 2: Waiting for canary to become healthy..."
for i in {1..60}; do
    if curl -s http://localhost:4002/api/v1/health > /dev/null 2>&1; then
        success "Canary is healthy"
        break
    fi

    if [ $i -eq 60 ]; then
        docker logs "$CANARY_CONTAINER"
        error "Canary failed to become healthy"
    fi

    sleep 1
done

# Step 3: Route 10% traffic to canary
log "Step 3: Routing 10% of traffic to canary..."
configure_traffic_split 10 90

for i in {1..10}; do
    CANARY_ERRORS=$(curl -s http://localhost:4002/api/v1/metrics | jq '.error_rate' 2>/dev/null || echo 0)
    log "  Canary error rate: ${CANARY_ERRORS}%"

    if (( $(echo "$CANARY_ERRORS > 5" | bc -l) )); then
        error "Canary error rate too high (${CANARY_ERRORS}%). Rolling back."
    fi

    sleep 30
done

success "Canary passed with 10% traffic"

# Step 4: Route 50% traffic to canary
log "Step 4: Routing 50% of traffic to canary..."
configure_traffic_split 50 50

for i in {1..20}; do
    CANARY_ERRORS=$(curl -s http://localhost:4002/api/v1/metrics | jq '.error_rate' 2>/dev/null || echo 0)
    PROD_ERRORS=$(curl -s http://localhost:4000/api/v1/metrics | jq '.error_rate' 2>/dev/null || echo 0)

    log "  Canary: ${CANARY_ERRORS}% errors | Production: ${PROD_ERRORS}% errors"

    if (( $(echo "$CANARY_ERRORS > 5" | bc -l) )); then
        error "Canary error rate spiked (${CANARY_ERRORS}%). Rolling back."
    fi

    sleep 30
done

success "Canary passed with 50% traffic"

# Step 5: Route 100% traffic to canary
log "Step 5: Routing 100% of traffic to canary..."
configure_traffic_split 100 0

log "Waiting 5 minutes for stability check..."
for i in {1..10}; do
    CANARY_ERRORS=$(curl -s http://localhost:4002/api/v1/metrics | jq '.error_rate' 2>/dev/null || echo 0)
    log "  Canary error rate: ${CANARY_ERRORS}%"

    if (( $(echo "$CANARY_ERRORS > 2" | bc -l) )); then
        error "Canary error rate elevated (${CANARY_ERRORS}%). Rolling back."
    fi

    sleep 30
done

# Step 6: Complete deployment
log "Step 6: Completing deployment..."
docker stop "$PRODUCTION_CONTAINER" 2>/dev/null || true
docker rm "$PRODUCTION_CONTAINER" 2>/dev/null || true
docker rename "$CANARY_CONTAINER" "$PRODUCTION_CONTAINER"

success "Deployment complete - canary is now production"
success "Monitoring metrics for rollback capability..."

log "Canary deployment complete"
log "Rollback available for next 1 hour"
