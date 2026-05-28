import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrometheusMetricsService } from "../integrations/prometheus.integration";

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private metricsService: PrometheusMetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Skip metrics for health and metrics endpoints to avoid recursion
    if (req.path === "/health" || req.path === "/metrics" || req.path.includes("/health")) {
      return next();
    }

    // Capture response finish
    res.on("finish", () => {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      const route = req.route?.path || req.path;
      const method = req.method;
      const status = res.statusCode;

      this.metricsService.recordHttpRequest(method, route, status, duration);
    });

    next();
  }
}
