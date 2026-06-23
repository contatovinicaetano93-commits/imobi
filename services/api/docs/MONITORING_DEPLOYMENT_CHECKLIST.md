# Monitoring Deployment Checklist

**For**: Imobi MVP Production Launch  
**Date**: June 23, 2026  
**Owner**: DevOps / Platform Team

---

## Pre-Deployment Verification

Run these checks **before** deploying monitoring to production.

### 1. Verify Health Check Endpoint

```bash
# Local test (API must be running)
curl http://localhost:4000/api/v1/health | jq

# Production test
curl https://api.imobi.com/api/v1/health | jq
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-23T14:30:00Z",
  "redis": {"status": "connected", "host": "...", "port": 6379},
  "email": {"provider": "sendgrid", "configured": true},
  "firebase": {"configured": true},
  "database": {"configured": true}
}
```

✓ Health check endpoint implemented  
✓ All services configured  
✓ Response structure correct  

### 2. Verify Metrics Endpoint

```bash
# Check if metrics are being exported
curl http://localhost:4000/api/v1/metrics | head -20

# Should output Prometheus format:
# # HELP process_cpu_usage_percent CPU usage percentage
# # TYPE process_cpu_usage_percent gauge
# process_cpu_usage_percent 35.2
```

✓ Metrics endpoint available  
✓ Prometheus format correct  
✓ Key metrics present  

### 3. Verify Sentry Integration

```bash
# Check if Sentry is initialized
grep -r "initSentry\|@sentry" services/api/src/main.ts

# Verify SENTRY_DSN is set
echo $SENTRY_DSN

# Test error capture (trigger a 500)
curl -X POST http://localhost:4000/api/v1/test-error
```

✓ Sentry imported in main.ts  
✓ SENTRY_DSN environment variable set  
✓ Error tracking functional  

### 4. Check Application Logs

```bash
# Verify structured logging is enabled
grep -r "logger\|winston\|pino" services/api/src/common/logging/

# Check log format
tail -f logs/application.log  # Should output JSON
```

✓ Structured logging configured  
✓ Logs are JSON format  
✓ Log level appropriate for environment  

---

## Configuration Deployment

### Step 1: Copy Sentry Configuration

```bash
# Copy template
cp services/api/.env.sentry.example services/api/.env.sentry

# Fill in values from Sentry project
# Edit .env.sentry with actual DSN
```

**Required values:**
- [ ] SENTRY_DSN (from Sentry project settings)
- [ ] SENTRY_ENVIRONMENT (production)
- [ ] SENTRY_RELEASE (your app version)

### Step 2: Configure Prometheus

```bash
# Copy configuration files
cp services/api/config/prometheus-grafana.yml /etc/prometheus/
cp services/api/config/alerts.yml /etc/prometheus/

# Update targets to point to your API
sed -i 's/localhost:4000/api.imobi.com:4000/g' /etc/prometheus/prometheus-grafana.yml

# Reload Prometheus
curl -X POST http://prometheus:9090/-/reload
```

**Verification:**
```bash
# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Query a metric
curl 'http://prometheus:9090/api/v1/query?query=up{job="imobi-api"}'
```

### Step 3: Deploy Grafana Dashboard

See: `docs/PRODUCTION_MONITORING_SETUP.md` → "Phase 3: Grafana Setup"

**Checklist:**
- [ ] Grafana instance running
- [ ] Prometheus datasource configured
- [ ] Dashboard JSON imported
- [ ] Panels showing real data
- [ ] Alerts configured

### Step 4: Configure CloudWatch Logs

See: `docs/PRODUCTION_MONITORING_SETUP.md` → "Phase 4: CloudWatch Setup"

**Checklist:**
- [ ] CloudWatch log group created
- [ ] Log retention set to 30 days
- [ ] Logs streaming from API
- [ ] Queries work (filter-log-events)
- [ ] Dashboard created with widgets

### Step 5: Configure PagerDuty

See: `docs/PRODUCTION_MONITORING_SETUP.md` → "Phase 5: PagerDuty Setup"

**Checklist:**
- [ ] Service created in PagerDuty
- [ ] Integration key generated
- [ ] Escalation policy defined
- [ ] On-call schedule active
- [ ] Test incident successful

---

## Environment Variables Deployment

### For Railway

```bash
# Set in Railway dashboard or CLI
railway variables set SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/123456"
railway variables set SENTRY_ENVIRONMENT="production"
railway variables set SENTRY_RELEASE="1.0.0"
railway variables set SENTRY_TRACES_SAMPLE_RATE="0.1"
railway variables set SENTRY_PROFILES_SAMPLE_RATE="0.1"
railway variables set SENTRY_SERVER_NAME="imobi-api-prod"
railway variables set PAGERDUTY_INTEGRATION_KEY="xxx"
railway variables set PAGERDUTY_SEND_DEV_ALERTS="false"
railway variables set AWS_REGION="us-east-1"
railway variables set CLOUDWATCH_LOG_GROUP="/imobi/api/production"
```

### For Vercel

```
Settings → Environment Variables → Add
- SENTRY_DSN
- SENTRY_ENVIRONMENT
- SENTRY_RELEASE
- PAGERDUTY_INTEGRATION_KEY
- AWS_REGION
- CLOUDWATCH_LOG_GROUP
```

### For Render

```
Environment → Add Environment Variables
- SENTRY_DSN
- SENTRY_ENVIRONMENT
- SENTRY_RELEASE
- PAGERDUTY_INTEGRATION_KEY
- AWS_REGION
- CLOUDWATCH_LOG_GROUP
```

---

## Production Deployment Steps

### Day 1: Deploy Monitoring Stack

```bash
# 1. Deploy API with monitoring
cd services/api
pnpm build
git push  # Deploy to production platform

# 2. Verify health check
curl https://api.imobi.com/api/v1/health

# 3. Run validation script
bash scripts/health-check-validation.sh --production

# 4. Check Sentry
# Go to: https://sentry.io/organizations/imobi/issues/
# Should show "waiting for first event"
```

**Checklist:**
- [ ] API deployed successfully
- [ ] Health endpoint responding
- [ ] No errors in deployment logs
- [ ] Version reflected in health check

### Day 2: Activate Prometheus & Metrics

```bash
# 1. Deploy Prometheus
docker-compose -f docker-compose.prometheus.yml up -d

# 2. Verify scraping
curl http://prometheus:9090/api/v1/targets

# 3. Check metrics in Grafana
# Go to: https://grafana.imobi.com/d/imobi-api-prod
# Should see request rate, latency, etc.

# 4. Test alert rules
# Prometheus UI → Status → Alerts
# All alert rules should show as active
```

**Checklist:**
- [ ] Prometheus running and scraping
- [ ] Grafana dashboard has data
- [ ] Alert rules active
- [ ] No scrape errors

### Day 3: Activate CloudWatch Logs

```bash
# 1. Create log group
aws logs create-log-group --log-group-name /imobi/api/production --region us-east-1

# 2. Set retention
aws logs put-retention-policy \
  --log-group-name /imobi/api/production \
  --retention-in-days 30 \
  --region us-east-1

# 3. Verify logs flowing
aws logs tail /imobi/api/production --follow

# 4. Create Insights queries
# See: docs/PRODUCTION_MONITORING_SETUP.md
```

**Checklist:**
- [ ] Log group created
- [ ] Logs flowing in
- [ ] Retention policy set
- [ ] Queries working

### Day 4: Activate PagerDuty

```bash
# 1. Create PagerDuty service
# https://pagerduty.com → Services → New

# 2. Set integration key
railway variables set PAGERDUTY_INTEGRATION_KEY="xxx"

# 3. Create escalation policy
# https://pagerduty.com → Escalation Policies → New

# 4. Set on-call schedule
# https://pagerduty.com → Schedules → New

# 5. Test alert
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Test alert from Imobi API",
      "severity": "critical",
      "source": "imobi-api"
    }
  }'
```

**Checklist:**
- [ ] PagerDuty service created
- [ ] Integration key configured
- [ ] Escalation policy defined
- [ ] Schedule created
- [ ] Test incident successful

### Day 5: Complete Validation

```bash
# Run full monitoring stack test
bash scripts/test-monitoring-stack.sh

# Expected output:
# ✓ Sentry configuration
# ✓ Prometheus metrics
# ✓ Grafana dashboard
# ✓ CloudWatch logs
# ✓ PagerDuty integration
```

**Checklist:**
- [ ] All validation tests pass
- [ ] Dashboard shows real data
- [ ] Alerts are armed
- [ ] On-call rotation active
- [ ] Team trained

---

## Post-Deployment Monitoring

### Week 1: Baseline Establishment

**Daily checks:**
```bash
# Every day, check:
curl https://api.imobi.com/api/v1/health | jq

# Review dashboard
# https://grafana.imobi.com/d/imobi-api-prod

# Check for errors
# https://sentry.io/organizations/imobi/issues/
```

**Adjustments to make:**
- [ ] Verify alert thresholds based on traffic
- [ ] Adjust sampling rates if needed
- [ ] Review error patterns
- [ ] Update runbook with real scenarios

### Week 2: Optimization

**Review metrics:**
```bash
# Analyze performance
# Grafana: P95 latency, error rate, cache hit rate

# Check database performance
# CloudWatch: Query execution times, connection pool

# Review background jobs
# PagerDuty: Job queue depth, processing rate
```

**Optimizations:**
- [ ] Increase Prometheus retention if storage available
- [ ] Add custom metrics for business events
- [ ] Fine-tune alert thresholds
- [ ] Create custom Grafana dashboards

### Week 3: Hardening

**Security & reliability:**
```bash
# Test disaster recovery
# Simulate API failure, verify PagerDuty triggers

# Test logging
# Verify sensitive data not logged

# Test alert accuracy
# Make sure alerts actually trigger appropriately
```

---

## Validation Scripts Usage

### Health Check Validation

```bash
# Local development
./scripts/health-check-validation.sh

# Production testing
./scripts/health-check-validation.sh --production --verbose

# Verbose output
./scripts/health-check-validation.sh --verbose
```

**Exit codes:**
- 0: All tests passed
- 1: Some tests failed

**Output:**
```
✓ PASSED: [test name]
✗ FAILED: [test name] - [reason]
⊘ SKIPPED: [test name] - [reason]
```

### Monitoring Stack Test

```bash
# Full test
./scripts/test-monitoring-stack.sh

# Test specific components
TEST_SENTRY=true TEST_PROMETHEUS=false ./scripts/test-monitoring-stack.sh

# Verbose output
VERBOSE=true ./scripts/test-monitoring-stack.sh
```

---

## Critical Dashboard URLs

**Save these for quick access:**

```
Health Check:         https://api.imobi.com/api/v1/health
Prometheus:           https://prometheus.imobi.com
Grafana:              https://grafana.imobi.com/d/imobi-api-prod
Sentry Errors:        https://sentry.io/organizations/imobi/issues/
CloudWatch Logs:      https://console.aws.amazon.com/logs/
PagerDuty:            https://imobi.pagerduty.com/
PagerDuty Schedule:   https://imobi.pagerduty.com/schedules
PagerDuty Incidents:  https://imobi.pagerduty.com/incidents
```

---

## Rollback Procedures

If monitoring causes issues:

### Disable Sentry
```bash
# Remove SENTRY_DSN from environment
railway variables unset SENTRY_DSN
railway restart
```

### Disable Prometheus Scraping
```bash
# Comment out scrape config
# Edit /etc/prometheus/prometheus-grafana.yml
# Comment out imobi-api job
# Reload: curl -X POST http://prometheus:9090/-/reload
```

### Disable CloudWatch Logs
```bash
# Remove log configuration from deployment
# Railway: Remove CloudWatch integration
# ECS: Remove awslogs driver from task definition
```

### Disable PagerDuty
```bash
# Remove integration key
railway variables unset PAGERDUTY_INTEGRATION_KEY
railway restart
```

---

## Troubleshooting

### API Not Appearing in Prometheus

**Problem**: Prometheus targets show "DOWN" for imobi-api

**Solution:**
```bash
# 1. Check API is running
curl https://api.imobi.com/api/v1/health

# 2. Check metrics endpoint
curl https://api.imobi.com/api/v1/metrics

# 3. Verify Prometheus config
# Check API URL is correct: api.imobi.com:4000

# 4. Check network connectivity
# From Prometheus server: curl http://api.imobi.com:4000/api/v1/metrics
```

### Grafana Dashboard Empty

**Problem**: Dashboard panels show "No data"

**Solution:**
```bash
# 1. Check datasource connection
# Grafana: Configuration → Data Sources → Prometheus → Test

# 2. Check metrics exist
curl 'http://prometheus:9090/api/v1/query?query=up'

# 3. Wait for data collection
# Prometheus needs 2-3 scrape intervals for first data

# 4. Check Prometheus retention
# Metrics older than retention period won't show
```

### Sentry Not Capturing Errors

**Problem**: Errors not appearing in Sentry dashboard

**Solution:**
```bash
# 1. Verify SENTRY_DSN is set
echo $SENTRY_DSN

# 2. Check Sentry initialization
# Verify initSentry() called in main.ts

# 3. Trigger test error
curl http://localhost:4000/api/v1/test-error

# 4. Check Sentry project
# Verify project is active and not rate-limited
```

### PagerDuty Not Receiving Alerts

**Problem**: Alerts not creating incidents in PagerDuty

**Solution:**
```bash
# 1. Verify integration key
echo $PAGERDUTY_INTEGRATION_KEY

# 2. Test integration key
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "YOUR_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Test alert",
      "severity": "critical",
      "source": "test"
    }
  }'

# 3. Check alert rules are firing
# Prometheus: Status → Alerts (should show FIRING)

# 4. Check Alertmanager logs
docker logs alertmanager
```

---

## Success Criteria

Before marking monitoring as complete:

- [ ] Health check endpoint returns status: ok
- [ ] Metrics endpoint exports Prometheus format
- [ ] Grafana dashboard displays real-time data
- [ ] Sentry captures errors with stack traces
- [ ] CloudWatch aggregates logs with search capability
- [ ] PagerDuty creates incidents on P1 alerts
- [ ] Team can resolve incidents using MONITORING_RUNBOOK.md
- [ ] All validation scripts pass
- [ ] On-call schedule is active
- [ ] At least one P1 alert has been triggered and resolved

---

## Sign-Off

**Monitoring Setup Complete**

- [ ] All phases deployed
- [ ] All validation tests passing
- [ ] Team trained on runbook
- [ ] On-call rotation active
- [ ] Dashboard URLs documented
- [ ] Escalation procedures tested

**Deployed by**: _________________  
**Date**: ____________________  
**Verified by**: _________________  
**Date**: ____________________

---

## References

- Full setup guide: `docs/PRODUCTION_MONITORING_SETUP.md`
- On-call procedures: `docs/MONITORING_RUNBOOK.md`
- Quick reference: `docs/MONITORING_SUMMARY.md`
- Health validation: `scripts/health-check-validation.sh`
- Stack validation: `scripts/test-monitoring-stack.sh`

---

**Version**: 1.0.0  
**Created**: June 23, 2026  
**Owner**: Platform Engineering Team
