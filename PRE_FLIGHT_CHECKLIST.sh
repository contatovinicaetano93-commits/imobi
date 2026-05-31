#!/bin/bash
# Pre-Flight Deployment Checklist
# Run this before starting Phase 1 infrastructure deployment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  imobi — Pre-Flight Deployment Checklist                     ║${NC}"
echo -e "${BLUE}║  Generated: $(date '+%Y-%m-%d %H:%M:%S')                                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

check_item() {
  local name=$1
  local command=$2

  if eval "$command" &>/dev/null; then
    echo -e "${GREEN}✓${NC} $name"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}✗${NC} $name"
    ((CHECKS_FAILED++))
  fi
}

check_file() {
  local name=$1
  local file=$2

  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $name"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}✗${NC} $name (missing: $file)"
    ((CHECKS_FAILED++))
  fi
}

echo -e "${YELLOW}1. GIT & CODE STATUS${NC}"
check_item "Git repository" "git rev-parse --git-dir"
check_item "Branch: claude/happy-goldberg-AFQPj" "git rev-parse --abbrev-ref HEAD | grep -q claude/happy-goldberg-AFQPj"
check_item "No uncommitted changes" "git diff-index --quiet HEAD --"
check_item "Latest code pushed" "! git diff origin/HEAD"
echo ""

echo -e "${YELLOW}2. BUILD ARTIFACTS${NC}"
check_file "API production build" "dist/services/api/src/main.js"
check_file "Web production build" "apps/web/.next/BUILD_ID"
echo ""

echo -e "${YELLOW}3. CONFIGURATION FILES${NC}"
check_file ".env.example exists" ".env.example"
check_file "Terraform: versions.tf" "infrastructure/terraform/versions.tf"
check_file "Terraform: main.tf" "infrastructure/terraform/main.tf"
check_file "Terraform: terraform.tfvars" "infrastructure/terraform/terraform.tfvars"
check_file "Terraform: variables.tf" "infrastructure/terraform/variables.tf"
echo ""

echo -e "${YELLOW}4. DOCUMENTATION${NC}"
check_file "Deployment plan" "FINAL_DEPLOYMENT_PLAN.md"
check_file "Pre-deployment validation" "PRE_DEPLOYMENT_VALIDATION.md"
check_file "Monitoring setup" "MONITORING_AND_ALERTING.md"
check_file "Disaster recovery" "ROLLBACK_AND_DISASTER_RECOVERY.md"
check_file "Security summary" "SECURITY_SUMMARY.md"
echo ""

echo -e "${YELLOW}5. ENVIRONMENT PREREQUISITES${NC}"
check_item "Node.js installed" "command -v node"
check_item "pnpm installed" "command -v pnpm"
check_item "terraform installed" "command -v terraform"
check_item "aws-cli installed" "command -v aws"
echo ""

echo -e "${YELLOW}6. AWS CREDENTIALS${NC}"
if [ -z "$AWS_ACCESS_KEY_ID" ]; then
  echo -e "${YELLOW}⚠${NC} AWS_ACCESS_KEY_ID not set (will check ~/.aws/credentials)"
else
  check_item "AWS_ACCESS_KEY_ID set" "test ! -z '$AWS_ACCESS_KEY_ID'"
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo -e "${YELLOW}⚠${NC} AWS_SECRET_ACCESS_KEY not set (will check ~/.aws/credentials)"
else
  check_item "AWS_SECRET_ACCESS_KEY set" "test ! -z '$AWS_SECRET_ACCESS_KEY'"
fi

if [ -z "$AWS_REGION" ]; then
  echo -e "${YELLOW}⚠${NC} AWS_REGION not set (defaulting to us-east-1)"
else
  check_item "AWS_REGION set" "test ! -z '$AWS_REGION'"
fi

if command -v aws &>/dev/null; then
  aws sts get-caller-identity &>/dev/null && \
    echo -e "${GREEN}✓${NC} AWS credentials valid" && \
    ((CHECKS_PASSED++)) || \
    (echo -e "${RED}✗${NC} AWS credentials invalid or expired" && ((CHECKS_FAILED++)))
fi
echo ""

echo -e "${YELLOW}7. REQUIRED ENVIRONMENT VARIABLES FOR .env.staging${NC}"
echo -e "${BLUE}Required before running terraform apply:${NC}"
echo "  • DATABASE_URL (from RDS after creation)"
echo "  • REDIS_HOST (from ElastiCache after creation)"
echo "  • JWT_SECRET (64+ random chars)"
echo "  • ENCRYPTION_KEY (32 bytes base64)"
echo "  • AWS credentials + S3 bucket"
echo "  • Firebase credentials"
echo "  • Email provider (SendGrid/SES/SMTP)"
echo ""

echo -e "${YELLOW}8. INFRASTRUCTURE READINESS${NC}"
echo -e "${BLUE}Ready to provision:${NC}"
check_item "Terraform plan valid" "cd infrastructure/terraform && terraform init -backend=false && terraform validate && cd ../../"
echo ""

echo -e "${YELLOW}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SUMMARY${NC}"
echo -e "Checks passed: ${GREEN}$CHECKS_PASSED${NC}"
echo -e "Checks failed: ${RED}$CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL CHECKS PASSED - Ready for Phase 1 deployment${NC}"
  echo ""
  echo -e "${BLUE}Next Steps:${NC}"
  echo "1. Create .env.staging file from .env.example"
  echo "2. Fill in all required AWS values and credentials"
  echo "3. Run: cd infrastructure/terraform && terraform init"
  echo "4. Run: terraform plan -var-file=terraform.tfvars"
  echo "5. Review plan output and run: terraform apply"
  echo ""
  echo "See FINAL_DEPLOYMENT_PLAN.md for detailed instructions."
  exit 0
else
  echo -e "${RED}❌ SOME CHECKS FAILED - Please fix issues above${NC}"
  exit 1
fi
