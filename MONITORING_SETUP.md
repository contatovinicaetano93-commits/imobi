# Observability & Monitoring Setup

Complete observability solution for the Alagami project using **Sentry** for error tracking and **Prometheus** for metrics collection.

## Table of Contents

1. [Sentry Error Tracking](#sentry-error-tracking)
2. [Prometheus Metrics](#prometheus-metrics)
3. [Health Checks](#health-checks)
4. [Setup Instructions](#setup-instructions)
5. [Alerting Rules](#alerting-rules)
6. [Grafana Dashboard](#grafana-dashboard)
7. [On-Call Runbook](#on-call-runbook)

---

## Sentry Error Tracking

### Overview

Sentry provides:
- Automatic error capture for unhandled exceptions
- Performance monitoring with distributed tracing
- Session replay for debugging (client-side)
- Release tracking
- Source map uploads for better stack traces

### Backend (NestJS API)

#### Initialization

Sentry is initialized in `services/api/src/main.ts` **before** the NestJS app bootstrap:

```typescript
import { initializeSentry } from "./common/integrations/sentry.integration";

async function bootstrap() {
  initializeSentry(); // Must be first
  // ... rest of bootstrap
}
```

#### Features Enabled

1. **Automatic Exception Capture**: All unhandled exceptions are captured via:
   - `SentryExceptionFilter` - integrates with NestJS exception handling
   - `OnUncaughtException` integration
   - `OnUnhandledRejection` integration

2. **Performance Monitoring**:
   - HTTP request tracing
   - Database query monitoring
   - Sample rates: 10% in production, 100% in development

3. **Breadcrumb Tracking**: Automatic capture of important events (HTTP requests, logs, etc.)

#### Usage

```typescript
import { captureError, captureMessage, getSentryScope } from "./common/integrations/sentry.integration";

// Capture exceptions
try {
  // code
} catch (error) {
  captureError(error as Error, { context: "additional info" });
}

// Capture messages
captureMessage("Important event occurred", "info", { userId: 123 });

// Add custom context
const scope = getSentryScope();
scope.setUser({ id: "user-123", email: "user@example.com" });
scope.setContext("action", { action: "create_obra", details: "..." });
```

### Frontend (Next.js Web)

#### Initialization

Sentry must be initialized in `apps/web/sentry.client.config.ts`:

```typescript
import { initSentryClient } from "./sentry.client.config";

// Call during app initialization (in root layout or _app)
initSentryClient();
```

#### Features Enabled

1. **React Error Boundary**: Captures React component errors
2. **Session Replay**: Records user interactions for debugging (10% of sessions)
3. **Error Replays**: 100% of sessions with errors
4. **Performance Monitoring**: Client-side performance metrics
5. **Breadcrumb Tracking**: User interactions, console logs, etc.

#### Usage

```typescript
import {
  setSentryUser,
  captureError,
  captureMessage,
  clearSentryUser,
} from "./sentry.client.config";

// Set user context after authentication
setSentryUser("user-123", "user@example.com", "username");

// Capture errors
try {
  // code
} catch (error) {
  captureError(error as Error, { context: "form_submission" });
}

// Clear user on logout
clearSentryUser();
```

#### Configuration

Edit `next.config.js` for Sentry options:
- `SENTRY_ORG`: Your Sentry organization slug
- `SENTRY_PROJECT`: Your Sentry project slug
- `SENTRY_AUTH_TOKEN`: Auth token for source map uploads

---

## Prometheus Metrics

### Endpoints

#### `/api/v1/metrics` (Prometheus text format)

Returns all metrics in Prometheus text format for scraping:

```
# HELP http_request_duration_seconds HTTP request latency in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/v1/health",status="200",le="0.001"} 0
http_request_duration_seconds_bucket{method="GET",route="/api/v1/health",status="200",le="0.01"} 5
http_request_duration_seconds_sum{method="GET",route="/api/v1/health",status="200"} 0.045
http_request_duration_seconds_count{method="GET",route="/api/v1/health",status="200"} 5
```

#### `/api/v1/health` (Liveness/Readiness)

Returns application health status:

```json
{
  "status": "up",
  "details": {
    "database": { "status": "up" },
    "api": { "status": "up" }
  }
}
```

### Tracked Metrics

#### HTTP Requests
- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Total request counter
- Labels: `method`, `route`, `status`

#### Database Queries
- `db_query_duration_seconds` - Query latency histogram
- `db_queries_total` - Total query counter
- Labels: `operation`, `table`, `status`

#### Cache Performance
- `cache_hits_total` - Cache hit counter
- `cache_misses_total` - Cache miss counter
- Labels: `cache_key`

#### Redis Operations
- `redis_operation_duration_seconds` - Operation latency histogram
- `redis_operations_total` - Total operation counter
- Labels: `operation`, `status`

#### Application State
- `active_connections` - Current connection gauge
- Labels: `connection_type`
- `errors_total` - Total error counter
- Labels: `error_type`, `endpoint`

### Recording Metrics

```typescript
import { PrometheusMetricsService } from "./common/integrations/prometheus.integration";

constructor(private metrics: PrometheusMetricsService) {}

// Record HTTP request
this.metrics.recordHttpRequest("GET", "/api/v1/obras", 200, 0.125);

// Record database query
this.metrics.recordDbQuery("SELECT", "obras", "success", 0.045);

// Record cache operations
this.metrics.recordCacheHit("obra:123");
this.metrics.recordCacheMiss("obra:456");

// Record error
this.metrics.recordError("ValidationException", "/api/v1/obras");

// Record Redis operations
this.metrics.recordRedisOperation("SET", "success", 0.005);

// Track active connections
this.metrics.incrementActiveConnections("database");
this.metrics.decrementActiveConnections("database");
```

---

## Health Checks

### Types

#### `/api/v1/health` - Full Health Check
Checks both database and API connectivity:
- Database connectivity (via Prisma ping)
- API endpoint reachability

#### `/api/v1/health/liveness` - Liveness Probe
Indicates if the container should stay running:
- Returns 200 OK if the service is alive
- Used by Kubernetes liveness probes

#### `/api/v1/health/readiness` - Readiness Probe
Indicates if the service is ready to receive traffic:
- Returns 200 OK if all dependencies are ready
- Used by Kubernetes readiness probes

### Usage in Kubernetes

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: imbobi-api
spec:
  containers:
  - name: api
    image: imbobi-api:latest
    livenessProbe:
      httpGet:
        path: /api/v1/health/liveness
        port: 4000
      initialDelaySeconds: 10
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /api/v1/health/readiness
        port: 4000
      initialDelaySeconds: 5
      periodSeconds: 5
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- pnpm
- Sentry account (https://sentry.io)
- Prometheus (for metrics collection)

### Step 1: Create Sentry Project

1. Go to https://sentry.io and sign up/log in
2. Click "Create Project"
3. Select **Node.js** as the platform
4. Name your project (e.g., "imbobi-api")
5. Copy the DSN shown on the confirmation page

### Step 2: Configure Environment Variables

**API Backend** - Add to `.env` or `.env.local`:

```bash
SENTRY_DSN=https://[key]@o[org-id].ingest.sentry.io/[project-id]
SENTRY_ENVIRONMENT=production
```

**Web Frontend** - Add to `.env.local`:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://[key]@o[org-id].ingest.sentry.io/[project-id]
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

To generate an auth token:
1. Go to Sentry Settings > Auth Tokens
2. Click "Generate New Token"
3. Select scopes: `project:read`, `project:write`, `org:read`

### Step 3: Verify Sentry Integration

**Test Backend:**

```bash
cd services/api
pnpm dev
# In another terminal
curl http://localhost:4000/api/v1/health
# Check Sentry dashboard for events
```

**Test Frontend:**

```bash
cd apps/web
pnpm dev
# Trigger an error in the browser console
# Check Sentry dashboard for events
```

### Step 4: Setup Prometheus Scraping

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'imbobi-api'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/api/v1/metrics'
    scrape_interval: 10s
```

Run Prometheus:

```bash
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

Access Prometheus UI at http://localhost:9090

---

## Alerting Rules

### Prometheus Alert Rules

Create `prometheus-alerts.yml`:

```yaml
groups:
  - name: imbobi_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} in the last 5m"

      - alert: SlowHttpRequests
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1.0
        for: 5m
        annotations:
          summary: "Slow HTTP requests detected"
          description: "95th percentile latency is {{ $value }}s"

      - alert: DatabaseQueryLatency
        expr: histogram_quantile(0.95, db_query_duration_seconds_bucket) > 0.5
        for: 5m
        annotations:
          summary: "High database query latency"
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
          description: "95th percentile latency is {{ $value }}s"
```

### Sentry Alert Rules

1. **Default Alert** (auto-created per project):
   - Sends an email when a new issue is created
   - Triggers on first occurrence or when ignored issues resurface

2. **Custom Alert Rules**:
   - Go to Project Settings > Alerts > Alert Rules
   - Create alert for:
     - **High-frequency errors**: `event.level:"error" count() > 100 in the last 5m`
     - **Performance degradation**: `event.measurements.app_start_cold > 5000`
     - **Release health**: `release.health:crashed > 10%`

### Alerting Channels

Configure in Sentry Settings > Integrations:
- **Email**: Project team members
- **Slack**: #alerts channel
- **PagerDuty**: On-call engineers
- **Webhooks**: Custom integrations

---

## Grafana Dashboard

### Setup

1. **Install Grafana**:

```bash
docker run -d \
  -p 3000:3000 \
  --name grafana \
  grafana/grafana
```

2. **Add Prometheus Data Source**:
   - Go to http://localhost:3000 (default: admin/admin)
   - Settings > Data Sources > Add data source
   - Choose Prometheus
   - URL: http://localhost:9090
   - Save

3. **Create Dashboard**:
   - Click "+" > Dashboard
   - Add panels with queries:

### Key Panels

#### HTTP Request Latency
```promql
histogram_quantile(0.95, http_request_duration_seconds_bucket)
```

#### Request Rate by Status
```promql
rate(http_requests_total[5m])
```

#### Error Rate
```promql
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])
```

#### Database Query Latency
```promql
histogram_quantile(0.95, db_query_duration_seconds_bucket)
```

#### Cache Hit Rate
```promql
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

#### Active Connections
```promql
active_connections
```

### Grafana Templates

Download the ready-made dashboard:
1. Go to https://grafana.com/grafana/dashboards
2. Search for "Prometheus"
3. Import dashboard ID 1860 (Node Exporter Dashboard)
4. Or create custom dashboards using the queries above

---

## On-Call Runbook

### Alert: HighErrorRate

**Trigger**: Error rate > 5% for 5 minutes

**Steps**:

1. **Check Sentry Dashboard**:
   - Go to https://sentry.io/organizations/[org]/issues
   - Filter by release and timestamp
   - Review stack traces

2. **Check Logs**:
   ```bash
   docker logs imbobi-api-container | grep -i error
   ```

3. **Check Recent Deployments**:
   - Roll back if deployed in last hour
   - Or proceed to investigation

4. **Investigate Root Cause**:
   ```bash
   # Check database connectivity
   psql $DATABASE_URL -c "SELECT 1;"
   
   # Check Redis connectivity
   redis-cli -h $REDIS_HOST ping
   
   # Check API health
   curl http://localhost:4000/api/v1/health
   ```

5. **Mitigation**:
   - Increase error budget tracking
   - Create incident ticket
   - Schedule post-mortem

### Alert: SlowHttpRequests

**Trigger**: 95th percentile latency > 1 second for 5 minutes

**Steps**:

1. **Check Prometheus**:
   - Query: `histogram_quantile(0.95, http_request_duration_seconds_bucket)`
   - Identify which routes are slow

2. **Check Database Performance**:
   ```sql
   -- Find slow queries
   SELECT query, mean_time, max_time FROM pg_stat_statements 
   WHERE mean_time > 100 
   ORDER BY mean_time DESC;
   ```

3. **Check Cache Hit Rate**:
   - Query: `rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))`
   - If < 50%, consider warming cache or increasing TTL

4. **Scale if Needed**:
   - Increase number of replicas
   - Increase database connection pool

### Alert: CacheMissRate

**Trigger**: Miss rate > 50% for 5 minutes

**Steps**:

1. **Check Cache Configuration**:
   - Redis TTL settings in `app.module.ts`
   - Default: 10 minutes

2. **Warm Cache**:
   ```bash
   # Run cache warming job
   curl -X POST http://localhost:4000/api/v1/admin/cache/warm
   ```

3. **Review Cache Keys**:
   ```bash
   # List all cache keys
   redis-cli KEYS "imbobi:*" | head -20
   ```

4. **Investigate Eviction**:
   - Check Redis memory usage
   - Increase `maxmemory` if needed

---

## Useful Links

- **Sentry Documentation**: https://docs.sentry.io
- **Prometheus Documentation**: https://prometheus.io/docs
- **Grafana Documentation**: https://grafana.com/docs
- **NestJS Telemetry**: https://docs.nestjs.com/techniques/performance
- **Next.js Sentry**: https://docs.sentry.io/platforms/javascript/guides/nextjs

## Related Files

- Backend: `services/api/src/common/integrations/`
- Frontend: `apps/web/sentry.client.config.ts`
- Configuration: `.env.example`
