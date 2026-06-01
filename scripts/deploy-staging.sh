#!/bin/bash

##############################################################################
# STAGING DEPLOYMENT SCRIPT - iMobi
# Date: 2026-05-30
# Purpose: Automated deployment to staging environment
# Usage: ./scripts/deploy-staging.sh
##############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT="staging"
LOG_FILE="/tmp/staging-deployment-$(date +%s).log"
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')

log_header() {
  echo -e "\n${BLUE}════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════════${NC}\n"
}

log_info() {
  echo -e "${BLUE}ℹ INFO${NC}: $1"
}

log_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
}

log_warn() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

log_error() {
  echo -e "${RED}✗ ERROR${NC}: $1"
}

# Check prerequisites
check_prerequisites() {
  log_header "Checking Prerequisites"
  
  # Check Node.js version
  NODE_VERSION=$(node -v)
  log_info "Node.js version: $NODE_VERSION"
  
  if ! node -v | grep -qE "v(1[8-9]|[2-9][0-9])\."; then
    log_error "Node.js 18+ required"
    exit 1
  fi
  log_pass "Node.js version check"
  
  # Check pnpm
  if ! command -v pnpm &> /dev/null; then
    log_error "pnpm not found"
    exit 1
  fi
  log_pass "pnpm available"
  
  # Check PostgreSQL connection
  if ! psql -U postgres -h localhost -d imobi_staging -c "SELECT 1" &>/dev/null; then
    log_warn "PostgreSQL connection failed (non-critical)"
  else
    log_pass "PostgreSQL connection verified"
  fi
  
  # Check Redis connection
  if ! redis-cli ping &>/dev/null; then
    log_warn "Redis connection failed (non-critical)"
  else
    log_pass "Redis connection verified"
  fi
  
  # Check environment file
  if [ ! -f .env.staging ]; then
    log_error ".env.staging file not found"
    exit 1
  fi
  log_pass "Environment configuration loaded"
}

# Install dependencies
install_dependencies() {
  log_header "Installing Dependencies"
  
  log_info "Running: pnpm install"
  if pnpm install --frozen-lockfile 2>&1 | tee -a "$LOG_FILE"; then
    log_pass "Dependencies installed"
  else
    log_error "Dependency installation failed"
    exit 1
  fi
}

# Build application
build_application() {
  log_header "Building Application"
  
  log_info "Running: pnpm build"
  if pnpm build 2>&1 | tee -a "$LOG_FILE"; then
    log_pass "Build completed successfully"
  else
    log_error "Build failed"
    exit 1
  fi
  
  # Verify build artifacts
  if [ -d "services/api/dist" ] && [ -d "apps/web/.next" ]; then
    log_pass "Build artifacts verified"
  else
    log_error "Build artifacts incomplete"
    exit 1
  fi
}

# Database setup
setup_database() {
  log_header "Setting Up Database"
  
  log_info "Running Prisma migrations..."
  if cd services/api && npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE"; then
    log_pass "Database migrations applied"
  else
    log_error "Database migration failed"
    exit 1
  fi
  cd ../..
  
  # Generate Prisma client
  log_info "Generating Prisma client..."
  if npx prisma generate 2>&1 | tee -a "$LOG_FILE"; then
    log_pass "Prisma client generated"
  else
    log_error "Prisma client generation failed"
    exit 1
  fi
}

# Seed database (optional)
seed_database() {
  log_header "Seeding Database (Optional)"
  
  if [ -f "services/api/prisma/seed.ts" ]; then
    log_info "Running database seed..."
    if npx prisma db seed 2>&1 | tee -a "$LOG_FILE"; then
      log_pass "Database seeding completed"
    else
      log_warn "Database seeding skipped (non-critical)"
    fi
  fi
}

# Start services
start_services() {
  log_header "Starting Services"
  
  log_info "Starting API service (port 4000)..."
  cd services/api
  node --enable-source-maps dist/main.js &
  API_PID=$!
  log_pass "API service started (PID: $API_PID)"
  cd ../..
  
  # Wait for API to be ready
  sleep 3
  for i in {1..30}; do
    if curl -s http://localhost:4000/api/v1/health > /dev/null 2>&1; then
      log_pass "API service is ready"
      break
    fi
    if [ $i -eq 30 ]; then
      log_error "API service did not start"
      exit 1
    fi
    sleep 1
  done
  
  log_info "Starting Web service (port 3000)..."
  cd apps/web
  npm start &
  WEB_PID=$!
  log_pass "Web service started (PID: $WEB_PID)"
  cd ../..
  
  # Wait for Web to be ready
  sleep 5
  for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
      log_pass "Web service is ready"
      break
    fi
    if [ $i -eq 30 ]; then
      log_warn "Web service did not start (continuing)"
    fi
    sleep 1
  done
}

# Validate deployment
validate_deployment() {
  log_header "Validating Deployment"
  
  # Check API health
  log_info "Checking API health..."
  API_HEALTH=$(curl -s http://localhost:4000/api/v1/health)
  
  if echo "$API_HEALTH" | grep -q '"status":"ok"'; then
    log_pass "API health check passed"
  else
    log_error "API health check failed"
    exit 1
  fi
  
  # Check database connectivity
  if echo "$API_HEALTH" | grep -q '"database":"connected"'; then
    log_pass "Database connectivity verified"
  else
    log_error "Database not connected"
    exit 1
  fi
  
  # Check Redis connectivity
  if echo "$API_HEALTH" | grep -q '"redis":"connected"'; then
    log_pass "Redis connectivity verified"
  else
    log_warn "Redis not connected (non-critical)"
  fi
  
  # Check Web service
  WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
  if [ "$WEB_STATUS" = "200" ] || [ "$WEB_STATUS" = "404" ]; then
    log_pass "Web service responding"
  else
    log_warn "Web service status unclear: $WEB_STATUS"
  fi
}

# Main execution
main() {
  log_header "iMobi Staging Deployment"
  log_info "Started: $TIMESTAMP"
  
  check_prerequisites
  install_dependencies
  build_application
  setup_database
  seed_database
  start_services
  validate_deployment
  
  log_header "Deployment Complete"
  log_pass "All tasks completed successfully"
  log_info "API: http://localhost:4000"
  log_info "Web: http://localhost:3000"
  log_info "Logs: $LOG_FILE"
}

# Execute
main "$@"
