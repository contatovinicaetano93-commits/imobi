#!/bin/bash

# imobi — Production Deployment Script
# Supports: Blue-Green, Canary, and Standard deployments
# Usage: ./deploy.sh [--blue-green|--canary|--standard] [--skip-tests]

set -euo pipefail

# Configuration
ENVIRONMENT="${ENVIRONMENT:-staging}"
DEPLOY_TYPE="${1:-blue-green}"
SKIP_TESTS="${2:-false}"
APP_NAME="imobi"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_DIR="/opt/deploys/$APP_NAME/$TIMESTAMP"
CURRENT_VERSION_FILE="/opt/$APP_NAME/CURRENT_VERSION"
BACKUP_DIR="/opt/deploys/backups"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warning() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; exit 1; }

# Cleanup on exit
cleanup() {
    if [ $? -ne 0 ]; then
        warning "Deployment failed. Cleaning up..."
        rm -rf "$DEPLOY_DIR"
    fi
}
trap cleanup EXIT

# =============================================================================
# PHASE 1: PRE-DEPLOYMENT CHECKS
# =============================================================================

log "Starting deployment of $APP_NAME to $ENVIRONMENT"
log "Deployment Type: $DEPLOY_TYPE"

# Check prerequisites
log "Checking prerequisites..."
command -v docker >/dev/null || error "Docker not found"
command -v git >/dev/null || error "Git not found"
[ -f ".env.$ENVIRONMENT" ] || error ".env.$ENVIRONMENT not found"
success "All prerequisites met"

# Check git status
log "Verifying git state..."
if [ -n "$(git status --porcelain)" ]; then
    error "Uncommitted changes detected. Please commit or stash changes."
fi
GIT_COMMIT=$(git rev-parse --short HEAD)
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Current commit: $GIT_COMMIT on branch $GIT_BRANCH"

# =============================================================================
# PHASE 2: BUILD
# =============================================================================

log "Building production artifacts..."

# Build check
if [ "$SKIP_TESTS" != "--skip-tests" ]; then
    log "Running tests..."
    pnpm test:e2e || error "Tests failed. Aborting deployment."
    success "All tests passed"
fi

log "Type checking..."
pnpm type-check || error "Type checking failed"
success "Type checking passed"

log "Running security audit..."
pnpm audit --audit-level=moderate || warning "Security vulnerabilities found (non-blocking)"

log "Building production bundle..."
pnpm build || error "Build failed"
success "Production build successful"

# =============================================================================
# PHASE 3: PREPARE DEPLOYMENT
# =============================================================================

log "Preparing deployment artifacts..."
mkdir -p "$DEPLOY_DIR"
mkdir -p "$BACKUP_DIR"

# Copy artifacts
cp -r dist/services/api/* "$DEPLOY_DIR/api/" 2>/dev/null || true
cp -r apps/web/.next "$DEPLOY_DIR/web/" 2>/dev/null || true
cp .env.$ENVIRONMENT "$DEPLOY_DIR/.env"
cp docker-compose.yml "$DEPLOY_DIR/" 2>/dev/null || true

# Create deployment manifest
cat > "$DEPLOY_DIR/MANIFEST.json" << EOF
{
  "version": "$TIMESTAMP",
  "commit": "$GIT_COMMIT",
  "branch": "$GIT_BRANCH",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "environment": "$ENVIRONMENT",
  "deploy_type": "$DEPLOY_TYPE"
}
EOF

success "Deployment artifacts prepared in $DEPLOY_DIR"

# =============================================================================
# PHASE 4: BACKUP CURRENT VERSION
# =============================================================================

if [ -f "$CURRENT_VERSION_FILE" ]; then
    CURRENT_VERSION=$(cat "$CURRENT_VERSION_FILE")
    log "Backing up current version: $CURRENT_VERSION"

    if [ -d "/opt/$APP_NAME/releases/$CURRENT_VERSION" ]; then
        cp -r "/opt/$APP_NAME/releases/$CURRENT_VERSION" "$BACKUP_DIR/$CURRENT_VERSION"
        success "Current version backed up"
    fi
else
    warning "No current version found (first deployment?)"
fi

# =============================================================================
# PHASE 5: DEPLOYMENT STRATEGY
# =============================================================================

case $DEPLOY_TYPE in
    --blue-green)
        log "Executing Blue-Green Deployment..."
        ./scripts/deploy-strategies/blue-green.sh "$DEPLOY_DIR" "$ENVIRONMENT"
        ;;
    --canary)
        log "Executing Canary Deployment..."
        ./scripts/deploy-strategies/canary.sh "$DEPLOY_DIR" "$ENVIRONMENT"
        ;;
    --standard)
        log "Executing Standard Deployment..."
        ./scripts/deploy-strategies/standard.sh "$DEPLOY_DIR" "$ENVIRONMENT"
        ;;
    *)
        error "Unknown deployment type: $DEPLOY_TYPE. Use --blue-green, --canary, or --standard"
        ;;
esac

# =============================================================================
# PHASE 6: VERIFY DEPLOYMENT
# =============================================================================

log "Verifying deployment..."

# Wait for services to be ready
for i in {1..30}; do
    if curl -s http://localhost:4000/api/v1/health > /dev/null; then
        success "API is healthy"
        break
    fi

    if [ $i -eq 30 ]; then
        error "API failed to become healthy after 30 seconds"
    fi

    sleep 1
done

# Run smoke tests
log "Running smoke tests..."
if [ -f "./scripts/smoke-test.sh" ]; then
    ./scripts/smoke-test.sh http://localhost:4000 || error "Smoke tests failed"
    success "Smoke tests passed"
fi

# =============================================================================
# PHASE 7: POST-DEPLOYMENT
# =============================================================================

log "Updating version file..."
echo "$TIMESTAMP" > "$CURRENT_VERSION_FILE"
success "Deployment complete!"

# Print summary
echo
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo "Version: $TIMESTAMP"
echo "Commit: $GIT_COMMIT"
echo "Branch: $GIT_BRANCH"
echo "Environment: $ENVIRONMENT"
echo "Status: $(curl -s http://localhost:4000/api/v1/health | jq -r '.status' 2>/dev/null || echo 'unknown')"
echo "=========================================="
echo

success "Deployment successful! Your application is now live."
success "Monitor logs: tail -f /var/log/$APP_NAME/app.log"
success "Rollback if needed: ./scripts/rollback.sh $CURRENT_VERSION"
