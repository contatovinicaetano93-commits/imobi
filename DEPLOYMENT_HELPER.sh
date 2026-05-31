#!/bin/bash
# Deployment Helper - Interactive guide for Phase 1-3
# Usage: ./DEPLOYMENT_HELPER.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

pause_for_user() {
  echo -e "${CYAN}Press ENTER to continue...${NC}"
  read -r
}

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           imobi Deployment Helper - Interactive Guide         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${YELLOW}Which phase are you starting?${NC}"
echo "1) Phase 1: Infrastructure (Terraform provisioning)"
echo "2) Phase 2: Application (API, Web, Mobile deployment)"
echo "3) Phase 3: Validation (Security & performance tests)"
echo ""
read -p "Enter choice (1-3): " phase

case $phase in
  1)
    phase_1
    ;;
  2)
    phase_2
    ;;
  3)
    phase_3
    ;;
  *)
    log_error "Invalid choice. Exiting."
    exit 1
    ;;
esac

phase_1() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  PHASE 1: INFRASTRUCTURE PROVISIONING (4-5 hours)             ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  log_info "This phase will:"
  echo "  • Initialize Terraform backend"
  echo "  • Create VPC (10.0.0.0/16)"
  echo "  • Create RDS PostgreSQL instance (db.r6i.xlarge)"
  echo "  • Create ElastiCache Redis (cache.r6g.xlarge)"
  echo "  • Create CloudWatch log groups"
  echo "  • Create SNS topics for alerts"
  echo ""

  log_warn "Prerequisites:"
  echo "  1. AWS credentials configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)"
  echo "  2. terraform installed (terraform version >= 1.5.0)"
  echo "  3. aws-cli installed and configured"
  echo ""

  read -p "Continue with Phase 1? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    log_info "Phase 1 cancelled"
    exit 0
  fi

  echo ""
  log_info "Step 1: Running pre-flight checks..."
  if [ ! -f PRE_FLIGHT_CHECKLIST.sh ]; then
    log_error "PRE_FLIGHT_CHECKLIST.sh not found"
    exit 1
  fi

  if bash PRE_FLIGHT_CHECKLIST.sh; then
    log_success "Pre-flight checks passed"
  else
    log_error "Pre-flight checks failed. Cannot proceed."
    exit 1
  fi

  pause_for_user

  echo ""
  log_info "Step 2: Initializing Terraform..."
  cd infrastructure/terraform || exit 1

  terraform init || {
    log_error "Terraform init failed"
    exit 1
  }

  log_success "Terraform initialized"
  pause_for_user

  echo ""
  log_info "Step 3: Planning infrastructure changes..."
  terraform plan -var-file=terraform.tfvars -out=tfplan || {
    log_error "Terraform plan failed"
    exit 1
  }

  log_success "Terraform plan complete"
  echo ""
  log_warn "Review the plan above carefully!"
  read -p "Apply these changes? (yes/no): " apply_confirm

  if [ "$apply_confirm" != "yes" ]; then
    log_info "Terraform apply cancelled"
    exit 0
  fi

  echo ""
  log_info "Step 4: Provisioning AWS infrastructure..."
  terraform apply tfplan || {
    log_error "Terraform apply failed"
    exit 1
  }

  log_success "Infrastructure provisioned successfully!"

  echo ""
  log_info "Step 5: Extracting outputs..."
  RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "unknown")
  REDIS_ENDPOINT=$(terraform output -raw redis_endpoint 2>/dev/null || echo "unknown")

  log_success "RDS Endpoint: $RDS_ENDPOINT"
  log_success "Redis Endpoint: $REDIS_ENDPOINT"

  echo ""
  log_info "Step 6: Next - Create .env.staging file"
  echo ""
  echo "Copy .env.example to .env.staging and fill in:"
  echo "  DATABASE_URL=postgresql://user:password@$RDS_ENDPOINT:5432/imbobi_staging"
  echo "  REDIS_HOST=$REDIS_ENDPOINT"
  echo "  REDIS_PORT=6379"
  echo "  (+ other required environment variables)"
  echo ""

  log_info "Step 7: Initialize database"
  echo "Run these commands:"
  echo "  cd /home/user/imobi"
  echo "  pnpm db:generate"
  echo "  pnpm db:migrate"
  echo ""

  read -p "Continue to Phase 2? (yes/no): " phase2_confirm
  if [ "$phase2_confirm" = "yes" ]; then
    cd /home/user/imobi
    phase_2
  else
    log_info "Phase 1 complete. Run './DEPLOYMENT_HELPER.sh' again for Phase 2."
  fi
}

phase_2() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  PHASE 2: APPLICATION DEPLOYMENT (3-4 hours)                 ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  log_info "This phase will:"
  echo "  • Build production artifacts"
  echo "  • Deploy API to ECS cluster"
  echo "  • Deploy Web to CloudFront/S3"
  echo "  • Deploy mobile builds"
  echo ""

  log_warn "Prerequisites:"
  echo "  1. Phase 1 infrastructure provisioned"
  echo "  2. .env.staging configured with all values"
  echo "  3. Docker installed and credentials configured"
  echo "  4. aws-cli with ECS permissions"
  echo ""

  read -p "Continue with Phase 2? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    log_info "Phase 2 cancelled"
    exit 0
  fi

  echo ""
  log_info "Step 1: Building production artifacts..."
  if pnpm build; then
    log_success "Build successful"
  else
    log_error "Build failed"
    exit 1
  fi

  pause_for_user

  echo ""
  log_warn "Step 2: API Deployment (Docker + ECS)"
  echo "Manual steps required:"
  echo "  1. docker build -t imbobi-api:staging ."
  echo "  2. docker push <ECR-repo>/imbobi-api:staging"
  echo "  3. Update ECS service with new image"
  echo ""
  echo "See FINAL_DEPLOYMENT_PLAN.md for detailed instructions"

  pause_for_user

  echo ""
  log_warn "Step 3: Web Deployment (Next.js + S3 + CloudFront)"
  echo "Manual steps required:"
  echo "  1. aws s3 sync apps/web/.next/ s3://bucket-name/ --delete"
  echo "  2. CloudFront cache invalidation: aws cloudfront create-invalidation"
  echo ""

  pause_for_user

  echo ""
  log_info "Step 4: Verify deployments"
  echo "Check that services are running:"
  echo "  • API health: https://api.staging.imbobi.com.br/health"
  echo "  • Web: https://staging.imbobi.com.br"
  echo ""

  read -p "Continue to Phase 3? (yes/no): " phase3_confirm
  if [ "$phase3_confirm" = "yes" ]; then
    phase_3
  else
    log_info "Phase 2 complete. Run './DEPLOYMENT_HELPER.sh' again for Phase 3."
  fi
}

phase_3() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  PHASE 3: VALIDATION (2-3 hours)                              ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  log_info "This phase will:"
  echo "  • Run security validation tests"
  echo "  • Run E2E tests"
  echo "  • Run performance/load tests"
  echo "  • Verify monitoring setup"
  echo ""

  read -p "Continue with Phase 3? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    log_info "Phase 3 cancelled"
    exit 0
  fi

  echo ""
  log_info "Step 1: Security Tests"
  echo "Run test cases from PRE_DEPLOYMENT_VALIDATION.md:"
  echo "  • Authentication flow (signup, login)"
  echo "  • Authorization & IDOR checks"
  echo "  • Rate limiting"
  echo "  • CORS security"
  echo "  • GPS validation"
  echo ""

  log_warn "Manual testing required. Follow test cases in:"
  echo "  PRE_DEPLOYMENT_VALIDATION.md"
  echo ""
  pause_for_user

  echo ""
  log_info "Step 2: E2E Tests"
  echo "Running application E2E tests..."
  if pnpm --filter @imbobi/api run test:e2e; then
    log_success "E2E tests passed"
  else
    log_warn "E2E tests failed - review logs"
  fi

  pause_for_user

  echo ""
  log_info "Step 3: Performance Load Testing"
  echo "Run load test with 50-100 concurrent users:"
  echo "  • Tool: k6, Apache JMeter, or Locust"
  echo "  • Target: https://api.staging.imbobi.com.br"
  echo "  • Duration: 5 minutes"
  echo "  • Monitor CloudWatch metrics"
  echo ""

  log_warn "Manual load testing required."
  pause_for_user

  echo ""
  log_info "Step 4: Monitoring Verification"
  echo "Verify CloudWatch setup:"
  echo "  • [ ] Log groups created"
  echo "  • [ ] Alarms configured"
  echo "  • [ ] SNS topics active"
  echo "  • [ ] Dashboards accessible"
  echo ""

  read -p "Monitoring verified? (yes/no): " monitoring
  if [ "$monitoring" != "yes" ]; then
    log_warn "Please review MONITORING_AND_ALERTING.md for setup"
  fi

  echo ""
  log_success "Phase 3 validation complete!"
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}✅ DEPLOYMENT COMPLETE - STAGING ENVIRONMENT READY${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run full regression testing"
  echo "  2. Stakeholder sign-off"
  echo "  3. Plan production deployment"
  echo ""
  echo "See FINAL_DEPLOYMENT_PLAN.md section 'POST-DEPLOYMENT' for details."
}

# Run the selected phase
