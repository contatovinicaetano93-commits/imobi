# Production Monitoring & Observability Setup

Complete guide for setting up Sentry, performance monitoring, and observability for the Imobi platform.

## 1. Sentry Setup

### 1.1 Create Sentry Account & Project

1. Go to https://sentry.io/
2. Create account (or use existing organization)
3. Create new project:
   - Select "Node.js"
   - Name: `imobi-api`
   - Team: Select your team
   - Alert Settings: All issues

### 1.2 Get Sentry DSN

After project creation, you'll receive a DSN like:
```
https://examplePublicKey@o123456.ingest.sentry.io/1234567
```

Add to `.env.production`:
```env
SENTRY_DSN=https://examplePublicKey@o123456.ingest.sentry.io/1234567
SENTRY_RELEASE=1.0.0
SENTRY_ENABLE_PROFILER=true
```

### 1.3 Configure API Sentry Integration

The API already has Sentry integration in `src/common/sentry.module.ts`. Verify configuration:

```typescript
// services/api/src/main.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  release: process.env.SENTRY_RELEASE,
  profilesSampleRate: process.env.SENTRY_ENABLE_PROFILER === "true" ? 0.1 : 0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
});

const app = await NestFactory.create(AppModule);
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### 1.4 Configure Web App Sentry Integration

The web app has Sentry configured in `apps/web/src/instrumentation.ts`:

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  
  integrations: [
    new Sentry.Replays.Integration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  replaySessionSampleRate: 0.1,
  replayOnErrorSampleRate: 1.0,
});
```

Add to `.env.production`:
```env
NEXT_PUBLIC_SENTRY_DSN=https://examplePublicKey@o123456.ingest.sentry.io/1234567
NEXT_PUBLIC_SENTRY_RELEASE=1.0.0
```

### 1.5 Sentry Project Settings

In Sentry dashboard, configure:

#### Alert Rules

1. **Critical: High Error Rate**
   - Condition: Error rate > 5% for 5 minutes
   - Action: Alert #incidents-critical, page on-call
   - Severity: Critical

2. **Warning: Elevated Error Rate**
   - Condition: Error rate > 1% for 10 minutes
   - Action: Alert #incidents-warnings
   - Severity: Warning

3. **Info: New Issue Type**
   - Condition: New issue created
   - Action: Alert #incidents-info
   - Severity: Info

#### Issue Grouping

Go to Project Settings → Grouping:
- Enable "Stack trace in app frames"
- Use error fingerprinting for better grouping

#### Inbound Filters

Ignore common non-critical errors:
```
Error message contains: "ResizeObserver loop limit exceeded"
Error message contains: "Network request failed"
Error message contains: "QuotaExceededError"
```

### 1.6 Slack Integration

1. Go to Project Settings → Integrations → Slack
2. Click "Add workspace"
3. Authorize Sentry bot
4. Create notification rule:
   - Alert to: #incidents
   - For: All errors
   - Notify when: Alert is triggered

## 2. API Performance Monitoring

### 2.1 Key Metrics to Track

```typescript
// services/api/src/common/metrics.ts

export interface APIMetrics {
  // Request metrics
  requestsPerSecond: number;
  p50ResponseTime: number;  // milliseconds
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;         // percentage

  // Database metrics
  dbConnectionPoolUsage: number;     // percentage
  slowQueryCount: number;             // queries > 1s
  dbErrorRate: number;

  // Cache metrics
  cacheHitRate: number;      // percentage
  redisMemoryUsage: number;  // MB
  redisCommandLatency: number; // milliseconds

  // Business metrics
  activeUsers: number;
  completedTransactions: number;
  failedTransactions: number;
}
```

### 2.2 Instrument API Endpoints

Add response time tracking:

```typescript
// services/api/src/common/http.interceptor.ts

import { Injectable } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import * as Sentry from "@sentry/node";

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const endpoint = `${req.method} ${req.path}`;

    return next.handle().pipe(
      tap(
        (data) => {
          const duration = Date.now() - startTime;
          const status = context.switchToHttp().getResponse().statusCode;

          // Track successful request
          Sentry.captureMessage(`Request ${endpoint}: ${duration}ms`, "info", {
            endpoint,
            duration,
            status,
          });

          // Alert on slow requests (> 2s)
          if (duration > 2000) {
            Sentry.captureMessage(
              `Slow request: ${endpoint} took ${duration}ms`,
              "warning"
            );
          }
        },
        (error) => {
          const duration = Date.now() - startTime;
          
          // Track failed request
          Sentry.captureException(error, {
            tags: {
              endpoint,
              duration,
              error_type: error.constructor.name,
            },
          });
        }
      )
    );
  }
}
```

### 2.3 Database Query Monitoring

Enable PostgreSQL slow query logging:

```env
# .env.production
POSTGRES_LOG_MIN_DURATION=1000  # Log queries > 1 second

# In postgres.conf:
log_min_duration_statement = 1000
log_duration = off
```

Monitor slow queries:

```bash
# View slow queries
tail -100 /var/log/postgresql/postgresql.log | grep "duration:"

# Get slowest queries
awk -F'duration:' '{print $2}' /var/log/postgresql/postgresql.log | \
  sort -rn | head -10
```

### 2.4 Redis Performance Monitoring

Monitor Redis commands:

```bash
# Monitor real-time commands
redis-cli monitor

# Slow log
redis-cli slowlog get 10
redis-cli slowlog reset

# Memory info
redis-cli info memory

# Command stats
redis-cli info commandstats
```

## 3. Core Web Vitals Tracking

### 3.1 Web Vitals Collection

The web app collects Core Web Vitals:

```typescript
// apps/web/src/vitals.ts

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import * as Sentry from '@sentry/nextjs';

export function reportWebVitals() {
  getCLS(metric => Sentry.captureMessage(metric.value.toString(), 'info', { metric: 'CLS' }));
  getFID(metric => Sentry.captureMessage(metric.value.toString(), 'info', { metric: 'FID' }));
  getFCP(metric => Sentry.captureMessage(metric.value.toString(), 'info', { metric: 'FCP' }));
  getLCP(metric => Sentry.captureMessage(metric.value.toString(), 'info', { metric: 'LCP' }));
  getTTFB(metric => Sentry.captureMessage(metric.value.toString(), 'info', { metric: 'TTFB' }));
}
```

### 3.2 Lighthouse CI

Add Lighthouse CI to CI/CD pipeline:

```yaml
# .github/workflows/lighthouse.yml

name: Lighthouse CI

on:
  pull_request:
    paths:
      - 'apps/web/**'
  push:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: treosh/lighthouse-ci-action@v10
        with:
          configPath: './lighthouserc.json'
          temporaryPublicStorage: true
          uploadArtifacts: true
```

Configure Lighthouse:

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "numberOfRuns": 3,
      "settings": {
        "configPath": "apps/web/lighthouse-config.json"
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "cumululative-layout-shift": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "minScore": 0.9 }],
        "first-input-delay": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

### 3.3 Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5-4s | > 4s |
| FID (First Input Delay) | < 100ms | 100-300ms | > 300ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 |
| FCP (First Contentful Paint) | < 1.8s | 1.8-3s | > 3s |
| TTFB (Time to First Byte) | < 600ms | 600-1800ms | > 1800ms |

## 4. Monitoring Dashboard

### 4.1 Sentry Dashboard

In Sentry, create custom dashboard:

1. **Error Metrics Panel**
   - Total errors (24h)
   - Error rate trend
   - Top error types
   - Affected users

2. **Performance Panel**
   - P50, P95, P99 response times
   - Slowest endpoints
   - Database query times
   - Cache hit rates

3. **Web Vitals Panel**
   - LCP distribution
   - FID distribution
   - CLS distribution
   - TTFB trend

4. **Business Metrics Panel**
   - User signups (24h)
   - Credit approvals
   - Evidence uploads
   - Payment processing

### 4.2 Grafana Dashboard (Optional)

For advanced metrics, set up Grafana:

```yaml
# docker-compose.monitoring.yml

version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  prometheus_data:
  grafana_data:
```

Configure Prometheus scrape targets:

```yaml
# prometheus.yml

global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'api'
    static_configs:
      - targets: ['localhost:4000']
        labels:
          service: imobi-api

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['localhost:6379']
```

## 5. Error Tracking Workflows

### 5.1 Error Severities

In Sentry, configure error levels:

| Level | Action | Response Time |
|-------|--------|----------------|
| Critical | Page on-call, #incidents-critical | Immediate |
| Error | Alert #incidents, assign to on-call | 15 min |
| Warning | Alert #incidents-warnings | 1 hour |
| Info | Log to dashboard | Best effort |

### 5.2 Database Error Alerts

Alert on database-specific errors:

```typescript
// services/api/src/common/database-error.handler.ts

@ExceptionFilter()
export class DatabaseErrorFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // Capture database errors
    Sentry.captureException(exception, {
      tags: {
        type: 'database_error',
        error_type: exception.code,
      },
      level: 'error',
    });

    // Alert on connection errors
    if (exception.code === 'ECONNREFUSED') {
      Sentry.captureMessage('Database connection lost', 'critical', {
        tags: { service: 'postgres' },
      });
    }

    response.status(500).json({
      statusCode: 500,
      message: 'Database error',
    });
  }
}
```

### 5.3 Rate Limiting Alerts

Track rate limit hits:

```typescript
// services/api/src/common/throttle.guard.ts

if (remaining < threshold) {
  Sentry.captureMessage(
    `Rate limit warning: ${remaining} requests left`,
    'warning',
    {
      userId,
      endpoint,
      limit,
      remaining,
    }
  );
}
```

## 6. Performance Targets

### 6.1 API Performance SLO

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| P50 Latency | < 100ms | > 200ms |
| P95 Latency | < 500ms | > 1000ms |
| P99 Latency | < 1000ms | > 2000ms |
| Error Rate | < 0.1% | > 1% |
| Availability | > 99.9% | < 99% |

### 6.2 Database Performance SLO

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Connection Pool | < 70% | > 80% |
| Slow Queries | < 1% | > 5% |
| Query Latency (p95) | < 500ms | > 1000ms |

### 6.3 Cache Performance SLO

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Hit Rate | > 80% | < 60% |
| Memory Usage | < 70% | > 80% |
| Command Latency (p95) | < 50ms | > 100ms |

## 7. Alerting & Escalation

### 7.1 Alert Rules

Configure in Sentry Project Settings → Alert Rules:

```
Rule 1: High Error Rate
  When: Error rate > 5% for 5 minutes
  Then: Alert #incidents-critical, page on-call
  Severity: Critical

Rule 2: Elevated Error Rate
  When: Error rate > 1% for 10 minutes
  Then: Alert #incidents
  Severity: Error

Rule 3: Slow Response Times
  When: p95 latency > 1000ms for 10 minutes
  Then: Alert #incidents-warnings
  Severity: Warning

Rule 4: Database Errors
  When: Error message contains "database"
  Then: Alert #incidents-critical
  Severity: Critical

Rule 5: Authentication Failures
  When: Error message contains "authentication"
  Then: Alert #incidents
  Severity: Error
```

### 7.2 Slack Integration

Configure Slack notifications in Sentry:

```
Integration: Slack
Channel: #incidents
Message Format:
  [${project}] ${level} error in production
  ${error.type}: ${error.value}
  ${error.frames.filename}:${error.frames.lineno}
  ${url}
```

### 7.3 On-Call Escalation

Define escalation policy:

1. **Alert Received** (Slack message)
   - Severity: Critical → Page on-call immediately
   - Severity: Error → Alert team
   - Severity: Warning → Log to channel

2. **No Response (5 minutes)**
   - Escalate to team lead

3. **No Team Lead Response (10 minutes)**
   - Escalate to engineering manager

## 8. Monitoring Checklist

### Pre-Production Deployment

- [ ] Sentry DSN configured in all services
- [ ] Error tracking active and receiving events
- [ ] Performance monitoring enabled (10% sample rate)
- [ ] Alert rules configured and tested
- [ ] Slack integration working
- [ ] Core Web Vitals tracking enabled
- [ ] Database monitoring configured
- [ ] Redis monitoring configured
- [ ] On-call escalation policy documented

### Post-Launch (24h Monitoring)

- [ ] Check error dashboard for spike
- [ ] Verify alert notifications working
- [ ] Check performance trends
- [ ] Review slow queries
- [ ] Confirm Web Vitals tracking
- [ ] No unexpected error patterns
- [ ] Database performance normal
- [ ] Cache hit rates acceptable
- [ ] User impact minimal

### Ongoing Maintenance

- [ ] Weekly review of error trends
- [ ] Monthly review of performance metrics
- [ ] Quarterly review of monitoring strategy
- [ ] Annual update of alert thresholds

## 9. Debugging with Monitoring

### 9.1 Trace Issues

Use Sentry trace view:

```bash
# Find transaction
Sentry Dashboard → Performance → Transactions

# Click transaction to see:
- Span timeline
- Database queries
- Cache operations
- Network requests
- Error details
```

### 9.2 Analyze Error Clusters

```bash
# In Sentry
1. Go to Issues
2. Click issue to open
3. See:
   - Error frequency
   - Affected users
   - Browser/OS distribution
   - Release/version info
   - Stack trace with source maps
```

### 9.3 User Impact Analysis

```bash
# In Sentry
1. Go to Issue
2. View "Affected Users"
3. See:
   - User ID
   - IP address
   - Browser/OS
   - Custom context (user properties)
```

## 10. Metrics Export

### 10.1 Sentry API

Export metrics via API:

```bash
# Get organization stats
curl https://sentry.io/api/0/organizations/org-slug/stats/ \
  -H 'Authorization: Bearer <token>'

# Get project errors
curl https://sentry.io/api/0/projects/org-slug/project-slug/issues/ \
  -H 'Authorization: Bearer <token>'

# Get releases
curl https://sentry.io/api/0/organizations/org-slug/releases/ \
  -H 'Authorization: Bearer <token>'
```

### 10.2 Custom Dashboards

Create BI dashboards:

```sql
-- Query Sentry API for daily metrics
SELECT date, error_count, error_rate, affected_users
FROM sentry_metrics
WHERE date >= NOW() - INTERVAL 30 DAY
ORDER BY date DESC;
```

## 11. Related Documentation

- [services/api/MONITORING.md](../services/api/MONITORING.md) — Logging setup
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md) — Backup strategy
- [infrastructure/README.md](./infrastructure/README.md) — Infrastructure setup

---

**Last Updated:** 2026-05-29
**Version:** 1.0.0
