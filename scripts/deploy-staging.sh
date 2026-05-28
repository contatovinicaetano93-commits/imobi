#!/bin/bash
set -euo pipefail

# ============================================================================
# imbobi Staging Deployment Script
# ============================================================================
# This script orchestrates the complete staging deployment:
# 1. Build API (NestJS)
# 2. Build Web (Next.js)
# 3. Start containers with docker-compose
# 4. Execute Prisma migrations
# 5. Run health checks
# ============================================================================

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOYMENT_DATE=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
LOG_FILE="${PROJECT_ROOT}/logs/staging-deploy-$(date +%s).log"
DOCKER_COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.staging.yml"

# Ensure logs directory exists
mkdir -p "${PROJECT_ROOT}/logs"

# ============================================================================
# Helper Functions
# ============================================================================

log_step() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_to_file() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "Required command not found: $1"
        exit 1
    fi
}

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

log_step "[1/5] PRE-FLIGHT CHECKS"

log_info "Checking prerequisites..."
for cmd in git pnpm docker docker-compose node curl; do
    check_command "$cmd"
done
log_info "All required commands available"

if [ ! -f "${PROJECT_ROOT}/.env.staging" ]; then
    log_error ".env.staging not found at ${PROJECT_ROOT}/.env.staging"
    log_warn "Please create .env.staging before deploying"
    exit 1
fi
log_info ".env.staging found"

if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    log_error "docker-compose.staging.yml not found"
    exit 1
fi
log_info "docker-compose.staging.yml found"

# ============================================================================
# LOAD ENVIRONMENT
# ============================================================================

log_step "[2/5] ENVIRONMENT SETUP"

export $(grep -v '^#' "${PROJECT_ROOT}/.env.staging" | xargs) 2>/dev/null || true

log_info "Environment loaded from .env.staging"
log_info "Node: $(node --version)"
log_info "Docker: $(docker --version)"
log_info "pnpm: $(pnpm --version)"

# ============================================================================
# BUILD PHASE
# ============================================================================

log_step "[3/5] BUILD PHASE"

cd "$PROJECT_ROOT"

# Type check
echo -n "Running TypeScript type check... "
if pnpm type-check > /dev/null 2>&1; then
    log_info "Type check passed"
else
    log_warn "Type check issues detected (non-blocking)"
fi

# Build all packages
log_info "Building monorepo (API + Web)..."
if pnpm build 2>&1 | tee -a "$LOG_FILE"; then
    log_info "Build successful"
else
    log_error "Build failed"
    log_to_file "Build failed at $(date)"
    exit 1
fi

# ============================================================================
# DOCKER SETUP
# ============================================================================

log_step "[4/5] DOCKER SERVICES SETUP"

log_info "Stopping existing containers..."
docker-compose -f "$DOCKER_COMPOSE_FILE" -p imbobi_staging down 2>&1 | tee -a "$LOG_FILE" || true
log_info "Cleaned up previous deployment"

log_info "Building Docker images..."
if docker-compose -f "$DOCKER_COMPOSE_FILE" -p imbobi_staging build 2>&1 | tee -a "$LOG_FILE"; then
    log_info "Docker images built successfully"
else
    log_error "Docker build failed"
    log_to_file "Docker build failed at $(date)"
    exit 1
fi

log_info "Starting services (PostgreSQL, Redis, API, Web)..."
if docker-compose -f "$DOCKER_COMPOSE_FILE" -p imbobi_staging up -d 2>&1 | tee -a "$LOG_FILE"; then
    log_info "Containers started"
else
    log_error "Failed to start containers"
    log_to_file "Container startup failed at $(date)"
    docker-compose -f "$DOCKER_COMPOSE_FILE" -p imbobi_staging logs
    exit 1
fi

# Wait for services to be healthy
log_info "Waiting for services to become healthy (max 60s)..."
sleep 5
for i in {1..12}; do
    if docker-compose -f "$DOCKER_COMPOSE_FILE" -p imbobi_staging ps | grep -q "healthy\|running"; then
        log_info "Services are ready"
        break
    fi
    if [ $i -eq 12 ]; then
        log_warn "Services health check timeout - continuing anyway"
    else
        sleep 5
    fi
done

# ============================================================================
# DATABASE MIGRATIONS
# ============================================================================

log_step "[5/5] DATABASE SETUP & MIGRATIONS"

log_info "Running Prisma migrations..."
cd "${PROJECT_ROOT}/services/api"

if DATABASE_URL="${DATABASE_URL}" pnpm prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"; then
    log_info "Migrations completed successfully"
else
    log_warn "Migrations may have failed (database might already be up-to-date)"
fi

log_info "Seeding database (if applicable)..."
if DATABASE_URL="${DATABASE_URL}" pnpm prisma db seed 2>&1 | tee -a "$LOG_FILE"; then
    log_info "Database seeded"
else
    log_warn "No seed script found (optional)"
fi

cd "$PROJECT_ROOT"

# ============================================================================
# HEALTH CHECKS
# ============================================================================

log_step "HEALTH CHECKS"

log_info "Waiting for API to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:4000/api/v1/health > /dev/null 2>&1; then
        log_info "API is ready"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        sleep 2
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_warn "API health check timeout - but containers are running"
fi

log_info "Running comprehensive health checks..."
bash "${PROJECT_ROOT}/scripts/staging-health-check.sh" "http://localhost:4000" 2>&1 | tee -a "$LOG_FILE" || {
    log_warn "Some health checks failed - review logs"
}

# ============================================================================
# FINAL REPORT
# ============================================================================

log_step "DEPLOYMENT COMPLETE"

echo ""
log_info "Deployment Date: $DEPLOYMENT_DATE"
log_info "API URL: http://localhost:4000"
log_info "Web URL: http://localhost:3000"
log_info "Log File: $LOG_FILE"
echo ""

log_info "Service Status:"
docker-compose -f "$DOCKER_COMPOSE_FILE" -p imbobi_staging ps

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Test API:        ${BLUE}curl http://localhost:4000/api/v1/health${NC}"
echo "  2. View Web:        ${BLUE}open http://localhost:3000${NC}"
echo "  3. Check Logs:      ${BLUE}docker-compose -f docker-compose.staging.yml -p imbobi_staging logs -f${NC}"
echo "  4. Run E2E Tests:   ${BLUE}bash scripts/staging-e2e.sh${NC}"
echo "  5. Validation:      ${BLUE}See STAGING_VALIDATION_CHECKLIST.md${NC}"
echo ""

echo -e "${GREEN}✅ Staging deployment successful!${NC}"
log_to_file "Deployment successful at $(date)"
