import { Injectable } from "@nestjs/common";
import { Counter, Histogram, Gauge, register, collectDefaultMetrics } from "prom-client";

@Injectable()
export class PrometheusMetricsService {
  private httpRequestDuration: Histogram;
  private httpRequestTotal: Counter;
  private dbQueryDuration: Histogram;
  private dbQueryTotal: Counter;
  private cacheHits: Counter;
  private cacheMisses: Counter;
  private errorCount: Counter;
  private activeConnections: Gauge;
  private redisOperationDuration: Histogram;
  private redisOperationTotal: Counter;

  constructor() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register });

    // HTTP Request metrics
    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_seconds",
      help: "HTTP request latency in seconds",
      labelNames: ["method", "route", "status"],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestTotal = new Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status"],
    });

    // Database query metrics
    this.dbQueryDuration = new Histogram({
      name: "db_query_duration_seconds",
      help: "Database query latency in seconds",
      labelNames: ["operation", "table"],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.dbQueryTotal = new Counter({
      name: "db_queries_total",
      help: "Total number of database queries",
      labelNames: ["operation", "table", "status"],
    });

    // Cache metrics
    this.cacheHits = new Counter({
      name: "cache_hits_total",
      help: "Total number of cache hits",
      labelNames: ["cache_key"],
    });

    this.cacheMisses = new Counter({
      name: "cache_misses_total",
      help: "Total number of cache misses",
      labelNames: ["cache_key"],
    });

    // Error metrics
    this.errorCount = new Counter({
      name: "errors_total",
      help: "Total number of errors",
      labelNames: ["error_type", "endpoint"],
    });

    // Connection metrics
    this.activeConnections = new Gauge({
      name: "active_connections",
      help: "Number of active connections",
      labelNames: ["connection_type"],
    });

    // Redis operation metrics
    this.redisOperationDuration = new Histogram({
      name: "redis_operation_duration_seconds",
      help: "Redis operation latency in seconds",
      labelNames: ["operation"],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
    });

    this.redisOperationTotal = new Counter({
      name: "redis_operations_total",
      help: "Total number of Redis operations",
      labelNames: ["operation", "status"],
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, route: string, status: number, duration: number) {
    this.httpRequestDuration.labels(method, route, status).observe(duration);
    this.httpRequestTotal.labels(method, route, status).inc();
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(operation: string, table: string, status: string, duration: number) {
    this.dbQueryDuration.labels(operation, table).observe(duration);
    this.dbQueryTotal.labels(operation, table, status).inc();
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheKey: string) {
    this.cacheHits.labels(cacheKey).inc();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheKey: string) {
    this.cacheMisses.labels(cacheKey).inc();
  }

  /**
   * Record error
   */
  recordError(errorType: string, endpoint: string) {
    this.errorCount.labels(errorType, endpoint).inc();
  }

  /**
   * Set active connection count
   */
  setActiveConnections(connectionType: string, count: number) {
    this.activeConnections.labels(connectionType).set(count);
  }

  /**
   * Increment active connections
   */
  incrementActiveConnections(connectionType: string) {
    this.activeConnections.labels(connectionType).inc();
  }

  /**
   * Decrement active connections
   */
  decrementActiveConnections(connectionType: string) {
    this.activeConnections.labels(connectionType).dec();
  }

  /**
   * Record Redis operation metrics
   */
  recordRedisOperation(operation: string, status: string, duration: number) {
    this.redisOperationDuration.labels(operation).observe(duration);
    this.redisOperationTotal.labels(operation, status).inc();
  }

  /**
   * Get all metrics in Prometheus format
   */
  getMetrics(): string {
    return register.metrics();
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics() {
    register.clear();
  }
}
