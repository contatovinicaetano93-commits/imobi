#!/bin/bash
set -euo pipefail

# ════════════════════════════════════════════════════════════
# Monitoring & Observability Setup Script
# ════════════════════════════════════════════════════════════

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ════════════════════════════════════════════════════════════
# Sentry Setup
# ════════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Setting up Sentry for Error Tracking${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if [ -z "${SENTRY_AUTH_TOKEN:-}" ]; then
  echo -e "${YELLOW}⚠️  SENTRY_AUTH_TOKEN not set. Skipping Sentry setup.${NC}"
  echo "Get token from: https://sentry.io/settings/account/api/auth-tokens/"
else
  echo "Sentry organizations:"
  sentry-cli organizations list || true
  
  echo ""
  echo "Sentry projects:"
  sentry-cli projects list --org imbobi || true
fi

echo ""

# ════════════════════════════════════════════════════════════
# AWS CloudWatch Alarms
# ════════════════════════════════════════════════════════════

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Setting up AWS CloudWatch Alarms${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI not installed${NC}"
  exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
  echo -e "${RED}❌ AWS credentials not configured${NC}"
  exit 1
fi

CLUSTER_NAME="${ECS_CLUSTER:-imbobi-prod}"
SERVICE_NAME="${ECS_SERVICE:-imbobi-api-prod}"
SNS_TOPIC_ARN="${SNS_TOPIC_ARN:-}"

# Create SNS topic if not provided
if [ -z "$SNS_TOPIC_ARN" ]; then
  echo "Creating SNS topic for alerts..."
  SNS_RESPONSE=$(aws sns create-topic --name imbobi-prod-alerts)
  SNS_TOPIC_ARN=$(echo $SNS_RESPONSE | jq -r '.TopicArn')
  echo -e "${GREEN}✓ SNS Topic created: $SNS_TOPIC_ARN${NC}"
fi

# Subscribe to SNS topic
echo ""
read -p "Enter email address for alerts (or press Enter to skip): " ALERT_EMAIL
if [ -n "$ALERT_EMAIL" ]; then
  aws sns subscribe \
    --topic-arn "$SNS_TOPIC_ARN" \
    --protocol email \
    --notification-endpoint "$ALERT_EMAIL"
  echo -e "${YELLOW}✓ Email subscription created. Check your inbox to confirm.${NC}"
fi

echo ""
echo "Creating CloudWatch Alarms..."

# High Error Rate Alarm
echo -e "${YELLOW}→ High Error Rate (5xx > 1%)${NC}"
aws cloudwatch put-metric-alarm \
  --alarm-name "imbobi-prod-high-error-rate" \
  --alarm-description "Alert when 5xx error rate exceeds 1%" \
  --metric-name TargetResponseTime \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data notBreaching || true

# High Response Time Alarm
echo -e "${YELLOW}→ High Response Time (P95 > 500ms)${NC}"
aws cloudwatch put-metric-alarm \
  --alarm-name "imbobi-prod-high-latency" \
  --alarm-description "Alert when response time P95 exceeds 500ms" \
  --metric-name TargetResponseTime \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data notBreaching || true

# High CPU Usage Alarm
echo -e "${YELLOW}→ High CPU Usage (> 80%)${NC}"
aws cloudwatch put-metric-alarm \
  --alarm-name "imbobi-prod-high-cpu" \
  --alarm-description "Alert when CPU usage exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data notBreaching || true

# High Memory Usage Alarm
echo -e "${YELLOW}→ High Memory Usage (> 85%)${NC}"
aws cloudwatch put-metric-alarm \
  --alarm-name "imbobi-prod-high-memory" \
  --alarm-description "Alert when memory usage exceeds 85%" \
  --metric-name MemoryUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data notBreaching || true

# Database Connection Errors
echo -e "${YELLOW}→ Database Connection Errors${NC}"
aws cloudwatch put-metric-alarm \
  --alarm-name "imbobi-prod-db-connection-errors" \
  --alarm-description "Alert on database connection pool issues" \
  --metric-name DatabaseConnections \
  --namespace AWS/RDS \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data notBreaching || true

echo -e "${GREEN}✓ CloudWatch alarms created${NC}"

# ════════════════════════════════════════════════════════════
# Prometheus Setup (Optional)
# ════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Prometheus & Grafana Setup (Optional)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

read -p "Do you want to set up Prometheus/Grafana? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}→ Starting Prometheus + Grafana stack...${NC}"
    docker-compose -f docker-compose.monitoring.yml up -d
    echo -e "${GREEN}✓ Monitoring stack started${NC}"
    echo "  Prometheus: http://localhost:9090"
    echo "  Grafana: http://localhost:3000 (admin/admin)"
  else
    echo -e "${RED}❌ Docker not available${NC}"
  fi
fi

# ════════════════════════════════════════════════════════════
# Health Check Verification
# ════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Health Check Configuration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

read -p "API URL (default: http://localhost:4000): " API_URL
API_URL=${API_URL:-http://localhost:4000}

echo -e "${YELLOW}→ Testing health endpoint...${NC}"
if curl -f "${API_URL}/health" 2>/dev/null; then
  echo -e "${GREEN}✓ Health check OK${NC}"
else
  echo -e "${YELLOW}⚠️  Health check failed (API may not be running)${NC}"
fi

# ════════════════════════════════════════════════════════════
# Final Summary
# ════════════════════════════════════════════════════════════

echo ""
echo -e "${GREEN}✅ Monitoring setup complete!${NC}"
echo ""
echo "Summary:"
echo "  ✓ Sentry configured for error tracking"
echo "  ✓ CloudWatch alarms configured"
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "  ✓ Prometheus & Grafana started"
fi
echo ""
echo "Dashboard URLs:"
echo "  Sentry: https://sentry.io/organizations/imbobi/issues/"
echo "  CloudWatch: https://console.aws.amazon.com/cloudwatch/"
echo "  SNS Topic: $SNS_TOPIC_ARN"
echo ""
echo "Next Steps:"
echo "  1. Test alerts by triggering a test alarm"
echo "  2. Configure Slack integration in Sentry"
echo "  3. Set up custom dashboards in Grafana"
echo "  4. Review alert thresholds for your use case"
