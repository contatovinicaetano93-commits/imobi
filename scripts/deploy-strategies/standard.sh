#!/bin/bash

# Standard Deployment Strategy
# Simple rolling restart of services
# Suitable for small teams or low-traffic environments

set -euo pipefail

DEPLOY_DIR="$1"
ENVIRONMENT="$2"
API_SERVICE="imobi-api"

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }
success() { echo "✓ $1"; }
error() { echo "✗ $1"; exit 1; }

log "Standard Deployment Strategy (Rolling Restart)"

# Step 1: Stop API service
log "Step 1: Stopping API service..."
systemctl stop "$API_SERVICE" || docker stop "$API_SERVICE" || true
success "API service stopped"

# Step 2: Deploy new version
log "Step 2: Deploying new version..."
cp -r "$DEPLOY_DIR/api" /opt/imobi/app/
cp "$DEPLOY_DIR/.env" /opt/imobi/app/
success "New version deployed"

# Step 3: Run database migrations
log "Step 3: Running database migrations..."
cd /opt/imobi/app
export $(cat .env | grep -v '^#' | xargs)
npm run db:migrate || error "Database migration failed"
success "Database migration completed"

# Step 4: Start API service
log "Step 4: Starting API service..."
systemctl start "$API_SERVICE" || docker start "$API_SERVICE" || error "Failed to start API service"
success "API service started"

# Step 5: Health check
log "Step 5: Verifying deployment..."
for i in {1..30}; do
    if curl -s http://localhost:4000/api/v1/health > /dev/null 2>&1; then
        success "API is healthy"
        break
    fi

    if [ $i -eq 30 ]; then
        error "API failed to become healthy"
    fi

    sleep 1
done

# Step 6: Verify web service
log "Step 6: Verifying web service..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    success "Web service is responsive"
else
    warning "Web service may need restart"
fi

log "Standard deployment complete!"
