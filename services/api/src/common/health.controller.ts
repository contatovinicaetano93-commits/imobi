import { Controller, Get, Logger, Inject, Res, HttpStatus } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { getRedisConfig, validateRedisConfig } from "./config";
import type { Cache } from "cache-manager";
import type { FastifyReply } from "fastify";

interface HealthCheck {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  redis: { status: string; host?: string; port?: number; error?: string };
  email: { provider: string; configured: boolean };
  firebase: { configured: boolean };
  database: { configured: boolean };
}

@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /** Liveness probe — Railway/container orchestrators only need process up. */
  @Get("live")
  live() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get()
  async getHealth(@Res({ passthrough: true }) reply: FastifyReply): Promise<HealthCheck> {
    const redisConfig = getRedisConfig();
    const redisValidationErrors = validateRedisConfig(redisConfig);
    let redisStatus = "connected";
    let redisError: string | undefined;

    if (redisValidationErrors.length > 0) {
      redisStatus = "error";
      redisError = redisValidationErrors.join("; ");
    } else {
      try {
        await this.cacheManager.get("_health_check");
        redisStatus = "connected";
      } catch (error) {
        redisStatus = "error";
        redisError = error instanceof Error ? error.message : "Unknown error";
        this.logger.error(`Redis health check failed: ${redisError}`);
      }
    }

    const emailProvider = process.env["EMAIL_PROVIDER"] ?? "smtp";
    const hasEmailConfig = this.hasEmailConfig(emailProvider);
    const hasFirebaseConfig = this.hasFirebaseConfig();
    const hasDatabaseUrl = !!process.env["DATABASE_URL"];

    const criticalConfigured =
      hasEmailConfig &&
      hasFirebaseConfig &&
      hasDatabaseUrl;

    const allConfigured =
      criticalConfigured &&
      redisStatus === "connected";

    const health: HealthCheck = {
      status: allConfigured ? "ok" : criticalConfigured ? "degraded" : "error",
      timestamp: new Date().toISOString(),
      redis: {
        status: redisStatus,
        host: redisConfig.host,
        port: redisConfig.port,
        ...(redisError && { error: redisError }),
      },
      email: {
        provider: emailProvider,
        configured: hasEmailConfig,
      },
      firebase: {
        configured: hasFirebaseConfig,
      },
      database: {
        configured: hasDatabaseUrl,
      },
    };

    this.logger.debug(`Health check: ${JSON.stringify(health)}`);

    if (health.status === "error") {
      reply.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return health;
  }

  private hasEmailConfig(provider: string): boolean {
    const provider_lower = provider.toLowerCase();

    if (provider_lower === "sendgrid") {
      return !!process.env["SENDGRID_API_KEY"];
    }

    if (provider_lower === "ses") {
      return !!(
        process.env["AWS_REGION"] &&
        process.env["AWS_ACCESS_KEY_ID"] &&
        process.env["AWS_SECRET_ACCESS_KEY"]
      );
    }

    // SMTP
    return !!(process.env["SMTP_HOST"] && process.env["SMTP_PORT"]);
  }

  private hasFirebaseConfig(): boolean {
    return !!(
      process.env["FIREBASE_PROJECT_ID"] &&
      process.env["FIREBASE_PRIVATE_KEY"] &&
      process.env["FIREBASE_CLIENT_EMAIL"]
    );
  }
}
