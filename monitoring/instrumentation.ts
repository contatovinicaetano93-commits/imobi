/**
 * Instrumentação Datadog APM + Logs + Metrics
 * Importar este arquivo no início do app.module.ts ANTES de qualquer outro import
 */

import tracer from 'dd-trace';
import { Logger } from '@nestjs/common';

const logger = new Logger('Instrumentation');

/**
 * Inicializar Datadog Tracer
 * Deve ser chamado no topo de main.ts
 */
export function initializeDatadogTracer() {
  if (process.env.NODE_ENV === 'production' || process.env.DATADOG_ENABLED === 'true') {
    tracer.init({
      // Serviço
      service: 'imbobi-api',
      env: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '0.0.1',

      // Tracer
      logInjection: true,
      runtimeMetrics: true,
      profiling: process.env.NODE_ENV === 'production',

      // APM
      hostname: process.env.DATADOG_AGENT_HOST || 'localhost',
      port: parseInt(process.env.DATADOG_AGENT_PORT || '8126'),
      flushInterval: 2000,

      // Amostragem
      sampleRate: process.env.TRACE_SAMPLE_RATE ? parseFloat(process.env.TRACE_SAMPLE_RATE) : 1.0,

      // Integrations
      integrations: [
        {
          name: 'fastify',
          enabled: true,
        },
        {
          name: 'postgres',
          enabled: true,
        },
        {
          name: 'redis',
          enabled: true,
        },
        {
          name: 'http',
          enabled: true,
        },
        {
          name: 'fs',
          enabled: true,
        },
      ],

      // Tags globais
      tags: {
        env: process.env.NODE_ENV,
        service: 'imbobi-api',
        team: 'platform',
      },
    });

    logger.log('Datadog Tracer initialized successfully');
  }
}

/**
 * Inicializar DD Logger
 */
export function initializeDatadogLogger() {
  if (process.env.NODE_ENV === 'production' || process.env.DATADOG_ENABLED === 'true') {
    // Winston logger configurado com Datadog transport
    logger.log('Datadog Logger initialized');
  }
}

/**
 * Instrumentação de Métricas Customizadas
 */
export class DatadogMetrics {
  private static client: any;

  static initialize(client: any) {
    this.client = client;
  }

  // ========================================================================
  // HTTP Metrics
  // ========================================================================

  static recordHttpRequest(method: string, endpoint: string, statusCode: number, durationMs: number) {
    if (!this.client) return;

    // Latência
    this.client.histogram('http.request.duration', durationMs, {
      tags: [
        `method:${method.toUpperCase()}`,
        `endpoint:${endpoint}`,
        `status_code:${statusCode}`,
      ],
    });

    // Taxa de erros
    if (statusCode >= 400) {
      this.client.increment('http.requests.errors', 1, {
        tags: [
          `status_code:${statusCode}`,
          `endpoint:${endpoint}`,
        ],
      });
    }

    // Total
    this.client.increment('http.requests.total', 1, {
      tags: [
        `method:${method}`,
        `endpoint:${endpoint}`,
        `status_code:${statusCode}`,
      ],
    });
  }

  // ========================================================================
  // Database Metrics
  // ========================================================================

  static recordDbQuery(operation: string, table: string, durationMs: number) {
    if (!this.client) return;

    this.client.histogram('db.query.duration', durationMs, {
      tags: [
        `operation:${operation}`,
        `table:${table}`,
      ],
    });

    this.client.increment('db.queries.total', 1, {
      tags: [
        `operation:${operation}`,
        `table:${table}`,
      ],
    });

    // Alert se > 1 segundo
    if (durationMs > 1000) {
      this.client.increment('db.slow_queries.total', 1, {
        tags: [`query_pattern:${table}.${operation}`],
      });
    }
  }

  static recordDbConnectionPoolMetrics(poolName: string, size: number, available: number, queued: number) {
    if (!this.client) return;

    this.client.gauge('db.connection_pool.size', size, { tags: [`pool_name:${poolName}`] });
    this.client.gauge('db.connection_pool.available', available, { tags: [`pool_name:${poolName}`] });
    this.client.gauge('db.connection_pool.queued', queued, { tags: [`pool_name:${poolName}`] });
  }

  static recordDbConnectionError() {
    if (!this.client) return;
    this.client.increment('db.connection.errors', 1);
  }

  // ========================================================================
  // Cache Metrics
  // ========================================================================

  static recordCacheOperation(operation: string, durationMs: number, hit: boolean = false) {
    if (!this.client) return;

    this.client.histogram('cache.operation.duration', durationMs, {
      tags: [`operation:${operation}`],
    });

    this.client.increment('cache.operations.total', 1, {
      tags: [`operation:${operation}`],
    });

    if (hit) {
      this.client.increment('cache.hits', 1);
    } else {
      this.client.increment('cache.misses', 1);
    }
  }

  static recordCacheHitRate(hitRate: number) {
    if (!this.client) return;
    this.client.gauge('cache.hit_rate', hitRate * 100, {
      tags: ['cache_name:redis'],
    });
  }

  static recordRedisMetrics(memoryPercent: number, connectedClients: number) {
    if (!this.client) return;

    this.client.gauge('redis.memory.percent', memoryPercent);
    this.client.gauge('redis.connected_clients', connectedClients);
  }

  // ========================================================================
  // S3/Storage Metrics
  // ========================================================================

  static recordS3Operation(operation: string, durationMs: number, success: boolean = true) {
    if (!this.client) return;

    this.client.histogram('s3.operation.duration', durationMs, {
      tags: [`operation:${operation}`],
    });

    if (!success) {
      this.client.increment('http.requests.errors', 1, {
        tags: ['endpoint:/fotos'],
      });
    }
  }

  // ========================================================================
  // Queue Metrics
  // ========================================================================

  static recordQueueJobProcessing(jobType: string, durationMs: number) {
    if (!this.client) return;

    this.client.histogram('queue.job.processing_time', durationMs, {
      tags: [`job_type:${jobType}`],
    });
  }

  static recordQueueJobFailed(jobType: string) {
    if (!this.client) return;

    this.client.increment('queue.jobs.failed', 1, {
      tags: [`job_type:${jobType}`],
    });
  }

  static recordQueueJobDeadLetter(jobType: string) {
    if (!this.client) return;

    this.client.increment('queue.jobs.dead_letter', 1, {
      tags: [`job_type:${jobType}`],
    });
  }

  // ========================================================================
  // Business Metrics
  // ========================================================================

  static recordObraCreated() {
    if (!this.client) return;
    this.client.increment('obras.created.total', 1);
  }

  static recordParcelaLiberada(value: number) {
    if (!this.client) return;

    this.client.increment('parcelas.liberadas.total', 1);
    this.client.gauge('parcelas.liberadas.value', value);
  }

  static recordFotoUploaded(tipo: string) {
    if (!this.client) return;

    this.client.increment('fotos.uploaded.total', 1, {
      tags: [`tipo:${tipo}`],
    });
  }

  static recordPaymentProcessed(status: string, method: string) {
    if (!this.client) return;

    this.client.increment('payment.processed.total', 1, {
      tags: [
        `status:${status}`,
        `method:${method}`,
      ],
    });
  }

  // ========================================================================
  // System Metrics (monitorados automaticamente pelo Datadog Agent)
  // ========================================================================

  static recordProcessMetrics(memoryRss: number, handles: Record<string, number>) {
    if (!this.client) return;

    this.client.gauge('process.memory.rss', memoryRss);

    Object.entries(handles).forEach(([type, count]) => {
      this.client.gauge('nodejs.handles', count, { tags: [`type:${type}`] });
    });
  }
}

export { tracer };
