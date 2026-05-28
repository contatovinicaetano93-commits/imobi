import { Module } from "@nestjs/common";
import { PrometheusModule } from "@nestjs/prometheus";

/**
 * Monitoring Module
 * Exposes Prometheus metrics for performance monitoring
 *
 * Metrics exposed at: GET /metrics
 * Includes: HTTP latency, DB queries, cache hit rate, errors
 */
@Module({
  imports: [
    PrometheusModule.register({
      path: "/metrics",
      defaultMetrics: {
        enabled: true,
        prefix: "imbobi_",
      },
    }),
  ],
  exports: [PrometheusModule],
})
export class MonitoringModule {}
