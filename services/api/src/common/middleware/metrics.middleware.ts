import { Injectable, NestMiddleware } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { PrometheusMetricsService } from "../integrations/prometheus.integration";

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private metricsService: PrometheusMetricsService) {}

  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    const startTime = Date.now();

    // Skip metrics for health and metrics endpoints to avoid recursion
    if (req.url === "/health" || req.url === "/metrics" || req.url.includes("/health")) {
      return next();
    }

    // Capture response finish
    res.onSend(async (_err, _payload) => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const route = req.url;
      const method = req.method;
      const status = res.statusCode;

      this.metricsService.recordHttpRequest(method, route, status, duration);
    });

    next();
  }
}
