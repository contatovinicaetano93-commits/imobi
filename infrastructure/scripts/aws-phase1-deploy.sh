#!/bin/bash
# ────────────────────────────────────────────────────────
# imbobi AWS Phase 1 Deployment Script
# ────────────────────────────────────────────────────────
# Automates the setup of RDS, ElastiCache, and SES
# Prerequisites: Terraform installed, AWS credentials configured
# Usage: ./aws-phase1-deploy.sh [--auto-approve]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TERRAFORM_DIR="infrastructure/terraform/aws-phase1"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AUTO_APPROVE=${1:-"--no-auto-approve"}

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        echo "  macOS:   brew install terraform"
        echo "  Linux:   sudo apt-get install terraform"
        echo "  Windows: choco install terraform"
        exit 1
    fi

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI is not installed (optional but recommended)"
        log_info "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    fi

    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured."
        log_info "Run: aws configure"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

check_terraform_state() {
    log_info "Checking Terraform state..."

    if [ -f "$PROJECT_ROOT/$TERRAFORM_DIR/terraform.tfstate" ]; then
        log_warning "Terraform state file already exists"
        log_info "If redeploying, existing resources will be preserved"
    fi

    if [ ! -f "$PROJECT_ROOT/$TERRAFORM_DIR/terraform.tfvars" ]; then
        log_error "terraform.tfvars not found"
        log_info "Creating from template..."
        cp "$PROJECT_ROOT/$TERRAFORM_DIR/terraform.tfvars.example" \
           "$PROJECT_ROOT/$TERRAFORM_DIR/terraform.tfvars"
        log_warning "Please edit terraform.tfvars with your values:"
        log_warning "  nano $TERRAFORM_DIR/terraform.tfvars"
        exit 1
    fi

    log_success "Terraform configuration found"
}

initialize_terraform() {
    log_info "Initializing Terraform..."
    cd "$PROJECT_ROOT/$TERRAFORM_DIR"

    terraform init

    log_success "Terraform initialized"
}

validate_terraform() {
    log_info "Validating Terraform configuration..."
    cd "$PROJECT_ROOT/$TERRAFORM_DIR"

    if ! terraform validate; then
        log_error "Terraform validation failed"
        exit 1
    fi

    log_success "Terraform configuration is valid"
}

plan_deployment() {
    log_info "Planning Terraform deployment..."
    cd "$PROJECT_ROOT/$TERRAFORM_DIR"

    terraform plan -out=tfplan

    log_success "Deployment plan saved (tfplan)"
}

apply_deployment() {
    log_info "Applying Terraform configuration..."

    if [ "$AUTO_APPROVE" == "--auto-approve" ]; then
        log_warning "Auto-approving changes (no confirmation required)"
        cd "$PROJECT_ROOT/$TERRAFORM_DIR"
        terraform apply -auto-approve tfplan
    else
        log_info "Manual approval required. Terraform will prompt for confirmation."
        cd "$PROJECT_ROOT/$TERRAFORM_DIR"
        terraform apply tfplan
    fi

    log_success "Terraform apply completed"
}

export_outputs() {
    log_info "Exporting Terraform outputs..."
    cd "$PROJECT_ROOT/$TERRAFORM_DIR"

    # Create outputs file
    terraform output -json > terraform-outputs.json

    log_success "Terraform outputs saved to terraform-outputs.json"

    # Display connection strings (masked)
    log_info "Connection Information:"
    echo ""
    echo "RDS PostgreSQL:"
    terraform output -raw rds_host 2>/dev/null | sed 's/^/  Host: /' || echo "  (Not available)"
    terraform output rds_port 2>/dev/null | sed 's/^/  Port: /' || echo "  Port: 5432"
    terraform output rds_database_name 2>/dev/null | sed 's/^/  Database: /' || echo "  (Not available)"
    echo "  Password: (check terraform.tfvars or AWS RDS console)"

    echo ""
    echo "ElastiCache Redis:"
    terraform output -raw elasticache_endpoint 2>/dev/null | sed 's/^/  Host: /' || echo "  (Not available)"
    terraform output elasticache_port 2>/dev/null | sed 's/^/  Port: /' || echo "  Port: 6379"

    echo ""
    echo "SES Email:"
    terraform output -raw ses_from_email 2>/dev/null | sed 's/^/  From: /' || echo "  (Not available)"
    terraform output -raw ses_region 2>/dev/null | sed 's/^/  Region: /' || echo "  Region: us-east-1"
}

update_env_file() {
    log_info "Updating environment files..."
    cd "$PROJECT_ROOT/$TERRAFORM_DIR"

    # Extract values from Terraform
    RDS_HOST=$(terraform output -raw rds_host 2>/dev/null || echo "")
    ELASTICACHE_ENDPOINT=$(terraform output -raw elasticache_endpoint 2>/dev/null || echo "")
    SES_EMAIL=$(terraform output -raw ses_from_email 2>/dev/null || echo "")

    if [ -z "$RDS_HOST" ]; then
        log_warning "Could not extract Terraform outputs automatically"
        log_info "Update environment files manually:"
        log_info "  services/api/.env"
        log_info "  .env.local"
        return
    fi

    # Create .env.aws file with AWS values
    ENV_FILE="$PROJECT_ROOT/.env.aws"
    cat > "$ENV_FILE" << EOF
# ────────────────────────────────────────────────────────
# AWS Phase 1 Environment Variables
# ────────────────────────────────────────────────────────
# Generated by aws-phase1-deploy.sh on $(date)

# RDS PostgreSQL
DATABASE_URL="postgresql://imbobimaster:PASSWORD_HERE@${RDS_HOST}:5432/imbobi_dev"
RDS_HOST="${RDS_HOST}"
RDS_PORT=5432

# ElastiCache Redis
REDIS_HOST="${ELASTICACHE_ENDPOINT}"
REDIS_PORT=6379

# AWS SES Email
USE_AWS_SES=true
SES_FROM_EMAIL="${SES_EMAIL}"
AWS_REGION=us-east-1

# AWS Credentials (set via environment or AWS CLI)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
EOF

    log_success "Environment file created: $ENV_FILE"
    log_info "Next steps:"
    log_info "1. Update DATABASE_URL with your RDS password from terraform.tfvars"
    log_info "2. Copy values to services/api/.env and .env.local as needed"
    log_info "3. Run: pnpm db:migrate (Prisma migrations)"
}

show_next_steps() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}AWS Phase 1 Deployment Complete!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo "Next Steps:"
    echo "1. Verify SES email identity in AWS console"
    echo "   https://console.aws.amazon.com/ses"
    echo ""

    echo "2. Update environment files:"
    echo "   cp .env.aws .env.local"
    echo "   nano .env.local  (update DATABASE_URL password)"
    echo ""

    echo "3. Migrate database schema:"
    echo "   cd services/api"
    echo "   pnpm install"
    echo "   pnpm db:migrate"
    echo ""

    echo "4. Test email service:"
    echo "   pnpm dev"
    echo "   # Send test email via API"
    echo ""

    echo "5. Monitor AWS resources:"
    echo "   RDS: https://console.aws.amazon.com/rds"
    echo "   ElastiCache: https://console.aws.amazon.com/elasticache"
    echo "   SES: https://console.aws.amazon.com/ses"
    echo ""

    echo "Documentation:"
    echo "   cat AWS_SETUP.md"
    echo ""
}

# Main execution
main() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}imbobi AWS Phase 1 Deployment Script${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Verify working directory
    if [ ! -d "$PROJECT_ROOT/$TERRAFORM_DIR" ]; then
        log_error "Terraform directory not found: $TERRAFORM_DIR"
        exit 1
    fi

    check_prerequisites
    check_terraform_state
    initialize_terraform
    validate_terraform
    plan_deployment
    apply_deployment
    export_outputs
    update_env_file
    show_next_steps
}

# Run main function
main "$@"
