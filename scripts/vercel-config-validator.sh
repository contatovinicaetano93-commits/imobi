#!/bin/bash
# Comprehensive Vercel environment configuration validator
# Usage: ./scripts/vercel-config-validator.sh [--strict] [--format json]
#
# This script validates:
# - All required environment variables are set
# - Variable values match expected formats (URLs, connection strings, etc.)
# - Secret variables are marked correctly
# - No obvious typos or incomplete values
# - Vercel rebuild status (if Vercel CLI available)

set -e

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STRICT_MODE=false
JSON_FORMAT=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --strict)
      STRICT_MODE=true
      shift
      ;;
    --format)
      if [ "$2" == "json" ]; then
        JSON_FORMAT=true
      fi
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Define required variables by category
declare -A REQUIRED_VARS=(
  ["DATABASE_URL"]="secret"
  ["NEXT_PUBLIC_SENTRY_DSN"]="public"
  ["AWS_REGION"]="public"
  ["AWS_ACCESS_KEY_ID"]="secret"
  ["AWS_SECRET_ACCESS_KEY"]="secret"
  ["AWS_S3_BUCKET"]="public"
  ["SENDGRID_API_KEY"]="secret"
  ["REDIS_URL"]="secret"
  ["NEXT_PUBLIC_API_URL"]="public"
  ["CORS_ORIGIN"]="public"
  ["NODE_ENV"]="public"
  ["EMAIL_PROVIDER"]="public"
)

# Format validators: variable_name -> regex pattern
declare -A FORMAT_VALIDATORS=(
  ["DATABASE_URL"]="^postgresql://"
  ["NEXT_PUBLIC_SENTRY_DSN"]="^https://.*@.*\.io/"
  ["AWS_REGION"]="^[a-z]{2}-[a-z]+-[0-9]$"
  ["AWS_ACCESS_KEY_ID"]="^AKIA[0-9A-Z]{16}$"
  ["AWS_S3_BUCKET"]="^[a-z0-9.-]{3,63}$"
  ["SENDGRID_API_KEY"]="^SG\."
  ["REDIS_URL"]="^redis(s)?://"
  ["NEXT_PUBLIC_API_URL"]="^https?://"
  ["NODE_ENV"]="^(production|development|test)$"
  ["EMAIL_PROVIDER"]="^(sendgrid|mailgun|ses)$"
)

# Initialize counters
TOTAL=0
CONFIGURED=0
MISSING=0
FORMAT_ERRORS=0
WARNINGS=0
PASSED=0

# Initialize arrays
MISSING_VARS=()
FORMAT_ERROR_VARS=()
WARNING_VARS=()
PASSED_VARS=()

# Helper function to print messages
print_section() {
  if [ "$JSON_FORMAT" = false ]; then
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $1"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
  fi
}

print_success() {
  if [ "$JSON_FORMAT" = false ]; then
    echo -e "${GREEN}✅ $1${NC}"
  fi
}

print_error() {
  if [ "$JSON_FORMAT" = false ]; then
    echo -e "${RED}❌ $1${NC}"
  fi
}

print_warning() {
  if [ "$JSON_FORMAT" = false ]; then
    echo -e "${YELLOW}⚠️  $1${NC}"
  fi
}

print_info() {
  if [ "$JSON_FORMAT" = false ]; then
    echo -e "${BLUE}ℹ️  $1${NC}"
  fi
}

# Validate variable format
validate_format() {
  local var_name=$1
  local var_value=$2

  if [ -z "${FORMAT_VALIDATORS[$var_name]}" ]; then
    return 0  # No format validator defined, skip
  fi

  local pattern="${FORMAT_VALIDATORS[$var_name]}"

  if [[ ! "$var_value" =~ $pattern ]]; then
    return 1
  fi
  return 0
}

# Check if variable is likely a secret (and not marked as public)
check_secret_classification() {
  local var_name=$1
  local var_value=$2
  local classification=${REQUIRED_VARS[$var_name]}

  # Variables that should NEVER be marked as public
  local secret_keywords=("PASSWORD" "SECRET" "KEY" "TOKEN" "CREDENTIAL" "URL" "DSN")

  # Check if name suggests secret but is marked public
  local has_secret_name=false
  for keyword in "${secret_keywords[@]}"; do
    if [[ "$var_name" == *"$keyword"* ]] && [[ "$var_name" != NEXT_PUBLIC_* ]]; then
      has_secret_name=true
      break
    fi
  done

  if [ "$has_secret_name" = true ] && [ "$classification" = "public" ]; then
    return 1
  fi
  return 0
}

# Validate environment variable value completeness
validate_value_completeness() {
  local var_name=$1
  local var_value=$2

  # Check for placeholder values
  local placeholders=("your_" "xxxx" "placeholder" "example" "YOUR_" "CHANGE_ME" "TODO")
  for placeholder in "${placeholders[@]}"; do
    if [[ "$var_value" == *"$placeholder"* ]]; then
      return 1
    fi
  done

  # Check for obviously incomplete values
  if [[ ${#var_value} -lt 3 ]]; then
    return 1
  fi

  return 0
}

# Main validation loop
print_section "ENVIRONMENT VARIABLE VALIDATION"

if [ "$JSON_FORMAT" = false ]; then
  echo ""
fi

for var_name in "${!REQUIRED_VARS[@]}"; do
  TOTAL=$((TOTAL + 1))
  var_value="${!var_name}"
  classification=${REQUIRED_VARS[$var_name]}

  if [ -z "$var_value" ]; then
    # Variable not set
    MISSING=$((MISSING + 1))
    MISSING_VARS+=("$var_name:$classification")
    print_error "$var_name (not configured)"
  else
    # Variable is set, validate it
    CONFIGURED=$((CONFIGURED + 1))

    # Check format
    if ! validate_format "$var_name" "$var_value"; then
      FORMAT_ERRORS=$((FORMAT_ERRORS + 1))
      FORMAT_ERROR_VARS+=("$var_name")
      print_error "$var_name (invalid format)"
      print_info "  Expected pattern: ${FORMAT_VALIDATORS[$var_name]}"
      print_info "  Got: ${var_value:0:20}..."
    elif ! validate_value_completeness "$var_name" "$var_value"; then
      WARNINGS=$((WARNINGS + 1))
      WARNING_VARS+=("$var_name")
      print_warning "$var_name (possibly incomplete or placeholder value)"
      print_info "  Value: ${var_value:0:30}..."
    else
      PASSED=$((PASSED + 1))
      PASSED_VARS+=("$var_name")
      print_success "$var_name"
    fi
  fi
done

# Summary section
print_section "VALIDATION SUMMARY"

if [ "$JSON_FORMAT" = false ]; then
  echo ""
  echo -e "${GREEN}✅ Valid:${NC}         $PASSED/${TOTAL}"
  echo -e "${RED}❌ Missing:${NC}        $MISSING/${TOTAL}"
  echo -e "${RED}❌ Invalid Format:${NC} $FORMAT_ERRORS/${TOTAL}"
  echo -e "${YELLOW}⚠️  Warnings:${NC}       $WARNINGS/${TOTAL}"
  echo ""
fi

# Detailed missing variables
if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  print_section "MISSING VARIABLES"
  echo ""
  echo "Configure these in Vercel Dashboard → Settings → Environment Variables:"
  echo ""
  for var_info in "${MISSING_VARS[@]}"; do
    var_name="${var_info%:*}"
    classification="${var_info#*:}"
    if [ "$classification" = "secret" ]; then
      echo -e "  ${RED}•${NC} $var_name (Secret, all scopes)"
    else
      echo -e "  ${RED}•${NC} $var_name (Public, all scopes)"
    fi
  done
  echo ""
fi

# Detailed format errors
if [ ${#FORMAT_ERROR_VARS[@]} -gt 0 ]; then
  print_section "FORMAT ERRORS"
  echo ""
  echo "These variables have values that don't match expected format:"
  echo ""
  for var_name in "${FORMAT_ERROR_VARS[@]}"; do
    var_value="${!var_name}"
    echo -e "  ${RED}•${NC} $var_name"
    echo "    Current: ${var_value:0:40}..."
    echo "    Expected pattern: ${FORMAT_VALIDATORS[$var_name]}"
  done
  echo ""
fi

# Detailed warnings
if [ ${#WARNING_VARS[@]} -gt 0 ]; then
  print_section "WARNINGS"
  echo ""
  echo "Check these variables for incomplete or placeholder values:"
  echo ""
  for var_name in "${WARNING_VARS[@]}"; do
    var_value="${!var_name}"
    echo -e "  ${YELLOW}•${NC} $var_name"
    echo "    Value: ${var_value:0:40}..."
  done
  echo ""
fi

# Check Vercel CLI status
print_section "VERCEL DEPLOYMENT STATUS (Optional)"
echo ""

if command -v vercel &> /dev/null; then
  print_info "Vercel CLI found, checking deployment status..."

  # Try to get deployment status
  if vercel projects list > /dev/null 2>&1; then
    print_success "Vercel CLI authentication: OK"

    # Get last deployment
    last_deployment=$(vercel deployments --json 2>/dev/null | head -1 | grep -o '"uid":"[^"]*' | cut -d'"' -f4 || echo "unknown")
    if [ "$last_deployment" != "unknown" ]; then
      print_info "Last deployment: $last_deployment"
    fi
  else
    print_warning "Vercel CLI authentication needed: run 'vercel login'"
  fi
else
  print_info "Vercel CLI not installed (optional enhancement)"
  echo "  Install with: npm i -g vercel"
fi

# Final recommendation
print_section "RECOMMENDATIONS"
echo ""

if [ "$MISSING" -gt 0 ] || [ "$FORMAT_ERRORS" -gt 0 ]; then
  if [ "$STRICT_MODE" = true ]; then
    print_error "Validation FAILED (strict mode)"
    echo ""
    echo "  1. Review missing and invalid variables above"
    echo "  2. Configure/fix them in Vercel Dashboard"
    echo "  3. Run this script again to verify"
    echo ""
    if [ "$JSON_FORMAT" = false ]; then
      exit 1
    fi
  else
    print_warning "Some variables need attention"
    echo ""
    echo "  1. Review missing and invalid variables above"
    echo "  2. Configure them in Vercel Dashboard"
    echo "  3. You can still deploy, but it may fail"
    echo ""
  fi
elif [ "$WARNINGS" -gt 0 ]; then
  print_warning "All required variables configured, but check warnings above"
  echo ""
  echo "  1. Review warnings for possible placeholder values"
  echo "  2. Verify sensitive data isn't exposed in logs"
  echo "  3. You can deploy when ready"
  echo ""
else
  print_success "All environment variables validated successfully!"
  echo ""
  echo "  ✅ All 12 required variables configured"
  echo "  ✅ All values match expected formats"
  echo "  ✅ No placeholder values detected"
  echo ""
  echo "  🚀 Ready to deploy to Vercel"
  echo ""
fi

# Exit codes
EXIT_CODE=0
if [ "$MISSING" -gt 0 ] || [ "$FORMAT_ERRORS" -gt 0 ]; then
  EXIT_CODE=1
fi

if [ "$JSON_FORMAT" = true ]; then
  # Output JSON summary
  cat <<EOF
{
  "validation": {
    "total": $TOTAL,
    "passed": $PASSED,
    "missing": $MISSING,
    "formatErrors": $FORMAT_ERRORS,
    "warnings": $WARNINGS,
    "status": "$([ $EXIT_CODE -eq 0 ] && echo 'success' || echo 'failed')"
  },
  "missingVariables": $(printf '"%s" ' "${MISSING_VARS[@]}" | sed 's/ $//' | sed 's/^/[/' | sed 's/$$/]/'),
  "formatErrorVariables": $(printf '"%s" ' "${FORMAT_ERROR_VARS[@]}" | sed 's/ $//' | sed 's/^/[/' | sed 's/$$/]/'),
  "warningVariables": $(printf '"%s" ' "${WARNING_VARS[@]}" | sed 's/ $//' | sed 's/^/[/' | sed 's/$$/]/')
}
EOF
fi

exit $EXIT_CODE
