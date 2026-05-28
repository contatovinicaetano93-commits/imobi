import { Controller, Get } from "@nestjs/common";
import { PrometheusMetricsService } from "../integrations/prometheus.integration";

@Controller("metrics")
export class MetricsController {
  constructor(private metricsService: PrometheusMetricsService) {}

  @Get()
  metrics(): string {
    return this.metricsService.getMetrics();
  }
}
