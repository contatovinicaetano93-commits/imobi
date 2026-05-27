# Imbobi Monitoring & Alerting

Production-ready monitoring, alerting, and observability stack for the Imbobi platform.

**Status**: Production Ready  
**Last Updated**: 2026-05-27  

---

## 📊 Quick Overview

| Component | Purpose | Status |
|-----------|---------|--------|
| **Datadog** | Primary APM, Metrics, Logs, Traces | ✓ Production |
| **Prometheus** | Backup metrics + AlertManager | ✓ Fallback |
| **Grafana** | Dashboards visualization | ✓ Development |
| **Fluent Bit** | Log aggregation & shipping | ✓ Production |
| **Jaeger** | Distributed tracing (optional) | ✓ Available |

**SLA Targets**:
- Uptime: **99.5%** (21.6 min downtime/month)
- Latency P95: **<200ms**
- Error Rate: **<0.5%**

---

## 📁 Files Structure

```
monitoring/
├── README.md                          # This file
├── MONITORING_PLAN.md                 # Complete monitoring strategy
├── SLA_TARGETS.md                     # SLA definitions & calculations
├── RUNBOOKS.md                        # On-call procedures
├── setup-monitoring.sh                # Automated setup script
│
├── datadog-config.yaml                # Datadog configuration
├── alerts-datadog.json                # 16 production alerts
├── dashboards.json                    # 8 comprehensive dashboards
├── instrumentation.ts                 # SDK instrumentation code
│
├── docker-compose.monitoring.yml      # Docker Compose stack
├── fluent-bit.conf                    # Log aggregation pipeline
├── prometheus.yml                     # Prometheus scrape config
├── alertmanager.yml                   # AlertManager routing
├── alerting-rules.yml                 # 35+ Prometheus alert rules
│
└── grafana-provisioning/              # Grafana datasources & dashboards
    ├── dashboards/
    └── datasources/
```

---

## 🚀 Quick Start (5 minutes)

### 1. Prerequisites

```bash
# Install Docker & Docker Compose
docker --version    # >= 20.10
docker-compose --version  # >= 1.29
```

### 2. Setup Environment

```bash
# Copy and fill environment variables
cp .env.example .env

# Required variables for Datadog:
DATADOG_API_KEY=xxxx              # Get from: https://app.datadoghq.com/organization/settings/api-keys
DATADOG_APP_KEY=xxxx              # Get from: https://app.datadoghq.com/organization/settings/application-keys
SLACK_WEBHOOK_URL=https://hooks... # For notifications
PAGERDUTY_API_KEY=xxxx            # For P0/P1 escalation
PAGERDUTY_SERVICE_ID=xxxx         # Service ID in PagerDuty
```

### 3. Run Setup Script

```bash
# Make executable
chmod +x monitoring/setup-monitoring.sh

# Run setup (choose mode)
./monitoring/setup-monitoring.sh datadog    # Datadog only
./monitoring/setup-monitoring.sh prometheus # Prometheus only
./monitoring/setup-monitoring.sh both       # Both (recommended for prod)
```

### 4. Verify Installation

```bash
# Check services
docker-compose -f docker-compose.yml -f monitoring/docker-compose.monitoring.yml ps

# Verify connectivity
curl http://localhost:9090/-/healthy        # Prometheus
curl http://localhost:9093/-/healthy        # AlertManager
curl http://localhost:3000/api/health       # Grafana
curl http://localhost:8126/v5/profiles      # Datadog Agent

# Check logs
docker logs imbobi_datadog_agent | grep -i "initialized"
```

---

## 📈 Dashboards

### Available Dashboards

1. **Overview (SLA)** - Uptime, Latency P95, Error Rate vs targets
2. **Performance** - Latency distribution, Database, Cache, S3, Resources
3. **Database** - Connection pool, Slow queries, Replication lag
4. **Cache & Redis** - Hit rate, Memory usage, Operations/sec
5. **Queue & Jobs** - Job processing, Failures, Dead letter queue
6. **Business Metrics** - Obras, Parcelas, Fotos, Payments
7. **Security** - Auth failures, Error by endpoint, Top errors
8. **APM Traces** - Service dependencies, Slowest traces

### Access

```
Datadog:    https://app.datadoghq.com/dashboard
Prometheus: http://localhost:9090
Grafana:    http://localhost:3000 (admin/admin123)
AlertManager: http://localhost:9093
```

---

## 🚨 Critical Alerts (P0 + P1)

### P0 - CRITICAL (Auto-escalate PagerDuty)

| Alert | Condition | Action |
|-------|-----------|--------|
| DB Connection Pool Exhausted | Queued > 10 for 1 min | Scale/Terminate idle |
| Database Connection Errors | Any error | Check DB status |
| Disk Space Critical | <10% available | Clean logs/Scale |
| Dead Letter Queue | >0 messages | Reprocess jobs |
| Uptime SLA Breach | Error rate >5% for 1h | Incident response |

### P1 - HIGH (Slack + Email)

| Alert | Condition | Action |
|-------|-----------|--------|
| HTTP Error Rate | >5% for 5 min | Identify endpoint |
| Latency P95 | >500ms for 5 min | Optimize DB/Cache |
| S3 Upload Failures | >3 in 5 min | Check S3 credentials |
| Auth Failures Spike | >20 in 5 min | Check JWT secrets |
| Slow Queries | >5 in 5 min | Index optimization |

### View Alert Details

```bash
# Datadog
https://app.datadoghq.com/monitors

# Prometheus
http://localhost:9090/alerts

# AlertManager
http://localhost:9093/#/alerts
```

---

## 📊 Metrics Overview

### Key Metrics Monitored

**Performance**:
- `http.request.duration` (p50, p75, p95, p99)
- `db.query.duration`
- `cache.operation.duration`
- `s3.operation.duration`

**Errors**:
- `http.requests.error_rate` (%)
- `db.connection.errors`
- `queue.jobs.failed`
- `queue.jobs.dead_letter`

**Resources**:
- `system.memory.percent`
- `system.disk.percent`
- `system.load.1`
- `redis.memory.percent`

**Business**:
- `obras.created.total`
- `parcelas.liberadas.total`
- `fotos.uploaded.total`
- `payment.processed.total`

### Query Examples

```bash
# Datadog
avg:http.request.duration{env:production}
p95:http.request.duration{env:production}
sum:http.requests.error_rate{env:production}

# Prometheus
rate(http_requests_total[5m])
histogram_quantile(0.95, http_request_duration_ms_bucket)
```

---

## 🔔 Notifications

### Channels Configured

| Priority | Slack | Email | PagerDuty | Response Time |
|----------|-------|-------|-----------|----------------|
| P0 | ✓ | ✓ | ✓ | < 5 min |
| P1 | ✓ | ✓ | ✗ | < 15 min |
| P2 | ✓ | ✗ | ✗ | < 1 hour |

### Configure Notifications

**Slack**:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
# Channel: #critical-alerts, #alerts-imbobi
```

**PagerDuty**:
```bash
PAGERDUTY_API_KEY=xxx
PAGERDUTY_SERVICE_ID=xxx
# Service: imbobi-api (escalation policy: critical)
```

**Email**:
```bash
SMTP_USERNAME=alerts@imbobi.com
SMTP_PASSWORD=xxx
RECIPIENTS=devops@imbobi.com,engineering@imbobi.com
```

---

## 🔍 Troubleshooting

### Tracer Not Connecting

```bash
# Check if Datadog Agent is running
docker ps | grep datadog

# Verify connection
docker-compose logs datadog-agent | grep -i "initialized\|error"

# Test connectivity
docker exec imbobi_api curl http://datadog-agent:5000/health

# Check environment
docker-compose exec api env | grep DATADOG
```

**Solution**: Verify `DATADOG_API_KEY` and agent networking

### Metrics Not Appearing

```bash
# Check DogStatsD port
docker exec imbobi_api nc -zu datadog-agent 8125

# Verify tags
docker-compose logs datadog-agent | grep -i "tags\|metric"

# Check rate limiting
# Datadog console → Settings → Rate Limiting
```

**Solution**: Ensure metrics have correct tags (env:production, service:imbobi)

### Alerts Not Firing

```bash
# Verify alert condition
# Datadog: Monitor → Edit → Test Conditions

# Check notification channels
# Datadog: Monitor → Edit → Notifications

# Test Slack webhook
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test alert"}'
```

**Solution**: Test notification channels separately

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `MONITORING_PLAN.md` | Complete monitoring strategy & setup |
| `SLA_TARGETS.md` | SLA definitions, calculations, compliance |
| `RUNBOOKS.md` | On-call procedures for P0-P2 alerts |
| `alerts-datadog.json` | Alert definitions (16 production alerts) |
| `dashboards.json` | Dashboard definitions (8 dashboards) |

### Read First

1. **New to team?** → Start with `MONITORING_PLAN.md`
2. **On-call duty?** → Reference `RUNBOOKS.md`
3. **SLA questions?** → Check `SLA_TARGETS.md`
4. **Setup/Troubleshooting?** → See this `README.md`

---

## 🔧 Common Operations

### View Logs

```bash
# Real-time API logs
docker-compose logs -f api

# Last 100 lines
docker logs imbobi_api --tail 100

# With grep
docker logs imbobi_api | grep -i "error\|latency" | tail -20
```

### Scale API Horizontally

```bash
# Increase from 1 to 3 instances
docker-compose up -d --scale api=3

# Monitor
docker-compose ps api
docker stats
```

### Restart Services

```bash
# Restart everything
docker-compose -f docker-compose.yml \
  -f monitoring/docker-compose.monitoring.yml restart

# Restart specific service
docker-compose restart api
docker-compose restart postgres
```

### View Metrics in Datadog

```bash
# Open Datadog
https://app.datadoghq.com

# Metric Explorer
https://app.datadoghq.com/metric/explorer

# Dashboards
https://app.datadoghq.com/dashboard

# Logs
https://app.datadoghq.com/logs
```

---

## 📞 Support & Escalation

### On-Call Support

**PagerDuty**: https://imbobi.pagerduty.com  
**Slack**: #critical-alerts, #alerts-imbobi  

### Contact

| Role | Contact |
|------|---------|
| DevOps Lead | devops@imbobi.com |
| Engineering Lead | engineering@imbobi.com |
| CTO | cto@imbobi.com |

---

## ✅ Monitoring Checklist (Monthly)

- [ ] Review SLA compliance report
- [ ] Analyze alert noise (false positives)
- [ ] Update runbooks based on incidents
- [ ] Test PagerDuty escalation
- [ ] Review and optimize slow queries
- [ ] Check storage usage & retention policies
- [ ] Backup Datadog dashboards/monitors
- [ ] Update on-call runbooks

---

## 🚀 Advanced Topics

### Custom Metrics

```typescript
// services/api/src/instrumentation.ts
import { DatadogMetrics } from '@imbobi/monitoring';

DatadogMetrics.recordHttpRequest(
  'POST',
  '/obras',
  201,
  142  // latency in ms
);
```

### Custom Dashboards

1. Datadog: Dashboard → New Dashboard
2. Add widgets (timeseries, gauge, heatmap, etc)
3. Use metrics from `MONITORING_PLAN.md`
4. Export as JSON → Save to `dashboards.json`

### Alert Rules

Edit `alerting-rules.yml` (Prometheus) or `alerts-datadog.json` (Datadog)

### Log Parsing

Edit `fluent-bit.conf` to add custom parsers or outputs

---

## 📋 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-27 | Initial production setup |

---

## 📄 License

Internal Imbobi documentation. Do not share publicly.

---

**Questions?** Check the docs above or contact devops@imbobi.com
