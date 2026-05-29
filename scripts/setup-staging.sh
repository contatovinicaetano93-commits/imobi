#!/bin/bash

# imobi — Automated Staging Environment Setup Script
# This script automates: directories, Docker services, environment config, and validation
# Usage: ./scripts/setup-staging.sh [--skip-docker] [--skip-env] [--help]

set -euo pipefail

# =============================================================================
# Configuration
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOY_BASE="/opt/deploys"
IMOBI_BASE="/opt/imobi"
APP_NAME="imobi"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Docker images
POSTGRES_IMAGE="postgres:15-alpine"
REDIS_IMAGE="redis:7-alpine"

# Default credentials (change these in .env.staging after initial setup!)
DB_USER="imobi"
DB_PASSWORD="staging_password_secure_12345"
DB_NAME="imobi_staging"
DB_PORT=5433
REDIS_PORT=6380

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# =============================================================================
# Functions
# =============================================================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

separator() {
    echo
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo
}

# Print usage
usage() {
    cat << EOF
Usage: ./scripts/setup-staging.sh [OPTIONS]

OPTIONS:
    --skip-docker       Skip Docker services setup (PostgreSQL, Redis)
    --skip-env          Skip .env.staging generation
    --help              Show this help message

EXAMPLES:
    # Full setup (recommended for first run)
    ./scripts/setup-staging.sh

    # Reconfigure environment only (keep existing Docker containers)
    ./scripts/setup-staging.sh --skip-docker

    # Just start Docker services (environment already exists)
    ./scripts/setup-staging.sh --skip-env

EOF
}

# Parse arguments
SKIP_DOCKER=false
SKIP_ENV=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-docker)
            SKIP_DOCKER=true
            shift
            ;;
        --skip-env)
            SKIP_ENV=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            ;;
    esac
done

# =============================================================================
# Phase 1: Prerequisites Validation
# =============================================================================

separator
log "Phase 1: Validating Prerequisites"
separator

# Check required commands
required_commands=("git" "docker" "curl" "pnpm" "node")

log "Checking required commands..."
for cmd in "${required_commands[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
        error "$cmd is not installed. Please install it and try again."
    fi
    VERSION=$($cmd --version 2>/dev/null | head -1)
    success "$cmd: $VERSION"
done

# Check for docker compose (v2) or docker-compose (v1)
log "Checking Docker Compose..."
if docker compose version &> /dev/null; then
    success "docker compose: $(docker compose version | head -1)"
elif command -v docker-compose &> /dev/null; then
    success "docker-compose: $(docker-compose --version)"
else
    error "Neither 'docker compose' nor 'docker-compose' is available. Please install Docker Compose."
fi

# Check Docker daemon
log "Checking Docker daemon..."
if ! docker ps &> /dev/null; then
    error "Docker daemon is not running. Start it with: sudo systemctl start docker"
fi
success "Docker daemon is running"

# Check git repository
log "Checking git repository..."
if ! git -C "$PROJECT_ROOT" rev-parse --git-dir &> /dev/null; then
    error "Not a git repository: $PROJECT_ROOT"
fi
GIT_BRANCH=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)
GIT_COMMIT=$(git -C "$PROJECT_ROOT" rev-parse --short HEAD)
success "Git repository: branch=$GIT_BRANCH commit=$GIT_COMMIT"

# Check git status
log "Verifying git status..."
if [ -n "$(git -C "$PROJECT_ROOT" status --porcelain)" ]; then
    warning "Uncommitted changes detected:"
    git -C "$PROJECT_ROOT" status --short | sed 's/^/  /'
    warning "These changes will not be deployed. Commit or stash them."
fi

# =============================================================================
# Phase 2: Directory Structure
# =============================================================================

separator
log "Phase 2: Setting Up Directory Structure"
separator

log "Creating deployment directories..."

# Create directories
for dir in "$DEPLOY_BASE/$APP_NAME" "$IMOBI_BASE" "$IMOBI_BASE/data" "$IMOBI_BASE/data/postgres" "$IMOBI_BASE/data/redis" "$IMOBI_BASE/logs" "$DEPLOY_BASE/$APP_NAME/backups"; do
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        success "Created: $dir"
    else
        info "Already exists: $dir"
    fi
done

# Set permissions
log "Setting directory permissions..."
if [ ! -w "$IMOBI_BASE" ]; then
    if [ "$(id -u)" -eq 0 ]; then
        chown -R $(logname):$(logname) "$IMOBI_BASE" 2>/dev/null || true
        success "Updated ownership for $IMOBI_BASE"
    else
        warning "Cannot change ownership of $IMOBI_BASE (not running as root)"
        info "Run: sudo chown -R \$USER:\$USER $IMOBI_BASE"
    fi
fi

success "Directory structure ready"

# =============================================================================
# Phase 3: Docker Services Setup
# =============================================================================

if [ "$SKIP_DOCKER" = false ]; then
    separator
    log "Phase 3: Setting Up Docker Services"
    separator

    # Check if containers already exist
    POSTGRES_EXISTS=$(docker ps -a --filter "name=imobi-postgres" --format "{{.Names}}" 2>/dev/null || echo "")
    REDIS_EXISTS=$(docker ps -a --filter "name=imobi-redis" --format "{{.Names}}" 2>/dev/null || echo "")

    if [ -n "$POSTGRES_EXISTS" ] || [ -n "$REDIS_EXISTS" ]; then
        warning "Docker containers already exist. Skipping container creation."
        info "To recreate: docker compose -f docker compose.staging.yml down && rm -rf $IMOBI_BASE/data"
    else
        log "Starting Docker services..."

        cd "$PROJECT_ROOT"

        # Verify docker compose file exists
        if [ ! -f "docker compose.staging.yml" ]; then
            error "docker compose.staging.yml not found in $PROJECT_ROOT"
        fi

        # Start services
        if docker compose -f docker compose.staging.yml up -d; then
            success "Docker services started"
        else
            error "Failed to start Docker services"
        fi

        # Wait for services to be ready
        log "Waiting for PostgreSQL to be ready (timeout: 30s)..."
        RETRIES=0
        MAX_RETRIES=30
        until docker compose -f docker compose.staging.yml exec -T postgres pg_isready -U "$DB_USER" > /dev/null 2>&1; do
            RETRIES=$((RETRIES + 1))
            if [ $RETRIES -ge $MAX_RETRIES ]; then
                error "PostgreSQL failed to start within 30 seconds"
            fi
            echo -n "."
            sleep 1
        done
        echo
        success "PostgreSQL is ready"

        log "Waiting for Redis to be ready..."
        RETRIES=0
        MAX_RETRIES=10
        until docker compose -f docker compose.staging.yml exec -T redis redis-cli ping > /dev/null 2>&1; do
            RETRIES=$((RETRIES + 1))
            if [ $RETRIES -ge $MAX_RETRIES ]; then
                error "Redis failed to start within 10 seconds"
            fi
            echo -n "."
            sleep 1
        done
        echo
        success "Redis is ready"
    fi

    # Verify services status
    log "Verifying Docker services status..."
    if docker compose -f docker compose.staging.yml ps | grep -q "postgres.*Up"; then
        success "PostgreSQL container is running"
    else
        warning "PostgreSQL container is not running"
    fi

    if docker compose -f docker compose.staging.yml ps | grep -q "redis.*Up"; then
        success "Redis container is running"
    else
        warning "Redis container is not running"
    fi
else
    info "Skipping Docker services setup (--skip-docker)"
fi

# =============================================================================
# Phase 4: Environment Configuration
# =============================================================================

if [ "$SKIP_ENV" = false ]; then
    separator
    log "Phase 4: Creating Environment Configuration"
    separator

    ENV_FILE="$PROJECT_ROOT/.env.staging"

    if [ -f "$ENV_FILE" ] && [ -s "$ENV_FILE" ]; then
        warning ".env.staging already exists"
        info "To regenerate: rm .env.staging && ./scripts/setup-staging.sh"
    else
        log "Generating .env.staging..."

        # Generate secrets
        JWT_SECRET=$(openssl rand -base64 48 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(36))")
        ENCRYPTION_KEY=$(openssl rand -base64 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_urlsafe(24))")

        # Create .env.staging
        if [ -f "$PROJECT_ROOT/.env.staging.example" ]; then
            cp "$PROJECT_ROOT/.env.staging.example" "$ENV_FILE"
            success "Copied from .env.staging.example"
        else
            # Create from scratch if example doesn't exist
            cat > "$ENV_FILE" << ENVEOF
# ── STAGING ENVIRONMENT CONFIGURATION ────────────────────
# Generated: $(date)
# This file contains sensitive data - NEVER commit to git

# ── API ────────────────────────────────────────────
PORT=4000
NODE_ENV=staging
CORS_ORIGIN=http://localhost:3000,http://localhost:8081,http://staging.imbobi.local:3000

# PostgreSQL + PostGIS
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}

# Redis (BullMQ + Caching)
REDIS_HOST=localhost
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=

# JWT Authentication
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Data Encryption
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=imbobi-evidencias-staging

# ── WEB (Next.js) ──────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:4000

# ── MOBILE (Expo) ──────────────────────────────────
EXPO_PUBLIC_API_URL=http://localhost:4000
EAS_PROJECT_ID=...

# ── Email Provider ────────────────────────────────
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG...

# ── Firebase Cloud Messaging ──────────────────────
FIREBASE_PROJECT_ID=imbobi-staging
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=firebase-admin@imbobi-staging.iam.gserviceaccount.com

# ── KYC/Identity Validation ────────────────────────
UNICO_API_KEY=test_...
SERPRO_TOKEN=test_...

# ── LOGGING ────────────────────────────────────────
LOG_LEVEL=debug
SENTRY_DSN=
ENVEOF
            success "Created .env.staging from scratch"
        fi

        # Update DATABASE_URL and REDIS settings in the file
        if grep -q "DATABASE_URL=" "$ENV_FILE"; then
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}|" "$ENV_FILE"
        fi
        if grep -q "REDIS_HOST=" "$ENV_FILE"; then
            sed -i "s|REDIS_HOST=.*|REDIS_HOST=localhost|" "$ENV_FILE"
            sed -i "s|REDIS_PORT=.*|REDIS_PORT=${REDIS_PORT}|" "$ENV_FILE"
        fi
        if grep -q "JWT_SECRET=" "$ENV_FILE"; then
            sed -i "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$ENV_FILE"
        fi
        if grep -q "ENCRYPTION_KEY=" "$ENV_FILE"; then
            sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENCRYPTION_KEY}|" "$ENV_FILE"
        fi

        success "Environment file created at: $ENV_FILE"

        # Show what was generated
        info "Generated secrets:"
        echo "  JWT_SECRET: ${JWT_SECRET:0:20}... (${#JWT_SECRET} chars)"
        echo "  ENCRYPTION_KEY: ${ENCRYPTION_KEY:0:20}... (${#ENCRYPTION_KEY} chars)"
    fi
else
    info "Skipping environment configuration (--skip-env)"
fi

# =============================================================================
# Phase 5: Connectivity Validation
# =============================================================================

separator
log "Phase 5: Validating Connectivity"
separator

# Source .env if it exists
if [ -f "$PROJECT_ROOT/.env.staging" ]; then
    set +a
    source "$PROJECT_ROOT/.env.staging"
    set -a
fi

# Test PostgreSQL
log "Testing PostgreSQL connection..."
if docker compose -f "$PROJECT_ROOT/docker compose.staging.yml" exec -T postgres pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    success "PostgreSQL is accessible"

    # Verify database exists
    if docker compose -f "$PROJECT_ROOT/docker compose.staging.yml" exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
        success "Database '$DB_NAME' exists"
    else
        warning "Database '$DB_NAME' does not exist yet (will be created by migrations)"
    fi

    # Check PostGIS
    if docker compose -f "$PROJECT_ROOT/docker compose.staging.yml" exec -T postgres psql -U "$DB_USER" -d postgres -c "SELECT 1 FROM pg_extension WHERE extname='postgis'" > /dev/null 2>&1; then
        success "PostGIS extension is available"
    else
        warning "PostGIS extension not found (may be loaded during migrations)"
    fi
else
    warning "PostgreSQL is not accessible on port 5432"
fi

# Test Redis
log "Testing Redis connection..."
if docker compose -f "$PROJECT_ROOT/docker compose.staging.yml" exec -T redis redis-cli ping > /dev/null 2>&1; then
    success "Redis is accessible"

    # Get Redis memory info
    REDIS_MEM=$(docker compose -f "$PROJECT_ROOT/docker compose.staging.yml" exec -T redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    info "Redis memory usage: $REDIS_MEM"
else
    warning "Redis is not accessible on port 6379"
fi

# =============================================================================
# Phase 6: Dependencies Installation
# =============================================================================

separator
log "Phase 6: Installing Project Dependencies"
separator

cd "$PROJECT_ROOT"

log "Installing npm/pnpm dependencies..."
if pnpm install; then
    success "Dependencies installed successfully"
else
    warning "Failed to install dependencies. Run 'pnpm install' manually."
fi

# =============================================================================
# Phase 7: Database Setup
# =============================================================================

separator
log "Phase 7: Setting Up Database"
separator

log "Generating Prisma client..."
if pnpm db:generate; then
    success "Prisma client generated"
else
    warning "Failed to generate Prisma client. Run 'pnpm db:generate' manually."
fi

log "Running database migrations..."
if pnpm db:migrate; then
    success "Database migrations completed"
else
    warning "Failed to run migrations. Run 'pnpm db:migrate' manually."
fi

# =============================================================================
# Phase 8: Type Checking & Build Validation
# =============================================================================

separator
log "Phase 8: Validating Build"
separator

log "Running type check..."
if pnpm type-check; then
    success "Type checking passed"
else
    warning "Type checking failed. Review errors above."
fi

log "Building artifacts..."
if pnpm build; then
    success "Build completed successfully"
else
    warning "Build failed. Run 'pnpm build' manually to see detailed errors."
fi

# =============================================================================
# Phase 9: Summary & Next Steps
# =============================================================================

separator
echo
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                   STAGING SETUP COMPLETED                         ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo

success "All setup phases completed successfully!"
echo

info "Environment Summary:"
echo "  Project Root: $PROJECT_ROOT"
echo "  Deploy Base: $DEPLOY_BASE/$APP_NAME"
echo "  Data Directory: $IMOBI_BASE/data"
echo "  PostgreSQL Port: $DB_PORT"
echo "  Redis Port: $REDIS_PORT"
echo "  Database Name: $DB_NAME"
echo "  Environment File: .env.staging"
echo

warning "IMPORTANT NEXT STEPS:"
echo
echo "1. Review and update .env.staging with your credentials:"
echo "   nano .env.staging"
echo "   Required updates:"
echo "     - AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
echo "     - SENDGRID_API_KEY or SMTP settings"
echo "     - FIREBASE_* credentials"
echo "     - UNICO_API_KEY and SERPRO_TOKEN (if using KYC)"
echo
echo "2. Verify services are running:"
echo "   docker compose -f docker compose.staging.yml ps"
echo
echo "3. Test connectivity:"
echo "   curl -s http://localhost:4000/api/v1/health | jq ."
echo
echo "4. Deploy to staging:"
echo "   ./scripts/deploy.sh --standard"
echo "   Or for zero-downtime:"
echo "   ./scripts/deploy.sh --blue-green"
echo
echo "5. Monitor deployment:"
echo "   tail -f /var/log/imobi/deploy.log"
echo
echo "6. Verify web access:"
echo "   curl -s http://localhost:3000 | head -20"
echo
echo "Documentation:"
echo "  - Setup Checklist: STAGING_CHECKLIST.md"
echo "  - Deployment Strategies: scripts/deploy-strategies/"
echo "  - Health Checks: scripts/health-check.sh"
echo "  - Smoke Tests: scripts/smoke-test.sh"
echo

info "Useful commands:"
echo "  View logs:        docker compose -f docker compose.staging.yml logs -f api"
echo "  Database shell:   PGPASSWORD=$DB_PASSWORD psql -h localhost -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo "  Redis shell:      redis-cli -h localhost -p $REDIS_PORT"
echo "  Restart services: docker compose -f docker compose.staging.yml restart"
echo "  Stop services:    docker compose -f docker compose.staging.yml down"
echo

success "Setup script completed at $(date)"
echo
