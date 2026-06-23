import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram, register } from 'prom-client';

@Injectable()
export class PrometheusService {
  private readonly logger = new Logger('PrometheusService');
  private readonly defaultRegister = register;
  private isEnabled = process.env.PROMETHEUS_ENABLED === 'true';

  private httpRequestDuration: Histogram | null = null;
  private httpRequestTotal: Counter | null = null;
  private databaseQueryDuration: Histogram | null = null;
  private databaseQueryTotal: Counter | null = null;
  private circuitBreakerStateChanges: Counter | null = null;
  private resilientServiceCalls: Counter | null = null;
  private cacheHitRate: Counter | null = null;

  constructor() {
    if (!this.isEnabled) {
      this.logger.warn('Prometheus monitoring is disabled. Set PROMETHEUS_ENABLED=true to enable.');
      return;
    }

    try {
      this.httpRequestDuration = new Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request latency in seconds',
        labelNames: ['method', 'route', 'status_code'],
        registers: [this.defaultRegister],
        buckets: [0.1, 0.5, 1, 2, 5],
      });

      this.httpRequestTotal = new Counter({
        name: 'http_requests_total',
        help: 'Total HTTP requests',
        labelNames: ['method', 'route', 'status_code'],
        registers: [this.defaultRegister],
      });

      this.databaseQueryDuration = new Histogram({
        name: 'database_query_duration_seconds',
        help: 'Database query latency in seconds',
        labelNames: ['operation', 'model'],
        registers: [this.defaultRegister],
        buckets: [0.01, 0.05, 0.1, 0.5, 1],
      });

      this.databaseQueryTotal = new Counter({
        name: 'database_queries_total',
        help: 'Total database queries',
        labelNames: ['operation', 'model', 'status'],
        registers: [this.defaultRegister],
      });

      this.circuitBreakerStateChanges = new Counter({
        name: 'circuit_breaker_state_changes_total',
        help: 'Circuit breaker state changes',
        labelNames: ['service', 'from_state', 'to_state'],
        registers: [this.defaultRegister],
      });

      this.resilientServiceCalls = new Counter({
        name: 'resilient_service_calls_total',
        help: 'Calls to services with resilience patterns',
        labelNames: ['service', 'status'],
        registers: [this.defaultRegister],
      });

      this.cacheHitRate = new Counter({
        name: 'cache_hits_total',
        help: 'Cache hit/miss counter',
        labelNames: ['cache_type', 'result'],
        registers: [this.defaultRegister],
      });

      this.logger.log('Prometheus metrics initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Prometheus metrics', error);
    }
  }

  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number) {
    if (!this.isEnabled || !this.httpRequestDuration || !this.httpRequestTotal) return;
    try {
      this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(durationMs / 1000);
      this.httpRequestTotal.labels(method, route, statusCode.toString()).inc();
    } catch (error) {
      this.logger.error('Failed to record HTTP request metric', error);
    }
  }

  recordDatabaseQuery(operation: string, model: string, durationMs: number, status: 'success' | 'error') {
    if (!this.isEnabled || !this.databaseQueryDuration || !this.databaseQueryTotal) return;
    try {
      this.databaseQueryDuration.labels(operation, model).observe(durationMs / 1000);
      this.databaseQueryTotal.labels(operation, model, status).inc();
    } catch (error) {
      this.logger.error('Failed to record database query metric', error);
    }
  }

  recordCircuitBreakerStateChange(service: string, fromState: string, toState: string) {
    if (!this.isEnabled || !this.circuitBreakerStateChanges) return;
    try {
      this.circuitBreakerStateChanges.labels(service, fromState, toState).inc();
    } catch (error) {
      this.logger.error('Failed to record circuit breaker metric', error);
    }
  }

  recordResilientServiceCall(service: string, status: 'success' | 'failure' | 'fallback') {
    if (!this.isEnabled || !this.resilientServiceCalls) return;
    try {
      this.resilientServiceCalls.labels(service, status).inc();
    } catch (error) {
      this.logger.error('Failed to record resilient service call metric', error);
    }
  }

  recordCacheHit(cacheType: string, isHit: boolean) {
    if (!this.isEnabled || !this.cacheHitRate) return;
    try {
      this.cacheHitRate.labels(cacheType, isHit ? 'hit' : 'miss').inc();
    } catch (error) {
      this.logger.error('Failed to record cache hit metric', error);
    }
  }
}
