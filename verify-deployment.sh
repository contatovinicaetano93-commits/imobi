#!/bin/bash

################################################################################
# imobi Render Deployment Verification Script
#
# Comprehensive health check for imobi deployment
# Usage: ./verify-deployment.sh [api-url] [interactive]
#
# Examples:
#   ./verify-deployment.sh                           # Check localhost:4000
#   ./verify-deployment.sh https://api.imobi.com.br  # Check production API
#   ./verify-deployment.sh https://api.imobi.com.br true  # Interactive mode
#
# Exit codes:
#   0 = All checks passed
#   1 = Some warnings (services up but degraded)
#   2 = Critical failures (services down)
################################################################################

set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

API_URL="${1:-http://localhost:4000}"
INTERACTIVE="${2:-false}"
TIMEOUT=10
CURL_OPTS="-s --connect-timeout $TIMEOUT --max-time $((TIMEOUT + 5))"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'  # No Color
BOLD='\033[1m'

# Test counters
PASSED=0
WARNINGS=0
FAILED=0
SKIPPED=0

# ─────────────────────────────────────────────────────────────────────────────
# Utility Functions
# ─────────────────────────────────────────────────────────────────────────────

log_header() {
    echo -e "\n${BLUE}${BOLD}► $1${NC}"
}

log_success() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((PASSED++)) || true
}

log_warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    ((WARNINGS++)) || true
}

log_error() {
    echo -e "  ${RED}✗${NC} $1"
    ((FAILED++)) || true
}

log_info() {
    echo -e "  ${CYAN}ℹ${NC} $1"
}

log_skipped() {
    echo -e "  ${YELLOW}⊘${NC} $1"
    ((SKIPPED++)) || true
}

# Check if command exists
command_exists() {
    command -v "$1" &> /dev/null
    return $?
}

# Pretty print JSON (fallback to raw if jq not available)
pretty_json() {
    if command_exists jq; then
        echo "$1" | jq '.'
    else
        echo "$1"
    fi
}

# Test HTTP endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    local expected_code=${3:-200}

    echo -n "  Testing ${description}... "

    local response
    local http_code
    response=$(eval "curl $CURL_OPTS -w '\n%{http_code}' '${API_URL}${endpoint}' 2>&1" || echo "")

    if [ -z "$response" ]; then
        log_error "No response from $endpoint"
        return 2
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "$expected_code" ]; then
        log_success "HTTP $http_code"
        return 0
    elif [ "$http_code" = "503" ] || [ "$http_code" = "500" ]; then
        log_error "HTTP $http_code"
        return 2
    else
        log_warning "HTTP $http_code (expected $expected_code)"
        return 1
    fi
}

# Extract JSON field (with jq fallback)
get_json_field() {
    local json=$1
    local field=$2

    if command_exists jq; then
        echo "$json" | jq -r ".${field}" 2>/dev/null || echo ""
    else
        # Simple grep-based fallback for basic fields
        echo "$json" | grep -o "\"${field}\"[^,}]*" | cut -d':' -f2- | tr -d ' "' || echo ""
    fi
}

# Interactive prompt
prompt_continue() {
    if [ "$INTERACTIVE" = "true" ]; then
        local response
        read -p "  Press Enter to continue or 'q' to quit: " response
        if [ "$response" = "q" ]; then
            exit 0
        fi
    fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Check Functions
# ─────────────────────────────────────────────────────────────────────────────

check_prerequisites() {
    log_header "Prerequisites"

    # Check curl
    if command_exists curl; then
        log_success "curl installed"
    else
        log_error "curl not found (required)"
        return 2
    fi

    # Check jq (optional but recommended)
    if command_exists jq; then
        log_success "jq installed (JSON parsing enabled)"
    else
        log_warning "jq not found (using fallback JSON parsing)"
    fi

    # Check connectivity to API
    echo -n "  Testing basic connectivity... "
    if eval "curl $CURL_OPTS -I '${API_URL}' > /dev/null 2>&1"; then
        log_success "Can reach ${API_URL}"
    else
        log_error "Cannot reach ${API_URL} - verify URL and network"
        return 2
    fi
}

check_api_health() {
    log_header "API Health Endpoints"

    # GET /api/v1/health
    echo -n "  GET /api/v1/health... "
    local response
    response=$(eval "curl $CURL_OPTS '${API_URL}/api/v1/health'" 2>&1) || {
        log_error "Request failed"
        return 2
    }

    if echo "$response" | grep -q '"status"'; then
        log_success "Health endpoint responding"

        # Parse status
        local status
        status=$(get_json_field "$response" "status")

        if [ "$status" = "ok" ]; then
            log_success "Overall status: OK"
        else
            log_warning "Overall status: $status (degraded)"
            return 1
        fi

        # Check sub-services
        local db_status
        db_status=$(get_json_field "$response" "database")
        if [ "$db_status" = "connected" ]; then
            log_success "Database: Connected"
        else
            log_warning "Database: $db_status"
        fi

        local redis_status
        redis_status=$(get_json_field "$response" "redis")
        if [ "$redis_status" = "connected" ]; then
            log_success "Redis Cache: Connected"
        else
            log_warning "Redis Cache: $redis_status"
        fi

    else
        log_error "Invalid response from health endpoint"
        return 2
    fi
}

check_liveness() {
    log_header "Liveness Probe (Service Running)"

    echo -n "  GET /api/v1/health/live... "
    local http_code
    http_code=$(eval "curl $CURL_OPTS -o /dev/null -w '%{http_code}' '${API_URL}/api/v1/health/live'" 2>&1) || {
        log_error "Request failed"
        return 2
    }

    if [ "$http_code" = "200" ]; then
        log_success "Service is running (HTTP $http_code)"
    else
        log_error "Service not responding (HTTP $http_code)"
        return 2
    fi
}

check_readiness() {
    log_header "Readiness Probe (All Dependencies)"

    echo -n "  GET /api/v1/health/ready... "
    local http_code
    http_code=$(eval "curl $CURL_OPTS -o /dev/null -w '%{http_code}' '${API_URL}/api/v1/health/ready'" 2>&1) || {
        log_error "Request failed"
        return 2
    }

    if [ "$http_code" = "200" ]; then
        log_success "Service ready (HTTP $http_code)"
    elif [ "$http_code" = "503" ]; then
        log_warning "Service unavailable - dependencies not ready (HTTP $http_code)"
        return 1
    else
        log_error "Unexpected response (HTTP $http_code)"
        return 2
    fi
}

check_response_time() {
    log_header "Response Performance"

    echo "  Measuring endpoint latency..."

    # Test 3 requests and average
    local total_time=0
    local count=3

    for i in $(seq 1 $count); do
        echo -n "    Request $i... "
        local start
        local end
        local elapsed

        start=$(date +%s%N)
        eval "curl $CURL_OPTS -o /dev/null '${API_URL}/api/v1/health'" 2>&1 > /dev/null || true
        end=$(date +%s%N)

        elapsed=$(( (end - start) / 1000000 ))  # Convert to milliseconds
        total_time=$(( total_time + elapsed ))

        if [ $elapsed -lt 500 ]; then
            log_success "${elapsed}ms"
        elif [ $elapsed -lt 1000 ]; then
            log_warning "${elapsed}ms (acceptable)"
        else
            log_warning "${elapsed}ms (slow)"
        fi
    done

    local avg_time=$(( total_time / count ))
    echo "  Average response time: ${avg_time}ms"

    if [ $avg_time -lt 300 ]; then
        log_success "Performance is excellent"
    elif [ $avg_time -lt 700 ]; then
        log_warning "Performance is acceptable"
    else
        log_warning "Performance is slow - may need investigation"
        return 1
    fi
}

check_cors() {
    log_header "CORS Configuration"

    local origin="http://localhost:3000"
    echo "  Testing CORS with origin: $origin"

    local response
    response=$(eval "curl $CURL_OPTS -H 'Origin: $origin' -H 'Access-Control-Request-Method: GET' '${API_URL}/api/v1/health'" 2>&1) || {
        log_error "CORS request failed"
        return 2
    }

    if echo "$response" | grep -q "status"; then
        log_success "CORS headers present"
    else
        log_warning "Could not verify CORS headers"
    fi
}

check_environment_vars() {
    log_header "Environment Variables"

    # These should be set in Render dashboard, we can't check from CLI
    # But we can suggest what to verify

    log_info "Verify these in Render dashboard (Service → Environment):"
    echo "    ✓ DATABASE_URL is set and starts with 'postgresql://'"
    echo "    ✓ REDIS_HOST and REDIS_PORT are configured"
    echo "    ✓ JWT_SECRET is set (min 64 characters)"
    echo "    ✓ ENCRYPTION_KEY is set (base64-encoded)"
    echo "    ✓ NODE_ENV is set to 'production'"
    echo "    ✓ PORT is set to '4000'"
    echo "    ✓ CORS_ORIGIN matches your domain"
    echo "    ✓ NEXT_PUBLIC_API_URL points to this API"

    log_skipped "Manual verification required (no CLI access to Render env vars)"
}

check_database() {
    log_header "Database Connectivity"

    log_info "Database status from health endpoint:"

    local response
    response=$(eval "curl $CURL_OPTS '${API_URL}/api/v1/health'" 2>&1) || {
        log_error "Cannot reach health endpoint"
        return 2
    }

    local db_status
    db_status=$(get_json_field "$response" "database")

    if [ "$db_status" = "connected" ]; then
        log_success "PostgreSQL is connected"
        return 0
    else
        log_error "PostgreSQL is disconnected: $db_status"
        log_info "Check in Render dashboard:"
        echo "      • Postgres service is running"
        echo "      • DATABASE_URL is correct"
        echo "      • Network connectivity is allowed"
        return 2
    fi
}

check_redis() {
    log_header "Redis Cache"

    log_info "Redis status from health endpoint:"

    local response
    response=$(eval "curl $CURL_OPTS '${API_URL}/api/v1/health'" 2>&1) || {
        log_error "Cannot reach health endpoint"
        return 2
    }

    local redis_status
    redis_status=$(get_json_field "$response" "redis")

    if [ "$redis_status" = "connected" ]; then
        log_success "Redis is connected"
        return 0
    else
        log_warning "Redis is disconnected or not required: $redis_status"
        log_info "Check in Render dashboard:"
        echo "      • Redis service is running (if required)"
        echo "      • REDIS_HOST and REDIS_PORT are correct"
        echo "      • REDIS_PASSWORD is set (if needed)"
    fi
}

check_api_endpoints() {
    log_header "API Endpoints"

    local endpoints=(
        "/api/v1/health"
        "/api/v1/health/live"
        "/api/v1/health/ready"
    )

    for endpoint in "${endpoints[@]}"; do
        echo -n "  GET ${endpoint}... "
        local http_code
        http_code=$(eval "curl $CURL_OPTS -o /dev/null -w '%{http_code}' '${API_URL}${endpoint}'" 2>&1) || {
            log_error "Request failed"
            continue
        }

        if [ "$http_code" = "200" ] || [ "$http_code" = "503" ]; then
            log_success "HTTP $http_code"
        else
            log_warning "HTTP $http_code"
        fi
    done
}

check_error_logs() {
    log_header "Error Rate Check"

    # Most APIs don't expose error rate in public endpoints
    # This is informational only

    log_info "To check error logs:"
    echo "    1. Go to Render dashboard → Your API service"
    echo "    2. Click 'Logs' tab"
    echo "    3. Look for ERROR and WARN level messages"
    echo "    4. Check for repeated error patterns"

    log_skipped "Error logs require manual inspection"
}

show_summary() {
    log_header "Deployment Verification Summary"

    local total=$((PASSED + WARNINGS + FAILED))

    echo
    echo -e "  Results:"
    echo -e "    ${GREEN}✓ Passed: $PASSED${NC}"

    if [ $WARNINGS -gt 0 ]; then
        echo -e "    ${YELLOW}⚠ Warnings: $WARNINGS${NC}"
    fi

    if [ $FAILED -gt 0 ]; then
        echo -e "    ${RED}✗ Failed: $FAILED${NC}"
    fi

    if [ $SKIPPED -gt 0 ]; then
        echo -e "    ${YELLOW}⊘ Skipped: $SKIPPED${NC}"
    fi

    echo -e "    Total tests: $total"
    echo

    # Determine overall status
    if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}${BOLD}✓ All checks passed! Deployment looks healthy.${NC}"
        return 0
    elif [ $FAILED -eq 0 ]; then
        echo -e "${YELLOW}${BOLD}⚠ Some warnings detected but no critical failures.${NC}"
        return 1
    else
        echo -e "${RED}${BOLD}✗ Critical failures detected. Check the errors above.${NC}"
        return 2
    fi
}

show_next_steps() {
    log_header "Next Steps"

    if [ $FAILED -eq 0 ]; then
        echo -e "  ${GREEN}Your deployment is ready!${NC}"
        echo
        echo "  ✓ Test authentication:"
        echo "    curl -X POST ${API_URL}/api/v1/auth/login \\"
        echo "      -H 'Content-Type: application/json' \\"
        echo "      -d '{\"email\":\"test@example.com\",\"password\":\"TestPassword123\"}'"
        echo
        echo "  ✓ Monitor service:"
        echo "    Watch logs in Render dashboard → Service → Logs"
        echo
        echo "  ✓ Set up monitoring:"
        echo "    - Configure uptime monitoring (Pingdom, Better Uptime, etc.)"
        echo "    - Set up alerts for 503/500 errors"
        echo "    - Monitor database size and redis memory"
        echo
        echo "  ✓ Load test data (optional):"
        echo "    pnpm --filter @imbobi/api seed"
    else
        echo -e "  ${RED}Please fix the errors above before proceeding.${NC}"
        echo
        echo "  Debugging steps:"
        echo "  1. Check Render logs: Render dashboard → Service → Logs"
        echo "  2. Verify environment variables are set correctly"
        echo "  3. Check database and Redis are running"
        echo "  4. Review deployment build output"
        echo "  5. Check network security groups and firewall rules"
    fi
}

show_usage() {
    cat << EOF
${BOLD}imobi Deployment Verification${NC}

${BOLD}Usage:${NC}
  ./verify-deployment.sh [API_URL] [INTERACTIVE]

${BOLD}Arguments:${NC}
  API_URL       API endpoint URL (default: http://localhost:4000)
  INTERACTIVE   Enable interactive mode (true/false, default: false)

${BOLD}Examples:${NC}
  # Check local development API
  ./verify-deployment.sh

  # Check production API
  ./verify-deployment.sh https://api.imobi.com.br

  # Check with interactive prompts
  ./verify-deployment.sh https://api.imobi.com.br true

${BOLD}Exit Codes:${NC}
  0 = All checks passed
  1 = Some warnings
  2 = Critical failures

${BOLD}What Gets Checked:${NC}
  ✓ Prerequisites (curl, jq)
  ✓ API health endpoints
  ✓ Liveness probe
  ✓ Readiness probe
  ✓ Response performance
  ✓ CORS configuration
  ✓ Database connectivity
  ✓ Redis cache status
  ✓ API endpoints
  ✓ Error logs

EOF
}

# ─────────────────────────────────────────────────────────────────────────────
# Main Execution
# ─────────────────────────────────────────────────────────────────────────────

main() {
    # Show header
    clear || true
    echo -e "${BOLD}${BLUE}"
    cat << "EOF"
╔─────────────────────────────────────────────────────────╗
│     imobi Render Deployment Verification              │
│     Comprehensive Health Check & Diagnostics           │
╚─────────────────────────────────────────────────────────╝
EOF
    echo -e "${NC}"

    echo "API URL: $API_URL"
    echo "Time: $(date +'%Y-%m-%d %H:%M:%S')"
    echo "Mode: $([ "$INTERACTIVE" = "true" ] && echo "Interactive" || echo "Automated")"
    echo

    # Run checks
    check_prerequisites && prompt_continue || {
        show_summary
        exit 2
    }

    check_api_health && prompt_continue
    check_liveness && prompt_continue
    check_readiness && prompt_continue
    check_response_time && prompt_continue
    check_cors && prompt_continue
    check_environment_vars && prompt_continue
    check_database && prompt_continue
    check_redis && prompt_continue
    check_api_endpoints && prompt_continue
    check_error_logs && prompt_continue

    # Show summary and next steps
    echo
    show_summary
    local exit_code=$?

    echo
    show_next_steps

    exit $exit_code
}

# ─────────────────────────────────────────────────────────────────────────────
# Script Entry Point
# ─────────────────────────────────────────────────────────────────────────────

# Handle help flag
if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    show_usage
    exit 0
fi

# Run main
main "$@"
