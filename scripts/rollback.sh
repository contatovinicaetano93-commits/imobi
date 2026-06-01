#!/bin/bash

# Rollback Script — Restore to previous deployment version
# Usage: ./rollback.sh [version]
# Example: ./rollback.sh 20260529_120000

set -euo pipefail

VERSION="${1:-}"
APP_NAME="imobi"
RELEASES_DIR="/opt/deploys/$APP_NAME"
BACKUP_DIR="/opt/deploys/backups"
CURRENT_VERSION_FILE="/opt/$APP_NAME/CURRENT_VERSION"

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

# =============================================================================
# SELECT VERSION TO ROLLBACK TO
# =============================================================================

if [ -z "$VERSION" ]; then
    log "Available versions for rollback:"
    echo
    ls -1d "$RELEASES_DIR"/* 2>/dev/null | tail -5 | nl
    echo

    read -p "Select version to rollback to (number or full timestamp): " selection

    if [[ "$selection" =~ ^[0-9]+$ ]]; then
        # Selection is a number
        VERSION=$(ls -1d "$RELEASES_DIR"/* 2>/dev/null | tail -5 | sed -n "${selection}p" | xargs basename)
    else
        # Selection is a timestamp
        VERSION="$selection"
    fi
fi

VERSION_DIR="$RELEASES_DIR/$VERSION"
BACKUP_PATH="$BACKUP_DIR/$VERSION"

# Validate version exists
[ -d "$VERSION_DIR" ] || error "Version not found: $VERSION"

log "Rolling back to version: $VERSION"
log "Source: $VERSION_DIR"

# =============================================================================
# CONFIRMATION
# =============================================================================

echo
warning "This will rollback the application to version $VERSION"
read -p "Are you sure? Type 'yes' to confirm: " confirmation

if [ "$confirmation" != "yes" ]; then
    log "Rollback cancelled"
    exit 0
fi

# =============================================================================
# STOP CURRENT SERVICES
# =============================================================================

log "Stopping current services..."
systemctl stop imobi-api 2>/dev/null || docker stop imobi-prod 2>/dev/null || true
success "Services stopped"

# =============================================================================
# RESTORE DEPLOYMENT
# =============================================================================

log "Restoring version $VERSION..."

# Restore API
if [ -d "$VERSION_DIR/api" ]; then
    log "Restoring API..."
    rm -rf /opt/imobi/app/api
    cp -r "$VERSION_DIR/api" /opt/imobi/app/
    success "API restored"
fi

# Restore Web
if [ -d "$VERSION_DIR/web" ]; then
    log "Restoring Web..."
    rm -rf /opt/imobi/app/web/.next
    cp -r "$VERSION_DIR/web/.next" /opt/imobi/app/web/
    success "Web restored"
fi

# Restore configuration
if [ -f "$VERSION_DIR/.env" ]; then
    log "Restoring configuration..."
    cp "$VERSION_DIR/.env" /opt/imobi/app/.env
    success "Configuration restored"
fi

# =============================================================================
# START SERVICES
# =============================================================================

log "Starting services..."
systemctl start imobi-api 2>/dev/null || docker start imobi-prod 2>/dev/null || error "Failed to start services"
success "Services started"

# =============================================================================
# VERIFY ROLLBACK
# =============================================================================

log "Verifying rollback..."

for i in {1..30}; do
    if curl -s http://localhost:4000/api/v1/health > /dev/null 2>&1; then
        success "API is healthy"
        HEALTH_STATUS="$(curl -s http://localhost:4000/api/v1/health | jq -r '.status' 2>/dev/null || echo 'unknown')"
        log "Health status: $HEALTH_STATUS"
        break
    fi

    if [ $i -eq 30 ]; then
        error "Services failed to become healthy after 30 seconds"
    fi

    sleep 1
done

# =============================================================================
# UPDATE VERSION FILE
# =============================================================================

log "Updating version file..."
echo "$VERSION" > "$CURRENT_VERSION_FILE"
success "Version file updated"

# =============================================================================
# SUMMARY
# =============================================================================

echo
echo -e "${GREEN}========================================${NC}"
echo "Rollback Complete"
echo -e "${GREEN}========================================${NC}"
echo "Rolled back to: $VERSION"
echo "Status: Healthy"
echo "Current time: $(date +'%Y-%m-%d %H:%M:%S')"
echo -e "${GREEN}========================================${NC}"
echo

# Suggest next steps
log "Next steps:"
log "1. Monitor application: tail -f /var/log/imobi/app.log"
log "2. Check metrics: curl http://localhost:4000/api/v1/metrics"
log "3. If issues persist, re-rollback to previous version"
log "4. Once stable, analyze why previous deployment failed"
log "5. Fix issues and re-deploy"

success "Rollback successful!"
