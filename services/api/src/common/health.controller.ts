import { Controller, Get, Logger, Inject } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { SKIP_ALL_THROTTLES } from "./guards/throttler.constants";
import { PrismaService } from "../modules/prisma/prisma.service";
import type { Cache } from "cache-manager";

interface HealthCheck {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  cache: { status: string; error?: string };
  email: { provider: string; configured: boolean };
  database: { configured: boolean; status: string; error?: string };
}

@SkipThrottle(SKIP_ALL_THROTTLES)
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getHealth(): Promise<HealthCheck> {
    let cacheStatus = "connected";
    let cacheError: string | undefined;
    try {
      await this.cacheManager.get("_health_check");
    } catch (error) {
      cacheStatus = "error";
      cacheError = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Cache health check failed: ${cacheError}`);
    }

    const emailProvider = process.env["EMAIL_PROVIDER"] ?? "smtp";
    const hasEmailConfig = this.hasEmailConfig(emailProvider);
    const hasDatabaseUrl = !!process.env["DATABASE_URL"];
    let databaseStatus = "error";
    let databaseError: string | undefined;

    if (!hasDatabaseUrl) {
      databaseError = "DATABASE_URL ausente";
    } else {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        databaseStatus = "connected";
      } catch (error) {
        databaseError = error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`Database health check failed: ${databaseError}`);
      }
    }

    const status: HealthCheck["status"] =
      databaseStatus !== "connected" ? "error" : cacheStatus === "connected" ? "ok" : "degraded";

    return {
      status,
      timestamp: new Date().toISOString(),
      cache: { status: cacheStatus, ...(cacheError && { error: cacheError }) },
      email: { provider: emailProvider, configured: hasEmailConfig },
      database: {
        configured: hasDatabaseUrl,
        status: databaseStatus,
        ...(databaseError && { error: databaseError }),
      },
    };
  }

  private hasEmailConfig(provider: string): boolean {
    const providerLower = provider.toLowerCase();
    if (providerLower === "sendgrid") return !!process.env["SENDGRID_API_KEY"];
    if (providerLower === "ses") {
      return !!(
        process.env["AWS_REGION"] &&
        process.env["AWS_ACCESS_KEY_ID"] &&
        process.env["AWS_SECRET_ACCESS_KEY"]
      );
    }
    if (providerLower === "console") return true;
    return !!(process.env["SMTP_HOST"] && process.env["SMTP_PORT"]);
  }
}
