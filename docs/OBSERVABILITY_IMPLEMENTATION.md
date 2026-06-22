# Observability Implementation Guide — Phase 3C

**Status**: Production-Ready Patterns Provided  
**Branch**: `claude/imobi-mvp-fintech-status-jrr2ab`  
**Date**: June 2026

---

## Overview

This guide covers the complete observability stack for Imobi MVP:

1. **Structured Logging** — JSON logs with service metadata
2. **Distributed Tracing** — OpenTelemetry integration
3. **Prometheus Metrics** — Performance & reliability indicators
4. **Sentry Error Tracking** — Production error monitoring

All patterns are production-ready and integrate seamlessly with the resilience layer from Phase 3A.

---

## 1. Structured Logging

### StructuredLoggerService

Located at: `services/api/src/common/logging/structured-logger.service.ts`

Every log includes:
- **timestamp**: ISO 8601 format
- **level**: INFO, WARN, ERROR, DEBUG, PERF
- **service**: imobi-api
- **version**: API version
- **hostname**: Server identifier
- **pid**: Process ID
- **message**: Human-readable description
- **context**: Business-specific data

### Usage in Services

```typescript
import { StructuredLoggerService } from '../../../common/logging/structured-logger.service';

@Injectable()
export class CreditoService {
  constructor(private logger: StructuredLoggerService) {}

  async solicitarCredito(usuarioId: string, valor: number) {
    const start = Date.now();
    
    try {
      this.logger.log('Solicitando crédito', {
        usuarioId,
        valor,
        timestamp: new Date().toISOString(),
      });

      const credito = await this.db.credito.create({
        data: { usuarioId, valor, status: 'PENDENTE_ANALISE' },
      });

      const duration = Date.now() - start;
      this.logger.logPerformance('solicitarCredito', duration, {
        creditoId: credito.id,
        usuarioId,
        valor,
      });

      return credito;
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Falha ao solicitar crédito', {
        usuarioId,
        valor,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
```

### Log Aggregation

Logs are sent to stdout as JSON, suitable for:
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **Datadog**: JSON-native log parser
- **Splunk**: JSON ingestion
- **CloudWatch**: AWS native logs
- **Stackdriver**: Google Cloud Logging

### Example Log Output

```json
{
  "timestamp": "2024-06-22T12:15:30.456Z",
  "level": "INFO",
  "service": "imobi-api",
  "version": "1.0.0",
  "hostname": "api-prod-01",
  "pid": 12345,
  "message": "Solicitando crédito",
  "context": {
    "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
    "valor": 500000.00,
    "timestamp": "2024-06-22T12:15:30.456Z"
  }
}

{
  "timestamp": "2024-06-22T12:15:30.523Z",
  "level": "PERF",
  "service": "imobi-api",
  "version": "1.0.0",
  "hostname": "api-prod-01",
  "pid": 12345,
  "operation": "solicitarCredito",
  "durationMs": 67,
  "message": "Operation solicitarCredito completed in 67ms",
  "context": {
    "creditoId": "660f9500-f39c-52e5-b827-556755550111",
    "usuarioId": "550e8400-e29b-41d4-a716-446655440000",
    "valor": 500000.00
  }
}
```

---

## 2. Distributed Tracing

### OpenTelemetry Integration

Located at: `services/api/src/common/observability/tracing.ts`

Traces are sent to an OpenTelemetry Collector:

```bash
# Installation (in docker-compose.yml)
otel-collector:
  image: otel/opentelemetry-collector-contrib:latest
  ports:
    - "4317:4317"  # gRPC receiver
    - "4318:4318"  # HTTP receiver
  environment:
    OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:14250
```

### Initialization

The tracing SDK is initialized in `main.ts` before app creation:

```typescript
import { initializeTracing } from './common/observability/tracing';

async function bootstrap() {
  // Initialize tracing BEFORE creating the app
  const sdk = initializeTracing();

  // Rest of bootstrap...
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, ...);
  
  // Graceful shutdown
  process.on('SIGTERM', async () => {
    await sdk.shutdown();
  });
}
```

### Automatic Instrumentation

OpenTelemetry auto-instruments:
- **HTTP requests/responses** (with latency)
- **Database queries** (Prisma)
- **Redis operations**
- **External API calls**
- **Queue operations** (BullMQ)

### Manual Span Creation

For custom business logic:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('imobi-api');

async function complexOperation() {
  const span = tracer.startSpan('analisar-credito');
  
  try {
    // Business logic
    const score = await calcularScore(usuarioId);
    span.setAttributes({
      'usuario.id': usuarioId,
      'score.valor': score,
      'score.tier': getTier(score),
    });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
```

### Trace Context Propagation

Traces automatically propagate through:
- HTTP headers (W3C Trace Context)
- Database connections
- Async operations
- Queue processing

### Example Trace

```
GET /credito/550e8400-e29b-41d4-a716-446655440000
├─ HTTP Request Handler (50ms total)
│  ├─ JWT Verification (2ms)
│  ├─ Cache Lookup (1ms) — MISS
│  ├─ Database Query (35ms)
│  │  └─ SELECT * FROM credito WHERE id = ?
│  ├─ Enrichment Service (8ms)
│  │  ├─ Score API Call (5ms) — with Circuit Breaker
│  │  └─ Cache Store (1ms)
│  └─ JSON Serialization (2ms)
└─ Response Sent (50ms)
```

---

## 3. Prometheus Metrics

### PrometheusService

Located at: `services/api/src/common/observability/prometheus.service.ts`

Collects metrics on:
- HTTP requests (latency, count, status codes)
- Database queries (latency, operation type, success/failure)
- Circuit breaker state changes
- Cache hit rates
- Resilient service calls

### Metrics Endpoint

```
GET /metrics

# HELP http_request_duration_seconds HTTP request latency in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",method="GET",route="/api/v1/credito/:id",status_code="200"} 45
http_request_duration_seconds_bucket{le="0.5",method="GET",route="/api/v1/credito/:id",status_code="200"} 48
http_request_duration_seconds_sum{method="GET",route="/api/v1/credito/:id",status_code="200"} 15.234
http_request_duration_seconds_count{method="GET",route="/api/v1/credito/:id",status_code="200"} 50

# HELP circuit_breaker_state_changes_total Circuit breaker state changes
# TYPE circuit_breaker_state_changes_total counter
circuit_breaker_state_changes_total{service="score-api",from_state="CLOSED",to_state="OPEN"} 3
circuit_breaker_state_changes_total{service="score-api",from_state="OPEN",to_state="HALF_OPEN"} 3
```

### Scrape Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'imobi-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

### Recording Metrics in Services

```typescript
import { PrometheusService } from '../observability/prometheus.service';

@Injectable()
export class DocumentosService {
  constructor(
    private prometheus: PrometheusService,
    private logger: StructuredLoggerService,
  ) {}

  async uploadDocument(file: Express.Multer.File) {
    const start = Date.now();
    
    try {
      // Upload logic
      const duration = Date.now() - start;
      
      this.prometheus.recordHttpRequest(
        'POST',
        '/documentos/upload',
        201,
        duration,
      );
      
      return { success: true, fileId: '...' };
    } catch (error) {
      const duration = Date.now() - start;
      this.prometheus.recordHttpRequest(
        'POST',
        '/documentos/upload',
        500,
        duration,
      );
      throw error;
    }
  }
}
```

### Key Metrics to Monitor

| Metric | Alert Threshold | Action |
|--------|-----------------|--------|
| HTTP p99 latency | > 2s | Scale up API instances |
| Circuit breaker OPEN | Any | Page on-call engineer |
| Cache hit rate | < 50% | Investigate cache TTL |
| Database query p99 | > 1s | Check query plans, add indexes |
| Error rate | > 1% | Review error logs |

---

## 4. Sentry Error Tracking

### Initialization

Sentry is initialized in `common/config/index.ts`:

```typescript
export function initSentry() {
  const sentryDsn = process.env.SENTRY_DSN;
  if (!sentryDsn) {
    console.log('[SENTRY] Not configured (SENTRY_DSN missing)');
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.OnUncaughtException(),
      new Sentry.Integrations.OnUnhandledRejection(),
    ],
  });

  console.log('[SENTRY] Initialized with DSN:', sentryDsn.split('@')[1]);
}
```

### Configuration

```bash
# .env
SENTRY_DSN=https://<key>@sentry.io/<project-id>
NODE_ENV=production
```

### Capturing Exceptions

```typescript
import * as Sentry from '@sentry/node';

@Injectable()
export class KycService {
  async analisarDocumento(documentoId: string) {
    try {
      // Business logic
      const resultado = await this.ia.analisar(documento);
      return resultado;
    } catch (error) {
      // Automatically captured by Sentry integration
      Sentry.captureException(error, {
        tags: {
          operation: 'kyc-analysis',
          documentoId,
        },
        level: 'error',
      });
      throw error;
    }
  }
}
```

### Breadcrumbs for Context

```typescript
Sentry.captureMessage('Credito aprovado', 'info', {
  tags: {
    creditoId,
    usuarioId,
    valorAprovado,
  },
  breadcrumbs: [
    {
      category: 'creditoFlow',
      message: 'Score analisado',
      level: 'info',
      data: { score: 750 },
    },
    {
      category: 'creditoFlow',
      message: 'Documentos verificados',
      level: 'info',
      data: { docCount: 5 },
    },
  ],
});
```

### Error Dashboard

Sentry provides:
- ✅ Real-time error alerts
- ✅ Stack trace analysis
- ✅ User impact estimation
- ✅ Release tracking
- ✅ Performance metrics
- ✅ Error trend analysis

---

## Integration with Resilience Layer

The observability stack integrates directly with Phase 3A patterns:

### Circuit Breaker Metrics

```typescript
// In CircuitBreakerService
private onFailure(): void {
  this.failureCount++;
  
  if (this.failureCount >= this.config.failureThreshold) {
    const prevState = this.state;
    this.state = CircuitState.OPEN;
    
    // Record state change
    this.config.prometheus?.recordCircuitBreakerStateChange(
      this.config.name,
      prevState,
      this.state,
    );
    
    // Log failure
    this.logger.error('Circuit breaker opened', {
      service: this.config.name,
      failureCount: this.failureCount,
    });
    
    // Alert on Sentry
    Sentry.captureMessage(`Circuit breaker opened: ${this.config.name}`, 'warning');
  }
}
```

### HTTP Logging Interceptor

The `HttpLoggingInterceptor` automatically:
1. Records all HTTP requests/responses
2. Captures latency
3. Updates Prometheus metrics
4. Logs via StructuredLogger
5. Preserves request ID for tracing

---

## Monitoring Dashboards

### Grafana Dashboard Example

```json
{
  "dashboard": {
    "title": "Imobi API — Real-time Monitoring",
    "panels": [
      {
        "title": "HTTP Requests/sec",
        "targets": [
          "rate(http_requests_total[1m])"
        ]
      },
      {
        "title": "API Latency (p99)",
        "targets": [
          "histogram_quantile(0.99, http_request_duration_seconds)"
        ]
      },
      {
        "title": "Circuit Breaker State",
        "targets": [
          "circuit_breaker_state_changes_total"
        ]
      },
      {
        "title": "Database Query Latency",
        "targets": [
          "histogram_quantile(0.95, database_query_duration_seconds)"
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          "rate(cache_hits_total{result='hit'}[5m]) / rate(cache_hits_total[5m])"
        ]
      }
    ]
  }
}
```

---

## Best Practices

### 1. Always Include Context
```typescript
// ❌ Bad
this.logger.log('User registered');

// ✅ Good
this.logger.log('User registered', {
  usuarioId: user.id,
  email: user.email,
  tier: user.tier,
  source: 'mobile_app',
});
```

### 2. Use Appropriate Log Levels
```typescript
// INFO: Normal business operations
this.logger.log('Credito solicitado', { creditoId, valor });

// WARN: Degraded but functioning
this.logger.warn('Cache miss, querying database', { key });

// ERROR: Failures requiring attention
this.logger.error('Database connection failed', { error });

// PERF: Performance metrics
this.logger.logPerformance('complexQuery', 1234, { records: 50 });
```

### 3. Set Meaningful Metric Tags
```typescript
this.prometheus.recordHttpRequest(
  method,           // GET, POST, etc
  route,            // /api/v1/credito
  statusCode,       // 200, 404, 500
  durationMs,       // actual latency
);
```

### 4. Handle Circuit Breaker Failures Gracefully
```typescript
try {
  const score = await this.scoreApi.calculate(usuarioId);
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // Use cached value or safe default
    this.logger.warn('Score API unavailable, using default', {
      usuarioId,
      defaultScore: 500,
    });
    return 500;
  }
  throw error;
}
```

---

## Production Checklist

- [ ] Sentry DSN configured in production environment
- [ ] Prometheus metrics scraped every 15s
- [ ] Grafana dashboards created for key metrics
- [ ] Alert rules configured (circuit breaker, error rate)
- [ ] Log aggregation system running (ELK, Datadog, etc)
- [ ] OpenTelemetry collector receiving traces
- [ ] Jaeger UI accessible for trace analysis
- [ ] PagerDuty/Slack integration for alerts
- [ ] Retention policies set (logs: 30 days, traces: 7 days, metrics: 1 year)
- [ ] On-call rotation documented

---

## Troubleshooting

### No Metrics Appearing
1. Check `/metrics` endpoint returns 200
2. Verify Prometheus config points to correct port
3. Check firewall rules allow 0.0.0.0:3000/metrics

### Traces Not Appearing in Jaeger
1. Verify OTEL_EXPORTER_OTLP_ENDPOINT set correctly
2. Check OpenTelemetry Collector is running
3. Review OpenTelemetry logs: `docker logs otel-collector`

### High Memory Usage
1. Check log output volume (may be too verbose)
2. Reduce trace sample rate in production
3. Verify metric labels don't have unbounded cardinality

---

**Status**: Ready for Production  
**Phase**: 3C — Observability Implementation  
**Next**: Phase 3D — Scalability Hardening
