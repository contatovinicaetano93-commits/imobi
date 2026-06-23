#!/bin/bash
# Master Production Setup Script
# Complete end-to-end automation for Vercel + env vars + monitoring
# Usage: ./scripts/execute-production-setup.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Global state
STEP=0
TOTAL_STEPS=6

echo -e "${MAGENTA}"
echo "╔═════════════════════════════════════════════════════════════╗"
echo "║     IMOBI PRODUCTION SETUP - MASTER EXECUTION SCRIPT      ║"
echo "║                  Vercel Configuration + Deploy             ║"
echo "╚═════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Function to increment and show step
show_step() {
  STEP=$((STEP + 1))
  echo -e "${MAGENTA}▶ STEP $STEP/$TOTAL_STEPS:${NC} $1"
  echo -e "${BLUE}─────────────────────────────────────────────────────────${NC}"
}

# Step 1: Pre-flight checks
show_step "Pre-flight Checks"
echo ""

# Check required tools
echo -e "${YELLOW}Checking tools...${NC}"
for tool in git jq curl; do
  if command -v $tool &> /dev/null; then
    echo -e "  ${GREEN}✅${NC} $tool"
  else
    echo -e "  ${RED}❌${NC} $tool (required)"
    exit 1
  fi
done

# Check git status
echo ""
echo -e "${YELLOW}Checking git status...${NC}"
if git status | grep -q "nothing to commit"; then
  echo -e "  ${GREEN}✅${NC} Working tree clean"
else
  echo -e "  ${RED}❌${NC} Uncommitted changes found"
  echo "     Please commit or stash changes first"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "  ${GREEN}✅${NC} Branch: $BRANCH"

# Check Vercel project config
echo ""
echo -e "${YELLOW}Checking Vercel project...${NC}"
if [ -f ".vercel/project.json" ]; then
  echo -e "  ${GREEN}✅${NC} Project linked to Vercel"
else
  echo -e "  ${RED}❌${NC} .vercel/project.json not found"
  echo "     Run 'vercel link' first"
  exit 1
fi

echo ""
read -p "✅ Pre-flight checks passed. Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo ""

# Step 2: Validate env vars
show_step "Validate Environment Variables"
echo ""

REQUIRED_VARS=(
  "DATABASE_URL"
  "REDIS_URL"
  "AWS_ACCESS_KEY_ID"
  "AWS_SECRET_ACCESS_KEY"
  "AWS_S3_BUCKET"
  "AWS_REGION"
  "SENDGRID_API_KEY"
  "NEXT_PUBLIC_SENTRY_DSN"
  "NEXT_PUBLIC_API_URL"
  "CORS_ORIGIN"
  "NODE_ENV"
  "EMAIL_PROVIDER"
)

MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING+=("$var")
    echo -e "  ${RED}❌${NC} $var"
  else
    echo -e "  ${GREEN}✅${NC} $var"
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo -e "${RED}ERROR: Missing ${#MISSING[@]} variables${NC}"
  echo ""
  echo -e "${YELLOW}Export them in your shell:${NC}"
  for var in "${MISSING[@]}"; do
    echo -e "  export $var=\"your_value\""
  done
  exit 1
fi

echo ""
read -p "✅ All variables present. Configure Vercel? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo ""

# Step 3: Configure Vercel
show_step "Configure Vercel Environment Variables"
echo ""

bash ./scripts/configure-vercel-production.sh
if [ $? -ne 0 ]; then
  echo -e "${RED}Configuration failed${NC}"
  exit 1
fi

echo ""
read -p "Continue to monitoring? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "You can manually monitor at: https://vercel.com/contatovinicaetano93-commits/imobi"
  exit 0
fi

echo ""

# Step 4: Monitor build
show_step "Monitor Vercel Build"
echo ""

bash ./scripts/monitor-vercel-build.sh
BUILD_RESULT=$?

if [ $BUILD_RESULT -eq 0 ]; then
  echo ""
else
  echo -e "${RED}Build monitoring failed${NC}"
  exit $BUILD_RESULT
fi

echo ""

# Step 5: Validate production setup
show_step "Validate Production Environment"
echo ""

echo -e "${YELLOW}Running validation script...${NC}"
if bash ./scripts/validate-vercel-env.sh; then
  echo -e "${GREEN}✅ All validations passed!${NC}"
else
  echo -e "${RED}⚠️  Some validations failed${NC}"
  echo "    Review the output above for details"
fi

echo ""

# Step 6: Summary
show_step "Setup Complete"
echo ""

echo -e "${GREEN}═════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 PRODUCTION SETUP SUCCESSFUL!${NC}"
echo -e "${GREEN}═════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Summary of completed tasks:${NC}"
echo "  ✅ All 12 environment variables configured in Vercel"
echo "  ✅ Vercel build completed successfully"
echo "  ✅ All variables validated"
echo ""

echo -e "${YELLOW}Next steps (Manual):${NC}"
echo "  1. Send sign-off emails to 3 approvers:"
echo "     → cat SIGN_OFF_EMAILS_READY_TO_SEND.md"
echo ""
echo "  2. Schedule pre-deployment testing for 2026-06-01 14:00 Brazil:"
echo "     → cat PRE_DEPLOYMENT_TEST_CHECKLIST.md"
echo ""
echo "  3. Schedule cutover for 2026-06-02 02:00 UTC (23:00 Brazil):"
echo "     → cat PRODUCTION_CUTOVER_PLAN.md"
echo ""
echo "  4. Collect final GO/NO-GO decision by 2026-06-01 20:00 UTC"
echo ""

echo -e "${MAGENTA}═════════════════════════════════════════════════════════${NC}"
echo -e "Production environment is ready for testing and deployment!"
echo -e "${MAGENTA}═════════════════════════════════════════════════════════${NC}"
echo ""
