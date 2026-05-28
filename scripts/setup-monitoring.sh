#!/bin/bash

# Alagami Monitoring Setup Script
# This script helps setup Sentry error tracking and Prometheus metrics monitoring
# Usage: bash scripts/setup-monitoring.sh

set -e

echo "=========================================="
echo "Alagami Monitoring Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo -e "${RED}Error: Node.js is not installed${NC}"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  echo -e "${RED}Error: pnpm is not installed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Step 1: Sentry Setup
echo "=========================================="
echo "Step 1: Sentry Configuration"
echo "=========================================="
echo ""

read -p "Do you have a Sentry account? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  read -p "Enter your Sentry DSN for backend: " SENTRY_DSN
  read -p "Enter your Sentry DSN for frontend (NEXT_PUBLIC_): " NEXT_PUBLIC_SENTRY_DSN

  # Validate DSN format
  if [[ $SENTRY_DSN == https://\*@\*ingest.sentry.io/* ]]; then
    echo -e "${GREEN}✓ Sentry DSN format OK${NC}"
  else
    echo -e "${YELLOW}⚠ Warning: Sentry DSN format may be incorrect${NC}"
  fi

  # Update .env
  if [ -f .env ]; then
    # Update existing DSN or add it
    if grep -q "^SENTRY_DSN=" .env; then
      sed -i.bak "s|^SENTRY_DSN=.*|SENTRY_DSN=$SENTRY_DSN|" .env
    else
      echo "SENTRY_DSN=$SENTRY_DSN" >> .env
    fi

    if grep -q "^NEXT_PUBLIC_SENTRY_DSN=" .env; then
      sed -i.bak "s|^NEXT_PUBLIC_SENTRY_DSN=.*|NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN|" .env
    else
      echo "NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN" >> .env
    fi

    echo -e "${GREEN}✓ Environment variables updated${NC}"
  else
    echo -e "${YELLOW}⚠ .env file not found, please add manually${NC}"
    echo "SENTRY_DSN=$SENTRY_DSN"
    echo "NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN"
  fi
else
  echo "Please create a Sentry project at https://sentry.io"
  echo "Then run this script again"
  exit 0
fi

echo ""
echo "=========================================="
echo "Step 2: Install Dependencies"
echo "=========================================="
echo ""

echo "Installing backend dependencies..."
cd services/api
pnpm add @sentry/node @sentry/integrations @nestjs/terminus prom-client 2>/dev/null || true
cd ../..

echo "Installing frontend dependencies..."
cd apps/web
pnpm add @sentry/react @sentry/nextjs 2>/dev/null || true
cd ../..

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Prometheus Setup
echo "=========================================="
echo "Step 3: Prometheus Configuration"
echo "=========================================="
echo ""

read -p "Do you want to setup Prometheus? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  read -p "Enter API port (default: 4000): " API_PORT
  API_PORT=${API_PORT:-4000}

  # Create prometheus.yml
  cat > prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    environment: 'development'
    service: 'imbobi'

scrape_configs:
  - job_name: 'imbobi-api'
    static_configs:
      - targets: ['localhost:$API_PORT']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 10s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - localhost:9093

rule_files:
  - 'prometheus-alerts.yml'
EOF

  echo -e "${GREEN}✓ prometheus.yml created${NC}"

  # Create alerting rules
  cat > prometheus-alerts.yml << 'EOF'
groups:
  - name: imbobi_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected on {{ $labels.route }}"
          description: "Error rate is {{ $value | humanizePercentage }} in the last 5m"

      - alert: SlowHttpRequests
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1.0
        for: 5m
        annotations:
          summary: "Slow HTTP requests detected"
          description: "95th percentile latency is {{ $value }}s for {{ $labels.route }}"

      - alert: DatabaseQueryLatency
        expr: histogram_quantile(0.95, db_query_duration_seconds_bucket) > 0.5
        for: 5m
        annotations:
          summary: "High database query latency on {{ $labels.table }}"
          description: "95th percentile latency is {{ $value }}s"

      - alert: CacheMissRate
        expr: |
          (
            rate(cache_misses_total[5m]) /
            (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
          ) > 0.5
        for: 5m
        annotations:
          summary: "High cache miss rate"
          description: "Cache miss rate is {{ $value | humanizePercentage }}"

      - alert: HighRedisLatency
        expr: histogram_quantile(0.95, redis_operation_duration_seconds_bucket) > 0.1
        for: 5m
        annotations:
          summary: "High Redis operation latency"
          description: "95th percentile latency is {{ $value }}s for {{ $labels.operation }}"

      - alert: APIDown
        expr: up{job="imbobi-api"} == 0
        for: 2m
        annotations:
          summary: "Imbobi API is down"
          description: "API endpoint is not responding"
EOF

  echo -e "${GREEN}✓ prometheus-alerts.yml created${NC}"

  echo ""
  echo "To run Prometheus with Docker:"
  echo "  docker run -d --name prometheus -p 9090:9090 \\"
  echo "    -v \$(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \\"
  echo "    -v \$(pwd)/prometheus-alerts.yml:/etc/prometheus/prometheus-alerts.yml \\"
  echo "    prom/prometheus"
  echo ""
  echo "Access at: http://localhost:9090"
else
  echo "Skipping Prometheus setup"
fi

echo ""

# Step 4: Verify Installation
echo "=========================================="
echo "Step 4: Verification"
echo "=========================================="
echo ""

echo "Checking installations..."

if [ -f services/api/node_modules/@sentry/node/package.json ]; then
  echo -e "${GREEN}✓ Sentry Node installed${NC}"
else
  echo -e "${RED}✗ Sentry Node not installed${NC}"
fi

if [ -f services/api/node_modules/@nestjs/terminus/package.json ]; then
  echo -e "${GREEN}✓ NestJS Terminus installed${NC}"
else
  echo -e "${RED}✗ NestJS Terminus not installed${NC}"
fi

if [ -f services/api/node_modules/prom-client/package.json ]; then
  echo -e "${GREEN}✓ Prometheus client installed${NC}"
else
  echo -e "${RED}✗ Prometheus client not installed${NC}"
fi

if [ -f apps/web/node_modules/@sentry/react/package.json ]; then
  echo -e "${GREEN}✓ Sentry React installed${NC}"
else
  echo -e "${RED}✗ Sentry React not installed${NC}"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start the application:"
echo "   pnpm dev"
echo ""
echo "2. Verify Sentry is working:"
echo "   curl http://localhost:4000/api/v1/health"
echo ""
echo "3. View metrics:"
echo "   curl http://localhost:4000/api/v1/metrics"
echo ""
echo "4. Check health:"
echo "   curl http://localhost:4000/api/v1/health"
echo ""
echo "5. Access Sentry dashboard:"
echo "   https://sentry.io/organizations/[your-org]/issues"
echo ""
echo "For more information, see MONITORING_SETUP.md"
echo ""
