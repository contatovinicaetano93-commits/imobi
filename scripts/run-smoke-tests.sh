#!/bin/bash

##############################################################################
# Smoke Test Runner for imbobi Staging Deployment
#
# This script:
# 1. Waits for all services to be ready (API, Database, Redis, S3)
# 2. Runs the complete smoke test suite
# 3. Generates a test report
# 4. Exits with 0 if all pass, 1 if any fail
#
# Usage:
#   ./scripts/run-smoke-tests.sh
#
# Environment Variables:
#   API_HOST          - API host (default: localhost)
#   API_PORT          - API port (default: 4000)
#   DB_HOST           - Database host (default: localhost)
#   DB_PORT           - Database port (default: 5432)
#   REDIS_HOST        - Redis host (default: localhost)
#   REDIS_PORT        - Redis port (default: 6379)
#   TIMEOUT           - Service readiness timeout (default: 300 seconds)
##############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_HOST="${API_HOST:-localhost}"
API_PORT="${API_PORT:-4000}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
TIMEOUT="${TIMEOUT:-300}"
REPORT_FILE="SMOKE_TEST_RESULTS_$(date +%Y%m%d_%H%M%S).md"

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
API_DIR="$PROJECT_ROOT/services/api"

# Functions
print_header() {
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Wait for service with timeout
wait_for_service() {
    local service=$1
    local host=$2
    local port=$3
    local timeout=$4
    local elapsed=0

    echo -n "Waiting for $service ($host:$port)..."

    while ! nc -z "$host" "$port" 2>/dev/null; do
        if [ $elapsed -ge $timeout ]; then
            echo ""
            print_error "$service failed to start within ${timeout}s"
            return 1
        fi
        echo -n "."
        sleep 2
        ((elapsed += 2))
    done

    echo ""
    print_success "$service is ready"
    return 0
}

# Check command existence
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main execution
main() {
    print_header "imbobi Smoke Test Runner"

    # Timestamp
    START_TIME=$(date +%s)
    echo "Started at: $(date)"
    echo ""

    # Check prerequisites
    print_header "Checking Prerequisites"

    if ! command_exists node; then
        print_error "Node.js not found. Please install Node.js."
        exit 1
    fi
    print_success "Node.js found: $(node --version)"

    if ! command_exists pnpm; then
        print_error "pnpm not found. Please install pnpm."
        exit 1
    fi
    print_success "pnpm found: $(pnpm --version)"

    if ! command_exists nc; then
        print_warning "nc (netcat) not found. Skipping service connectivity checks."
        echo "You can install it with: apt-get install netcat-openbsd (Linux) or brew install netcat (macOS)"
    fi

    # Change to API directory
    cd "$API_DIR" || {
        print_error "Failed to change to API directory: $API_DIR"
        exit 1
    }

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_header "Installing Dependencies"
        pnpm install
    fi

    # Wait for services (if nc is available)
    if command_exists nc; then
        print_header "Waiting for Services"

        # API
        if ! wait_for_service "API" "$API_HOST" "$API_PORT" "$TIMEOUT"; then
            print_error "API service not ready. Skipping tests."
            exit 1
        fi

        # Database
        if ! wait_for_service "PostgreSQL" "$DB_HOST" "$DB_PORT" "$TIMEOUT"; then
            print_warning "PostgreSQL not ready. Some tests may fail."
        fi

        # Redis
        if ! wait_for_service "Redis" "$REDIS_HOST" "$REDIS_PORT" "$TIMEOUT"; then
            print_warning "Redis not ready. Cache tests may fail."
        fi

        echo ""
    else
        print_warning "Skipping service readiness checks (nc not available)"
    fi

    # Run smoke tests
    print_header "Running Smoke Test Suite"
    echo "Test file: services/api/test/smoke/smoke.spec.ts"
    echo "Test framework: Jest + Supertest"
    echo ""

    # Run with custom jest config
    if pnpm test -- \
        --config jest-e2e.config.js \
        test/smoke/smoke.spec.ts \
        --runInBand \
        --forceExit \
        --detectOpenHandles \
        --verbose \
        --maxWorkers=1 \
        2>&1; then

        EXIT_CODE=0
        RESULT="PASSED"
        RESULT_SYMBOL="${GREEN}✓${NC}"
    else
        EXIT_CODE=1
        RESULT="FAILED"
        RESULT_SYMBOL="${RED}✗${NC}"
    fi

    # Calculate duration
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    echo ""
    print_header "Test Results"
    echo "Result: $RESULT_SYMBOL"
    echo "Duration: ${DURATION}s"
    echo "Finished at: $(date)"
    echo ""

    # Print summary based on result
    if [ $EXIT_CODE -eq 0 ]; then
        print_success "All smoke tests passed!"
        echo ""
        echo "Next steps:"
        echo "  1. Review the test output above"
        echo "  2. Run full E2E test suite: pnpm test:e2e"
        echo "  3. Deploy to staging environment"
        echo "  4. Perform manual QA testing"
        echo "  5. Deploy to production"
    else
        print_error "Some smoke tests failed!"
        echo ""
        echo "Troubleshooting steps:"
        echo "  1. Check the test output above for details"
        echo "  2. Review SMOKE_TEST_RESULTS.md for resolution guide"
        echo "  3. Verify environment variables are set correctly"
        echo "  4. Check service logs:"
        echo "     - API: Check API logs for errors"
        echo "     - Database: Check PostgreSQL logs"
        echo "     - Redis: Check Redis logs"
        echo "  5. Re-run tests after fixing issues"
    fi

    echo ""
    print_header "Test Report"
    echo "Report saved to: $REPORT_FILE"
    echo ""

    # Generate summary report
    cat > "$REPORT_FILE" << EOF
# Smoke Test Results - $(date +"%Y-%m-%d %H:%M:%S")

## Summary

- **Status**: $RESULT
- **Duration**: ${DURATION}s
- **Test File**: services/api/test/smoke/smoke.spec.ts
- **Environment**: staging
- **Host**: $(hostname)
- **Node Version**: $(node --version)
- **npm Version**: $(npm --version)

## Test Suites

- Health & Connectivity (4 checks)
- User Registration & Login Flow (7 checks)
- KYC Complete Flow (7 checks)
- Credit Flow (6 checks)
- Evidence Flow (6 checks)

**Total: 30 critical checks**

## Result Details

\`\`\`
$RESULT
Exit Code: $EXIT_CODE
\`\`\`

## Next Steps

EOF

    if [ $EXIT_CODE -eq 0 ]; then
        cat >> "$REPORT_FILE" << 'EOF'
1. All critical flows are validated ✓
2. Ready for deployment to staging environment
3. Perform manual QA testing
4. Deploy to production after approval

EOF
    else
        cat >> "$REPORT_FILE" << 'EOF'
1. Review failures in test output above
2. Check SMOKE_TEST_RESULTS.md for troubleshooting guide
3. Fix identified issues
4. Re-run smoke tests: ./scripts/run-smoke-tests.sh
5. Do NOT deploy until all tests pass

EOF
    fi

    echo "Report content written to $REPORT_FILE"
    echo ""

    return $EXIT_CODE
}

# Run main function
main
