#!/bin/bash

#==============================================================================
# iMobi Render Deployment Verification Script
#
# Automated health checks for iMobi deployment on Render
# Run this after deployment to verify all services are working
#
# Usage: ./verify-deployment.sh [api_url] [web_url]
#   ./verify-deployment.sh https://api-xxx.render.com https://app-xxx.render.com
#   ./verify-deployment.sh (uses defaults from environment or prompts)
#==============================================================================

set -o pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1}"
WEB_URL="${2}"
TIMEOUT=10
VERBOSE=0

# Stats tracking
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

#==============================================================================
# Helper Functions
#==============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[PASS]${NC} $1"
  ((TESTS_PASSED++))
}

log_error() {
  echo -e "${RED}[FAIL]${NC} $1"
  ((TESTS_FAILED++))
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_section() {
  echo ""
  echo -e "${BLUE}==== $1 ====${NC}"
}

#==============================================================================
# Check Prerequisites
#==============================================================================

check_prerequisites() {
  log_section "Checking Prerequisites"
  
  local missing_tools=0
  
  # Check curl
  if ! command -v curl &> /dev/null; then
    log_error "curl not found. Please install: brew install curl"
    missing_tools=1
  fi
  
  # Check jq (optional but recommended)
  if ! command -v jq &> /dev/null; then
    log_warning "jq not installed. JSON parsing will be limited. Install: brew install jq"
  fi
  
  if [ $missing_tools -eq 1 ]; then
    echo ""
    log_error "Missing required tools. Cannot continue."
    exit 1
  fi
  
  log_success "All prerequisites met"
}

#==============================================================================
# Input Validation
#==============================================================================

prompt_urls() {
  if [ -z "$API_URL" ]; then
    echo ""
    read -p "Enter API URL (e.g., https://api-xxx.render.com): " API_URL
    if [ -z "$API_URL" ]; then
      log_error "API URL is required"
      exit 1
    fi
  fi
  
  if [ -z "$WEB_URL" ]; then
    read -p "Enter Web URL (e.g., https://app-xxx.render.com): " WEB_URL
    if [ -z "$WEB_URL" ]; then
      log_error "Web URL is required"
      exit 1
    fi
  fi
}

validate_urls() {
  log_section "Validating URLs"
  
  # Validate API URL
  if [[ $API_URL =~ ^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,} ]]; then
    log_success "API URL format valid: $API_URL"
  else
    log_error "Invalid API URL format: $API_URL"
    exit 1
  fi
  
  # Validate Web URL
  if [[ $WEB_URL =~ ^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,} ]]; then
    log_success "Web URL format valid: $WEB_URL"
  else
    log_error "Invalid Web URL format: $WEB_URL"
    exit 1
  fi
}

#==============================================================================
# Health Check Tests
#==============================================================================

test_api_health() {
  ((TESTS_TOTAL++))
  
  log_section "Testing API Health"
  
  local health_endpoint="$API_URL/api/v1/health"
  local response
  local http_code
  
  log_info "Checking: $health_endpoint"
  
  response=$(curl -s -w "\n%{http_code}" --connect-timeout "$TIMEOUT" "$health_endpoint")
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    log_success "API health endpoint returned HTTP 200"
    
    # Try to parse JSON if jq is available
    if command -v jq &> /dev/null; then
      local status=$(echo "$body" | jq -r '.status // "unknown"' 2>/dev/null)
      local db_status=$(echo "$body" | jq -r '.database // "unknown"' 2>/dev/null)
      local redis_status=$(echo "$body" | jq -r '.redis // "unknown"' 2>/dev/null)
      
      if [ "$status" = "ok" ]; then
        log_success "API status: OK"
        log_info "  Database: $db_status"
        log_info "  Redis: $redis_status"
      else
        log_warning "API status: $status (expected: ok)"
      fi
    else
      log_info "Response: $body"
    fi
  else
    log_error "API health check failed (HTTP $http_code)"
    log_info "Response: $body"
    return 1
  fi
}

test_api_connectivity() {
  ((TESTS_TOTAL++))
  
  log_section "Testing API Connectivity"
  
  local response
  local http_code
  
  log_info "Testing basic connectivity to API"
  
  response=$(curl -s -w "\n%{http_code}" --connect-timeout "$TIMEOUT" -I "$API_URL/api/v1")
  http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" != "000" ] && [ -n "$http_code" ]; then
    log_success "API is reachable (HTTP $http_code)"
  else
    log_error "API is not reachable"
    return 1
  fi
}

test_web_health() {
  ((TESTS_TOTAL++))
  
  log_section "Testing Web Service"
  
  local response
  local http_code
  
  log_info "Checking: $WEB_URL"
  
  response=$(curl -s -w "\n%{http_code}" --connect-timeout "$TIMEOUT" "$WEB_URL")
  http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" = "200" ]; then
    log_success "Web service returned HTTP 200"
  else
    log_error "Web service returned HTTP $http_code (expected: 200)"
    return 1
  fi
}

test_api_auth() {
  ((TESTS_TOTAL++))
  
  log_section "Testing API Authentication"
  
  log_info "Testing protected endpoint (should require auth)"
  
  local response
  local http_code
  
  response=$(curl -s -w "\n%{http_code}" --connect-timeout "$TIMEOUT" "$API_URL/api/v1/auth/profile")
  http_code=$(echo "$response" | tail -n1)
  
  # Protected endpoints should return 401 without token
  if [ "$http_code" = "401" ]; then
    log_success "Protected endpoint correctly returns HTTP 401 (unauthorized)"
  else
    log_warning "Protected endpoint returned HTTP $http_code (expected: 401 for unauthenticated request)"
  fi
}

test_api_version() {
  ((TESTS_TOTAL++))
  
  log_section "Testing API Version Endpoint"
  
  log_info "Checking: $API_URL/api/v1"
  
  local response
  local http_code
  
  response=$(curl -s -w "\n%{http_code}" --connect-timeout "$TIMEOUT" "$API_URL/api/v1")
  http_code=$(echo "$response" | tail -n1)
  
  if [ "$http_code" = "200" ]; then
    log_success "API v1 endpoint is accessible"
  elif [ "$http_code" = "404" ]; then
    log_warning "API v1 endpoint returned 404 (may be expected)"
  else
    log_warning "API v1 endpoint returned HTTP $http_code"
  fi
}

test_cors() {
  ((TESTS_TOTAL++))
  
  log_section "Testing CORS Configuration"
  
  log_info "Checking CORS headers from API"
  
  local response
  local cors_header
  
  response=$(curl -s -w "\n" -H "Origin: $WEB_URL" --connect-timeout "$TIMEOUT" -I "$API_URL/api/v1/health")
  cors_header=$(echo "$response" | grep -i "Access-Control-Allow-Origin" | head -n1)
  
  if [ -n "$cors_header" ]; then
    log_success "CORS header present: $cors_header"
  else
    log_warning "No CORS headers detected (may be expected depending on configuration)"
  fi
}

test_response_times() {
  ((TESTS_TOTAL++))
  
  log_section "Testing Response Times"
  
  log_info "Measuring API response time (3 requests)"
  
  local total_time=0
  local count=0
  
  for i in {1..3}; do
    local time=$(curl -s -w "%{time_total}" -o /dev/null --connect-timeout "$TIMEOUT" "$API_URL/api/v1/health")
    total_time=$(echo "$total_time + $time" | bc)
    count=$((count + 1))
  done
  
  local avg_time=$(echo "scale=3; $total_time / $count" | bc)
  
  log_info "Average response time: ${avg_time}s"
  
  if (( $(echo "$avg_time < 1.0" | bc -l) )); then
    log_success "Response time is good (< 1s)"
  elif (( $(echo "$avg_time < 3.0" | bc -l) )); then
    log_warning "Response time is acceptable but slower than ideal (${avg_time}s)"
  else
    log_error "Response time is slow (${avg_time}s)"
  fi
}

test_ssl_certificate() {
  ((TESTS_TOTAL++))
  
  log_section "Testing SSL Certificate"
  
  log_info "Checking SSL certificate validity"
  
  # Extract hostname from URL
  local hostname=$(echo "$API_URL" | sed -E 's|https?://([^/]+).*|\1|')
  
  if [ -z "$hostname" ]; then
    log_warning "Could not extract hostname from URL"
    return 0
  fi
  
  # Check certificate expiration
  local cert_info=$(echo | openssl s_client -servername "$hostname" -connect "$hostname:443" 2>/dev/null | \
                   openssl x509 -noout -dates 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    log_success "SSL certificate is valid"
    log_info "$cert_info"
  else
    log_warning "Could not verify SSL certificate (openssl may not be available)"
  fi
}

#==============================================================================
# Environment Variables Check
#==============================================================================

check_environment_variables() {
  ((TESTS_TOTAL++))
  
  log_section "Checking Environment Variables"
  
  local required_vars=("DATABASE_URL" "REDIS_HOST" "JWT_SECRET" "ENCRYPTION_KEY")
  local missing=0
  
  log_info "Checking if environment variables are accessible..."
  
  if [ -z "$RENDER_API_SERVICE_ID" ] && [ -z "$RENDER_EXTERNAL_URL" ]; then
    log_warning "Not running in Render environment (RENDER_* vars not found)"
    log_info "This is normal if running locally. To check Render vars, run this on Render."
    return 0
  fi
  
  # If we're in Render, check the vars
  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      log_warning "$var not set"
      missing=1
    fi
  done
  
  if [ $missing -eq 0 ]; then
    log_success "All critical environment variables are set"
  else
    log_warning "Some environment variables may not be set"
  fi
}

#==============================================================================
# Final Report
#==============================================================================

print_summary() {
  echo ""
  log_section "Verification Summary"
  
  local pass_rate=0
  if [ $TESTS_TOTAL -gt 0 ]; then
    pass_rate=$(echo "scale=1; $TESTS_PASSED * 100 / $TESTS_TOTAL" | bc)
  fi
  
  echo -e "Total Tests:   $TESTS_TOTAL"
  echo -e "Passed:        ${GREEN}$TESTS_PASSED${NC}"
  echo -e "Failed:        ${RED}$TESTS_FAILED${NC}"
  echo -e "Pass Rate:     $pass_rate%"
  
  echo ""
  
  if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed! Deployment appears healthy.${NC}"
    return 0
  else
    echo -e "${RED}Some checks failed. Please review the errors above.${NC}"
    return 1
  fi
}

#==============================================================================
# Usage and Help
#==============================================================================

show_usage() {
  cat << EOF
iMobi Deployment Verification Script

USAGE:
  ./verify-deployment.sh [API_URL] [WEB_URL]

EXAMPLES:
  # Interactive mode (prompts for URLs)
  ./verify-deployment.sh

  # Automatic mode (with URLs)
  ./verify-deployment.sh https://api-xxx.render.com https://web-xxx.render.com

ENVIRONMENT VARIABLES:
  Tested if running on Render:
  - DATABASE_URL (PostgreSQL)
  - REDIS_HOST (Redis)
  - JWT_SECRET (Authentication)
  - ENCRYPTION_KEY (Data encryption)

TESTS PERFORMED:
  1. API health endpoint (/api/v1/health)
  2. API basic connectivity
  3. Web service availability
  4. API authentication (protected endpoint)
  5. API version endpoint
  6. CORS configuration
  7. Response times
  8. SSL certificate validity
  9. Environment variables check

REQUIREMENTS:
  - curl (for HTTP requests)
  - jq (optional, for JSON parsing)
  - openssl (optional, for SSL certificate checks)

For more information, see DEPLOYMENT_COMMANDS.md

EOF
}

#==============================================================================
# Main Execution
#==============================================================================

main() {
  echo ""
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║     iMobi Deployment Verification Script              ║"
  echo "║                                                         ║"
  echo "║  Complete health check for Render deployment          ║"
  echo "╚════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  
  # Show help if requested
  if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_usage
    exit 0
  fi
  
  check_prerequisites
  prompt_urls
  validate_urls
  
  # Run all tests
  test_api_connectivity
  test_api_health
  test_api_version
  test_api_auth
  test_cors
  test_response_times
  test_web_health
  test_ssl_certificate
  check_environment_variables
  
  # Print summary and exit with appropriate code
  print_summary
  exit $?
}

# Run main function
main "$@"
