import { Controller, Get, Logger } from "@nestjs/common";

interface HealthCheck {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  redis: { status: string; host?: string; port?: number };
  email: { provider: string; configured: boolean };
  firebase: { configured: boolean };
  database: { configured: boolean };
}

/**
 * Health check endpoint
 * Route: GET /api/health (excluded from api/v1 prefix)
 * No authentication required - accessible for load balancers and monitoring
 */
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get()
  getHealth(): HealthCheck {
    const redisHost = process.env["REDIS_HOST"] ?? "localhost";
    const redisPort = Number(process.env["REDIS_PORT"] ?? 6379);
    const emailProvider = process.env["EMAIL_PROVIDER"] ?? "smtp";
    const hasEmailConfig = this.hasEmailConfig(emailProvider);
    const hasFirebaseConfig = this.hasFirebaseConfig();
    const hasDatabaseUrl = !!process.env["DATABASE_URL"];

    const allConfigured = hasEmailConfig && hasFirebaseConfig && hasDatabaseUrl;

    const health: HealthCheck = {
      status: allConfigured ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      redis: {
        status: "connected",
        host: redisHost,
        port: redisPort,
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
