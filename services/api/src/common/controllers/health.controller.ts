import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "up",
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: "up",
          },
        },
      };
    } catch (error) {
      return {
        status: "down",
        timestamp: new Date().toISOString(),
        checks: {
          database: {
            status: "down",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        },
      };
    }
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
