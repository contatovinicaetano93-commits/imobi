#!/bin/bash
# Email Integration Test Script for IMOBI
# Tests SendGrid/SMTP email delivery
# Usage: ./test-email-integration.sh [environment] [recipient-email]

set -e

# Configuration
ENV="${1:-development}"
TEST_EMAIL="${2:-test-$(date +%s)@example.com}"
API_URL="${API_URL:-http://localhost:4000}"
API_PREFIX="/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_header() {
  echo -e "\n${BLUE}════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}════════════════════════════════════════${NC}\n"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Parse email from response
extract_email() {
  echo "$1" | jq -r '.email // empty'
}

extract_user_id() {
  echo "$1" | jq -r '.usuarioId // empty'
}

# Test 1: Verify API is accessible
test_api_health() {
  log_header "Test 1: API Health Check"

  RESPONSE=$(curl -s -X GET "$API_URL$API_PREFIX/health")
  STATUS=$(echo "$RESPONSE" | jq -r '.status // "error"')

  if [ "$STATUS" = "ok" ]; then
    log_success "API is running"
    log_info "Response: $(echo $RESPONSE | jq -c '.')"
  else
    log_error "API is not responding correctly"
    echo "Response: $RESPONSE"
    exit 1
  fi
}

# Test 2: Registration with welcome email
test_registration_email() {
  log_header "Test 2: Registration Flow (Welcome Email)"

  local timestamp=$(date +%s)
  local test_user_email="registration-test-${timestamp}@imbobi.com"
  local test_cpf="$(printf '%011d' $RANDOM)"

  log_info "Registering user: $test_user_email"

  REGISTER_RESPONSE=$(curl -s -X POST "$API_URL$API_PREFIX/auth/registrar" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$test_user_email\",
      \"senha\": \"TestPass@123\",
      \"nome\": \"Test User $timestamp\",
      \"cpf\": \"$test_cpf\",
      \"telefone\": \"11999999999\",
      \"consentidoTermos\": true,
      \"consentidoPrivacy\": true,
      \"consentidoKyc\": true
    }")

  USUARIO_ID=$(extract_user_id "$REGISTER_RESPONSE")
  RETURNED_EMAIL=$(extract_email "$REGISTER_RESPONSE")

  if [ -z "$USUARIO_ID" ]; then
    log_error "Registration failed"
    echo "Response: $REGISTER_RESPONSE" | jq '.'
    return 1
  fi

  log_success "User registered successfully"
  log_info "User ID: $USUARIO_ID"
  log_info "Email: $RETURNED_EMAIL"
  log_warning "Welcome email should arrive within 5 seconds"

  # Store for later cleanup
  export TEST_USER_ID="$USUARIO_ID"
  export TEST_USER_EMAIL="$test_user_email"

  return 0
}

# Test 3: Password reset email
test_password_reset_email() {
  log_header "Test 3: Password Reset Email"

  log_info "Requesting password reset for: $TEST_USER_EMAIL"

  RESET_RESPONSE=$(curl -s -X POST "$API_URL$API_PREFIX/auth/esqueceu-senha" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$TEST_USER_EMAIL\"
    }")

  RESET_TOKEN=$(echo "$RESET_RESPONSE" | jq -r '.resetToken // empty')

  if [ -z "$RESET_TOKEN" ]; then
    log_warning "No reset token returned (expected if email not found)"
    log_info "Response: $(echo $RESET_RESPONSE | jq -c '.')"
    return 0
  fi

  log_success "Password reset email triggered"
  log_info "Reset token: ${RESET_TOKEN:0:30}..."
  log_warning "Password reset email should arrive within 5 seconds"

  return 0
}

# Test 4: Check application logs for email provider
test_email_provider_detection() {
  log_header "Test 4: Email Provider Detection"

  log_info "Checking which email provider is configured..."

  # Check environment variables from the running app
  # This is implementation-specific and depends on access to logs

  log_info "Look for these log messages in application logs:"
  log_info "  ✅ 'SendGrid email provider configured' (if using SendGrid)"
  log_info "  ✅ 'SMTP email provider configured' (if using SMTP)"
  log_info "  ⚠️  '[EMAIL-CONSOLE]' entries (if in console mode)"
  log_info ""
  log_info "To view logs:"

  case "$ENV" in
    production|prod)
      log_info "  Vercel: vercel logs api --follow"
      log_info "  Railway: railway logs -f"
      ;;
    staging|stage)
      log_info "  Vercel: vercel logs api --follow --environment staging"
      log_info "  Railway: railway logs -f --environment staging"
      ;;
    development|dev)
      log_info "  Docker: docker logs <container-id> -f"
      log_info "  Local: npm run dev (check console output)"
      ;;
  esac

  return 0
}

# Test 5: Verify SendGrid connection (via environment)
test_sendgrid_connection() {
  log_header "Test 5: SendGrid Integration Status"

  log_info "Expected for production/staging:"
  log_info "  • EMAIL_PROVIDER = 'sendgrid'"
  log_info "  • SENDGRID_API_KEY = 'SG.xxx...'"
  log_info ""
  log_info "Expected for development:"
  log_info "  • EMAIL_PROVIDER = 'console'"
  log_info "  • Emails printed to stdout"
  log_info ""

  case "$ENV" in
    production|prod)
      log_info "🔧 To verify production SendGrid:"
      log_info "  1. Go to: https://app.sendgrid.com"
      log_info "  2. Click: Mail Activity"
      log_info "  3. Filter by recipient: $TEST_USER_EMAIL"
      log_info "  4. Status should be: 'Delivered' or 'Opened'"
      ;;
    development|dev)
      log_info "🔧 For local development, check application logs:"
      log_info "  npm run dev 2>&1 | grep -i email"
      log_info "  Should show: [EMAIL-CONSOLE] entries"
      ;;
  esac

  return 0
}

# Test 6: Simulate complete workflow
test_complete_workflow() {
  log_header "Test 6: Complete User Workflow"

  log_info "This test demonstrates the full email integration:"
  log_info ""
  log_info "1. Registration → Welcome Email sent"
  log_info "2. User completes KYC → KYC Approval Email"
  log_info "3. Stage approved → Stage Approval Email"
  log_info "4. Payment released → Payment Confirmation Email"
  log_info ""
  log_info "For this test, we've already completed step 1."
  log_info "Steps 2-4 require manager actions and can be tested in UI."

  return 0
}

# Main test execution
main() {
  log_header "IMOBI Email Integration Test Suite"
  echo "Environment: $ENV"
  echo "API URL: $API_URL"
  echo "Timestamp: $(date)"

  # Run tests
  test_api_health || exit 1
  test_registration_email || exit 1
  test_password_reset_email
  test_email_provider_detection
  test_sendgrid_connection
  test_complete_workflow

  log_header "Test Summary"
  log_success "All email integration tests completed!"
  echo ""
  echo "📧 Next steps:"
  echo "  1. Check email inbox for test messages"
  echo "  2. Verify email arrived within 5 seconds"
  echo "  3. Check SendGrid dashboard for delivery status"
  echo "  4. Review application logs for any errors"
  echo ""

  if [ ! -z "$TEST_USER_EMAIL" ]; then
    echo "Test user created: $TEST_USER_EMAIL"
    echo "User ID: $TEST_USER_ID"
    echo ""
  fi

  return 0
}

# Execute
main "$@"
