#!/bin/bash

################################################################################
# Load Testing Suite — imbobi Staging
#
# Runs multiple load scenarios to validate API performance:
# - Light: 10 concurrent, 100 requests
# - Medium: 50 concurrent, 500 requests
# - Heavy: 200 concurrent, 1000 requests
# - Spike: 500 concurrent, 100 requests
# - Sustained: 100 concurrent, 5 minutes (300 sec)
#
# Usage: bash run-load-tests.sh <API_URL> [--skip-spike]
# Example: bash run-load-tests.sh https://api-staging.imobi.com
################################################################################

set -e

API_URL="${1:-http://localhost:4000}"
SKIP_SPIKE="${2:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Results directory
RESULTS_DIR="load-test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

log_section() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

log_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
}

log_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
}

log_warn() {
  echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

# Check prerequisites
log_section "Pre-flight Checks"

if ! command -v ab &> /dev/null; then
  log_fail "Apache Bench (ab) not installed"
  echo "Install: brew install httpd (macOS) or apt-get install apache2-utils (Linux)"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  log_warn "jq not installed (results parsing will be limited)"
  echo "Install: brew install jq (macOS) or apt-get install jq (Linux)"
fi

# Test API connectivity
echo "Testing API connectivity at $API_URL/api/v1/health..."
if curl -s -f "$API_URL/api/v1/health" > /dev/null 2>&1; then
  log_pass "API is responding"
else
  log_fail "API not responding at $API_URL"
  exit 1
fi

# Test health endpoint response
HEALTH=$(curl -s "$API_URL/api/v1/health")
echo "Health response: $HEALTH"

################################################################################
# SCENARIO 1: Light Load
################################################################################

log_section "Scenario 1: Light Load (Baseline)"
echo "Configuration: 10 concurrent users, 100 total requests"
echo "Expected: <100ms p50, 0% errors, >100 req/sec"
echo ""

ab -n 100 -c 10 -q -g "$RESULTS_DIR/light-load.tsv" \
  "$API_URL/api/v1/health" > "$RESULTS_DIR/light-load.txt" 2>&1

# Parse results
if grep -q "100 requests completed successfully" "$RESULTS_DIR/light-load.txt"; then
  log_pass "Light load test completed successfully"

  # Extract key metrics
  REQUESTS_PER_SEC=$(grep "Requests per second" "$RESULTS_DIR/light-load.txt" | awk '{print $4}')
  TIME_PER_REQUEST=$(grep "Time per request.*mean" "$RESULTS_DIR/light-load.txt" | awk '{print $4}')

  echo "  Requests/sec: $REQUESTS_PER_SEC"
  echo "  Mean response time: ${TIME_PER_REQUEST}ms"

  if (( $(echo "$REQUESTS_PER_SEC > 100" | bc -l) )); then
    log_pass "Throughput exceeds baseline (>100 req/sec)"
  else
    log_warn "Throughput below optimal (<100 req/sec): $REQUESTS_PER_SEC"
  fi
else
  log_fail "Light load test had failures"
  grep "Failed requests" "$RESULTS_DIR/light-load.txt"
fi

################################################################################
# SCENARIO 2: Medium Load
################################################################################

log_section "Scenario 2: Medium Load (Typical Peak)"
echo "Configuration: 50 concurrent users, 500 total requests"
echo "Expected: <200ms p50, <0.5% errors, >40 req/sec"
echo ""

ab -n 500 -c 50 -q -g "$RESULTS_DIR/medium-load.tsv" \
  "$API_URL/api/v1/health" > "$RESULTS_DIR/medium-load.txt" 2>&1

if grep -q "500 requests completed" "$RESULTS_DIR/medium-load.txt"; then
  log_pass "Medium load test completed"

  REQUESTS_PER_SEC=$(grep "Requests per second" "$RESULTS_DIR/medium-load.txt" | awk '{print $4}')
  TIME_PER_REQUEST=$(grep "Time per request.*mean" "$RESULTS_DIR/medium-load.txt" | awk '{print $4}')
  FAILED=$(grep "Failed requests:" "$RESULTS_DIR/medium-load.txt" | awk '{print $3}' || echo "0")

  echo "  Requests/sec: $REQUESTS_PER_SEC"
  echo "  Mean response time: ${TIME_PER_REQUEST}ms"
  echo "  Failed requests: $FAILED"

  if [ "$FAILED" = "0" ]; then
    log_pass "Zero failures under medium load"
  else
    FAIL_RATE=$(echo "scale=2; $FAILED / 500 * 100" | bc -l)
    if (( $(echo "$FAIL_RATE < 0.5" | bc -l) )); then
      log_pass "Failure rate acceptable: ${FAIL_RATE}%"
    else
      log_warn "Elevated failure rate: ${FAIL_RATE}%"
    fi
  fi
else
  log_fail "Medium load test incomplete"
fi

################################################################################
# SCENARIO 3: Heavy Load
################################################################################

log_section "Scenario 3: Heavy Load (Stress Test)"
echo "Configuration: 200 concurrent users, 1000 total requests"
echo "Expected: 500-2000ms p50, <5% errors, graceful degradation"
echo ""

ab -n 1000 -c 200 -q -g "$RESULTS_DIR/heavy-load.tsv" \
  "$API_URL/api/v1/health" > "$RESULTS_DIR/heavy-load.txt" 2>&1

COMPLETED=$(grep "requests completed" "$RESULTS_DIR/heavy-load.txt" | grep -o "[0-9]*" | head -1)
FAILED=$(grep "Failed requests:" "$RESULTS_DIR/heavy-load.txt" | awk '{print $3}' || echo "0")

if [ ! -z "$COMPLETED" ] && [ "$COMPLETED" -gt "0" ]; then
  COMPLETION_RATE=$(echo "scale=1; $COMPLETED / 1000 * 100" | bc -l)
  log_pass "Heavy load test: ${COMPLETION_RATE}% completion ($COMPLETED/1000 requests)"

  REQUESTS_PER_SEC=$(grep "Requests per second" "$RESULTS_DIR/heavy-load.txt" | awk '{print $4}')
  TIME_PER_REQUEST=$(grep "Time per request.*mean" "$RESULTS_DIR/heavy-load.txt" | awk '{print $4}')

  echo "  Requests/sec: $REQUESTS_PER_SEC"
  echo "  Mean response time: ${TIME_PER_REQUEST}ms"
  echo "  Failed requests: $FAILED"

  if [ "$FAILED" = "0" ]; then
    log_pass "No failures even under heavy load"
  else
    FAIL_RATE=$(echo "scale=2; $FAILED / $COMPLETED * 100" | bc -l)
    if (( $(echo "$FAIL_RATE < 5" | bc -l) )); then
      log_pass "Heavy load failure rate acceptable: ${FAIL_RATE}%"
    else
      log_warn "Elevated failure rate: ${FAIL_RATE}% (consider scaling)"
    fi
  fi
else
  log_warn "Heavy load test had significant failures"
  grep "Failed requests" "$RESULTS_DIR/heavy-load.txt" || true
fi

################################################################################
# SCENARIO 4: Spike Test
################################################################################

if [ "$SKIP_SPIKE" = "--skip-spike" ]; then
  log_section "Scenario 4: Spike Test (SKIPPED)"
  echo "Use --skip-spike flag to skip this test"
else
  log_section "Scenario 4: Spike Test (Traffic Burst)"
  echo "Configuration: 500 concurrent users, 100 total requests (30 seconds)"
  echo "Expected: Graceful degradation, <15% errors acceptable, no crashes"
  echo ""

  ab -n 100 -c 500 -q -g "$RESULTS_DIR/spike-load.tsv" \
    "$API_URL/api/v1/health" > "$RESULTS_DIR/spike-load.txt" 2>&1

  COMPLETED=$(grep "requests completed" "$RESULTS_DIR/spike-load.txt" | grep -o "[0-9]*" | head -1)
  FAILED=$(grep "Failed requests:" "$RESULTS_DIR/spike-load.txt" | awk '{print $3}' || echo "0")

  if [ ! -z "$COMPLETED" ] && [ "$COMPLETED" -gt "0" ]; then
    COMPLETION_RATE=$(echo "scale=1; $COMPLETED / 100 * 100" | bc -l)
    log_pass "Spike test: ${COMPLETION_RATE}% completion ($COMPLETED/100 requests)"

    FAIL_RATE=$(echo "scale=2; $FAILED / $COMPLETED * 100" | bc -l)
    echo "  Failed requests: $FAILED (${FAIL_RATE}%)"

    if (( $(echo "$FAIL_RATE <= 15" | bc -l) )); then
      log_pass "Spike handled with acceptable degradation"
    else
      log_warn "High spike failure rate: ${FAIL_RATE}% (consider circuit breaker)"
    fi
  else
    log_warn "Spike test mostly failed (may indicate cascading failures)"
  fi
fi

################################################################################
# SCENARIO 5: Sustained Load
################################################################################

log_section "Scenario 5: Sustained Load (Endurance Test)"
echo "Configuration: 100 concurrent users, 5 iterations (300 seconds total)"
echo "Expected: <300ms p50, <1% errors, stable CPU/memory"
echo ""

for i in {1..5}; do
  echo "Minute $i / 5..."
  ab -n 100 -c 10 -q -g "$RESULTS_DIR/sustained-load-m${i}.tsv" \
    "$API_URL/api/v1/health" > "$RESULTS_DIR/sustained-load-m${i}.txt" 2>&1

  if grep -q "100 requests completed" "$RESULTS_DIR/sustained-load-m${i}.txt"; then
    REQUESTS_PER_SEC=$(grep "Requests per second" "$RESULTS_DIR/sustained-load-m${i}.txt" | awk '{print $4}')
    echo "  Minute $i: $REQUESTS_PER_SEC req/sec"
  fi

  [ $i -lt 5 ] && sleep 30  # Wait before next iteration
done

log_pass "Sustained load test completed"
echo "  Check for memory leaks: Monitor server logs for OOM errors"
echo "  Check for connection exhaustion: Review connection pool stats"

################################################################################
# Summary Report
################################################################################

log_section "Load Testing Summary"

echo "Results saved to: $RESULTS_DIR/"
echo ""
echo "Test Results:"
echo "  Light load:    $(grep -q '100 requests completed' "$RESULTS_DIR/light-load.txt" && echo '✓' || echo '✗')"
echo "  Medium load:   $(grep -q '500 requests completed' "$RESULTS_DIR/medium-load.txt" && echo '✓' || echo '✗')"
echo "  Heavy load:    $([ -f "$RESULTS_DIR/heavy-load.txt" ] && echo '✓' || echo '✗')"
[ "$SKIP_SPIKE" != "--skip-spike" ] && echo "  Spike test:    $([ -f "$RESULTS_DIR/spike-load.txt" ] && echo '✓' || echo '✗')"
echo "  Sustained:     $([ -f "$RESULTS_DIR/sustained-load-m5.txt" ] && echo '✓' || echo '✗')"
echo ""

echo "Detailed Results:"
echo "  - light-load.txt / .tsv"
echo "  - medium-load.txt / .tsv"
echo "  - heavy-load.txt / .tsv"
[ "$SKIP_SPIKE" != "--skip-spike" ] && echo "  - spike-load.txt / .tsv"
echo "  - sustained-load-m*.txt / .tsv"
echo ""

echo "Next Steps:"
echo "  1. Review detailed results in $RESULTS_DIR/"
echo "  2. Run 'bash analyze-load-tests.sh $RESULTS_DIR' for HTML report"
echo "  3. Check server logs for errors or warnings during test"
echo "  4. Identify bottlenecks and plan optimizations"
echo "  5. Document performance baselines for production sizing"
echo ""

log_pass "Load testing suite completed"

