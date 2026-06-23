#!/bin/bash

################################################################################
# IMOBI Production E2E Validation Suite
# Complete 5-phase validation for post-deployment testing
# Estimated runtime: < 30 minutes
#
# Usage:
#   ./PRODUCTION_E2E_VALIDATION_SCRIPT.sh <API_URL> [--verbose] [--cleanup]
#
# Example:
#   ./PRODUCTION_E2E_VALIDATION_SCRIPT.sh https://api.imobi.com
#   ./PRODUCTION_E2E_VALIDATION_SCRIPT.sh http://localhost:4000 --verbose
#
# Phases:
#   1. Health Check (5 min) — Service connectivity
#   2. Auth Flow (5 min) — User management & JWT
#   3. Core Features (8 min) — Obras, credits, scores, notifications
#   4. Manager Flow (5 min) — Approvals, KYC, dashboard
#   5. Performance (7 min) — Load, caching, rate limits
################################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-http://localhost:4000}"
VERBOSE="${VERBOSE:-false}"
CLEANUP="${CLEANUP:-true}"
TEST_TIMESTAMP=$(date +%s)

# Test accounts
CONSTRUCTOR_EMAIL="constructor-e2e-${TEST_TIMESTAMP}@imbobi.test"
CONSTRUCTOR_PASSWORD="TempPassword123!"
MANAGER_EMAIL="manager-e2e-${TEST_TIMESTAMP}@imbobi.test"
MANAGER_PASSWORD="TempPassword123!"

# Global tracking
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Result tracking per phase
PHASE1_RESULTS=()
PHASE2_RESULTS=()
PHASE3_RESULTS=()
PHASE4_RESULTS=()
PHASE5_RESULTS=()

################################################################################
# Utility Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_test() {
    echo -e "${CYAN}[TEST]${NC} $1"
    ((TOTAL_TESTS++))
}

print_section() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
}

print_phase() {
    echo ""
    echo -e "${YELLOW}>>> PHASE $1: $2${NC}"
}

# Generic curl wrapper with retry logic
curl_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    local max_attempts=3
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        local response
        if [ -z "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                $headers 2>/dev/null || echo "000")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data" \
                $headers 2>/dev/null || echo "000")
        fi

        local http_code=$(echo "$response" | tail -n1)
        local body=$(echo "$response" | head -n-1)

        # Return success if we got any response
        if [ "$http_code" != "000" ] && [ "$http_code" != "500" ]; then
            echo "$body"
            return 0
        fi

        ((attempt++))
        if [ $attempt -lt $max_attempts ]; then
            sleep 1
        fi
    done

    return 1
}

# Extract JSON value safely
extract_json() {
    echo "$1" | grep -o "\"$2\":[^,}]*" | head -1 | cut -d':' -f2- | tr -d ' "'
}

# Assert HTTP status
assert_status() {
    local response=$1
    local expected=$2
    local description=$3

    log_test "$description"

    local http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" = "$expected" ]; then
        log_pass "HTTP $http_code (expected $expected)"
        return 0
    else
        log_fail "HTTP $http_code (expected $expected)"
        return 1
    fi
}

# Assert JSON property exists
assert_json_property() {
    local response=$1
    local property=$2
    local description=$3

    log_test "$description"

    if echo "$response" | grep -q "\"$property\""; then
        log_pass "Property '$property' found"
        return 0
    else
        log_fail "Property '$property' not found in response"
        return 1
    fi
}

# Assert JSON value
assert_json_value() {
    local response=$1
    local property=$2
    local expected=$3
    local description=$4

    log_test "$description"

    local actual=$(extract_json "$response" "$property")
    if [ "$actual" = "$expected" ]; then
        log_pass "Property '$property' = '$expected'"
        return 0
    else
        log_fail "Property '$property' = '$actual' (expected '$expected')"
        return 1
    fi
}

# Assert response time
assert_response_time() {
    local time_ms=$1
    local threshold=$2
    local description=$3

    log_test "$description"

    if (( $(echo "$time_ms < $threshold" | bc -l) )); then
        log_pass "Response time ${time_ms}ms < ${threshold}ms"
        return 0
    else
        log_fail "Response time ${time_ms}ms >= ${threshold}ms"
        return 1
    fi
}

################################################################################
# PHASE 1: API Health Check (5 min)
################################################################################

phase_1_health_check() {
    print_phase 1 "API Health Check"

    log_info "Testing health endpoint and external service connectivity..."

    # 1.1 Health Endpoint
    log_test "GET /api/v1/health → Health status"
    local start_time=$(date +%s%N | cut -b1-13)
    local health_response=$(curl_request GET "/api/v1/health" "" "")
    local end_time=$(date +%s%N | cut -b1-13)
    local response_time=$((end_time - start_time))

    if [ -z "$health_response" ]; then
        log_fail "No response from health endpoint"
        PHASE1_RESULTS+=("FAIL: Health endpoint unreachable")
        return 1
    fi

    local http_code=$(echo "$health_response" | tail -n1)
    assert_status "$http_response" "200" "Health endpoint status code" || PHASE1_RESULTS+=("FAIL: Health HTTP status")

    # Extract and verify fields
    local body=$(echo "$health_response" | head -n-1)

    assert_json_property "$body" "status" "Response has 'status' field" && PHASE1_RESULTS+=("PASS: Status field present")
    assert_json_property "$body" "redis" "Response has 'redis' field" && PHASE1_RESULTS+=("PASS: Redis config present")
    assert_json_property "$body" "database" "Response has 'database' field" && PHASE1_RESULTS+=("PASS: Database config present")

    # 1.2 Response Time
    assert_response_time "$response_time" "2000" "Health endpoint response time < 2s" && PHASE1_RESULTS+=("PASS: Response time acceptable")

    log_info "Phase 1 complete: ${#PHASE1_RESULTS[@]} checks passed"
}

################################################################################
# PHASE 2: Authentication Flow (5 min)
################################################################################

phase_2_auth_flow() {
    print_phase 2 "Authentication Flow"

    log_info "Testing user registration, login, and token management..."

    # 2.1 User Registration
    log_test "POST /api/v1/auth/registrar → Register constructor"
    local reg_response=$(curl_request POST "/api/v1/auth/registrar" \
        "{\"email\":\"$CONSTRUCTOR_EMAIL\",\"password\":\"$CONSTRUCTOR_PASSWORD\",\"nome\":\"Test Constructor\"}" "")

    local reg_body=$(echo "$reg_response" | head -n-1)
    assert_status "$reg_response" "201" "Registration creates user (201)" && PHASE2_RESULTS+=("PASS: Registration successful")
    assert_json_property "$reg_body" "usuarioId" "Registration returns usuarioId" && PHASE2_RESULTS+=("PASS: usuarioId present")

    CONSTRUCTOR_ID=$(extract_json "$reg_body" "usuarioId")

    # 2.2 User Login
    log_test "POST /api/v1/auth/login → Login and get JWT"
    local login_response=$(curl_request POST "/api/v1/auth/login" \
        "{\"email\":\"$CONSTRUCTOR_EMAIL\",\"password\":\"$CONSTRUCTOR_PASSWORD\"}" "")

    local login_body=$(echo "$login_response" | head -n-1)
    assert_status "$login_response" "200" "Login returns 200 OK" && PHASE2_RESULTS+=("PASS: Login successful")
    assert_json_property "$login_body" "access_token" "Login returns JWT token" && PHASE2_RESULTS+=("PASS: JWT token returned")

    CONSTRUCTOR_TOKEN=$(extract_json "$login_body" "access_token")

    if [ -z "$CONSTRUCTOR_TOKEN" ]; then
        log_fail "Failed to extract JWT token"
        PHASE2_RESULTS+=("FAIL: JWT extraction failed")
        return 1
    fi

    # 2.3 Get User Profile (requires valid token)
    log_test "GET /api/v1/usuarios/meu-perfil → Get authenticated user profile"
    local profile_response=$(curl_request GET "/api/v1/usuarios/meu-perfil" "" \
        "-H \"Authorization: Bearer $CONSTRUCTOR_TOKEN\"")

    assert_status "$profile_response" "200" "Profile endpoint requires auth (200)" && PHASE2_RESULTS+=("PASS: Profile retrieval successful")

    local profile_body=$(echo "$profile_response" | head -n-1)
    assert_json_property "$profile_body" "email" "Profile contains email" && PHASE2_RESULTS+=("PASS: Profile data complete")

    # 2.4 Invalid Token Test
    log_test "GET /api/v1/usuarios/meu-perfil → Reject invalid token (401)"
    local invalid_token_response=$(curl_request GET "/api/v1/usuarios/meu-perfil" "" \
        "-H \"Authorization: Bearer invalid.token.here\"")

    assert_status "$invalid_token_response" "401" "Invalid token rejected (401)" && PHASE2_RESULTS+=("PASS: Auth validation works")

    # 2.5 Register Manager for later phases
    log_test "POST /api/v1/auth/registrar → Register manager"
    local manager_reg=$(curl_request POST "/api/v1/auth/registrar" \
        "{\"email\":\"$MANAGER_EMAIL\",\"password\":\"$MANAGER_PASSWORD\",\"nome\":\"Test Manager\"}" "")

    MANAGER_ID=$(extract_json "$(echo "$manager_reg" | head -n-1)" "usuarioId")

    local manager_login=$(curl_request POST "/api/v1/auth/login" \
        "{\"email\":\"$MANAGER_EMAIL\",\"password\":\"$MANAGER_PASSWORD\"}" "")

    MANAGER_TOKEN=$(extract_json "$(echo "$manager_login" | head -n-1)" "access_token")
    PHASE2_RESULTS+=("PASS: Manager registration complete")

    log_info "Phase 2 complete: ${#PHASE2_RESULTS[@]} checks passed"
}

################################################################################
# PHASE 3: Core Features (8 min)
################################################################################

phase_3_core_features() {
    print_phase 3 "Core Features"

    log_info "Testing obras, credits, scores, and notifications..."

    # 3.1 List Obras
    log_test "GET /api/v1/obras → List obras with pagination"
    local obras_response=$(curl_request GET "/api/v1/obras?limit=10&offset=0" "" \
        "-H \"Authorization: Bearer $CONSTRUCTOR_TOKEN\"")

    assert_status "$obras_response" "200" "Obras list endpoint returns 200" && PHASE3_RESULTS+=("PASS: Obras list works")

    local obras_body=$(echo "$obras_response" | head -n-1)
    assert_json_property "$obras_body" "data" "Obras response has data array" && PHASE3_RESULTS+=("PASS: Pagination structure correct")

    # 3.2 Create Obra
    log_test "POST /api/v1/obras → Create new obra"
    local create_obra=$(curl_request POST "/api/v1/obras" \
        "{\"nome\":\"Obra E2E Test\",\"endereco\":\"Rua Test 123, São Paulo, SP\",\"cep\":\"01310100\",\"latitude\":-23.5505,\"longitude\":-46.6333}" \
        "-H \"Authorization: Bearer $CONSTRUCTOR_TOKEN\"")

    local create_body=$(echo "$create_obra" | head -n-1)
    assert_status "$create_obra" "201" "Obra creation returns 201" && PHASE3_RESULTS+=("PASS: Obra creation successful")

    OBRA_ID=$(extract_json "$create_body" "obraId")

    if [ -z "$OBRA_ID" ]; then
        log_warn "Failed to create obra for further tests"
        PHASE3_RESULTS+=("FAIL: Obra ID extraction failed")
    fi

    # 3.3 Get Obra Details
    if [ ! -z "$OBRA_ID" ]; then
        log_test "GET /api/v1/obras/{obraId} → Get obra details"
        local obra_detail=$(curl_request GET "/api/v1/obras/$OBRA_ID" "" \
            "-H \"Authorization: Bearer $CONSTRUCTOR_TOKEN\"")

        assert_status "$obra_detail" "200" "Obra details endpoint returns 200" && PHASE3_RESULTS+=("PASS: Obra detail retrieval works")

        local detail_body=$(echo "$obra_detail" | head -n-1)
        assert_json_property "$detail_body" "nome" "Obra detail has nome" && PHASE3_RESULTS+=("PASS: Obra data complete")
    fi

    # 3.4 List Notifications (should be empty initially)
    log_test "GET /api/v1/notificacoes → List notifications"
    local notif_response=$(curl_request GET "/api/v1/notificacoes?limit=20" "" \
        "-H \"Authorization: Bearer $CONSTRUCTOR_TOKEN\"")

    assert_status "$notif_response" "200" "Notifications endpoint returns 200" && PHASE3_RESULTS+=("PASS: Notifications list works")

    local notif_body=$(echo "$notif_response" | head -n-1)
    assert_json_property "$notif_body" "data" "Notifications has data array" && PHASE3_RESULTS+=("PASS: Notifications structure correct")

    log_info "Phase 3 complete: ${#PHASE3_RESULTS[@]} checks passed"
}

################################################################################
# PHASE 4: Manager Portal Flow (5 min)
################################################################################

phase_4_manager_flow() {
    print_phase 4 "Manager Portal & Workflows"

    log_info "Testing manager dashboard and approval workflows..."

    # 4.1 Manager Dashboard
    log_test "GET /api/v1/manager/dashboard → Get manager dashboard"
    local dashboard_response=$(curl_request GET "/api/v1/manager/dashboard" "" \
        "-H \"Authorization: Bearer $MANAGER_TOKEN\"")

    assert_status "$dashboard_response" "200" "Manager dashboard returns 200" && PHASE4_RESULTS+=("PASS: Dashboard accessible")

    local dashboard_body=$(echo "$dashboard_response" | head -n-1)
    assert_json_property "$dashboard_body" "etapasAguardando" "Dashboard has etapasAguardando" && PHASE4_RESULTS+=("PASS: Dashboard KPIs present")

    # 4.2 Pending Etapas
    log_test "GET /api/v1/manager/etapas-pendentes → List pending etapas"
    local etapas_response=$(curl_request GET "/api/v1/manager/etapas-pendentes?limit=10" "" \
        "-H \"Authorization: Bearer $MANAGER_TOKEN\"")

    assert_status "$etapas_response" "200" "Pending etapas returns 200" && PHASE4_RESULTS+=("PASS: Etapas list works")

    # 4.3 Manager Unauthorized Access Test
    log_test "GET /api/v1/manager/dashboard → Reject non-manager access"
    local unauth_manager=$(curl_request GET "/api/v1/manager/dashboard" "" \
        "-H \"Authorization: Bearer $CONSTRUCTOR_TOKEN\"")

    # Should either be 403 (forbidden) or 401 (invalid role)
    local code=$(echo "$unauth_manager" | tail -n1)
    if [ "$code" = "403" ] || [ "$code" = "401" ]; then
        log_pass "Non-manager access properly rejected ($code)"
        PHASE4_RESULTS+=("PASS: Authorization checks work")
    else
        log_fail "Non-manager access returned $code (expected 403 or 401)"
        PHASE4_RESULTS+=("FAIL: Authorization should reject constructor")
    fi

    log_info "Phase 4 complete: ${#PHASE4_RESULTS[@]} checks passed"
}

################################################################################
# PHASE 5: Performance & Load (7 min)
################################################################################

phase_5_performance() {
    print_phase 5 "Performance & Load Testing"

    log_info "Testing response times, caching, rate limiting, and error handling..."

    # 5.1 Response Time Benchmarks (10 sequential requests)
    log_test "Response time benchmarks (10 requests)"
    local times=()
    local total_time=0
    local failed=0

    for i in {1..10}; do
        local start=$(date +%s%N | cut -b1-13)
        local resp=$(curl_request GET "/api/v1/obras?limit=5" "" \
            "-H \"Authorization: Bearer $CONSTRUCTOR_TOKEN\"")
        local end=$(date +%s%N | cut -b1-13)

        local request_time=$((end - start))
        times+=($request_time)
        total_time=$((total_time + request_time))

        if [ $? -ne 0 ]; then
            ((failed++))
        fi
    done

    local avg_time=$((total_time / 10))
    local max_time=$(printf '%s\n' "${times[@]}" | sort -rn | head -1)
    local min_time=$(printf '%s\n' "${times[@]}" | sort -n | head -1)

    log_info "Response times — Min: ${min_time}ms, Avg: ${avg_time}ms, Max: ${max_time}ms"

    if (( avg_time < 800 )); then
        log_pass "Average response time ${avg_time}ms < 800ms threshold"
        PHASE5_RESULTS+=("PASS: Response time acceptable")
    else
        log_warn "Average response time ${avg_time}ms >= 800ms (may need optimization)"
        PHASE5_RESULTS+=("WARN: Response time high")
    fi

    # 5.2 Error Rate
    local error_rate=$((failed * 100 / 10))
    if [ $error_rate -lt 10 ]; then
        log_pass "Error rate ${error_rate}% < 10% threshold"
        PHASE5_RESULTS+=("PASS: Error rate acceptable")
    else
        log_warn "Error rate ${error_rate}% >= 10%"
        PHASE5_RESULTS+=("WARN: High error rate")
    fi

    # 5.3 Rate Limiting Test
    log_test "Rate limiting: Send rapid requests and check 429 response"
    local rate_limit_tests=0
    local rate_limit_pass=0

    # Send 15 requests rapidly to auth endpoint (limit: 10/min)
    for i in {1..15}; do
        local resp=$(curl -s -w "%{http_code}" -X POST \
            "$API_URL/api/v1/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"test@test.com\",\"password\":\"test\"}" 2>/dev/null)

        local code=$(echo "$resp" | tail -c 4)
        ((rate_limit_tests++))

        if [ "$code" = "429" ]; then
            ((rate_limit_pass++))
        fi
    done

    if [ $rate_limit_pass -gt 0 ]; then
        log_pass "Rate limiting detected ($rate_limit_pass rate limit responses)"
        PHASE5_RESULTS+=("PASS: Rate limiting enforced")
    else
        log_warn "No rate limit responses detected (may be relaxed or per-IP)"
        PHASE5_RESULTS+=("WARN: Rate limiting may not be strict")
    fi

    # 5.4 Error Handling - Invalid Query Parameters
    log_test "Error handling: Invalid query parameters"
    local bad_query=$(curl_request GET "/api/v1/obras?limit=invalid" "" \
        "-H \"Authorization: Bearer $CONSTRUCTOR_TOKEN\"")

    local bad_code=$(echo "$bad_query" | tail -n1)
    if [ "$bad_code" = "400" ]; then
        log_pass "Invalid parameters returns 400"
        PHASE5_RESULTS+=("PASS: Input validation works")
    else
        log_warn "Invalid parameters returned $bad_code (expected 400)"
        PHASE5_RESULTS+=("WARN: Input validation may be missing")
    fi

    # 5.5 Error Handling - Missing Required Header
    log_test "Error handling: Missing authorization header"
    local no_auth=$(curl_request GET "/api/v1/obras?limit=10" "" "")

    local no_auth_code=$(echo "$no_auth" | tail -n1)
    if [ "$no_auth_code" = "401" ]; then
        log_pass "Missing auth returns 401"
        PHASE5_RESULTS+=("PASS: Authentication required")
    else
        log_warn "Missing auth returned $no_auth_code (expected 401)"
        PHASE5_RESULTS+=("WARN: Auth enforcement may be missing")
    fi

    log_info "Phase 5 complete: ${#PHASE5_RESULTS[@]} checks passed"
}

################################################################################
# Cleanup
################################################################################

cleanup() {
    if [ "$CLEANUP" = "true" ]; then
        log_info "Cleaning up test accounts..."

        # In production, cleanup would be done via database or API admin endpoints
        # For now, just log that cleanup would happen
        log_info "Test accounts created for audit trail:"
        log_info "  - Constructor: $CONSTRUCTOR_EMAIL"
        log_info "  - Manager: $MANAGER_EMAIL"
        log_warn "Consider manually deleting test accounts from database if needed"
    fi
}

################################################################################
# Final Report
################################################################################

print_report() {
    print_section "FINAL VALIDATION REPORT"

    echo ""
    echo "API URL: $API_URL"
    echo "Test Timestamp: $TEST_TIMESTAMP"
    echo ""

    echo -e "${CYAN}PHASE RESULTS:${NC}"
    echo ""

    echo -e "Phase 1: Health Check"
    for result in "${PHASE1_RESULTS[@]}"; do
        if [[ $result == PASS* ]]; then
            echo -e "  ${GREEN}✓${NC} $result"
        else
            echo -e "  ${RED}✗${NC} $result"
        fi
    done
    echo ""

    echo -e "Phase 2: Authentication"
    for result in "${PHASE2_RESULTS[@]}"; do
        if [[ $result == PASS* ]]; then
            echo -e "  ${GREEN}✓${NC} $result"
        else
            echo -e "  ${RED}✗${NC} $result"
        fi
    done
    echo ""

    echo -e "Phase 3: Core Features"
    for result in "${PHASE3_RESULTS[@]}"; do
        if [[ $result == PASS* ]]; then
            echo -e "  ${GREEN}✓${NC} $result"
        else
            echo -e "  ${RED}✗${NC} $result"
        fi
    done
    echo ""

    echo -e "Phase 4: Manager Portal"
    for result in "${PHASE4_RESULTS[@]}"; do
        if [[ $result == PASS* ]]; then
            echo -e "  ${GREEN}✓${NC} $result"
        else
            echo -e "  ${RED}✗${NC} $result"
        fi
    done
    echo ""

    echo -e "Phase 5: Performance"
    for result in "${PHASE5_RESULTS[@]}"; do
        if [[ $result == PASS* ]]; then
            echo -e "  ${GREEN}✓${NC} $result"
        elif [[ $result == WARN* ]]; then
            echo -e "  ${YELLOW}⚠${NC} $result"
        else
            echo -e "  ${RED}✗${NC} $result"
        fi
    done
    echo ""

    echo -e "${CYAN}SUMMARY:${NC}"
    local total=$((TESTS_PASSED + TESTS_FAILED))
    local pass_rate=$((TESTS_PASSED * 100 / total))

    echo "Total Tests: $total"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    echo "Pass Rate: ${pass_rate}%"
    echo ""

    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ ALL VALIDATIONS PASSED - PRODUCTION READY${NC}"
        return 0
    elif [ $TESTS_FAILED -le 2 ]; then
        echo -e "${YELLOW}⚠ VALIDATIONS PASSED WITH WARNINGS - REVIEW FAILURES${NC}"
        return 0
    else
        echo -e "${RED}✗ VALIDATIONS FAILED - DO NOT DEPLOY${NC}"
        return 1
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    print_section "IMOBI PRODUCTION E2E VALIDATION"
    log_info "API URL: $API_URL"
    log_info "Starting 5-phase validation suite..."
    echo ""

    # Check if API is reachable
    if ! curl_request GET "/api/v1/health" "" "" > /dev/null 2>&1; then
        log_fail "API is not reachable at $API_URL"
        echo ""
        echo -e "${RED}Cannot proceed with validation. Please check:${NC}"
        echo "  1. API URL is correct: $API_URL"
        echo "  2. API server is running"
        echo "  3. Network connectivity"
        exit 1
    fi

    log_pass "API is reachable"
    echo ""

    # Run all phases
    phase_1_health_check
    phase_2_auth_flow
    phase_3_core_features
    phase_4_manager_flow
    phase_5_performance

    # Cleanup
    cleanup

    # Print final report
    print_report
}

# Execute main
main "$@"
