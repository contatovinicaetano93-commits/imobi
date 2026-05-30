#!/bin/bash

################################################################################
# PRE-DEPLOYMENT HEALTH CHECK SCRIPT
# Automates critical pre-deployment validation tasks
# Usage: ./scripts/pre-deployment-health-check.sh
#
# Checks:
#  - pnpm type-check (TypeScript validation)
#  - pnpm build (production build)
#  - Git branch and commit info
#  - Environment variables
#  - Vercel configuration
#  - Redis connectivity (if available)
#  - PostgreSQL connectivity (if available)
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Start time
START_TIME=$(date +%s)

################################################################################
# Helper functions
################################################################################

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_check() {
    echo -e "${BLUE}▶${NC} $1"
}

print_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASSED++))
}

print_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAILED++))
}

print_warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ️ INFO${NC}: $1"
}

################################################################################
# Check 1: Git Status
################################################################################

print_header "GIT STATUS & BRANCH"

print_check "Checking current branch..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_info "Current branch: $BRANCH"

print_check "Checking for uncommitted changes..."
if [[ -z $(git status -s) ]]; then
    print_pass "No uncommitted changes"
else
    print_warn "Uncommitted changes detected:"
    git status -s | head -5
fi

print_check "Latest 10 commits..."
echo -e "${BLUE}───────────────────────────────────────────────${NC}"
git log --oneline -10 | while read line; do
    echo "  $line"
done
echo -e "${BLUE}───────────────────────────────────────────────${NC}"

print_check "Checking for v2.0.0 tag..."
if git tag -l | grep -q "^v2.0.0$"; then
    print_pass "Tag v2.0.0 exists"
else
    print_fail "Tag v2.0.0 not found"
fi

print_check "Checking for rollback tag (v1.x.x)..."
if git tag -l | grep -q "v1\." ; then
    ROLLBACK_TAG=$(git tag -l "v1.*" | sort -V | tail -1)
    print_pass "Rollback tag available: $ROLLBACK_TAG"
else
    print_warn "No v1.x.x rollback tag found"
fi

################################################################################
# Check 2: TypeScript Type Check
################################################################################

print_header "TYPESCRIPT TYPE CHECK"

print_check "Running pnpm type-check..."
if pnpm type-check 2>&1 | tee /tmp/type-check.log; then
    print_pass "TypeScript type-check passed (0 errors)"
else
    print_fail "TypeScript type-check failed"
    tail -20 /tmp/type-check.log
fi

################################################################################
# Check 3: Production Build
################################################################################

print_header "PRODUCTION BUILD"

print_check "Running pnpm build..."
BUILD_START=$(date +%s)

if pnpm build 2>&1 | tee /tmp/build.log; then
    BUILD_END=$(date +%s)
    BUILD_TIME=$((BUILD_END - BUILD_START))

    if [ $BUILD_TIME -lt 60 ]; then
        print_pass "Build completed in ${BUILD_TIME}s (< 60s target)"
    else
        print_warn "Build took ${BUILD_TIME}s (target: < 60s)"
    fi
else
    print_fail "Production build failed"
    tail -30 /tmp/build.log
fi

################################################################################
# Check 4: Environment Variables
################################################################################

print_header "ENVIRONMENT CONFIGURATION"

print_check "Checking for .env file..."
if [ -f ".env" ]; then
    print_warn ".env file present (should use .env.example template)"
else
    print_pass ".env file not committed (good practice)"
fi

print_check "Checking for .env.example..."
if [ -f ".env.example" ]; then
    print_pass ".env.example exists"
    print_info "Environment variables defined:"
    grep "^[A-Z_]*=" .env.example | cut -d= -f1 | head -10 | while read var; do
        echo "     - $var"
    done
else
    print_warn ".env.example not found"
fi

print_check "Checking for required env vars..."
REQUIRED_VARS=("DATABASE_URL" "REDIS_URL" "API_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "^$var=" .env.example 2>/dev/null; then
        print_pass "$var defined in .env.example"
    else
        print_warn "$var not found in .env.example"
    fi
done

################################################################################
# Check 5: Vercel Configuration
################################################################################

print_header "VERCEL DEPLOYMENT"

print_check "Checking for vercel.json..."
if [ -f "vercel.json" ]; then
    print_pass "vercel.json found"
    print_info "Build command: $(grep -o '\"buildCommand\": \"[^\"]*\"' vercel.json || echo 'N/A')"
else
    print_warn "vercel.json not found (required for Vercel deployment)"
fi

print_check "Checking for Vercel CLI..."
if command -v vercel &> /dev/null; then
    VERCEL_VERSION=$(vercel --version)
    print_pass "Vercel CLI installed: $VERCEL_VERSION"
else
    print_warn "Vercel CLI not installed (install with: npm i -g vercel)"
fi

################################################################################
# Check 6: Docker Configuration
################################################################################

print_header "DOCKER CONFIGURATION"

print_check "Checking for Docker compose file..."
if [ -f "docker-compose.yml" ] || [ -f "docker-compose.prod.yml" ]; then
    print_pass "docker-compose file found"
else
    print_warn "docker-compose file not found"
fi

print_check "Checking for Dockerfile..."
if [ -f "Dockerfile" ]; then
    print_pass "Dockerfile found in root"
else
    print_info "Dockerfile in services subdirectories (expected for monorepo)"
fi

################################################################################
# Check 7: Database & Cache Connectivity
################################################################################

print_header "DATABASE & CACHE CONNECTIVITY"

print_check "PostgreSQL connectivity..."
if command -v psql &> /dev/null; then
    if timeout 5 psql -c "SELECT 1" &> /dev/null; then
        print_pass "PostgreSQL responsive"
    else
        print_warn "PostgreSQL not accessible (may be offline, check .env)"
    fi
else
    print_info "psql not installed (skipping PostgreSQL check)"
fi

print_check "Redis connectivity..."
if command -v redis-cli &> /dev/null; then
    if timeout 5 redis-cli PING &> /dev/null | grep -q "PONG"; then
        print_pass "Redis responsive"
    else
        print_warn "Redis not accessible (may be offline, check .env)"
    fi
else
    print_info "redis-cli not installed (skipping Redis check)"
fi

################################################################################
# Check 8: Critical Files
################################################################################

print_header "CRITICAL FILES"

CRITICAL_FILES=(
    "CLAUDE.md"
    "SIMPLIFIED_TEST_CHECKLIST.md"
    "GO_NO_GO_DECISION.md"
    "TOMORROW_CUTOVER_PREP.md"
    "PRE_DEPLOYMENT_TEST_CHECKLIST.md"
    "docs/PRODUCTION_CUTOVER_PLAN.md"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        print_pass "$file exists"
    else
        print_warn "$file missing"
    fi
done

################################################################################
# Check 9: Package Manager
################################################################################

print_header "PACKAGE MANAGER"

print_check "pnpm status..."
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    print_pass "pnpm installed: v$PNPM_VERSION"
else
    print_fail "pnpm not installed"
fi

print_check "Dependencies..."
if [ -f "pnpm-lock.yaml" ]; then
    LOCK_SIZE=$(wc -c < pnpm-lock.yaml)
    print_pass "pnpm-lock.yaml exists ($(numfmt --to=iec $LOCK_SIZE 2>/dev/null || echo "$LOCK_SIZE bytes"))"
else
    print_warn "pnpm-lock.yaml not found"
fi

################################################################################
# Check 10: Node Version
################################################################################

print_header "NODE.JS VERSION"

print_check "Checking Node.js version..."
NODE_VERSION=$(node --version)
print_info "Node version: $NODE_VERSION"

if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v20* ]]; then
    print_pass "Node version compatible"
else
    print_warn "Node version may not be optimal (recommend v18+ or v20+)"
fi

################################################################################
# SUMMARY
################################################################################

print_header "SUMMARY"

END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

echo -e "\n${GREEN}Passed: ${PASSED}${NC}"
echo -e "${YELLOW}Warnings: ${WARNINGS}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo -e "\n⏱️  Total time: ${TOTAL_TIME}s"

echo -e "\n${BLUE}───────────────────────────────────────────────${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ PRE-DEPLOYMENT CHECK PASSED${NC}"
    echo -e "\n${BLUE}Next steps:${NC}"
    echo "  1. Review any warnings above"
    echo "  2. Run SIMPLIFIED_TEST_CHECKLIST.md (2-hour execution)"
    echo "  3. Fill out GO_NO_GO_DECISION.md"
    echo "  4. Review TOMORROW_CUTOVER_PREP.md before cutover"
    exit 0
else
    echo -e "${RED}❌ PRE-DEPLOYMENT CHECK FAILED${NC}"
    echo -e "\n${BLUE}Failed items (${FAILED}):${NC}"
    echo "  1. Fix issues above before proceeding"
    echo "  2. Re-run this script to verify fixes"
    exit 1
fi
