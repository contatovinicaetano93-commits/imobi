# Monitoring & Health Checks

## Health Check Endpoints

### API Health Check
```
GET /api/v1/health

Response:
{
  "status": "ok",
  "timestamp": "2026-05-29T10:00:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "s3": "connected"
  }
}
```

### Liveness Probe
```
GET /health/live

Response: 200 OK (service is alive)
```

### Readiness Probe
```
GET /health/ready

Response: 200 OK if all dependencies are ready, 503 if not
```

## Kubernetes Health Check Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: imbobi-api
spec:
  template:
    spec:
      containers:
      - name: api
        livenessProbe:
          httpGet:
            path: /health/live
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

## Application Performance Monitoring (APM)

### Error Tracking - Sentry Integration

```typescript
import * as Sentry from "@sentry/node";

// In main.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
});

// Use in middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Performance Monitoring - New Relic Integration

```typescript
require('newrelic'); // Must be first

// Automatic instrumentation of:
// - HTTP requests
// - Database queries (Prisma)
// - External API calls
// - Redis operations
```

## Log Aggregation

### Winston Logger Configuration

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});
```

### ELK Stack (Elasticsearch, Logstash, Kibana)

Configure Logstash to ship logs:

```conf
input {
  file {
    path => "/var/log/imbobi/application.log"
    start_position => "beginning"
  }
}

filter {
  json {
    source => "message"
  }
  date {
    match => [ "timestamp", "ISO8601" ]
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "imbobi-%{+YYYY.MM.dd}"
  }
}
```

## Metrics Collection

### Prometheus Metrics

```typescript
import promClient from 'prom-client';

// Default metrics
promClient.collectDefaultMetrics();

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

const databaseQueryDuration = new promClient.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'table'],
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

### Grafana Dashboard

Import Prometheus data source and create dashboards for:
- Request rate and latency
- Error rate
- Database performance
- Redis hit rate
- CPU and memory usage
- Disk space

## Alerting Rules

### Prometheus Alert Rules (alert.yml)

```yaml
groups:
  - name: imbobi_alerts
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      # High response time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 10m
        annotations:
          summary: "95th percentile response time > 1s"
          
      # Database connection pool exhausted
      - alert: DatabasePoolExhausted
        expr: db_connections_in_use / db_connections_max > 0.9
        for: 2m
        annotations:
          summary: "Database connection pool 90% utilized"
          
      # Redis memory usage high
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 5m
        annotations:
          summary: "Redis memory usage > 85%"
          
      # API downtime
      - alert: APIDown
        expr: up{job="imbobi-api"} == 0
        for: 1m
        annotations:
          summary: "API service is down"
```

## Notification Channels

### Email Alerts

```yaml
global:
  smtp_smarthost: '${SMTP_HOST}:${SMTP_PORT}'
  smtp_auth_username: '${SMTP_USER}'
  smtp_auth_password: '${SMTP_PASSWORD}'
  
route:
  receiver: 'ops-team'
  routes:
    - match:
        severity: critical
      receiver: 'ops-team'
      repeat_interval: 30m

receivers:
  - name: 'ops-team'
    email_configs:
      - to: 'ops@imbobi.com.br'
        headers:
          Subject: 'Alert: {{ .GroupLabels.alertname }}'
```

### Slack Alerts

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'
        send_resolved: true
```

## Database Performance Monitoring

### Query Performance Insights

```sql
-- Identify slow queries
SELECT 
  query,
  calls,
  mean_time,
  max_time,
  total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Connection Monitoring

```sql
-- Current connections
SELECT 
  usename,
  application_name,
  state,
  query_start,
  state_change,
  query
FROM pg_stat_activity
WHERE datname = 'imbobi_prod';

-- Long-running queries
SELECT 
  pid,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE query_start < now() - interval '10 minutes'
ORDER BY query_start;
```

## Uptime Monitoring

### Pingdom / StatusCake Configuration

```bash
# Monitor API health
Check Type: HTTP
URL: https://api.imbobi.com.br/api/v1/health
Frequency: Every 1 minute
Expected HTTP Code: 200

# Monitor Web application
Check Type: HTTP
URL: https://imbobi.com.br
Frequency: Every 5 minutes
Expected HTTP Code: 200
```

## Dashboard URLs

- **Grafana**: http://monitoring.imbobi.local:3000
- **Prometheus**: http://monitoring.imbobi.local:9090
- **Kibana**: http://monitoring.imbobi.local:5601
- **Sentry**: https://sentry.io/organizations/imbobi

## Incident Response

### Runbook Example

**Alert: HighErrorRate**

1. Check recent deployments: `kubectl rollout history deployment/imbobi-api`
2. View error logs: `kubectl logs -f deployment/imbobi-api --tail=100`
3. Check database connectivity: `SELECT 1 FROM usuario LIMIT 1;`
4. Verify Redis connection: `redis-cli PING`
5. If critical: Rollback deployment `kubectl rollout undo deployment/imbobi-api`
6. Post mortem: Document findings in incident channel

### Escalation Policy

- **Warning**: Notify on-call engineer (email + Slack)
- **Critical**: Page on-call engineer (PagerDuty)
- **Critical > 15 min**: Escalate to team lead
- **Critical > 30 min**: Escalate to director
