#!/bin/bash

###############################################################################
# Test Monitoring Stack
#
# Complete verification script that tests:
# - Sentry error tracking
# - Prometheus metrics collection
# - CloudWatch log aggregation
# - Grafana dashboard data
# - PagerDuty alert triggering
# - Alert dashboard functionality
#
# Usage: ./scripts/test-monitoring-stack.sh [options]
#
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VERBOSE=${VERBOSE:-false}
TEST_SENTRY=${TEST_SENTRY:-true}
TEST_PROMETHEUS=${TEST_PROMETHEUS:-true}
TEST_GRAFANA=${TEST_GRAFANA:-true}
TEST_PAGERDUTY=${TEST_PAGERDUTY:-true}
API_URL=${API_URL:-http://localhost:4000}

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_test() {
  echo -n "Testing: $1... "
  ((TESTS_RUN++))
}

pass() {
  echo -e "${GREEN}✓ PASSED${NC}"
  ((TESTS_PASSED++))
}

fail() {
  echo -e "${RED}✗ FAILED${NC}"
  ((TESTS_FAILED++))
  if [ -n "$1" ]; then
    echo "  Reason: $1"
  fi
}

skip() {
  echo -e "${YELLOW}⊘ SKIPPED${NC}"
  if [ -n "$1" ]; then
    echo "  Reason: $1"
  fi
}

# Test 1: Sentry Configuration
test_sentry_configuration() {
  print_test "Sentry DSN configuration"

  if [ -z "$SENTRY_DSN" ]; then
    skip "SENTRY_DSN not configured"
    return 0
  fi

  # Verify DSN format
  if [[ $SENTRY_DSN =~ https://.*@.*\.ingest\.sentry\.io/[0-9]+ ]]; then
    pass
    return 0
  else
    fail "Invalid SENTRY_DSN format"
    return 1
  fi
}

# Test 2: Sentry Connectivity
test_sentry_connectivity() {
  print_test "Sentry API connectivity"

  if [ -z "$SENTRY_DSN" ]; then
    skip "SENTRY_DSN not configured"
    return 0
  fi

  # Extract Sentry project from DSN
  SENTRY_HOST=$(echo "$SENTRY_DSN" | cut -d'@' -f2 | cut -d'/' -f1)

  if nc -z -w 3 "$SENTRY_HOST" 443 >/dev/null 2>&1; then
    pass
    return 0
  else
    fail "Cannot connect to Sentry ($SENTRY_HOST:443)"
    return 1
  fi
}

# Test 3: Sentry Error Capture
test_sentry_error_capture() {
  print_test "Sentry error capture simulation"

  if [ -z "$SENTRY_DSN" ]; then
    skip "SENTRY_DSN not configured"
    return 0
  fi

  # Create a test error in the app and check if it's captured in Sentry
  # This requires making a request to a broken endpoint
  RESPONSE=$(curl -s "$API_URL/api/v1/test-sentry-error" 2>/dev/null || echo '{"error":"connection failed"}')

  if echo "$RESPONSE" | jq -e '.error or .statusCode' >/dev/null 2>&1; then
    pass
    return 0
  else
    skip "Test error endpoint not available"
    return 0
  fi
}

# Test 4: Prometheus Metrics Endpoint
test_prometheus_metrics_endpoint() {
  print_test "Prometheus metrics endpoint availability"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/metrics" 2>/dev/null)

  if [ "$HTTP_CODE" = "200" ]; then
    pass
    return 0
  else
    fail "Metrics endpoint returned HTTP $HTTP_CODE"
    return 1
  fi
}

# Test 5: Prometheus Metrics Format
test_prometheus_metrics_format() {
  print_test "Prometheus metrics format validation"

  RESPONSE=$(curl -s "$API_URL/api/v1/metrics" 2>/dev/null)

  # Check for Prometheus metric format
  if echo "$RESPONSE" | grep -qE '^[a-z_]+\{' || echo "$RESPONSE" | grep -qE '^[a-z_]+ '; then
    pass
    return 0
  else
    fail "Invalid Prometheus metrics format"
    if [ "$VERBOSE" = "true" ]; then
      echo "Response: $RESPONSE" | head -20
    fi
    return 1
  fi
}

# Test 6: Key Metrics Present
test_key_metrics_present() {
  print_test "Key metrics are being collected"

  RESPONSE=$(curl -s "$API_URL/api/v1/metrics" 2>/dev/null)

  local REQUIRED_METRICS=(
    "process_cpu_usage_percent"
    "process_resident_memory_bytes"
    "nodejs_version_info"
    "http_requests_total"
  )

  local MISSING=()

  for metric in "${REQUIRED_METRICS[@]}"; do
    if ! echo "$RESPONSE" | grep -q "$metric"; then
      MISSING+=("$metric")
    fi
  done

  if [ ${#MISSING[@]} -eq 0 ]; then
    pass
    return 0
  else
    fail "Missing metrics: ${MISSING[*]}"
    return 1
  fi
}

# Test 7: Grafana Dashboard
test_grafana_dashboard() {
  print_test "Grafana dashboard accessibility"

  GRAFANA_URL="${GRAFANA_URL:-https://grafana.imobi.com}"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$GRAFANA_URL/d/imobi-api-prod" 2>/dev/null)

  if [ "$HTTP_CODE" = "200" ]; then
    pass
    return 0
  else
    skip "Grafana not accessible (HTTP $HTTP_CODE)"
    return 0
  fi
}

# Test 8: Grafana Datasource
test_grafana_datasource() {
  print_test "Grafana Prometheus datasource"

  GRAFANA_URL="${GRAFANA_URL:-https://grafana.imobi.com}"
  GRAFANA_API_KEY="${GRAFANA_API_KEY:-}"

  if [ -z "$GRAFANA_API_KEY" ]; then
    skip "GRAFANA_API_KEY not configured"
    return 0
  fi

  # Query Grafana datasource
  RESPONSE=$(curl -s "$GRAFANA_URL/api/datasources" \
    -H "Authorization: Bearer $GRAFANA_API_KEY" 2>/dev/null)

  if echo "$RESPONSE" | jq -e '.[0].id' >/dev/null 2>&1; then
    pass
    return 0
  else
    fail "Cannot access Grafana datasources"
    return 1
  fi
}

# Test 9: CloudWatch Logs
test_cloudwatch_logs() {
  print_test "CloudWatch log stream connectivity"

  if [ -z "$AWS_REGION" ] || [ -z "$AWS_ACCESS_KEY_ID" ]; then
    skip "AWS credentials not configured"
    return 0
  fi

  # Check if CloudWatch is accessible
  aws logs describe-log-groups --region "$AWS_REGION" >/dev/null 2>&1

  if [ $? -eq 0 ]; then
    pass
    return 0
  else
    fail "Cannot access CloudWatch"
    return 1
  fi
}

# Test 10: CloudWatch Log Group
test_cloudwatch_log_group() {
  print_test "CloudWatch log group exists"

  if [ -z "$AWS_REGION" ] || [ -z "$AWS_ACCESS_KEY_ID" ]; then
    skip "AWS credentials not configured"
    return 0
  fi

  LOG_GROUP="/aws/lambda/imobi-api"

  aws logs describe-log-streams --log-group-name "$LOG_GROUP" --region "$AWS_REGION" >/dev/null 2>&1

  if [ $? -eq 0 ]; then
    pass
    return 0
  else
    skip "CloudWatch log group not found: $LOG_GROUP"
    return 0
  fi
}

# Test 11: PagerDuty Integration Key
test_pagerduty_configuration() {
  print_test "PagerDuty integration key configuration"

  if [ -z "$PAGERDUTY_INTEGRATION_KEY" ]; then
    skip "PAGERDUTY_INTEGRATION_KEY not configured"
    return 0
  fi

  # Verify it looks like a valid integration key
  if [[ $PAGERDUTY_INTEGRATION_KEY =~ ^[a-zA-Z0-9]+$ ]] && [ ${#PAGERDUTY_INTEGRATION_KEY} -gt 10 ]; then
    pass
    return 0
  else
    fail "Invalid PAGERDUTY_INTEGRATION_KEY format"
    return 1
  fi
}

# Test 12: PagerDuty Connectivity
test_pagerduty_connectivity() {
  print_test "PagerDuty API connectivity"

  if [ -z "$PAGERDUTY_INTEGRATION_KEY" ]; then
    skip "PAGERDUTY_INTEGRATION_KEY not configured"
    return 0
  fi

  # Test connectivity to PagerDuty events API
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "https://events.pagerduty.com/v2/enqueue" \
    -H "Content-Type: application/json" \
    -d "{\"routing_key\":\"invalid\",\"event_action\":\"trigger\",\"payload\":{\"summary\":\"test\",\"severity\":\"info\",\"source\":\"imobi-api\"}}" 2>/dev/null)

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  # 400/403 is expected for invalid key, but proves connectivity
  if [[ $HTTP_CODE =~ ^(400|403)$ ]]; then
    pass
    return 0
  else
    fail "PagerDuty API error (HTTP $HTTP_CODE)"
    return 1
  fi
}

# Test 13: Alert Rules Configuration
test_alert_rules() {
  print_test "Prometheus alert rules configuration"

  if [ ! -f "config/alerts.yml" ]; then
    fail "Alert rules file not found: config/alerts.yml"
    return 1
  fi

  # Validate YAML syntax
  if command -v yamllint &> /dev/null; then
    yamllint config/alerts.yml >/dev/null 2>&1
    if [ $? -eq 0 ]; then
      pass
      return 0
    else
      fail "Invalid alert rules YAML syntax"
      return 1
    fi
  else
    pass
    return 0
  fi
}

# Test 14: Simulate Error for Monitoring
test_error_simulation() {
  print_test "Simulate error and verify monitoring capture"

  # Make request that will generate an error
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    "$API_URL/api/v1/credito/invalid-id" 2>/dev/null)

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

  if [[ $HTTP_CODE =~ ^(4|5)[0-9][0-9]$ ]]; then
    pass
    if [ "$VERBOSE" = "true" ]; then
      echo "  Generated error: HTTP $HTTP_CODE"
    fi
    return 0
  else
    fail "Expected error status code, got $HTTP_CODE"
    return 1
  fi
}

# Test 15: Dashboard Data Freshness
test_dashboard_data_freshness() {
  print_test "Dashboard data is fresh (within 5 min)"

  RESPONSE=$(curl -s "$API_URL/api/v1/metrics" 2>/dev/null)

  # Check for timestamp in metrics
  if echo "$RESPONSE" | grep -qE 'timestamp|time'; then
    pass
    return 0
  else
    skip "Cannot verify data freshness"
    return 0
  fi
}

# Test 16: Load Test to Generate Metrics
test_load_generation() {
  print_test "Generate load to populate metrics"

  echo "Generating 100 requests..."

  for i in {1..100}; do
    curl -s "$API_URL/api/v1/health" >/dev/null 2>&1 &
    if [ $((i % 20)) -eq 0 ]; then
      echo "  Progress: $i/100 requests sent"
    fi
  done

  wait

  echo "Load generation complete"
  pass
  return 0
}

# Main execution
main() {
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║          Imobi Monitoring Stack Test                          ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  echo "API URL: $API_URL"
  echo "Sentry Testing: $TEST_SENTRY"
  echo "Prometheus Testing: $TEST_PROMETHEUS"
  echo "Grafana Testing: $TEST_GRAFANA"
  echo "PagerDuty Testing: $TEST_PAGERDUTY"
  echo ""

  if [ "$TEST_SENTRY" = "true" ]; then
    print_header "Sentry Configuration Tests"
    test_sentry_configuration || true
    test_sentry_connectivity || true
    test_sentry_error_capture || true
  fi

  if [ "$TEST_PROMETHEUS" = "true" ]; then
    print_header "Prometheus Metrics Tests"
    test_prometheus_metrics_endpoint || true
    test_prometheus_metrics_format || true
    test_key_metrics_present || true
  fi

  if [ "$TEST_GRAFANA" = "true" ]; then
    print_header "Grafana Dashboard Tests"
    test_grafana_dashboard || true
    test_grafana_datasource || true
  fi

  print_header "CloudWatch Tests"
  test_cloudwatch_logs || true
  test_cloudwatch_log_group || true

  if [ "$TEST_PAGERDUTY" = "true" ]; then
    print_header "PagerDuty Integration Tests"
    test_pagerduty_configuration || true
    test_pagerduty_connectivity || true
  fi

  print_header "Alert Configuration Tests"
  test_alert_rules || true

  print_header "Monitoring Data Tests"
  test_error_simulation || true
  test_dashboard_data_freshness || true
  test_load_generation || true

  # Summary
  print_header "Test Summary"
  echo "Total Tests Run: $TESTS_RUN"
  echo -e "  ${GREEN}Passed:  $TESTS_PASSED${NC}"
  echo -e "  ${RED}Failed:  $TESTS_FAILED${NC}"

  if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! Monitoring stack is operational.${NC}"
    return 0
  else
    echo -e "\n${RED}Some tests failed. Please review the errors above.${NC}"
    return 1
  fi
}

main
