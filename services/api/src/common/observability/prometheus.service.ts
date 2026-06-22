import { Injectable } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

export interface PrometheusConfig {
  register?: typeof register;
}

@Injectable()
export class PrometheusService {
  private readonly defaultRegister = register;

  private httpRequestDuration: Histogram;
  private httpRequestTotal: Counter;
  private databaseQueryDuration: Histogram;
  private databaseQueryTotal: Counter;
  private circuitBreakerStateChanges: Counter;
  private resilientServiceCalls: Counter;
  private cacheHitRate: Counter;

  constructor(config?: PrometheusConfig) {
    const reg = config?.register || this.defaultRegister;

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latency in seconds',
      labelNames: ['method', 'route', 'status_code'],
      registers: [reg],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [reg],
    });

    this.databaseQueryDuration = new Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query latency in seconds',
      labelNames: ['operation', 'model'],
      registers: [reg],
      buckets: [0.01, 0.05, 0.1, 0.5, 1],
    });

    this.databaseQueryTotal = new Counter({
      name: 'database_queries_total',
      help: 'Total database queries',
      labelNames: ['operation', 'model', 'status'],
      registers: [reg],
    });

    this.circuitBreakerStateChanges = new Counter({
      name: 'circuit_breaker_state_changes_total',
      help: 'Circuit breaker state changes',
      labelNames: ['service', 'from_state', 'to_state'],
      registers: [reg],
    });

    this.resilientServiceCalls = new Counter({
      name: 'resilient_service_calls_total',
      help: 'Calls to services with resilience patterns',
      labelNames: ['service', 'status'],
      registers: [reg],
    });

    this.cacheHitRate = new Counter({
      name: 'cache_hits_total',
      help: 'Cache hit/miss counter',
      labelNames: ['cache_type', 'result'],
      registers: [reg],
    });
  }

  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number) {
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(durationMs / 1000);
    this.httpRequestTotal.labels(method, route, statusCode.toString()).inc();
  }

  recordDatabaseQuery(operation: string, model: string, durationMs: number, status: 'success' | 'error') {
    this.databaseQueryDuration.labels(operation, model).observe(durationMs / 1000);
    this.databaseQueryTotal.labels(operation, model, status).inc();
  }

  recordCircuitBreakerStateChange(service: string, fromState: string, toState: string) {
    this.circuitBreakerStateChanges.labels(service, fromState, toState).inc();
  }

  recordResilientServiceCall(service: string, status: 'success' | 'failure' | 'fallback') {
    this.resilientServiceCalls.labels(service, status).inc();
  }

  recordCacheHit(cacheType: string, isHit: boolean) {
    this.cacheHitRate.labels(cacheType, isHit ? 'hit' : 'miss').inc();
  }
}
