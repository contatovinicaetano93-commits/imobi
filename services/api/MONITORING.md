# Production Monitoring Guide

## Overview

This guide explains how to set up comprehensive monitoring and logging for the Imobi API in production environments.

## Structured Logging

### Log Levels

The application uses structured JSON logging in production:

```typescript
logger.log('User logged in', { userId, provider: 'google', duration: 150 });
// Output: {"timestamp":"2024-01-01T12:00:00Z","level":"INFO","context":"AuthService","message":"User logged in","userId":"...","provider":"google","duration":150}

logger.error('Database connection failed', 'Connection timeout', { retries: 3 });
// Output: {"timestamp":"...","level":"ERROR","context":"...","message":"Database connection failed","trace":"Connection timeout","retries":3}

logger.warn('Rate limit approaching', { userId, requestsRemaining: 2 });
// Output: {"timestamp":"...","level":"WARN","context":"...","message":"Rate limit approaching","userId":"...","requestsRemaining":2}
```

### Log Levels Explained

- **ERROR**: Application failures, critical issues that need immediate attention
- **WARN**: Abnormal conditions that don't prevent operation (rate limits, deprecated usage)
- **INFO**: Key business events (logins, payments, uploads)
- **DEBUG**: Developer-focused info (variable values, function entry/exit)
- **VERBOSE**: Very detailed diagnostic information

In production, only ERROR, WARN, and INFO are logged. DEBUG and VERBOSE are development-only.

### Log File Structure (Production)

Logs are written to `/logs/{YYYY-MM-DD}.log`:
```
{"timestamp":"2024-01-01T12:00:00Z","level":"INFO","context":"AuthController","message":"User login successful","userId":"usr_123"}
{"timestamp":"2024-01-01T12:00:01Z","level":"ERROR","context":"EmailService","message":"SendGrid API error","code":401,"error":"Unauthorized"}
{"timestamp":"2024-01-01T12:00:02Z","level":"WARN","context":"CacheService","message":"Redis connection lost","attempt":2}
```

## Health Checks

### Health Endpoint

```bash
curl http://localhost:4000/api/v1/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "redis": {
    "status": "connected",
    "host": "redis.example.com",
    "port": 6379
  },
  "email": {
    "provider": "sendgrid",
    "configured": true
  },
  "firebase": {
    "configured": true
  },
  "database": {
    "configured": true
  }
}
```

**Status values**:
- `ok` — All services connected and healthy
- `degraded` — Some optional services are unavailable, but core functions work
- `error` — Critical service unavailable (database or Redis)

### Liveness & Readiness Probes

For Kubernetes deployments:

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/v1/health
    port: 4000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Key Metrics to Monitor

### Application Metrics

1. **Request Rate & Latency**
   - Requests per second
   - P50, P95, P99 response times
   - Error rate (4xx, 5xx)

2. **Database Metrics**
   - Connection pool usage
   - Query execution time
   - Slow queries (> 1s)
   - Connection errors

3. **Cache Metrics**
   - Redis memory usage
   - Cache hit rate
   - Connection status
   - Command latency

4. **Business Metrics**
   - User logins (successful/failed)
   - Credit approvals
   - Payment processing (success/failure)
   - Evidence uploads
   - Document verifications

5. **Error Metrics**
   - 5xx error rate
   - Database errors
   - Service unavailability
   - Rate limiting (429)

### Resource Metrics

- CPU usage
- Memory usage
- Disk usage (logs)
- Network I/O
- File descriptor count

## Platform-Specific Monitoring

### Vercel (Frontend + Logs)

**Logs**:
1. Go to Project → Monitor → Logs
2. View real-time logs from all deployments
3. Filter by level, message, timestamp

**Monitoring**:
- Built-in error tracking
- Performance monitoring (Web Vitals)
- Deployment analytics

### Railway (Backend Monitoring)

**Logs**:
1. Go to Project → Logs
2. View application logs in real-time
3. Search and filter logs

**Metrics**:
```bash
# View via CLI
railway logs --follow
railway logs --service api
```

**Alerts**:
1. Go to Project → Alerts
2. Create alerts for:
   - Deployment failures
   - High resource usage
   - Service restarts

### Heroku (With Buildpack)

**Logs**:
```bash
heroku logs --app=imobi-api --tail
heroku logs --app=imobi-api --dyno=web.1
```

**Metrics** (with add-on):
```bash
heroku addons:create papertrail
heroku addons:create new-relic:wayne
```

### Self-Hosted / Docker

#### Option 1: ELK Stack (Elasticsearch, Logstash, Kibana)

```yaml
version: '3'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5000:5000"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  api:
    build: .
    environment:
      NODE_ENV: production
      # ... other env vars
    volumes:
      - ./logs:/app/logs
    depends_on:
      - logstash
```

API sends logs to Logstash via:
```typescript
// In production logger setup
const winston = require('winston');
const syslog = require('winston-syslog');

const logger = winston.createLogger({
  transports: [
    new syslog.Syslog({
      app_name: 'imobi-api',
      host: 'logstash',
      port: 5000,
      facility: 'local0',
    }),
  ],
});
```

#### Option 2: Grafana Loki (Lightweight, Docker-friendly)

```yaml
version: '3'
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./logs:/logs
      - ./promtail-config.yaml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    depends_on:
      - loki
```

## Important Log Events

### Authentication
```typescript
logger.log('User login successful', { userId, loginMethod: 'google', ip: request.ip });
logger.warn('Login attempt failed', { email, reason: 'invalid_credentials', ip: request.ip });
logger.warn('Multiple failed login attempts', { email, attempts: 5, ip: request.ip });
```

### Payments & Financial
```typescript
logger.log('Credit approved', { userId, creditAmount: 50000, loanType: 'construction' });
logger.error('Payment processing failed', 'Payment gateway timeout', { userId, amount: 25000 });
logger.log('Funds released', { etapaId, userId, amount: 10000, reason: 'stage_approved' });
```

### Data & Uploads
```typescript
logger.log('Evidence photos uploaded', { userId, count: 5, totalSize: 25000000, duration: 3500 });
logger.error('Evidence validation failed', 'GPS validation failed', { userId, reason: 'out_of_bounds' });
logger.log('Document verified', { userId, documentType: 'RG', provider: 'iugu_kyc' });
```

### System Events
```typescript
logger.warn('Database connection lost', { retries: 3, nextRetry: 5000 });
logger.log('Cache flushed', { reason: 'manual', keysCleared: 1250, duration: 350 });
logger.warn('Rate limit exceeded', { userId, endpoint: '/evidence/upload', limit: 5 });
```

### Background Jobs
```typescript
logger.log('Payment release job started', { jobId: 'job_123', etapasToProcess: 15 });
logger.log('Notification sent', { userId, type: 'etapa_approved', channel: 'fcm' });
logger.error('Job failed', 'Database connection timeout', { jobId: 'job_123', retries: 3 });
```

## Alerts & Thresholds

### Critical Alerts (Immediate Action)
- Error rate > 5% for 5 minutes
- Database unavailable
- Redis unavailable
- Disk space < 10%
- Memory usage > 90%

### Warning Alerts (Within 30 minutes)
- Error rate > 1% for 10 minutes
- Response time P95 > 2000ms
- Queue depth growing (BullMQ)
- Rate limiting active
- Slow queries detected

### Info Alerts (For Awareness)
- Deployment successful
- Database backup completed
- Cache cleared
- Configuration reloaded

## Useful Queries

### Elasticsearch / Kibana
```
# All errors in last hour
level:ERROR AND timestamp:[now-1h TO now]

# Failed logins
message:"login attempt failed" AND timestamp:[now-24h TO now]

# Slow requests
duration:>2000 AND timestamp:[now-1h TO now]

# User-specific logs
userId:"usr_123" AND timestamp:[now-24h TO now]

# Specific endpoint errors
path:"/api/v1/evidence/upload" AND level:ERROR
```

### Grafana Loki
```
{job="imobi-api"} | json | level="ERROR"
{job="imobi-api"} | json | userId="usr_123"
{job="imobi-api"} | json | duration > 2000
```

## Debugging Production Issues

### Check Health
```bash
curl https://api.imobi.com/api/v1/health | jq
```

### View Recent Errors
```bash
# Last 100 errors
curl https://logs.platform.com/query \
  -d 'query=level:ERROR AND timestamp:[now-1h TO now]' \
  -d 'size=100'
```

### Check Specific User
```bash
# All events for user
curl https://logs.platform.com/query \
  -d 'query=userId:"usr_123" AND timestamp:[now-24h TO now]'
```

### Monitor Queue Depth
```bash
# Check pending jobs
curl https://api.imobi.com/api/v1/admin/queues \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Best Practices

1. **Log the Why, Not Just the What**
   - Good: `logger.log('User payment failed', { reason: 'insufficient_balance', amount: 50000 })`
   - Bad: `logger.log('Payment processing failed')`

2. **Include Context**
   - Always include userId, requestId, or relevant identifiers
   - Helps with debugging and tracing related events

3. **Don't Log Sensitive Data**
   - Never log passwords, API keys, tokens, PII
   - Redact credit card numbers, SSNs, personal info

4. **Use Appropriate Levels**
   - ERROR: Things that broke
   - WARN: Things that might break
   - INFO: Things that happened (business events)
   - DEBUG: Development details

5. **Aggregate Related Events**
   - Use requestId to track one request across services
   - Use jobId to track background job execution

6. **Set Up Alerts Early**
   - Don't wait for errors to start alerting
   - Create baseline metrics first
   - Then alert on anomalies

## Monitoring Setup Checklist

- [ ] Health endpoint is accessible and returning correct status
- [ ] Logs are being written to disk (production)
- [ ] Log rotation is configured (daily files)
- [ ] Monitoring platform is connected (Railway, Vercel, ELK, etc.)
- [ ] Critical alerts are configured
- [ ] Warning alerts are configured
- [ ] Team members have access to logs and dashboards
- [ ] On-call rotation is set up
- [ ] Runbooks exist for common issues
- [ ] Log retention policy is defined (30+ days)

## Related Documents

- [PRODUCTION_VALIDATION.md](./PRODUCTION_VALIDATION.md) — Environment setup
- [SECRETS_MANAGEMENT.md](../SECRETS_MANAGEMENT.md) — Credential handling
- [/api/v1/health](../../../src/common/health.controller.ts) — Health check implementation
