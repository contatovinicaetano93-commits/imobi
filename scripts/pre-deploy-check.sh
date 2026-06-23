#!/bin/bash

# Pre-Deployment Verification Script
# Run this before deploying to production

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Imobi API - Pre-Deployment Checklist${NC}\n"

# Counter for passed/failed checks
PASSED=0
FAILED=0

# Helper functions
check() {
  local name="$1"
  local cmd="$2"
  
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} $name"
    ((FAILED++))
    return 1
  fi
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# Code Quality Checks
echo -e "${BLUE}📋 Code Quality${NC}"
check "TypeScript builds without errors" "pnpm type-check"
check "Backend builds successfully" "pnpm build --filter @imbobi/api"
check "All dependencies installed" "test -d node_modules/@imbobi"

# Database Checks
echo -e "\n${BLUE}🗄️  Database${NC}"
if [ -z "$DATABASE_URL" ]; then
  warn "DATABASE_URL not set (configure in .env.render.local / Render dashboard)"
else
  check "Can connect to database" "psql \$DATABASE_URL -c 'SELECT 1;'"
fi

# Environment Variables
echo -e "\n${BLUE}🔐 Environment Variables${NC}"
check "JWT_SECRET is set" "test -n \"\$JWT_SECRET\""
check "ENCRYPTION_KEY is set" "test -n \"\$ENCRYPTION_KEY\""
check "SENTRY_DSN is set" "test -n \"\$SENTRY_DSN\""

# Secrets & Security
echo -e "\n${BLUE}🔒 Security${NC}"
check "No hardcoded secrets in code" "! grep -r 'HARDCODED\|TODO.*SECRET\|FIXME.*PASSWORD' services/api/src --include='*.ts' 2>/dev/null || true"
check ".env is in .gitignore" "grep -q '.env' .gitignore"
check "NODE_ENV is production" "test \"\$NODE_ENV\" = \"production\""

# API Endpoints
echo -e "\n${BLUE}📡 API Endpoints${NC}"
check "Health endpoint exists" "grep -q 'GET /health' docs/OPENAPI_SPECIFICATION.md"
check "Metrics endpoint exists" "grep -q 'GET /metrics' docs/OPENAPI_SPECIFICATION.md"
check "API version specified" "grep -q 'version' services/api/package.json"

# Documentation
echo -e "\n${BLUE}📚 Documentation${NC}"
check "OpenAPI spec exists" "test -f docs/OPENAPI_SPECIFICATION.md"
check "Soft launch guide exists" "test -f docs/SOFT_LAUNCH_GUIDE.md"
check "Deploy stack guide exists" "test -f docs/DEPLOY_STACK.md"

# Git & Version Control
echo -e "\n${BLUE}🔀 Git${NC}"
check "All changes committed" "git diff --quiet"
check "No untracked files" "test -z \"\$(git ls-files --others --exclude-standard)\""
check "On correct branch" "test \"\$(git rev-parse --abbrev-ref HEAD)\" = \"claude/imobi-mvp-fintech-status-jrr2ab\""

# Infrastructure
echo -e "\n${BLUE}⚙️  Infrastructure${NC}"
check "GitHub Actions workflow exists" "test -f .github/workflows/deploy-api.yml"
check ".env.example exists" "test -f .env.example"
check "package.json has build script" "grep -q 'build.*nest build' services/api/package.json"

# Final Summary
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Passed:${NC} $PASSED"
echo -e "${RED}✗ Failed:${NC} $FAILED"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✨ All checks passed! Ready to deploy.${NC}"
  echo -e "\n${BLUE}Next steps:${NC}"
  echo "1. Push env: pnpm render:env:push && pnpm vercel:env:push"
  echo "2. Redeploy API: pnpm render:redeploy (or auto-deploy on Render)"
  echo "3. Verify: bash scripts/post-deploy-verification.sh https://imobi-api-staging.onrender.com"
  echo "4. See docs/DEPLOY_STACK.md"
  exit 0
else
  echo -e "\n${RED}❌ Some checks failed. Fix issues before deploying.${NC}"
  exit 1
fi
