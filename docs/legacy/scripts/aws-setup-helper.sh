#!/bin/bash

# AWS Setup Helper Script
# Assists with Terraform init, deployment, and infrastructure validation

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

check_prerequisites() {
  log_info "Checking prerequisites..."

  local missing=0

  if ! command -v terraform &> /dev/null; then
    log_error "Terraform is not installed"
    missing=1
  else
    log_success "Terraform found: $(terraform version -json | jq -r .terraform_version)"
  fi

  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed"
    missing=1
  else
    log_success "AWS CLI found: $(aws --version)"
  fi

  if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed (optional, for JSON parsing)"
  else
    log_success "jq found"
  fi

  if [ $missing -eq 1 ]; then
    echo ""
    log_error "Please install missing tools and try again"
    exit 1
  fi
}

check_aws_credentials() {
  log_info "Checking AWS credentials..."

  if [ ! -f ~/.aws/credentials ]; then
    log_error "AWS credentials file not found at ~/.aws/credentials"
    echo "Run: aws configure"
    exit 1
  fi

  if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials are invalid"
    echo "Run: aws configure"
    exit 1
  fi

  local account_id=$(aws sts get-caller-identity --query Account --output text)
  local user_arn=$(aws sts get-caller-identity --query Arn --output text)

  log_success "AWS credentials valid"
  echo "  Account ID: $account_id"
  echo "  User: $user_arn"
}

init_terraform() {
  log_info "Initializing Terraform..."

  cd "$TERRAFORM_DIR"

  if [ -d ".terraform" ]; then
    log_warning "Terraform already initialized"
    return
  fi

  terraform init
  log_success "Terraform initialized"
}

validate_terraform() {
  log_info "Validating Terraform configuration..."

  cd "$TERRAFORM_DIR"
  terraform validate

  log_success "Terraform configuration is valid"
}

plan_terraform() {
  log_info "Creating Terraform execution plan..."

  cd "$TERRAFORM_DIR"

  if [ ! -f terraform.tfvars ]; then
    log_error "terraform.tfvars not found"
    echo "Copy terraform.tfvars.example to terraform.tfvars and update values"
    exit 1
  fi

  terraform plan -out=tfplan
  log_success "Plan saved to tfplan"
  echo ""
  echo "Review the plan above. To apply, run:"
  echo "  terraform apply tfplan"
}

apply_terraform() {
  log_info "Applying Terraform configuration..."
  log_warning "This will create AWS resources and may incur charges"
  echo ""

  read -p "Continue? (yes/no): " -r
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Cancelled"
    exit 1
  fi

  cd "$TERRAFORM_DIR"

  if [ -f tfplan ]; then
    terraform apply tfplan
  else
    terraform apply
  fi

  log_success "Infrastructure deployed"
}

show_outputs() {
  log_info "Infrastructure endpoints and details:"
  echo ""

  cd "$TERRAFORM_DIR"

  echo -e "${BLUE}Database${NC}"
  echo "  RDS Endpoint: $(terraform output -raw rds_endpoint)"
  echo "  Database Name: $(terraform output -raw rds_database_name)"
  echo "  Port: $(terraform output -raw rds_port)"
  echo ""

  echo -e "${BLUE}Cache${NC}"
  echo "  Redis Endpoint: $(terraform output -raw redis_endpoint)"
  echo "  Port: $(terraform output -raw redis_port)"
  echo ""

  echo -e "${BLUE}NestJS API${NC}"
  echo "  Public IP: $(terraform output -raw api_instance_public_ip)"
  echo "  URL: $(terraform output -raw api_url)"
  echo "  SSH: $(terraform output -raw api_ssh_command)"
  echo ""

  echo -e "${BLUE}Next.js Web${NC}"
  echo "  Public IP: $(terraform output -raw web_instance_public_ip)"
  echo "  URL: $(terraform output -raw web_url)"
  echo "  SSH: $(terraform output -raw web_ssh_command)"
  echo ""

  echo -e "${BLUE}Storage${NC}"
  echo "  S3 Bucket: $(terraform output -raw s3_bucket_name)"
  echo "  S3 ARN: $(terraform output -raw s3_bucket_arn)"
  echo ""
}

verify_connectivity() {
  log_info "Verifying infrastructure connectivity..."
  echo ""

  cd "$TERRAFORM_DIR"

  local rds_endpoint=$(terraform output -raw rds_address)
  local redis_endpoint=$(terraform output -raw redis_address)
  local api_ip=$(terraform output -raw api_instance_public_ip)
  local web_ip=$(terraform output -raw web_instance_public_ip)

  echo -e "${BLUE}Testing RDS PostgreSQL${NC}"
  if command -v psql &> /dev/null; then
    psql -h "$rds_endpoint" -U postgres -d imobi_prod -c "SELECT version();" && log_success "RDS accessible" || log_error "RDS not accessible"
  else
    log_warning "psql not installed, skipping RDS test"
  fi
  echo ""

  echo -e "${BLUE}Testing Redis${NC}"
  if command -v redis-cli &> /dev/null; then
    redis-cli -h "$redis_endpoint" PING && log_success "Redis accessible" || log_error "Redis not accessible"
  else
    log_warning "redis-cli not installed, skipping Redis test"
  fi
  echo ""

  echo -e "${BLUE}Testing API Instance${NC}"
  if curl -s http://"$api_ip":3001/health &> /dev/null; then
    log_success "API instance reachable"
  else
    log_warning "API instance not yet responding (may still be starting)"
  fi
  echo ""

  echo -e "${BLUE}Testing Web Instance${NC}"
  if curl -s http://"$web_ip":3000 &> /dev/null; then
    log_success "Web instance reachable"
  else
    log_warning "Web instance not yet responding (may still be starting)"
  fi
  echo ""
}

show_cost_estimate() {
  log_info "AWS Free Tier Estimate (first 12 months)"
  echo ""
  echo "  RDS PostgreSQL (t3.micro):     FREE (750 hrs/month)"
  echo "  ElastiCache Redis (cache.t3.micro): FREE (750 hrs/month)"
  echo "  EC2 t3.micro (1 instance):     FREE (750 hrs/month - covers 1 instance)"
  echo "  EC2 t3.micro (2nd instance):   ~$10/month (overage)"
  echo "  S3 Storage:                    FREE (5GB)"
  echo "  Data Transfer:                 FREE (100GB/month OUT)"
  echo ""
  echo "  TOTAL FIRST 12 MONTHS:         ~$10/month"
  echo ""
  echo "After free tier (after 12 months):"
  echo "  Estimated cost: $80-150/month"
  echo ""
}

show_help() {
  cat << EOF
AWS Setup Helper for imobi

Usage: $0 <command>

Commands:
  check          Check prerequisites (Terraform, AWS CLI)
  init           Initialize Terraform
  validate       Validate Terraform configuration
  plan           Create Terraform execution plan
  apply          Apply Terraform configuration (creates AWS resources)
  outputs        Show infrastructure endpoints and details
  verify         Verify infrastructure connectivity
  costs          Show cost estimates
  help           Show this help message

Example workflow:
  1. $0 check
  2. $0 init
  3. $0 validate
  4. $0 plan
  5. $0 apply
  6. $0 outputs
  7. $0 verify

EOF
}

# Main
COMMAND=${1:-help}

case $COMMAND in
  check)
    check_prerequisites
    check_aws_credentials
    ;;
  init)
    check_prerequisites
    check_aws_credentials
    init_terraform
    ;;
  validate)
    validate_terraform
    ;;
  plan)
    check_prerequisites
    init_terraform
    validate_terraform
    plan_terraform
    ;;
  apply)
    check_prerequisites
    init_terraform
    apply_terraform
    show_outputs
    ;;
  outputs)
    show_outputs
    ;;
  verify)
    verify_connectivity
    ;;
  costs)
    show_cost_estimate
    ;;
  help)
    show_help
    ;;
  *)
    log_error "Unknown command: $COMMAND"
    show_help
    exit 1
    ;;
esac
