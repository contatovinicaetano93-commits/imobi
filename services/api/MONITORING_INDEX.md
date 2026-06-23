# Imobi Production Monitoring - Complete Index

**Date**: June 23, 2026  
**Status**: Ready for Production Deployment  
**Owner**: Platform Engineering Team

---

## Quick Navigation

### For First-Time Setup
1. Start here: [MONITORING_SUMMARY.md](docs/MONITORING_SUMMARY.md) - 5 min overview
2. Follow this: [PRODUCTION_MONITORING_SETUP.md](docs/PRODUCTION_MONITORING_SETUP.md) - Complete setup guide
3. Use this: [MONITORING_DEPLOYMENT_CHECKLIST.md](docs/MONITORING_DEPLOYMENT_CHECKLIST.md) - Step-by-step deployment

### For On-Call Operations
1. Reference this: [MONITORING_RUNBOOK.md](docs/MONITORING_RUNBOOK.md) - Alert handling procedures
2. Run these: [scripts/health-check-validation.sh](scripts/health-check-validation.sh) - Health validation
3. Test with: [scripts/test-monitoring-stack.sh](scripts/test-monitoring-stack.sh) - Full stack test

### For Configuration
- [.env.sentry.example](.env.sentry.example) - Sentry variables template
- [config/prometheus-grafana.yml](config/prometheus-grafana.yml) - Prometheus config
- [config/alerts.yml](config/alerts.yml) - Alert rules (P1 & P2)
- [config/pagerduty-integration.ts](config/pagerduty-integration.ts) - PagerDuty code

---

## Document Overview

### 1. MONITORING_SUMMARY.md (Executive Overview)
**Length**: ~3,000 words | **Read time**: 5-10 minutes

**Contains:**
- High-level architecture overview
- Key metrics to monitor
- Dashboard URLs and access
- Alert rules summary
- Validation test overview
- On-call responsibilities
- Next actions and timeline

**Best for**: Quick understanding of the monitoring setup

### 2. PRODUCTION_MONITORING_SETUP.md (Complete Setup Guide)
**Length**: ~8,000 words | **Read time**: 20-30 minutes

**Contains:**
- Step-by-step phase-by-phase setup:
  - Phase 1: Sentry (Error Tracking)
  - Phase 2: Prometheus (Metrics)
  - Phase 3: Grafana (Dashboards)
  - Phase 4: CloudWatch (Logs)
  - Phase 5: PagerDuty (Alerting)
- Testing procedures for each phase
- Configuration examples
- Troubleshooting for each component
- Dashboard URLs and access

**Best for**: Setting up monitoring for the first time

### 3. MONITORING_RUNBOOK.md (On-Call Procedures)
**Length**: ~6,000 words | **Read time**: 15-20 minutes

**Contains:**
- Quick links to all dashboards
- System health overview and status interpretation
- Detailed alert procedures:
  - 6 P1 (Critical) alerts with resolution steps
  - 6 P2 (High) alerts with resolution steps
- Escalation procedures and contact info
- Performance metrics and healthy ranges
- Comprehensive debugging guide
- On-call handoff procedures
- Troubleshooting decision tree
- Quick reference card

**Best for**: During incidents or on-call shift

### 4. MONITORING_DEPLOYMENT_CHECKLIST.md (Deployment Guide)
**Length**: ~4,000 words | **Read time**: 10-15 minutes

**Contains:**
- Pre-deployment verification checks
- Configuration deployment steps
- Environment variables setup
- 5-day deployment schedule
- Production validation steps
- Post-deployment baseline establishment
- Validation scripts usage
- Critical dashboard URLs
- Rollback procedures
- Troubleshooting during deployment
- Success criteria and sign-off

**Best for**: Deploying monitoring to production

---

## Scripts Reference

### health-check-validation.sh
**Purpose**: Validate API health check endpoint and service connectivity

```bash
# Basic usage
./scripts/health-check-validation.sh

# Production mode
./scripts/health-check-validation.sh --production

# Verbose output
./scripts/health-check-validation.sh --verbose

# Combined
./scripts/health-check-validation.sh --production --verbose
```

**Tests** (12 total):
1. Health endpoint reachability
2. Response structure validation
3. Database connectivity
4. Redis connectivity
5. Email provider configuration
6. Firebase configuration
7. CORS headers validation
8. JWT token refresh capability
9. Response time (< 500ms)
10. Rate limiting (429 on excess)
11. Overall health status
12. Metrics endpoint accessibility

**Exit codes**: 0 (pass), 1 (fail)

### test-monitoring-stack.sh
**Purpose**: Full validation of entire monitoring stack

```bash
# Basic usage
./scripts/test-monitoring-stack.sh

# Test specific components
TEST_SENTRY=false ./scripts/test-monitoring-stack.sh
TEST_PROMETHEUS=false ./scripts/test-monitoring-stack.sh
TEST_GRAFANA=false ./scripts/test-monitoring-stack.sh
TEST_PAGERDUTY=false ./scripts/test-monitoring-stack.sh

# Verbose output
VERBOSE=true ./scripts/test-monitoring-stack.sh
```

**Tests** (16 total):
1. Sentry configuration
2. Sentry connectivity
3. Sentry error capture
4. Prometheus metrics endpoint
5. Prometheus metrics format
6. Key metrics present
7. Grafana dashboard
8. Grafana datasource
9. CloudWatch logs
10. CloudWatch log group
11. PagerDuty configuration
12. PagerDuty connectivity
13. Alert rules configuration
14. Error simulation
15. Dashboard data freshness
16. Load test generation

---

## Configuration Files Reference

### .env.sentry.example
**Purpose**: Template for Sentry environment variables

**Variables**:
```env
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxx@xxxxx.ingest.sentry.io/123456
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
SENTRY_SERVER_NAME=imobi-api-prod
```

**Get values from**: https://sentry.io/settings/YOUR_ORG/projects/

### config/prometheus-grafana.yml
**Purpose**: Prometheus configuration for scraping metrics

**Key sections**:
- Global settings (scrape interval, retention)
- Alerting configuration
- Rule files (alerts.yml)
- Scrape configs (targets and jobs)
- Includes: API metrics, health check, PostgreSQL, Redis, Node exporter

**Usage**:
```bash
cp config/prometheus-grafana.yml /etc/prometheus/prometheus.yml
systemctl restart prometheus
```

### config/alerts.yml
**Purpose**: Prometheus alert rules for P1 and P2 incidents

**Groups**:
- P1 Alerts (6 rules):
  - APIDown
  - DatabaseConnectionFailed
  - RedisConnectionFailed
  - HighErrorRate
  - DiskSpaceLow
  - MemoryUsageHigh
- P2 Alerts (6 rules):
  - HighErrorRateWarning
  - HighResponseTime
  - QueueDepthGrowing
  - RateLimitingActive
  - SlowQueryDetected
  - DeploymentFailure
  - CacheHitRateLow

**Format**: YAML with Prometheus syntax

### config/pagerduty-integration.ts
**Purpose**: TypeScript code for PagerDuty integration

**Classes**:
- `PagerDutyIntegration`: Main integration class
- `AlertTemplates`: Predefined alert templates

**Methods**:
- `sendAlert()`: Send alert to PagerDuty
- `acknowledgeAlert()`: Acknowledge alert
- `resolveAlert()`: Resolve alert

**Usage**:
```typescript
const pagerduty = new PagerDutyIntegration();
await pagerduty.sendAlert({
  severity: 'critical',
  title: 'API is Down',
  description: 'The Imobi API is not responding',
  details: { uptime: '0%', errors: 100 },
  runbookUrl: 'https://wiki.imobi.com/runbooks/api-down'
});
```

---

## Dashboard & Monitoring URLs

### Application URLs
```
API Health Check:          https://api.imobi.com/api/v1/health
API Metrics (Prometheus):  https://api.imobi.com/api/v1/metrics
```

### Monitoring Platforms
```
Prometheus UI:             https://prometheus.imobi.com/graph
Grafana Dashboard:         https://grafana.imobi.com/d/imobi-api-prod
Sentry Issues:             https://sentry.io/organizations/imobi/issues/
CloudWatch Logs:           https://console.aws.amazon.com/logs/
CloudWatch Insights:       https://console.aws.amazon.com/logs/insights/
PagerDuty Dashboard:       https://imobi.pagerduty.com/
PagerDuty Incidents:       https://imobi.pagerduty.com/incidents
PagerDuty Schedules:       https://imobi.pagerduty.com/schedules
```

---

## Implementation Checklist

### Core Components (IMPLEMENTED)
- ✅ Health check endpoint (`GET /api/v1/health`)
- ✅ Metrics endpoint (`GET /api/v1/metrics`) with prom-client
- ✅ Sentry integration (@sentry/node)
- ✅ Structured JSON logging
- ✅ Error tracking and reporting

### Configuration (PROVIDED)
- ✅ Sentry environment variables template
- ✅ Prometheus configuration and alert rules
- ✅ PagerDuty integration code
- ✅ Grafana dashboard template

### Documentation (COMPLETE)
- ✅ Executive summary (MONITORING_SUMMARY.md)
- ✅ Complete setup guide (PRODUCTION_MONITORING_SETUP.md)
- ✅ On-call runbook (MONITORING_RUNBOOK.md)
- ✅ Deployment checklist (MONITORING_DEPLOYMENT_CHECKLIST.md)

### Validation (PROVIDED)
- ✅ Health check validation script
- ✅ Monitoring stack test script
- ✅ Pre-flight checks
- ✅ Post-deployment verification

---

## Deployment Timeline

### Recommended Deployment Schedule

**Day 1**: Verify & Deploy Core Monitoring
- Run health check validation
- Deploy API with Sentry enabled
- Verify health endpoint working

**Day 2**: Activate Metrics Collection
- Deploy Prometheus
- Configure scraping
- Activate Grafana dashboards

**Day 3**: Activate Log Aggregation
- Create CloudWatch log groups
- Configure log streaming
- Verify logs appearing

**Day 4**: Activate Alerting
- Create PagerDuty service
- Configure escalation policies
- Set up on-call schedule

**Day 5**: Complete Validation
- Run full monitoring stack test
- Team training on runbook
- Verify alert triggering

---

## Key Metrics to Track

### Request Performance
- P50 Latency (Target: < 100ms)
- P95 Latency (Target: < 500ms)
- P99 Latency (Target: < 2000ms)
- Requests per second
- Error rate (Target: < 0.5%)

### Database Performance
- Active connections
- Query latency
- Slow query rate
- Connection pool usage
- Transaction throughput

### Cache Performance
- Cache hit rate (Target: > 75%)
- Redis memory usage
- Command latency
- Connection status

### Background Jobs
- Queue depth
- Processing rate
- Failure rate
- Average execution time

### System Resources
- CPU usage (Target: < 70%)
- Memory usage (Target: < 75%)
- Disk space (Target: > 15% free)
- Network I/O

---

## Alert Severity Matrix

### P1 (Critical - Immediate Action Required)
- API Down (unresponsive > 2 min)
- Database Connection Failed
- Redis Connection Failed
- Error Rate > 5% (for 5 min)
- Disk Space < 10%
- Memory Usage > 90%

**Action**: Page on-call engineer immediately

### P2 (High - Action Required Within 30 Minutes)
- Error Rate > 1% (for 10 min)
- P95 Latency > 2000ms
- Queue Depth > 100 jobs
- Rate Limiting Active (429 errors)
- Slow Queries Detected (> 20%)
- Cache Hit Rate < 70%
- Deployment Failure

**Action**: Email/Slack notification, investigation required

---

## Team Responsibilities

### On-Call Engineer
- Monitor dashboard every 15 minutes
- Respond to P1 alerts immediately
- Follow MONITORING_RUNBOOK.md procedures
- Escalate if issue not resolved in 15 minutes
- Document resolution in #incident-response

### Backend Team Lead
- Review escalations from on-call
- Assist with complex troubleshooting
- Review error trends weekly
- Optimize slow queries
- Update runbook based on incidents

### DevOps/Infrastructure
- Maintain Prometheus, Grafana, CloudWatch
- Manage on-call rotation
- Scale resources as needed
- Review infrastructure metrics
- Perform backups and monitoring audits

---

## Training Requirements

### All Engineers Should Know
- Location of all dashboard URLs
- How to read basic Grafana metrics
- How to filter logs in CloudWatch
- How to check API health
- How to interpret health status

### On-Call Engineers Should Know
- All steps in MONITORING_RUNBOOK.md
- How to use each debugging tool
- Escalation procedures and contacts
- Common issues and fixes
- How to create PagerDuty incident

### Team Leads Should Know
- High-level architecture
- Alert configuration and thresholds
- Capacity planning metrics
- Incident postmortem process
- When to escalate to VP Engineering

---

## Maintenance Schedule

### Daily
- Check health endpoint
- Review recent errors in Sentry
- Monitor error rate trend

### Weekly
- Full stack test (Monday AM)
- Review performance metrics
- Update on-call rotation
- Check alert accuracy

### Monthly
- Capacity planning review
- Alert threshold optimization
- Security audit
- Disaster recovery drill

### Quarterly
- Full monitoring stack audit
- Update documentation
- Review and improve runbooks
- Training refresher for team

---

## Support & Escalation

### For Questions
- Post in #monitoring Slack channel
- Reference relevant documentation
- Include specific error or metric name

### For Issues
- Create incident in #incident-response
- Follow MONITORING_RUNBOOK.md
- Escalate to team lead if stuck > 15 min

### For Updates
- Modify relevant documentation
- Commit with prefix: `docs: monitoring`
- Notify team of changes

### For Emergencies
- Page on-call engineer via PagerDuty
- Call team lead if needed
- Post updates in #incident-response

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jun 23, 2026 | Initial monitoring setup |
| | | - 4 comprehensive guides |
| | | - 2 validation scripts |
| | | - 12+ alert rules |
| | | - Complete on-call runbook |

---

## Next Steps

1. **Review** this index (5 min)
2. **Read** MONITORING_SUMMARY.md (10 min)
3. **Follow** PRODUCTION_MONITORING_SETUP.md (1-2 hours)
4. **Deploy** using MONITORING_DEPLOYMENT_CHECKLIST.md (5 days)
5. **Test** with validation scripts
6. **Train** team on MONITORING_RUNBOOK.md
7. **Monitor** for 1 week and adjust thresholds

---

## Quick Reference Card

**Save this for during on-call:**

```
API Health:             curl https://api.imobi.com/api/v1/health | jq
Grafana:                https://grafana.imobi.com/d/imobi-api-prod
Sentry Errors:          https://sentry.io/organizations/imobi/issues/
CloudWatch Logs:        https://console.aws.amazon.com/logs/
PagerDuty:              https://imobi.pagerduty.com/incidents

CRITICAL ISSUES:
- API Down         → See MONITORING_RUNBOOK.md → "Alert: API Down"
- High Errors      → See MONITORING_RUNBOOK.md → "Alert: High Error Rate"
- DB Connection    → See MONITORING_RUNBOOK.md → "Alert: Database Failed"
- High Latency     → See MONITORING_RUNBOOK.md → "Alert: High Response Time"

Escalate if unsure → #incident-response or page backend lead
```

---

**Created**: June 23, 2026  
**Owner**: Platform Engineering Team  
**Status**: Production Ready

For access to dashboards, environment setup, or team training, contact DevOps team.
