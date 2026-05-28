import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { PrometheusMetricsService } from "../integrations/prometheus.integration";
import { HealthController } from "../controllers/health.controller";
import { MetricsController } from "../controllers/metrics.controller";
import { PrismaModule } from "../../modules/prisma/prisma.module";

@Module({
  imports: [TerminusModule, PrismaModule],
  controllers: [HealthController, MetricsController],
  providers: [PrometheusMetricsService],
  exports: [PrometheusMetricsService],
})
export class MonitoringModule {}
