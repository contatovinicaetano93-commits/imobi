# Production Monitoring Setup Guide

**Status**: MVP Fintech Production Monitoring  
**Date**: June 2026  
**Owner**: DevOps / Platform Team

---

## Overview

This guide provides step-by-step instructions to set up comprehensive monitoring for the Imobi API in production. The setup includes:

- **Sentry**: Error tracking and performance monitoring
- **Prometheus**: Metrics collection
- **Grafana**: Dashboard visualization
- **CloudWatch**: Log aggregation
- **PagerDuty**: Alerting and on-call management

---

## Prerequisites

Before starting, ensure you have:

- [ ] API deployed to Railway or similar platform
- [ ] Database (PostgreSQL) with connection string
- [ ] Redis cache accessible
- [ ] AWS account (for CloudWatch)
- [ ] Sentry account (https://sentry.io)
- [ ] Grafana account (https://grafana.com)
- [ ] PagerDuty account (https://pagerduty.com)
- [ ] Access to deployment platform (Railway, Render, etc.)

---

## Phase 1: Sentry Setup (Error Tracking)

### Step 1: Create Sentry Project

1. Go to https://sentry.io
2. Sign in or create account
3. Click "Create Project"
4. Select **Node.js** platform
5. Name project: `imobi-api-prod`
6. Copy the **DSN** (looks like: `https://xxx@xxx.ingest.sentry.io/123456`)

### Step 2: Configure Environment Variables

Add to your deployment platform (Railway, Render, Vercel):

```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/123456
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_SERVER_NAME=imobi-api-prod
```

### Step 3: Test Sentry Integration

```bash
# Local test
NODE_ENV=production npm run dev

# Trigger test error
curl http://localhost:4000/api/v1/test-sentry-error

# Check Sentry dashboard
# https://sentry.io/organizations/YOUR_ORG/issues/
```

### Step 4: Configure Sentry Alerts

**In Sentry UI:**

1. Go to Settings → Alerts
2. Create alert for "Error rate exceeds 1%"
   - Condition: Error rate
   - Value: > 1%
   - Window: 10 minutes
   - Action: Send to email

3. Create alert for "New Issue"
   - Every new error gets an alert
   - Send to Slack (if integrated)

### Step 5: Configure Sentry Release Tracking

```bash
# In your deployment script or CI/CD:
# Get Sentry CLI: npm install @sentry/cli --save-dev

# Create release
sentry-cli releases create "$VERSION"

# Associate commits
sentry-cli releases set-commits "$VERSION" --commit "repo/commit"

# Finalize
sentry-cli releases finalize "$VERSION"
```

**Verify in Sentry:**
- Go to Releases tab
- Should see your deployment versions
- Errors will show which version they occurred in

---

## Phase 2: Prometheus Setup (Metrics Collection)

### Step 1: Enable Prometheus in API

The API already exports metrics at `/api/v1/metrics` using prom-client.

**Verify metrics endpoint:**

```bash
curl http://localhost:4000/api/v1/metrics | head -20
```

Expected output:
```
# HELP process_cpu_usage_percent CPU usage percentage
# TYPE process_cpu_usage_percent gauge
process_cpu_usage_percent 35.2

# HELP nodejs_version_info Node.js version info
# TYPE nodejs_version_info gauge
nodejs_version_info{version="v20.9.0",major="20",minor="9",patch="0"} 1
```

### Step 2: Deploy Prometheus Server

**Option A: Standalone Prometheus (Recommended for production)**

Deploy Prometheus on a separate server:

```bash
# Using Docker Compose
cat > docker-compose.prometheus.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./config/prometheus-grafana.yml:/etc/prometheus/prometheus.yml
      - ./config/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    restart: unless-stopped

volumes:
  prometheus-data:
EOF

docker-compose -f docker-compose.prometheus.yml up -d
```

**Option B: Managed Prometheus (AWS, GCP)**

If using AWS:

1. Go to AWS CloudWatch → Container Insights
2. Enable Application Performance Monitoring
3. Connect to your ECS/Kubernetes cluster

### Step 3: Configure Prometheus Scraping

Update `config/prometheus-grafana.yml`:

```yaml
scrape_configs:
  - job_name: 'imobi-api'
    static_configs:
      - targets: ['api.imobi.com:4000']  # Change to your API URL
    metrics_path: '/api/v1/metrics'
    scrape_interval: 15s
```

### Step 4: Test Prometheus Scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Query a metric
curl 'http://localhost:9090/api/v1/query?query=up'
```

Expected response:
```json
{
  "status": "success",
  "data": {
    "resultType": "vector",
    "result": [
      {
        "metric": { "job": "imobi-api" },
        "value": [ 1234567890, "1" ]
      }
    ]
  }
}
```

### Step 5: Deploy Alert Rules

Copy alert rules to Prometheus:

```bash
# Copy alerts.yml to Prometheus config directory
cp config/alerts.yml /etc/prometheus/

# Reload Prometheus
curl -X POST http://localhost:9090/-/reload
```

---

## Phase 3: Grafana Setup (Dashboard Visualization)

### Step 1: Create Grafana Instance

**Option A: Grafana Cloud (Recommended)**

1. Go to https://grafana.com
2. Create free account
3. Create new organization: `imobi`
4. Generate API key (Settings → API Keys)
5. Copy Grafana URL: `https://imobi.grafana.com`

**Option B: Self-Hosted Grafana**

```bash
docker run -d \
  -p 3000:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  -v grafana-storage:/var/lib/grafana \
  grafana/grafana:latest
```

### Step 2: Add Prometheus Datasource

In Grafana:

1. Go to Configuration → Data Sources
2. Add Data Source
3. Select "Prometheus"
4. URL: `http://prometheus:9090` (or your Prometheus URL)
5. Save & Test

### Step 3: Import Dashboard

Create a Grafana dashboard with these panels:

**Dashboard: Imobi API - Production**

**Row 1: Overview**
```json
[
  {
    "title": "Status",
    "targets": [{"expr": "up{job=\"imobi-api\"}"}]
  },
  {
    "title": "Requests/sec",
    "targets": [{"expr": "rate(http_requests_total[5m])"}]
  },
  {
    "title": "Error Rate",
    "targets": [{"expr": "rate(http_requests_total{status=~\"5..\"}[5m])"}]
  }
]
```

**Row 2: Performance**
```json
[
  {
    "title": "P95 Latency (ms)",
    "targets": [{"expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"}]
  },
  {
    "title": "DB Connections",
    "targets": [{"expr": "database_connections_used"}]
  },
  {
    "title": "Redis Memory",
    "targets": [{"expr": "redis_memory_used_bytes / 1024 / 1024"}]
  }
]
```

### Step 4: Set Up Alerts in Grafana

1. Go to Alerting → Alert Rules
2. Create rule: "Error Rate High"
   - Query: `rate(http_requests_total{status=~"5.."}[5m]) > 0.01`
   - Condition: > 1%
   - For: 5 minutes
   - Send to: Email or webhook

### Step 5: Enable Notification Channels

1. Go to Alerting → Notification Channels
2. Add Email channel
3. Add Slack channel (if desired)
4. Test notification

**Grafana Dashboard URL**: `https://imobi.grafana.com/d/imobi-api-prod`

---

## Phase 4: CloudWatch Setup (Log Aggregation)

### Step 1: Create CloudWatch Log Group

```bash
# Using AWS CLI
aws logs create-log-group \
  --log-group-name /imobi/api/production \
  --region us-east-1

# Set retention to 30 days
aws logs put-retention-policy \
  --log-group-name /imobi/api/production \
  --retention-in-days 30 \
  --region us-east-1
```

### Step 2: Configure Log Streaming

**If using Railway:**

1. Go to Railway dashboard
2. Select API service
3. Go to Settings → Integrations
4. Add CloudWatch integration
5. Provide AWS credentials

**If using Docker/ECS:**

Create CloudWatch log driver config:

```json
{
  "logDriver": "awslogs",
  "options": {
    "awslogs-group": "/imobi/api/production",
    "awslogs-region": "us-east-1",
    "awslogs-stream-prefix": "ecs"
  }
}
```

### Step 3: Create CloudWatch Insights Queries

**Common queries:**

```
# Error logs last hour
fields @timestamp, @message
| filter @message like /ERROR/
| stats count() by bin(5m)

# Response time analysis
fields @duration
| stats avg(@duration), pct(@duration, 95) by bin(1m)

# User activity
fields userId, action
| stats count() by userId
| sort count() desc
| head 10

# Failed requests
fields @timestamp, statusCode, path
| filter statusCode >= 400
| stats count() by statusCode
```

### Step 4: Create CloudWatch Dashboard

1. Go to CloudWatch → Dashboards
2. Create dashboard: `imobi-api-prod`
3. Add widgets:
   - Log Insights query results
   - Metric graphs
   - Alarm status

---

## Phase 5: PagerDuty Setup (Alerting & On-Call)

### Step 1: Create PagerDuty Service

1. Go to https://pagerduty.com
2. Create account or sign in
3. Go to Services → New Service
4. Name: `Imobi API`
5. Escalation Policy: Select or create
6. Select integration: "Events API v2"
7. Copy **Integration Key**

### Step 2: Configure PagerDuty Environment Variables

Add to deployment platform:

```env
PAGERDUTY_INTEGRATION_KEY=xxx_integration_key_xxx
PAGERDUTY_SEND_DEV_ALERTS=false  # Don't page on dev errors
```

### Step 3: Create Escalation Policy

In PagerDuty:

1. Go to Escalation Policies
2. Create: `imobi-api-escalation`
3. Add levels:
   - Level 1 (immediate): On-call engineer
   - Level 2 (15 min): Backend team lead
   - Level 3 (30 min): VP Engineering

### Step 4: Create On-Call Schedule

1. Go to Schedules
2. Create: `imobi-api-oncall`
3. Set rotation:
   - Duration: 1 week
   - Start date: Next Monday
   - Add team members

### Step 5: Connect Alerts to PagerDuty

**From Prometheus:**

In `config/alerts.yml`, add PagerDuty receiver:

```yaml
alertmanager:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

Create `alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m
  pagerduty_url: https://events.pagerduty.com/v2/enqueue

route:
  receiver: pagerduty
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h

receivers:
  - name: pagerduty
    pagerduty_configs:
      - service_key: $PAGERDUTY_INTEGRATION_KEY
        description: 'Imobi API Alert'
```

**From Grafana:**

1. Go to Alerting → Contact Points
2. Create PagerDuty contact point
3. Add integration key
4. Test notification

**From Sentry:**

1. Go to Integrations → PagerDuty
2. Authorize connection
3. Create incident on "Error rate > 1%"

### Step 6: Test PagerDuty Alerting

```bash
# Trigger a test incident
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_INTEGRATION_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Test alert from Imobi API",
      "severity": "critical",
      "source": "imobi-api"
    }
  }'
```

Check PagerDuty UI - should create incident

---

## Testing & Validation

### Test 1: Health Check Validation

```bash
cd services/api
bash scripts/health-check-validation.sh --production
```

Expected output:
```
✓ PASSED: Health endpoint is reachable
✓ PASSED: Health response contains all required fields
✓ PASSED: Database is configured and connectivity verified
✓ PASSED: Redis is connected
✓ PASSED: Email provider configured
...
VALIDATION PASSED
```

### Test 2: Monitoring Stack Test

```bash
bash scripts/test-monitoring-stack.sh
```

Verifies:
- Sentry configuration
- Prometheus metrics
- Grafana dashboards
- CloudWatch logs
- PagerDuty integration
- Alert rules

### Test 3: Manual Error Triggering

Generate a test error and verify it shows up in all systems:

```bash
# Trigger error (404)
curl https://api.imobi.com/api/v1/nonexistent

# Check Sentry
# https://sentry.io/organizations/imobi/issues/

# Check Grafana
# https://grafana.imobi.com/d/imobi-api-prod

# Check CloudWatch Logs
aws logs filter-log-events \
  --log-group-name /imobi/api/production \
  --filter-pattern "ERROR"

# Check PagerDuty
# https://imobi.pagerduty.com/incidents
```

### Test 4: Load Test

Generate load and monitor metrics:

```bash
# Using Apache Bench
ab -n 10000 -c 100 https://api.imobi.com/api/v1/health

# Monitor in Grafana
# Watch Request Rate and Response Time increase

# Monitor in Sentry
# Check for any errors during load
```

---

## Configuration Checklist

### Pre-Production

- [ ] Sentry project created and DSN configured
- [ ] Prometheus metrics endpoint accessible
- [ ] Prometheus scraping configured
- [ ] Grafana dashboard created with 15+ panels
- [ ] CloudWatch log group created with 30-day retention
- [ ] PagerDuty service created with escalation policy
- [ ] On-call schedule configured
- [ ] Alert rules defined for P1 and P2 issues
- [ ] Test error successfully tracked in all systems
- [ ] All team members have access to dashboards

### Post-Deployment

- [ ] Health check returns `status: ok`
- [ ] Metrics flowing to Prometheus
- [ ] Logs streaming to CloudWatch
- [ ] Grafana dashboard shows real data
- [ ] PagerDuty incidents can be created
- [ ] Alert rules are active
- [ ] Team trained on runbook procedures
- [ ] On-call rotation active

---

## Dashboard URLs

Save these URLs for quick access:

```
API Health:                   https://api.imobi.com/api/v1/health
Prometheus:                   https://prometheus.imobi.com
Grafana:                      https://grafana.imobi.com/d/imobi-api-prod
Sentry:                       https://sentry.io/organizations/imobi/issues/
CloudWatch Logs:              https://console.aws.amazon.com/logs/
CloudWatch Insights:          https://console.aws.amazon.com/logs/insights/
PagerDuty Dashboard:          https://imobi.pagerduty.com/
PagerDuty Incidents:          https://imobi.pagerduty.com/incidents
PagerDuty Schedules:          https://imobi.pagerduty.com/schedules
Monitoring Runbook:           /home/user/imobi/services/api/docs/MONITORING_RUNBOOK.md
```

---

## Environment Variables Reference

### Sentry Configuration
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/123456
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_SERVER_NAME=imobi-api-prod
```

### Prometheus Configuration
```env
PROMETHEUS_SCRAPE_INTERVAL=15s
PROMETHEUS_EVALUATION_INTERVAL=15s
PROMETHEUS_RETENTION=30d
```

### Grafana Configuration
```env
GRAFANA_URL=https://grafana.imobi.com
GRAFANA_API_KEY=xxx
GRAFANA_ORG_ID=1
GRAFANA_DASHBOARD_ID=imobi-api-prod
```

### CloudWatch Configuration
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
CLOUDWATCH_LOG_GROUP=/imobi/api/production
CLOUDWATCH_RETENTION_DAYS=30
```

### PagerDuty Configuration
```env
PAGERDUTY_INTEGRATION_KEY=xxx
PAGERDUTY_SEND_DEV_ALERTS=false
PAGERDUTY_SERVICE_KEY=xxx
PAGERDUTY_SERVICE_ID=xxx
```

---

## Troubleshooting

### Metrics Not Appearing in Prometheus

```bash
# Check if API is exporting metrics
curl http://api.imobi.com/api/v1/metrics

# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Check for scrape errors
# Go to Prometheus UI → Status → Targets
```

### Grafana Dashboard Empty

```bash
# Verify datasource connection
# In Grafana: Configuration → Data Sources → Test

# Check if metrics exist in Prometheus
curl 'http://prometheus:9090/api/v1/query?query=up{job="imobi-api"}'

# Reload dashboard
# Go to dashboard → Refresh icon
```

### Logs Not Appearing in CloudWatch

```bash
# Check IAM permissions
# User must have: logs:CreateLogGroup, logs:PutLogEvents

# Verify log group exists
aws logs describe-log-groups --log-group-name-prefix /imobi

# Check app logging configuration
# Ensure Winston/Pino is configured to send to CloudWatch
```

### PagerDuty Not Receiving Alerts

```bash
# Test integration key
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Test",
      "severity": "critical",
      "source": "test"
    }
  }'

# Check Alertmanager logs
# docker logs alertmanager

# Verify alert rules are firing
# Prometheus UI → Status → Alerts
```

---

## Next Steps

1. **Complete this setup guide** (1-2 hours)
2. **Train team on monitoring tools** (1 hour)
3. **Create runbooks for common issues** (2 hours) - see MONITORING_RUNBOOK.md
4. **Set up on-call rotation** (30 minutes)
5. **Monitor for 1 week**, adjust thresholds based on baseline
6. **Review metrics weekly** with team

---

## Support & Escalation

- **Questions**: Post in #monitoring Slack channel
- **Issues**: Create incident in #incident-response
- **Runbooks**: See MONITORING_RUNBOOK.md in this directory
- **Documentation**: https://wiki.imobi.com/monitoring

---

**Version**: 1.0.0  
**Last Updated**: June 23, 2026  
**Owner**: Platform Engineering Team
