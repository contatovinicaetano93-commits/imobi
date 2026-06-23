#!/bin/bash

# iMobi MVP Deploy Simulation Script
# Purpose: Dry-run deploy process with health checks & rollback plan
# Run: ./DEPLOY_SIMULATION.sh [staging|production]
# Date: 2026-05-29

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ENVIRONMENT="${1:-staging}"
DEPLOYMENT_START=$(date +%s)
LOG_FILE="./deploy-simulation-$(date +%Y%m%d-%H%M%S).log"

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
DEPLOYMENT_TIMEOUT=600 # 10 minutes
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=5

echo "================================" | tee -a $LOG_FILE
echo "iMobi Deploy Simulation" | tee -a $LOG_FILE
echo "Environment: $ENVIRONMENT" | tee -a $LOG_FILE
echo "Date: $(date)" | tee -a $LOG_FILE
echo "Log: $LOG_FILE" | tee -a $LOG_FILE
echo "================================" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

# Helper functions
log() {
  echo "[$(date +'%H:%M:%S')] $1" | tee -a $LOG_FILE
}

success() {
  echo -e "${GREEN}✓ $1${NC}" | tee -a $LOG_FILE
}

error() {
  echo -e "${RED}✗ $1${NC}" | tee -a $LOG_FILE
}

warning() {
  echo -e "${YELLOW}⚠ $1${NC}" | tee -a $LOG_FILE
}

info() {
  echo -e "${BLUE}ℹ $1${NC}" | tee -a $LOG_FILE
}

# PRE-DEPLOYMENT CHECKS
echo "PHASE 1: PRE-DEPLOYMENT VALIDATION" | tee -a $LOG_FILE
echo "---" | tee -a $LOG_FILE

log "Checking dependencies..."
command -v docker &> /dev/null && success "Docker installed" || warning "Docker not found"
command -v pnpm &> /dev/null && success "pnpm installed" || error "pnpm required"
command -v git &> /dev/null && success "git installed" || error "git required"

log "Verifying git status..."
if git status --short | grep -q "^??"; then
  warning "Untracked files in repo (may be OK)"
fi

if git status --short | grep -q "^ M\| M "; then
  error "Modified tracked files in repo — commit before deploy"
  exit 1
fi
success "Git repo clean"

log "Checking environment configuration..."
if [ ! -f .env.local ] && [ ! -f .env ]; then
  error ".env files not found"
  exit 1
fi
success "Environment files present"

echo "" | tee -a $LOG_FILE

# BUILD PHASE
echo "PHASE 2: BUILD" | tee -a $LOG_FILE
echo "---" | tee -a $LOG_FILE

log "Installing dependencies..."
if ! pnpm install --frozen-lockfile 2>> $LOG_FILE; then
  error "Dependency installation failed"
  exit 1
fi
success "Dependencies installed"

log "Running type checks..."
if ! pnpm type-check 2>> $LOG_FILE; then
  error "TypeScript type checking failed"
  exit 1
fi
success "Type checking passed"

log "Building production bundles..."
build_start=$(date +%s)

if pnpm build 2>> $LOG_FILE; then
  build_end=$(date +%s)
  build_time=$((build_end - build_start))
  success "Build completed in ${build_time}s"

  if [ $build_time -gt 300 ]; then
    warning "Build took longer than 5 minutes (${build_time}s) — may impact deployment window"
  fi
else
  error "Build failed — see $LOG_FILE for details"
  exit 1
fi

echo "" | tee -a $LOG_FILE

# STARTUP PHASE
echo "PHASE 3: STARTUP & HEALTH CHECKS" | tee -a $LOG_FILE
echo "---" | tee -a $LOG_FILE

log "Starting API server..."
if [ "$ENVIRONMENT" = "production" ]; then
  # In production, assume deployment platform handles startup
  info "Skipping local startup in production mode"
  info "In real deployment: Vercel + Render auto-start services"
else
  # Staging: try to start services locally
  if command -v docker &> /dev/null; then
    log "Using Docker Compose..."
    docker-compose up -d 2>> $LOG_FILE || warning "Docker Compose startup warning (may be running)"
  else
    warning "Docker not available, cannot start services locally"
  fi
fi

log "Waiting for health checks..."

# Function to check API health
check_api_health() {
  local attempt=1
  local success=false

  while [ $attempt -le $HEALTH_CHECK_RETRIES ]; do
    response=$(curl -s -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null || echo "000")
    http_code=${response: -3}

    if [ "$http_code" = "200" ]; then
      success=true
      break
    fi

    log "API health check attempt $attempt/$HEALTH_CHECK_RETRIES (HTTP $http_code)"
    sleep $HEALTH_CHECK_INTERVAL
    ((attempt++))
  done

  if [ "$success" = true ]; then
    return 0
  else
    return 1
  fi
}

# Function to check Web health
check_web_health() {
  response=$(curl -s -w "%{http_code}" "$WEB_URL" 2>/dev/null || echo "000")
  http_code=${response: -3}

  if [ "$http_code" = "200" ] || [ "$http_code" = "301" ]; then
    return 0
  else
    return 1
  fi
}

# Perform health checks
if check_api_health; then
  success "API health check passed"
else
  error "API health check failed — deployment cannot proceed"
  exit 1
fi

if check_web_health; then
  success "Web health check passed"
else
  warning "Web health check warning (may not be fully deployed yet)"
fi

# Verify database connectivity
log "Checking database connectivity..."
if command -v psql &> /dev/null && [ -n "${DATABASE_URL:-}" ]; then
  if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
    success "Database connection verified"
  else
    error "Database connection failed"
    exit 1
  fi
else
  warning "Cannot verify database connection (psql not available or DATABASE_URL not set)"
fi

echo "" | tee -a $LOG_FILE

# LOAD TEST PHASE
echo "PHASE 4: LOAD TESTING (Light)" | tee -a $LOG_FILE
echo "---" | tee -a $LOG_FILE

log "Executing light load test (50 concurrent requests over 30s)..."

if command -v wrk &> /dev/null; then
  wrk_output=$(wrk -t4 -c50 -d30s "$API_URL/api/v1/health" 2>&1 | tail -5)
  echo "$wrk_output" | tee -a $LOG_FILE
  success "Load test completed"
else
  warning "wrk not installed, skipping load test (install: brew install wrk)"
  log "Fallback: Simple concurrent test with curl..."

  for i in {1..10}; do
    curl -s "$API_URL/api/v1/health" > /dev/null &
  done
  wait
  success "Fallback load test completed"
fi

echo "" | tee -a $LOG_FILE

# SMOKE TEST PHASE
echo "PHASE 5: CRITICAL FLOWS VERIFICATION" | tee -a $LOG_FILE
echo "---" | tee -a $LOG_FILE

log "Testing critical API endpoints..."

# Test unauthenticated access
response=$(curl -s -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null)
http_code=${response: -3}
if [ "$http_code" = "200" ]; then
  success "Health endpoint accessible"
else
  error "Health endpoint failed (HTTP $http_code)"
fi

# Test protected endpoint returns 401
response=$(curl -s -w "%{http_code}" "$API_URL/api/v1/manager/etapas" 2>/dev/null)
http_code=${response: -3}
if [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
  success "Protected endpoints require auth (HTTP $http_code)"
else
  warning "Protected endpoint returned unexpected code (HTTP $http_code)"
fi

# Test CORS headers
response=$(curl -s -I -H "Origin: https://app.imbobi.com.br" "$API_URL/api/v1/health" 2>/dev/null)
if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
  success "CORS headers present"
else
  warning "CORS headers may be missing"
fi

echo "" | tee -a $LOG_FILE

# ROLLBACK PLAN
echo "PHASE 6: ROLLBACK READINESS" | tee -a $LOG_FILE
echo "---" | tee -a $LOG_FILE

log "Verifying rollback mechanisms..."

if command -v git &> /dev/null; then
  current_commit=$(git rev-parse --short HEAD)
  success "Current commit: $current_commit"
  info "Rollback command: git revert $current_commit && git push"
else
  warning "Git not available for rollback verification"
fi

if [ "$ENVIRONMENT" = "production" ]; then
  info "Production rollback plan:"
  info "1. Vercel: Automatically maintains previous deployment"
  info "   - Go to https://vercel.com/dashboard"
  info "   - Select deployment → Deployments tab → click previous → Promote"
  info ""
  info "2. API (Render): Manual rollback via git"
  info "   - Revert problematic commit: git revert [COMMIT]"
  info "   - Render auto-deploys from main branch"
  info ""
  info "3. Database: Keep schema forward-compatible"
  info "   - Migrations can be rolled back with: pnpm db:rollback"
  info "   - Pre-test rollback: pnpm db:rollback --dry-run"
else
  info "Staging rollback: Stop containers with 'docker-compose down' and redeploy"
fi

echo "" | tee -a $LOG_FILE

# MONITORING SETUP
echo "PHASE 7: MONITORING READINESS" | tee -a $LOG_FILE
echo "---" | tee -a $LOG_FILE

log "Checking monitoring integrations..."

if [ -n "${SENTRY_DSN:-}" ]; then
  success "Sentry DSN configured (error tracking)"
else
  warning "Sentry DSN not set (highly recommended for production)"
fi

if [ -n "${NEXT_PUBLIC_SENTRY_DSN:-}" ]; then
  success "Web Sentry DSN configured"
else
  warning "Web Sentry DSN not set"
fi

info "Monitoring checklist:"
info "1. Sentry: https://sentry.io/organizations/imbobi/issues/"
info "2. Vercel Analytics: https://vercel.com/dashboard"
info "3. AWS CloudWatch: https://console.aws.amazon.com/cloudwatch/"
info "4. On-call: Slack integration enabled"

echo "" | tee -a $LOG_FILE

# FINAL SUMMARY
DEPLOYMENT_END=$(date +%s)
DEPLOYMENT_TIME=$((DEPLOYMENT_END - DEPLOYMENT_START))

echo "================================" | tee -a $LOG_FILE
echo "DEPLOYMENT SIMULATION SUMMARY" | tee -a $LOG_FILE
echo "================================" | tee -a $LOG_FILE
echo "Duration: ${DEPLOYMENT_TIME}s" | tee -a $LOG_FILE
echo "Environment: $ENVIRONMENT" | tee -a $LOG_FILE
echo "Timestamp: $(date +'%Y-%m-%d %H:%M:%S BRT')" | tee -a $LOG_FILE
echo "Log: $LOG_FILE" | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE

success "SIMULATION COMPLETE"
info "Next steps:"
info "1. Review log: cat $LOG_FILE"
info "2. Fix any FAILED checks above"
info "3. Run smoke tests: SMOKE_TEST_CHECKLIST.md"
info "4. Prepare team for cutover on 2026-06-02 @ 02:00 BRT"

echo "" | tee -a $LOG_FILE

exit 0
