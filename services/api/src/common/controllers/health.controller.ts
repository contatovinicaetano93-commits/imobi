import { Controller, Get, Inject } from "@nestjs/common";
import { HealthCheck, HealthCheckService, PrismaHealthIndicator, HttpHealthIndicator } from "@nestjs/terminus";
import { PrismaService } from "../../modules/prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private db: PrismaHealthIndicator,
    @Inject("PRISMA_SERVICE") private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Check database connectivity
      () =>
        this.db.pingCheck("database", this.prisma, {
          isolated: true,
        }),
      // Check API endpoint
      () =>
        this.http.pingCheck("api", `http://localhost:${process.env["PORT"] || 4000}/api/v1/health`),
    ]);
  }

  @Get("liveness")
  live() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("readiness")
  ready() {
    return {
      status: "ready",
      timestamp: new Date().toISOString(),
    };
  }
}
