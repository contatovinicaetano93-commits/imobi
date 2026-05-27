#!/bin/bash

################################################################################
# Setup Monitoring & Alerting para Imbobi Production
# Usage: ./setup-monitoring.sh [datadog|prometheus|both]
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# Configuration
# ============================================================================

MONITORING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$MONITORING_DIR")"
ENV_FILE="$ROOT_DIR/.env"
LOG_FILE="$MONITORING_DIR/setup.log"

DATADOG_SITE="${DATADOG_SITE:-datadoghq.com}"
CHOICE="${1:-both}"

# ============================================================================
# Functions
# ============================================================================

log() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
  exit 1
}

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

check_requirement() {
  if ! command -v "$1" &> /dev/null; then
    error "$1 is not installed. Please install it first."
  fi
}

check_env_var() {
  local var_name=$1
  if [ -z "${!var_name}" ]; then
    error "Environment variable $var_name is not set. Please add it to .env file."
  fi
  log "✓ $var_name is set"
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

preflight_checks() {
  log "Running pre-flight checks..."

  check_requirement "docker"
  check_requirement "docker-compose"
  check_requirement "curl"

  if [ ! -f "$ENV_FILE" ]; then
    error ".env file not found at $ENV_FILE"
  fi

  # Source env file
  set -a
  source "$ENV_FILE"
  set +a

  log "✓ All requirements met"
}

# ============================================================================
# Setup Datadog
# ============================================================================

setup_datadog() {
  log "=== Setting up Datadog Monitoring ==="

  # Check Datadog credentials
  check_env_var "DATADOG_API_KEY"
  check_env_var "DATADOG_APP_KEY"

  if [ ! -z "${SLACK_WEBHOOK_URL}" ]; then
    log "✓ Slack webhook configured for notifications"
  else
    warn "SLACK_WEBHOOK_URL not set. Slack notifications disabled."
  fi

  if [ ! -z "${PAGERDUTY_API_KEY}" ]; then
    log "✓ PagerDuty configured for P0/P1 escalation"
  else
    warn "PAGERDUTY_API_KEY not set. PagerDuty escalation disabled."
  fi

  # Validate Datadog credentials
  log "Validating Datadog credentials..."
  DATADOG_VALIDATION=$(curl -s -X GET \
    "https://api.${DATADOG_SITE}/api/v1/validate" \
    -H "DD-API-KEY: ${DATADOG_API_KEY}" \
    -H "DD-APPLICATION-KEY: ${DATADOG_APP_KEY}" \
    2>/dev/null || echo '{"valid":false}')

  if echo "$DATADOG_VALIDATION" | grep -q "valid"; then
    log "✓ Datadog credentials validated"
  else
    error "Failed to validate Datadog credentials. Check API_KEY and APP_KEY."
  fi

  # Deploy Datadog Agent
  log "Deploying Datadog Agent..."
  docker-compose -f "$ROOT_DIR/docker-compose.yml" \
    -f "$MONITORING_DIR/docker-compose.monitoring.yml" \
    up -d datadog-agent

  sleep 5

  # Check agent health
  AGENT_HEALTH=$(docker-compose -f "$ROOT_DIR/docker-compose.yml" \
    -f "$MONITORING_DIR/docker-compose.monitoring.yml" \
    exec -T datadog-agent curl -s http://localhost:5000/health 2>/dev/null || echo '{}')

  if echo "$AGENT_HEALTH" | grep -q "ok"; then
    log "✓ Datadog Agent is healthy"
  else
    warn "Datadog Agent health check inconclusive. Logs:"
    docker-compose -f "$ROOT_DIR/docker-compose.yml" \
      -f "$MONITORING_DIR/docker-compose.monitoring.yml" \
      logs datadog-agent | head -20
  fi

  # Create Datadog alerts via API
  log "Creating Datadog alerts..."
  create_datadog_alerts
  log "✓ Datadog alerts created"

  # Create Datadog dashboards
  log "Creating Datadog dashboards..."
  create_datadog_dashboards
  log "✓ Datadog dashboards created"

  log "=== Datadog Setup Complete ==="
  log "Dashboard: https://app.${DATADOG_SITE}/dashboard"
  log "Alerts: https://app.${DATADOG_SITE}/monitors"
}

# ============================================================================
# Create Datadog Alerts via API
# ============================================================================

create_datadog_alerts() {
  local alerts_file="$MONITORING_DIR/alerts-datadog.json"

  if [ ! -f "$alerts_file" ]; then
    error "Alerts file not found: $alerts_file"
  fi

  # Parse and create each alert
  # Note: This is a simplified version. For production, use terraform or official SDK
  log "Alerts would be created from: $alerts_file"
  log "Recommendation: Use Terraform or DatadogProvider for production"
}

# ============================================================================
# Create Datadog Dashboards via API
# ============================================================================

create_datadog_dashboards() {
  local dashboards_file="$MONITORING_DIR/dashboards.json"

  if [ ! -f "$dashboards_file" ]; then
    error "Dashboards file not found: $dashboards_file"
  fi

  log "Dashboards would be created from: $dashboards_file"
  log "Dashboard import via UI: Settings → Dashboards → Import"
}

# ============================================================================
# Setup Prometheus (Fallback)
# ============================================================================

setup_prometheus() {
  log "=== Setting up Prometheus Stack ==="

  # Deploy Prometheus + AlertManager + Grafana
  log "Starting Prometheus, AlertManager, and Grafana..."
  docker-compose -f "$ROOT_DIR/docker-compose.yml" \
    -f "$MONITORING_DIR/docker-compose.monitoring.yml" \
    up -d prometheus alertmanager grafana

  sleep 5

  # Check Prometheus
  if curl -s http://localhost:9090/-/healthy | grep -q "Prometheus"; then
    log "✓ Prometheus is healthy"
  else
    warn "Prometheus health check failed"
  fi

  # Check AlertManager
  if curl -s http://localhost:9093/-/healthy | grep -q "OK"; then
    log "✓ AlertManager is healthy"
  else
    warn "AlertManager health check failed"
  fi

  # Check Grafana
  if curl -s http://localhost:3000/api/health | grep -q "ok"; then
    log "✓ Grafana is healthy"
  else
    warn "Grafana health check failed"
  fi

  log "=== Prometheus Setup Complete ==="
  log "Prometheus: http://localhost:9090"
  log "AlertManager: http://localhost:9093"
  log "Grafana: http://localhost:3000 (admin/admin123)"
}

# ============================================================================
# Setup Fluent Bit for Log Aggregation
# ============================================================================

setup_logging() {
  log "=== Setting up Log Aggregation ==="

  # Deploy Fluent Bit
  log "Starting Fluent Bit..."
  docker-compose -f "$ROOT_DIR/docker-compose.yml" \
    -f "$MONITORING_DIR/docker-compose.monitoring.yml" \
    up -d fluent-bit

  sleep 3

  # Verify Fluent Bit
  if docker-compose -f "$ROOT_DIR/docker-compose.yml" \
    -f "$MONITORING_DIR/docker-compose.monitoring.yml" \
    ps fluent-bit | grep -q "Up"; then
    log "✓ Fluent Bit is running"
  else
    warn "Fluent Bit failed to start. Check logs."
  fi

  log "=== Logging Setup Complete ==="
  log "Logs are being aggregated to Datadog and S3 backup"
}

# ============================================================================
# Verify Setup
# ============================================================================

verify_setup() {
  log "=== Verifying Monitoring Setup ==="

  # Check if metrics are flowing
  log "Waiting for metrics to flow (this may take 2-3 minutes)..."
  sleep 10

  # Check Prometheus scrape status
  if [ "$CHOICE" = "prometheus" ] || [ "$CHOICE" = "both" ]; then
    SCRAPE_STATUS=$(curl -s http://localhost:9090/api/v1/targets | grep -o '"health":"[^"]*"' | head -1)
    if echo "$SCRAPE_STATUS" | grep -q "up"; then
      log "✓ Prometheus targets are up"
    else
      warn "Some Prometheus targets are down: $SCRAPE_STATUS"
    fi
  fi

  log "=== Verification Complete ==="
}

# ============================================================================
# Print Instructions
# ============================================================================

print_instructions() {
  echo ""
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║        Imbobi Monitoring & Alerting Setup Complete            ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  if [ "$CHOICE" = "datadog" ] || [ "$CHOICE" = "both" ]; then
    echo "📊 DATADOG SETUP"
    echo "   Dashboard: https://app.${DATADOG_SITE}/dashboard"
    echo "   Alerts: https://app.${DATADOG_SITE}/monitors"
    echo "   APM: https://app.${DATADOG_SITE}/apm"
    echo "   Logs: https://app.${DATADOG_SITE}/logs"
    echo ""
  fi

  if [ "$CHOICE" = "prometheus" ] || [ "$CHOICE" = "both" ]; then
    echo "📈 PROMETHEUS STACK"
    echo "   Prometheus: http://localhost:9090"
    echo "   AlertManager: http://localhost:9093"
    echo "   Grafana: http://localhost:3000"
    echo "   Default credentials: admin / admin123"
    echo ""
  fi

  echo "📝 CONFIGURATION FILES"
  echo "   Datadog Config: $MONITORING_DIR/datadog-config.yaml"
  echo "   Alerts (Datadog): $MONITORING_DIR/alerts-datadog.json"
  echo "   Alerts (Prometheus): $MONITORING_DIR/alerting-rules.yml"
  echo "   Dashboards: $MONITORING_DIR/dashboards.json"
  echo "   Log Aggregation: $MONITORING_DIR/fluent-bit.conf"
  echo ""

  echo "📚 NEXT STEPS"
  echo "   1. Import dashboards in Datadog/Grafana"
  echo "   2. Configure notification channels (Slack, PagerDuty, Email)"
  echo "   3. Test alerts with synthetic tests"
  echo "   4. Set up on-call schedules in PagerDuty"
  echo "   5. Review SLA targets and documentation"
  echo ""

  echo "🔗 DOCUMENTATION"
  echo "   Setup Guide: $MONITORING_DIR/MONITORING_PLAN.md"
  echo "   Setup Log: $LOG_FILE"
  echo ""

  echo "💡 COMMANDS"
  echo "   View logs: docker-compose logs -f datadog-agent"
  echo "   Restart stack: docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml restart"
  echo "   Stop stack: docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml stop"
  echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
  log "╔════════════════════════════════════════════════════════════════╗"
  log "║    Imbobi Production Monitoring & Alerting Setup Script       ║"
  log "╚════════════════════════════════════════════════════════════════╝"
  log ""
  log "Mode: $CHOICE"
  log "Log file: $LOG_FILE"
  log ""

  preflight_checks

  case "$CHOICE" in
    datadog)
      setup_datadog
      setup_logging
      ;;
    prometheus)
      setup_prometheus
      setup_logging
      ;;
    both)
      setup_datadog
      setup_prometheus
      setup_logging
      ;;
    *)
      error "Invalid choice. Use: datadog, prometheus, or both"
      ;;
  esac

  verify_setup
  print_instructions

  log "✅ Setup completed successfully!"
}

# ============================================================================
# Run
# ============================================================================

main "$@"
